"use client";

import * as React from "react";
import { ScanSearch, TriangleAlert } from "lucide-react";
import type { LandParcel, Building, PropertyUnit } from "@/types/gis";
import type { SpatialConflict } from "@/types/conflict";
import { lngLatRing } from "@/lib/gisGeo";
import { CONFLICT_COLORS } from "@/lib/gisLayers";
import { ringIntersectionM2, ringAreaM2 } from "@/lib/spatialValidation";
import { cn } from "@/lib/utils";

type Ring = Array<[number, number]>;

export interface SpatialAnalysisViewProps {
  conflict: SpatialConflict;
  properties: PropertyUnit[];
  parcels: LandParcel[];
  buildings: Building[];
  className?: string;
}

/**
 * Prototype spatial analysis for a conflict — a simplified SVG explanation
 * drawn from the real centralized geometry (conflict area, affected unit
 * boundaries, parent parcel footprint). Clearly labelled as a prototype; not
 * a legally authoritative cadastral analysis.
 */
export function SpatialAnalysisView({ conflict, properties, parcels, buildings, className }: SpatialAnalysisViewProps) {
  const color = CONFLICT_COLORS[conflict.severity] ?? CONFLICT_COLORS.default;

  // Resolve the entities involved from the centralized registry.
  const affectedUnits = properties.filter((p) => conflict.affectedPropertyIds.includes(p.id));
  const parcel = parcels.find((p) => p.id === conflict.parcelId);
  const building = buildings.find((b) => b.id === conflict.buildingId);

  // Collect every ring relevant to this conflict type, then project all of
  // them into one shared [0..100]² viewBox so they align spatially.
  const rings = React.useMemo(() => collectRings(conflict, affectedUnits, parcel, building), [conflict, affectedUnits, parcel, building]);
  const project = React.useMemo(() => makeProjector(rings), [rings]);

  const overlapM2 =
    affectedUnits.length >= 2
      ? ringIntersectionM2(lngLatRing(affectedUnits[0].geometry), lngLatRing(affectedUnits[1].geometry))
      : 0;

  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white", className)}>
      <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
            <ScanSearch className="h-3 w-3" /> Spatial Analysis
          </p>
          <h3 className="mt-0.5 text-[13px] font-extrabold text-slate-900">{conflict.type}</h3>
        </div>
        <span
          className="rounded-full px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider"
          style={{ color: color.stroke, backgroundColor: color.fill }}
        >
          {conflict.severity}
        </span>
      </header>

      <div className="p-4">
        <AnalysisFigure
          conflict={conflict}
          affectedUnits={affectedUnits}
          parcel={parcel}
          building={building}
          project={project}
          overlapM2={overlapM2}
          color={color.stroke}
        />

        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[9.5px] font-semibold leading-relaxed text-amber-700">
          <strong className="font-extrabold">Prototype Spatial Analysis</strong> — simplified demo visualisation over the
          centralized demo geometry. Not a legally authoritative cadastral validation.
        </p>
      </div>
    </section>
  );
}

// ── Ring collection & projection ────────────────────────────────────────────

function collectRings(
  conflict: SpatialConflict,
  units: PropertyUnit[],
  parcel?: LandParcel,
  building?: Building,
): Ring[] {
  const rings: Ring[] = [lngLatRing(conflict.geometry)];
  for (const u of units) rings.push(lngLatRing(u.geometry));
  if (parcel) rings.push(lngLatRing(parcel.geometry));
  if (building) rings.push(lngLatRing(building.geometry));
  return rings;
}

