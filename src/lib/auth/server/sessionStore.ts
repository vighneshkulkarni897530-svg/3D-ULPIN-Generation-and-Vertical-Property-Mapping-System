/**
 * PROTOTYPE Session Store (Phase 10) — SERVER-ONLY
 * ==================================================
 * ⚠ PROTOTYPE-ONLY STORAGE: sessions live in the Node.js process memory of
 *   the Next.js server and expire after SESSION_TTL_MS. They are not
 *   persisted — a server restart signs everyone out. A production deployment
 *   would back this with Redis/a database and rotate tokens.
 *
 * Security properties:
 *   - 256-bit cryptographically random opaque session tokens (never guessable)
 *   - Tokens are ONLY ever sent to the client in an httpOnly, SameSite=Lax
 *     cookie so client-side JavaScript can never read the token.
 *   - Sliding expiry: each validated session extends its lifetime.
 */

import crypto from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';
import type { User, UserRole } from '@/types';
import { findUserById, toPublicUser } from './userStore';
import { SESSION_COOKIE } from '../sessionCookie';

export { SESSION_COOKIE };
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

/** Server-side session record. The token is the Map key and NEVER stored here. */
interface SessionRecord {
  userId: string;
  role: UserRole;
  authMethod: 'DEMO_FORM' | 'PASSWORD' | 'REGISTRATION';
  createdAt: number;
  expiresAt: number;
}

const inMemorySessions = new Map<string, SessionRecord>();

function newToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/** Creates a session for a user and returns the raw token + expiry. */
export function createSession(
  userId: string,
  authMethod: SessionRecord['authMethod'],
): { token: string; expiresAt: number } {
  const token = newToken();
  const now = Date.now();
  inMemorySessions.set(token, {
    userId,
    role: findUserById(userId)?.role ?? 'CITIZEN',
    authMethod,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  });
  return { token, expiresAt: now + SESSION_TTL_MS };
}

/** Validates a token; extends sliding expiry. Returns null when invalid/expired. */
export function validateSession(token: string | undefined | null): SessionRecord | null {
  if (!token) return null;
  const session = inMemorySessions.get(token);
  if (!session) return null;
  const now = Date.now();
  if (now >= session.expiresAt) {
    inMemorySessions.delete(token);
    return null;
  }
  // Sliding expiry
  session.expiresAt = now + SESSION_TTL_MS;
  return session;
}

/** Destroys a session (logout). Returns true when a session existed. */
export function destroySession(token: string | undefined | null): boolean {
  if (!token) return false;
  return inMemorySessions.delete(token);
}

/** The authenticated user for a request, or null. Safe public projection. */
export function getSessionUser(req: NextRequest): (Omit<User, never> & { sessionExpiresAt: number; authMethod: SessionRecord['authMethod'] }) | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = validateSession(token);
  if (!session) return null;
  const user = findUserById(session.userId);
  if (!user || user.accountStatus === 'DISABLED') {
    if (token) destroySession(token);
    return null;
  }
  return { ...toPublicUser(user), sessionExpiresAt: session.expiresAt, authMethod: session.authMethod };
}

/** Attaches a session cookie to an outgoing response. */
export function setSessionCookie(res: NextResponse, token: string, expiresAt: number): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expiresAt),
  });
}

/** Clears the session cookie on an outgoing response. */
export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

/** Number of live sessions (diagnostics). */
export function liveSessionCount(): number {
  const now = Date.now();
  let count = 0;
  for (const s of inMemorySessions.values()) if (s.expiresAt > now) count += 1;
  return count;
}
