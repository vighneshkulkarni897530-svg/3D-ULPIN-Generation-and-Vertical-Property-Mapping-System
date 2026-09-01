"use client";

import { SafeImage } from '@/components/ui/SafeImage';
import * as React from "react";
import { Ruler, Compass, CircleDot, ScanLine, BoxSelect } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/layout/PageHeader";
import { lngLatRing, geoToLocal } from "@/lib/gisGeo";
import type { ExtractionResult } from "@/lib/aiExtraction";

const VIEW_W = 100;
const VIEW_H = 80;
const PAD = 9;

interface LocalPoint {
  x: number;
  y: number;
}

/** Projects the footprint's lng/lat ring into a normalised SVG view (north up). */
function projectFootprint(result: ExtractionResult): LocalPoint[] {
  const ring = lngLatRing(result.extractedFootprint);
  const local = ring.map(([lng, lat]) => {
    const c = geoToLocal(result.centroid.lat, result.centroid.lng, lat, lng);
    return { x: c.x, z: c.z };
  });
  const xs = local.map((p) => p.x);
  const zs = local.map((p) => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const scale = Math.min(
    (VIEW_W - 2 * PAD) / Math.max(maxX - minX, 0.001),
    (VIEW_H - 2 * PAD) / Math.max(maxZ - minZ, 0.001),
  );
  return local.map((p) => ({
    x: PAD + (p.x - minX) * scale,
    y: VIEW_H - (PAD + (p.z - minZ) * scale),
  }));
}

function toPointsAttr(pts: LocalPoint[]): string {
  return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

function centroidOf(pts: LocalPoint[]): LocalPoint {
  const n = pts.length || 1;
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / n,
    y: pts.reduce((s, p) => s + p.y, 0) / n,
  };
}

/** Section 4+5 — prototype 2D footprint visualisation and boundary comparison. */
export function FootprintComparison({
  result,
  previewUrl,
}: {
  result: ExtractionResult;
  previewUrl: string | null;
}) {
  const pts = React.useMemo(() => projectFootprint(result), [result]);
  const centroid = React.useMemo(() => centroidOf(pts), [pts]);
  const pointsAttr = toPointsAttr(pts);

  // Axis-aligned bounding box — the honest "raw detection extent vs corrected footprint" comparison.
  const bbox = React.useMemo(() => {
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    };
  }, [pts]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <SectionHeader
        icon={<BoxSelect className="h-4 w-4" />}
        title="4 · 2D Footprint Preview"
        description="Original image → detected building boundary → extracted prototype footprint."
        action={
          <Badge variant="warning" className="text-[9px]">
            Prototype Visualization
          </Badge>
        }
      />

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Stage 1 — original image with simulated detection region */}
        <figure className="overflow-hidden rounded-xl border border-slate-200">
          <div className="relative h-44 w-full bg-slate-100">
            {previewUrl ? (
              <SafeImage src={previewUrl} alt="Uploaded source" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] font-semibold text-slate-400">
                Source preview unavailable (session expired)
              </div>
            )}
            <svg viewBox="0 0 100 80" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
              <rect x="24" y="16" width="52" height="48" fill="none" stroke="#06B6D4" strokeWidth="0.8" strokeDasharray="3 2" />
              {[
                [24, 16],
                [76, 16],
                [24, 64],
                [76, 64],
              ].map(([cx, cy]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.2" fill="#06B6D4" />
              ))}
            </svg>
            <figcaption className="absolute inset-x-0 bottom-0 bg-slate-950/80 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-cyan-300">
              1 · Original Image + Detection Region
            </figcaption>
          </div>
        </figure>

        {/* Stage 2 — detected boundary */}
        <figure className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-44 w-full">
            <defs>
              <pattern id="fp-grid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#E2E8F0" strokeWidth="0.4" />
              </pattern>
            </defs>
            <rect width={VIEW_W} height={VIEW_H} fill="url(#fp-grid)" />
            <polygon points={pointsAttr} fill="rgba(6,182,212,0.12)" stroke="#0891B2" strokeWidth="1" strokeDasharray="3 2" />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="1.4" fill="#0E7490" />
            ))}
            <circle cx={centroid.x} cy={centroid.y} r="1.8" fill="#F59E0B" />
          </svg>
          <figcaption className="absolute inset-x-0 bottom-0 bg-slate-950/80 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-cyan-300">
            2 · Detected Boundary (dots = corners, amber = centroid)
          </figcaption>
        </figure>

        {/* Stage 3 — extracted footprint + orientation */}
        <figure className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-44 w-full">
            <rect width={VIEW_W} height={VIEW_H} fill="url(#fp-grid)" />
            <rect x={bbox.x} y={bbox.y} width={bbox.w} height={bbox.h} fill="none" stroke="#94A3B8" strokeWidth="0.7" strokeDasharray="2 2" />
            <polygon points={pointsAttr} fill="rgba(6,182,212,0.22)" stroke="#06B6D4" strokeWidth="1.2" />
            <g transform={`rotate(${result.orientationDeg} ${centroid.x} ${centroid.y})`}>
              <line x1={centroid.x - 9} y1={centroid.y} x2={centroid.x + 9} y2={centroid.y} stroke="#F59E0B" strokeWidth="0.9" />
              <polygon
                points={`${centroid.x + 11},${centroid.y} ${centroid.x + 7},${centroid.y - 2.2} ${centroid.x + 7},${centroid.y + 2.2}`}
                fill="#F59E0B"
              />
            </g>
          </svg>
          <figcaption className="absolute inset-x-0 bottom-0 bg-slate-950/80 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-cyan-300">
            3 · Extracted Prototype Footprint (arrow = orientation {result.orientationDeg}°)
          </figcaption>
        </figure>
      </div>

      {/* Boundary comparison strip */}
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
            <CircleDot className="h-3 w-3" /> Corner Points
          </p>
          <p className="mt-0.5 text-base font-extrabold text-slate-900">{pts.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
            <Ruler className="h-3 w-3" /> Footprint Area
          </p>
          <p className="mt-0.5 text-base font-extrabold text-slate-900">{result.estimatedFootprintAreaSqm.toLocaleString()} m²</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
            <Compass className="h-3 w-3" /> Orientation
          </p>
          <p className="mt-0.5 text-base font-extrabold text-slate-900">{result.orientationDeg}°</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
            <ScanLine className="h-3 w-3" /> Centroid
          </p>
          <p className="mt-0.5 truncate font-mono text-[10px] font-bold text-slate-900">
            {result.centroid.lat.toFixed(5)}, {result.centroid.lng.toFixed(5)}
          </p>
        </div>
      </div>

      <p className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-800">
        Prototype comparison — dashed grey box shows the axis-aligned detection extent versus the corrected prototype
        boundary. Geometry is normalised for display and is not a surveyed measurement.
      </p>
    </section>
  );
}