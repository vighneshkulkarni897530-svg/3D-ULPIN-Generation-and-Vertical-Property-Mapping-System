"use client";

/**
 * Phase 15B — Illustrative township LANDSCAPE data (data-only, no React).
 *
 * Everything here is ILLUSTRATIVE generated geometry: tree positions, garden
 * shapes, pedestrian paths, road furniture. Nothing is surveyed, measured or
 * sourced from GIS/LiDAR/DEM. It must never be presented as verified data.
 *
 * This file deliberately contains no database/repository access — the
 * illustrative scene configuration stays fully separate from property data.
 *
 * Placement is deterministic (seeded PRNG) so every render/reload matches.
 * Tree placement uses rejection sampling against exclusion zones (roads,
 * paths, buildings, parking, plaza, water) so vegetation never overlaps the
 * built environment.
 */

import {
  AMENITY,
  CENTRAL_MEADOW_RADIUS,
  LAWNS,
  PARKING_LANES,
  PARKING_LOTS,
  ROAD_SEGMENTS,
  SIDEWALKS,
  TOWERS,
  WATER_FEATURE,
  type PadDef,
} from "./townshipConfig";

/* ------------------------------ PRNG helpers ----------------------------- */

function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function rectTest(x: number, z: number, cx: number, cz: number, hw: number, hd: number, inflate = 0) {
  return Math.abs(x - cx) <= hw + inflate && Math.abs(z - cz) <= hd + inflate;
}

/** Point inside a rounded rectangle (half extents + corner radius), with inflate. */
function inRoundedRect(x: number, z: number, halfX: number, halfZ: number, r: number, inflate = 0) {
  const hx = halfX + inflate;
  const hz = halfZ + inflate;
  if (Math.abs(x) > hx || Math.abs(z) > hz) return false;
  const cx = hx - Math.max(0, r);
  const cz = hz - Math.max(0, r);
  const dx = Math.max(Math.abs(x) - cx, 0);
  const dz = Math.max(Math.abs(z) - cz, 0);
  return dx * dx + dz * dz <= r * r;
}

/* ------------------------- Central community garden ----------------------- */

/** Circular walking path around the amenity plaza (annulus, meters). */
export const CIRC_PATH = { innerR: 44, outerR: 47.25 };
/** Outer garden loop path. */
export const OUTER_RING_PATH = { innerR: 58, outerR: 60.5 };
/** Curved flower strips between the paths. */
export const FLOWER_STRIPS = [
  { innerR: 38.5, outerR: 40 },
  { innerR: 50, outerR: 51.5 },
] as const;
/** Paved seating pads on the circular path. */
export const SEATING_PADS = [45, 135, 225, 315].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return { x: Math.cos(a) * 45.6, z: Math.sin(a) * 45.6, r: 2.75 };
});
/** Landscaped transition band at the meadow edge. */
export const MEADOW_EDGE = { innerR: 60.5, outerR: 63 };

/* ------------------------------ Walking paths ----------------------------- */

export interface Bead {
  x: number;
  z: number;
  r: number;
}

const BEAD_STEP = 1.7;

function bezierBeads(a: [number, number], c: [number, number], b: [number, number], width: number): Bead[] {
  const beads: Bead[] = [];
  const approxLen = Math.hypot(c[0] - a[0], c[1] - a[1]) + Math.hypot(b[0] - c[0], b[1] - c[1]);
  const n = Math.max(8, Math.round(approxLen / BEAD_STEP));
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const mt = 1 - t;
    beads.push({
      x: mt * mt * a[0] + 2 * mt * t * c[0] + t * t * b[0],
      z: mt * mt * a[1] + 2 * mt * t * c[1] + t * t * b[1],
      r: width / 2,
    });
  }
  return beads;
}

