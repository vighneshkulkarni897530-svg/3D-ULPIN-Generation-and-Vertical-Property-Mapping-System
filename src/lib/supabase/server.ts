/**
 * Server-side Supabase Clients (Phase 13 / updated Phase 14)
 * ===========================================================
 * SERVER-ONLY module — never import from a client component.
 *
 * Three clients, each with a distinct, least-privilege purpose:
 *
 *  1. createServerSupabaseClient()  — SERVICE-ROLE key (optional). Bypasses
 *     RLS. Used by the Phase 13 repository layer for database-backed
 *     persistence and by privileged seed scripts. When the key is absent the
 *     application falls back to in-memory demo data (Phase 13 behaviour).
 *
 *  2. createAnonSupabaseClient()    — public publishable key, no user.
 *     Used for Supabase Auth operations (sign-in / sign-up / token refresh)
 *     performed server-side by the /api/auth/* routes.
 *
 *  3. createUserSupabaseClient(jwt) — public publishable key + the caller's
 *     verified access token. Database queries then run AS the authenticated
 *     user and are constrained by RLS policies (auth.uid()).
 *
 * SECURITY:
 * - The service-role key bypasses Row Level Security. Server API routes only
 *   use it AFTER authenticating the caller via Supabase Auth and enforcing
 *   authorization (requireAuth / requirePermission).
 * - Never import this module from a client component or pass keys to the browser.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, isSupabaseServiceConfigured } from './env';

/** No Supabase session persistence server-side; tokens are supplied per call. */
const SERVER_AUTH_OPTIONS = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

/**
 * Creates a server-side Supabase admin client (service-role).
 * Throws if the Supabase service-role environment variables are not
 * configured — fails fast at call time rather than at import time, so callers
 * can probe configuration with `isSupabaseConfigured()` and fall back to
 * in-memory demo data (Phase 13 behaviour, preserved).
 */
export function createServerSupabaseClient(): SupabaseClient {
  if (!isSupabaseServiceConfigured()) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable database-backed registry data.',
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: SERVER_AUTH_OPTIONS,
  });
}

/**
 * Creates a server-side Supabase client with the public publishable key and
 * NO user context (anon). Used for server-side Supabase Auth operations
 * (sign-in with password, sign-up, token refresh, sign-out).
 * Throws when auth is not configured — callers should probe with
 * `isSupabaseAuthConfigured()` first and fail with a clear 503.
 */
export function createAnonSupabaseClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      'Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: SERVER_AUTH_OPTIONS,
  });
}

/**
 * Creates a server-side Supabase client that queries the database AS the
 * given authenticated user (their verified access token). Row Level Security
 * then constrains every read/write to what that user is permitted to do —
 * the application can never bypass RBAC by talking to Supabase directly.
 */
export function createUserSupabaseClient(accessToken: string): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      'Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: SERVER_AUTH_OPTIONS,
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

/**
 * Returns true when the Supabase service-role key is configured in the
 * environment. Used by contexts/repositories to decide whether to attempt
 * a database connection or gracefully fall back to in-memory demo data.
 * (Phase 13 fallback semantics — unchanged.)
 */
export function isSupabaseConfigured(): boolean {
  return isSupabaseServiceConfigured();
}

/** Re-exported for convenience so auth modules can probe auth configuration. */
export { isSupabaseServiceConfigured };

