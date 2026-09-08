"use client";

import * as React from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Line, Html } from "@react-three/drei";
import Link from "next/link";
import { ExternalLink, Building2, Layers, MapPin } from "lucide-react";
import type { Building, LandParcel, PropertyUnit } from "@/types/gis";
import type { SpatialConflict } from "@/types/conflict";
import type { ExtractionResult } from "@/lib/aiExtraction";
import { lngLatRing, ringBounds, geoToLocal, ringWidthMeters, ringDepthMeters } from "@/lib/gisGeo";
import { UNIT_COLORS, PARCEL_COLORS, CONFLICT_COLORS, type LayerState } from "@/lib/gisLayers";

export interface GisViewer3DProps {
  parcels: LandParcel[];
  buildings: Building[];
  floors: { id: string; buildingId: string; floorNumber: number; name: string; elevation: number; area: number; totalUnits: number }[];
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
  onSelectFloor: (id: string) => void;
  onSelectProperty: (id: string) => void;
  className?: string;
}

type Vec3 = [number, number, number];

function sceneOrigin(parcels: LandParcel[]) {
  if (!parcels.length) return { lat: 18.5940, lng: 73.7415 };
  const lat = parcels.reduce((s, p) => s + p.centroid.lat, 0) / parcels.length;
  const lng = parcels.reduce((s, p) => s + p.centroid.lng, 0) / parcels.length;
  return { lat, lng };
}

/** A ring's footprint as [width, depth, centre(x,z)] in local metres. */
function footprintFromRing(ring: Array<[number, number]>, refLat: number, origin: { lat: number; lng: number }) {
  const b = ringBounds(ring);
  const w = ringWidthMeters(ring, refLat);
  const d = ringDepthMeters(ring);
  const c = geoToLocal(origin.lat, origin.lng, (b.minLat + b.maxLat) / 2, (b.minLng + b.maxLng) / 2);
  return { w, d, cx: c.x, cz: c.z };
}

// Color palette mapping by parcel to give each parcel a distinct visual theme
const PARCEL_THEMES: Record<string, { base: string; floor: string; glow: string; label: string }> = {
  'PARCEL-MH-PUN-001': { base: '#10B981', floor: '#059669', glow: '#34D399', label: 'Green View' },
  'PARCEL-MH-PUN-002': { base: '#3B82F6', floor: '#2563EB', glow: '#60A5FA', label: 'Shree Krishna' },
  'PARCEL-MH-PUN-003': { base: '#8B5CF6', floor: '#7C3AED', glow: '#A78BFA', label: 'Tech Tower' },
  'PARCEL-MH-PUN-004': { base: '#F59E0B', floor: '#D97706', glow: '#FBBF24', label: 'Wakad Heights' },
  'PARCEL-MH-PUN-005': { base: '#06B6D4', floor: '#0891B2', glow: '#22D3EE', label: 'Hinjewadi Enclave' },
  'PARCEL-MH-PUN-006': { base: '#EC4899', floor: '#DB2777', glow: '#F472B6', label: 'Amanora Elegance' },
  'PARCEL-MH-PUN-074': { base: '#00F0FF', floor: '#0284C7', glow: '#38BDF8', label: 'Life Republic' },
};

