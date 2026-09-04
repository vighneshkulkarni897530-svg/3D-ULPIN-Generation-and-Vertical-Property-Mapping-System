/**
 * Government Officer & Verification Firestore service (Phase 4)
 * =============================================================
 * All Firestore access for Government Officer verification, auditing,
 * and discrepancy tracking lives here.
 *
 * Security invariants (enforced here AND mirrored in `firestore.rules`):
 *   - Officer UID is ALWAYS derived from `auth.currentUser.uid` — never from
 *     client form fields.
 *   - Verification records are stored in `verifications/{targetType}_{targetId}`
 *     using deterministic IDs to ensure O(1) reads and prevent duplicates.
 *   - Every verification decision atomically appends an immutable audit
 *     record to `verificationHistory/{historyId}`.
 *   - Officers cannot modify underlying master records (societies, buildings,
 *     floors, flats, resident profiles) directly through verification workflows.
 *   - Discrepancy flags are created with verified officer attribution and lifecycle
 *     management (open → under-review → resolved/dismissed).
 *   - Safe against client-side rendering anomalies (hydration safe).
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
  type FirestoreError,
  type WithFieldValue,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { getActiveSessionUid, getActiveSessionUser } from '@/lib/auth/clientSession';
import {
  type CreateDiscrepancyPayload,
  type Discrepancy,
  type DiscrepancyCategory,
  type DiscrepancyDocument,
  type DiscrepancyStatus,
  type GovernmentOfficer,
  type GovernmentOfficerDocument,
  type GovVerification,
  type GovVerificationDocument,
  type GovVerificationHistory,
  type GovVerificationHistoryDocument,
  type GovVerificationStatus,
  type RecordVerificationPayload,
  type VerificationTargetType,
} from '@/types/society';
import {
  getSocietyById,
  SOCIETIES_COLLECTION,
  SocietyServiceError,
  normalizeFirestoreError,
} from './service';
import { getBuildings } from './buildingService';
import { getFloors } from './floorService';
import { getFlats } from './flatService';
import { getSocietyResidents } from './residentService';

// ── Collection constants ─────────────────────────────────────────────────────

export const GOVERNMENT_OFFICERS_COLLECTION = 'governmentOfficers';
export const VERIFICATIONS_COLLECTION = 'verifications';
export const VERIFICATION_HISTORY_COLLECTION = 'verificationHistory';
export const DISCREPANCIES_COLLECTION = 'discrepancies';

/** Deterministic document ID for verification records: `{targetType}_{targetId}` */
export function verificationDocId(targetType: VerificationTargetType, targetId: string): string {
  return `${targetType}_${targetId}`;
}

export function govOfficerDocRef(userId: string) {
  return doc(db, GOVERNMENT_OFFICERS_COLLECTION, userId);
}

export function verificationDocRef(targetType: VerificationTargetType, targetId: string) {
  return doc(db, VERIFICATIONS_COLLECTION, verificationDocId(targetType, targetId));
}

export function discrepancyDocRef(discrepancyId: string) {
  return doc(db, DISCREPANCIES_COLLECTION, discrepancyId);
}

// ── Authentication Helpers ───────────────────────────────────────────────────

function requireOfficerUid(): string {
  const uid = getActiveSessionUid() || auth.currentUser?.uid;
  if (!uid) {
    throw new SocietyServiceError(
      'AUTH_EXPIRED',
      'You must be signed in as a Government Officer to perform this action.',
    );
  }
  return uid;
}

function getOfficerDisplayName(): string {
  const sessionUser = getActiveSessionUser();
  return (
    auth.currentUser?.displayName ||
    sessionUser?.name ||
    auth.currentUser?.email?.split('@')[0] ||
    sessionUser?.email?.split('@')[0] ||
    'Authorized Officer'
  );
}

// ── Date & Normalization Helpers ─────────────────────────────────────────────

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
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function normalizeOfficer(id: string, data: DocumentData): GovernmentOfficer {
  const record = data as Record<string, unknown>;
  return {
    id,
    userId: typeof record.userId === 'string' ? record.userId : id,
    name: typeof record.name === 'string' && record.name ? record.name : 'Officer',
    email: typeof record.email === 'string' ? record.email : '',
    department:
      typeof record.department === 'string' && record.department
        ? record.department
        : 'Department of Land Records & Cadastre',
    designation:
      typeof record.designation === 'string' && record.designation
        ? record.designation
        : 'Cadastral Verification Officer',
    officerCode:
      typeof record.officerCode === 'string' && record.officerCode
        ? record.officerCode
        : `GOV-${id.slice(0, 6).toUpperCase()}`,
    jurisdictionDistrict: toNullableString(record.jurisdictionDistrict),
    status: record.status === 'inactive' ? 'inactive' : 'active',
    createdAt: toDate(record.createdAt),
    updatedAt: toDate(record.updatedAt),
  };
}

