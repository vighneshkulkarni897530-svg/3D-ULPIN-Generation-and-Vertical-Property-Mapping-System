"use client";

import React from "react";
import { motion } from "framer-motion";
import { Box, Layers, Grid3x3, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BuildingControlsProps {
  onBuildingView: () => void;
  onLayers: () => void;
  onFloorMode: () => void;
  onFullscreen: () => void;
  className?: string;
}

/** Floating top-right control cluster for the 3D viewer. */
export function BuildingControls({
  onBuildingView,
  onLayers,
  onFloorMode,
  onFullscreen,
  className,
}: BuildingControlsProps) {
  const items = [
    { icon: Box, label: "Building view", onClick: onBuildingView },
    { icon: Layers, label: "Layers", onClick: onLayers },
    { icon: Grid3x3, label: "Floor mode", onClick: onFloorMode },
    { icon: Maximize2, label: "Fullscreen", onClick: onFullscreen },
  ];

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.06, duration: 0.35 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={item.onClick}
            title={item.label}
            className="group relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#164E73] bg-[#061426]/90 text-[#00D9FF] backdrop-blur transition-colors hover:border-[#00D9FF]/60 hover:shadow-[0_0_18px_-4px_rgba(0,217,255,0.5)]"
          >
            <Icon className="h-4 w-4" />
            <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md border border-[#164E73] bg-[#020B18]/95 px-2 py-0.5 text-[9px] font-semibold text-[#94A3B8] opacity-0 transition-opacity group-hover:opacity-100">
              {item.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}