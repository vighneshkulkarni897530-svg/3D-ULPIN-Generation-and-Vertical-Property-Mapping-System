"use client";

import * as React from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Layers, Box, RotateCw, ZoomIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/layout/PageHeader";
import { lngLatRing, geoToLocal } from "@/lib/gisGeo";
import type { ExtractionResult } from "@/lib/aiExtraction";

interface ReconstructionPreview3DProps {
  result: ExtractionResult;
  onGenerate: () => void;
  generated: boolean;
  generating: boolean;
}

/** Builds the extruded building mesh + floor ring segments from the prototype footprint. */
function useBuildingGeometry(result: ExtractionResult, visible: boolean) {
  return React.useMemo(() => {
    if (!visible) return null;
    const ring = lngLatRing(result.extractedFootprint);
    const local = ring.map(([lng, lat]) => {
      const c = geoToLocal(result.centroid.lat, result.centroid.lng, lat, lng);
      return new THREE.Vector2(c.x, c.z);
    });
    const bbox = new THREE.Box2().setFromPoints(local);
    const centre = bbox.getCenter(new THREE.Vector2());
    const shape = new THREE.Shape(local.map((p) => new THREE.Vector2(p.x - centre.x, p.y - centre.y)));
    const height = result.estimatedHeightMeters;
    const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);

    const floorH = height / result.estimatedFloors;
    const linePts: number[] = [];
    const ringLocal = local.map((p) => [p.x - centre.x, p.y - centre.y] as const);
    for (let f = 0; f <= result.estimatedFloors; f++) {
      const y = Math.min(f * floorH, height);
      for (let i = 0; i < ringLocal.length; i++) {
        const [ax, az] = ringLocal[i];
        const [bx, bz] = ringLocal[(i + 1) % ringLocal.length];
        linePts.push(ax, y, -az, bx, y, -bz);
      }
    }
    const lines = new THREE.BufferGeometry();
    lines.setAttribute("position", new THREE.Float32BufferAttribute(linePts, 3));

    const size = bbox.getSize(new THREE.Vector2());
    const span = Math.max(size.x, size.y, height);
    return { geo, lines, span, height };
  }, [result, visible]);
}

/** Section 6 — focused 2D → 3D reconstruction preview (R3F, floor segmented). */
export function ReconstructionPreview3D({ result, onGenerate, generated, generating }: ReconstructionPreview3DProps) {
  const built = useBuildingGeometry(result, generated && !generating);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <SectionHeader
        icon={<Box className="h-4 w-4" />}
        title="5 · 3D Reconstruction Preview"
        description="Simplified massing model — footprint + estimated height + floor segmentation."
        action={
          <Badge variant="warning" className="text-[9px]">
            AI-Assisted Prototype Output
          </Badge>
        }
      />

      {!generated ? (
        <div className="mt-4 flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 sm:h-80">
          <Box className="h-8 w-8 text-slate-300" />
          <p className="max-w-xs text-center text-[11px] font-semibold text-slate-500">
            Generate a simplified 3D massing model from the extracted prototype footprint and estimated levels.
          </p>
          <Button size="sm" onClick={onGenerate} disabled={generating}>
            <Layers className="h-3.5 w-3.5" /> {generating ? "Reconstructing…" : "Generate 3D Preview"}
          </Button>
        </div>
      ) : (
        <div className="mt-4">
          <div className="relative h-64 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:h-80">
            {generating ? (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <RotateCw className="h-6 w-6 animate-spin text-cyan-500" />
                <p className="text-[11px] font-bold text-slate-500">Generating 3D Preview…</p>
              </div>
            ) : built ? (
              <Canvas camera={{ position: [built.span * 0.95, built.span * 0.75, built.span * 0.95], fov: 45 }} dpr={[1, 2]}>
                <color attach="background" args={["#F1F5F9"]} />
                <ambientLight intensity={0.75} />
                <directionalLight position={[built.span, built.span * 1.4, built.span * 0.6]} intensity={0.9} />
                <mesh geometry={built.geo}>
                  <meshStandardMaterial color="#67E8F9" transparent opacity={0.5} flatShading />
                </mesh>
                <lineSegments geometry={built.lines}>
                  <lineBasicMaterial color="#0E7490" />
                </lineSegments>
                <gridHelper args={[built.span * 2.4, 12, "#CBD5E1", "#E2E8F0"]} position={[0, -0.02, 0]} />
                <OrbitControls
                  makeDefault
                  enablePan={false}
                  target={[0, built.height / 3, 0]}
                  maxPolarAngle={Math.PI / 2.05}
                  minDistance={built.span * 0.5}
                  maxDistance={built.span * 2.6}
                />
              </Canvas>
            ) : null}
            <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-slate-950/80 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-widest text-cyan-300">
              Simulated 3D Massing — Not Photogrammetry
            </span>
            <span className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1.5 rounded-md bg-slate-950/70 px-1.5 py-0.5 text-[8.5px] font-bold text-slate-300">
              <RotateCw className="h-2.5 w-2.5" /> drag rotate · <ZoomIn className="h-2.5 w-2.5" /> scroll zoom
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-600">
              <Layers className="h-3.5 w-3.5 text-cyan-600" />
              {result.estimatedFloors} floor segments · {result.estimatedHeightMeters.toFixed(1)} m ·{" "}
              {result.estimatedFootprintAreaSqm.toLocaleString()} m² footprint
            </p>
            <Badge variant="navy" className="text-[9px]">
              Reconstruction Confidence {result.reconstructionConfidence}%
            </Badge>
          </div>
        </div>
      )}
    </section>
  );
}