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
];

/** Convenience lookup by ID. */
export const BUILDING_BY_ID = new Map(MOCK_BUILDINGS.map((b) => [b.id, b]));
