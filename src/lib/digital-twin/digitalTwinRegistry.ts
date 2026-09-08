/**
 * Centralized Society Digital Twin Registry & Store
 * ==================================================
 * Provides society-specific 3D scene configurations with strict isolation.
 * Every society possesses its own layout (buildings, roads, parks, parking,
 * water bodies, and amenities).
 *
 * CRITICAL RULE:
 * Unconfigured societies NEVER fall back to Life Republic.
 */

import type {
  SocietyDigitalTwin,
  SocietyBuilding3DDef,
  SocietyRoadDef,
  SocietyParkDef,
  SocietyParkingDef,
  SocietyAmenityDef,
  SocietyWaterBodyDef,
  SocietyEntranceDef,
  SocietyTreeDef,
} from '@/types/digitalTwin';

// ── 1. Kolte Patil Life Republic Penthouses (PARCEL-MH-PUN-074 / life-republic) ──
export const LIFE_REPUBLIC_DIGITAL_TWIN: SocietyDigitalTwin = {
  societyId: 'PARCEL-MH-PUN-074',
  societyName: 'Kolte Patil Life Republic Penthouses',
  sourceImage: '/brand/kolte-patil-banner.jpg',
  sourceImageType: 'MASTER_PLAN',
  generationStatus: 'GENERATED',
  generatedAt: '2024-01-10T00:00:00.000Z',
  confidence: 0.96,
  analysisNotes: 'Official master plan site layout — 5 residential towers with central lake and pavilion.',
  isAiAnalyzed: false,
  siteDimensions: {
    widthMeters: 352,
    depthMeters: 292,
  },
  siteBoundary: {
    half: [176, 146],
    radius: 40,
    y: 0.3,
  },
  buildings: [
    {
      id: 'B-LR-B',
      name: 'Tower B',
      code: 'BLDG-LR-B',
      position: [18, 72],
      rotation: -0.05,
      floors: 20,
      floorHeight: 3.1,
      footprint: [24, 16],
      heightMeters: 62.0,
      type: 'B',
      typeLabel: 'Tower Type B — Wide Slab',
      status: 'VERIFIED',
      dataStatus: 'verified',
      propertyIds: ['PROP-LR-B-0402'],
      totalUnits: 80,
    },
    {
      id: 'B-LR-A',
      name: 'Tower A',
      code: 'BLDG-LR-A',
      position: [-104, -94],
      rotation: 0.05,
      floors: 24,
      floorHeight: 3.1,
      footprint: [20, 16],
      heightMeters: 74.4,
      type: 'A',
      typeLabel: 'Tower Type A — Tall Slab',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 96,
    },
    {
      id: 'B-LR-C',
      name: 'Tower C',
      code: 'BLDG-LR-C',
      position: [68, -114],
      rotation: -0.05,
      floors: 22,
      floorHeight: 3.1,
      footprint: [28, 16],
      heightMeters: 68.2,
      type: 'C',
      typeLabel: 'Tower Type C — Twin Offset',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 88,
    },
    {
      id: 'B-LR-D',
      name: 'Tower D',
      code: 'BLDG-LR-D',
      position: [-72, 8],
      rotation: -0.1,
      floors: 18,
      floorHeight: 3.1,
      footprint: [22, 16],
      heightMeters: 55.8,
      type: 'D',
      typeLabel: 'Tower Type D — Mid-Rise',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 72,
    },
    {
      id: 'B-LR-E',
      name: 'Tower E',
      code: 'BLDG-LR-E',
      position: [10, -122],
      rotation: 0.0,
      floors: 23,
      floorHeight: 3.1,
      footprint: [20, 16],
      heightMeters: 71.3,
      type: 'A',
      typeLabel: 'Tower Type A — Skyline Tower',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 92,
    },
  ],
  roads: {
    ringRoad: {
      outerHalf: [166, 137],
      innerHalf: [156, 127],
      radius: 30,
    },
    segments: [
      { id: 'rd-1', position: [0, 76], size: [9, 112] },
      { id: 'rd-2', position: [0, -12], size: [9, 58] },
      { id: 'rd-3', position: [0, 58], size: [309, 9] },
      { id: 'rd-4', position: [0, -40], size: [309, 9] },
      { id: 'rd-5', position: [96, 9], size: [9, 98] },
      { id: 'rd-6', position: [-96, 9], size: [9, 98] },
      { id: 'rd-7', position: [-132, -29], size: [9, 22] },
      { id: 'rd-8', position: [132, -29], size: [9, 22] },
      { id: 'rd-9', position: [0, 137.5], size: [9, 11] },
    ],
    sidewalks: [
      { id: 'sw-1', position: [-6.5, 76], size: [2.4, 112] },
      { id: 'sw-2', position: [6.5, 76], size: [2.4, 112] },
      { id: 'sw-3', position: [-6.5, -12], size: [2.4, 58] },
      { id: 'sw-4', position: [6.5, -12], size: [2.4, 58] },
    ],
    widths: { primary: 9, secondary: 9, local: 9, path: 2.4 },
  },
  parks: [
    { id: 'park-north', name: 'North Landscape Park', position: [0, -102], size: [210, 52], shape: 'rounded-rect' },
    { id: 'park-south', name: 'South Garden Lawn', position: [-20, 98], size: [170, 46], shape: 'rounded-rect' },
    { id: 'park-east', name: 'East Meadow Pocket', position: [128, 24], size: [54, 66], shape: 'rounded-rect' },
    { id: 'park-west', name: 'West Garden Pocket', position: [-130, 20], size: [42, 60], shape: 'rounded-rect' },
    { id: 'park-central', name: 'Central Meadow', position: [0, 22], size: [64, 40], shape: 'circle', radius: 32 },
  ],
  parkingAreas: [
    { id: 'pk-ne', name: 'Northeast Parking Bay', position: [130, 96], size: [52, 30], baysPerRow: 16 },
    { id: 'pk-sw', name: 'Southwest Parking Bay', position: [-126, 88], size: [52, 30], baysPerRow: 16 },
    { id: 'pk-nw', name: 'Northwest Parking Bay', position: [-132, -78], size: [44, 28], baysPerRow: 13 },
  ],
  amenities: [
    {
      id: 'amenity-pavilion',
      name: 'Life Republic Central Glass Pavilion',
      type: 'PAVILION',
      position: [-16, -46],
      size: [36, 7.5, 20],
      radius: 24,
      glassRoof: true,
    },
  ],
  waterBodies: [
    {
      id: 'water-lake',
      name: 'Central Organic Lake',
      type: 'LAKE',
      position: [36, 16],
      radii: [22, 28, 25, 32, 28, 22, 26, 23],
      shape: 'organic',
    },
  ],
  entrances: [
    {
      id: 'ent-main',
      name: 'Life Republic Main Grand Gate',
      position: [-56, 138],
      width: 28,
      height: 7.5,
      hasSecurityBooth: true,
      hasSignage: true,
    },
  ],
  trees: [
    { x: -50, z: -80, kind: 'canopy', scale: 1.1 },
    { x: -30, z: -70, kind: 'broad', scale: 1.0 },
    { x: 30, z: -80, kind: 'palm', scale: 1.2 },
    { x: 50, z: -70, kind: 'canopy', scale: 1.0 },
    { x: -80, z: 30, kind: 'broad', scale: 0.9 },
    { x: 80, z: 40, kind: 'palm', scale: 1.1 },
    { x: -20, z: 110, kind: 'ornamental', scale: 1.0 },
    { x: 20, z: 110, kind: 'ornamental', scale: 1.0 },
    { x: 0, z: -110, kind: 'canopy', scale: 1.3 },
    { x: -110, z: -40, kind: 'broad', scale: 1.0 },
    { x: 110, z: -40, kind: 'palm', scale: 1.1 },
  ],
};

