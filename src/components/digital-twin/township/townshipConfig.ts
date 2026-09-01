"use client";

/**
 * Phase 15A — Illustrative Township configuration (data-only, no React).
 *
 * IMPORTANT:
 *  - Every geometry in this file is ILLUSTRATIVE. No survey / GIS / DEM data
 *    exists for this site in the database, so nothing here may be presented
 *    as surveyed or verified geometry.
 *  - The site coordinates are the APPROXIMATE VISUALIZATION CENTER only —
 *    they are not a parcel boundary.
 *  - No ULPINs, property IDs or verification statuses are invented here.
 *    Real data will be connected through the existing repository layer in
 *    Phase 15C.
 *
 * Scene units = meters. +x = east, +z = south, y = up.
 */

export const CAMERA_PRESETS = ["isometric", "top", "front", "side", "property"] as const;
export type CameraPresetId = (typeof CAMERA_PRESETS)[number];

export interface CameraPresetDef {
  id: CameraPresetId;
  label: string;
  title: string;
  /** Camera position [x, y, z]. */
  position: [number, number, number];
  /** Orbit target [x, y, z]. */
  target: [number, number, number];
}

export const CAMERA_PRESET_DEFS: Record<CameraPresetId, CameraPresetDef> = {
  isometric: { id: "isometric", label: "ISO", title: "Isometric township view", position: [235, 185, 235], target: [0, 6, 0] },
  top: { id: "top", label: "TOP", title: "Top-down site plan view", position: [0, 335, 2], target: [0, 0, 0] },
  front: { id: "front", label: "FRONT", title: "Front elevation view", position: [0, 115, 305], target: [0, 12, 0] },
  side: { id: "side", label: "SIDE", title: "Side elevation view", position: [305, 115, 0], target: [0, 12, 0] },
  property: { id: "property", label: "PROPERTY", title: "Focus selected property", position: [48, 60, 26], target: [0, 26, -52] },
};

/* ------------------------------ Layers ------------------------------ */

export const TOWNSHIP_LAYERS = [
  "buildings",
  "boundary",
  "roads",
  "trees",
  "gardens",
  "terrain",
  "amenities",
  "parking",
  "floors",
  "solarExposure",
  "shadows",
  "gisData",
] as const;
export type TownshipLayerId = (typeof TOWNSHIP_LAYERS)[number];

export interface TownshipLayerDef {
  id: TownshipLayerId;
  label: string;
  /** Whether the corresponding 3D objects exist in Phase 15A. */
  available: boolean;
  defaultOn: boolean;
  /** Where the layer will land in later phases. */
  phase?: string;
}

export const TOWNSHIP_LAYER_DEFS: TownshipLayerDef[] = [
  { id: "buildings", label: "Buildings", available: true, defaultOn: true },
  { id: "boundary", label: "Property Boundary", available: true, defaultOn: true },
  { id: "roads", label: "Roads", available: true, defaultOn: true },
  { id: "trees", label: "Trees", available: true, defaultOn: true },
  { id: "gardens", label: "Gardens", available: true, defaultOn: true },
  { id: "terrain", label: "Terrain", available: true, defaultOn: true },
  { id: "amenities", label: "Amenities", available: true, defaultOn: true },
  { id: "parking", label: "Parking", available: true, defaultOn: true },
  { id: "floors", label: "Floors", available: true, defaultOn: false, phase: "15C (active)" },
  { id: "solarExposure", label: "Solar Exposure", available: false, defaultOn: false, phase: "15E" },
  { id: "shadows", label: "Shadows", available: true, defaultOn: true },
  { id: "gisData", label: "GIS Data", available: true, defaultOn: false, phase: "15C (active)" },
];

export type TownshipLayerState = Record<TownshipLayerId, boolean>;

