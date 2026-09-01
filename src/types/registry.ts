import type { DemoSpatialIdentifier, LandParcel, Building, Floor, PropertyUnit } from './gis';
import type { VerificationRecord } from './verification';
import type { SpatialConflict } from './conflict';
import type { ActivityRecord } from './activity';

/**
 * Where the registry snapshot came from.
 *  - 'supabase' — mapped rows from the PostgreSQL/PostGIS database.
 *  - 'mock'     — the in-memory demo dataset (Supabase not configured, or a
 *                 database failure triggered the atomic fallback).
 */
export type RegistryDataSource = 'supabase' | 'mock';

/** Hydration status exposed by GISContext. */
export type RegistryStatus = 'loading' | 'ready' | 'error';

/**
 * Full registry snapshot served by `GET /api/registry/bootstrap` and used to
 * hydrate the GISContext. All entities use the application types so client
 * code can consume Supabase-backed and demo data interchangeably.
 */
export interface RegistryBootstrapPayload {
  source: RegistryDataSource;
  /** ISO timestamp of when the snapshot was generated server-side. */
  generatedAt: string;
  parcels: LandParcel[];
  buildings: Building[];
  floors: Floor[];
  properties: PropertyUnit[];
  verifications: VerificationRecord[];
  conflicts: SpatialConflict[];
  activities: ActivityRecord[];
  demoSpatialIds: DemoSpatialIdentifier[];
  /** Non-fatal warnings (e.g. fallback reasons). Empty when healthy. */
  warnings: string[];
}