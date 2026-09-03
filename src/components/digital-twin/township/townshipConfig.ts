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

/* ------------------------------ Data status ------------------------------ */

/**
 * Centralized data-status model — applies to any entity (place, site, building,
 * floor, unit, parcel, GIS record).
 *
 *  - verified .............. backed by real Firebase / GIS / ULPIN records
 *  - illustrative .......... conceptual 3D geometry (no real data yet)
 *  - unlinked .............. conceptual geometry with no database link
 *  - pending-verification .. awaiting survey / GIS / DB verification
 */
export type DataStatus = "verified" | "illustrative" | "unlinked" | "pending-verification";

export const CAMERA_PRESETS = ["isometric", "top", "front", "side", "property", "plaza", "water", "entrance", "cluster"] as const;
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
  isometric: { id: "isometric", label: "ISO", title: "Overview — aerial township view", position: [275, 215, 275], target: [0, 6, 0] },
  top: { id: "top", label: "TOP", title: "Top-down site plan view", position: [0, 335, 2], target: [0, 0, 0] },
  front: { id: "front", label: "FRONT", title: "Front elevation view", position: [0, 115, 305], target: [0, 12, 0] },
  side: { id: "side", label: "SIDE", title: "Side elevation view", position: [305, 115, 0], target: [0, 12, 0] },
  property: { id: "property", label: "PROPERTY", title: "Focus selected property", position: [48, 60, 26], target: [0, 26, -52] },
  plaza: { id: "plaza", label: "PLAZA", title: "Central amenity plaza", position: [0, 78, 122], target: [0, 8, 0] },
  water: { id: "water", label: "WATER", title: "Water feature (illustrative)", position: [176, 84, 188], target: [80, 3, 108] },
  entrance: { id: "entrance", label: "GATE", title: "Main township entrance", position: [0, 48, 226], target: [0, 6, 122] },
  cluster: { id: "cluster", label: "CLUSTER", title: "Residential cluster", position: [-210, 100, -92], target: [-66, 12, -70] },
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

/* --------------------------- Place identity --------------------------- */
/**
 * Stable internal identifier for the Digital Twin's target place.
 * This remains constant across Firebase / GIS / ULPIN integrations and is
 * never replaced by coordinates or a full address.
 */
export const PLACE_ID = "life-republic";

