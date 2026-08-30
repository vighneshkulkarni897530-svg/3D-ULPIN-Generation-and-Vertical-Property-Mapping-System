/**
 * Centralized Spatial Conflict demo data
 * =======================================
 * 3 spatial conflicts detected during GIS analysis.
 *
 * Hierarchy:  LandParcel → Building → Floor → PropertyUnit → Conflict
 *
 * Conflict IDs follow the pattern: CONFLICT-001
 * Conflict numbers follow the pattern: CON-2025-001
 */
import type { SpatialConflict } from '@/types/conflict';

function poly(coords: [number, number][]): import('@/types/gis').Geometry {
  return {
    type: 'Polygon',
    coordinates: [coords.map(([lng, lat]) => [lng, lat]) as [number, number][]],
  };
}

export const MOCK_CONFLICTS: SpatialConflict[] = [
  // ── Conflict 1: Boundary Overlap (Critical) ──
  // Parcels PARCEL-MH-PUN-001 and PARCEL-MH-PUN-002 share an overlapping
  // boundary segment. Affects units near the shared edge.
  {
    id: 'CONFLICT-001',
    conflictNumber: 'CON-2025-001',
    type: 'Boundary Overlap',
    severity: 'Critical',
    status: 'Pending Review',
    parcelId: 'PARCEL-MH-PUN-001',
    buildingId: 'B-102',
    affectedPropertyIds: ['PROP-102-0202', 'PROP-104-G01'],
    description:
      'Cadastral boundary of PARCEL-MH-PUN-001 (Shivaji Nagar) overlaps with ' +
      'PARCEL-MH-PUN-002 (Koregaon Park) by approximately 1.2 metres along the ' +
      'eastern edge. Units PROP-102-0202 and PROP-104-G01 are in the affected zone.',
    detectedAt: '2025-03-10T06:45:00Z',
    geometry: poly([
      [73.8543, 18.5330],
      [73.8548, 18.5330],
      [73.8548, 18.5334],
      [73.8543, 18.5334],
    ]),
  },

  // ── Conflict 2: Missing Boundary (High) ──
  // Building B-306 has no survey boundary polygon recorded in the registry.
  {
    id: 'CONFLICT-002',
    conflictNumber: 'CON-2025-002',
    type: 'Missing Boundary',
    severity: 'High',
    status: 'Under Investigation',
    parcelId: 'PARCEL-MH-PUN-003',
    buildingId: 'B-306',
    affectedPropertyIds: ['PROP-306-G01', 'PROP-306-0101', 'PROP-306-0201', 'PROP-306-0301'],
    description:
      'Building B-306 (Tech Tower) on parcel PARCEL-MH-PUN-003 is missing its ' +
      'survey boundary polygon in the cadastral records. Without the boundary, ' +
      'unit-level verification cannot proceed for 4 affected units.',
    detectedAt: '2025-03-08T14:20:00Z',
    geometry: poly([
      [73.7742, 18.5670],
      [73.7755, 18.5670],
      [73.7755, 18.5678],
      [73.7742, 18.5678],
    ]),
  },

  // ── Conflict 3: Duplicate Spatial ID (Medium) ──
  // Demo spatial IDs for PROP-102-0101 and PROP-306-0101 share the same
  // numeric suffix pattern, creating a potential collision in the AI
  // extraction pipeline.
  {
    id: 'CONFLICT-003',
    conflictNumber: 'CON-2025-003',
    type: 'Duplicate Spatial ID',
    severity: 'Medium',
    status: 'Pending Review',
    parcelId: 'PARCEL-MH-PUN-003',
    buildingId: 'B-306',
    affectedPropertyIds: ['PROP-102-0101', 'PROP-306-0101'],
    description:
      'Demo spatial ID collision detected: both PROP-102-0101 ' +
      '(3D-MH-PUN-102-0101) and PROP-306-0101 (3D-MH-PUN-306-0101) share the ' +
      'same unit-number suffix "0101". The AI extraction pipeline flagged this ' +
      'as a potential duplicate spatial ID. No ownership conflict confirmed yet.',
    detectedAt: '2025-03-09T11:10:00Z',
    geometry: poly([
      [73.7747, 18.5678],
      [73.7750, 18.5678],
      [73.7750, 18.5680],
      [73.7747, 18.5680],
    ]),
  },
];

/** Lookup by conflict ID. */
export const CONFLICT_BY_ID = new Map(MOCK_CONFLICTS.map((c) => [c.id, c]));
