"use client";

import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Instance, Instances, Line, OrbitControls } from "@react-three/drei";
import {
  AMENITY,
  CAMERA_PRESET_DEFS,
  CENTRAL_MEADOW_RADIUS,
  ENTRANCE,
  FLOOR_HEIGHT,
  LAWNS,
  PARKING_LANES,
  PARKING_LOTS,
  PLACE,
  RING_ROAD,
  ROAD_SEGMENTS,
  SELECTED_TOWER_ID,
  SIDEWALKS,
  SITE_BOUNDARY,
  TOWERS,
  TOWNSHIP_SITE,
  WATER_FEATURE,
  type CameraPresetId,
  type TownshipLayerState,
  type TowerDef,
} from "./townshipConfig";
import {
  BENCHES,
  BERMS,
  CARS,
  CAR_COLORS,
  CIRC_PATH,
  CROSSING_BARS,
  CURVED_PATHS,
  ENTRANCE_LAWNS,
  ENTRANCE_MARKERS,
  FLOWER_COLORS,
  FLOWER_STRIPS,
  FLOWERS,
  GARDEN_LIGHTS,
  GARDEN_POCKETS,
  GRASS_VERGES,
  HEDGES,
  JOG_LOOP,
  MEADOW_EDGE,
  OUTER_RING_PATH,
  PALM_FRONDS,
  PARKING_ISLANDS,
  PERIMETER_BELT,
  PLANTERS,
  SEATING_PADS,
  SHRUBS,
  STREET_LIGHTS,
  TOWER_PATHS,
  TRAFFIC_SIGNS,
  TREES_BY_KIND,
  TREE_TINTS,
  type PlanterDef,
  type QualityTier,
  type TreeInstance,
  type TreeKind,
} from "./townshipLandscape";
import type { ExplicitFloor, GisFootprint, TownshipFloorMode } from "./townshipData";
import { cn } from "@/lib/utils";
import {
  Crosshair,
  Eye,
  Layers,
  Maximize,
  Moon,
  RotateCcw,
  RotateCw,
  Scissors,
  Sparkles,
  Sun,
} from "lucide-react";

/* ======================================================================
 * Phase 15A+15B — Realistic Township Digital Twin (ILLUSTRATIVE).
 * Everything rendered here is conceptual geometry: no survey, GIS or DEM
 * data exists for this site. Buildings/roads/landscape are labeled
 * "Illustrative" on screen and in townshipConfig.ts / townshipLandscape.ts.
 * ==================================================================== */

export interface Township3DViewerHandle {
  applyPreset: (preset: CameraPresetId) => void;
  zoomBy: (factor: number) => void;
  focusTower?: (tower: TowerDef) => void;
  getContainer: () => HTMLDivElement | null;
}

export interface Township3DViewerProps {
  layers: TownshipLayerState;
  selectedTowerId: string | null;
  onSelectTower: (id: string | null) => void;
  /** Phase 15C — floor-view mode for the selected tower (real DB floors only). */
  floorMode?: TownshipFloorMode;
  /** Phase 15C — selected real floor level (null ⇒ whole building). */
  selectedLevel?: number | null;
  /** Phase 15C — real database floor records for the selected tower. */
  linkedFloors?: ExplicitFloor[];
  /** Phase 15C — verified GIS footprint overlays (rendered on the gisData layer). */
  gisFootprints?: GisFootprint[];
  /** Phase 7 — Building isolation mode (dims non-selected towers). */
  buildingIsolation?: boolean;
  /** Phase 7 — Solar & shadow analysis enabled. */
  shadowAnalysis?: boolean;
  /** Phase 7 — Solar simulated time in minutes since midnight (e.g. 720 for 12:00 PM). */
  solarTimeMinutes?: number;
  /** Phase 7 — 3D interactive point-to-point measurement mode. */
  measurementMode?: boolean;
  measurePointA?: { x: number; y: number; z: number } | null;
  measurePointB?: { x: number; y: number; z: number } | null;
  onMeasureClick?: (point: { x: number; y: number; z: number }) => void;
  /** Phase 7 — Discrepancy & spatial conflict overlay enabled. */
  discrepancyOverlay?: boolean;
  conflicts?: Array<{
    id: string;
    conflictNumber: string;
    severity: string;
    description: string;
    affectedPropertyIds: string[];
  }>;
  className?: string;
}

/* --------------------------- Shared resources --------------------------- */

/** One unit box reused (scaled) by every rectangular element in the scene. */
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

function std(color: number, roughness = 0.85, metalness = 0.02, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}

/** Module-level shared materials — one instance per surface type. */
const M = {
  bodyWarm: std(0xe8e3d9, 0.9),
  bodyCool: std(0xd5dbde, 0.9),
  bodySand: std(0xd9cdb8, 0.9),
  bodyGrey: std(0xc4cbd1, 0.9),
  glass: std(0x33505e, 0.28, 0.5),
  glassDark: std(0x243947, 0.32, 0.5),
  slab: std(0xb3ac9e, 0.9),
  roof: std(0x857d6f, 0.95),
  lobby: std(0x2e4756, 0.3, 0.45),
  fin: std(0xe0dace, 0.88),
  ground: std(0x4c6b3c, 1),
  groundEdge: std(0x7c6e52, 1),
  context: std(0x3e5a34, 1),
  lawn: std(0x5d8a46, 1),
  lawnAlt: std(0x54803f, 1),
  meadow: std(0x6b9852, 1),
  road: std(0x3b4046, 0.95),
  sidewalk: std(0xa19c8f, 0.95),
  parking: std(0x4b5056, 0.95),
  bay: std(0xe8e8e4, 0.9),
  plaza: std(0xc9c2b4, 0.9),
  plazaRing: std(0xb2ab9c, 0.9),
  water: std(0x2f6e8c, 0.12, 0.6),
  pondEdge: std(0xc9bfa8, 0.95),
  amenityBody: std(0xe6dfd2, 0.88),
  amenityGlass: std(0x3a5d6e, 0.25, 0.5),
  amenityRoof: std(0x9a9284, 0.95),
  trunk: std(0x6b4e34, 0.95),
  canopy: std(0x4f7c39, 0.95),
  canopyAlt: std(0x5d8c43, 0.95),
  shrub: std(0x57823f, 0.95),
  post: std(0x8fa0ac, 0.6, 0.4),
  pad: std(0xb7b1a4, 0.95),
  pillar: std(0xd9d2c4, 0.85),
  /* ---- Phase 15B landscape materials ---- */
  pathA: std(0xcabfa4, 0.95),
  pathB: std(0xd3c9ae, 0.95),
  curb: std(0xb9b3a6, 0.9),
  marking: std(0xe6e8e0, 0.7),
  pole: std(0x5a636d, 0.55, 0.55),
  lampHead: std(0xf2ecd9, 0.4),
  benchWood: std(0x8a6844, 0.9),
  benchMetal: std(0x39424b, 0.6, 0.5),
  signRed: std(0xb03a2e, 0.6),
  signNavy: std(0x0a1b31, 0.7),
  soil: std(0x6f5136, 1),
  hedge: std(0x4a7038, 0.95),
    /** White bases — actual colours arrive per-instance (canopies/flowers/cars). */
  canopyWhite: std(0xffffff, 0.95),
  flowerWhite: std(0xffffff, 0.8),
  carBody: std(0xffffff, 0.45, 0.55),
  shimmer: new THREE.MeshBasicMaterial({ color: 0xdfeef5, transparent: true, opacity: 0.06, depthWrite: false }),
  /** Phase 15B: subtle animated water surface (blue-green, low reflectivity). */
  waterAnim: std(0x2f6e8c, 0.1, 0.55, { transparent: true, opacity: 0.82, envMapIntensity: 0.3 }),
  /** Phase 15B: garden light posts / planters / entrance markers. */
  gardenLight: std(0xd4c6a9, 0.6, 0.4),
  lightGlobe: std(0xf2e9d6, 0.3, 0.6),
  planter: std(0x3a3228, 0.92),
  planterSoil: std(0x6f5136, 1),
  signPost: std(0x5a636d, 0.6, 0.5),
  /* ---- Phase 15C: floor-mode + GIS footprint materials ---- */
  floorPlate: std(0x8fb8cc, 0.55, 0.1, { transparent: true, opacity: 0.42 }),
  floorPlateGhost: std(0x8fb8cc, 0.6, 0.05, { transparent: true, opacity: 0.13, depthWrite: false }),
  floorPlateSel: std(0x00d9ff, 0.3, 0.35, { transparent: true, opacity: 0.85, emissive: 0x00d9ff, emissiveIntensity: 0.6 }),
  bodyGhost: std(0x1e293b, 0.9, 0.02, { transparent: true, opacity: 0.14, depthWrite: false }),
  footprintFill: std(0x22c55e, 0.6, 0.05, { transparent: true, opacity: 0.3 }),
  /* ---- Realism Night Mode & Reference Render Materials ---- */
  emissiveCrown: new THREE.MeshBasicMaterial({ color: 0x00e5ff }),
  windowLitWarm: std(0xffd166, 0.25, 0.1, { emissive: 0xffaa00, emissiveIntensity: 1.1 }),
  windowLitCool: std(0xe0f2fe, 0.2, 0.2, { emissive: 0x7dd3fc, emissiveIntensity: 0.9 }),
  windowDark: std(0x0f172a, 0.15, 0.8),
  lobbyWarm: std(0xfbbf24, 0.2, 0.3, { emissive: 0xd97706, emissiveIntensity: 0.8, transparent: true, opacity: 0.92 }),
  neonBoundary: new THREE.MeshBasicMaterial({ color: 0x00f0ff }),
  waterNight: std(0x0284c7, 0.05, 0.8, { transparent: true, opacity: 0.92, emissive: 0x0369a1, emissiveIntensity: 0.32 }),
  pavilionGlow: std(0xffb703, 0.3, 0.1, { emissive: 0xf59e0b, emissiveIntensity: 0.8 }),
} as const;

/** Rounded-rectangle outline points (clockwise, for Line / Shape building). */
function roundedRectPoints(halfX: number, halfZ: number, radius: number, segments = 14): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const corners: Array<[number, number, number]> = [
    [halfX - radius, halfZ - radius, 0],
    [-(halfX - radius), halfZ - radius, Math.PI / 2],
    [-(halfX - radius), -(halfZ - radius), Math.PI],
    [halfX - radius, -(halfZ - radius), (3 * Math.PI) / 2],
  ];
  corners.forEach(([cx, cz, start]) => {
    for (let i = 0; i <= segments; i += 1) {
      const a = start + (i / segments) * (Math.PI / 2);
      pts.push(new THREE.Vector2(cx + Math.cos(a) * radius, cz + Math.sin(a) * radius));
    }
  });
  return pts;
}

/** Flat ring shape (outer rounded rect minus inner rounded rect) for the ring road. */
function ringShape(outer: [number, number], inner: [number, number], radius: number): THREE.Shape {
  const shape = new THREE.Shape(roundedRectPoints(outer[0], outer[1], radius + 2, 18));
  const hole = new THREE.Path(roundedRectPoints(inner[0], inner[1], Math.max(4, radius - 6), 18));
  shape.holes.push(hole);
  return shape;
}

