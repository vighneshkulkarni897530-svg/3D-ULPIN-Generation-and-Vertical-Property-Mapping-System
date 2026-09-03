/**
 * POST /api/auth/login
 * Real sign-in endpoint. Authenticates against Supabase Auth when configured,
 * and falls back to the durable userStore with scrypt hash checking.
 * Establishes a persistent 365-day session cookie.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { authenticateWithPassword } from '@/lib/auth/server/authService';
import { appendAudit } from '@/lib/auth/server/auditStore';
import { setSessionCookie, SESSION_MAX_AGE_SEC } from '@/lib/auth/server/sessionStore';
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  clientIp,
  jsonError,
  readJsonBody,
  requireString,
} from '@/lib/auth/server/apiAuth';
import { isSupabaseAuthConfigured } from '@/lib/supabase/env';
import { checkCredentials, checkRoleCredentials, toPublicUser } from '@/lib/auth/server/userStore';

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req);
  if (!body) return jsonError(400, 'INVALID_BODY', 'Request body must be a JSON object.');

  const emailCheck = requireString(body, 'email', 3, 120);
  if ('error' in emailCheck) return jsonError(400, 'INVALID_FIELD', emailCheck.error);
  const passwordCheck = requireString(body, 'password', 1, 128);
  if ('error' in passwordCheck) return jsonError(400, 'INVALID_FIELD', passwordCheck.error);

  const portalRole = typeof body.portalRole === 'string'
    ? (body.portalRole.toUpperCase() as 'CITIZEN' | 'OFFICER' | 'ADMIN')
    : undefined;
  const badgeNumber = typeof body.badgeNumber === 'string' ? body.badgeNumber : undefined;
  const societyRegNo = typeof body.societyRegNo === 'string' ? body.societyRegNo : undefined;

  const ip = clientIp(req);
  const rate = checkLoginRateLimit(ip, emailCheck.value);
  if (rate.limited) {
    return jsonError(429, 'RATE_LIMITED', `Too many sign-in attempts. Try again in ${rate.retryAfterSec}s.`);
  }

  // 1) When Supabase Auth is NOT configured, authenticate against durable userStore
  if (!isSupabaseAuthConfigured()) {
    const credCheck = checkRoleCredentials(emailCheck.value, passwordCheck.value, portalRole, {
      badgeNumber,
      societyRegNo,
    });
    if (!credCheck.ok) {
      appendAudit({
        actorId: 'anonymous',
        actorName: emailCheck.value,
        actorRole: portalRole || 'CITIZEN',
        action: 'LOGIN_FAILED',
        entityType: 'SESSION',
        entityId: emailCheck.value,
        details: credCheck.roleMismatch
          ? `Attempted login to ${portalRole} portal with mismatched role.`
          : credCheck.idMismatch
          ? 'Mismatched badge or society registration number.'
          : credCheck.error === 'ACCOUNT_DISABLED'
          ? 'Attempt on a disabled account.'
          : 'Invalid credentials.',
        ipAddress: ip,
      });

      if (credCheck.roleMismatch) {
        const targetPortal =
          portalRole === 'OFFICER'
            ? 'Government Revenue Officer Portal'
            : portalRole === 'ADMIN'
            ? 'Society Secretary Portal'
            : 'Citizen Portal';
        return jsonError(
          403,
          'ROLE_MISMATCH',
          `Access restricted: this account is not authorized for the ${targetPortal}. Please sign in through your designated portal.`
        );
      }

      if (credCheck.idMismatch) {
        const idLabel = portalRole === 'OFFICER' ? 'Revenue Badge ID' : 'Society Registration Number';
        return jsonError(
          401,
          'INVALID_IDENTIFIER',
          `The entered ${idLabel} does not match our records for this account.`
        );
      }

      if (credCheck.error === 'ACCOUNT_DISABLED') {
        return jsonError(403, 'ACCOUNT_DISABLED', 'This account has been disabled. Contact the administrator.');
      }
      return jsonError(401, 'INVALID_CREDENTIALS', 'Invalid email, badge/society ID, or password.');
    }

    clearLoginRateLimit(ip, emailCheck.value);
    const pubUser = toPublicUser(credCheck.user);
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC;
    const session = {
      access_token: `pwd_session_${pubUser.id}`,
      refresh_token: 'pwd-session-token',
      expires_at: expiresAt,
      userId: pubUser.id,
      email: pubUser.email,
    };

    appendAudit({
      actorId: pubUser.id,
      actorName: pubUser.name,
      actorRole: pubUser.role,
      action: 'LOGIN',
      entityType: 'SESSION',
      entityId: pubUser.id,
      newValue: 'signed-in',
      details: `Signed in as ${pubUser.role} (persistent session).`,
      ipAddress: ip,
    });

    const res = NextResponse.json({
      user: {
        ...pubUser,
        sessionExpiresAt: expiresAt * 1000,
        authMethod: 'PASSWORD',
      },
    });
    setSessionCookie(res, session);
    return res;
  }

  // 2) When Supabase Auth is configured
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
            : 'Invalid credentials.',
      ipAddress: ip,
    });
    switch (result.error) {
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
