/**
 * Backend Realtime Database (RTDB) Service
 * Centralizes all Firebase Realtime Database reads, writes, and real-time streaming queries.
 */

import { ref, set, get, update, remove, type DataSnapshot } from 'firebase/database';
import { backendRtdb } from '../config/firebase';

export function sanitizeRtdbKey(key: string): string {
  return key.replace(/[.#$[\]]/g, '_');
}

export class BackendRtdbService {
  /**
   * Set or replace data at a given RTDB path
   */
  static async set<T = any>(path: string, data: T): Promise<void> {
    const dbRef = ref(backendRtdb, path);
    await set(dbRef, {
      ...data,
      _updatedAt: Date.now(),
    });
  }

  /**
   * Update partial fields at a given RTDB path
   */
  static async update(path: string, updates: Record<string, any>): Promise<void> {
    const dbRef = ref(backendRtdb, path);
    await update(dbRef, {
      ...updates,
      _updatedAt: Date.now(),
    });
  }

  /**
   * Read data once from a given RTDB path
   */
  static async get<T = any>(path: string): Promise<T | null> {
    const dbRef = ref(backendRtdb, path);
    const snapshot: DataSnapshot = await get(dbRef);
    return snapshot.exists() ? (snapshot.val() as T) : null;
  }

  /**
   * Delete data at a given RTDB path
   */
  static async delete(path: string): Promise<void> {
    const dbRef = ref(backendRtdb, path);
    await remove(dbRef);
  }

  /**
   * Sync parcel record into RTDB
   */
  static async syncParcel(parcelId: string, parcelData: any): Promise<void> {
    await this.set(`parcels/${sanitizeRtdbKey(parcelId)}`, parcelData);
  }

  /**
   * Sync dispute record into RTDB
   */
  static async syncDispute(disputeId: string, disputeData: any): Promise<void> {
    await this.set(`disputes/${sanitizeRtdbKey(disputeId)}`, disputeData);
  }
}
