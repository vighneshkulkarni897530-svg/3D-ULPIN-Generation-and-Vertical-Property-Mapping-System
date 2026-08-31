/**
 * POST /api/auth/login (Phase 10)
 * Validates credentials against the prototype user store, creates a session
 * (httpOnly cookie) and audits the attempt. Server-side only — no secrets
 * are exposed and role/permissions are always derived from the server record.
 */
import { NextResponse, type NextRequest } from 'next/server';
import {
  checkCredentials,
  DEMO_PASSWORD,
} from '@/lib/auth/server/userStore';
import { createSession, setSessionCookie } from '@/lib/auth/server/sessionStore';
import { appendAudit } from '@/lib/auth/server/auditStore';
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

  const result = checkCredentials(emailCheck.value, passwordCheck.value);
  if (!result.ok) {
    appendAudit({
      actorId: 'anonymous',
      actorName: emailCheck.value,
      actorRole: 'CITIZEN',
      action: 'LOGIN_FAILED',
      entityType: 'SESSION',
      entityId: emailCheck.value,
      details: result.error === 'ACCOUNT_DISABLED' ? 'Attempt on a disabled account.' : 'Invalid credentials.',
      ipAddress: ip,
    });
    if (result.error === 'ACCOUNT_DISABLED') {
      return jsonError(403, 'ACCOUNT_DISABLED', 'This account has been disabled. Contact the cadastre administrator.');
    }
    return jsonError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  clearLoginRateLimit(ip, emailCheck.value);
  const { token, expiresAt } = createSession(result.user.id, 'PASSWORD');
  appendAudit({
    actorId: result.user.id,
    actorName: result.user.name,
    actorRole: result.user.role,
    action: 'LOGIN',
    entityType: 'SESSION',
    entityId: result.user.id,
    newValue: 'signed-in',
    details: `Signed in with email/password as ${result.user.role}.`,
    ipAddress: ip,
  });

  const res = NextResponse.json({
    user: { ...result.user, sessionExpiresAt: expiresAt },
    demoPasswordHint: DEMO_PASSWORD === passwordCheck.value ? 'demo' : undefined,
  });
  setSessionCookie(res, token, expiresAt);
  return res;
}