function normalizeVerification(id: string, data: DocumentData): GovVerification {
  const record = data as Record<string, unknown>;
  const status = (
    ['pending', 'verified', 'rejected', 'flagged', 'needs-review'] as const
  ).includes(record.status as GovVerificationStatus)
    ? (record.status as GovVerificationStatus)
    : 'pending';

  const targetType = (
    ['society', 'building', 'flat', 'resident'] as const
  ).includes(record.targetType as VerificationTargetType)
    ? (record.targetType as VerificationTargetType)
    : 'society';

  return {
    id,
    targetType,
    targetId: typeof record.targetId === 'string' ? record.targetId : '',
    societyId: typeof record.societyId === 'string' ? record.societyId : '',
    buildingId: toNullableString(record.buildingId),
    floorId: toNullableString(record.floorId),
    flatId: toNullableString(record.flatId),
    status,
    verifiedBy: typeof record.verifiedBy === 'string' ? record.verifiedBy : '',
    verifiedByOfficerName: toNullableString(record.verifiedByOfficerName),
    officerDesignation: toNullableString(record.officerDesignation),
    officerDepartment: toNullableString(record.officerDepartment),
    verifiedAt: toDate(record.verifiedAt),
    remarks: typeof record.remarks === 'string' ? record.remarks : '',
    evidenceReferences: Array.isArray(record.evidenceReferences)
      ? record.evidenceReferences.filter((e) => typeof e === 'string')
      : [],
    createdAt: toDate(record.createdAt),
    updatedAt: toDate(record.updatedAt),
  };
}

function normalizeHistory(id: string, data: DocumentData): GovVerificationHistory {
  const record = data as Record<string, unknown>;
  const action = (
    ['VERIFY', 'REJECT', 'FLAG', 'NEEDS_REVIEW', 'STATUS_CHANGE'] as const
  ).includes(record.action as GovVerificationHistory['action'])
    ? (record.action as GovVerificationHistory['action'])
    : 'STATUS_CHANGE';

  const newStatus = (
    ['pending', 'verified', 'rejected', 'flagged', 'needs-review'] as const
  ).includes(record.newStatus as GovVerificationStatus)
    ? (record.newStatus as GovVerificationStatus)
    : 'pending';

  const previousStatus = (
    ['pending', 'verified', 'rejected', 'flagged', 'needs-review', 'none'] as const
  ).includes(record.previousStatus as GovVerificationStatus | 'none')
    ? (record.previousStatus as GovVerificationStatus | 'none')
    : null;

  const targetType = (
    ['society', 'building', 'flat', 'resident'] as const
  ).includes(record.targetType as VerificationTargetType)
    ? (record.targetType as VerificationTargetType)
    : 'society';

  return {
    id,
    verificationId: typeof record.verificationId === 'string' ? record.verificationId : '',
    targetType,
    targetId: typeof record.targetId === 'string' ? record.targetId : '',
    societyId: typeof record.societyId === 'string' ? record.societyId : '',
    action,
    previousStatus,
    newStatus,
    officerId: typeof record.officerId === 'string' ? record.officerId : '',
    officerName: toNullableString(record.officerName),
    remarks: typeof record.remarks === 'string' ? record.remarks : '',
    createdAt: toDate(record.createdAt),
  };
}

function normalizeDiscrepancy(id: string, data: DocumentData): Discrepancy {
  const record = data as Record<string, unknown>;
  const targetType = (
    ['society', 'building', 'flat', 'resident', 'location', 'evidence'] as const
  ).includes(record.targetType as Discrepancy['targetType'])
    ? (record.targetType as Discrepancy['targetType'])
    : 'society';

  const category = (
    [
      'society_mismatch',
      'building_mismatch',
      'flat_mismatch',
      'resident_mismatch',
      'gis_location_discrepancy',
      'missing_evidence',
      'other',
    ] as const
  ).includes(record.category as DiscrepancyCategory)
    ? (record.category as DiscrepancyCategory)
    : 'other';

  const status = (
    ['open', 'under-review', 'resolved', 'dismissed'] as const
  ).includes(record.status as DiscrepancyStatus)
    ? (record.status as DiscrepancyStatus)
    : 'open';

  return {
    id,
    targetType,
    targetId: typeof record.targetId === 'string' ? record.targetId : '',
    societyId: typeof record.societyId === 'string' ? record.societyId : '',
    buildingId: toNullableString(record.buildingId),
    floorId: toNullableString(record.floorId),
    flatId: toNullableString(record.flatId),
    category,
    description: typeof record.description === 'string' ? record.description : '',
    officerId: typeof record.officerId === 'string' ? record.officerId : '',
    officerName: toNullableString(record.officerName),
    status,
    resolutionNotes: toNullableString(record.resolutionNotes),
    createdAt: toDate(record.createdAt),
    updatedAt: toDate(record.updatedAt),
  };
}

