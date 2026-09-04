/**
 * Society domain types (Phase 1 — Society Registration & Society Admin)
 * ======================================================================
 *
 * Firestore-backed types for the `societies` and `societyMembers`
 * collections.
 *
 * Forward-compatibility notes:
 *   - `SocietyRole` already enumerates `super-admin` and `government-officer`
 *     so later phases never need a breaking membership migration. Phase 1
 *     only ever WRITES `society-admin`, and only for the authenticated
 *     user's own Firebase UID.
 *   - Location data is explicitly marked `source: "user-provided"` and
 *     `dataStatus: "illustrative"`. It is NEVER presented as a surveyed or
 *     legally verified boundary.
 */

/** Firestore `serverTimestamp()` reads back as `Date` (or `null` mid-write). */
export type FirestoreTimestamp = Date | null;

/** Society categories offered at registration. */
export const SOCIETY_TYPES = [
  'Residential Society',
  'Apartment Complex',
  'Housing Society',
  'Cooperative Housing Society',
  'Township',
  'Other',
] as const;

export type SocietyType = (typeof SOCIETY_TYPES)[number];

/**
 * Platform role model. `super-admin` and `government-officer` are reserved
 * for later, server-side provisioning — they can never be produced by the
 * Phase 1 client form, and Firestore rules reject them on client writes.
 */
export type SocietyRole =
  | 'super-admin'
  | 'government-officer'
  | 'society-admin'
  | 'resident';

/** Roles that a client is allowed to write (Firestore rules enforce this). */
export const CLIENT_WRITABLE_SOCIETY_ROLES = ['society-admin', 'resident'] as const;
export type ClientWritableSocietyRole = (typeof CLIENT_WRITABLE_SOCIETY_ROLES)[number];

export const SOCIETY_LOCATION_SOURCES = ['user-provided'] as const;
export type SocietyLocationSource = (typeof SOCIETY_LOCATION_SOURCES)[number];

export const SOCIETY_DATA_STATUSES = ['illustrative'] as const;
export type SocietyDataStatus = (typeof SOCIETY_DATA_STATUSES)[number];

export const SOCIETY_STATUSES = ['active', 'inactive', 'archived'] as const;
export type SocietyStatus = (typeof SOCIETY_STATUSES)[number];

export const SOCIETY_MEMBER_STATUSES = ['active', 'inactive', 'removed'] as const;
export type SocietyMemberStatus = (typeof SOCIETY_MEMBER_STATUSES)[number];

export interface SocietyAddress {
  line1: string;
  line2: string | null;
  city: string;
  district: string | null;
  state: string;
  pinCode: string;
}

export interface SocietyLocation {
  latitude: number | null;
  longitude: number | null;
  source: SocietyLocationSource;
  dataStatus: SocietyDataStatus;
}

/** Firestore document shape for `societies/{societyId}`. */
export interface SocietyDocument {
  name: string;
  type: string;
  registrationNumber: string | null;
  establishedYear: number | null;
  description: string | null;
  address: SocietyAddress;
  location: SocietyLocation;
  imageUrl: string | null;
  logoUrl: string | null;
  createdBy: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  status: SocietyStatus;
}

/** A society document joined with its Firestore document ID. */
export type Society = SocietyDocument & { id: string };

/** Firestore document shape for `societyMembers/{societyId}_{userId}`. */
export interface SocietyMembershipDocument {
  societyId: string;
  userId: string;
  role: SocietyRole;
  status: SocietyMemberStatus;
  createdAt: FirestoreTimestamp;
}

export type SocietyMembership = SocietyMembershipDocument & { id: string };

/** Values collected by the registration form, before any Firestore write. */
export interface SocietyRegistrationFormValues {
  name: string;
  type: SocietyType | '';
  registrationNumber: string;
  establishedYear: string;
  description: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  state: string;
  pinCode: string;
  latitude: string;
  longitude: string;
}

/** Validated + normalized payload handed to the society service. */
export interface SocietyRegistrationPayload {
  name: string;
  type: SocietyType;
  registrationNumber: string | null;
  establishedYear: number | null;
  description: string | null;
  address: SocietyAddress;
  location: SocietyLocation;
}

/** Update payload for editing an existing society. */
export interface SocietyUpdatePayload {
  name?: string;
  type?: SocietyType;
  registrationNumber?: string | null;
  establishedYear?: number | null;
  description?: string | null;
  address?: Partial<SocietyAddress>;
  location?: Partial<SocietyLocation>;
  imageUrl?: string | null;
  logoUrl?: string | null;
  status?: SocietyStatus;
}

