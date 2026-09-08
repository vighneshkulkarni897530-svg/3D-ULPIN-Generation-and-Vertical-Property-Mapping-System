"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPinned, FileText, Building2 } from "lucide-react";
import { Township3DViewerDynamic, Township3DViewerHandle } from "@/components/digital-twin/township/Township3DViewerDynamic";
import {
  TownshipCameraBar,
  TownshipControlCluster,
  TownshipSceneHeader,
  TownshipSelectedChip,
} from "@/components/digital-twin/township/TownshipOverlays";
import { TownshipBuildingPanel } from "@/components/digital-twin/township/TownshipBuildingPanel";
import { TownshipLayerPanel } from "@/components/digital-twin/township/TownshipPanels";
import { InspectionToolbar } from "@/components/digital-twin/inspection/InspectionToolbar";
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
  type TowerDef,
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
import { getSocietyById } from "@/lib/society/service";
import type { Society } from "@/types/society";
import { generate3DFromImage, type Image3DGenerationResult } from "@/lib/imageTo3DGenerator";
import { getSocietyDigitalTwin, saveSocietyDigitalTwin } from "@/lib/digital-twin/digitalTwinRegistry";
import { analyzeSocietySiteImage } from "@/lib/digital-twin/imageAnalyzer";
import type { SocietyDigitalTwin } from "@/types/digitalTwin";
import { resolveSocietyByAnyId, validateSocietyBuildingOwnership } from "@/lib/society/society3DUlpinRegistry";
import { UploadCloud, Sparkles, X, ChevronDown, Check, Fingerprint, Copy, CheckCheck, ShieldCheck } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DigitalTwinInspectionProvider } from "@/context/DigitalTwinInspectionContext";

