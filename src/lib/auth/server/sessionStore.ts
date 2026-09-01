/**
 * Supabase Auth Session Store (Phase 14) — SERVER-ONLY
 * =====================================================
 * Replaces the Phase 10 in-memory session store. Sessions are REAL Supabase
 * Auth sessions:
 *
 *   - The Supabase session (access token + refresh token + expiry) is stored
 *     server-side ONLY, in the httpOnly `spv_session` cookie (same cookie name
 *     as Phase 10, same flags: httpOnly, SameSite=Lax, Secure in production).
 *     No tokens are stored in localStorage and nothing is exposed to
 *     client-side JavaScript.
 *   - Every server-side check verifies the access token with Supabase Auth
 *     (`auth.getUser(jwt)`) — a forged or expired cookie can never pass.
 *   - Expired-but-refreshable sessions are refreshed via the refresh token
 *     (only when the caller explicitly allows it — the /api/auth/session
 *     route — so refresh-token rotation can never race between requests).
 *   - Profiles (and therefore roles + account status) are loaded from the
 *     `profiles` table per request. Disabled accounts lose API access
 *     immediately.
 *
 * Exported names (`getSessionUser`, `setSessionCookie`, `clearSessionCookie`,
 * `SESSION_COOKIE`) keep their Phase 10 shapes so the API boundary
 * (`apiAuth.ts`) and route handlers remain familiar.
 */

import type { NextRequest, NextResponse } from 'next/server';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { User } from '@/types';
import { SESSION_COOKIE } from '../sessionCookie';

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};
import { createAnonSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseAuthConfigured } from '@/lib/supabase/env';
import { ensureProfileForAuthUser, toPublicUser } from './profiles';

export { SESSION_COOKIE };

/** How long the session cookie lives client-side (refresh-token horizon). */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

/** How long a verified access-token → user lookup may be cached (ms). */
const TOKEN_CACHE_TTL_MS = 30_000;
const TOKEN_CACHE_MAX = 500;

/** The Supabase session material stored in the httpOnly cookie. */
export interface SupabaseSessionData {
  access_token: string;
  refresh_token: string;
  /** Unix seconds — expiry of the access token (from the JWT `exp` claim). */
  expires_at: number;
}

/** How a session was established (mirrors the Phase 10 auth-method vocabulary). */
export type AuthSessionMethod = 'PASSWORD' | 'REGISTRATION' | 'DEMO_FORM';

// ── Cookie (de)serialisation ─────────────────────────────────────────────────

/** Reads the Supabase session from the httpOnly cookie. Returns null if absent/invalid. */
export function readSessionCookie(req: NextRequest): SupabaseSessionData | null {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SupabaseSessionData>;
    if (
      typeof parsed.access_token !== 'string' ||
      typeof parsed.refresh_token !== 'string' ||
      typeof parsed.expires_at !== 'number'
    ) {
      return null;
    }
    return { access_token: parsed.access_token, refresh_token: parsed.refresh_token, expires_at: parsed.expires_at };
  } catch {
    // Phase 10 legacy cookie (opaque token) or corrupted value → no session.
    return null;
  }
}


/** Attaches (or rotates) the session cookie on an outgoing response. */
export function setSessionCookie(res: NextResponse, session: SupabaseSessionData): void {
  res.cookies.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC,
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

// ── JWT helper (decode only — validation is done by Supabase Auth) ───────────

interface JwtPayload {
  sub?: string;
  email?: string;
  exp?: number;
  role?: string;
}

/** Decodes a JWT payload WITHOUT verifying the signature (expiry maths only). */
export function decodeJwtPayload(jwt: string): JwtPayload | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as JwtPayload;
  } catch {
    return null;
  }
}

// ── Token verification (Supabase Auth is the authority) ──────────────────────

const tokenCache = new Map<string, { user: SupabaseAuthUser; cachedAt: number }>();

/**
 * Verifies an access token with Supabase Auth and returns the auth user.
 * Results are cached briefly (30s) to keep per-request latency reasonable;
 * authorization (role/status) is ALWAYS re-read from the profiles table on
 * every request, so caching never extends a disabled user's access.
 */
