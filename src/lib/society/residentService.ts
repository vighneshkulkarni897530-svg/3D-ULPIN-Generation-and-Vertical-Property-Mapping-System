/**
 * Resident Firestore service (Phase 3)
 * =====================================
 * All Firestore access for residents lives here — UI components never talk
 * to Firestore directly.
 *
 * Security invariants (enforced here AND mirrored in `firestore.rules`):
 *   - `userId` is ALWAYS taken from `auth.currentUser.uid` — never from
 *     client-supplied form data. Email likewise comes from the Auth session.
 *   - The flat claim path (society → building → floor → flat) is validated
 *     against real Phase 2 documents before any write.
 *   - DUPLICATE FLAT CLAIMS ARE IMPOSSIBLE BY CONSTRUCTION: the resident
 *     document ID is the deterministic claim key `{societyId}_{flatId}`.
 *     A Firestore transaction reads that exact document (`tx.get`) before
 *     writing, so two concurrent registrations for one flat can never both
 *     commit — the losing transaction retries and then sees the claim.
 *   - Rejected claims may be resubmitted ONLY by the same user; a society
 *     admin may explicitly delete a rejected claim to free the flat.
 *   - Approval/rejection runs in a transaction that also activates the
 *     resident's `societyMembers` entry — and NEVER overwrites an existing
 *     `society-admin` membership (deterministic-ID collision guard).
 *   - Filtered queries avoid `orderBy` (no composite indexes needed);
 *     ordering is applied client-side on tiny result sets.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type FirestoreError,
  type Transaction,
  type WithFieldValue,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { getActiveSessionUid, getActiveSessionUser } from '@/lib/auth/clientSession';
import {
  type Resident,
  type ResidentDocument,
  type ResidentEditableOccupancyPayload,
  type ResidentEditableProfilePayload,
  type ResidentPayload,
  type ResidentStatus,
} from '@/types/society';
import { flatDocRef } from './flatService';
import {
  SOCIETY_MEMBERS_COLLECTION,
  SocietyServiceError,
  normalizeFirestoreError,
} from './service';
import { createNotification } from '@/lib/citizen/notificationService';

// ── Collection references ────────────────────────────────────────────────────

export const RESIDENTS_COLLECTION = 'residents';

export function residentsCollection() {
  return collection(db, RESIDENTS_COLLECTION);
}

export function residentDocRef(residentId: string) {
  return doc(db, RESIDENTS_COLLECTION, residentId);
}

/**
 * Deterministic flat-claim document ID: exactly one resident record per flat
 * per society. This is the concurrency-safety cornerstone — two users claiming
 * the same flat write the SAME document, so Firestore serialises them.
 */
export function residentClaimId(societyId: string, flatId: string): string {
  return `${societyId}_${flatId}`;
}

export function residentClaimRef(societyId: string, flatId: string) {
  return doc(db, RESIDENTS_COLLECTION, residentClaimId(societyId, flatId));
}

