/**
 * Audit Store (Phase 10 → Phase 14) — SERVER-ONLY
 * ================================================
 * Phase 14: audit records are persisted to the Supabase `audit_logs` table
 * (append-only, Phase 13 schema) when the database is reachable, and always
 * mirrored into an in-memory ring buffer so the audit trail keeps working
 * when the database is unavailable. NO fake historical records are seeded —
 * only actions actually performed are recorded.
 *
 * Persistence paths (best-effort — audit failures never break the primary
 * action):
 *   1. service-role client (when SUPABASE_SERVICE_ROLE_KEY is configured);
 *   2. the acting user's verified access token (RLS: insert own actor_id);
 *   3. in-memory ring buffer (last resort; lost on restart).
 *
 * Records use the AUTHENTICATED Supabase user's id as actorId — stamped
 * server-side, never trusted from the client. Passwords and session tokens
 * are never recorded.
 */

import crypto from 'node:crypto';
import type { UserRole } from '@/types';
import { auditLogRepo } from '@/lib/repositories/auditRepository';
import { createServerSupabaseClient, createUserSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { DbAuditLog } from '@/lib/supabase/types';

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

/** Maps a database audit row to the application AuditRecord shape. */
function dbRowToRecord(row: DbAuditLog): AuditRecord {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorRole: row.actor_role as UserRole,
    action: row.action as AuditAction,
    entityType: row.entity_type as AuditEntityType,
    entityId: row.entity_id,
    ...(row.previous_value ? { previousValue: row.previous_value } : {}),
    ...(row.new_value ? { newValue: row.new_value } : {}),
    ...(row.details ? { details: row.details } : {}),
    ipAddressMasked: row.ip_address_masked,
    timestamp: row.created_at,
  };
}

/** Builds the audit_logs insert payload from a record. */
function recordToDbRow(record: AuditRecord) {
  return {
    actor_id: record.actorId,
    actor_name: record.actorName,
    actor_role: record.actorRole,
    action: record.action,
    entity_type: record.entityType,
    entity_id: record.entityId,
    previous_value: record.previousValue ?? null,
    new_value: record.newValue ?? null,
    details: record.details ?? null,
    ip_address_masked: record.ipAddressMasked,
  };
}

/**
 * Appends an audit record. Server-side callers stamp actor + timestamp here.
 * The record is always mirrored into the in-memory ring buffer and persisted
 * to Supabase fire-and-forget — audit failures must never break the primary
 * action, and this function never throws.
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
  /** Acting user's verified access token — enables RLS-constrained persistence without a service-role key. */
  accessToken?: string;
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

  // Best-effort durable persistence (never blocks or breaks the caller).
  void (async () => {
    try {
      if (isSupabaseConfigured()) {
        await auditLogRepo.create({
          actorId: record.actorId,
          actorName: record.actorName,
          actorRole: record.actorRole,
          action: record.action,
          entityType: record.entityType,
          entityId: record.entityId,
          previousValue: record.previousValue ?? null,
          newValue: record.newValue ?? null,
          details: record.details ?? null,
          ipAddressMasked: record.ipAddressMasked,
        });
        return;
      }
      if (input.accessToken) {
        const supabase = createUserSupabaseClient(input.accessToken);
        const row = recordToDbRow(record);
        await supabase.from('audit_logs').insert(row);
      }
    } catch {
      // Intentionally swallowed — the in-memory ring still holds the record.
    }
  })();

  return record;
}

/**
 * Newest-first audit records (optionally filtered). Prefers the durable
 * Supabase table (service-role, or admin access token under RLS) and falls
 * back to the in-memory ring when the database is unavailable.
 */
export async function queryAudit(options?: {
  action?: AuditAction;
  entityType?: AuditEntityType;
  limit?: number;
  /** Admin caller's verified access token — enables RLS-constrained reads without a service-role key. */
  accessToken?: string;
}): Promise<AuditRecord[]> {
  const limit = Math.min(options?.limit ?? 200, MAX_RECORDS);

  // 1) Durable store via service-role.
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await auditLogRepo.query({
        ...(options?.action ? { action: options.action } : {}),
        ...(options?.entityType ? { entityType: options.entityType } : {}),
        limit,
      });
      if (!error) return data.map(dbRowToRecord);
    } catch {
      // fall through to memory
    }
  }

  // 2) Durable store as the (admin) caller — RLS: admins may read all.
  if (options?.accessToken) {
    try {
      const supabase = createUserSupabaseClient(options.accessToken);
      let query = supabase.from('audit_logs').select('*');
      if (options.action) query = query.eq('action', options.action);
      if (options.entityType) query = query.eq('entity_type', options.entityType);
      const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
      if (!error && data) return (data as DbAuditLog[]).map(dbRowToRecord);
    } catch {
      // fall through to memory
    }
  }

  // 3) In-memory ring (database unavailable).
  let records = inMemoryAudit;
  if (options?.action) records = records.filter((r) => r.action === options.action);
  if (options?.entityType) records = records.filter((r) => r.entityType === options.entityType);
  return records.slice(0, limit);
}

/** Number of audit records currently retained in the in-memory ring. */
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