export function GisViewer3D({
  parcels,
  buildings,
  floors,
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
  onSelectFloor,
  onSelectProperty,
  className,
}: GisViewer3DProps) {
  const origin = React.useMemo(() => sceneOrigin(parcels), [parcels]);
  const controlsRef = React.useRef<any>(null);

  const focus = React.useMemo<Vec3>(() => {
    const selConflict = conflicts.find((c) => c.id === selectedConflictId);
    if (selConflict) {
      const firstAffected = properties.find((p) => p.id === selConflict.affectedPropertyIds[0]);
      if (firstAffected) {
        const c = geoToLocal(origin.lat, origin.lng, firstAffected.latitude, firstAffected.longitude);
        return [c.x, firstAffected.elevation + 2, c.z];
      }
      const b = ringBounds(lngLatRing(selConflict.geometry));
      const c = geoToLocal(origin.lat, origin.lng, (b.minLat + b.maxLat) / 2, (b.minLng + b.maxLng) / 2);
      return [c.x, 0, c.z];
    }
    const selProp = properties.find((p) => p.id === selectedPropertyId);
    if (selProp) {
      const c = geoToLocal(origin.lat, origin.lng, selProp.latitude, selProp.longitude);
      return [c.x, selProp.elevation + 2, c.z];
    }
    const selBldg = buildings.find((b) => b.id === selectedBuildingId);
    if (selBldg) {
      const ring = lngLatRing(selBldg.geometry);
      const f = footprintFromRing(ring, origin.lat, origin);
      return [f.cx, selBldg.height / 2, f.cz];
    }
    const selParcel = parcels.find((p) => p.id === selectedParcelId);
    if (selParcel) {
      const c = geoToLocal(origin.lat, origin.lng, selParcel.centroid.lat, selParcel.centroid.lng);
      return [c.x, 0, c.z];
    }
    return [0, 10, 0];
  }, [selectedConflictId, selectedPropertyId, selectedBuildingId, selectedParcelId, properties, buildings, parcels, conflicts, origin]);

  return (
    <Canvas
      camera={{ position: [0, 220, 260], fov: 45, near: 0.5, far: 10000 }}
      dpr={[1, 2]}
      className={className}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[150, 300, 100]} intensity={1.4} castShadow />
      <directionalLight position={[-150, 150, -100]} intensity={0.6} />
      <pointLight position={[0, 150, 0]} intensity={0.5} />

      {/* High-tech Ground Plane and Coordinate Grid */}
      <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1200, 1200]} />
        <meshStandardMaterial color="#030712" roughness={0.9} />
      </mesh>
      <gridHelper args={[1000, 50, "#0891B2", "#1E293B"]} position={[0, 0, 0]} />

      {/* Roads network */}
      {layers.roads && <Roads3D origin={origin} />}

      {/* Cadastral Parcels 3D */}
      <Parcels3D
        parcels={parcels}
        origin={origin}
        layers={layers}
        selectedParcelId={selectedParcelId}
        onSelectParcel={onSelectParcel}
      />

      {/* 3D Buildings across all 7 Parcels */}
      <Buildings3D
        buildings={buildings}
        floors={floors}
        origin={origin}
        layers={layers}
        selectedParcelId={selectedParcelId}
        selectedBuildingId={selectedBuildingId}
        selectedFloorId={selectedFloorId}
        onSelectBuilding={onSelectBuilding}
        onSelectFloor={onSelectFloor}
      />

      {/* Vertical Property Units */}
      <Units3D
        properties={properties}
        origin={origin}
        layers={layers}
        selectedBuildingId={selectedBuildingId}
        selectedFloorId={selectedFloorId}
        selectedPropertyId={selectedPropertyId}
        onSelectProperty={onSelectProperty}
      />

      {/* Spatial Conflicts Overlay */}
      {layers.conflicts && conflicts.length > 0 && (
        <Conflicts3D conflicts={conflicts} origin={origin} />
      )}

      {/* Session Prototype Extraction Overlay */}
      {prototypeExtraction && <PrototypeExtraction3D result={prototypeExtraction} origin={origin} />}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan
        maxPolarAngle={Math.PI / 2.05}
        minDistance={20}
        maxDistance={1200}
        dampingFactor={0.08}
      />
      <CameraFocus controlsRef={controlsRef} target={focus} />
    </Canvas>
  );
}