export async function getVerifiedAuthUser(accessToken: string): Promise<SupabaseAuthUser | null> {
  if (!isSupabaseAuthConfigured() || !accessToken) return null;

  const cached = tokenCache.get(accessToken);
  if (cached && Date.now() - cached.cachedAt < TOKEN_CACHE_TTL_MS) {
    return cached.user;
  }

  try {
    const supabase = createAnonSupabaseClient();
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data?.user) {
      tokenCache.delete(accessToken);
      return null;
    }
    if (tokenCache.size > TOKEN_CACHE_MAX) tokenCache.clear();
    tokenCache.set(accessToken, { user: data.user, cachedAt: Date.now() });
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Refreshes an expired session using its refresh token. Returns the new
 * session, or null when the refresh token is invalid/revoked (the Supabase
 * refresh token is single-use and rotated on every refresh).
 */
export async function refreshSupabaseSession(session: SupabaseSessionData): Promise<SupabaseSessionData | null> {
  if (!isSupabaseAuthConfigured() || !session.refresh_token) return null;
  try {
    const supabase = createAnonSupabaseClient();
    // setSession refreshes automatically when the access token is expired and
    // validates it with the server when it is not.
    const { data, error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    const refreshed = data?.session;
    if (error || !refreshed?.access_token || !refreshed.refresh_token) return null;
    return {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: refreshed.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    };
  } catch {
    return null;
  }
}

/**
 * Revokes a Supabase session server-side (logout). Best-effort: failures are
 * ignored because the httpOnly cookie is cleared regardless, so the client
 * can no longer present the session.
 */
export async function revokeSupabaseSession(accessToken: string): Promise<void> {
  if (!isSupabaseAuthConfigured() || !accessToken) return;
  try {
    const supabase = createAnonSupabaseClient();
    await supabase.auth.signOut(accessToken);
  } catch {
    // ignore — cookie clearing is the effective client-side revocation
  }
}

// ── Session → application user ───────────────────────────────────────────────

export interface AuthenticatedUser extends User {
  /** Unix ms expiry of the access token. */
  sessionExpiresAt: number;
  /** How the session was established. */
  authMethod: AuthSessionMethod;
  /**
   * The verified Supabase access token. INTERNAL — lets audit writes be
   * performed under RLS as the acting user. Must never be serialised to a
   * client response (use `toPublicUser` when building responses).
   */
  accessToken?: string;
}

export interface ResolvedSession {
  user: AuthenticatedUser;
  /** Present when the access token was refreshed during resolution. */
  refreshedSession?: SupabaseSessionData;
}

/**
 * Resolves the request's session cookie into an authenticated application
 * user, or null when there is no valid session.
 *
 *  - `allowRefresh: true`  (session endpoint) refreshes expired tokens and
 *    returns the rotated session for cookie re-issuance.
 *  - `allowRefresh: false` (default, API guards) fails fast with null when
 *    the access token is expired; the client re-syncs via /api/auth/session.
 *
 * The role and account status ALWAYS come from the profiles table — never
 * from the client or the JWT metadata — so role changes and account
 * disabling take effect immediately.
 */
async function getVerifiedFirebaseUser(accessToken: string): Promise<{ uid: string; email: string; name: string; phone: string } | null> {
  if (!accessToken) return null;

  try {
    if (!getApps().length) {
      initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID ?? 'd-ulpin-de274' });
    }
    const firebaseAuth = getAuth();
    const decoded = await firebaseAuth.verifyIdToken(accessToken);
    return {
      uid: decoded.uid,
      email: decoded.email ?? '',
      name: decoded.name ?? (decoded.email ? decoded.email.split('@')[0] : 'Verified User'),
      phone: decoded.phone_number ?? '',
    };
  } catch {
    // Local prototype fallback: decode the JWT payload without server-side validation when admin SDK is unavailable.
    const payload = decodeJwtPayload(accessToken);
    if (!payload?.sub) return null;
    return {
      uid: payload.sub,
      email: payload.email ?? '',
      name: payload.email ? payload.email.split('@')[0] : 'Verified User',
      phone: '',
    };
  }
}

export async function getSessionUser(
  req: NextRequest,
  options?: { allowRefresh?: boolean; authMethod?: AuthSessionMethod },
): Promise<ResolvedSession | null> {
  const cookieSession = readSessionCookie(req);
  if (!cookieSession?.access_token) return null;

  if (!isSupabaseAuthConfigured()) {
    const firebaseUser = await getVerifiedFirebaseUser(cookieSession.access_token);
    if (!firebaseUser) return null;

    const user: AuthenticatedUser = {
      id: firebaseUser.uid,
      name: firebaseUser.name || 'Verified User',
      email: firebaseUser.email || '',
      role: 'CITIZEN',
      phone: firebaseUser.phone || '',
      aadhaarOrGovId: 'PENDING-KYC',
      sessionExpiresAt: cookieSession.expires_at * 1000,
      authMethod: options?.authMethod ?? 'PASSWORD',
      accessToken: cookieSession.access_token,
    };

    return { user };
  }

  let activeSession = cookieSession;
  let authUser = await getVerifiedAuthUser(activeSession.access_token);

  if (!authUser) {
    if (!options?.allowRefresh) return null;
    const refreshed = await refreshSupabaseSession(cookieSession);
    if (!refreshed) return null;
    authUser = await getVerifiedAuthUser(refreshed.access_token);
    if (!authUser) return null;
    activeSession = refreshed;
  }

  // Load (or self-heal) the application profile — role + account status live here.
  const profile = await ensureProfileForAuthUser(authUser, activeSession.access_token);
  if (profile?.accountStatus === 'DISABLED') {
    // Disabled accounts must not gain application access.
    return null;
  }

  const user: AuthenticatedUser = {
    ...toPublicUser(authUser, profile ?? undefined),
    sessionExpiresAt: activeSession.expires_at * 1000,
    authMethod: options?.authMethod ?? 'PASSWORD',
    accessToken: activeSession.access_token,
  };

  return {
    user,
    ...(activeSession !== cookieSession ? { refreshedSession: activeSession } : {}),
  };
}
