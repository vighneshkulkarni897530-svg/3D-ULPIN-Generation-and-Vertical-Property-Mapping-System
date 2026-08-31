/**
 * POST /api/auth/demo-login (Phase 10)
 * PROTOTYPE-ONLY convenience endpoint used by the login page's instant demo
 * access and the navbar Role Switcher. Establishes a REAL server session for
 * one of the three seeded demo personas — exactly as a normal password login
 * would — so all downstream authorization uses the server session, never a
 * browser-supplied role. This endpoint must be REMOVED in production.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { findUserByEmail } from '@/lib/auth/server/userStore';
import { createSession, setSessionCookie } from '@/lib/auth/server/sessionStore';
import { appendAudit } from '@/lib/auth/server/auditStore';
import { clientIp, jsonError, readJsonBody, requireString } from '@/lib/auth/server/apiAuth';
import { MOCK_USERS } from '@/data/mockUsers';

const DEMO_EMAILS: Record<string, string> = {
  citizen: MOCK_USERS.citizen.email,
  officer: MOCK_USERS.officer.email,
  admin: MOCK_USERS.admin.email,
};

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req);
  if (!body) return jsonError(400, 'INVALID_BODY', 'Request body must be a JSON object.');

  const role = requireString(body, 'role', 5, 10);
  if ('error' in role) return jsonError(400, 'INVALID_FIELD', role.error);
  const roleKey = role.value.toLowerCase();
  const email = DEMO_EMAILS[roleKey];
  if (!email) {
    return jsonError(400, 'INVALID_ROLE', 'Role must be one of: citizen, officer, admin.');
  }

  const user = findUserByEmail(email);
  if (!user || user.accountStatus === 'DISABLED') {
    return jsonError(403, 'ACCOUNT_DISABLED', 'The demo account for this role is unavailable.');
  }

  const { token, expiresAt } = createSession(user.id, 'DEMO_FORM');
  appendAudit({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: 'LOGIN',
    entityType: 'SESSION',
    entityId: user.id,
    newValue: 'signed-in',
    details: `Demo persona sign-in as ${user.role} (prototype quick access).`,
    ipAddress: clientIp(req),
  });

  const res = NextResponse.json({ user: { ...user, sessionExpiresAt: expiresAt } });
  setSessionCookie(res, token, expiresAt);
  return res;
}
