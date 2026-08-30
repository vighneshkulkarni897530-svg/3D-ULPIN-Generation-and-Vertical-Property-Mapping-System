"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Building2,
  Layers,
  MapPin,
  ArrowRight,
  Box,
  CalendarDays,
  Ruler,
  Boxes,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Map as MapIcon,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { GisStatusBadge } from "@/components/common/GisStatusBadge";
import { ErrorState } from "@/components/ui/empty-state";
import { useGIS } from "@/context/GISContext";
import { useProperty } from "@/context/PropertyContext";
import { groupFloorsByBuilding, formatRelativeTime } from "@/lib/gisUtils";

const PENDING_STATUSES = ["Pending", "Under Review", "Field Verification"];

export default function BuildingDetailPage() {
  const params = useParams<{ id: string }>();
  const buildingId = params?.id ?? "";
  const { buildings, floors, properties, parcels, conflicts, verifications, activities } = useGIS();
  const { properties: legacyProperties } = useProperty();

  const building = buildings.find((b) => b.id === buildingId);
  const buildingFloors = floors
    .filter((f) => f.buildingId === buildingId)
    .sort((a, b) => a.floorNumber - b.floorNumber);
  const buildingUnits = properties.filter((p) => p.buildingId === buildingId);
  const parcel = parcels.find((p) => p.id === building?.parcelId);

  // Legacy PropertyItem link (digits of the twin are under /properties/:id).
  const linkedLegacyId = buildingUnits[0]?.propertyId ?? "";
  const linkedLegacy = legacyProperties.find((lp) => lp.id === linkedLegacyId);

  if (!building) {
    return (
      <PageContainer>
        <ErrorState
          title="Building record not found"
          description={`No cadastral building with ID "${buildingId}" exists in the Phase 1 registry.`}
          onRetry={() => window.history.back()}
        />
      </PageContainer>
    );
  }

  const byFloor = groupFloorsByBuilding(buildingFloors);

  // ── Phase 7 intelligence (all derived from the centralized GIS registry) ──
  const unitIds = new Set(buildingUnits.map((u) => u.id));
  const verifiedCount = buildingUnits.filter((u) => u.verificationStatus === "Verified").length;
  const pendingCount = buildingUnits.filter((u) => PENDING_STATUSES.includes(u.verificationStatus)).length;
  const rejectedCount = buildingUnits.filter((u) =>
    ["Rejected", "Reinspection Required"].includes(u.verificationStatus),
  ).length;
  const buildingConflicts = conflicts.filter(
    (c) =>
      c.status !== "Resolved" &&
      (c.buildingId === buildingId || c.affectedPropertyIds.some((id) => unitIds.has(id))),
  );
  const conflictIds = new Set(buildingConflicts.map((c) => c.id));
  const latestVerification =
    [...verifications]
      .filter((v) => unitIds.has(v.propertyId))
      .sort((a, b) => b.verificationDate.localeCompare(a.verificationDate))[0] ?? null;
  const relatedActivities = activities
    .filter((a) => a.entityId === buildingId || unitIds.has(a.entityId) || conflictIds.has(a.entityId))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 6);

  const activityVisual = (type: string): { icon: React.ReactNode; tone: "green" | "red" | "cyan" | "blue" | "navy" } => {
    switch (type) {
      case "PROPERTY_VERIFICATION":
      case "CONFLICT_RESOLUTION":
        return { icon: <ShieldCheck className="h-4 w-4" />, tone: "green" };
      case "CONFLICT_DETECTION":
      case "CONFLICT_FIELD_REVIEW":
      case "CONFLICT_CORRECTION":
        return { icon: <AlertTriangle className="h-4 w-4" />, tone: "red" };
      case "AI_EXTRACTION":
      case "3D_RECONSTRUCTION":
        return { icon: <Box className="h-4 w-4" />, tone: "navy" };
      case "BUILDING_UPDATE":
        return { icon: <Building2 className="h-4 w-4" />, tone: "blue" };
      default:
        return { icon: <Activity className="h-4 w-4" />, tone: "cyan" };
    }
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: "Buildings", href: "/buildings" },
            { label: building.name },
          ]}
        />

        <PageHeader
          eyebrow="BUILDING DETAIL · VERTICAL ASSET"
          title={building.name}
          description={`${building.buildingCode} · ${building.address}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/map?building=${building.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-cyan-400 hover:text-cyan-700"
              >
                <MapIcon className="h-3.5 w-3.5" /> Open GIS Map
              </Link>
              <Link
                href={`/buildings/${building.id}/floors`}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-tech-cyan transition-all hover:from-cyan-400 hover:to-blue-500"
              >
                <Layers className="h-3.5 w-3.5" /> Floor Explorer
              </Link>
              {linkedLegacy ? (
                <Link
                  href={`/properties/${linkedLegacy.id}/digital-twin`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-cyan-400 hover:text-cyan-700"
                >
                  <Box className="h-3.5 w-3.5" /> Launch Digital Twin
                </Link>
              ) : (
                <span
                  className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2 text-[10px] font-bold text-slate-400"
                  title="3D reconstruction for this building is scheduled with the map module."
                >
                  <Box className="h-3.5 w-3.5" /> 3D View — scheduled
                </span>
              )}
            </div>
          }
        />

        {/* Status + key stats */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-tech">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cadastral status</span>
          <GisStatusBadge status={building.status} />
          <span className="ml-auto font-mono text-[10px] text-slate-400">Linked asset ID · {building.id}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <DashboardCard label="Floors" value={String(buildingFloors.length)} sub="Registered levels" icon={<Layers className="h-5 w-5" />} tone="cyan" />
          <DashboardCard label="Units" value={String(buildingUnits.length)} sub="Vertical property units" icon={<Building2 className="h-5 w-5" />} tone="blue" />
          <DashboardCard label="Height" value={`${building.height} m`} sub="Ground to architectural crown" icon={<Ruler className="h-5 w-5" />} tone="green" />
          <DashboardCard
            label="Built-up Area"
            value={`${building.builtUpArea.toLocaleString("en-IN")}`}
            sub="Square feet"
            icon={<Boxes className="h-5 w-5" />}
            tone="navy"
          />
          <DashboardCard label="Year Built" value={String(building.yearBuilt)} sub={`Total floors ${building.totalFloors}`} icon={<CalendarDays className="h-5 w-5" />} tone="amber" />
        </div>
        {/* Parcel lineage */}
        {parcel && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="flex items-center gap-2 text-xs font-extrabold tracking-tight text-slate-900">
                  <MapPin className="h-4 w-4 text-cyan-600" /> Parent Parcel Lineage
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Building {building.id} is anchored to {parcel.id} in the survey hierarchy.
                </p>
              </div>
              <Link
                href={`/map?parcel=${parcel.id}`}
                className="flex items-center gap-1 text-[11px] font-bold text-cyan-700 hover:underline"
              >
                Locate parcel on map <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Parcel Number</p>
                <p className="mt-1 truncate font-mono text-xs font-black text-slate-900">{parcel.parcelNumber}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Location</p>
                <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                  {parcel.location}, {parcel.district}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                <p className="mt-1"><GisStatusBadge status={parcel.status} /></p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Area</p>
                <p className="mt-1 font-mono text-xs font-black text-slate-900">
                  {parcel.area.toLocaleString("en-IN")} m²
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Phase 7 — verification summary + conflict summary + recent activity */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
            <p className="flex items-center gap-2 text-xs font-extrabold tracking-tight text-slate-900">
              <ShieldCheck className="h-4 w-4 text-cyan-600" /> Verification Summary
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-center">
                <p className="text-lg font-black text-emerald-700">{verifiedCount}</p>
                <p className="text-[8.5px] font-bold uppercase tracking-wider text-emerald-600">Verified</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-center">
                <p className="text-lg font-black text-amber-700">{pendingCount}</p>
                <p className="text-[8.5px] font-bold uppercase tracking-wider text-amber-600">Pending</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-center">
                <p className="text-lg font-black text-red-700">{rejectedCount}</p>
                <p className="text-[8.5px] font-bold uppercase tracking-wider text-red-600">Rejected</p>
              </div>
            </div>
            {latestVerification ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[8.5px] font-black uppercase tracking-widest text-slate-400">Latest verification</p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[10.5px] font-black text-slate-900">{latestVerification.propertyId}</p>
                  <GisStatusBadge status={latestVerification.newStatus} />
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  {latestVerification.verifiedBy} · {formatRelativeTime(latestVerification.verificationDate)} ·{" "}
                  {latestVerification.method.replace(/_/g, " ")}
                </p>
                {latestVerification.notes && (
                  <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                    {latestVerification.notes}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-5 text-center text-[10.5px] text-slate-400">
                No verification records yet for this building's units.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
            <p className="flex items-center gap-2 text-xs font-extrabold tracking-tight text-slate-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Conflict Summary
            </p>
            {buildingConflicts.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-[10.5px] text-slate-400">
                No open spatial conflicts affect this building.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {buildingConflicts.map((c) => (
                  <li key={c.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[10.5px] font-black text-slate-900">{c.conflictNumber}</span>
                      <span className="flex items-center gap-1.5">
                        <GisStatusBadge status={c.severity} kind="severity" />
                        <GisStatusBadge status={c.status} kind="conflict-status" />
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] font-semibold text-slate-600">{c.type}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Link
                        href={`/conflicts?conflict=${c.id}`}
                        className="rounded-lg bg-slate-900 px-2.5 py-1 text-[9.5px] font-bold text-cyan-300 transition-colors hover:bg-slate-800"
                      >
                        View Conflict
                      </Link>
                      <Link
                        href={`/map?conflict=${c.id}`}
                        className="rounded-lg border border-slate-300 px-2.5 py-1 text-[9.5px] font-bold text-slate-600 transition-colors hover:border-cyan-400 hover:text-cyan-700"
                      >
                        View on Map
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
          <p className="flex items-center gap-2 text-xs font-extrabold tracking-tight text-slate-900">
            <Activity className="h-4 w-4 text-cyan-600" /> Recent Activity
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Building, verification and conflict events touching this asset — from the centralized activity registry.
          </p>
          <div className="mt-4">
            {relatedActivities.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-[10.5px] text-slate-400">
                No activity recorded for this building yet.
              </p>
            ) : (
              <ActivityTimeline
                items={relatedActivities.map((a) => ({
                  id: a.id,
                  title: a.title,
                  description: a.description,
                  time: formatRelativeTime(a.timestamp),
                  ...activityVisual(a.type),
                }))}
              />
            )}
          </div>
        </section>

        {/* Floors + units */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="flex items-center gap-2 text-xs font-extrabold tracking-tight text-slate-900">
                <Layers className="h-4 w-4 text-cyan-600" /> Floors & Vertical Units
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {buildingFloors.length} floors · {buildingUnits.length} units — full drill-down in the Floor Explorer.
              </p>
            </div>
            <Link
              href={`/buildings/${building.id}/floors`}
              className="flex items-center gap-1 text-[11px] font-bold text-cyan-700 hover:underline"
            >
              Open Floor Explorer <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {Object.values(byFloor).map((floorGroup) =>
              floorGroup.map((floor) => {
                const units = properties.filter((p) => p.floorId === floor.id);
                return (
                  <div key={floor.id} className="rounded-xl border border-slate-200 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 font-mono text-[11px] font-black text-slate-600">
                          {floor.floorNumber === 0 ? "G" : `F${floor.floorNumber}`}
                        </span>
                        <div>
                          <p className="text-[11px] font-extrabold text-slate-900">{floor.name}</p>
                          <p className="font-mono text-[9px] text-slate-400">
                            Elev {floor.elevation.toFixed(1)} m · {floor.area.toLocaleString("en-IN")} sq ft
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-slate-900 px-2.5 py-1 font-mono text-[9px] font-bold text-cyan-300">
                        {units.length} units
                      </span>
                    </div>
                    {units.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
                        {units.map((u) => (
                          <Link
                            key={u.id}
                            href={`/buildings/${building.id}/floors?unit=${u.id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[9px] text-slate-600 transition-colors hover:border-cyan-300 hover:text-cyan-700"
                          >
                            {u.id}
                            <GisStatusBadge status={u.verificationStatus} className="scale-90" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }),
            )}
          </div>
        </section>
      </div>
    </PageContainer>
  );
}