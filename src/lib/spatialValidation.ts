/**
 * Demo Spatial Validation Engine
 * ===============================
 * Pure, deterministic validation checks over the centralized GIS registry.
 *
 * IMPORTANT: this is a demo visualization/validation pipeline over static
 * demo geometry. It is NOT a legally authoritative cadastral validation and
 * does not mutate any state — GISContext owns all state transitions. The
 * engine reproduces or confirms the registered demo conflicts rather than
 * inventing new ones, so results are identical on every run.
 */
import type { LandParcel, Building, Floor, PropertyUnit, Geometry } from '@/types/gis';
import type { SpatialConflict, ConflictType, ConflictSeverity } from '@/types/conflict';
import { lngLatRing } from '@/lib/gisGeo';

// ── Public result shapes ────────────────────────────────────────────────────

export interface ValidationFinding {
  /** Deterministic finding id, stable across runs. */
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  message: string;
  /** Parcel / building / unit IDs involved in this finding. */
  entityIds: string[];
  /** Set when the finding corresponds to a registered demo conflict. */
  matchedConflictId?: string;
  source: 'computed' | 'registered';
}

export interface ValidationStepResult {
  index: number;
  label: string;
  detail: string;
  checksRun: number;
  findingIds: string[];
}

export interface ValidationReport {
  runAt: string;
  steps: ValidationStepResult[];
  findings: ValidationFinding[];
  totals: {
    checks: number;
    findings: number;
    confirmedConflicts: number;
    newIssues: number;
  };
}

export interface SpatialValidationInput {
  parcels: LandParcel[];
  buildings: Building[];
  floors: Floor[];
  properties: PropertyUnit[];
  conflicts: SpatialConflict[];
}

// ── Geometry primitives (demo-scale, deterministic) ─────────────────────────

type Ring = Array<[number, number]>;

/** Ray-casting point-in-polygon test over a [lng, lat] ring. */
export function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Polygon area in m² (shoelace over equirectangular metres at the ring's lat). */
export function ringAreaM2(ring: Ring): number {
  if (ring.length < 3) return 0;
  const refLat = ring.reduce((s, [, lat]) => s + lat, 0) / ring.length;
  const kx = 111_320 * Math.cos((refLat * Math.PI) / 180);
  const ky = 111_320;
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] * kx) * (ring[i][1] * ky) - (ring[i][0] * kx) * (ring[j][1] * ky);
  }
  return Math.abs(sum / 2);
}

/**
 * Sutherland–Hodgman clipping of two convex rings (all demo polygons are
 * rectangles, so convex clipping is exact at demo scale). Returns the
 * intersection area in m².
 */
export function ringIntersectionM2(a: Ring, b: Ring): number {
  let output = [...b];
  for (let i = 0; i < a.length && output.length > 0; i++) {
    const [x1, y1] = a[i];
    const [x2, y2] = a[(i + 1) % a.length];
    const input = output;
    output = [];
    const side = (p: [number, number]) => (x2 - x1) * (p[1] - y1) - (y2 - y1) * (p[0] - x1);
    for (let j = 0; j < input.length; j++) {
      const cur = input[j];
      const prev = input[(j + input.length - 1) % input.length];
      const curIn = side(cur) <= 0;
      const prevIn = side(prev) <= 0;
      if (curIn !== prevIn) {
        const t = side(prev) / (side(prev) - side(cur));
        output.push([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]);
      }
      if (curIn) output.push(cur);
    }
  }
  return output.length >= 3 ? ringAreaM2(output) : 0;
}

/** Structural sanity of a geometry: closed ring, enough points, finite coords. */
export function isGeometryValid(geometry: Geometry): { valid: boolean; reason?: string } {
  if (geometry.type === 'Point') {
    const c = geometry.coordinates as number[];
    if (!Number.isFinite(c[0]) || !Number.isFinite(c[1])) return { valid: false, reason: 'non-finite coordinate' };
    return { valid: true };
  }
  const ring = lngLatRing(geometry);
  if (ring.length < 4) return { valid: false, reason: 'fewer than 4 ring points' };
  if (ring.some(([lng, lat]) => !Number.isFinite(lng) || !Number.isFinite(lat)))
    return { valid: false, reason: 'non-finite coordinate' };
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) return { valid: false, reason: 'ring is not closed' };
  return { valid: true };
}

