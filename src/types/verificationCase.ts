/**
 * Verification Cases, Discrepancies & Evidence Domain Types (Phase 8)
 * ====================================================================
 * Firestore-backed types for:
 *   - discrepancies/{discrepancyId}
 *   - verificationCases/{caseId}
 *   - verificationCases/{caseId}/notes/{noteId} or verificationNotes/{noteId}
 *   - evidence/{evidenceId}
 *   - verificationHistory/{historyId}
 */

import type { FirestoreTimestamp, VerificationTargetType } from './society';

// ── Discrepancy Types ───────────────────────────────────────────────────────

export const DISCREPANCY_TYPES = [
  'BOUNDARY_MISMATCH',
  'BUILDING_STRUCTURE_MISMATCH',
  'FLOOR_STRUCTURE_MISMATCH',
  'UNIT_RECORD_MISMATCH',
  'SPATIAL_COORDINATE_MISMATCH',
  'ULPIN_MISMATCH',
  'DOCUMENT_MISMATCH',
  'UNAUTHORIZED_STRUCTURE',
  'OTHER',
] as const;

export type DiscrepancyType = (typeof DISCREPANCY_TYPES)[number];

export const DISCREPANCY_TYPE_LABELS: Record<DiscrepancyType, string> = {
  BOUNDARY_MISMATCH: 'Boundary Mismatch',
  BUILDING_STRUCTURE_MISMATCH: 'Building Structure Mismatch',
  FLOOR_STRUCTURE_MISMATCH: 'Floor Structure Mismatch',
  UNIT_RECORD_MISMATCH: 'Unit Record Mismatch',
  SPATIAL_COORDINATE_MISMATCH: 'Spatial Coordinate Mismatch',
  ULPIN_MISMATCH: 'ULPIN Mismatch',
  DOCUMENT_MISMATCH: 'Document / Proof Mismatch',
  UNAUTHORIZED_STRUCTURE: 'Recorded Structure Discrepancy',
  OTHER: 'Other Recorded Discrepancy',
};

export const DISCREPANCY_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type DiscrepancySeverity = (typeof DISCREPANCY_SEVERITIES)[number];

export const DISCREPANCY_SEVERITY_LABELS: Record<DiscrepancySeverity, string> = {
  LOW: 'Low Severity',
  MEDIUM: 'Medium Severity',
  HIGH: 'High Severity',
  CRITICAL: 'Critical Severity',
};

export const DISCREPANCY_SEVERITY_VARIANTS: Record<
  DiscrepancySeverity,
  'secondary' | 'warning' | 'destructive' | 'default'
> = {
  LOW: 'secondary',
  MEDIUM: 'warning',
  HIGH: 'destructive',
  CRITICAL: 'destructive',
};

export const CASE_STATUSES = [
  'OPEN',
  'ASSIGNED',
  'UNDER_INVESTIGATION',
  'EVIDENCE_REQUIRED',
  'REINSPECTION_REQUIRED',
  'RESOLVED',
  'REJECTED',
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  OPEN: 'Open',
  ASSIGNED: 'Officer Assigned',
  UNDER_INVESTIGATION: 'Under Investigation',
  EVIDENCE_REQUIRED: 'Evidence Required',
  REINSPECTION_REQUIRED: 'Reinspection Required',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
};

export const CASE_STATUS_VARIANTS: Record<
  CaseStatus,
  'destructive' | 'warning' | 'default' | 'success' | 'secondary'
> = {
  OPEN: 'destructive',
  ASSIGNED: 'default',
  UNDER_INVESTIGATION: 'warning',
  EVIDENCE_REQUIRED: 'warning',
  REINSPECTION_REQUIRED: 'warning',
  RESOLVED: 'success',
  REJECTED: 'secondary',
};

/**
 * Enhanced Firestore shape for `discrepancies/{discrepancyId}`.
 */
export interface PropertyDiscrepancyDocument {
  societyId: string;
  buildingId?: string | null;
  floorId?: string | null;
  flatId?: string | null;
  propertyId?: string | null;
  caseId?: string | null;
  type: DiscrepancyType;
  title: string;
  description: string;
  severity: DiscrepancySeverity;
  status: CaseStatus;
  location?: {
    latitude: number;
    longitude: number;
  } | null;
  createdBy: string; // Authenticated UID
  createdByName?: string | null;
  assignedOfficerId?: string | null;
  assignedOfficerName?: string | null;
  resolution?: string | null;
  resolvedAt?: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export type PropertyDiscrepancy = PropertyDiscrepancyDocument & { id: string };

// ── Evidence Types ──────────────────────────────────────────────────────────

export const EVIDENCE_TYPES = [
  'PROPERTY_PHOTO',
  'INSPECTION_PHOTO',
  'SUPPORTING_DOCUMENT',
  'FIELD_EVIDENCE',
  'GIS_SCREENSHOT',
  'OTHER',
] as const;

export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  PROPERTY_PHOTO: 'Property Photograph',
  INSPECTION_PHOTO: 'Field Inspection Photo',
  SUPPORTING_DOCUMENT: 'Supporting Document (PDF/Doc)',
  FIELD_EVIDENCE: 'Field Measurement Evidence',
  GIS_SCREENSHOT: 'GIS Cadastre Screenshot',
  OTHER: 'Other Supporting Evidence',
};

