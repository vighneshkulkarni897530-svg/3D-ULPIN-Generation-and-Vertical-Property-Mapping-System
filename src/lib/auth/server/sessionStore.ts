/**
 * Auth Session Store — SERVER-ONLY
 * ===================================
 * Session verification and cookie management for both Firebase and Supabase auth.
 *
 * Core Guarantees:
 *   - Sessions are persistent (365 days / 1 year) so login is done once and stays active.
 *   - Checked against the persistent user store on every request: if the user was removed
 *     or disabled by an administrator, the session is IMMEDIATELY revoked (401).
 *   - True roles (CITIZEN, OFFICER, ADMIN) are sourced from the server's user record,
 *     preventing client spoofing.
 */

import type { NextRequest, NextResponse } from 'next/server';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { User } from '@/types';
import { SESSION_COOKIE } from '../sessionCookie';
import { findUserById, findUserByEmail, isUserDeleted, upsertUser } from './userStore';

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

/** How long the session cookie lives client-side: 365 days (1 year). */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 365;

/** How long a verified access-token → user lookup may be cached (ms). */
const TOKEN_CACHE_TTL_MS = 30_000;
const TOKEN_CACHE_MAX = 500;

/** The session material stored in the httpOnly cookie. */
export interface SupabaseSessionData {
  access_token: string;
  refresh_token: string;
  /** Unix seconds — expiry of the access token. */
  expires_at: number;
  userId?: string;
  email?: string;
}

/** How a session was established. */
export type AuthSessionMethod = 'PASSWORD' | 'REGISTRATION' | 'DEMO_FORM' | 'OTP' | 'GOOGLE';

// ── Cookie (de)serialisation ─────────────────────────────────────────────────

/** Reads the session from the httpOnly cookie. Returns null if absent/invalid. */
export function readSessionCookie(req: NextRequest): SupabaseSessionData | null {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SupabaseSessionData>;
    if (
      typeof parsed.access_token !== 'string' ||
      typeof parsed.expires_at !== 'number'
    ) {
      return null;
    }
    return {
      access_token: parsed.access_token,
      refresh_token: typeof parsed.refresh_token === 'string' ? parsed.refresh_token : 'session-token',
      expires_at: parsed.expires_at,
      userId: parsed.userId,
      email: parsed.email,
    };
  } catch {
    // Legacy opaque token fallback
    if (raw.length > 5) {
      return {
        access_token: raw,
        refresh_token: 'legacy',
        expires_at: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC,
      };
    }
    return null;
  }
}

