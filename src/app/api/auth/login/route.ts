/**
 * POST /api/auth/login (Phase 14)
 * Real Supabase Auth sign-in. Verifies credentials with Supabase
 * (`signInWithPassword`), loads the application profile (role + account
 * status) and establishes the session in the httpOnly `spv_session` cookie.
 * Brute-force rate limiting and audit logging are preserved from Phase 10.
 * Server-side only — no secrets are exposed and role/permissions are always
 * derived from the server-side profile record.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { authenticateWithPassword } from '@/lib/auth/server/authService';
import { appendAudit } from '@/lib/auth/server/auditStore';
import { setSessionCookie } from '@/lib/auth/server/sessionStore';
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  clientIp,
  jsonError,
  readJsonBody,
  requireString,
} from '@/lib/auth/server/apiAuth';

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req);
  if (!body) return jsonError(400, 'INVALID_BODY', 'Request body must be a JSON object.');

  const emailCheck = requireString(body, 'email', 3, 120);
  if ('error' in emailCheck) return jsonError(400, 'INVALID_FIELD', emailCheck.error);
  const passwordCheck = requireString(body, 'password', 1, 128);
  if ('error' in passwordCheck) return jsonError(400, 'INVALID_FIELD', passwordCheck.error);

  const ip = clientIp(req);
  const rate = checkLoginRateLimit(ip, emailCheck.value);
  if (rate.limited) {
    return jsonError(429, 'RATE_LIMITED', `Too many sign-in attempts. Try again in ${rate.retryAfterSec}s.`);
  }

  const result = await authenticateWithPassword(emailCheck.value, passwordCheck.value);
  if (!result.ok) {
    appendAudit({
      actorId: 'anonymous',
      actorName: emailCheck.value,
      actorRole: 'CITIZEN',
      action: 'LOGIN_FAILED',
      entityType: 'SESSION',
      entityId: emailCheck.value,
      details:
        result.error === 'ACCOUNT_DISABLED'
          ? 'Attempt on a disabled account.'
          : result.error === 'EMAIL_NOT_CONFIRMED'
            ? 'Attempt before email confirmation.'
            : result.error === 'NOT_CONFIGURED'
              ? 'Sign-in attempted while Supabase Auth is not configured.'
              : 'Invalid credentials.',
      ipAddress: ip,
    });
    switch (result.error) {
      case 'NOT_CONFIGURED':
        return jsonError(503, 'AUTH_NOT_CONFIGURED', result.message ?? 'Authentication service is not configured.');
      case 'ACCOUNT_DISABLED':
        return jsonError(403, 'ACCOUNT_DISABLED', result.message ?? 'This account has been disabled.');
      case 'EMAIL_NOT_CONFIRMED':
        return jsonError(403, 'EMAIL_NOT_CONFIRMED', result.message ?? 'Confirm your email address before signing in.');
      default:
        return jsonError(401, 'INVALID_CREDENTIALS', result.message ?? 'Invalid email or password.');
    }
  }

  clearLoginRateLimit(ip, emailCheck.value);
  appendAudit({
    actorId: result.authUser.id,
    actorName: result.publicUser.name,
    actorRole: result.publicUser.role,
    action: 'LOGIN',
    entityType: 'SESSION',
    entityId: result.authUser.id,
    newValue: 'signed-in',
    details: `Signed in with Supabase Auth (email/password) as ${result.publicUser.role}.`,
    ipAddress: ip,
  });

  const res = NextResponse.json({
    user: {
      ...result.publicUser,
      sessionExpiresAt: result.session.expires_at * 1000,
      authMethod: 'PASSWORD',
    },
  });
  setSessionCookie(res, result.session);
  return res;
}

