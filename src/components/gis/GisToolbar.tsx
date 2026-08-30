"use client";

import * as React from "react";
import {
  MousePointer2,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Ruler,
  Layers,
  Box,
  Map as MapIcon,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MapMode = "2d" | "3d";

interface GisToolbarProps {
  mode: MapMode;
  onModeChange: (mode: MapMode) => void;
  tool: "select" | "pan";
  onToolChange: (tool: "select" | "pan") => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onFitSelection: () => void;
  onOpenLayers: () => void;
  layersOpen: boolean;
  onMeasure: () => void;
  processing: boolean;
  hasSelection: boolean;
}

/**
 * Professional GIS toolbar. Every control is a real action:
 *  - Select / Pan switch the interaction tool,
 *  - Zoom / Reset / Fit drive the Leaflet map instance,
 *  - Layers toggles the left panel,
 *  - 2D/3D switches between map and simplified 3D viewer,
 *  - Measure is explicitly labelled a demo tool (not legal measurement).
 */
export function GisToolbar({
  mode,
  onModeChange,
  tool,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onResetView,
  onFitSelection,
  onOpenLayers,
  layersOpen,
  onMeasure,
  processing,
  hasSelection,
}: GisToolbarProps) {
  const toolButton = (def: {
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick?: () => void;
    active?: boolean;
    disabled?: boolean;
    demo?: boolean;
  }) => (
    <span
      key={def.id}
      className={cn(
        "group relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
        def.active
          ? "border-cyan-400 bg-cyan-500/15 text-cyan-300"
          : "border-slate-700 bg-slate-900 text-slate-400 hover:border-cyan-500/50 hover:text-white",
        def.disabled && "cursor-not-allowed opacity-40 hover:border-slate-700 hover:text-slate-400",
      )}
    >
      <button
        type="button"
        aria-label={def.label}
        title={def.label + (def.demo ? " (demo tool — not for legal measurement)" : "")}
        disabled={def.disabled}
        onClick={def.onClick}
        className="flex h-full w-full items-center justify-center"
      >
        {def.icon}
      </button>
      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-semibold text-slate-200 shadow-xl group-hover:block">
        {def.label}
        {def.demo && (
          <span className="ml-1 rounded bg-amber-500/20 px-1 py-px text-[8px] font-bold uppercase text-amber-400">
            demo
          </span>
        )}
      </span>
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-950 px-2 py-2 sm:px-3">
      {/* Tool group */}
      <div className="flex items-center gap-1" role="group" aria-label="Map tools">
        {toolButton({ id: "select", label: "Select", icon: <MousePointer2 className="h-4 w-4" />, active: tool === "select", onClick: () => onToolChange("select") })}
        {toolButton({ id: "pan", label: "Pan", icon: <Hand className="h-4 w-4" />, active: tool === "pan", onClick: () => onToolChange("pan") })}
      </div>

      <span className="h-6 w-px bg-slate-800" aria-hidden />

      {/* View group */}
      <div className="flex items-center gap-1" role="group" aria-label="View controls">
        {toolButton({ id: "zoom-in", label: "Zoom in", icon: <ZoomIn className="h-4 w-4" />, onClick: onZoomIn })}
        {toolButton({ id: "zoom-out", label: "Zoom out", icon: <ZoomOut className="h-4 w-4" />, onClick: onZoomOut })}
        {toolButton({ id: "reset", label: "Reset view", icon: <Maximize2 className="h-4 w-4" />, onClick: onResetView })}
        {toolButton({ id: "fit", label: hasSelection ? "Fit to selection" : "Fit to all parcels", icon: <FitGlyph />, onClick: onFitSelection })}
        {toolButton({ id: "measure", label: "Measure distance", icon: <Ruler className="h-4 w-4" />, onClick: onMeasure, demo: true })}
      </div>

      <span className="h-6 w-px bg-slate-800" aria-hidden />

      {/* Mode switch */}
      <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1">
        <button
          type="button"
          aria-label="Switch to 2D GIS map"
          title="2D GIS map"
          onClick={() => onModeChange("2d")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors",
            mode === "2d" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950" : "text-slate-400 hover:text-white",
          )}
        >
          <MapIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">2D GIS</span>
        </button>
        <button
          type="button"
          aria-label="Switch to 3D visualization"
          title="3D visualization"
          onClick={() => onModeChange("3d")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors",
            mode === "3d" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950" : "text-slate-400 hover:text-white",
          )}
        >
          {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Box className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">3D</span>
        </button>
      </div>

      <span className="ml-auto flex items-center gap-2">
        {processing && (
          <span className="hidden items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-widest text-cyan-400 sm:flex">
            <Loader2 className="h-3 w-3 animate-spin" /> Reconstructing…
          </span>
        )}
        <button
          type="button"
          aria-label="Toggle layers panel"
          title="Layers panel"
          onClick={onOpenLayers}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors",
            layersOpen
              ? "border-cyan-400 bg-cyan-500/15 text-cyan-300"
              : "border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/50 hover:text-white",
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Layers</span>
        </button>
      </span>
    </div>
  );
}

function FitGlyph() {
  return (
    <span className="relative block h-4 w-4">
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-current" />
      <span className="absolute inset-0.5 rounded-sm border border-current opacity-70" />
    </span>
  );
}