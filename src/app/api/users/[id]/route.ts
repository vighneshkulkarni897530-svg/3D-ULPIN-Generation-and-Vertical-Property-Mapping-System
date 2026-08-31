/**
 * GET/PATCH /api/users/:id (Phase 10) — ADMIN ONLY
 * GET  → account details (public projection).
 * PATCH → role change and/or enable/disable, with business rules:
 *   - target must exist (404)
 *   - administrators cannot modify their own account (400)
 *   - other ADMIN accounts are protected (403)
 *   - invalid payloads → 400
 * Every successful change is audited with previous/new values.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { PERMISSIONS } from '@/types/auth';
import type { UserRole } from '@/types';
import { requirePermission, jsonError, readJsonBody } from '@/lib/auth/server/apiAuth';
import { findUserById, toPublicUser, updateUserAccount } from '@/lib/auth/server/userStore';
import { appendAudit } from '@/lib/auth/server/auditStore';
import { clientIp } from '@/lib/auth/server/apiAuth';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = requirePermission(req, PERMISSIONS.USER_MANAGEMENT);
  if ('response' in auth) return auth.response;

  const { id } = await ctx.params;
  const user = findUserById(id);
  if (!user) return jsonError(404, 'NOT_FOUND', 'No account with that ID exists.');
  return NextResponse.json({ user: toPublicUser(user) });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = requirePermission(req, PERMISSIONS.USER_MANAGEMENT);
  if ('response' in auth) return auth.response;
  const actor = auth.user;

  const { id } = await ctx.params;
  const body = await readJsonBody(req);
  if (!body) return jsonError(400, 'INVALID_BODY', 'Request body must be a JSON object.');

  const patch: { role?: UserRole; accountStatus?: 'ACTIVE' | 'DISABLED' } = {};
  if (body.role !== undefined) {
    if (typeof body.role !== 'string' || !['CITIZEN', 'OFFICER', 'ADMIN'].includes(body.role)) {
      return jsonError(400, 'INVALID_ROLE', 'Role must be one of: CITIZEN, OFFICER, ADMIN.');
    }
    patch.role = body.role as UserRole;
  }
  if (body.accountStatus !== undefined) {
    if (typeof body.accountStatus !== 'string' || !['ACTIVE', 'DISABLED'].includes(body.accountStatus)) {
      return jsonError(400, 'INVALID_STATUS', 'Account status must be ACTIVE or DISABLED.');
    }
    patch.accountStatus = body.accountStatus as 'ACTIVE' | 'DISABLED';
  }
  if (Object.keys(patch).length === 0) {
    return jsonError(400, 'EMPTY_PATCH', 'Provide at least one of: role, accountStatus.');
  }

  const result = updateUserAccount(id, actor.id, patch);
  if (!result.ok) {
    switch (result.error) {
      case 'NOT_FOUND':
        return jsonError(404, 'NOT_FOUND', 'No account with that ID exists.');
      case 'SELF_MODIFICATION':
        return jsonError(400, 'SELF_MODIFICATION', 'Administrators cannot modify their own account.');
      case 'ADMIN_PROTECTED':
        return jsonError(403, 'ADMIN_PROTECTED', 'Administrator accounts cannot be modified by other administrators.');
      default:
        return jsonError(400, 'INVALID_INPUT', 'The requested change failed validation.');
    }
  }

  const ip = clientIp(req);
  for (const change of result.changes) {
    appendAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: change.field === 'role' ? 'USER_ROLE_CHANGE' : 'USER_STATUS_CHANGE',
      entityType: 'USER',
      entityId: id,
      previousValue: change.previous,
      newValue: change.next,
      details: `Account ${result.user.name} (${result.user.email}) — ${change.field} changed.`,
      ipAddress: ip,
    });
  }

  return NextResponse.json({ user: result.user, changes: result.changes });
}
