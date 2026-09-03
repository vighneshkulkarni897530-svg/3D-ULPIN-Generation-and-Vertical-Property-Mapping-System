"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPinned, FileText } from "lucide-react";
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
import { InspectionToolbar } from "@/components/digital-twin/inspection/InspectionToolbar";
import { InspectionPanel } from "@/components/digital-twin/inspection/InspectionPanel";
import { InspectionLegend } from "@/components/digital-twin/inspection/InspectionLegend";
import { InspectionSummary } from "@/components/digital-twin/inspection/InspectionSummary";
import { SolarShadowControls } from "@/components/digital-twin/analysis/SolarShadowControls";
import { MeasurementTool } from "@/components/digital-twin/analysis/MeasurementTool";
import { DiscrepancyOverlay } from "@/components/digital-twin/inspection/DiscrepancyOverlay";
import { useDigitalTwinInspection } from "@/context/DigitalTwinInspectionContext";
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
  PLACE_ID,
  resolvePlace,
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
import { TwinUnit } from "@/data/mockDigitalTwin";
import { buildTwinView, findTwinUnit } from "@/lib/twinView";
import { fadeIn, slideInLeft, slideInRight } from "@/components/digital-twin/motion";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DigitalTwinInspectionProvider } from "@/context/DigitalTwinInspectionContext";

/**
 * Digital Twin route (Phase 7, 10 & 16): Enforces authentication and provides
 * real Firestore-driven 3D Property Inspection & Spatial Analysis Workbench.
 */
export default function BuildingDigitalTwinPage() {
  return (
    <ProtectedRoute>
      <DigitalTwinInspectionProvider>
        <BuildingDigitalTwinPageContent />
      </DigitalTwinInspectionProvider>
    </ProtectedRoute>
  );
}

