/**
 * AI-Assisted Document & Blueprint Analysis Types (Phase 11)
 * ==========================================================
 * Strongly typed models for property documents, OCR extraction,
 * architectural blueprint parsing, database cross-comparison,
 * structured AI findings, and government officer verification review.
 */

import type { FirestoreTimestamp } from './society';
import type { DiscrepancySeverity, DiscrepancyType } from './verificationCase';

// ── Document Processing Statuses ─────────────────────────────────────────────

export const ANALYSIS_STATUSES = [
  'UPLOADED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'REVIEW_REQUIRED',
] as const;

export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

export const ANALYSIS_STATUS_LABELS: Record<AnalysisStatus, string> = {
  UPLOADED: 'Uploaded',
  PROCESSING: 'AI Processing & OCR',
  COMPLETED: 'Analysis Completed',
  FAILED: 'Analysis Failed',
  REVIEW_REQUIRED: 'Officer Review Required',
};

export const ANALYSIS_STATUS_VARIANTS: Record<
  AnalysisStatus,
  'secondary' | 'warning' | 'default' | 'success' | 'destructive'
> = {
  UPLOADED: 'secondary',
  PROCESSING: 'warning',
  COMPLETED: 'success',
  FAILED: 'destructive',
  REVIEW_REQUIRED: 'warning',
};

// ── Document Categories ──────────────────────────────────────────────────────

export const PROPERTY_DOCUMENT_TYPES = [
  'SALE_DEED',
  'KHATA_CERTIFICATE',
  'TAX_ASSESSMENT_RECEIPT',
  'BUILDING_SANCTION_PLAN',
  'FLOOR_BLUEPRINT',
  'SURVEY_SKETCH',
  'MUTATION_EXTRACT',
  'POSSESSION_CERTIFICATE',
  'OTHER',
] as const;

export type PropertyDocumentType = (typeof PROPERTY_DOCUMENT_TYPES)[number];

export const PROPERTY_DOCUMENT_TYPE_LABELS: Record<PropertyDocumentType, string> = {
  SALE_DEED: 'Registered Sale Deed / Title',
  KHATA_CERTIFICATE: 'Khata Certificate / Mutation Record',
  TAX_ASSESSMENT_RECEIPT: 'Property Tax Assessment Receipt',
  BUILDING_SANCTION_PLAN: 'Sanctioned Architectural Building Plan',
  FLOOR_BLUEPRINT: 'Floor Plan / Structural Blueprint',
  SURVEY_SKETCH: 'Cadastral Survey Map / 11E Sketch',
  MUTATION_EXTRACT: 'Revenue Mutation Extract',
  POSSESSION_CERTIFICATE: 'Possession / Allotment Letter',
  OTHER: 'Other Supporting Document',
};

// ── Document Metadata ────────────────────────────────────────────────────────

