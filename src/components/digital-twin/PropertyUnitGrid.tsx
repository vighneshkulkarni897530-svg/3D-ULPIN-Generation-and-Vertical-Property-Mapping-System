"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, ScanEye, AlertTriangle, XCircle, Home, Ruler, User, type LucideIcon } from "lucide-react";
import { TwinUnit, TwinVerificationStatus } from "@/data/mockDigitalTwin";
import { cn } from "@/lib/utils";

export const UNIT_STATUS_META: Record<
  TwinVerificationStatus,
  { label: string; color: string; border: string; bg: string; icon: LucideIcon }
> = {
  VERIFIED: { label: "Verified", color: "#22C55E", border: "rgba(34,197,94,0.5)", bg: "rgba(34,197,94,0.1)", icon: CheckCircle2 },
  PENDING: { label: "Pending", color: "#FACC15", border: "rgba(250,204,21,0.5)", bg: "rgba(250,204,21,0.1)", icon: Clock },
  UNDER_REVIEW: { label: "Under Review", color: "#00D9FF", border: "rgba(0,217,255,0.5)", bg: "rgba(0,217,255,0.1)", icon: ScanEye },
  DISPUTED: { label: "Disputed", color: "#EF4444", border: "rgba(239,68,68,0.5)", bg: "rgba(239,68,68,0.1)", icon: AlertTriangle },
};

export function UnitStatusBadge({ status }: { status: TwinVerificationStatus }) {
  const meta = UNIT_STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide"
      style={{ color: meta.color, borderColor: meta.border, backgroundColor: meta.bg }}
    >
      <Icon className="h-2.5 w-2.5" /> {meta.label}
    </span>
  );
}

interface PropertyUnitCardProps {
  unit: TwinUnit;
  selected?: boolean;
  onClick?: (unit: TwinUnit) => void;
}

/** Futuristic unit card — holographic, status-colored border glow. */
export function PropertyUnitCard({ unit, selected = false, onClick }: PropertyUnitCardProps) {
  const statusMeta = UNIT_STATUS_META[unit.status];

  return (
    <motion.button
      layout
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick?.(unit)}
      className={cn(
        "dt-hud dt-hud-hover relative overflow-hidden rounded-xl p-3.5 text-left",
        selected && "dt-pulse-glow"
      )}
      style={selected ? { borderColor: statusMeta.border } : undefined}
    >
      {unit.status !== "VERIFIED" && (
        <span
          className="pointer-events-none absolute -right-5 -top-5 h-14 w-14 rounded-full opacity-30 blur-xl"
          style={{ backgroundColor: statusMeta.color }}
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-black tracking-tight text-[#F8FAFC]">{unit.number}</span>
        <UnitStatusBadge status={unit.status} />
      </div>

      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
        {unit.type.replace(/_/g, " ")}
      </p>

      <div className="mt-3 space-y-1.5 border-t border-[#164E73]/50 pt-2.5 text-[10px] text-[#94A3B8]">
        <span className="flex items-center gap-1.5">
          <Ruler className="h-3 w-3 text-[#00D9FF]" />
          <span className="font-semibold text-[#F8FAFC]">{unit.areaSqFt.toLocaleString("en-IN")} sq.ft</span>
        </span>
        <span className="flex items-center gap-1.5 truncate">
          <User className="h-3 w-3 text-[#8B5CF6]" />
          <span className="truncate">{unit.ownerName}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Home className="h-3 w-3 text-[#008CFF]" />
          <span className="font-semibold uppercase tracking-wide">{unit.occupancy}</span>
          <span className="ml-auto font-mono text-[9px] text-[#64748B]">{unit.taxAssessment}</span>
        </span>
      </div>

      <div className="mt-2.5">
        <div className="mb-1 flex justify-between text-[8px] font-bold uppercase tracking-widest text-[#64748B]">
          <span>Health</span>
          <span className="font-mono" style={{ color: unit.healthScore >= 90 ? "#22C55E" : "#FACC15" }}>
            {unit.healthScore}%
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-[#061426]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${unit.healthScore}%`,
              background: unit.healthScore >= 90 ? "#22C55E" : "#FACC15",
              boxShadow: `0 0 8px ${unit.healthScore >= 90 ? "rgba(34,197,94,0.6)" : "rgba(250,204,21,0.6)"}`,
            }}
          />
        </div>
      </div>
    </motion.button>
  );
}

interface PropertyUnitGridProps {
  units: TwinUnit[];
  selectedUnitId?: string | null;
  onSelectUnit?: (unit: TwinUnit) => void;
  className?: string;
}

/** Responsive grid of unit cards for the selected floor. */
export function PropertyUnitGrid({ units, selectedUnitId, onSelectUnit, className }: PropertyUnitGridProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4", className)}>
      {units.map((unit) => (
        <PropertyUnitCard
          key={unit.id}
          unit={unit}
          selected={selectedUnitId === unit.id}
          onClick={onSelectUnit}
        />
      ))}
    </div>
  );
}