/** Irregular organic shape (pond) from radii sampled around the circle. */
function blobShape(radii: number[]): THREE.Shape {
  const pts: THREE.Vector2[] = [];
  const n = radii.length * 6;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const seg = (i / n) * radii.length;
    const i0 = Math.floor(seg) % radii.length;
    const i1 = (i0 + 1) % radii.length;
    const t = seg - Math.floor(seg);
    const smooth = t * t * (3 - 2 * t);
    const r = radii[i0] * (1 - smooth) + radii[i1] * smooth;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  return new THREE.Shape(pts);
}

function lawnShape(w: number, d: number, r = 10): THREE.Shape {
  return new THREE.Shape(roundedRectPoints(w / 2, d / 2, Math.min(r, w / 2 - 0.5, d / 2 - 0.5), 10));
}

/* ------------------------------- Terrain ------------------------------- */

function Terrain() {
  return (
    <group>
      {/* surrounding context landscape */}
      <mesh receiveShadow material={M.context} position={[0, -0.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1600, 1600]} />
      </mesh>
      {/* landscaped site platform (subtle elevation) */}
      <mesh receiveShadow material={M.groundEdge} position={[0, -0.25, 0]}>
        <boxGeometry args={[362, 0.5, 302]} />
      </mesh>
      <mesh receiveShadow material={M.ground} position={[0, 0.001, 0]}>
        <boxGeometry args={[356, 0.5, 296]} />
      </mesh>
    </group>
  );
}

/* -------------------------------- Roads -------------------------------- */

function Roads() {
  const ringGeom = React.useMemo(() => new THREE.ShapeGeometry(ringShape(RING_ROAD.outerHalf, RING_ROAD.innerHalf, RING_ROAD.radius), 10), []);
  React.useEffect(() => () => ringGeom.dispose(), [ringGeom]);
  return (
    <group>
      {/* curved perimeter ring road */}
      <mesh geometry={ringGeom} material={M.road} receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} />
      {/* internal grid of access roads */}
      {ROAD_SEGMENTS.map((s, i) => (
        <mesh
          key={i}
          geometry={UNIT_BOX}
          material={M.road}
          receiveShadow
          position={[s.position[0], 0.04, s.position[1]]}
          scale={[s.size[0], 0.08, s.size[1]]}
        />
      ))}
      {/* pedestrian sidewalks along the main spine */}
      {SIDEWALKS.map((s, i) => (
        <mesh
          key={`sw-${i}`}
          geometry={UNIT_BOX}
          material={M.sidewalk}
          receiveShadow
          position={[s.position[0], 0.09, s.position[1]]}
          scale={[s.size[0], 0.1, s.size[1]]}
        />
      ))}
    </group>
  );
}

/* ------------------------------ Green base ------------------------------ */

