/**
 * /api/audit-log (Phase 10)
 * GET  — ADMIN ONLY: newest-first audit trail (optional action/entityType filters).
 * POST — any AUTHENTICATED user reports a domain action actually performed in
 *        the app (verification update, conflict update, workflow action…).
 *        Actor, role and timestamp are stamped server-side from the session —
 *        client-supplied actor fields are ignored by design.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { PERMISSIONS } from '@/types/auth';
import {
  clientIp,
  jsonError,
  optionalString,
  readJsonBody,
  requireAuth,
  requirePermission,
  requireString,
} from '@/lib/auth/server/apiAuth';
import { appendAudit, isAuditAction, isAuditEntityType, queryAudit, type AuditAction } from '@/lib/auth/server/auditStore';

const READ_PERMISSION = PERMISSIONS.VIEW_ACTIVITY_LOG;

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, READ_PERMISSION);
  if ('response' in auth) return auth.response;

  const actionParam = req.nextUrl.searchParams.get('action');
  const entityParam = req.nextUrl.searchParams.get('entityType');
  const limitParam = Number(req.nextUrl.searchParams.get('limit') ?? '200');

  const records = await queryAudit({
    ...(actionParam && isAuditAction(actionParam) ? { action: actionParam as AuditAction } : {}),
    ...(entityParam && isAuditEntityType(entityParam) ? { entityType: entityParam as never } : {}),
    limit: Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 500)) : 200,
  });

  return NextResponse.json({ records, count: records.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;
  const actor = auth.user;

  const body = await readJsonBody(req);
  if (!body) return jsonError(400, 'INVALID_BODY', 'Request body must be a JSON object.');

  const action = body.action;
  if (!isAuditAction(action)) {
    return jsonError(400, 'INVALID_ACTION', 'Unknown audit action. Only real, client-performed domain actions can be reported.');
  }
  const entityType = body.entityType;
  if (!isAuditEntityType(entityType)) {
    return jsonError(400, 'INVALID_ENTITY_TYPE', 'Unknown entity type.');
  }
  const entityId = requireString(body, 'entityId', 1, 120);
  if ('error' in entityId) return jsonError(400, 'INVALID_FIELD', entityId.error);

  const previousValue = optionalString(body, 'previousValue', 200);
  if ('error' in previousValue) return jsonError(400, 'INVALID_FIELD', previousValue.error);
  const newValue = optionalString(body, 'newValue', 200);
  if ('error' in newValue) return jsonError(400, 'INVALID_FIELD', newValue.error);
  const details = optionalString(body, 'details', 300);
  if ('error' in details) return jsonError(400, 'INVALID_FIELD', details.error);

  const record = appendAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    entityType,
    entityId: entityId.value,
    ...(previousValue.value !== undefined ? { previousValue: previousValue.value } : {}),
    ...(newValue.value !== undefined ? { newValue: newValue.value } : {}),
    ...(details.value !== undefined ? { details: details.value } : {}),
    ipAddress: clientIp(req),
  });

  return NextResponse.json({ record }, { status: 201 });
}
