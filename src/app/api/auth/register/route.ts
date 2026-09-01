/**
 * POST /api/auth/register (Phase 10)
 * Self-registration for CITIZEN accounts only. Creates the account in the
 * prototype user store, signs the user in (httpOnly session cookie) and
 * audits USER_CREATED + REGISTER.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { registerUser } from '@/lib/auth/server/userStore';
import { createSession, setSessionCookie } from '@/lib/auth/server/sessionStore';
import { appendAudit } from '@/lib/auth/server/auditStore';
import { clientIp, jsonError, readJsonBody, requireString } from '@/lib/auth/server/apiAuth';

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

  const result = registerUser({ name: name.value, email: email.value, phone: phone.value, password: password.value });
  if (!result.ok) {
    if (result.error === 'EMAIL_TAKEN') {
      return jsonError(400, 'EMAIL_TAKEN', 'An account with this email already exists. Try signing in instead.');
    }
    if (result.error === 'WEAK_PASSWORD') {
      return jsonError(
        400,
        'WEAK_PASSWORD',
        'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a special character.',
      );
    }
    return jsonError(400, 'INVALID_INPUT', 'Registration failed validation. Check the provided details.');
  }

  const ip = clientIp(req);
  appendAudit({
    actorId: result.user.id,
    actorName: result.user.name,
    actorRole: result.user.role,
    action: 'USER_CREATED',
    entityType: 'USER',
    entityId: result.user.id,
    newValue: 'CITIZEN/ACTIVE',
    details: `Self-registered citizen account (${result.user.email}).`,
    ipAddress: ip,
  });

  const { token, expiresAt } = createSession(result.user.id, 'REGISTRATION');
  appendAudit({
    actorId: result.user.id,
    actorName: result.user.name,
    actorRole: result.user.role,
    action: 'REGISTER',
    entityType: 'SESSION',
    entityId: result.user.id,
    newValue: 'signed-in',
    details: 'Automatic sign-in after registration.',
    ipAddress: ip,
  });

  const res = NextResponse.json({ user: { ...result.user, sessionExpiresAt: expiresAt } });
  setSessionCookie(res, token, expiresAt);
  return res;
}
