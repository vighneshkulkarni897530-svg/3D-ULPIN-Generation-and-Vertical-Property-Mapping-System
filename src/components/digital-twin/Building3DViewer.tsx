"use client";

import React, { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import * as THREE from "three";
import { TwinFloor } from "@/data/mockDigitalTwin";
import { cn } from "@/lib/utils";

export type ViewerTool = "select" | "pan" | "rotate";

export interface Building3DViewerHandle {
  zoomBy: (factor: number) => void;
  resetView: () => void;
  getContainer: () => HTMLDivElement | null;
}

export interface Building3DViewerProps {
  floors: TwinFloor[];
  selectedFloorLevel: number;
  onSelectFloor: (level: number) => void;
  tool: ViewerTool;
  className?: string;
}

/* Procedural digital-twin geometry constants */
const FLOOR_H = 3.2;
const GAP = 0.2;
const BUILDING_W = 10;
const BUILDING_D = 10;

/**
 * Holographic 3D building twin — procedural Three.js "digital twin" with
 * neon edges, glowing windows, scan sweep, particles, holographic rings
 * and floor-level raycast selection.
 */
export const Building3DViewer = forwardRef<Building3DViewerHandle, Building3DViewerProps>(
  ({ floors, selectedFloorLevel, onSelectFloor, tool, className }, ref) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const interactRef = useRef<{
      camera: THREE.PerspectiveCamera | null;
      floorObjs: { level: number; box: THREE.Mesh; boxMat: THREE.MeshStandardMaterial; edgeMat: THREE.LineBasicMaterial }[];
      selectedFloorLevel: number;
      target: THREE.Vector3;
      azimuth: number;
      polar: number;
      distance: number;
      animationId: number;
    } | null>(null);

    const selectedRef = useRef(selectedFloorLevel);
    const toolRef = useRef<ViewerTool>(tool);
    const onSelectRef = useRef(onSelectFloor);
    const floorsRef = useRef(floors);
    selectedRef.current = selectedFloorLevel;
    toolRef.current = tool;
    onSelectRef.current = onSelectFloor;
    if (floors.length !== floorsRef.current.length) floorsRef.current = floors;

    useImperativeHandle(ref, () => ({
      zoomBy: (factor: number) => {
        const s = interactRef.current;
        if (!s) return;
        s.distance = Math.min(90, Math.max(26, s.distance / factor));
        applyCameraTransform(s);
      },
      resetView: () => {
        const s = interactRef.current;
        if (!s) return;
        s.azimuth = 0.85;
        s.polar = 1.12;
        s.distance = 56;
        s.target.set(0, 13, 0);
        applyCameraTransform(s);
      },
      getContainer: () => mountRef.current,
    }));

    // Shared orbit-camera positioner, usable from both the imperative handle
    // and the Three.js scene initializer (closure over the scene-local camera).
    const applyCameraTransform = (s: NonNullable<typeof interactRef.current>) => {
      const cam = s.camera;
      if (!cam) return;
      const ct = s.target;
      cam.position.set(
        ct.x + s.distance * Math.sin(s.polar) * Math.sin(s.azimuth),
        ct.y + s.distance * Math.cos(s.polar),
        ct.z + s.distance * Math.sin(s.polar) * Math.cos(s.azimuth)
      );
      cam.lookAt(ct);
    };

    useEffect(() => {
      const mount = mountRef.current;
      if (!mount) return;

      /* ----------------------------- Scene setup ----------------------------- */
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x020b18);
      scene.fog = new THREE.Fog(0x020b18, 60, 160);

      const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 500);
      const state = {
        camera,
        floorObjs: [] as NonNullable<typeof interactRef.current>["floorObjs"],
        selectedFloorLevel,
        target: new THREE.Vector3(0, 13, 0),
        azimuth: 0.85,
        polar: 1.12,
        distance: 56,
        animationId: 0,
      };
      interactRef.current = state;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      while (mount.firstChild) mount.removeChild(mount.firstChild);
      mount.appendChild(renderer.domElement);

      /* ------------------------------- Lighting ------------------------------ */
      scene.add(new THREE.AmbientLight(0x334a66, 0.9));
      const keyLight = new THREE.DirectionalLight(0x66c5ff, 2.4);
      keyLight.position.set(24, 46, 30);
      scene.add(keyLight);
      const cyanFill = new THREE.PointLight(0x00d9ff, 90, 90);
      cyanFill.position.set(0, 30, 22);
      scene.add(cyanFill);
      const purpleAccent = new THREE.PointLight(0x8b5cf6, 50, 120);
      purpleAccent.position.set(-30, 18, -26);
      scene.add(purpleAccent);
      const groundGlow = new THREE.PointLight(0x008cff, 70, 70);
      groundGlow.position.set(0, 2, 0);
      scene.add(groundGlow);

      applyCameraTransform(state);

      /* ------------------------------- Ground --------------------------------- */
      const grid = new THREE.GridHelper(180, 44, 0x00d9ff, 0x0a3552);
      (grid.material as THREE.Material).transparent = true;
      (grid.material as THREE.Material).opacity = 0.28;
      grid.position.y = 0.01;
      scene.add(grid);

      // Soft glowing ground disc (canvas radial gradient sprite)
      const glowCanvas = document.createElement("canvas");
      glowCanvas.width = 256;
      glowCanvas.height = 256;
      const gctx = glowCanvas.getContext("2d");
      if (gctx) {
        const grad = gctx.createRadialGradient(128, 128, 10, 128, 128, 128);
        grad.addColorStop(0, "rgba(0,130,255,0.5)");
        grad.addColorStop(0.5, "rgba(0,140,255,0.12)");
        grad.addColorStop(1, "rgba(0,140,255,0)");
        gctx.fillStyle = grad;
        gctx.fillRect(0, 0, 256, 256);
      }
      const glowTex = new THREE.CanvasTexture(glowCanvas);
      const glowSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      glowSprite.scale.set(95, 95, 1);
      glowSprite.position.y = 0.15;
      scene.add(glowSprite);
// Property boundary outline (cyan neon)
      const boundaryPts = [
        new THREE.Vector3(-21, 0.12, -21),
        new THREE.Vector3(21, 0.12, -21),
        new THREE.Vector3(21, 0.12, 21),
        new THREE.Vector3(-21, 0.12, 21),
      ];
      const boundaryLine = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(boundaryPts),
        new THREE.LineBasicMaterial({ color: 0x00d9ff, transparent: true, opacity: 0.85 })
      );
      scene.add(boundaryLine);
      // corner markers
      const cornerMat = new THREE.MeshBasicMaterial({ color: 0x00d9ff });
      const cornerGeo = new THREE.BoxGeometry(0.5, 1.6, 0.5);
      boundaryPts.forEach((p) => {
        const c = new THREE.Mesh(cornerGeo, cornerMat);
        c.position.copy(p);
        c.position.y = 0.85;
        scene.add(c);
      });

      /* ----------------------- Main building construction ---------------------- */
      const topY = floorsRef.current.length * (FLOOR_H + GAP) - GAP;
      const windowMats: THREE.MeshBasicMaterial[] = [];

      floorsRef.current.forEach((floor, idx) => {
        const y = idx * (FLOOR_H + GAP) + FLOOR_H / 2 + 0.05;
        const boxGeo = new THREE.BoxGeometry(BUILDING_W, FLOOR_H, BUILDING_D);
        const boxMat = new THREE.MeshStandardMaterial({
          color: 0x061426,
          transparent: true,
          opacity: 0.8,
          roughness: 0.45,
          metalness: 0.4,
          emissive: 0x004080,
          emissiveIntensity: 0.25,
        });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.y = y;
        box.userData = { level: floor.level };
        scene.add(box);

        const edgeMat = new THREE.LineBasicMaterial({
          color: 0x00a2c8,
          transparent: true,
          opacity: 0.45,
        });
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), edgeMat);
        edges.position.y = y;
        scene.add(edges);

        // Electric blue windows (3 cols × 2 rows, 4 faces)
        const cols = [-3, 0, 3];
        const rows = [-0.7, 0.7];
        const winGeo = new THREE.PlaneGeometry(1.05, 1.25);
        for (const cx of cols) {
          for (const ry of rows) {
            const mkFace = (dir: number, rotY: number, px: number, pz: number) => {
              const mat = new THREE.MeshBasicMaterial({
                color: (idx + cx + ry) % 3 === 0 ? 0x00d9ff : 0x008cff,
                transparent: true,
                opacity: 0.55,
              });
              const w = new THREE.Mesh(winGeo, mat);
              w.position.set(px, y + ry, pz);
              w.rotation.y = rotY;
              w.userData = { dir };
              scene.add(w);
              windowMats.push(mat);
            };
            mkFace(1, 0, cx, BUILDING_D / 2 + 0.02); // front
            mkFace(2, Math.PI, cx, -BUILDING_D / 2 - 0.02); // back
            mkFace(3, Math.PI / 2, -BUILDING_W / 2 - 0.02, cx); // left
            mkFace(4, -Math.PI / 2, BUILDING_W / 2 + 0.02, cx); // right
          }
        }
        boxGeo.dispose();

        state.floorObjs.push({ level: floor.level, box, boxMat, edgeMat });
      });

      // Roof cap + antenna
      const roofMat = new THREE.MeshStandardMaterial({
        color: 0x0a1b31,
        emissive: 0x00d9ff,
        emissiveIntensity: 0.55,
        metalness: 0.6,
        roughness: 0.3,
      });
      const roof = new THREE.Mesh(new THREE.BoxGeometry(BUILDING_W - 1.2, 0.35, BUILDING_D - 1.2), roofMat);
      roof.position.y = topY + 0.2;
      scene.add(roof);
      const roofEdge = new THREE.LineSegments(
        new THREE.EdgesGeometry(roof.geometry),
        new THREE.LineBasicMaterial({ color: 0x7ce8ff, transparent: true, opacity: 0.9 })
      );
      roofEdge.position.y = topY + 0.2;
      scene.add(roofEdge);

      const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 5, 8),
        new THREE.MeshBasicMaterial({ color: 0x164e73 })
      );
      antenna.position.y = topY + 2.7;
      scene.add(antenna);
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x00d9ff })
      );
      beacon.position.y = topY + 5.3;
      scene.add(beacon);

      /* --------------------------- Holographic rings --------------------------- */
      const ringMats: THREE.MeshBasicMaterial[] = [];
      const ringSpecs = [
        { r: 13, y: topY + 5, o: 0.42, c: 0x00d9ff },
        { r: 17, y: topY + 8, o: 0.26, c: 0x8b5cf6 },
        { r: 21, y: topY + 4, o: 0.18, c: 0x008cff },
      ];
      const rings = ringSpecs.map((spec, i) => {
        const mat = new THREE.MeshBasicMaterial({ color: spec.c, transparent: true, opacity: spec.o });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(spec.r, 0.05, 8, 90), mat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = spec.y;
        ring.userData = { spin: i % 2 === 0 ? 0.0024 : -0.0016 };
        scene.add(ring);
        ringMats.push(mat);
        return ring;
      });
