"use client";

import * as React from "react";
import { Building2, Layers } from "lucide-react";
import type { Floor } from "@/types/gis";
import { cn } from "@/lib/utils";

interface FloorStackProps {
  floors: Floor[];
  selectedFloorId: string | null;
  onSelect: (floorId: string) => void;
  /** Optional per-floor unit counts keyed by floor id. */
  unitCounts?: Record<string, number>;
  buildingName?: string;
  className?: string;
}

/**
 * Vertical floor stack — the building visualised top-down (highest floor at
 * the top, ground at the bottom). Fully controlled: selection flows through
 * the centralized GIS selection (`selectFloor`) via the `onSelect` callback —
 * this component owns no independent selection state.
 */
export function FloorStack({
  floors,
  selectedFloorId,
  onSelect,
  unitCounts,
  buildingName,
  className,
}: FloorStackProps) {
  const sorted = React.useMemo(
    () => [...floors].sort((a, b) => b.floorNumber - a.floorNumber),
    [floors],
  );

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
        <Building2 className="h-3.5 w-3.5 text-cyan-600" /> Vertical Floor Stack
      </p>

      {/* Building cap */}
      <div className="mt-2.5 flex items-center justify-center gap-2 rounded-t-xl border border-b-0 border-slate-800 bg-slate-950 px-3 py-2">
        <Building2 className="h-3.5 w-3.5 text-cyan-400" />
        <span className="truncate text-[10px] font-extrabold uppercase tracking-widest text-cyan-300">
          {buildingName ?? "Building"}
        </span>
      </div>

      {/* Stack — top floor first, ground last */}
      <div role="listbox" aria-label="Building floors" className="space-y-px">
        {sorted.map((floor) => {
          const selected = floor.id === selectedFloorId;
          const count = unitCounts?.[floor.id] ?? 0;
          return (
            <button
              key={floor.id}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(floor.id)}
              className={cn(
                "flex w-full items-center gap-2.5 border px-3 py-2.5 text-left transition-all",
                sorted.indexOf(floor) === 0 && "rounded-tr-xl",
                sorted.indexOf(floor) === sorted.length - 1 && "rounded-b-xl",
                selected
                  ? "z-10 border-cyan-500 bg-gradient-to-r from-cyan-50 to-blue-50 shadow-sm ring-1 ring-cyan-400/50"
                  : "border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/40",
                selected && sorted.indexOf(floor) === 0 && "rounded-t-xl",
                selected && sorted.indexOf(floor) === sorted.length - 1 && "rounded-b-xl",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-9 shrink-0 items-center justify-center rounded-md border font-mono text-[10px] font-black",
                  selected ? "border-cyan-400 bg-cyan-500 text-slate-950" : "border-slate-200 bg-slate-50 text-slate-500",
                )}
              >
                {floor.floorNumber === 0 ? "G" : `F${floor.floorNumber}`}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-[11px] font-extrabold", selected ? "text-cyan-800" : "text-slate-700")}>
                  {floor.name}
                </span>
                <span className="block truncate font-mono text-[8.5px] text-slate-400">
                  Elev {floor.elevation.toFixed(1)} m · {floor.area.toLocaleString("en-IN")} sq ft
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[8.5px] font-bold",
                  selected ? "bg-cyan-100 text-cyan-800" : "bg-slate-100 text-slate-500",
                )}
              >
                {count} unit{count === 1 ? "" : "s"}
              </span>
              {selected && <Layers className="h-3.5 w-3.5 shrink-0 text-cyan-600" aria-hidden />}
            </button>
          );
        })}
        {sorted.length === 0 && (
          <p className="rounded-b-xl border border-t-0 border-slate-200 bg-slate-50 py-6 text-center text-[10.5px] text-slate-400">
            No floors registered for this building.
          </p>
        )}
      </div>
    </div>
  );
}