/** Data-source legend rows (Phase 15C) — keeps verified/db/illustrative distinct. */
export const DATA_SOURCE_LEGEND = [
  { color: "#22C55E", label: "Verified GIS Data", key: "gis" },
  { color: "#00D9FF", label: "Database Data", key: "db" },
  { color: "#64748B", label: "Illustrative 3D", key: "illustrative" },
] as const;

export function defaultLayerState(): TownshipLayerState {
  return TOWNSHIP_LAYER_DEFS.reduce((acc, l) => {
    acc[l.id] = l.defaultOn;
    return acc;
  }, {} as TownshipLayerState);
}

/* ------------------------------- Site ------------------------------- */

export interface TownshipSiteInfo {
  name: string;
  subtitle: string;
  surveyNo: string;
  village: string;
  taluka: string;
  district: string;
  state: string;
  pin: string;
  center: { lat: number; lng: number };
  centerNote: string;
  dataStatus: "illustrative";
}

export const TOWNSHIP_SITE: TownshipSiteInfo = {
  name: "LIFE REPUBLIC",
  subtitle: "MARUNJI • PUNE",
  surveyNo: "74",
  village: "Marunji",
  taluka: "Mulshi",
  district: "Pune",
  state: "Maharashtra",
  pin: "411057",
  center: { lat: 18.6172, lng: 73.7141 },
  centerNote: "Approximate visualization center",
  dataStatus: "illustrative",
};

/* ------------------------------ Towers ------------------------------ */

export type TowerType = "A" | "B" | "C" | "D";

export interface TowerDef {
  id: string;
  /** Display name — kept generic because no database building record exists. */
  name: string;
  type: TowerType;
  typeLabel: string;
  /** Ground position [x, z]. */
  position: [number, number];
  /** Y rotation in radians. */
  rotation: number;
  floors: number;
  /** Footprint [width, depth] in meters. */
  footprint: [number, number];
  dataStatus: "illustrative";
}

export const FLOOR_HEIGHT = 3.1;

const TYPE_LABELS: Record<TowerType, string> = {
  A: "Tower Type A — Tall Slab",
  B: "Tower Type B — Wide Slab",
  C: "Tower Type C — Twin Offset",
  D: "Tower Type D — Mid-Rise",
};

function tower(
  id: string,
  type: TowerType,
  position: [number, number],
  rotation: number,
  floors: number,
  footprint: [number, number]
): TowerDef {
  return {
    id,
    name: "Illustrative Building",
    type,
    typeLabel: TYPE_LABELS[type],
    position,
    rotation,
    floors,
    footprint,
    dataStatus: "illustrative",
  };
}

/**
 * 13 illustrative residential towers arranged as a planned township around a
 * central amenity — deliberately irregular positions / rotations / heights.
 */
export const TOWERS: TowerDef[] = [
  tower("twr-a1", "A", [-108, -92], 0.1, 24, [18, 16]),
  tower("twr-b1", "B", [-38, -102], -0.06, 20, [26, 16]),
  tower("twr-a2", "A", [44, -96], 0.12, 26, [18, 16]),
  tower("twr-c1", "C", [116, -90], -0.08, 22, [30, 16]),
  tower("twr-b2", "B", [-132, -18], 0.18, 18, [24, 17]),
  tower("twr-d1", "D", [-64, -34], -0.1, 12, [22, 15]),
  tower("twr-a3", "A", [0, -52], 0.05, 24, [18, 16]),
  tower("twr-c2", "C", [68, -40], 0.1, 20, [30, 16]),
  tower("twr-d2", "D", [128, -14], -0.15, 12, [22, 15]),
  tower("twr-b3", "B", [-104, 58], -0.12, 19, [24, 16]),
  tower("twr-c3", "C", [-24, 66], 0.07, 21, [30, 16]),
  tower("twr-a4", "A", [108, 52], 0.16, 23, [18, 16]),
  tower("twr-d3", "D", [44, 96], -0.06, 11, [22, 15]),
];

/** The township's pre-selected (central) tower. */
export const SELECTED_TOWER_ID = "twr-a3";