// ══════════════════════════════════════════════════════════════════════════════
// Phase 2 — Buildings → Floors → Flats
// ══════════════════════════════════════════════════════════════════════════════
//
// Firestore hierarchy:
//   societies/{societyId}
//     └── buildings/{buildingId}
//           └── floors/{floorId}
//                 └── flats/{flatId}
//
// Every child record carries its full parent ID chain (societyId, buildingId,
// floorId) so security rules can verify parent relationships and block
// cross-society access (Phase 2 spec §17).
//
// Forward compatibility: this structure is designed so Phase 3 (residents),
// Phase 4 (gov verification), Phase 5 (GIS/ULPIN) and Phase 6 (3D twin) can
// each attach to the flat level without rebuilding the database (§35).

// ── Buildings ────────────────────────────────────────────────────────────────

export const BUILDING_TYPES = [
  'Residential',
  'Commercial',
  'Mixed Use',
  'Amenity',
  'Parking',
  'Other',
] as const;

export type BuildingType = (typeof BUILDING_TYPES)[number];

export const BUILDING_STATUSES = ['active', 'inactive', 'archived'] as const;
export type BuildingStatus = (typeof BUILDING_STATUSES)[number];

/** Firestore document shape for `societies/{societyId}/buildings/{buildingId}`. */
export interface BuildingDocument {
  societyId: string;
  name: string;
  code: string;
  type: BuildingType;
  floorCount: number;
  basementFloors: number;
  plannedFlatCount: number;
  liftAvailable: boolean;
  liftCount: number;
  parkingAvailable: boolean;
  parkingCapacity: number;
  description: string | null;
  location: SocietyLocation;
  status: BuildingStatus;
  createdBy: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export type Building = BuildingDocument & { id: string };

/** Values collected by the Add/Edit Building form. */
export interface BuildingFormValues {
  name: string;
  code: string;
  type: BuildingType | '';
  floorCount: string;
  basementFloors: string;
  plannedFlatCount: string;
  liftAvailable: boolean;
  liftCount: string;
  parkingAvailable: boolean;
  parkingCapacity: string;
  description: string;
  latitude: string;
  longitude: string;
}

/** Validated + normalized payload handed to the building service. */
export interface BuildingPayload {
  name: string;
  code: string;
  type: BuildingType;
  floorCount: number;
  basementFloors: number;
  plannedFlatCount: number;
  liftAvailable: boolean;
  liftCount: number;
  parkingAvailable: boolean;
  parkingCapacity: number;
  description: string | null;
  location: SocietyLocation;
}

// ── Floors ───────────────────────────────────────────────────────────────────

export const FLOOR_TYPES = ['basement', 'ground', 'residential', 'amenity', 'other'] as const;
export type FloorType = (typeof FLOOR_TYPES)[number];

export const FLOOR_STATUSES = ['active', 'inactive'] as const;
export type FloorStatus = (typeof FLOOR_STATUSES)[number];

/**
 * Firestore document shape for
 * `societies/{societyId}/buildings/{buildingId}/floors/{floorId}`.
 */
export interface FloorDocument {
  societyId: string;
  buildingId: string;
  floorNumber: number;
  floorLabel: string;
  floorType: FloorType;
  plannedFlatCount: number;
  status: FloorStatus;
  createdBy: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export type Floor = FloorDocument & { id: string };

/** Values collected by the Add/Edit Floor form. */
export interface FloorFormValues {
  floorNumber: string;
  floorLabel: string;
  floorType: FloorType | '';
  plannedFlatCount: string;
}

/** Validated + normalized payload handed to the floor service. */
export interface FloorPayload {
  floorNumber: number;
  floorLabel: string;
  floorType: FloorType;
  plannedFlatCount: number;
}

/** A single floor descriptor produced by the floor generator (pre-confirm). */
export interface GeneratedFloor {
  floorNumber: number;
  floorLabel: string;
  floorType: FloorType;
}

// ── Flats ────────────────────────────────────────────────────────────────────

export const UNIT_TYPES = [
  'Studio',
  '1 BHK',
  '2 BHK',
  '3 BHK',
  '4 BHK',
  '5 BHK',
  'Penthouse',
  'Shop',
  'Office',
  'Other',
] as const;

export type UnitType = (typeof UNIT_TYPES)[number];

export const FLAT_STATUSES = [
  'available',
  'occupied',
  'reserved',
  'under-maintenance',
  'not-available',
] as const;

export type FlatStatus = (typeof FLAT_STATUSES)[number];

export const FLAT_FACINGS = [
  'North',
  'South',
  'East',
  'West',
  'North-East',
  'North-West',
  'South-East',
  'South-West',
] as const;

export type FlatFacing = (typeof FLAT_FACINGS)[number];

export const AREA_UNITS = ['sqft'] as const;
export type AreaUnit = (typeof AREA_UNITS)[number];

/**
 * Firestore document shape for
 * `societies/{societyId}/buildings/{buildingId}/floors/{floorId}/flats/{flatId}`.
 */
export interface FlatDocument {
  societyId: string;
  buildingId: string;
  floorId: string;
  flatNumber: string;
  unitType: UnitType;
  area: number | null;
  areaUnit: AreaUnit;
  floorPosition: number | null;
  facing: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  balconyCount: number | null;
  parkingSpaces: number;
  status: FlatStatus;
  description: string | null;
  createdBy: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export type Flat = FlatDocument & { id: string };

/** Values collected by the Add/Edit Flat form. */
export interface FlatFormValues {
  flatNumber: string;
  unitType: UnitType | '';
  area: string;
  floorPosition: string;
  facing: string;
  bedrooms: string;
  bathrooms: string;
  balconyCount: string;
  parkingSpaces: string;
  status: FlatStatus | '';
  description: string;
}

/** Validated + normalized payload handed to the flat service. */
export interface FlatPayload {
  flatNumber: string;
  unitType: UnitType;
  area: number | null;
  areaUnit: AreaUnit;
  floorPosition: number | null;
  facing: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  balconyCount: number | null;
  parkingSpaces: number;
  status: FlatStatus;
  description: string | null;
}

// ── Display labels ───────────────────────────────────────────────────────────

export const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  Residential: 'Residential',
  Commercial: 'Commercial',
  'Mixed Use': 'Mixed Use',
  Amenity: 'Amenity',
  Parking: 'Parking',
  Other: 'Other',
};

export const FLAT_STATUS_LABELS: Record<FlatStatus, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  'under-maintenance': 'Under Maintenance',
  'not-available': 'Not Available',
};

export const FLAT_STATUS_VARIANTS: Record<FlatStatus, 'success' | 'warning' | 'destructive' | 'secondary' | 'default'> = {
  available: 'success',
  occupied: 'default',
  reserved: 'warning',
  'under-maintenance': 'destructive',
  'not-available': 'secondary',
};

export const FLOOR_TYPE_LABELS: Record<FloorType, string> = {
  basement: 'Basement',
  ground: 'Ground Floor',
  residential: 'Residential',
  amenity: 'Amenity',
  other: 'Other',
};

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  Studio: 'Studio',
  '1 BHK': '1 BHK',
  '2 BHK': '2 BHK',
  '3 BHK': '3 BHK',
  '4 BHK': '4 BHK',
  '5 BHK': '5 BHK',
  Penthouse: 'Penthouse',
  Shop: 'Shop',
  Office: 'Office',
  Other: 'Other',
};

