/**
 * Field Verification Request Repository (Phase 13)
 * ==================================================
 * Data-access layer for field verification survey requests. Server-side only.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DbFieldVerificationRequest } from '@/lib/supabase/types';
import type { ListOptions, ListResult, CrudResult } from './index';

export class FieldVerificationRepository {
  async getAll(opts: ListOptions = {}): Promise<ListResult<DbFieldVerificationRequest>> {
    const supabase = createServerSupabaseClient();
    let query = supabase.from('field_verification_requests').select('*', { count: 'exact' });
    query = query.order(opts.orderBy ?? 'created_at', { ascending: false });
    const pageFrom = opts.offset ?? 0;
    if (opts.limit || opts.offset) query = query.range(pageFrom, pageFrom + (opts.limit ?? 1000) - 1);

    const { data, error, count } = await query;
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async getById(id: string): Promise<CrudResult<DbFieldVerificationRequest>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('field_verification_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return { data: null, error };
    return { data, error: null };
  }

  async getByStatus(status: string): Promise<ListResult<DbFieldVerificationRequest>> {
    const supabase = createServerSupabaseClient();
    const { data, error, count } = await supabase
      .from('field_verification_requests')
      .select('*', { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async create(payload: Partial<DbFieldVerificationRequest>): Promise<CrudResult<DbFieldVerificationRequest>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('field_verification_requests')
      .insert(payload)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data, error: null };
  }

  async update(id: string, patch: Partial<DbFieldVerificationRequest>): Promise<CrudResult<DbFieldVerificationRequest>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('field_verification_requests')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data, error: null };
  }
}

export const fieldVerificationRepo = new FieldVerificationRepository();
