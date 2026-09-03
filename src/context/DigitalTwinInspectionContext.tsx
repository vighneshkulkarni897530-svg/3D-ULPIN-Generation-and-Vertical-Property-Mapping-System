"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { TownshipFloorMode } from "@/components/digital-twin/township/townshipData";
import type { ConflictSeverity, ConflictStatus } from "@/types/conflict";

export type InspectionMode = "overview" | "building" | "floor" | "property";

export interface MeasurePoint {
  x: number;
  y: number;
  z: number;
}

export interface DiscrepancyFilter {
  status: "all" | ConflictStatus;
  severity: "all" | ConflictSeverity;
}

export interface DigitalTwinInspectionContextType {
  // Inspection target state
  inspectionMode: InspectionMode;
  selectedBuildingId: string | null;
  selectedFloorId: string | null;
  selectedFloorNumber: number | null;
  selectedFlatId: string | null;

  // Isolation & slicing
  buildingIsolation: boolean;
  floorMode: TownshipFloorMode;

  // Analysis tools
  shadowAnalysis: boolean;
  solarTimeMinutes: number; // 360 (6am) to 1080 (6pm), default 720 (12pm)
  measurementMode: boolean;
  measurePointA: MeasurePoint | null;
  measurePointB: MeasurePoint | null;
  measuredDistance: number | null;

  // Discrepancy & Verification overlays
  discrepancyOverlay: boolean;
  discrepancyFilter: DiscrepancyFilter;
  verificationOverlay: boolean;

  // Actions
  setInspectionMode: (mode: InspectionMode) => void;
  selectBuilding: (buildingId: string | null) => void;
  selectFloor: (floorNumber: number | null, floorId?: string | null) => void;
  selectFlat: (flatId: string | null) => void;
  setBuildingIsolation: (isolated: boolean) => void;
  toggleBuildingIsolation: () => void;
  setFloorMode: (mode: TownshipFloorMode) => void;
  setShadowAnalysis: (enabled: boolean) => void;
  toggleShadowAnalysis: () => void;
  setSolarTimeMinutes: (minutes: number) => void;
  setMeasurementMode: (enabled: boolean) => void;
  toggleMeasurementMode: () => void;
  setMeasurePoint: (point: MeasurePoint) => void;
  clearMeasurement: () => void;
  setDiscrepancyOverlay: (enabled: boolean) => void;
  toggleDiscrepancyOverlay: () => void;
  setDiscrepancyFilter: (filter: Partial<DiscrepancyFilter>) => void;
  setVerificationOverlay: (enabled: boolean) => void;
  toggleVerificationOverlay: () => void;
  resetInspection: () => void;
}

const DigitalTwinInspectionContext = createContext<DigitalTwinInspectionContextType | undefined>(undefined);

