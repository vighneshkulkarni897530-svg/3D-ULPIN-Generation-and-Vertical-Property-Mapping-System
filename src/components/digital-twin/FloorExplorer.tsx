"use client";

import React, { useRef } from "react";
import { Building } from "lucide-react";
import { TwinFloor } from "@/data/mockDigitalTwin";
import { cn } from "@/lib/utils";

interface FloorExplorerProps {
  floors: TwinFloor[];
  selectedLevel: number;
  onSelect: (level: number) => void;
  className?: string;
}

/** Vertical, holographic floor-stack explorer. Selecting a floor syncs the 3D view. */
export function FloorExplorer({ floors, selectedLevel, onSelect, className }: FloorExplorerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const ordered = [...floors].sort((a, b) => b.level - a.level);

  const statusDot = (status: TwinFloor["status"]) => {
    switch (status) {
      case "VERIFIED": return "bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.7)]";
      case "PENDING": return "bg-[#FACC15] shadow-[0_0_8px_rgba(250,204,21,0.7)]";
      case "UNDER_REVIEW": return "bg-[#00D9FF] shadow-[0_0_8px_rgba(0,217,255,0.7)]";
      case "DISPUTED": return "bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.7)]";
    }
  };

  // Auto-scroll selected floor into view
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(`[data-floor="${selectedLevel}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedLevel]);

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#00D9FF]">
          <Building className="h-3 w-3" /> Floor Explorer
        </span>
        <span className="font-mono text-[9px] text-[#94A3B8]">{floors.length} levels</span>
      </div>

      <div
        ref={containerRef}
        className="dt-hud max-h-[300px] overflow-y-auto rounded-xl p-2 lg:max-h-none"
      >
        <div className="flex flex-col-reverse gap-1">
          {ordered.map((floor) => {
            const selected = floor.level === selectedLevel;
            return (
              <button
                key={floor.level}
                data-floor={floor.level}
                onClick={() => onSelect(floor.level)}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all duration-200",
                  selected
                    ? "border-[#00D9FF]/70 bg-[#00D9FF]/10 shadow-[0_0_18px_-6px_rgba(0,217,255,0.7)]"
                    : "border-transparent hover:border-[#164E73] hover:bg-[#0A1B31]"
                )}
              >
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusDot(floor.status))} />
                <span
                  className={cn(
                    "w-[68px] shrink-0 text-[11px] font-black tracking-tight transition-colors",
                    selected ? "text-[#00D9FF]" : "text-[#94A3B8] group-hover:text-[#F8FAFC]"
                  )}
                >
                  {floor.label}
                </span>
                <span className="ml-auto font-mono text-[9px] text-[#64748B]">
                  {floor.units.length}U
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}