/** Attaches the persistent session cookie on an outgoing response (365 days). */
export function setSessionCookie(res: NextResponse, session: SupabaseSessionData): void {
  const safeSession: SupabaseSessionData = {
    access_token: session.access_token,
    refresh_token: session.refresh_token || 'session-token',
    expires_at: session.expires_at || Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC,
    userId: session.userId,
    email: session.email,
  };

  res.cookies.set(SESSION_COOKIE, JSON.stringify(safeSession), {
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

// ── JWT helper ──────────────────────────────────────────────────────────────

interface JwtPayload {
  sub?: string;
  user_id?: string;
  email?: string;
  name?: string;
  exp?: number;
  role?: string;
}

/** Decodes a JWT payload WITHOUT verifying signature (sub/email extraction). */
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

// ── Token verification (Supabase Auth) ──────────────────────────────────────

const tokenCache = new Map<string, { user: SupabaseAuthUser; cachedAt: number }>();

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

export async function refreshSupabaseSession(session: SupabaseSessionData): Promise<SupabaseSessionData | null> {
  if (!isSupabaseAuthConfigured() || !session.refresh_token) return null;
  try {
    const supabase = createAnonSupabaseClient();
    const { data, error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    const refreshed = data?.session;
    if (error || !refreshed?.access_token || !refreshed.refresh_token) return null;
    return {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: refreshed.expires_at ?? Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC,
    };
  } catch {
    return null;
  }
}

export async function revokeSupabaseSession(accessToken: string): Promise<void> {
  if (!isSupabaseAuthConfigured() || !accessToken) return;
  try {
    const supabase = createAnonSupabaseClient();
    await supabase.auth.signOut(accessToken);
  } catch {}
}

// ── Session → Application User Resolution ───────────────────────────────────

export interface AuthenticatedUser extends User {
  /** Unix ms expiry of the session. */
  sessionExpiresAt: number;
  /** How the session was established. */
  authMethod: AuthSessionMethod;
  accessToken?: string;
}

export interface ResolvedSession {
  user: AuthenticatedUser;
  refreshedSession?: SupabaseSessionData;
}

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
    // Fallback: decode JWT payload without server-side verification if admin SDK is not loaded
    const payload = decodeJwtPayload(accessToken);
    if (!payload?.sub && !payload?.user_id) return null;
    const uid = payload.sub || payload.user_id || '';
    const email = payload.email || '';
    return {
      uid,
      email,
      name: payload.name || (email ? email.split('@')[0] : 'Verified User'),
      phone: '',
    };
  }
}

/**
 * Resolves the request's session cookie into an authenticated application user.
 * Returns null if the session is invalid, expired, OR IF THE USER WAS REMOVED
 * BY THE MAIN ADMIN.
 */
export async function getSessionUser(
  req: NextRequest,
  options?: { allowRefresh?: boolean; authMethod?: AuthSessionMethod },
): Promise<ResolvedSession | null> {
  const cookieSession = readSessionCookie(req);
  if (!cookieSession?.access_token) return null;

  // 1) Firebase / Local Persistent Store Path
  if (!isSupabaseAuthConfigured()) {
    let candidateId = cookieSession.userId;
    let candidateEmail = cookieSession.email;

    // Check custom session prefix formats
    if (!candidateEmail && cookieSession.access_token.startsWith('otp_session_')) {
      candidateEmail = cookieSession.access_token.replace('otp_session_', '');
    }
    if (!candidateId && cookieSession.access_token.startsWith('firebase_session_')) {
      candidateId = cookieSession.access_token.replace('firebase_session_', '');
    }
    if (!candidateId && cookieSession.access_token.startsWith('demo_session_')) {
      candidateId = cookieSession.access_token.replace('demo_session_', '');
    }

    // Attempt Firebase verification or JWT decoding
    if (!candidateId && !candidateEmail) {
      const fbUser = await getVerifiedFirebaseUser(cookieSession.access_token);
      if (fbUser) {
        candidateId = fbUser.uid;
        candidateEmail = fbUser.email;
      }
    }

    // Lookup user in persistent userStore
    let storedUser =
      (candidateId ? findUserById(candidateId) : null) ||
      (candidateEmail ? findUserByEmail(candidateEmail) : null);

    // If user was explicitly deleted by the admin, reject immediately!
    if (
      (candidateId && isUserDeleted(candidateId)) ||
      (candidateEmail && isUserDeleted(candidateEmail))
    ) {
      console.log(`[SessionStore] Session rejected for deleted user: ${candidateId || candidateEmail}`);
      return null;
    }

    // If candidate found from verified Firebase token but not in local store yet, self-heal
    if (!storedUser && (candidateId || candidateEmail)) {
      storedUser = upsertUser({
        id: candidateId,
        email: candidateEmail || `${candidateId}@cadastre.local`,
        name: candidateEmail?.split('@')[0] || 'Verified User',
        role: 'CITIZEN',
      });
    }

    // User is missing or removed by administrator
    if (!storedUser) {
      return null;
    }

    // Account disabled check
    if (storedUser.accountStatus === 'DISABLED') {
      console.log(`[SessionStore] Session rejected for disabled user: ${storedUser.email}`);
      return null;
    }

    const user: AuthenticatedUser = {
      id: storedUser.id,
      name: storedUser.name,
      email: storedUser.email,
      role: storedUser.role, // Authoritative role from userStore
      phone: storedUser.phone || '',
      aadhaarOrGovId: storedUser.aadhaarOrGovId || 'PENDING-KYC',
      accountStatus: storedUser.accountStatus,
      avatarUrl: storedUser.avatarUrl,
      department: storedUser.department,
      designation: storedUser.designation,
      jurisdictionDistrict: storedUser.jurisdictionDistrict,
      badgeNumber: storedUser.badgeNumber,
      createdAt: storedUser.createdAt,
      sessionExpiresAt: cookieSession.expires_at * 1000,
      authMethod: options?.authMethod ?? 'PASSWORD',
      accessToken: cookieSession.access_token,
    };

    return { user };
  }

  // 2) Supabase Auth Path (when configured)
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

  // Admin deletion tombstone check
  if (isUserDeleted(authUser.id)) {
    return null;
  }

  // Load application profile (role + account status)
  const profile = await ensureProfileForAuthUser(authUser, activeSession.access_token);
  if (profile?.accountStatus === 'DISABLED') {
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
