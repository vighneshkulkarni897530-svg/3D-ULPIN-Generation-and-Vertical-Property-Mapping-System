/**
 * API Authorization Helpers (Phase 10 → Phase 14) — SERVER-ONLY
 * ==============================================================
 * The single server boundary used by every /api route:
 *
 *   401 → unauthenticated (no/invalid/expired/revoked Supabase session)
 *   403 → authenticated but not authorized for the action
 *   400 → invalid request payload
 *   429 → rate limited (login brute-force protection)
 *   503 → Supabase Auth/DB not configured or unavailable
 *
 * Phase 14: authentication is Supabase Auth. `requireAuth` verifies the
 * session's access token with Supabase and loads the caller's profile — the
 * ROLE and ACCOUNT STATUS always come from the server's `profiles` table,
 * never from request bodies or headers. If the session was refreshed during
 * verification, `requireSession` exposes the rotated session so routes can
 * re-issue the httpOnly cookie.
 *
 * Every sensitive route MUST go through requireAuth / requirePermission —
 * role values are never accepted from the client.
 */

import { NextResponse, type NextRequest } from 'next/server';
import type { Permission } from '@/types/auth';
import { ROLE_PERMISSIONS } from '@/types/auth';
import { getSessionUser, type AuthenticatedUser, type SupabaseSessionData } from './sessionStore';
import type { AuditAction, AuditEntityType } from './auditStore';

export type { AuthenticatedUser };
export type { SupabaseSessionData };

/** Result of the async guards: an authenticated user (+optional rotated session) or an error response. */
export type AuthGuardResult =
  | { user: AuthenticatedUser; refreshedSession?: SupabaseSessionData }
  | { response: NextResponse };

/** Session-based authentication check → user or a 401 response. Async: verifies with Supabase Auth. */
export async function requireAuth(req: NextRequest): Promise<AuthGuardResult> {
  const resolved = await getSessionUser(req);
  if (!resolved) {
    return { response: jsonError(401, 'UNAUTHENTICATED', 'Authentication required. Please sign in.') };
  }
  return { user: resolved.user, ...(resolved.refreshedSession ? { refreshedSession: resolved.refreshedSession } : {}) };
}

/** Session + permission check → user, a 401 (not signed in) or a 403 response. */
export async function requirePermission(req: NextRequest, permission: Permission): Promise<AuthGuardResult> {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth;
  const granted = ROLE_PERMISSIONS[auth.user.role]?.includes(permission) ?? false;
  if (!granted) {
    return { response: jsonError(403, 'FORBIDDEN', 'You do not have permission to perform this action.') };
  }
  return auth;
}

/** Standard JSON error envelope. */
export function jsonError(status: 400 | 401 | 403 | 404 | 405 | 409 | 429 | 500 | 503, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

// ── Input validation (dependency-free) ───────────────────────────────────────

/** Parses a JSON body, enforcing a size cap. Returns null on malformed JSON. */
export async function readJsonBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const text = await req.text();
    if (text.length > 20_000) return null; // hard cap — no route needs more
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** String field validator: trims and enforces min/max length. */
export function requireString(body: Record<string, unknown>, field: string, min: number, max: number): { value: string } | { error: string } {
  const raw = body[field];
  if (typeof raw !== 'string') return { error: `Field "${field}" must be a string.` };
  const value = raw.trim();
  if (value.length < min || value.length > max) {
    return { error: `Field "${field}" must be between ${min} and ${max} characters.` };
  }
  return { value };
}

/** Optional string field: absent → undefined; present but invalid → error. */
export function optionalString(body: Record<string, unknown>, field: string, max: number): { value?: string } | { error: string } {
  const raw = body[field];
  if (raw === undefined || raw === null || raw === '') return { value: undefined };
  if (typeof raw !== 'string') return { error: `Field "${field}" must be a string.` };
  if (raw.length > max) return { error: `Field "${field}" must be at most ${max} characters.` };
  return { value: raw.trim() };
}

// ── Login rate limiting (prototype in-memory, per IP+email) ──────────────────

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 5 * 60 * 1000;
const attempts = new Map<string, { count: number; windowStart: number }>();

export function checkLoginRateLimit(ip: string, email: string): { limited: boolean; retryAfterSec: number } {
  const key = `${ip}:${email.toLowerCase()}`;
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now });
    return { limited: false, retryAfterSec: 0 };
  }
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000);
    return { limited: true, retryAfterSec: Math.max(retryAfterSec, 1) };
  }
  return { limited: false, retryAfterSec: 0 };
}

export function clearLoginRateLimit(ip: string, email: string): void {
  attempts.delete(`${ip}:${email.toLowerCase()}`);
}

/** Best-effort client IP for audit/rate-limit keys. */
export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
}

/** Type guard re-exports for route handlers. */
export type { AuditAction, AuditEntityType };
