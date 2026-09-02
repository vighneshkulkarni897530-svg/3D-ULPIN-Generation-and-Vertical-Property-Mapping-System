"use client";

import React, { useMemo } from "react";
import { AlertTriangle, ShieldAlert, X, Filter, ChevronRight, CheckCircle2 } from "lucide-react";
import { useDigitalTwinInspection } from "@/context/DigitalTwinInspectionContext";
import { useGIS } from "@/context/GISContext";
import type { ConflictSeverity, ConflictStatus, SpatialConflict } from "@/types/conflict";
import { cn } from "@/lib/utils";

interface DiscrepancyOverlayProps {
  className?: string;
  onSelectConflict?: (conflict: SpatialConflict) => void;
}

const SEVERITY_COLORS: Record<ConflictSeverity, string> = {
  Critical: "border-red-500/60 bg-red-500/15 text-red-300",
  High: "border-orange-500/60 bg-orange-500/15 text-orange-300",
  Medium: "border-amber-500/60 bg-amber-500/15 text-amber-300",
  Low: "border-blue-500/60 bg-blue-500/15 text-blue-300",
};

export function DiscrepancyOverlay({ className, onSelectConflict }: DiscrepancyOverlayProps) {
  const {
    discrepancyOverlay,
    discrepancyFilter,
    setDiscrepancyFilter,
    toggleDiscrepancyOverlay,
    selectBuilding,
    selectFlat,
  } = useDigitalTwinInspection();

  const { conflicts, properties } = useGIS();

  // Filter conflicts
  const filteredConflicts = useMemo(() => {
    return conflicts.filter((c) => {
      if (discrepancyFilter.status !== "all" && c.status !== discrepancyFilter.status) return false;
      if (discrepancyFilter.severity !== "all" && c.severity !== discrepancyFilter.severity) return false;
      return true;
    });
  }, [conflicts, discrepancyFilter]);

  if (!discrepancyOverlay) return null;

  const handleConflictClick = (conflict: SpatialConflict) => {
    if (onSelectConflict) {
      onSelectConflict(conflict);
    }
    // If conflict has affected properties, select the first one
    if (conflict.affectedPropertyIds && conflict.affectedPropertyIds.length > 0) {
      const propId = conflict.affectedPropertyIds[0];
      const prop = properties.find((p) => p.id === propId);
      if (prop) {
        selectBuilding(prop.buildingId);
        selectFlat(prop.id);
      }
    }
  };

  return (
    <div
      className={cn(
        "dt-hud dt-card-accent w-full max-w-[310px] rounded-2xl p-3.5 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md",
        className
      )}
    >
      {/* ── Header ── */}
      <div className="mb-2.5 flex items-center justify-between border-b border-[#164E73]/60 pb-2">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8FAFC]">
              Spatial Discrepancies
            </h4>
            <span className="text-[8px] font-semibold text-red-400">
              {filteredConflicts.length} Flagged Record{filteredConflicts.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleDiscrepancyOverlay}
          title="Close Discrepancy Overlay"
          className="rounded-md p-1 text-[#64748B] hover:bg-[#061426] hover:text-[#F8FAFC]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="mb-3 space-y-1.5">
        <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-[#64748B]">
          <Filter className="h-2.5 w-2.5" /> Severity Filter
        </div>
        <div className="flex flex-wrap gap-1">
          {(["all", "Critical", "High", "Medium", "Low"] as Array<"all" | ConflictSeverity>).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setDiscrepancyFilter({ severity: sev })}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[8px] font-bold uppercase transition-colors",
                discrepancyFilter.severity === sev
                  ? "border-[#00D9FF] bg-[#00D9FF]/20 text-[#00D9FF]"
                  : "border-[#164E73] bg-[#061426] text-[#94A3B8] hover:text-[#F8FAFC]"
              )}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 pt-1 text-[8px] font-black uppercase tracking-wider text-[#64748B]">
          Status Filter
        </div>
        <div className="flex flex-wrap gap-1">
          {(["all", "Open", "Under Investigation", "Resolved"] as Array<"all" | ConflictStatus>).map((stat) => (
            <button
              key={stat}
              type="button"
              onClick={() => setDiscrepancyFilter({ status: stat })}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[8px] font-bold uppercase transition-colors",
                discrepancyFilter.status === stat
                  ? "border-[#00D9FF] bg-[#00D9FF]/20 text-[#00D9FF]"
                  : "border-[#164E73] bg-[#061426] text-[#94A3B8] hover:text-[#F8FAFC]"
              )}
            >
              {stat === "Under Investigation" ? "Investigating" : stat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Conflict List ── */}
      <div className="max-h-[34vh] space-y-1.5 overflow-y-auto pr-1">
        {filteredConflicts.length === 0 ? (
          <div className="rounded-xl border border-[#164E73]/50 bg-[#061426]/50 p-4 text-center">
            <CheckCircle2 className="mx-auto h-5 w-5 text-[#22C55E]" />
            <p className="mt-1 text-[9.5px] font-bold text-[#F8FAFC]">No Discrepancies</p>
            <p className="mt-0.5 text-[8px] text-[#64748B]">
              No spatial conflicts match the selected filter criteria.
            </p>
          </div>
        ) : (
          filteredConflicts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleConflictClick(c)}
              className="flex w-full items-start justify-between rounded-lg border border-[#164E73]/60 bg-[#061426] p-2 text-left transition-colors hover:border-[#00D9FF]/50"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[9px] font-black text-[#F8FAFC]">
                    {c.conflictNumber}
                  </span>
                  <span
                    className={cn(
                      "rounded border px-1 py-0.2 text-[7.5px] font-black uppercase tracking-wider",
                      SEVERITY_COLORS[c.severity]
                    )}
                  >
                    {c.severity}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[8px] font-semibold leading-tight text-[#94A3B8]">
                  {c.description}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[7.5px] text-[#64748B]">
                  <span>Status: <strong className="text-[#F8FAFC]">{c.status}</strong></span>
                  {c.affectedPropertyIds && (
                    <span>· {c.affectedPropertyIds.length} affected unit(s)</span>
                  )}
                </div>
              </div>
              <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-[#64748B]" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