function BuildingDigitalTwinPageContent() {
  const inspection = useDigitalTwinInspection();
  const [selectedFloorLevel, setSelectedFloorLevel] = useState(6);
  const [selectedUnit, setSelectedUnit] = useState<TwinUnit | null>(null);
  const [showLayers, setShowLayers] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layers, setLayers] = useState<TownshipLayerState>(defaultLayerState);
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(SELECTED_TOWER_ID);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>("isometric");
  const [floorMode, setFloorMode] = useState<TownshipFloorMode>("all");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [showTowerPanel, setShowTowerPanel] = useState(true);
  const [showInspectionSummary, setShowInspectionSummary] = useState(false);
  const viewerShellRef = useRef<HTMLDivElement>(null);
  const viewerHandleRef = useRef<Township3DViewerHandle>(null);

  // Route param + search params for deep-linking (?building=..., ?floor=..., ?flat=...)
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const routeId = params?.id ?? "";

  const queryBuilding = searchParams?.get("building") ?? null;
  const queryFloor = searchParams?.get("floor") ?? null;
  const queryFlat = searchParams?.get("flat") ?? null;

  const { buildings, floors, properties: gisUnits, parcels, conflicts } = useGIS();
  const { getPropertyByUlpinOrId } = useProperty();
  const routeProperty = useMemo(() => getPropertyByUlpinOrId(routeId) ?? null, [getPropertyByUlpinOrId, routeId]);

  // Phase 19 — resolve the canonical registry unit for this route
  // (e.g. PROP-LR-B-0402 → building B-LR-B, floor FLOOR-LR-B-04). Used to
  // auto-select the correct tower/floor/flat even when query params are absent.
  const featuredUnitRecord = useMemo(
    () => gisUnits.find((u) => u.id === routeId || u.propertyId === routeId) ?? null,
    [gisUnits, routeId],
  );
  const featuredFloorLevel = useMemo(() => {
    if (!featuredUnitRecord) return null;
    return floors.find((f) => f.id === featuredUnitRecord.floorId)?.floorNumber ?? null;
  }, [featuredUnitRecord, floors]);

  // Deep-link auto-selection (?building=…&floor=…&flat=…). When a parameter is
  // absent, fall back to the canonical featured registry unit so that opening
  // /properties/PROP-LR-B-0402/digital-twin still lands on Tower B · Floor 4 ·
  // Flat 402 — never on an unrelated mock building.
  useEffect(() => {
    const buildingParam = queryBuilding ?? featuredUnitRecord?.buildingId ?? null;
    if (buildingParam) {
      const match = buildings.find((b) => b.id === buildingParam || b.buildingCode === buildingParam);
      if (match) {
        setSelectedTowerId((prev) => (prev === match.id ? prev : match.id));
        inspection.selectBuilding(match.id);
      } else {
        setSelectedTowerId(buildingParam);
        inspection.selectBuilding(buildingParam);
      }
    }
    const floorParam = queryFloor ?? (featuredFloorLevel !== null ? String(featuredFloorLevel) : null);
    if (floorParam) {
      const fNum = parseInt(floorParam, 10);
      if (!isNaN(fNum)) {
        setSelectedLevel((prev) => (prev === fNum ? prev : fNum));
        inspection.selectFloor(fNum);
      }
    }
    const flatParam = queryFlat ?? featuredUnitRecord?.id ?? null;
    if (flatParam) {
      setSelectedUnitId((prev) => (prev === flatParam ? prev : flatParam));
      inspection.selectFlat(flatParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryBuilding, queryFloor, queryFlat, buildings, featuredUnitRecord, featuredFloorLevel]);

  const place = resolvePlace(PLACE_ID);

  // Reset floor state + reopen the building panel whenever the selection changes
  useEffect(() => {
    setShowTowerPanel(true);
    setFloorMode("all");
    setSelectedLevel(null);
  }, [selectedTowerId]);

  // Sync inspection context floorMode
  useEffect(() => {
    if (inspection.floorMode !== floorMode) {
      setFloorMode(inspection.floorMode);
    }
  }, [inspection.floorMode]);

  const selectedFloorLabel = useMemo(
    () =>
      selectedFloorLevel === 0
        ? "Ground Floor"
        : `Floor ${String(selectedFloorLevel).padStart(2, "0")}`,
    [selectedFloorLevel]
  );

  const handleSelectFloor = useCallback((level: number) => {
    setSelectedFloorLevel(level);
  }, []);

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
  const handleSelectTower = useCallback((id: string | null) => {
    setSelectedTowerId(id);
    inspection.selectBuilding(id);
  }, [inspection]);
  const selectedTower = useMemo(
    () =>
      TOWERS.find((t) => t.id === selectedTowerId) ??
      (selectedTowerId
        ? {
            id: selectedTowerId,
            name: buildings.find((b) => b.id === selectedTowerId)?.name ?? "Building",
            type: "A" as const,
            typeLabel: "Residential Building",
            position: [0, -52] as [number, number],
            rotation: 0.05,
            floors: buildings.find((b) => b.id === selectedTowerId)?.totalFloors ?? 12,
            footprint: [18, 16] as [number, number],
            dataStatus: "verified" as const,
          }
        : null),
    [selectedTowerId, buildings]
  );

  // Real database resolution
  const linkedTowerData = useMemo(
    () =>
      resolveTowerLinkedData({
        tower: selectedTower,
        buildings,
        floors,
        properties: gisUnits,
        parcels,
        property: routeProperty,
        targetBuildingId: selectedTowerId,
      }),
    [selectedTower, buildings, floors, gisUnits, parcels, routeProperty, selectedTowerId]
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

  const handleFloorMode = useCallback((mode: TownshipFloorMode) => {
    setFloorMode(mode);
    inspection.setFloorMode(mode);
  }, [inspection]);
  const handleSelectLevel = useCallback((level: number | null) => {
    setSelectedLevel(level);
    inspection.selectFloor(level);
  }, [inspection]);
  const handleCloseTowerPanel = useCallback(() => setShowTowerPanel(false), []);

  // ── Phase 19 — canonical twin view (single source of truth) ────────────────
  // Derives ALL presentation data (header / info panel / floor explorer /
  // units / minimap) from the REAL registry records of the selected building.
  // The legacy Green Valley illustration mock is only used when no registry
  // building is linked. This removes the Green-Valley/12-floor/42m data
  // mismatch observed in the Phase 18 review.
  const twinView = useMemo(
    () =>
      buildTwinView({
        building: linkedTowerData.building,
        floors: linkedTowerData.floors,
        units: linkedTowerData.units,
        parcel: linkedTowerData.parcel,
        featured: routeProperty,
      }),
    [linkedTowerData, routeProperty]
  );

  // Unified floor state for the bottom workbench: registry-linked selection
  // drives BOTH the panels and the 3D scene (inspection.selectFloor), so the
  // geometry visibly responds to floor changes.
  const activeLevel = twinView.linked ? selectedLevel ?? selectedFloorLevel : selectedFloorLevel;
  const bottomFloors = twinView.floors;
  const activeFloor = useMemo(
    () => bottomFloors.find((f) => f.level === activeLevel) ?? bottomFloors[0],
    [bottomFloors, activeLevel]
  );
  const handleSelectBottomFloor = useCallback(
    (level: number) => {
      if (twinView.linked) {
        handleSelectLevel(level);
      } else {
        handleSelectFloor(level);
      }
    },
    [twinView.linked, handleSelectLevel, handleSelectFloor]
  );

  // Sync the selected TwinUnit from the canonical registry when a flat id is
  // chosen via deep link (?flat=402), the in-scene explorer, or a conflict.
  useEffect(() => {
    if (!selectedUnitId) return;
    const unit = findTwinUnit(bottomFloors, selectedUnitId);
    if (unit && unit.id !== selectedUnit?.id) {
      setSelectedUnit(unit);
    }
  }, [selectedUnitId, bottomFloors, selectedUnit?.id]);

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
    inspection.resetInspection();
  };

  // keep isFullscreen in sync with browser fullscreen state
  React.useEffect(() => {
    const onFsChange = () => setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Safe fallback when the place cannot be resolved.
  if (!place) {
    return (
      <div className="digital-twin flex min-h-screen w-full items-center justify-center px-4 text-[#F8FAFC]">
        <div className="dt-hud dt-card-accent w-full max-w-md rounded-2xl px-6 py-8 text-center">
          <h2 className="text-sm font-black uppercase tracking-[0.22em] text-[#F8FAFC]">Place not found</h2>
          <p className="mt-2 text-[11px] font-semibold leading-relaxed text-[#64748B]">
            The requested place could not be resolved in the Digital Twin place registry.
          </p>
          <Link
            href="/properties"
            className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#00D9FF] transition-colors hover:text-[#7CE8FF]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to properties
          </Link>
        </div>
      </div>
    );
  }

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
        {/* Top Navigation Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/properties/${routeProperty?.id ?? routeId ?? "prop-hyd-002"}`}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] transition-colors hover:text-[#00D9FF]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to property record
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInspectionSummary(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#164E73] bg-[#061426] px-3 py-1.5 text-[11px] font-bold text-[#F8FAFC] transition-colors hover:border-[#00D9FF]/50 hover:text-[#00D9FF]"
            >
              <FileText className="h-3.5 w-3.5 text-[#00D9FF]" /> Inspection Summary
            </button>
            <Link
              href={`/map?society=${linkedTowerData.parcel?.id ?? ""}${linkedTowerData.building?.id ? `&building=${linkedTowerData.building.id}` : ""}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#00D9FF]/40 bg-[#00D9FF]/10 px-3 py-1.5 text-[11px] font-bold text-[#00D9FF] transition-colors hover:bg-[#00D9FF]/20"
            >
              <MapPinned className="h-3.5 w-3.5" /> View on 2D GIS Map
            </Link>
            {linkedTowerData.parcel?.id && (
              <Link
                href={`/society/${linkedTowerData.parcel.id}`}
                className="hidden rounded-lg border border-[#164E73] bg-[#061426] px-3 py-1.5 text-[11px] font-bold text-[#F8FAFC] transition-colors hover:border-[#00D9FF]/50 hover:text-[#00D9FF] sm:inline-flex"
              >
                Society Portal
              </Link>
            )}
          </div>
        </div>

        <BuildingHeader building={twinView.building} onFullscreen={handleFullscreen} />

        {/* ============ MAIN GRID: left info | 3D viewer | right info ============ */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[250px_minmax(0,1fr)_300px]">
          {/* LEFT — Building Info Panel */}
          <motion.aside
            variants={slideInLeft}
            initial="hidden"
            animate="show"
            className="order-2 lg:order-1"
          >
            <BuildingInfoPanel
              building={twinView.building}
              selectedFloorLabel={
                twinView.linked
                  ? activeFloor?.label
                  : selectedFloorLabel
              }
            />
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
                  3D Property Inspection Workbench
                  <span className="hidden font-mono normal-case tracking-normal text-[#64748B] sm:inline">
                    · {linkedTowerData.parcel?.parcelNumber ? `Parcel ${linkedTowerData.parcel.parcelNumber}` : place.name} · Cadastral Parcel: {linkedTowerData.parcel?.parcelNumber ?? linkedTowerData.parcel?.id ?? "—"}
                  </span>
                  <span
                    className="rounded border border-[#FACC15]/50 bg-[#FACC15]/10 px-1.5 py-0.5 font-bold uppercase text-[#FACC15]"
                    title="Illustrative demo dataset — not an official government cadastral record"
                  >
                    Demo Data
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[9px] text-[#64748B]">
                  <span className="hidden uppercase sm:inline">
                    {towerLinkedToDb ? "Real Database Linked" : place.visualizationStatus}
                  </span>
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
                    buildingIsolation={inspection.buildingIsolation}
                    shadowAnalysis={inspection.shadowAnalysis}
                    solarTimeMinutes={inspection.solarTimeMinutes}
                    measurementMode={inspection.measurementMode}
                    measurePointA={inspection.measurePointA}
                    measurePointB={inspection.measurePointB}
                    onMeasureClick={inspection.setMeasurePoint}
                    discrepancyOverlay={inspection.discrepancyOverlay}
                    conflicts={conflicts}
                    className="h-full w-full"
                  />
                </div>

                {/* scene identity header — LIFE REPUBLIC / MARUNJI • PUNE */}
                <TownshipSceneHeader className="absolute left-3 top-3 z-20" />

                {/* Phase 7 — 3D Inspection Toolbar */}
                <InspectionToolbar
                  className="absolute left-1/2 top-3 z-30 hidden -translate-x-1/2 md:flex"
                  onResetCamera={handleReset}
                  openDiscrepancyCount={conflicts.length}
                />

                {/* Phase 7 — Solar & Shadow Analysis Floating Panel */}
                <AnimatePresence>
                  {inspection.shadowAnalysis && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-3 top-[56px] z-30"
                    >
                      <SolarShadowControls />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Phase 7 — 3D Measurement Tool Floating Panel */}
                <AnimatePresence>
                  {inspection.measurementMode && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute left-3 top-[56px] z-30"
                    >
                      <MeasurementTool />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Phase 7 — Spatial Discrepancy Overlay Panel */}
                <AnimatePresence>
                  {inspection.discrepancyOverlay && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-3 top-[56px] z-30"
                    >
                      <DiscrepancyOverlay
                        onSelectConflict={(c) => {
                          if (c.affectedPropertyIds && c.affectedPropertyIds.length > 0) {
                            setSelectedUnitId(c.affectedPropertyIds[0]);
                          }
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

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

                {/* location information panel & legend */}
                <TownshipLocationPanel className="absolute bottom-16 left-3 z-20 sm:bottom-3" />

                {/* Phase 15C & 16 — database-driven floor explorer (real floors & units) */}
                <AnimatePresence>
                  {selectedTower && (
                    <TownshipFloorExplorer
                      towerLabel={selectedTower.name}
                      floors={explicitFloors}
                      units={linkedTowerData.units}
                      selectedUnitId={selectedUnitId}
                      onSelectUnit={(uid) => {
                        setSelectedUnitId(uid);
                        inspection.selectFlat(uid);
                      }}
                      linked={towerLinkedToDb}
                      selectedLevel={selectedLevel}
                      mode={floorMode}
                      onModeChange={handleFloorMode}
                      onSelectLevel={handleSelectLevel}
                      className="absolute bottom-[188px] left-3 z-30 hidden w-[258px] lg:block"
                    />
                  )}
                </AnimatePresence>

                {/* Phase 7 — Inspection Workbench Panel */}
                <AnimatePresence>
                  {selectedTower && showTowerPanel && (
                    <InspectionPanel
                      building={linkedTowerData.building}
                      floors={linkedTowerData.floors}
                      units={linkedTowerData.units}
                      parcel={linkedTowerData.parcel}
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

                {/* selected building chip */}
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

                {/* bottom camera preset bar */}
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
                    { k: "Society", v: twinView.building.societyName ?? "—" },
                    { k: "Survey No.", v: twinView.building.surveyNumber ?? "—" },
                    { k: "Building Code", v: twinView.building.buildingCode ?? twinView.building.buildingId ?? "—" },
                    { k: "Construction Year", v: twinView.building.constructionYear },
                    { k: "Building Height", v: `${twinView.building.heightM} m` },
                    { k: "Total Floors", v: twinView.building.totalFloors },
                    { k: "Occupied Units", v: twinView.building.occupiedUnits },
                    { k: "Vacant Units", v: twinView.building.vacantUnits },
                    { k: "Property Health", v: `${twinView.building.propertyHealth}%` },
                    { k: "Data Status", v: "DEMO — ILLUSTRATIVE" },
                    { k: "Official ULPIN", v: "NO" },
                  ].map((r) => (
                    <div key={r.k} className="flex items-center justify-between border-b border-[#164E73]/40 pb-1.5 last:border-0 last:pb-0">
                      <dt className="font-semibold text-[#94A3B8]">{r.k}</dt>
                      <dd className={`font-mono font-black tabular-nums ${
                        r.k === "Data Status" ? "text-[#FACC15]" : r.k === "Official ULPIN" ? "text-[#FACC15]" : "text-[#F8FAFC]"
                      }`}>{r.v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="dt-hud dt-card-accent rounded-2xl p-4">
                <div className="flex items-center justify-center">
                  <VerificationScore score={twinView.building.verificationScore} />
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
            <FloorExplorer floors={bottomFloors} selectedLevel={activeLevel} onSelect={handleSelectBottomFloor} />

            {/* Selected floor summary */}
            {activeFloor && (
              <div className="mt-3 rounded-xl border border-[#00D9FF]/40 bg-[#00D9FF]/5 p-3">
                <span className="text-[8px] font-black uppercase tracking-widest text-[#00D9FF]">
                  Selected Floor
                </span>
                <div className="mt-1.5 flex items-center justify-between">
                  <h4 className="font-mono text-lg font-black text-[#F8FAFC]">
                    {activeFloor.level === 0 ? "Ground" : `Floor ${String(activeFloor.level).padStart(2, "0")}`}
                  </h4>
                  <span className="rounded-md border border-[#164E73] bg-[#0A1B31] px-2 py-1 text-[9px] font-semibold text-[#94A3B8]">
                    {activeFloor.elevationM}m elev
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                  <div className="rounded-lg border border-[#164E73]/60 bg-[#061426] py-1.5">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-[#64748B]">Units</p>
                    <p className="font-mono text-sm font-black text-[#00D9FF]">{activeFloor.units.length}</p>
                  </div>
                  <div className="rounded-lg border border-[#164E73]/60 bg-[#061426] py-1.5">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-[#64748B]">Area</p>
                    <p className="font-mono text-sm font-black text-[#F8FAFC]">
                      {activeFloor.areaSqFt.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#164E73]/60 bg-[#061426] py-1.5">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-[#64748B]">Status</p>
                    <p className="font-mono text-sm font-black text-[#22C55E]">
                      {activeFloor.status === "VERIFIED" ? "Verified" : activeFloor.status.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* UNITS */}
          <motion.div variants={fadeIn} initial="hidden" animate="show" className="min-w-0">
            <div className="dt-hud dt-card-accent rounded-2xl p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-[#F8FAFC]">
                    Property Units — {activeFloor?.label ?? selectedFloorLabel}
                  </h3>
                  <p className="mt-0.5 text-[9px] font-semibold text-[#64748B]">
                    Click a unit card to open its cadastral side panel
                  </p>
                </div>
                <FloorSelector
                  floors={bottomFloors}
                  selectedLevel={activeLevel}
                  onSelect={handleSelectBottomFloor}
                  className="hidden md:flex"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                {activeFloor && activeFloor.units.length > 0 ? (
                  <PropertyUnitGrid
                    units={activeFloor.units}
                    selectedUnitId={selectedUnit?.id ?? null}
                    onSelectUnit={setSelectedUnit}
                  />
                ) : (
                  <div className="dt-hud flex flex-col items-center justify-center rounded-xl border border-dashed border-[#164E73] px-6 py-10 text-center">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#94A3B8]">
                      No unit records ingested for this floor yet
                    </p>
                    <p className="mt-1.5 max-w-xs text-[10px] leading-relaxed text-[#64748B]">
                      Floor {activeFloor?.level ?? "—"} has no property units in the
                      registry. Select Floor 4 to inspect Flat 402
                      {twinView.linked ? "" : " (illustrative dataset)"}.
                    </p>
                  </div>
                )}
                <UnitDetailsSheet unit={selectedUnit} onClose={() => setSelectedUnit(null)} />
              </div>
            </div>
          </motion.div>

          {/* RIGHT COLUMN — activity + minimap */}
          <motion.div variants={slideInRight} initial="hidden" animate="show" className="space-y-4">
            <DigitalTwinActivityTimeline />
            <DigitalTwinMiniMap building={twinView.building} />
          </motion.div>
        </div>

        {/* ============ ANALYTICS ============ */}
        <BuildingAnalytics />

        {/* Phase 7 — Structured Inspection Summary Modal */}
        <InspectionSummary
          isOpen={showInspectionSummary}
          onClose={() => setShowInspectionSummary(false)}
          parcel={linkedTowerData.parcel}
          building={linkedTowerData.building}
          floors={linkedTowerData.floors}
          units={linkedTowerData.units}
          conflicts={conflicts}
          selectedFloorNumber={selectedLevel}
          selectedFlatId={selectedUnitId}
        />
      </div>
    </div>
  );
}