"use client";

import * as React from "react";
import { Map, Fingerprint, ShieldAlert } from "lucide-react";
import { DonutChart, type DonutSegment } from "@/components/dashboard/charts";
import { SectionHeader } from "@/components/layout/PageHeader";
import type { ReportAnalytics } from "@/lib/reportAnalytics";

interface SpatialCoverageAnalyticsProps {
  analytics: ReportAnalytics;
  className?: string;
}

/**
 * Section E — Spatial Mapping Analytics. GIS geometry coverage for every
 * hierarchy level plus the Demo Spatial Identifier vs Official ULPIN split.
 * The distinction between the two identifier families is preserved explicitly:
 * demo spatial identifiers are platform-generated prototype identifiers and
 * are never presented as government-issued ULPINs.
 */
export function SpatialCoverageAnalytics({ analytics, className }: SpatialCoverageAnalyticsProps) {
  const a = analytics;
  const c = a.coverage;

  const coverageRows: Array<{ label: string; mapped: number; total: number }> = [
    { label: "Land parcels with geometry", mapped: c.mappedParcels, total: c.totalParcels },
    { label: "Buildings with geometry", mapped: c.mappedBuildings, total: c.totalBuildings },
    { label: "Registered floors", mapped: c.mappedFloors, total: c.totalFloors },
    { label: "Vertical units with geometry", mapped: c.mappedUnits, total: c.totalUnits },
  ];

  const demoSegments: DonutSegment[] = [
    { key: "with-demo-id", label: "Units with Demo Spatial ID", value: c.unitsWithDemoId, color: "#06B6D4" },
    { key: "without-demo-id", label: "Units without", value: Math.max(c.totalUnits - c.unitsWithDemoId, 0), color: "#E2E8F0" },
  ].filter((s) => s.value > 0);

  return (
    <section className={className} aria-label="Spatial mapping analytics">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
        <SectionHeader
          icon={<Map className="h-4 w-4" />}
          title="E · Spatial Mapping Analytics"
          description="Derived GIS coverage of the vertical registry under the active filters."
        />

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            {coverageRows.map((row) => {
              const pct = row.total > 0 ? Math.round((row.mapped / row.total) * 100) : 0;
              return (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700">{row.label}</span>
                    <span className="font-black tabular-nums text-slate-900">
                      {row.mapped}/{row.total} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={row.label}>
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col items-center">
              <p className="mb-2 self-start text-[10px] font-black uppercase tracking-widest text-slate-400">Demo Spatial ID coverage</p>
              <DonutChart
                segments={demoSegments}
                centerLabel={`${c.demoIdCoverage}%`}
                centerSub="Covered"
                size={130}
                strokeWidth={16}
                ariaLabel="Demo spatial identifier coverage donut chart"
              />
              <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-widest text-slate-400">
                Demo Spatial Identifier — prototype ID
              </p>
            </div>

            <div className="flex flex-col justify-center rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700">
                <ShieldAlert className="h-3.5 w-3.5" /> Official ULPIN
              </p>
              <p className="mt-2 text-sm font-black text-amber-900">External Government Integration Required</p>
              <p className="mt-1 text-[11px] leading-relaxed text-amber-800">
                {c.unitsWithOfficialUlpin} of {c.totalUnits} units carry an official ULPIN reference. Demo Spatial
                Identifiers shown across this system are platform-generated prototype identifiers — they are NOT
                independently generated legally valid government ULPINs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}