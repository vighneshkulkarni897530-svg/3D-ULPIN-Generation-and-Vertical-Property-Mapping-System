"use client";

import * as React from "react";
import { Shapes, CheckCircle2, TriangleAlert, OctagonAlert } from "lucide-react";
import type { PropertyUnit } from "@/types/gis";
import { cn } from "@/lib/utils";

export type BoundaryStatus = "Matched" | "Requires Review" | "Mismatch Detected";

export interface BoundaryComparison {
  status: BoundaryStatus;
  /** Deviation of the worst vertex in metres (demo approximation). */
  deviationM: number;
  vertexIndex: number;
}

/** Deterministic small hash so a unit always simulates the same field result. */
function unitHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** First exterior ring as [lng, lat] pairs, with a square fallback for Points. */
function expectedRing(property: PropertyUnit): [number, number][] {
  const g = property.geometry;
  if (g.type === "Polygon" && Array.isArray(g.coordinates) && Array.isArray((g.coordinates as number[][][])[0])) {
    return (g.coordinates as number[][][])[0] as [number, number][];
  }
  if (g.type === "Point" && Array.isArray(g.coordinates)) {
    const [lng, lat] = g.coordinates as number[];
    const d = 0.00008;
    return [
      [lng - d, lat - d],
      [lng + d, lat - d],
      [lng + d, lat + d],
      [lng - d, lat + d],
      [lng - d, lat - d],
    ];
  }
  // Fallback square around the unit centroid.
  const { latitude, longitude } = property;
  const d = 0.00008;
  return [
    [longitude - d, latitude - d],
    [longitude + d, latitude - d],
    [longitude + d, latitude + d],
    [longitude - d, latitude + d],
    [longitude - d, latitude - d],
  ];
}

/** Metres-per-degree at the unit latitude (demo approximation, good enough for UI text). */
function metresPerDegree(lat: number): { mLat: number; mLng: number } {
  return { mLat: 111_320, mLng: 111_320 * Math.cos((lat * Math.PI) / 180) };
}

/**
 * Deterministic demo "field boundary" for a unit. Most units match; a couple
 * show a small offset (Requires Review) or a clear corner displacement
 * (Mismatch Detected) so officers can exercise every decision path.
 */
export function simulateBoundaryComparison(property: PropertyUnit): { ring: [number, number][]; comparison: BoundaryComparison } {
  const ring = expectedRing(property).map(([lng, lat]) => [lng, lat] as [number, number]);
  const h = unitHash(property.id);
  const roll = h % 5;
  const status: BoundaryStatus = roll === 0 ? "Mismatch Detected" : roll === 1 ? "Requires Review" : "Matched";
  const { mLat, mLng } = metresPerDegree(property.latitude);
  // Displace one vertex (never the closing duplicate) outward.
  const vertexIndex = 1 + (h % Math.max(1, ring.length - 2));
  let deviationM = 0;
  if (status !== "Matched" && ring.length > 3) {
    const scale = status === "Mismatch Detected" ? 0.00035 : 0.00009;
    ring[vertexIndex] = [ring[vertexIndex][0] + scale / mLng, ring[vertexIndex][1] + scale / mLat];
    deviationM = Math.hypot(scale, scale);
  }
  return { ring, comparison: { status, deviationM, vertexIndex } };
}

const VIEW_W = 220;
const VIEW_H = 170;
const PAD = 18;

function toPath(ring: [number, number][]): string {
  const lats = ring.map(([, lat]) => lat);
  const lngs = ring.map(([lng]) => lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 1e-9;
  const spanLng = maxLng - minLng || 1e-9;
  return (
    ring
      .map(([lng, lat], i) => {
        const x = PAD + ((lng - minLng) / spanLng) * (VIEW_W - PAD * 2);
        const y = VIEW_H - PAD - ((lat - minLat) / spanLat) * (VIEW_H - PAD * 2);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ") + " Z"
  );
}

/**
 * Prototype Spatial Boundary Comparison — a simplified, demo-only visual
 * overlay of the expected cadastral boundary vs the simulated field boundary.
 * It is NOT a legal cadastral boundary validation.
 */
export function BoundaryCompareCard({ property }: { property: PropertyUnit }) {
  const { ring, comparison } = React.useMemo(() => simulateBoundaryComparison(property), [property]);
  const expectedPath = React.useMemo(() => toPath(expectedRing(property)), [property]);
  const fieldPath = React.useMemo(() => toPath(ring), [ring]);

  const tone =
    comparison.status === "Matched"
      ? { text: "text-emerald-300", border: "border-emerald-500/30", bg: "bg-emerald-500/10", Icon: CheckCircle2 }
      : comparison.status === "Requires Review"
        ? { text: "text-amber-300", border: "border-amber-500/30", bg: "bg-amber-500/10", Icon: TriangleAlert }
        : { text: "text-red-300", border: "border-red-500/30", bg: "bg-red-500/10", Icon: OctagonAlert };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60" aria-label="Prototype spatial boundary comparison">
      <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <Shapes className="h-3.5 w-3.5 text-cyan-400" /> Boundary Verification
        </p>
        <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-amber-400">
          Prototype
        </span>
      </div>

      <div className="space-y-3 px-3.5 py-3">
        <div className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[10.5px] font-bold", tone.border, tone.bg, tone.text)}>
          <tone.Icon className="h-3.5 w-3.5 shrink-0" />
          <span>{comparison.status === "Matched" ? "Boundary Matched" : comparison.status}</span>
          {comparison.deviationM > 0 && (
            <span className="ml-auto font-mono text-[9px] font-semibold text-slate-400">
              worst vertex ≈ {comparison.deviationM.toFixed(2)} m off
            </span>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="mx-auto block h-auto w-full max-w-[240px]" role="img" aria-label="Expected boundary compared with demo field boundary">
            {/* grid backdrop */}
            <g stroke="#1E293B" strokeWidth="1">
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={`v${f}`} x1={VIEW_W * f} y1={0} x2={VIEW_W * f} y2={VIEW_H} />
              ))}
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={`h${f}`} x1={0} y1={VIEW_H * f} x2={VIEW_W} y2={VIEW_H * f} />
              ))}
            </g>
            <path d={fieldPath} fill="rgba(245,158,11,0.10)" stroke="#F59E0B" strokeWidth="1.6" strokeDasharray="5 4" strokeLinejoin="round" />
            <path d={expectedPath} fill="rgba(6,182,212,0.12)" stroke="#22D3EE" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <div className="mt-1.5 flex items-center justify-center gap-4 text-[9px] font-bold text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-sm border-2 border-cyan-400 bg-cyan-400/20" /> Expected boundary
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-sm border-2 border-dashed border-amber-500 bg-amber-500/10" /> Demo field boundary
            </span>
          </div>
        </div>

        <p className="text-[9px] leading-relaxed text-slate-500">
          <strong className="font-black text-slate-400">Prototype Spatial Boundary Comparison</strong> — simplified demo
          geometry overlay for workflow illustration only. Not a legal cadastral boundary validation.
        </p>
      </div>
    </section>
  );
}
