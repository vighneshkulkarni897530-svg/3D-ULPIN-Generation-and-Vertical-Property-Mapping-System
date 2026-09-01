import {
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  off,
  push,
  child,
  type DataSnapshot,
} from 'firebase/database';
import { rtdb } from '@/lib/firebase';

/**
 * Clean path helper for Firebase Realtime Database
 * Firebase keys cannot contain '.', '#', '$', '[', or ']'
 */
export function sanitizeKey(key: string): string {
  return key.replace(/[.#$[\]]/g, '_');
}

/**
 * Set/Overwrite a record at a given RTDB path
 */
export async function setRtdbRecord<T = any>(path: string, data: T): Promise<void> {
  const dbRef = ref(rtdb, path);
  await set(dbRef, {
    ...data,
    _updatedAt: Date.now(),
  });
}

/**
 * Update specific fields at a given RTDB path
 */
export async function updateRtdbRecord(path: string, updates: Record<string, any>): Promise<void> {
  const dbRef = ref(rtdb, path);
  await update(dbRef, {
    ...updates,
    _updatedAt: Date.now(),
  });
}

/**
 * Retrieve snapshot value at a given RTDB path once
 */
export async function getRtdbRecord<T = any>(path: string): Promise<T | null> {
  const dbRef = ref(rtdb, path);
  const snapshot: DataSnapshot = await get(dbRef);
  return snapshot.exists() ? (snapshot.val() as T) : null;
}

/**
 * Remove record at a given RTDB path
 */
export async function deleteRtdbRecord(path: string): Promise<void> {
  const dbRef = ref(rtdb, path);
  await remove(dbRef);
}

/**
 * Real-time listener on an RTDB path
 * Returns unsubscribe function
 */
export function listenToRtdbPath<T = any>(
  path: string,
  callback: (data: T | null) => void
): () => void {
  const dbRef = ref(rtdb, path);
  const listener = onValue(
    dbRef,
    (snapshot) => {
      callback(snapshot.exists() ? (snapshot.val() as T) : null);
    },
    (error) => {
      console.warn(`[RTDB Listener] Error on "${path}":`, error);
      callback(null);
    }
  );

  return () => {
    off(dbRef, 'value', listener);
  };
}

/**
 * Realtime Database User Profile helpers
 */
export async function saveUserToRtdb(user: {
  uid: string;
  email: string;
  name?: string;
  role?: string;
  phone?: string;
  aadhaarOrGovId?: string;
  authMethod?: string;
}): Promise<void> {
  try {
    const userPath = `users/${sanitizeKey(user.uid)}`;
    await updateRtdbRecord(userPath, {
      uid: user.uid,
      email: user.email,
      name: user.name || user.email.split('@')[0],
      role: user.role || 'CITIZEN',
      phone: user.phone || '',
      aadhaarOrGovId: user.aadhaarOrGovId || '',
      authMethod: user.authMethod || 'EMAIL_PASSWORD',
      lastSeenAt: Date.now(),
    });
  } catch (err) {
    console.warn('[RTDB] Could not sync user profile:', err);
  }
}

export async function getUserFromRtdb(uid: string) {
  try {
    return await getRtdbRecord(`users/${sanitizeKey(uid)}`);
  } catch {
    return null;
  }
}

/**
 * Realtime Database OTP Record helpers
 */
export async function saveOtpToRtdb(email: string, otp: string, challengeId: string, ttlMs = 300000): Promise<void> {
  try {
    const cleanKey = sanitizeKey(email.toLowerCase());
    await setRtdbRecord(`otps/${cleanKey}`, {
      email: email.toLowerCase(),
      otp,
      challengeId,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
    });
  } catch (err) {
    console.warn('[RTDB] Could not save OTP to RTDB:', err);
  }
}

export async function getOtpFromRtdb(email: string) {
  try {
    const cleanKey = sanitizeKey(email.toLowerCase());
    return await getRtdbRecord(`otps/${cleanKey}`);
  } catch {
    return null;
  }
}

export async function clearOtpFromRtdb(email: string): Promise<void> {
  try {
    const cleanKey = sanitizeKey(email.toLowerCase());
    await deleteRtdbRecord(`otps/${cleanKey}`);
  } catch (err) {
    console.warn('[RTDB] Could not clear OTP from RTDB:', err);
  }
}

/**
 * Realtime Database Cadastre & Parcel Sync helpers
 */
export async function syncParcelToRtdb(parcelId: string, parcelData: any): Promise<void> {
  try {
    await setRtdbRecord(`parcels/${sanitizeKey(parcelId)}`, parcelData);
  } catch (err) {
    console.warn('[RTDB] Could not sync parcel:', err);
  }
}

export function listenToParcelsRtdb(callback: (parcels: Record<string, any> | null) => void) {
  return listenToRtdbPath('parcels', callback);
}

/**
 * Realtime Database Disputes Sync helpers
 */
export async function syncDisputeToRtdb(disputeId: string, disputeData: any): Promise<void> {
  try {
    await setRtdbRecord(`disputes/${sanitizeKey(disputeId)}`, disputeData);
  } catch (err) {
    console.warn('[RTDB] Could not sync dispute:', err);
  }
}

export function listenToDisputesRtdb(callback: (disputes: Record<string, any> | null) => void) {
  return listenToRtdbPath('disputes', callback);
}
