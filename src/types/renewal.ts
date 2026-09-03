/**
 * Periodic Property Verification & Renewal Reminder System Types
 * =============================================================
 * Data models for tracking building construction age, 10-year review intervals,
 * periodic verification reports, diff comparisons, and government officer reviews.
 *
 * UPHOLDS DATA HONESTY:
 * This system provides maintenance scheduling and decision support based on a
 * configured 10-year review interval. It does NOT claim that property ownership
 * or building structures legally expire.
 */

export type RenewalStatus = 'UP_TO_DATE' | 'DUE_SOON' | 'DUE' | 'OVERDUE';

export type RenewalCaseStatus =
  | 'PENDING_REVIEW'
  | 'UNDER_VERIFICATION'
  | 'VERIFIED'
  | 'REQUIRES_CORRECTION'
  | 'REJECTED';

export type PropertyCondition =
  | 'EXCELLENT'
  | 'GOOD'
  | 'FAIR'
  | 'REQUIRES_MAINTENANCE'
  | 'CRITICAL';

export interface RenewalDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
}

export interface PreviousPropertySnapshot {
  constructionYear: number;
  floors: number;
  units: number;
  builtUpAreaSqFt?: number;
  condition?: PropertyCondition;
}

export interface CurrentPropertySubmission {
  floors: number;
  units: number;
  builtUpAreaSqFt?: number;
  condition: PropertyCondition;
  renovationDetails?: string;
  structuralAlterations?: boolean;
  structuralNotes?: string;
}

export interface PropertyRenewalRecord {
  renewalId: string;
  propertyId: string;
  societyId: string;
  societyName: string;
  buildingId: string;
  buildingName: string;
  floorId?: string;
  flatId?: string;
  ulpin: string;
  address: string;

  // Milestone tracking dates
  constructionDate: string; // e.g. "2016-08-15"
  completionDate?: string;
  lastVerificationDate: string; // e.g. "2024-09-10"
  lastReportDate?: string;
  reviewIntervalYears: number; // default: 10
  nextReviewDate: string; // calculated: lastVerificationDate + reviewIntervalYears

  // Calculated fields
  calculatedAgeYears: number;
  renewalStatus: RenewalStatus;
  caseStatus: RenewalCaseStatus;

  // Comparison & changes
  previousRecord: PreviousPropertySnapshot;
  currentSubmission?: CurrentPropertySubmission;
  changesDetected: boolean;
  changeNotes: string[];

  // Evidence & documentation
  documents: RenewalDocument[];
  photos: string[];
  remarks: string;
  officerRemarks?: string;

  // Audit trail
  submittedBy?: {
    name: string;
    role: string;
    userId: string;
  };
  verifiedBy?: {
    name: string;
    role: string;
    userId: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RenewalStatistics {
  totalProperties: number;
  upToDate: number;
  dueSoon: number;
  due: number;
  overdue: number;
  pendingReview: number;
}