/** Curved garden paths — plaza↔pond, plaza↔east connector, north lawn arc, pond↔south ring. */
export const CURVED_PATHS: Bead[] = [
  ...bezierBeads([-36, 10], [-62, 44], [-32, 88], 2.4),
  ...bezierBeads([36, 10], [64, -2], [96, 20], 2.4),
  ...bezierBeads([-30, -80], [0, -108], [30, -80], 2.2),
  ...bezierBeads([-24, 90], [-20, 74], [-8, 60.5], 2.2),
];

/** Straight pedestrian connectors from each tower pad to the nearest avenue. */
export const TOWER_PATHS: PadDef[] = (() => {
  const out: PadDef[] = [];
  TOWERS.forEach((t) => {
    const avenueZ = t.position[1] < 9 ? -40 : 58;
    const dz = avenueZ - t.position[1];
    if (Math.abs(dz) < t.footprint[1] / 2 + 9) return; // tower already fronts the avenue
    const dir = dz > 0 ? 1 : -1;
    const zStart = t.position[1] + dir * (t.footprint[1] / 2 + 5);
    const zEnd = avenueZ - dir * 5;
    const mid = (zStart + zEnd) / 2;
    out.push({ position: [t.position[0], mid], size: [1.9, Math.abs(zEnd - zStart)] });
  });
  return out;
})();

/** Jogging loop inside the perimeter road (rounded-rect ring band). */
export const JOG_LOOP = { outerHalf: [148, 120] as [number, number], innerHalf: [144.5, 116.5] as [number, number], radius: 24 };

/* --------------------------------- Trees --------------------------------- */

export type TreeKind = "A" | "B" | "C" | "D" | "E";

export interface TreeInstance {
  x: number;
  z: number;
  rot: number;
  scale: number;
  kind: TreeKind;
  /** Index into the kind's tint palette (canopy colour variation). */
  tint: number;
}

/**
 * TREE TYPE A — small ornamental tree (round light canopy, ~4.5 m)
 * TREE TYPE B — medium broad-canopy tree (~7 m)
 * TREE TYPE C — tall narrow tree (~10.5 m)
 * TREE TYPE D — dense shade tree (broad dark canopy, ~7.5 m)
 * TREE TYPE E — palm / ornamental palm (~7 m)
 *
 * Canopy tint palettes (per kind) — hex strings applied per-instance.
 */
export const TREE_TINTS: Record<TreeKind, string[]> = {
  A: ["#7fae5a", "#8fbc66", "#86b35e"],
  B: ["#4f7c39", "#5d8c43", "#6a9a4e"],
  C: ["#3f6d33", "#4c7c3c", "#467438"],
  D: ["#456f2f", "#557f3a", "#4d7534"],
  E: ["#5f8f4a", "#6f9f55", "#67964f"],
};

/* ---- exclusion zones (trees are never placed inside these) ---- */

const RING = { cx: 161, cz: 132, r: 28 };