/* ------------------------ Surrounding micro-buildings ------------------------ */
      const rand = (seed: number) => {
        let s = seed;
        return () => {
          s = (s * 16807) % 2147483647;
          return (s - 1) / 2147483646;
        };
      };
      const rng = rand(2026);
      const envGroup = new THREE.Group();
      const envBoxGeo = new THREE.BoxGeometry(1, 1, 1);
      for (let i = 0; i < 10; i++) {
        const angle = rng() * Math.PI * 2;
        const radius = 30 + rng() * 26;
        const h = 5 + rng() * 11;
        const w = 5 + rng() * 6;
        const d = 5 + rng() * 6;
        const envMat = new THREE.MeshStandardMaterial({
          color: 0x071a2e,
          transparent: true,
          opacity: 0.72,
          roughness: 0.7,
          metalness: 0.2,
          emissive: 0x06283d,
          emissiveIntensity: 0.4,
        });
        const envMesh = new THREE.Mesh(envBoxGeo, envMat);
        envMesh.position.set(Math.cos(angle) * radius, h / 2, Math.sin(angle) * radius);
        envMesh.scale.set(w, h, d);
        envGroup.add(envMesh);
        const envEdge = new THREE.LineSegments(
          new THREE.EdgesGeometry(envBoxGeo),
          new THREE.LineBasicMaterial({ color: 0x14507a, transparent: true, opacity: 0.35 })
        );
        envEdge.position.copy(envMesh.position);
        envEdge.scale.copy(envMesh.scale);
        envGroup.add(envEdge);
      }
      scene.add(envGroup);

      /* ----------------------------- Scan sweep disc ---------------------------- */
      const scanDiscMat = new THREE.MeshBasicMaterial({
        color: 0x00d9ff,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const scanDisc = new THREE.Mesh(new THREE.RingGeometry(9, 21, 64), scanDiscMat);
      scanDisc.rotation.x = -Math.PI / 2;
      scanDisc.position.y = 0.5;
      scene.add(scanDisc);
      const scanRingMat = new THREE.MeshBasicMaterial({
        color: 0x7ce8ff,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });
      const scanRing = new THREE.Mesh(new THREE.TorusGeometry(15, 0.045, 8, 80), scanRingMat);
      scanRing.rotation.x = Math.PI / 2;
      scanRing.position.y = 0.5;
      scene.add(scanRing);

      /* ------------------------------ Particles -------------------------------- */
      const particleCount = 420;
      const posArr = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        posArr[i * 3] = (rng() - 0.5) * 70;
        posArr[i * 3 + 1] = rng() * (topY + 6) + 1;
        posArr[i * 3 + 2] = (rng() - 0.5) * 70;
      }
      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
      const particleMat = new THREE.PointsMaterial({
        color: 0x66e0ff,
        size: 0.14,
        transparent: true,
        opacity: 0.5,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);
/* ------------------------ Interaction: pointer events --------------------- */
      const dom = renderer.domElement;
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      let downX = 0;
      let downY = 0;
      let moved = false;
      let lastInteraction = performance.now();
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const cameraUp = new THREE.Vector3();
      const cameraRight = new THREE.Vector3();
      const hoveredLevelRef = { level: -1 };

      const floorMeshes = state.floorObjs.map((o) => o.box);

      const pickFloor = (clientX: number, clientY: number) => {
        const rect = dom.getBoundingClientRect();
        ndc.set(
          ((clientX - rect.left) / rect.width) * 2 - 1,
          -((clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(floorMeshes, false);
        if (hits.length > 0) {
          const level = hits[0].object.userData.level as number;
          onSelectRef.current(level);
        }
      };

      const highlight = (level: number, hovered = false) => {
        state.floorObjs.forEach((o) => {
          const selected = o.level === state.selectedFloorLevel;
          const isHover = hovered && o.level === level;
          o.boxMat.opacity = selected ? 0.98 : 0.72;
          o.boxMat.emissive.setHex(selected ? 0x00d9ff : 0x004080);
          o.boxMat.emissiveIntensity = selected ? 0.55 : 0.2 + (isHover ? 0.35 : 0);
          o.edgeMat.color.setHex(selected ? 0x7ce8ff : isHover ? 0x00d9ff : 0x00a2c8);
          o.edgeMat.opacity = selected ? 0.95 : isHover ? 0.8 : 0.42;
        });
      };

      const onPointerDown = (e: PointerEvent) => {
        dragging = true;
        moved = false;
        lastX = e.clientX;
        lastY = e.clientY;
        downX = e.clientX;
        downY = e.clientY;
        dom.setPointerCapture(e.pointerId);
      };
      const onPointerMove = (e: PointerEvent) => {
        if (!dragging) {
          if (toolRef.current === "select") {
            const rect = dom.getBoundingClientRect();
            ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
            raycaster.setFromCamera(ndc, camera);
            const hits = raycaster.intersectObjects(floorMeshes, false);
            const level = hits.length > 0 ? (hits[0].object.userData.level as number) : -1;
            if (level !== hoveredLevelRef.level) {
              hoveredLevelRef.level = level;
              highlight(level, true);
            }
          }
          return;
        }
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 4) moved = true;
        lastX = e.clientX;
        lastY = e.clientY;
        lastInteraction = performance.now();

        if (toolRef.current === "rotate") {
          state.azimuth -= dx * 0.0055;
          state.polar = Math.min(1.5, Math.max(0.3, state.polar + dy * 0.004));
          applyCameraTransform(state);
        } else if (toolRef.current === "pan") {
          camera.getWorldDirection(cameraUp);
          cameraRight.crossVectors(cameraUp, new THREE.Vector3(0, 1, 0)).normalize();
          cameraUp.set(0, 1, 0);
          const panScale = state.distance * 0.0014;
          state.target.addScaledVector(cameraRight, -dx * panScale);
          state.target.y = Math.max(0, Math.min(40, state.target.y + dy * panScale));
          applyCameraTransform(state);
        }
      };
      const onPointerUp = (e: PointerEvent) => {
        dragging = false;
        if (toolRef.current === "select" && !moved) pickFloor(e.clientX, e.clientY);
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        state.distance = Math.min(95, Math.max(24, state.distance * (1 + e.deltaY * 0.0011)));
        applyCameraTransform(state);
        lastInteraction = performance.now();
      };
      const onDblClick = () => {
        state.azimuth = 0.85;
        state.polar = 1.12;
        state.distance = 56;
        state.target.set(0, 13, 0);
        applyCameraTransform(state);
      };

      dom.addEventListener("pointerdown", onPointerDown);
      dom.addEventListener("pointermove", onPointerMove);
      dom.addEventListener("pointerup", onPointerUp);
      dom.addEventListener("pointercancel", onPointerUp);
      dom.addEventListener("wheel", onWheel, { passive: false });
      dom.addEventListener("dblclick", onDblClick);
/* --------------------------- Render & animation loop -------------------------- */
      const clock = new THREE.Clock();
      const animate = () => {
        const t = clock.getElapsedTime();
        state.animationId = requestAnimationFrame(animate);

        // gentle auto-rotate when idle
        if (!dragging && performance.now() - lastInteraction > 3500) {
          state.azimuth += 0.0012;
          applyCameraTransform(state);
        }

        // selected floor pulse
        state.floorObjs.forEach((o) => {
          if (o.level === state.selectedFloorLevel) {
            o.boxMat.emissiveIntensity = 0.45 + 0.3 * Math.sin(t * 3.2);
          }
        });

        // window flicker (subset)
        for (let i = 0; i < windowMats.length; i += 9) {
          const m = windowMats[i];
          m.opacity = 0.45 + 0.3 * Math.abs(Math.sin(t * 1.7 + i * 0.3));
        }

        // scan sweep
        const scanY = 1 + ((t * 3.2) % 1) * topY;
        scanDisc.position.y = scanY;
        scanRing.position.y = scanY;
        scanDiscMat.opacity = 0.07 + 0.05 * Math.sin(t * 6);
        scanRingMat.opacity = 0.55 + 0.35 * Math.sin(t * 5);

        // rings
        rings.forEach((ring) => {
          ring.rotation.z += (ring.userData.spin as number) * 1.6;
        });
        ringMats.forEach((m, i) => {
          m.opacity = [0.42, 0.26, 0.18][i] * (0.75 + 0.25 * Math.sin(t * 1.2 + i));
        });

        // particles drift upward
        const posAttr = particleGeo.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < particleCount; i++) {
          let y = posAttr.getY(i) + 0.02;
          if (y > topY + 7) y = 0.5;
          posAttr.setY(i, y);
          posAttr.setX(i, posAttr.getX(i) + Math.sin(t * 0.3 + i) * 0.0022);
        }
        posAttr.needsUpdate = true;

        // beacon pulse
        const pulse = 1 + 0.3 * Math.sin(t * 4);
        beacon.scale.setScalar(pulse);

        renderer.render(scene, camera);
      };
      animate();

      // selection sync from parent
      const onSelectionChange = (level: number) => {
        state.selectedFloorLevel = level;
        highlight(level, false);
      };
      onSelectionChange(selectedFloorLevel);

      /* ------------------------------ Resize handling -------------------------- */
      const resizeObserver = new ResizeObserver(() => {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        if (w === 0 || h === 0) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      });
      resizeObserver.observe(mount);

      /* --------------------------------- Cleanup -------------------------------- */
      return () => {
        cancelAnimationFrame(state.animationId);
        resizeObserver.disconnect();
        dom.removeEventListener("pointerdown", onPointerDown);
        dom.removeEventListener("pointermove", onPointerMove);
        dom.removeEventListener("pointerup", onPointerUp);
        dom.removeEventListener("pointercancel", onPointerUp);
        dom.removeEventListener("wheel", onWheel);
        dom.removeEventListener("dblclick", onDblClick);
        scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else if (mat) mat.dispose();
        });
        renderer.dispose();
        if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
        interactRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [floors.length]);

    // when selection changes via UI (FloorExplorer), pull into scene
    useEffect(() => {
      const s = interactRef.current;
      if (!s) return;
      s.selectedFloorLevel = selectedFloorLevel;
      s.floorObjs.forEach((o) => {
        const selected = o.level === selectedFloorLevel;
        o.boxMat.opacity = selected ? 0.98 : 0.72;
        o.boxMat.emissive.setHex(selected ? 0x00d9ff : 0x004080);
        o.boxMat.emissiveIntensity = selected ? 0.55 : 0.2;
        o.edgeMat.color.setHex(selected ? 0x7ce8ff : 0x00a2c8);
        o.edgeMat.opacity = selected ? 0.95 : 0.42;
      });
    }, [selectedFloorLevel]);

    return (
      <div
        ref={mountRef}
        className={cn(
          "relative h-[52vh] min-h-[380px] w-full overflow-hidden bg-[#020B18] sm:h-[62vh] lg:h-[68vh]",
          className
        )}
        aria-label="Interactive 3D building digital twin"
      />
    );
  }
);
Building3DViewer.displayName = "Building3DViewer";