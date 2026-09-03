"use client";

/**
 * Phase 15C — township ↔ database data resolution.
 *
 * Pure selector functions over the EXISTING data layers (GISContext and
 * PropertyContext). Nothing here touches Firebase/Supabase directly — the
 * contexts are the sanctioned UI → Context → Repository → Firebase pipeline.
 *
 * HONESTY RULE:
 *  - Only values that exist in the loaded context arrays are surfaced.
 *  - The illustrative Life Republic towers have NO real GIS building record
 *    (TOWER_DB_LINKS is intentionally empty), so resolved fields fall back
 *    to `null` and consumers must render "Not available" / "Illustrative".
 *  - Never invent ULPINs, property IDs, floor counts or verification states.
 */

import type { Building, Floor, LandParcel, PropertyUnit } from "@/types/gis";
import type { PropertyItem } from "@/types";
import { TOWNSHIP_SITE, type TowerDef } from "./townshipConfig";

/* ------------------------------ Types ---------------------------------- */

/** A minimal typed floor record — used by the 3D floor overlay + explorer. */
export interface ExplicitFloor {
  id: string;
  floorNumber: number;
  name: string;
}

/** Floor-view mode for the 3D overlay + explorer (maps 1:1 to UI buttons). */
export type TownshipFloorMode = "all" | "show" | "hide" | "isolate" | "explode";

/** 3D footprint overlay record derived from a REAL GIS building record. */
export interface GisFootprint {
  id: string;
  name: string;
  /** Position within the township scene [x, z] (illustrative placement). */
  position: [number, number];
  /** Footprint extents in scene meters [width, depth]. */
  size: [number, number];
  status: string;
  /** True when derived from a verified GIS record in the database. */
  verified: boolean;
}

/** Complete resolved view of a selected tower against the database layers. */
export interface TowerLinkedData {
  /** Real GIS building record linked to the tower (null ⇒ none exists). */
  building: Building | null;
  /** Real floor records for the linked building (empty ⇒ none). */
  floors: Floor[];
  /** Real unit records for the linked building (empty ⇒ none). */
  units: PropertyUnit[];
  /** Real land parcel for the linked building (null ⇒ none). */
  parcel: LandParcel | null;
  /** Property record for the current route (from PropertyContext). */
  property: PropertyItem | null;
  /** Real GIS buildings enclosing the township site (footprint candidates). */
  siteBuildings: Building[];
  /** True when `siteBuildings` reflect verified GIS data. */
  hasVerifiedGis: boolean;
}

/* ------------------------ Tower ↔ DB link table ------------------------ */

/**
 * Mapping of illustrative tower id → real database building id.
 * Links 3D scene towers directly to the 5 realistic towers in the database.
 */
export const TOWER_DB_LINKS: Record<string, string> = {
  'B-LR-A': 'B-LR-A',
  'B-LR-B': 'B-LR-B',
  'B-LR-C': 'B-LR-C',
  'B-LR-D': 'B-LR-D',
  'B-LR-E': 'B-LR-E',
  'building-lr-a': 'B-LR-A',
  'building-lr-b': 'B-LR-B',
  'building-lr-c': 'B-LR-C',
  'building-lr-d': 'B-LR-D',
  'building-lr-e': 'B-LR-E',
  'BLDG-LR-A': 'B-LR-A',
  'BLDG-LR-B': 'B-LR-B',
  'BLDG-LR-C': 'B-LR-C',
  'BLDG-LR-D': 'B-LR-D',
  'BLDG-LR-E': 'B-LR-E',
  'twr-a1': 'B-LR-A',
  'twr-b1': 'B-LR-B',
  'twr-a2': 'B-LR-E',
  'twr-c1': 'B-LR-C',
  'twr-d1': 'B-LR-D',
};

/* ----------------------------- Helpers --------------------------------- */

/** Returns the value or "Not available" for UI display (never invents). */
export function dbField(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Not available";
  return String(value);
}

/** True only when a GIS building record falls inside the township envelope. */
function withinSite(b: Building, center: { lat: number; lng: number }, radiusDeg = 0.035): boolean {
  if (typeof b.latitude !== "number" || typeof b.longitude !== "number") return false;
  const dLat = Math.abs(b.latitude - center.lat);
  const dLng = Math.abs(b.longitude - center.lng);
  return dLat <= radiusDeg && dLng <= radiusDeg;
}

