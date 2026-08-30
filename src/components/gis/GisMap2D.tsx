"use client";

import * as React from "react";
import { MapContainer, TileLayer, Polygon, Rectangle, CircleMarker, Tooltip, Polyline, useMap } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Building, LandParcel, PropertyUnit } from "@/types/gis";
import type { SpatialConflict } from "@/types/conflict";
import type { ExtractionResult } from "@/lib/aiExtraction";
import { lngLatRing, ringToLatLngs, type LatLngPair } from "@/lib/gisGeo";
import { PARCEL_COLORS, BUILDING_COLORS, UNIT_COLORS, CONFLICT_COLORS, type LayerState } from "@/lib/gisLayers";
import { cn } from "@/lib/utils";

export interface GisMap2DProps {
  parcels: LandParcel[];
  buildings: Building[];
  properties: PropertyUnit[];
  conflicts: SpatialConflict[];
  layers: LayerState;
  selectedParcelId: string | null;
  selectedBuildingId: string | null;
  selectedFloorId: string | null;
  selectedPropertyId: string | null;
  selectedConflictId: string | null;
  /** Session-transported AI-assisted prototype extraction (optional overlay). */
  prototypeExtraction?: ExtractionResult | null;
  onSelectParcel: (id: string) => void;
  onSelectBuilding: (id: string) => void;
  onSelectProperty: (id: string) => void;
  onSelectConflict: (id: string) => void;
  onMapReady: (map: LeafletMap) => void;
  className?: string;
}

const DEMO_ROADS: Array<LatLngPair[]> = [
  // Main road through the Shivaji Nagar / Koregaon Park clusters
  [
    [18.53, 73.8528],
    [18.5326, 73.8555],
    [18.5338, 73.8668],
  ],
  // Connecting Baner & Wakad & Hinjewadi corridor
  [
    [18.5655, 73.779],
    [18.5683, 73.7745],
    [18.5905, 73.7625],
    [18.592, 73.7052],
  ],
];

/** Unit boundary envelope (± in degrees ≈ ±17 m). */
const UNIT_HALF_SPAN = 0.00016;