// ── 2. Society A — Green View Residency (PARCEL-MH-PUN-001 / B-102) ─────────────
// Requirements: 3 buildings, 1 park, 1 parking area, 1 clubhouse, 0 pools
export const SOCIETY_A_DIGITAL_TWIN: SocietyDigitalTwin = {
  societyId: 'PARCEL-MH-PUN-001',
  societyName: 'Green View Residency',
  sourceImage: '/assets/societies/green-view-siteplan.jpg',
  sourceImageType: 'ARCHITECTURAL_LAYOUT',
  generationStatus: 'GENERATED',
  generatedAt: '2024-02-15T00:00:00.000Z',
  confidence: 0.93,
  analysisNotes: 'Verified site plan — 3 residential blocks arranged around central community lawn with clubhouse.',
  isAiAnalyzed: false,
  siteDimensions: {
    widthMeters: 180,
    depthMeters: 160,
  },
  siteBoundary: {
    half: [90, 80],
    radius: 18,
    y: 0.3,
  },
  buildings: [
    {
      id: 'B-102',
      name: 'Green View · Wing A',
      code: 'BLDG-MH-PUN-102-A',
      position: [-42, -28],
      rotation: 0.08,
      floors: 5,
      floorHeight: 3.2,
      footprint: [26, 16],
      heightMeters: 18.0,
      type: 'A',
      typeLabel: 'Residential Block A',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 20,
    },
    {
      id: 'B-102-W2',
      name: 'Green View · Wing B',
      code: 'BLDG-MH-PUN-102-B',
      position: [42, -28],
      rotation: -0.08,
      floors: 5,
      floorHeight: 3.2,
      footprint: [26, 16],
      heightMeters: 18.0,
      type: 'B',
      typeLabel: 'Residential Block B',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 20,
    },
    {
      id: 'B-102-W3',
      name: 'Green View · Wing C',
      code: 'BLDG-MH-PUN-102-C',
      position: [0, 44],
      rotation: 0.0,
      floors: 5,
      floorHeight: 3.2,
      footprint: [30, 16],
      heightMeters: 18.0,
      type: 'C',
      typeLabel: 'Residential Block C',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 24,
    },
  ],
  roads: {
    segments: [
      { id: 'gv-rd-spine', position: [0, 0], size: [8, 120] },
      { id: 'gv-rd-cross-north', position: [0, -48], size: [140, 8] },
      { id: 'gv-rd-cross-south', position: [0, 24], size: [140, 8] },
    ],
    sidewalks: [
      { id: 'gv-sw-1', position: [-5, 0], size: [2, 120] },
      { id: 'gv-sw-2', position: [5, 0], size: [2, 120] },
    ],
    widths: { primary: 8, secondary: 8, local: 6, path: 2 },
  },
  parks: [
    {
      id: 'gv-park-central',
      name: 'Green View Central Garden',
      position: [0, -12],
      size: [60, 36],
      shape: 'rounded-rect',
      hasBenches: true,
      hasTrees: true,
    },
  ],
  parkingAreas: [
    {
      id: 'gv-parking-main',
      name: 'Resident Parking Area',
      position: [0, 68],
      size: [56, 18],
      baysPerRow: 12,
    },
  ],
  amenities: [
    {
      id: 'gv-clubhouse',
      name: 'Green View Community Hall',
      type: 'CLUBHOUSE',
      position: [-56, 42],
      size: [22, 5.5, 14],
      glassRoof: false,
    },
  ],
  waterBodies: [], // 0 pools / lakes as specified
  entrances: [
    {
      id: 'gv-gate',
      name: 'Green View Main Entrance Gate',
      position: [0, 78],
      width: 16,
      height: 5.5,
      hasSecurityBooth: true,
      hasSignage: true,
    },
  ],
  trees: [
    { x: -25, z: -12, kind: 'canopy', scale: 1.0 },
    { x: 25, z: -12, kind: 'canopy', scale: 1.0 },
    { x: -65, z: -28, kind: 'broad', scale: 1.1 },
    { x: 65, z: -28, kind: 'broad', scale: 1.1 },
    { x: -30, z: 44, kind: 'ornamental', scale: 0.9 },
    { x: 30, z: 44, kind: 'ornamental', scale: 0.9 },
    { x: -70, z: 0, kind: 'palm', scale: 1.0 },
    { x: 70, z: 0, kind: 'palm', scale: 1.0 },
  ],
};

