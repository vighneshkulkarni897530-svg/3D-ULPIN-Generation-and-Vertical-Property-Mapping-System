"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Layers,
  MapPinned,
  ShieldCheck,
  AlertTriangle,
  Fingerprint,
  Compass,
  ExternalLink,
  X,
  Database,
  Box,
} from "lucide-react";
import { useDigitalTwinInspection } from "@/context/DigitalTwinInspectionContext";
import { useGIS } from "@/context/GISContext";
import { useProperty } from "@/context/PropertyContext";
import { cn } from "@/lib/utils";
import type { Building, Floor, LandParcel, PropertyUnit } from "@/types/gis";

interface InspectionPanelProps {
  parcel?: LandParcel | null;
  building?: Building | null;
  floors?: Floor[];
  units?: PropertyUnit[];
  onClose?: () => void;
  className?: string;
}

function Row({
  label,
  value,
  mono = false,
  badgeColor,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  mono?: boolean;
  badgeColor?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[#164E73]/40 py-1.5 last:border-0">
      <dt className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">{label}</dt>
      <dd
        className={cn(
          "max-w-[62%] truncate text-right text-[10.5px] font-black text-[#F8FAFC]",
          mono && "font-mono",
          badgeColor
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function InspectionPanel({
  parcel,
  building,
  floors = [],
  units = [],
  onClose,
  className,
}: InspectionPanelProps) {
  const {
    inspectionMode,
    selectedBuildingId,
    selectedFloorNumber,
    selectedFlatId,
    buildingIsolation,
    floorMode,
    toggleBuildingIsolation,
    setFloorMode,
    selectFloor,
    selectFlat,
    resetInspection,
  } = useDigitalTwinInspection();

  const { conflicts, verifications } = useGIS();

  // Find active floor and flat
  const selectedFloor = useMemo(() => {
    if (selectedFloorNumber === null) return null;
    return floors.find((f) => f.floorNumber === selectedFloorNumber) ?? null;
  }, [floors, selectedFloorNumber]);

  const selectedFlat = useMemo(() => {
    if (!selectedFlatId) return null;
    return units.find((u) => u.id === selectedFlatId) ?? null;
  }, [units, selectedFlatId]);

  // Derived vertical spatial IDs
  const baseUlpin = parcel?.parcelNumber ?? "27412104101A8F";
  const buildingCode = building?.buildingCode ?? "A";
  const spatialBuildingId = `${baseUlpin}-BLD-${buildingCode}`;

  const spatialFloorId = selectedFloor
    ? `${baseUlpin}-F${String(selectedFloor.floorNumber).padStart(2, "0")}`
    : "—";

  const spatialFlatId = selectedFlat
    ? selectedFlat.demoSpatialId
    : selectedFloor
      ? `${baseUlpin}-F${String(selectedFloor.floorNumber).padStart(2, "0")}-01`
      : "—";

  // Check for discrepancies related to this building or flat
  const entityConflicts = useMemo(() => {
    return conflicts.filter((c) => {
      if (selectedFlatId && c.affectedPropertyIds.includes(selectedFlatId)) return true;
      if (building && c.affectedPropertyIds.some((id) => units.some((u) => u.id === id))) return true;
      return false;
    });
  }, [conflicts, selectedFlatId, building, units]);

  // Verification record for selected flat or building
  const verificationRecord = useMemo(() => {
    if (selectedFlatId) {
      return verifications.find((v) => v.propertyId === selectedFlatId) ?? null;
    }
    return null;
  }, [verifications, selectedFlatId]);

  const societyId = parcel?.id ?? building?.parcelId ?? "";
  const bldgId = building?.id ?? "";

  const gisMapUrl = `/map?society=${societyId}${bldgId ? `&building=${bldgId}` : ""}${selectedFlatId ? `&flat=${selectedFlatId}` : ""}`;

  return (
    <aside
      aria-label="3D Property Inspection Workbench"
      className={cn(
        "dt-hud dt-card-accent w-full max-w-[320px] rounded-2xl p-4 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.95)] backdrop-blur-md",
        className
      )}
    >
      {/* ── Header ── */}
      <div className="mb-3 flex items-start justify-between border-b border-[#164E73]/70 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#00D9FF]/40 bg-[#00D9FF]/10 text-[#00D9FF]">
            {inspectionMode === "property" ? (
              <Fingerprint className="h-4 w-4" />
            ) : inspectionMode === "floor" ? (
              <Layers className="h-4 w-4" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
          </div>
          <div>
            <p className="text-[8.5px] font-black uppercase tracking-[0.2em] text-[#00D9FF]">
              3D Inspection Workbench
            </p>
            <h3 className="truncate text-xs font-black text-[#F8FAFC]">
              {inspectionMode === "property" && selectedFlat
                ? `Unit ${selectedFlat.unitNumber}`
                : inspectionMode === "floor" && selectedFloor
                  ? `Floor ${selectedFloor.floorNumber}`
                  : building
                    ? building.name
                    : parcel
                      ? `Parcel ${parcel.parcelNumber}`
                      : "Township Overview"}
            </h3>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Close Panel"
            className="rounded-md p-1 text-[#64748B] hover:bg-[#061426] hover:text-[#F8FAFC]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Scrollable Inspector Sections ── */}
      <div className="max-h-[58vh] space-y-3.5 overflow-y-auto pr-1">
        {/* SECTION 1: Cadastral & Spatial Identity */}
        <section>
          <span className="mb-1 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-[#00D9FF]">
            <Fingerprint className="h-2.5 w-2.5" /> Cadastral &amp; Spatial IDs
          </span>
          <dl className="space-y-0.5">
            <Row label="Cadastral ULPIN" value={baseUlpin} mono />
            {building && <Row label="Building Spatial ID" value={spatialBuildingId} mono />}
            {selectedFloor && <Row label="Floor Spatial ID" value={spatialFloorId} mono />}
            {selectedFlat && <Row label="3D Vertical ULPIN" value={spatialFlatId} mono badgeColor="text-[#00D9FF]" />}
            <Row label="Society ID" value={societyId || "life-republic"} mono />
            {building && <Row label="Building Code" value={buildingCode} mono />}
          </dl>
        </section>

        {/* SECTION 2: Hierarchy & Physical Attributes */}
        <section>
          <span className="mb-1 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-[#22C55E]">
            <Database className="h-2.5 w-2.5" /> Physical Hierarchy
          </span>
          <dl className="space-y-0.5">
            {building && (
              <>
                <Row label="Total Floors" value={building.totalFloors} mono />
                <Row label="Building Height" value={`${building.height} m`} mono />
                <Row label="Registered Units" value={units.length} mono />
              </>
            )}
            {selectedFloor && (
              <>
                <Row label="Floor Number" value={selectedFloor.floorNumber} mono />
                <Row
                  label="Derived Elevation"
                  value={`${(selectedFloor.floorNumber * 3.1).toFixed(1)} m`}
                  mono
                />
              </>
            )}
            {selectedFlat && (
              <>
                <Row label="Property Type" value={selectedFlat.propertyType} />
                <Row label="Carpet Area" value={`${selectedFlat.area} sq ft`} mono />
                <Row label="Unit Elevation" value={`${selectedFlat.elevation.toFixed(1)} m`} mono />
              </>
            )}
            <Row
              label="Data Source"
              value={building ? "Real Firestore Hierarchy" : "Illustrative 3D Geometry"}
              badgeColor={building ? "text-[#22C55E]" : "text-[#94A3B8]"}
            />
          </dl>
        </section>

        {/* SECTION 3: Government Verification Status */}
        <section>
          <span className="mb-1 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-[#FACC15]">
            <ShieldCheck className="h-2.5 w-2.5" /> Government Verification
          </span>
          <dl className="space-y-0.5">
            <Row
              label="Verification Status"
              value={
                selectedFlat
                  ? selectedFlat.verificationStatus
                  : building
                    ? building.status
                    : "ACTIVE"
              }
              badgeColor={
                (selectedFlat?.verificationStatus === "Verified" || building?.status === "ACTIVE")
                  ? "text-[#22C55E]"
                  : "text-[#FACC15]"
              }
            />
            {verificationRecord && (
              <>
                <Row label="Verified By" value={verificationRecord.verifiedBy} />
                <Row label="Audit Method" value={verificationRecord.method} mono />
              </>
            )}
          </dl>
        </section>

        {/* SECTION 4: Discrepancies / Flags (if any) */}
        {entityConflicts.length > 0 && (
          <section className="rounded-xl border border-red-500/40 bg-red-500/10 p-2.5">
            <div className="flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-wider text-red-300">
              <AlertTriangle className="h-3 w-3" /> Spatial Conflict Detected
            </div>
            <p className="mt-1 text-[8.5px] leading-relaxed text-red-200">
              {entityConflicts[0].conflictNumber}: {entityConflicts[0].description}
            </p>
            <div className="mt-1.5 flex items-center gap-2 font-mono text-[7.5px] text-red-300/80">
              <span>Severity: <strong>{entityConflicts[0].severity}</strong></span>
              <span>· Status: <strong>{entityConflicts[0].status}</strong></span>
            </div>
          </section>
        )}

        {/* SECTION 5: Slicing & Isolation Toggles */}
        {building && (
          <section className="space-y-1.5 rounded-xl border border-[#164E73]/50 bg-[#061426]/60 p-2.5">
            <span className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-[#94A3B8]">
              <Box className="h-2.5 w-2.5 text-[#00D9FF]" /> 3D View Manipulation
            </span>
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={toggleBuildingIsolation}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-lg border py-1.5 text-[8.5px] font-black uppercase tracking-wider transition-colors",
                  buildingIsolation
                    ? "border-[#22C55E]/70 bg-[#22C55E]/20 text-[#22C55E]"
                    : "border-[#164E73] bg-[#061426] text-[#94A3B8] hover:text-[#F8FAFC]"
                )}
              >
                {buildingIsolation ? "Exit Isolation" : "Isolate Building"}
              </button>

              <button
                type="button"
                onClick={() => setFloorMode(floorMode === "explode" ? "all" : "explode")}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-lg border py-1.5 text-[8.5px] font-black uppercase tracking-wider transition-colors",
                  floorMode === "explode"
                    ? "border-[#FACC15]/70 bg-[#FACC15]/20 text-[#FACC15]"
                    : "border-[#164E73] bg-[#061426] text-[#94A3B8] hover:text-[#F8FAFC]"
                )}
              >
                {floorMode === "explode" ? "Collapse Floors" : "Explode Floors"}
              </button>
            </div>
          </section>
        )}

        {/* SECTION 6: Cross-Portal Navigation Actions */}
        <section className="grid grid-cols-2 gap-1.5 pt-1">
          <Link
            href={gisMapUrl}
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg border border-[#00D9FF]/40 bg-[#00D9FF]/10 py-2 text-[9.5px] font-black uppercase tracking-wider text-[#00D9FF] transition-colors hover:bg-[#00D9FF]/20"
          >
            <MapPinned className="h-3.5 w-3.5" /> View on 2D GIS Map
          </Link>
          {societyId && (
            <Link
              href={`/government/societies/${societyId}/analytics`}
              className="col-span-2 flex items-center justify-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-950/30 py-1.5 text-center text-[8.5px] font-black uppercase tracking-wider text-cyan-300 transition-colors hover:border-cyan-400 hover:bg-cyan-500/20"
            >
              <ExternalLink className="h-2.5 w-2.5" /> Gov Decision Analytics
            </Link>
          )}
          {societyId && (
            <Link
              href={`/society/${societyId}`}
              className="flex items-center justify-center gap-1 rounded-lg border border-[#164E73] bg-[#061426] py-1.5 text-center text-[8.5px] font-black uppercase tracking-wider text-[#F8FAFC] transition-colors hover:border-[#00D9FF]/50 hover:text-[#00D9FF]"
            >
              <ExternalLink className="h-2.5 w-2.5" /> Society Portal
            </Link>
          )}
          {societyId && (
            <Link
              href={`/government/societies/${societyId}`}
              className="flex items-center justify-center gap-1 rounded-lg border border-[#164E73] bg-[#061426] py-1.5 text-center text-[8.5px] font-black uppercase tracking-wider text-[#94A3B8] transition-colors hover:border-[#00D9FF]/50 hover:text-[#00D9FF]"
            >
              <ShieldCheck className="h-2.5 w-2.5" /> Gov Verify
            </Link>
          )}
        </section>
      </div>
    </aside>
  );
}