function GreenZones() {
  const lawnGeoms = React.useMemo(() => LAWNS.map((l) => new THREE.ShapeGeometry(lawnShape(l.size[0], l.size[1], 14), 8)), []);
  React.useEffect(() => () => lawnGeoms.forEach((g) => g.dispose()), [lawnGeoms]);
  return (
    <group>
      {/* large central meadow around the amenity plaza */}
      <mesh receiveShadow material={M.meadow} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[CENTRAL_MEADOW_RADIUS, 48]} />
      </mesh>
      {LAWNS.map((l, i) => (
        <mesh
          key={i}
          geometry={lawnGeoms[i]}
          material={i % 2 === 0 ? M.lawn : M.lawnAlt}
          receiveShadow
          rotation={[-Math.PI / 2, 0, 0]}
          position={[l.position[0], 0.03, l.position[1]]}
        />
      ))}
      {/* a few circular shrub beds as landscape accents */}
      {[
        [-16, 30, 4.5],
        [18, 34, 3.5],
        [-40, -20, 4],
        [46, -22, 3.6],
        [24, 84, 4.2],
        [-70, 78, 3.4],
      ].map(([x, z, r], i) => (
        <mesh key={`bed-${i}`} receiveShadow material={i % 2 === 0 ? M.shrub : M.canopyAlt} position={[x, 0.06, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[r, 20]} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------- Parking ------------------------------- */

interface BayStripe {
  x: number;
  z: number;
}

function Parking() {
  const stripes = React.useMemo<BayStripe[]>(() => {
    const out: BayStripe[] = [];
    PARKING_LOTS.forEach((lot) => {
      const totalW = lot.baysPerRow * 2.7;
      const startX = lot.position[0] - totalW / 2 + 1.35;
      for (let i = 0; i <= lot.baysPerRow; i += 1) {
        const x = startX + i * 2.7;
        out.push({ x, z: lot.position[1] - lot.size[1] / 2 + 2.6 });
        out.push({ x, z: lot.position[1] + lot.size[1] / 2 - 2.6 });
      }
    });
    return out;
  }, []);

  return (
    <group>
      {PARKING_LOTS.map((lot) => (
        <mesh
          key={lot.id}
          geometry={UNIT_BOX}
          material={M.parking}
          receiveShadow
          position={[lot.position[0], 0.07, lot.position[1]]}
          scale={[lot.size[0], 0.1, lot.size[1]]}
        />
      ))}
      {PARKING_LANES.map((lane, i) => (
        <mesh
          key={`lane-${i}`}
          geometry={UNIT_BOX}
          material={M.road}
          receiveShadow
          position={[lane.position[0], 0.05, lane.position[1]]}
          scale={[lane.size[0], 0.08, lane.size[1]]}
        />
      ))}
      {/* instanced bay markings — one draw call for every stripe */}
      <Instances limit={stripes.length} range={stripes.length} geometry={UNIT_BOX} material={M.bay}>
        {stripes.map((s, i) => (
          <Instance key={i} position={[s.x, 0.13, s.z]} scale={[0.18, 0.02, 5]} />
        ))}
      </Instances>
    </group>
  );
}

/* -------------------------- Residential towers -------------------------- */

const BODY_MATS = [M.bodyWarm, M.bodyCool, M.bodySand, M.bodyGrey];

/** Shared balcony-slab list for a tower — one slab every 3 floors. */
function slabLevels(floors: number): number[] {
  const out: number[] = [];
  for (let f = 3; f < floors - 1; f += 3) out.push(f * FLOOR_HEIGHT);
  return out;
}

interface TowerProps {
  tower: TowerDef;
  selected: boolean;
  onSelect: (id: string | null) => void;
  /** Phase 15C — active floor mode (only meaningful when real floors exist). */
  floorMode?: TownshipFloorMode;
  /** Phase 15C — selected real floor level. */
  selectedLevel?: number | null;
  /** Phase 15C — real database floor records for THIS tower. */
  realFloors?: ExplicitFloor[];
  /** Phase 15C — whether the "Floors" layer is enabled. */
  floorsEnabled?: boolean;
  /** Phase 7 — Dim this tower when another tower is isolated. */
  isDimmed?: boolean;
}

const EMPTY_FLOORS: ExplicitFloor[] = [];

interface FloorPlate {
  floor: ExplicitFloor;
  y: number;
  ghost: boolean;
}

function Tower({
  tower,
  selected,
  onSelect,
  floorMode = "all",
  selectedLevel = null,
  realFloors = EMPTY_FLOORS,
  floorsEnabled = false,
  isDimmed = false,
}: TowerProps) {
  const [hovered, setHovered] = React.useState(false);
  const [w, d] = tower.footprint;
  const h = tower.floors * FLOOR_HEIGHT;
  const bodyMat = BODY_MATS[tower.id.charCodeAt(tower.id.length - 1) % BODY_MATS.length];
  const slabs = React.useMemo(() => slabLevels(tower.floors), [tower.floors]);

  /* Phase 15C — floor slicing is driven ONLY by real database floor records.
   * When no real floors are linked the tower keeps its default illustrative
   * volume and every floor-mode visual degrades to "all". */
  const floorsActive = selected && floorsEnabled && realFloors.length > 0 && floorMode !== "all";
  const sortedFloors = React.useMemo(() => [...realFloors].sort((a, b) => a.floorNumber - b.floorNumber), [realFloors]);

  // "hide" caps the illustrated body at the selected real floor level.
  const capY = selectedLevel !== null ? Math.min((selectedLevel + 1) * FLOOR_HEIGHT, h) : h;
  const cappedBodyH = floorsActive && floorMode === "hide" ? Math.max(0, capY - 4.8) : h - 4.8;
  const bodyFull = !isDimmed && (!floorsActive || floorMode === "show");
  const bodyGhosted = isDimmed || (floorsActive && (floorMode === "isolate" || floorMode === "explode"));
  const showRoof = !isDimmed && (bodyFull || (floorsActive && floorMode === "hide" && cappedBodyH > 0.5));
  const topY = bodyFull ? h : 4.8 + cappedBodyH;

  const plates = React.useMemo<FloorPlate[]>(() => {
    if (!floorsActive || isDimmed) return [];
    const out: FloorPlate[] = [];
    sortedFloors.forEach((f, i) => {
      if (floorMode === "isolate" && selectedLevel !== null && f.floorNumber !== selectedLevel) return;
      if (floorMode === "hide" && selectedLevel !== null && f.floorNumber > selectedLevel) return;
      let y: number;
      if (floorMode === "explode") y = 5.6 + i * (FLOOR_HEIGHT + 2.6);
      else y = Math.min(4.8 + f.floorNumber * FLOOR_HEIGHT, h - 0.9);
      out.push({ floor: f, y, ghost: floorMode === "hide" && f.floorNumber !== selectedLevel });
    });
    return out;
  }, [floorsActive, isDimmed, sortedFloors, floorMode, selectedLevel, h]);

  React.useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  return (
    <group position={[tower.position[0], 0, tower.position[1]]} rotation={[0, tower.rotation, 0]}>
      {/* landscaped plinth pad */}
      <mesh geometry={UNIT_BOX} material={M.pad} receiveShadow position={[0, 0.05, 0]} scale={[w + 5, 0.12, d + 5]} />
      {/* glass lobby base */}
      <mesh geometry={UNIT_BOX} material={M.lobby} castShadow={!isDimmed} position={[0, 2.4, 0]} scale={[w + 1.4, 4.8, d + 1.4]} />

      {/* Dimmed ghost body */}
      {isDimmed && (
        <mesh geometry={UNIT_BOX} material={M.bodyGhost} position={[0, 4.8 + (h - 4.8) / 2, 0]} scale={[w, h - 4.8, d]} />
      )}

      {/* type-specific volumes (hidden when floor modes replace the body or when dimmed) */}
      {bodyFull && tower.type === "A" && (
        <group>
          <mesh geometry={UNIT_BOX} material={bodyMat} castShadow receiveShadow position={[0, 4.8 + (h - 4.8) / 2, 0]} scale={[w, h - 4.8, d]}>
            <Edges color={selected ? "#00d9ff" : hovered ? "#38bdf8" : "#0284c7"} threshold={20} />
          </mesh>
          {/* vertical facade fins */}
          <mesh geometry={UNIT_BOX} material={M.fin} castShadow position={[w / 2 + 0.25, 4.8 + (h - 4.8) / 2, 0]} scale={[0.5, h - 4.8, d * 0.5]} />
          <mesh geometry={UNIT_BOX} material={M.fin} castShadow position={[-w / 2 - 0.25, 4.8 + (h - 4.8) / 2, 0]} scale={[0.5, h - 4.8, d * 0.5]} />
        </group>
      )}

      {bodyFull && tower.type === "B" && (
        <group>
          <mesh geometry={UNIT_BOX} material={bodyMat} castShadow receiveShadow position={[0, 4.8 + (h - 4.8) / 2, 0]} scale={[w, h - 4.8, d]}>
            <Edges color={selected ? "#00d9ff" : hovered ? "#38bdf8" : "#0284c7"} threshold={20} />
          </mesh>
          {/* recessed central glass slot */}
          <mesh geometry={UNIT_BOX} material={M.glass} castShadow position={[0, 4.8 + (h - 4.8) / 2, 0]} scale={[w * 0.4, h - 6.4, d + 0.3]} />
        </group>
      )}

      {bodyFull && tower.type === "C" && (
        <group>
          {/* twin offset volumes */}
          <mesh geometry={UNIT_BOX} material={bodyMat} castShadow receiveShadow position={[-w * 0.19, 4.8 + (h - 4.8) / 2, 0]} scale={[w * 0.62, h - 4.8, d]}>
            <Edges color={selected ? "#00d9ff" : hovered ? "#38bdf8" : "#0284c7"} threshold={20} />
          </mesh>
          <mesh geometry={UNIT_BOX} material={M.glassDark} castShadow receiveShadow position={[w * 0.26, 4.8 + (h * 0.78 - 4.8) / 2, 0]} scale={[w * 0.48, h * 0.78 - 4.8, d * 0.92]} />
          {/* sky-bridge */}
          <mesh geometry={UNIT_BOX} material={M.slab} castShadow position={[0, h * 0.58, 0]} scale={[w * 0.5, 0.9, d * 0.7]} />
        </group>
      )}

      {bodyFull && tower.type === "D" && (
        <group>
          <mesh geometry={UNIT_BOX} material={bodyMat} castShadow receiveShadow position={[0, 4.8 + (h - 8.8) / 2, 0]} scale={[w, h - 8.8, d]}>
            <Edges color={selected ? "#00d9ff" : hovered ? "#38bdf8" : "#0284c7"} threshold={20} />
          </mesh>
          {/* setback crown */}
          <mesh geometry={UNIT_BOX} material={M.glass} castShadow position={[0, h - 2.2, 0]} scale={[w * 0.6, 4.4, d * 0.6]} />
        </group>
      )}

      {/* Realistic Illuminated Window Matrix on Tower Facades (Night Mode Realism) */}
      {bodyFull &&
        Array.from({ length: Math.min(tower.floors - 2, 18) }).map((_, fIdx) => {
          const winY = 6.2 + fIdx * FLOOR_HEIGHT;
          const isAmber = (fIdx + tower.floors) % 3 === 0;
          const isLit = (fIdx * 7 + tower.id.charCodeAt(tower.id.length - 1)) % 5 !== 0;
          if (!isLit) return null;
          const winMat = isAmber ? M.windowLitWarm : M.windowLitCool;
          return (
            <group key={`win-row-${fIdx}`}>
              <mesh geometry={UNIT_BOX} material={winMat} position={[0, winY, d / 2 + 0.08]} scale={[w * 0.76, 1.45, 0.12]} />
              <mesh geometry={UNIT_BOX} material={winMat} position={[0, winY, -d / 2 - 0.08]} scale={[w * 0.76, 1.45, 0.12]} />
            </group>
          );
        })}

      {/* Balcony / floor-division slabs */}
      {bodyFull &&
        slabs.map((y, i) => (
          <mesh key={`slab-${i}`} geometry={UNIT_BOX} material={M.slab} castShadow receiveShadow position={[0, y, 0]} scale={[w + 0.7, 0.32, d + 0.7]} />
        ))}

      {/* Phase 15C — capped simple body for "hide" mode */}
      {!isDimmed && floorsActive && floorMode === "hide" && cappedBodyH > 0.5 && (
        <mesh geometry={UNIT_BOX} material={bodyMat} castShadow receiveShadow position={[0, 4.8 + cappedBodyH / 2, 0]} scale={[w, cappedBodyH, d]}>
          <Edges color={selected ? "#00d9ff" : "#0284c7"} threshold={20} />
        </mesh>
      )}

      {/* Phase 15C — ghosted body for "isolate" / "explode" modes */}
      {!isDimmed && bodyGhosted && (
        <mesh geometry={UNIT_BOX} material={M.bodyGhost} position={[0, 4.8 + (h - 4.8) / 2, 0]} scale={[w, h - 4.8, d]} />
      )}

      {/* Phase 15C — real-floor plates (only when real DB floors are linked) */}
      {!isDimmed &&
        plates.map(({ floor, y, ghost }) => (
          <mesh
            key={`plate-${floor.id}`}
            geometry={UNIT_BOX}
            material={floor.floorNumber === selectedLevel && floorMode !== "hide" ? M.floorPlateSel : ghost ? M.floorPlateGhost : M.floorPlate}
            castShadow={floor.floorNumber === selectedLevel && floorMode !== "hide"}
            position={[0, y, 0]}
            scale={[w + 0.9, 0.55, d + 0.9]}
          />
        ))}

      {/* Rooftop Parapet + Illuminated LED Cyan Crown (Matching Reference Render) */}
      {showRoof && (
        <group>
          <mesh geometry={UNIT_BOX} material={M.roof} castShadow position={[0, topY + 0.5, 0]} scale={[w + 0.4, 1.1, d + 0.4]} />
          {/* Glowing Cyan LED Crown */}
          <mesh geometry={UNIT_BOX} material={M.emissiveCrown} position={[0, topY + 1.2, 0]} scale={[w * 0.75, 1.4, d * 0.75]}>
            <Edges color="#00f0ff" threshold={15} />
          </mesh>
        </group>
      )}
      {bodyFull && <mesh geometry={UNIT_BOX} material={M.bodyGrey} castShadow position={[w * 0.18, h + 2.2, 0]} scale={[w * 0.34, 2.8, d * 0.4]} />}

      {/* Hover Tooltip over Tower Apex */}
      {hovered && !selected && (
        <Html position={[0, h + 8, 0]} center distanceFactor={220} zIndexRange={[40, 0]} style={{ pointerEvents: "none" }}>
          <div className="flex items-center gap-1.5 rounded-lg border border-cyan-400 bg-slate-950/95 px-2.5 py-1 text-[9.5px] font-black text-cyan-300 shadow-[0_0_20px_rgba(0,217,255,0.4)] backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>{tower.name} · {tower.floors} Floors · {(tower.floors * 3.1).toFixed(1)} m</span>
          </div>
        </Html>
      )}

      {/* Invisible interaction volume covering the whole tower (click + hover) */}
      <mesh
        geometry={UNIT_BOX}
        material={INTERACTION_MAT}
        position={[0, (h + 3) / 2, 0]}
        scale={[w + 2, h + 3, d + 2]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(tower.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      />
    </group>
  );
}

/** Invisible (non-drawing) material used for tower click/hover volumes. */
const INTERACTION_MAT = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });

/* --------------------------- Central amenity ---------------------------- */

function Amenity() {
  const [px, pz] = AMENITY.center;
  return (
    <group position={[px, 0, pz]}>
      {/* Circular plaza paved ground with landscaping */}
      <mesh receiveShadow material={M.plaza} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[AMENITY.plazaRadius, 56]} />
      </mesh>
      <mesh receiveShadow material={M.plazaRing} position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[AMENITY.plazaRadius - 4, AMENITY.plazaRadius - 2.5, 56]} />
      </mesh>

      {/* Radial walkways connecting to towers and gardens */}
      {[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4].map((a, i) => (
        <mesh
          key={`walk-${i}`}
          geometry={UNIT_BOX}
          material={M.plazaRing}
          receiveShadow
          position={[Math.cos(a) * (AMENITY.plazaRadius + 12), 0.09, Math.sin(a) * (AMENITY.plazaRadius + 12)]}
          scale={[28, 0.08, 3.2]}
          rotation={[0, -a, 0]}
        />
      ))}

      {/* Circular Glass Atrium Pavilion (Donut Profile matching reference image) */}
      <mesh receiveShadow position={[0, 3.2, 0]} material={M.pavilionGlow}>
        <cylinderGeometry args={[20, 20, 6.4, 48, 1, true]} />
      </mesh>
      {/* Inner atrium glass wall */}
      <mesh receiveShadow position={[0, 3.2, 0]} material={M.pavilionGlow}>
        <cylinderGeometry args={[9, 9, 6.4, 32, 1, true]} />
      </mesh>
      {/* Ring Roof Canopy */}
      <mesh receiveShadow castShadow position={[0, 6.5, 0]} material={M.amenityRoof}>
        <ringGeometry args={[8.5, 21.5, 48]} />
      </mesh>
      {/* Illuminated Roof Ring Edge */}
      <mesh position={[0, 6.6, 0]} material={M.emissiveCrown}>
        <ringGeometry args={[21.2, 21.8, 48]} />
      </mesh>
      {/* Inner Courtyard Tree / Garden */}
      <mesh receiveShadow material={M.lawn} position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[8.8, 32]} />
      </mesh>
      <mesh geometry={UNIT_BOX} material={M.canopy} position={[0, 2.5, 0]} scale={[3.5, 5, 3.5]} />
    </group>
  );
}

/* ---------------------------- Water feature ----------------------------- */

function WaterFeature() {
  const geom = React.useMemo(() => new THREE.ShapeGeometry(blobShape(WATER_FEATURE.radii), 36), []);
  const edgeGeom = React.useMemo(() => new THREE.ShapeGeometry(blobShape(WATER_FEATURE.radii.map((r) => r + 2.8)), 36), []);
  const [cx, cz] = WATER_FEATURE.center;

  React.useEffect(
    () => () => {
      geom.dispose();
      edgeGeom.dispose();
    },
    [geom, edgeGeom]
  );

  return (
    <group position={[cx, 0, cz]}>
      {/* Landscaped shoreline stone curb */}
      <mesh geometry={edgeGeom} material={M.pondEdge} receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} />
      {/* Organic central lake — deep cyan reflective night shader */}
      <mesh geometry={geom} material={M.waterNight} receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.14, 0]}>
        <Edges color="#00f0ff" threshold={25} />
      </mesh>
      {/* Lake perimeter bollard lights */}
      {WATER_FEATURE.radii.map((r, i) => {
        const angle = (i / WATER_FEATURE.radii.length) * Math.PI * 2;
        const lx = Math.cos(angle) * (r + 3.2);
        const lz = Math.sin(angle) * (r + 3.2);
        return (
          <group key={`lake-light-${i}`} position={[lx, 0.6, lz]}>
            <mesh geometry={UNIT_BOX} material={M.post} scale={[0.3, 1.2, 0.3]} />
            <mesh geometry={UNIT_BOX} material={M.lightGlobe} position={[0, 0.65, 0]} scale={[0.4, 0.4, 0.4]} />
          </group>
        );
      })}
    </group>
  );
}

/* ---------------------------- Community Center & Sports Complex ----------------------------- */