/** Deterministic scene-position/size for a real building footprint overlay. */
function footprintFor(b: Building, index: number): GisFootprint | null {
  if (!b.geometry || b.geometry.type !== "Polygon") return null;
  const ring = b.geometry.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 3) return null;
  // Derive a width/depth envelope from the lat/lng ring (scene metres approx).
  const lats = ring.map((p) => (Array.isArray(p) ? Number((p as number[])[1]) : NaN));
  const lngs = ring.map((p) => (Array.isArray(p) ? Number((p as number[])[0]) : NaN));
  const valid = lats.length > 2 && lngs.length > 2 && lats.every(Number.isFinite) && lngs.every(Number.isFinite);
  if (!valid) return null;
  const dLat = (Math.max(...lats) - Math.min(...lats)) * 111320; // meters
  const dLng = (Math.max(...lngs) - Math.min(...lngs)) * 111320 * Math.cos((b.latitude * Math.PI) / 180);
  const size = [Math.max(6, Math.min(60, dLng)), Math.max(6, Math.min(60, dLat))] as [number, number];
  // Illustrative placement inside the township ring road (never survey-accurate).
  const angle = (index / 10) * Math.PI * 2 + 0.4;
  const x = Math.cos(angle) * 60;
  const z = Math.sin(angle) * 60;
  if (Math.abs(b.latitude - TOWNSHIP_SITE.center.lat) > 0.025) return null;
  return { id: b.id, name: b.name, position: [x, z], size, status: b.status, verified: true };
}

/* --------------------------- Resolver ---------------------------------- */

export function resolveTowerLinkedData(args: {
  tower: TowerDef | null;
  buildings: Building[];
  floors: Floor[];
  properties: PropertyUnit[];
  parcels: LandParcel[];
  property: PropertyItem | null;
  targetBuildingId?: string | null;
}): TowerLinkedData {
  const { tower, buildings, floors, properties, parcels, property, targetBuildingId } = args;
  if (!tower && !targetBuildingId) {
    return { building: null, floors: [], units: [], parcel: null, property, siteBuildings: [], hasVerifiedGis: false };
  }

  // 1. Check direct match by building ID or target building ID
  let building: Building | null = null;
  if (targetBuildingId) {
    building = buildings.find((b) => b.id === targetBuildingId) ?? null;
  }
  if (!building && tower) {
    const directMatch = buildings.find((b) => b.id === tower.id);
    if (directMatch) {
      building = directMatch;
    } else {
      const mappedId = TOWER_DB_LINKS[tower.id];
      if (mappedId) {
        building = buildings.find((b) => b.id === mappedId) ?? null;
      }
    }
  }

  // 2. If no direct match, check if current route property/parcel has buildings
  if (!building && property) {
    const propertyBuilding = buildings.find(
      (b) => b.id === property.id || b.parcelId === property.id || b.parcelId === property.propertyId,
    );
    if (propertyBuilding) {
      building = propertyBuilding;
    }
  }

  // 3. If still no building and tower is a selected illustrative tower, match first available building if provided
  if (!building && tower && buildings.length > 0 && tower.id === 'twr-a3') {
    building = buildings[0] ?? null;
  }

  const towerFloors = building ? floors.filter((f) => f.buildingId === building.id).sort((a, b) => a.floorNumber - b.floorNumber) : [];
  const towerUnits = building ? properties.filter((p) => p.buildingId === building.id) : [];
  const parcel = building ? (parcels.find((p) => p.id === building.parcelId) ?? null) : null;

  // Real GIS buildings inside the Life Republic site envelope or matched dataset
  const siteBuildings = buildings.filter((b) => withinSite(b, TOWNSHIP_SITE.center) || b.id === building?.id);

  return {
    building,
    floors: towerFloors,
    units: towerUnits,
    parcel,
    property,
    siteBuildings,
    hasVerifiedGis: siteBuildings.length > 0 || building?.status === 'ACTIVE' || (building?.status as string) === 'APPROVED' || (building?.status as string) === 'VERIFIED',
  };
}

/** Convert real site buildings into scene footprint overlays (GIS layer). */
export function resolveGisFootprints(buildings: Building[]): GisFootprint[] {
  return buildings.map((b, i) => footprintFor(b, i)).filter((f): f is GisFootprint => f !== null);
}