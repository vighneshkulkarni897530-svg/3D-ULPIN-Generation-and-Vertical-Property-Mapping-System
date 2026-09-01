/**
 * POST /api/auth/reset-password (Phase — Login & Sign Up completion)
 * Consumes a single-use reset token and sets a new password. On success ALL
 * existing sessions for the account are destroyed (forcing re-authentication)
 * and PASSWORD_RESET_COMPLETED is audited. Token material and passwords are
 * never logged.
 *
 * The token is consumed BEFORE the password is validated, so a weak password
 * cannot be retried against the same token — the user must request a fresh
 * reset link. Expired/unknown tokens always return the same generic error.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { findUserByEmail, resetUserPassword } from '@/lib/auth/server/userStore';
import { consumeResetToken } from '@/lib/auth/server/passwordResetStore';
import { destroySessionsForUser } from '@/lib/auth/server/sessionStore';
import { appendAudit } from '@/lib/auth/server/auditStore';
import { clientIp, jsonError, readJsonBody, requireString } from '@/lib/auth/server/apiAuth';

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req);
  if (!body) return jsonError(400, 'INVALID_BODY', 'Request body must be a JSON object.');

  const token = requireString(body, 'token', 10, 200);
  if ('error' in token) {
    return jsonError(400, 'INVALID_TOKEN', 'This password reset link is invalid or has expired. Please request a new one.');
  }
  const password = requireString(body, 'password', 8, 128);
  if ('error' in password) {
    return jsonError(400, 'INVALID_FIELD', 'New password must be between 8 and 128 characters.');
  }

  // Single-use consumption happens first (even for expired tokens).
  const consumed = consumeResetToken(token.value);
  if (!consumed) {
    return jsonError(400, 'INVALID_TOKEN', 'This password reset link is invalid or has expired. Please request a new one.');
  }

  const result = resetUserPassword(consumed.email, password.value);
  if (!result.ok) {
    return jsonError(
      400,
      'WEAK_PASSWORD',
      'The new password does not meet the security requirements. Please request a new reset link and try again.',
    );
  }

  const user = findUserByEmail(consumed.email);
  const sessionsDestroyed = user ? destroySessionsForUser(user.id) : 0;

  appendAudit({
    actorId: user?.id ?? 'unknown',
    actorName: user?.name ?? consumed.email,
    actorRole: user?.role ?? 'CITIZEN',
    action: 'PASSWORD_RESET_COMPLETED',
    entityType: 'USER',
    entityId: user?.id ?? consumed.email,
    newValue: 'password-changed',
    details: `Password reset completed. ${sessionsDestroyed} existing session(s) invalidated.`,
    ipAddress: clientIp(req),
  });

  return NextResponse.json({ ok: true });
}