/** Maps lng/lat of all collected rings into a shared 0–100 viewBox (y up). */
function makeProjector(rings: Ring[]) {
  const all = rings.flat();
  if (!all.length) return () => [50, 50] as [number, number];
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lng, lat] of all) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const spanLng = Math.max(maxLng - minLng, 1e-9);
  const spanLat = Math.max(maxLat - minLat, 1e-9);
  const span = Math.max(spanLng, spanLat);
  const PAD = 12;
  const usable = 100 - PAD * 2;
  const offX = PAD + ((span - spanLng) / 2) * (usable / span);
  const offY = PAD + ((span - spanLat) / 2) * (usable / span);
  return (lng: number, lat: number): [number, number] => [
    offX + ((lng - minLng) / span) * usable,
    offY + (1 - (lat - minLat) / span) * usable,
  ];
}

function ringToPoints(ring: Ring, project: (lng: number, lat: number) => [number, number]): string {
  return ring.map(([lng, lat]) => project(lng, lat).map((v) => v.toFixed(2)).join(",")).join(" ");
}

// ── Figure ──────────────────────────────────────────────────────────────────

function AnalysisFigure({
  conflict,
  affectedUnits,
  parcel,
  building,
  project,
  overlapM2,
  color,
}: {
  conflict: SpatialConflict;
  affectedUnits: PropertyUnit[];
  parcel?: LandParcel;
  building?: Building;
  project: (lng: number, lat: number) => [number, number];
  overlapM2: number;
  color: string;
}) {
  const uid = React.useId().replace(/:/g, "");
  const conflictPts = ringToPoints(lngLatRing(conflict.geometry), project);
  const parcelPts = parcel ? ringToPoints(lngLatRing(parcel.geometry), project) : null;
  const buildingPts = building ? ringToPoints(lngLatRing(building.geometry), project) : null;

  if (conflict.type === "Missing Boundary") {
    return <MissingBoundaryFigure affectedUnits={affectedUnits} color={color} />;
  }

  return (
    <figure className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <svg viewBox="0 0 100 100" className="h-auto w-full" role="img" aria-label={`Spatial analysis diagram for ${conflict.type}`}>
        {/* Parcel context */}
        {parcelPts && <polygon points={parcelPts} fill="none" stroke="#64748B" strokeWidth={0.6} strokeDasharray="2.5 1.8" />}
        {/* Building context */}
        {buildingPts && <polygon points={buildingPts} fill="rgba(59,130,246,0.06)" stroke="#3B82F6" strokeWidth={0.5} strokeDasharray="1.5 1.5" />}
        {/* Conflict zone */}
        <polygon points={conflictPts} fill={color} fillOpacity={0.14} stroke={color} strokeWidth={0.5} strokeDasharray="1.5 1.2" />

        {conflict.type === "Boundary Overlap" && <OverlapFigure affectedUnits={affectedUnits} project={project} uid={uid} color={color} overlapM2={overlapM2} />}
        {conflict.type === "Outside Parent Parcel" && <OutsideParcelFigure affectedUnits={affectedUnits} parcel={parcel} project={project} uid={uid} color={color} />}
        {conflict.type === "Invalid Geometry" && <InvalidGeometryFigure affectedUnits={affectedUnits} project={project} color={color} />}
        {conflict.type === "Duplicate Spatial ID" && <DuplicateIdFigure affectedUnits={affectedUnits} project={project} color={color} />}
      </svg>
      <figcaption className="border-t border-slate-200 bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">
        Expected geometry · conflict geometry · affected region
      </figcaption>
    </figure>
  );
}