export function GisMap2D({
  parcels,
  buildings,
  properties,
  conflicts,
  layers,
  selectedParcelId,
  selectedBuildingId,
  selectedFloorId,
  selectedPropertyId,
  selectedConflictId,
  prototypeExtraction,
  onSelectParcel,
  onSelectBuilding,
  onSelectProperty,
  onSelectConflict,
  onMapReady,
  className,
}: GisMap2DProps) {
  const selectedParcel = parcels.find((p) => p.id === selectedParcelId);
  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId);
  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);
  const initialCentre: LatLngPair = selectedParcel
    ? [selectedParcel.centroid.lat, selectedParcel.centroid.lng]
    : [18.56, 73.78];

  // Visible unit set — respects the selected floor filter.
  const visibleUnits = selectedFloorId
    ? properties.filter((p) => p.floorId === selectedFloorId)
    : properties;

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-slate-900", className)}>
      {/* Fallback grid shows whenever tiles are unavailable */}
      <div className="tech-grid-dark pointer-events-none absolute inset-0 z-0 opacity-40" />

      <MapContainer
        center={initialCentre}
        zoom={13}
        zoomControl={false}
        attributionControl={false}
        className="z-[1] h-full w-full outline-none"
      >
        <OnReady callback={onMapReady} />
        <FitController
          parcels={parcels}
          selectedParcel={selectedParcel}
          selectedBuilding={selectedBuilding}
          selectedProperty={selectedProperty}
          selectedConflict={conflicts.find((c) => c.id === selectedConflictId)}
        />

        {/* Base tiles */}
        {layers.satellite ? (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Imagery © Esri"
          />
        ) : (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />
        )}
        {/* Labels overlay */}
        {layers.labels && (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
            attribution="Labels © CARTO"
          />
        )}

        {/* Demo roads */}
        {layers.roads &&
          DEMO_ROADS.map((points, i) => (
            <Polyline
              key={`road-${i}`}
              positions={points}
              pathOptions={{ color: "#94A3B8", weight: 2, dashArray: "8 6", opacity: 0.75 }}
            >
              <Tooltip sticky>Access road (demo overlay)</Tooltip>
            </Polyline>
          ))}
        {/* ── Land Parcel polygons ─────────────────────────────────────── */}
        {layers.parcels &&
          parcels.map((parcel) => {
            const selected = selectedParcelId === parcel.id;
            const c = PARCEL_COLORS[parcel.status] ?? PARCEL_COLORS.default;
            return (
              <Polygon
                key={parcel.id}
                positions={ringToLatLngs(lngLatRing(parcel.geometry)) as unknown as [number, number][]}
                pathOptions={{
                  color: selected ? "#06B6D4" : c.stroke,
                  weight: selected ? 4 : 2,
                  fillColor: selected ? "rgba(6,182,212,0.22)" : c.fill,
                  fillOpacity: selected ? 0.35 : 0.3,
                }}
                eventHandlers={{ click: () => onSelectParcel(selected ? selectedParcelId : parcel.id) }}
              >
                <Tooltip sticky direction="top">
                  <span className="font-mono text-[10px] font-bold">{parcel.parcelNumber}</span>
                  <span className="block text-[9px]">{parcel.location}, {parcel.district}</span>
                </Tooltip>
              </Polygon>
            );
          })}

        {/* ── Building footprints ─────────────────────────────────── */}
        {layers.buildings &&
          buildings.map((building) => {
            const selected = selectedBuildingId === building.id;
            const onFacilityBuilding = selectedParcelId ? building.parcelId === selectedParcelId : true;
            const c = BUILDING_COLORS[building.status] ?? BUILDING_COLORS.default;
            return (
              <Polygon
                key={building.id}
                positions={ringToLatLngs(lngLatRing(building.geometry)) as unknown as [number, number][]}
                pathOptions={{
                  color: selected ? "#22D3EE" : c.stroke,
                  weight: selected ? 3.5 : 2,
                  fillColor: selected ? "rgba(34,211,238,0.30)" : onFacilityBuilding ? c.fill : "rgba(100,116,139,0.10)",
                  fillOpacity: selected ? 0.45 : 0.28,
                }}
                eventHandlers={{ click: () => onSelectBuilding(selected ? selectedBuildingId : building.id) }}
              >
                <Tooltip sticky direction="top">
                  <span className="text-[10px] font-bold">{building.name}</span>
                  <span className="block font-mono text-[9px] text-slate-500">{building.id}</span>
                </Tooltip>
              </Polygon>
            );
          })}

        {/* ── Property unit boundaries ────────────────────────────── */}
        {layers.boundaries &&
          visibleUnits.map((unit) => {
            const bsel = selectedPropertyId === unit.id;
            const bc = UNIT_COLORS[unit.verificationStatus] ?? UNIT_COLORS.default;
            return (
              <Rectangle
                key={`b-${unit.id}`}
                bounds={unitBounds(unit)}
                pathOptions={{
                  color: bsel ? "#FFFFFF" : bc.stroke,
                  weight: bsel ? 2.5 : 1,
                  fillColor: bsel ? "rgba(255,255,255,0.25)" : bc.fill,
                  fillOpacity: bsel ? 0.4 : 0.2,
                }}
                eventHandlers={{ click: () => onSelectProperty(bsel ? selectedPropertyId : unit.id) }}
              >
                <Tooltip sticky>
                  <span className="font-mono text-[9px] font-bold">{unit.id}</span>
                  <span className="block text-[9px] text-slate-500">{unit.demoSpatialId}</span>
                </Tooltip>
              </Rectangle>
            );
          })}

        {/* ── Property unit markers ───────────────────────────────── */}
        {layers.units &&
          visibleUnits.map((unit) => {
            const usel = selectedPropertyId === unit.id;
            const affectedByConflict = conflicts.some(
              (c) => c.affectedPropertyIds.includes(unit.id) && c.id === selectedConflictId,
            );
            const uc = UNIT_COLORS[unit.verificationStatus] ?? UNIT_COLORS.default;
            return (
              <CircleMarker
                key={`u-${unit.id}`}
                center={[unit.latitude, unit.longitude]}
                radius={usel ? 7 : 5}
                pathOptions={{
                  color: "#0F172A",
                  weight: 1,
                  fillColor: affectedByConflict ? "#EF4444" : usel ? "#FFFFFF" : uc.fill,
                  fillOpacity: 1,
                }}
                eventHandlers={{ click: () => onSelectProperty(usel ? selectedPropertyId : unit.id) }}
              >
                <Tooltip sticky direction="top">
                  <span className="font-mono text-[9px] font-bold">{unit.id}</span>
                  <span className="block text-[9px] text-slate-500">Unit {unit.unitNumber} · {unit.verificationStatus}</span>
                  <span className="block text-[9px] text-slate-500">{unit.ownerReferenceName}</span>
                </Tooltip>
              </CircleMarker>
            );
          })}

        {/* ── Spatial conflict zones ──────────────────────────────── */}
        {layers.conflicts &&
          conflicts.map((conflict) => {
            const csel = selectedConflictId === conflict.id;
            const cc = CONFLICT_COLORS[conflict.severity] ?? CONFLICT_COLORS.default;
            return (
              <Polygon
                key={conflict.id}
                positions={ringToLatLngs(lngLatRing(conflict.geometry)) as unknown as [number, number][]}
                pathOptions={{
                  color: csel ? "#FFFFFF" : cc.stroke,
                  weight: csel ? 3.5 : 2,
                  fillColor: cc.fill,
                  fillOpacity: csel ? 0.55 : 0.4,
                  dashArray: csel ? undefined : "6 4",
                }}
                eventHandlers={{ click: () => onSelectConflict(csel ? "" : conflict.id) }}
              >
                <Tooltip sticky direction="top">
                  <span className="font-mono text-[9px] font-bold">{conflict.conflictNumber}</span>
                  <span className="block text-[9px]">{conflict.type} · {conflict.severity}</span>
                  <span className="block text-[9px] text-slate-500">{conflict.status}</span>
                </Tooltip>
              </Polygon>
            );
          })}

        {/* ── AI-assisted prototype extraction overlay ────────────── */}
        {prototypeExtraction && (
          <>
            <Polygon
              positions={
                ringToLatLngs(lngLatRing(prototypeExtraction.extractedFootprint)) as unknown as [number, number][]
              }
              pathOptions={{
                color: "#06B6D4",
                weight: 2.5,
                fillColor: "#06B6D4",
                fillOpacity: 0.18,
                dashArray: "8 6",
              }}
            >
              <Tooltip sticky direction="top">
                <span className="font-mono text-[9px] font-bold">{prototypeExtraction.id}</span>
                <span className="block text-[9px]">AI-Assisted Prototype Output — not a survey</span>
                <span className="block text-[9px] text-slate-500">
                  {prototypeExtraction.estimatedFloors} floors · {prototypeExtraction.estimatedHeightMeters.toFixed(1)} m ·{" "}
                  {prototypeExtraction.estimatedFootprintAreaSqm.toLocaleString()} m²
                </span>
              </Tooltip>
            </Polygon>
            {lngLatRing(prototypeExtraction.extractedFootprint).map(([lng, lat], i) => (
              <CircleMarker
                key={`pe-${prototypeExtraction.id}-${i}`}
                center={[lat, lng]}
                radius={3.5}
                pathOptions={{ color: "#0E7490", weight: 1.5, fillColor: "#FFFFFF", fillOpacity: 1 }}
              />
            ))}
          </>
        )}
      </MapContainer>

      {/* Base layer indicator */}
      <div className="pointer-events-none absolute left-2.5 top-2.5 z-[500] rounded-md border border-slate-700/70 bg-slate-950/85 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-slate-300">
        {layers.satellite ? "Esri · Satellite" : "OSM · Streets"}
      </div>
    </div>
  );
}

