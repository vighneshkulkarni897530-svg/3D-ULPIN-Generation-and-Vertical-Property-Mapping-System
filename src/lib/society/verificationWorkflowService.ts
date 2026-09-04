/**
 * Property Dispute, Verification Workflow & Evidence Service (Phase 8)
 * ====================================================================
 * Manages full lifecycle for:
 *   - Discrepancies (`discrepancies/{discrepancyId}`)
 *   - Verification Cases (`verificationCases/{caseId}`)
 *   - Evidence Management (`evidence/{evidenceId}` + Firebase Storage)
 *   - Investigation Notes (`verificationCases/{caseId}/notes/{noteId}`)
 *   - Audit Trail (`verificationHistory/{historyId}`)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type WithFieldValue,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  getStorage,
} from 'firebase/storage';

import { auth, db, firebaseApp } from '@/lib/firebase';
import { getActiveSessionUid, getActiveSessionUser } from '@/lib/auth/clientSession';

const storage = getStorage(firebaseApp);
import {
  type CaseAuditHistory,
  type CaseAuditHistoryDocument,
  type CaseStatus,
  type CreateDiscrepancyInput,
  type CreateVerificationCaseInput,
  type InvestigationNote,
  type InvestigationNoteDocument,
  type PropertyDiscrepancy,
  type PropertyDiscrepancyDocument,
  type RecordCaseDecisionInput,
  type UploadEvidenceInput,
  type VerificationCase,
  type VerificationCaseDocument,
  type VerificationEvidence,
  type VerificationEvidenceDocument,
} from '@/types/verificationCase';
import { SocietyServiceError, normalizeFirestoreError } from './service';
import { createNotification } from '@/lib/citizen/notificationService';

// ── Collection Constants ─────────────────────────────────────────────────────

export const DISCREPANCIES_COLLECTION = 'discrepancies';
export const VERIFICATION_CASES_COLLECTION = 'verificationCases';
export const EVIDENCE_COLLECTION = 'evidence';
export const VERIFICATION_HISTORY_COLLECTION = 'verificationHistory';

// ── Authentication Helpers ───────────────────────────────────────────────────

function requireUserUid(): { uid: string; displayName: string; email: string } {
  const user = auth.currentUser;
  const sessionUser = getActiveSessionUser();
  const uid = user?.uid || sessionUser?.id || getActiveSessionUid();
  if (!uid) {
    throw new SocietyServiceError(
      'AUTH_EXPIRED',
      'You must be signed in to perform this verification workflow action.',
    );
  }
  const displayName =
    user?.displayName ||
    sessionUser?.name ||
    user?.email?.split('@')[0] ||
    sessionUser?.email?.split('@')[0] ||
    'Authorized User';
  const email = user?.email || sessionUser?.email || '';
  return { uid, displayName, email };
}

// ── Normalization Helpers ────────────────────────────────────────────────────

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  return null;
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}

function normalizeDiscrepancyDoc(id: string, data: DocumentData): PropertyDiscrepancy {
  const record = data as Record<string, unknown>;
  return {
    id,
    societyId: typeof record.societyId === 'string' ? record.societyId : '',
    buildingId: toNullableString(record.buildingId),
    floorId: toNullableString(record.floorId),
    flatId: toNullableString(record.flatId),
    propertyId: toNullableString(record.propertyId),
    caseId: toNullableString(record.caseId),
    type: typeof record.type === 'string' ? (record.type as PropertyDiscrepancy['type']) : 'OTHER',
    title: typeof record.title === 'string' ? record.title : 'Recorded Discrepancy',
    description: typeof record.description === 'string' ? record.description : '',
    severity: typeof record.severity === 'string' ? (record.severity as PropertyDiscrepancy['severity']) : 'MEDIUM',
    status: typeof record.status === 'string' ? (record.status as CaseStatus) : 'OPEN',
    location:
      typeof record.location === 'object' && record.location !== null
        ? {
            latitude: (record.location as { latitude: number }).latitude,
            longitude: (record.location as { longitude: number }).longitude,
          }
        : null,
    createdBy: typeof record.createdBy === 'string' ? record.createdBy : '',
    createdByName: toNullableString(record.createdByName),
    assignedOfficerId: toNullableString(record.assignedOfficerId),
    assignedOfficerName: toNullableString(record.assignedOfficerName),
    resolution: toNullableString(record.resolution),
    resolvedAt: toDate(record.resolvedAt),
    createdAt: toDate(record.createdAt),
    updatedAt: toDate(record.updatedAt),
  };
}

function normalizeCaseDoc(id: string, data: DocumentData): VerificationCase {
  const record = data as Record<string, unknown>;
  return {
    id,
    caseNumber: typeof record.caseNumber === 'string' ? record.caseNumber : `CASE-${id.slice(0, 6).toUpperCase()}`,
    title: typeof record.title === 'string' ? record.title : 'Verification Case',
    societyId: typeof record.societyId === 'string' ? record.societyId : '',
    buildingId: toNullableString(record.buildingId),
    floorId: toNullableString(record.floorId),
    flatId: toNullableString(record.flatId),
    propertyId: toNullableString(record.propertyId),
    discrepancyIds: Array.isArray(record.discrepancyIds)
      ? record.discrepancyIds.filter((d) => typeof d === 'string')
      : [],
    status: typeof record.status === 'string' ? (record.status as CaseStatus) : 'OPEN',
    severity: typeof record.severity === 'string' ? (record.severity as VerificationCase['severity']) : 'MEDIUM',
    assignedOfficerId: toNullableString(record.assignedOfficerId),
    assignedOfficerName: toNullableString(record.assignedOfficerName),
    assignedAt: toDate(record.assignedAt),
    createdBy: typeof record.createdBy === 'string' ? record.createdBy : '',
    createdByName: toNullableString(record.createdByName),
    decision: (record.decision as VerificationCase['decision']) || null,
    decisionReason: toNullableString(record.decisionReason),
    decisionMadeBy: toNullableString(record.decisionMadeBy),
    decisionMadeByName: toNullableString(record.decisionMadeByName),
    decisionMadeAt: toDate(record.decisionMadeAt),
    closedAt: toDate(record.closedAt),
    createdAt: toDate(record.createdAt),
    updatedAt: toDate(record.updatedAt),
  };
}

function normalizeEvidenceDoc(id: string, data: DocumentData): VerificationEvidence {
  const record = data as Record<string, unknown>;
  return {
    id,
    caseId: toNullableString(record.caseId),
    discrepancyId: toNullableString(record.discrepancyId),
    societyId: typeof record.societyId === 'string' ? record.societyId : '',
    buildingId: toNullableString(record.buildingId),
    floorId: toNullableString(record.floorId),
    flatId: toNullableString(record.flatId),
    propertyId: toNullableString(record.propertyId),
    type: typeof record.type === 'string' ? (record.type as VerificationEvidence['type']) : 'OTHER',
    fileName: typeof record.fileName === 'string' ? record.fileName : 'file',
    fileSize: typeof record.fileSize === 'number' ? record.fileSize : 0,
    mimeType: typeof record.mimeType === 'string' ? record.mimeType : 'application/octet-stream',
    storagePath: typeof record.storagePath === 'string' ? record.storagePath : '',
    downloadUrl: typeof record.downloadUrl === 'string' ? record.downloadUrl : '',
    uploadedBy: typeof record.uploadedBy === 'string' ? record.uploadedBy : '',
    uploadedByName: toNullableString(record.uploadedByName),
    uploadedByRole: (record.uploadedByRole as VerificationEvidence['uploadedByRole']) || 'government-officer',
    description: typeof record.description === 'string' ? record.description : '',
    createdAt: toDate(record.createdAt),
  };
}

function normalizeNoteDoc(id: string, data: DocumentData): InvestigationNote {
  const record = data as Record<string, unknown>;
  return {
    id,
    caseId: typeof record.caseId === 'string' ? record.caseId : '',
    text: typeof record.text === 'string' ? record.text : '',
    authorId: typeof record.authorId === 'string' ? record.authorId : '',
    authorName: typeof record.authorName === 'string' ? record.authorName : 'Officer',
    authorRole: typeof record.authorRole === 'string' ? record.authorRole : 'Government Officer',
    createdAt: toDate(record.createdAt),
  };
}

function normalizeAuditDoc(id: string, data: DocumentData): CaseAuditHistory {
  const record = data as Record<string, unknown>;
  return {
    id,
    caseId: toNullableString(record.caseId),
    discrepancyId: toNullableString(record.discrepancyId),
    societyId: typeof record.societyId === 'string' ? record.societyId : '',
    buildingId: toNullableString(record.buildingId),
    floorId: toNullableString(record.floorId),
    flatId: toNullableString(record.flatId),
    action: (record.action as CaseAuditHistory['action']) || 'STATUS_CHANGED',
    previousStatus: toNullableString(record.previousStatus),
    newStatus: typeof record.newStatus === 'string' ? record.newStatus : 'OPEN',
    performedBy: typeof record.performedBy === 'string' ? record.performedBy : '',
    performedByName: toNullableString(record.performedByName),
    performedByRole: toNullableString(record.performedByRole),
    reason: typeof record.reason === 'string' ? record.reason : '',
    createdAt: toDate(record.createdAt),
  };
}

// ── Append-Only Audit Trail Helper ──────────────────────────────────────────

async function logAuditRecord(params: {
  caseId?: string | null;
  discrepancyId?: string | null;
  societyId: string;
  buildingId?: string | null;
  floorId?: string | null;
  flatId?: string | null;
  action: CaseAuditHistory['action'];
  previousStatus: string | null;
  newStatus: string;
  reason: string;
  role?: string;
}): Promise<void> {
  const { uid, displayName } = requireUserUid();
  const histRef = doc(collection(db, VERIFICATION_HISTORY_COLLECTION));
  const data: WithFieldValue<CaseAuditHistoryDocument> = {
    caseId: params.caseId ?? null,
    discrepancyId: params.discrepancyId ?? null,
    societyId: params.societyId,
    buildingId: params.buildingId ?? null,
    floorId: params.floorId ?? null,
    flatId: params.flatId ?? null,
    action: params.action,
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    performedBy: uid,
    performedByName: displayName,
    performedByRole: params.role || 'Government Officer',
    reason: params.reason.trim(),
    createdAt: serverTimestamp(),
  };

  await setDoc(histRef, data);
}

// ── 1. Discrepancy Management ────────────────────────────────────────────────

/**
 * Creates a new property discrepancy and records an initial audit entry.
 * Can optionally auto-create a verification case.
 */
