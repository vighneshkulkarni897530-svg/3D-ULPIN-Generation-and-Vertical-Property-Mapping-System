/**
 * Dispute Repository (Phase 13)
 * ===============================
 * Data-access layer for citizen-raised disputes. Server-side only.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DbDispute } from '@/lib/supabase/types';
import type { ListOptions, ListResult, CrudResult } from './index';

export class DisputeRepository {
  async getAll(opts: ListOptions = {}): Promise<ListResult<DbDispute>> {
    const supabase = createServerSupabaseClient();
    let query = supabase.from('disputes').select('*', { count: 'exact' });
    query = query.order(opts.orderBy ?? 'created_at', { ascending: false });
    const pageFrom = opts.offset ?? 0;
    if (opts.limit || opts.offset) query = query.range(pageFrom, pageFrom + (opts.limit ?? 1000) - 1);

    const { data, error, count } = await query;
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async getById(id: string): Promise<CrudResult<DbDispute>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('disputes').select('*').eq('id', id).single();
    if (error) return { data: null, error };
    return { data, error: null };
  }

  async getByProperty(propertyId: string): Promise<ListResult<DbDispute>> {
    const supabase = createServerSupabaseClient();
    const { data, error, count } = await supabase
      .from('disputes')
      .select('*', { count: 'exact' })
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async getByStatus(status: string): Promise<ListResult<DbDispute>> {
    const supabase = createServerSupabaseClient();
    const { data, error, count } = await supabase
      .from('disputes')
      .select('*', { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async create(payload: Partial<DbDispute>): Promise<CrudResult<DbDispute>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('disputes').insert(payload).select().single();
    if (error) return { data: null, error };
    return { data, error: null };
  }

  async update(id: string, patch: Partial<DbDispute>): Promise<CrudResult<DbDispute>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('disputes')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data, error: null };
  }
}

export const disputeRepo = new DisputeRepository();