function CommunityCenter() {
  return (
    <group position={[84, 0, 54]}>
      {/* Main modern 2-story glass community center */}
      <mesh geometry={UNIT_BOX} material={M.amenityBody} castShadow receiveShadow position={[0, 4.5, 0]} scale={[38, 9, 28]} />
      <mesh geometry={UNIT_BOX} material={M.pavilionGlow} position={[0, 4.5, 14.1]} scale={[34, 7, 0.4]} />
      <mesh geometry={UNIT_BOX} material={M.amenityRoof} castShadow position={[0, 9.4, 0]} scale={[40, 0.8, 30]} />
      <mesh geometry={UNIT_BOX} material={M.emissiveCrown} position={[0, 9.9, 0]} scale={[39, 0.2, 29]}>
        <Edges color="#00f0ff" threshold={15} />
      </mesh>

      {/* Surface parking lot with cars and bays */}
      <group position={[-28, 0, 18]}>
        <mesh geometry={UNIT_BOX} material={M.parking} receiveShadow position={[0, 0.06, 0]} scale={[32, 0.1, 24]} />
        {/* Parked vehicle instances */}
        {[-8, -3, 2, 7].map((xOffset, i) => (
          <group key={`comm-car-${i}`} position={[xOffset * 1.5, 0.8, -4]}>
            <mesh geometry={UNIT_BOX} material={M.carBody} castShadow scale={[2.2, 1.3, 4.4]} />
            <mesh geometry={UNIT_BOX} material={M.lightGlobe} position={[0, 0.5, 2.2]} scale={[1.8, 0.3, 0.2]} />
          </group>
        ))}
      </group>
    </group>
  );
}

function SportsArena() {
  return (
    <group position={[-132, 0, -96]}>
      {/* Sports complex clubhouse */}
      <mesh geometry={UNIT_BOX} material={M.amenityBody} castShadow receiveShadow position={[0, 3.5, 0]} scale={[28, 7, 18]} />
      <mesh geometry={UNIT_BOX} material={M.amenityRoof} castShadow position={[0, 7.3, 0]} scale={[30, 0.6, 20]} />
      {/* Outdoor sports courts */}
      <mesh geometry={UNIT_BOX} material={M.context} receiveShadow position={[0, 0.08, 18]} scale={[26, 0.1, 14]}>
        <Edges color="#22c55e" threshold={15} />
      </mesh>
    </group>
  );
}

/* ---------------------------- Site boundary & Grand Entrance ----------------------------- */

function SiteBoundary() {
  const { half, radius, y } = SITE_BOUNDARY;
  const points = React.useMemo(() => {
    const v2 = roundedRectPoints(half[0], half[1], radius, 18);
    return v2.map((p) => [p.x, y + 0.3, p.y] as [number, number, number]);
  }, [half, radius, y]);
  const posts = React.useMemo(() => points.filter((_, i) => i % 4 === 0), [points]);

  return (
    <group>
      {/* Glowing Neon Cyan Ribbon (Matching Reference Render Perimeter Track) */}
      <Line points={points} color="#00f0ff" lineWidth={3.5} transparent opacity={0.98} />
      <Line points={points.map(([x, py, z]) => [x, py + 0.6, z])} color="#38bdf8" lineWidth={2.0} transparent opacity={0.75} />

      {/* Boundary marker posts with glowing cyan caps */}
      {posts.map((p, i) => (
        <group key={i} position={[p[0], 1.4, p[2]]}>
          <mesh geometry={UNIT_BOX} material={M.post} castShadow scale={[0.5, 2.8, 0.5]} />
          <mesh geometry={UNIT_BOX} material={M.emissiveCrown} position={[0, 1.5, 0]} scale={[0.6, 0.3, 0.6]} />
        </group>
      ))}

      {/* Grand Entrance Gateway Boulevard (Bottom-Left Location matching reference) */}
      <group position={[ENTRANCE.gate.x, 0, ENTRANCE.gate.z]}>
        {/* Cantilevered Gate Canopy Arch */}
        <mesh geometry={UNIT_BOX} material={M.pillar} castShadow position={[-12, 3.8, 0]} scale={[2.2, 7.6, 3.2]} />
        <mesh geometry={UNIT_BOX} material={M.pillar} castShadow position={[12, 3.8, 0]} scale={[2.2, 7.6, 3.2]} />
        <mesh geometry={UNIT_BOX} material={M.roof} castShadow position={[0, 7.8, 0]} scale={[28, 1.4, 5.5]} />
        <mesh geometry={UNIT_BOX} material={M.emissiveCrown} position={[0, 8.6, 0]} scale={[27.6, 0.3, 5.2]}>
          <Edges color="#00f0ff" threshold={15} />
        </mesh>
        {/* Illuminated Gate Signboard */}
        <mesh geometry={UNIT_BOX} material={M.signNavy} position={[0, 7.2, 2.8]} scale={[22, 1.6, 0.3]} />
        <mesh geometry={UNIT_BOX} material={M.windowLitCool} position={[0, 7.2, 2.96]} scale={[18, 0.8, 0.05]} />

        {/* Security Cabin */}
        <mesh geometry={UNIT_BOX} material={M.amenityBody} castShadow position={[16, 1.8, 0]} scale={[4, 3.6, 4]} />
        <mesh geometry={UNIT_BOX} material={M.lobbyWarm} position={[16, 1.8, 2.1]} scale={[3.4, 2.4, 0.2]} />
      </group>
    </group>
  );
}

/* ------------------------- Phase 15B vegetation ---------------------------
 * Five low-poly tree kinds, all InstancedMesh-based: shared geometry and
 * materials, per-instance colour tints, deterministic placement generated in
 * townshipLandscape.ts. Palms render a trunk plus six quaternion-oriented
 * frond cones (single draw call for every frond in the township).
 * ------------------------------------------------------------------------ */

interface KindCfg {
  trunk: [number, number, number];
  /** Canopy centre height (unscaled). */
  canopyY: number;
  canopy: "ico" | "cone";
  canopyR: number;
  /** Cone height (kind C only). */
  canopyH?: number;
  /** Canopy vertical squash. */
  flat: number;
}

const TREE_KINDS: Record<Exclude<TreeKind, "E">, KindCfg> = {
  A: { trunk: [0.16, 0.24, 1.8], canopyY: 2.7, canopy: "ico", canopyR: 1.6, flat: 0.85 },
  B: { trunk: [0.24, 0.34, 2.7], canopyY: 4.2, canopy: "ico", canopyR: 2.7, flat: 0.8 },
  C: { trunk: [0.2, 0.3, 3.2], canopyY: 6.9, canopy: "cone", canopyR: 1.5, canopyH: 7.4, flat: 1 },
  D: { trunk: [0.3, 0.42, 2.4], canopyY: 4.2, canopy: "ico", canopyR: 3.2, flat: 0.75 },
};

const KIND_ORDER: Array<Exclude<TreeKind, "E">> = ["A", "B", "C", "D"];

function Vegetation({ tier = "high" }: { tier?: QualityTier }) {
  // On low-tier devices keep roughly half the trees — the InstancedMesh still
  // renders a single draw call per kind, so this mostly halves GPU vertex load.
  const denseTrees = (list: TreeInstance[]) =>
    tier === "low" ? list.filter((_, i) => i % 2 === 0) : list;
  return (
    <group>
      {/* tree kinds A–D: trunk + tinted canopy per kind (2 draw calls each) */}
      {KIND_ORDER.map((kind) => {
        const trees = denseTrees(TREES_BY_KIND[kind]);
        if (!trees.length) return null;
        const cfg = TREE_KINDS[kind];
        return (
          <group key={kind}>
            <Instances limit={trees.length} range={trees.length} material={M.trunk} castShadow>
              <cylinderGeometry args={[cfg.trunk[0], cfg.trunk[1], cfg.trunk[2], 5]} />
              {trees.map((t, i) => (
                <Instance key={i} position={[t.x, (cfg.trunk[2] / 2) * t.scale, t.z]} rotation={[0, t.rot, 0]} scale={[t.scale, t.scale, t.scale]} />
              ))}
            </Instances>
            <Instances limit={trees.length} range={trees.length} material={M.canopyWhite} castShadow>
              {cfg.canopy === "ico" ? <icosahedronGeometry args={[cfg.canopyR, 1]} /> : <coneGeometry args={[cfg.canopyR, cfg.canopyH ?? 6, 7]} />}
              {trees.map((t, i) => (
                <Instance
                  key={i}
                  position={[t.x, cfg.canopyY * t.scale, t.z]}
                  rotation={[0, t.rot, 0]}
                  scale={[t.scale, t.scale * cfg.flat, t.scale]}
                  color={TREE_TINTS[kind][t.tint]}
                />
              ))}
            </Instances>
          </group>
        );
      })}

      {/* palms (type E): tapered trunk + frond star */}
      {TREES_BY_KIND.E.length > 0 && (
        <group>
          <Instances limit={TREES_BY_KIND.E.length} range={TREES_BY_KIND.E.length} material={M.trunk} castShadow>
            <cylinderGeometry args={[0.16, 0.28, 6.4, 6]} />
            {TREES_BY_KIND.E.map((t, i) => (
              <Instance key={i} position={[t.x, 3.2 * t.scale, t.z]} rotation={[0, t.rot, 0]} scale={[t.scale, t.scale, t.scale]} />
            ))}
          </Instances>
          <Instances limit={PALM_FRONDS.length} range={PALM_FRONDS.length} material={M.canopyWhite} castShadow>
            <coneGeometry args={[0.5, 3.4, 5]} />
            {PALM_FRONDS.map((f, i) => {
              const palmIdx = Math.floor(i / 6);
              const tint = TREES_BY_KIND.E[palmIdx]?.tint ?? 0;
              return (
                <Instance
                  key={i}
                  position={f.position}
                  quaternion={f.quaternion}
                  scale={[f.scale, f.scale, f.scale * 0.4]}
                  color={TREE_TINTS.E[tint]}
                />
              );
            })}
          </Instances>
        </group>
      )}
    </group>
  );
}

/* --------------------- Phase 15B gardens & planting ---------------------- */

/** Flat ground disc reused by every ground-level circle (instanced). */
const UNIT_DISC = new THREE.CircleGeometry(1, 20);

/** Shrub masses, flower beds and clipped hedges (Gardens layer). */
function GardenPlanting() {
  return (
    <group>
      <Instances limit={SHRUBS.length} range={SHRUBS.length} material={M.shrub} castShadow>
        <icosahedronGeometry args={[1.15, 0]} />
        {SHRUBS.map((s, i) => (
          <Instance key={i} position={[s.x, 0.85 * s.scale, s.z]} rotation={[0, s.rot, 0]} scale={[s.scale, s.scale * 0.8, s.scale]} />
        ))}
      </Instances>
      <Instances limit={FLOWERS.length} range={FLOWERS.length} material={M.flowerWhite} castShadow>
        <icosahedronGeometry args={[0.32, 0]} />
        {FLOWERS.map((f, i) => (
          <Instance key={i} position={[f.x, 0.3, f.z]} color={FLOWER_COLORS[f.colorIdx]} />
        ))}
      </Instances>
      <Instances limit={HEDGES.length} range={HEDGES.length} geometry={UNIT_BOX} material={M.hedge} castShadow>
        {HEDGES.map((h, i) => (
          <Instance key={i} position={[h.position[0], 0.42, h.position[1]]} scale={[h.size[0], 0.8, h.size[1]]} />
        ))}
      </Instances>
    </group>
  );
}

