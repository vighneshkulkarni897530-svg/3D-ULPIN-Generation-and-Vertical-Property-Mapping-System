"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Building2, LayoutGrid, Home, Ruler, ShieldCheck, Activity, Box,
  type LucideIcon,
} from "lucide-react";
import { TwinBuildingInfo } from "@/data/mockDigitalTwin";
import { fadeUp, staggerContainer } from "./motion";
import { BuildingStatusCard } from "./BuildingStatusCard";

interface BuildingInfoPanelProps {
  building: TwinBuildingInfo;
  selectedFloorLabel?: string;
}

const iconMap = {
  type: Building2,
  floors: LayoutGrid,
  units: Home,
  area: Ruler,
  verify: ShieldCheck,
  system: Activity,
};

function InfoCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
}) {
  const Icon = icon;
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -2 }}
      className="dt-hud dt-hud-hover dt-card-accent flex items-center gap-3 rounded-xl px-4 py-3.5"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#164E73] bg-[#061426]">
        <Icon className="h-4 w-4 text-[#00D9FF]" style={{ color: accent }} />
      </span>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]">{label}</p>
        <p className="truncate text-sm font-black tracking-tight text-[#F8FAFC]">{value}</p>
      </div>
    </motion.div>
  );
}

/** Left vertical panel — building summary cards. */
export function BuildingInfoPanel({ building, selectedFloorLabel }: BuildingInfoPanelProps) {
  const cards: { key: keyof typeof iconMap; label: string; value: string; accent: string }[] = [
    { key: "type", label: "Building Type", value: building.type, accent: "#00D9FF" },
    { key: "floors", label: "Total Floors", value: `${building.totalFloors} Floors`, accent: "#008CFF" },
    { key: "units", label: "Total Units", value: `${building.totalUnits} Units`, accent: "#8B5CF6" },
    { key: "area", label: "Built-up Area", value: `${building.builtUpAreaSqFt.toLocaleString("en-IN")} sq.ft`, accent: "#008CFF" },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="flex h-fit flex-col gap-2"
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#00D9FF]">
          Building Information
        </span>
        {selectedFloorLabel && (
          <span className="rounded-md border border-[#164E73] bg-[#0A1B31] px-2 py-0.5 font-mono text-[9px] text-[#00D9FF]">
            {selectedFloorLabel}
          </span>
        )}
      </div>

      {cards.map((card) => (
        <InfoCard key={card.key} icon={iconMap[card.key]} label={card.label} value={card.value} accent={card.accent} />
      ))}

      <motion.div variants={fadeUp}>
        <BuildingStatusCard label="Verification Status" value={building.verificationStatus} tone="success" />
      </motion.div>
      <motion.div variants={fadeUp}>
        <BuildingStatusCard
          label="System Status"
          value={building.systemStatus}
          tone="cyan"
          icon={<Activity className="h-4 w-4" />}
        />
      </motion.div>

      <motion.div variants={fadeUp} className="dt-hud mt-1 flex items-center gap-2 rounded-xl px-4 py-2.5">
        <Box className="h-3.5 w-3.5 text-[#8B5CF6]" />
        <span className="text-[9px] font-semibold leading-relaxed text-[#94A3B8]">
          Holographic scan active · coordinates synchronized to WGS 84 · WGS 84 / UTM Zone 43N
        </span>
      </motion.div>
    </motion.div>
  );
}