/**
 * Password Authentication Service (Phase 14) — SERVER-ONLY
 * ==========================================================
 * Single server boundary for email+password sign-in against Supabase Auth.
 * Used by POST /api/auth/login and (with the published demo credentials) by
 * POST /api/auth/demo-login. There is NO authentication bypass — every path
 * goes through `supabase.auth.signInWithPassword`.
 *
 * Responsibilities:
 *   - validate the Supabase Auth result and map errors to stable error codes;
 *   - load (or self-heal) the application profile (role + account status);
 *   - refuse access to DISABLED accounts and revoke their session;
 *   - return the session material for httpOnly-cookie issuance + the safe
 *     public user projection.
 *
 * Rate limiting and audit logging stay in the route handlers (they own the
 * request context: client IP, audit details).
 */

import type { User } from '@/types';
import { createAnonSupabaseClient } from '@/lib/supabase/server';

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
};
import { isSupabaseAuthConfigured } from '@/lib/supabase/env';
import { ensureProfileForAuthUser, toPublicUser, type ProfileRecord } from './profiles';
import { revokeSupabaseSession, type SupabaseSessionData } from './sessionStore';

export type PasswordAuthError =
  | 'NOT_CONFIGURED'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'ACCOUNT_DISABLED'
  | 'AUTH_ERROR';

export type PasswordAuthResult =
  | {
      ok: true;
      authUser: SupabaseAuthUser;
      profile: ProfileRecord | null;
      session: SupabaseSessionData;
      publicUser: User;
    }
  | { ok: false; error: PasswordAuthError; message?: string };

/** Maps a Supabase Auth error to a stable, user-friendly error code. */
function mapSignInError(code: string | undefined, message: string | undefined): { error: PasswordAuthError; message?: string } {
  const c = (code ?? '').toLowerCase();
  const m = (message ?? '').toLowerCase();
  if (c === 'email_not_confirmed' || m.includes('email not confirmed')) {
    return { error: 'EMAIL_NOT_CONFIRMED', message: 'Confirm your email address before signing in — check your inbox.' };
  }
  if (c === 'user_banned' || c === 'user_disabled' || m.includes('banned') || m.includes('disabled')) {
    return { error: 'ACCOUNT_DISABLED', message: 'This account has been disabled. Contact the cadastre administrator.' };
  }
  if (c === 'over_request_rate_limit' || m.includes('rate limit')) {
    return { error: 'AUTH_ERROR', message: 'Too many attempts. Please wait a moment and try again.' };
  }
  // invalid_credentials / user_not_found / validation errors → generic message
  // (never leak whether the account exists).
  return { error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
}

function sessionDataOf(
  session: { access_token: string; refresh_token: string; expires_at?: number | null } | null,
): SupabaseSessionData {
  const fallbackExpiry = Math.floor(Date.now() / 1000) + 3600;
  return {
    access_token: session?.access_token ?? '',
    refresh_token: session?.refresh_token ?? '',
    expires_at: session?.expires_at ?? fallbackExpiry,
  };
}

/**
 * Signs a user in with email + password via Supabase Auth. Never throws.
 */
export async function authenticateWithPassword(email: string, password: string): Promise<PasswordAuthResult> {
  if (!isSupabaseAuthConfigured()) {
    return {
      ok: false,
      error: 'NOT_CONFIGURED',
      message: 'Authentication service is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    };
  }

  let authUser: SupabaseAuthUser;
  let rawSession: { access_token: string; refresh_token: string; expires_at?: number | null } | null;
  try {
    const supabase = createAnonSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.user || !data?.session) {
      return { ok: false, ...mapSignInError(error?.code, error?.message) };
    }
    authUser = data.user;
    rawSession = data.session;
  } catch {
    return { ok: false, error: 'AUTH_ERROR', message: 'Sign-in failed. Please try again.' };
  }

  const session = sessionDataOf(rawSession);

  // Load (or self-heal) the application profile — role + status live there.
  const profile = await ensureProfileForAuthUser(authUser, session.access_token);

  if (profile?.accountStatus === 'DISABLED') {
    // Disabled accounts must not gain application access.
    await revokeSupabaseSession(session.access_token);
    return {
      ok: false,
      error: 'ACCOUNT_DISABLED',
      message: 'This account has been disabled. Contact the cadastre administrator.',
    };
  }

  return {
    ok: true,
    authUser,
    profile,
    session,
    publicUser: toPublicUser(authUser, profile ?? undefined),
  };
}