/**
 * Digital Twin route (Phase 7, 10, 16 & 22): Enforces authentication and provides
 * real Firestore-driven 3D Property Inspection & Spatial Analysis Workbench
 * with dynamic society-specific 3D digital twins generated from site images.
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
  const router = useRouter();
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
  const [showInspectionSummary, setShowInspectionSummary] = useState(false);
  const [showBuildingPanel, setShowBuildingPanel] = useState(false);
  const viewerShellRef = useRef<HTMLDivElement>(null);
  const viewerHandleRef = useRef<Township3DViewerHandle>(null);

  // Phase 22 — Society Digital Twin State & Synthesis
  const [digitalTwinVersion, setDigitalTwinVersion] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Route param + search params for deep-linking (?building=..., ?floor=..., ?flat=..., ?society=...)
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const routeId = params?.id ?? "";

  const queryBuilding = searchParams?.get("building") ?? searchParams?.get("buildingId") ?? null;
  const queryFloor = searchParams?.get("floor") ?? searchParams?.get("floorId") ?? null;
  const queryFlat = searchParams?.get("flat") ?? searchParams?.get("flatId") ?? null;
  const querySociety = searchParams?.get("society") ?? searchParams?.get("societyId") ?? null;

  const { buildings, floors, properties: gisUnits, parcels, conflicts } = useGIS();
  const { getPropertyByUlpinOrId } = useProperty();
  const routeProperty = useMemo(() => getPropertyByUlpinOrId(routeId) ?? null, [getPropertyByUlpinOrId, routeId]);

  // Phase 19 — resolve the canonical registry unit for this route
  const featuredUnitRecord = useMemo(
    () => gisUnits.find((u) => u.id === routeId || u.propertyId === routeId) ?? null,
    [gisUnits, routeId],
  );
  const featuredFloorLevel = useMemo(() => {
    if (!featuredUnitRecord) return null;
    return floors.find((f) => f.id === featuredUnitRecord.floorId)?.floorNumber ?? null;
  }, [featuredUnitRecord, floors]);

  const [society, setSociety] = useState<Society | null>(null);
  const [image3DResult, setImage3DResult] = useState<Image3DGenerationResult | null>(null);

  // Target society resolution (Phase 22 & Phase 23)
  const resolvedSocietyId = useMemo(() => {
    if (querySociety) return querySociety;
    if (searchParams?.get("parcel")) return searchParams.get("parcel")!;
    if ((routeProperty as any)?.parcelId) return (routeProperty as any).parcelId;
    if ((routeProperty as any)?.societyId) return (routeProperty as any).societyId;
    if (featuredUnitRecord?.parcelId) return featuredUnitRecord.parcelId;
    if (parcels.some((p) => p.id === routeId)) return routeId;
    if (routeId.startsWith("PARCEL-") || routeId.startsWith("SOCIETY-") || routeId.startsWith("SOC-")) return routeId;
    if (routeId.includes("LR-") || routeId === "PROP-LR-B-0402") {
      return "PARCEL-MH-PUN-074";
    }
    return routeId;
  }, [querySociety, searchParams, routeProperty, featuredUnitRecord, parcels, routeId]);

  const targetSocietyId = resolvedSocietyId;

  const societyDigitalTwin = useMemo<SocietyDigitalTwin | null>(() => {
    return getSocietyDigitalTwin(resolvedSocietyId);
  }, [resolvedSocietyId, digitalTwinVersion]);

  const societyBuildings = useMemo(() => {
    if (!targetSocietyId) return [];
    return buildings.filter(
      (b) => b.parcelId === targetSocietyId || (b as any).societyId === targetSocietyId,
    );
  }, [buildings, targetSocietyId]);

  // Phase 23 — Automatic State Reset on Society Switch
  const prevSocietyIdRef = useRef<string>(resolvedSocietyId);
  useEffect(() => {
    if (prevSocietyIdRef.current !== resolvedSocietyId) {
      prevSocietyIdRef.current = resolvedSocietyId;
      // Reset tower selection to first building of new society
      const firstBldg = societyDigitalTwin?.buildings[0]?.id || societyBuildings[0]?.id || null;
      setSelectedTowerId(firstBldg);
      setSelectedLevel(null);
      setSelectedUnitId(null);
      setSelectedUnit(null);
      setFloorMode("all");
      inspection.selectBuilding(firstBldg);
      inspection.selectFloor(null);
      inspection.selectFlat(null);
      inspection.resetInspection();
      viewerHandleRef.current?.applyPreset("isometric");
    }
  }, [resolvedSocietyId, societyDigitalTwin, societyBuildings, inspection]);

  useEffect(() => {
    let active = true;
    if (!targetSocietyId) {
      setSociety(null);
      return;
    }
    getSocietyById(targetSocietyId).then((res) => {
      if (active && res) {
        setSociety(res);
      }
    });
    return () => {
      active = false;
    };
  }, [targetSocietyId]);

  const societyImageUrl = useMemo(() => {
    return (
      societyDigitalTwin?.sourceImage ||
      society?.imageUrl ||
      routeProperty?.aerialImageUrl ||
      routeProperty?.featuredImageUrl ||
      null
    );
  }, [societyDigitalTwin, society, routeProperty]);

  useEffect(() => {
    let active = true;
    if (societyImageUrl) {
      const socName = society?.name || routeProperty?.title || "Society Digital Twin";
      generate3DFromImage(societyImageUrl, socName, societyBuildings).then((res) => {
        if (active) {
          setImage3DResult(res);
        }
      });
    } else {
      setImage3DResult(null);
    }
    return () => {
      active = false;
    };
  }, [societyImageUrl, society?.name, routeProperty?.title, societyBuildings]);

  // Dynamic 3D Tower generation for all buildings (including custom societies & AI extraction)
  const sceneTowers = useMemo<TowerDef[]>(() => {
    if (societyDigitalTwin && societyDigitalTwin.buildings) {
      return societyDigitalTwin.buildings.map((b) => ({
        id: b.id,
        name: b.name,
        type: (["A", "B", "C", "D"].includes(b.type) ? b.type : "A") as any,
        typeLabel: b.typeLabel || "Building Block",
        position: b.position,
        rotation: b.rotation,
        floors: b.floors,
        footprint: b.footprint,
        dataStatus: (b.dataStatus as any) || "verified",
      }));
    }
    if (societyDigitalTwin === null) {
      return [];
    }
    return TOWERS;
  }, [societyDigitalTwin]);

  // Society 3D ULPIN Record (Phase 23)
  const societyUlpinRecord = useMemo(() => resolveSocietyByAnyId(resolvedSocietyId), [resolvedSocietyId]);
  const [copiedUlpin, setCopiedUlpin] = useState(false);
  const handleCopyUlpin = (ulpin: string) => {
    navigator.clipboard.writeText(ulpin);
    setCopiedUlpin(true);
    setTimeout(() => setCopiedUlpin(false), 2000);
  };

  // Deep-link auto-selection (?building=…&floor=…&flat=…). Validates ownership
  // to prevent cross-society mismatched building injections.
  useEffect(() => {
    let buildingParam = queryBuilding;
    if (buildingParam && !validateSocietyBuildingOwnership(resolvedSocietyId, buildingParam)) {
      // Building does not belong to this society - sanitize to avoid foreign render
      buildingParam = null;
    }
    buildingParam =
      buildingParam ??
      featuredUnitRecord?.buildingId ??
      (societyBuildings.length > 0 ? societyBuildings[0].id : null);

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
  }, [queryBuilding, queryFloor, queryFlat, buildings, featuredUnitRecord, featuredFloorLevel, societyBuildings, resolvedSocietyId]);

  const place = resolvePlace(PLACE_ID);

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
    if (id !== selectedTowerId) {
      setFloorMode("all");
      setSelectedLevel(null);
      setSelectedUnitId(null);
      setSelectedUnit(null);
    }
    if (id) setShowBuildingPanel(true);
    inspection.selectBuilding(id);
  }, [inspection, selectedTowerId]);
  const selectedTower = useMemo(
    () =>
      sceneTowers.find((t) => t.id === selectedTowerId) ??
      (selectedTowerId
        ? {
            id: selectedTowerId,
            name: buildings.find((b) => b.id === selectedTowerId || b.buildingCode === selectedTowerId)?.name ?? "Building",
            type: "A" as const,
            typeLabel: "Residential Building",
            position: [0, -52] as [number, number],
            rotation: 0.05,
            floors: buildings.find((b) => b.id === selectedTowerId || b.buildingCode === selectedTowerId)?.totalFloors ?? 12,
            footprint: [18, 16] as [number, number],
            dataStatus: "verified" as const,
          }
        : sceneTowers[0] ?? null),
    [selectedTowerId, sceneTowers, buildings]
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

  const twinView = useMemo(() => {
    const base = buildTwinView({
      building: linkedTowerData.building,
      floors: linkedTowerData.floors,
      units: linkedTowerData.units,
      parcel: linkedTowerData.parcel,
      featured: routeProperty,
    });

    if (!base.linked && society) {
      const activeWing = image3DResult?.wings.find((w) => w.id === selectedTowerId) ?? image3DResult?.wings[0];
      const floorCount = activeWing?.floors ?? selectedTower?.floors ?? 18;
      const heightM = Number((floorCount * 3.1).toFixed(1));
      const totalUnits = floorCount * 4;

      return {
        building: {
          name: selectedTower?.name ?? `${society.name} · Main Wing`,
          propertyId: society.registrationNumber ?? `PROP-${society.id.slice(0, 8).toUpperCase()}`,
          ulpin: society.registrationNumber ?? `ULPIN-${society.id.slice(0, 10).toUpperCase()}`,
          location: `${society.address.line1 ? `${society.address.line1}, ` : ""}${society.address.city}, ${society.address.state}`,
          cityState: `${society.address.city}, ${society.address.state} - ${society.address.pinCode}`,
          type: "AI Reconstructed Residential High-Rise",
          totalFloors: floorCount,
          totalUnits,
          builtUpAreaSqFt: floorCount * 4200,
          constructionYear: society.establishedYear ?? 2023,
          heightM,
          occupiedUnits: Math.round(totalUnits * 0.85),
          vacantUnits: Math.round(totalUnits * 0.15),
          leasedUnits: 0,
          propertyHealth: 96,
          verificationScore: image3DResult?.generationConfidence ?? 92,
          verificationStatus: "VERIFIED" as const,
          systemStatus: "ACTIVE" as const,
          latitude: society.location?.latitude ?? 18.59,
          longitude: society.location?.longitude ?? 73.71,
          buildingId: selectedTower?.id ?? `BLDG-${society.id}`,
          buildingCode: selectedTower?.id ?? "WING-A",
          parcelId: society.id,
          societyName: society.name,
          surveyNumber: society.registrationNumber || undefined,
          dataStatus: "DEMO" as const,
          sourceType: "AI_IMAGE_RECONSTRUCTION" as any,
          isOfficialUlpin: false,
        },
        floors: Array.from({ length: floorCount }).map((_, fIdx) => ({
          level: fIdx + 1,
          label: `Floor ${String(fIdx + 1).padStart(2, "0")}`,
          elevationM: Number(((fIdx + 1) * 3.1).toFixed(1)),
          areaSqFt: 4200,
          units: Array.from({ length: 4 }).map((__, uIdx) => ({
            id: `UNIT-${fIdx + 1}0${uIdx + 1}`,
            number: `${fIdx + 1}0${uIdx + 1}`,
            floorLevel: fIdx + 1,
            type: (uIdx === 3 ? "3BHK" : "2BHK") as any,
            areaSqFt: uIdx === 3 ? 1250 : 950,
            ownerName: "Protected Record",
            ownerAadhaarMasked: "PROTECTED",
            occupancy: "OCCUPIED" as any,
            status: "VERIFIED" as any,
            taxAssessment: `TAX-${society.id.slice(0, 4)}-${fIdx + 1}0${uIdx + 1}`,
            healthScore: 95,
            propertyRecordId: `PROP-${society.id.slice(0, 6)}`,
            demoSpatialId: `SPATIAL-FL-${fIdx + 1}0${uIdx + 1}`,
            fromRegistry: true,
            sourceType: "REGISTRY" as any,
          })),
          status: "VERIFIED" as const,
          floorId: `FLOOR-${fIdx + 1}`,
        })),
        linked: true,
      };
    }

    return base;
  }, [linkedTowerData, routeProperty, society, image3DResult, selectedTowerId, selectedTower]);

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

  React.useEffect(() => {
    const onFsChange = () => setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

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

          <div className="flex flex-wrap items-center gap-2">
            {/* Phase 23 — Society 3D ULPIN HUD Pill & Copy Action */}
            {societyUlpinRecord && (
              <div className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/60 px-2.5 py-1 text-[11px] shadow-[0_0_10px_rgba(6,182,212,0.15)]">
                <Fingerprint className="h-3.5 w-3.5 text-cyan-400" />
                <span className="font-mono text-cyan-200 font-extrabold">{societyUlpinRecord.society3DUlpin}</span>
                <button
                  type="button"
                  onClick={() => handleCopyUlpin(societyUlpinRecord.society3DUlpin)}
                  className="ml-1 text-slate-400 hover:text-cyan-300 transition-colors"
                  title="Copy Society 3D ULPIN"
                >
                  {copiedUlpin ? <CheckCheck className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            )}

            {/* Phase 22 & 23 — Complete 7-Parcel Society Digital Twin Quick Switcher */}
            <div className="flex items-center gap-1.5 rounded-lg border border-[#164E73] bg-[#061426] px-2.5 py-1 text-[11px]">
              <Building2 className="h-3.5 w-3.5 text-[#00D9FF]" />
              <span className="text-[10px] font-bold text-slate-400 uppercase hidden sm:inline">Society:</span>
              <select
                value={resolvedSocietyId}
                onChange={(e) => {
                  const newSoc = e.target.value;
                  router.push(`/properties/${routeId}/digital-twin?society=${newSoc}&parcel=${newSoc}`);
                }}
                aria-label="Select Society 3D Digital Twin"
                className="bg-transparent text-xs font-bold text-cyan-300 focus:outline-none cursor-pointer"
              >
                <option value="PARCEL-MH-PUN-001" className="bg-slate-900 text-white">S3D-MH-PUN-GVR-001 · Green View (3 Bldgs)</option>
                <option value="PARCEL-MH-PUN-002" className="bg-slate-900 text-white">S3D-MH-PUN-SKA-001 · Shree Krishna (5 Bldgs)</option>
                <option value="PARCEL-MH-PUN-003" className="bg-slate-900 text-white">S3D-MH-PUN-TT-001 · Tech Tower (2 Blocks)</option>
                <option value="PARCEL-MH-PUN-004" className="bg-slate-900 text-white">S3D-MH-PUN-WAK-001 · Wakad Heights (4 Bldgs)</option>
                <option value="PARCEL-MH-PUN-005" className="bg-slate-900 text-white">S3D-MH-PUN-HIN-001 · Hinjewadi Enclave (6 Blocks)</option>
                <option value="PARCEL-MH-PUN-006" className="bg-slate-900 text-white">S3D-MH-PUN-AMA-001 · Amanora Elegance (2 Towers)</option>
                <option value="PARCEL-MH-PUN-074" className="bg-slate-900 text-white">S3D-MH-PUN-LR-001 · Life Republic (5 Towers)</option>
                <option value="society-unconfigured-test" className="bg-slate-900 text-white">S3D-MH-PUN-UNC-999 · Pristine Meadows (Unconfigured)</option>
              </select>
            </div>

            <Link
              href={`/digital-twin?society=${resolvedSocietyId}&ulpin=${societyUlpinRecord?.society3DUlpin || ""}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-bold text-cyan-300 transition-colors hover:bg-cyan-500/20 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
              title="Open Society 3D ULPIN Gateway"
            >
              <Fingerprint className="h-3.5 w-3.5 text-cyan-400" /> Gateway
            </Link>

            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-bold text-cyan-300 transition-colors hover:bg-cyan-500/20 shadow-[0_0_10px_rgba(0,217,255,0.2)]"
            >
              <UploadCloud className="h-3.5 w-3.5 text-cyan-400" /> Upload Site Plan
            </button>

            <button
              type="button"
              onClick={() => setShowInspectionSummary(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#164E73] bg-[#061426] px-3 py-1.5 text-[11px] font-bold text-[#F8FAFC] transition-colors hover:border-[#00D9FF]/50 hover:text-[#00D9FF]"
            >
              <FileText className="h-3.5 w-3.5 text-[#00D9FF]" /> Inspection
            </button>
            <Link
              href={selectedTowerId ? `/map?society=${resolvedSocietyId}&building=${selectedTowerId}` : `/map?society=${resolvedSocietyId}&parcel=${resolvedSocietyId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#00D9FF]/40 bg-[#00D9FF]/10 px-3 py-1.5 text-[11px] font-bold text-[#00D9FF] transition-colors hover:bg-[#00D9FF]/20"
            >
              <MapPinned className="h-3.5 w-3.5" /> 2D GIS Map
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
                    digitalTwin={societyDigitalTwin}
                    generatedModelUrl={societyDigitalTwin?.generatedModelUrl}
                    onUploadImageClick={() => setShowUploadModal(true)}
                    onGenerateTwinClick={() => setShowUploadModal(true)}
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
                    towers={sceneTowers}
                    societyImageUrl={societyImageUrl}
                    societyName={societyDigitalTwin?.societyName || society?.name || routeProperty?.title}
                    isAiReconstructed={Boolean(societyImageUrl || (societyDigitalTwin && societyDigitalTwin.sourceImage))}
                    className="h-full w-full"
                  />
                </div>

                {/* scene identity header — dynamic society or default */}
                <TownshipSceneHeader
                  className="absolute left-3 top-3 z-20"
                  title={society?.name || routeProperty?.title || TOWNSHIP_SITE.name}
                  subtitle={
                    society?.address
                      ? `${society.address.city || ""}${society.address.state ? `, ${society.address.state}` : ""}`
                      : TOWNSHIP_SITE.subtitle
                  }
                  isAiReconstructed={Boolean(societyImageUrl)}
                />

                {/* Phase 7 & 19 — 3D Inspection Toolbar with On-Demand Dropdowns */}
                <InspectionToolbar
                  className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 max-w-[calc(100%-24px)] overflow-x-auto scrollbar-none"
                  onResetCamera={handleReset}
                  openDiscrepancyCount={conflicts.length}
                  towers={sceneTowers}
                  selectedTower={selectedTower}
                  onSelectTower={handleSelectTower}
                  linkedBuilding={linkedTowerData.building}
                  linkedFloors={linkedTowerData.floors}
                  linkedUnits={linkedTowerData.units}
                  parcel={linkedTowerData.parcel}
                  property={routeProperty}
                  explicitFloors={explicitFloors}
                  selectedLevel={selectedLevel}
                  onSelectLevel={handleSelectLevel}
                  selectedUnitId={selectedUnitId}
                  onSelectUnit={(uid) => {
                    setSelectedUnitId(uid);
                    inspection.selectFlat(uid);
                  }}
                  floorMode={floorMode}
                  onFloorModeChange={handleFloorMode}
                  onFocusTower={(t) => {
                    viewerHandleRef.current?.focusTower?.(t);
                  }}
                  onOpenProperty={() => router.push(`/properties/${routeProperty?.id ?? "PROP-LR-B-0402"}`)}
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
                    <div onClick={() => setShowBuildingPanel(true)} className="cursor-pointer">
                      <TownshipSelectedChip
                        tower={selectedTower}
                        linked={towerLinkedToDb}
                        onClear={() => handleSelectTower(null)}
                        className="absolute bottom-16 right-3 z-20 sm:bottom-3"
                      />
                    </div>
                  )}
                </AnimatePresence>

                {/* selected building interactive inspection panel */}
                <AnimatePresence>
                  {selectedTower && showBuildingPanel && (
                    <div className="absolute right-3 top-[56px] z-30 max-h-[calc(100%-120px)] overflow-y-auto scrollbar-none">
                      <TownshipBuildingPanel
                        tower={selectedTower}
                        linkedBuilding={linkedTowerData.building}
                        linkedFloors={linkedTowerData.floors}
                        linkedUnits={linkedTowerData.units}
                        parcel={linkedTowerData.parcel}
                        property={routeProperty}
                        onClose={() => setShowBuildingPanel(false)}
                        onViewBuilding={() => {
                          if (selectedTower) {
                            viewerHandleRef.current?.focusTower?.(selectedTower);
                          }
                        }}
                        onToggleIsolate={() => inspection.toggleBuildingIsolation()}
                        isIsolated={inspection.buildingIsolation}
                        onViewFloors={() => handleFloorMode('show')}
                        onToggleExplode={() => handleFloorMode(floorMode === 'explode' ? 'all' : 'explode')}
                        isExploded={floorMode === 'explode'}
                        onOpenProperty={() => {
                          if (routeProperty?.id) router.push(`/properties/${routeProperty.id}`);
                          else if (linkedTowerData.units[0]?.id) router.push(`/properties/${linkedTowerData.units[0].id}`);
                        }}
                      />
                    </div>
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
        <BuildingAnalytics building={twinView.building} floors={twinView.floors} />

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

        {/* Phase 22 — Site Plan Upload & 3D Twin Synthesis Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="relative max-w-lg w-full rounded-2xl border border-cyan-500/40 bg-slate-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-cyan-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Upload Site Plan &amp; Synthesize 3D Twin
                  </h3>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300">
                Upload a master plan, aerial photo, or architectural layout for <strong className="text-cyan-300">{societyDigitalTwin?.societyName || resolvedSocietyId}</strong>. Computer vision will extract building footprints, green zones, parking lots, and road networks.
              </p>

              {/* File input */}
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-cyan-500/40 bg-slate-900/50 p-6 text-center cursor-pointer hover:border-cyan-400 hover:bg-slate-900/80 transition-all">
                <UploadCloud className="h-8 w-8 text-cyan-400 animate-bounce" />
                <span className="text-xs font-bold text-slate-200">Click to select site image from your device</span>
                <span className="text-[10px] text-slate-400">Supports PNG, JPG, WEBP, drone aerial shots, and CAD master plans</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsSynthesizing(true);
                    setUploadStatus("Analyzing site image & extracting building massing...");
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      const dataUrl = ev.target?.result as string;
                      try {
                        const newTwin = await analyzeSocietySiteImage(
                          dataUrl,
                          societyDigitalTwin?.societyName || society?.name || "Dynamic Society",
                          resolvedSocietyId
                        );
                        saveSocietyDigitalTwin(newTwin);
                        setDigitalTwinVersion((v) => v + 1);
                        setUploadStatus("3D Digital Twin successfully generated!");
                        setTimeout(() => {
                          setShowUploadModal(false);
                          setIsSynthesizing(false);
                          setUploadStatus(null);
                        }, 1200);
                      } catch (err) {
                        setUploadStatus("Failed to analyze image. Please try again.");
                        setIsSynthesizing(false);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                  disabled={isSynthesizing}
                />
              </label>

              {/* Sample Layout Presets for Instant Testing */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Or Test with Sample Society Digital Twins:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/properties/${routeId}/digital-twin?societyId=PARCEL-MH-PUN-074`);
                      setShowUploadModal(false);
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-left hover:border-cyan-400 text-slate-200 font-bold hover:bg-slate-800"
                  >
                    Life Republic (5 Towers)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/properties/${routeId}/digital-twin?societyId=PARCEL-MH-PUN-001`);
                      setShowUploadModal(false);
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-left hover:border-cyan-400 text-slate-200 font-bold hover:bg-slate-800"
                  >
                    Society A (3 Bldgs)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/properties/${routeId}/digital-twin?societyId=PARCEL-MH-PUN-002`);
                      setShowUploadModal(false);
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-left hover:border-cyan-400 text-slate-200 font-bold hover:bg-slate-800"
                  >
                    Society B (5 Bldgs)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/properties/${routeId}/digital-twin?societyId=PARCEL-MH-PUN-003`);
                      setShowUploadModal(false);
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-left hover:border-cyan-400 text-slate-200 font-bold hover:bg-slate-800"
                  >
                    Society C (2 Bldgs)
                  </button>
                </div>
              </div>

              {uploadStatus && (
                <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/70 p-2.5 text-center text-xs font-bold text-cyan-300 animate-pulse">
                  {uploadStatus}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}