// ── 3. Society B — Shree Krishna Arcade (PARCEL-MH-PUN-002 / B-104) ─────────────
// Requirements: 5 buildings, 2 parks, 2 parking areas, 1 pool, 1 clubhouse
export const SOCIETY_B_DIGITAL_TWIN: SocietyDigitalTwin = {
  societyId: 'PARCEL-MH-PUN-002',
  societyName: 'Shree Krishna Arcade',
  sourceImage: '/assets/societies/shree-krishna-siteplan.jpg',
  sourceImageType: 'SATELLITE_AERIAL',
  generationStatus: 'GENERATED',
  generatedAt: '2024-03-01T00:00:00.000Z',
  confidence: 0.91,
  analysisNotes: 'Satellite-verified 5-wing residential campus with dual garden plazas, swimming pool and recreation hub.',
  isAiAnalyzed: false,
  siteDimensions: {
    widthMeters: 240,
    depthMeters: 210,
  },
  siteBoundary: {
    half: [120, 105],
    radius: 25,
    y: 0.3,
  },
  buildings: [
    {
      id: 'B-104',
      name: 'Shree Krishna · Wing 1',
      code: 'BLDG-MH-PUN-104-W1',
      position: [-64, -52],
      rotation: 0.12,
      floors: 5,
      floorHeight: 3.2,
      footprint: [24, 15],
      heightMeters: 16.0,
      type: 'A',
      typeLabel: 'Arcade Wing 1',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 20,
    },
    {
      id: 'B-104-W2',
      name: 'Shree Krishna · Wing 2',
      code: 'BLDG-MH-PUN-104-W2',
      position: [0, -62],
      rotation: 0.0,
      floors: 5,
      floorHeight: 3.2,
      footprint: [28, 15],
      heightMeters: 16.0,
      type: 'B',
      typeLabel: 'Arcade Wing 2 (Central)',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 24,
    },
    {
      id: 'B-104-W3',
      name: 'Shree Krishna · Wing 3',
      code: 'BLDG-MH-PUN-104-W3',
      position: [64, -52],
      rotation: -0.12,
      floors: 5,
      floorHeight: 3.2,
      footprint: [24, 15],
      heightMeters: 16.0,
      type: 'A',
      typeLabel: 'Arcade Wing 3',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 20,
    },
    {
      id: 'B-104-W4',
      name: 'Shree Krishna · Wing 4',
      code: 'BLDG-MH-PUN-104-W4',
      position: [-60, 42],
      rotation: -0.05,
      floors: 5,
      floorHeight: 3.2,
      footprint: [24, 15],
      heightMeters: 16.0,
      type: 'D',
      typeLabel: 'Arcade Wing 4 (Southwest)',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 20,
    },
    {
      id: 'B-104-W5',
      name: 'Shree Krishna · Wing 5',
      code: 'BLDG-MH-PUN-104-W5',
      position: [60, 42],
      rotation: 0.05,
      floors: 5,
      floorHeight: 3.2,
      footprint: [24, 15],
      heightMeters: 16.0,
      type: 'D',
      typeLabel: 'Arcade Wing 5 (Southeast)',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 20,
    },
  ],
  roads: {
    ringRoad: {
      outerHalf: [110, 95],
      innerHalf: [102, 87],
      radius: 20,
    },
    segments: [
      { id: 'sk-rd-1', position: [0, 0], size: [8, 170] },
      { id: 'sk-rd-2', position: [0, -15], size: [190, 8] },
      { id: 'sk-rd-3', position: [0, 72], size: [8, 26] },
    ],
    widths: { primary: 8, secondary: 8, local: 6, path: 2 },
  },
  parks: [
    {
      id: 'sk-park-east',
      name: 'East Promenade Garden',
      position: [55, 0],
      size: [48, 32],
      shape: 'rounded-rect',
      hasBenches: true,
      hasTrees: true,
    },
    {
      id: 'sk-park-west',
      name: 'West Children Play Park',
      position: [-55, 0],
      size: [48, 32],
      shape: 'rounded-rect',
      hasBenches: true,
      hasTrees: true,
    },
  ],
  parkingAreas: [
    {
      id: 'sk-pk-north',
      name: 'North Surface Parking',
      position: [-82, -78],
      size: [36, 20],
      baysPerRow: 14,
    },
    {
      id: 'sk-pk-south',
      name: 'South Surface Parking',
      position: [82, -78],
      size: [36, 20],
      baysPerRow: 14,
    },
  ],
  amenities: [
    {
      id: 'sk-clubhouse',
      name: 'Krishna Club & Community Center',
      type: 'CLUBHOUSE',
      position: [0, 15],
      size: [24, 6.0, 16],
      glassRoof: true,
    },
  ],
  waterBodies: [
    {
      id: 'sk-pool',
      name: 'Infinity Swimming Pool',
      type: 'SWIMMING_POOL',
      position: [0, 46],
      size: [28, 14],
      shape: 'rectangle',
    },
  ],
  entrances: [
    {
      id: 'sk-entrance',
      name: 'Shree Krishna Arcade Main Arch',
      position: [0, 95],
      width: 20,
      height: 6.5,
      hasSecurityBooth: true,
      hasSignage: true,
    },
  ],
  trees: [
    { x: -55, z: 0, kind: 'canopy', scale: 1.1 },
    { x: 55, z: 0, kind: 'canopy', scale: 1.1 },
    { x: -20, z: 46, kind: 'palm', scale: 1.2 },
    { x: 20, z: 46, kind: 'palm', scale: 1.2 },
    { x: -90, z: -20, kind: 'broad', scale: 1.0 },
    { x: 90, z: -20, kind: 'broad', scale: 1.0 },
    { x: -90, z: 20, kind: 'ornamental', scale: 0.9 },
    { x: 90, z: 20, kind: 'ornamental', scale: 0.9 },
  ],
};

