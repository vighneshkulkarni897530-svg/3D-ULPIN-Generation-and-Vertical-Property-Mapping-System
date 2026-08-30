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
    location: 'Shivaji Nagar, North Main Road',
    district: 'Pune',
    state: 'Maharashtra',
    area: 8500, // ~0.85 ha ≈ 2.1 acres
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.5310, 73.8530, 18.5325, 73.8548),
    },
    centroid: { lat: 18.5318, lng: 73.8539 },
    latitude: 18.5318,
    longitude: 73.8539,
    status: 'ACTIVE',
    createdAt: '2023-01-15T00:00:00Z',
    updatedAt: '2024-03-10T08:30:00Z',
  },
  {
    id: 'PARCEL-MH-PUN-002',
    parcelNumber: 'MH-PUN-SUR-088/A',
    location: 'Koregaon Park, Lane 27',
    district: 'Pune',
    state: 'Maharashtra',
    area: 6200, // ~0.62 ha ≈ 1.5 acres
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.5330, 73.8650, 18.5342, 73.8665),
    },
    centroid: { lat: 18.5336, lng: 73.8657 },
    latitude: 18.5336,
    longitude: 73.8657,
    status: 'ACTIVE',
    createdAt: '2023-02-20T00:00:00Z',
    updatedAt: '2024-02-28T14:45:00Z',
  },
  {
    id: 'PARCEL-MH-PUN-003',
    parcelNumber: 'MH-PUN-SUR-048/A',
    location: 'Baner-Pashan Link Road, Survey 48/A',
    district: 'Pune',
    state: 'Maharashtra',
    area: 12000, // ~1.2 ha ≈ 3 acres
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.5670, 73.7740, 18.5688, 73.7758),
    },
    centroid: { lat: 18.5679, lng: 73.7749 },
    latitude: 18.5679,
    longitude: 73.7749,
    status: 'ACTIVE',
    createdAt: '2022-11-05T00:00:00Z',
    updatedAt: '2024-03-01T10:15:00Z',
  },
  {
    id: 'PARCEL-MH-PUN-004',
    parcelNumber: 'MH-PUN-SUR-096',
    location: 'Wakad, Pimple Saudagar Sector 26',
    district: 'Pune',
    state: 'Maharashtra',
    area: 9800, // ~0.98 ha ≈ 2.4 acres
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.5900, 73.7600, 18.5915, 73.7618),
    },
    centroid: { lat: 18.5908, lng: 73.7609 },
    latitude: 18.5908,
    longitude: 73.7609,
    status: 'DISPUTED',
    createdAt: '2023-04-12T00:00:00Z',
    updatedAt: '2024-03-05T16:20:00Z',
  },
  {
    id: 'PARCEL-MH-PUN-005',
    parcelNumber: 'MH-PUN-SUR-017/B',
    location: 'Hinjewadi, Phase 3, Rajiv Gandhi Infotech Park',
    district: 'Pune',
    state: 'Maharashtra',
    area: 15000, // ~1.5 ha ≈ 3.7 acres
    geometry: {
      type: 'Polygon',
      coordinates: rectCoords(18.5910, 73.7030, 18.5925, 73.7050),
    },
    centroid: { lat: 18.5918, lng: 73.7040 },
    latitude: 18.5918,
    longitude: 73.7040,
    status: 'ACTIVE',
    createdAt: '2023-06-30T00:00:00Z',
    updatedAt: '2024-03-08T09:10:00Z',
  },
];

/** Convenience lookup by ID. */
export const PARCEL_BY_ID = new Map(MOCK_PARCELS.map((p) => [p.id, p]));
