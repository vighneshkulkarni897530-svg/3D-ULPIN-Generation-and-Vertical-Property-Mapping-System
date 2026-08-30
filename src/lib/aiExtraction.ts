/**
 * AI-Assisted Spatial Feature Extraction — Demo Engine
 * =====================================================
 * Deterministic, simulated AI-assisted extraction used by the Phase 6
 * prototype page. ANY "AI" result here is a browser-side simulation:
 *
 *   - There is NO external AI/ML model, drone photogrammetry, LiDAR or GNSS.
 *   - The same demo input image name always produces the same metrics
 *     (results are seeded by a hash of the file name).
 *   - Every result is explicitly labelled `isPrototype: true` and must never
 *     be presented as an official survey or a legally valid cadastral record.
 *
 * The engine reuses the centralized demo GIS registry for its footprint
 * anchor point so the "Open in GIS Map" overlay lands next to real demo
 * geometry without mutating any property/building/parcel record.
 */
import type { Geometry } from '@/types/gis';
import { MOCK_BUILDINGS } from '@/data/buildings';

// ── Public types ────────────────────────────────────────────────────────────

export type ExtractionSourceType = 'BUILDING' | 'DRONE' | 'SITE';
export type ExtractionProcessingPhase = 'idle' | 'selected' | 'processing' | 'completed' | 'failed';

export interface AiImageSelection {
  name: string;
  type: string;
  size: number;
  previewUrl: string;
}

export interface ExtractionResult {
  id: string;
  sourceImageName: string;
  sourceType: ExtractionSourceType;
  createdAt: string;
  processingStatus: 'completed';
  isPrototype: true;
  buildingDetected: boolean;
  detectionConfidence: number;
  boundaryDetected: boolean;
  boundaryConfidence: number;
  estimatedFloors: number;
  estimatedHeightMeters: number;
  estimatedFootprintAreaSqm: number;
  verticalUnitsEstimate: number;
  reconstructionConfidence: number;
  qualityScore: number;
  imageQuality: 'Good' | 'Moderate' | 'Low';
  orientationDeg: number;
  extractedFootprint: Geometry;
  centroid: { lat: number; lng: number };
  warnings: string[];
}

// ── Constants ───────────────────────────────────────────────────────────────

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_IMAGE_SIZE_BYTES = 12 * 1024 * 1024;

export const PROCESSING_STEPS = [
  'Preparing Image',
  'Analyzing Visual Features',
  'Detecting Building Structure',
  'Extracting Prototype Boundary',
  'Estimating Vertical Levels',
  'Generating 3D Preview',
  'Analysis Complete',
] as const;

const SESSION_PREFIX = 'spv_extraction_';

// ── Small utilities ─────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function hashString(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function classifySourceType(name: string): ExtractionSourceType {
  const lower = name.toLowerCase();
  if (lower.includes('drone') || lower.includes('aerial') || lower.includes('lidar')) return 'DRONE';
  if (lower.includes('site') || lower.includes('location') || lower.includes('plot')) return 'SITE';
  return 'BUILDING';
}

// ── Footprint geometry builder ──────────────────────────────────────────────

export function buildRotatedRectRing(
  center: { lat: number; lng: number },
  areaSqm: number,
  angleDeg: number,
): Geometry {
  const halfSide = Math.sqrt(Math.max(areaSqm, 60)) / 2;
  const theta = (angleDeg * Math.PI) / 180;
  const mLat = 111_320;
  const mLng = 111_320 * Math.cos((center.lat * Math.PI) / 180);

  const corners: Array<[number, number]> = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
    [-1, -1],
  ].map(([sx, sz]) => {
    const east = sx * halfSide;
    const north = sz * halfSide;
    const rotatedEast = east * Math.cos(theta) - north * Math.sin(theta);
    const rotatedNorth = east * Math.sin(theta) + north * Math.cos(theta);
    const lat = center.lat + rotatedNorth / mLat;
    const lng = center.lng + rotatedEast / mLng;
    return [lng, lat] as [number, number];
  });

  return { type: 'Polygon', coordinates: [corners] };
}