// ── 4. Society C — Tech Tower (PARCEL-MH-PUN-003 / B-306) ────────────────────────
// Requirements: 2 buildings, 0 parks, 1 parking area, 0 clubhouse, 0 pool
export const SOCIETY_C_DIGITAL_TWIN: SocietyDigitalTwin = {
  societyId: 'PARCEL-MH-PUN-003',
  societyName: 'Tech Tower',
  sourceImage: '/assets/societies/tech-tower-siteplan.jpg',
  sourceImageType: 'SITE_PHOTO',
  generationStatus: 'GENERATED',
  generatedAt: '2024-03-05T00:00:00.000Z',
  confidence: 0.95,
  analysisNotes: 'Commercial IT tech park comprising dual mid-rise office towers with dedicated multi-bay logistics parking.',
  isAiAnalyzed: false,
  siteDimensions: {
    widthMeters: 160,
    depthMeters: 140,
  },
  siteBoundary: {
    half: [80, 70],
    radius: 12,
    y: 0.3,
  },
  buildings: [
    {
      id: 'B-306',
      name: 'Tech Tower · Alpha Block',
      code: 'BLDG-MH-PUN-306-A',
      position: [-30, -18],
      rotation: 0.0,
      floors: 5,
      floorHeight: 4.0,
      footprint: [28, 20],
      heightMeters: 20.0,
      type: 'COMMERCIAL',
      typeLabel: 'Commercial IT Block Alpha',
      status: 'ACTIVE',
      dataStatus: 'verified',
      totalUnits: 15,
    },
    {
      id: 'B-306-B',
      name: 'Tech Tower · Beta Block',
      code: 'BLDG-MH-PUN-306-B',
      position: [30, -18],
      rotation: 0.0,
      floors: 5,
      floorHeight: 4.0,
      footprint: [28, 20],
      heightMeters: 20.0,
      type: 'COMMERCIAL',
      typeLabel: 'Commercial IT Block Beta',
      status: 'ACTIVE',
      dataStatus: 'verified',
      totalUnits: 15,
    },
  ],
  roads: {
    segments: [
      { id: 'tt-rd-main', position: [0, 0], size: [10, 110] },
      { id: 'tt-rd-front', position: [0, 32], size: [130, 10] },
    ],
    widths: { primary: 10, secondary: 10, local: 8, path: 2.5 },
  },
  parks: [], // 0 parks as specified
  parkingAreas: [
    {
      id: 'tt-parking-exec',
      name: 'Executive & Commercial Surface Parking',
      position: [0, 48],
      size: [70, 20],
      baysPerRow: 20,
    },
  ],
  amenities: [], // 0 clubhouse as specified
  waterBodies: [], // 0 pool/lake as specified
  entrances: [
    {
      id: 'tt-gate',
      name: 'Tech Tower Commercial Access Gate',
      position: [0, 62],
      width: 22,
      height: 6.0,
      hasSecurityBooth: true,
      hasSignage: true,
    },
  ],
  trees: [
    { x: -55, z: -18, kind: 'palm', scale: 1.1 },
    { x: 55, z: -18, kind: 'palm', scale: 1.1 },
    { x: -55, z: 32, kind: 'palm', scale: 1.1 },
    { x: 55, z: 32, kind: 'palm', scale: 1.1 },
  ],
};