/** Small organic garden pockets + landscaped entrance lawns (Gardens layer).
 *  Phase 15B: irregular blob shapes instead of rectangles. */
function GardenZones() {
  const geoms = React.useMemo(
    () =>
      [...GARDEN_POCKETS, ...ENTRANCE_LAWNS].map((p) =>
        new THREE.ShapeGeometry(blobShape(p.radii), 12)
      ),
    []
  );
  React.useEffect(() => () => geoms.forEach((g) => g.dispose()), [geoms]);
  return (
    <group>
      {[...GARDEN_POCKETS, ...ENTRANCE_LAWNS].map((p, i) => (
        <mesh
          key={i}
          geometry={geoms[i]}
          material={M.lawnAlt}
          receiveShadow
          rotation={[-Math.PI / 2, 0, 0]}
          position={[p.x, 0.035, p.z]}
        />
      ))}
    </group>
  );
}

/** Landscaped grass patch ringing every tower plinth (Gardens layer). */
function BuildingGardens() {
  return (
    <Instances limit={TOWERS.length} range={TOWERS.length} geometry={UNIT_DISC} material={M.lawnAlt} receiveShadow>
      {TOWERS.map((t, i) => (
        <Instance
          key={i}
          position={[t.position[0], 0.04, t.position[1]]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={Math.max(t.footprint[0], t.footprint[1]) / 2 + 5.2}
        />
      ))}
    </Instances>
  );
}

/** Central community garden dressing (Gardens layer). */
function CentralGarden() {
  return (
    <group>
      {/* landscaped meadow edge */}
      <mesh receiveShadow material={M.lawnAlt} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
        <ringGeometry args={[MEADOW_EDGE.innerR, MEADOW_EDGE.outerR, 72]} />
      </mesh>
      {/* flower-bed soil strips */}
      {FLOWER_STRIPS.map((strip, i) => (
        <mesh key={i} receiveShadow material={M.soil} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <ringGeometry args={[strip.innerR, strip.outerR, 64]} />
        </mesh>
      ))}
      {/* paved seating pads on the circular path */}
      {SEATING_PADS.map((p, i) => (
        <mesh key={`pad-${i}`} receiveShadow material={M.plaza} geometry={UNIT_DISC} rotation={[-Math.PI / 2, 0, 0]} position={[p.x, 0.08, p.z]} scale={p.r} />
      ))}
    </group>
  );
}

/* --------------------- Phase 15B pedestrian network ----------------------- */

/** Curved + straight walking paths and the perimeter jog loop (Roads layer). */
function PedestrianNetwork() {
  const jogGeom = React.useMemo(
    () =>
      new THREE.ShapeGeometry(
        (() => {
          const shape = new THREE.Shape(roundedRectPoints(JOG_LOOP.outerHalf[0], JOG_LOOP.outerHalf[1], JOG_LOOP.radius + 2, 18));
          shape.holes.push(new THREE.Path(roundedRectPoints(JOG_LOOP.innerHalf[0], JOG_LOOP.innerHalf[1], Math.max(4, JOG_LOOP.radius - 2), 18)));
          return shape;
        })(),
        10
      ),
    []
  );
  React.useEffect(() => () => jogGeom.dispose(), [jogGeom]);
  return (
    <group>
      {/* central circular walking path + outer garden loop */}
      <mesh receiveShadow material={M.pathA} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <ringGeometry args={[CIRC_PATH.innerR, CIRC_PATH.outerR, 64]} />
      </mesh>
      <mesh receiveShadow material={M.pathA} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <ringGeometry args={[OUTER_RING_PATH.innerR, OUTER_RING_PATH.outerR, 72]} />
      </mesh>
      {/* curved garden paths (bead chains) */}
      <Instances limit={CURVED_PATHS.length} range={CURVED_PATHS.length} geometry={UNIT_DISC} material={M.pathB}>
        {CURVED_PATHS.map((b, i) => (
          <Instance key={i} position={[b.x, 0.075, b.z]} rotation={[-Math.PI / 2, 0, 0]} scale={b.r} />
        ))}
      </Instances>
      {/* straight tower-to-avenue connectors */}
      <Instances limit={TOWER_PATHS.length} range={TOWER_PATHS.length} geometry={UNIT_BOX} material={M.pathB}>
        {TOWER_PATHS.map((p, i) => (
          <Instance key={i} position={[p.position[0], 0.06, p.position[1]]} scale={[p.size[0], 0.06, p.size[1]]} />
        ))}
      </Instances>
      {/* perimeter jogging loop inside the ring road */}
      <mesh geometry={jogGeom} material={M.pathB} receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.065, 0]} />
    </group>
  );
}

/* ----------------------- Phase 15B road furniture -------------------------
 * Curbs, lane markings, pedestrian crossings, street lights and small
 * traffic signs — lightweight and fully instanced (Roads layer).
 * ------------------------------------------------------------------------ */

/** Lane dashes along the straight road segments (intersections skipped). */
const LANE_DASHES: Array<{ x: number; z: number; rot: number }> = (() => {
  const out: Array<{ x: number; z: number; rot: number }> = [];
  for (const s of ROAD_SEGMENTS) {
    const vertical = s.size[0] < s.size[1];
    if (vertical) {
      const half = s.size[1] / 2;
      for (let z = s.position[1] - half + 6; z <= s.position[1] + half - 6; z += 5.6) {
        if (Math.abs(z - 58) < 7.5 || Math.abs(z + 40) < 7.5) continue;
        out.push({ x: s.position[0], z, rot: 0 });
      }
    } else {
      const half = s.size[0] / 2;
      for (let x = s.position[0] - half + 6; x <= s.position[0] + half - 6; x += 5.6) {
        if (Math.abs(x) < 7.5) continue;
        out.push({ x, z: s.position[1], rot: Math.PI / 2 });
      }
    }
  }
  return out;
})();

/** Lane dashes following the curved ring-road centreline. */
const RING_DASHES: Array<{ x: number; z: number; rot: number }> = (() => {
  const pts = roundedRectPoints(161, 132, 28, 10);
  const out: Array<{ x: number; z: number; rot: number }> = [];
  const spacing = 7;
  let pending = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const seg = a.distanceTo(b);
    if (seg < 1e-6) continue;
    const dx = (b.x - a.x) / seg;
    const dz = (b.y - a.y) / seg;
    let d = pending;
    while (d <= seg) {
      out.push({ x: a.x + dx * d, z: a.y + dz * d, rot: Math.atan2(dx, dz) });
      d += spacing;
    }
    pending = d - seg;
  }
  return out;
})();

/** Curb strips hugging every straight road segment. */
const CURB_STRIPS: Array<{ pos: [number, number]; size: [number, number] }> = (() => {
  const out: Array<{ pos: [number, number]; size: [number, number] }> = [];
  for (const s of ROAD_SEGMENTS) {
    const vertical = s.size[0] < s.size[1];
    if (vertical) {
      const x = s.size[0] / 2 + 0.18;
      out.push({ pos: [s.position[0] - x, s.position[1]], size: [0.36, s.size[1]] });
      out.push({ pos: [s.position[0] + x, s.position[1]], size: [0.36, s.size[1]] });
    } else {
      const z = s.size[1] / 2 + 0.18;
      out.push({ pos: [s.position[0], s.position[1] - z], size: [s.size[0], 0.36] });
      out.push({ pos: [s.position[0], s.position[1] + z], size: [s.size[0], 0.36] });
    }
  }
  return out;
})();

/** Thin uniform band between two rounded rects (curbs). */
function thinRing(outer: [number, number], inner: [number, number], r: number, band: number): THREE.Shape {
  const shape = new THREE.Shape(roundedRectPoints(outer[0], outer[1], r + band, 18));
  shape.holes.push(new THREE.Path(roundedRectPoints(inner[0], inner[1], Math.max(4, r), 18)));
  return shape;
}