// ── Individual validators (pure, deterministic) ─────────────────────────────

let findingSeq = 0;
function makeFinding(
  type: ConflictType,
  severity: ConflictSeverity,
  message: string,
  entityIds: string[],
  matchedConflictId?: string,
): ValidationFinding {
  findingSeq += 1;
  return {
    id: `SV-${String(findingSeq).padStart(3, '0')}`,
    type,
    severity,
    message,
    entityIds,
    matchedConflictId,
    source: matchedConflictId ? 'registered' : 'computed',
  };
}

/** Stable per-run ID sequence — reset by the orchestrator for determinism. */
function resetFindingSequence(): void {
  findingSeq = 0;
}

/** Finds a registered conflict of the same type that involves these entities. */
function matchRegisteredConflict(
  conflicts: SpatialConflict[],
  type: ConflictType,
  entityIds: string[],
): string | undefined {
  const entitySet = new Set(entityIds);
  return conflicts.find(
    (c) =>
      c.type === type &&
      (c.affectedPropertyIds.some((id) => entitySet.has(id)) ||
        (c.parcelId && entitySet.has(c.parcelId)) ||
        (c.buildingId && entitySet.has(c.buildingId))),
  )?.id;
}

/** Minimum intersection area (m²) for two unit polygons to count as overlapping. */
const OVERLAP_THRESHOLD_M2 = 0.5;

/**
 * Boundary Overlap — pairwise intersection test of unit boundary polygons
 * within the same parcel. Registered demo conflicts are matched by type and
 * affected entities so the engine confirms rather than duplicates them.
 */
export function validateBoundaryOverlap(input: SpatialValidationInput): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const byParcel = new Map<string, PropertyUnit[]>();
  for (const unit of input.properties) {
    const list = byParcel.get(unit.parcelId) ?? [];
    list.push(unit);
    byParcel.set(unit.parcelId, list);
  }
  for (const [parcelId, units] of byParcel) {
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        const a = units[i];
        const b = units[j];
        if (a.geometry.type !== 'Polygon' || b.geometry.type !== 'Polygon') continue;
        const area = ringIntersectionM2(lngLatRing(a.geometry), lngLatRing(b.geometry));
        if (area > OVERLAP_THRESHOLD_M2) {
          findings.push(
            makeFinding(
              'Boundary Overlap',
              'High',
              `Boundaries of ${a.id} and ${b.id} overlap by ~${area.toFixed(1)} m² in ${parcelId}.`,
              [a.id, b.id, parcelId],
              matchRegisteredConflict(input.conflicts, 'Boundary Overlap', [a.id, b.id]),
            ),
          );
        }
      }
    }
  }
  return findings;
}

/**
 * Outside Parent Parcel — flags units (and building footprints) whose
 * geometry extends beyond their registered land parcel boundary.
 */
export function validatePropertyInsideParcel(input: SpatialValidationInput): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const parcelRings = new Map<string, Ring>();
  for (const parcel of input.parcels) {
    if (parcel.geometry.type === 'Polygon') parcelRings.set(parcel.id, lngLatRing(parcel.geometry));
  }
  for (const unit of input.properties) {
    const ring = parcelRings.get(unit.parcelId);
    if (!ring || unit.geometry.type !== 'Polygon') continue;
    const unitRing = lngLatRing(unit.geometry).slice(0, -1); // ignore closing duplicate
    const outside = unitRing.filter(([lng, lat]) => !pointInRing(lng, lat, ring));
    if (outside.length > 0) {
      findings.push(
        makeFinding(
          'Outside Parent Parcel',
          'Critical',
          `${outside.length} boundary point(s) of ${unit.id} lie outside parent parcel ${unit.parcelId}.`,
          [unit.id, unit.parcelId],
          matchRegisteredConflict(input.conflicts, 'Outside Parent Parcel', [unit.id, unit.parcelId]),
        ),
      );
    }
  }
  for (const building of input.buildings) {
    const ring = parcelRings.get(building.parcelId);
    if (!ring || building.geometry.type !== 'Polygon') continue;
    const footprint = lngLatRing(building.geometry).slice(0, -1);
    const outside = footprint.filter(([lng, lat]) => !pointInRing(lng, lat, ring));
    if (outside.length > 0) {
      findings.push(
        makeFinding(
          'Outside Parent Parcel',
          'High',
          `Building footprint of ${building.id} extends outside parcel ${building.parcelId} (${outside.length} point(s)).`,
          [building.id, building.parcelId],
          matchRegisteredConflict(input.conflicts, 'Outside Parent Parcel', [building.id, building.parcelId]),
        ),
      );
    }
  }
  return findings;
}

