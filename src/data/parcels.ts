/**
 * Centralized Land Parcel demo data
 * ====================================
 * Five realistic cadastral parcels around Pune, Maharashtra.
 * These are the top-level entities in the unified GIS hierarchy:
 *
 *   LandParcel → Building → Floor → PropertyUnit
 *
 * IDs follow the pattern: PARCEL-MH-PUN-001
 */
import type { LandParcel } from '@/types/gis';

/** Helper: polygon coordinates for a simple rectangular parcel. */
function rectCoords(swLat: number, swLng: number, neLat: number, neLng: number) {
  return [
    [swLng, swLat],
    [neLng, swLat],
    [neLng, neLat],
    [swLng, neLat],
    [swLng, swLat], // close the ring
  ];
}

export const MOCK_PARCELS: LandParcel[] = [
  {
    id: 'PARCEL-MH-PUN-001',
    parcelNumber: 'MH-PUN-SUR-042/B',
    location: 'Sector 1, North Main Road, Shivaji Nagar Cadastre',
    district: 'Pune',
    state: 'Maharashtra',
    area: 8500, // ~0.85 ha ≈ 2.1 acres
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.5905, 73.7380, 18.5920, 73.7400),
    },
    centroid: { lat: 18.59125, lng: 73.7390 },
    latitude: 18.59125,
    longitude: 73.7390,
    status: 'ACTIVE',
    createdAt: '2023-01-15T00:00:00Z',
    updatedAt: '2024-03-10T08:30:00Z',
  },
  {
    id: 'PARCEL-MH-PUN-002',
    parcelNumber: 'MH-PUN-SUR-088/A',
    location: 'Sector 2, Koregaon Park Arcade Block',
    district: 'Pune',
    state: 'Maharashtra',
    area: 6200, // ~0.62 ha ≈ 1.5 acres
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.5905, 73.7405, 18.5920, 73.7425),
    },
    centroid: { lat: 18.59125, lng: 73.7415 },
    latitude: 18.59125,
    longitude: 73.7415,
    status: 'ACTIVE',
    createdAt: '2023-02-20T00:00:00Z',
    updatedAt: '2024-02-28T14:45:00Z',
  },
  {
    id: 'PARCEL-MH-PUN-003',
    parcelNumber: 'MH-PUN-SUR-048/A',
    location: 'Sector 3, Baner IT Corridor Link',
    district: 'Pune',
    state: 'Maharashtra',
    area: 12000, // ~1.2 ha ≈ 3 acres
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.5905, 73.7430, 18.5920, 73.7450),
    },
    centroid: { lat: 18.59125, lng: 73.7440 },
    latitude: 18.59125,
    longitude: 73.7440,
    status: 'ACTIVE',
    createdAt: '2022-11-05T00:00:00Z',
    updatedAt: '2024-03-01T10:15:00Z',
  },
  {
    id: 'PARCEL-MH-PUN-004',
    parcelNumber: 'MH-PUN-SUR-096',
    location: 'Sector 4, Wakad Heights Sector 26',
    district: 'Pune',
    state: 'Maharashtra',
    area: 9800, // ~0.98 ha ≈ 2.4 acres
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.5930, 73.7380, 18.5945, 73.7400),
    },
    centroid: { lat: 18.59375, lng: 73.7390 },
    latitude: 18.59375,
    longitude: 73.7390,
    status: 'DISPUTED',
    createdAt: '2023-04-12T00:00:00Z',
    updatedAt: '2024-03-05T16:20:00Z',
  },
  {
    id: 'PARCEL-MH-PUN-005',
    parcelNumber: 'MH-PUN-SUR-017/B',
    location: 'Sector 5, Hinjewadi Tech Park Block 17/B',
    district: 'Pune',
    state: 'Maharashtra',
    area: 15000, // ~1.5 ha ≈ 3.7 acres
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.5930, 73.7405, 18.5945, 73.7425),
    },
    centroid: { lat: 18.59375, lng: 73.7415 },
    latitude: 18.59375,
    longitude: 73.7415,
    status: 'ACTIVE',
    createdAt: '2023-06-30T00:00:00Z',
    updatedAt: '2024-03-08T09:10:00Z',
  },
  {
    id: 'PARCEL-MH-PUN-006',
    parcelNumber: 'MH-PUN-SUR-112/A',
    location: 'Sector 6, Amanora Cyber Sector 14, Hadapsar Link',
    district: 'Pune',
    state: 'Maharashtra',
    area: 14200, // ~1.42 ha ≈ 3.5 acres
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.5930, 73.7430, 18.5945, 73.7450),
    },
    centroid: { lat: 18.59375, lng: 73.7440 },
    latitude: 18.59375,
    longitude: 73.7440,
    status: 'ACTIVE',
    createdAt: '2023-08-15T00:00:00Z',
    updatedAt: '2024-03-09T11:20:00Z',
  },
  {
    id: 'PARCEL-MH-PUN-074',
    parcelNumber: 'MH-PUN-SUR-074',
    location: 'Sector 7, Survey No. 74, Marunji-Hinjewadi Grand Master Township',
    district: 'Pune',
    state: 'Maharashtra',
    area: 18500, // ~1.85 ha ≈ 4.57 acres
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.5955, 73.7380, 18.5980, 73.7450),
    },
    centroid: { lat: 18.59675, lng: 73.7415 },
    latitude: 18.59675,
    longitude: 73.7415,
    status: 'ACTIVE',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
];

/** Convenience lookup by ID. */
export const PARCEL_BY_ID = new Map(MOCK_PARCELS.map((p) => [p.id, p]));

