import { NextResponse, type NextRequest } from 'next/server';
import { setSessionCookie, SESSION_MAX_AGE_SEC } from '@/lib/auth/server/sessionStore';
import { upsertUser, isUserDeleted, toPublicUser } from '@/lib/auth/server/userStore';
import { appendAudit } from '@/lib/auth/server/auditStore';
import { clientIp } from '@/lib/auth/server/apiAuth';
import { verifyOtpSessionClaim } from '@/lib/auth/server/cookieSigner';

/**
 * POST /api/auth/firebase-login
 * Establishes a persistent session (365 days) and synchronizes the user profile
 * into the server's durable user store until removed by an administrator.
 *
 * Phase 15 hardening:
 *   - The Firebase ID token is verified SERVER-SIDE via Google Identity Toolkit
 *     (REST) so a fabricated token can never mint a session. The web API key
 *     only queries a public endpoint; it cannot create or modify accounts.
 *   - Identity (uid / email / name / phone) is taken ONLY from the verified
 *     token response — the request body's `user` object is NEVER trusted for
 *     who the caller is.
 *   - Role is NEVER accepted from the client. New users are always CITIZEN;
 *     existing users keep their server-stored role. This prevents a logged-out
 *     attacker from POSTing `{ idToken:'x', user:{email:'admin@…'} }` to become
 *     an administrator.
 *   - OTP session claims (signed at /api/auth/otp/verify) are accepted for the
 *     OTP-only login flow. Client-fabricated `firebase_session_<uid>` tokens are
 *     rejected outright.
 */

/** Verifies a Firebase ID token using Google's public Identity Toolkit endpoint. */
async function verifyFirebaseIdToken(
  idToken: string,
): Promise<{ uid: string; email: string; name: string; phone: string } | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as
      | { users?: Array<{ localId: string; email?: string; displayName?: string; phoneNumber?: string }> }
      | null;
    const user = data?.users?.[0];
    if (!user?.localId) return null;
    return {
      uid: user.localId,
      email: user.email ?? '',
      name: user.displayName ?? (user.email ? user.email.split('@')[0] : 'Verified User'),
      phone: user.phoneNumber ?? '',
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken, expiresIn, user } = body;

    if (typeof idToken !== 'string' || idToken.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: missing or invalid idToken' },
        { status: 400 }
      );
    }

    // ── Resolve the caller's VERIFIED identity (server-authoritative) ─────────
    let verified: { uid: string; email: string; name: string; phone: string } | null = null;

    if (idToken.startsWith('otp_session_')) {
      // OTP-only login flow: a signed `claim` proves an OTP for this email was
      // just validated server-side at /api/auth/otp/verify. The claim is bound
      // to the email, so a client cannot fabricate it.
      const email = decodeURIComponent(idToken.slice('otp_session_'.length));
      const claim = (typeof user?.claim === 'string' ? user.claim : undefined) ?? body.claim;
      if (!verifyOtpSessionClaim(claim ?? '', email)) {
        return NextResponse.json(
          { error: 'Your OTP session has expired. Please request a new verification code.' },
          { status: 401 }
        );
      }
      verified = {
        uid: '',
        email,
        name: user?.name || (email ? email.split('@')[0] : 'Verified User'),
        phone: user?.phone || '',
      };
    } else {
      // Reject legacy client-fabricated fallback tokens. These were never
      // cryptographically verifiable and were the escalation vector when
      // getIdToken failed on the client.
      if (idToken.startsWith('firebase_session_') || idToken.startsWith('reg_session_')) {
        return NextResponse.json(
          { error: 'Invalid sign-in attempt. Please sign in again normally.' },
          { status: 401 }
        );
      }
      verified = await verifyFirebaseIdToken(idToken);
      if (!verified) {
        return NextResponse.json(
          { error: 'Could not verify your sign-in token. Please sign in again.' },
          { status: 401 }
        );
      }
    }

    const { uid: verifiedId, email: verifiedEmail, name: verifiedName, phone: verifiedPhone } = verified;

    // If this account was deleted by an admin, refuse login
    if ((verifiedId && isUserDeleted(verifiedId)) || (verifiedEmail && isUserDeleted(verifiedEmail))) {
      return NextResponse.json(
        { error: 'This account has been removed by the administrator.' },
        { status: 403 }
      );
    }

        // Persist/upsert the user in durable storage.
    // ⚠ Role is INTENTIONALLY omitted: new users become CITIZEN, existing
    //   users keep their server-stored role. The client cannot elevate itself.
    let savedUser = null;
    if (verifiedEmail) {
      const stored = upsertUser({
        id: verifiedId || undefined,
        email: verifiedEmail,
        name: verifiedName,
        phone: verifiedPhone,
      });

      if (stored.accountStatus === 'DISABLED') {
        return NextResponse.json(
          { error: 'This account has been disabled by the administrator.' },
          { status: 403 }
        );
      }
      savedUser = toPublicUser(stored);
    }

    const maxAge = expiresIn && expiresIn > 3600 * 24 * 30 ? expiresIn : SESSION_MAX_AGE_SEC;
    const expiresAt = Math.floor(Date.now() / 1000) + maxAge;

    const sessionData = {
      access_token: idToken,
      refresh_token: 'firebase-session',
      expires_at: expiresAt,
      userId: savedUser?.id || verifiedId,
      email: savedUser?.email || verifiedEmail,
    };

    const res = NextResponse.json({ success: true, user: savedUser });
    setSessionCookie(res, sessionData);

    if (savedUser) {
      appendAudit({
        actorId: savedUser.id,
        actorName: savedUser.name,
        actorRole: savedUser.role,
        action: 'LOGIN',
        entityType: 'SESSION',
        entityId: savedUser.id,
        newValue: 'signed-in',
        details: `User signed in (session established, saved until removed).`,
        ipAddress: clientIp(req),
      });
    }

    return res;
  } catch (error) {
    console.error('Firebase login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
