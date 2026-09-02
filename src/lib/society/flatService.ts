/**
 * Flat Firestore service (Phase 2)
 * ==================================
 * All Firestore access for flats lives here — UI components never talk
 * to Firestore directly.
 *
 * Each flat document is stored at:
 *   societies/{societyId}/buildings/{buildingId}/floors/{floorId}/flats/{flatId}
 *
 * Security invariants:
 *   - `createdBy` is ALWAYS taken from the authenticated Firebase user.
 *   - Duplicate flat numbers within the same floor are prevented.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type FirestoreError,
  type WithFieldValue,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import {
  type Flat,
  type FlatDocument,
  type FlatPayload,
  type FlatStatus,
} from '@/types/society';
import { SocietyServiceError, normalizeFirestoreError } from './service';

// ── Collection references ────────────────────────────────────────────────────

export const FLATS_COLLECTION = 'flats';

export function floorFlatsCollection(
  societyId: string,
  buildingId: string,
  floorId: string,
) {
  return collection(
    db,
    'societies',
    societyId,
    'buildings',
    buildingId,
    'floors',
    floorId,
    FLATS_COLLECTION,
  );
}

export function flatDocRef(
  societyId: string,
  buildingId: string,
  floorId: string,
  flatId: string,
) {
  return doc(
    db,
    'societies',
    societyId,
    'buildings',
    buildingId,
    'floors',
    floorId,
    FLATS_COLLECTION,
    flatId,
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new SocietyServiceError(
      'AUTH_EXPIRED',
      'You must be signed in to manage flats. Please sign in again.',
    );
  }
  return uid;
}

// ── Flat CRUD ────────────────────────────────────────────────────────────────

/**
 * Creates a flat document. Returns the new flat ID.
 * Validates duplicate flat numbers within the same floor.
 */
export async function createFlat(
  societyId: string,
  buildingId: string,
  floorId: string,
  payload: FlatPayload,
): Promise<string> {
  const uid = requireUid();
  try {
    // Check for duplicate flat number
    const duplicateQuery = query(
      floorFlatsCollection(societyId, buildingId, floorId),
      where('flatNumber', '==', payload.flatNumber),
      limit(1),
    );
    const duplicateSnapshot = await getDocs(duplicateQuery);
    if (!duplicateSnapshot.empty) {
      throw new SocietyServiceError(
        'UNAVAILABLE',
        `Flat number ${payload.flatNumber} already exists on this floor.`,
      );
    }

    const colRef = floorFlatsCollection(societyId, buildingId, floorId);
    const newDocRef = doc(colRef);
    const now = serverTimestamp();

    const data: WithFieldValue<FlatDocument> = {
      societyId,
      buildingId,
      floorId,
      flatNumber: payload.flatNumber,
      unitType: payload.unitType,
      area: payload.area ?? null,
      areaUnit: payload.areaUnit ?? 'sqft',
      floorPosition: payload.floorPosition ?? null,
      facing: payload.facing ?? null,
      bedrooms: payload.bedrooms ?? null,
      bathrooms: payload.bathrooms ?? null,
      balconyCount: payload.balconyCount ?? null,
      parkingSpaces: payload.parkingSpaces ?? 0,
      status: payload.status,
      description: payload.description ?? null,
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(newDocRef, data);
    return newDocRef.id;
  } catch (error) {
    if (error instanceof SocietyServiceError) throw error;
    throw normalizeFirestoreError(error);
  }
}

/** Fetches all flats for a floor, ordered by flat number. */
export async function getFlats(
  societyId: string,
  buildingId: string,
  floorId: string,
): Promise<Flat[]> {
  try {
    const q = query(
      floorFlatsCollection(societyId, buildingId, floorId),
      orderBy('flatNumber', 'asc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Flat));
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Fetches a single flat by ID. */
export async function getFlat(
  societyId: string,
  buildingId: string,
  floorId: string,
  flatId: string,
): Promise<Flat | null> {
  try {
    const docRef = flatDocRef(societyId, buildingId, floorId, flatId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as Flat;
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/**
 * Updates a flat document. Validates duplicate flat numbers
 * (excluding the current flat).
 */
export async function updateFlat(
  societyId: string,
  buildingId: string,
  floorId: string,
  flatId: string,
  payload: FlatPayload,
): Promise<void> {
  requireUid();
  try {
    // Check for duplicate flat number (excluding current)
    const duplicateQuery = query(
      floorFlatsCollection(societyId, buildingId, floorId),
      where('flatNumber', '==', payload.flatNumber),
      limit(1),
    );
    const duplicateSnapshot = await getDocs(duplicateQuery);
    if (!duplicateSnapshot.empty) {
      const existingDoc = duplicateSnapshot.docs[0];
      if (existingDoc.id !== flatId) {
        throw new SocietyServiceError(
          'UNAVAILABLE',
          `Flat number ${payload.flatNumber} already exists on this floor.`,
        );
      }
    }

    const docRef = flatDocRef(societyId, buildingId, floorId, flatId);
    await updateDoc(docRef, {
      flatNumber: payload.flatNumber,
      unitType: payload.unitType,
      area: payload.area ?? null,
      areaUnit: payload.areaUnit ?? 'sqft',
      floorPosition: payload.floorPosition ?? null,
      facing: payload.facing ?? null,
      bedrooms: payload.bedrooms ?? null,
      bathrooms: payload.bathrooms ?? null,
      balconyCount: payload.balconyCount ?? null,
      parkingSpaces: payload.parkingSpaces ?? 0,
      status: payload.status,
      description: payload.description ?? null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof SocietyServiceError) throw error;
    throw normalizeFirestoreError(error);
  }
}

/** Deletes a flat document. */
export async function deleteFlat(
  societyId: string,
  buildingId: string,
  floorId: string,
  flatId: string,
): Promise<void> {
  requireUid();
  try {
    const docRef = flatDocRef(societyId, buildingId, floorId, flatId);
    await deleteDoc(docRef);
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/** Checks if a flat number already exists on a floor. */
export async function flatNumberExists(
  societyId: string,
  buildingId: string,
  floorId: string,
  flatNumber: string,
  excludeFlatId?: string,
): Promise<boolean> {
  try {
    const q = query(
      floorFlatsCollection(societyId, buildingId, floorId),
      where('flatNumber', '==', flatNumber.trim()),
      limit(1),
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return false;
    if (excludeFlatId) {
      return snapshot.docs.some((d) => d.id !== excludeFlatId);
    }
    return true;
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}