export const DigitalTwinInspectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inspectionMode, setInspectionMode] = useState<InspectionMode>("overview");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedFloorNumber, setSelectedFloorNumber] = useState<number | null>(null);
  const [selectedFlatId, setSelectedFlatId] = useState<string | null>(null);

  const [buildingIsolation, setBuildingIsolation] = useState<boolean>(false);
  const [floorMode, setFloorMode] = useState<TownshipFloorMode>("all");

  const [shadowAnalysis, setShadowAnalysis] = useState<boolean>(false);
  const [solarTimeMinutes, setSolarTimeMinutes] = useState<number>(720); // 12:00 PM default

  const [measurementMode, setMeasurementMode] = useState<boolean>(false);
  const [measurePointA, setMeasurePointA] = useState<MeasurePoint | null>(null);
  const [measurePointB, setMeasurePointB] = useState<MeasurePoint | null>(null);

  const [discrepancyOverlay, setDiscrepancyOverlay] = useState<boolean>(false);
  const [discrepancyFilter, setDiscrepancyFilterState] = useState<DiscrepancyFilter>({
    status: "all",
    severity: "all",
  });

  const [verificationOverlay, setVerificationOverlay] = useState<boolean>(true);

  // Compute Euclidean distance in scene meters
  const measuredDistance = useMemo(() => {
    if (!measurePointA || !measurePointB) return null;
    const dx = measurePointB.x - measurePointA.x;
    const dy = measurePointB.y - measurePointA.y;
    const dz = measurePointB.z - measurePointA.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }, [measurePointA, measurePointB]);

  const selectBuilding = useCallback((buildingId: string | null) => {
    setSelectedBuildingId(buildingId);
    setSelectedFloorId(null);
    setSelectedFloorNumber(null);
    setSelectedFlatId(null);
    if (buildingId) {
      setInspectionMode("building");
    } else {
      setInspectionMode("overview");
      setBuildingIsolation(false);
      setFloorMode("all");
    }
  }, []);

  const selectFloor = useCallback((floorNumber: number | null, floorId?: string | null) => {
    setSelectedFloorNumber(floorNumber);
    setSelectedFloorId(floorId ?? null);
    setSelectedFlatId(null);
    if (floorNumber !== null) {
      setInspectionMode("floor");
    } else if (selectedBuildingId) {
      setInspectionMode("building");
    } else {
      setInspectionMode("overview");
    }
  }, [selectedBuildingId]);

  const selectFlat = useCallback((flatId: string | null) => {
    setSelectedFlatId(flatId);
    if (flatId) {
      setInspectionMode("property");
    } else if (selectedFloorNumber !== null) {
      setInspectionMode("floor");
    } else if (selectedBuildingId) {
      setInspectionMode("building");
    } else {
      setInspectionMode("overview");
    }
  }, [selectedBuildingId, selectedFloorNumber]);

  const toggleBuildingIsolation = useCallback(() => {
    setBuildingIsolation((prev) => !prev);
  }, []);

  const toggleShadowAnalysis = useCallback(() => {
    setShadowAnalysis((prev) => !prev);
  }, []);

  const toggleMeasurementMode = useCallback(() => {
    setMeasurementMode((prev) => {
      if (prev) {
        setMeasurePointA(null);
        setMeasurePointB(null);
      }
      return !prev;
    });
  }, []);

  const setMeasurePoint = useCallback((point: MeasurePoint) => {
    if (!measurePointA || (measurePointA && measurePointB)) {
      setMeasurePointA(point);
      setMeasurePointB(null);
    } else {
      setMeasurePointB(point);
    }
  }, [measurePointA, measurePointB]);

  const clearMeasurement = useCallback(() => {
    setMeasurePointA(null);
    setMeasurePointB(null);
  }, []);

  const toggleDiscrepancyOverlay = useCallback(() => {
    setDiscrepancyOverlay((prev) => !prev);
  }, []);

  const setDiscrepancyFilter = useCallback((filter: Partial<DiscrepancyFilter>) => {
    setDiscrepancyFilterState((prev) => ({ ...prev, ...filter }));
  }, []);

  const toggleVerificationOverlay = useCallback(() => {
    setVerificationOverlay((prev) => !prev);
  }, []);

  const resetInspection = useCallback(() => {
    setInspectionMode("overview");
    setSelectedBuildingId(null);
    setSelectedFloorId(null);
    setSelectedFloorNumber(null);
    setSelectedFlatId(null);
    setBuildingIsolation(false);
    setFloorMode("all");
    setShadowAnalysis(false);
    setSolarTimeMinutes(720);
    setMeasurementMode(false);
    setMeasurePointA(null);
    setMeasurePointB(null);
    setDiscrepancyOverlay(false);
    setDiscrepancyFilterState({ status: "all", severity: "all" });
    setVerificationOverlay(true);
  }, []);

  const value = useMemo<DigitalTwinInspectionContextType>(
    () => ({
      inspectionMode,
      selectedBuildingId,
      selectedFloorId,
      selectedFloorNumber,
      selectedFlatId,
      buildingIsolation,
      floorMode,
      shadowAnalysis,
      solarTimeMinutes,
      measurementMode,
      measurePointA,
      measurePointB,
      measuredDistance,
      discrepancyOverlay,
      discrepancyFilter,
      verificationOverlay,
      setInspectionMode,
      selectBuilding,
      selectFloor,
      selectFlat,
      setBuildingIsolation,
      toggleBuildingIsolation,
      setFloorMode,
      setShadowAnalysis,
      toggleShadowAnalysis,
      setSolarTimeMinutes,
      setMeasurementMode,
      toggleMeasurementMode,
      setMeasurePoint,
      clearMeasurement,
      setDiscrepancyOverlay,
      toggleDiscrepancyOverlay,
      setDiscrepancyFilter,
      setVerificationOverlay,
      toggleVerificationOverlay,
      resetInspection,
    }),
    [
      inspectionMode,
      selectedBuildingId,
      selectedFloorId,
      selectedFloorNumber,
      selectedFlatId,
      buildingIsolation,
      floorMode,
      shadowAnalysis,
      solarTimeMinutes,
      measurementMode,
      measurePointA,
      measurePointB,
      measuredDistance,
      discrepancyOverlay,
      discrepancyFilter,
      verificationOverlay,
      selectBuilding,
      selectFloor,
      selectFlat,
      toggleBuildingIsolation,
      toggleShadowAnalysis,
      toggleMeasurementMode,
      setMeasurePoint,
      clearMeasurement,
      toggleDiscrepancyOverlay,
      setDiscrepancyFilter,
      toggleVerificationOverlay,
      resetInspection,
    ]
  );

  return (
    <DigitalTwinInspectionContext.Provider value={value}>
      {children}
    </DigitalTwinInspectionContext.Provider>
  );
};

export const useDigitalTwinInspection = (): DigitalTwinInspectionContextType => {
  const context = useContext(DigitalTwinInspectionContext);
  if (!context) {
    throw new Error("useDigitalTwinInspection must be used within a DigitalTwinInspectionProvider");
  }
  return context;
};
