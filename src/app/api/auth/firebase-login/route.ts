import { NextResponse, type NextRequest } from 'next/server';
import { setSessionCookie, SESSION_MAX_AGE_SEC } from '@/lib/auth/server/sessionStore';
import { upsertUser, isUserDeleted, findUserByEmail, findUserById, toPublicUser } from '@/lib/auth/server/userStore';
import { appendAudit } from '@/lib/auth/server/auditStore';
import { clientIp } from '@/lib/auth/server/apiAuth';

/**
 * POST /api/auth/firebase-login
 * Establishes a persistent session (365 days) and synchronizes the user profile
 * into the server's durable user store until removed by an administrator.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken, expiresIn, user } = body;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: missing or invalid idToken' },
        { status: 400 }
      );
    }

    const candidateId = user?.uid || (idToken.startsWith('otp_session_') ? 'usr_' + idToken.replace('otp_session_', '').replace(/[^a-z0-9]/g, '_') : undefined);
    const candidateEmail = user?.email || (idToken.startsWith('otp_session_') ? idToken.replace('otp_session_', '') : undefined);

    // If this account was deleted by an admin, refuse login
    if (
      (candidateId && isUserDeleted(candidateId)) ||
      (candidateEmail && isUserDeleted(candidateEmail))
    ) {
      return NextResponse.json(
        { error: 'This account has been removed by the administrator.' },
        { status: 403 }
      );
    }

    // Persist/upsert the user in durable storage
    let savedUser = null;
    if (candidateEmail) {
      const stored = upsertUser({
        id: candidateId,
        email: candidateEmail,
        name: user?.name,
        phone: user?.phone,
        role: user?.role,
      });

      if (stored.accountStatus === 'DISABLED') {
        return NextResponse.json(
          { error: 'This account has been disabled by the administrator.' },
          { status: 403 }
        );
      }
      savedUser = toPublicUser(stored);
    }

    // Long-lived expiration: 365 days default
    const maxAge = expiresIn && expiresIn > 3600 * 24 * 30 ? expiresIn : SESSION_MAX_AGE_SEC;
    const expiresAt = Math.floor(Date.now() / 1000) + maxAge;

    const sessionData = {
      access_token: idToken,
      refresh_token: 'firebase-session',
      expires_at: expiresAt,
      userId: savedUser?.id || candidateId,
      email: savedUser?.email || candidateEmail,
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
