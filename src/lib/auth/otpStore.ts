import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface OtpRecord {
  email: string;
  otp: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
  hash: string;
}

const OTP_SECRET = process.env.SESSION_SECRET || 'bhu-verify-cadastre-otp-hmac-secret-2024';
const RTDB_URL =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
  'https://d-ulpin-de274-default-rtdb.firebaseio.com/';

// Global memory cache
declare global {
  // eslint-disable-next-line no-var
  var __GLOBAL_OTP_STORE: Map<string, OtpRecord> | undefined;
}

const memoryStore: Map<string, OtpRecord> =
  globalThis.__GLOBAL_OTP_STORE || new Map<string, OtpRecord>();

globalThis.__GLOBAL_OTP_STORE = memoryStore;

// File-based persistence cache path
function getCacheFilePath(): string {
  const cacheDir = path.join(process.cwd(), '.next', 'cache');
  if (!fs.existsSync(cacheDir)) {
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
    } catch {}
  }
  return path.join(cacheDir, 'spv_otp_store.json');
}

function readDiskCache(): Record<string, OtpRecord> {
  try {
    const file = getCacheFilePath();
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf8');
      return JSON.parse(data);
    }
  } catch {}
  return {};
}

function writeDiskCache(cache: Record<string, OtpRecord>): void {
  try {
    const file = getCacheFilePath();
    fs.writeFileSync(file, JSON.stringify(cache, null, 2), 'utf8');
  } catch {}
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sanitizeRtdbKey(email: string): string {
  return normalizeEmail(email).replace(/[.#$[\]]/g, '_');
}

export function computeOtpHash(email: string, otp: string): string {
  return crypto.createHmac('sha256', OTP_SECRET).update(`${normalizeEmail(email)}:${otp.trim()}`).digest('hex');
}

export function generateStatelessToken(email: string, otp: string, expiresAt: number): string {
  const hash = computeOtpHash(email, otp);
  const payload = {
    email: normalizeEmail(email),
    hash,
    expiresAt,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/**
 * Save OTP to Memory + Disk Cache + Firebase Realtime Database (RTDB) + Firebase Firestore
 */
export async function saveOtpRecord(
  email: string,
  otp: string,
  ttlMs = 10 * 60 * 1000
): Promise<{ record: OtpRecord; token: string }> {
  const normEmail = normalizeEmail(email);
  const cleanOtp = otp.trim();
  const now = Date.now();
  const expiresAt = now + ttlMs;
  const hash = computeOtpHash(normEmail, cleanOtp);

  const record: OtpRecord = {
    email: normEmail,
    otp: cleanOtp,
    expiresAt,
    attempts: 0,
    createdAt: now,
    hash,
  };

  // 1. Save in memory
  memoryStore.set(normEmail, record);

  // 2. Save in disk cache
  const disk = readDiskCache();
  disk[normEmail] = record;
  writeDiskCache(disk);

  // 3. Sync to Firebase Realtime Database (RTDB)
  try {
    const rtdbKey = sanitizeRtdbKey(normEmail);
    const cleanUrl = RTDB_URL.replace(/\/+$/, '');
    await fetch(`${cleanUrl}/otps/${rtdbKey}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }).catch((err) => console.warn('[RTDB] OTP sync notice:', err?.message || err));
  } catch {}

  // 4. Sync to Firebase Firestore ('otp_verifications' collection)
  try {
    const firestoreRef = doc(db, 'otp_verifications', sanitizeRtdbKey(normEmail));
    void setDoc(
      firestoreRef,
      {
        email: normEmail,
        otp: cleanOtp,
        expiresAt: new Date(expiresAt).toISOString(),
        createdAt: new Date(now).toISOString(),
        attempts: 0,
        verified: false,
      },
      { merge: true }
    ).catch(() => {});
  } catch {}

  const token = generateStatelessToken(normEmail, cleanOtp, expiresAt);
  console.log(`[OTP Store] Persisted OTP for "${normEmail}": ${cleanOtp} (RTDB & Firestore synced)`);

  return { record, token };
}

/**
 * Validates OTP against Stateless Token, Memory Store, Disk Cache, RTDB, & Firestore
 */
export async function validateOtpRecord(
  email: string,
  submittedOtp: string,
  token?: string
): Promise<{ valid: boolean; error?: string }> {
  const normEmail = normalizeEmail(email);
  const cleanSubmitted = submittedOtp.trim();
  const rtdbKey = sanitizeRtdbKey(normEmail);
  const cleanUrl = RTDB_URL.replace(/\/+$/, '');

  // Helper to cleanup & mark verified
  const cleanup = () => {
    memoryStore.delete(normEmail);
    const disk = readDiskCache();
    delete disk[normEmail];
    writeDiskCache(disk);
    void fetch(`${cleanUrl}/otps/${rtdbKey}.json`, { method: 'DELETE' }).catch(() => {});

    // Update Firestore record
    try {
      const firestoreRef = doc(db, 'otp_verifications', rtdbKey);
      void updateDoc(firestoreRef, {
        verified: true,
        verifiedAt: new Date().toISOString(),
      }).catch(() => {});
    } catch {}
  };

  // Method A: Stateless HMAC cryptographic verification (instant and 100% resilient)
  if (token) {
    try {
      const decodedStr = Buffer.from(token, 'base64url').toString('utf8');
      const payload = JSON.parse(decodedStr);

      if (payload && payload.email === normEmail) {
        if (Date.now() > payload.expiresAt) {
          return { valid: false, error: 'Verification code has expired. Please request a new code.' };
        }
        const expectedHash = computeOtpHash(normEmail, cleanSubmitted);
        if (expectedHash === payload.hash) {
          cleanup();
          return { valid: true };
        }
      }
    } catch {}
  }

  // Method B: Lookup in memory store
  let record = memoryStore.get(normEmail);

  // Method C: Lookup in disk cache
  if (!record) {
    const disk = readDiskCache();
    if (disk[normEmail]) {
      record = disk[normEmail];
      memoryStore.set(normEmail, record);
    }
  }

  // Method D: Lookup in Firebase Realtime Database (RTDB)
  if (!record) {
    try {
      const rtdbRes = await fetch(`${cleanUrl}/otps/${rtdbKey}.json`);
      if (rtdbRes.ok) {
        const rtdbData = await rtdbRes.json();
        if (rtdbData && rtdbData.otp) {
          record = rtdbData as OtpRecord;
          memoryStore.set(normEmail, record);
        }
      }
    } catch {}
  }

  // Method E: Lookup in Firebase Firestore ('otp_verifications')
  if (!record) {
    try {
      const firestoreRef = doc(db, 'otp_verifications', rtdbKey);
      const snapshot = await getDoc(firestoreRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.otp) {
          record = {
            email: data.email,
            otp: data.otp,
            expiresAt: new Date(data.expiresAt).getTime(),
            attempts: data.attempts || 0,
            createdAt: new Date(data.createdAt).getTime(),
            hash: computeOtpHash(normEmail, data.otp),
          };
          memoryStore.set(normEmail, record);
        }
      }
    } catch {}
  }

  if (!record) {
    return {
      valid: false,
      error: 'No verification code was requested for this email, or it has expired. Please click Resend OTP code.',
    };
  }

  // Check expiration
  if (Date.now() > record.expiresAt) {
    cleanup();
    return { valid: false, error: 'Verification code has expired. Please request a new code.' };
  }

  // Check max attempts
  if (record.attempts >= 5) {
    cleanup();
    return { valid: false, error: 'Too many incorrect attempts. Please request a new verification code.' };
  }

  // Check code match
  if (record.otp !== cleanSubmitted) {
    record.attempts += 1;
    memoryStore.set(normEmail, record);
    const disk = readDiskCache();
    disk[normEmail] = record;
    writeDiskCache(disk);

    // Update attempts in RTDB & Firestore
    void fetch(`${cleanUrl}/otps/${rtdbKey}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attempts: record.attempts }),
    }).catch(() => {});

    try {
      const firestoreRef = doc(db, 'otp_verifications', rtdbKey);
      void updateDoc(firestoreRef, {
        attempts: record.attempts,
      }).catch(() => {});
    } catch {}

    return {
      valid: false,
      error: `Invalid verification code. ${5 - record.attempts} attempts remaining.`,
    };
  }

  // Code matches! Clean up and mark verified
  cleanup();

  return { valid: true };
}
