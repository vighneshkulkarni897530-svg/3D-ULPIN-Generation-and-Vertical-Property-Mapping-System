"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
  X,
  CheckCircle2,
  ChevronDown,
  Navigation,
  Home,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import { useDigitalTwinInspection } from "@/context/DigitalTwinInspectionContext";
import {
  TOWERS,
  TOWNSHIP_SITE,
  type TowerDef,
} from "../township/townshipConfig";
import type { Building as GisBuilding, Floor, LandParcel, PropertyUnit } from "@/types/gis";
import type { PropertyItem } from "@/types";
import type { ExplicitFloor, TownshipFloorMode } from "../township/townshipData";
import { cn } from "@/lib/utils";

interface InspectionToolbarProps {
  className?: string;
  onResetCamera?: () => void;
  openDiscrepancyCount?: number;
  towers?: TowerDef[];
  selectedTower?: TowerDef | null;
  onSelectTower?: (id: string | null) => void;
  linkedBuilding?: GisBuilding | null;
  linkedFloors?: Floor[];
  linkedUnits?: PropertyUnit[];
  parcel?: LandParcel | null;
  property?: PropertyItem | null;
  explicitFloors?: ExplicitFloor[];
  selectedLevel?: number | null;
  onSelectLevel?: (level: number | null) => void;
  selectedUnitId?: string | null;
  onSelectUnit?: (id: string | null) => void;
  floorMode?: TownshipFloorMode;
  onFloorModeChange?: (mode: TownshipFloorMode) => void;
  onFocusTower?: (tower: TowerDef) => void;
  onOpenProperty?: () => void;
}

const FLOOR_MODES: Array<{ id: TownshipFloorMode; label: string }> = [
  { id: "all", label: "ALL" },
  { id: "show", label: "SHOW" },
  { id: "hide", label: "HIDE" },
  { id: "isolate", label: "ISOLATE" },
  { id: "explode", label: "EXPLODE" },
];