/** Two unit polygons; the true intersection is rendered via clip-path. */
function OverlapFigure({
  affectedUnits,
  project,
  uid,
  color,
  overlapM2,
}: {
  affectedUnits: PropertyUnit[];
  project: (lng: number, lat: number) => [number, number];
  uid: string;
  color: string;
  overlapM2: number;
}) {
  const a = affectedUnits[0];
  const b = affectedUnits[1];
  if (!a || !b) return null;
  return (
    <>
      <defs>
        <clipPath id={`${uid}-a`}>
          <polygon points={ringToPoints(lngLatRing(a.geometry), project)} />
        </clipPath>
      </defs>
      <polygon points={ringToPoints(lngLatRing(a.geometry), project)} fill="rgba(6,182,212,0.25)" stroke="#0891B2" strokeWidth={0.7} />
      <polygon points={ringToPoints(lngLatRing(b.geometry), project)} fill="rgba(249,115,22,0.20)" stroke="#EA580C" strokeWidth={0.7} />
      {/* True overlap region = B clipped by A */}
      <polygon points={ringToPoints(lngLatRing(b.geometry), project)} fill={color} fillOpacity={0.65} stroke={color} strokeWidth={0.8} clipPath={`url(#${uid}-a)`} />
      <UnitLabel unit={a} project={project} tone="#0891B2" />
      <UnitLabel unit={b} project={project} tone="#EA580C" />
      {overlapM2 > 0 && (
        <text x={50} y={97} textAnchor="middle" fontSize={3.4} fontWeight={700} fill={color}>
          Overlap ≈ {Math.round(overlapM2).toLocaleString("en-IN")} m²
        </text>
      )}
    </>
  );
}

/** Unit fill rendered through a mask that hides the parcel interior — the portion outside the parcel glows red. */
function OutsideParcelFigure({
  affectedUnits,
  parcel,
  project,
  uid,
  color,
}: {
  affectedUnits: PropertyUnit[];
  parcel?: LandParcel;
  project: (lng: number, lat: number) => [number, number];
  uid: string;
  color: string;
}) {
  const unit = affectedUnits[0];
  if (!unit || !parcel) return null;
  return (
    <>
      <defs>
        <mask id={`${uid}-outside`}>
          <rect x={0} y={0} width={100} height={100} fill="white" />
          <polygon points={ringToPoints(lngLatRing(parcel.geometry), project)} fill="black" />
        </mask>
      </defs>
      <polygon points={ringToPoints(lngLatRing(unit.geometry), project)} fill="rgba(100,116,139,0.18)" stroke="#64748B" strokeWidth={0.7} />
      <polygon points={ringToPoints(lngLatRing(unit.geometry), project)} fill={color} fillOpacity={0.6} stroke={color} strokeWidth={0.9} mask={`url(#${uid}-outside)`} />
      <UnitLabel unit={unit} project={project} tone={color} />
      <text x={50} y={97} textAnchor="middle" fontSize={3.4} fontWeight={700} fill={color}>
        Highlighted region extends beyond the parent parcel
      </text>
    </>
  );
}

/** Invalid polygon with warning markers on each vertex. */
function InvalidGeometryFigure({
  affectedUnits,
  project,
  color,
}: {
  affectedUnits: PropertyUnit[];
  project: (lng: number, lat: number) => [number, number];
  color: string;
}) {
  const unit = affectedUnits[0];
  const ring = unit ? lngLatRing(unit.geometry) : [];
  return (
    <>
      <polygon points={ringToPoints(ring, project)} fill="rgba(239,68,68,0.15)" stroke={color} strokeWidth={0.8} strokeDasharray="2 1.2" />
      {ring.map(([lng, lat], i) => {
        const [x, y] = project(lng, lat);
        return <circle key={i} cx={x} cy={y} r={1.3} fill={color} stroke="white" strokeWidth={0.35} />;
      })}
      {unit && <UnitLabel unit={unit} project={project} tone={color} />}
      <text x={50} y={97} textAnchor="middle" fontSize={3.4} fontWeight={700} fill={color}>
        ⚠ Invalid vertex / polygon structure detected
      </text>
    </>
  );
}