function isExcluded(x: number, z: number): boolean {
  // site boundary (keep a planted margin inside the fence)
  if (!inRoundedRect(x, z, 170, 140, 36)) return true;
  // perimeter ring road band
  if (inRoundedRect(x, z, RING.cx + 7, RING.cz + 7, RING.r + 6) && !inRoundedRect(x, z, RING.cx - 7, RING.cz - 7, Math.max(4, RING.r - 8))) return true;
  // internal roads, sidewalks, parking
  for (const s of ROAD_SEGMENTS) if (rectTest(x, z, s.position[0], s.position[1], s.size[0] / 2, s.size[1] / 2, 3.2)) return true;
  for (const s of SIDEWALKS) if (rectTest(x, z, s.position[0], s.position[1], s.size[0] / 2, s.size[1] / 2, 1.8)) return true;
  for (const l of PARKING_LOTS) if (rectTest(x, z, l.position[0], l.position[1], l.size[0] / 2, l.size[1] / 2, 2.5)) return true;
  for (const l of PARKING_LANES) if (rectTest(x, z, l.position[0], l.position[1], l.size[0] / 2, l.size[1] / 2, 2.5)) return true;
  // towers + plinths
  for (const t of TOWERS) if (rectTest(x, z, t.position[0], t.position[1], t.footprint[0] / 2 + 2, t.footprint[1] / 2 + 2, 2)) return true;
  // amenity plaza + clubhouse
  if (Math.hypot(x - AMENITY.center[0], z - AMENITY.center[1]) < AMENITY.plazaRadius + 3) return true;
  // water body
  if (Math.hypot(x - WATER_FEATURE.center[0], z - WATER_FEATURE.center[1]) < 21) return true;
  // pedestrian paths (curved beads + straight connectors)
  for (const b of CURVED_PATHS) {
    const dx = x - b.x;
    const dz = z - b.z;
    if (dx * dx + dz * dz < (b.r + 1.8) * (b.r + 1.8)) return true;
  }
  for (const p of TOWER_PATHS) if (rectTest(x, z, p.position[0], p.position[1], p.size[0] / 2 + 1.5, p.size[1] / 2 + 1.5)) return true;
  // central garden circular paths, flower strips, seating pads
  const dOrigin = Math.hypot(x, z);
  for (const band of [CIRC_PATH, OUTER_RING_PATH, ...FLOWER_STRIPS]) {
    if (dOrigin > band.innerR - 1.6 && dOrigin < band.outerR + 1.6) return true;
  }
  for (const p of SEATING_PADS) if (Math.hypot(x - p.x, z - p.z) < p.r + 2.4) return true;
  // jogging loop band
  if (
    inRoundedRect(x, z, JOG_LOOP.outerHalf[0] + 2, JOG_LOOP.outerHalf[1] + 2, JOG_LOOP.radius + 2) &&
    !inRoundedRect(x, z, JOG_LOOP.innerHalf[0] - 2, JOG_LOOP.innerHalf[1] - 2, Math.max(4, JOG_LOOP.radius - 3))
  ) {
    return true;
  }
  return false;
}

/** Uniform point in a rect. */
function inRect(rand: () => number, r: PadDef) {
  return {
    x: r.position[0] + (rand() - 0.5) * r.size[0],
    z: r.position[1] + (rand() - 0.5) * r.size[1],
  };
}

/** Uniform point in an annulus. */
function inAnnulus(rand: () => number, rMin: number, rMax: number) {
  const a = rand() * Math.PI * 2;
  const r = rMin + rand() * (rMax - rMin);
  return { x: Math.cos(a) * r, z: Math.sin(a) * r };
}

export type ZoneTag = "lawn" | "meadow" | "perimeter" | "entrance" | "water" | "roadside" | "tower";

/**
 * Small landscaped pockets + entrance lawns.
 * Phase 15B: organic (irregular blob) shapes instead of rectangles.
 * Rendered via blobShape radii — these exports drive the garden rendering.
 */
export interface OrganicGarden {
  x: number;
  z: number;
  /** Irregular shoreline radii (meters) — rendered via blobShape(). */
  radii: number[];
}

function organicRadii(seed: number, base: number): number[] {
  const rand = rng(seed);
  return Array.from({ length: 8 }, () => base * (0.72 + rand() * 0.5));
}

export const GARDEN_POCKETS: OrganicGarden[] = [
  { x: -30, z: -78, radii: organicRadii(101, 9) },
  { x: 52, z: -74, radii: organicRadii(102, 9) },
  { x: 120, z: -30, radii: organicRadii(103, 10) },
  { x: 58, z: 34, radii: organicRadii(104, 7.5) },
  { x: -118, z: 46, radii: organicRadii(105, 8.5) },
  { x: -48, z: 92, radii: organicRadii(106, 8) },
  { x: 72, z: 90, radii: organicRadii(107, 9) },
];

export const ENTRANCE_LAWNS: OrganicGarden[] = [
  { x: 0, z: 142, radii: organicRadii(201, 22) },
  { x: 0, z: 130, radii: organicRadii(202, 16) },
];

