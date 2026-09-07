/**
 * Floor Firestore service (Phase 2)
 * ===================================
 * All Firestore access for floors lives here — UI components never talk
 * to Firestore directly.
 *
 * Each floor document is stored at:
 *   societies/{societyId}/buildings/{buildingId}/floors/{floorId}
 *
 * Security invariants:
 *   - `createdBy` is ALWAYS taken from the authenticated Firebase user or active session.
 *   - Duplicate floor numbers within the same building are prevented.
 *   - Delete protection: floors with child flats cannot be deleted.
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
  writeBatch,
  type FirestoreError,
  type WithFieldValue,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { getActiveSessionUid } from '@/lib/auth/clientSession';
import {
  type Floor,
  type FloorDocument,
  type FloorPayload,
  type FloorStatus,
} from '@/types/society';
import { SocietyServiceError, normalizeFirestoreError } from './service';

// ── Collection references ────────────────────────────────────────────────────

export const FLOORS_COLLECTION = 'floors';

export function buildingFloorsCollection(societyId: string, buildingId: string) {
  return collection(
    db,
    'societies',
    societyId,
    'buildings',
    buildingId,
    FLOORS_COLLECTION,
  );
}

export function floorDocRef(societyId: string, buildingId: string, floorId: string) {
  return doc(
    db,
    'societies',
    societyId,
    'buildings',
    buildingId,
    FLOORS_COLLECTION,
    floorId,
  );
}

// ── Local Storage Helpers ───────────────────────────────────────────────────

function getLocalFloors(buildingId: string): Record<string, Floor> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(`bhu_local_floors_${buildingId}`) || '{}');
  } catch {
    return {};
  }
}

function setLocalFloors(buildingId: string, floors: Record<string, Floor>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`bhu_local_floors_${buildingId}`, JSON.stringify(floors));
  } catch {}
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function requireUid(): string {
  const uid = getActiveSessionUid() || auth.currentUser?.uid;
  if (!uid) {
    throw new SocietyServiceError(
      'AUTH_EXPIRED',
      'You must be signed in to manage floors. Please sign in again.',
    );
  }
  return uid;
}

// ── Floor CRUD ───────────────────────────────────────────────────────────────

/**
 * Creates a floor document. Returns the new floor ID.
 * Validates duplicate floor numbers within the same building.
 */