/* ------------------------- Roads & pavements ------------------------- */

export interface PadDef {
  position: [number, number];
  size: [number, number];
}

/** Curved perimeter ring road — rounded-rectangle ring (outer/inner half-extents + corner radius). */
export const RING_ROAD = {
  outerHalf: [166, 137] as [number, number],
  innerHalf: [156, 127] as [number, number],
  radius: 30,
};

/** Straight internal road segments — [centerX, centerZ], [width, length]. */
export const ROAD_SEGMENTS: PadDef[] = [
  { position: [0, 76], size: [9, 112] },
  { position: [0, -12], size: [9, 58] },
  { position: [0, 58], size: [309, 9] },
  { position: [0, -40], size: [309, 9] },
  { position: [96, 9], size: [9, 98] },
  { position: [-96, 9], size: [9, 98] },
  { position: [-132, -29], size: [9, 22] },
  { position: [132, -29], size: [9, 22] },
];

/** Sidewalk / pedestrian edges — [centerX, centerZ], [width, length]. */
export const SIDEWALKS: PadDef[] = [
  { position: [-6.5, 76], size: [2.4, 112] },
  { position: [6.5, 76], size: [2.4, 112] },
  { position: [-6.5, -12], size: [2.4, 58] },
  { position: [6.5, -12], size: [2.4, 58] },
];

/* ------------------------------ Parking ------------------------------ */

export interface ParkingLotDef {
  id: string;
  position: [number, number];
  size: [number, number];
  /** Bays per row (two rows, one per long side). */
  baysPerRow: number;
}

export const PARKING_LOTS: ParkingLotDef[] = [
  { id: "pk-ne", position: [130, 96], size: [52, 30], baysPerRow: 16 },
  { id: "pk-sw", position: [-126, 88], size: [52, 30], baysPerRow: 16 },
  { id: "pk-nw", position: [-132, -78], size: [44, 28], baysPerRow: 13 },
];

/** Short access lanes linking lots to the internal road network. */
export const PARKING_LANES: PadDef[] = [
  { position: [130, 70], size: [9, 22] },
  { position: [-126, 64], size: [9, 18] },
  { position: [-132, -52], size: [9, 24] },
];

/* ------------------------------ Greens ------------------------------- */

/** Lawn / landscaped zones — rounded-rect patches [centerX, centerZ], [w, d]. */
export const LAWNS: PadDef[] = [
  { position: [0, -102], size: [210, 52] },
  { position: [-20, 98], size: [170, 46] },
  { position: [128, 24], size: [54, 66] },
  { position: [-130, 20], size: [42, 60] },
  { position: [0, 22], size: [64, 40] },
];

/** Central meadow radius around the amenity plaza. */
export const CENTRAL_MEADOW_RADIUS = 62;

/* --------------------------- Water feature --------------------------- */

export const WATER_FEATURE = {
  center: [-24, 108] as [number, number],
  /** Irregular blobby outline radii (meters) sampled around the circle. */
  radii: [13.5, 16, 14.5, 17, 15, 13, 15.5, 14],
  dataStatus: "illustrative" as const,
};

/* --------------------------- Central amenity -------------------------- */

export const AMENITY = {
  center: [0, 0] as [number, number],
  plazaRadius: 34,
  podium: [40, 22, 8] as [number, number, number],
  glass: [34, 16, 5] as [number, number, number],
  dataStatus: "illustrative" as const,
};

/* --------------------------- Site boundary --------------------------- */

export const SITE_BOUNDARY = {
  half: [176, 146] as [number, number],
  radius: 40,
  y: 0.3,
  gateZ: 143,
  gateX: 8,
  dataStatus: "illustrative" as const,
};

/* ------------------------------ Vegetation ------------------------------
 * Phase 15B: all tree/shrub/flower placement moved to townshipLandscape.ts
 * (five low-poly tree kinds, exclusion-aware deterministic distribution).
 * ======================================================================== */






