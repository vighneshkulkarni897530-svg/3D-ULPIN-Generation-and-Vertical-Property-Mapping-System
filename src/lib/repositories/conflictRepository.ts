/**
 * Conflict Repository (Phase 13)
 * ================================
 * Data-access layer for spatial conflicts. Server-side only.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DbConflict } from '@/lib/supabase/types';
import type { ListOptions, ListResult, CrudResult } from './index';

export class ConflictRepository {
  async getAll(opts: ListOptions = {}): Promise<ListResult<DbConflict>> {
    const supabase = createServerSupabaseClient();
    let query = supabase.from('conflicts').select('*', { count: 'exact' });
    query = query.order(opts.orderBy ?? 'detected_at', { ascending: false });
    const pageFrom = opts.offset ?? 0;
    if (opts.limit || opts.offset) query = query.range(pageFrom, pageFrom + (opts.limit ?? 1000) - 1);

    const { data, error, count } = await query;
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async getById(id: string): Promise<CrudResult<DbConflict>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('conflicts').select('*').eq('id', id).single();
    if (error) return { data: null, error };
    return { data, error: null };
  }

  async getByStatus(status: string): Promise<ListResult<DbConflict>> {
    const supabase = createServerSupabaseClient();
    const { data, error, count } = await supabase
      .from('conflicts')
      .select('*', { count: 'exact' })
      .eq('status', status)
      .order('detected_at', { ascending: false });
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async update(id: string, patch: Partial<DbConflict>): Promise<CrudResult<DbConflict>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('conflicts')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data, error: null };
  }
}

export const conflictRepo = new ConflictRepository();
