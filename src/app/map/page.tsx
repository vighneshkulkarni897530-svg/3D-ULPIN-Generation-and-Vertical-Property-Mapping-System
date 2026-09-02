"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { Map as LeafletMap } from "leaflet";
import { X, TriangleAlert, Loader2, Info, PanelLeftOpen } from "lucide-react";
import { PageLoader } from "@/components/layout/LoadingState";
import { GisToolbar, type MapMode } from "@/components/gis/GisToolbar";
import { GisLayersPanel } from "@/components/gis/GisLayersPanel";
import { GisEntityPanel } from "@/components/gis/GisEntityPanel";
import { GisWorkflow } from "@/components/gis/GisWorkflow";
import { DEFAULT_LAYERS, type LayerState } from "@/lib/gisLayers";
import { lngLatRing, ringBounds } from "@/lib/gisGeo";
import { useGIS } from "@/context/GISContext";
import type { SpatialConflict } from "@/types/conflict";
import { ExtractionMapOverlay } from "@/components/ai/ExtractionMapOverlay";
import { loadExtractionFromSession, type ExtractionResult } from "@/lib/aiExtraction";
import { cn } from "@/lib/utils";

// Leaflet and R3F touch browser APIs at import time — load both client-side only.
const GisMap2D = dynamic(
  () => import("@/components/gis/GisMap2D").then((m) => m.GisMap2D),
  { ssr: false, loading: () => <CanvasLoader label="Loading 2D GIS canvas…" /> },
);
const GisViewer3D = dynamic(
  () => import("@/components/gis/GisViewer3D").then((m) => m.GisViewer3D),
  { ssr: false, loading: () => <CanvasLoader label="Loading 3D engine…" /> },
);

/** Demo-wide reset view (Pune survey cluster). */
const PUNE_CENTRE: [number, number] = [18.56, 73.78];
const RESET_ZOOM = 15;

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function MapWorkspacePage() {
  return (
    <ProtectedRoute>
      <MapWorkspaceContent />
    </ProtectedRoute>
  );
}

function MapWorkspaceContent() {
  return (
    <React.Suspense fallback={<PageLoader label="Preparing GIS workspace…" />}>
      <MapWorkspace />
    </React.Suspense>
  );
}