// ── 5. Society D — Wakad Heights (PARCEL-MH-PUN-004 / B-401) ──────────────────────
// Requirements: 4 low-rise buildings, 1 central garden, 1 parking area, 0 pools
export const SOCIETY_D_DIGITAL_TWIN: SocietyDigitalTwin = {
  societyId: 'PARCEL-MH-PUN-004',
  societyName: 'Wakad Heights Residency',
  sourceImage: '/assets/societies/wakad-heights-siteplan.jpg',
  sourceImageType: 'ARCHITECTURAL_LAYOUT',
  generationStatus: 'GENERATED',
  generatedAt: '2024-03-06T00:00:00.000Z',
  confidence: 0.92,
  analysisNotes: 'Low-rise residential enclave featuring 4 symmetric wings encircling a central landscaped atrium lawn.',
  isAiAnalyzed: false,
  siteDimensions: {
    widthMeters: 190,
    depthMeters: 170,
  },
  siteBoundary: {
    half: [95, 85],
    radius: 20,
    y: 0.3,
  },
  buildings: [
    {
      id: 'B-401',
      name: 'Wakad Heights · Orchid Wing',
      code: 'BLDG-MH-PUN-401',
      position: [-45, -35],
      rotation: 0.05,
      floors: 4,
      floorHeight: 3.25,
      footprint: [22, 16],
      heightMeters: 13.0,
      type: 'A',
      typeLabel: 'Residential Wing 1 (Northwest)',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 8,
    },
    {
      id: 'B-402',
      name: 'Wakad Heights · Tulip Wing',
      code: 'BLDG-MH-PUN-402',
      position: [45, -35],
      rotation: -0.05,
      floors: 4,
      floorHeight: 3.25,
      footprint: [22, 16],
      heightMeters: 13.0,
      type: 'B',
      typeLabel: 'Residential Wing 2 (Northeast)',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 8,
    },
    {
      id: 'B-403',
      name: 'Wakad Heights · Iris Wing',
      code: 'BLDG-MH-PUN-403',
      position: [-45, 35],
      rotation: -0.05,
      floors: 4,
      floorHeight: 3.25,
      footprint: [22, 16],
      heightMeters: 13.0,
      type: 'C',
      typeLabel: 'Residential Wing 3 (Southwest)',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 8,
    },
    {
      id: 'B-404',
      name: 'Wakad Heights · Lotus Wing',
      code: 'BLDG-MH-PUN-404',
      position: [45, 35],
      rotation: 0.05,
      floors: 4,
      floorHeight: 3.25,
      footprint: [22, 16],
      heightMeters: 13.0,
      type: 'D',
      typeLabel: 'Residential Wing 4 (Southeast)',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 8,
    },
  ],
  roads: {
    segments: [
      { id: 'wh-rd-spine', position: [0, 0], size: [8, 130] },
      { id: 'wh-rd-cross', position: [0, 0], size: [150, 8] },
    ],
    widths: { primary: 8, secondary: 8, local: 6, path: 2 },
  },
  parks: [
    {
      id: 'wh-park-central',
      name: 'Wakad Central Courtyard Garden',
      position: [0, 0],
      size: [48, 48],
      shape: 'circle',
      radius: 24,
      hasBenches: true,
      hasTrees: true,
    },
  ],
  parkingAreas: [
    {
      id: 'wh-parking',
      name: 'Resident Covered Parking Zone',
      position: [0, 68],
      size: [60, 20],
      baysPerRow: 14,
    },
  ],
  amenities: [],
  waterBodies: [],
  entrances: [
    {
      id: 'wh-gate',
      name: 'Wakad Heights Main Portal',
      position: [0, 80],
      width: 18,
      height: 5.5,
      hasSecurityBooth: true,
      hasSignage: true,
    },
  ],
  trees: [
    { x: -20, z: -20, kind: 'canopy', scale: 1.0 },
    { x: 20, z: -20, kind: 'canopy', scale: 1.0 },
    { x: -20, z: 20, kind: 'canopy', scale: 1.0 },
    { x: 20, z: 20, kind: 'canopy', scale: 1.0 },
  ],
};

