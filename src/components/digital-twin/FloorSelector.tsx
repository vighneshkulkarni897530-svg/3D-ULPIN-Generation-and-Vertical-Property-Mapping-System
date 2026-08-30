"use client";

import React from "react";
import { motion } from "framer-motion";
import { Layers, ArrowUpDown } from "lucide-react";
import { TwinFloor } from "@/data/mockDigitalTwin";
import { cn } from "@/lib/utils";

interface FloorSelectorProps {
  floors: TwinFloor[];
  selectedLevel: number;
  onSelect: (level: number) => void;
  className?: string;
}

/** Horizontal floor chips — used on the Floor Explorer / unit panel header. */
export function FloorSelector({ floors, selectedLevel, onSelect, className }: FloorSelectorProps) {
  const ordered = [...floors].sort((a, b) => b.level - a.level);

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {ordered.map((floor) => {
        const selected = floor.level === selectedLevel;
        return (
          <motion.button
            key={floor.level}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(floor.level)}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-[10px] font-black transition-all duration-200",
              selected
                ? "border-[#00D9FF]/70 bg-[#00D9FF]/15 text-[#00D9FF] shadow-[0_0_14px_-4px_rgba(0,217,255,0.6)]"
                : "border-[#164E73] bg-[#0A1B31] text-[#94A3B8] hover:text-[#F8FAFC]"
            )}
          >
            {floor.level === 0 ? "G" : floor.level}
          </motion.button>
        );
      })}
      <span className="ml-1 flex items-center gap-1 text-[9px] text-[#64748B]">
        <ArrowUpDown className="h-3 w-3" /> {Math.max(0, ...floors.map((f) => f.level))}F+0 structure
      </span>
    </div>
  );
}