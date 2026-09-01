/**
 * POST /api/auth/register (Phase 14)
 * Self-registration for CITIZEN accounts only, via real Supabase Auth
 * (`auth.signUp`). The role is NEVER accepted from the browser — every
 * self-registered account is CITIZEN, enforced here AND by the RLS insert
 * policy on `profiles`. Passwords are managed exclusively by Supabase Auth.
 *
 * Behaviour:
 *   - email confirmation DISABLED (project default) → profile row created and
 *     the user is signed in immediately (httpOnly session cookie).
 *   - email confirmation ENABLED → responds `requiresEmailVerification`; the
 *     profile row is self-healed on first successful sign-in.
 *   - duplicate email / weak password / invalid input → clear 400 errors.
 *   - USER_CREATED (+ REGISTER) audit records for real signups only.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAnonSupabaseClient } from '@/lib/supabase/server';
import { registerUser } from '@/lib/auth/server/userStore';

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  identities?: Array<{ id?: string }>;
};
import { isSupabaseAuthConfigured } from '@/lib/supabase/env';
import { ensureProfileForAuthUser, toPublicUser } from '@/lib/auth/server/profiles';
import { appendAudit } from '@/lib/auth/server/auditStore';
import { setSessionCookie } from '@/lib/auth/server/sessionStore';
import { clientIp, jsonError, readJsonBody, requireString } from '@/lib/auth/server/apiAuth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+\d][\d\s-]{5,20}$/;

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req);
  if (!body) return jsonError(400, 'INVALID_BODY', 'Request body must be a JSON object.');

  const name = requireString(body, 'name', 2, 80);
  if ('error' in name) return jsonError(400, 'INVALID_FIELD', name.error);
  const email = requireString(body, 'email', 3, 120);
  if ('error' in email) return jsonError(400, 'INVALID_FIELD', email.error);
  const phone = requireString(body, 'phone', 6, 20);
  if ('error' in phone) return jsonError(400, 'INVALID_FIELD', phone.error);
  const password = requireString(body, 'password', 8, 128);
  if ('error' in password) return jsonError(400, 'INVALID_FIELD', password.error);

  if (!EMAIL_PATTERN.test(email.value)) {
    return jsonError(400, 'INVALID_INPUT', 'Please provide a valid email address.');
  }
  if (!PHONE_PATTERN.test(phone.value)) {
    return jsonError(400, 'INVALID_INPUT', 'Please provide a valid phone number.');
  }

  if (!isSupabaseAuthConfigured()) {
    return jsonError(
      503,
      'AUTH_NOT_CONFIGURED',
      'Authentication service is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  const result = registerUser({ name: name.value, email: email.value, phone: phone.value, password: password.value });
  if (!result.ok) {
    if (result.error === 'EMAIL_TAKEN') {
      return jsonError(400, 'EMAIL_TAKEN', 'An account with this email already exists. Try signing in instead.');
    }
    return jsonError(400, 'INVALID_INPUT', 'Registration failed validation. Check the provided details.');
  }

  const ip = clientIp(req);

  // Supabase Auth sign-up. The role is intentionally NOT part of the payload —
  // self-registration can only ever create a CITIZEN.
  let authUser: SupabaseAuthUser | null = null;
  let session: { access_token: string; refresh_token: string; expires_at?: number | null } | null = null;
  try {
    const supabase = createAnonSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: {
          full_name: name.value,
          name: name.value,
          phone: phone.value,
          aadhaar_or_gov_id: 'PENDING-KYC',
        },
      },
    });

    if (error) {
      const message = (error.message ?? '').toLowerCase();
      const code = (error.code ?? '').toLowerCase();
      if (code === 'user_already_exists' || code === 'email_exists' || message.includes('already registered') || message.includes('already exists')) {
        return jsonError(400, 'EMAIL_TAKEN', 'An account with this email already exists. Try signing in instead.');
      }
      if (message.includes('password')) {
        return jsonError(400, 'WEAK_PASSWORD', `Password rejected: ${error.message}`);
      }
      if (message.includes('email') && message.includes('invalid')) {
        return jsonError(400, 'INVALID_INPUT', 'Please provide a valid email address.');
      }
      if (code === 'over_request_rate_limit' || message.includes('rate limit')) {
        return jsonError(429, 'SIGNUP_RATE_LIMITED', 'Too many registration attempts. Please wait a moment and try again.');
      }
      return jsonError(400, 'SIGNUP_FAILED', 'Registration failed. Check the provided details and try again.');
    }

    authUser = data.user ?? null;
    session = data.session;

    // With email confirmation enabled Supabase returns a user but NO session.
    // `identities: []` is Supabase's obfuscated "email already registered".
    if (!session && authUser && Array.isArray(authUser.identities) && authUser.identities.length === 0) {
      return jsonError(400, 'EMAIL_TAKEN', 'An account with this email already exists. Try signing in instead.');
    }
  } catch {
    return jsonError(503, 'AUTH_UNAVAILABLE', 'The authentication service could not be reached. Please try again.');
  }

  if (!authUser) {
    return jsonError(400, 'SIGNUP_FAILED', 'Registration failed. Check the provided details and try again.');
  }

  if (!session) {
    // Email confirmation required — no session is issued yet. The profile row
    // is created on first sign-in (self-healing), so nothing privileged
    // happens before the address is verified.
    appendAudit({
      actorId: authUser.id,
      actorName: name.value,
      actorRole: 'CITIZEN',
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: authUser.id,
      newValue: 'CITIZEN/PENDING_EMAIL',
      details: `Self-registered citizen account awaiting email confirmation (${email.value}).`,
      ipAddress: ip,
    });
    return NextResponse.json({ requiresEmailVerification: true, email: email.value });
  }

  // Confirmed signup — create/update the profile row (role CITIZEN) as the
  // user themselves (RLS) or via service-role when configured.
  const profile = await ensureProfileForAuthUser(authUser, session.access_token);
  const publicUser = toPublicUser(authUser, profile ?? undefined);
  const expiresAt = session.expires_at ?? Math.floor(Date.now() / 1000) + 3600;

  appendAudit({
    actorId: authUser.id,
    actorName: publicUser.name,
    actorRole: publicUser.role,
    action: 'USER_CREATED',
    entityType: 'USER',
    entityId: authUser.id,
    newValue: 'CITIZEN/ACTIVE',
    details: `Self-registered citizen account (${publicUser.email}).`,
    ipAddress: ip,
  });
  appendAudit({
    actorId: authUser.id,
    actorName: publicUser.name,
    actorRole: publicUser.role,
    action: 'REGISTER',
    entityType: 'SESSION',
    entityId: authUser.id,
    newValue: 'signed-in',
    details: 'Automatic sign-in after registration.',
    ipAddress: ip,
  });

  const res = NextResponse.json({
    user: { ...publicUser, sessionExpiresAt: expiresAt * 1000, authMethod: 'REGISTRATION' },
  });
  setSessionCookie(res, {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: expiresAt,
  });
  return res;
}
