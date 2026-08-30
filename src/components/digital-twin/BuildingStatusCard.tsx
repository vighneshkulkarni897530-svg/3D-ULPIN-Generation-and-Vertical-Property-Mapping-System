"use client";

import React from "react";
import { ShieldCheck, Activity } from "lucide-react";

type StatusTone = "success" | "cyan";

interface BuildingStatusCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: StatusTone;
}

/** Compact status card (verification / system) with a glowing live dot. */
export function BuildingStatusCard({
  label,
  value,
  icon,
  tone = "success",
}: BuildingStatusCardProps) {
  const dotColor = tone === "success" ? "#22C55E" : "#00D9FF";
  const textColor = tone === "success" ? "#22C55E" : "#00D9FF";

  return (
    <div className="dt-hud dt-hud-hover dt-card-accent flex items-center gap-3 rounded-xl px-4 py-3.5">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-[#061426]"
        style={{ borderColor: `${dotColor}55` }}
      >
        {icon ?? (
          <ShieldCheck className="h-4 w-4" style={{ color: textColor }} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]">{label}</p>
        <p className="flex items-center gap-1.5 text-sm font-black tracking-tight text-[#F8FAFC]">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: dotColor, boxShadow: `0 0 8px ${dotColor}` }}
          />
          <span style={{ color: textColor }}>{value}</span>
        </p>
      </div>
    </div>
  );
}