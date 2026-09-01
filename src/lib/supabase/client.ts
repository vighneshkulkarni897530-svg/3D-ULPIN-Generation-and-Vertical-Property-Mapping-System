/**
 * Browser-side Supabase Client (Phase 13 / updated Phase 14)
 * ===========================================================
 * Client-safe Supabase client using the public PUBLISHABLE (anon) key. This can
 * be imported in client components, but it is limited by Row Level Security
 * policies — it cannot perform privileged operations such as writing audit
 * logs, modifying user roles, or bypassing tenant access rules.
 *
 * Phase 14 note: authentication is SERVER-AUTHORITATIVE. The browser never
 * talks to Supabase Auth directly — sign-in/sign-up/logout go through the
 * same-origin /api/auth/* routes which hold the session in an httpOnly cookie.
 * This keeps secrets out of the client and satisfies the strict CSP
 * (`connect-src 'self'`).
 *
 * Usage:
 *   import { getBrowserSupabaseClient } from '@/lib/supabase/client';
 *   const { data, error } = await getBrowserSupabaseClient()?.from('parcels').select('*');
 *
 * SECURITY:
 * - Only reads/writes that RLS permits are possible with this client.
 * - For mutations, prefer the server-side API routes which enforce
 *   authentication + authorization via the Supabase session.
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './env';

let _browserClient: ReturnType<typeof createClient> | null = null;

/**
 * Returns a singleton browser-side Supabase client.
 * Returns null if the environment variables are not set (the application
 * should fall back to in-memory mock data in that case).
 */
export function getBrowserSupabaseClient() {
  if (!_browserClient && SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
    _browserClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        // Auth is server-authoritative (httpOnly cookie) — the browser keeps no
        // Supabase session of its own, so nothing is persisted to localStorage.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return _browserClient;
}

/** True when the browser publishable key is configured. */
export function isBrowserSupabaseAvailable(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

