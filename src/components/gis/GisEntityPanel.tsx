"use client";

import * as React from "react";
import Link from "next/link";
import {
  X,
  MapPin,
  Building2,
  Layers,
  Box,
  FileText,
  Hash,
  Compass,
  TriangleAlert,
  ScanSearch,
  ExternalLink,
  Fingerprint,
  ShieldCheck,
} from "lucide-react";
import { GisStatusBadge } from "@/components/common/GisStatusBadge";
import { useGIS } from "@/context/GISContext";
import { useProperty } from "@/context/PropertyContext";
import { selectBuildingsByParcel, selectFloorsByBuilding, selectPropertiesByBuilding } from "@/lib/gisSelectors";
import { formatArea, formatCoordinate, formatElevation, formatRelativeTime, geometryTypeLabel } from "@/lib/gisUtils";
import type { SpatialConflict } from "@/types/conflict";
import { cn } from "@/lib/utils";

export interface GisEntityPanelProps {
  /** Conflict currently highlighted on the map (page-local selection). */
  selectedConflict: SpatialConflict | null;
  /** Triggered by the parcel panel's "Visualize in 3D" action. */
  onVisualizeIn3D: () => void;
  onClose: () => void;
  className?: string;
}

/**
 * Right-hand information panel of the GIS workspace. Shows the record for the
 * highest-priority selection: conflict > property > building > parcel. All
 * data comes from GISContext — nothing is duplicated here.
 */