/** 3D Road Infrastructure connecting all 7 parcel sectors */
function Roads3D({ origin }: { origin: { lat: number; lng: number } }) {
  const roadSegments = React.useMemo(() => {
    const rawAvenues = [
      // East-West Avenue 1 (South)
      { start: [18.5925, 73.7360], end: [18.5925, 73.7470], width: 14 },
      // East-West Avenue 2 (North)
      { start: [18.5950, 73.7360], end: [18.5950, 73.7470], width: 14 },
      // North-South Boulevard 1 (West)
      { start: [18.5890, 73.74025], end: [18.5990, 73.74025], width: 12 },
      // North-South Boulevard 2 (East)
      { start: [18.5890, 73.74275], end: [18.5990, 73.74275], width: 12 },
    ];

    return rawAvenues.map((road) => {
      const p1 = geoToLocal(origin.lat, origin.lng, road.start[0], road.start[1]);
      const p2 = geoToLocal(origin.lat, origin.lng, road.end[0], road.end[1]);
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);
      const midX = (p1.x + p2.x) / 2;
      const midZ = (p1.z + p2.z) / 2;
      return { midX, midZ, length, width: road.width, angle, p1, p2 };
    });
  }, [origin]);

  return (
    <group position={[0, 0.04, 0]}>
      {roadSegments.map((seg, i) => (
        <group key={i} position={[seg.midX, 0, seg.midZ]} rotation={[0, -seg.angle, 0]}>
          {/* Asphalt Ribbon */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[seg.length, seg.width]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} metalness={0.2} />
          </mesh>
          {/* Centerline dashed markings */}
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[seg.length * 0.98, 0.4]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** 3D Parcels with cadastral boundaries and survey badges */
function Parcels3D({
  parcels,
  origin,
  layers,
  selectedParcelId,
  onSelectParcel,
}: {
  parcels: LandParcel[];
  origin: { lat: number; lng: number };
  layers: LayerState;
  selectedParcelId: string | null;
  onSelectParcel: (id: string) => void;
}) {
  if (!layers.parcels) return null;
  return (
    <group>
      {parcels.map((parcel) => {
        const ring = lngLatRing(parcel.geometry);
        const local = ring.map(([lng, lat]) => {
          const c = geoToLocal(origin.lat, origin.lng, lat, lng);
          return [c.x, 0.08, c.z] as Vec3;
        });
        const selected = selectedParcelId === parcel.id;
        const c = PARCEL_COLORS[parcel.status] ?? PARCEL_COLORS.default;
        const theme = PARCEL_THEMES[parcel.id] ?? { base: '#06B6D4', glow: '#22D3EE', label: parcel.location };
        const outlineColor = selected ? "#00F0FF" : c.stroke;

        const centroidLocal = geoToLocal(origin.lat, origin.lng, parcel.centroid.lat, parcel.centroid.lng);

        return (
          <group key={parcel.id}>
            {/* Parcel Base Plane */}
            <mesh
              position={[centroidLocal.x, 0.05, centroidLocal.z]}
              rotation={[-Math.PI / 2, 0, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectParcel(selected ? "" : parcel.id);
              }}
            >
              <planeGeometry args={[Math.abs(local[2][0] - local[0][0]) * 0.98, Math.abs(local[2][2] - local[0][2]) * 0.98]} />
              <meshStandardMaterial
                color={selected ? theme.glow : theme.base}
                transparent
                opacity={selected ? 0.25 : 0.12}
                roughness={0.7}
                depthWrite={false}
              />
            </mesh>

            {/* Glowing Boundary Line */}
            <Line points={local} color={outlineColor} lineWidth={selected ? 3.5 : 2.0} />

            {/* Floating Survey Number Badge */}
            {layers.labels && (
              <Html
                position={[centroidLocal.x, 1.2, centroidLocal.z]}
                center
                distanceFactor={180}
                zIndexRange={[10, 0]}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectParcel(parcel.id);
                  }}
                  className={`cursor-pointer select-none rounded-md px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider transition-all duration-200 ${
                    selected
                      ? "border border-cyan-400 bg-cyan-950/90 text-cyan-200 shadow-tech-cyan scale-105"
                      : "border border-slate-700/80 bg-slate-950/80 text-slate-300 hover:border-cyan-500/50 hover:text-white"
                  }`}
                >
                  {parcel.parcelNumber}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

/** 3D Buildings across all 7 Parcels with architectural details and interactive cards */
function Buildings3D({
  buildings,
  floors,
  origin,
  layers,
  selectedParcelId,
  selectedBuildingId,
  selectedFloorId,
  onSelectBuilding,
  onSelectFloor,
}: {
  buildings: Building[];
  floors: GisViewer3DProps["floors"];
  origin: { lat: number; lng: number };
  layers: LayerState;
  selectedParcelId: string | null;
  selectedBuildingId: string | null;
  selectedFloorId: string | null;
  onSelectBuilding: (id: string) => void;
  onSelectFloor: (id: string) => void;
}) {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  if (!layers.buildings) return null;

  return (
    <group>
      {buildings.map((building) => {
        const ring = lngLatRing(building.geometry);
        const { w, d, cx, cz } = footprintFromRing(ring, origin.lat, origin);
        const selected = selectedBuildingId === building.id;
        const hovered = hoveredId === building.id;
        const inSelectedParcel = selectedParcelId ? building.parcelId === selectedParcelId : false;
        
        const theme = PARCEL_THEMES[building.parcelId] ?? { base: '#3B82F6', floor: '#2563EB', glow: '#60A5FA' };
        const baseColor = selected ? "#00F0FF" : hovered ? theme.glow : inSelectedParcel ? theme.glow : theme.base;
        const bldgFloors = floors.filter((f) => f.buildingId === building.id);

        return (
          <group key={building.id}>
            {/* Main Extruded Building Glass Massing */}
            <mesh
              position={[cx, building.height / 2, cz]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectBuilding(selected ? "" : building.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredId(building.id);
              }}
              onPointerOut={() => setHoveredId(null)}
            >
              <boxGeometry args={[w, building.height, d]} />
              <meshStandardMaterial
                color={baseColor}
                transparent
                opacity={selected ? 0.85 : hovered ? 0.75 : 0.5}
                roughness={0.2}
                metalness={0.6}
              />
            </mesh>

            {/* Glowing Structural Wireframe Edges */}
            <lineSegments position={[cx, building.height / 2, cz]}>
              <edgesGeometry args={[new THREE.BoxGeometry(w, building.height, d)]} />
              <lineBasicMaterial
                color={selected ? "#FFFFFF" : hovered ? "#22D3EE" : theme.glow}
                linewidth={selected ? 2 : 1}
                transparent
                opacity={selected ? 1 : 0.65}
              />
            </lineSegments>

            {/* Rooftop Parapet Cap */}
            <mesh position={[cx, building.height + 0.4, cz]}>
              <boxGeometry args={[w * 0.94, 0.8, d * 0.94]} />
              <meshStandardMaterial color="#0f172a" roughness={0.9} />
            </mesh>

            {/* Floor Slabs Segmentation */}
            {bldgFloors.map((floor) => {
              const floorSelected = selectedFloorId === floor.id;
              return (
                <group key={floor.id}>
                  <mesh
                    position={[cx, floor.elevation + 0.25, cz]}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!selected) onSelectBuilding(building.id);
                      onSelectFloor(floorSelected ? "" : floor.id);
                    }}
                  >
                    <boxGeometry args={[w * 1.02, 0.45, d * 1.02]} />
                    <meshStandardMaterial
                      color={floorSelected ? "#00F0FF" : theme.floor}
                      emissive={floorSelected ? "#06B6D4" : theme.floor}
                      emissiveIntensity={floorSelected ? 1.0 : 0.3}
                      transparent
                      opacity={floorSelected ? 1 : 0.75}
                      roughness={0.3}
                    />
                  </mesh>
                </group>
              );
            })}

            {/* 3D Floating Building Label & Quick Card */}
            {layers.labels && (
              <Html
                position={[cx, building.height + 3.5, cz]}
                center
                distanceFactor={160}
                zIndexRange={[20, 0]}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBuilding(building.id);
                  }}
                  className={`cursor-pointer select-none rounded-lg px-2.5 py-1 text-center transition-all duration-200 ${
                    selected
                      ? "border border-cyan-400 bg-slate-950/95 shadow-tech-cyan scale-110"
                      : "border border-slate-700/70 bg-slate-950/85 hover:border-cyan-500/60 hover:scale-105"
                  }`}
                >
                  <p className="text-[10px] font-extrabold tracking-wide text-white truncate max-w-[120px]">
                    {building.name}
                  </p>
                  <p className="text-[8.5px] font-mono text-cyan-300">
                    {building.totalFloors} Fl · {building.height}m
                  </p>

                  {/* If selected, show quick button to open Society 3D Digital Twin */}
                  {selected && (
                    <div className="mt-1 pt-1 border-t border-slate-800 flex items-center justify-center">
                      <Link
                        href={`/properties/PROP-MH-PUN-GVR-102/digital-twin?society=${building.parcelId}&parcel=${building.parcelId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded bg-cyan-500 px-1.5 py-0.5 text-[8.5px] font-bold text-slate-950 hover:bg-cyan-400 transition-colors"
                      >
                        <ExternalLink className="h-2.5 w-2.5" /> 3D Twin
                      </Link>
                    </div>
                  )}
                </div>
              </Html>
            )}

            {/* Selected Footprint Highlight */}
            {selected && (
              <Line
                points={[
                  [cx - w / 2 - 0.5, 0.15, cz - d / 2 - 0.5],
                  [cx + w / 2 + 0.5, 0.15, cz - d / 2 - 0.5],
                  [cx + w / 2 + 0.5, 0.15, cz + d / 2 + 0.5],
                  [cx - w / 2 - 0.5, 0.15, cz + d / 2 + 0.5],
                  [cx - w / 2 - 0.5, 0.15, cz - d / 2 - 0.5],
                ]}
                color="#00F0FF"
                lineWidth={2.5}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}

/** Vertical property units rendered floating at their real elevations */
function Units3D({
  properties,
  origin,
  layers,
  selectedBuildingId,
  selectedFloorId,
  selectedPropertyId,
  onSelectProperty,
}: {
  properties: PropertyUnit[];
  origin: { lat: number; lng: number };
  layers: LayerState;
  selectedBuildingId: string | null;
  selectedFloorId: string | null;
  selectedPropertyId: string | null;
  onSelectProperty: (id: string) => void;
}) {
  if (!layers.units && !layers.boundaries) return null;
  return (
    <group>
      {properties.map((unit) => {
        const selected = selectedPropertyId === unit.id;
        // Floor filter hides units on other floors (except the selected one)
        if (selectedFloorId && unit.floorId !== selectedFloorId && !selected) return null;
        // A selected building dims units that belong to other buildings
        const dimmed = !selectedFloorId && !!selectedBuildingId && unit.buildingId !== selectedBuildingId;
        const c = UNIT_COLORS[unit.verificationStatus] ?? UNIT_COLORS.default;
        const local = geoToLocal(origin.lat, origin.lng, unit.latitude, unit.longitude);
        const y = unit.elevation + 1.2;

        return (
          <group key={unit.id}>
            {layers.units && (
              <mesh
                position={[local.x, y, local.z]}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectProperty(selected ? "" : unit.id);
                }}
              >
                <boxGeometry args={[selected ? 2.8 : 1.9, 1.4, selected ? 2.8 : 1.9]} />
                <meshStandardMaterial
                  color={selected ? "#FFFFFF" : c.fill}
                  emissive={selected ? "#06B6D4" : c.fill}
                  emissiveIntensity={selected ? 0.9 : 0.4}
                  transparent
                  opacity={dimmed ? 0.2 : 0.95}
                  roughness={0.4}
                />
              </mesh>
            )}
            {layers.boundaries && (
              <Line
                points={[
                  [local.x - 4, y - 0.7, local.z - 4],
                  [local.x + 4, y - 0.7, local.z - 4],
                  [local.x + 4, y - 0.7, local.z + 4],
                  [local.x - 4, y - 0.7, local.z + 4],
                  [local.x - 4, y - 0.7, local.z - 4],
                ]}
                color={selected ? "#00F0FF" : c.stroke}
                lineWidth={selected ? 2.2 : 1.2}
                transparent
                opacity={dimmed ? 0.2 : 0.85}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}

/** Spatial conflict zones rendered as severity-coloured volumes hovering above terrain */
function Conflicts3D({
  conflicts,
  origin,
}: {
  conflicts: SpatialConflict[];
  origin: { lat: number; lng: number };
}) {
  return (
    <group>
      {conflicts.map((conflict) => {
        const cc = CONFLICT_COLORS[conflict.severity] ?? CONFLICT_COLORS.default;
        const resolved = conflict.status === "Resolved";
        const shapePoints = lngLatRing(conflict.geometry).map(([lng, lat]) => {
          const c = geoToLocal(origin.lat, origin.lng, lat, lng);
          return new THREE.Vector2(c.x, -c.z);
        });
        const shape = new THREE.Shape(shapePoints);
        return (
          <group key={conflict.id}>
            <mesh position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <shapeGeometry args={[shape]} />
              <meshStandardMaterial
                color={cc.stroke}
                transparent
                opacity={resolved ? 0.15 : 0.45}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
            <Line
              points={shapePoints.map((v) => [v.x, 0.45, -v.y] as Vec3)}
              color={cc.stroke}
              lineWidth={2.5}
              transparent
              opacity={resolved ? 0.4 : 0.95}
            />
          </group>
        );
      })}
    </group>
  );
}

/** Prototype extraction massing */
function PrototypeExtraction3D({
  result,
  origin,
}: {
  result: ExtractionResult;
  origin: { lat: number; lng: number };
}) {
  const built = React.useMemo(() => {
    const ring = lngLatRing(result.extractedFootprint);
    const local = ring.map(([lng, lat]) => {
      const c = geoToLocal(result.centroid.lat, result.centroid.lng, lat, lng);
      return new THREE.Vector2(c.x, c.z);
    });
    const bbox = new THREE.Box2().setFromPoints(local);
    const centre = bbox.getCenter(new THREE.Vector2());
    const height = result.estimatedHeightMeters;
    const shape = new THREE.Shape(local.map((p) => new THREE.Vector2(p.x - centre.x, p.y - centre.y)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    return { geo, edges: new THREE.EdgesGeometry(geo) };
  }, [result]);

  const placement = geoToLocal(origin.lat, origin.lng, result.centroid.lat, result.centroid.lng);

  return (
    <group position={[placement.x, 0, placement.z]}>
      <mesh geometry={built.geo}>
        <meshStandardMaterial color="#06B6D4" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <lineSegments geometry={built.edges}>
        <lineBasicMaterial color="#00F0FF" />
      </lineSegments>
      <mesh position={[0, result.estimatedHeightMeters + 1.2, 0]}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color="#F59E0B" />
      </mesh>
    </group>
  );
}

/** Smoothly pans the orbit rig toward the current selection */
function CameraFocus({
  controlsRef,
  target,
}: {
  controlsRef: React.MutableRefObject<any>;
  target: Vec3;
}) {
  const { camera } = useThree();
  const desired = React.useRef(new THREE.Vector3(target[0], target[1], target[2]));

  React.useEffect(() => {
    desired.current.set(target[0], target[1], target[2]);
  }, [target]);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls?.target) return;
    const delta = new THREE.Vector3().subVectors(desired.current, controls.target).multiplyScalar(0.08);
    if (delta.lengthSq() < 0.0004) return;
    controls.target.add(delta);
    camera.position.add(delta);
    controls.update();
  });

  return null;
}