export interface PropertyDocumentDocument {
  id?: string;
  societyId: string;
  buildingId?: string | null;
  floorId?: string | null;
  flatId?: string | null;
  propertyId?: string | null;
  caseId?: string | null;
  documentType: PropertyDocumentType;
  fileName: string;
  fileSize: number; // in bytes
  mimeType: string;
  storagePath: string;
  downloadUrl: string;
  uploadedBy: string; // Authenticated UID
  uploadedByName?: string | null;
  uploadedByRole: 'government-officer' | 'society-admin' | 'resident' | 'super-admin';
  analysisId?: string | null;
  status: AnalysisStatus;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export type PropertyDocument = PropertyDocumentDocument & { id: string };

// ── OCR & Extracted Fields ───────────────────────────────────────────────────

export interface ExtractedField {
  key: string;
  label: string;
  rawValue: string | null;
  normalizedValue: string | number | null;
  confidence: number; // 0.0 to 1.0
  pageNumber?: number;
  detectedTextSnippet?: string | null;
  isDetected: boolean;
}

export interface DocumentOcrResult {
  rawText: string;
  detectedDocumentType: PropertyDocumentType;
  detectedLanguage: string;
  pageCount: number;
  fields: {
    surveyNumber: ExtractedField;
    propertyNumber: ExtractedField;
    buildingName: ExtractedField;
    buildingNumber: ExtractedField;
    floorNumber: ExtractedField;
    flatNumber: ExtractedField;
    carpetAreaSqFt: ExtractedField;
    superBuiltUpAreaSqFt: ExtractedField;
    documentReferenceNumber: ExtractedField;
    registrationDate: ExtractedField;
    grantorName: ExtractedField;
    granteeName: ExtractedField;
    boundaryNorth: ExtractedField;
    boundarySouth: ExtractedField;
    boundaryEast: ExtractedField;
    boundaryWest: ExtractedField;
  };
  overallConfidence: number; // 0.0 to 1.0
  processingTimeMs: number;
  disclaimer: string;
}

// ── Blueprint Analysis ───────────────────────────────────────────────────────

export interface DetectedBlueprintUnit {
  unitId: string;
  label: string;
  unitType: string;
  approxAreaSqFt: number | null;
  relativePosition?: { x: number; y: number } | null;
  facing?: string | null;
  balconiesDetected: number;
}

export interface BlueprintAnalysisResult {
  detectedBuildingOutline: boolean;
  detectedFloorCount: number | null;
  detectedUnitCount: number | null;
  detectedCorridors: boolean;
  detectedStaircases: number;
  detectedLifts: number;
  units: DetectedBlueprintUnit[];
  structuralNotes: string[];
  dimensionsSummary: {
    totalFloorAreaSqFt: number | null;
    commonAreaSqFt: number | null;
  };
  confidence: number; // 0.0 to 1.0
  disclaimer: string;
}

// ── Database Comparison Engine ───────────────────────────────────────────────

export const COMPARISON_STATUSES = [
  'MATCH',
  'POSSIBLE_MISMATCH',
  'INSUFFICIENT_DATA',
] as const;

export type ComparisonStatus = (typeof COMPARISON_STATUSES)[number];

export const COMPARISON_STATUS_LABELS: Record<ComparisonStatus, string> = {
  MATCH: 'Consistent with Records',
  POSSIBLE_MISMATCH: 'Discrepancy / Mismatch Flagged',
  INSUFFICIENT_DATA: 'Insufficient Record Data',
};

export const COMPARISON_STATUS_VARIANTS: Record<
  ComparisonStatus,
  'success' | 'destructive' | 'secondary'
> = {
  MATCH: 'success',
  POSSIBLE_MISMATCH: 'destructive',
  INSUFFICIENT_DATA: 'secondary',
};

export interface ComparisonFieldResult {
  fieldKey: string;
  label: string;
  documentValue: string | number | null;
  databaseValue: string | number | null;
  status: ComparisonStatus;
  confidence: number;
  notes: string;
}

export interface DatabaseComparisonResult {
  targetEntity: {
    societyName?: string;
    buildingName?: string;
    floorNumber?: number;
    flatNumber?: string;
    ulpin?: string;
  };
  fields: ComparisonFieldResult[];
  overallMatchScore: number; // 0.0 to 1.0
  mismatchCount: number;
  insufficientDataCount: number;
  matchCount: number;
}

// ── Structured AI Findings ───────────────────────────────────────────────────

export interface AIFinding {
  id: string;
  category: DiscrepancyType;
  severity: DiscrepancySeverity;
  source: 'OCR_ANALYSIS' | 'BLUEPRINT_VISION' | 'DATABASE_CROSS_CHECK';
  title: string;
  description: string;
  confidence: number; // 0.0 to 1.0
  requiresOfficerReview: boolean;
  discrepancySuggested: boolean;
  recommendedAction: string;
}

// ── Officer Review Decisions ─────────────────────────────────────────────────

export const OFFICER_REVIEW_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'CONVERTED_TO_DISCREPANCY',
] as const;

export type OfficerReviewStatus = (typeof OFFICER_REVIEW_STATUSES)[number];

export const OFFICER_REVIEW_STATUS_LABELS: Record<OfficerReviewStatus, string> = {
  PENDING: 'Awaiting Officer Review',
  ACCEPTED: 'Findings Verified & Accepted',
  REJECTED: 'Findings Dismissed / False Positive',
  CONVERTED_TO_DISCREPANCY: 'Converted to Official Discrepancy',
};

// ── Master Document Analysis Record ──────────────────────────────────────────

export interface DocumentAnalysisDocument {
  documentId: string;
  societyId: string;
  buildingId?: string | null;
  floorId?: string | null;
  flatId?: string | null;
  propertyId?: string | null;
  caseId?: string | null;
  status: AnalysisStatus;
  ocrResult?: DocumentOcrResult | null;
  blueprintResult?: BlueprintAnalysisResult | null;
  comparisonResult?: DatabaseComparisonResult | null;
  findings: AIFinding[];
  overallConfidence: number;
  officerReviewStatus: OfficerReviewStatus;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: FirestoreTimestamp | null;
  officerNotes?: string | null;
  convertedDiscrepancyId?: string | null;
  convertedCaseId?: string | null;
  disclaimer: string;
  uploadedBy: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  completedAt?: FirestoreTimestamp | null;
}

export type DocumentAnalysis = DocumentAnalysisDocument & { id: string };

// ── Constants & Disclaimers ──────────────────────────────────────────────────

export const MANDATORY_AI_DISCLAIMER =
  'AI-assisted analysis is provided strictly for decision-support and telemetry. It does not constitute an official cadastral land survey, legal title verification, government-issued ULPIN, or binding legal determination. Official cadastral decisions remain exclusively with authorized revenue and municipal officers.';
