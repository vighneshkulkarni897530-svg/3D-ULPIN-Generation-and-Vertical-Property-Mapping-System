/**
 * Property Unit Repository (Phase 13)
 * ====================================
 * Data-access layer for GIS property units (vertical 3D properties).
 * Server-side only — uses the Supabase service-role client. Rows are mapped
 * to the application `PropertyUnit` type via the shared mappers in `./mappers`.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DbPropertyUnit } from '@/lib/supabase/types';
import type { PropertyUnit } from '@/types/gis';
import { mapPropertyUnit } from './mappers';
import type { ListOptions, ListResult, CrudResult } from './index';

export class PropertyUnitRepository {
  async getAll(opts: ListOptions = {}): Promise<ListResult<PropertyUnit>> {
    const supabase = createServerSupabaseClient();
    let query = supabase.from('property_units').select('*', { count: 'exact' });
    query = query.order(opts.orderBy ?? 'created_at', { ascending: opts.ascending ?? false });
    const pageFrom = opts.offset ?? 0;
    if (opts.limit || opts.offset) query = query.range(pageFrom, pageFrom + (opts.limit ?? 1000) - 1);

    const { data, error, count } = await query;
    if (error) return { data: [], count: null, error };
    return { data: data?.map(mapPropertyUnit) ?? [], count, error: null };
  }

  async getById(id: string): Promise<CrudResult<PropertyUnit>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('property_units')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return { data: null, error };
    return { data: data ? mapPropertyUnit(data) : null, error: null };
  }

  async getByBuilding(buildingId: string): Promise<ListResult<PropertyUnit>> {
    const supabase = createServerSupabaseClient();
    const { data, error, count } = await supabase
      .from('property_units')
      .select('*', { count: 'exact' })
      .eq('building_id', buildingId);
    if (error) return { data: [], count: null, error };
    return { data: data?.map(mapPropertyUnit) ?? [], count, error: null };
  }

  async getByFloor(floorId: string): Promise<ListResult<PropertyUnit>> {
    const supabase = createServerSupabaseClient();
    const { data, error, count } = await supabase
      .from('property_units')
      .select('*', { count: 'exact' })
      .eq('floor_id', floorId);
    if (error) return { data: [], count: null, error };
    return { data: data?.map(mapPropertyUnit) ?? [], count, error: null };
  }

  async getByParcel(parcelId: string): Promise<ListResult<PropertyUnit>> {
    const supabase = createServerSupabaseClient();
    const { data, error, count } = await supabase
      .from('property_units')
      .select('*', { count: 'exact' })
      .eq('parcel_id', parcelId);
    if (error) return { data: [], count: null, error };
    return { data: data?.map(mapPropertyUnit) ?? [], count, error: null };
  }

  async getByStatus(status: string): Promise<ListResult<PropertyUnit>> {
    const supabase = createServerSupabaseClient();
    const { data, error, count } = await supabase
      .from('property_units')
      .select('*', { count: 'exact' })
      .eq('verification_status', status);
    if (error) return { data: [], count: null, error };
    return { data: data?.map(mapPropertyUnit) ?? [], count, error: null };
  }

  async getAllByIds(ids: string[]): Promise<ListResult<PropertyUnit>> {
    if (ids.length === 0) return { data: [], count: null, error: null };
    const supabase = createServerSupabaseClient();
    const { data, error, count } = await supabase
      .from('property_units')
      .select('*', { count: 'exact' })
      .in('id', ids);
    if (error) return { data: [], count: null, error };
    return { data: data?.map(mapPropertyUnit) ?? [], count, error: null };
  }

  async updateVerification(
    id: string,
    newStatus: string,
    updatedBy: string,
  ): Promise<CrudResult<PropertyUnit>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('property_units')
      .update({
        verification_status: newStatus,
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    void updatedBy; // logged separately via the audit trail
    return { data: data ? mapPropertyUnit(data) : null, error: null };
  }
}

export const propertyUnitRepo = new PropertyUnitRepository();