function RoadDetails() {
  const ringCurbs = React.useMemo(
    () => [
      new THREE.ShapeGeometry(thinRing([166.4, 137.4], [165.4, 136.4], 32, 1), 12),
      new THREE.ShapeGeometry(thinRing([156.6, 127.6], [155.6, 126.6], 24, 1), 12),
    ],
    []
  );
  React.useEffect(() => () => ringCurbs.forEach((g) => g.dispose()), [ringCurbs]);
  const allDashes = React.useMemo(() => [...LANE_DASHES, ...RING_DASHES], []);
  return (
    <group>
      {/* curbs */}
      <Instances limit={CURB_STRIPS.length} range={CURB_STRIPS.length} geometry={UNIT_BOX} material={M.curb} receiveShadow>
        {CURB_STRIPS.map((c, i) => (
          <Instance key={i} position={[c.pos[0], 0.07, c.pos[1]]} scale={[c.size[0], 0.14, c.size[1]]} />
        ))}
      </Instances>
      {ringCurbs.map((g, i) => (
        <mesh key={`rc-${i}`} geometry={g} material={M.curb} receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, 0]} />
      ))}
      {/* centre-line markings (straight + curved ring) */}
      <Instances limit={allDashes.length} range={allDashes.length} geometry={UNIT_BOX} material={M.marking}>
        {allDashes.map((d, i) => (
          <Instance key={i} position={[d.x, 0.095, d.z]} rotation={[0, d.rot, 0]} scale={[0.16, 0.02, 2.4]} />
        ))}
      </Instances>
      {/* pedestrian crossings */}
      <Instances limit={CROSSING_BARS.length} range={CROSSING_BARS.length} geometry={UNIT_BOX} material={M.marking}>
        {CROSSING_BARS.map((c, i) => (
          <Instance key={i} position={[c.position[0], 0.1, c.position[1]]} scale={[c.size[0], 0.02, c.size[1]]} />
        ))}
      </Instances>
      {/* street lights */}
      <Instances limit={STREET_LIGHTS.length} range={STREET_LIGHTS.length} material={M.pole} castShadow>
        <cylinderGeometry args={[0.09, 0.13, 5.8, 6]} />
        {STREET_LIGHTS.map((l, i) => (
          <Instance key={i} position={[l.x, 2.9, l.z]} />
        ))}
      </Instances>
      <Instances limit={STREET_LIGHTS.length} range={STREET_LIGHTS.length} geometry={UNIT_BOX} material={M.lampHead}>
        {STREET_LIGHTS.map((l, i) => (
          <Instance key={i} position={[l.x, 5.9, l.z]} scale={[0.85, 0.2, 0.85]} />
        ))}
      </Instances>
      {/* small traffic signs */}
      {TRAFFIC_SIGNS.map((s, i) => (
        <group key={`sign-${i}`}>
          <mesh geometry={UNIT_BOX} material={M.post} castShadow position={[s.x, 1.2, s.z]} scale={[0.1, 2.4, 0.1]} />
          <mesh material={M.signRed} position={[s.x, 2.65, s.z]}>
            <circleGeometry args={[0.5, 20]} />
          </mesh>
          <mesh material={M.marking} position={[s.x, 2.65, s.z + 0.012]}>
            <ringGeometry args={[0.3, 0.4, 20]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ----------------------- Phase 15B parking enhancements ------------------- */

function ParkingExtras() {
  return (
    <group>
      {/* landscaped islands: curb ring + grass top */}
      <Instances limit={PARKING_ISLANDS.length} range={PARKING_ISLANDS.length} material={M.curb} castShadow>
        <cylinderGeometry args={[2.4, 2.4, 0.28, 16]} />
        {PARKING_ISLANDS.map((p, i) => (
          <Instance key={i} position={[p.x, 0.14, p.z]} />
        ))}
      </Instances>
      <Instances limit={PARKING_ISLANDS.length} range={PARKING_ISLANDS.length} geometry={UNIT_DISC} material={M.meadow} receiveShadow>
        {PARKING_ISLANDS.map((p, i) => (
          <Instance key={i} position={[p.x, 0.29, p.z]} rotation={[-Math.PI / 2, 0, 0]} scale={2.15} />
        ))}
      </Instances>
      {/* low-poly parked cars (deterministic, non-interactive) */}
      <Instances limit={CARS.length} range={CARS.length} geometry={UNIT_BOX} material={M.carBody} castShadow>
        {CARS.map((c, i) => (
          <Instance key={i} position={[c.x, 0.75, c.z]} rotation={[0, c.rot, 0]} scale={[1.75, 1.3, 4.2]} color={CAR_COLORS[c.colorIdx]} />
        ))}
      </Instances>
      <Instances limit={CARS.length} range={CARS.length} geometry={UNIT_BOX} material={M.glassDark} castShadow>
        {CARS.map((c, i) => (
          <Instance key={i} position={[c.x, 1.55, c.z]} rotation={[0, c.rot, 0]} scale={[1.55, 0.65, 2.1]} />
        ))}
      </Instances>
    </group>
  );
}

/* --------------------------- Phase 15B entrance ---------------------------
 * LIFE REPUBLIC gateway signage — canvas-textured board (no font loading,
 * no external assets) on the Phase 15A gate structure (Boundary layer).
 * Phase 16A (Part 1): sign text is driven by the Place 1 config so the 3D
 * scene always matches the place registry. Client-only (document check).
 * ------------------------------------------------------------------------ */

function EntranceSignage() {
  const texture = React.useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#061426";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#008CFF";
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);
    ctx.textAlign = "center";
    ctx.fillStyle = "#F8FAFC";
    ctx.font = "bold 92px Arial, sans-serif";
    ctx.fillText(PLACE.displayName, canvas.width / 2, 112);
    ctx.fillStyle = "#00D9FF";
    ctx.font = "bold 44px Arial, sans-serif";
    ctx.fillText(`SURVEY NO. ${TOWNSHIP_SITE.surveyNo}`, canvas.width / 2, 182);
    ctx.fillStyle = "#94A3B8";
    ctx.font = "36px Arial, sans-serif";
    ctx.fillText(`${TOWNSHIP_SITE.village.toUpperCase()}, ${TOWNSHIP_SITE.district.toUpperCase()}`, canvas.width / 2, 236);
    ctx.fillStyle = "#64748B";
    ctx.font = "22px Arial, sans-serif";
    ctx.fillText("ILLUSTRATIVE 3D ENVIRONMENT", canvas.width / 2, 286);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
  React.useEffect(
    () => () => {
      texture?.dispose();
    },
    [texture]
  );
  if (!texture) return null;
  return (
    <group>
      {/* sign board above the gate beam */}
      <mesh castShadow position={[0, 9.7, SITE_BOUNDARY.gateZ + 0.6]}>
        <boxGeometry args={[13, 4.2, 0.25]} />
        <primitive object={M.signNavy} attach="material" />
      </mesh>
      <mesh position={[0, 9.7, SITE_BOUNDARY.gateZ + 0.74]}>
        <planeGeometry args={[12.6, 3.8]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* support posts */}
      {[-5.4, 5.4].map((x) => (
        <mesh key={x} geometry={UNIT_BOX} material={M.pole} castShadow position={[x, 8.1, SITE_BOUNDARY.gateZ + 0.6]} scale={[0.22, 3.4, 0.22]} />
      ))}
    </group>
  );
}

/**
 * Phase 16A (Part 2) — main township entrance. Approach apron, entry/exit
 * lane strips, a median divider and a security booth — all ILLUSTRATIVE
 * geometry on the Boundary layer. No official branding/approvals are
 * rendered (the township name signage lives in EntranceSignage and is
 * driven by the Place 1 config).
 */
function EntranceApron() {
  const { gate, apron, apronInside, median, booth } = ENTRANCE;
  return (
    <group>
      {/* approach apron outside the boundary */}
      <mesh geometry={UNIT_BOX} material={M.road} receiveShadow position={[0, 0.045, apron.z]} scale={[apron.width, 0.08, apron.depth]} />
      {/* slip connection: spine road → gate line */}
      <mesh geometry={UNIT_BOX} material={M.road} receiveShadow position={[0, 0.045, apronInside.z]} scale={[apronInside.width, 0.08, apronInside.depth]} />
      {/* entry / exit lane edge strips */}
      {[-1, 1].map((s) => (
        <mesh key={`lane-${s}`} geometry={UNIT_BOX} material={M.curb} position={[s * (apronInside.width / 2 + 0.2), 0.055, apronInside.z]} scale={[0.3, 0.12, apronInside.depth]} />
      ))}
      {/* median divider down the approach (inbound / outbound separation) */}
      <mesh geometry={UNIT_BOX} material={M.curb} position={[0, 0.06, median.z]} scale={[median.width, 0.14, median.depth]} />
      {/* security booth beside the gate */}
      <mesh geometry={UNIT_BOX} material={M.amenityBody} castShadow receiveShadow position={[booth.x, booth.size[1] / 2, booth.z]} scale={booth.size} />
      <mesh geometry={UNIT_BOX} material={M.roof} castShadow position={[booth.x, booth.size[1] + 0.15, booth.z]} scale={[booth.size[0] + 0.5, 0.25, booth.size[2] + 0.5]} />
      {/* small landscaped margin blocks framing the gate line */}
      {[-1, 1].map((s) => (
        <mesh key={`gframe-${s}`} geometry={UNIT_BOX} material={M.hedge} position={[s * (gate.halfWidth + 1.8), 0.4, gate.z + 0.4]} scale={[1.6, 0.8, 1.6]} />
      ))}
    </group>
  );
}

/* ------------------------------ Garden benches ---------------------------- */

function Benches() {
  const backs = React.useMemo(
    () =>
      BENCHES.map((b) => ({
        x: b.x - Math.sin(b.rot) * 0.26,
        z: b.z - Math.cos(b.rot) * 0.26,
        rot: b.rot,
      })),
    []
  );
  return (
    <group>
      <Instances limit={BENCHES.length} range={BENCHES.length} geometry={UNIT_BOX} material={M.benchWood} castShadow>
        {BENCHES.map((b, i) => (
          <Instance key={i} position={[b.x, 0.48, b.z]} rotation={[0, b.rot, 0]} scale={[1.8, 0.09, 0.5]} />
        ))}
      </Instances>
      <Instances limit={backs.length} range={backs.length} geometry={UNIT_BOX} material={M.benchWood} castShadow>
        {backs.map((b, i) => (
          <Instance key={i} position={[b.x, 0.82, b.z]} rotation={[-0.18, b.rot, 0]} scale={[1.8, 0.55, 0.07]} />
        ))}
      </Instances>
    </group>
  );
}

/* ------------------- Phase 15B scene dressing extras -------------------- */

/** Subtle landscaped berms — gentle mounds on the site platform (Terrain layer). */
function Berms() {
  return (
    <group>
      {BERMS.map((b, i) => (
        <mesh
          key={`berm-${i}`}
          position={[b.x, -b.r * 0.1 + 0.05, b.z]}
          scale={[1, 0.1, 1]}
          receiveShadow
          castShadow
          material={M.meadow}
        >
          <sphereGeometry args={[b.r, 20, 12]} />
        </mesh>
      ))}
    </group>
  );
}

/** Grass verges flanking the west/east avenues (Gardens layer). */
function GrassVerges() {
  return (
    <Instances limit={GRASS_VERGES.length} range={GRASS_VERGES.length} geometry={UNIT_BOX} material={M.lawnAlt} receiveShadow>
      {GRASS_VERGES.map((v, i) => (
        <Instance key={i} position={[v.position[0], 0.028, v.position[1]]} scale={[v.size[0], 0.05, v.size[1]]} />
      ))}
    </Instances>
  );
}

/** Perimeter green belt — planted grass band inside the site boundary (Gardens layer). */
function PerimeterBelt() {
  const geom = React.useMemo(
    () => new THREE.ShapeGeometry(thinRing(PERIMETER_BELT.outerHalf, PERIMETER_BELT.innerHalf, PERIMETER_BELT.radius, 0), 10),
    []
  );
  React.useEffect(() => () => geom.dispose(), [geom]);
  return <mesh geometry={geom} material={M.lawnAlt} receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.022, 0]} />;
}

/** Garden lights, planters and entrance markers (Gardens layer). */
function GardenFurniture() {
  return (
    <group>
      {/* low garden lights along the central circular path + curved garden paths */}
      <Instances limit={GARDEN_LIGHTS.length} range={GARDEN_LIGHTS.length} material={M.gardenLight} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 1.5, 6]} />
        {GARDEN_LIGHTS.map((l, i) => (
          <Instance key={i} position={[l.x, 0.75, l.z]} />
        ))}
      </Instances>
      <Instances limit={GARDEN_LIGHTS.length} range={GARDEN_LIGHTS.length} geometry={UNIT_BOX} material={M.lightGlobe}>
        {GARDEN_LIGHTS.map((l, i) => (
          <Instance key={i} position={[l.x, 1.6, l.z]} scale={[0.3, 0.14, 0.3]} />
        ))}
      </Instances>
      {/* planters: soil disc + rim + accent shrub */}
      <Instances limit={PLANTERS.length} range={PLANTERS.length} geometry={UNIT_DISC} material={M.planterSoil} receiveShadow>
        {PLANTERS.map((p, i) => (
          <Instance key={i} position={[p.x, 0.16, p.z]} rotation={[-Math.PI / 2, 0, 0]} scale={p.r} />
        ))}
      </Instances>
      <Instances limit={PLANTERS.length} range={PLANTERS.length} geometry={UNIT_DISC} material={M.planter}>
        {PLANTERS.map((p, i) => (
          <Instance key={i} position={[p.x, 0.14, p.z]} rotation={[-Math.PI / 2, 0, 0]} scale={p.r + 0.3} />
        ))}
      </Instances>
      <Instances limit={PLANTERS.length} range={PLANTERS.length} material={M.shrub} castShadow>
        <icosahedronGeometry args={[0.85, 0]} />
        {PLANTERS.map((p, i) => (
          <Instance key={i} position={[p.x, 0.55, p.z]} scale={[1, 1.15, 1]} />
        ))}
      </Instances>
      {/* small entrance markers at pathway convergence points */}
      {ENTRANCE_MARKERS.map((m, i) => (
        <group key={`em-${i}`}>
          <mesh geometry={UNIT_BOX} material={M.signPost} castShadow position={[m.x, 0.7, m.z]} scale={[0.09, 1.4, 0.09]} />
          <mesh geometry={UNIT_BOX} material={M.signNavy} position={[m.x, 1.52, m.z]} scale={[0.9, 0.34, 0.06]} />
        </group>
      ))}
    </group>
  );
}

