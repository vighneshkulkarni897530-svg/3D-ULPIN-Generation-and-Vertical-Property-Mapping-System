"use client";

import * as React from "react";
import { Crosshair, CheckCircle2, TriangleAlert, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GpsCheckResult {
  detectedLat: number;
  detectedLng: number;
  accuracyM: number;
  distanceM: number;
  matched: boolean;
  checkedAt: string;
}

interface GpsCheckCardProps {
  expectedLat: number;
  expectedLng: number;
  /** Result of the last simulated check (page-owned so decisions can use it). */
  result: GpsCheckResult | null;
  onResult: (result: GpsCheckResult | null) => void;
  /** Hide the re-check button after a successful match (field workflow). */
  compact?: boolean;
}

const MATCH_TOLERANCE_M = 10;

/** Haversine distance in metres between two WGS-84 points. */
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Demo GPS / simulated field location check.
 *
 * Simulates a field officer's position near the expected property coordinate.
 * This is NOT a real GNSS/RTK/CORS measurement — the card is explicitly
 * labelled as a demo simulation.
 */
export function GpsCheckCard({ expectedLat, expectedLng, result, onResult, compact }: GpsCheckCardProps) {
  const [checking, setChecking] = React.useState(false);

  const runCheck = React.useCallback(() => {
    setChecking(true);
    onResult(null);
    // Simulate a GPS fix taking a moment.
    window.setTimeout(() => {
      // ~85% of simulated fixes land within tolerance; the rest drift.
      const drifted = Math.random() > 0.85;
      const deg = drifted ? 0.00022 + Math.random() * 0.00025 : 0.000008 + Math.random() * 0.00006;
      const bearing = Math.random() * Math.PI * 2;
      const detectedLat = expectedLat + Math.sin(bearing) * deg;
      const detectedLng = expectedLng + (Math.cos(bearing) * deg) / Math.cos((expectedLat * Math.PI) / 180);
      const distanceM = haversineM(expectedLat, expectedLng, detectedLat, detectedLng);
      const accuracyM = 3 + Math.random() * 4.5;
      onResult({
        detectedLat,
        detectedLng,
        accuracyM,
        distanceM,
        matched: distanceM <= MATCH_TOLERANCE_M,
        checkedAt: new Date().toISOString(),
      });
      setChecking(false);
    }, 900);
  }, [expectedLat, expectedLng, onResult]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60" aria-label="Demo GPS location check">
      <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
          <Crosshair className="h-3.5 w-3.5 text-cyan-400" /> Demo GPS Location Check
        </p>
        <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wider text-amber-400">
          Simulated
        </span>
      </div>

      <div className="space-y-3 px-3.5 py-3">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-2">
            <p className="text-[8.5px] font-extrabold uppercase tracking-widest text-slate-500">Expected location</p>
            <p className="mt-0.5 font-mono text-[10.5px] font-bold text-slate-200">{expectedLat.toFixed(6)}</p>
            <p className="font-mono text-[10.5px] font-bold text-slate-200">{expectedLng.toFixed(6)}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-2">
            <p className="text-[8.5px] font-extrabold uppercase tracking-widest text-slate-500">Demo field location</p>
            {result ? (
              <>
                <p className={cn("mt-0.5 font-mono text-[10.5px] font-bold", result.matched ? "text-emerald-300" : "text-amber-300")}>
                  {result.detectedLat.toFixed(6)}
                </p>
                <p className={cn("font-mono text-[10.5px] font-bold", result.matched ? "text-emerald-300" : "text-amber-300")}>
                  {result.detectedLng.toFixed(6)}
                </p>
              </>
            ) : (
              <p className="mt-1 text-[10px] italic text-slate-600">Not checked yet</p>
            )}
          </div>
        </div>

        {result && (
          <div
            role="status"
            className={cn(
              "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-2.5 py-2 text-[10.5px] font-bold",
              result.matched
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-300",
            )}
          >
            {result.matched ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Location Matched
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <TriangleAlert className="h-3.5 w-3.5" /> Location Requires Review
              </span>
            )}
            <span className="font-mono text-[9.5px] font-semibold text-slate-400">
              distance {result.distanceM.toFixed(1)} m · accuracy ±{result.accuracyM.toFixed(1)} m · tolerance {MATCH_TOLERANCE_M} m
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={runCheck}
          disabled={checking}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[11px] font-bold transition-all",
            compact
              ? "border border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-500/50"
              : "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 hover:from-cyan-400 hover:to-blue-500",
            checking && "cursor-wait opacity-70",
          )}
        >
          {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
          {checking ? "Acquiring simulated fix…" : result ? "Re-check Location" : "Check Location"}
        </button>

        <p className="text-[9px] leading-relaxed text-slate-500">
          <strong className="font-extrabold text-slate-400">Demo GPS / Simulated Field Location</strong> — coordinates are
          generated for demonstration only and are not real GNSS, RTK or CORS measurements.
        </p>
      </div>
    </section>
  );
}
