"use client";

import * as React from "react";
import Link from "next/link";
import { Building, ArrowRight, Box } from "lucide-react";
import { BarChart, HBarChart, type HBarDatum } from "@/components/dashboard/charts";
import { SectionHeader } from "@/components/layout/PageHeader";
import type { ReportAnalytics } from "@/lib/reportAnalytics";

interface VerticalPropertyAnalyticsProps {
  analytics: ReportAnalytics;
  className?: string;
}

/**
 * Section D — Vertical Property Analytics. Buildings by floor count, units
 * per building, per-floor distribution and vertical hierarchy coverage — all
 * derived from the centralized parcels/buildings/floors/properties registry.
 */
export function VerticalPropertyAnalytics({ analytics, className }: VerticalPropertyAnalyticsProps) {
  const a = analytics;

  const floorsByBuilding = a.buildingAnalytics.map((b) => ({
    key: b.buildingId,
    label: b.buildingCode,
    value: b.floorsRegistered,
    color: "bg-gradient-to-t from-blue-600 to-blue-400",
  }));

  const unitsByBuilding: HBarDatum[] = a.buildingAnalytics.map((b) => ({
    key: b.buildingId,
    label: b.buildingName,
    value: b.units,
    sub: `${b.floorsRegistered} floors`,
    color: "#0EA5E9",
  }));

  const hierarchyCoverage = a.buildingAnalytics.map((b) => ({
    key: b.buildingId,
    label: b.buildingName,
    value: b.units > 0 ? Math.round((b.floorsRegistered / Math.max(b.floorsDeclared, 1)) * 100) : 0,
    sub: `${b.floorsRegistered}/${b.floorsDeclared} floors`,
    color: b.floorsRegistered >= b.floorsDeclared ? "#10B981" : "#F59E0B",
  }));

  return (
    <section className={className} aria-label="Vertical property analytics">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
        <SectionHeader
          icon={<Building className="h-4 w-4" />}
          title="D · Vertical Property Analytics"
          description={`Parcel → building → floor → unit hierarchy: ${a.totalParcels} parcels · ${a.totalBuildings} buildings · ${a.totalFloors} floors · ${a.totalVerticalProperties} units`}
          action={
            <Link href="/floors" className="flex items-center gap-1 text-[11px] font-bold text-cyan-700 transition-colors hover:underline">
              Floor Explorer <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Registered floors by building</p>
            {floorsByBuilding.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-400">No buildings in scope.</p>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-4">
                <BarChart data={floorsByBuilding} height={150} ariaLabel="Registered floors by building" />
              </div>
            )}
          </div>
          <div>
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Property units by building</p>
            <HBarChart data={unitsByBuilding} ariaLabel="Property units by building" emptyLabel="No buildings in scope." />
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-3 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            <Box className="h-3 w-3" /> Vertical hierarchy coverage (declared floors carrying registry units)
          </p>
          <HBarChart
            data={hierarchyCoverage}
            max={100}
            valueFormatter={(v) => `${v}%`}
            ariaLabel="Vertical hierarchy coverage per building"
            emptyLabel="No buildings in scope."
          />
          {a.floorsWithoutUnits > 0 && (
            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
              {a.floorsWithoutUnits} registered floor{a.floorsWithoutUnits === 1 ? "" : "s"} currently carry no mapped property units — candidates for mapping completion.
            </p>
          )}
          <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-slate-400">
            Prototype coverage metric — floors declared in demo building metadata vs floors registered in the GIS registry
          </p>
        </div>
      </div>
    </section>
  );
}