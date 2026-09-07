"use client";

import React from "react";
import { motion } from "framer-motion";
import type { TwinBuildingInfo, TwinFloor } from "@/data/mockDigitalTwin";
import { fadeUp, staggerContainer } from "./motion";

interface BuildingAnalyticsProps {
  /** Canonical twin building (Phase 20 — real values, never the mock strip). */
  building: TwinBuildingInfo;
  /** Canonical twin floors — unit verification states are derived from these. */
  floors: TwinFloor[];
}

/** Mini animated line chart — pure SVG with glowing stroke. */
function MiniChart({ points, color }: { points: number[]; color: string }) {
  const w = 64;
  const h = 26;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const coords = points.map((p, i) => [i * step, h - ((p - min) / range) * (h - 4) - 2]);

  const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs>
        <linearGradient id={`mg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaPath}
        fill={`url(#mg-${color.replace("#", "")})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      />
      <motion.path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeInOut", delay: 0.3 }}
      />
    </svg>
  );
}

/** Deterministic illustrative sparkline ramping to the REAL value. */
function sparkline(value: number): number[] {
  const v = Math.max(0, value);
  return [0.7, 0.78, 0.86, 0.93, 1].map((f) => Math.round(v * f));
}

/** Analytics strip — derived from the canonical twin view (Phase 20). */
export function BuildingAnalytics({ building, floors }: BuildingAnalyticsProps) {
  const units = React.useMemo(() => floors.flatMap((f) => f.units), [floors]);
  const verified = units.filter((u) => u.status === "VERIFIED").length;
  const pending = units.filter((u) => u.status === "PENDING" || u.status === "UNDER_REVIEW").length;
  const disputed = units.filter((u) => u.status === "DISPUTED").length;

  const data: { label: string; value: number; color: string }[] = [
    { label: "Total Floors", value: building.totalFloors, color: "#00D9FF" },
    { label: "Property Units", value: building.totalUnits, color: "#008CFF" },
    { label: "Verified Units", value: verified, color: "#22C55E" },
    { label: "Pending Units", value: pending, color: "#FACC15" },
    { label: "Disputed Units", value: disputed, color: "#EF4444" },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5"
    >
      {data.map((item, i) => (
        <motion.div
          key={item.label}
          variants={fadeUp}
          custom={i}
          whileHover={{ y: -3 }}
          className="dt-hud dt-hud-hover dt-card-accent flex items-center justify-between gap-2 rounded-xl px-4 py-3.5"
        >
          <div className="min-w-0">
            <span className="block truncate text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">
              {item.label}
            </span>
            <span className="mt-0.5 block text-lg font-black tabular-nums tracking-tight text-[#F8FAFC]">
              {item.value}
            </span>
          </div>
          <MiniChart points={sparkline(item.value)} color={item.color} />
        </motion.div>
      ))}
    </motion.div>
  );
}