function OnReady({ callback }: { callback: (map: LeafletMap) => void }) {
  const map = useMap();
  React.useEffect(() => {
    callback(map);
  }, [map, callback]);
  return null;
}

/**
 * Keeps the map framed on the current selection. Pure behaviour — no
 * duplicate selection state lives in the map.
 */
function FitController({
  parcels,
  selectedParcel,
  selectedBuilding,
  selectedProperty,
  selectedConflict,
}: {
  parcels: LandParcel[];
  selectedParcel?: LandParcel;
  selectedBuilding?: Building;
  selectedProperty?: PropertyUnit;
  selectedConflict?: SpatialConflict;
}) {
  const map = useMap();
  const key = [selectedConflict?.id, selectedProperty?.id, selectedBuilding?.id, selectedParcel?.id].join("|");

  React.useEffect(() => {
    const target = selectedConflict ?? selectedProperty ?? selectedBuilding ?? selectedParcel;
    if (target) {
      const ring = lngLatRing(target.geometry);
      const latLngs = ringToLatLngs(ring);
      map.flyToBounds(latLngs as unknown as [number, number][], { padding: [42, 42], maxZoom: 17 });
    } else if (parcels.length) {
      const all = parcels.flatMap((p) => lngLatRing(p.geometry));
      const bounds = ringToLatLngs(all);
      map.flyToBounds(bounds as unknown as [number, number][], { padding: [36, 36], maxZoom: 14 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}

function unitBounds(unit: PropertyUnit): LatLngPair[] {
  return [
    [unit.latitude - UNIT_HALF_SPAN, unit.longitude - UNIT_HALF_SPAN],
    [unit.latitude + UNIT_HALF_SPAN, unit.longitude + UNIT_HALF_SPAN],
  ] as LatLngPair[];
}