/** Rect sampling proxies for the organic gardens (deterministic placement). */
export const ORGANIC_GARDEN_PADS: PadDef[] = [
  ...GARDEN_POCKETS.map((g): PadDef => {
    const rMax = Math.max(...g.radii);
    return { position: [g.x, g.z], size: [rMax * 1.5, rMax * 1.5] };
  }),
  ...ENTRANCE_LAWNS.map((g): PadDef => {
    const rMax = Math.max(...g.radii);
    return { position: [g.x, g.z], size: [rMax * 1.5, rMax * 1.5] };
  }),
];

/** Garden lights — low posts along central paths and garden edges (instanced). */
export const GARDEN_LIGHTS: Array<{ x: number; z: number }> = (() => {
  const out: Array<{ x: number; z: number }> = [];
  // along the central circular path ring
  const r = (CIRC_PATH.innerR + CIRC_PATH.outerR) / 2;
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2 + 0.16;
    out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r });
  }
  // spaced along each curved garden path
  CURVED_PATHS.forEach((b) => out.push({ x: b.x, z: b.z }));
  return out;
})();

/** Small planting islands / planters on the central lawn and entrance lawns. */
export interface PlanterDef { x: number; z: number; r: number; kind: TreeKind; }
export const PLANTERS: PlanterDef[] = (() => {
  const out: PlanterDef[] = [];
  const kinds: TreeKind[] = ["A", "B"];
  let k = 0;
  // entrance lawn planters (rows)
  for (let i = 0; i < 6; i += 1) out.push({ x: -42 + i * 14, z: 140, r: 1.6, kind: kinds[k % 2] });
  // central lawn planters (ring)
  const pr = (CIRC_PATH.innerR + CIRC_PATH.outerR) / 2 - 4;
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    out.push({ x: Math.cos(a) * pr, z: Math.sin(a) * pr, r: 1.4, kind: kinds[(k + 1) % 2] });
  }
  return out;
})();

/** Small entrance markers / signposts at pathway convergence points. */
export const ENTRANCE_MARKERS: Array<{ x: number; z: number }> = [
  { x: 0, z: 143 },
  { x: 0, z: -128 },
  { x: -36, z: -34 },
  { x: 44, z: 98 },
];

/** Perimeter green belt — planted band inside the site boundary. */
export const PERIMETER_BELT = {
  outerHalf: [170, 140] as [number, number],
  innerHalf: [161, 131] as [number, number],
  radius: 36,
};

/** Grass verges flanking the two avenues (roadside landscaping). */
export const GRASS_VERGES: PadDef[] = [
  { position: [0, 64.2], size: [300, 2.6] },
  { position: [0, 51.8], size: [300, 2.6] },
  { position: [0, -33.8], size: [300, 2.6] },
  { position: [0, -46.2], size: [300, 2.6] },
];

/** Subtle landscaped berms (gentle mounds) — terrain dressing, no DEM claim. */
export const BERMS: Array<{ x: number; z: number; r: number; h: number }> = [
  { x: -60, z: -100, r: 26, h: 1.0 },
  { x: 40, z: -104, r: 30, h: 1.2 },
  { x: -60, z: 96, r: 24, h: 0.9 },
  { x: 10, z: 100, r: 22, h: 0.8 },
  { x: 128, z: 26, r: 20, h: 0.9 },
  { x: -130, z: 22, r: 16, h: 0.7 },
];

// __LANDSCAPE_15B2__


/** Landscaped islands inside the parking lots (curb ring + shade tree). */
export const PARKING_ISLANDS: Array<{ x: number; z: number; kind: TreeKind }> = [
  ...PARKING_LOTS.flatMap((lot) => [
    { x: lot.position[0] - lot.size[0] / 4, z: lot.position[1], kind: "D" as TreeKind },
    { x: lot.position[0] + lot.size[0] / 4, z: lot.position[1], kind: "B" as TreeKind },
  ]),
];