// ─── Phase 3: Resident types ───────────────────────────────────────────────────

/** Resident statuses through the registration lifecycle. */
export const RESIDENT_STATUSES = ['pending', 'approved', 'rejected', 'removed'] as const;
export type ResidentStatus = (typeof RESIDENT_STATUSES)[number];

export const RESIDENT_STATUS_LABELS: Record<ResidentStatus, string> = {
  pending: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  removed: 'Removed',
};

export const RESIDENT_STATUS_VARIANTS: Record<ResidentStatus, 'warning' | 'success' | 'destructive' | 'secondary'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  removed: 'secondary',
};

/** Occupancy types a resident can self-select. */
export const OCCUPANCY_TYPES = [
  'Owner Occupant',
  'Tenant',
  'Family Member',
  'Authorized Occupant',
  'Other',
] as const;

export type OccupancyType = (typeof OCCUPANCY_TYPES)[number];

export const OCCUPANCY_TYPE_LABELS: Record<OccupancyType, string> = {
  'Owner Occupant': 'Owner Occupant',
  Tenant: 'Tenant',
  'Family Member': 'Family Member',
  'Authorized Occupant': 'Authorized Occupant',
  Other: 'Other',
};

/**
 * Firestore document shape for `residents/{residentId}`.
 *
 * The resident's flat claim (`societyId/buildingId/floorId/flatId`) is
 * immutable after creation — the resident can never re-point themselves to
 * another flat via the client. Approvals are performed server-side by a
 * verified `society-admin` only.
 */
