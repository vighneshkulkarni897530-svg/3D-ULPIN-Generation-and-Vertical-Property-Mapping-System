/**
 * GIS Coordinate to Local 3D Cartesian Position Converter
 * =========================================================
 * Converts real latitude/longitude coordinates into local Three.js (x, y, z)
 * Cartesian coordinates in scene meters relative to a reference origin.
 *
 * Coordinates:
 *   +x = East (meters)
 *   +y = Up / Elevation (meters)
 *   +z = South (meters)
 *
 * IMPORTANT:
 * Local transformations are illustrative coordinate projections for visualization.
 * Approximate coordinates are explicitly tagged with `positionSource: "GIS"` or
 * `"ILLUSTRATIVE"` to ensure no false claim of surveyed boundary accuracy.
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
}

export interface Local3DPosition {
  x: number;
  y: number;
  z: number;
  positionSource: 'GIS' | 'ILLUSTRATIVE';
  distanceFromOriginMeters: number;
}

/** Standard meters per degree at equator */
const METERS_PER_DEG_LAT = 111320;

/**
 * Calculates meters per degree of longitude for a given latitude.
 */
function metersPerDegLng(latDeg: number): number {
  const rad = (latDeg * Math.PI) / 180;
  return METERS_PER_DEG_LAT * Math.cos(rad);
}

/**
 * Converts a GeoPoint (lat, lng) to local 3D coordinates (x, y, z) relative to an origin GeoPoint.
 * Clamps coordinates within a reasonable visualization envelope (max radius 450m).
 */
export function geoToLocal3D(
  target: GeoPoint,
  origin: GeoPoint = { latitude: 18.6172, longitude: 73.7141 },
  floorElevation: number = 0,
): Local3DPosition {
  if (
    typeof target.latitude !== 'number' ||
    typeof target.longitude !== 'number' ||
    isNaN(target.latitude) ||
    isNaN(target.longitude)
  ) {
    return {
      x: 0,
      y: floorElevation,
      z: 0,
      positionSource: 'ILLUSTRATIVE',
      distanceFromOriginMeters: 0,
    };
  }

  const dLat = target.latitude - origin.latitude;
  const dLng = target.longitude - origin.longitude;

  // In Three.js scene: +x is East, +z is South (so +dLat goes North = -z)
  const x = dLng * metersPerDegLng(origin.latitude);
  const z = -dLat * METERS_PER_DEG_LAT;
  const y = floorElevation + (target.elevation ?? 0);

  const dist = Math.sqrt(x * x + z * z);

  // If within the scene bounds (approx 450m radius of township)
  if (dist < 450) {
    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      z: Number(z.toFixed(2)),
      positionSource: 'GIS',
      distanceFromOriginMeters: Number(dist.toFixed(1)),
    };
  }

  // If outside bounds, project onto clamped envelope with illustrative placement
  const scale = 140 / (dist || 1);
  return {
    x: Number((x * scale).toFixed(2)),
    y: Number(y.toFixed(2)),
    z: Number((z * scale).toFixed(2)),
    positionSource: 'ILLUSTRATIVE',
    distanceFromOriginMeters: Number(dist.toFixed(1)),
  };
}

/**
 * Converts local 3D coordinates (x, z) back to approximate (lat, lng) relative to an origin.
 */
export function local3DToGeo(
  pos: { x: number; z: number },
  origin: GeoPoint = { latitude: 18.6172, longitude: 73.7141 },
): GeoPoint {
  const dLng = pos.x / metersPerDegLng(origin.latitude);
  const dLat = -pos.z / METERS_PER_DEG_LAT;

  return {
    latitude: origin.latitude + dLat,
    longitude: origin.longitude + dLng,
  };
}