export function InspectionToolbar({
  className,
  onResetCamera,
  openDiscrepancyCount = 0,
  towers = TOWERS,
  selectedTower = null,
  onSelectTower,
  linkedBuilding = null,
  linkedFloors = [],
  linkedUnits = [],
  parcel = null,
  property = null,
  explicitFloors = [],
  selectedLevel = null,
  onSelectLevel,
  selectedUnitId = null,
  onSelectUnit,
  floorMode = "all",
  onFloorModeChange,
  onFocusTower,
  onOpenProperty,
}: InspectionToolbarProps) {
  const {
    selectedBuildingId,
    buildingIsolation,
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

  // Active dropdown state: 'overview' | 'building' | 'floors' | null
  const [activeDropdown, setActiveDropdown] = useState<"overview" | "building" | "floors" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleReset = () => {
    setActiveDropdown(null);
    resetInspection();
    onResetCamera?.();
  };

  const handleToggleDropdown = (mode: "overview" | "building" | "floors") => {
    if (activeDropdown === mode) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(mode);
      setInspectionMode(mode === "floors" ? "floor" : mode);
    }
  };

  const currentBuildingName = linkedBuilding?.name ?? selectedTower?.name ?? "Tower B";
  const currentBuildingCode = linkedBuilding?.buildingCode ?? `BLDG-LR-${selectedTower?.id?.replace("tower-", "").toUpperCase() ?? "B"}`;
  const totalFloorsCount = linkedFloors.length > 0 ? linkedFloors.length : (selectedTower?.floors ?? 20);
  const totalUnitsCount = linkedUnits.length > 0 ? linkedUnits.length : totalFloorsCount * 4;
  const heightM = (totalFloorsCount * 3.1).toFixed(1);
  const societyId = parcel?.id ?? linkedBuilding?.parcelId ?? "PARCEL-MH-PUN-074";

  // Sorted list of floors for the floor dropdown
  const sortedFloors = explicitFloors.length > 0
    ? [...explicitFloors].sort((a, b) => b.floorNumber - a.floorNumber)
    : Array.from({ length: totalFloorsCount }, (_, i) => ({
        id: `floor-${totalFloorsCount - i - 1}`,
        floorNumber: totalFloorsCount - i - 1,
        name: totalFloorsCount - i - 1 === 0 ? "Ground Floor" : `Floor ${totalFloorsCount - i - 1}`,
      }));

  // Units on the selected floor
  const unitsOnSelectedFloor = linkedUnits.filter(
    (u) => u.floorId === explicitFloors.find((f) => f.floorNumber === selectedLevel)?.id
  );

  return (
    <div ref={dropdownRef} className="relative">
      <nav
        aria-label="3D Property Inspection Controls"
        className={cn(
          "dt-hud dt-card-accent flex flex-wrap items-center gap-1 rounded-2xl p-1.5 shadow-[0_12px_32px_-10px_rgba(0,0,0,0.8)] backdrop-blur-md border border-cyan-500/30 bg-slate-950/90",
          className
        )}
      >
        {/* ── Mode Switchers with Interactive Dropdowns ── */}
        <div className="flex items-center gap-0.5 border-r border-slate-700/60 pr-1.5">
          {/* 1. OVERVIEW BUTTON */}
          <button
            type="button"
            onClick={() => handleToggleDropdown("overview")}
            title="Township & Cadastre Overview"
            aria-expanded={activeDropdown === "overview"}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-all",
              activeDropdown === "overview"
                ? "border border-cyan-400 bg-cyan-500/25 text-cyan-200 shadow-[0_0_12px_rgba(0,217,255,0.4)]"
                : "text-slate-300 hover:bg-slate-900 hover:text-white"
            )}
          >
            <Compass className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Overview</span>
            <ChevronDown className={cn("h-3 w-3 transition-transform text-slate-400", activeDropdown === "overview" && "rotate-180 text-cyan-300")} />
          </button>

          {/* 2. BUILDING BUTTON */}
          <button
            type="button"
            onClick={() => handleToggleDropdown("building")}
            title="Select and Inspect Building"
            aria-expanded={activeDropdown === "building"}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-all",
              activeDropdown === "building"
                ? "border border-cyan-400 bg-cyan-500/25 text-cyan-200 shadow-[0_0_12px_rgba(0,217,255,0.4)]"
                : "text-slate-300 hover:bg-slate-900 hover:text-white"
            )}
          >
            <Building2 className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{currentBuildingName}</span>
            <ChevronDown className={cn("h-3 w-3 transition-transform text-slate-400", activeDropdown === "building" && "rotate-180 text-cyan-300")} />
          </button>

          {/* 3. FLOORS BUTTON */}
          <button
            type="button"
            onClick={() => handleToggleDropdown("floors")}
            title="Select and Inspect Floors"
            aria-expanded={activeDropdown === "floors"}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-all",
              activeDropdown === "floors"
                ? "border border-cyan-400 bg-cyan-500/25 text-cyan-200 shadow-[0_0_12px_rgba(0,217,255,0.4)]"
                : "text-slate-300 hover:bg-slate-900 hover:text-white"
            )}
          >
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">
              {selectedLevel !== null ? `Floor ${selectedLevel}` : "Floors"}
            </span>
            <ChevronDown className={cn("h-3 w-3 transition-transform text-slate-400", activeDropdown === "floors" && "rotate-180 text-cyan-300")} />
          </button>
        </div>

        {/* ── Inspection Features ── */}
        <div className="flex items-center gap-0.5 border-r border-slate-700/60 pr-1.5">
          <button
            type="button"
            onClick={toggleBuildingIsolation}
            disabled={!selectedTower}
            title={
              selectedTower
                ? buildingIsolation
                  ? "Exit Building Isolation"
                  : "Isolate Selected Building"
                : "Select a building to isolate"
            }
            aria-pressed={buildingIsolation}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-all",
              !selectedTower && "cursor-not-allowed opacity-40",
              buildingIsolation
                ? "border border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                : "text-slate-300 hover:bg-slate-900 hover:text-white"
            )}
          >
            <Box className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden md:inline">{buildingIsolation ? "Isolated" : "Isolate"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const newMode = floorMode === "explode" ? "all" : "explode";
              setFloorMode(newMode);
              onFloorModeChange?.(newMode);
            }}
            disabled={!selectedTower}
            title={
              selectedTower
                ? floorMode === "explode"
                  ? "Collapse Floor Slices"
                  : "Explode Building Floor Slices"
                : "Select a building to explode floors"
            }
            aria-pressed={floorMode === "explode"}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-all",
              !selectedTower && "cursor-not-allowed opacity-40",
              floorMode === "explode"
                ? "border border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                : "text-slate-300 hover:bg-slate-900 hover:text-white"
            )}
          >
            <Maximize2 className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden md:inline">{floorMode === "explode" ? "Exploded" : "Explode"}</span>
          </button>

          <button
            type="button"
            onClick={toggleDiscrepancyOverlay}
            title={discrepancyOverlay ? "Hide Spatial Discrepancies" : "Show Spatial Discrepancies"}
            aria-pressed={discrepancyOverlay}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-all",
              discrepancyOverlay
                ? "border border-rose-400 bg-rose-500/20 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                : "text-slate-300 hover:bg-slate-900 hover:text-white"
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
            <span className="hidden md:inline">Flags</span>
            {openDiscrepancyCount > 0 && (
              <span className="rounded-full bg-red-500/30 px-1.5 py-0.2 font-mono text-[8.5px] text-red-300">
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
            title={shadowAnalysis ? "Hide Solar Analysis" : "Show Solar & Shadow Analysis"}
            aria-pressed={shadowAnalysis}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-all",
              shadowAnalysis
                ? "border border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                : "text-slate-300 hover:bg-slate-900 hover:text-white"
            )}
          >
            <SunMedium className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden md:inline">Solar</span>
          </button>

          <button
            type="button"
            onClick={toggleMeasurementMode}
            title={measurementMode ? "Disable 3D Measurement" : "Enable 3D Measurement (Click 2 points)"}
            aria-pressed={measurementMode}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-all",
              measurementMode
                ? "border border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(0,217,255,0.3)]"
                : "text-slate-300 hover:bg-slate-900 hover:text-white"
            )}
          >
            <Ruler className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden md:inline">Measure</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            title="Reset Inspection & View"
            className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-slate-400 transition-colors hover:bg-slate-900 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Reset</span>
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          DROPDOWN PANELS (Rendered on-demand when active)
         ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {/* ── DROPDOWN 1: OVERVIEW ── */}
        {activeDropdown === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 top-[calc(100%+8px)] z-50 w-[330px] sm:w-[360px] rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
          >
            <div className="flex items-start justify-between border-b border-cyan-500/30 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-400">
                  <Compass className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                    Cadastral Site Overview
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400">
                    {TOWNSHIP_SITE.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDropdown(null)}
                className="rounded-lg border border-slate-700 bg-slate-900 p-1 text-slate-400 hover:border-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-2 text-[10px]">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Survey No</span>
                <span className="font-mono font-extrabold text-cyan-300">{TOWNSHIP_SITE.surveyNo}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Parcel ID</span>
                <span className="font-mono font-bold text-slate-200">{societyId}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Locality</span>
                <span className="font-semibold text-slate-200">{TOWNSHIP_SITE.village}, {TOWNSHIP_SITE.taluka}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">District & State</span>
                <span className="font-semibold text-slate-200">{TOWNSHIP_SITE.district}, {TOWNSHIP_SITE.state} - {TOWNSHIP_SITE.pin}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Coordinates (WGS 84)</span>
                <span className="font-mono text-cyan-300 font-bold">{TOWNSHIP_SITE.center.lat}° N, {TOWNSHIP_SITE.center.lng}° E</span>
              </div>
              <div className="flex items-center justify-between pb-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Base MSL Elevation</span>
                <span className="font-mono font-bold text-slate-200">582.4 m above sea level</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-800 pt-3">
              <Link
                href={`/map?society=${societyId}`}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400 transition-all"
              >
                <Navigation className="h-3.5 w-3.5" /> 2D GIS Map
              </Link>
              <Link
                href={`/society/${societyId}`}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all"
              >
                <Home className="h-3.5 w-3.5" /> Society Portal
              </Link>
            </div>
          </motion.div>
        )}

        {/* ── DROPDOWN 2: BUILDING SELECTION & ACTIONS ── */}
        {activeDropdown === "building" && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 top-[calc(100%+8px)] z-50 w-[340px] sm:w-[380px] rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
          >
            <div className="flex items-start justify-between border-b border-cyan-500/30 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-400">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                    Building Selector &amp; Details
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400">
                    Choose tower to inspect or execute operations
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDropdown(null)}
                className="rounded-lg border border-slate-700 bg-slate-900 p-1 text-slate-400 hover:border-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Building Selection Carousel / Grid */}
            <div className="mt-3">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Select Building Tower
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {towers.map((t) => {
                  const isSel = selectedTower?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        onSelectTower?.(t.id);
                        if (onFocusTower) onFocusTower(t);
                      }}
                      className={cn(
                        "flex items-center justify-between rounded-xl border p-2 text-left transition-all",
                        isSel
                          ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-[0_0_10px_rgba(0,217,255,0.3)]"
                          : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                      )}
                    >
                      <div>
                        <span className="text-[10px] font-black block">{t.name}</span>
                        <span className="font-mono text-[8px] text-slate-400">{t.floors} Fl · {(t.floors * 3.1).toFixed(0)}m</span>
                      </div>
                      {isSel && <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Building Details Summary */}
            <div className="mt-3 rounded-xl border border-slate-800/90 bg-slate-900/50 p-2.5 space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                <span className="text-[9px] font-bold uppercase text-slate-400">Building Code</span>
                <span className="font-mono font-bold text-cyan-300">{currentBuildingCode}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                <span className="text-[9px] font-bold uppercase text-slate-400">Total Height & Floors</span>
                <span className="font-mono text-slate-200">{totalFloorsCount} Floors ({heightM} m)</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                <span className="text-[9px] font-bold uppercase text-slate-400">Total Units</span>
                <span className="font-bold text-slate-200">{totalUnitsCount} Units (2 &amp; 3 BHK)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase text-slate-400">Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-400 text-[9px]">
                  <CheckCircle2 className="h-3 w-3" /> Verified &amp; Active
                </span>
              </div>
            </div>

            {/* Interactive Operations Grid */}
            <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => {
                  toggleBuildingIsolation();
                  setActiveDropdown(null);
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-[9.5px] font-black uppercase tracking-wider transition-all",
                  buildingIsolation
                    ? "border-amber-400 bg-amber-500/20 text-amber-300"
                    : "border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
                )}
              >
                {buildingIsolation ? <EyeOff className="h-3.5 w-3.5 text-amber-400" /> : <Eye className="h-3.5 w-3.5 text-cyan-400" />}
                {buildingIsolation ? "Show All" : "Isolate"}
              </button>

              <button
                type="button"
                onClick={() => {
                  const newMode = floorMode === "explode" ? "all" : "explode";
                  setFloorMode(newMode);
                  onFloorModeChange?.(newMode);
                  setActiveDropdown(null);
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-[9.5px] font-black uppercase tracking-wider transition-all",
                  floorMode === "explode"
                    ? "border-cyan-400 bg-cyan-500/25 text-cyan-200"
                    : "border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
                )}
              >
                <Maximize2 className="h-3.5 w-3.5 text-cyan-400" />
                {floorMode === "explode" ? "Collapse" : "Explode"}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenProperty) onOpenProperty();
                  setActiveDropdown(null);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-[9.5px] font-black uppercase tracking-wider text-slate-200 hover:border-cyan-400 hover:text-cyan-300 transition-all"
              >
                <Home className="h-3.5 w-3.5 text-cyan-400" /> Property Details
              </button>

              <Link
                href={`/map?society=${societyId}&building=${selectedTower?.id ?? "B-LR-B"}`}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-2 text-[9.5px] font-black uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400 transition-all"
              >
                <Navigation className="h-3.5 w-3.5 text-emerald-400" /> View in 2D GIS
              </Link>
            </div>
          </motion.div>
        )}

        {/* ── DROPDOWN 3: FLOOR SELECTION & EXPLORATION ── */}
        {activeDropdown === "floors" && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 top-[calc(100%+8px)] z-50 w-[350px] sm:w-[400px] rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
          >
            <div className="flex items-start justify-between border-b border-cyan-500/30 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-400">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                    Floor Explorer &amp; Slicer
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400">
                    {currentBuildingName} · {totalFloorsCount} Floor Levels
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDropdown(null)}
                className="rounded-lg border border-slate-700 bg-slate-900 p-1 text-slate-400 hover:border-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Floor Visualization Mode Toggles */}
            <div className="mt-3">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Floor View Mode
              </label>
              <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-1">
                {FLOOR_MODES.map((m) => {
                  const isActive = floorMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setFloorMode(m.id);
                        onFloorModeChange?.(m.id);
                      }}
                      className={cn(
                        "flex-1 rounded-lg py-1 text-[8.5px] font-black uppercase tracking-wider transition-all",
                        isActive
                          ? "bg-cyan-500/25 border border-cyan-400/50 text-cyan-200 shadow-[0_0_8px_rgba(0,217,255,0.3)]"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Floor Level Selection List / Grid */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Select Floor Level ({sortedFloors.length} levels)
                </label>
                <button
                  type="button"
                  onClick={() => onSelectLevel?.(null)}
                  className="text-[9px] font-bold text-cyan-400 hover:underline"
                >
                  Show Whole Building
                </button>
              </div>

              <div className="max-h-[190px] overflow-y-auto space-y-1 pr-1">
                {sortedFloors.map((f) => {
                  const isSel = selectedLevel === f.floorNumber;
                  const elev = (f.floorNumber * 3.1).toFixed(1);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        onSelectLevel?.(f.floorNumber);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-3 py-1.5 text-left transition-all",
                        isSel
                          ? "border-cyan-400 bg-cyan-500/25 text-cyan-200 shadow-[0_0_10px_rgba(0,217,255,0.3)]"
                          : "border-slate-800/80 bg-slate-900/50 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-md font-mono text-[9px] font-extrabold",
                            isSel ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300"
                          )}
                        >
                          {f.floorNumber}
                        </span>
                        <span className="text-[10px] font-bold">{f.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[8.5px] text-slate-400">{elev} m</span>
                        {isSel && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Units on Selected Floor (if any) */}
            {selectedLevel !== null && (
              <div className="mt-3 border-t border-slate-800 pt-2.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Property Units on Floor {selectedLevel}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {unitsOnSelectedFloor.length > 0 ? (
                    unitsOnSelectedFloor.map((u) => {
                      const isUnitSel = selectedUnitId === u.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            onSelectUnit?.(u.id);
                          }}
                          className={cn(
                            "flex items-center justify-between rounded-xl border p-2 text-left transition-all",
                            isUnitSel
                              ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                              : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700"
                          )}
                        >
                          <div>
                            <span className="text-[9.5px] font-bold block">{u.unitNumber}</span>
                            <span className="font-mono text-[8px] text-slate-400">{u.area ?? 1050} sq.ft</span>
                          </div>
                          <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">
                            {u.verificationStatus ?? "VERIFIED"}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="col-span-2 rounded-lg border border-dashed border-slate-800 bg-slate-900/30 p-2 text-center text-[9px] text-slate-400">
                      Standard Residential Units 01, 02, 03, 04 on this level.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-3 border-t border-slate-800 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveDropdown(null)}
                className="w-full rounded-xl bg-cyan-500 px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-950 hover:bg-cyan-400 transition-colors shadow-tech-cyan"
              >
                Done / Apply Floor Slicing
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
