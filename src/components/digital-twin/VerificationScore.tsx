"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

interface VerificationScoreProps {
  score: number; // 0-100
  size?: number;
  stroke?: number;
}

/** Circular verification score gauge with cyan → electric blue gradient. */
export function VerificationScore({ score, size = 132, stroke = 9 }: VerificationScoreProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  const gradId = "dt-score-grad";
  const glowId = "dt-score-glow";

  return (
    <div className="relative flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D9FF" />
            <stop offset="100%" stopColor="#008CFF" />
          </linearGradient>
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(22,78,115,0.45)"
          strokeWidth={stroke}
        />
        {/* Progress — animated */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          filter={`url(#${glowId})`}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-2xl font-black tabular-nums tracking-tight text-[#F8FAFC]"
        >
          {score}%
        </motion.span>
        <span className="mt-0.5 text-[8px] font-black uppercase tracking-[0.22em] text-[#94A3B8]">
          Verification Score
        </span>
      </div>

      <span className="mt-2 flex items-center gap-1.5 rounded-full border border-[#22C55E]/40 bg-[#22C55E]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#22C55E]">
        <ShieldCheck className="h-3 w-3" /> Bhu-Aadhaar Sealed
      </span>
    </div>
  );
}