export type UserRole = 'CITIZEN' | 'OFFICER' | 'ADMIN';

export type VerificationStatus = 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'FIELD_VERIFICATION_REQUESTED' 
  | 'OFFICER_ASSIGNED' 
  | 'VERIFICATION_IN_PROGRESS' 
  | 'VERIFIED' 
  | 'REJECTED' 
  | 'DISPUTED';

export type PropertyType = 
  | 'COMMERCIAL' 
  | 'RESIDENTIAL' 
  | 'INDUSTRIAL' 
  | 'AGRICULTURAL' 
  | 'MIXED_USE' 
  | 'GOVERNMENT';

export type DisputeCategory = 
  | 'BOUNDARY_MISMATCH' 
  | 'OWNERSHIP_DISPUTE' 
  | 'AREA_DISCREPANCY' 
  | 'ILLEGAL_ENCROACHMENT' 
  | 'DOCUMENT_FORGERY' 
  | 'ZONING_VIOLATION' 
  | 'OTHER';

export type DisputeStatus = 'OPEN' | 'UNDER_INVESTIGATION' | 'HEARING_SCHEDULED' | 'RESOLVED' | 'REJECTED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  aadhaarOrGovId: string;
  avatarUrl?: string;
  department?: string;
  designation?: string;
  jurisdictionDistrict?: string;
  badgeNumber?: string;
  /** Account lifecycle status (Phase 10). Defaults to ACTIVE when absent. */
  accountStatus?: 'ACTIVE' | 'DISABLED';
  /** ISO timestamp of account creation (Phase 10, prototype store). */
  createdAt?: string;
}

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface PropertyUnit {
  id: string;
  unitNumber: string;
  floorNumber: number;
  type: '1BHK' | '2BHK' | '3BHK' | '4BHK' | 'PENTHOUSE' | 'OFFICE_SUITE' | 'RETAIL_SHOP' | 'WAREHOUSE';
  carpetAreaSqFt: number;
  builtUpAreaSqFt: number;
  ownerName: string;
  ownerAadhaarMasked: string;
  occupancyStatus: 'OCCUPIED' | 'VACANT' | 'LEASED' | 'UNDER_RENOVATION';
  verificationStatus: VerificationStatus;
  taxAssessmentNo: string;
  monthlyMaintenance?: number;
  isDisputed?: boolean;
}

export interface BuildingFloor {
  floorNumber: number;
  name: string;
  elevationMeters: number;
  totalUnits: number;
  carpetAreaSqFt: number;
  units: PropertyUnit[];
  planSvgKey?: string;
}

export interface BuildingStructure {
  buildingName: string;
  floorsCount: number;
  basementsCount: number;
  heightMeters: number;
  structureType: 'RCC_FRAME' | 'STEEL_FRAME' | 'LOAD_BEARING' | 'PREFAB';
  yearOfConstruction: number;
  fsiApproved: number;
  fsiConsumed: number;
  occupancyCertificateNumber: string;
  floors: BuildingFloor[];
}

export interface PropertyDocument {
  id: string;
  title: string;
  documentType: 'TITLE_DEED' | 'MUTATION_EXTRACT' | 'KHATA_CERTIFICATE' | 'TAX_RECEIPT' | 'SURVEY_MAP' | 'ENCUMBRANCE_CERTIFICATE' | 'BUILDING_SANCTION_PLAN';
  fileUrl: string;
  fileSize: string;
  uploadDate: string;
  verifiedByOfficer?: string;
  isVerified: boolean;
  sha256Checksum: string;
}

export interface VerificationHistoryEvent {
  id: string;
  stage: VerificationStatus;
  title: string;
  description: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  notes?: string;
  badgeNumber?: string;
}

export interface LandDetails {
  surveyNumber: string;
  subDivisionNumber: string;
  hissaNumber?: string;
  villageName: string;
  hobliOrTehsil: string;
  district: string;
  state: string;
  pincode: string;
  landAreaAcres: number;
  landAreaSqFt: number;
  landAreaGunthas?: number;
  soilClassification: string;
  waterSource?: string;
  cadastralZone: 'R1_RESIDENTIAL' | 'C1_COMMERCIAL' | 'I1_INDUSTRIAL' | 'AGRI_GREEN_BELT' | 'PUBLIC_SECTOR';
  guidelineValuationPerSqFt: number;
  annualPropertyTax: number;
  taxPaymentStatus: 'PAID' | 'DUE' | 'OVERDUE';
}

