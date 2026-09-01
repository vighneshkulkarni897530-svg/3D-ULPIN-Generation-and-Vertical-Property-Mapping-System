/**
 * POST /api/auth/forgot-password (Phase — Login & Sign Up completion)
 * Issues a single-use, 15-minute password-reset token for a registered,
 * ACTIVE account. The response is GENERIC — it never reveals whether the
 * email belongs to an account (no information leakage). Requests are
 * rate-limited per email.
 *
 * ⚠ DEVELOPMENT LIMITATION: no transactional email service is configured in
 *   this prototype. In NON-PRODUCTION builds the reset token is returned in
 *   the response (`devResetToken`) so the flow is testable; the UI labels it
 *   clearly as a development behaviour. In production builds the token is
 *   never returned to the client — it would be delivered by email instead.
 *
 * Audits PASSWORD_RESET_REQUESTED (token material is never logged).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { findUserByEmail } from '@/lib/auth/server/userStore';
import {
  checkResetRequestRateLimit,
  issueResetToken,
} from '@/lib/auth/server/passwordResetStore';
import { appendAudit } from '@/lib/auth/server/auditStore';
import { clientIp, jsonError, readJsonBody, requireString } from '@/lib/auth/server/apiAuth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req);
  if (!body) return jsonError(400, 'INVALID_BODY', 'Request body must be a JSON object.');

  const email = requireString(body, 'email', 3, 120);
  if ('error' in email) return jsonError(400, 'INVALID_FIELD', email.error);
  if (!EMAIL_PATTERN.test(email.value)) {
    return jsonError(400, 'INVALID_FIELD', 'Field "email" must be a valid email address.');
  }

  /**
   * Generic success envelope — identical shape whether or not the account
   * exists, so the response cannot be used to enumerate accounts.
   */
  const respond = (extra: Record<string, unknown> = {}) =>
    NextResponse.json({
      ok: true,
      deliveryMethod: 'none' as const,
      message: 'If an account exists for this email, a password reset link has been generated.',
      ...extra,
    });

  const user = findUserByEmail(email.value);
  if (!user || user.accountStatus === 'DISABLED') {
    return respond();
  }

  const rate = checkResetRequestRateLimit(email.value);
  if (rate.limited) {
    // Silently swallow rate-limited requests behind the generic response.
    return respond();
  }

  const { token, expiresAt } = issueResetToken(email.value);
  appendAudit({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: 'PASSWORD_RESET_REQUESTED',
    entityType: 'USER',
    entityId: user.id,
    details: 'Password reset requested. A single-use token was issued (15-minute validity).',
    ipAddress: clientIp(req),
  });

  if (process.env.NODE_ENV !== 'production') {
    // Development-only convenience (documented limitation — no email service).
    return respond({
      devMode: true,
      devResetToken: token,
      devExpiresAt: new Date(expiresAt).toISOString(),
      devNote:
        'Development mode: email delivery is not configured in this prototype, so the reset token is shown here instead of being emailed. This behaviour is disabled in production builds.',
    });
  }

  return respond();
}