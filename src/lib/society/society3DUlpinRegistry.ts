/**
 * Society 3D ULPIN Registry & Service (Phase 23)
 * ================================================
 * Centralized registry of Society 3D ULPIN identifiers and cadastral metadata.
 *
 * IMPORTANT LEGAL / REGULATORY NOTICE:
 * The Society 3D ULPIN is a DIGITAL TWIN IDENTIFIER (Demo / Illustrative).
 * It is NOT an official government cadastral ULPIN.
 * All records carry: isOfficialUlpin: false, dataStatus: "DEMO", sourceType: "ILLUSTRATIVE".
 */

export interface Society3DUlpinRecord {
  societyId: string;
  society3DUlpin: string; // e.g. "S3D-MH-PUN-GVR-001"
  societyName: string;
  parcelId: string;
  surveyNumber: string;
  district: string;
  state: string;
  locationName: string;
  address: string;
  centroid: { lat: number; lng: number };
  boundaryPolygon: Array<[number, number]>; // [lng, lat] pairs
  areaSqMeters: number;
  totalBuildings: number;
  totalFloors: number;
  totalUnits: number;
  sourceImage: string | null;
  sourceImageType?: 'MASTER_PLAN' | 'ARCHITECTURAL_SITE_PLAN' | 'DRONE_SURVEY' | 'CADASTRAL_LAYOUT';
  sourceImageVersion: string;
  digitalTwinStatus: 'READY' | 'SOURCE_IMAGE_REQUIRED' | 'PROCESSING' | 'FAILED';
  digitalTwinVersion: string;
  isOfficialUlpin: false;
  dataStatus: 'DEMO';
  sourceType: 'ILLUSTRATIVE';
  representativePropertyId: string;
  buildingIds: string[];
  features: {
    parks: number;
    parkingBays: number;
    amenities: string[];
    waterBodies: string[];
  };
}

