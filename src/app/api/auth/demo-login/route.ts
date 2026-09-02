/**
 * POST /api/auth/demo-login
 * Convenience endpoint for instant demo access and role testing.
 * Authenticates against Supabase Auth when configured, and falls back to
 * the durable userStore with published demo credentials.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { authenticateWithPassword } from '@/lib/auth/server/authService';
import { appendAudit } from '@/lib/auth/server/auditStore';
import { setSessionCookie, SESSION_MAX_AGE_SEC } from '@/lib/auth/server/sessionStore';
import { clientIp, jsonError, readJsonBody, requireString } from '@/lib/auth/server/apiAuth';
import { MOCK_USERS } from '@/data/mockUsers';
import { checkCredentials, toPublicUser, DEMO_PASSWORD } from '@/lib/auth/server/userStore';
import { isSupabaseAuthConfigured } from '@/lib/supabase/env';

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
  const demoEmail = DEMO_EMAILS[roleKey];
  if (!demoEmail) {
    return jsonError(400, 'INVALID_ROLE', 'Role must be one of: citizen, officer, admin.');
  }

  // 1) Try Supabase if configured
  if (isSupabaseAuthConfigured()) {
    const result = await authenticateWithPassword(demoEmail, DEMO_PASSWORD);
    if (result.ok) {
      appendAudit({
        actorId: result.authUser.id,
        actorName: result.publicUser.name,
        actorRole: result.publicUser.role,
        action: 'LOGIN',
        entityType: 'SESSION',
        entityId: result.authUser.id,
        newValue: 'signed-in',
        details: `Demo persona sign-in as ${result.publicUser.role} via Supabase Auth.`,
        ipAddress: clientIp(req),
      });

      const res = NextResponse.json({
        user: {
          ...result.publicUser,
          sessionExpiresAt: result.session.expires_at * 1000,
          authMethod: 'DEMO_FORM',
        },
      });
      setSessionCookie(res, result.session);
      return res;
    }
  }

  // 2) Fallback to persistent userStore
  const localCheck = checkCredentials(demoEmail, DEMO_PASSWORD);
  if (!localCheck.ok) {
    if (localCheck.error === 'ACCOUNT_DISABLED') {
      return jsonError(403, 'ACCOUNT_DISABLED', 'The demo account for this role has been disabled.');
    }
    return jsonError(401, 'INVALID_CREDENTIALS', 'Invalid demo credentials.');
  }

  const publicUser = toPublicUser(localCheck.user);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC;
  const session = {
    access_token: `demo_session_${publicUser.id}`,
    refresh_token: 'demo-session-token',
    expires_at: expiresAt,
    userId: publicUser.id,
    email: publicUser.email,
  };

  appendAudit({
    actorId: publicUser.id,
    actorName: publicUser.name,
    actorRole: publicUser.role,
    action: 'LOGIN',
    entityType: 'SESSION',
    entityId: publicUser.id,
    newValue: 'signed-in',
    details: `Demo persona sign-in as ${publicUser.role} via persistent store.`,
    ipAddress: clientIp(req),
  });

  const res = NextResponse.json({
    user: {
      ...publicUser,
      sessionExpiresAt: expiresAt * 1000,
      authMethod: 'DEMO_FORM',
    },
  });
  setSessionCookie(res, session);
  return res;
}
