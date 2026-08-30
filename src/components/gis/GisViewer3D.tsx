"use client";

import * as React from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
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
  if (!parcels.length) return { lat: 18.56, lng: 73.78 };
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
        return [c.x, firstAffected.elevation + 1, c.z];
      }
      const b = ringBounds(lngLatRing(selConflict.geometry));
      const c = geoToLocal(origin.lat, origin.lng, (b.minLat + b.maxLat) / 2, (b.minLng + b.maxLng) / 2);
      return [c.x, 0, c.z];
    }
    const selProp = properties.find((p) => p.id === selectedPropertyId);
    if (selProp) {
      const c = geoToLocal(origin.lat, origin.lng, selProp.latitude, selProp.longitude);
      return [c.x, selProp.elevation + 1, c.z];
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
    return [0, 0, 0];
  }, [selectedConflictId, selectedPropertyId, selectedBuildingId, selectedParcelId, properties, buildings, parcels, conflicts, origin]);

  return (
    <Canvas
      camera={{ position: [0, 90, -80], fov: 45, near: 0.1, far: 1000 }}
      dpr={[1, 2]}
      className={className}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[60, 120, 40]} intensity={1.1} />
      <pointLight position={[0, 120, 0]} intensity={0.4} />

      <gridHelper args={[240, 24, "#2b4a6f", "#1E293B"]} position={[0, 0, 0]} />

      <Parcels3D parcels={parcels} origin={origin} layers={layers} selectedParcelId={selectedParcelId} onSelectParcel={onSelectParcel} />
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
      <Units3D
        properties={properties}
        origin={origin}
        layers={layers}
        selectedBuildingId={selectedBuildingId}
        selectedFloorId={selectedFloorId}
        selectedPropertyId={selectedPropertyId}
        onSelectProperty={onSelectProperty}
      />
      {layers.conflicts && conflicts.length > 0 && (
        <Conflicts3D conflicts={conflicts} origin={origin} />
      )}
      {prototypeExtraction && <PrototypeExtraction3D result={prototypeExtraction} origin={origin} />}

      <OrbitControls ref={controlsRef} makeDefault enablePan maxPolarAngle={Math.PI / 2.1} />
      <CameraFocus controlsRef={controlsRef} target={focus} />
    </Canvas>
  );
}
/**
 * AI-assisted prototype extraction volume — transparent cyan massing with a
 * crisp edge outline, placed at the extraction centroid within the scene.
 * Purely visual; never mutates registry geometry.
 */
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
        <meshStandardMaterial color="#06B6D4" transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <lineSegments geometry={built.edges}>
        <lineBasicMaterial color="#06B6D4" />
      </lineSegments>
      {/* Marker puck above the roofline — prototype candidate indicator */}
      <mesh position={[0, result.estimatedHeightMeters + 1.2, 0]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial color="#F59E0B" />
      </mesh>
    </group>
  );
}

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
          return [c.x, 0.02, c.z] as Vec3;
        });
        const selected = selectedParcelId === parcel.id;
        const c = PARCEL_COLORS[parcel.status] ?? PARCEL_COLORS.default;
        const outlineColor = selected ? "#06B6D4" : c.stroke;
        return (
          <group key={parcel.id}>
            <mesh
              position={[(local[0][0] + local[2][0]) / 2, 0, (local[0][2] + local[2][2]) / 2]}
              rotation={[-Math.PI / 2, 0, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectParcel(selected ? selectedParcelId : parcel.id);
              }}
            >
              <planeGeometry args={[Math.abs(local[2][0] - local[0][0]), Math.abs(local[2][2] - local[0][2])]} />
              <meshStandardMaterial
                color={selected ? "#0891B2" : c.stroke}
                transparent
                opacity={selected ? 0.22 : 0.12}
                depthWrite={false}
              />
            </mesh>
            <Line points={local} color={outlineColor} lineWidth={2.2} />
          </group>
        );
      })}
    </group>
  );
}

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
  if (!layers.buildings) return null;
  return (
    <group>
      {buildings.map((building) => {
        const ring = lngLatRing(building.geometry);
        const { w, d, cx, cz } = footprintFromRing(ring, origin.lat, origin);
        const selected = selectedBuildingId === building.id;
        const inSelectedParcel = selectedParcelId ? building.parcelId === selectedParcelId : false;
        const color = selected ? "#22D3EE" : inSelectedParcel ? "#3B82F6" : "#334155";
        const bldgFloors = floors.filter((f) => f.buildingId === building.id);
        return (
          <group key={building.id}>
            {/* Base building volume */}
            <mesh
              position={[cx, building.height / 2, cz]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectBuilding(selected ? selectedBuildingId : building.id);
              }}
            >
              <boxGeometry args={[w, building.height, d]} />
              <meshStandardMaterial color={color} transparent opacity={selected ? 0.85 : 0.55} roughness={0.75} />
            </mesh>

            {/* Floor slabs / segmentation */}
            {bldgFloors.map((floor) => {
              const floorSelected = selectedFloorId === floor.id;
              return (
                <mesh
                  key={floor.id}
                  position={[cx, floor.elevation + 0.2, cz]}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!selected) onSelectBuilding(building.id);
                    onSelectFloor(floorSelected ? "" : floor.id);
                  }}
                >
                  <boxGeometry args={[w * 1.01, 0.5, d * 1.01]} />
                  <meshStandardMaterial
                    color={floorSelected ? "#22D3EE" : "#0E7490"}
                    emissive={floorSelected ? "#06B6D4" : "#000000"}
                    emissiveIntensity={floorSelected ? 0.9 : 0}
                    transparent
                    opacity={floorSelected ? 1 : 0.55}
                  />
                </mesh>
              );
            })}

            {/* Selected building outline */}
            {selected && (
              <Line
                points={[
                  [cx - w / 2, 0.05, cz - d / 2],
                  [cx + w / 2, 0.05, cz - d / 2],
                  [cx + w / 2, 0.05, cz + d / 2],
                  [cx - w / 2, 0.05, cz + d / 2],
                  [cx - w / 2, 0.05, cz - d / 2],
                ]}
                color="#FFFFFF"
                lineWidth={1.5}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}

/**
 * Vertical property units rendered as small status-coloured volumes floating
 * at their real elevations. Units outside the active floor filter are hidden
 * so the floor control genuinely filters the 3D scene. Selected units glow.
 */
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
        // Floor filter hides units on other floors (except the selected one).
        if (selectedFloorId && unit.floorId !== selectedFloorId && !selected) return null;
        // A selected building dims units that belong to other buildings.
        const dimmed = !selectedFloorId && !!selectedBuildingId && unit.buildingId !== selectedBuildingId;
        const c = UNIT_COLORS[unit.verificationStatus] ?? UNIT_COLORS.default;
        const local = geoToLocal(origin.lat, origin.lng, unit.latitude, unit.longitude);
        const y = unit.elevation + 0.9;
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
                <boxGeometry args={[selected ? 2.6 : 1.8, 1.3, selected ? 2.6 : 1.8]} />
                <meshStandardMaterial
                  color={selected ? "#F8FAFC" : c.fill}
                  emissive={selected ? "#06B6D4" : "#000000"}
                  emissiveIntensity={selected ? 0.85 : 0}
                  transparent
                  opacity={dimmed ? 0.22 : 0.95}
                  roughness={0.5}
                />
              </mesh>
            )}
            {layers.boundaries && (
              <Line
                points={[
                  [local.x - 5, y - 0.7, local.z - 5],
                  [local.x + 5, y - 0.7, local.z - 5],
                  [local.x + 5, y - 0.7, local.z + 5],
                  [local.x - 5, y - 0.7, local.z + 5],
                  [local.x - 5, y - 0.7, local.z - 5],
                ]}
                color={selected ? "#22D3EE" : c.stroke}
                lineWidth={selected ? 2 : 1}
                transparent
                opacity={dimmed ? 0.25 : 0.85}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}

/**
 * Spatial conflict zones rendered as flat severity-coloured areas hovering
 * just above the terrain. Resolved conflicts are shown faded.
 */
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
            <mesh position={[0, 0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <shapeGeometry args={[shape]} />
              <meshStandardMaterial
                color={cc.stroke}
                transparent
                opacity={resolved ? 0.14 : 0.42}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
            <Line
              points={shapePoints.map((v) => [v.x, 0.5, -v.y] as Vec3)}
              color={cc.stroke}
              lineWidth={1.8}
              transparent
              opacity={resolved ? 0.35 : 0.9}
            />
          </group>
        );
      })}
    </group>
  );
}

/**
 * Smoothly pans the orbit rig toward the current selection (property >
 * building > parcel) without changing camera orientation or distance.
 */
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
    const delta = new THREE.Vector3().subVectors(desired.current, controls.target).multiplyScalar(0.09);
    if (delta.lengthSq() < 0.0004) return;
    controls.target.add(delta);
    camera.position.add(delta);
    controls.update();
  });

  return null;
}