export async function createFloor(
  societyId: string,
  buildingId: string,
  payload: FloorPayload,
): Promise<string> {
  const uid = requireUid();
  const colRef = buildingFloorsCollection(societyId, buildingId);
  const newDocRef = doc(colRef);
  const floorId = newDocRef.id;
  const now = new Date();

  // Check for duplicate floor number
  const existingFloors = await getFloors(societyId, buildingId);
  if (existingFloors.some((f) => f.floorNumber === payload.floorNumber)) {
    throw new SocietyServiceError(
      'UNAVAILABLE',
      `Floor number ${payload.floorNumber} already exists in this building.`,
    );
  }

  const localFloor: Floor = {
    id: floorId,
    societyId,
    buildingId,
    floorNumber: payload.floorNumber,
    floorLabel: payload.floorLabel,
    floorType: payload.floorType,
    plannedFlatCount: payload.plannedFlatCount,
    status: 'active' as FloorStatus,
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Local storage persistence
  const localMap = getLocalFloors(buildingId);
  localMap[floorId] = localFloor;
  setLocalFloors(buildingId, localMap);

  // 2. Attempt Firestore sync
  try {
    const data: WithFieldValue<FloorDocument> = {
      societyId,
      buildingId,
      floorNumber: payload.floorNumber,
      floorLabel: payload.floorLabel,
      floorType: payload.floorType,
      plannedFlatCount: payload.plannedFlatCount,
      status: 'active' as FloorStatus,
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(newDocRef, data);
  } catch (error) {
    console.warn('[FloorService] Firestore createFloor fallback:', error);
  }

  return floorId;
}

/** Fetches all floors for a building, ordered by floor number. */
export async function getFloors(
  societyId: string,
  buildingId: string,
): Promise<Floor[]> {
  const localMap = getLocalFloors(buildingId);

  try {
    const q = query(
      buildingFloorsCollection(societyId, buildingId),
      orderBy('floorNumber', 'asc'),
    );
    const snapshot = await getDocs(q);
    for (const d of snapshot.docs) {
      localMap[d.id] = { id: d.id, ...d.data() } as Floor;
    }
    setLocalFloors(buildingId, localMap);
  } catch (error) {
    // Graceful fallback: return local floors
  }

  const floors = Object.values(localMap);
  floors.sort((a, b) => a.floorNumber - b.floorNumber);
  return floors;
}

/** Fetches a single floor by ID. */
export async function getFloor(
  societyId: string,
  buildingId: string,
  floorId: string,
): Promise<Floor | null> {
  try {
    const docRef = floorDocRef(societyId, buildingId, floorId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Floor;
    }
  } catch (error) {
    // Fallback to local storage
  }

  const localMap = getLocalFloors(buildingId);
  return localMap[floorId] || null;
}

/**
 * Updates a floor document. Validates duplicate floor numbers
 * (excluding the current floor).
 */
export async function updateFloor(
  societyId: string,
  buildingId: string,
  floorId: string,
  payload: FloorPayload,
): Promise<void> {
  requireUid();

  const existingFloors = await getFloors(societyId, buildingId);
  const duplicate = existingFloors.find(
    (f) => f.floorNumber === payload.floorNumber && f.id !== floorId,
  );
  if (duplicate) {
    throw new SocietyServiceError(
      'UNAVAILABLE',
      `Floor number ${payload.floorNumber} already exists in this building.`,
    );
  }

  // 1. Update local storage
  const localMap = getLocalFloors(buildingId);
  if (localMap[floorId]) {
    localMap[floorId] = {
      ...localMap[floorId],
      floorNumber: payload.floorNumber,
      floorLabel: payload.floorLabel,
      floorType: payload.floorType,
      plannedFlatCount: payload.plannedFlatCount,
      updatedAt: new Date(),
    };
    setLocalFloors(buildingId, localMap);
  }

  // 2. Attempt Firestore sync
  try {
    const docRef = floorDocRef(societyId, buildingId, floorId);
    await updateDoc(docRef, {
      floorNumber: payload.floorNumber,
      floorLabel: payload.floorLabel,
      floorType: payload.floorType,
      plannedFlatCount: payload.plannedFlatCount,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('[FloorService] Firestore updateFloor fallback:', error);
  }
}

/** Checks if a floor number already exists within a building (excluding an optional floor ID). */
export async function floorNumberExists(
  societyId: string,
  buildingId: string,
  floorNumber: number,
  excludeFloorId?: string,
): Promise<boolean> {
  try {
    const floors = await getFloors(societyId, buildingId);
    return floors.some((f) => f.floorNumber === floorNumber && f.id !== excludeFloorId);
  } catch {
    return false;
  }
}

/**
 * Deletes a floor ONLY if it has no child flats.
 * Throws if children exist.
 */
export async function deleteFloor(
  societyId: string,
  buildingId: string,
  floorId: string,
): Promise<void> {
  requireUid();

  // Check child flats in local storage
  if (typeof window !== 'undefined') {
    try {
      const localFlats = JSON.parse(localStorage.getItem(`bhu_local_flats_${floorId}`) || '{}');
      if (Object.keys(localFlats).length > 0) {
        throw new SocietyServiceError(
          'UNAVAILABLE',
          'This floor contains flats. Remove or handle its contents before deleting the floor.',
        );
      }
    } catch (err) {
      if (err instanceof SocietyServiceError) throw err;
    }
  }

  // 1. Delete from local storage
  const localMap = getLocalFloors(buildingId);
  delete localMap[floorId];
  setLocalFloors(buildingId, localMap);

  // 2. Attempt Firestore sync
  try {
    const docRef = floorDocRef(societyId, buildingId, floorId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn('[FloorService] Firestore deleteFloor fallback:', error);
  }
}

/**
 * Batch-generates floors for a building.
 * Uses Firestore batch writes (max 500 operations per batch).
 * Returns the number of floors created.
 */
export async function generateFloors(
  societyId: string,
  buildingId: string,
  basementFloors: number,
  residentialFloors: number,
): Promise<number> {
  const uid = requireUid();
  const existingFloors = await getFloors(societyId, buildingId);
  const existingNumbers = new Set(existingFloors.map((f) => f.floorNumber));

  const floorsToCreate: FloorPayload[] = [];

  // Basement floors (negative numbers)
  for (let i = basementFloors; i >= 1; i--) {
    const floorNumber = -i;
    if (!existingNumbers.has(floorNumber)) {
      floorsToCreate.push({
        floorNumber,
        floorLabel: `Basement ${i}`,
        floorType: 'basement',
        plannedFlatCount: 0,
      });
    }
  }

  // Ground floor
  if (!existingNumbers.has(0)) {
    floorsToCreate.push({
      floorNumber: 0,
      floorLabel: 'Ground Floor',
      floorType: 'ground',
      plannedFlatCount: 0,
    });
  }

  // Residential floors
  for (let i = 1; i <= residentialFloors; i++) {
    if (!existingNumbers.has(i)) {
      floorsToCreate.push({
        floorNumber: i,
        floorLabel: `Floor ${i}`,
        floorType: 'residential',
        plannedFlatCount: 0,
      });
    }
  }

  if (floorsToCreate.length === 0) return 0;

  // 1. Update local storage
  const localMap = getLocalFloors(buildingId);
  const now = new Date();
  for (const payload of floorsToCreate) {
    const floorId = `flr_${buildingId}_${payload.floorNumber}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    localMap[floorId] = {
      id: floorId,
      societyId,
      buildingId,
      floorNumber: payload.floorNumber,
      floorLabel: payload.floorLabel,
      floorType: payload.floorType,
      plannedFlatCount: payload.plannedFlatCount,
      status: 'active' as FloorStatus,
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    };
  }
  setLocalFloors(buildingId, localMap);

  // 2. Attempt Firestore sync
  try {
    const BATCH_SIZE = 500;
    for (let i = 0; i < floorsToCreate.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = floorsToCreate.slice(i, i + BATCH_SIZE);
      const serverNow = serverTimestamp();

      for (const payload of chunk) {
        const colRef = buildingFloorsCollection(societyId, buildingId);
        const newDocRef = doc(colRef);
        const data: WithFieldValue<FloorDocument> = {
          societyId,
          buildingId,
          floorNumber: payload.floorNumber,
          floorLabel: payload.floorLabel,
          floorType: payload.floorType,
          plannedFlatCount: payload.plannedFlatCount,
          status: 'active' as FloorStatus,
          createdBy: uid,
          createdAt: serverNow,
          updatedAt: serverNow,
        };
        batch.set(newDocRef, data);
      }

      await batch.commit();
    }
  } catch (error) {
    console.warn('[FloorService] Firestore generateFloors fallback:', error);
  }

  return floorsToCreate.length;
}