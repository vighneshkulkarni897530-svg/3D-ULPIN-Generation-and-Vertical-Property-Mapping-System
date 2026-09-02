/**
 * Citizen Domain Service (Phase 10)
 * =================================
 * Centralized, secure citizen workflow service.
 * Enforces strict user ownership: citizens only access their own resident records,
 * linked property, permitted cases, and personal notifications.
 */

import { auth } from '@/lib/firebase';
import { getMyResidentRecord, getResidentById } from '@/lib/society/residentService';
import { resolveResidentProperty, type ResolvedResidentProperty } from '@/lib/society/residentProperty';
import {
  getVerification,
  getDiscrepanciesForSociety,
  getVerificationHistory,
} from '@/lib/society/governmentService';
import {
  getVerificationCasesForSociety,
  getVerificationCaseById,
  getEvidenceForCase,
  createPropertyDiscrepancy,
  createVerificationCase,
} from '@/lib/society/verificationWorkflowService';
import { getMyNotifications } from './notificationService';
import { createNotification } from './notificationService';
import {
  type Resident,
  type GovVerification,
  type Discrepancy,
} from '@/types/society';
import {
  type VerificationCase,
  type VerificationEvidence,
  type DiscrepancyType,
  type DiscrepancySeverity,
} from '@/types/verificationCase';
import { type CitizenNotification } from '@/types/citizenNotification';

export interface CitizenOverviewData {
  resident: Resident | null;
  property: ResolvedResidentProperty | null;
  verification: GovVerification | null;
  discrepancies: Discrepancy[];
  cases: VerificationCase[];
  notifications: CitizenNotification[];
  spatialIdentity: {
    baseUlpin: string;
    spatialId: string;
    approximateCoordinates: { lat: number; lng: number } | null;
    elevationMeters: number | null;
    dataStatus: 'illustrative' | 'user-provided' | 'government-verified';
  } | null;
  timeline: Array<{
    date: Date;
    title: string;
    description: string;
    stage: string;
    actor: string;
  }>;
}

function toJsDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (
    typeof val === 'object' &&
    val !== null &&
    'toDate' in val &&
    typeof (val as { toDate?: () => Date }).toDate === 'function'
  ) {
    try {
      return (val as { toDate: () => Date }).toDate();
    } catch {
      return new Date();
    }
  }
  return new Date();
}

/**
 * Resolves the complete Citizen Overview payload for the logged-in user.
 */
export async function getCitizenOverview(): Promise<CitizenOverviewData> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return {
      resident: null,
      property: null,
      verification: null,
      discrepancies: [],
      cases: [],
      notifications: [],
      spatialIdentity: null,
      timeline: [],
    };
  }

  // 1. Fetch own resident record
  const resident = await getMyResidentRecord();
  if (!resident) {
    const notifications = await getMyNotifications(10).catch(() => []);
    return {
      resident: null,
      property: null,
      verification: null,
      discrepancies: [],
      cases: [],
      notifications,
      spatialIdentity: null,
      timeline: [],
    };
  }

  // 2. Resolve linked property & notifications in parallel
  const [property, notifications, allDiscrepancies, allCases, flatVer, history] = await Promise.all([
    resolveResidentProperty(resident),
    getMyNotifications(10).catch(() => []),
    getDiscrepanciesForSociety(resident.societyId).catch(() => []),
    getVerificationCasesForSociety(resident.societyId).catch(() => []),
    getVerification('flat', resident.flatId).catch(() => null),
    getVerificationHistory(resident.societyId, resident.flatId).catch(() => []),
  ]);

  // 3. Filter discrepancies & cases for this specific flat / resident
  const flatDiscrepancies = allDiscrepancies.filter((d) => d.flatId === resident.flatId);
  const flatCases = allCases.filter(
    (c) => c.flatId === resident.flatId || (c.discrepancyIds && c.discrepancyIds.some((id) => flatDiscrepancies.map(fd => fd.id).includes(id)))
  );

  // 4. Construct spatial identity if property exists
  let spatialIdentity: CitizenOverviewData['spatialIdentity'] = null;
  if (property.society && property.building && property.floor && property.flat) {
    const bCode = property.building.code || 'B1';
    const flNum = property.floor.floorNumber;
    const flatNum = property.flat.flatNumber;
    const socId = property.society.id.slice(0, 6).toUpperCase();

    const spatialId = `SP-SOC${socId}-B${bCode}-FL${flNum}-U${flatNum}`;
    const baseUlpin = `ULPIN-APPROX-KA-${socId}-${bCode}-${flatNum}`;
    const elevation = (flNum || 1) * 3.2;

    const loc = property.society.location;
    spatialIdentity = {
      baseUlpin,
      spatialId,
      approximateCoordinates:
        loc && loc.latitude != null && loc.longitude != null
          ? {
              lat: loc.latitude,
              lng: loc.longitude,
            }
          : null,
      elevationMeters: elevation,
      dataStatus: property.society.location?.dataStatus || 'illustrative',
    };
  }

  // 5. Construct citizen timeline
  const timeline: CitizenOverviewData['timeline'] = [];

  if (resident.submittedAt) {
    timeline.push({
      date: toJsDate(resident.submittedAt),
      title: 'Residency Claim Submitted',
      description: `Claim submitted for Flat ${property.flat?.flatNumber || 'Unit'}.`,
      stage: 'SUBMITTED',
      actor: resident.profile.fullName || 'Resident',
    });
  }

  if (resident.approvedAt) {
    timeline.push({
      date: toJsDate(resident.approvedAt),
      title: 'Society Membership Approved',
      description: 'Your residency claim was verified and activated by Society Admin.',
      stage: 'APPROVED',
      actor: 'Society Admin',
    });
  }

  if (flatVer?.verifiedAt) {
    timeline.push({
      date: toJsDate(flatVer.verifiedAt),
      title: `Cadastral Verification: ${flatVer.status.toUpperCase()}`,
      description: flatVer.remarks || 'Official review completed by Government Officer.',
      stage: flatVer.status.toUpperCase(),
      actor: flatVer.verifiedByOfficerName || 'Government Officer',
    });
  }

  history.forEach((h) => {
    timeline.push({
      date: toJsDate(h.createdAt),
      title: h.action,
      description: h.remarks || 'Audit event logged.',
      stage: 'VERIFICATION_EVENT',
      actor: h.officerName || 'Government Officer',
    });
  });

  flatCases.forEach((c) => {
    timeline.push({
      date: toJsDate(c.createdAt),
      title: `Case Raised: ${c.caseNumber}`,
      description: c.title,
      stage: c.status,
      actor: c.assignedOfficerName || 'Cadastral Desk',
    });

    if (c.decision && c.decisionMadeAt) {
      timeline.push({
        date: toJsDate(c.decisionMadeAt),
        title: `Government Decision: ${c.decision.replace(/_/g, ' ')}`,
        description: c.decisionReason || 'Official case determination recorded.',
        stage: 'RESOLVED',
        actor: c.decisionMadeByName || c.assignedOfficerName || 'Government Officer',
      });
    }
  });

  // Sort chronological descending
  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    resident,
    property,
    verification: flatVer,
    discrepancies: flatDiscrepancies,
    cases: flatCases,
    notifications,
    spatialIdentity,
    timeline,
  };
}

