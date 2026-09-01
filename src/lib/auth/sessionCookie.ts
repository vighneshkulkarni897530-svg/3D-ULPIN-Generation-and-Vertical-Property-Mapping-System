/**
 * Pure shared auth-cookie constants — safe for Edge middleware
 * (no node:crypto or supabase imports).
 *
 * Phase 14: `spv_session` now carries the Supabase Auth session (JSON:
 * access token + refresh token + expiry) instead of the Phase 10 opaque
 * token. The cookie name is unchanged so Edge middleware and existing
 * consumers keep working. It is httpOnly, SameSite=Lax and Secure in
 * production — client-side JavaScript can never read the tokens.
 */
export const SESSION_COOKIE = 'spv_session';