/** Spacing grid for the rejection pass. */
const CELL = 4;
const grid = new Map<string, Array<{ x: number; z: number; min: number }>>();
function spacingOk(x: number, z: number, min: number) {
  const gx = Math.floor(x / CELL);
  const gz = Math.floor(z / CELL);
  for (let i = -1; i <= 1; i += 1) {
    for (let j = -1; j <= 1; j += 1) {
      const cell = grid.get(`${gx + i}:${gz + j}`);
      if (!cell) continue;
      for (const p of cell) {
        const dx = x - p.x;
        const dz = z - p.z;
        const need = Math.max(min, p.min);
        if (dx * dx + dz * dz < need * need) return false;
      }
    }
  }
  return true;
}
function gridAdd(x: number, z: number, min: number) {
  const key = `${Math.floor(x / CELL)}:${Math.floor(z / CELL)}`;
  const cell = grid.get(key) ?? [];
  cell.push({ x, z, min });
  grid.set(key, cell);
}

function kindFor(zone: ZoneTag, rand: () => number): TreeKind {
  const r = rand();
  switch (zone) {
    case "perimeter":
      return r < 0.55 ? "C" : r < 0.8 ? "B" : "D";
    case "entrance":
      return r < 0.45 ? "E" : r < 0.75 ? "A" : "B";
    case "water":
      return r < 0.4 ? "E" : r < 0.7 ? "B" : "D";
    case "roadside":
      return r < 0.6 ? "B" : r < 0.85 ? "D" : "C";
    case "tower":
      // mixed around towers: mostly broad shade + some ornamental accent
      return r < 0.35 ? "D" : r < 0.65 ? "B" : r < 0.85 ? "A" : "C";
    default:
      // lawn / meadow mix
      return r < 0.38 ? "B" : r < 0.66 ? "D" : r < 0.84 ? "A" : "C";
  }
}

function makeTree(x: number, z: number, kind: TreeKind, rand: () => number): TreeInstance {
  return { x, z, rot: rand() * Math.PI * 2, scale: 0.82 + rand() * 0.5, kind, tint: Math.floor(rand() * 3) };
}

/**
 * Deterministic tree population (~230 trees): lawns, central meadow,
 * perimeter band, entrance, water edge — plus explicit plaza palms,
 * entrance palm rows and parking-island shade trees.
 */
