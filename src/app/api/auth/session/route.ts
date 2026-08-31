/**
 * GET /api/auth/session (Phase 10)
 * Returns the current session's user + expiry, or 401 when no valid session
 * exists. Used by the client AuthContext on boot (session persistence) and
 * for session-expiry detection. Valid sessions get their sliding expiry
 * refreshed by the session store.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth/server/sessionStore';
import { jsonError } from '@/lib/auth/server/apiAuth';

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) {
    return jsonError(401, 'UNAUTHENTICATED', 'No active session.');
  }
  return NextResponse.json({
    user,
    role: user.role,
    expiresAt: new Date(user.sessionExpiresAt).toISOString(),
    authMethod: user.authMethod,
  });
}