/** Deterministic membership document reference (Phase 1 ID convention). */
export function societyMemberDocRef(societyId: string, userId: string) {
  return doc(db, SOCIETY_MEMBERS_COLLECTION, `${societyId}_${userId}`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Resolves the authenticated Firebase UID or throws. */
function requireUid(): string {
  const uid = getActiveSessionUid() || auth.currentUser?.uid;
  if (!uid) {
    throw new SocietyServiceError(
      'AUTH_EXPIRED',
      'You must be signed in to perform this action. Please sign in again.',
    );
  }
  return uid;
}

/**
 * Auth session email — the resident's email is NEVER taken from form data.
 * OTP/phone users may legitimately have no email; an empty string is stored
 * in that case rather than blocking registration.
 */
function getAuthenticatedEmail(): string {
  return auth.currentUser?.email || getActiveSessionUser()?.email || '';
}

function isResidentStatus(value: unknown): value is ResidentStatus {
  return (
    value === 'pending' || value === 'approved' || value === 'rejected' || value === 'removed'
  );
}

// ── Flat claim verification ──────────────────────────────────────────────────

/**
 * Verifies the flat claim path is real: society/building/floor/flat must all
 * exist and be connected. Cross-society/cross-building claims are blocked
 * here AND in Firestore rules (defence in depth).
 */
async function verifyFlatClaim(
  societyId: string,
  buildingId: string,
  floorId: string,
  flatId: string,
): Promise<void> {
  const flatSnap = await getDoc(flatDocRef(societyId, buildingId, floorId, flatId));
  if (!flatSnap.exists()) {
    throw new SocietyServiceError('NOT_FOUND', 'The selected flat could not be found.');
  }
  const flatData = flatSnap.data() as Record<string, unknown>;
  if (
    flatData.societyId !== societyId ||
    flatData.buildingId !== buildingId ||
    flatData.floorId !== floorId
  ) {
    throw new SocietyServiceError(
      'PERMISSION_DENIED',
      'Invalid property selection. Please try again.',
    );
  }
}

// ── Privacy-preserving flat availability check ───────────────────────────────

export interface FlatClaimInfo {
  /** True when the flat can accept a new registration (or own resubmission). */
  available: boolean;
  /** The caller's OWN claim status on this flat, when one exists. */
  ownStatus: ResidentStatus | null;
  /** UI-safe message. Never reveals another resident's data. */
  message: string;
}

/**
 * Checks whether a flat can be registered — WITHOUT exposing other residents'
 * private information. Firestore rules block reading other residents'
 * documents, so an unreadable claim simply maps to "unavailable".
 */
export async function getFlatClaimInfo(
  societyId: string,
  buildingId: string,
  floorId: string,
  flatId: string,
): Promise<FlatClaimInfo> {
  const uid = requireUid();
  try {
    const snap = await getDoc(residentClaimRef(societyId, flatId));
    if (!snap.exists()) {
      return { available: true, ownStatus: null, message: '' };
    }
    const record = normalizeResident(snap.id, snap.data() as DocumentData);
    if (record.userId === uid) {
      if (record.status === 'pending') {
        return {
          available: false,
          ownStatus: 'pending',
          message: 'You already have a pending registration for this flat.',
        };
      }
      if (record.status === 'approved') {
        return {
          available: false,
          ownStatus: 'approved',
          message: 'You are already the approved resident of this flat.',
        };
      }
      // Own rejected claim → the same user may resubmit.
      return {
        available: true,
        ownStatus: 'rejected',
        message: 'Your previous registration for this flat was rejected. You may resubmit.',
      };
    }
    // Someone else's claim (readable here only for society admins) — the flat
    // is taken, and nothing about the claimant is revealed.
    return {
      available: false,
      ownStatus: null,
      message: 'This flat already has a resident registration request.',
    };
  } catch (error) {
    const code = String((error as FirestoreError | undefined)?.code ?? '');
    if (code === 'permission-denied') {
      // The claim document exists but belongs to another resident.
      return {
        available: false,
        ownStatus: null,
        message: 'This flat already has a resident registration request.',
      };
    }
    throw normalizeFirestoreError(error);
  }
}

// ── Resident registration ────────────────────────────────────────────────────

/**
 * Creates (or resubmits) a resident registration for one flat.
 *
 * Concurrency: uses the deterministic claim ID and `tx.get` — safe against
 * simultaneous claims by construction. A pending or approved claim (from
 * anyone) blocks new registrations; a rejected claim is resubmittable ONLY
 * by the same user who was rejected.
 */
export async function createResidentRegistration(
  payload: ResidentPayload,
): Promise<string> {
  const uid = requireUid();
  const email = getAuthenticatedEmail();

  // Pre-flight, friendly validation of the selected property chain.
  await verifyFlatClaim(
    payload.societyId,
    payload.buildingId,
    payload.floorId,
    payload.flatId,
  );

  const claimRef = residentClaimRef(payload.societyId, payload.flatId);

  try {
    const residentId = await runTransaction(db, async (tx) => {
      const existing = await tx.get(claimRef);

      if (existing.exists()) {
        const existingData = existing.data() as Record<string, unknown>;
        const existingStatus = existingData.status;

        if (existingStatus === 'pending' || existingStatus === 'approved') {
          throw new SocietyServiceError(
            'UNAVAILABLE',
            'This flat already has a resident registration request.',
          );
        }
        // Rejected claim: only the SAME user may resubmit. Everyone else
        // learns nothing about the previous applicant.
        if (existingData.userId !== uid) {
          throw new SocietyServiceError(
            'UNAVAILABLE',
            'This flat already has a resident registration request.',
          );
        }
      }

      const now = serverTimestamp();
      const existingCreatedAt = existing.exists()
        ? (existing.data() as Record<string, unknown>).createdAt
        : null;

      const data: WithFieldValue<ResidentDocument> = {
        userId: uid, // ALWAYS the authenticated UID — never form data.
        societyId: payload.societyId,
        buildingId: payload.buildingId,
        floorId: payload.floorId,
        flatId: payload.flatId,
        profile: {
          fullName: payload.profile.fullName,
          preferredName: payload.profile.preferredName,
          email, // from the Auth session, never the form
          phone: payload.profile.phone,
          occupation: payload.profile.occupation,
          emergencyContactName: payload.profile.emergencyContactName,
          emergencyContactPhone: payload.profile.emergencyContactPhone,
        },
        occupancy: {
          type: payload.occupancy.type,
          moveInDate: payload.occupancy.moveInDate,
          residentCount: payload.occupancy.residentCount,
          notes: payload.occupancy.notes,
        },
        status: 'pending' as ResidentStatus,
        submittedAt: now,
        approvedAt: null,
        rejectedAt: null,
        approvedBy: null,
        rejectedBy: null,
        rejectionReason: null,
        // Resubmission preserves the original record's creation date.
        createdAt: (existingCreatedAt ?? now) as WithFieldValue<ResidentDocument>['createdAt'],
        updatedAt: now,
      };

      tx.set(claimRef, data);
      return claimRef.id;
    });

    // Supplementary membership record (collision-safe, never fails the
    // registration itself).
    await ensureResidentMembership(payload.societyId, uid, residentId, 'pending');

    createNotification({
      recipientUid: uid,
      societyId: payload.societyId,
      type: 'VERIFICATION_SUBMITTED',
      title: 'Residency Claim Submitted',
      message: `Your residency registration claim has been submitted to the Society Administrator for review.`,
      relatedEntityType: 'resident',
      relatedEntityId: residentId,
      severity: 'INFO',
      linkUrl: '/resident/dashboard',
    }).catch((e) => console.warn('Notification trigger warning:', e));

    return residentId;
  } catch (error) {
    if (error instanceof SocietyServiceError) throw error;
    throw normalizeFirestoreError(error);
  }
}

// ── Membership helpers (collision-safe) ─────────────────────────────────────

type MembershipWriteStatus = 'pending' | 'active';

/**
 * Creates the resident's `societyMembers/{societyId}_{userId}` record, or
 * leaves an existing one untouched. A `society-admin` membership is NEVER
 * overwritten by resident flows.
 */
async function ensureResidentMembership(
  societyId: string,
  userId: string,
  residentId: string,
  status: MembershipWriteStatus,
): Promise<void> {
  const membershipRef = societyMemberDocRef(societyId, userId);
  try {
    const snapshot = await getDoc(membershipRef);
    if (snapshot.exists()) {
      // Existing membership — an admin membership is preserved as-is, and an
      // existing resident membership already reflects this residency.
      return;
    }
    await setDoc(membershipRef, {
      societyId,
      userId,
      residentId,
      role: 'resident',
      status,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Membership is supplementary — a rules-limited write must never fail
    // the registration itself.
  }
}

/**
 * Activates (or creates) the resident's society membership inside a
 * transaction. A `society-admin` membership is NEVER touched.
 */
async function activateResidentMembershipTx(
  tx: Transaction,
  societyId: string,
  userId: string,
  residentId: string,
): Promise<void> {
  const membershipRef = societyMemberDocRef(societyId, userId);
  const memSnap = await tx.get(membershipRef);
  if (!memSnap.exists()) {
    tx.set(membershipRef, {
      societyId,
      userId,
      residentId,
      role: 'resident',
      status: 'active',
      createdAt: serverTimestamp(),
    });
    return;
  }
  const role = (memSnap.data() as Record<string, unknown>).role;
  if (role === 'resident') {
    tx.update(membershipRef, { status: 'active', residentId });
  }
  // Any other existing role (e.g. society-admin) is preserved untouched.
}

// ── Own-data queries ─────────────────────────────────────────────────────────

/**
 * Fetches the authenticated user's own resident record (most recent).
 * No `orderBy` server-side — a filtered ordered query would need a composite
 * index; the per-user result set is tiny, so it is sorted client-side.
 */
export async function getMyResidentRecord(): Promise<Resident | null> {
  const uid = requireUid();
  try {
    const q = query(residentsCollection(), where('userId', '==', uid));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const records = snapshot.docs.map((d) => normalizeResident(d.id, d.data()));
    records.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    return records[0];
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Fetches a resident document by ID (ownership/role enforced by rules). */
export async function getResidentById(residentId: string): Promise<Resident | null> {
  try {
    const snapshot = await getDoc(residentDocRef(residentId));
    if (!snapshot.exists()) return null;
    return normalizeResident(snapshot.id, snapshot.data() as DocumentData);
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/**
 * Fetches all residents for a society (society-admin management).
 * Single-equality query — no composite index required; client-side sort.
 * Firestore rules scope the results to the caller's own society membership.
 */
export async function getSocietyResidents(societyId: string): Promise<Resident[]> {
  try {
    const q = query(residentsCollection(), where('societyId', '==', societyId));
    const snapshot = await getDocs(q);
    const records = snapshot.docs.map((d) => normalizeResident(d.id, d.data()));
    records.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    return records;
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

// ── Own-data updates ─────────────────────────────────────────────────────────

/** Loads a resident record and verifies it belongs to the signed-in user. */
async function requireOwnResident(residentId: string): Promise<Resident> {
  const uid = requireUid();
  const record = await getResidentById(residentId);
  if (!record) {
    throw new SocietyServiceError('NOT_FOUND', 'Resident record not found.');
  }
  if (record.userId !== uid) {
    throw new SocietyServiceError(
      'PERMISSION_DENIED',
      'You can only update your own resident profile.',
    );
  }
  return record;
}

/**
 * Updates the signed-in resident's editable PROFILE fields only. Identity,
 * claim and workflow fields are immutable — Firestore rules enforce the same
 * list independently.
 */
export async function updateMyResidentProfile(
  residentId: string,
  profile: ResidentEditableProfilePayload,
): Promise<void> {
  try {
    await requireOwnResident(residentId);
    await updateDoc(residentDocRef(residentId), {
      'profile.fullName': profile.fullName,
      'profile.preferredName': profile.preferredName,
      'profile.phone': profile.phone,
      'profile.occupation': profile.occupation,
      'profile.emergencyContactName': profile.emergencyContactName,
      'profile.emergencyContactPhone': profile.emergencyContactPhone,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof SocietyServiceError) throw error;
    throw normalizeFirestoreError(error);
  }
}

/**
 * Updates the signed-in resident's editable OCCUPANCY fields only.
 * Structural property information (society/building/floor/flat) is never
 * writable here.
 */
export async function updateMyResidentOccupancy(
  residentId: string,
  occupancy: ResidentEditableOccupancyPayload,
): Promise<void> {
  try {
    await requireOwnResident(residentId);
    await updateDoc(residentDocRef(residentId), {
      'occupancy.type': occupancy.type,
      'occupancy.moveInDate': occupancy.moveInDate,
      'occupancy.residentCount': occupancy.residentCount,
      'occupancy.notes': occupancy.notes,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof SocietyServiceError) throw error;
    throw normalizeFirestoreError(error);
  }
}

// ── Society-admin approval workflow ──────────────────────────────────────────

/**
 * Approves a resident registration (same-society active society-admin only;
 * Firestore rules independently verify the admin membership).
 *
 * Atomic: the resident document update and the resident's society-membership
 * activation happen in ONE transaction. `approvedBy` is ALWAYS the
 * authenticated admin UID — client-supplied admin UIDs are never trusted.
 */
export async function approveResident(
  societyId: string,
  residentId: string,
): Promise<void> {
  const uid = requireUid();
  try {
    await runTransaction(db, async (tx) => {
      const resSnap = await tx.get(residentDocRef(residentId));
      if (!resSnap.exists()) {
        throw new SocietyServiceError('NOT_FOUND', 'Resident record not found.');
      }
      const data = resSnap.data() as Record<string, unknown>;
      if (data.societyId !== societyId) {
        throw new SocietyServiceError('PERMISSION_DENIED', 'Not authorized for this society.');
      }
      if (data.status !== 'pending') {
        throw new SocietyServiceError(
          'UNAVAILABLE',
          'Only pending registrations can be approved.',
        );
      }

      const now = serverTimestamp();
      tx.update(residentDocRef(residentId), {
        status: 'approved' as ResidentStatus,
        approvedBy: uid,
        approvedAt: now,
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        updatedAt: now,
      });

      await activateResidentMembershipTx(tx, societyId, String(data.userId), residentId);
    });

    // Notify resident of approval
    const residentDoc = await getResidentById(residentId).catch(() => null);
    if (residentDoc?.userId) {
      createNotification({
        recipientUid: residentDoc.userId,
        societyId,
        type: 'CLAIM_APPROVED',
        title: 'Residency Approved',
        message: 'Your residency claim has been verified and approved by your Society Administrator. You now have full access to your property portal.',
        relatedEntityType: 'resident',
        relatedEntityId: residentId,
        severity: 'SUCCESS',
        linkUrl: '/resident/dashboard',
      }).catch((e) => console.warn('Notification trigger warning:', e));
    }
  } catch (error) {
    if (error instanceof SocietyServiceError) throw error;
    throw normalizeFirestoreError(error);
  }
}

/**
 * Rejects a resident registration with a mandatory reason (same-society
 * active society-admin only). The original record is kept — rejection never
 * deletes anything.
 */
export async function rejectResident(
  societyId: string,
  residentId: string,
  reason: string,
): Promise<void> {
  const uid = requireUid();
  const trimmed = reason.trim();
  if (trimmed.length < 3) {
    throw new SocietyServiceError('UNKNOWN', 'Please provide a reason for rejection.');
  }
  try {
    await runTransaction(db, async (tx) => {
      const resSnap = await tx.get(residentDocRef(residentId));
      if (!resSnap.exists()) {
        throw new SocietyServiceError('NOT_FOUND', 'Resident record not found.');
      }
      const data = resSnap.data() as Record<string, unknown>;
      if (data.societyId !== societyId) {
        throw new SocietyServiceError('PERMISSION_DENIED', 'Not authorized for this society.');
      }
      if (data.status !== 'pending') {
        throw new SocietyServiceError(
          'UNAVAILABLE',
          'Only pending registrations can be rejected.',
        );
      }

      const now = serverTimestamp();
      tx.update(residentDocRef(residentId), {
        status: 'rejected' as ResidentStatus,
        rejectedBy: uid,
        rejectedAt: now,
        rejectionReason: trimmed,
        approvedBy: null,
        approvedAt: null,
        updatedAt: now,
      });

      // Revoke an activated residency membership (never an admin's).
      const membershipRef = societyMemberDocRef(societyId, String(data.userId));
      const memSnap = await tx.get(membershipRef);
      if (memSnap.exists()) {
        const memData = memSnap.data() as Record<string, unknown>;
        if (memData.role === 'resident' && memData.status === 'active') {
          tx.update(membershipRef, { status: 'pending' });
        }
      }
    });

    // Notify resident of rejection with reason
    const residentDoc = await getResidentById(residentId).catch(() => null);
    if (residentDoc?.userId) {
      createNotification({
        recipientUid: residentDoc.userId,
        societyId,
        type: 'CLAIM_REJECTED',
        title: 'Residency Claim Rejected',
        message: `Your residency registration claim was not approved. Reason: "${trimmed}". You may update and resubmit your details.`,
        relatedEntityType: 'resident',
        relatedEntityId: residentId,
        severity: 'WARNING',
        linkUrl: '/resident/dashboard',
      }).catch((e) => console.warn('Notification trigger warning:', e));
    }
  } catch (error) {
    if (error instanceof SocietyServiceError) throw error;
    throw normalizeFirestoreError(error);
  }
}

/**
 * Explicitly deletes a REJECTED resident claim to free the flat (same-society
 * active admin only). Pending/approved claims can never be deleted this way,
 * and a resident can never delete any claim — Firestore rules enforce this.
 */
export async function deleteRejectedResident(
  societyId: string,
  residentId: string,
): Promise<void> {
  requireUid();
  try {
    const snapshot = await getDoc(residentDocRef(residentId));
    if (!snapshot.exists()) {
      throw new SocietyServiceError('NOT_FOUND', 'Resident record not found.');
    }
    const data = snapshot.data() as Record<string, unknown>;
    if (data.societyId !== societyId) {
      throw new SocietyServiceError('PERMISSION_DENIED', 'Not authorized for this society.');
    }
    if (data.status !== 'rejected') {
      throw new SocietyServiceError(
        'PERMISSION_DENIED',
        'Only rejected registrations can be removed.',
      );
    }
    await deleteDoc(residentDocRef(residentId));
  } catch (error) {
    if (error instanceof SocietyServiceError) throw error;
    throw normalizeFirestoreError(error);
  }
}

// ── Normalizer (defensive reads — Firestore data is untrusted shape) ────────

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

function normalizeResident(id: string, data: DocumentData): Resident {
  const record = data as Record<string, unknown>;
  const profile = (record.profile ?? {}) as Record<string, unknown>;
  const occupancy = (record.occupancy ?? {}) as Record<string, unknown>;
  const status = isResidentStatus(record.status) ? record.status : 'pending';
  const occupancyType = (
    ['Owner Occupant', 'Tenant', 'Family Member', 'Authorized Occupant', 'Other'] as const
  ).includes(occupancy.type as Resident['occupancy']['type'])
    ? (occupancy.type as Resident['occupancy']['type'])
    : 'Other';

  return {
    id,
    userId: typeof record.userId === 'string' ? record.userId : '',
    societyId: typeof record.societyId === 'string' ? record.societyId : '',
    buildingId: typeof record.buildingId === 'string' ? record.buildingId : '',
    floorId: typeof record.floorId === 'string' ? record.floorId : '',
    flatId: typeof record.flatId === 'string' ? record.flatId : '',
    profile: {
      fullName:
        typeof profile.fullName === 'string' && profile.fullName ? profile.fullName : 'Unnamed',
      preferredName: toNullableString(profile.preferredName),
      email: typeof profile.email === 'string' ? profile.email : '',
      phone: toNullableString(profile.phone),
      occupation: toNullableString(profile.occupation),
      emergencyContactName: toNullableString(profile.emergencyContactName),
      emergencyContactPhone: toNullableString(profile.emergencyContactPhone),
    },
    occupancy: {
      type: occupancyType,
      moveInDate: toNullableString(occupancy.moveInDate),
      residentCount:
        typeof occupancy.residentCount === 'number' ? occupancy.residentCount : 1,
      notes: toNullableString(occupancy.notes),
    },
    status,
    submittedAt: toDate(record.submittedAt),
    approvedAt: toDate(record.approvedAt),
    rejectedAt: toDate(record.rejectedAt),
    approvedBy: typeof record.approvedBy === 'string' ? record.approvedBy : null,
    rejectedBy: typeof record.rejectedBy === 'string' ? record.rejectedBy : null,
    rejectionReason: toNullableString(record.rejectionReason),
    createdAt: toDate(record.createdAt),
    updatedAt: toDate(record.updatedAt),
  };
}