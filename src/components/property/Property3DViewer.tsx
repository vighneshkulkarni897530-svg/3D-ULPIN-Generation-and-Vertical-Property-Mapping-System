'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PropertyItem, BuildingFloor, PropertyUnit } from '@/types';
import { 
  Layers, 
  RotateCw, 
  Sun, 
  Eye, 
  Box, 
  Sparkles, 
  Info, 
  Building2, 
  Maximize2,
  Sliders,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface Property3DViewerProps {
  property: PropertyItem;
  onSelectUnit?: (unit: PropertyUnit) => void;
}

export const Property3DViewer: React.FC<Property3DViewerProps> = ({ 
  property,
  onSelectUnit 
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  
  // Interactive UI state
  const [selectedFloorNum, setSelectedFloorNum] = useState<number | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<PropertyUnit | null>(null);
  const [explosionOffset, setExplosionOffset] = useState<number>(0);
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);
  const [sunAngle, setSunAngle] = useState<number>(45);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  // References for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const floorGroupsRef = useRef<THREE.Group[]>([]);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const building = property.building;
  const floors = building?.floors || [];

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x070d18); // Deep midnight blue-black

    // 2. Camera Setup
    const width = container.clientWidth;
    const height = container.clientHeight || 520;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(28, 22, 32);
    camera.lookAt(0, 8, 0);
    cameraRef.current = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Clean container before append
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 4. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    const fillLight = new THREE.DirectionalLight(0x06b6d4, 1.2);
    fillLight.position.set(-20, 15, -20);
    scene.add(fillLight);

    // 5. Ground Grid & Cadastral Plot Boundary
    const gridHelper = new THREE.GridHelper(50, 25, 0x06b6d4, 0x1e293b);
    gridHelper.position.y = -0.05;
    scene.add(gridHelper);

    // Plot Base Platform
    const plotGeo = new THREE.BoxGeometry(26, 0.4, 22);
    const plotMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const plotMesh = new THREE.Mesh(plotGeo, plotMat);
    plotMesh.position.y = -0.2;
    plotMesh.receiveShadow = true;
    scene.add(plotMesh);

    // Plot Boundary Line Indicator
    const plotEdges = new THREE.EdgesGeometry(plotGeo);
    const plotLineMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 2 });
    const plotLines = new THREE.LineSegments(plotEdges, plotLineMat);
    plotLines.position.y = -0.2;
    scene.add(plotLines);

    // 6. Build Multi-Tier Parametric Floors
    const floorGroups: THREE.Group[] = [];
    const floorCount = floors.length || 5;

    for (let f = 0; f < floorCount; f++) {
      const floorGroup = new THREE.Group();
      const currentFloorData = floors[f];
      const floorBaseY = f * 3.2;

      // Slab Geometry
      const slabWidth = f === 5 ? 14 : f === 4 ? 16 : 18;
      const slabDepth = f === 5 ? 12 : f === 4 ? 13 : 14;
      const slabHeight = 0.35;

      const slabGeo = new THREE.BoxGeometry(slabWidth, slabHeight, slabDepth);
      const slabMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.4,
        metalness: 0.5,
      });
      const slabMesh = new THREE.Mesh(slabGeo, slabMat);
      slabMesh.position.y = 0;
      slabMesh.castShadow = true;
      slabMesh.receiveShadow = true;
      floorGroup.add(slabMesh);

      // Floor Glass & Wall Enclosure
      const wallHeight = 2.6;
      const wallGeo = new THREE.BoxGeometry(slabWidth - 0.4, wallHeight, slabDepth - 0.4);
      
      // Material with glowing cyan tech transparency
      const wallMat = new THREE.MeshPhysicalMaterial({
        color: f === 0 ? 0x0284c7 : 0x0891b2,
        transparent: true,
        opacity: 0.45,
        roughness: 0.1,
        transmission: 0.5,
        thickness: 1.2,
        reflectivity: 0.9,
      });
      const wallMesh = new THREE.Mesh(wallGeo, wallMat);
      wallMesh.position.y = wallHeight / 2 + slabHeight / 2;
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      floorGroup.add(wallMesh);

      // Wireframe contour lines
      const edges = new THREE.EdgesGeometry(wallGeo);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.7 });
      const lineSegments = new THREE.LineSegments(edges, lineMat);
      lineSegments.position.y = wallHeight / 2 + slabHeight / 2;
      floorGroup.add(lineSegments);

      // Internal Architectural Core & Partitions
      const coreGeo = new THREE.BoxGeometry(4, wallHeight, 4);
      const coreMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.y = wallHeight / 2 + slabHeight / 2;
      floorGroup.add(coreMesh);

      // Unit Partition Division Boxes (clickable/selectable)
      const unitsInFloor = currentFloorData?.units || [];
      const unitCount = unitsInFloor.length || 2;
      for (let u = 0; u < unitCount; u++) {
        const uWidth = (slabWidth - 5) / 2;
        const uDepth = (slabDepth - 5) / 2;
        const unitGeo = new THREE.BoxGeometry(uWidth, wallHeight - 0.2, uDepth);
        const unitMat = new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          transparent: true,
          opacity: 0.15,
          roughness: 0.3,
        });
        const unitMesh = new THREE.Mesh(unitGeo, unitMat);
        const posX = u % 2 === 0 ? -uWidth / 2 - 1.2 : uWidth / 2 + 1.2;
        const posZ = u < 2 ? -uDepth / 2 - 1.2 : uDepth / 2 + 1.2;
        unitMesh.position.set(posX, wallHeight / 2 + slabHeight / 2, posZ);
        unitMesh.userData = {
          floorNumber: f,
          unitIndex: u,
          unitData: unitsInFloor[u],
        };
        floorGroup.add(unitMesh);
      }

      floorGroup.position.y = floorBaseY;
      floorGroup.userData = { floorNumber: f, originalY: floorBaseY };
      scene.add(floorGroup);
      floorGroups.push(floorGroup);
    }
    floorGroupsRef.current = floorGroups;

    // 7. Render Loop & Orbit Rotation
    let animationFrameId: number;
    let rotationAngle = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (autoRotate && !isDraggingRef.current) {
        rotationAngle += 0.003;
        const radius = 38;
        camera.position.x = radius * Math.sin(rotationAngle);
        camera.position.z = radius * Math.cos(rotationAngle);
        camera.lookAt(0, 8, 0);
      }

      renderer.render(scene, camera);
    };
    animate();

    // 8. Mouse Interaction (Orbit Drag & Click)
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      const rotSpeed = 0.006;
      const currentRadius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
      let angle = Math.atan2(camera.position.x, camera.position.z);
      angle -= deltaX * rotSpeed;

      camera.position.x = currentRadius * Math.sin(angle);
      camera.position.z = currentRadius * Math.cos(angle);
      camera.position.y = Math.max(2, Math.min(60, camera.position.y + deltaY * 0.15));
      camera.lookAt(0, 8, 0);

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    // Raycast on click
    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(scene.children, true);
      for (const hit of intersects) {
        if (hit.object.userData && hit.object.userData.floorNumber !== undefined) {
          const fNum = hit.object.userData.floorNumber;
          setSelectedFloorNum(fNum);
          if (hit.object.userData.unitData) {
            setSelectedUnit(hit.object.userData.unitData);
            if (onSelectUnit) onSelectUnit(hit.object.userData.unitData);
          } else {
            const firstUnit = floors[fNum]?.units[0];
            if (firstUnit) {
              setSelectedUnit(firstUnit);
              if (onSelectUnit) onSelectUnit(firstUnit);
            }
          }
          break;
        }
      }
    };

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight || 520;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    domEl.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      domEl.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      domEl.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [property]);

  // Update Floor Explosion Slider Effect
  useEffect(() => {
    floorGroupsRef.current.forEach((fg, idx) => {
      const origY = fg.userData.originalY || idx * 3.2;
      fg.position.y = origY + idx * explosionOffset * 2.5;

      // Highlight selected floor
      const isSelected = selectedFloorNum === idx;
      fg.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.material instanceof THREE.MeshPhysicalMaterial || child.material instanceof THREE.MeshStandardMaterial) {
            if (isSelected) {
              child.material.emissive = new THREE.Color(0x06b6d4);
              child.material.emissiveIntensity = 0.4;
            } else {
              child.material.emissive = new THREE.Color(0x000000);
              child.material.emissiveIntensity = 0;
            }
          }
        }
      });
    });
  }, [explosionOffset, selectedFloorNum]);

  // Update Sunlight Simulation Angle
  useEffect(() => {
    if (dirLightRef.current) {
      const rad = (sunAngle * Math.PI) / 180;
      dirLightRef.current.position.set(40 * Math.cos(rad), 35, 40 * Math.sin(rad));
    }
  }, [sunAngle]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* 3D Viewer Header Controls */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                3D Digital Twin & Parametric BIM Explorer
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                LOD-300 WEBGL
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {building?.buildingName || property.title} • {building?.floorsCount || 6} Floors • Height: {building?.heightMeters || 28.5}m
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Auto Rotate Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              autoRotate
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-tech-cyan'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
            <span>{autoRotate ? 'Rotating' : 'Paused'}</span>
          </button>

          {/* Reset Camera */}
          <button
            onClick={() => {
              if (cameraRef.current) {
                cameraRef.current.position.set(28, 22, 32);
                cameraRef.current.lookAt(0, 8, 0);
              }
              setSelectedFloorNum(null);
              setSelectedUnit(null);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium"
          >
            Reset View
          </button>
        </div>
      </div>

      {/* Main 3D Canvas + Control Overlay */}
      <div className="relative w-full h-[520px] bg-slate-950 flex">
        {/* Three.js Canvas Container */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Left Side: Interactive Floor Level Selector */}
        <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-800 p-3 rounded-xl backdrop-blur-md text-xs shadow-xl space-y-2 z-10 max-h-[440px] overflow-y-auto">
          <p className="font-bold text-white uppercase tracking-wider text-[10px] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Floor Explorer
          </p>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                setSelectedFloorNum(null);
                setSelectedUnit(null);
              }}
              className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedFloorNum === null ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              All Floors (Overview)
            </button>
            {floors.map((fl, idx) => (
              <button
                key={fl.floorNumber}
                onClick={() => {
                  setSelectedFloorNum(fl.floorNumber);
                  if (fl.units.length > 0) {
                    setSelectedUnit(fl.units[0]);
                    if (onSelectUnit) onSelectUnit(fl.units[0]);
                  }
                }}
                className={`text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between gap-3 ${
                  selectedFloorNum === fl.floorNumber
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-tech-cyan'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>Floor {fl.floorNumber}</span>
                <span className="text-[10px] font-mono opacity-80">{fl.units.length} Units</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Bar: Floor Explosion & Sun Simulation Sliders */}
        <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 border border-slate-800 p-3 rounded-xl backdrop-blur-md text-xs flex flex-wrap items-center justify-between gap-4 z-10">
          {/* Explosion Slider */}
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <Sliders className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-[11px] font-medium text-slate-300 mb-1">
                <span>Floor Explosion / Disassembly</span>
                <span className="font-mono text-cyan-400">{(explosionOffset * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={explosionOffset}
                onChange={(e) => setExplosionOffset(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

          {/* Sunlight Angle Slider */}
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <Sun className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-[11px] font-medium text-slate-300 mb-1">
                <span>Sunlight / Shadow Angle</span>
                <span className="font-mono text-amber-400">{sunAngle}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={sunAngle}
                onChange={(e) => setSunAngle(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Selected Unit Info Drawer */}
        {selectedUnit && (
          <div className="absolute top-4 right-4 w-72 bg-slate-900/95 border border-cyan-500/40 p-4 rounded-xl backdrop-blur-md shadow-2xl z-10 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5 mb-3">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  UNIT TELEMETRY
                </span>
                <h4 className="text-base font-extrabold text-white mt-1">Unit {selectedUnit.unitNumber}</h4>
              </div>
              <button
                onClick={() => setSelectedUnit(null)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-slate-400">Unit Type:</span>
                <p className="font-semibold text-white">{selectedUnit.type.replace(/_/g, ' ')}</p>
              </div>

              <div>
                <span className="text-slate-400">Carpet Area:</span>
                <p className="font-mono text-cyan-300 font-bold">
                  {selectedUnit.carpetAreaSqFt.toLocaleString()} sq ft ({selectedUnit.builtUpAreaSqFt.toLocaleString()} sq ft Built-up)
                </p>
              </div>

              <div>
                <span className="text-slate-400">Verified Owner:</span>
                <p className="font-semibold text-white">{selectedUnit.ownerName}</p>
                <span className="text-[10px] text-slate-400 font-mono">KYC: {selectedUnit.ownerAadhaarMasked}</span>
              </div>

              <div>
                <span className="text-slate-400">Verification Status:</span>
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    Verified Cadastre Record
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px]">
                <span className="text-slate-400">Tax Assessment:</span>
                <span className="font-mono text-slate-200">{selectedUnit.taxAssessmentNo}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
