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

/** 0 → starts-with/exact, 0.5 → whole-word, 1 → contains, Infinity → no match. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreFor(q: string, ...fields: Array<string | number | undefined | null>): number {
  let best = Infinity;
  const cleanQ = q.replace(/[^a-zA-Z0-9]/g, "");
  for (const field of fields) {
    if (field === undefined || field === null) continue;
    const s = String(field).toLowerCase();
    const cleanS = s.replace(/[^a-zA-Z0-9]/g, "");

    if (s === q || (cleanQ.length >= 4 && cleanS === cleanQ)) {
      return 0; // exact match
    }
    if (s.startsWith(q) || (cleanQ.length >= 4 && cleanS.startsWith(cleanQ))) {
      best = Math.min(best, 0);
    } else if (q.length >= 2 && new RegExp(`\\b${escapeRegExp(q)}\\b`).test(s)) {
      // Phase 21 — whole-word match (e.g. token "b" inside "tower b") ranks
      // above a loose substring hit so "Tower B" outranks "Tower A/C/D/E".
      best = Math.min(best, 0.5);
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

/**
 * Phase 21 — society display-name aliases for parcel search. The canonical
 * LandParcel record has no society field (location stays the registry string),
 * so the search indexes a display alias instead of mutating data.
 */
const PARCEL_SEARCH_ALIASES: Record<string, string> = {
  'PARCEL-MH-PUN-001': 'Green View Residency Shivaji Nagar S3D-MH-PUN-GVR-001 GVR',
  'PARCEL-MH-PUN-002': 'Shree Krishna Arcade Koregaon Park S3D-MH-PUN-SKA-001 SKA',
  'PARCEL-MH-PUN-003': 'Tech Tower Commercial Baner Pashan S3D-MH-PUN-TT-001 TT',
  'PARCEL-MH-PUN-004': 'Wakad Heights Residency Pimple Saudagar S3D-MH-PUN-WAK-001 WAK',
  'PARCEL-MH-PUN-005': 'Hinjewadi Tech Enclave Rajiv Gandhi Infotech Park S3D-MH-PUN-HIN-001 HIN',
  'PARCEL-MH-PUN-006': 'Amanora Elegance Towers Hadapsar Cyber City S3D-MH-PUN-AMA-001 AMA',
  'PARCEL-MH-PUN-074': 'Kolte Patil Life Republic Penthouses Marunji Hinjewadi S3D-MH-PUN-LR-001 LR',
  'PARCEL-MH-PUN-UNC-999': 'Pristine Meadows Chakan S3D-MH-PUN-UNC-999 UNC',
};


/**
 * Phase 21 — multi-word query support (AND semantics). Every whitespace-
 * separated token must match at least one field of the entity, otherwise the
 * entity is excluded. Aggregate score is the WORST token score so entities
 * matching all tokens strongly rank above weak matches. Single-token queries
 * behave exactly as scoreFor always has.
 */
function scoreTokens(query: string, ...fields: Array<string | number | undefined | null>): number {
  const tokens = query.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length <= 1) return scoreFor(query, ...fields);
  let worst = 0;
  for (const token of tokens) {
    const s = scoreFor(token, ...fields);
    if (s === Infinity) return Infinity;
    if (s > worst) worst = s;
  }
  return worst;
}

export function searchGisRegistry(
  parcels: LandParcel[] = [],
  buildings: Building[] = [],
  floors: Floor[] = [],
  properties: PropertyUnit[] = [],
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
      score: scoreTokens(
        query,
        p.id,
        p.parcelNumber,
        p.location,
        p.district,
        p.state,
        PARCEL_SEARCH_ALIASES[p.id],
      ),
    })),
    limit,
  );

  const buildingResults = rankAndSlice(
    buildings.map((b) => ({
      item: b,
      score: scoreTokens(query, b.id, b.buildingCode, b.name, b.address),
    })),
    limit,
  );

  /** Floors (Phase 7 §14) → Building Floor Explorer. */
  const floorResults = rankAndSlice(
    floors.map((f) => ({
      item: f,
      score: scoreTokens(query, f.id, f.name, f.buildingId, `level ${f.floorNumber}`, String(f.floorNumber)),
    })),
    limit,
  );

  const propertyResults = rankAndSlice(
    properties.map((p) => ({
      item: p,
      // `flat ${unitNumber}` / `unit ${unitNumber}` pseudo-fields let natural
      // queries like "Flat 402" match the unit without changing registry data.
      score: scoreTokens(
        query,
        p.id,
        p.demoSpatialId,
        p.unitNumber,
        p.propertyId,
        p.ownerReferenceName,
        p.propertyType,
        p.buildingId,
        p.parcelId,
        `flat ${p.unitNumber}`,
        `unit ${p.unitNumber}`,
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