export async function createPropertyDiscrepancy(
  input: CreateDiscrepancyInput,
): Promise<{ discrepancyId: string; caseId?: string }> {
  const { uid, displayName } = requireUserUid();
  const now = serverTimestamp();
  const discRef = doc(collection(db, DISCREPANCIES_COLLECTION));
  const discrepancyId = discRef.id;

  const discrepancyData: WithFieldValue<PropertyDiscrepancyDocument> = {
    societyId: input.societyId,
    buildingId: input.buildingId ?? null,
    floorId: input.floorId ?? null,
    flatId: input.flatId ?? null,
    propertyId: input.propertyId ?? null,
    caseId: null,
    type: input.type,
    title: input.title.trim(),
    description: input.description.trim(),
    severity: input.severity,
    status: 'OPEN',
    location: input.location || null,
    createdBy: uid,
    createdByName: displayName,
    assignedOfficerId: null,
    assignedOfficerName: null,
    resolution: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(discRef, discrepancyData);

    await logAuditRecord({
      discrepancyId,
      societyId: input.societyId,
      buildingId: input.buildingId,
      floorId: input.floorId,
      flatId: input.flatId,
      action: 'DISCREPANCY_FLAGGED',
      previousStatus: null,
      newStatus: 'OPEN',
      reason: `Flagged discrepancy: ${input.title} (${input.type})`,
    });

    let caseId: string | undefined = undefined;

    if (input.openVerificationCase) {
      const createdCase = await createVerificationCase({
        title: `Verification Case: ${input.title}`,
        societyId: input.societyId,
        buildingId: input.buildingId,
        floorId: input.floorId,
        flatId: input.flatId,
        propertyId: input.propertyId,
        discrepancyIds: [discrepancyId],
        severity: input.severity,
        initialNote: `Auto-created from discrepancy: ${input.description}`,
      });
      caseId = createdCase.id;

      // Link case ID back to discrepancy
      await updateDoc(discRef, { caseId, updatedAt: serverTimestamp() });
    }

    return { discrepancyId, caseId };
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Fetches a single discrepancy by ID. */
export async function getPropertyDiscrepancy(discrepancyId: string): Promise<PropertyDiscrepancy | null> {
  if (!discrepancyId) return null;
  try {
    const snap = await getDoc(doc(db, DISCREPANCIES_COLLECTION, discrepancyId));
    if (!snap.exists()) return null;
    return normalizeDiscrepancyDoc(snap.id, snap.data());
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Fetches all discrepancies for a given society. */
export async function getDiscrepanciesForSociety(societyId: string): Promise<PropertyDiscrepancy[]> {
  if (!societyId) return [];
  try {
    const q = query(
      collection(db, DISCREPANCIES_COLLECTION),
      where('societyId', '==', societyId),
    );
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => normalizeDiscrepancyDoc(d.id, d.data()));
    items.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    return items;
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Updates discrepancy resolution status with mandatory reason. */
export async function resolveDiscrepancy(params: {
  discrepancyId: string;
  resolution: string;
  status: 'RESOLVED' | 'REJECTED';
}): Promise<void> {
  requireUserUid();
  try {
    const existing = await getPropertyDiscrepancy(params.discrepancyId);
    if (!existing) {
      throw new SocietyServiceError('NOT_FOUND', 'Discrepancy record not found.');
    }

    const now = serverTimestamp();
    await updateDoc(doc(db, DISCREPANCIES_COLLECTION, params.discrepancyId), {
      status: params.status,
      resolution: params.resolution.trim(),
      resolvedAt: now,
      updatedAt: now,
    });

    await logAuditRecord({
      discrepancyId: params.discrepancyId,
      caseId: existing.caseId,
      societyId: existing.societyId,
      buildingId: existing.buildingId,
      floorId: existing.floorId,
      flatId: existing.flatId,
      action: 'DISCREPANCY_RESOLVED',
      previousStatus: existing.status,
      newStatus: params.status,
      reason: params.resolution.trim(),
    });
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

// ── 2. Verification Case Management ──────────────────────────────────────────

/**
 * Creates a new verification case grouping discrepancies, property scope, and notes.
 */
export async function createVerificationCase(
  input: CreateVerificationCaseInput,
): Promise<VerificationCase> {
  const { uid, displayName } = requireUserUid();
  const caseRef = doc(collection(db, VERIFICATION_CASES_COLLECTION));
  const caseId = caseRef.id;
  const now = serverTimestamp();

  const caseNumber = `CASE-${new Date().getFullYear()}-${caseId.slice(0, 4).toUpperCase()}`;

  const caseData: WithFieldValue<VerificationCaseDocument> = {
    caseNumber,
    title: input.title.trim(),
    societyId: input.societyId,
    buildingId: input.buildingId ?? null,
    floorId: input.floorId ?? null,
    flatId: input.flatId ?? null,
    propertyId: input.propertyId ?? null,
    discrepancyIds: input.discrepancyIds || [],
    status: input.assignedOfficerId ? 'ASSIGNED' : 'OPEN',
    severity: input.severity,
    assignedOfficerId: input.assignedOfficerId ?? null,
    assignedOfficerName: input.assignedOfficerName ?? null,
    assignedAt: input.assignedOfficerId ? now : null,
    createdBy: uid,
    createdByName: displayName,
    decision: null,
    decisionReason: null,
    decisionMadeBy: null,
    decisionMadeByName: null,
    decisionMadeAt: null,
    closedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(caseRef, caseData);

    // If initial note provided, append to notes subcollection
    if (input.initialNote?.trim()) {
      const noteRef = doc(collection(db, VERIFICATION_CASES_COLLECTION, caseId, 'notes'));
      const noteData: WithFieldValue<InvestigationNoteDocument> = {
        caseId,
        text: input.initialNote.trim(),
        authorId: uid,
        authorName: displayName,
        authorRole: 'Government Officer',
        createdAt: now,
      };
      await setDoc(noteRef, noteData);
    }

    // Link discrepancy records to this case
    if (input.discrepancyIds && input.discrepancyIds.length > 0) {
      const batch = writeBatch(db);
      for (const discId of input.discrepancyIds) {
        batch.update(doc(db, DISCREPANCIES_COLLECTION, discId), {
          caseId,
          updatedAt: now,
        });
      }
      await batch.commit();
    }

    await logAuditRecord({
      caseId,
      societyId: input.societyId,
      buildingId: input.buildingId,
      floorId: input.floorId,
      flatId: input.flatId,
      action: 'CASE_CREATED',
      previousStatus: null,
      newStatus: input.assignedOfficerId ? 'ASSIGNED' : 'OPEN',
      reason: `Case ${caseNumber} created: ${input.title}`,
    });

    const saved = await getDoc(caseRef);
    return normalizeCaseDoc(saved.id, saved.data() || {});
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Fetches a verification case by ID. */
export async function getVerificationCaseById(caseId: string): Promise<VerificationCase | null> {
  if (!caseId) return null;
  try {
    const snap = await getDoc(doc(db, VERIFICATION_CASES_COLLECTION, caseId));
    if (!snap.exists()) return null;
    return normalizeCaseDoc(snap.id, snap.data());
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Fetches all verification cases for a society. */
export async function getVerificationCasesForSociety(societyId: string): Promise<VerificationCase[]> {
  if (!societyId) return [];
  try {
    const q = query(
      collection(db, VERIFICATION_CASES_COLLECTION),
      where('societyId', '==', societyId),
    );
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => normalizeCaseDoc(d.id, d.data()));
    items.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    return items;
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Fetches all verification cases across the platform. */
export async function getAllVerificationCases(): Promise<VerificationCase[]> {
  try {
    const snap = await getDocs(collection(db, VERIFICATION_CASES_COLLECTION));
    const items = snap.docs.map((d) => normalizeCaseDoc(d.id, d.data()));
    items.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    return items;
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Assigns a government officer to a verification case. */
export async function assignOfficerToCase(params: {
  caseId: string;
  officerId: string;
  officerName: string;
  notes?: string;
}): Promise<void> {
  requireUserUid();
  try {
    const existing = await getVerificationCaseById(params.caseId);
    if (!existing) {
      throw new SocietyServiceError('NOT_FOUND', 'Verification case not found.');
    }

    const now = serverTimestamp();
    const newStatus: CaseStatus = existing.status === 'OPEN' ? 'ASSIGNED' : existing.status;

    await updateDoc(doc(db, VERIFICATION_CASES_COLLECTION, params.caseId), {
      assignedOfficerId: params.officerId,
      assignedOfficerName: params.officerName,
      assignedAt: now,
      status: newStatus,
      updatedAt: now,
    });

    await logAuditRecord({
      caseId: params.caseId,
      societyId: existing.societyId,
      buildingId: existing.buildingId,
      floorId: existing.floorId,
      flatId: existing.flatId,
      action: 'CASE_ASSIGNED',
      previousStatus: existing.status,
      newStatus,
      reason: `Assigned to ${params.officerName}. ${params.notes || ''}`.trim(),
    });

    if (existing.createdBy) {
      createNotification({
        recipientUid: existing.createdBy,
        societyId: existing.societyId,
        type: 'CASE_ASSIGNED',
        title: `Officer Assigned: Case ${existing.caseNumber}`,
        message: `Government Officer ${params.officerName} has been assigned to inspect and process your case.`,
        relatedEntityType: 'case',
        relatedEntityId: params.caseId,
        relatedCaseId: params.caseId,
        relatedPropertyId: existing.flatId || '',
        severity: 'INFO',
        linkUrl: `/resident/cases/${params.caseId}`,
      }).catch((e) => console.warn('Notification trigger warning:', e));
    }
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Validates and updates case status transition. */
export async function updateCaseStatus(params: {
  caseId: string;
  newStatus: CaseStatus;
  reason: string;
}): Promise<void> {
  requireUserUid();
  try {
    const existing = await getVerificationCaseById(params.caseId);
    if (!existing) {
      throw new SocietyServiceError('NOT_FOUND', 'Verification case not found.');
    }

    // Controlled status transitions: prevent casual RESOLVED -> OPEN without explicit reopening
    if (existing.status === 'RESOLVED' && params.newStatus === 'OPEN') {
      throw new SocietyServiceError(
        'UNAVAILABLE',
        'Resolved cases cannot be set to Open directly. Use the explicit "Reopen Case" action with reasons.',
      );
    }

    const now = serverTimestamp();
    const isClosing = params.newStatus === 'RESOLVED' || params.newStatus === 'REJECTED';

    await updateDoc(doc(db, VERIFICATION_CASES_COLLECTION, params.caseId), {
      status: params.newStatus,
      closedAt: isClosing ? now : existing.closedAt,
      updatedAt: now,
    });

    const isReopen = (existing.status === 'RESOLVED' || existing.status === 'REJECTED') && (params.newStatus === 'UNDER_INVESTIGATION' || params.newStatus === 'ASSIGNED');

    await logAuditRecord({
      caseId: params.caseId,
      societyId: existing.societyId,
      buildingId: existing.buildingId,
      floorId: existing.floorId,
      flatId: existing.flatId,
      action: isReopen ? 'CASE_REOPENED' : isClosing ? 'CASE_CLOSED' : 'STATUS_CHANGED',
      previousStatus: existing.status,
      newStatus: params.newStatus,
      reason: params.reason.trim(),
    });

    if (existing.createdBy) {
      createNotification({
        recipientUid: existing.createdBy,
        societyId: existing.societyId,
        type: 'CASE_STATUS_CHANGED',
        title: `Case ${existing.caseNumber} Status: ${params.newStatus}`,
        message: `Status updated to ${params.newStatus}. ${params.reason ? `Reason: ${params.reason}` : ''}`,
        relatedEntityType: 'case',
        relatedEntityId: params.caseId,
        relatedCaseId: params.caseId,
        relatedPropertyId: existing.flatId || '',
        severity: isClosing ? 'SUCCESS' : 'INFO',
        linkUrl: `/resident/cases/${params.caseId}`,
      }).catch((e) => console.warn('Notification trigger warning:', e));
    }
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Records an official verification decision on a case with mandatory justification. */
export async function recordCaseDecision(input: RecordCaseDecisionInput): Promise<void> {
  const { uid, displayName } = requireUserUid();

  if (!input.reason.trim()) {
    throw new SocietyServiceError(
      'UNAVAILABLE',
      'An official verification decision requires a detailed explanation and reason.',
    );
  }

  try {
    const existing = await getVerificationCaseById(input.caseId);
    if (!existing) {
      throw new SocietyServiceError('NOT_FOUND', 'Verification case not found.');
    }

    const now = serverTimestamp();
    let newStatus: CaseStatus = input.newStatus || 'RESOLVED';
    if (input.decision === 'REJECTED') newStatus = 'REJECTED';
    else if (input.decision === 'REINSPECTION_REQUIRED') newStatus = 'REINSPECTION_REQUIRED';
    else if (input.decision === 'REQUIRES_CORRECTION') newStatus = 'EVIDENCE_REQUIRED';
    else if (input.decision === 'VERIFIED') newStatus = 'RESOLVED';

    await updateDoc(doc(db, VERIFICATION_CASES_COLLECTION, input.caseId), {
      decision: input.decision,
      decisionReason: input.reason.trim(),
      decisionMadeBy: uid,
      decisionMadeByName: displayName,
      decisionMadeAt: now,
      status: newStatus,
      closedAt: newStatus === 'RESOLVED' || newStatus === 'REJECTED' ? now : null,
      updatedAt: now,
    });

    await logAuditRecord({
      caseId: input.caseId,
      societyId: existing.societyId,
      buildingId: existing.buildingId,
      floorId: existing.floorId,
      flatId: existing.flatId,
      action: 'DECISION_MADE',
      previousStatus: existing.status,
      newStatus,
      reason: `Decision: ${input.decision}. Justification: ${input.reason.trim()}`,
    });

    if (existing.createdBy) {
      createNotification({
        recipientUid: existing.createdBy,
        societyId: existing.societyId,
        type: 'GOVERNMENT_DECISION',
        title: `Official Decision: Case ${existing.caseNumber}`,
        message: `Determination: ${input.decision.replace(/_/g, ' ')}. Justification: "${input.reason.trim()}".`,
        relatedEntityType: 'case',
        relatedEntityId: input.caseId,
        relatedCaseId: input.caseId,
        relatedPropertyId: existing.flatId || '',
        severity: input.decision === 'VERIFIED' ? 'SUCCESS' : input.decision === 'REJECTED' ? 'CRITICAL' : 'WARNING',
        linkUrl: `/resident/cases/${input.caseId}`,
      }).catch((e) => console.warn('Notification trigger warning:', e));
    }
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

// ── 3. Investigation Notes ───────────────────────────────────────────────────

/** Appends an immutable investigation note to a verification case. */
export async function addInvestigationNote(params: {
  caseId: string;
  text: string;
  role?: string;
}): Promise<InvestigationNote> {
  const { uid, displayName } = requireUserUid();

  if (!params.text.trim()) {
    throw new SocietyServiceError('UNAVAILABLE', 'Investigation note text cannot be empty.');
  }

  try {
    const existing = await getVerificationCaseById(params.caseId);
    if (!existing) {
      throw new SocietyServiceError('NOT_FOUND', 'Verification case not found.');
    }

    const now = serverTimestamp();
    const noteRef = doc(collection(db, VERIFICATION_CASES_COLLECTION, params.caseId, 'notes'));
    const noteData: WithFieldValue<InvestigationNoteDocument> = {
      caseId: params.caseId,
      text: params.text.trim(),
      authorId: uid,
      authorName: displayName,
      authorRole: params.role || 'Government Officer',
      createdAt: now,
    };

    await setDoc(noteRef, noteData);

    await logAuditRecord({
      caseId: params.caseId,
      societyId: existing.societyId,
      buildingId: existing.buildingId,
      floorId: existing.floorId,
      flatId: existing.flatId,
      action: 'NOTE_ADDED',
      previousStatus: existing.status,
      newStatus: existing.status,
      reason: `Investigation note added by ${displayName}`,
    });

    const saved = await getDoc(noteRef);
    return normalizeNoteDoc(saved.id, saved.data() || {});
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Fetches all investigation notes for a case (sorted chronologically). */
export async function getInvestigationNotes(caseId: string): Promise<InvestigationNote[]> {
  if (!caseId) return [];
  try {
    const q = collection(db, VERIFICATION_CASES_COLLECTION, caseId, 'notes');
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => normalizeNoteDoc(d.id, d.data()));
    list.sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
    return list;
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

// ── 4. Evidence Management (Firebase Storage + Firestore) ────────────────────

const ALLOWED_EVIDENCE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const MAX_EVIDENCE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Validates, uploads a file to Firebase Storage, records metadata in Firestore, and logs audit record.
 */
export async function uploadVerificationEvidence(
  input: UploadEvidenceInput,
  onProgress?: (percent: number) => void,
): Promise<VerificationEvidence> {
  const { uid, displayName } = requireUserUid();
  const file = input.file;

  if (!file) {
    throw new SocietyServiceError('UNAVAILABLE', 'No file was provided for evidence upload.');
  }

  if (!ALLOWED_EVIDENCE_MIME_TYPES.includes(file.type)) {
    throw new SocietyServiceError(
      'UNKNOWN',
      `Unsupported file type (${file.type}). Allowed formats: JPEG, PNG, WEBP, and PDF documents.`,
    );
  }

  if (file.size > MAX_EVIDENCE_SIZE_BYTES) {
    throw new SocietyServiceError(
      'UNKNOWN',
      `File size exceeds 15 MB limit (file size: ${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    );
  }

  const safeName = sanitizeFileName(file.name);
  const timestamp = Date.now();
  const parentFolder = input.caseId || input.discrepancyId || 'general';
  const storagePath = `verification-evidence/${input.societyId}/${parentFolder}/${timestamp}-${safeName}`;

  try {
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        societyId: input.societyId,
        uploadedBy: uid,
        originalName: file.name,
      },
    });

    if (onProgress) {
      uploadTask.on('state_changed', (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress(percent);
      });
    }

    await uploadTask;
    const downloadUrl = await getDownloadURL(storageRef);

    const now = serverTimestamp();
    const evidenceRef = doc(collection(db, EVIDENCE_COLLECTION));
    const evidenceId = evidenceRef.id;

    const evidenceData: WithFieldValue<VerificationEvidenceDocument> = {
      caseId: input.caseId ?? null,
      discrepancyId: input.discrepancyId ?? null,
      societyId: input.societyId,
      buildingId: input.buildingId ?? null,
      floorId: input.floorId ?? null,
      flatId: input.flatId ?? null,
      propertyId: input.propertyId ?? null,
      type: input.type,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      storagePath,
      downloadUrl,
      uploadedBy: uid,
      uploadedByName: displayName,
      uploadedByRole: 'government-officer',
      description: input.description.trim(),
      createdAt: now,
    };

    await setDoc(evidenceRef, evidenceData);

    await logAuditRecord({
      caseId: input.caseId,
      discrepancyId: input.discrepancyId,
      societyId: input.societyId,
      buildingId: input.buildingId,
      floorId: input.floorId,
      flatId: input.flatId,
      action: 'EVIDENCE_ADDED',
      previousStatus: null,
      newStatus: 'EVIDENCE_ATTACHED',
      reason: `Uploaded evidence: ${file.name} (${input.type})`,
    });

    const saved = await getDoc(evidenceRef);
    return normalizeEvidenceDoc(saved.id, saved.data() || {});
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Fetches all evidence items attached to a verification case. */
export async function getEvidenceForCase(caseId: string): Promise<VerificationEvidence[]> {
  if (!caseId) return [];
  try {
    const q = query(
      collection(db, EVIDENCE_COLLECTION),
      where('caseId', '==', caseId),
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => normalizeEvidenceDoc(d.id, d.data()));
    list.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    return list;
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Fetches all evidence items for a given society. */
export async function getEvidenceForSociety(societyId: string): Promise<VerificationEvidence[]> {
  if (!societyId) return [];
  try {
    const q = query(
      collection(db, EVIDENCE_COLLECTION),
      where('societyId', '==', societyId),
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => normalizeEvidenceDoc(d.id, d.data()));
    list.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    return list;
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

// ── 5. Audit History Retrieval ───────────────────────────────────────────────

/** Fetches audit history entries for a specific case. */
export async function getAuditHistoryForCase(caseId: string): Promise<CaseAuditHistory[]> {
  if (!caseId) return [];
  try {
    const q = query(
      collection(db, VERIFICATION_HISTORY_COLLECTION),
      where('caseId', '==', caseId),
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => normalizeAuditDoc(d.id, d.data()));
    list.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    return list;
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

// ── 6. Dashboard Dispute Metrics ─────────────────────────────────────────────

export interface DisputeDashboardStats {
  totalCases: number;
  openCases: number;
  assignedCases: number;
  underInvestigation: number;
  evidenceRequired: number;
  reinspectionRequired: number;
  resolvedCases: number;
  rejectedCases: number;
  totalDiscrepancies: number;
  openDiscrepancies: number;
  recentAuditActivity: CaseAuditHistory[];
}

/** Computes real Firestore statistics for the Disputes & Verification Dashboard. */
export async function getDisputeDashboardStats(): Promise<DisputeDashboardStats> {
  try {
    const [casesSnap, discSnap, histSnap] = await Promise.all([
      getDocs(collection(db, VERIFICATION_CASES_COLLECTION)),
      getDocs(collection(db, DISCREPANCIES_COLLECTION)),
      getDocs(collection(db, VERIFICATION_HISTORY_COLLECTION)),
    ]);

    const cases = casesSnap.docs.map((d) => normalizeCaseDoc(d.id, d.data()));
    const discrepancies = discSnap.docs.map((d) => normalizeDiscrepancyDoc(d.id, d.data()));
    const history = histSnap.docs.map((d) => normalizeAuditDoc(d.id, d.data()));

    let openCases = 0;
    let assignedCases = 0;
    let underInvestigation = 0;
    let evidenceRequired = 0;
    let reinspectionRequired = 0;
    let resolvedCases = 0;
    let rejectedCases = 0;

    cases.forEach((c) => {
      if (c.status === 'OPEN') openCases++;
      else if (c.status === 'ASSIGNED') assignedCases++;
      else if (c.status === 'UNDER_INVESTIGATION') underInvestigation++;
      else if (c.status === 'EVIDENCE_REQUIRED') evidenceRequired++;
      else if (c.status === 'REINSPECTION_REQUIRED') reinspectionRequired++;
      else if (c.status === 'RESOLVED') resolvedCases++;
      else if (c.status === 'REJECTED') rejectedCases++;
    });

    const openDiscrepancies = discrepancies.filter(
      (d) => d.status === 'OPEN' || d.status === 'ASSIGNED' || d.status === 'UNDER_INVESTIGATION' || d.status === 'EVIDENCE_REQUIRED',
    ).length;

    history.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));

    return {
      totalCases: cases.length,
      openCases,
      assignedCases,
      underInvestigation,
      evidenceRequired,
      reinspectionRequired,
      resolvedCases,
      rejectedCases,
      totalDiscrepancies: discrepancies.length,
      openDiscrepancies,
      recentAuditActivity: history.slice(0, 15),
    };
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}
