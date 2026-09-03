"use client";

import React from "react";
import {
  Building2,
  Layers,
  Box,
  SunMedium,
  Ruler,
  AlertTriangle,
  RotateCcw,
  Maximize2,
  Compass,
} from "lucide-react";
import { useDigitalTwinInspection } from "@/context/DigitalTwinInspectionContext";
import { cn } from "@/lib/utils";

interface InspectionToolbarProps {
  className?: string;
  onResetCamera?: () => void;
  openDiscrepancyCount?: number;
}

export function InspectionToolbar({
  className,
  onResetCamera,
  openDiscrepancyCount = 0,
}: InspectionToolbarProps) {
  const {
    inspectionMode,
    selectedBuildingId,
    buildingIsolation,
    floorMode,
    shadowAnalysis,
    measurementMode,
    discrepancyOverlay,
    setInspectionMode,
    toggleBuildingIsolation,
    setFloorMode,
    toggleShadowAnalysis,
    toggleMeasurementMode,
    toggleDiscrepancyOverlay,
    resetInspection,
  } = useDigitalTwinInspection();

  const handleReset = () => {
    resetInspection();
    onResetCamera?.();
  };

  return (
    <nav
      aria-label="3D Property Inspection Controls"
      className={cn(
        "dt-hud dt-card-accent flex flex-wrap items-center gap-1 rounded-xl p-1.5 shadow-[0_12px_32px_-10px_rgba(0,0,0,0.8)] backdrop-blur-md",
        className
      )}
    >
      {/* ── Mode Switchers ── */}
      <div className="flex items-center gap-0.5 border-r border-[#164E73]/60 pr-1.5">
        <button
          type="button"
          onClick={() => setInspectionMode("overview")}
          title="Township Overview (Key: 1)"
          aria-label="Township Overview"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-colors",
            inspectionMode === "overview"
              ? "border border-[#00D9FF]/70 bg-[#00D9FF]/20 text-[#00D9FF]"
              : "text-[#94A3B8] hover:bg-[#061426] hover:text-[#F8FAFC]"
          )}
        >
          <Compass className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setInspectionMode("building")}
          disabled={!selectedBuildingId}
          title={selectedBuildingId ? "Building Inspection (Key: 2)" : "Select a building first"}
          aria-label="Building Inspection"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-colors",
            !selectedBuildingId && "cursor-not-allowed opacity-40",
            inspectionMode === "building"
              ? "border border-[#00D9FF]/70 bg-[#00D9FF]/20 text-[#00D9FF]"
              : "text-[#94A3B8] hover:bg-[#061426] hover:text-[#F8FAFC]"
          )}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Building</span>
        </button>

        <button
          type="button"
          onClick={() => setInspectionMode("floor")}
          disabled={!selectedBuildingId}
          title={selectedBuildingId ? "Floor Inspection (Key: 3)" : "Select a building first"}
          aria-label="Floor Inspection"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-colors",
            !selectedBuildingId && "cursor-not-allowed opacity-40",
            inspectionMode === "floor"
              ? "border border-[#00D9FF]/70 bg-[#00D9FF]/20 text-[#00D9FF]"
              : "text-[#94A3B8] hover:bg-[#061426] hover:text-[#F8FAFC]"
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Floors</span>
        </button>
      </div>

      {/* ── Inspection Features ── */}
      <div className="flex items-center gap-0.5 border-r border-[#164E73]/60 pr-1.5">
        <button
          type="button"
          onClick={toggleBuildingIsolation}
          disabled={!selectedBuildingId}
          title={
            selectedBuildingId
              ? buildingIsolation
                ? "Exit Building Isolation"
                : "Isolate Selected Building"
              : "Select a building to isolate"
          }
          aria-pressed={buildingIsolation}
          aria-label="Isolate Building"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-colors",
            !selectedBuildingId && "cursor-not-allowed opacity-40",
            buildingIsolation
              ? "border border-[#22C55E]/70 bg-[#22C55E]/20 text-[#22C55E]"
              : "text-[#94A3B8] hover:bg-[#061426] hover:text-[#F8FAFC]"
          )}
        >
          <Box className="h-3.5 w-3.5" />
          <span className="hidden md:inline">{buildingIsolation ? "Isolated" : "Isolate"}</span>
        </button>

        <button
          type="button"
          onClick={() => setFloorMode(floorMode === "explode" ? "all" : "explode")}
          disabled={!selectedBuildingId}
          title={
            selectedBuildingId
              ? floorMode === "explode"
                ? "Collapse Floor Slices"
                : "Explode Building Floor Slices"
              : "Select a building to explode floors"
          }
          aria-pressed={floorMode === "explode"}
          aria-label="Explode Floors"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-colors",
            !selectedBuildingId && "cursor-not-allowed opacity-40",
            floorMode === "explode"
              ? "border border-[#FACC15]/70 bg-[#FACC15]/20 text-[#FACC15]"
              : "text-[#94A3B8] hover:bg-[#061426] hover:text-[#F8FAFC]"
          )}
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Explode</span>
        </button>

        <button
          type="button"
          onClick={toggleDiscrepancyOverlay}
          title={discrepancyOverlay ? "Hide Spatial Discrepancies" : "Show Spatial Discrepancies"}
          aria-pressed={discrepancyOverlay}
          aria-label="Discrepancy Flags"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-colors",
            discrepancyOverlay
              ? "border border-[#EF4444]/70 bg-[#EF4444]/20 text-[#EF4444]"
              : "text-[#94A3B8] hover:bg-[#061426] hover:text-[#F8FAFC]"
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Flags</span>
          {openDiscrepancyCount > 0 && (
            <span className="rounded-full bg-red-500/30 px-1 py-0.2 font-mono text-[8.5px] text-red-300">
              {openDiscrepancyCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Spatial Tools ── */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={toggleShadowAnalysis}
          title={shadowAnalysis ? "Hide Solar & Shadow Analysis" : "Show Solar & Shadow Analysis"}
          aria-pressed={shadowAnalysis}
          aria-label="Solar and Shadow Analysis"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-colors",
            shadowAnalysis
              ? "border border-[#FACC15]/70 bg-[#FACC15]/20 text-[#FACC15]"
              : "text-[#94A3B8] hover:bg-[#061426] hover:text-[#F8FAFC]"
          )}
        >
          <SunMedium className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Solar</span>
        </button>

        <button
          type="button"
          onClick={toggleMeasurementMode}
          title={measurementMode ? "Disable 3D Measurement" : "Enable 3D Measurement (Click 2 points)"}
          aria-pressed={measurementMode}
          aria-label="3D Measurement"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-colors",
            measurementMode
              ? "border border-[#00D9FF]/70 bg-[#00D9FF]/20 text-[#00D9FF]"
              : "text-[#94A3B8] hover:bg-[#061426] hover:text-[#F8FAFC]"
          )}
        >
          <Ruler className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Measure</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          title="Reset Inspection & View"
          aria-label="Reset Inspection"
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-[#64748B] transition-colors hover:bg-[#061426] hover:text-[#F8FAFC]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Reset</span>
        </button>
      </div>
    </nav>
  );
}