/** Structured postal address for a place/site. */
export interface PlaceAddress {
  line1: string;
  line2?: string;
  taluka: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/**
 * Place type — the hierarchical level in the
 * PLACE → SITE → PARCEL → BUILDING → FLOOR → UNIT → PROPERTY → ULPIN chain.
 */
export type PlaceType = "Township" | "Site" | "Parcel" | "Building" | "District";

/**
 * Place 1 identity — the stable, resolvable entry point for the Digital Twin.
 *
 * Distinguishes VERIFIED data (Firebase / GIS / ULPIN records) from
 * ILLUSTRATIVE data (conceptual 3D geometry — see the honesty rule below).
 */
export interface PlaceInfo {
  /** Stable internal identifier (e.g. "life-republic"). */
  id: string;
  /** Full legal / display name. */
  name: string;
  /** Short display name used in compact HUD headers. */
  displayName: string;
  type: PlaceType;
  address: PlaceAddress;
  /** Approximate visualization center — NOT survey-accurate. */
  center: { lat: number; lng: number };
  centerNote: string;
  /** Distinguishes verified (DB/GIS) records from illustrative (conceptual 3D). */
  dataStatus: DataStatus;
  /** Township-wide visualization status label shown in the UI. */
  visualizationStatus: string;
  /** Scene units — meters (kept here so future places can declare their own). */
  sceneScale: "meters";
}

/**
 * Place 1 — Kolte-Patil Life Republic Township.
 *
 * The authoritative place identity for the Digital Twin. All site geometry,
 * towers, roads and landscape in this configuration file describe the
 * illustrative 3D visualization of this place only.
 *
 * Coordinates are the APPROXIMATE VISUALIZATION CENTER — they are NOT
 * surveyed boundary coordinates, official parcel coordinates, verified
 * building coordinates, or legal property coordinates.
 */
export const PLACE: PlaceInfo = {
  id: "life-republic",
  name: "Kolte Patil Life Republic Penthouses",
  displayName: "LIFE REPUBLIC PENTHOUSES",
  type: "Township",
  address: {
    line1: "Survey No. 74, Marunji",
    line2: "Hinjewadi–Marunji–Kasarsai Road, Near Hinjewadi Phase 2",
    taluka: "Mulshi",
    city: "Pune",
    state: "Maharashtra",
    postalCode: "411057",
    country: "India",
  },
  center: { lat: 18.6172, lng: 73.7141 },
  centerNote: "Approximate visualization center (Survey No. 74, Marunji)",
  dataStatus: "illustrative",
  visualizationStatus: "Kolte Patil Life Republic 3D Township Digital Twin",
  sceneScale: "meters",
};

/**
 * Registry of all places available in the Digital Twin.
 * Populated with Place 1 only — Places 2 & 3 are reserved for later phases.
 */
export const PLACES: PlaceInfo[] = [PLACE];

/**
 * Resolve a place by its stable internal identifier.
 * Returns `undefined` when the place does not exist — consumers must render
 * a safe "Place not found" fallback.
 */
export function resolvePlace(id: string): PlaceInfo | undefined {
  return PLACES.find((p) => p.id === id);
}

/** Convenience: the current place's visualization status label. */
export const PLACE_VISUALIZATION_STATUS = PLACE.visualizationStatus;

/* ------------------------------- Site ------------------------------- */

export interface TownshipSiteInfo {
  id: string;
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
  dataStatus: DataStatus;
  visualizationStatus: string;
}

/**
 * TOWNSHIP_SITE mirrors PLACE for scene-level metadata (coordinates, survey
 * fields used by GIS solar / footprint logic). It stays backward-compatible
 * with townshipData.ts, solarConfig.ts and TownshipPanels.tsx.
 */
export const TOWNSHIP_SITE: TownshipSiteInfo = {
  id: PLACE_ID,
  name: PLACE.displayName,
  subtitle: "MARUNJI • PUNE",
  surveyNo: "74",
  village: "Marunji",
  taluka: PLACE.address.taluka,
  district: PLACE.address.city,
  state: PLACE.address.state,
  pin: PLACE.address.postalCode,
  center: PLACE.center,
  centerNote: PLACE.centerNote,
  dataStatus: "illustrative",
  visualizationStatus: PLACE.visualizationStatus,
};

/* ------------------------------ Towers ------------------------------ */

export type TowerType = "A" | "B" | "C" | "D";

export interface TowerDef {
  id: string;
  /** Display name. */
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
  /** Whether this tower's geometry is verified, illustrative, unlinked, etc. */
  dataStatus: DataStatus;
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
  name: string,
  type: TowerType,
  position: [number, number],
  rotation: number,
  floors: number,
  footprint: [number, number]
): TowerDef {
  return {
    id,
    name,
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
 * The 5 core towers correspond directly to Towers A, B, C, D, E.
 */
export const TOWERS: TowerDef[] = [
  tower("B-LR-B", "Tower B", "B", [18, 72], -0.05, 20, [24, 16]),
  tower("twr-b3", "Tower F", "A", [-32, 40], -0.08, 22, [20, 16]),
  tower("B-LR-D", "Tower D", "D", [-72, 8], -0.1, 22, [22, 16]),
  tower("twr-b2", "Tower G", "B", [-110, -28], -0.12, 21, [24, 16]),
  tower("B-LR-A", "Tower A", "A", [-104, -94], 0.05, 24, [20, 16]),
  tower("twr-a3", "Tower H", "A", [-48, -116], 0.0, 22, [20, 16]),
  tower("B-LR-E", "Tower E", "A", [10, -122], 0.0, 24, [20, 16]),
  tower("B-LR-C", "Tower C", "C", [68, -114], -0.05, 23, [28, 16]),
  tower("twr-c2", "Tower I", "C", [122, -86], -0.1, 22, [28, 16]),
  tower("twr-a4", "Tower J", "A", [140, -8], -0.12, 24, [20, 16]),
];

/** The township's pre-selected (featured) tower — Tower B. */
export const SELECTED_TOWER_ID = "B-LR-B";

/* -------------------------- Building clusters ------------------------- */

export interface BuildingClusterDef {
  id: string;
  label: string;
  /** Tower IDs in this cluster. */
  towerIds: string[];
}

export const BUILDING_CLUSTERS: BuildingClusterDef[] = [
  { id: "cluster-north", label: "North Residential Row", towerIds: ["B-LR-A", "twr-a3", "B-LR-E", "B-LR-C", "twr-c2"] },
  { id: "cluster-west", label: "West Residential Curved Row", towerIds: ["twr-b2", "B-LR-D", "twr-b3"] },
  { id: "cluster-south", label: "Foreground Residential Sector", towerIds: ["B-LR-B", "twr-a4"] },
];

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
  /* gate approach stub — links the spine road (z ≤ 132) to the main entrance (z ≈ 143) */
  { position: [0, 137.5], size: [9, 11] },
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
  /** Central organic lake located in the central-right park matching reference image */
  center: [36, 16] as [number, number],
  /** Organic curved outline radii (meters) sampled around the circle */
  radii: [22, 28, 25, 32, 28, 22, 26, 23],
  dataStatus: "illustrative" as const,
};

/* --------------------------- Central amenity -------------------------- */

export const AMENITY = {
  /** Circular glass pavilion located in north-central plaza matching reference image */
  center: [-16, -46] as [number, number],
  plazaRadius: 36,
  innerRadius: 10,
  outerRadius: 24,
  height: 7.5,
  podium: [36, 20, 7.5] as [number, number, number],
  glass: [30, 15, 5] as [number, number, number],
  dataStatus: "illustrative" as const,
};

/* --------------------------- Site boundary --------------------------- */

export const SITE_BOUNDARY = {
  half: [176, 146] as [number, number],
  radius: 40,
  y: 0.3,
  gateZ: 138,
  gateX: -56,
  dataStatus: "illustrative" as const,
};

/* ------------------------------ Entrance ------------------------------ */

export const ENTRANCE = {
  gate: { x: -56, z: 138, width: 28, halfWidth: 14, height: 7.5 },
  laneHalfWidth: 4.0,
  apron: { x: -56, z: 152, width: 34, depth: 26 },
  apronInside: { x: -56, z: 126, width: 26, depth: 16 },
  median: { x: -56, z: 138, width: 1.2, depth: 32 },
  booth: { x: -40, z: 136, size: [3.2, 3.0, 3.2] as [number, number, number] },
  dataStatus: "illustrative" as const,
};

/* ---------------------- Place-scoped scene configuration ----------------------
 * Phase 16A (Part 2) — formal TownshipSceneConfig for Place 1 ("life-republic").
 *
 * This is a single root object that pulls every Part 1/2 structure together so
 * later phases (Parts 3–5) can consume one place-scoped scene configuration
 * instead of several loose constants. Every value is ILLUSTRATIVE (no survey /
 * GIS / legal dimensions). Road/site widths are VISUALIZATION values only.
 * ============================================================================ */

/** Road-width hierarchy — visualization values, NOT surveyed measurements. */
export interface RoadWidths {
  primary: number;
  secondary: number;
  local: number;
  path: number;
}

export interface TownshipSceneConfig {
  placeId: string;
  site: {
    /** Visualization extent in meters (not a surveyed parcel). */
    width: number;
    depth: number;
    dataStatus: DataStatus;
  };
  boundary: typeof SITE_BOUNDARY;
  entrance: typeof ENTRANCE;
  roads: {
    ringRoad: typeof RING_ROAD;
    segments: PadDef[];
    sidewalks: PadDef[];
    widths: RoadWidths;
  };
  buildingZones: BuildingClusterDef[];
  amenityZones: typeof AMENITY;
  waterBody: typeof WATER_FEATURE;
  parkingZones: { lots: ParkingLotDef[]; lanes: PadDef[] };
  openSpaces: { lawns: PadDef[]; centralMeadowRadius: number };
  cameraPresets: Record<CameraPresetId, CameraPresetDef>;
}

/** Place 1 — Kolte-Patil Life Republic Township scene (illustrative). */
export const TOWNSHIP_SCENE: TownshipSceneConfig = {
  placeId: PLACE_ID,
  site: {
    width: SITE_BOUNDARY.half[0] * 2,
    depth: SITE_BOUNDARY.half[1] * 2,
    dataStatus: "illustrative",
  },
  boundary: SITE_BOUNDARY,
  entrance: ENTRANCE,
  roads: {
    ringRoad: RING_ROAD,
    segments: ROAD_SEGMENTS,
    sidewalks: SIDEWALKS,
    widths: { primary: 9, secondary: 9, local: 9, path: 2.4 },
  },
  buildingZones: BUILDING_CLUSTERS,
  amenityZones: AMENITY,
  waterBody: WATER_FEATURE,
  parkingZones: { lots: PARKING_LOTS, lanes: PARKING_LANES },
  openSpaces: { lawns: LAWNS, centralMeadowRadius: CENTRAL_MEADOW_RADIUS },
  cameraPresets: CAMERA_PRESET_DEFS,
};

/* ------------------------------ Vegetation ------------------------------
 * Phase 15B: all tree/shrub/flower placement moved to townshipLandscape.ts
 * (five low-poly tree kinds, exclusion-aware deterministic distribution).
 * ======================================================================== */