export function GisEntityPanel({ selectedConflict, onVisualizeIn3D, onClose, className }: GisEntityPanelProps) {
  const {
    parcels,
    buildings,
    floors,
    properties,
    selectedParcelId,
    selectedBuildingId,
    selectedFloorId,
    selectedPropertyId,
    selectBuilding,
    selectFloor,
    selectProperty,
  } = useGIS();
  const { properties: legacyProperties } = useProperty();

  const parcel = parcels.find((p) => p.id === selectedParcelId) ?? null;
  const building = buildings.find((b) => b.id === selectedBuildingId) ?? null;
  const property = properties.find((p) => p.id === selectedPropertyId) ?? null;

  const parcelBuildings = parcel ? selectBuildingsByParcel(buildings, parcel.id) : [];
  const buildingFloors = building ? selectFloorsByBuilding(floors, building.id) : [];
  const buildingUnits = building ? selectPropertiesByBuilding(properties, building.id) : [];

  // Digital Twin gate — identical rule to the Building Details page: the
  // building's first unit must resolve to a legacy PropertyItem record.
  const linkedLegacy = building
    ? legacyProperties.find((lp) => lp.id === (buildingUnits[0]?.propertyId ?? ""))
    : undefined;

  return (
    <div className={cn("flex h-full flex-col overflow-hidden bg-slate-950", className)}>
      <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-3">
        <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-200">
          <ScanSearch className="h-3.5 w-3.5 text-cyan-400" /> Selection Details
        </p>
        <button
          type="button"
          aria-label="Close details panel"
          title="Close details panel"
          onClick={onClose}
          className="rounded-md border border-slate-800 bg-slate-900 p-1 text-slate-500 transition-colors hover:border-slate-700 hover:text-slate-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="sidebar-scroll flex-1 space-y-4 overflow-y-auto p-3.5">
        {selectedConflict && (
          <ConflictCard
            conflict={selectedConflict}
            properties={properties}
            onSelectProperty={(id) => selectProperty(id)}
          />
        )}
        {!selectedConflict && property && <PropertyCard property={property} />}
        {!selectedConflict && !property && building && (
          <BuildingCard
            buildingId={building.id}
            floors={buildingFloors}
            units={buildingUnits}
            parcelNumber={parcel?.parcelNumber}
            linkedLegacyId={linkedLegacy?.id}
            selectedFloorId={selectedFloorId}
            onSelectFloor={(id) => selectFloor(id || null)}
          />
        )}
        {!selectedConflict && !property && !building && parcel && (
          <ParcelCard
            parcelId={parcel.id}
            buildings={parcelBuildings}
            propertyCount={properties.filter((p) => p.parcelId === parcel.id).length}
            selectedBuildingId={selectedBuildingId}
            onSelectBuilding={selectBuilding}
            onVisualizeIn3D={onVisualizeIn3D}
          />
        )}
        {!selectedConflict && !property && !building && !parcel && (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-5 text-center">
            <MapPin className="mx-auto h-7 w-7 text-slate-600" />
            <p className="mt-2 text-[11px] font-bold text-slate-300">No selection yet</p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
              Click a land parcel, building footprint or property unit on the map to inspect its cadastral record here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared row ──────────────────────────────────────────────────────────────

function Row({ label, value, mono }: { label: React.ReactNode; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-800/60 py-1.5 last:border-0">
      <dt className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={cn("min-w-0 break-words text-right text-[11px] font-semibold text-slate-200", mono && "font-mono")}>
        {value}
      </dd>
    </div>
  );
}

function CardShell({
  eyebrow,
  icon,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60">
      <div className="flex items-start gap-2.5 border-b border-slate-800 px-3.5 py-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[9px] font-extrabold uppercase tracking-widest text-cyan-400">{eyebrow}</p>
          <h3 className="truncate text-[13px] font-extrabold text-slate-100">{title}</h3>
          {subtitle && <p className="truncate text-[10px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="px-3.5 py-2.5">{children}</div>
    </section>
  );
}

// ── Property ────────────────────────────────────────────────────────────────

function PropertyCard({ property }: { property: ReturnType<typeof useGIS>["properties"][number] }) {
  const { conflicts } = useGIS();
  const openConflicts = conflicts.filter(
    (c) => c.affectedPropertyIds.includes(property.id) && c.status !== "Resolved",
  );
  return (
    <CardShell
      eyebrow="Property Information"
      icon={<Building2 className="h-4 w-4" />}
      title={property.id}
      subtitle={`Unit ${property.unitNumber} · ${property.propertyType}`}
    >
      <dl>
        <Row label="Property ID" value={property.id} mono />
        <Row
          label={
            <span className="inline-flex items-center gap-1">
              <Fingerprint className="h-3 w-3" /> Demo Spatial ID
            </span>
          }
          value={property.demoSpatialId}
          mono
        />
        <Row
          label="Official ULPIN"
          value={
            property.officialUlpinReference ? (
              <span className="font-mono text-emerald-300">{property.officialUlpinReference}</span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-400">
                External Government Integration Required
              </span>
            )
          }
        />
        <Row label="Building ID" value={property.buildingId} mono />
        <Row label="Unit Number" value={property.unitNumber} mono />
        <Row label="Property Type" value={property.propertyType} />
        <Row label="Area" value={`${property.area.toLocaleString("en-IN")} sq ft`} mono />
      </dl>

      <p className="mt-2.5 rounded-lg border border-amber-500/25 bg-amber-500/5 px-2.5 py-2 text-[9.5px] leading-relaxed text-amber-300/90">
        <strong className="font-extrabold">Demo Spatial Identifier</strong> — the identifier above is platform-generated
        for this demo environment. It is <strong>not</strong> a legally valid government ULPIN.
      </p>

      {/* Phase 5 §13 — open spatial conflicts affecting this unit */}
      {openConflicts.length > 0 && (
        <div className="mt-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-2">
          <p className="flex items-center gap-1.5 text-[9.5px] font-extrabold text-red-300">
            <TriangleAlert className="h-3 w-3" /> Spatial Conflict Detected
          </p>
          <p className="mt-0.5 text-[9.5px] leading-relaxed text-red-200/80">
            {openConflicts.length} open demo spatial conflict{openConflicts.length === 1 ? "" : "s"} affect this unit
            — review before recording verification decisions.
          </p>
          <Link
            href={`/conflicts?conflict=${openConflicts[0].id}`}
            className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-slate-950 px-2 py-1 text-[9px] font-bold text-red-200 transition-colors hover:bg-slate-800"
          >
            <TriangleAlert className="h-3 w-3" /> Review Conflict
          </Link>
        </div>
      )}

      <p className="mb-1 mt-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
        <Compass className="h-3 w-3" /> Spatial Information
      </p>
      <dl>
        <Row label="Latitude" value={property.latitude.toFixed(6)} mono />
        <Row label="Longitude" value={property.longitude.toFixed(6)} mono />
        <Row label="Elevation" value={formatElevation(property.elevation)} mono />
        <Row label="Parent Parcel" value={property.parcelId} mono />
        <Row label="Geometry Status" value={geometryTypeLabel(property.geometry.type, property.dataSource)} />
      </dl>

      <p className="mb-1 mt-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
        <ShieldCheck className="h-3 w-3" /> Verification
      </p>
      <dl>
        <Row label="Status" value={<GisStatusBadge status={property.verificationStatus} kind="property" />} />
        <Row label="Last Updated" value={formatRelativeTime(property.lastUpdated)} />
        <Row label="Data Source" value={property.dataSource.replace(/_/g, " ")} />
        <Row label="Extraction Confidence" value={`${Math.round(property.demoSpatialIdMetadata.confidence * 100)}%`} mono />
      </dl>
    </CardShell>
  );
}

// ── Building ────────────────────────────────────────────────────────────────

function BuildingCard({
  buildingId,
  floors,
  units,
  parcelNumber,
  linkedLegacyId,
  selectedFloorId,
  onSelectFloor,
}: {
  buildingId: string;
  floors: ReturnType<typeof useGIS>["floors"];
  units: ReturnType<typeof useGIS>["properties"];
  parcelNumber?: string;
  linkedLegacyId?: string;
  selectedFloorId: string | null;
  onSelectFloor: (id: string) => void;
}) {
  const { buildings } = useGIS();
  const building = buildings.find((b) => b.id === buildingId);
  if (!building) return null;

  const verified = units.filter((u) => u.verificationStatus === "Verified").length;
  const pending = units.filter((u) => u.verificationStatus === "Pending").length;

  return (
    <CardShell
      eyebrow="Building Information"
      icon={<Building2 className="h-4 w-4" />}
      title={building.name}
      subtitle={building.address}
    >
      <dl>
        <Row label="Building Code" value={building.buildingCode} mono />
        <Row label="Building ID" value={building.id} mono />
        <Row label="Parent Parcel" value={parcelNumber ?? building.parcelId} mono />
        <Row label="Total Floors" value={String(building.totalFloors)} mono />
        <Row label="Built-up Area" value={`${building.builtUpArea.toLocaleString("en-IN")} sq ft`} mono />
        <Row label="Height" value={`${building.height} m`} mono />
        <Row label="Year Built" value={String(building.yearBuilt)} mono />
        <Row label="Total Units" value={String(units.length)} mono />
        <Row label="Verified Units" value={<span className="text-emerald-400">{verified} verified</span>} />
        <Row label="Pending Units" value={<span className="text-amber-400">{pending} pending</span>} />
        <Row label="Status" value={<GisStatusBadge status={building.status} kind="parcel" />} />
      </dl>

      {/* Integrated floor control — same GISContext selections as the left panel */}
      <p className="mb-1.5 mt-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
        <Layers className="h-3 w-3" /> Floors
      </p>
      <div className="flex flex-wrap gap-1.5">
        <FloorChip label="All" active={!selectedFloorId} onClick={() => onSelectFloor("")} />
        {floors.map((floor) => (
          <FloorChip
            key={floor.id}
            label={floorOrdinal(floor.floorNumber)}
            title={`${floor.name} · ${floor.totalUnits} units`}
            active={selectedFloorId === floor.id}
            onClick={() => onSelectFloor(floor.id)}
          />
        ))}
      </div>

      <div className="mt-3.5 flex flex-col gap-1.5">
        <Link
          href={`/buildings/${building.id}/floors`}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2 text-[10.5px] font-bold text-slate-950 transition-all hover:from-cyan-400 hover:to-blue-500"
        >
          <Layers className="h-3.5 w-3.5" /> Explore Floors
        </Link>
        <Link
          href={`/buildings/${building.id}`}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[10.5px] font-bold text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-white"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open Building Details
        </Link>
        {linkedLegacyId ? (
          <Link
            href={`/properties/${linkedLegacyId}/digital-twin`}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-[10.5px] font-bold text-cyan-300 transition-colors hover:bg-cyan-500/20"
          >
            <Box className="h-3.5 w-3.5" /> Launch Digital Twin
          </Link>
        ) : (
          <span
            className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-700 bg-slate-900/50 px-3 py-2 text-[10px] font-bold text-slate-500"
            title="A 3D reconstruction mapping for this building is not available yet."
          >
            <Box className="h-3.5 w-3.5" /> Digital Twin — mapping scheduled
          </span>
        )}
      </div>
    </CardShell>
  );
}

/** `0` → "Ground", `1` → "1st Floor", `2` → "2nd Floor" … */
function floorOrdinal(n: number): string {
  if (n === 0) return "Ground";
  const suffix = n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th";
  return `${n}${suffix} Floor`;
}

// ── Parcel ──────────────────────────────────────────────────────────────────

function ParcelCard({
  parcelId,
  buildings,
  propertyCount,
  selectedBuildingId,
  onSelectBuilding,
  onVisualizeIn3D,
}: {
  parcelId: string;
  buildings: ReturnType<typeof useGIS>["buildings"];
  propertyCount: number;
  selectedBuildingId: string | null;
  onSelectBuilding: (id: string) => void;
  onVisualizeIn3D: () => void;
}) {
  const { parcels } = useGIS();
  const parcel = parcels.find((p) => p.id === parcelId);
  if (!parcel) return null;

  return (
    <CardShell
      eyebrow="Parcel Information"
      icon={<MapPin className="h-4 w-4" />}
      title={parcel.parcelNumber}
      subtitle={parcel.location}
    >
      <dl>
        <Row label="Parcel Number" value={parcel.parcelNumber} mono />
        <Row label="Parcel ID" value={parcel.id} mono />
        <Row label="Area" value={formatArea(parcel.area)} mono />
        <Row label="District" value={parcel.district} />
        <Row label="State" value={parcel.state} />
        <Row label="Coordinates" value={formatCoordinate(parcel.centroid.lat, parcel.centroid.lng)} mono />
        <Row label="Buildings" value={String(buildings.length)} mono />
        <Row label="Properties" value={String(propertyCount)} mono />
        <Row label="Spatial Status" value={<GisStatusBadge status={parcel.status} kind="parcel" />} />
      </dl>

      {buildings.length > 0 && (
        <>
          <p className="mb-1.5 mt-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
            <Building2 className="h-3 w-3" /> Buildings on this parcel
          </p>
          <ul className="space-y-1">
            {buildings.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onSelectBuilding(b.id)}
                  aria-pressed={selectedBuildingId === b.id}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                    selectedBuildingId === b.id
                      ? "border-cyan-500/40 bg-cyan-500/10"
                      : "border-slate-800 bg-slate-900/60 hover:border-slate-700",
                  )}
                >
                  <Building2 className={cn("h-3.5 w-3.5 shrink-0", selectedBuildingId === b.id ? "text-cyan-300" : "text-slate-500")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10.5px] font-bold text-slate-200">{b.name}</span>
                    <span className="block font-mono text-[9px] text-slate-500">
                      {b.id} · {b.totalFloors} floors · {b.height} m
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-3.5 flex flex-col gap-1.5">
        <Link
          href="/buildings"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[10.5px] font-bold text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-white"
        >
          <ExternalLink className="h-3.5 w-3.5" /> View Buildings
        </Link>
        <button
          type="button"
          onClick={onVisualizeIn3D}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2 text-[10.5px] font-bold text-slate-950 transition-all hover:from-cyan-400 hover:to-blue-500"
        >
          <Box className="h-3.5 w-3.5" /> Visualize in 3D
        </button>
      </div>
    </CardShell>
  );
}

// ── Conflict ────────────────────────────────────────────────────────────────

function ConflictCard({
  conflict,
  properties,
  onSelectProperty,
}: {
  conflict: SpatialConflict;
  properties: ReturnType<typeof useGIS>["properties"];
  onSelectProperty: (id: string) => void;
}) {
  const affected = properties.filter((p) => conflict.affectedPropertyIds.includes(p.id));
  return (
    <CardShell
      eyebrow="Spatial Conflict"
      icon={<TriangleAlert className="h-4 w-4" />}
      title={conflict.conflictNumber}
      subtitle={conflict.description}
    >
      <dl>
        <Row label="Conflict Number" value={conflict.conflictNumber} mono />
        <Row label="Type" value={conflict.type} />
        <Row label="Severity" value={<GisStatusBadge status={conflict.severity} kind="severity" />} />
        <Row label="Status" value={<GisStatusBadge status={conflict.status} kind="conflict-status" />} />
        <Row label="Detected" value={formatRelativeTime(conflict.detectedAt)} />
        <Row label="Affected Area" value={geometryTypeLabel(conflict.geometry.type, "GIS_ANALYSIS")} />
      </dl>

      {affected.length > 0 && (
        <>
          <p className="mb-1.5 mt-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
            <Hash className="h-3 w-3" /> Affected properties
          </p>
          <ul className="space-y-1">
            {affected.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelectProperty(p.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-2 text-left transition-colors hover:border-cyan-500/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-[10px] font-bold text-slate-200">{p.id}</span>
                    <span className="block text-[9px] text-slate-500">{p.ownerReferenceName}</span>
                  </span>
                  <GisStatusBadge status={p.verificationStatus} kind="property" className="shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Link
        href="/conflicts"
        className="mt-3.5 flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[10.5px] font-bold text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-white"
      >
        <FileText className="h-3.5 w-3.5" /> View Conflict Details
      </Link>
    </CardShell>
  );
}

function FloorChip({ label, title, active, onClick }: { label: string; title?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title ?? label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-colors",
        active
          ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
          : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-white",
      )}
    >
      {label}
    </button>
  );
}
