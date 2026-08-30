/**
 * GIS Geometry Helpers (Leaflet / Three.js)
 * ===========================================
 * Pure helpers for converting the centralized GeoJSON-ish geometry into the
 * shapes Leaflet and the simplified Three.js viewer need. All geometry in the
 * unified model stores coordinates as [lng, lat]. Nothing here creates a
 * second data model — it only converts the existing one for display.
 */
import type { Geometry } from '@/types/gis';

/** [lat, lng] convenience pair used by Leaflet. */
export type LatLngPair = [number, number];

export interface Bounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface LocalPoint {
  x: number;
  z: number;
}

/**
 * Extracts a single exterior ring of [lng, lat] pairs from any Geometry.
 * Robust to `Polygon` (flat ring), `MultiPolygon` (nested rings) and
 * `Point` (single coordinate).
 */
export function lngLatRing(geometry: Geometry): Array<[number, number]> {
  const c = geometry.coordinates;

  // Polygon: coordinates = [ring]  →  number[][][]
  if (Array.isArray(c[0]) && Array.isArray(c[0][0]) && !Array.isArray(c[0][0][0])) {
    return (c[0] as number[][]) as Array<[number, number]>;
  }

  // MultiPolygon: coordinates = [[ring]]  →  number[][][][]
  if (Array.isArray(c[0]) && Array.isArray(c[0][0]) && Array.isArray(c[0][0][0])) {
    return (c[0][0] as number[][]) as Array<[number, number]>;
  }

  // Point: coordinates = [lng, lat]
  if (geometry.type === 'Point' && typeof c[0] === 'number') {
    return [[c[0], c[1]] as [number, number]];
  }

  // Fallback: treat as flat ring
  return (c as number[][]).map((p) => [p[0], p[1]] as [number, number]);
}

/** Converts a [lng, lat] ring to a [lat, lng] ring for Leaflet. */
export function ringToLatLngs(ring: Array<[number, number]>): LatLngPair[] {
  return ring.map(([lng, lat]) => [lat, lng]);
}

/** Bounds of a [lng, lat] ring. */
export function ringBounds(ring: Array<[number, number]>): Bounds {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return { minLng, minLat, maxLng, maxLat };
}

/** Bounds of any Geometry. */
export function geometryBounds(geometry: Geometry): Bounds {
  return ringBounds(lngLatRing(geometry));
}

/** Centre (lat, lng) of any Geometry. */
export function geometryCentre(geometry: Geometry): LatLngPair {
  const b = geometryBounds(geometry);
  return [(b.minLat + b.maxLat) / 2, (b.minLng + b.maxLng) / 2];
}

// ── Metre conversion (Web Mercator approximations, fine for demo scale) ──

export const METERS_PER_DEG_LAT = 111_320;

export function metersPerDegLng(lat: number): number {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

/**
 * Converts a geographic coordinate into a local {x, z} plane relative to a
 * scene origin, used by the simplified 3D viewer. x → east (lng), z → north
 * (lat).
 */
export function geoToLocal(
  originLat: number,
  originLng: number,
  lat: number,
  lng: number,
): LocalPoint {
  return {
    x: (lng - originLng) * metersPerDegLng(originLat),
    z: (lat - originLat) * METERS_PER_DEG_LAT,
  };
}

/** Total east/west extent of a ring in metres. */
export function ringWidthMeters(ring: Array<[number, number]>, refLat: number): number {
  return (ringBounds(ring).maxLng - ringBounds(ring).minLng) * metersPerDegLng(refLat);
}

/** Total north/south extent of a ring in metres. */
export function ringDepthMeters(ring: Array<[number, number]>): number {
  const b = ringBounds(ring);
  return (b.maxLat - b.minLat) * METERS_PER_DEG_LAT;
}

/** Human-readable text label for a geometry type. */
export function geometryTypeLabel(type: Geometry['type'], dataSource: string): string {
  const base = type === 'Polygon' ? 'Cadastral polygon' : type === 'Point' ? 'Registered centroid' : type;
  return `${base} · ${dataSource.replace(/_/g, ' ')}`;
}