/** Invalid Geometry + Missing Boundary across the whole registry. */
export function validateGeometry(input: SpatialValidationInput): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  for (const unit of input.properties) {
    if (unit.geometry.type !== 'Polygon') {
      findings.push(
        makeFinding(
          'Missing Boundary',
          'Medium',
          `${unit.id} has no polygon boundary geometry (registered as ${unit.geometry.type}).`,
          [unit.id, unit.buildingId],
          matchRegisteredConflict(input.conflicts, 'Missing Boundary', [unit.id]),
        ),
      );
      continue;
    }
    const check = isGeometryValid(unit.geometry);
    if (!check.valid) {
      findings.push(
        makeFinding(
          'Invalid Geometry',
          'Medium',
          `Geometry of ${unit.id} is invalid: ${check.reason}.`,
          [unit.id, unit.buildingId],
          matchRegisteredConflict(input.conflicts, 'Invalid Geometry', [unit.id]),
        ),
      );
    }
  }
  for (const parcel of input.parcels) {
    if (parcel.geometry.type !== 'Polygon') continue;
    const check = isGeometryValid(parcel.geometry);
    if (!check.valid) {
      findings.push(
        makeFinding(
          'Invalid Geometry',
          'High',
          `Parcel geometry ${parcel.id} is invalid: ${check.reason}.`,
          [parcel.id],
          matchRegisteredConflict(input.conflicts, 'Invalid Geometry', [parcel.id]),
        ),
      );
    }
  }
  return findings;
}

/** Duplicate Spatial ID — two or more units sharing one demo spatial identifier. */
export function validateDuplicateSpatialIds(input: SpatialValidationInput): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const seen = new Map<string, PropertyUnit[]>();
  for (const unit of input.properties) {
    const list = seen.get(unit.demoSpatialId) ?? [];
    list.push(unit);
    seen.set(unit.demoSpatialId, list);
  }
  for (const [spatialId, units] of seen) {
    if (units.length < 2) continue;
    findings.push(
      makeFinding(
        'Duplicate Spatial ID',
        'Critical',
        `Demo spatial identifier ${spatialId} is referenced by ${units.length} properties (${units.map((u) => u.id).join(', ')}).`,
        units.map((u) => u.id),
        matchRegisteredConflict(input.conflicts, 'Duplicate Spatial ID', units.map((u) => u.id)),
      ),
    );
  }
  return findings;
}

// ── Orchestrator (deterministic 5-step pipeline) ────────────────────────────

const STEP_LABELS = [
  'Loading Parcel Geometry',
  'Validating Property Boundaries',
  'Checking Vertical Property Relationships',
  'Checking Spatial Identifiers',
  'Detecting Conflicts',
] as const;

/**
 * Runs the full demo validation pipeline deterministically: identical input
 * always yields an identical report (stable finding IDs, counts and steps).
 * Pure — no state mutation; GISContext decides what to do with the result.
 */