export interface PropertyItem {
  id: string;
  ulpin: string; // 14-digit Bhu-Aadhaar standard e.g. 14092837482910
  propertyId: string; // e.g. PROP-KA-BLR-2024-8891
  title: string;
  propertyType: PropertyType;
  primaryOwnerName: string;
  coOwners?: string[];
  ownerContactMasked: string;
  ownerAadhaarMasked: string;
  address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  coordinates: GeoCoordinate;
  boundaryCoordinates: GeoCoordinate[];
  adjacentParcels?: { ulpin: string; owner: string; surveyNo: string; direction: string }[];
  verificationStatus: VerificationStatus;
  marketValuationINR: number;
  governmentValuationINR: number;
  landDetails: LandDetails;
  building?: BuildingStructure;
  documents: PropertyDocument[];
  verificationHistory: VerificationHistoryEvent[];
  assignedOfficer?: {
    name: string;
    id: string;
    designation: string;
    contactNumber: string;
    department: string;
  };
  hasActiveDispute: boolean;
  disputeId?: string;
  featuredImageUrl: string;
  aerialImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeEvidence {
  id: string;
  fileName: string;
  fileType: 'IMAGE' | 'PDF' | 'GEO_SURVEY' | 'VIDEO';
  fileUrl: string;
  fileSize: string;
  geotag?: GeoCoordinate;
  uploadedAt: string;
  sha256Hash: string;
}

export interface DisputeRecord {
  id: string;
  disputeTicketNumber: string; // e.g. DSP-2024-9921
  propertyId: string;
  ulpin: string;
  propertyTitle: string;
  propertyAddress: string;
  raisedByUserId: string;
  raisedByUserName: string;
  raisedByUserContact: string;
  category: DisputeCategory;
  title: string;
  description: string;
  claimedCoordinates?: GeoCoordinate[];
  evidences: DisputeEvidence[];
  status: DisputeStatus;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  createdAt: string;
  updatedAt: string;
  hearingDate?: string;
  officerInspectionNotes?: string;
  resolutionSummary?: string;
}

export interface FieldVerificationRequest {
  id: string;
  requestNumber: string; // e.g. FVR-2024-5541
  propertyId: string;
  ulpin: string;
  propertyTitle: string;
  propertyAddress: string;
  requestedByUserId: string;
  requestedByUserName: string;
  surveyType: 'CORNER_DEMARCATION' | 'DRONE_CADASTRE_SCAN' | 'ENCROACHMENT_CHECK' | 'BUILDING_HEIGHT_INSPECTION' | 'MUTATION_VERIFICATION';
  urgency: 'NORMAL' | 'URGENT' | 'HIGH_PRIORITY';
  preferredDate: string;
  reason: string;
  evidences: DisputeEvidence[];
  status: 'PENDING_ASSIGNMENT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  inspectionReportUrl?: string;
  officerFindings?: string;
  createdAt: string;
}

export interface PlatformNotification {
  id: string;
  recipientRole: UserRole | 'ALL';
  recipientUserId?: string;
  title: string;
  message: string;
  type: 'VERIFICATION' | 'DISPUTE' | 'FIELD_INSPECTION' | 'SYSTEM' | 'SECURITY' | 'TASK';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}

/** Payload for the centralized notification creation helper (Phase 9). */
export type CreateNotificationInput = Omit<PlatformNotification, 'id' | 'isRead' | 'createdAt'>;

export interface ActivityLogItem {
  id: string;
  action: string;
  actorName: string;
  actorRole: UserRole;
  targetEntity: string;
  targetId: string;
  details: string;
  ipAddressMasked: string;
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports from unified GIS type submodules (Phase 1)
// ─────────────────────────────────────────────────────────────────────────────
// NOTE: `GeoCoordinate` and `PropertyUnit` are intentionally excluded from
// re-export here because they already exist in this file with different
// field shapes. The GIS versions live in `types/gis.ts` and should be
// imported directly via `@/types/gis` when the unified GIS model is needed.

export type {
  Geometry,
  LandParcel,
  Building,
  Floor,
  PropertyTypeGis,
  PropertyVerificationStatus,
  DataSource,
  DemoSpatialIdMetadata,
  OfficialUlpinMetadata,
  DemoSpatialIdentifier,
  UlpinReference,
  ParcelStatus,
  BuildingStatus,
} from './gis';

export type {
  VerificationRecord,
  VerificationSource,
  VerificationMethod,
} from './verification';

export type {
  SpatialConflict,
  ConflictType,
  ConflictSeverity,
  ConflictStatus,
} from './conflict';

export type {
  ActivityRecord,
  ActivityType,
  ActivityEntityType,
  ActivityStatus,
} from './activity';
