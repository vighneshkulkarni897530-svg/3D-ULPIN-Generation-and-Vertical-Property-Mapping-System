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
 *   - `createdBy` is ALWAYS taken from the authenticated Firebase user or active session.
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
import { getActiveSessionUid } from '@/lib/auth/clientSession';
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

// ── Local Storage Helpers ───────────────────────────────────────────────────

function getLocalFlats(floorId: string): Record<string, Flat> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(`bhu_local_flats_${floorId}`) || '{}');
  } catch {
    return {};
  }
}

function setLocalFlats(floorId: string, flats: Record<string, Flat>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`bhu_local_flats_${floorId}`, JSON.stringify(flats));
  } catch {}
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function requireUid(): string {
  const uid = getActiveSessionUid() || auth.currentUser?.uid;
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
  const colRef = floorFlatsCollection(societyId, buildingId, floorId);
  const newDocRef = doc(colRef);
  const flatId = newDocRef.id;
  const now = new Date();

  // Check duplicate flat number
  const existingFlats = await getFlats(societyId, buildingId, floorId);
  if (existingFlats.some((f) => f.flatNumber.toLowerCase() === payload.flatNumber.trim().toLowerCase())) {
    throw new SocietyServiceError(
      'UNAVAILABLE',
      `Flat number ${payload.flatNumber} already exists on this floor.`,
    );
  }

  const localFlat: Flat = {
    id: flatId,
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

  // 1. Local storage persistence
  const localMap = getLocalFlats(floorId);
  localMap[flatId] = localFlat;
  setLocalFlats(floorId, localMap);

  // 2. Attempt Firestore sync
  try {
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(newDocRef, data);
  } catch (error) {
    console.warn('[FlatService] Firestore createFlat fallback:', error);
  }

  return flatId;
}

/** Fetches all flats for a floor, ordered by flat number. */
export async function getFlats(
  societyId: string,
  buildingId: string,
  floorId: string,
): Promise<Flat[]> {
  const localMap = getLocalFlats(floorId);

  try {
    const q = query(
      floorFlatsCollection(societyId, buildingId, floorId),
      orderBy('flatNumber', 'asc'),
    );
    const snapshot = await getDocs(q);
    for (const d of snapshot.docs) {
      localMap[d.id] = { id: d.id, ...d.data() } as Flat;
    }
    setLocalFlats(floorId, localMap);
  } catch (error) {
    // Graceful fallback: return local flats
  }

  return Object.values(localMap);
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
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Flat;
    }
  } catch (error) {
    // Fallback to local storage
  }

  const localMap = getLocalFlats(floorId);
  return localMap[flatId] || null;
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

  const existingFlats = await getFlats(societyId, buildingId, floorId);
  const duplicate = existingFlats.find(
    (f) => f.flatNumber.toLowerCase() === payload.flatNumber.trim().toLowerCase() && f.id !== flatId,
  );
  if (duplicate) {
    throw new SocietyServiceError(
      'UNAVAILABLE',
      `Flat number ${payload.flatNumber} already exists on this floor.`,
    );
  }

  // 1. Update local storage
  const localMap = getLocalFlats(floorId);
  if (localMap[flatId]) {
    localMap[flatId] = {
      ...localMap[flatId],
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
      updatedAt: new Date(),
    };
    setLocalFlats(floorId, localMap);
  }

  // 2. Attempt Firestore sync
  try {
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
    console.warn('[FlatService] Firestore updateFlat fallback:', error);
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

  // 1. Delete from local storage
  const localMap = getLocalFlats(floorId);
  delete localMap[flatId];
  setLocalFlats(floorId, localMap);

  // 2. Attempt Firestore sync
  try {
    const docRef = flatDocRef(societyId, buildingId, floorId, flatId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn('[FlatService] Firestore deleteFlat fallback:', error);
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
    const flats = await getFlats(societyId, buildingId, floorId);
    return flats.some(
      (f) => f.flatNumber.toLowerCase() === flatNumber.trim().toLowerCase() && f.id !== excludeFlatId,
    );
  } catch {
    return false;
  }
}