/**
 * PROTOTYPE Audit Store (Phase 10) — SERVER-ONLY
 * ===============================================
 * ⚠ PROTOTYPE-ONLY STORAGE: audit records live in the Node.js process memory
 *   of the Next.js server (capped ring buffer) and are lost on restart.
 *   Records are ONLY created for actions actually performed in the prototype
 *   — no fake historical data is seeded. A production deployment would
 *   persist these to an append-only database table / log sink.
 */

import crypto from 'node:crypto';
import type { UserRole } from '@/types';

/** Entity types that can appear in the audit trail. */
export type AuditEntityType =
  | 'USER'
  | 'SESSION'
  | 'PROPERTY'
  | 'PARCEL'
  | 'BUILDING'
  | 'FLOOR'
  | 'VERIFICATION'
  | 'CONFLICT'
  | 'WORKFLOW_TASK'
  | 'DISPUTE'
  | 'FIELD_VERIFICATION'
  | 'REPORT'
  | 'SYSTEM';

/** Action categories recorded by the prototype. */
export type AuditAction =
  // Auth lifecycle
  | 'LOGIN'
  | 'LOGOUT'
  | 'REGISTER'
  | 'LOGIN_FAILED'
  | 'SESSION_EXPIRED'
  // Administrative
  | 'USER_ROLE_CHANGE'
  | 'USER_STATUS_CHANGE'
  | 'USER_CREATED'
  | 'ADMIN_ACTION'
  // Domain actions reported by the client app (server-stamped)
  | 'PROPERTY_UPDATED'
  | 'VERIFICATION_UPDATED'
  | 'CONFLICT_UPDATED'
  | 'WORKFLOW_ACTION'
  | 'DISPUTE_SUBMITTED'
  | 'FIELD_VERIFICATION_REQUESTED';

/** A single immutable audit record. */
export interface AuditRecord {
  id: string;
  /** Actor — stamped server-side from the session, never trusted from client. */
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  /** Value before the change (when applicable). */
  previousValue?: string;
  /** Value after the change (when applicable). */
  newValue?: string;
  /** Free-text context (length-capped, sanitized). */
  details?: string;
  /** Masked IP for prototype traceability (e.g. "10.x.x.x"). */
  ipAddressMasked: string;
  /** ISO timestamp — server clock only. */
  timestamp: string;
}

/** Client-suppliable portion of an audit record (actor/time are stamped server-side). */
export interface ClientAuditInput {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  previousValue?: string;
  newValue?: string;
  details?: string;
}

const MAX_RECORDS = 500;
const inMemoryAudit: AuditRecord[] = [];

function maskIp(ip: string | null | undefined): string {
  if (!ip) return 'unknown';
  const first = ip.split('.')[0] ?? ip.split(':')[0] ?? 'x';
  return `${first}.x.x.x`;
}

/**
 * Appends an audit record. Server-side callers stamp actor + timestamp here.
 * Throws nothing; audit failures must never break the primary action.
 */
export function appendAudit(input: {
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  previousValue?: string;
  newValue?: string;
  details?: string;
  ipAddress?: string | null;
}): AuditRecord {
  const record: AuditRecord = {
    id: `AUD-${crypto.randomBytes(5).toString('hex')}`,
    actorId: input.actorId,
    actorName: input.actorName,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId.slice(0, 120),
    ...(input.previousValue !== undefined ? { previousValue: input.previousValue.slice(0, 200) } : {}),
    ...(input.newValue !== undefined ? { newValue: input.newValue.slice(0, 200) } : {}),
    ...(input.details ? { details: input.details.slice(0, 300) } : {}),
    ipAddressMasked: maskIp(input.ipAddress),
    timestamp: new Date().toISOString(),
  };
  inMemoryAudit.unshift(record);
  if (inMemoryAudit.length > MAX_RECORDS) inMemoryAudit.length = MAX_RECORDS;
  return record;
}

/** Newest-first audit records (optionally filtered). */
export function queryAudit(options?: { action?: AuditAction; entityType?: AuditEntityType; limit?: number }): AuditRecord[] {
  let records = inMemoryAudit;
  if (options?.action) records = records.filter((r) => r.action === options.action);
  if (options?.entityType) records = records.filter((r) => r.entityType === options.entityType);
  return records.slice(0, Math.min(options?.limit ?? 200, MAX_RECORDS));
}

/** Number of audit records currently retained. */
export function auditCount(): number {
  return inMemoryAudit.length;
}

/** Validate an audit action/entityType supplied by a client. */
export function isAuditAction(value: unknown): value is AuditAction {
  const known: AuditAction[] = [
    'PROPERTY_UPDATED', 'VERIFICATION_UPDATED', 'CONFLICT_UPDATED', 'WORKFLOW_ACTION',
    'DISPUTE_SUBMITTED', 'FIELD_VERIFICATION_REQUESTED', 'ADMIN_ACTION',
  ];
  return typeof value === 'string' && (known as string[]).includes(value);
}

export function isAuditEntityType(value: unknown): value is AuditEntityType {
  const known: AuditEntityType[] = [
    'USER', 'SESSION', 'PROPERTY', 'PARCEL', 'BUILDING', 'FLOOR', 'VERIFICATION',
    'CONFLICT', 'WORKFLOW_TASK', 'DISPUTE', 'FIELD_VERIFICATION', 'REPORT', 'SYSTEM',
  ];
  return typeof value === 'string' && (known as string[]).includes(value);
}
