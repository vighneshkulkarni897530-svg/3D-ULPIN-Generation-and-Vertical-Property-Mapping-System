/**
 * Verification Repository (Phase 13)
 * ===================================
 * Data-access layer for property verification records. Server-side only.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DbVerification } from '@/lib/supabase/types';
import type { ListOptions, ListResult, CrudResult } from './index';

export class VerificationRepository {
  async getAll(opts: ListOptions = {}): Promise<ListResult<DbVerification>> {
    const supabase = createServerSupabaseClient();
    let query = supabase.from('verifications').select('*', { count: 'exact' });
    query = query.order(opts.orderBy ?? 'verification_date', { ascending: false });
    const pageFrom = opts.offset ?? 0;
    if (opts.limit || opts.offset) query = query.range(pageFrom, pageFrom + (opts.limit ?? 1000) - 1);

    const { data, error, count } = await query;
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async getByProperty(propertyId: string): Promise<ListResult<DbVerification>> {
    const supabase = createServerSupabaseClient();
    const { data, error, count } = await supabase
      .from('verifications')
      .select('*', { count: 'exact' })
      .eq('property_id', propertyId)
      .order('verification_date', { ascending: false });
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async getById(id: string): Promise<CrudResult<DbVerification>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('verifications').select('*').eq('id', id).single();
    if (error) return { data: null, error };
    return { data, error: null };
  }

  async create(payload: Partial<DbVerification>): Promise<CrudResult<DbVerification>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('verifications').insert(payload).select().single();
    if (error) return { data: null, error };
    return { data, error: null };
  }
}

export const verificationRepo = new VerificationRepository();
