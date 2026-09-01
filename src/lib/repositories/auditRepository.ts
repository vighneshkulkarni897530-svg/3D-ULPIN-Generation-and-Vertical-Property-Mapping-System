/**
 * Audit Log Repository (Phase 13)
 * =================================
 * Server-side only. Audit logs are APPEND-ONLY — no UPDATE or DELETE methods
 * are provided by design. The SUPABASE_SERVICE_ROLE_KEY is required.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DbAuditLog } from '@/lib/supabase/types';
import type { ListResult, CrudResult } from './index';

export interface AuditLogInput {
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: string | null;
  newValue?: string | null;
  details?: string | null;
  ipAddressMasked: string;
}

export class AuditLogRepository {
  /** INSERT only — audit logs must never be modified or deleted. */
  async create(input: AuditLogInput): Promise<CrudResult<DbAuditLog>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('audit_logs').insert({
      actor_id: input.actorId,
      actor_name: input.actorName,
      actor_role: input.actorRole,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      previous_value: input.previousValue ?? null,
      new_value: input.newValue ?? null,
      details: input.details ?? null,
      ip_address_masked: input.ipAddressMasked,
    }).select().single();

    if (error) return { data: null, error };
    return { data, error: null };
  }

  async query(opts: {
    actorId?: string;
    entityType?: string;
    entity_id?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): Promise<ListResult<DbAuditLog>> {
    const supabase = createServerSupabaseClient();
    let query = supabase.from('audit_logs').select('*', { count: 'exact' });

    if (opts.actorId) query = query.eq('actor_id', opts.actorId);
    if (opts.entityType) query = query.eq('entity_type', opts.entityType);
    if (opts.entity_id) query = query.eq('entity_id', opts.entity_id);
    if (opts.action) query = query.eq('action', opts.action);

    query = query.order('created_at', { ascending: false });
    const pageFrom = opts.offset ?? 0;
    if (opts.limit || opts.offset) query = query.range(pageFrom, pageFrom + (opts.limit ?? 1000) - 1);

    const { data, error, count } = await query;
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }
}

export const auditLogRepo = new AuditLogRepository();
