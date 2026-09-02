"use client";

import React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InspectionLegendProps {
  className?: string;
}

export function InspectionLegend({ className }: InspectionLegendProps) {
  const items = [
    { label: "Real Database Data", color: "bg-[#22C55E]", note: "Verified Firestore hierarchy" },
    { label: "Illustrative 3D Geometry", color: "bg-[#64748B]", note: "Conceptual visualization" },
    { label: "GIS Position Centroid", color: "bg-[#00D9FF]", note: "WGS-84 Cadastral coordinates" },
    { label: "Government Verified", color: "bg-[#22C55E]", note: "Official verification recorded" },
    { label: "Pending Review", color: "bg-[#FACC15]", note: "Audit pending or assigned" },
    { label: "Spatial Discrepancy", color: "bg-[#EF4444]", note: "Flagged conflict or mismatch" },
  ];

  return (
    <div
      className={cn(
        "dt-hud dt-card-accent rounded-xl p-2.5 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.8)] backdrop-blur-md",
        className
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5 border-b border-[#164E73]/50 pb-1 text-[8.5px] font-black uppercase tracking-wider text-[#94A3B8]">
        <Info className="h-3 w-3 text-[#00D9FF]" /> 3D Digital Twin Cadastral Legend
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[8px]">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", it.color)} />
            <div className="min-w-0">
              <p className="truncate font-bold text-[#F8FAFC]">{it.label}</p>
              <p className="truncate text-[7px] text-[#64748B]">{it.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
