/**
 * Global Search over the unified GIS registry (Phase 1 data)
 * ============================================================
 * Pure, framework-free search used by the top-bar GlobalSearch palette.
 *
 * Searches three entity families:
 *   - Land Parcels  → id, parcelNumber, location, district, state
 *   - Buildings     → id, buildingCode, name, address
 *   - Properties    → id, demoSpatialId, unitNumber, propertyId,
 *                     ownerReferenceName, propertyType, buildingId, parcelId
 *
 * Ranking: starts-with beats contains. Results are capped per category.
 */
import type { Building, Floor, LandParcel, PropertyUnit } from '@/types/gis';

export interface Scored<T> {
  item: T;
  score: number;
}

export interface GisSearchOutput {
  query: string;
  parcels: LandParcel[];
  buildings: Building[];
  floors: Floor[];
  properties: PropertyUnit[];
  total: number;
}

/** 0 → starts-with/exact, 1 → contains, Infinity → no match. */
function scoreFor(q: string, ...fields: Array<string | number | undefined | null>): number {
  let best = Infinity;
  const cleanQ = q.replace(/[^a-zA-Z0-9]/g, '');
  for (const field of fields) {
    if (field === undefined || field === null) continue;
    const s = String(field).toLowerCase();
    const cleanS = s.replace(/[^a-zA-Z0-9]/g, '');

    if (s === q || (cleanQ.length >= 4 && cleanS === cleanQ)) {
      return 0; // exact match
    }
    if (s.startsWith(q) || (cleanQ.length >= 4 && cleanS.startsWith(cleanQ))) {
      best = Math.min(best, 0);
    } else if (s.includes(q) || (cleanQ.length >= 4 && cleanS.includes(cleanQ))) {
      best = Math.min(best, 1);
    }
  }
  return best;
}

function rankAndSlice<T>(scored: Array<Scored<T>>, limit: number): T[] {
  return scored
    .filter((r) => r.score < Infinity)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((r) => r.item);
}

export function searchGisRegistry(
  parcels: LandParcel[],
  buildings: Building[],
  floors: Floor[],
  properties: PropertyUnit[],
  rawQuery: string,
  limit = 4,
): GisSearchOutput {
  const query = rawQuery.trim().toLowerCase();
  if (!query || query.length < 2) {
    return { query: rawQuery, parcels: [], buildings: [], floors: [], properties: [], total: 0 };
  }

  const parcelResults = rankAndSlice(
    parcels.map((p) => ({
      item: p,
      score: scoreFor(query, p.id, p.parcelNumber, p.location, p.district, p.state),
    })),
    limit,
  );

  const buildingResults = rankAndSlice(
    buildings.map((b) => ({
      item: b,
      score: scoreFor(query, b.id, b.buildingCode, b.name, b.address),
    })),
    limit,
  );

  /** Floors (Phase 7 §14) → Building Floor Explorer. */
  const floorResults = rankAndSlice(
    floors.map((f) => ({
      item: f,
      score: scoreFor(query, f.id, f.name, f.buildingId, `level ${f.floorNumber}`, String(f.floorNumber)),
    })),
    limit,
  );

  const propertyResults = rankAndSlice(
    properties.map((p) => ({
      item: p,
      score: scoreFor(
        query,
        p.id,
        p.demoSpatialId,
        p.unitNumber,
        p.propertyId,
        p.ownerReferenceName,
        p.propertyType,
        p.buildingId,
        p.parcelId,
      ),
    })),
    limit,
  );

  return {
    query: rawQuery,
    parcels: parcelResults,
    buildings: buildingResults,
    floors: floorResults,
    properties: propertyResults,
    total: parcelResults.length + buildingResults.length + floorResults.length + propertyResults.length,
  };
}