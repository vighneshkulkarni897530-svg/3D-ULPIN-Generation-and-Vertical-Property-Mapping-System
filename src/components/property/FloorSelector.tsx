"use client";

import * as React from "react";
import { BuildingFloor } from "@/types";
import { Layers, ArrowUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloorSelectorProps {
  floors: BuildingFloor[];
  selectedFloor: number; // floorNumber of the active floor
  onSelectFloor: (floor: BuildingFloor) => void;
  className?: string;
}

/** Horizontal floor selector tabs with quick unit-count info. */
export function FloorSelector({ floors, selectedFloor, onSelectFloor, className }: FloorSelectorProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {floors.map((floor) => {
        const active = floor.floorNumber === selectedFloor;
        return (
          <button
            key={floor.floorNumber}
            type="button"
            onClick={() => onSelectFloor(floor)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all",
              active
                ? "border-cyan-500 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-tech-cyan"
                : "border-slate-200 bg-white text-slate-600 hover:border-cyan-400 hover:text-cyan-700"
            )}
          >
            {active ? <Building2 className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5 opacity-60" />}
            <span>
              {floor.floorNumber === 0 ? "Ground" : floor.floorNumber < 0 ? `B${Math.abs(floor.floorNumber)}` : `Floor ${floor.floorNumber}`}
            </span>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 font-mono text-[9px]",
                active ? "bg-slate-950/20 text-slate-950" : "bg-slate-100 text-slate-400"
              )}
            >
              {floor.units.length} units
            </span>
          </button>
        );
      })}

      {/* Elevation summary chip */}
      <span className="ml-auto hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 sm:flex">
        <ArrowUpDown className="h-3 w-3 text-cyan-500" />
        G+{Math.max(0, ...floors.map((f) => f.floorNumber))} structure •{" "}
        {Math.max(0, ...floors.map((f) => f.elevationMeters))}m crown
      </span>
    </div>
  );
}