// ── Deterministic simulated extraction ──────────────────────────────────────

export function runSimulatedExtraction(imageName: string, sourceType: ExtractionSourceType): ExtractionResult {
  const rnd = seeded(hashString(imageName.toLowerCase().trim() + `::${sourceType}`));
  const anchor = MOCK_BUILDINGS.find((b) => b.id === 'B-306') ?? MOCK_BUILDINGS[0];

  const detectionConfidence = 91 + Math.floor(rnd() * 7);
  const boundaryConfidence = 84 + Math.floor(rnd() * 12);
  const estimatedFloors = 2 + Math.floor(rnd() * 6);
  const estimatedHeightMeters = Math.round(estimatedFloors * 3.2 * 10) / 10;
  const estimatedFootprintAreaSqm = 700 + Math.floor(rnd() * 600);
  const orientationDeg = [0, 15, 30, 45][Math.floor(rnd() * 4)];
  const verticalUnitsEstimate = estimatedFloors * (2 + Math.floor(rnd() * 3));
  const reconstructionConfidence = Math.round(detectionConfidence * 0.6 + boundaryConfidence * 0.4);
  const buildingDetected = detectionConfidence >= 70;
  const boundaryDetected = boundaryConfidence >= 70;

  const baseQuality = sourceType === 'DRONE' ? 0 : sourceType === 'BUILDING' ? -4 : -9;
  const qualityScore = Math.max(58, Math.min(97, 88 + baseQuality + Math.floor(rnd() * 10)));
  const imageQuality: ExtractionResult['imageQuality'] =
    qualityScore >= 85 ? 'Good' : qualityScore >= 70 ? 'Moderate' : 'Low';

  const warnings: string[] = [];
  if (qualityScore < 70) warnings.push('Low image resolution — boundary confidence reduced.');
  if (sourceType === 'SITE') warnings.push('Site photo may occlude the roofline — vertical levels approximated.');
  if (estimatedFloors >= 6) warnings.push('Tall structure detected — floor estimate is a prototype approximation.');
  if (!boundaryDetected) warnings.push('Boundary could not be confidently traced — footprint fallback applied.');
  if (warnings.length === 0) warnings.push('No significant issues during prototype analysis.');

  const centroid = {
    lat: anchor.latitude + (rnd() - 0.5) * 0.0016,
    lng: anchor.longitude + (rnd() - 0.5) * 0.0016,
  };

  return {
    id: `EXTR-${Date.now().toString(36).toUpperCase()}`,
    sourceImageName: imageName,
    sourceType,
    createdAt: new Date().toISOString(),
    processingStatus: 'completed',
    isPrototype: true,
    buildingDetected,
    detectionConfidence,
    boundaryDetected,
    boundaryConfidence,
    estimatedFloors,
    estimatedHeightMeters,
    estimatedFootprintAreaSqm,
    verticalUnitsEstimate,
    reconstructionConfidence,
    qualityScore,
    imageQuality,
    orientationDeg,
    extractedFootprint: buildRotatedRectRing(centroid, estimatedFootprintAreaSqm, orientationDeg),
    centroid,
    warnings,
  };
}

// ── Browser-session result transport (GIS map deep link) ────────────────────

export function saveExtractionToSession(result: ExtractionResult): void {
  try {
    sessionStorage.setItem(`${SESSION_PREFIX}${result.id}`, JSON.stringify(result));
  } catch {
    // Storage full/blocked — prototype simply won't deep-link.
  }
}

export function loadExtractionFromSession(id: string): ExtractionResult | null {
  try {
    const raw = sessionStorage.getItem(`${SESSION_PREFIX}${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExtractionResult;
    if (!parsed.id || !parsed.extractedFootprint || parsed.isPrototype !== true) return null;
    return parsed;
  } catch {
    return null;
  }
}