/**
 * Detects low-end / mobile devices (coarse pointer, small viewport, low
 * device-memory) and returns a quality tier that drives simpler rendering.
 */
function useMobileTier(): QualityTier {
  const [tier, setTier] = React.useState<QualityTier>("high");
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    const low = window.innerWidth < 900 || coarse || (typeof mem === "number" && mem <= 2);
    setTier(low ? "low" : "high");
  }, []);
  return tier;
}

/** Error boundary so one decorative scene part can never crash the canvas. */
class SceneErrorBoundary extends React.Component<{ children?: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[township] scene part failed — rest of the township continues:", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}





type OrbitLike = {
  target: THREE.Vector3;
  update: () => void;
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener: (type: string, fn: () => void) => void;
} | null;

interface ViewerApi {
  applyPreset: (preset: CameraPresetId) => void;
  zoomBy: (factor: number) => void;
  focusTower: (tower: TowerDef) => void;
}

/**
 * Smoothly flies the orbit rig between camera presets or focuses on a building.
 * Any manual orbit / pan / zoom interaction cancels the in-flight animation immediately.
 */
function CameraController({
  preset,
  flightNonce,
  apiRef,
}: {
  preset: CameraPresetId;
  flightNonce: number;
  apiRef: React.MutableRefObject<ViewerApi | null>;
}) {
  const { camera, controls } = useThree();
  const flight = React.useRef({ active: false, pos: new THREE.Vector3(), target: new THREE.Vector3() });

  const flyTo = React.useCallback((id: CameraPresetId) => {
    const def = CAMERA_PRESET_DEFS[id];
    flight.current.pos.set(def.position[0], def.position[1], def.position[2]);
    flight.current.target.set(def.target[0], def.target[1], def.target[2]);
    flight.current.active = true;
  }, []);

  const focusTower = React.useCallback((t: TowerDef) => {
    const h = t.floors * FLOOR_HEIGHT;
    const [tx, tz] = t.position;
    flight.current.pos.set(tx + 48, Math.max(35, h * 0.75 + 20), tz + 48);
    flight.current.target.set(tx, h * 0.4, tz);
    flight.current.active = true;
  }, []);

  React.useEffect(() => {
    flyTo(preset);
  }, [preset, flightNonce, flyTo]);

  // manual interaction cancels the flight
  React.useEffect(() => {
    const c = controls as unknown as OrbitLike;
    if (!c || typeof c.addEventListener !== "function") return;
    const cancel = () => {
      flight.current.active = false;
    };
    c.addEventListener("start", cancel);
    return () => c.removeEventListener("start", cancel);
  }, [controls]);

  React.useEffect(() => {
    apiRef.current = {
      applyPreset: flyTo,
      zoomBy: (factor: number) => {
        const c = controls as unknown as OrbitLike;
        if (!c) return;
        const offset = camera.position.clone().sub(c.target);
        offset.setLength(THREE.MathUtils.clamp(offset.length() / factor, 18, 450));
        camera.position.copy(c.target).add(offset);
        flight.current.active = false;
      },
      focusTower,
    };
  }, [apiRef, camera, controls, flyTo, focusTower]);

  useFrame(() => {
    if (!flight.current.active) return;
    const c = controls as unknown as OrbitLike;
    if (!c?.target) return;
    camera.position.lerp(flight.current.pos, 0.08);
    c.target.lerp(flight.current.target, 0.08);
    c.update();
    if (camera.position.distanceTo(flight.current.pos) < 0.6 && c.target.distanceTo(flight.current.target) < 0.6) {
      flight.current.active = false;
    }
  });

  return null;
}

/* ------------------------------- Labels --------------------------------- */

const LABEL_CLASS =
  "pointer-events-none whitespace-nowrap rounded-md border border-[#164E73] bg-[#0A1B31]/85 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#9fd7e8] backdrop-blur-sm";

/** Small in-scene identifiers — all explicitly marked illustrative. */
function MapLabels({ selectedTowerId }: { selectedTowerId: string | null }) {
  const selected = TOWERS.find((t) => t.id === selectedTowerId) ?? null;
  return (
    <group>
      {selected && (
        <Html
          position={[selected.position[0], selected.floors * FLOOR_HEIGHT + 15, selected.position[1]]}
          center
          distanceFactor={230}
          zIndexRange={[30, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span className={`${LABEL_CLASS} border-[#00D9FF]/60 text-[#7CE8FF]`}>Illustrative Building</span>
        </Html>
      )}
      <Html position={[AMENITY.center[0], 20, AMENITY.center[1]]} center distanceFactor={260} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <span className={LABEL_CLASS}>Illustrative Amenity Area</span>
      </Html>
      <Html position={[WATER_FEATURE.center[0], 6, WATER_FEATURE.center[1]]} center distanceFactor={230} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <span className={LABEL_CLASS}>Illustrative Water Feature</span>
      </Html>
      <Html position={[0, 10, SITE_BOUNDARY.gateZ + 6]} center distanceFactor={260} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <span className={LABEL_CLASS}>Illustrative Site Boundary</span>
      </Html>
      <Html position={[0, 12.4, SITE_BOUNDARY.gateZ - 2]} center distanceFactor={260} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <span className={LABEL_CLASS}>Illustrative Main Entrance</span>
      </Html>
      <Html position={[45.6, 2.5, 8]} center distanceFactor={230} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <span className={LABEL_CLASS}>Illustrative Pedestrian Network</span>
      </Html>
      <Html position={[64, 2.5, 58]} center distanceFactor={230} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <span className={LABEL_CLASS}>Illustrative Road Network</span>
      </Html>
      <Html position={[0, 13.6, SITE_BOUNDARY.gateZ + 2]} center distanceFactor={260} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <span className={LABEL_CLASS}>Illustrative 3D Environment</span>
      </Html>
    </group>
  );
}

/* ------------------- Phase 15C: GIS footprint overlay -------------------- */

function rectOutlinePoints(hx: number, hz: number): Array<[number, number, number]> {
  return [
    [-hx, 0, -hz],
    [hx, 0, -hz],
    [hx, 0, hz],
    [-hx, 0, hz],
    [-hx, 0, -hz],
  ];
}

/** Ground-level outlines derived from REAL verified GIS building records. */
function GisFootprintOverlay({ footprints }: { footprints: GisFootprint[] }) {
  return (
    <group>
      {footprints.map((f) => (
        <group key={f.id} position={[f.position[0], 0, f.position[1]]}>
          <mesh geometry={UNIT_BOX} material={M.footprintFill} position={[0, 0.22, 0]} scale={[f.size[0], 0.3, f.size[1]]} />
          <Line
            points={rectOutlinePoints(f.size[0] / 2 + 0.5, f.size[1] / 2 + 0.5)}
            color="#22C55E"
            lineWidth={1.6}
            position={[0, 0.45, 0]}
          />
          <Html position={[0, 3.4, 0]} center distanceFactor={250} zIndexRange={[25, 0]} style={{ pointerEvents: "none" }}>
            <span className={`${LABEL_CLASS} border-[#22C55E]/60 text-[#86EFAC]`}>Verified GIS Footprint · {f.name}</span>
          </Html>
        </group>
      ))}
    </group>
  );
}

/* ------------------- Phase 7: Measurement & Discrepancies ---------------- */

function MeasurementVisualization({
  pointA,
  pointB,
}: {
  pointA?: { x: number; y: number; z: number } | null;
  pointB?: { x: number; y: number; z: number } | null;
}) {
  const linePoints = React.useMemo(() => {
    if (!pointA || !pointB) return [];
    return [
      [pointA.x, pointA.y + 0.3, pointA.z] as [number, number, number],
      [pointB.x, pointB.y + 0.3, pointB.z] as [number, number, number],
    ];
  }, [pointA, pointB]);

  const midPoint = React.useMemo(() => {
    if (!pointA || !pointB) return null;
    return [
      (pointA.x + pointB.x) / 2,
      (pointA.y + pointB.y) / 2 + 2,
      (pointA.z + pointB.z) / 2,
    ] as [number, number, number];
  }, [pointA, pointB]);

  const dist = React.useMemo(() => {
    if (!pointA || !pointB) return null;
    const dx = pointB.x - pointA.x;
    const dy = pointB.y - pointA.y;
    const dz = pointB.z - pointA.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }, [pointA, pointB]);

  return (
    <group>
      {pointA && (
        <mesh position={[pointA.x, pointA.y + 0.3, pointA.z]}>
          <sphereGeometry args={[0.9, 16, 16]} />
          <meshStandardMaterial color="#00D9FF" emissive="#00D9FF" emissiveIntensity={0.8} />
        </mesh>
      )}
      {pointB && (
        <mesh position={[pointB.x, pointB.y + 0.3, pointB.z]}>
          <sphereGeometry args={[0.9, 16, 16]} />
          <meshStandardMaterial color="#FACC15" emissive="#FACC15" emissiveIntensity={0.8} />
        </mesh>
      )}
      {linePoints.length === 2 && (
        <Line points={linePoints} color="#00D9FF" lineWidth={3} dashed dashScale={1} />
      )}
      {midPoint && dist !== null && (
        <Html position={midPoint} center distanceFactor={220} zIndexRange={[50, 0]} style={{ pointerEvents: "none" }}>
          <div className="rounded-lg border border-[#00D9FF] bg-[#061426]/95 px-2 py-1 font-mono text-[10px] font-black text-[#00D9FF] shadow-2xl backdrop-blur">
            Distance: {dist.toFixed(2)} m (approx)
          </div>
        </Html>
      )}
    </group>
  );
}

function DiscrepancyMarkersOverlay({
  conflicts = [],
}: {
  conflicts?: Array<{ id: string; conflictNumber: string; severity: string; description: string }>;
}) {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <group>
      {conflicts.map((c, idx) => {
        const targetTower = TOWERS[idx % TOWERS.length];
        const [x, z] = targetTower.position;
        const y = targetTower.floors * FLOOR_HEIGHT + 16;
        return (
          <group key={c.id} position={[x, y, z]}>
            <Html center distanceFactor={260} zIndexRange={[60, 0]} style={{ pointerEvents: "none" }}>
              <div className="flex items-center gap-1 rounded-md border border-red-500 bg-red-950/95 px-2 py-0.5 font-mono text-[9px] font-black text-red-200 shadow-xl backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span>{c.conflictNumber}: {c.severity}</span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

/* --------------------------- Main component ----------------------------- */

export const Township3DViewer = React.forwardRef<Township3DViewerHandle, Township3DViewerProps>(
  (
    {
      layers,
      selectedTowerId,
      onSelectTower,
      floorMode = "all",
      selectedLevel = null,
      linkedFloors = EMPTY_FLOORS,
      gisFootprints,
      buildingIsolation = false,
      shadowAnalysis = false,
      solarTimeMinutes = 720,
      measurementMode = false,
      measurePointA = null,
      measurePointB = null,
      onMeasureClick,
      discrepancyOverlay = false,
      conflicts = [],
      className,
    },
    ref
  ) => {
    const mountRef = React.useRef<HTMLDivElement>(null);
    const apiRef = React.useRef<ViewerApi | null>(null);
    const [preset, setPreset] = React.useState<CameraPresetId>("isometric");
    const [flightNonce, setFlightNonce] = React.useState(0);
    const [isNightMode, setIsNightMode] = React.useState(true);
    const [isAutoRotate, setIsAutoRotate] = React.useState(false);
    const tier = useMobileTier();

    // Dynamic Sun Calculation for Day mode
    const sunPos = React.useMemo(() => {
      const dayFraction = Math.max(0, Math.min(1, (solarTimeMinutes - 360) / 720));
      const altRad = (Math.max(5, Math.sin(dayFraction * Math.PI) * 72) * Math.PI) / 180;
      const azRad = ((80 + dayFraction * 200) * Math.PI) / 180;
      const radius = 320;
      const x = radius * Math.cos(altRad) * Math.sin(azRad);
      const y = radius * Math.sin(altRad);
      const z = radius * Math.cos(altRad) * Math.cos(azRad);
      return [x, y, z] as [number, number, number];
    }, [solarTimeMinutes]);

    React.useImperativeHandle(
      ref,
      () => ({
        applyPreset: (p: CameraPresetId) => {
          setPreset(p);
          setFlightNonce((n) => n + 1);
        },
        zoomBy: (factor: number) => apiRef.current?.zoomBy(factor),
        focusTower: (tower: TowerDef) => apiRef.current?.focusTower(tower),
        getContainer: () => mountRef.current,
      }),
      []
    );

    const handleFocusBuilding = () => {
      const target = TOWERS.find((t) => t.id === selectedTowerId) ?? TOWERS[1]; // default Tower B
      apiRef.current?.focusTower(target);
      if (!selectedTowerId) onSelectTower(target.id);
    };

    const handleResetAll = () => {
      setPreset("isometric");
      setFlightNonce((n) => n + 1);
      onSelectTower(null);
    };

    const handleToggleFullscreen = () => {
      const el = mountRef.current;
      if (!el) return;
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => undefined);
      } else {
        el.requestFullscreen?.().catch(() => undefined);
      }
    };

    return (
      <div
        ref={mountRef}
        className={cn("relative h-full w-full overflow-hidden select-none", className)}
        aria-label="Interactive 3D township digital twin (illustrative)"
      >
        {/* ── 3D Interactive Floating Toolbar (Top Center of Viewport) ── */}
        <div className="pointer-events-auto absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-2xl border border-cyan-500/40 bg-slate-950/90 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          {/* Zoom In */}
          <button
            type="button"
            onClick={() => apiRef.current?.zoomBy(1.3)}
            title="Zoom In (+)"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 text-cyan-300 transition-all hover:border-cyan-400 hover:bg-cyan-500/20 text-xs font-black"
          >
            +
          </button>
          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => apiRef.current?.zoomBy(0.75)}
            title="Zoom Out (−)"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 text-cyan-300 transition-all hover:border-cyan-400 hover:bg-cyan-500/20 text-xs font-black"
          >
            −
          </button>
          {/* Rotate / Orbit */}
          <button
            type="button"
            onClick={() => setIsAutoRotate((v) => !v)}
            title="Rotate / Orbit View"
            className={cn(
              "flex h-7 items-center gap-1 rounded-lg border px-2 text-[9.5px] font-bold uppercase transition-all",
              isAutoRotate
                ? "border-cyan-400 bg-cyan-500/30 text-cyan-200 shadow-[0_0_12px_rgba(0,217,255,0.4)]"
                : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
            )}
          >
            <RotateCw className="h-3 w-3 text-cyan-400" /> Rotate
          </button>
          {/* Focus Building */}
          <button
            type="button"
            onClick={handleFocusBuilding}
            title="Focus Selected Building"
            className="flex h-7 items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/80 px-2 text-[9.5px] font-bold uppercase text-slate-300 transition-all hover:border-cyan-400 hover:text-cyan-300"
          >
            <Crosshair className="h-3 w-3 text-cyan-400" /> Focus
          </button>
          {/* Fullscreen */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            title="Toggle Fullscreen View"
            className="flex h-7 items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/80 px-2 text-[9.5px] font-bold uppercase text-slate-300 transition-all hover:border-cyan-400 hover:text-cyan-300"
          >
            <Maximize className="h-3 w-3 text-cyan-400" /> Fullscreen
          </button>
          {/* Day / Night Mode */}
          <button
            type="button"
            onClick={() => setIsNightMode((v) => !v)}
            title="Toggle Day / Night Mode"
            className={cn(
              "flex h-7 items-center gap-1 rounded-lg border px-2 text-[9.5px] font-bold uppercase transition-all",
              isNightMode
                ? "border-blue-500/50 bg-blue-950/60 text-cyan-200"
                : "border-amber-500/50 bg-amber-500/20 text-amber-300"
            )}
          >
            {isNightMode ? <Moon className="h-3 w-3 text-cyan-300" /> : <Sun className="h-3 w-3 text-amber-400" />}
            {isNightMode ? "Night" : "Day"}
          </button>
          {/* Reset Camera */}
          <button
            type="button"
            onClick={handleResetAll}
            title="Reset Camera to Overview"
            className="flex h-7 items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/80 px-2 text-[9.5px] font-bold uppercase text-slate-300 transition-all hover:border-cyan-400 hover:text-cyan-300"
          >
            <RotateCcw className="h-3 w-3 text-cyan-400" /> Reset
          </button>
        </div>

        <Canvas
          shadows="soft"
          dpr={[1, tier === "low" ? 1.2 : 1.75]}
          camera={{ position: CAMERA_PRESET_DEFS.isometric.position, fov: 40, near: 1, far: 2600 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          onPointerMissed={() => onSelectTower(null)}
        >
          {/* Measurement Raycast Plane */}
          {measurementMode && onMeasureClick && (
            <mesh
              position={[0, 0, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              onPointerDown={(e) => {
                e.stopPropagation();
                onMeasureClick({ x: e.point.x, y: e.point.y, z: e.point.z });
              }}
            >
              <planeGeometry args={[3000, 3000]} />
              <meshBasicMaterial visible={false} />
            </mesh>
          )}

          {/* Dynamic Sky Atmosphere & Lighting based on isNightMode */}
          {isNightMode ? (
            <>
              <color attach="background" args={["#040914"]} />
              <fog attach="fog" args={["#040914", 340, 980]} />
              <hemisphereLight args={["#0b192c", "#020710", 0.8]} />
              <ambientLight intensity={0.28} color="#1e3a8a" />
              {/* Key Moonlight Direction */}
              <directionalLight
                position={[160, 220, 140]}
                intensity={1.65}
                color="#38bdf8"
                castShadow={layers.shadows || shadowAnalysis}
                shadow-mapSize={tier === "low" ? [1024, 1024] : [2048, 2048]}
                shadow-camera-left={-250}
                shadow-camera-right={250}
                shadow-camera-top={250}
                shadow-camera-bottom={-250}
                shadow-camera-near={20}
                shadow-camera-far={800}
                shadow-bias={-0.00035}
              />
              {/* Cyan Accent Horizon Fill */}
              <directionalLight position={[-140, 90, -140]} intensity={0.35} color="#00e5ff" />
            </>
          ) : (
            <>
              <color attach="background" args={["#bfd3e2"]} />
              <fog attach="fog" args={["#bfd3e2", 540, 1250]} />
              <hemisphereLight args={["#cfe3ee", "#55684a", 0.85]} />
              <ambientLight intensity={0.35} />
              <directionalLight
                position={sunPos}
                intensity={2.2}
                castShadow={layers.shadows || shadowAnalysis}
                shadow-mapSize={tier === "low" ? [1024, 1024] : [2048, 2048]}
                shadow-camera-left={-250}
                shadow-camera-right={250}
                shadow-camera-top={250}
                shadow-camera-bottom={-250}
                shadow-camera-near={20}
                shadow-camera-far={800}
                shadow-bias={-0.00035}
              />
            </>
          )}

          {layers.terrain && (
            <SceneErrorBoundary>
              <Terrain />
              <Berms />
            </SceneErrorBoundary>
          )}
          {layers.gardens && (
            <SceneErrorBoundary>
              <GreenZones />
              <GardenZones />
              <BuildingGardens />
              <CentralGarden />
              <GardenPlanting />
              <GrassVerges />
              <PerimeterBelt />
              <GardenFurniture />
            </SceneErrorBoundary>
          )}
          {layers.gardens && <WaterFeature />}
          {layers.roads && (
            <SceneErrorBoundary>
              <Roads />
              <PedestrianNetwork />
              <RoadDetails />
            </SceneErrorBoundary>
          )}
          {layers.parking && (
            <SceneErrorBoundary>
              <Parking />
              <ParkingExtras />
            </SceneErrorBoundary>
          )}
          {layers.amenities && (
            <SceneErrorBoundary>
              <Amenity />
              <CommunityCenter />
              <SportsArena />
              <Benches />
            </SceneErrorBoundary>
          )}
          {layers.boundary && (
            <SceneErrorBoundary>
              <SiteBoundary />
              <EntranceSignage />
              <EntranceApron />
            </SceneErrorBoundary>
          )}
          {layers.buildings &&
            TOWERS.map((t) => (
              <Tower
                key={t.id}
                tower={t}
                selected={t.id === selectedTowerId}
                onSelect={onSelectTower}
                floorMode={t.id === selectedTowerId ? floorMode : "all"}
                selectedLevel={t.id === selectedTowerId ? selectedLevel : null}
                realFloors={t.id === selectedTowerId ? linkedFloors : EMPTY_FLOORS}
                floorsEnabled={layers.floors}
                isDimmed={buildingIsolation && selectedTowerId !== null && t.id !== selectedTowerId}
              />
            ))}
          {layers.gisData && gisFootprints && gisFootprints.length > 0 && (
            <SceneErrorBoundary>
              <GisFootprintOverlay footprints={gisFootprints} />
            </SceneErrorBoundary>
          )}
          {layers.trees && (
            <SceneErrorBoundary>
              <Vegetation tier={tier} />
            </SceneErrorBoundary>
          )}

          {/* Phase 7 Measurement Visualizer */}
          {measurementMode && (
            <MeasurementVisualization pointA={measurePointA} pointB={measurePointB} />
          )}

          {/* Phase 7 Spatial Discrepancy Overlay */}
          {discrepancyOverlay && (
            <DiscrepancyMarkersOverlay conflicts={conflicts} />
          )}

          <CameraController preset={preset} flightNonce={flightNonce} apiRef={apiRef} />
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.08}
            minDistance={18}
            maxDistance={450}
            maxPolarAngle={Math.PI / 2.1}
            autoRotate={isAutoRotate}
            autoRotateSpeed={0.85}
            target={[0, 6, 0]}
          />
        </Canvas>
      </div>
    );
  }
);
Township3DViewer.displayName = "Township3DViewer";






