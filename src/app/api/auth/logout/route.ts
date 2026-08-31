/**
 * POST /api/auth/logout (Phase 10)
 * Destroys the server session and clears the httpOnly cookie. Audits LOGOUT
 * when a valid session existed. Idempotent — always clears the cookie.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { destroySession, getSessionUser, SESSION_COOKIE } from '@/lib/auth/server/sessionStore';
import { appendAudit } from '@/lib/auth/server/auditStore';
import { clientIp } from '@/lib/auth/server/apiAuth';

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (user && destroySession(token)) {
    appendAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'LOGOUT',
      entityType: 'SESSION',
      entityId: user.id,
      previousValue: 'signed-in',
      newValue: 'signed-out',
      ipAddress: clientIp(req),
    });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