/**
 * Firestore document shape for `evidence/{evidenceId}`.
 */
export interface VerificationEvidenceDocument {
  caseId?: string | null;
  discrepancyId?: string | null;
  societyId: string;
  buildingId?: string | null;
  floorId?: string | null;
  flatId?: string | null;
  propertyId?: string | null;
  type: EvidenceType;
  fileName: string;
  fileSize: number; // in bytes
  mimeType: string;
  storagePath: string;
  downloadUrl: string;
  uploadedBy: string; // Authenticated UID
  uploadedByName?: string | null;
  uploadedByRole: 'government-officer' | 'society-admin' | 'resident' | 'super-admin';
  description: string;
  createdAt: FirestoreTimestamp;
}

export type VerificationEvidence = VerificationEvidenceDocument & { id: string };

// ── Investigation Notes ─────────────────────────────────────────────────────

export interface InvestigationNoteDocument {
  caseId: string;
  text: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt: FirestoreTimestamp;
}

export type InvestigationNote = InvestigationNoteDocument & { id: string };

// ── Verification Cases ──────────────────────────────────────────────────────

export const VERIFICATION_DECISIONS = [
  'VERIFIED',
  'REQUIRES_CORRECTION',
  'REINSPECTION_REQUIRED',
  'REJECTED',
] as const;

export type VerificationDecision = (typeof VERIFICATION_DECISIONS)[number];

export const VERIFICATION_DECISION_LABELS: Record<VerificationDecision, string> = {
  VERIFIED: 'Cadastral Verified / Approved',
  REQUIRES_CORRECTION: 'Requires Data Correction',
  REINSPECTION_REQUIRED: 'Requires Reinspection',
  REJECTED: 'Verification Rejected',
};

export const VERIFICATION_DECISION_VARIANTS: Record<
  VerificationDecision,
  'success' | 'warning' | 'destructive' | 'secondary'
> = {
  VERIFIED: 'success',
  REQUIRES_CORRECTION: 'warning',
  REINSPECTION_REQUIRED: 'warning',
  REJECTED: 'destructive',
};

/**
 * Firestore document shape for `verificationCases/{caseId}`.
 */
export interface VerificationCaseDocument {
  caseNumber: string; // e.g. CASE-2026-0001
  title: string;
  societyId: string;
  buildingId?: string | null;
  floorId?: string | null;
  flatId?: string | null;
  propertyId?: string | null;
  discrepancyIds: string[];
  status: CaseStatus;
  severity: DiscrepancySeverity;
  assignedOfficerId?: string | null;
  assignedOfficerName?: string | null;
  assignedAt?: FirestoreTimestamp;
  createdBy: string;
  createdByName?: string | null;
  decision?: VerificationDecision | null;
  decisionReason?: string | null;
  decisionMadeBy?: string | null;
  decisionMadeByName?: string | null;
  decisionMadeAt?: FirestoreTimestamp;
  closedAt?: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export type VerificationCase = VerificationCaseDocument & { id: string };

// ── Audit History ───────────────────────────────────────────────────────────

export const AUDIT_ACTIONS = [
  'CASE_CREATED',
  'CASE_ASSIGNED',
  'EVIDENCE_ADDED',
  'STATUS_CHANGED',
  'NOTE_ADDED',
  'DECISION_MADE',
  'CASE_REOPENED',
  'CASE_CLOSED',
  'DISCREPANCY_FLAGGED',
  'DISCREPANCY_RESOLVED',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface CaseAuditHistoryDocument {
  caseId?: string | null;
  discrepancyId?: string | null;
  societyId: string;
  buildingId?: string | null;
  floorId?: string | null;
  flatId?: string | null;
  action: AuditAction;
  previousStatus: string | null;
  newStatus: string;
  performedBy: string; // Authenticated UID
  performedByName?: string | null;
  performedByRole?: string | null;
  reason: string;
  createdAt: FirestoreTimestamp;
}

export type CaseAuditHistory = CaseAuditHistoryDocument & { id: string };

// ── Form & Payload Types ────────────────────────────────────────────────────

export interface CreateDiscrepancyInput {
  societyId: string;
  buildingId?: string | null;
  floorId?: string | null;
  flatId?: string | null;
  propertyId?: string | null;
  type: DiscrepancyType;
  title: string;
  description: string;
  severity: DiscrepancySeverity;
  location?: {
    latitude: number;
    longitude: number;
  } | null;
  openVerificationCase?: boolean;
}

export interface CreateVerificationCaseInput {
  title: string;
  societyId: string;
  buildingId?: string | null;
  floorId?: string | null;
  flatId?: string | null;
  propertyId?: string | null;
  discrepancyIds: string[];
  severity: DiscrepancySeverity;
  assignedOfficerId?: string | null;
  assignedOfficerName?: string | null;
  initialNote?: string | null;
}

export interface UploadEvidenceInput {
  caseId?: string | null;
  discrepancyId?: string | null;
  societyId: string;
  buildingId?: string | null;
  floorId?: string | null;
  flatId?: string | null;
  propertyId?: string | null;
  type: EvidenceType;
  file: File;
  description: string;
}

export interface RecordCaseDecisionInput {
  caseId: string;
  decision: VerificationDecision;
  reason: string;
  newStatus?: CaseStatus;
}