export function runSpatialValidation(input: SpatialValidationInput): ValidationReport {
  resetFindingSequence();

  // Step 1 — parcel geometry loading + structural checks.
  const parcelChecks = input.parcels.filter((p) => p.geometry.type === 'Polygon').length;
  const step1Findings = validateGeometry(input).filter((f) => f.entityIds.some((id) => input.parcels.some((p) => p.id === id)));

  // Step 2 — pairwise unit boundary overlap checks per parcel.
  const polygonUnits = input.properties.filter((u) => u.geometry.type === 'Polygon');
  let pairChecks = 0;
  for (const [, units] of groupUnitsByParcel(input.properties)) {
    const polygons = units.filter((u) => u.geometry.type === 'Polygon');
    pairChecks += (polygons.length * (polygons.length - 1)) / 2;
  }
  const overlapFindings = validateBoundaryOverlap(input);

  // Step 3 — vertical relationships: units & footprints inside parent parcels.
  const insideFindings = validatePropertyInsideParcel(input);
  const containmentChecks = polygonUnits.length + input.buildings.length;

  // Step 4 — structural geometry + demo spatial identifier uniqueness.
  const geometryFindings = validateGeometry(input).filter(
    (f) => f.type === 'Invalid Geometry' || f.type === 'Missing Boundary',
  );
  const unitGeometryFindings = geometryFindings.filter((f) => f.entityIds.some((id) => input.properties.some((u) => u.id === id)));
  const duplicateFindings = validateDuplicateSpatialIds(input);
  const idChecks = input.properties.length;

  // Step 5 — consolidate & match against the registered conflict registry.
  const consolidated = [...step1Findings, ...overlapFindings, ...insideFindings, ...unitGeometryFindings, ...duplicateFindings];
  const deduped = new Map<string, ValidationFinding>();
  for (const f of consolidated) {
    const key = `${f.type}::${f.entityIds.slice().sort().join('|')}`;
    if (!deduped.has(key)) deduped.set(key, f);
  }
  const findings = Array.from(deduped.values());
  const confirmed = findings.filter((f) => f.matchedConflictId).length;
  const newIssues = findings.length - confirmed;

  const perStepIds = (pred: (f: ValidationFinding) => boolean): string[] =>
    findings.filter(pred).map((f) => f.id);

  const steps: ValidationStepResult[] = [
    {
      index: 1,
      label: STEP_LABELS[0],
      detail: `${input.parcels.length} parcel geometry object(s) loaded from the centralized registry.`,
      checksRun: parcelChecks,
      findingIds: perStepIds((f) => f.entityIds.some((id) => input.parcels.some((p) => p.id === id))),
    },
    {
      index: 2,
      label: STEP_LABELS[1],
      detail: `${pairChecks} pairwise boundary intersection check(s) across ${polygonUnits.length} unit polygons.`,
      checksRun: pairChecks,
      findingIds: perStepIds((f) => f.type === 'Boundary Overlap'),
    },
    {
      index: 3,
      label: STEP_LABELS[2],
      detail: `${containmentChecks} containment check(s) for units and building footprints inside parent parcels.`,
      checksRun: containmentChecks,
      findingIds: perStepIds((f) => f.type === 'Outside Parent Parcel'),
    },
    {
      index: 4,
      label: STEP_LABELS[3],
      detail: `${idChecks} demo spatial identifier(s) checked for duplicates; unit geometries structurally validated.`,
      checksRun: idChecks,
      findingIds: perStepIds((f) => f.type === 'Duplicate Spatial ID' || f.type === 'Missing Boundary' || f.type === 'Invalid Geometry'),
    },
    {
      index: 5,
      label: STEP_LABELS[4],
      detail: `${findings.length} finding(s) — ${confirmed} matched registered demo conflict(s), ${newIssues} new issue(s).`,
      checksRun: findings.length,
      findingIds: findings.map((f) => f.id),
    },
  ];

  return {
    runAt: new Date().toISOString(),
    steps,
    findings,
    totals: {
      checks: steps.reduce((s, st) => s + st.checksRun, 0),
      findings: findings.length,
      confirmedConflicts: confirmed,
      newIssues,
    },
  };
}

/** Groups units by parcel preserving registry order (deterministic iteration). */
function groupUnitsByParcel(properties: PropertyUnit[]): Map<string, PropertyUnit[]> {
  const map = new Map<string, PropertyUnit[]>();
  for (const unit of properties) {
    const list = map.get(unit.parcelId) ?? [];
    list.push(unit);
    map.set(unit.parcelId, list);
  }
  return map;
}

