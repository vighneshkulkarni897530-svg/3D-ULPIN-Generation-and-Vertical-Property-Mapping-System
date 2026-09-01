/**
 * /api/registry/bootstrap (Phase 13)
 * ===================================
 * GET — any AUTHENTICATED user: a full registry snapshot used to hydrate the
 * GISContext (parcels, buildings, floors, property units, verifications,
 * conflicts, activities and demo spatial IDs).
 *
 * When Supabase is configured the snapshot is assembled from the database via
 * the repository layer and mapped to application types. When Supabase is not
 * configured — or any table query fails — the route atomically falls back to
 * the in-memory demo dataset so the prototype always renders a consistent
 * registry. The `source` field tells the client which dataset it received.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/server/apiAuth';
import {
  activityRepo,
  conflictRepo,
  demoSpatialIdRepo,
  gisRepo,
  isSupabaseConfigured,
  propertyUnitRepo,
  verificationRepo,
} from '@/lib/repositories';
import {
  mapActivity,
  mapBuilding,
  mapConflict,
  mapDemoSpatialId,
  mapFloor,
  mapParcel,
  mapVerification,
} from '@/lib/repositories/mappers';
import { MOCK_PARCELS } from '@/data/parcels';
import { MOCK_BUILDINGS } from '@/data/buildings';
import { MOCK_FLOORS } from '@/data/floors';
import { MOCK_PROPERTIES } from '@/data/properties';
import { MOCK_VERIFICATIONS } from '@/data/verifications';
import { MOCK_CONFLICTS } from '@/data/conflicts';
import { MOCK_ACTIVITIES } from '@/data/activities';
import { MOCK_DEMO_SPATIAL_IDS } from '@/data/demoSpatialIds';
import type { RegistryBootstrapPayload } from '@/types/registry';

/** The in-memory demo dataset, wrapped in a bootstrap payload. */
function demoPayload(source: 'mock' | 'supabase', warnings: string[] = []): RegistryBootstrapPayload {
  return {
    source,
    generatedAt: new Date().toISOString(),
    warnings,
    parcels: MOCK_PARCELS,
    buildings: MOCK_BUILDINGS,
    floors: MOCK_FLOORS,
    properties: MOCK_PROPERTIES,
    verifications: MOCK_VERIFICATIONS,
    conflicts: MOCK_CONFLICTS,
    activities: MOCK_ACTIVITIES,
    demoSpatialIds: MOCK_DEMO_SPATIAL_IDS,
  };
}

/** Generous caps — the demo registry is small (≤ a few hundred rows/table). */
const LIST_LIMIT = 1000;
const ACTIVITY_LIMIT = 500;

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  // Demo mode: no Supabase credentials — serve the in-memory dataset directly.
  if (!isSupabaseConfigured()) {
    return NextResponse.json(demoPayload('mock'));
  }

  const warnings: string[] = [];
  try {
    const [gis, units, verifications, conflicts, activities, demoIds] = await Promise.all([
      gisRepo.getAllGisData(),
      propertyUnitRepo.getAll({ limit: LIST_LIMIT }),
      verificationRepo.getAll({ limit: LIST_LIMIT }),
      conflictRepo.getAll({ limit: LIST_LIMIT }),
      activityRepo.getAll({ limit: ACTIVITY_LIMIT }),
      demoSpatialIdRepo.getAll({ limit: LIST_LIMIT }),
    ]);

    const errors = [...gis.errors];
    for (const result of [units, verifications, conflicts, activities, demoIds]) {
      if (result.error) errors.push(result.error);
    }

    if (errors.length > 0) {
      // Atomic fallback: never serve a half-populated registry. If any table
      // fails, return the complete demo dataset plus the failure warnings.
      for (const e of errors) warnings.push(`Supabase query failed: ${e.message}`);
      return NextResponse.json(demoPayload('mock', warnings));
    }

    const payload: RegistryBootstrapPayload = {
      source: 'supabase',
      generatedAt: new Date().toISOString(),
      warnings,
      parcels: gis.parcels.map(mapParcel),
      buildings: gis.buildings.map(mapBuilding),
      floors: gis.floors.map(mapFloor),
      properties: units.data,
      verifications: verifications.data.map(mapVerification),
      conflicts: conflicts.data.map(mapConflict),
      activities: activities.data.map(mapActivity),
      demoSpatialIds: demoIds.data.map(mapDemoSpatialId),
    };
    return NextResponse.json(payload);
  } catch (err) {
    warnings.push(err instanceof Error ? err.message : 'Unknown Supabase error.');
    return NextResponse.json(demoPayload('mock', warnings));
  }
}
