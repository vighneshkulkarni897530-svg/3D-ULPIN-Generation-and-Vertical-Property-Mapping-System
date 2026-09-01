/**
 * GIS Repository (Phase 13)
 * ===========================
 * Data-access layer for GIS base entities: parcels, buildings, and floors.
 * Server-side only.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DbParcel, DbBuilding, DbFloor } from '@/lib/supabase/types';
import type { ListOptions, ListResult, CrudResult } from './index';

export class GisRepository {
  // ── Parcels ────────────────────────────────────────────────────────────────

  async getAllParcels(opts: ListOptions = {}): Promise<ListResult<DbParcel>> {
    const supabase = createServerSupabaseClient();
    let query = supabase.from('parcels').select('*', { count: 'exact' });
    query = query.order(opts.orderBy ?? 'created_at', { ascending: false });
    const pageFrom = opts.offset ?? 0;
    if (opts.limit || opts.offset) query = query.range(pageFrom, pageFrom + (opts.limit ?? 1000) - 1);

    const { data, error, count } = await query;
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async getParcelById(id: string): Promise<CrudResult<DbParcel>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('parcels').select('*').eq('id', id).single();
    if (error) return { data: null, error };
    return { data, error: null };
  }

  async getParcelsByStatus(status: string): Promise<ListResult<DbParcel>> {
    const supabase = createServerSupabaseClient();
    const { data, error, count } = await supabase
      .from('parcels')
      .select('*', { count: 'exact' })
      .eq('status', status);
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  // ── Buildings ───────────────────────────────────────────────────────────────

  async getAllBuildings(opts: ListOptions = {}): Promise<ListResult<DbBuilding>> {
    const supabase = createServerSupabaseClient();
    let query = supabase.from('buildings').select('*', { count: 'exact' });
    query = query.order(opts.orderBy ?? 'created_at', { ascending: false });
    const pageFrom = opts.offset ?? 0;
    if (opts.limit || opts.offset) query = query.range(pageFrom, pageFrom + (opts.limit ?? 1000) - 1);

    const { data, error, count } = await query;
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async getBuildingsByParcel(parcelId: string): Promise<ListResult<DbBuilding>> {
    const supabase = createServerSupabaseClient();
    const { data, error, count } = await supabase
      .from('buildings')
      .select('*', { count: 'exact' })
      .eq('parcel_id', parcelId);
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async getBuildingById(id: string): Promise<CrudResult<DbBuilding>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('buildings').select('*').eq('id', id).single();
    if (error) return { data: null, error };
    return { data, error: null };
  }

  // ── Floors ──────────────────────────────────────────────────────────────────

  async getAllFloors(opts: ListOptions = {}): Promise<ListResult<DbFloor>> {
    const supabase = createServerSupabaseClient();
    let query = supabase.from('floors').select('*', { count: 'exact' });
    query = query.order(opts.orderBy ?? 'floor_number', { ascending: true });
    const pageFrom = opts.offset ?? 0;
    if (opts.limit || opts.offset) query = query.range(pageFrom, pageFrom + (opts.limit ?? 1000) - 1);

    const { data, error, count } = await query;
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async getFloorsByBuilding(buildingId: string): Promise<ListResult<DbFloor>> {
    const supabase = createServerSupabaseClient();
    const { data, error, count } = await supabase
      .from('floors')
      .select('*', { count: 'exact' })
      .eq('building_id', buildingId)
      .order('floor_number', { ascending: true });
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async getFloorById(id: string): Promise<CrudResult<DbFloor>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('floors').select('*').eq('id', id).single();
    if (error) return { data: null, error };
    return { data, error: null };
  }

  // ── Combined GIS data (for context hydration) ───────────────────────────────

  async getAllGisData(): Promise<{
    parcels: DbParcel[];
    buildings: DbBuilding[];
    floors: DbFloor[];
    errors: Error[];
  }> {
    const supabase = createServerSupabaseClient();
    const errors: Error[] = [];

    const [parcelsRes, buildingsRes, floorsRes] = await Promise.all([
      supabase.from('parcels').select('*'),
      supabase.from('buildings').select('*'),
      supabase.from('floors').select('*').order('floor_number', { ascending: true }),
    ]);

    if (parcelsRes.error) errors.push(parcelsRes.error);
    if (buildingsRes.error) errors.push(buildingsRes.error);
    if (floorsRes.error) errors.push(floorsRes.error);

    return {
      parcels: parcelsRes.data ?? [],
      buildings: buildingsRes.data ?? [],
      floors: floorsRes.data ?? [],
      errors,
    };
  }
}

export const gisRepo = new GisRepository();
