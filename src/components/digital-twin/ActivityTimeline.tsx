"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, MapPin, FileText, AlertTriangle, Info, type LucideIcon } from "lucide-react";
import { TWIN_ACTIVITIES, TwinActivity } from "@/data/mockDigitalTwin";
import { fadeUp, staggerContainer } from "./motion";

const ICONS: Record<TwinActivity["icon"], LucideIcon> = {
  check: CheckCircle2,
  map: MapPin,
  file: FileText,
  warning: AlertTriangle,
  info: Info,
};

const TONE_STYLE: Record<TwinActivity["tone"], { color: string; bg: string; border: string }> = {
  success: { color: "#22C55E", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.35)" },
  cyan: { color: "#00D9FF", bg: "rgba(0,217,255,0.12)", border: "rgba(0,217,255,0.35)" },
  warning: { color: "#FACC15", bg: "rgba(250,204,21,0.12)", border: "rgba(250,204,21,0.35)" },
};

/** Verification activity timeline — green/cyan/yellow tone coded. */
export function DigitalTwinActivityTimeline() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="dt-hud dt-card-accent rounded-2xl p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#F8FAFC]">
          Verification Activity
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-[#22C55E]/40 bg-[#22C55E]/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-[#22C55E]">
          <span className="dt-blink h-1.5 w-1.5 rounded-full bg-[#22C55E]" /> Live feed
        </span>
      </div>

      <div className="relative space-y-0">
        <span className="absolute bottom-2 left-[15px] top-2 w-px bg-gradient-to-b from-[#00D9FF]/60 via-[#164E73] to-transparent" />
        {TWIN_ACTIVITIES.map((activity, i) => {
          const Icon = ICONS[activity.icon];
          const tone = TONE_STYLE[activity.tone];
          return (
            <motion.div key={activity.id} variants={fadeUp} custom={i} className="relative flex gap-3 pb-4 last:pb-0">
              <span
                className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border"
                style={{ color: tone.color, backgroundColor: tone.bg, borderColor: tone.border }}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-[11px] font-bold leading-snug text-[#F8FAFC]">{activity.text}</p>
                <span className="mt-0.5 block font-mono text-[9px] text-[#64748B]">{activity.time}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}