export const SOCIETY_3D_ULPIN_RECORDS: Society3DUlpinRecord[] = [
  // ── 1. Green View Residency ──
  {
    societyId: 'PARCEL-MH-PUN-001',
    society3DUlpin: 'S3D-MH-PUN-GVR-001',
    societyName: 'Green View Residency',
    parcelId: 'PARCEL-MH-PUN-001',
    surveyNumber: 'MH-PUN-SUR-042/B',
    district: 'Pune',
    state: 'Maharashtra',
    locationName: 'Sector 1, Shivaji Nagar Cadastre',
    address: 'Plot 42/B, North Main Road, Shivaji Nagar, Pune, Maharashtra 411005',
    centroid: { lat: 18.59125, lng: 73.7390 },
    boundaryPolygon: [
      [73.7380, 18.5905],
      [73.7400, 18.5905],
      [73.7400, 18.5920],
      [73.7380, 18.5920],
      [73.7380, 18.5905],
    ],
    areaSqMeters: 8500,
    totalBuildings: 3,
    totalFloors: 15,
    totalUnits: 10,
    sourceImage: '/brand/green-view-site-plan.jpg',
    sourceImageType: 'ARCHITECTURAL_SITE_PLAN',
    sourceImageVersion: 'v2.1',
    digitalTwinStatus: 'READY',
    digitalTwinVersion: 'v2.1',
    isOfficialUlpin: false,
    dataStatus: 'DEMO',
    sourceType: 'ILLUSTRATIVE',
    representativePropertyId: 'PROP-MH-PUN-GVR-102',
    buildingIds: ['B-102', 'B-102-W2', 'B-102-W3'],
    features: {
      parks: 1,
      parkingBays: 1,
      amenities: ['Clubhouse & Gymnasium'],
      waterBodies: [],
    },
  },

  // ── 2. Shree Krishna Arcade ──
  {
    societyId: 'PARCEL-MH-PUN-002',
    society3DUlpin: 'S3D-MH-PUN-SKA-001',
    societyName: 'Shree Krishna Arcade',
    parcelId: 'PARCEL-MH-PUN-002',
    surveyNumber: 'MH-PUN-SUR-088/A',
    district: 'Pune',
    state: 'Maharashtra',
    locationName: 'Sector 2, Koregaon Park Arcade Block',
    address: 'Plot 88/A, Lane 27, Koregaon Park, Pune, Maharashtra 411001',
    centroid: { lat: 18.59125, lng: 73.7415 },
    boundaryPolygon: [
      [73.7405, 18.5905],
      [73.7425, 18.5905],
      [73.7425, 18.5920],
      [73.7405, 18.5920],
      [73.7405, 18.5905],
    ],
    areaSqMeters: 6200,
    totalBuildings: 5,
    totalFloors: 25,
    totalUnits: 6,
    sourceImage: '/brand/shree-krishna-site-plan.jpg',
    sourceImageType: 'ARCHITECTURAL_SITE_PLAN',
    sourceImageVersion: 'v2.0',
    digitalTwinStatus: 'READY',
    digitalTwinVersion: 'v2.0',
    isOfficialUlpin: false,
    dataStatus: 'DEMO',
    sourceType: 'ILLUSTRATIVE',
    representativePropertyId: 'PROP-MH-PUN-SKA-104',
    buildingIds: ['B-104', 'B-104-W2', 'B-104-W3', 'B-104-W4', 'B-104-W5'],
    features: {
      parks: 2,
      parkingBays: 2,
      amenities: ['Community Hall', 'Retail Arcade'],
      waterBodies: ['Swimming Pool'],
    },
  },

  // ── 3. Tech Tower IT Park ──
  {
    societyId: 'PARCEL-MH-PUN-003',
    society3DUlpin: 'S3D-MH-PUN-TT-001',
    societyName: 'Tech Tower IT Park',
    parcelId: 'PARCEL-MH-PUN-003',
    surveyNumber: 'MH-PUN-SUR-048/A',
    district: 'Pune',
    state: 'Maharashtra',
    locationName: 'Sector 3, Baner IT Corridor Link',
    address: 'Survey 48/A, Baner-Pashan Link Road, Baner, Pune, Maharashtra 411045',
    centroid: { lat: 18.59125, lng: 73.7440 },
    boundaryPolygon: [
      [73.7430, 18.5905],
      [73.7450, 18.5905],
      [73.7450, 18.5920],
      [73.7430, 18.5920],
      [73.7430, 18.5905],
    ],
    areaSqMeters: 12000,
    totalBuildings: 2,
    totalFloors: 10,
    totalUnits: 4,
    sourceImage: '/brand/tech-tower-site-plan.jpg',
    sourceImageType: 'CADASTRAL_LAYOUT',
    sourceImageVersion: 'v1.8',
    digitalTwinStatus: 'READY',
    digitalTwinVersion: 'v1.8',
    isOfficialUlpin: false,
    dataStatus: 'DEMO',
    sourceType: 'ILLUSTRATIVE',
    representativePropertyId: 'prop-pun-003',
    buildingIds: ['B-306', 'B-306-B'],
    features: {
      parks: 0,
      parkingBays: 1,
      amenities: ['Server Infrastructure', 'Cafeteria Deck'],
      waterBodies: [],
    },
  },

  // ── 4. Wakad Heights Residency ──
  {
    societyId: 'PARCEL-MH-PUN-004',
    society3DUlpin: 'S3D-MH-PUN-WAK-001',
    societyName: 'Wakad Heights Residency',
    parcelId: 'PARCEL-MH-PUN-004',
    surveyNumber: 'MH-PUN-SUR-096',
    district: 'Pune',
    state: 'Maharashtra',
    locationName: 'Sector 4, Wakad Heights Sector 26',
    address: 'Sector 26, Pimple Saudagar, Wakad, Pune, Maharashtra 411027',
    centroid: { lat: 18.59375, lng: 73.7390 },
    boundaryPolygon: [
      [73.7380, 18.5930],
      [73.7400, 18.5930],
      [73.7400, 18.5945],
      [73.7380, 18.5945],
      [73.7380, 18.5930],
    ],
    areaSqMeters: 9800,
    totalBuildings: 4,
    totalFloors: 16,
    totalUnits: 3,
    sourceImage: '/brand/wakad-heights-site-plan.jpg',
    sourceImageType: 'ARCHITECTURAL_SITE_PLAN',
    sourceImageVersion: 'v1.5',
    digitalTwinStatus: 'READY',
    digitalTwinVersion: 'v1.5',
    isOfficialUlpin: false,
    dataStatus: 'DEMO',
    sourceType: 'ILLUSTRATIVE',
    representativePropertyId: 'PROP-MH-PUN-WAK-401',
    buildingIds: ['B-401', 'B-402', 'B-403', 'B-404'],
    features: {
      parks: 1,
      parkingBays: 1,
      amenities: ['Central Courtyard Atrium'],
      waterBodies: [],
    },
  },

  // ── 5. Hinjewadi Tech Enclave ──
  {
    societyId: 'PARCEL-MH-PUN-005',
    society3DUlpin: 'S3D-MH-PUN-HIN-001',
    societyName: 'Hinjewadi Tech Enclave',
    parcelId: 'PARCEL-MH-PUN-005',
    surveyNumber: 'MH-PUN-SUR-017/B',
    district: 'Pune',
    state: 'Maharashtra',
    locationName: 'Sector 5, Hinjewadi Tech Park Block 17/B',
    address: 'Phase 3, Block 17/B, Rajiv Gandhi Infotech Park, Hinjewadi, Pune 411057',
    centroid: { lat: 18.59375, lng: 73.7415 },
    boundaryPolygon: [
      [73.7405, 18.5930],
      [73.7425, 18.5930],
      [73.7425, 18.5945],
      [73.7405, 18.5945],
      [73.7405, 18.5930],
    ],
    areaSqMeters: 15000,
    totalBuildings: 6,
    totalFloors: 36,
    totalUnits: 3,
    sourceImage: '/brand/hinjewadi-enclave-site-plan.jpg',
    sourceImageType: 'MASTER_PLAN',
    sourceImageVersion: 'v2.2',
    digitalTwinStatus: 'READY',
    digitalTwinVersion: 'v2.2',
    isOfficialUlpin: false,
    dataStatus: 'DEMO',
    sourceType: 'ILLUSTRATIVE',
    representativePropertyId: 'PROP-MH-PUN-HIN-501',
    buildingIds: ['B-501', 'B-502', 'B-503', 'B-504', 'B-505', 'B-506'],
    features: {
      parks: 2,
      parkingBays: 2,
      amenities: ['Tech Clubhouse', 'Sports Court'],
      waterBodies: [],
    },
  },

  // ── 6. Amanora Elegance Towers ──
  {
    societyId: 'PARCEL-MH-PUN-006',
    society3DUlpin: 'S3D-MH-PUN-AMA-001',
    societyName: 'Amanora Elegance Towers',
    parcelId: 'PARCEL-MH-PUN-006',
    surveyNumber: 'MH-PUN-SUR-112/A',
    district: 'Pune',
    state: 'Maharashtra',
    locationName: 'Sector 6, Amanora Cyber Sector 14, Hadapsar Link',
    address: 'Sector 14, Amanora Park Town, Hadapsar, Pune 411028',
    centroid: { lat: 18.59375, lng: 73.7440 },
    boundaryPolygon: [
      [73.7430, 18.5930],
      [73.7450, 18.5930],
      [73.7450, 18.5945],
      [73.7430, 18.5945],
      [73.7430, 18.5930],
    ],
    areaSqMeters: 14200,
    totalBuildings: 2,
    totalFloors: 32,
    totalUnits: 3,
    sourceImage: '/brand/amanora-elegance-site-plan.jpg',
    sourceImageType: 'ARCHITECTURAL_SITE_PLAN',
    sourceImageVersion: 'v3.0',
    digitalTwinStatus: 'READY',
    digitalTwinVersion: 'v3.0',
    isOfficialUlpin: false,
    dataStatus: 'DEMO',
    sourceType: 'ILLUSTRATIVE',
    representativePropertyId: 'PROP-MH-PUN-AMA-601',
    buildingIds: ['B-601', 'B-602'],
    features: {
      parks: 1,
      parkingBays: 1,
      amenities: ['Sky Lounge', 'Infinity Deck'],
      waterBodies: ['Resort Swimming Pool'],
    },
  },

  // ── 7. Kolte Patil Life Republic Penthouses ──
  {
    societyId: 'PARCEL-MH-PUN-074',
    society3DUlpin: 'S3D-MH-PUN-LR-001',
    societyName: 'Kolte Patil Life Republic Penthouses',
    parcelId: 'PARCEL-MH-PUN-074',
    surveyNumber: 'MH-PUN-SUR-074',
    district: 'Pune',
    state: 'Maharashtra',
    locationName: 'Sector 7, Marunji-Hinjewadi Grand Master Township',
    address: 'Survey No. 74, Marunji, Taluka Mulshi, Pune, Maharashtra 411057',
    centroid: { lat: 18.59675, lng: 73.7415 },
    boundaryPolygon: [
      [73.7380, 18.5955],
      [73.7450, 18.5955],
      [73.7450, 18.5980],
      [73.7380, 18.5980],
      [73.7380, 18.5955],
    ],
    areaSqMeters: 18500,
    totalBuildings: 5,
    totalFloors: 107,
    totalUnits: 10,
    sourceImage: '/brand/kolte-patil-banner.jpg',
    sourceImageType: 'MASTER_PLAN',
    sourceImageVersion: 'v3.2',
    digitalTwinStatus: 'READY',
    digitalTwinVersion: 'v3.2',
    isOfficialUlpin: false,
    dataStatus: 'DEMO',
    sourceType: 'ILLUSTRATIVE',
    representativePropertyId: 'PROP-LR-B-0402',
    buildingIds: ['B-LR-A', 'B-LR-B', 'B-LR-C', 'B-LR-D', 'B-LR-E'],
    features: {
      parks: 5,
      parkingBays: 3,
      amenities: ['Glass Pavilion', 'Clubhouse', 'Promenade'],
      waterBodies: ['Central Lake'],
    },
  },

  // ── 8. Unconfigured Test Society (For honest empty state testing) ──
  {
    societyId: 'society-unconfigured-test',
    society3DUlpin: 'S3D-MH-PUN-UNC-999',
    societyName: 'Pristine Meadows (Unconfigured)',
    parcelId: 'PARCEL-MH-PUN-UNC-999',
    surveyNumber: 'MH-PUN-SUR-999',
    district: 'Pune',
    state: 'Maharashtra',
    locationName: 'Sector 9, Chakan Industrial Suburb',
    address: 'Plot 999, Chakan-Talegaon Road, Chakan, Pune 410501',
    centroid: { lat: 18.7500, lng: 73.8500 },
    boundaryPolygon: [
      [73.8480, 18.7480],
      [73.8520, 18.7480],
      [73.8520, 18.7520],
      [73.8480, 18.7520],
      [73.8480, 18.7480],
    ],
    areaSqMeters: 11000,
    totalBuildings: 0,
    totalFloors: 0,
    totalUnits: 0,
    sourceImage: null,
    sourceImageVersion: 'v0.0',
    digitalTwinStatus: 'SOURCE_IMAGE_REQUIRED',
    digitalTwinVersion: 'v0.0',
    isOfficialUlpin: false,
    dataStatus: 'DEMO',
    sourceType: 'ILLUSTRATIVE',
    representativePropertyId: '',
    buildingIds: [],
    features: {
      parks: 0,
      parkingBays: 0,
      amenities: [],
      waterBodies: [],
    },
  },
];

