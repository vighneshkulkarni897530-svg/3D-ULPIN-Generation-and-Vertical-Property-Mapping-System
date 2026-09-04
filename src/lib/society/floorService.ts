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
  try {
    // Check for duplicate floor number
    const duplicateQuery = query(
      buildingFloorsCollection(societyId, buildingId),
      where('floorNumber', '==', payload.floorNumber),
      limit(1),
    );
    const duplicateSnapshot = await getDocs(duplicateQuery);
    if (!duplicateSnapshot.empty) {
      throw new SocietyServiceError(
        'UNAVAILABLE',
        `Floor number ${payload.floorNumber} already exists in this building.`,
      );
    }

    const colRef = buildingFloorsCollection(societyId, buildingId);
    const newDocRef = doc(colRef);
    const now = serverTimestamp();

    const data: WithFieldValue<FloorDocument> = {
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

    await setDoc(newDocRef, data);
    return newDocRef.id;
  } catch (error) {
    if (error instanceof SocietyServiceError) throw error;
    throw normalizeFirestoreError(error);
  }
}

/** Fetches all floors for a building, ordered by floor number. */
export async function getFloors(
  societyId: string,
  buildingId: string,
): Promise<Floor[]> {
  try {
    const q = query(
      buildingFloorsCollection(societyId, buildingId),
      orderBy('floorNumber', 'asc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Floor));
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
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
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as Floor;
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
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
  try {
    // Check for duplicate floor number (excluding current)
    const duplicateQuery = query(
      buildingFloorsCollection(societyId, buildingId),
      where('floorNumber', '==', payload.floorNumber),
      limit(1),
    );
    const duplicateSnapshot = await getDocs(duplicateQuery);
    if (!duplicateSnapshot.empty) {
      const existingDoc = duplicateSnapshot.docs[0];
      if (existingDoc.id !== floorId) {
        throw new SocietyServiceError(
          'UNAVAILABLE',
          `Floor number ${payload.floorNumber} already exists in this building.`,
        );
      }
    }

    const docRef = floorDocRef(societyId, buildingId, floorId);
    await updateDoc(docRef, {
      floorNumber: payload.floorNumber,
      floorLabel: payload.floorLabel,
      floorType: payload.floorType,
      plannedFlatCount: payload.plannedFlatCount,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof SocietyServiceError) throw error;
    throw normalizeFirestoreError(error);
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
  } catch (error) {
    console.error('Error checking floor number existence:', error);
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
  try {
    // Check for child flats
    const flatsCol = collection(
      db,
      'societies',
      societyId,
      'buildings',
      buildingId,
      FLOORS_COLLECTION,
      floorId,
      'flats',
    );
    const flatsQuery = query(flatsCol, limit(1));
    const flatsSnapshot = await getDocs(flatsQuery);

    if (!flatsSnapshot.empty) {
      throw new SocietyServiceError(
        'UNAVAILABLE',
        'This floor contains flats. Remove or handle its contents before deleting the floor.',
      );
    }

    const docRef = floorDocRef(societyId, buildingId, floorId);
    await deleteDoc(docRef);
  } catch (error) {
    if (error instanceof SocietyServiceError) throw error;
    throw normalizeFirestoreError(error);
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
  try {
    // Get existing floors to avoid duplicates
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

    // Write in batches of 500 (Firestore limit)
    const BATCH_SIZE = 500;
    let created = 0;

    for (let i = 0; i < floorsToCreate.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = floorsToCreate.slice(i, i + BATCH_SIZE);
      const now = serverTimestamp();

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
          createdAt: now,
          updatedAt: now,
        };
        batch.set(newDocRef, data);
      }

      await batch.commit();
      created += chunk.length;
    }

    return created;
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}