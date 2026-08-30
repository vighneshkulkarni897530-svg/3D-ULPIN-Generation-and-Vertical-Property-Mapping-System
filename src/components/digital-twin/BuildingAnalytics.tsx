"use client";

import React from "react";
import { motion } from "framer-motion";
import { TWIN_ANALYTICS } from "@/data/mockDigitalTwin";
import { fadeUp, staggerContainer } from "./motion";

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

/** Analytics strip — Total Floors, Units, Verified, Pending, Disputed. */
export function BuildingAnalytics() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5"
    >
      {TWIN_ANALYTICS.map((item, i) => (
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
          <MiniChart points={item.sparkline} color={item.color} />
        </motion.div>
      ))}
    </motion.div>
  );
}