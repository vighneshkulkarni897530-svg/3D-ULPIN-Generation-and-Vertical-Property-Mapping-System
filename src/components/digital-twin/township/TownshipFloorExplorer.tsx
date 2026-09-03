"use client";

import React from "react";
import { Building, Layers } from "lucide-react";
import type { PropertyUnit } from "@/types/gis";
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
  /** Real property units linked to this building. */
  units?: PropertyUnit[];
  selectedUnitId?: string | null;
  onSelectUnit?: (unitId: string | null) => void;
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
  units = [],
  selectedUnitId = null,
  onSelectUnit,
  linked,
  selectedLevel,
  mode,
  onModeChange,
  onSelectLevel,
  className,
}: TownshipFloorExplorerProps) {
  const sorted = [...floors].sort((a, b) => b.floorNumber - a.floorNumber);
  const hasFloors = linked && floors.length > 0;

  // Filter units for the selected level if selected
  const activeFloor = floors.find((f) => f.floorNumber === selectedLevel);
  const floorUnits = activeFloor
    ? units.filter((u) => u.floorId === activeFloor.id)
    : [];

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
    <div className={cn("dt-hud dt-card-accent rounded-2xl p-3 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)]", className)}>
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
        <div className="flex max-h-[30vh] flex-col gap-1 overflow-y-auto pr-1 lg:max-h-[34vh]">
          <button
            onClick={() => onSelectLevel(null)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-left text-[9.5px] font-black transition-colors",
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
                "rounded-lg border px-2.5 py-1 text-left transition-colors",
                selectedLevel === f.floorNumber
                  ? "border-[#00D9FF]/70 bg-[#00D9FF]/10 text-[#00D9FF]"
                  : "border-[#164E73] bg-[#061426] text-[#94A3B8] hover:text-[#F8FAFC]"
              )}
            >
              <span className="font-mono text-[9.5px] font-black">{floorLevelLabel(f.floorNumber)}</span>
              <span className="mt-0.5 block truncate text-[8px] font-semibold text-[#64748B]">{f.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[#164E73]/70 bg-[#061426]/70 px-3 py-3">
          <p className="flex items-center gap-1.5 text-[10px] font-black text-[#FACC15]">
            <Layers className="h-3 w-3" /> Floor data unavailable
          </p>
          <p className="mt-1 text-[9px] font-semibold leading-relaxed text-[#64748B]">
            No real floor records exist for this illustrative tower in the database. The 3D scene keeps its illustrative building volumes by design.
          </p>
        </div>
      )}

      {/* Units subsection when floor has registered units */}
      {hasFloors && selectedLevel !== null && floorUnits.length > 0 && (
        <div className="mt-2.5 border-t border-[#164E73]/50 pt-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[8px] font-black uppercase tracking-wider text-[#00D9FF]">
              Floor {selectedLevel} Units ({floorUnits.length})
            </span>
          </div>
          <div className="flex max-h-[16vh] flex-col gap-1 overflow-y-auto pr-1">
            {floorUnits.map((u) => (
              <button
                key={u.id}
                onClick={() => onSelectUnit?.(selectedUnitId === u.id ? null : u.id)}
                className={cn(
                  "flex items-center justify-between rounded-md border px-2 py-1 text-left text-[9px] transition-colors",
                  selectedUnitId === u.id
                    ? "border-[#00D9FF] bg-[#00D9FF]/20 text-[#00D9FF]"
                    : "border-[#164E73]/60 bg-[#061426] text-[#94A3B8] hover:border-[#00D9FF]/40 hover:text-[#F8FAFC]"
                )}
              >
                <div>
                  <span className="font-bold text-[#F8FAFC]">Unit {u.unitNumber}</span>
                  <span className="ml-1 text-[8px] text-[#64748B]">({u.propertyType})</span>
                </div>
                <span className="font-mono text-[7.5px] text-[#00D9FF]">{u.demoSpatialId?.slice(-7) ?? "—"}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Unit Details Preview */}
      {(() => {
        const selUnit = units.find((u) => u.id === selectedUnitId);
        if (!selUnit) return null;
        return (
          <div className="mt-2.5 rounded-xl border border-[#00D9FF]/40 bg-[#061426]/90 p-2.5 shadow-lg">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[8.5px] font-black uppercase tracking-wider text-[#00D9FF]">
                Unit {selUnit.unitNumber} Selected
              </span>
              <span className="rounded bg-[#22C55E]/10 px-1.5 py-0.5 text-[7.5px] font-black text-[#22C55E]">
                {selUnit.verificationStatus}
              </span>
            </div>
            <div className="space-y-1 text-[8.5px]">
              <div className="flex justify-between text-[#94A3B8]">
                <span>Spatial ID:</span>
                <span className="font-mono font-bold text-[#F8FAFC]">{selUnit.demoSpatialId}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>Owner:</span>
                <span className="font-bold text-[#F8FAFC]">{selUnit.ownerReferenceName || "—"}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>Area / Elev:</span>
                <span className="font-bold text-[#F8FAFC]">{selUnit.area} sqft • {selUnit.elevation}m</span>
              </div>
            </div>
            <a
              href={`/properties/${selUnit.id}`}
              className="mt-2 block w-full rounded-lg border border-[#00D9FF]/60 bg-[#00D9FF]/20 py-1 text-center text-[8.5px] font-black uppercase tracking-wider text-[#00D9FF] hover:bg-[#00D9FF]/30"
            >
              Open Full Property View →
            </a>
          </div>
        );
      })()}
    </div>
  );
}