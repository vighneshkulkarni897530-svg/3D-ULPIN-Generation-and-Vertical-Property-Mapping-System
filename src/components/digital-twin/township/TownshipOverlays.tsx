"use client";

import React from "react";
import { motion } from "framer-motion";
import { Building2, CheckCircle2, Layers, Maximize2, RotateCcw, Scan, TriangleAlert, X, ZoomIn, ZoomOut, type LucideIcon } from "lucide-react";
import { CAMERA_PRESET_DEFS, PLACE_VISUALIZATION_STATUS, TOWNSHIP_SITE, type CameraPresetId, type TowerDef } from "./townshipConfig";
import { cn } from "@/lib/utils";

/* ======================================================================
 * Township scene overlays — Phase 15A. Mirrors the existing digital-twin
 * HUD styling (dt-hud / #0A1B31 panels / cyan accents).
 * ==================================================================== */

/**
 * Top-left scene identity header — Phase 16A (Part 1).
 * Text is driven entirely by the Place 1 config (townshipConfig.ts) so the
 * scene identity always matches the place registry. Rendering is deterministic
 * (config constants only — no random values, timestamps or browser APIs), so
 * server and client output stay identical.
 */
export function TownshipSceneHeader({ className }: { className?: string }) {
  return (
    <div className={cn("dt-hud dt-card-accent rounded-2xl px-3.5 py-2.5 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)]", className)}>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-lg border border-[#164E73] bg-[#0A1B31] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-[#00D9FF]">
          <Building2 className="h-3 w-3" /> 3D Digital Twin
        </span>
        <span className="hidden rounded-lg border border-[#FACC15]/40 bg-[#FACC15]/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-[#FACC15] sm:inline">
          {PLACE_VISUALIZATION_STATUS}
        </span>
      </div>
      <h2 className="mt-1.5 text-base font-black tracking-tight text-[#F8FAFC] sm:text-lg">{TOWNSHIP_SITE.name}</h2>
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#94A3B8]">{TOWNSHIP_SITE.subtitle}</p>
    </div>
  );
}

/** Top-right control cluster. */
export function TownshipControlCluster({
  onIsoView,
  onLayers,
  onFullscreen,
  className,
}: {
  onIsoView: () => void;
  onLayers: () => void;
  onFullscreen: () => void;
  className?: string;
}) {
  const items: { icon: LucideIcon; label: string; onClick: () => void }[] = [
    { icon: Scan, label: "Isometric view", onClick: onIsoView },
    { icon: Layers, label: "Layers", onClick: onLayers },
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
            transition={{ delay: 0.3 + i * 0.06, duration: 0.35 }}
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

/** Bottom-center camera preset bar — every button drives the 3D camera. */
export function TownshipCameraBar({
  preset,
  onPreset,
  onZoomIn,
  onZoomOut,
  onReset,
  className,
}: {
  preset: CameraPresetId;
  onPreset: (p: CameraPresetId) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  className?: string;
}) {
  const baseBtn =
    "flex h-9 items-center justify-center rounded-xl border border-[#164E73] bg-[#061426]/90 px-2.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#94A3B8] backdrop-blur transition-all duration-200 hover:border-[#00D9FF]/60 hover:text-[#00D9FF]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.4 }}
      className={cn(
        "flex max-w-[calc(100vw-24px)] items-center gap-1 overflow-x-auto rounded-2xl border border-[#164E73] bg-[#020B18]/85 p-1.5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)] backdrop-blur-md",
        className
      )}
    >
      {(Object.keys(CAMERA_PRESET_DEFS) as CameraPresetId[]).map((id) => (
        <button
          key={id}
          onClick={() => onPreset(id)}
          title={CAMERA_PRESET_DEFS[id].title}
          className={cn(
            baseBtn,
            preset === id &&
              "border-[#00D9FF]/70 bg-[#00D9FF]/10 text-[#00D9FF] shadow-[0_0_16px_-4px_rgba(0,217,255,0.6)]"
          )}
        >
          {CAMERA_PRESET_DEFS[id].label}
        </button>
      ))}
      <span className="mx-1 h-5 w-px bg-[#164E73]" />
      <button onClick={onReset} title="Isometric reset" className={cn(baseBtn, "w-9 px-0")}>
        <RotateCcw className="h-4 w-4" />
      </button>
      <button onClick={onZoomOut} title="Zoom out" className={cn(baseBtn, "w-9 px-0")}>
        <ZoomOut className="h-4 w-4" />
      </button>
      <button onClick={onZoomIn} title="Zoom in" className={cn(baseBtn, "w-9 px-0")}>
        <ZoomIn className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

/** Bottom-right chip identifying the selected building — no invented data. */
export function TownshipSelectedChip({
  tower,
  linked = false,
  onClear,
  className,
}: {
  tower: TowerDef | null;
  /** True when the tower resolves to a real database building record. */
  linked?: boolean;
  onClear: () => void;
  className?: string;
}) {
  if (!tower) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className={cn("dt-hud dt-card-accent w-60 rounded-2xl p-3 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)]", className)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-[#00D9FF]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00D9FF] shadow-[0_0_8px_rgba(0,217,255,0.8)]" />
            Selected — {tower.typeLabel}
          </span>
          <p className="mt-1 truncate text-[13px] font-black text-[#F8FAFC]">{tower.name}</p>
          {linked ? (
            <p className="mt-0.5 flex items-center gap-1 text-[8.5px] font-semibold text-[#22C55E]">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Linked to database building record
            </p>
          ) : (
            <p className="mt-0.5 flex items-center gap-1 text-[8.5px] font-semibold text-[#FACC15]">
              <TriangleAlert className="h-2.5 w-2.5" />
              Illustrative geometry — no database link yet
            </p>
          )}
        </div>
        <button
          onClick={onClear}
          title="Clear selection"
          className="rounded-md border border-[#164E73] bg-[#061426] p-1 text-[#94A3B8] transition-colors hover:border-[#00D9FF]/50 hover:text-[#00D9FF]"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
}