// ── 6. Society E — Hinjewadi Tech Enclave (PARCEL-MH-PUN-005 / B-501) ───────────
// Requirements: 6 residential blocks, 2 parks, 2 parking courts, 1 clubhouse
export const SOCIETY_E_DIGITAL_TWIN: SocietyDigitalTwin = {
  societyId: 'PARCEL-MH-PUN-005',
  societyName: 'Hinjewadi Tech Enclave',
  sourceImage: '/assets/societies/hinjewadi-enclave-siteplan.jpg',
  sourceImageType: 'ARCHITECTURAL_LAYOUT',
  generationStatus: 'GENERATED',
  generatedAt: '2024-03-07T00:00:00.000Z',
  confidence: 0.94,
  analysisNotes: 'Six-block integrated IT residential community with dual landscaped gardens, central recreation clubhouse and court parking.',
  isAiAnalyzed: false,
  siteDimensions: {
    widthMeters: 260,
    depthMeters: 220,
  },
  siteBoundary: {
    half: [130, 110],
    radius: 30,
    y: 0.3,
  },
  buildings: [
    {
      id: 'B-501',
      name: 'Hinjewadi Enclave · Block 1',
      code: 'BLDG-MH-PUN-501',
      position: [-70, -55],
      rotation: 0.08,
      floors: 6,
      floorHeight: 3.16,
      footprint: [24, 16],
      heightMeters: 19.0,
      type: 'A',
      typeLabel: 'Block 1',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 12,
    },
    {
      id: 'B-502',
      name: 'Hinjewadi Enclave · Block 2',
      code: 'BLDG-MH-PUN-502',
      position: [0, -65],
      rotation: 0.0,
      floors: 6,
      floorHeight: 3.16,
      footprint: [24, 16],
      heightMeters: 19.0,
      type: 'B',
      typeLabel: 'Block 2',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 12,
    },
    {
      id: 'B-503',
      name: 'Hinjewadi Enclave · Block 3',
      code: 'BLDG-MH-PUN-503',
      position: [70, -55],
      rotation: -0.08,
      floors: 6,
      floorHeight: 3.16,
      footprint: [24, 16],
      heightMeters: 19.0,
      type: 'A',
      typeLabel: 'Block 3',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 12,
    },
    {
      id: 'B-504',
      name: 'Hinjewadi Enclave · Block 4',
      code: 'BLDG-MH-PUN-504',
      position: [-70, 35],
      rotation: -0.05,
      floors: 6,
      floorHeight: 3.16,
      footprint: [24, 16],
      heightMeters: 19.0,
      type: 'C',
      typeLabel: 'Block 4',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 12,
    },
    {
      id: 'B-505',
      name: 'Hinjewadi Enclave · Block 5',
      code: 'BLDG-MH-PUN-505',
      position: [0, 45],
      rotation: 0.0,
      floors: 6,
      floorHeight: 3.16,
      footprint: [24, 16],
      heightMeters: 19.0,
      type: 'B',
      typeLabel: 'Block 5',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 12,
    },
    {
      id: 'B-506',
      name: 'Hinjewadi Enclave · Block 6',
      code: 'BLDG-MH-PUN-506',
      position: [70, 35],
      rotation: 0.05,
      floors: 6,
      floorHeight: 3.16,
      footprint: [24, 16],
      heightMeters: 19.0,
      type: 'C',
      typeLabel: 'Block 6',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 12,
    },
  ],
  roads: {
    segments: [
      { id: 'he-rd-1', position: [0, -10], size: [8, 160] },
      { id: 'he-rd-2', position: [0, -10], size: [200, 8] },
    ],
    widths: { primary: 8, secondary: 8, local: 6, path: 2 },
  },
  parks: [
    {
      id: 'he-park-east',
      name: 'East Meadow Lawn',
      position: [40, -10],
      size: [40, 30],
      shape: 'rounded-rect',
      hasBenches: true,
      hasTrees: true,
    },
    {
      id: 'he-park-west',
      name: 'West Sports Lawn',
      position: [-40, -10],
      size: [40, 30],
      shape: 'rounded-rect',
      hasBenches: true,
      hasTrees: true,
    },
  ],
  parkingAreas: [
    {
      id: 'he-pk-1',
      name: 'North Surface Parking',
      position: [-95, -75],
      size: [36, 20],
      baysPerRow: 12,
    },
    {
      id: 'he-pk-2',
      name: 'South Surface Parking',
      position: [95, -75],
      size: [36, 20],
      baysPerRow: 12,
    },
  ],
  amenities: [
    {
      id: 'he-clubhouse',
      name: 'Hinjewadi Enclave Clubhouse & Gym',
      type: 'CLUBHOUSE',
      position: [0, -10],
      size: [24, 6.0, 16],
      glassRoof: true,
    },
  ],
  waterBodies: [],
  entrances: [
    {
      id: 'he-gate',
      name: 'Hinjewadi Tech Enclave Main Entrance',
      position: [0, 95],
      width: 22,
      height: 6.0,
      hasSecurityBooth: true,
      hasSignage: true,
    },
  ],
  trees: [
    { x: -40, z: -10, kind: 'canopy', scale: 1.1 },
    { x: 40, z: -10, kind: 'canopy', scale: 1.1 },
    { x: -95, z: 0, kind: 'palm', scale: 1.0 },
    { x: 95, z: 0, kind: 'palm', scale: 1.0 },
  ],
};

