import Link from "next/link";
import { Building2, Layers, Ruler, CalendarDays, ArrowRight } from "lucide-react";
import { GisStatusBadge } from "@/components/common/GisStatusBadge";
import { cn } from "@/lib/utils";
import type { Building } from "@/types/gis";

interface BuildingCardProps {
  building: Building;
  floorsCount: number;
  unitsCount: number;
  parcelLocation?: string;
  /** Optional Phase 7 intelligence (computed by the directory from GISContext). */
  parcelNumber?: string;
  verifiedCount?: number;
  pendingCount?: number;
  openConflicts?: number;
}

/** Directory card for the Building Registry / map preview. */
export function BuildingCard({
  building,
  floorsCount,
  unitsCount,
  parcelLocation,
  parcelNumber,
  verifiedCount,
  pendingCount,
  openConflicts,
}: BuildingCardProps) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-tech transition-all hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-tech-cyan">
      {/* Accent strip + status */}
      <div className="relative h-1 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-700" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-cyan-600">
            <Building2 className="h-5 w-5" />
          </div>
          <GisStatusBadge status={building.status} />
        </div>

        <h3 className="mt-3 text-sm font-extrabold tracking-tight text-slate-900 group-hover:text-cyan-700">
          {building.name}
        </h3>
        <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">{building.buildingCode}</p>
        <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
          {building.address}
          {parcelLocation ? ` · ${parcelLocation}` : ""}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
          <div>
            <Layers className="mx-auto h-3.5 w-3.5 text-slate-400" />
            <p className="mt-1 font-mono text-xs font-black text-slate-900">{floorsCount}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Floors</p>
          </div>
          <div>
            <Ruler className="mx-auto h-3.5 w-3.5 text-slate-400" />
            <p className="mt-1 font-mono text-xs font-black text-slate-900">{unitsCount}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Units</p>
          </div>
          <div>
            <CalendarDays className="mx-auto h-3.5 w-3.5 text-slate-400" />
            <p className="mt-1 font-mono text-xs font-black text-slate-900">{building.yearBuilt}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Built</p>
          </div>
        </div>

        {/* Phase 7 — mapping intelligence (all derived from GISContext) */}
        {(parcelNumber || verifiedCount !== undefined) && (
          <div className="mt-3 space-y-2">
            {parcelNumber && (
              <p className="flex items-center justify-between text-[10px]">
                <span className="font-bold uppercase tracking-wider text-slate-400">Parent Parcel</span>
                <span className="font-mono font-bold text-slate-700">{parcelNumber}</span>
              </p>
            )}
            {verifiedCount !== undefined && (
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-1 py-1">
                  <span className="block text-[11px] font-black text-emerald-700">{verifiedCount}</span>
                  <span className="block text-[8.5px] font-bold uppercase tracking-wider text-emerald-600">Verified</span>
                </span>
                <span className="rounded-lg border border-amber-200 bg-amber-50 px-1 py-1">
                  <span className="block text-[11px] font-black text-amber-700">{pendingCount ?? 0}</span>
                  <span className="block text-[8.5px] font-bold uppercase tracking-wider text-amber-600">Pending</span>
                </span>
                <span
                  className={cn(
                    "rounded-lg border px-1 py-1",
                    (openConflicts ?? 0) > 0 ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50",
                  )}
                >
                  <span
                    className={cn(
                      "block text-[11px] font-black",
                      (openConflicts ?? 0) > 0 ? "text-red-700" : "text-slate-600",
                    )}
                  >
                    {openConflicts ?? 0}
                  </span>
                  <span
                    className={cn(
                      "block text-[8.5px] font-bold uppercase tracking-wider",
                      (openConflicts ?? 0) > 0 ? "text-red-600" : "text-slate-400",
                    )}
                  >
                    Conflicts
                  </span>
                </span>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <Link
            href={`/buildings/${building.id}/floors`}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-cyan-400 hover:text-cyan-700"
          >
            <Layers className="h-3 w-3" /> Floor Explorer
          </Link>
          <Link
            href={`/buildings/${building.id}`}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-cyan-300 transition-colors hover:bg-slate-800"
          >
            Details <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}