function buildTrees(): TreeInstance[] {
  const rand = rng(20260901);
  const out: TreeInstance[] = [];

  const zones: Array<{ tag: ZoneTag; count: number; sample: () => { x: number; z: number } }> = [
    { tag: "lawn", count: 96, sample: () => inRect(rand, [...LAWNS, ...ORGANIC_GARDEN_PADS][Math.floor(rand() * (LAWNS.length + ORGANIC_GARDEN_PADS.length))]) },
    { tag: "meadow", count: 36, sample: () => inAnnulus(rand, 36, CENTRAL_MEADOW_RADIUS - 3) },
    {
      tag: "perimeter",
      count: 38,
      sample: () => {
        for (let tries = 0; tries < 12; tries += 1) {
          const x = (rand() - 0.5) * 336;
          const z = (rand() - 0.5) * 276;
          if (inRoundedRect(x, z, 168, 138, 36) && !inRoundedRect(x, z, 148, 119, 26)) return { x, z };
        }
        return { x: 0, z: 0 };
      },
    },
    { tag: "entrance", count: 10, sample: () => inRect(rand, ORGANIC_GARDEN_PADS[3 + Math.floor(rand() * 2)]) },
    {
      tag: "water",
      count: 8,
      sample: () => {
        const p = inAnnulus(rand, 22.5, 34);
        return { x: WATER_FEATURE.center[0] + p.x, z: WATER_FEATURE.center[1] + p.z };
      },
    },
    // roadside planting with irregular spacing along the internal roads
    {
      tag: "roadside",
      count: 24,
      sample: () => {
        const seg = ROAD_SEGMENTS[Math.floor(rand() * ROAD_SEGMENTS.length)];
        const vertical = seg.size[0] < seg.size[1];
        const along = (rand() - 0.5) * (vertical ? seg.size[1] : seg.size[0]) * 0.9;
        const offset = (6.4 + rand() * 3.4) * (rand() < 0.5 ? -1 : 1);
        return vertical
          ? { x: seg.position[0] + offset, z: seg.position[1] + along }
          : { x: seg.position[0] + along, z: seg.position[1] + offset };
      },
    },
    // guaranteed 3–8 trees around every residential tower
    ...TOWERS.map((t) => ({
      tag: "tower" as ZoneTag,
      count: 4,
      sample: () => {
        const rr = Math.max(t.footprint[0], t.footprint[1]) / 2 + 7 + rand() * 2.5;
        const a = t.rotation + rand() * Math.PI * 2;
        return { x: t.position[0] + Math.cos(a) * rr, z: t.position[1] + Math.sin(a) * rr };
      },
    })),
  ];

  for (const zone of zones) {
    let placed = 0;
    let attempts = 0;
    while (placed < zone.count && attempts < zone.count * 40) {
      attempts += 1;
      const p = zone.sample();
      if (isExcluded(p.x, p.z)) continue;
      const kind = kindFor(zone.tag, rand);
      const min = kind === "E" ? 5.5 : 3.8;
      if (!spacingOk(p.x, p.z, min)) continue;
      gridAdd(p.x, p.z, min);
      out.push(makeTree(p.x, p.z, kind, rand));
      placed += 1;
    }
  }

  // explicit palms around the amenity plaza ring
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + 0.22;
    out.push(makeTree(Math.cos(a) * 37.8, Math.sin(a) * 37.8, "E", rand));
  }
  // entrance palm rows + ornamentals (hand-placed, flanking the entry road)
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i += 1) out.push(makeTree(side * 13.5, 116 + i * 6.5, "E", rand));
    for (let i = 0; i < 2; i += 1) out.push(makeTree(side * 22.5, 119 + i * 12, "A", rand));
  }
  // parking landscaped islands (shade trees)
  for (const island of PARKING_ISLANDS) out.push(makeTree(island.x, island.z, island.kind, rand));

  return out;
}

export const TREES: TreeInstance[] = buildTrees();

export const TREES_BY_KIND: Record<TreeKind, TreeInstance[]> = TREES.reduce(
  (acc, t) => {
    acc[t.kind].push(t);
    return acc;
  },
  { A: [], B: [], C: [], D: [], E: [] } as Record<TreeKind, TreeInstance[]>
);

/* ------------------------------- Palm fronds ------------------------------ */

export interface FrondInstance {
  position: [number, number, number];
  /** Quaternion [x, y, z, w] orienting the frond cone outward. */
  quaternion: [number, number, number, number];
  scale: number;
}

/** Low-poly palm fronds — one instanced draw call for every palm canopy. */
export const PALM_FRONDS: FrondInstance[] = (() => {
  const rand = rng(777);
  const fronds: FrondInstance[] = [];
  TREES_BY_KIND.E.forEach((palm) => {
    const top = 6.4 * palm.scale;
    for (let j = 0; j < 6; j += 1) {
      const phi = palm.rot + (j / 6) * Math.PI * 2 + rand() * 0.25;
      const dir = { x: Math.cos(phi) * 0.95, y: -0.32, z: Math.sin(phi) * 0.95 };
      const len = Math.hypot(dir.x, dir.y, dir.z);
      dir.x /= len;
      dir.y /= len;
      dir.z /= len;
      // quaternion rotating +Y onto dir
      const dot = dir.y; // up · dir
      const cx = dir.z; // up × dir
      const cy = 0;
      const cz = -dir.x;
      const axisLen = Math.hypot(cx, cy, cz) || 1;
      const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
      const s = Math.sin(angle / 2) / axisLen;
      fronds.push({
        position: [palm.x + dir.x * 1.5 * palm.scale, top + dir.y * 1.5 * palm.scale, palm.z + dir.z * 1.5 * palm.scale],
        quaternion: [cx * s, cy * s, cz * s, Math.cos(angle / 2)],
        scale: palm.scale * (0.9 + rand() * 0.25),
      });
    }
  });
  return fronds;
})();

