"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Township3DViewerDynamic, Township3DViewerHandle } from "@/components/digital-twin/township/Township3DViewerDynamic";
import {
  TownshipCameraBar,
  TownshipControlCluster,
  TownshipSceneHeader,
  TownshipSelectedChip,
} from "@/components/digital-twin/township/TownshipOverlays";
import { TownshipLayerPanel, TownshipLocationPanel } from "@/components/digital-twin/township/TownshipPanels";
import { TownshipBuildingPanel } from "@/components/digital-twin/township/TownshipBuildingPanel";
import { TownshipFloorExplorer } from "@/components/digital-twin/township/TownshipFloorExplorer";
import {
  resolveGisFootprints,
  resolveTowerLinkedData,
  type ExplicitFloor,
  type TownshipFloorMode,
} from "@/components/digital-twin/township/townshipData";
import { useGIS } from "@/context/GISContext";
import { useProperty } from "@/context/PropertyContext";
import {
  defaultLayerState,
  SELECTED_TOWER_ID,
  TOWERS,
  TOWNSHIP_SITE,
  type CameraPresetId,
  type TownshipLayerId,
  type TownshipLayerState,
} from "@/components/digital-twin/township/townshipConfig";
import { BuildingHeader } from "@/components/digital-twin/BuildingHeader";
import { BuildingInfoPanel } from "@/components/digital-twin/BuildingInfoPanel";
import { VerificationScore } from "@/components/digital-twin/VerificationScore";
import { SystemStatusPanel } from "@/components/digital-twin/SystemStatusPanel";
import { FloorExplorer } from "@/components/digital-twin/FloorExplorer";
import { FloorSelector } from "@/components/digital-twin/FloorSelector";
import { PropertyUnitGrid } from "@/components/digital-twin/PropertyUnitGrid";
import { UnitDetailsSheet } from "@/components/digital-twin/UnitDetailsSheet";
import { BuildingAnalytics } from "@/components/digital-twin/BuildingAnalytics";
import { DigitalTwinActivityTimeline } from "@/components/digital-twin/ActivityTimeline";
import { DigitalTwinMiniMap } from "@/components/digital-twin/MiniMap";
import { TWIN_BUILDING, TWIN_FLOORS, TwinUnit } from "@/data/mockDigitalTwin";
import { fadeIn, slideInLeft, slideInRight } from "@/components/digital-twin/motion";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

/**
 * Digital Twin route (Phase 10): the rendering/isolation implementation is
 * untouched — this wrapper only enforces authentication at the route boundary.
 */
export default function BuildingDigitalTwinPage() {
  return (
    <ProtectedRoute>
      <BuildingDigitalTwinPageContent />
    </ProtectedRoute>
  );
}

