"use client";

import * as React from "react";
import Link from "next/link";
import { Layers, MapPin, ShieldAlert } from "lucide-react";
import { useGIS } from "@/context/GISContext";
import { useProperty } from "@/context/PropertyContext";
import { GisStatusBadge } from "@/components/common/GisStatusBadge";
import { FloorStack } from "@/components/gis/FloorStack";
import { formatElevation } from "@/lib/gisUtils";
import { cn } from "@/lib/utils";
import type { PropertyUnit, PropertyVerificationStatus } from "@/types/gis";

const formatAreaSqFt = (v: number) => `${v.toLocaleString("en-IN")} sq ft`;

interface GisFloorExplorerProps {
  buildingId: string;
  /** Property unit to auto-highlight (from global search or nav). */
  highlightUnitId?: string;
}

/**
 * Floor Explorer for the unified GIS model.
 * Shared between /floors (building picker) and /buildings/:id/floors.
 * Floor selection is centralized in GISContext (`selectFloor`) so the map,
 * 3D viewer and this explorer always agree. Renders the vertical floor
 * stack, quick floor chips, per-floor status counts and clickable unit cards
 * that open the real property detail page.
 */
export function GisFloorExplorer({ buildingId, highlightUnitId }: GisFloorExplorerProps) {
  const { buildings, floors, properties, conflicts, selectedFloorId, selectFloor } = useGIS();
  const { properties: legacyProperties } = useProperty();

  const building = buildings.find((b) => b.id === buildingId);
  const buildingFloors = floors
    .filter((f) => f.buildingId === buildingId)
    .sort((a, b) => a.floorNumber - b.floorNumber);

  React.useEffect(() => {
    if (!building) return;
    if (highlightUnitId) {
      const unit = properties.find((p) => p.id === highlightUnitId);
      if (unit && unit.buildingId === buildingId) {
        if (selectedFloorId !== unit.floorId) selectFloor(unit.floorId);
        return;
      }
    }
    const belongs = selectedFloorId && buildingFloors.some((f) => f.id === selectedFloorId);
    if (!belongs) {
      const first = buildingFloors[0]?.id ?? null;
      if (first && selectedFloorId !== first) selectFloor(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId, highlightUnitId, building?.id, selectedFloorId]);

  const currentFloor = buildingFloors.find((f) => f.id === selectedFloorId) ?? null;
  const floorUnits = currentFloor ? properties.filter((p) => p.floorId === currentFloor.id) : [];
  const totalFloors = buildingFloors.length;
  const totalUnits = properties.filter((p) => p.buildingId === buildingId).length;

  // Per-floor unit counts + open conflicts per unit (from the centralized registry).
  const unitCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of buildingFloors) {
      map[f.id] = properties.filter((p) => p.floorId === f.id).length;
    }
    return map;
  }, [buildingFloors, properties]);

  const openConflictsByUnit = React.useMemo(() => {
    const map = new Map<string, typeof conflicts>();
    for (const c of conflicts) {
      if (c.status === "Resolved") continue;
      for (const pid of c.affectedPropertyIds) {
        const list = map.get(pid) ?? [];
        list.push(c);
        map.set(pid, list);
      }
    }
    return map;
  }, [conflicts]);

  const countByStatus = (units: PropertyUnit[], status: PropertyVerificationStatus) =>
    units.filter((u) => u.verificationStatus === status).length;

  const destinationFor = (unit: PropertyUnit): string => {
    const legacy = legacyProperties.find((lp) => lp.id === unit.propertyId);
    return legacy ? `/properties/${legacy.id}` : `/map?property=${unit.id}`;
  };

  if (!building) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 py-16 text-center">
        <Layers className="h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm font-bold text-slate-700">Building not found</p>
        <p className="mt-1 max-w-xs text-xs text-slate-500">
          No cadastral record matches this building ID in the Phase 1 registry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Floor selection — vertical stack + quick chips (both drive centralized selection) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-extrabold tracking-tight text-slate-900">
              {building.name} — {totalFloors} floors
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
              <MapPin className="h-3 w-3 text-slate-400" />
              {building.address}
            </p>
          </div>
          <GisStatusBadge status={building.status} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_230px]">
          <div>
        <div className="flex flex-wrap gap-2">
          {buildingFloors.map((floor) => {
            const unitsOnFloor = properties.filter((p) => p.floorId === floor.id).length;
            const activeFloor = floor.id === selectedFloorId;
            return (
              <button
                key={floor.id}
                onClick={() => selectFloor(floor.id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all",
                  activeFloor
                    ? "border-cyan-400 bg-gradient-to-r from-cyan-500/15 to-blue-600/10 text-cyan-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-700",
                )}
              >
                <span className="font-mono">
                  {floor.floorNumber === 0 ? "G" : `F${floor.floorNumber}`}
                </span>
                <span className="hidden text-[10px] font-semibold text-slate-400 sm:inline">
                  · {unitsOnFloor} unit{unitsOnFloor === 1 ? "" : "s"}
                </span>
              </button>
            );
          })}
            </div>

            {/* Per-floor verification + conflict summary (centralized registry) */}
            {currentFloor && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <SummaryChip label="Verified" value={countByStatus(floorUnits, "Verified")} tone="emerald" />
                <SummaryChip
                  label="Pending / Review"
                  value={countByStatus(floorUnits, "Pending") + countByStatus(floorUnits, "Under Review")}
                  tone="amber"
                />
                <SummaryChip
                  label="Rejected / Reinspect"
                  value={countByStatus(floorUnits, "Rejected") + countByStatus(floorUnits, "Reinspection Required")}
                  tone="red"
                />
                <SummaryChip
                  label="Open Conflicts"
                  value={floorUnits.reduce((s, u) => s + (openConflictsByUnit.get(u.id)?.length ?? 0), 0)}
                  tone="orange"
                />
              </div>
            )}
          </div>

          <FloorStack
            floors={buildingFloors}
            selectedFloorId={selectedFloorId}
            onSelect={selectFloor}
            unitCounts={unitCounts}
            buildingName={building.name}
          />
        </div>
      </div>
      {/* Units on the selected floor */}
      {currentFloor && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
          <div className="mb-4">
            <p className="text-xs font-extrabold tracking-tight text-slate-900">{currentFloor.name}</p>
            <p className="mt-0.5 font-mono text-[10px] text-slate-500">
              Elevation {formatElevation(currentFloor.elevation)} · Area{" "}
              {formatAreaSqFt(currentFloor.area)} · {floorUnits.length} registered unit
              {floorUnits.length === 1 ? "" : "s"}
            </p>
          </div>

          {floorUnits.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-xs text-slate-400">
              No property units registered on this floor yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {floorUnits.map((unit) => {
                const highlighted = unit.id === highlightUnitId;
                const unitConflicts = openConflictsByUnit.get(unit.id) ?? [];
                return (
                  <Link
                    key={unit.id}
                    href={destinationFor(unit)}
                    className={cn(
                      "group block rounded-xl border bg-slate-50/60 p-3.5 transition-all hover:border-cyan-400 hover:bg-cyan-50/40 hover:shadow-sm",
                      highlighted
                        ? "border-cyan-400 bg-cyan-50/50 ring-2 ring-cyan-400/30"
                        : "border-slate-200",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[11px] font-extrabold text-cyan-700 group-hover:text-cyan-800">
                          {unit.id}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[9px] text-slate-500">
                          {unit.demoSpatialId}
                        </p>
                      </div>
                      <GisStatusBadge status={unit.verificationStatus} />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                      <span className="truncate">{unit.ownerReferenceName}</span>
                      <span className="shrink-0 font-mono">{unit.propertyType}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between border-t border-slate-200/70 pt-2 font-mono text-[10px] text-slate-500">
                      <span>Unit {unit.unitNumber}</span>
                      <span>{formatAreaSqFt(unit.area)}</span>
                    </div>
                    {unitConflicts.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {unitConflicts.slice(0, 2).map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-[8.5px] font-bold text-red-700"
                            title={`${c.type} · ${c.severity} · ${c.status}`}
                          >
                            <ShieldAlert className="h-2.5 w-2.5" /> {c.conflictNumber}
                          </span>
                        ))}
                        {unitConflicts.length > 2 && (
                          <span className="text-[8.5px] font-bold text-red-500">+{unitConflicts.length - 2}</span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      <p className="text-center font-mono text-[9px] uppercase tracking-widest text-slate-400">
        {totalUnits} total vertical units · demo spatial IDs (not official ULPIN)
      </p>
    </div>
  );
}

function SummaryChip({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "red" | "orange" }) {
  const tones: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
  };
  return (
    <div className={cn("rounded-lg border px-2.5 py-1.5", tones[tone])}>
      <p className="text-[8.5px] font-extrabold uppercase tracking-widest opacity-80">{label}</p>
      <p className="text-sm font-extrabold">{value}</p>
    </div>
  );
}