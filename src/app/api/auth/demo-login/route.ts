/**
 * POST /api/auth/demo-login (Phase 14)
 * Convenience endpoint used by the login page's instant demo access and the
 * navbar Role Switcher. It performs a REAL Supabase Auth sign-in with the
 * three published demo personas — there is NO authentication bypass: the
 * demo accounts must exist in Supabase Auth (provisioned by the idempotent
 * seed script `supabase/seed/seed_demo_auth_users.ts`) and every downstream
 * authorization uses the server-side profile, never a browser-supplied role.
 *
 * If the demo accounts have not been provisioned (or the project has removed
 * them for production), the endpoint fails closed with a clear error.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { authenticateWithPassword } from '@/lib/auth/server/authService';
import { appendAudit } from '@/lib/auth/server/auditStore';
import { setSessionCookie } from '@/lib/auth/server/sessionStore';
import { clientIp, jsonError, readJsonBody, requireString } from '@/lib/auth/server/apiAuth';
import { MOCK_USERS } from '@/data/mockUsers';

/**
 * Published demo password for the three seeded demo personas — intentionally
 * public (it is rendered on the login page's demo-access panel). This is a
 * clearly-labelled prototype convenience, NOT a production credential.
 */
const DEMO_PASSWORD = 'Bhu-Verify#2024';

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

  const result = await authenticateWithPassword(demoEmail, DEMO_PASSWORD);
  if (!result.ok) {
    switch (result.error) {
      case 'NOT_CONFIGURED':
        return jsonError(503, 'AUTH_NOT_CONFIGURED', result.message ?? 'Authentication service is not configured.');
      case 'ACCOUNT_DISABLED':
        return jsonError(403, 'ACCOUNT_DISABLED', 'The demo account for this role has been disabled.');
      case 'EMAIL_NOT_CONFIRMED':
        return jsonError(403, 'DEMO_UNAVAILABLE', 'The demo account for this role is not confirmed.');
      default:
        // INVALID_CREDENTIALS → the demo personas are not provisioned in this
        // Supabase project. Fail closed — never fall back to a fake session.
        return jsonError(
          403,
          'DEMO_UNAVAILABLE',
          'Demo accounts are not provisioned in this Supabase project. Run `npx tsx supabase/seed/seed_demo_auth_users.ts` (requires the service-role key) or sign in with a real account.',
        );
    }
  }

  appendAudit({
    actorId: result.authUser.id,
    actorName: result.publicUser.name,
    actorRole: result.publicUser.role,
    action: 'LOGIN',
    entityType: 'SESSION',
    entityId: result.authUser.id,
    newValue: 'signed-in',
    details: `Demo persona sign-in as ${result.publicUser.role} via Supabase Auth (published demo credentials).`,
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

