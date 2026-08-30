"use client";

import React from "react";
import { motion } from "framer-motion";
import { MousePointer2, Hand, Rotate3d, RotateCcw, ZoomIn, ZoomOut, type LucideIcon } from "lucide-react";
import { ViewerTool } from "./Building3DViewer";
import { cn } from "@/lib/utils";

interface ViewerToolbarProps {
  tool: ViewerTool;
  onToolChange: (tool: ViewerTool) => void;
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  className?: string;
}

/** Floating bottom toolbar — selection / pan / rotate tools + reset & zoom. */
export function ViewerToolbar({
  tool,
  onToolChange,
  onReset,
  onZoomIn,
  onZoomOut,
  className,
}: ViewerToolbarProps) {
  const tools: { id: ViewerTool; icon: LucideIcon; label: string }[] = [
    { id: "select", icon: MousePointer2, label: "Select tool" },
    { id: "pan", icon: Hand, label: "Pan tool" },
    { id: "rotate", icon: Rotate3d, label: "Rotate tool" },
  ];

  const baseBtn =
    "flex h-9 w-9 items-center justify-center rounded-xl border border-[#164E73] bg-[#061426]/90 text-[#94A3B8] backdrop-blur transition-all duration-200 hover:border-[#00D9FF]/60 hover:text-[#00D9FF]";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="flex items-center gap-1 rounded-2xl border border-[#164E73] bg-[#020B18]/80 p-1.5 backdrop-blur-md shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)]"
      >
        {tools.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onToolChange(t.id)}
              title={t.label}
              className={cn(
                baseBtn,
                active &&
                  "border-[#00D9FF]/70 bg-[#00D9FF]/10 text-[#00D9FF] shadow-[0_0_16px_-4px_rgba(0,217,255,0.6)]"
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}

        <span className="mx-1 h-5 w-px bg-[#164E73]" />

        <button onClick={onReset} title="Reset view" className={baseBtn}>
          <RotateCcw className="h-4 w-4" />
        </button>
        <button onClick={onZoomOut} title="Zoom out" className={baseBtn}>
          <ZoomOut className="h-4 w-4" />
        </button>
        <button onClick={onZoomIn} title="Zoom in" className={baseBtn}>
          <ZoomIn className="h-4 w-4" />
        </button>
      </motion.div>
    </div>
  );
}