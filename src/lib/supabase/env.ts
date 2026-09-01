/**
 * Supabase Environment Configuration (Phase 14)
 * ==============================================
 * Single source of truth for the Supabase environment variables.
 *
 * Preferred variable names:
 *   NEXT_PUBLIC_SUPABASE_URL            — project URL (public, no secrets)
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — public publishable (anon) key
 *
 * Backwards compatibility: the legacy name NEXT_PUBLIC_SUPABASE_ANON_KEY
 * (Phase 13) is still honoured when the publishable key is not set.
 *
 * SECURITY:
 *   - Only PUBLIC values live here. The service-role key is read by
 *     `src/lib/supabase/server.ts` (server-only) and is NEVER imported by
 *     client components.
 *   - Missing variables are handled gracefully: the helpers return empty
 *     strings and `is*Configured()` lets callers fall back to mock data or
 *     fail with a clear "not configured" error instead of crashing.
 *
 * This module is CLIENT-SAFE (pure process.env reads, no Node APIs) so both
 * browser and server bundles can share it.
 */

/** Supabase project URL (public — identifies the project, contains no secrets). */
export const SUPABASE_URL: string = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

/**
 * Public publishable (anon) key. Prefers NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * and falls back to the Phase 13 legacy NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Safe for the browser — all privileged operations still require RLS +
 * server-side authorization.
 */
export const SUPABASE_PUBLISHABLE_KEY: string =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * True when auth can be used (URL + publishable key configured).
 * Authentication REQUIRES Supabase — without these variables the auth API
 * routes respond with a clear 503 "not configured" error.
 */
export function isSupabaseAuthConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

/**
 * True when the service-role key is configured (URL + key). The service-role
 * key is OPTIONAL — it unlocks the database-backed persistence layer
 * (Phase 13) and privileged seed/admin scripts. It is server-only.
 */
export const SUPABASE_SERVICE_ROLE_KEY: string = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export function isSupabaseServiceConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}