/**
 * Resolves a society record by its Society 3D ULPIN (e.g. S3D-MH-PUN-GVR-001).
 * Case-insensitive and whitespace-tolerant.
 */
export function resolveSocietyBy3DUlpin(ulpin: string): Society3DUlpinRecord | null {
  if (!ulpin) return null;
  const clean = ulpin.trim().toUpperCase().replace(/\s+/g, '');
  
  return (
    SOCIETY_3D_ULPIN_RECORDS.find(
      (s) =>
        s.society3DUlpin.toUpperCase() === clean ||
        s.society3DUlpin.replace(/[^A-Z0-9]/g, '') === clean.replace(/[^A-Z0-9]/g, '')
    ) ?? null
  );
}

/**
 * Resolves a society record by any valid identifier:
 * - Society 3D ULPIN (S3D-MH-PUN-GVR-001)
 * - societyId (PARCEL-MH-PUN-001 / life-republic)
 * - parcelId (PARCEL-MH-PUN-001)
 * - surveyNumber (MH-PUN-SUR-042/B)
 * - buildingId (B-102)
 */
export function resolveSocietyByAnyId(query: string): Society3DUlpinRecord | null {
  if (!query) return null;
  const clean = query.trim().toUpperCase();

  return (
    SOCIETY_3D_ULPIN_RECORDS.find(
      (s) =>
        s.society3DUlpin.toUpperCase() === clean ||
        s.societyId.toUpperCase() === clean ||
        s.parcelId.toUpperCase() === clean ||
        s.surveyNumber.toUpperCase() === clean ||
        s.buildingIds.some((bId) => bId.toUpperCase() === clean) ||
        (clean === 'LIFE-REPUBLIC' && s.societyId === 'PARCEL-MH-PUN-074')
    ) ?? null
  );
}

/**
 * Verifies that a buildingId genuinely belongs to the given society.
 * Used for deep link security and cross-society tampering prevention.
 */
export function validateSocietyBuildingOwnership(societyId: string, buildingId: string): boolean {
  if (!societyId || !buildingId) return false;
  const society = resolveSocietyByAnyId(societyId);
  if (!society) return false;
  return society.buildingIds.includes(buildingId);
}

/**
 * Returns all configured Society 3D ULPIN records.
 */
export function getAllSociety3DUlpins(): Society3DUlpinRecord[] {
  return SOCIETY_3D_ULPIN_RECORDS;
}
