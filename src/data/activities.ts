/**
 * Centralized Activity Feed demo data
 * ====================================
 * 15 activity records covering: property verification, conflict detection,
 * conflict resolution, data update, building update, AI extraction, and
 * 3D reconstruction.
 *
 * IDs follow the pattern: ACT-001, ACT-002, …
 */
import type { ActivityRecord } from '@/types/activity';

export const MOCK_ACTIVITIES: ActivityRecord[] = [
  // ── Property Verification ──
  {
    id: 'ACT-001', type: 'PROPERTY_VERIFICATION',
    title: 'Property Verified',
    description: 'PROP-102-G01 (Green View Residency) verified via RTK GNSS. Confidence: 96%. Bhu-Aadhaar seal issued.',
    entityType: 'PROPERTY', entityId: 'PROP-102-G01',
    timestamp: '2025-03-05T14:22:00Z',
    user: 'Dr. Ananya Iyer, IAS', userRole: 'OFFICER', status: 'COMPLETED',
    metadata: { method: 'RTK_GNSS', confidence: 96 },
  },
  {
    id: 'ACT-002', type: 'PROPERTY_VERIFICATION',
    title: 'Property Verified',
    description: 'PROP-102-0101 verified via Total Station survey. Boundary confirmed.',
    entityType: 'PROPERTY', entityId: 'PROP-102-0101',
    timestamp: '2025-03-08T16:45:00Z',
    user: 'Dr. Ananya Iyer, IAS', userRole: 'OFFICER', status: 'COMPLETED',
    metadata: { method: 'TOTAL_STATION', confidence: 95 },
  },
  {
    id: 'ACT-003', type: 'PROPERTY_VERIFICATION',
    title: 'Property Verified',
    description: 'PROP-306-0101 verified via RTK GNSS. Linked to existing PropertyItem prop-pun-003.',
    entityType: 'PROPERTY', entityId: 'PROP-306-0101',
    timestamp: '2025-03-04T13:40:00Z',
    user: 'Dr. Ananya Iyer, IAS', userRole: 'OFFICER', status: 'COMPLETED',
    metadata: { method: 'RTK_GNSS', confidence: 95, linkedPropertyId: 'prop-pun-003' },
  },

  // ── Conflict Detection ──
  {
    id: 'ACT-004', type: 'CONFLICT_DETECTION',
    title: 'Boundary Overlap Detected',
    description: 'CON-2025-001: Boundary overlap between parcels PARCEL-MH-PUN-001 and PARCEL-MH-PUN-002. Severity: Critical.',
    entityType: 'CONFLICT', entityId: 'CONFLICT-001',
    timestamp: '2025-03-10T06:45:00Z',
    user: 'System', userRole: 'SYSTEM', status: 'COMPLETED',
    metadata: { conflictType: 'Boundary Overlap', severity: 'Critical', parcelCount: 2 },
  },
  {
    id: 'ACT-005', type: 'CONFLICT_DETECTION',
    title: 'Missing Boundary Detected',
    description: 'CON-2025-002: Building B-306 has no survey boundary polygon recorded.',
    entityType: 'CONFLICT', entityId: 'CONFLICT-002',
    timestamp: '2025-03-08T14:20:00Z',
    user: 'System', userRole: 'SYSTEM', status: 'COMPLETED',
    metadata: { conflictType: 'Missing Boundary', severity: 'High', affectedUnits: 4 },
  },
  {
    id: 'ACT-006', type: 'CONFLICT_DETECTION',
    title: 'Duplicate Spatial ID Detected',
    description: 'CON-2025-003: Demo spatial ID collision between PROP-102-0101 and PROP-306-0101.',
    entityType: 'CONFLICT', entityId: 'CONFLICT-003',
    timestamp: '2025-03-09T11:10:00Z',
    user: 'AI Agent', userRole: 'AI_AGENT', status: 'COMPLETED',
    metadata: { conflictType: 'Duplicate Spatial ID', severity: 'Medium', affectedUnits: 2 },
  },

  // ── Conflict Resolution ──
  {
    id: 'ACT-007', type: 'CONFLICT_RESOLUTION',
    title: 'Conflict Resolved',
    description: 'Boundary overlap CONFLICT-001 resolved after resurvey. New boundary marker installed.',
    entityType: 'CONFLICT', entityId: 'CONFLICT-001',
    timestamp: '2025-03-11T10:30:00Z',
    user: 'Inspector Sunita Pawar', userRole: 'OFFICER', status: 'COMPLETED',
    metadata: { method: 'RTK_GNSS', newBoundaryMarker: true, reverifiedUnits: 2 },
  },

  // ── Data Update ──
  {
    id: 'ACT-008', type: 'DATA_UPDATE',
    title: 'Parcel Data Updated',
    description: 'Parcel PARCEL-MH-PUN-004 status changed from ACTIVE to DISPUTED.',
    entityType: 'PARCEL', entityId: 'PARCEL-MH-PUN-004',
    timestamp: '2025-03-09T15:40:00Z',
    user: 'System', userRole: 'SYSTEM', status: 'COMPLETED',
    metadata: { field: 'status', oldValue: 'ACTIVE', newValue: 'DISPUTED' },
  },

  // ── Building Update ──
  {
    id: 'ACT-009', type: 'BUILDING_UPDATE',
    title: 'Building Status Updated',
    description: 'Building B-306 status changed to UNDER_CONSTRUCTION following foundation inspection.',
    entityType: 'BUILDING', entityId: 'B-306',
    timestamp: '2025-03-06T11:00:00Z',
    user: 'Municipal Inspector', userRole: 'OFFICER', status: 'COMPLETED',
        metadata: { field: 'status', oldValue: 'ACTIVE', newValue: 'UNDER_CONSTRUCTION' },
  },

  // ── AI Extraction ──
  {
    id: 'ACT-010', type: 'AI_EXTRACTION',
    title: '3D Point Cloud Processing Complete',
    description: 'AI extraction pipeline processed drone LiDAR scan for B-102. 10 property units extracted, 92% avg confidence.',
    entityType: 'BUILDING', entityId: 'B-102',
    timestamp: '2025-03-01T07:30:00Z',
    user: 'AI Agent', userRole: 'AI_AGENT', status: 'COMPLETED',
    metadata: { source: 'DRONE_SCAN', unitsExtracted: 10, avgConfidence: 0.92, processingTimeSec: 142 },
  },
  {
    id: 'ACT-011', type: 'AI_EXTRACTION',
    title: '3D Point Cloud Processing Complete',
    description: 'AI extraction pipeline processed drone LiDAR scan for B-104. 6 property units extracted, 88% avg confidence.',
    entityType: 'BUILDING', entityId: 'B-104',
    timestamp: '2025-03-02T07:30:00Z',
    user: 'AI Agent', userRole: 'AI_AGENT', status: 'COMPLETED',
    metadata: { source: 'DRONE_SCAN', unitsExtracted: 6, avgConfidence: 0.88, processingTimeSec: 98 },
  },
  {
    id: 'ACT-012', type: 'AI_EXTRACTION',
    title: '3D Point Cloud Processing Complete',
    description: 'AI extraction for B-306. 4 units extracted, 84% avg confidence. Duplicate spatial ID flagged.',
    entityType: 'BUILDING', entityId: 'B-306',
    timestamp: '2025-03-03T07:30:00Z',
    user: 'AI Agent', userRole: 'AI_AGENT', status: 'COMPLETED',
    metadata: { source: 'DRONE_SCAN', unitsExtracted: 4, avgConfidence: 0.84, warnings: 1 },
  },

  // ── 3D Reconstruction ──
  {
    id: 'ACT-013', type: '3D_RECONSTRUCTION',
    title: '3D Digital Twin Reconstructed',
    description: 'Building B-102 digital twin reconstructed. 5 floors, 12 total units.',
    entityType: 'BUILDING', entityId: 'B-102',
    timestamp: '2025-03-01T12:00:00Z',
    user: 'AI Agent', userRole: 'AI_AGENT', status: 'COMPLETED',
    metadata: { floors: 5, totalUnits: 12, source: 'DRONE_SCAN', resolution: '2.5cm' },
  },
  {
    id: 'ACT-014', type: '3D_RECONSTRUCTION',
    title: '3D Digital Twin Reconstructed',
    description: 'Building B-104 digital twin reconstructed. 5 floors, 7 total units.',
    entityType: 'BUILDING', entityId: 'B-104',
    timestamp: '2025-03-02T12:00:00Z',
    user: 'AI Agent', userRole: 'AI_AGENT', status: 'COMPLETED',
    metadata: { floors: 5, totalUnits: 7, source: 'DRONE_SCAN', resolution: '2.5cm' },
  },
  {
    id: 'ACT-015', type: '3D_RECONSTRUCTION',
    title: '3D Digital Twin Reconstructed',
    description: 'Building B-306 digital twin reconstructed. 5 floors, 8 total units.',
    entityType: 'BUILDING', entityId: 'B-306',
    timestamp: '2025-03-03T12:00:00Z',
    user: 'AI Agent', userRole: 'AI_AGENT', status: 'COMPLETED',
    metadata: { floors: 5, totalUnits: 8, source: 'DRONE_SCAN', resolution: '2.5cm' },
  },
];

/** Convenience lookup. */
export const ACTIVITY_BY_ID = new Map(MOCK_ACTIVITIES.map((a) => [a.id, a]));