/**
 * Gets all verification cases that the citizen is authorized to view.
 */
export async function getCitizenCases(): Promise<VerificationCase[]> {
  const resident = await getMyResidentRecord();
  if (!resident) return [];

  const allCases = await getVerificationCasesForSociety(resident.societyId);
  return allCases.filter((c) => c.flatId === resident.flatId);
}

/**
 * Gets a specific verification case for the citizen, ensuring ownership.
 */
export async function getCitizenCaseDetail(caseId: string): Promise<{
  caseDoc: VerificationCase | null;
  evidence: VerificationEvidence[];
  property: ResolvedResidentProperty | null;
}> {
  const [resident, caseDoc] = await Promise.all([
    getMyResidentRecord(),
    getVerificationCaseById(caseId),
  ]);

  if (!resident || !caseDoc) {
    return { caseDoc: null, evidence: [], property: null };
  }

  // Authorize: case must match resident's society & flat
  if (caseDoc.societyId !== resident.societyId || (caseDoc.flatId && caseDoc.flatId !== resident.flatId)) {
    throw new Error('Unauthorized: cannot access case outside your property record.');
  }

  const [evidence, property] = await Promise.all([
    getEvidenceForCase(caseId),
    resolveResidentProperty(resident),
  ]);

  return {
    caseDoc,
    evidence,
    property,
  };
}

export interface CitizenDisputeInput {
  title: string;
  category: DiscrepancyType;
  severity: DiscrepancySeverity;
  description: string;
}

/**
 * Allows a citizen to raise a discrepancy / issue for their linked property.
 */
export async function raiseCitizenDispute(input: CitizenDisputeInput): Promise<{
  discrepancyId: string;
  caseId: string;
  caseNumber: string;
}> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Must be authenticated to raise a dispute.');

  const resident = await getMyResidentRecord();
  if (!resident) throw new Error('No linked residency record found to raise a dispute against.');

  // 1. Create Discrepancy
  const discResult = await createPropertyDiscrepancy({
    societyId: resident.societyId,
    buildingId: resident.buildingId,
    floorId: resident.floorId,
    flatId: resident.flatId,
    type: input.category,
    title: input.title,
    description: input.description,
    severity: input.severity,
  });

  // 2. Create Verification Case
  const caseResult = await createVerificationCase({
    societyId: resident.societyId,
    buildingId: resident.buildingId,
    floorId: resident.floorId,
    flatId: resident.flatId,
    title: input.title,
    severity: input.severity,
    discrepancyIds: [discResult.discrepancyId],
    initialNote: input.description,
  });

  // 3. Create Notification for Citizen
  await createNotification({
    recipientUid: currentUser.uid,
    societyId: resident.societyId,
    type: 'DISPUTE_CREATED',
    title: `Dispute Case Created: ${caseResult.caseNumber}`,
    message: `Your grievance "${input.title}" has been registered and submitted for government officer review.`,
    relatedEntityType: 'case',
    relatedEntityId: caseResult.id,
    relatedCaseId: caseResult.id,
    relatedPropertyId: resident.flatId,
    severity: 'INFO',
    linkUrl: `/resident/cases/${caseResult.id}`,
  });

  return {
    discrepancyId: discResult.discrepancyId,
    caseId: caseResult.id,
    caseNumber: caseResult.caseNumber,
  };
}