function MapWorkspace() {
  const {
    parcels,
    buildings,
    floors,
    properties,
    conflicts,
    selectedParcelId,
    selectedBuildingId,
    selectedFloorId,
    selectedPropertyId,
    selectParcel,
    selectBuilding,
    selectFloor,
    selectProperty,
  } = useGIS();

  const searchParams = useSearchParams();

  // ── Workspace state ──
  const [layers, setLayers] = React.useState<LayerState>(DEFAULT_LAYERS);
  const [mode, setMode] = React.useState<MapMode>("2d");
  const [tool, setTool] = React.useState<"select" | "pan">("select");
  const [leftOpen, setLeftOpen] = React.useState(true);
  const [rightOpen, setRightOpen] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  const [measureVisible, setMeasureVisible] = React.useState(false);
  const [viewerKey, setViewerKey] = React.useState(0);
  const [selectedConflictId, setSelectedConflictId] = React.useState<string | null>(null);
  const [prototypeExtraction, setPrototypeExtraction] = React.useState<ExtractionResult | null>(null);
  const [notFound, setNotFound] = React.useState<string | null>(null);
  const mapRef = React.useRef<LeafletMap | null>(null);

  const toggleLayer = React.useCallback((key: keyof LayerState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── Query-parameter deep links: ?society= ?parcel= ?building= ?property= ?flat= ?ulpin= ?floor= ?conflict= ──
  React.useEffect(() => {
    const propertyParam = searchParams.get("property") || searchParams.get("flat");
    const buildingParam = searchParams.get("building");
    const parcelParam = searchParams.get("parcel") || searchParams.get("society");
    const ulpinParam = searchParams.get("ulpin");
    const floorParam = searchParams.get("floor");
    const conflictParam = searchParams.get("conflict");
    const extractionParam = searchParams.get("extraction");
    // Phase 7 — ?mode=3d lets property/building pages land directly in the 3D viewer.
    const modeParam = searchParams.get("mode");
    if (modeParam === "3d") setMode("3d");
    else if (modeParam === "2d") setMode("2d");

    if (ulpinParam) {
      const cleanUlpin = ulpinParam.trim().toUpperCase();
      const matchedProperty = properties.find(
        (p) => p.demoSpatialId.toUpperCase() === cleanUlpin || p.demoSpatialId.replace(/[^A-Z0-9]/g, '') === cleanUlpin.replace(/[^A-Z0-9]/g, '')
      );
      const matchedParcel = parcels.find(
        (p) => p.parcelNumber.toUpperCase() === cleanUlpin || p.parcelNumber.replace(/[^A-Z0-9]/g, '') === cleanUlpin.replace(/[^A-Z0-9]/g, '')
      );

      if (matchedProperty) {
        selectProperty(matchedProperty.id);
        setRightOpen(true);
        setSheetOpen(true);
      } else if (matchedParcel) {
        selectParcel(matchedParcel.id);
        setRightOpen(true);
        setSheetOpen(true);
      } else {
        setNotFound(`ULPIN / Spatial ID "${ulpinParam}" was not found in the registry.`);
      }
    } else if (propertyParam) {
      if (properties.some((p) => p.id === propertyParam)) {
        selectProperty(propertyParam);
        setRightOpen(true);
        setSheetOpen(true);
      } else {
        setNotFound(`Property "${propertyParam}" was not found in the registry.`);
      }
    } else if (buildingParam) {
      if (buildings.some((b) => b.id === buildingParam)) {
        selectBuilding(buildingParam);
        setRightOpen(true);
        setSheetOpen(true);
      } else {
        setNotFound(`Building "${buildingParam}" was not found in the registry.`);
      }
    } else if (parcelParam) {
      if (parcels.some((p) => p.id === parcelParam)) {
        selectParcel(parcelParam);
        setRightOpen(true);
        setSheetOpen(true);
      } else {
        setNotFound(`Parcel/Society "${parcelParam}" was not found in the registry.`);
      }
    }

    if (floorParam) {
      if (floors.some((f) => f.id === floorParam)) selectFloor(floorParam);
      else setNotFound(`Floor "${floorParam}" was not found in the registry.`);
    }

    if (conflictParam) {
      if (conflicts.some((c) => c.id === conflictParam)) {
        setSelectedConflictId(conflictParam);
        setRightOpen(true);
        setSheetOpen(true);
      } else {
        setNotFound(`Conflict "${conflictParam}" was not found in the registry.`);
      }
    }

    if (extractionParam) {
      // Prototype extractions travel through the browser-session store
      // (see /ai-extraction). Nothing here mutates the demo GIS registry.
      const found = loadExtractionFromSession(extractionParam);
      if (found) {
        setPrototypeExtraction(found);
      } else {
        setNotFound(
          `Prototype extraction "${extractionParam}" was not found in this browser session — run the extraction again from the AI workspace.`,
        );
      }
    }
    // Deep-link resolution runs once per URL change; registry data and the
    // selection actions are stable for the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const selectedConflict: SpatialConflict | null =
    conflicts.find((c) => c.id === selectedConflictId) ?? null;

  // Frame the prototype extraction footprint whenever one is active (2D only).
  React.useEffect(() => {
    if (mode !== "2d" || !prototypeExtraction) return;
    mapRef.current?.flyTo([prototypeExtraction.centroid.lat, prototypeExtraction.centroid.lng], 17, { duration: 0.8 });
  }, [mode, prototypeExtraction]);

  // Map clicks clear any conflict highlight and open the details surface.
  const handleSelectParcel = React.useCallback(
    (id: string) => {
      setSelectedConflictId(null);
      selectParcel(id);
      setSheetOpen(true);
    },
    [selectParcel],
  );
  const handleSelectBuilding = React.useCallback(
    (id: string) => {
      setSelectedConflictId(null);
      selectBuilding(id);
      setSheetOpen(true);
    },
    [selectBuilding],
  );
  const handleSelectProperty = React.useCallback(
    (id: string) => {
      setSelectedConflictId(null);
      selectProperty(id);
      setSheetOpen(true);
    },
    [selectProperty],
  );
  const handleSelectConflict = React.useCallback((id: string) => {
    setSelectedConflictId(id);
    setSheetOpen(true);
  }, []);

  // ── Toolbar callbacks ──
  // The Leaflet instance is only attached while the 2D map is mounted. Guard
  // the zoom actions (and drop the ref when leaving 2D) so the toolbar can
  // never drive a detached map — that crashes Leaflet with "_leaflet_pos".
  const handleZoomIn = React.useCallback(() => {
    if (mode !== "2d") return;
    mapRef.current?.zoomIn();
  }, [mode]);
  const handleZoomOut = React.useCallback(() => {
    if (mode !== "2d") return;
    mapRef.current?.zoomOut();
  }, [mode]);

  // Clear the stale map reference as soon as the 2D map leaves the DOM.
  React.useEffect(() => {
    if (mode !== "2d") mapRef.current = null;
  }, [mode]);

  const handleResetView = React.useCallback(() => {
    if (mode === "2d") {
      mapRef.current?.flyTo(PUNE_CENTRE, RESET_ZOOM, { duration: 0.8 });
    } else {
      setViewerKey((k) => k + 1); // remount the 3D scene → default camera
    }
  }, [mode]);

  const handleFitSelection = React.useCallback(() => {
    const map = mapRef.current;
    if (!map || mode !== "2d") return;
    const conflict = conflicts.find((c) => c.id === selectedConflictId);
    if (conflict) {
      const b = ringBounds(lngLatRing(conflict.geometry));
      map.flyTo([(b.minLat + b.maxLat) / 2, (b.minLng + b.maxLng) / 2], 17, { duration: 0.8 });
      return;
    }
    const property = properties.find((p) => p.id === selectedPropertyId);
    if (property) {
      map.flyTo([property.latitude, property.longitude], 19, { duration: 0.8 });
      return;
    }
    const building = buildings.find((b) => b.id === selectedBuildingId);
    if (building) {
      const b = ringBounds(lngLatRing(building.geometry));
      map.flyTo([(b.minLat + b.maxLat) / 2, (b.minLng + b.maxLng) / 2], 18, { duration: 0.8 });
      return;
    }
    const parcel = parcels.find((p) => p.id === selectedParcelId);
    if (parcel) map.flyTo([parcel.centroid.lat, parcel.centroid.lng], 16, { duration: 0.8 });
  }, [
    mode,
    conflicts,
    selectedConflictId,
    properties,
    selectedPropertyId,
    buildings,
    selectedBuildingId,
    parcels,
    selectedParcelId,
  ]);

  // Measure is an explicitly-labelled demo tool — never a legal measurement.
  const measureTimer = React.useRef<number | null>(null);
  const handleMeasure = React.useCallback(() => {
    setMeasureVisible(true);
    if (measureTimer.current) window.clearTimeout(measureTimer.current);
    measureTimer.current = window.setTimeout(() => setMeasureVisible(false), 4500);
  }, []);

  // ── 2D → 3D workflow ──
  const startWorkflow = React.useCallback(() => setProcessing(true), []);
  const completeWorkflow = React.useCallback(() => {
    setProcessing(false);
    setMode("3d");
    setSheetOpen(false);
  }, []);

  // Stable Leaflet-ready binding (only ever called again when the 2D map
  // actually remounts), unlike an inline arrow which re-fired every render.
  const handleMapReady = React.useCallback((map: LeafletMap) => {
    mapRef.current = map;
  }, []);

  // ── Derived selection label (mobile pill, toolbar state) ──
  const selectedProperty = properties.find((p) => p.id === selectedPropertyId) ?? null;
  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId) ?? null;
  const selectedParcel = parcels.find((p) => p.id === selectedParcelId) ?? null;
  const selectionLabel =
    selectedConflict?.conflictNumber ??
    selectedProperty?.id ??
    selectedBuilding?.name ??
    selectedParcel?.parcelNumber ??
    null;

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-[560px] flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* Entity-not-found notice (bad deep links) */}
      {notFound && (
        <div
          role="alert"
          className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[11px] font-semibold text-amber-300"
        >
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1">{notFound}</span>
          <button
            type="button"
            onClick={() => setNotFound(null)}
            aria-label="Dismiss notice"
            title="Dismiss notice"
            className="rounded p-0.5 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* GIS toolbar */}
      <GisToolbar
        mode={mode}
        onModeChange={setMode}
        tool={tool}
        onToolChange={setTool}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onFitSelection={handleFitSelection}
        onOpenLayers={() => setLeftOpen((o) => !o)}
        layersOpen={leftOpen}
        onMeasure={handleMeasure}
        processing={processing}
        hasSelection={!!selectionLabel}
      />

      {/* Workspace body */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left panel — static column on desktop, overlay drawer below xl */}
        {leftOpen && (
          <>
            <button
              type="button"
              aria-label="Close layers panel"
              onClick={() => setLeftOpen(false)}
              className="absolute inset-0 z-20 bg-slate-950/60 xl:hidden"
            />
            <aside className="absolute inset-y-0 left-0 z-30 w-72 shrink-0 border-r border-slate-800 bg-slate-950 shadow-2xl xl:static xl:z-auto xl:shadow-none">
              <GisLayersPanel layers={layers} onToggleLayer={toggleLayer} />
            </aside>
          </>
        )}

        {/* Map / 3D canvas — the visual centerpiece */}
        <div className="relative min-w-0 flex-1">
          {mode === "2d" ? (
            <GisMap2D
              parcels={parcels}
              buildings={buildings}
              properties={properties}
              conflicts={conflicts}
              layers={layers}
              selectedParcelId={selectedParcelId}
              selectedBuildingId={selectedBuildingId}
              selectedFloorId={selectedFloorId}
              selectedPropertyId={selectedPropertyId}
              selectedConflictId={selectedConflictId}
              onSelectParcel={handleSelectParcel}
              onSelectBuilding={handleSelectBuilding}
              onSelectProperty={handleSelectProperty}
              onSelectConflict={handleSelectConflict}
              prototypeExtraction={prototypeExtraction}
              onMapReady={handleMapReady}
              className="h-full w-full"
            />
          ) : (
            <ViewerErrorBoundary key={viewerKey}>
              <GisViewer3D
                parcels={parcels}
                buildings={buildings}
                floors={floors}
                properties={properties}
                conflicts={conflicts}
                layers={layers}
                selectedParcelId={selectedParcelId}
                selectedBuildingId={selectedBuildingId}
                selectedFloorId={selectedFloorId}
                selectedPropertyId={selectedPropertyId}
                selectedConflictId={selectedConflictId}
                onSelectParcel={handleSelectParcel}
                onSelectBuilding={handleSelectBuilding}
                onSelectFloor={(id) => selectFloor(id || null)}
                prototypeExtraction={prototypeExtraction}
                onSelectProperty={handleSelectProperty}
                className="h-full w-full"
              />
            </ViewerErrorBoundary>
          )}

          {/* 3D focus hint — the MVP scene renders everything; a building sharpens it */}
          {mode === "3d" && !selectedBuildingId && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-slate-700 bg-slate-950/85 px-3.5 py-1.5 text-[10px] font-bold text-slate-300 shadow-xl">
              Select a building to focus the vertical structure — parcels render flat without a selection
            </div>
          )}

          {/* Prototype extraction overlay — session-transported from /ai-extraction */}
          {prototypeExtraction && (
            <div className="absolute right-3 top-3 z-30">
              <ExtractionMapOverlay result={prototypeExtraction} onClose={() => setPrototypeExtraction(null)} />
            </div>
          )}
        </div>

        {/* Right details panel — static on xl, replaced by the bottom sheet below xl */}
        {rightOpen && (
          <aside className="hidden w-80 shrink-0 border-l border-slate-800 bg-slate-950 xl:block">
            <GisEntityPanel
              selectedConflict={selectedConflict}
              onVisualizeIn3D={startWorkflow}
              onClose={() => setRightOpen(false)}
            />
          </aside>
        )}
        {!rightOpen && (
          <button
            type="button"
            onClick={() => setRightOpen(true)}
            aria-label="Open details panel"
            title="Open details panel"
            className="absolute right-3 top-3 z-30 hidden items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-[10px] font-bold text-slate-300 shadow-xl transition-colors hover:border-cyan-500/50 hover:text-white xl:flex"
          >
            <PanelLeftOpen className="h-3.5 w-3.5 rotate-180" /> Details
          </button>
        )}
      </div>

      {/* Mobile / tablet bottom sheet — compact alternative to the side panel */}
      <div className="xl:hidden">
        {sheetOpen && selectionLabel ? (
          <div className="fixed inset-x-0 bottom-0 z-40 max-h-[62vh] overflow-hidden rounded-t-2xl border-t border-slate-700 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
              <p className="flex min-w-0 items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-200">
                <Info className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                <span className="truncate">{selectionLabel}</span>
              </p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close details sheet"
                title="Close details sheet"
                className="rounded-md border border-slate-800 bg-slate-900 p-1 text-slate-500 hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto">
              <GisEntityPanel
                selectedConflict={selectedConflict}
                onVisualizeIn3D={startWorkflow}
                onClose={() => setSheetOpen(false)}
                className="h-auto"
              />
            </div>
          </div>
        ) : (
          selectionLabel && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-cyan-500/40 bg-slate-950/95 px-4 py-2 text-[10.5px] font-bold text-cyan-300 shadow-tech-cyan"
            >
              <Info className="h-3.5 w-3.5" /> View selection · <span className="font-mono">{selectionLabel}</span>
            </button>
          )
        )}
      </div>

      {/* 2D → 3D reconstruction workflow */}
      <GisWorkflow open={processing} onComplete={completeWorkflow} onCancel={() => setProcessing(false)} />

      {/* Demo measure notice */}
      {measureVisible && (
        <div
          role="status"
          className="fixed bottom-20 left-4 z-40 flex max-w-xs items-start gap-2 rounded-xl border border-amber-500/40 bg-slate-950/95 px-3 py-2.5 text-[10.5px] font-semibold text-amber-300 shadow-2xl xl:bottom-6"
        >
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">
            <strong className="font-extrabold">Demo Tool</strong> — measurement is simulated for this demo environment and
            is not a legal survey measurement.
          </span>
          <button
            type="button"
            onClick={() => setMeasureVisible(false)}
            aria-label="Dismiss measure notice"
            className="rounded p-0.5 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── 3D engine guard ─────────────────────────────────────────────────────────

class ViewerErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 bg-slate-950 p-8 text-center">
          <TriangleAlert className="h-8 w-8 text-amber-400" />
          <p className="text-sm font-bold text-slate-200">3D engine could not start</p>
          <p className="max-w-sm text-[11px] leading-relaxed text-slate-500">
            WebGL may be unavailable in this browser. The 2D GIS canvas continues to work — switch back with the
            2D/3D toggle in the toolbar.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

function CanvasLoader({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-950">
      <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
}