/* ------------------------ Shrubs, flowers, hedges ------------------------- */

export interface ScatterInstance {
  x: number;
  z: number;
  rot: number;
  scale: number;
}

/** Shrub mass planting — garden edges, pond rim, plaza ring, pockets. */
export const SHRUBS: ScatterInstance[] = (() => {
  const rand = rng(4242);
  const out: ScatterInstance[] = [];
  const add = (x: number, z: number) => {
    if (isExcluded(x, z)) return;
    out.push({ x, z, rot: rand() * Math.PI * 2, scale: 0.7 + rand() * 0.7 });
  };
  // around every tower plinth
  TOWERS.forEach((t) => {
    const rr = Math.max(t.footprint[0], t.footprint[1]) / 2 + 4.6;
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 + t.rotation;
      add(t.position[0] + Math.cos(a) * rr, t.position[1] + Math.sin(a) * rr);
    }
  });
  // pond rim, plaza outer ring, entrance, pockets, lawn edges
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * Math.PI * 2;
    add(WATER_FEATURE.center[0] + Math.cos(a) * 19.5, WATER_FEATURE.center[1] + Math.sin(a) * 19.5);
  }
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2 + 0.31;
    add(Math.cos(a) * 36.2, Math.sin(a) * 36.2);
  }
  [...GARDEN_POCKETS, ...ENTRANCE_LAWNS].forEach((p) => {
    const rr = Math.max(...p.radii);
    for (let i = 0; i < 3; i += 1) add(p.x + (rand() - 0.5) * (rr * 1.4), p.z + (rand() - 0.5) * (rr * 1.4));
  });
  return out;
})();

export const FLOWER_COLORS = ["#d46a6a", "#e3b23c", "#ece7da", "#c96f8e", "#d98a4a"];

/** Flower-bed planting dots along the central garden strips + pockets. */
export const FLOWERS: Array<{ x: number; z: number; colorIdx: number }> = (() => {
  const rand = rng(9091);
  const out: Array<{ x: number; z: number; colorIdx: number }> = [];
  FLOWER_STRIPS.forEach((strip) => {
    const mid = (strip.innerR + strip.outerR) / 2;
    const n = Math.round(((strip.outerR - strip.innerR) * 0.5 + mid * 0.16) * 2);
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2 + rand() * 0.1;
      const r = mid + (rand() - 0.5) * (strip.outerR - strip.innerR - 0.7);
      out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, colorIdx: Math.floor(rand() * FLOWER_COLORS.length) });
    }
  });
  [...GARDEN_POCKETS, ...ENTRANCE_LAWNS].forEach((p) => {
    const rr = Math.max(...p.radii);
    for (let i = 0; i < 7; i += 1) {
      out.push({
        x: p.x + (rand() - 0.5) * (rr * 1.4),
        z: p.z + (rand() - 0.5) * (rr * 1.4),
        colorIdx: Math.floor(rand() * FLOWER_COLORS.length),
      });
    }
  });
  return out;
})();

/** Clipped hedge rows flanking the main spine sidewalks (instanced blocks). */
export const HEDGES: PadDef[] = (() => {
  const out: PadDef[] = [];
  for (const side of [-1, 1]) {
    for (let z = 24; z <= 122; z += 7) {
      out.push({ position: [side * 9.4, z], size: [0.9, 6.2] });
    }
  }
  return out;
})();

/* --------------------------- Benches & road furniture ---------------------- */

export interface BenchInstance {
  x: number;
  z: number;
  rot: number;
}

