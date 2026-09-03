/**
 * Centralized Building demo data
 * ================================
 * Three buildings sitting on the parcels defined in `parcels.ts`.
 *
 * Hierarchy:  LandParcel → Building → Floor → PropertyUnit
 *
 * IDs follow the pattern: B-102, B-104, B-306
 */
import type { Building } from '@/types/gis';

/** Helper: polygon coordinates for a simple rectangular building footprint. */
function rectCoords(swLat: number, swLng: number, neLat: number, neLng: number) {
  return [
    [swLng, swLat],
    [neLng, swLat],
    [neLng, neLat],
    [swLng, neLat],
    [swLng, swLat],
  ];
}

export const MOCK_BUILDINGS: Building[] = [
  {
    id: 'B-102',
    buildingCode: 'BLDG-MH-PUN-102',
    name: 'Green View Residency',
    parcelId: 'PARCEL-MH-PUN-001',
    address: 'Plot 42/B, North Main Road, Shivaji Nagar, Pune, Maharashtra 411005',
    latitude: 18.5318,
    longitude: 73.8539,
    height: 18, // 5 floors × 3.2 m per floor + slab thickness
    totalFloors: 5,
    builtUpArea: 35200, // sq ft
    yearBuilt: 2020,
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.5314, 73.8535, 18.5322, 73.8543),
    },
    status: 'ACTIVE',
  },
  {
    id: 'B-104',
    buildingCode: 'BLDG-MH-PUN-104',
    name: 'Shree Krishna Arcade',
    parcelId: 'PARCEL-MH-PUN-002',
    address: 'Plot 88/A, Koregaon Park, Lane 27, Pune, Maharashtra 411001',
    latitude: 18.5336,
    longitude: 73.8657,
    height: 16, // 5 floors
    totalFloors: 5,
    builtUpArea: 27800, // sq ft
    yearBuilt: 2018,
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.5331, 73.8652, 18.5340, 73.8662),
    },
    status: 'ACTIVE',
  },
  {
    id: 'B-306',
    buildingCode: 'BLDG-MH-PUN-306',
    name: 'Tech Tower',
    parcelId: 'PARCEL-MH-PUN-003',
    address: 'Survey 48/A, Baner-Pashan Link Road, Pune, Maharashtra 411045',
    latitude: 18.5679,
    longitude: 73.7749,
    height: 20,
    totalFloors: 5,
    builtUpArea: 40000,
    yearBuilt: 2021,
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.5672, 73.7742, 18.5684, 73.7755),
    },
    status: 'UNDER_CONSTRUCTION',
  },
  // ── Kolte Patil Life Republic Penthouses (PARCEL-MH-PUN-074) ──
  {
    id: 'B-LR-A',
    buildingCode: 'BLDG-LR-A',
    name: 'Tower A',
    parcelId: 'PARCEL-MH-PUN-074',
    address: 'Tower A, Kolte Patil Life Republic, Survey No. 74, Marunji, Mulshi, Pune 411057',
    latitude: 18.6174,
    longitude: 73.7132,
    height: 74.4, // 24 floors × 3.1 m
    totalFloors: 24,
    builtUpArea: 96000, // sq ft
    yearBuilt: 2023,
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.6172, 73.7130, 18.6176, 73.7134),
    },
    status: 'ACTIVE',
  },
  {
    id: 'B-LR-B',
    buildingCode: 'BLDG-LR-B',
    name: 'Tower B',
    parcelId: 'PARCEL-MH-PUN-074',
    address: 'Tower B, Kolte Patil Life Republic, Survey No. 74, Marunji, Mulshi, Pune 411057',
    latitude: 18.6178,
    longitude: 73.7138,
    height: 62.0, // 20 floors × 3.1 m
    totalFloors: 20,
    builtUpArea: 84000, // sq ft
    yearBuilt: 2023,
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.6176, 73.7136, 18.6180, 73.7140),
    },
    status: 'ACTIVE',
  },
  {
    id: 'B-LR-C',
    buildingCode: 'BLDG-LR-C',
    name: 'Tower C',
    parcelId: 'PARCEL-MH-PUN-074',
    address: 'Tower C, Kolte Patil Life Republic, Survey No. 74, Marunji, Mulshi, Pune 411057',
    latitude: 18.6179,
    longitude: 73.7149,
    height: 68.2, // 22 floors × 3.1 m
    totalFloors: 22,
    builtUpArea: 92000, // sq ft
    yearBuilt: 2024,
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.6177, 73.7147, 18.6181, 73.7151),
    },
    status: 'ACTIVE',
  },
  {
    id: 'B-LR-D',
    buildingCode: 'BLDG-LR-D',
    name: 'Tower D',
    parcelId: 'PARCEL-MH-PUN-074',
    address: 'Tower D, Kolte Patil Life Republic, Survey No. 74, Marunji, Mulshi, Pune 411057',
    latitude: 18.6170,
    longitude: 73.7130,
    height: 55.8, // 18 floors × 3.1 m
    totalFloors: 18,
    builtUpArea: 72000, // sq ft
    yearBuilt: 2022,
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.6168, 73.7128, 18.6172, 73.7132),
    },
    status: 'ACTIVE',
  },
  {
    id: 'B-LR-E',
    buildingCode: 'BLDG-LR-E',
    name: 'Tower E',
    parcelId: 'PARCEL-MH-PUN-074',
    address: 'Tower E, Kolte Patil Life Republic, Survey No. 74, Marunji, Mulshi, Pune 411057',
    latitude: 18.6166,
    longitude: 73.7148,
    height: 71.3, // 23 floors × 3.1 m
    totalFloors: 23,
    builtUpArea: 94000, // sq ft
    yearBuilt: 2024,
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.6164, 73.7146, 18.6168, 73.7150),
    },
    status: 'ACTIVE',
  },
];

/** Convenience lookup by ID. */
export const BUILDING_BY_ID = new Map(MOCK_BUILDINGS.map((b) => [b.id, b]));
