/**
 * Centralized Verification Record demo data
 * =========================================
 * 25 verification records covering the full verification lifecycle:
 *   Initial → Pending → Under Review → Field Verification → Verified /
 *   Rejected / Reinspection Required
 *
 * Each record is appended to a PropertyUnit's history via
 * `GISContext.verifyProperty()` / `rejectProperty()` / `requestReinspection()`.
 *
 * The `propertyId` field references the GIS `PropertyUnit.id`.
 */
import type { VerificationRecord } from '@/types/verification';

export const MOCK_VERIFICATIONS: VerificationRecord[] = [
  // ── PROP-102-G01: Verified (2 records) ──
  {
    id: 'VER-001', propertyId: 'PROP-102-G01',
    previousStatus: 'Initial', newStatus: 'Pending',
    verifiedBy: 'System', verifiedByRole: 'SYSTEM',
    verificationDate: '2025-02-15T09:30:00Z',
    notes: 'Property unit ingested into 3D cadastre registry. Demo spatial ID 3D-MH-PUN-102-G01 generated.',
    gpsMatched: true, boundaryMatched: true, confidenceScore: 88,
    method: 'AI_EXTRACTION', source: 'SYSTEM',
  },
  {
    id: 'VER-002', propertyId: 'PROP-102-G01',
    previousStatus: 'Pending', newStatus: 'Verified',
    verifiedBy: 'Dr. Ananya Iyer, IAS', verifiedByRole: 'OFFICER',
    verificationDate: '2025-03-05T14:22:00Z',
    notes: 'RTK GNSS survey confirmed boundary within 5 cm tolerance. Owner KYC verified. Digital Bhu-Aadhaar seal issued.',
    gpsMatched: true, boundaryMatched: true, confidenceScore: 96,
    method: 'RTK_GNSS', source: 'OFFICER',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80',
  },

  // ── PROP-102-0101: Verified (2 records) ──
  {
    id: 'VER-003', propertyId: 'PROP-102-0101',
    previousStatus: 'Pending', newStatus: 'Under Review',
    verifiedBy: 'Dr. Ananya Iyer, IAS', verifiedByRole: 'OFFICER',
    verificationDate: '2025-02-20T10:15:00Z',
    notes: 'Desk audit complete. Title deed cross-referenced with Bhoomi records.',
    gpsMatched: true, boundaryMatched: false, confidenceScore: 82,
    method: 'VISUAL_INSPECTION', source: 'OFFICER',
  },
  {
    id: 'VER-004', propertyId: 'PROP-102-0101',
    previousStatus: 'Under Review', newStatus: 'Verified',
    verifiedBy: 'Dr. Ananya Iyer, IAS', verifiedByRole: 'OFFICER',
    verificationDate: '2025-03-08T16:45:00Z',
    notes: 'Field verification complete. Total station survey confirmed unit boundary.',
    gpsMatched: true, boundaryMatched: true, confidenceScore: 95,
    method: 'TOTAL_STATION', source: 'OFFICER',
    photoUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
  },

  // ── PROP-102-0103: Under Review (2 records) ──
  {
    id: 'VER-005', propertyId: 'PROP-102-0103',
    previousStatus: 'Initial', newStatus: 'Pending',
    verifiedBy: 'System', verifiedByRole: 'SYSTEM',
    verificationDate: '2025-02-18T11:00:00Z',
    notes: 'Property unit ingested. AI 3D extraction confidence 0.88.',
    gpsMatched: true, boundaryMatched: true, confidenceScore: 88,
    method: 'AI_EXTRACTION', source: 'SYSTEM',
  },
  {
    id: 'VER-006', propertyId: 'PROP-102-0103',
    previousStatus: 'Pending', newStatus: 'Under Review',
    verifiedBy: 'Dr. Ananya Iyer, IAS', verifiedByRole: 'OFFICER',
    verificationDate: '2025-03-02T13:30:00Z',
    notes: 'Owner name discrepancy detected. Cross-referencing with mutation records. Field officer dispatched.',
    gpsMatched: false, boundaryMatched: true, confidenceScore: 72,
    method: 'VISUAL_INSPECTION', source: 'OFFICER',
  },

  // ── PROP-102-0202: Under Review (2 records) ──
  {
    id: 'VER-007', propertyId: 'PROP-102-0202',
    previousStatus: 'Initial', newStatus: 'Pending',
    verifiedBy: 'System', verifiedByRole: 'SYSTEM',
    verificationDate: '2025-02-15T09:45:00Z',
    notes: 'Property unit ingested. AI extraction confidence 0.85.',
    gpsMatched: true, boundaryMatched: true, confidenceScore: 85,
    method: 'AI_EXTRACTION', source: 'SYSTEM',
  },
  {
    id: 'VER-008', propertyId: 'PROP-102-0202',
    previousStatus: 'Pending', newStatus: 'Under Review',
    verifiedBy: 'Dr. Ananya Iyer, IAS', verifiedByRole: 'OFFICER',
    verificationDate: '2025-03-10T09:00:00Z',
    notes: 'Boundary overlap conflict detected with adjacent parcel. Under investigation.',
    gpsMatched: true, boundaryMatched: false, confidenceScore: 65,
        method: 'TOTAL_STATION', source: 'OFFICER',
  },

  // ── PROP-102-0401: Reinspection Required (3 records) ──
  {
    id: 'VER-009', propertyId: 'PROP-102-0401',
    previousStatus: 'Initial', newStatus: 'Pending',
    verifiedBy: 'System', verifiedByRole: 'SYSTEM',
    verificationDate: '2025-02-22T08:10:00Z',
    notes: 'Property unit ingested. AI extraction confidence 0.72 (low).',
    gpsMatched: true, boundaryMatched: true, confidenceScore: 72,
    method: 'AI_EXTRACTION', source: 'SYSTEM',
  },
  {
    id: 'VER-010', propertyId: 'PROP-102-0401',
    previousStatus: 'Pending', newStatus: 'Field Verification',
    verifiedBy: 'Inspector Sunita Pawar', verifiedByRole: 'OFFICER',
    verificationDate: '2025-03-03T15:00:00Z',
    notes: 'Field inspection conducted. Owner name requires reconfirmation.',
    gpsMatched: false, boundaryMatched: true, confidenceScore: 68,
    method: 'VISUAL_INSPECTION', source: 'OFFICER',
    photoUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'VER-011', propertyId: 'PROP-102-0401',
    previousStatus: 'Field Verification', newStatus: 'Reinspection Required',
    verifiedBy: 'Dr. Ananya Iyer, IAS', verifiedByRole: 'OFFICER',
    verificationDate: '2025-03-03T17:30:00Z',
    notes: 'Reinspection required — owner details could not be confirmed.',
    gpsMatched: false, boundaryMatched: false, confidenceScore: 55,
    method: 'VISUAL_INSPECTION', source: 'OFFICER',
  },

  // ── PROP-104-0101: Verified (2 records) ──
  {
    id: 'VER-012', propertyId: 'PROP-104-0101',
    previousStatus: 'Initial', newStatus: 'Pending',
    verifiedBy: 'System', verifiedByRole: 'SYSTEM',
    verificationDate: '2025-02-19T10:30:00Z',
    notes: 'Property unit ingested. AI extraction confidence 0.92.',
    gpsMatched: true, boundaryMatched: true, confidenceScore: 92,
    method: 'AI_EXTRACTION', source: 'SYSTEM',
  },
  {
    id: 'VER-013', propertyId: 'PROP-104-0101',
    previousStatus: 'Pending', newStatus: 'Verified',
    verifiedBy: 'Dr. Ananya Iyer, IAS', verifiedByRole: 'OFFICER',
    verificationDate: '2025-03-06T11:20:00Z',
    notes: 'Verification complete. Drone LiDAR scan confirmed unit geometry. Owner KYC matched.',
    gpsMatched: true, boundaryMatched: true, confidenceScore: 92,
    method: 'DRONE_SCAN', source: 'OFFICER',
    photoUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=600&auto=format&fit=crop&q=80',
  },

  // ── PROP-104-0102: Pending (1 record) ──
  {
    id: 'VER-014', propertyId: 'PROP-104-0102',
    previousStatus: 'Initial', newStatus: 'Pending',
    verifiedBy: 'System', verifiedByRole: 'SYSTEM',
    verificationDate: '2025-02-28T09:00:00Z',
    notes: 'Property unit ingested. AI extraction confidence 0.88. Awaiting field verification assignment.',
    gpsMatched: true, boundaryMatched: true, confidenceScore: 88,
    method: 'AI_EXTRACTION', source: 'SYSTEM',
  },

  // ── PROP-104-0201: Pending (1 record) ──
  {
    id: 'VER-015', propertyId: 'PROP-104-0201',
    previousStatus: 'Initial', newStatus: 'Pending',
    verifiedBy: 'System', verifiedByRole: 'SYSTEM',
    verificationDate: '2025-03-01T11:30:00Z',
    notes: 'Property unit ingested from survey record. Confidence 0.89.',
    gpsMatched: true, boundaryMatched: true, confidenceScore: 89,
    method: 'TOTAL_STATION', source: 'SYSTEM',
  },

  // ── PROP-104-0301: Pending (1 record) ──
  {
    id: 'VER-016', propertyId: 'PROP-104-0301',
    previousStatus: 'Initial', newStatus: 'Pending',
    verifiedBy: 'System', verifiedByRole: 'SYSTEM',
    verificationDate: '2025-03-02T14:00:00Z',
    notes: 'Property unit ingested. AI extraction confidence 0.86. Commercial — pending zoning cross-check.',
    gpsMatched: true, boundaryMatched: true, confidenceScore: 86,
    method: 'AI_EXTRACTION', source: 'SYSTEM',
  },

  // ── PROP-104-0401: Rejected (3 records) ──
  {
    id: 'VER-017', propertyId: 'PROP-104-0401',
    previousStatus: 'Initial', newStatus: 'Pending',
    verifiedBy: 'System', verifiedByRole: 'SYSTEM',
    verificationDate: '2025-02-25T10:00:00Z',
    notes: 'Property unit ingested. AI extraction confidence 0.65 (low).',
    gpsMatched: true, boundaryMatched: true, confidenceScore: 65,
    method: 'AI_EXTRACTION', source: 'SYSTEM',
  },
  {
    id: 'VER-018', propertyId: 'PROP-104-0401',
    previousStatus: 'Pending', newStatus: 'Under Review',
    verifiedBy: 'Dr. Ananya Iyer, IAS', verifiedByRole: 'OFFICER',
    verificationDate: '2025-03-04T12:15:00Z',
    notes: 'Owner name mismatch — registered as "Innovate Labs India" but tax records show different name.',
    gpsMatched: true, boundaryMatched: false, confidenceScore: 58,
    method: 'VISUAL_INSPECTION', source: 'OFFICER',
  },
  {
    id: 'VER-019', propertyId: 'PROP-104-0401',
    previousStatus: 'Under Review', newStatus: 'Rejected',
    verifiedBy: 'Dr. Ananya Iyer, IAS', verifiedByRole: 'OFFICER',
    verificationDate: '2025-03-09T16:00:00Z',
    notes: 'REJECTED — Owner could not be verified. Missing registration documents.',
    gpsMatched: true, boundaryMatched: true, confidenceScore: 40,
    method: 'VISUAL_INSPECTION', source: 'OFFICER',
  },

  // ── PROP-306-0101: Verified (2 records) ──
  {
    id: 'VER-020', propertyId: 'PROP-306-0101',
    previousStatus: 'Initial', newStatus: 'Pending',
    verifiedBy: 'System', verifiedByRole: 'SYSTEM',
    verificationDate: '2025-02-17T09:00:00Z',
    notes: 'Property unit ingested. AI extraction confidence 0.95. Linked to PropertyItem prop-pun-003.',
    gpsMatched: true, boundaryMatched: true, confidenceScore: 95,
    method: 'AI_EXTRACTION', source: 'SYSTEM',
  },
  {
    id: 'VER-021', propertyId: 'PROP-306-0101',
    previousStatus: 'Pending', newStatus: 'Verified',
    verifiedBy: 'Dr. Ananya Iyer, IAS', verifiedByRole: 'OFFICER',
    verificationDate: '2025-03-04T13:40:00Z',
    notes: 'Verification complete. RTK GNSS match within 3 cm tolerance.',
    gpsMatched: true, boundaryMatched: true, confidenceScore: 95,
    method: 'RTK_GNSS', source: 'OFFICER',
    photoUrl: 'https://images.unsplash.com/photo-1545324754-9e2d71398916?w=600&auto=format&fit=crop&q=80',
  },

  // ── PROP-306-0201: Reinspection Required (3 records) ──
  {
    id: 'VER-022', propertyId: 'PROP-306-0201',
    previousStatus: 'Initial', newStatus: 'Pending',
    verifiedBy: 'System', verifiedByRole: 'SYSTEM',
    verificationDate: '2025-02-20T11:00:00Z',
    notes: 'Property unit ingested. AI extraction confidence 0.78.',
    gpsMatched: true, boundaryMatched: true, confidenceScore: 78,
    method: 'AI_EXTRACTION', source: 'SYSTEM',
  },
  {
    id: 'VER-023', propertyId: 'PROP-306-0201',
    previousStatus: 'Pending', newStatus: 'Field Verification',
    verifiedBy: 'Inspector Sunita Pawar', verifiedByRole: 'OFFICER',
    verificationDate: '2025-03-06T10:00:00Z',
    notes: 'Drone scan conducted. Building has Missing Boundary spatial conflict.',
    gpsMatched: false, boundaryMatched: false, confidenceScore: 62,
    method: 'DRONE_SCAN', source: 'OFFICER',
    photoUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'VER-024', propertyId: 'PROP-306-0201',
    previousStatus: 'Field Verification', newStatus: 'Reinspection Required',
    verifiedBy: 'Dr. Ananya Iyer, IAS', verifiedByRole: 'OFFICER',
    verificationDate: '2025-03-07T09:30:00Z',
    notes: 'Reinspection required — boundary geometry missing from records.',
    gpsMatched: false, boundaryMatched: false, confidenceScore: 50,
    method: 'DRONE_SCAN', source: 'OFFICER',
  },

  // ── PROP-306-G01: Pending (1 record) ──
  {
    id: 'VER-025', propertyId: 'PROP-306-G01',
    previousStatus: 'Initial', newStatus: 'Pending',
    verifiedBy: 'System', verifiedByRole: 'SYSTEM',
    verificationDate: '2025-03-01T08:00:00Z',
    notes: 'Property unit ingested. Confidence 0.88. Awaiting field verification.',
    gpsMatched: true, boundaryMatched: false, confidenceScore: 88,
    method: 'TOTAL_STATION', source: 'SYSTEM',
  },
];

// ── Convenience lookups ─────────────────────────────────────────────────────

export const VERIFICATION_BY_ID = new Map(MOCK_VERIFICATIONS.map((v) => [v.id, v]));
export const VERIFICATIONS_BY_PROPERTY = MOCK_VERIFICATIONS.reduce((acc, v) => {
  (acc[v.propertyId] = acc[v.propertyId] || []).push(v);
  return acc;
}, {} as Record<string, VerificationRecord[]>);