// ── 7. Society F — Amanora Elegance (PARCEL-MH-PUN-006 / B-601) ─────────────────
// Requirements: 2 high-rise towers (16 floors, 50m), pool, promenade, parking
export const SOCIETY_F_DIGITAL_TWIN: SocietyDigitalTwin = {
  societyId: 'PARCEL-MH-PUN-006',
  societyName: 'Amanora Elegance Towers',
  sourceImage: '/assets/societies/amanora-elegance-siteplan.jpg',
  sourceImageType: 'SATELLITE_AERIAL',
  generationStatus: 'GENERATED',
  generatedAt: '2024-03-08T00:00:00.000Z',
  confidence: 0.95,
  analysisNotes: 'Twin iconic 16-storey residential towers overlooking a resort-style infinity swimming pool and manicured boulevard promenade.',
  isAiAnalyzed: false,
  siteDimensions: {
    widthMeters: 200,
    depthMeters: 170,
  },
  siteBoundary: {
    half: [100, 85],
    radius: 20,
    y: 0.3,
  },
  buildings: [
    {
      id: 'B-601',
      name: 'Amanora Elegance · Tower 1',
      code: 'BLDG-MH-PUN-601',
      position: [-38, -25],
      rotation: 0.08,
      floors: 16,
      floorHeight: 3.12,
      footprint: [28, 18],
      heightMeters: 50.0,
      type: 'A',
      typeLabel: 'Skyline Tower 1 (West)',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 64,
    },
    {
      id: 'B-602',
      name: 'Amanora Elegance · Tower 2',
      code: 'BLDG-MH-PUN-602',
      position: [38, -25],
      rotation: -0.08,
      floors: 16,
      floorHeight: 3.12,
      footprint: [28, 18],
      heightMeters: 50.0,
      type: 'A',
      typeLabel: 'Skyline Tower 2 (East)',
      status: 'VERIFIED',
      dataStatus: 'verified',
      totalUnits: 64,
    },
  ],
  roads: {
    segments: [
      { id: 'ae-rd-main', position: [0, 0], size: [8, 120] },
      { id: 'ae-rd-circle', position: [0, 20], size: [130, 8] },
    ],
    widths: { primary: 8, secondary: 8, local: 6, path: 2.5 },
  },
  parks: [
    {
      id: 'ae-promenade',
      name: 'Amanora Grand Boulevard Promenade',
      position: [0, -25],
      size: [32, 50],
      shape: 'rounded-rect',
      hasBenches: true,
      hasTrees: true,
    },
  ],
  parkingAreas: [
    {
      id: 'ae-parking',
      name: 'Resident & Visitor Bay',
      position: [0, 52],
      size: [60, 20],
      baysPerRow: 16,
    },
  ],
  amenities: [
    {
      id: 'ae-club',
      name: 'Amanora Elegance Sky Club',
      type: 'CLUBHOUSE',
      position: [-55, 20],
      size: [20, 5.5, 14],
      glassRoof: true,
    },
  ],
  waterBodies: [
    {
      id: 'ae-pool',
      name: 'Resort Infinity Swimming Pool',
      type: 'SWIMMING_POOL',
      position: [0, -25],
      size: [24, 12],
      shape: 'rectangle',
    },
  ],
  entrances: [
    {
      id: 'ae-gate',
      name: 'Amanora Elegance Grand Arch Gate',
      position: [0, 72],
      width: 20,
      height: 6.5,
      hasSecurityBooth: true,
      hasSignage: true,
    },
  ],
  trees: [
    { x: -38, z: 15, kind: 'palm', scale: 1.2 },
    { x: 38, z: 15, kind: 'palm', scale: 1.2 },
    { x: -70, z: -25, kind: 'canopy', scale: 1.1 },
    { x: 70, z: -25, kind: 'canopy', scale: 1.1 },
  ],
};

// Pre-registered mock datasets dictionary for all 7 GIS parcels
const PRECONFIGURED_TWINS: Record<string, SocietyDigitalTwin> = {
  'PARCEL-MH-PUN-074': LIFE_REPUBLIC_DIGITAL_TWIN,
  'life-republic': LIFE_REPUBLIC_DIGITAL_TWIN,
  'PROP-LR-B-0402': LIFE_REPUBLIC_DIGITAL_TWIN,
  'PARCEL-MH-PUN-001': SOCIETY_A_DIGITAL_TWIN,
  'B-102': SOCIETY_A_DIGITAL_TWIN,
  'PARCEL-MH-PUN-002': SOCIETY_B_DIGITAL_TWIN,
  'B-104': SOCIETY_B_DIGITAL_TWIN,
  'PARCEL-MH-PUN-003': SOCIETY_C_DIGITAL_TWIN,
  'B-306': SOCIETY_C_DIGITAL_TWIN,
  'PARCEL-MH-PUN-004': SOCIETY_D_DIGITAL_TWIN,
  'B-401': SOCIETY_D_DIGITAL_TWIN,
  'PARCEL-MH-PUN-005': SOCIETY_E_DIGITAL_TWIN,
  'B-501': SOCIETY_E_DIGITAL_TWIN,
  'PARCEL-MH-PUN-006': SOCIETY_F_DIGITAL_TWIN,
  'B-601': SOCIETY_F_DIGITAL_TWIN,
};