/** Missing-boundary state: registry record shown with a dashed placeholder and no real geometry. */
function MissingBoundaryFigure({ affectedUnits, color }: { affectedUnits: PropertyUnit[]; color: string }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed" style={{ borderColor: color }}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={color} strokeWidth={2} aria-hidden="true">
            <path d="M3 3l18 18" strokeLinecap="round" />
            <path d="M10.6 5.1A2 2 0 0112 4.5h6a2 2 0 012 2v6.9M6.9 6.9H6a2 2 0 00-2 2V18a2 2 0 002 2h9.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p className="text-[11px] font-extrabold text-slate-700">No valid boundary geometry</p>
        <p className="max-w-xs text-[10px] leading-relaxed text-slate-500">
          {affectedUnits.length > 0
            ? `${affectedUnits.map((u) => u.id).join(", ")} exists in the registry but has no surveyable boundary polygon.`
            : "The affected registry record has no surveyable boundary polygon."}
        </p>
        <p className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[9px] font-bold text-slate-400">
          geometry: null / unvalidated
        </p>
      </div>
      <figcaption className="border-t border-slate-200 bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">
        Missing geometry state — registry record without boundary
      </figcaption>
    </figure>
  );
}

/** Two units flagged as sharing one demo spatial identifier — both highlighted with the clashing ID. */
function DuplicateIdFigure({
  affectedUnits,
  project,
  color,
}: {
  affectedUnits: PropertyUnit[];
  project: (lng: number, lat: number) => [number, number];
  color: string;
}) {
  const a = affectedUnits[0];
  const b = affectedUnits[1];
  if (!a || !b) return null;
  const tones = ["#0891B2", "#7C3AED"];
  const units = [a, b];
  return (
    <>
      {units.map((unit, i) => (
        <g key={unit.id}>
          <polygon
            points={ringToPoints(lngLatRing(unit.geometry), project)}
            fill={i === 0 ? "rgba(6,182,212,0.25)" : "rgba(124,58,237,0.22)"}
            stroke={tones[i]}
            strokeWidth={0.8}
          />
          <UnitLabel unit={unit} project={project} tone={tones[i]} />
        </g>
      ))}
      {/* Equal marker linking the two colliding records */}
      <line
        x1={centroidX(lngLatRing(a.geometry), project)}
        y1={centroidY(lngLatRing(a.geometry), project)}
        x2={centroidX(lngLatRing(b.geometry), project)}
        y2={centroidY(lngLatRing(b.geometry), project)}
        stroke={color}
        strokeWidth={0.5}
        strokeDasharray="1.6 1.2"
      />
      <text x={50} y={97} textAnchor="middle" fontSize={3.2} fontWeight={700} fill={color}>
        Shared demo spatial ID: {a.demoSpatialId}
      </text>
    </>
  );
}

function centroidX(ring: Array<[number, number]>, project: (lng: number, lat: number) => [number, number]): number {
  const pts = ringToPoints(ring, project).split(" ").map((p) => parseFloat(p.split(",")[0]));
  return pts.reduce((s, v) => s + v, 0) / Math.max(1, pts.length);
}

function centroidY(ring: Array<[number, number]>, project: (lng: number, lat: number) => [number, number]): number {
  const pts = ringToPoints(ring, project).split(" ").map((p) => parseFloat(p.split(",")[1]));
  return pts.reduce((s, v) => s + v, 0) / Math.max(1, pts.length);
}

/** Small name tag anchored at a unit's centroid. */
function UnitLabel({
  unit,
  project,
  tone,
}: {
  unit: PropertyUnit;
  project: (lng: number, lat: number) => [number, number];
  tone: string;
}) {
  const ring = lngLatRing(unit.geometry);
  const xs = ring.map(([lng]) => project(lng, 0)[0]);
  const ys = ring.map(([, lat]) => project(0, lat)[1]);
  const cx = xs.reduce((s, v) => s + v, 0) / Math.max(1, xs.length);
  const cy = ys.reduce((s, v) => s + v, 0) / Math.max(1, ys.length);
  return (
    <text x={cx} y={cy - 1.2} textAnchor="middle" fontSize={2.8} fontWeight={800} fill={tone}>
      {unit.id}
    </text>
  );
}

