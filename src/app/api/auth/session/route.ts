/**
 * GET /api/auth/session (Phase 14)
 * Returns the current session's user + expiry, or 401 when no valid session
 * exists. Used by the client AuthContext on boot (session persistence) and
 * as the single token-refresh point: when the access token has expired but
 * the refresh token is still valid, the session is refreshed here and the
 * rotated tokens are re-issued in the httpOnly cookie (rotation happens in
 * exactly one place so refresh tokens can never race).
 * Revoked / disabled accounts receive 401, so the client clears its state.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser, setSessionCookie, clearSessionCookie } from '@/lib/auth/server/sessionStore';
import { isSupabaseAuthConfigured } from '@/lib/supabase/env';
import { jsonError } from '@/lib/auth/server/apiAuth';

export async function GET(req: NextRequest) {
  if (!isSupabaseAuthConfigured()) {
    return jsonError(503, 'AUTH_NOT_CONFIGURED', 'Authentication service is not configured.');
  }

  const resolved = await getSessionUser(req, { allowRefresh: true });
  if (!resolved) {
    const res = jsonError(401, 'UNAUTHENTICATED', 'No active session.');
    // Hygiene: clear any stale/corrupt cookie so the client starts clean.
    clearSessionCookie(res);
    return res;
  }

  const { user, refreshedSession } = resolved;
  const res = NextResponse.json({
    user: { ...user, accessToken: undefined },
    role: user.role,
    expiresAt: new Date(user.sessionExpiresAt).toISOString(),
    authMethod: user.authMethod,
  });
  if (refreshedSession) {
    setSessionCookie(res, refreshedSession);
  }
  return res;
}