const STORAGE_PREFIX = 'bhu_society_digital_twin_';

/**
 * In-memory server/client runtime cache for generated twins
 */
const RUNTIME_CACHE = new Map<string, SocietyDigitalTwin>();

/**
 * Resolves the 3D Digital Twin configuration for a given society.
 * Checks runtime cache, local persistent cache, and preconfigured registry.
 * If no configuration or site image exists, returns null.
 */
export function getSocietyDigitalTwin(societyId: string, version?: string): SocietyDigitalTwin | null {
  if (!societyId) return null;

  const cacheKey = version ? `${societyId}_${version}` : societyId;

  // 1. Check runtime in-memory cache
  if (RUNTIME_CACHE.has(cacheKey)) {
    return RUNTIME_CACHE.get(cacheKey)!;
  }
  if (!version && RUNTIME_CACHE.has(societyId)) {
    return RUNTIME_CACHE.get(societyId)!;
  }

  // 2. Check local custom overrides in browser
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${societyId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as SocietyDigitalTwin;
        if (parsed && parsed.societyId === societyId) {
          if (!version || parsed.sourceImageVersion === version) {
            RUNTIME_CACHE.set(cacheKey, parsed);
            return parsed;
          }
        }
      }
    } catch {}
  }

  // 3. Check preconfigured registry (only if no custom override or matching base)
  if (PRECONFIGURED_TWINS[societyId]) {
    return PRECONFIGURED_TWINS[societyId];
  }

  // 4. Not found — do NOT silently return Life Republic! Return null
  return null;
}

/**
 * Persists a customized/AI-analyzed digital twin for a specific society.
 */
export function saveSocietyDigitalTwin(twin: SocietyDigitalTwin): void {
  if (!twin || !twin.societyId) return;

  const updated: SocietyDigitalTwin = {
    ...twin,
    generatedAt: twin.generatedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  RUNTIME_CACHE.set(twin.societyId, updated);
  if (twin.sourceImageVersion) {
    RUNTIME_CACHE.set(`${twin.societyId}_${twin.sourceImageVersion}`, updated);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${twin.societyId}`, JSON.stringify(updated));
    } catch (err) {
      console.warn('[DigitalTwinRegistry] Failed to cache digital twin in localStorage:', err);
    }
  }
}

/**
 * Partially updates an existing society digital twin.
 */
export function updateSocietyDigitalTwin(societyId: string, patch: Partial<SocietyDigitalTwin>): SocietyDigitalTwin | null {
  if (!societyId) return null;

  const current = getSocietyDigitalTwin(societyId);
  if (!current) return null;

  const updated: SocietyDigitalTwin = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  saveSocietyDigitalTwin(updated);
  return updated;
}

/**
 * Returns the current generation status for a society digital twin.
 */
export function getGenerationStatus(societyId: string): import('@/types/digitalTwin').DigitalTwinGenerationStatus {
  if (!societyId) return 'SOURCE_IMAGE_REQUIRED';
  const twin = getSocietyDigitalTwin(societyId);
  if (!twin) return 'SOURCE_IMAGE_REQUIRED';
  return twin.generationStatus || 'READY';
}

/**
 * Deletes or resets a society's digital twin.
 */
export function deleteSocietyDigitalTwin(societyId: string): void {
  if (!societyId) return;
  RUNTIME_CACHE.delete(societyId);

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${societyId}`);
    } catch {}
  }
}

/**
 * Resets a society's digital twin back to factory/unconfigured state.
 */
export function resetSocietyDigitalTwin(societyId: string): void {
  deleteSocietyDigitalTwin(societyId);
}

/**
 * Retrieves a specific version of a society's digital twin.
 */
export function getTwinVersion(societyId: string, version: string): SocietyDigitalTwin | null {
  return getSocietyDigitalTwin(societyId, version);
}

/**
 * Lists all known versions for a society's digital twin.
 */
export function listTwinVersions(societyId: string): string[] {
  if (!societyId) return [];
  const versions: Set<string> = new Set();
  const current = getSocietyDigitalTwin(societyId);
  if (current?.sourceImageVersion) {
    versions.add(current.sourceImageVersion);
  }
  // Check runtime cache keys
  for (const key of RUNTIME_CACHE.keys()) {
    if (key.startsWith(`${societyId}_v`)) {
      const ver = key.replace(`${societyId}_`, '');
      versions.add(ver);
    }
  }
  return Array.from(versions).sort();
}

