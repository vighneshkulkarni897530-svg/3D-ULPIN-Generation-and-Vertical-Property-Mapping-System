import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Status pill for the unified GIS model (Phase 1 types).
 * Accepts property verification statuses, parcel/building statuses and
 * conflict status / severity values and maps them to a consistent
 * professional colour ramp.
 */

const TONES: Record<string, { chip: string; dot: string }> = {
  // green
  Verified: { chip: "bg-emerald-50 text-emerald-700 border-emerald-300", dot: "bg-emerald-500" },
  ACTIVE: { chip: "bg-emerald-50 text-emerald-700 border-emerald-300", dot: "bg-emerald-500" },
  Resolved: { chip: "bg-emerald-50 text-emerald-700 border-emerald-300", dot: "bg-emerald-500" },
  // amber
  Pending: { chip: "bg-amber-50 text-amber-700 border-amber-300", dot: "bg-amber-500" },
  "Pending Review": { chip: "bg-amber-50 text-amber-700 border-amber-300", dot: "bg-amber-500" },
  UNDER_CONSTRUCTION: { chip: "bg-amber-50 text-amber-700 border-amber-300", dot: "bg-amber-500" },
  Medium: { chip: "bg-amber-50 text-amber-700 border-amber-300", dot: "bg-amber-500" },
  // cyan
  "Under Review": { chip: "bg-cyan-50 text-cyan-800 border-cyan-300", dot: "bg-cyan-500" },
  "Under Investigation": { chip: "bg-cyan-50 text-cyan-800 border-cyan-300", dot: "bg-cyan-500" },
  // blue
  "Field Verification": { chip: "bg-blue-50 text-blue-700 border-blue-300", dot: "bg-blue-500" },
  // orange
  "Reinspection Required": { chip: "bg-orange-50 text-orange-700 border-orange-300", dot: "bg-orange-500" },
  High: { chip: "bg-orange-50 text-orange-700 border-orange-300", dot: "bg-orange-500" },
  // red
  Rejected: { chip: "bg-red-50 text-red-700 border-red-300", dot: "bg-red-500" },
  DISPUTED: { chip: "bg-red-50 text-red-700 border-red-300", dot: "bg-red-500" },
  Critical: { chip: "bg-red-50 text-red-700 border-red-300", dot: "bg-red-500" },
  // slate
  INACTIVE: { chip: "bg-slate-100 text-slate-600 border-slate-300", dot: "bg-slate-400" },
  Low: { chip: "bg-slate-100 text-slate-600 border-slate-300", dot: "bg-slate-400" },
};

export type GisStatusKind =
  | "property"
  | "parcel"
  | "building"
  | "conflict-status"
  | "severity"
  | "auto";

export function GisStatusBadge({
  status,
  kind = "auto",
  className,
}: {
  status: string;
  kind?: GisStatusKind;
  className?: string;
}) {
  void kind; // reserved: styling is inferred from the value itself
  const tone = TONES[status] ?? {
    chip: "bg-slate-100 text-slate-600 border-slate-300",
    dot: "bg-slate-400",
  };
  const label = status.replace(/_/g, " ");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-tight",
        tone.chip,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
      {label}
    </span>
  );
}