export interface ResidentDocument {
  userId: string;
  societyId: string;
  buildingId: string;
  floorId: string;
  flatId: string;
  profile: {
    fullName: string;
    preferredName: string | null;
    email: string;
    phone: string | null;
    occupation: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
  };
  occupancy: {
    type: OccupancyType;
    moveInDate: string | null;
    residentCount: number;
    notes: string | null;
  };
  status: ResidentStatus;
  submittedAt: FirestoreTimestamp;
  approvedAt: FirestoreTimestamp;
  rejectedAt: FirestoreTimestamp;
  approvedBy: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export type Resident = ResidentDocument & { id: string };

/** Form values for the resident registration profile step. */
export interface ResidentProfileFormValues {
  fullName: string;
  preferredName: string;
  phone: string;
  occupation: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

/** Form values for the resident registration occupancy step. */
export interface ResidentOccupancyFormValues {
  occupancyType: OccupancyType | '';
  moveInDate: string;
  residentCount: string;
  notes: string;
}

/** Validated + normalized payload handed to the resident service. */
export interface ResidentPayload {
  // NOTE: `userId` is deliberately NOT part of the payload — the service
  // always derives it from `auth.currentUser.uid`, never from client data.
  societyId: string;
  buildingId: string;
  floorId: string;
  flatId: string;
  profile: {
    fullName: string;
    preferredName: string | null;
    email: string;
    phone: string | null;
    occupation: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
  };
  occupancy: {
    type: OccupancyType;
    moveInDate: string | null;
    residentCount: number;
    notes: string | null;
  };
}

/**
 * Residency membership document `societyMembers/{societyId}_{userId}`.
 * Created automatically when a resident's registration is APPROVED.
 * The deterministic ID prevents a resident from bootstrapping a society-admin
 * membership (only they can create their own `resident` entry via this ID
 * pattern, and even then the role is fixed server-side).
 */
export interface ResidentMembershipDocument {
  societyId: string;
  userId: string;
  residentId: string;
  role: 'resident';
  status: 'pending';
  createdAt: FirestoreTimestamp;
}

export type ResidentMembership = ResidentMembershipDocument & { id: string };

/** Subset of resident fields a resident may edit on their own profile. */
export interface ResidentEditableProfilePayload {
  fullName: string;
  preferredName: string | null;
  phone: string | null;
  occupation: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}

export interface ResidentEditableOccupancyPayload {
  type: OccupancyType;
  moveInDate: string | null;
  residentCount: number;
  notes: string | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// Phase 4 — Government Officer Portal & Property Verification
// ══════════════════════════════════════════════════════════════════════════════

/** Officer account status in the government verification directory. */
export const GOV_OFFICER_STATUSES = ['active', 'inactive'] as const;
export type GovOfficerStatus = (typeof GOV_OFFICER_STATUSES)[number];

/**
 * Firestore document shape for `governmentOfficers/{userId}`.
 * Only minimal operational data is collected — no passwords, no second auth system.
 */
export interface GovernmentOfficerDocument {
  userId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  officerCode: string;
  jurisdictionDistrict?: string | null;
  status: GovOfficerStatus;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export type GovernmentOfficer = GovernmentOfficerDocument & { id: string };

/** Target entity types eligible for government verification decisions. */
export const VERIFICATION_TARGET_TYPES = ['society', 'building', 'flat', 'resident'] as const;
export type VerificationTargetType = (typeof VERIFICATION_TARGET_TYPES)[number];

/** Government verification lifecycle statuses. */
export const GOV_VERIFICATION_STATUSES = [
  'pending',
  'verified',
  'rejected',
  'flagged',
  'needs-review',
] as const;
export type GovVerificationStatus = (typeof GOV_VERIFICATION_STATUSES)[number];

export const GOV_VERIFICATION_STATUS_LABELS: Record<GovVerificationStatus, string> = {
  pending: 'Pending Verification',
  verified: 'Government Verified',
  rejected: 'Rejected',
  flagged: 'Discrepancy Flagged',
  'needs-review': 'Needs Review',
};

export const GOV_VERIFICATION_STATUS_VARIANTS: Record<
  GovVerificationStatus,
  'warning' | 'success' | 'destructive' | 'default' | 'secondary'
> = {
  pending: 'warning',
  verified: 'success',
  rejected: 'destructive',
  flagged: 'destructive',
  'needs-review': 'default',
};

/**
 * Firestore document shape for `verifications/{verificationId}`.
 * Generic verification record representing government review decisions on
 * societies, buildings, flats, or residents.
 *
 * NOTE: A verification record does NOT prove legal ownership.
 */
export interface GovVerificationDocument {
  targetType: VerificationTargetType;
  targetId: string;
  societyId: string;
  buildingId?: string | null;
  floorId?: string | null;
  flatId?: string | null;
  status: GovVerificationStatus;
  verifiedBy: string; // Authenticated Firebase officer UID
  verifiedByOfficerName?: string | null;
  officerDesignation?: string | null;
  officerDepartment?: string | null;
  verifiedAt: FirestoreTimestamp;
  remarks: string;
  evidenceReferences?: string[];
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export type GovVerification = GovVerificationDocument & { id: string };

/** Payload for recording or updating a verification decision. */
export interface RecordVerificationPayload {
  targetType: VerificationTargetType;
  targetId: string;
  societyId: string;
  buildingId?: string | null;
  floorId?: string | null;
  flatId?: string | null;
  status: GovVerificationStatus;
  remarks: string;
  evidenceReferences?: string[];
}

/**
 * Firestore document shape for `verificationHistory/{historyId}`.
 * Immutable audit trail tracking every official verification decision and status change.
 */
export interface GovVerificationHistoryDocument {
  verificationId: string;
  targetType: VerificationTargetType;
  targetId: string;
  societyId: string;
  action: 'VERIFY' | 'REJECT' | 'FLAG' | 'NEEDS_REVIEW' | 'STATUS_CHANGE';
  previousStatus: GovVerificationStatus | 'none' | null;
  newStatus: GovVerificationStatus;
  officerId: string; // Authenticated Firebase officer UID
  officerName?: string | null;
  remarks: string;
  createdAt: FirestoreTimestamp;
}

export type GovVerificationHistory = GovVerificationHistoryDocument & { id: string };

/** Categories for discrepancies and flags raised by government officers. */
export const DISCREPANCY_CATEGORIES = [
  'society_mismatch',
  'building_mismatch',
  'flat_mismatch',
  'resident_mismatch',
  'gis_location_discrepancy',
  'missing_evidence',
  'other',
] as const;
export type DiscrepancyCategory = (typeof DISCREPANCY_CATEGORIES)[number];

export const DISCREPANCY_CATEGORY_LABELS: Record<DiscrepancyCategory, string> = {
  society_mismatch: 'Society Information Mismatch',
  building_mismatch: 'Building Information Mismatch',
  flat_mismatch: 'Flat / Property Mismatch',
  resident_mismatch: 'Resident / Application Mismatch',
  gis_location_discrepancy: 'GIS / Location Discrepancy',
  missing_evidence: 'Missing Evidence / Documentation',
  other: 'Other Discrepancy',
};

/** Lifecycle statuses for discrepancies and flags. */
export const DISCREPANCY_STATUSES = [
  'open',
  'under-review',
  'resolved',
  'dismissed',
] as const;
export type DiscrepancyStatus = (typeof DISCREPANCY_STATUSES)[number];

export const DISCREPANCY_STATUS_LABELS: Record<DiscrepancyStatus, string> = {
  open: 'Open Flag',
  'under-review': 'Under Review',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

export const DISCREPANCY_STATUS_VARIANTS: Record<
  DiscrepancyStatus,
  'destructive' | 'warning' | 'success' | 'secondary'
> = {
  open: 'destructive',
  'under-review': 'warning',
  resolved: 'success',
  dismissed: 'secondary',
};

/**
 * Firestore document shape for `discrepancies/{discrepancyId}`.
 */
export interface DiscrepancyDocument {
  targetType: VerificationTargetType | 'location' | 'evidence';
  targetId: string;
  societyId: string;
  buildingId?: string | null;
  floorId?: string | null;
  flatId?: string | null;
  category: DiscrepancyCategory;
  description: string;
  officerId: string; // Authenticated Firebase officer UID
  officerName?: string | null;
  status: DiscrepancyStatus;
  resolutionNotes?: string | null;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export type Discrepancy = DiscrepancyDocument & { id: string };

/** Payload for raising a new discrepancy flag. */
export interface CreateDiscrepancyPayload {
  targetType: VerificationTargetType | 'location' | 'evidence';
  targetId: string;
  societyId: string;
  buildingId?: string | null;
  floorId?: string | null;
  flatId?: string | null;
  category: DiscrepancyCategory;
  description: string;
}

