"use client";

import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polygon, Rectangle, Tooltip, useMap } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Society3DUlpinRecord } from "@/lib/society/society3DUlpinRegistry";
import { MOCK_BUILDINGS } from "@/data/buildings";
import { lngLatRing, ringToLatLngs, type LatLngPair } from "@/lib/gisGeo";

interface Society2DLocationPreviewProps {
  record: Society3DUlpinRecord;
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 });
  }, [map, center, zoom]);
  return null;
}

export function Society2DLocationPreview({ record }: Society2DLocationPreviewProps) {
  const center: [number, number] = [record.centroid.lat, record.centroid.lng];
  const boundaryLatLngs: LatLngPair[] = record.boundaryPolygon.map(([lng, lat]) => [lat, lng]);

  // Filter buildings that belong to this society/parcel
  const societyBuildings = MOCK_BUILDINGS.filter(
    (b) => b.parcelId === record.parcelId || record.buildingIds.includes(b.id)
  );

  return (
    <div className="relative h-full w-full bg-slate-950">
      <MapContainer
        center={center}
        zoom={17}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full outline-none z-0"
      >
        <MapController center={center} zoom={17} />

        {/* Base map tiles */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap"
        />

        {/* Society Boundary Polygon */}
        <Polygon
          positions={boundaryLatLngs}
          pathOptions={{
            color: "#00F0FF",
            weight: 2.5,
            fillColor: "#06B6D4",
            fillOpacity: 0.18,
            dashArray: "4, 4",
          }}
        >
          <Tooltip sticky direction="top" className="font-mono text-xs font-bold">
            {record.societyName} [{record.society3DUlpin}]
          </Tooltip>
        </Polygon>

        {/* Building Footprints */}
        {societyBuildings.map((b) => {
          const ring = lngLatRing(b.geometry);
          const bLatLngs = ringToLatLngs(ring);
          return (
            <Polygon
              key={b.id}
              positions={bLatLngs}
              pathOptions={{
                color: "#38BDF8",
                weight: 2,
                fillColor: "#0284C7",
                fillOpacity: 0.6,
              }}
            >
              <Tooltip permanent={false} direction="center" className="font-bold text-[10px]">
                {b.name} ({b.totalFloors} Fl)
              </Tooltip>
            </Polygon>
          );
        })}
      </MapContainer>

      {/* Overlay legend badge */}
      <div className="pointer-events-none absolute bottom-2 left-2 z-[400] rounded-lg border border-slate-700/80 bg-slate-950/85 px-2.5 py-1 text-[10px] font-mono text-cyan-300 backdrop-blur shadow-md">
        Centroid: {record.centroid.lat.toFixed(4)}°N, {record.centroid.lng.toFixed(4)}°E
      </div>
    </div>
  );
}
