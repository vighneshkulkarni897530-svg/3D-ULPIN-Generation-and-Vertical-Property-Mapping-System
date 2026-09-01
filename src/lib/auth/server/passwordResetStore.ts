/**
 * PROTOTYPE Password-Reset Token Store (Phase — Login & Sign Up completion)
 * ==========================================================================
 * SERVER-ONLY. In-memory, single-use password-reset tokens backing the
 * /auth/forgot-password and /auth/reset-password flow.
 *
 * ⚠ PROTOTYPE-ONLY STORAGE: tokens live in the Node.js process memory and are
 *   lost on restart. NO email delivery is configured in the prototype — in
 *   non-production builds the reset token is returned to the requesting
 *   client so the flow is testable (clearly labelled in the UI as a
 *   development limitation). Production builds NEVER return the token; a
 *   production deployment would deliver it via a transactional email service
 *   and back this store with a database.
 *
 * Security properties:
 *   - 256-bit cryptographically random opaque tokens (never guessable)
 *   - Tokens are stored SHA-256-hashed — a memory dump does not reveal them
 *   - Single-use: a token is consumed on first successful validation
 *   - Short TTL (15 minutes)
 *   - Per-email request rate limiting (max 3 requests / 15 min)
 *   - Tokens/passwords are NEVER logged (audit records note the event only)
 */

import crypto from 'node:crypto';

/** How long a reset token remains valid. */
export const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

const MAX_REQUESTS_PER_WINDOW = 3;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;
const MAX_TOKEN_LENGTH = 200;

/** Reset records keyed by SHA-256(token) — the raw token is never stored. */
const resetTokens = new Map<string, { email: string; expiresAt: number }>();

/** Request timestamps per email for rate limiting. */
const requestLog = new Map<string, number[]>();

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Rate limit for reset requests (per email). Counts the request when not
 * limited, so callers can call it before deciding to issue a token.
 */
export function checkResetRequestRateLimit(email: string): { limited: boolean; retryAfterSec: number } {
  const key = normalizeEmail(email);
  const now = Date.now();
  const stamps = (requestLog.get(key) ?? []).filter((t) => now - t < REQUEST_WINDOW_MS);
  if (stamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = Math.min(...stamps);
    return { limited: true, retryAfterSec: Math.max(1, Math.ceil((oldest + REQUEST_WINDOW_MS - now) / 1000)) };
  }
  stamps.push(now);
  requestLog.set(key, stamps);
  return { limited: false, retryAfterSec: 0 };
}

/** Issues a single-use reset token for a verified account. */
export function issueResetToken(email: string): { token: string; expiresAt: number } {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + RESET_TOKEN_TTL_MS;
  resetTokens.set(hashToken(token), { email: normalizeEmail(email), expiresAt });
  return { token, expiresAt };
}

/**
 * Validates and CONSUMES a reset token (single-use — consumed even when it
 * turns out to be expired, so expired tokens cannot be replayed).
 * Returns the account email, or null when the token is invalid/expired.
 */
export function consumeResetToken(token: string): { email: string } | null {
  if (!token || token.length > MAX_TOKEN_LENGTH) return null;
  const key = hashToken(token);
  const record = resetTokens.get(key);
  if (!record) return null;
  resetTokens.delete(key);
  if (Date.now() >= record.expiresAt) return null;
  return { email: record.email };
}

/** Removes outstanding tokens for an email (e.g. after a completed reset). */
export function revokeResetTokensForEmail(email: string): void {
  const key = normalizeEmail(email);
  for (const [hash, record] of resetTokens) {
    if (record.email === key) resetTokens.delete(hash);
  }
}

/** Number of outstanding reset tokens (diagnostics only — no token material). */
export function outstandingResetTokenCount(): number {
  return resetTokens.size;
}