"use client";

import * as THREE from "three";

/**
 * Phase 15A/15B — shared township scene assets.
 * Module-level singletons: shared geometries, shared materials and shape
 * helpers reused by every township component (keeps draw calls and GPU
 * memory flat regardless of object counts). Pure three.js — no React.
 */

/** One unit box reused (scaled) by every rectangular element in the scene. */
export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

/** Flat ground disc reused by every ground-level circle (instanced). */
export const UNIT_DISC = new THREE.CircleGeometry(1, 20);

export function std(color: number, roughness = 0.85, metalness = 0.02, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}

/** Shared materials — one instance per surface type. */
export const M = {
  bodyWarm: std(0xe8e3d9, 0.9),
  bodyCool: std(0xd5dbde, 0.9),
  bodySand: std(0xd9cdb8, 0.9),
  bodyGrey: std(0xc4cbd1, 0.9),
  glass: std(0x33505e, 0.28, 0.5),
  glassDark: std(0x243947, 0.32, 0.5),
  slab: std(0xb3ac9e, 0.9),
  roof: std(0x857d6f, 0.95),
  lobby: std(0x2e4756, 0.3, 0.45),
  fin: std(0xe0dace, 0.88),
  ground: std(0x4c6b3c, 1),
  groundEdge: std(0x7c6e52, 1),
  context: std(0x3e5a34, 1),
  lawn: std(0x5d8a46, 1),
  lawnAlt: std(0x54803f, 1),
  meadow: std(0x6b9852, 1),
  road: std(0x3b4046, 0.95),
  sidewalk: std(0xa19c8f, 0.95),
  parking: std(0x4b5056, 0.95),
  bay: std(0xe8e8e4, 0.9),
  plaza: std(0xc9c2b4, 0.9),
  plazaRing: std(0xb2ab9c, 0.9),
  water: std(0x2f6e8c, 0.12, 0.6),
  pondEdge: std(0xc9bfa8, 0.95),
  amenityBody: std(0xe6dfd2, 0.88),
  amenityGlass: std(0x3a5d6e, 0.25, 0.5),
  amenityRoof: std(0x9a9284, 0.95),
  trunk: std(0x6b4e34, 0.95),
  shrub: std(0x57823f, 0.95),
  post: std(0x8fa0ac, 0.6, 0.4),
  pad: std(0xb7b1a4, 0.95),
  pillar: std(0xd9d2c4, 0.85),
  /* ---- Phase 15B landscape materials ---- */
  pathA: std(0xcabfa4, 0.95),
  pathB: std(0xd3c9ae, 0.95),
  curb: std(0xb9b3a6, 0.9),
  marking: std(0xe6e8e0, 0.7),
  pole: std(0x5a636d, 0.55, 0.55),
  lampHead: std(0xf2ecd9, 0.4),
  benchWood: std(0x8a6844, 0.9),
  benchMetal: std(0x39424b, 0.6, 0.5),
  signRed: std(0xb03a2e, 0.6),
  signNavy: std(0x0a1b31, 0.7),
  soil: std(0x6f5136, 1),
  hedge: std(0x4a7038, 0.95),
    /** White bases — actual colours arrive per-instance (canopies/flowers/cars). */
  canopyWhite: std(0xffffff, 0.95),
  flowerWhite: std(0xffffff, 0.8),
  carBody: std(0xffffff, 0.45, 0.55),
  shimmer: new THREE.MeshBasicMaterial({ color: 0xdfeef5, transparent: true, opacity: 0.06, depthWrite: false }),
  /** Phase 15B: subtle animated water surface (blue-green, low reflectivity). */
  waterAnim: std(0x2f6e8c, 0.1, 0.55, { transparent: true, opacity: 0.82, envMapIntensity: 0.3 }),
  /** Phase 15B: garden light posts / planters / entrance markers. */
  gardenLight: std(0xd4c6a9, 0.6, 0.4),
  lightGlobe: std(0xf2e9d6, 0.3, 0.6),
  planter: std(0x3a3228, 0.92),
  planterSoil: std(0x6f5136, 1),
  signPost: std(0x5a636d, 0.6, 0.5),
} as const;

/* ------------------------------ Shape helpers ----------------------------- */

/** Rounded-rectangle outline points (clockwise, for Line / Shape building). */
export function roundedRectPoints(halfX: number, halfZ: number, radius: number, segments = 14): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const corners: Array<[number, number, number]> = [
    [halfX - radius, halfZ - radius, 0],
    [-(halfX - radius), halfZ - radius, Math.PI / 2],
    [-(halfX - radius), -(halfZ - radius), Math.PI],
    [halfX - radius, -(halfZ - radius), (3 * Math.PI) / 2],
  ];
  corners.forEach(([cx, cz, start]) => {
    for (let i = 0; i <= segments; i += 1) {
      const a = start + (i / segments) * (Math.PI / 2);
      pts.push(new THREE.Vector2(cx + Math.cos(a) * radius, cz + Math.sin(a) * radius));
    }
  });
  return pts;
}

/** Flat ring shape (outer rounded rect minus inner rounded rect). */
export function ringShape(outer: [number, number], inner: [number, number], radius: number): THREE.Shape {
  const shape = new THREE.Shape(roundedRectPoints(outer[0], outer[1], radius + 2, 18));
  const hole = new THREE.Path(roundedRectPoints(inner[0], inner[1], Math.max(4, radius - 6), 18));
  shape.holes.push(hole);
  return shape;
}

/** Thin uniform band between two rounded rects (curbs, belts, loops). */
export function thinRing(outer: [number, number], inner: [number, number], r: number, band: number): THREE.Shape {
  const shape = new THREE.Shape(roundedRectPoints(outer[0], outer[1], r + band, 18));
  shape.holes.push(new THREE.Path(roundedRectPoints(inner[0], inner[1], Math.max(4, r), 18)));
  return shape;
}

/** Irregular organic shape (pond / organic garden) from radii sampled around the circle. */
export function blobShape(radii: number[]): THREE.Shape {
  const pts: THREE.Vector2[] = [];
  const n = radii.length * 6;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const seg = (i / n) * radii.length;
    const i0 = Math.floor(seg) % radii.length;
    const i1 = (i0 + 1) % radii.length;
    const t = seg - Math.floor(seg);
    const smooth = t * t * (3 - 2 * t);
    const r = radii[i0] * (1 - smooth) + radii[i1] * smooth;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  return new THREE.Shape(pts);
}

export function lawnShape(w: number, d: number, r = 10): THREE.Shape {
  return new THREE.Shape(roundedRectPoints(w / 2, d / 2, Math.min(r, w / 2 - 0.5, d / 2 - 0.5), 10));
}
