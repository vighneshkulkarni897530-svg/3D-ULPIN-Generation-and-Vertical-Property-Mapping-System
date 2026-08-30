/**
 * GIS Utilities
 * =============
 * Small helper utilities shared across the unified GIS module: formatting,
 * grouping, lookups, and demo-spatial-ID helpers.
 */
import type {
  Building,
  Floor,
  LandParcel,
  PropertyUnit,
} from '@/types/gis';
import type { SpatialConflict } from '@/types/conflict';
import type { ActivityRecord } from '@/types/activity';

// ── Formatting ──────────────────────────────────────────────────────────────

/** Formats a coordinate pair as `lat, lng` with fixed precision. */
export const formatCoordinate = (lat: number, lng: number, precision = 6): string =>
  `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;

/** Formats an area given in m² with thousands separators. */
export const formatArea = (areaSqm: number): string =>
  `${areaSqm.toLocaleString('en-IN')} m²`;

/** Formats an elevation in metres with sign. */
export const formatElevation = (metres: number): string =>
  `${metres > 0 ? '+' : ''}${metres.toFixed(1)} m`;

/** Truncates a string with an ellipsis. */
export const truncate = (value: string, maxLength = 60): string =>
  value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;

/** Returns a short relative-time label for an ISO timestamp. */
export const formatRelativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN');
};

// ── Demo spatial ID helpers ─────────────────────────────────────────────────

/** Always true — every platform-generated spatial ID is a demo ID. */
export const isDemoSpatialId = (id: string): boolean => id.startsWith('3D-');

/**
 * Builds a deterministic demo spatial ID for a unit on a floor of a
 * building on a parcel: `3D-MH-PUN-<parcelSuffix>-<floor>-<unit>`.
 * Non-alphanumeric characters in the parcel suffix (e.g. `042/B`)
 * are stripped so the resulting ID is URL/DB safe.
 */
export const buildDemoSpatialId = (
  parcel: Pick<LandParcel, 'parcelNumber'>,
  floorNumber: number,
  unitNumber: string,
): string => {
  const rawSuffix = parcel.parcelNumber.split('-').pop() ?? '000';
  const suffix = rawSuffix.replace(/[^A-Za-z0-9]/g, '') || '000';
  const floorLabel = floorNumber < 0 ? `B${Math.abs(floorNumber)}` : String(floorNumber);
  return `3D-MH-PUN-${suffix}-${floorLabel}-${unitNumber}`;
};

// ── Grouping ────────────────────────────────────────────────────────────────

/** Groups properties by building, preserving property order. */
export const groupPropertiesByBuilding = (properties: PropertyUnit[]): Record<string, PropertyUnit[]> =>
  properties.reduce<Record<string, PropertyUnit[]>>((acc, p) => {
    (acc[p.buildingId] ??= []).push(p);
    return acc;
  }, {});

/** Groups properties by floor. */
export const groupPropertiesByFloor = (properties: PropertyUnit[]): Record<string, PropertyUnit[]> =>
  properties.reduce<Record<string, PropertyUnit[]>>((acc, p) => {
    (acc[p.floorId] ??= []).push(p);
    return acc;
  }, {});

/** Groups buildings by parcel. */
export const groupBuildingsByParcel = (buildings: Building[]): Record<string, Building[]> =>
  buildings.reduce<Record<string, Building[]>>((acc, b) => {
    (acc[b.parcelId] ??= []).push(b);
    return acc;
  }, {});

/** Groups floors by building, sorted by floor number. */
export const groupFloorsByBuilding = (floors: Floor[]): Record<string, Floor[]> =>
  floors.reduce<Record<string, Floor[]>>((acc, f) => {
    (acc[f.buildingId] ??= []).push(f);
    return acc;
  }, {});

// ── Hierarchy lookups ───────────────────────────────────────────────────────

/** Full lineage chain for a property: parcel → building → floor → property. */
export const getPropertyLineage = (
  property: PropertyUnit,
  parcels: LandParcel[],
  buildings: Building[],
  floors: Floor[],
): { parcel?: LandParcel; building?: Building; floor?: Floor } => ({
  parcel: parcels.find((p) => p.id === property.parcelId),
  building: buildings.find((b) => b.id === property.buildingId),
  floor: floors.find((f) => f.id === property.floorId),
});

/** Display label for a property: demo spatial ID + unit number. */
export const getPropertyLabel = (property: PropertyUnit): string =>
  `${property.demoSpatialId} (Unit ${property.unitNumber})`;

/** Display label for a conflict. */
export const getConflictLabel = (conflict: SpatialConflict): string =>
  `${conflict.conflictNumber} — ${conflict.type}`;

/** Human-readable geometry description, e.g. "Polygon · Survey Record". */
export const geometryTypeLabel = (type: string, dataSource: string): string => {
  const shape = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  const source = dataSource.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return `${shape} · ${source}`;
};

/** Filters activity records by entity ID. */
export const selectActivitiesByEntity = (activities: ActivityRecord[], entityId: string): ActivityRecord[] =>
  activities.filter((a) => a.entityId === entityId);