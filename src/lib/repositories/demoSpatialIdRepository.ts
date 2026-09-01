/**
 * Demo Spatial ID Repository (Phase 13)
 * ======================================
 * Data-access layer for standalone demo spatial identifier records
 * (1:1 with property units). Server-side only.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DbDemoSpatialId } from '@/lib/supabase/types';
import type { ListOptions, ListResult, CrudResult } from './index';

export class DemoSpatialIdRepository {
  async getAll(opts: ListOptions = {}): Promise<ListResult<DbDemoSpatialId>> {
    const supabase = createServerSupabaseClient();
    let query = supabase.from('demo_spatial_ids').select('*', { count: 'exact' });
    query = query.order(opts.orderBy ?? 'generated_at', { ascending: opts.ascending ?? false });
    const pageFrom = opts.offset ?? 0;
    if (opts.limit || opts.offset) query = query.range(pageFrom, pageFrom + (opts.limit ?? 1000) - 1);

    const { data, error, count } = await query;
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async getById(id: string): Promise<CrudResult<DbDemoSpatialId>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('demo_spatial_ids')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return { data: null, error };
    return { data, error: null };
  }

  async getByPropertyUnit(propertyUnitId: string): Promise<ListResult<DbDemoSpatialId>> {
    const supabase = createServerSupabaseClient();
    const { data, error, count } = await supabase
      .from('demo_spatial_ids')
      .select('*', { count: 'exact' })
      .eq('property_unit_id', propertyUnitId);
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async getByDemoId(demoId: string): Promise<CrudResult<DbDemoSpatialId>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('demo_spatial_ids')
      .select('*')
      .eq('demo_id', demoId)
      .single();
    if (error) return { data: null, error };
    return { data, error: null };
  }

  async create(payload: Partial<DbDemoSpatialId>): Promise<CrudResult<DbDemoSpatialId>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('demo_spatial_ids')
      .insert(payload)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data, error: null };
  }
}

export const demoSpatialIdRepo = new DemoSpatialIdRepository();