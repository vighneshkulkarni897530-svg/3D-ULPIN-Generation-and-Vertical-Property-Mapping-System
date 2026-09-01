/**
 * Activity Repository (Phase 13)
 * ===============================
 * Data-access layer for the unified activity feed. Server-side only.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DbActivity } from '@/lib/supabase/types';
import type { ListOptions, ListResult, CrudResult } from './index';

export class ActivityRepository {
  async getAll(opts: ListOptions = {}): Promise<ListResult<DbActivity>> {
    const supabase = createServerSupabaseClient();
    let query = supabase.from('activities').select('*', { count: 'exact' });
    query = query.order(opts.orderBy ?? 'timestamp', { ascending: opts.ascending ?? false });
    const pageFrom = opts.offset ?? 0;
    if (opts.limit || opts.offset) query = query.range(pageFrom, pageFrom + (opts.limit ?? 1000) - 1);

    const { data, error, count } = await query;
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async getById(id: string): Promise<CrudResult<DbActivity>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('activities').select('*').eq('id', id).single();
    if (error) return { data: null, error };
    return { data, error: null };
  }

  async getByEntity(entityType: string, entityId: string): Promise<ListResult<DbActivity>> {
    const supabase = createServerSupabaseClient();
    const { data, error, count } = await supabase
      .from('activities')
      .select('*', { count: 'exact' })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('timestamp', { ascending: false });
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async create(payload: Partial<DbActivity>): Promise<CrudResult<DbActivity>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('activities').insert(payload).select().single();
    if (error) return { data: null, error };
    return { data, error: null };
  }
}

export const activityRepo = new ActivityRepository();