function BuildingDigitalTwinPageContent() {
  const [selectedFloorLevel, setSelectedFloorLevel] = useState(6);
  const [selectedUnit, setSelectedUnit] = useState<TwinUnit | null>(null);
  const [showLayers, setShowLayers] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Phase 15A — township scene state (illustrative layer toggles + selection)
  const [layers, setLayers] = useState<TownshipLayerState>(defaultLayerState);
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(SELECTED_TOWER_ID);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>("isometric");
  // Phase 15C — database-driven floor state + building panel visibility
  const [floorMode, setFloorMode] = useState<TownshipFloorMode>("all");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [showTowerPanel, setShowTowerPanel] = useState(true);
  const viewerShellRef = useRef<HTMLDivElement>(null);
  const viewerHandleRef = useRef<Township3DViewerHandle>(null);

  // Route param + real data layers (sanctioned Context → UI pipeline only)
  const params = useParams<{ id: string }>();
  const routeId = params?.id ?? "";
  const { buildings, floors, properties: gisUnits, parcels } = useGIS();
  const { getPropertyByUlpinOrId } = useProperty();
  const routeProperty = useMemo(() => getPropertyByUlpinOrId(routeId) ?? null, [getPropertyByUlpinOrId, routeId]);

  // Reset floor state + reopen the building panel whenever the selection changes
  useEffect(() => {
    setShowTowerPanel(true);
    setFloorMode("all");
    setSelectedLevel(null);
  }, [selectedTowerId]);

  const selectedFloor = useMemo(
    () => TWIN_FLOORS.find((f) => f.level === selectedFloorLevel) ?? TWIN_FLOORS[0],
    [selectedFloorLevel]
  );

  const handleSelectFloor = useCallback((level: number) => {
    setSelectedFloorLevel(level);
  }, []);

  // ---- Phase 15A township wiring ----
  const handleLayers = useCallback(() => setShowLayers((s) => !s), []);
  const handleToggleLayer = useCallback((id: TownshipLayerId) => {
    setLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);
  const handlePreset = useCallback((p: CameraPresetId) => {
    setCameraPreset(p);
    viewerHandleRef.current?.applyPreset(p);
  }, []);
  const handleIsoView = useCallback(() => {
    setCameraPreset("isometric");
    viewerHandleRef.current?.applyPreset("isometric");
  }, []);
  const handleSelectTower = useCallback((id: string | null) => setSelectedTowerId(id), []);
  const selectedTower = useMemo(() => TOWERS.find((t) => t.id === selectedTowerId) ?? null, [selectedTowerId]);

  // ---- Phase 15C township ↔ database resolution (honesty: no fabrication) ----
  const linkedTowerData = useMemo(
    () =>
      resolveTowerLinkedData({
        tower: selectedTower,
        buildings,
        floors,
        properties: gisUnits,
        parcels,
        property: routeProperty,
      }),
    [selectedTower, buildings, floors, gisUnits, parcels, routeProperty]
  );
  const gisFootprints = useMemo(
    () => resolveGisFootprints(linkedTowerData.siteBuildings),
    [linkedTowerData.siteBuildings]
  );
  const explicitFloors = useMemo<ExplicitFloor[]>(
    () => linkedTowerData.floors.map((f) => ({ id: f.id, floorNumber: f.floorNumber, name: f.name })),
    [linkedTowerData.floors]
  );
  const towerLinkedToDb = linkedTowerData.building !== null;

  const handleFloorMode = useCallback((mode: TownshipFloorMode) => setFloorMode(mode), []);
  const handleSelectLevel = useCallback((level: number | null) => setSelectedLevel(level), []);
  const handleCloseTowerPanel = useCallback(() => setShowTowerPanel(false), []);

  const handleFullscreen = useCallback(() => {
    const shell = viewerShellRef.current;
    if (!shell) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
      setIsFullscreen(false);
    } else {
      shell.requestFullscreen?.().then(
        () => setIsFullscreen(true),
        () => undefined
      );
    }
  }, []);

  const handleZoomIn = () => viewerHandleRef.current?.zoomBy(1.25);
  const handleZoomOut = () => viewerHandleRef.current?.zoomBy(0.8);
  const handleReset = () => {
    setCameraPreset("isometric");
    viewerHandleRef.current?.applyPreset("isometric");
  };

  // keep isFullscreen in sync with browser fullscreen state
  React.useEffect(() => {
    const onFsChange = () => setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  return (
    <div className="digital-twin min-h-screen w-full text-[#F8FAFC]">
      {/* Page background decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="dt-grid-overlay absolute inset-0 opacity-60" />
        <div className="dt-scanlines absolute inset-0" />
        <div className="absolute -top-32 left-1/2 h-80 w-[720px] -translate-x-1/2 rounded-full bg-[#008CFF]/15 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-96 rounded-full bg-[#8B5CF6]/10 blur-[110px]" />
        <div className="absolute bottom-1/4 left-0 h-64 w-72 rounded-full bg-[#00D9FF]/10 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] space-y-4 px-3 pb-10 pt-4 sm:px-5 lg:px-6">
        {/* Back link */}
        <Link
          href={`/properties/${routeProperty?.id ?? routeId ?? "prop-hyd-002"}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] transition-colors hover:text-[#00D9FF]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to property record
        </Link>

        <BuildingHeader building={TWIN_BUILDING} onFullscreen={handleFullscreen} />

        {/* ============ MAIN GRID: left info | 3D viewer | right info ============ */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[250px_minmax(0,1fr)_300px]">
          {/* LEFT — Building Info Panel */}
          <motion.aside
            variants={slideInLeft}
            initial="hidden"
            animate="show"
            className="order-2 lg:order-1"
          >
            <BuildingInfoPanel building={TWIN_BUILDING} />
          </motion.aside>

          {/* CENTER — 3D Viewer */}
          <motion.section
            variants={fadeIn}
            initial="hidden"
            animate="show"
            className="order-1 lg:order-2"
          >
            <div
              ref={viewerShellRef}
              className={`group relative overflow-hidden rounded-2xl border border-[#164E73] bg-[#020B18] shadow-[0_24px_70px_-30px_rgba(0,0,0,0.9)] transition-colors ${
                isFullscreen ? "rounded-none border-[#00D9FF]/50" : ""
              }`}
            >
              {/* viewer header strip */}
              <div className="flex h-10 items-center justify-between border-b border-[#164E73]/60 bg-[#061426]/70 px-4 backdrop-blur">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#94A3B8]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00D9FF] shadow-[0_0_8px_rgba(0,217,255,0.8)]" />
                  3D Township Twin
                  <span className="hidden font-mono normal-case tracking-normal text-[#64748B] sm:inline">
                    · Survey No {TOWNSHIP_SITE.surveyNo}, {TOWNSHIP_SITE.village}, {TOWNSHIP_SITE.district} — {TOWNSHIP_SITE.centerNote}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[9px] text-[#64748B]">
                  <span className="hidden sm:inline">ILLUSTRATIVE GEOMETRY</span>
                  <span className="rounded border border-[#00D9FF]/40 bg-[#00D9FF]/10 px-1.5 py-0.5 text-[#00D9FF]">
                    {cameraPreset.toUpperCase()} VIEW
                  </span>
                </div>
              </div>

              {/* fluid viewer + township overlays */}
              <div className="relative">
                <div className="relative h-[52vh] min-h-[380px] w-full sm:h-[60vh] lg:h-[66vh]">
                  <Township3DViewerDynamic
                    layers={layers}
                    selectedTowerId={selectedTowerId}
                    onSelectTower={handleSelectTower}
                    floorMode={floorMode}
                    selectedLevel={selectedLevel}
                    linkedFloors={explicitFloors}
                    gisFootprints={gisFootprints}
                    className="h-full w-full"
                  />
                </div>

                {/* scene identity header — LIFE REPUBLIC / MARUNJI • PUNE */}
                <TownshipSceneHeader className="absolute left-3 top-3 z-20" />

                {/* functional layer panel (toggled) */}
                <AnimatePresence>
                  {showLayers && (
                    <TownshipLayerPanel
                      layers={layers}
                      onToggle={handleToggleLayer}
                      onClose={handleLayers}
                      className="absolute left-3 top-[122px] z-30"
                    />
                  )}
                </AnimatePresence>

                {/* location information panel (collapsible on mobile) */}
                <TownshipLocationPanel className="absolute bottom-16 left-3 z-20 sm:bottom-3" />

                {/* Phase 15C — database-driven floor explorer (real floors only) */}
                <AnimatePresence>
                  {selectedTower && (
                    <TownshipFloorExplorer
                      towerLabel={selectedTower.name}
                      floors={explicitFloors}
                      linked={towerLinkedToDb}
                      selectedLevel={selectedLevel}
                      mode={floorMode}
                      onModeChange={handleFloorMode}
                      onSelectLevel={handleSelectLevel}
                      className="absolute bottom-[188px] left-3 z-30 hidden w-[248px] lg:block"
                    />
                  )}
                </AnimatePresence>

                {/* Phase 15C — selected-tower building information panel */}
                <AnimatePresence>
                  {selectedTower && showTowerPanel && (
                    <TownshipBuildingPanel
                      tower={selectedTower}
                      linkedBuilding={linkedTowerData.building}
                      linkedFloors={linkedTowerData.floors}
                      property={routeProperty}
                      onClose={handleCloseTowerPanel}
                      className="absolute right-3 top-[150px] z-30 hidden max-h-[calc(100%-170px)] overflow-y-auto lg:block"
                    />
                  )}
                </AnimatePresence>

                {/* top-right control cluster */}
                <TownshipControlCluster
                  className="absolute right-3 top-3 z-20"
                  onIsoView={handleIsoView}
                  onLayers={handleLayers}
                  onFullscreen={handleFullscreen}
                />

                {/* selected building chip — honest about DB linkage */}
                <AnimatePresence>
                  {selectedTower && (
                    <TownshipSelectedChip
                      tower={selectedTower}
                      linked={towerLinkedToDb}
                      onClear={() => handleSelectTower(null)}
                      className="absolute bottom-16 right-3 z-20 sm:bottom-3"
                    />
                  )}
                </AnimatePresence>

                {/* bottom camera preset bar — TOP / FRONT / SIDE / ISOMETRIC / PROPERTY */}
                <TownshipCameraBar
                  className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2"
                  preset={cameraPreset}
                  onPreset={handlePreset}
                  onReset={handleReset}
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                />
              </div>
{/* viewer footer telemetry */}
              <div className="flex h-8 items-center justify-between border-t border-[#164E73]/60 bg-[#061426]/70 px-4 backdrop-blur">
                <span className="flex items-center gap-2 font-mono text-[8px] text-[#64748B]">
                  <span className="dt-blink h-1.5 w-1.5 rounded-full bg-[#00D9FF]" />
                  LEFT DRAG ROTATE · RIGHT DRAG PAN · WHEEL / PINCH ZOOM
                </span>
                <span className="hidden font-mono text-[8px] text-[#64748B] sm:inline">
                  ILLUSTRATIVE 3D — NOT SURVEYED GIS GEOMETRY
                </span>
                <span className="font-mono text-[8px] text-[#00D9FF]">
                  {cameraPreset.toUpperCase()} VIEW
                </span>
              </div>
            </div>
          </motion.section>

          {/* RIGHT — Building Overview */}
          <motion.aside
            variants={slideInRight}
            initial="hidden"
            animate="show"
            className="order-3"
          >
            <div className="flex h-full flex-col gap-3">
              <div className="dt-hud dt-card-accent rounded-2xl p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-[#F8FAFC]">
                    Building Overview
                  </h3>
                  <span className="rounded-md border border-[#164E73] bg-[#061426] px-1.5 py-0.5 text-[8px] font-black uppercase text-[#94A3B8]">
                    All data
                  </span>
                </div>
                <dl className="space-y-2 text-[11px]">
                  {[
                    { k: "Construction Year", v: TWIN_BUILDING.constructionYear },
                    { k: "Building Height", v: `${TWIN_BUILDING.heightM} m` },
                    { k: "Total Floors", v: TWIN_BUILDING.totalFloors },
                    { k: "Occupied Units", v: TWIN_BUILDING.occupiedUnits },
                    { k: "Vacant Units", v: TWIN_BUILDING.vacantUnits },
                    { k: "Property Health", v: `${TWIN_BUILDING.propertyHealth}%` },
                  ].map((r) => (
                    <div key={r.k} className="flex items-center justify-between border-b border-[#164E73]/40 pb-1.5 last:border-0 last:pb-0">
                      <dt className="font-semibold text-[#94A3B8]">{r.k}</dt>
                      <dd className="font-mono font-black tabular-nums text-[#F8FAFC]">{r.v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="dt-hud dt-card-accent rounded-2xl p-4">
                <div className="flex items-center justify-center">
                  <VerificationScore score={TWIN_BUILDING.verificationScore} />
                </div>
              </div>

              <SystemStatusPanel />
            </div>
          </motion.aside>
        </div>
{/* ============ BOTTOM GRID: floor explorer + units | activity | map ============ */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
          {/* FLOOR EXPLORER */}
          <motion.div
            variants={slideInLeft}
            initial="hidden"
            animate="show"
            className="dt-hud dt-card-accent rounded-2xl p-4"
          >
            <FloorExplorer floors={TWIN_FLOORS} selectedLevel={selectedFloorLevel} onSelect={handleSelectFloor} />

            {/* Selected floor summary */}
            <div className="mt-3 rounded-xl border border-[#00D9FF]/40 bg-[#00D9FF]/5 p-3">
              <span className="text-[8px] font-black uppercase tracking-widest text-[#00D9FF]">
                Selected Floor
              </span>
              <div className="mt-1.5 flex items-center justify-between">
                <h4 className="font-mono text-lg font-black text-[#F8FAFC]">
                  {selectedFloor.level === 0 ? "Ground" : `Floor ${String(selectedFloor.level).padStart(2, "0")}`}
                </h4>
                <span className="rounded-md border border-[#164E73] bg-[#0A1B31] px-2 py-1 text-[9px] font-semibold text-[#94A3B8]">
                  {selectedFloor.elevationM}m elev
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                <div className="rounded-lg border border-[#164E73]/60 bg-[#061426] py-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-[#64748B]">Units</p>
                  <p className="font-mono text-sm font-black text-[#00D9FF]">{selectedFloor.units.length}</p>
                </div>
                <div className="rounded-lg border border-[#164E73]/60 bg-[#061426] py-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-[#64748B]">Area</p>
                  <p className="font-mono text-sm font-black text-[#F8FAFC]">
                    {selectedFloor.areaSqFt.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="rounded-lg border border-[#164E73]/60 bg-[#061426] py-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-[#64748B]">Status</p>
                  <p className="font-mono text-sm font-black text-[#22C55E]">
                    {selectedFloor.status === "VERIFIED" ? "Verified" : selectedFloor.status.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* UNITS */}
          <motion.div variants={fadeIn} initial="hidden" animate="show" className="min-w-0">
            <div className="dt-hud dt-card-accent rounded-2xl p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-[#F8FAFC]">
                    Property Units — {selectedFloor.label}
                  </h3>
                  <p className="mt-0.5 text-[9px] font-semibold text-[#64748B]">
                    Click a unit card to open its cadastral side panel
                  </p>
                </div>
                <FloorSelector
                  floors={TWIN_FLOORS}
                  selectedLevel={selectedFloorLevel}
                  onSelect={handleSelectFloor}
                  className="hidden md:flex"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <PropertyUnitGrid
                  units={selectedFloor.units}
                  selectedUnitId={selectedUnit?.id ?? null}
                  onSelectUnit={setSelectedUnit}
                />
                <UnitDetailsSheet unit={selectedUnit} onClose={() => setSelectedUnit(null)} />
              </div>
            </div>
          </motion.div>

          {/* RIGHT COLUMN — activity + minimap */}
          <motion.div variants={slideInRight} initial="hidden" animate="show" className="space-y-4">
            <DigitalTwinActivityTimeline />
            <DigitalTwinMiniMap building={TWIN_BUILDING} />
          </motion.div>
        </div>

        {/* ============ ANALYTICS ============ */}
        <BuildingAnalytics />

        {/* Footer tag */}
        <p className="pt-2 text-center font-mono text-[9px] uppercase tracking-[0.25em] text-[#64748B]">
          Smart Property Verification Platform · Building Digital Twin · National Cadastre Engine v3.4
        </p>
      </div>
    </div>
  );
}