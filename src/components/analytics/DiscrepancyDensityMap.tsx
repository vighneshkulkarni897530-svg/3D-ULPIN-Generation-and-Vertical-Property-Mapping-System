"use client";

import * as React from "react";
import Link from "next/link";
import { MapPin, AlertTriangle, Building, Layers, Info } from "lucide-react";
import { type BuildingAnalyticsItem } from "@/lib/analytics/analyticsService";

interface DiscrepancyDensityMapProps {
  buildings: BuildingAnalyticsItem[];
  societyName?: string;
  className?: string;
}

export function DiscrepancyDensityMap({
  buildings,
  societyName,
  className = "",
}: DiscrepancyDensityMapProps) {
  const [selectedBuilding, setSelectedBuilding] = React.useState<BuildingAnalyticsItem | null>(
    buildings.find((b) => b.discrepanciesCount > 0) || buildings[0] || null,
  );

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Spatial Discrepancy Concentration</h3>
            <p className="text-xs text-slate-400">
              Spatial density distribution across {societyName || "registered societies"}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
          <Info className="h-3 w-3" />
          Approximate visualization
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Visual spatial grid */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-950 p-4 relative min-h-[260px] flex flex-col justify-between">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {buildings.slice(0, 9).map((b) => {
              const hasDisc = b.discrepanciesCount > 0;
              const isSelected = selectedBuilding?.buildingId === b.buildingId;

              return (
                <button
                  key={b.buildingId}
                  type="button"
                  onClick={() => setSelectedBuilding(b)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400"
                      : hasDisc
                      ? "border-amber-500/40 bg-amber-950/20 hover:border-amber-500"
                      : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white truncate">{b.buildingName}</span>
                    {hasDisc ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20 font-mono text-[10px] font-bold text-rose-400 border border-rose-500/40">
                        {b.discrepanciesCount}
                      </span>
                    ) : (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-[9px] text-emerald-400">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] font-mono text-slate-400">
                    {b.verifiedUnits}/{b.totalUnits} verified ({b.verificationRate}%)
                  </p>
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-[10px] text-slate-500 text-center">
            * Coordinates & footprints reflect recorded platform structures. Not surveyed cadastral boundaries.
          </p>
        </div>

        {/* Selected building spatial inspector */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 flex flex-col justify-between">
          {selectedBuilding ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white">{selectedBuilding.buildingName}</h4>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Total Units:</span>
                  <span className="font-mono font-bold text-white">{selectedBuilding.totalUnits}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Verified Units:</span>
                  <span className="font-mono text-emerald-400">{selectedBuilding.verifiedUnits}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Recorded Discrepancies:</span>
                  <span className="font-mono font-bold text-rose-400">
                    {selectedBuilding.discrepanciesCount}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Open Cadastral Cases:</span>
                  <span className="font-mono font-bold text-amber-400">
                    {selectedBuilding.openCasesCount}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/properties/default-township/digital-twin?societyId=${selectedBuilding.societyId}&buildingId=${selectedBuilding.buildingId}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2 text-xs font-bold text-slate-950 shadow hover:from-cyan-400 hover:to-blue-500 transition-all"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Inspect in 3D Digital Twin
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              Select a building from the map grid to view spatial insights
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
