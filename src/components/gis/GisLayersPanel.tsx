"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, MapPin, Building2, Layers as LayersIcon, TriangleAlert } from "lucide-react";
import { LAYER_META, type LayerState } from "@/lib/gisLayers";
import { GisStatusBadge } from "@/components/common/GisStatusBadge";
import { useGIS } from "@/context/GISContext";
import { selectBuildingsByParcel, selectFloorsByBuilding, selectPropertiesByBuilding } from "@/lib/gisSelectors";
import { cn } from "@/lib/utils";

interface GisLayersPanelProps {
  layers: LayerState;
  onToggleLayer: (key: keyof LayerState) => void;
}

/**
 * Left workspace panel: layer toggles, entity navigators (parcels, buildings)
 * and floors of the selected building. All selections go through GISContext.
 */
export function GisLayersPanel({ layers, onToggleLayer }: GisLayersPanelProps) {
  const {
    parcels,
    buildings,
    floors,
    properties,
    conflicts,
    selectedParcelId,
    selectedBuildingId,
    selectedFloorId,
    selectParcel,
    selectBuilding,
    selectFloor,
  } = useGIS();

  const [buildingsExpanded, setBuildingsExpanded] = React.useState(true);
  const [floorsExpanded, setFloorsExpanded] = React.useState(true);

  const parcelBuildings = selectedParcelId ? selectBuildingsByParcel(buildings, selectedParcelId) : [];
  const openConflicts = conflicts.filter((c) => c.status !== "Resolved").length;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-3">
        <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-200">
          <LayersIcon className="h-3.5 w-3.5 text-cyan-400" /> Workspace Layers
        </p>
        <span className="rounded-full border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan-300">
          {Object.entries(layers).filter(([, v]) => v).length}/8 on
        </span>
      </div>

      <div className="sidebar-scroll flex-1 space-y-4 overflow-y-auto p-3">
        {/* Layer toggles */}
        <section aria-label="Layer controls">
          <ul className="space-y-1">
            {LAYER_META.map((layer) => (
              <li key={layer.key}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={layers[layer.key]}
                  aria-label={`${layer.label} layer`}
                  title={`${layer.desc} — clicked to ${layers[layer.key] ? "hide" : "show"}`}
                  onClick={() => onToggleLayer(layer.key)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-[11px] font-semibold transition-colors",
                    layers[layer.key]
                      ? "border-cyan-500/40 bg-cyan-500/10 text-slate-100"
                      : "border-slate-800 bg-slate-900/50 text-slate-500 hover:border-slate-700",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-md border text-[11px] font-black",
                      layers[layer.key] ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-300" : "border-slate-700 bg-slate-900 text-slate-600",
                    )}
                  >
                    {layer.icon}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{layer.label}</span>
                  <span
                    className={cn(
                      "relative h-3.5 w-6 rounded-full border transition-colors",
                      layers[layer.key] ? "border-cyan-500/60 bg-cyan-500/40" : "border-slate-700 bg-slate-800",
                    )}
                    aria-hidden
                  >
                    <span
                      className={cn(
                        "absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full transition-all",
                        layers[layer.key] ? "left-[13px] bg-cyan-300" : "left-0.5 bg-slate-500",
                      )}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        {/* Parcel list */}
        <section aria-label="Parcel list">
          <p className="mb-1.5 px-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
            Land Parcels · {parcels.length}
          </p>
          <ul className="space-y-1">
            {parcels.map((parcel) => {
              const active = selectedParcelId === parcel.id;
              return (
                <li key={parcel.id}>
                  <button
                    type="button"
                    onClick={() => selectParcel(active ? null : parcel.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                      active ? "border-cyan-400/70 bg-cyan-500/15" : "border-slate-800 bg-slate-900/60 hover:border-slate-700",
                    )}
                  >
                    <MapPin className={cn("h-3.5 w-3.5 shrink-0", active ? "text-cyan-300" : "text-slate-500")} />
                    <span className="min-w-0 flex-1 truncate font-mono text-[10px] font-bold text-slate-200">
                      {parcel.parcelNumber}
                    </span>
                    <GisStatusBadge status={parcel.status} className="shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Building list (focuses on the selected parcel) */}
        <section aria-label="Building list">
          <button
            type="button"
            onClick={() => setBuildingsExpanded((v) => !v)}
            className="flex w-full items-center gap-1.5 px-1 text-left text-[9px] font-black uppercase tracking-widest text-slate-500"
          >
            {buildingsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            Buildings
            {selectedParcelId ? ` · parcel ${selectedParcelId.split("-").pop()}` : ""}
            <span className="ml-auto inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {parcelBuildings.length || buildings.length}
            </span>
          </button>
          {buildingsExpanded && (
            <ul className="mt-1.5 space-y-1">
              {(selectedParcelId ? parcelBuildings : buildings).map((building) => {
                const active = selectedBuildingId === building.id;
                const units = selectPropertiesByBuilding(properties, building.id).length;
                return (
                  <li key={building.id}>
                    <button
                      type="button"
                      onClick={() => selectBuilding(active ? null : building.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                        active ? "border-cyan-400/70 bg-cyan-500/15" : "border-slate-800 bg-slate-900/60 hover:border-slate-700",
                      )}
                    >
                      <Building2 className={cn("h-3.5 w-3.5 shrink-0", active ? "text-cyan-300" : "text-slate-500")} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[10px] font-bold text-slate-200">{building.name}</span>
                        <span className="block font-mono text-[9px] text-slate-500">
                          {building.id} · {units} units
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Floor control for selected building */}
        {selectedBuildingId && (
          <section aria-label="Floor control">
            <button
              type="button"
              onClick={() => setFloorsExpanded((v) => !v)}
              className="flex w-full items-center gap-1.5 px-1 text-left text-[9px] font-black uppercase tracking-widest text-slate-500"
            >
              {floorsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
              Floors
            </button>
            {floorsExpanded && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <FloorChip label="All" active={!selectedFloorId} onClick={() => selectFloor(null)} />
                {selectFloorsByBuilding(floors, selectedBuildingId).map((floor) => (
                  <FloorChip
                    key={floor.id}
                    label={floor.floorNumber === 0 ? "G" : `F${floor.floorNumber}`}
                    title={floor.name}
                    active={selectedFloorId === floor.id}
                    onClick={() => selectFloor(selectedFloorId === floor.id ? null : floor.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Conflicts summary */}
        <section aria-label="Conflict summary">
          <p className="mb-1 flex items-center gap-1.5 px-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
            <TriangleAlert className="h-3 w-3 text-rose-400" />
            Conflicts · {openConflicts} open
          </p>
          <div className="space-y-1.5">
            {conflicts.slice(0, 3).map((c) => (
              <div key={c.id} className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[9px] font-bold text-slate-300">{c.conflictNumber}</span>
                  <GisStatusBadge status={c.severity} kind="severity" className="shrink-0" />
                </div>
                <p className="mt-0.5 text-[9px] text-slate-500">{c.type}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
function FloorChip({
  label,
  title,
  active,
  onClick,
}: {
  label: string;
  title?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title ?? `Filter to ${label}`}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-bold transition-colors",
        active
          ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
          : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-white",
      )}
    >
      {label}
    </button>
  );
}