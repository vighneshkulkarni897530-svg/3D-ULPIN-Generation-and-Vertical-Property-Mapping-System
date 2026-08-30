"use client";

import React from "react";
import { motion } from "framer-motion";
import { Cpu } from "lucide-react";
import { TWIN_SYSTEM_STATUS } from "@/data/mockDigitalTwin";
import { fadeUp, staggerContainer } from "./motion";

function barColor(value: number) {
  if (value >= 100) return "from-[#22C55E] to-[#00D9FF]";
  if (value >= 90) return "from-[#00D9FF] to-[#008CFF]";
  return "from-[#FACC15] to-[#F59E0B]";
}

/** Glowing horizontal progress bars for building system health. */
export function SystemStatusPanel() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="dt-hud dt-card-accent rounded-2xl p-5"
    >
      <div className="mb-4 flex items-center gap-2">
        <Cpu className="h-4 w-4 text-[#00D9FF]" />
        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-[#F8FAFC]">
          Building System Status
        </h3>
      </div>

      <div className="space-y-3.5">
        {TWIN_SYSTEM_STATUS.map((s, i) => (
          <motion.div key={s.label} variants={fadeUp} custom={i}>
            <div className="mb-1 flex items-center justify-between text-[10px]">
              <span className="font-semibold text-[#94A3B8]">{s.label}</span>
              <span className="font-mono font-black tabular-nums text-[#F8FAFC]">{s.value}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#061426]">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${barColor(s.value)}`}
                initial={{ width: 0 }}
                whileInView={{ width: `${s.value}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-[#164E73] bg-[#061426] px-3 py-2 text-[9px] font-semibold text-[#94A3B8]">
        <span className="font-black text-[#22C55E]">●</span> All subsystems operational · last sync{" "}
        <span className="font-mono text-[#00D9FF]">2 min ago</span>
      </div>
    </motion.div>
  );
}