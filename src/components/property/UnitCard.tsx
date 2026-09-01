"use client";

import * as React from "react";
import { PropertyUnit } from "@/types";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Ruler, User, Maximize2 } from "lucide-react";
import { humanize } from "@/utils/format";
import { cn } from "@/lib/utils";

interface UnitCardProps {
  unit: PropertyUnit;
  selected?: boolean;
  onClick?: (unit: PropertyUnit) => void;
  compact?: boolean;
}

/** Clickable unit tile for the floor & unit explorer. */
export function UnitCard({ unit, selected = false, onClick, compact = false }: UnitCardProps) {
  const occupied = unit.occupancyStatus === "OCCUPIED" || unit.occupancyStatus === "LEASED";

  return (
    <button
      type="button"
      onClick={() => onClick?.(unit)}
      className={cn(
        "group text-left rounded-xl border p-3.5 transition-all duration-200",
        selected
          ? "border-cyan-500 bg-cyan-50/60 shadow-tech-cyan ring-2 ring-cyan-500/20"
          : "border-slate-200 bg-white hover:border-cyan-400 hover:shadow-tech",
        compact && "p-2.5"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "font-mono font-extrabold tracking-tight",
            compact ? "text-xs" : "text-sm",
            selected ? "text-cyan-700" : "text-slate-900"
          )}
        >
          {unit.unitNumber}
        </span>
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
          {humanize(unit.type)}
        </span>
      </div>

      {!compact && (
        <div className="mt-2.5 space-y-1.5 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Ruler className="h-3 w-3 text-cyan-500" />
            <span className="font-mono font-semibold text-slate-700">{unit.carpetAreaSqFt.toLocaleString("en-IN")} sq ft</span> carpet
          </span>
          <span className="flex items-center gap-1.5 truncate">
            <User className="h-3 w-3 text-blue-500" />
            <span className="truncate font-medium text-slate-600">{unit.ownerName}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Maximize2 className="h-3 w-3 text-amber-500" />
            <span className={cn("font-semibold", occupied ? "text-green-600" : "text-amber-600")}>{humanize(unit.occupancyStatus)}</span>
          </span>
        </div>
      )}

      <div className={cn("mt-2.5", compact && "mt-2")}>
        <StatusBadge status={unit.verificationStatus} size="sm" showIcon={false} />
      </div>
    </button>
  );
}