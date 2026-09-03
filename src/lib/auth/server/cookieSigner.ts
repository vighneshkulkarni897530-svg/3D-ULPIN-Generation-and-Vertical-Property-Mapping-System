/**
 * Server-side HMAC signing utilities (Phase 15)
 * ==============================================
 * Provides cryptographic integrity for the auth session cookie and for the
 * short-lived OTP "session claims" used by /api/auth/firebase-login.
 *
 * ⚠ SERVER-ONLY (uses node:crypto). Never import from client components or
 *   edge middleware. The same secret family as the OTP store is used
 *   (SESSION_SECRET env var with a documented prototype fallback).
 */

import crypto from 'node:crypto';

const SIGNING_SECRET =
  process.env.SESSION_SECRET || 'bhu-verify-cadastre-otp-hmac-secret-2024';

/** HMAC-SHA256 signature (hex) of an arbitrary payload string. */
export function signPayload(payload: string): string {
  return crypto.createHmac('sha256', SIGNING_SECRET).update(payload).digest('hex');
}

/** Constant-time comparison of a payload against an expected signature. */
export function verifySignature(payload: string, signature: string): boolean {
  if (typeof signature !== 'string' || signature.length === 0) return false;
  const expected = signPayload(payload);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── Session-cookie integrity ─────────────────────────────────────────────────

/**
 * Canonical string for the session cookie contents. Every field that
 * `getSessionUser` trusts MUST be part of this string, otherwise the
 * signature can be transplanted between sessions.
 */
export function sessionSignatureMaterial(input: {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  userId?: string;
  email?: string;
}): string {
  return [
    input.access_token,
    input.refresh_token ?? '',
    String(input.expires_at),
    input.userId ?? '',
    input.email ?? '',
  ].join('|');
}

export function signSession(
  session: {
    access_token: string;
    refresh_token?: string;
    expires_at: number;
    userId?: string;
    email?: string;
  },
): string {
  return signPayload(sessionSignatureMaterial(session));
}

// ── OTP session claims (short-lived, single-purpose) ─────────────────────────

const OTP_CLAIM_TTL_MS = 10 * 60 * 1000; // 10 minutes to complete sign-in

/**
 * Creates a signed, short-lived claim proving that `/api/auth/otp/verify`
 * successfully validated an OTP challenge for `email`. The claim is consumed
 * by /api/auth/firebase-login which would otherwise have to trust a
 * client-fabricated token.
 */
export function createOtpSessionClaim(email: string): string {
  const normalized = email.trim().toLowerCase();
  const payloadObj = {
    e: normalized,
    x: Date.now() + OTP_CLAIM_TTL_MS,
  };
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  return `${payload}.${signPayload(`otp-claim:${payload}`)}`;
}

/** Verifies an OTP session claim belongs to `email` and has not expired. */
export function verifyOtpSessionClaim(claim: string, email: string): boolean {
  if (typeof claim !== 'string' || claim.length === 0) return false;
  const dotIndex = claim.lastIndexOf('.');
  if (dotIndex <= 0) return false;
  const payload = claim.slice(0, dotIndex);
  const signature = claim.slice(dotIndex + 1);
  if (!verifySignature(`otp-claim:${payload}`, signature)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      e?: string;
      x?: number;
    };
    if (!parsed.e || !parsed.x) return false;
    if (parsed.e !== email.trim().toLowerCase()) return false;
    return Date.now() <= parsed.x;
  } catch {
    return false;
  }
}