/** Garden benches — seating pads, plaza ring, jog loop, pond side. */
export const BENCHES: BenchInstance[] = (() => {
  const out: BenchInstance[] = [];
  SEATING_PADS.forEach((p) => out.push({ x: p.x, z: p.z, rot: Math.atan2(-p.z, -p.x) }));
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + 0.55;
    out.push({ x: Math.cos(a) * 41.5, z: Math.sin(a) * 41.5, rot: -a + Math.PI / 2 + Math.PI });
  }
  [
    [-146, 60],
    [146, -60],
    [60, 118],
  ].forEach(([x, z]) => out.push({ x, z, rot: Math.atan2(-z, -x) + Math.PI }));
  [
    [-38, 88],
    [-10, 88],
  ].forEach(([x, z]) => out.push({ x, z, rot: 0 }));
  return out;
})();

export interface LightInstance {
  x: number;
  z: number;
}

/** Street lights along the spine + avenues (just outside the carriageway). */
export const STREET_LIGHTS: LightInstance[] = (() => {
  const out: LightInstance[] = [];
  for (const side of [-1, 1]) for (let z = 26; z <= 124; z += 24.5) out.push({ x: side * 6.1, z });
  for (const side of [-1, 1]) for (let x = -138; x <= 138; x += 34.5) if (Math.abs(x) > 11) out.push({ x, z: side * 6.1 });
  for (const side of [-1, 1]) for (let x = -138; x <= 138; x += 34.5) if (Math.abs(x) > 11) out.push({ x, z: side === -1 ? -46.1 : -33.9 });
  return out;
})();

/** Small traffic signs at parking-lane junctions and the entrance approach. */
export const TRAFFIC_SIGNS: Array<{ x: number; z: number }> = [
  { x: 124.5, z: 60.5 },
  { x: -120.5, z: 55.5 },
  { x: -126.5, z: -42.5 },
  { x: 4.5, z: 120 },
];

/** Zebra crossing bars — [centerX, centerZ], [sizeX, sizeZ]. */
export const CROSSING_BARS: PadDef[] = (() => {
  const out: PadDef[] = [];
  for (const cz of [50, -48, 124]) for (let i = 0; i < 7; i += 1) out.push({ position: [-3.6 + i * 1.2, cz], size: [0.55, 2.4] });
  for (const cx of [-20, 20]) for (let i = 0; i < 7; i += 1) out.push({ position: [cx, 55 + i * 1.2], size: [2.4, 0.55] });
  return out;
})();

/** Low-poly parked cars — deterministic bays, non-interactive. */
export interface CarInstance {
  x: number;
  z: number;
  rot: number;
  colorIdx: number;
}

export const CAR_COLORS = ["#b8bec6", "#3a4a5c", "#7a2e2e", "#2f3338", "#d9d9d4", "#4a6741"];

export const CARS: CarInstance[] = (() => {
  const rand = rng(5150);
  const out: CarInstance[] = [];
  PARKING_LOTS.forEach((lot) => {
    const totalW = lot.baysPerRow * 2.7;
    const startX = lot.position[0] - totalW / 2 + 1.35;
    for (const rowZ of [lot.position[1] - lot.size[1] / 2 + 2.6, lot.position[1] + lot.size[1] / 2 - 2.6]) {
      for (let i = 0; i < lot.baysPerRow; i += 1) {
        if ((i + Math.round(rowZ)) % 4 !== 0) continue;
        out.push({
          x: startX + i * 2.7 + 1.35,
          z: rowZ,
          rot: rowZ < lot.position[1] ? Math.PI : 0,
          colorIdx: Math.floor(rand() * CAR_COLORS.length),
        });
      }
    }
  });
  return out;
})();

/**
 * Mobile quality tier — reduces vegetation density and shadow resolution
 * on devices that report reduced motion or a low device-memory hint.
 * Determined at runtime (see Township3DViewer useMobileTier).
 */
export type QualityTier = "high" | "low";




