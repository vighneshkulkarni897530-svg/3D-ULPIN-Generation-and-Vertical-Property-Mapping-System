/**
 * POST /api/auth/logout (Phase 14)
 * Signs the user out via Supabase Auth (revoking the session server-side),
 * clears the httpOnly session cookie and audits LOGOUT when a valid session
 * existed. Idempotent — always clears the cookie so no stale authenticated
 * state can remain.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser, revokeSupabaseSession, clearSessionCookie } from '@/lib/auth/server/sessionStore';
import { appendAudit } from '@/lib/auth/server/auditStore';
import { clientIp } from '@/lib/auth/server/apiAuth';

export async function POST(req: NextRequest) {
  const resolved = await getSessionUser(req);

  if (resolved) {
    // Revoke the Supabase session server-side (best-effort).
    await revokeSupabaseSession(resolved.user.accessToken ?? '');
    appendAudit({
      actorId: resolved.user.id,
      actorName: resolved.user.name,
      actorRole: resolved.user.role,
      action: 'LOGOUT',
      entityType: 'SESSION',
      entityId: resolved.user.id,
      previousValue: 'signed-in',
      newValue: 'signed-out',
      ipAddress: clientIp(req),
    });
  }

  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}

export async function GET(req: NextRequest) {
  return POST(req);
}

