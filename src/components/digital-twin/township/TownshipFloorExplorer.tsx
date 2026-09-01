"use client";

import React from "react";
import { Building, Layers } from "lucide-react";
import type { ExplicitFloor, TownshipFloorMode } from "./townshipData";
import { cn } from "@/lib/utils";

/* ======================================================================
 * Phase 15C — township floor explorer.
 *
 * Driven ONLY by real database floor records (props from the page context).
 * If no real floors exist for the selected tower, the panel honesty states
 * "Floor data unavailable" — no hard-coded or fabricated floor lists are shown.
 * ==================================================================== */

export type { TownshipFloorMode } from "./townshipData";

const MODES: Array<{ id: TownshipFloorMode; label: string }> = [
  { id: "all", label: "ALL" },
  { id: "show", label: "SHOW" },
  { id: "hide", label: "HIDE" },
  { id: "isolate", label: "ISOLATE" },
  { id: "explode", label: "EXPLODE" },
];

export function floorLevelLabel(level: number): string {
  if (level <= 0) return "Ground Floor";
  return `Floor ${level}`;
}

interface TownshipFloorExplorerProps {
  towerLabel: string;
  floors: ExplicitFloor[];
  /** True when the selected tower is linked to a real database building. */
  linked: boolean;
  selectedLevel: number | null;
  mode: TownshipFloorMode;
  onModeChange: (mode: TownshipFloorMode) => void;
  onSelectLevel: (level: number | null) => void;
  className?: string;
}

export function TownshipFloorExplorer({
  towerLabel,
  floors,
  linked,
  selectedLevel,
  mode,
  onModeChange,
  onSelectLevel,
  className,
}: TownshipFloorExplorerProps) {
  const sorted = [...floors].sort((a, b) => b.floorNumber - a.floorNumber);
  const hasFloors = linked && floors.length > 0;

  React.useEffect(() => {
    // Keep the selected level valid when data changes.

    if (hasFloors) {
      const max = Math.max(...floors.map((f) => f.floorNumber));
      if (selectedLevel === null || selectedLevel > max) onSelectLevel(max);
    } else {
      if (selectedLevel !== null) onSelectLevel(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked, hasFloors, floors.length]);

  return (
    <div className={cn("dt-hud dt-card-accent rounded-2xl shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)]", className)}>
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-[#164E73]/70 pb-1.5">
        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#00D9FF]">
          <Building className="h-3 w-3" /> Floors — {towerLabel}
        </span>
        <span
          className={cn(
            "rounded border px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-wider",
            hasFloors ? "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E]" : "border-[#FACC15]/30 bg-[#FACC15]/5 text-[#FACC15]"
          )}
        >
          {hasFloors ? `${floors.length} real floors` : "illustrative"}
        </span>
      </div>

      {/* mode controls */}
      <div className="mb-2 text-[8px] font-black uppercase tracking-[0.16em] text-[#64748B]">
        Floor View Mode
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            disabled={!hasFloors}
            onClick={() => onModeChange(m.id)}
            className={cn(
              "rounded-md border px-2 py-1 text-[8.5px] font-black uppercase tracking-wider transition-colors",
              !hasFloors && "cursor-not-allowed border-[#164E73]/40 bg-[#061426]/40 text-[#64748B]",
              hasFloors && mode === m.id
                ? "border-[#00D9FF]/70 bg-[#00D9FF]/10 text-[#00D9FF]"
                : "border-[#164E73] bg-[#061426] text-[#94A3B8] hover:border-[#00D9FF]/50 hover:text-[#00D9FF]"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* floor list */}
      {hasFloors ? (
        <div className="flex max-h-[34vh] flex-col gap-1 overflow-y-auto pr-1 lg:max-h-[40vh]">
          <button
            onClick={() => onSelectLevel(null)}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-left text-[10px] font-black transition-colors",
              selectedLevel === null
                ? "border-[#00D9FF]/70 bg-[#00D9FF]/10 text-[#00D9FF]"
                : "border-[#164E73] bg-[#061426] text-[#94A3B8] hover:text-[#F8FAFC]"
            )}
          >
            All floors
          </button>
          {sorted.map((f) => (
            <button
              key={f.id}
              onClick={() => onSelectLevel(f.floorNumber)}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-left transition-colors",
                selectedLevel === f.floorNumber
                  ? "border-[#00D9FF]/70 bg-[#00D9FF]/10 text-[#00D9FF]"
                  : "border-[#164E73] bg-[#061426] text-[#94A3B8] hover:text-[#F8FAFC]"
              )}
            >
              <span className="font-mono text-[10px] font-black">{floorLevelLabel(f.floorNumber)}</span>
              <span className="mt-0.5 block truncate text-[8.5px] font-semibold text-[#64748B]">{f.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[#164E73]/70 bg-[#061426]/70 px-3 py-3">
          <p className="flex items-center gap-1.5 text-[10px] font-black text-[#FACC15]">
            <Layers className="h-3 w-3" /> Floor data unavailable
          </p>
          <p className="mt-1 text-[9px] font-semibold leading-relaxed text-[#64748B]">
            No real floor records exist for this illustrative tower in the database. The 3D scene keeps its illustrative building volumes by design — no hard-coded
            floor counts are invented. Enable the Floors layer in Layers to see illustrative slicing when a tower is selected.

          </p>
        </div>
      )}
    </div>
  );
}