"use client";

import React from "react";
import { motion } from "framer-motion";
import { Link2, MapPin, Building2, Radio } from "lucide-react";
import { TwinBuildingInfo } from "@/data/mockDigitalTwin";
import { slideInLeft, fadeUp } from "./motion";

interface BuildingHeaderProps {
  building: TwinBuildingInfo;
  onFullscreen?: () => void;
}

/** Top banner — property identity + live/status indicators. */
export function BuildingHeader({ building, onFullscreen }: BuildingHeaderProps) {
  return (
    <motion.div
      variants={slideInLeft}
      initial="hidden"
      animate="show"
      className="dt-hud dt-card-accent flex flex-col gap-5 rounded-2xl px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-lg border border-[#164E73] bg-[#0A1B31] px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#00D9FF]">
            <Building2 className="h-3 w-3" /> Building Digital Twin
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
            Real-time Property Visualization
          </span>
          {building.dataStatus === "DEMO" && (
            <span
              className="rounded-md border border-[#FACC15]/50 bg-[#FACC15]/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-[#FACC15]"
              title="Illustrative demo dataset — not an official government cadastral record"
            >
              Demo · Not Official ULPIN
            </span>
          )}
        </div>
        <h1 className="mt-2.5 text-xl font-black tracking-tight text-[#F8FAFC] sm:text-2xl">
          {building.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#94A3B8]">
          <span className="flex items-center gap-1.5 font-mono">
            <Link2 className="h-3 w-3 text-[#00D9FF]" /> {building.propertyId}
          </span>
          <span className="flex items-center gap-1.5 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-[#008CFF]" /> {building.ulpin}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-[#8B5CF6]" /> {building.cityState}
          </span>
        </div>
      </div>

      {/* Right status cluster */}
      <div className="flex flex-wrap items-center gap-2.5">
        <motion.div
          variants={fadeUp}
          custom={0}
          className="flex items-center gap-2 rounded-xl border border-[#164E73] bg-[#0A1B31] px-3 py-2"
        >
          <span className="relative flex h-2 w-2">
            <span className="dt-blink absolute inline-flex h-full w-full rounded-full bg-[#22C55E]" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22C55E]" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#F8FAFC]">
            Live
          </span>
        </motion.div>

        <motion.div variants={fadeUp} custom={1} className="flex items-center gap-2 rounded-xl border border-[#164E73] bg-[#0A1B31] px-3 py-2">
          <Radio className="h-3.5 w-3.5 text-[#00D9FF]" />
          <span className="text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
            System: <span className="text-[#22C55E]">{building.systemStatus}</span>
          </span>
        </motion.div>

        <motion.div variants={fadeUp} custom={2} className="flex items-center gap-2 rounded-xl border border-[#22C55E]/40 bg-[#22C55E]/10 px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
          <span className="text-[10px] font-black uppercase tracking-wider text-[#22C55E]">
            {building.verificationStatus}
          </span>
        </motion.div>

        <motion.button
          variants={fadeUp}
          custom={3}
          onClick={onFullscreen}
          className="rounded-xl border border-[#164E73] bg-[#061426] p-2.5 text-[#00D9FF] transition-colors hover:border-[#00D9FF]/60 hover:shadow-[0_0_16px_-4px_rgba(0,217,255,0.5)]"
          title="Fullscreen"
        >
          <span className="pointer-events-none flex items-center justify-center">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3" />
              <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
              <path d="M3 16v3a2 2 0 0 0 2 2h3" />
              <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}