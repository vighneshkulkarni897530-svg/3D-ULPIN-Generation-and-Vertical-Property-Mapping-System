/**
 * Verification Data Types
 * ========================
 * Types for recording property verification events, including field
 * verification outcomes, officer decisions, GPS / boundary matching,
 * and photo evidence.
 */
import type { PropertyVerificationStatus } from './gis';

/** Source of the verification action. */
export type VerificationSource = 'OFFICER' | 'CITIZEN' | 'SYSTEM' | 'AI_AGENT';

/** Survey / verification method used. */
export type VerificationMethod =
  | 'RTK_GNSS'
  | 'DRONE_SCAN'
  | 'TOTAL_STATION'
  | 'VISUAL_INSPECTION'
  | 'AI_EXTRACTION';

/**
 * A single verification record — one step in the verification history
 * of a PropertyUnit.
 *
 * Every verification record is appended to the property's history when
 * `verifyProperty()`, `rejectProperty()`, or `requestReinspection()`
 * is invoked in the GISContext.
 */
export interface VerificationRecord {
  id: string;
  propertyId: string;
  /** Status before the change, or `'Initial'` for the first record. */
  previousStatus: PropertyVerificationStatus | 'Initial';
  /** Status after the change. */
  newStatus: PropertyVerificationStatus;
  /** Officer / agent / system that performed the verification. */
  verifiedBy: string;
  verifiedByRole: VerificationSource;
  /** ISO timestamp of the verification event. */
  verificationDate: string;
  /** Inspector notes or description of findings. */
  notes: string;
  /** Optional photo URL (field inspection evidence). */
  photoUrl?: string;
  /** Whether GPS coordinates matched within tolerance. */
  gpsMatched: boolean;
  /** Whether boundary geometry matched the parent parcel. */
  boundaryMatched: boolean;
  /** Confidence score 0–100. */
  confidenceScore: number;
  /** Method used for verification. */
  method: VerificationMethod;
  /** Source of the verification action. */
  source: VerificationSource;
}