// ── Officer Profile Management ───────────────────────────────────────────────

/** Fetches officer metadata by user UID. */
export async function getGovernmentOfficer(userId: string): Promise<GovernmentOfficer | null> {
  if (!userId) return null;
  try {
    const snap = await getDoc(govOfficerDocRef(userId));
    if (!snap.exists()) return null;
    return normalizeOfficer(snap.id, snap.data());
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/**
 * Ensures a `governmentOfficers/{userId}` document exists for the active session.
 * Reuses existing profiles or creates an initial record.
 */
export async function ensureGovernmentOfficerProfile(
  userId: string,
  defaults?: Partial<GovernmentOfficerDocument>,
): Promise<GovernmentOfficer> {
  const existing = await getGovernmentOfficer(userId);
  if (existing) return existing;

  const now = serverTimestamp();
  const name = defaults?.name || getOfficerDisplayName();
  const email = defaults?.email || auth.currentUser?.email || getActiveSessionUser()?.email || '';

  const data: WithFieldValue<GovernmentOfficerDocument> = {
    userId,
    name,
    email,
    department: defaults?.department || 'Department of Land Records & Cadastre (Bhoomika)',
    designation: defaults?.designation || 'Senior Cadastral Revenue Officer',
    officerCode: defaults?.officerCode || `KA-REV-${userId.slice(0, 4).toUpperCase()}`,
    jurisdictionDistrict: defaults?.jurisdictionDistrict || 'Bengaluru Urban & South Division',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(govOfficerDocRef(userId), data);
    const created = await getDoc(govOfficerDocRef(userId));
    return normalizeOfficer(userId, created.data() || {});
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

// ── Verification Decision & History ──────────────────────────────────────────

/**
 * Records an official government verification decision on a society,
 * building, flat, or resident.
 *
 * Invariants:
 *   - The decision is written to `verifications/{targetType}_{targetId}`.
 *   - An audit trail record is atomically appended to `verificationHistory`.
 *   - `verifiedBy` is ALWAYS the authenticated officer UID.
 */
export async function recordVerificationDecision(
  payload: RecordVerificationPayload,
): Promise<GovVerification> {
  const uid = requireOfficerUid();
  const officerName = getOfficerDisplayName();
  const docId = verificationDocId(payload.targetType, payload.targetId);
  const verRef = verificationDocRef(payload.targetType, payload.targetId);
  const histCol = collection(db, VERIFICATION_HISTORY_COLLECTION);
  const histRef = doc(histCol);

  try {
    // Check previous verification state
    const existingSnap = await getDoc(verRef);
    const previousStatus: GovVerificationStatus | 'none' = existingSnap.exists()
      ? (existingSnap.data().status as GovVerificationStatus) || 'pending'
      : 'none';

    let action: GovVerificationHistory['action'] = 'STATUS_CHANGE';
    if (payload.status === 'verified') action = 'VERIFY';
    else if (payload.status === 'rejected') action = 'REJECT';
    else if (payload.status === 'flagged') action = 'FLAG';
    else if (payload.status === 'needs-review') action = 'NEEDS_REVIEW';

    const now = serverTimestamp();
    const existingCreatedAt = existingSnap.exists() ? existingSnap.data().createdAt : null;

    const verificationData: WithFieldValue<GovVerificationDocument> = {
      targetType: payload.targetType,
      targetId: payload.targetId,
      societyId: payload.societyId,
      buildingId: payload.buildingId ?? null,
      floorId: payload.floorId ?? null,
      flatId: payload.flatId ?? null,
      status: payload.status,
      verifiedBy: uid, // ALWAYS derived from authenticated session
      verifiedByOfficerName: officerName,
      officerDesignation: 'Cadastral Revenue Officer',
      officerDepartment: 'Department of Land Records',
      verifiedAt: now,
      remarks: payload.remarks.trim(),
      evidenceReferences: payload.evidenceReferences || [],
      createdAt: (existingCreatedAt ?? now) as WithFieldValue<GovVerificationDocument>['createdAt'],
      updatedAt: now,
    };

    const historyData: WithFieldValue<GovVerificationHistoryDocument> = {
      verificationId: docId,
      targetType: payload.targetType,
      targetId: payload.targetId,
      societyId: payload.societyId,
      action,
      previousStatus,
      newStatus: payload.status,
      officerId: uid,
      officerName,
      remarks: payload.remarks.trim(),
      createdAt: now,
    };

    const batch = writeBatch(db);
    batch.set(verRef, verificationData, { merge: true });
    batch.set(histRef, historyData);

    await batch.commit();

    const savedSnap = await getDoc(verRef);
    return normalizeVerification(savedSnap.id, savedSnap.data() || {});
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Fetches the current verification record for a specific target entity. */
export async function getVerification(
  targetType: VerificationTargetType,
  targetId: string,
): Promise<GovVerification | null> {
  if (!targetId) return null;
  try {
    const snap = await getDoc(verificationDocRef(targetType, targetId));
    if (!snap.exists()) return null;
    return normalizeVerification(snap.id, snap.data());
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Fetches all verification records belonging to a society (and its children). */
export async function getVerificationsForSociety(societyId: string): Promise<GovVerification[]> {
  if (!societyId) return [];
  try {
    const q = query(
      collection(db, VERIFICATIONS_COLLECTION),
      where('societyId', '==', societyId),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => normalizeVerification(d.id, d.data()));
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Fetches all platform verifications (for dashboard metrics and queue). */
export async function getAllVerifications(): Promise<GovVerification[]> {
  try {
    const snap = await getDocs(collection(db, VERIFICATIONS_COLLECTION));
    return snap.docs.map((d) => normalizeVerification(d.id, d.data()));
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Fetches audit history entries, optionally filtered by societyId or targetId. */
export async function getVerificationHistory(
  societyId?: string,
  targetId?: string,
): Promise<GovVerificationHistory[]> {
  try {
    let q = query(collection(db, VERIFICATION_HISTORY_COLLECTION));
    if (societyId) {
      q = query(collection(db, VERIFICATION_HISTORY_COLLECTION), where('societyId', '==', societyId));
    }
    const snap = await getDocs(q);
    let items = snap.docs.map((d) => normalizeHistory(d.id, d.data()));
    if (targetId) {
      items = items.filter((item) => item.targetId === targetId);
    }
    // Sort descending by timestamp client-side (avoids compound index requirement)
    items.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    return items;
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

// ── Discrepancy / Flag Management ────────────────────────────────────────────

/** Creates a new discrepancy/flag recorded by an officer. */
export async function createDiscrepancy(payload: CreateDiscrepancyPayload): Promise<string> {
  const uid = requireOfficerUid();
  const officerName = getOfficerDisplayName();
  const colRef = collection(db, DISCREPANCIES_COLLECTION);
  const newDoc = doc(colRef);
  const now = serverTimestamp();

  const data: WithFieldValue<DiscrepancyDocument> = {
    targetType: payload.targetType,
    targetId: payload.targetId,
    societyId: payload.societyId,
    buildingId: payload.buildingId ?? null,
    floorId: payload.floorId ?? null,
    flatId: payload.flatId ?? null,
    category: payload.category,
    description: payload.description.trim(),
    officerId: uid,
    officerName,
    status: 'open',
    resolutionNotes: null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(newDoc, data);
    return newDoc.id;
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Updates the lifecycle status of an existing discrepancy. */
export async function updateDiscrepancyStatus(
  discrepancyId: string,
  status: DiscrepancyStatus,
  resolutionNotes?: string,
): Promise<void> {
  requireOfficerUid();
  try {
    await updateDoc(discrepancyDocRef(discrepancyId), {
      status,
      resolutionNotes: toNullableString(resolutionNotes),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Fetches all discrepancies recorded for a society. */
export async function getDiscrepanciesForSociety(societyId: string): Promise<Discrepancy[]> {
  if (!societyId) return [];
  try {
    const q = query(
      collection(db, DISCREPANCIES_COLLECTION),
      where('societyId', '==', societyId),
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => normalizeDiscrepancy(d.id, d.data()));
    list.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    return list;
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Fetches all discrepancies across the platform. */
export async function getAllDiscrepancies(): Promise<Discrepancy[]> {
  try {
    const snap = await getDocs(collection(db, DISCREPANCIES_COLLECTION));
    const list = snap.docs.map((d) => normalizeDiscrepancy(d.id, d.data()));
    list.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    return list;
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

// ── Dashboard Statistics & Hierarchy Retrieval ───────────────────────────────

export interface GovernmentDashboardStats {
  totalSocieties: number;
  verifiedSocieties: number;
  pendingSocieties: number;
  flaggedSocieties: number;
  needsReviewSocieties: number;
  totalVerificationsRecorded: number;
  openDiscrepancies: number;
  recentActivity: GovVerificationHistory[];
}

/** Computes real Firestore statistics for the Government Officer Dashboard. */
export async function getGovernmentDashboardStats(): Promise<GovernmentDashboardStats> {
  try {
    const [societiesSnap, verifications, discrepancies, history] = await Promise.all([
      getDocs(collection(db, SOCIETIES_COLLECTION)),
      getAllVerifications(),
      getAllDiscrepancies(),
      getVerificationHistory(),
    ]);

    const totalSocieties = societiesSnap.size;
    const societyVerifications = verifications.filter((v) => v.targetType === 'society');
    const verifiedMap = new Map<string, GovVerificationStatus>();

    societyVerifications.forEach((v) => {
      verifiedMap.set(v.targetId, v.status);
    });

    let verifiedSocieties = 0;
    let flaggedSocieties = 0;
    let needsReviewSocieties = 0;
    let pendingSocieties = 0;

    societiesSnap.docs.forEach((docSnap) => {
      const status = verifiedMap.get(docSnap.id) || 'pending';
      if (status === 'verified') verifiedSocieties++;
      else if (status === 'flagged') flaggedSocieties++;
      else if (status === 'needs-review') needsReviewSocieties++;
      else pendingSocieties++;
    });

    const openDiscrepancies = discrepancies.filter((d) => d.status === 'open' || d.status === 'under-review').length;

    return {
      totalSocieties,
      verifiedSocieties,
      pendingSocieties,
      flaggedSocieties,
      needsReviewSocieties,
      totalVerificationsRecorded: verifications.length,
      openDiscrepancies,
      recentActivity: history.slice(0, 10),
    };
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

export interface SocietyFullHierarchyData {
  society: import('@/types/society').Society;
  societyVerification: GovVerification | null;
  buildings: (import('@/types/society').Building & {
    verification: GovVerification | null;
    floors: (import('@/types/society').Floor & {
      flats: (import('@/types/society').Flat & {
        verification: GovVerification | null;
      })[];
    })[];
  })[];
  residents: (import('@/types/society').Resident & {
    verification: GovVerification | null;
  })[];
  verifications: GovVerification[];
  discrepancies: Discrepancy[];
  history: GovVerificationHistory[];
}

/**
 * Loads the complete hierarchical structure (Society → Building → Floor → Flat → Resident)
 * along with corresponding verification states, discrepancy flags, and audit history.
 */
export async function getSocietyFullHierarchy(societyId: string): Promise<SocietyFullHierarchyData | null> {
  if (!societyId) return null;

  try {
    const society = await getSocietyById(societyId);
    if (!society) return null;

    const [rawBuildings, rawResidents, verifications, discrepancies, history] =
      await Promise.all([
        getBuildings(societyId),
        getSocietyResidents(societyId),
        getVerificationsForSociety(societyId),
        getDiscrepanciesForSociety(societyId),
        getVerificationHistory(societyId),
      ]);

    // Map verification lookup
    const verMap = new Map<string, GovVerification>();
    verifications.forEach((v) => {
      verMap.set(verificationDocId(v.targetType, v.targetId), v);
    });

    const societyVerification = verMap.get(verificationDocId('society', societyId)) || null;

    // Fetch floors and flats for each building
    const buildings = await Promise.all(
      rawBuildings.map(async (b) => {
        const bVerification = verMap.get(verificationDocId('building', b.id)) || null;
        const rawFloors = await getFloors(societyId, b.id);

        const floors = await Promise.all(
          rawFloors.map(async (f) => {
            const rawFlats = await getFlats(societyId, b.id, f.id);
            const flats = rawFlats.map((flat) => ({
              ...flat,
              verification: verMap.get(verificationDocId('flat', flat.id)) || null,
            }));
            return { ...f, flats };
          }),
        );

        return { ...b, verification: bVerification, floors };
      }),
    );

    const residents = rawResidents.map((r) => ({
      ...r,
      verification: verMap.get(verificationDocId('resident', r.id)) || null,
    }));

    return {
      society,
      societyVerification,
      buildings,
      residents,
      verifications,
      discrepancies,
      history,
    };
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}
