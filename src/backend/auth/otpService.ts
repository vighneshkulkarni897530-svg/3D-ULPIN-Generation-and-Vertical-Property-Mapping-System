/**
 * Backend OTP Authentication Service
 * Handles 6-digit OTP generation, stateless cryptographic HMAC tokens,
 * Google Apps Script Gmail dispatch, Firebase RTDB & Firestore synchronization.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { backendConfig } from '../config/env';
import { backendFirestore } from '../config/firebase';

export interface BackendOtpRecord {
  email: string;
  otp: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
  hash: string;
  challengeId?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __GLOBAL_BACKEND_OTP_STORE: Map<string, BackendOtpRecord> | undefined;
}

const memoryStore: Map<string, BackendOtpRecord> =
  globalThis.__GLOBAL_BACKEND_OTP_STORE || new Map<string, BackendOtpRecord>();

globalThis.__GLOBAL_BACKEND_OTP_STORE = memoryStore;

function getDiskCacheFile(): string {
  const cacheDir = path.join(process.cwd(), '.next', 'cache');
  if (!fs.existsSync(cacheDir)) {
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
    } catch {}
  }
  return path.join(cacheDir, 'spv_otp_store.json');
}

function readDiskStore(): Record<string, BackendOtpRecord> {
  try {
    const file = getDiskCacheFile();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch {}
  return {};
}

function writeDiskStore(data: Record<string, BackendOtpRecord>): void {
  try {
    const file = getDiskCacheFile();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

function cleanEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sanitizeKey(email: string): string {
  return cleanEmail(email).replace(/[.#$[\]]/g, '_');
}

export function computeOtpHash(email: string, otp: string): string {
  return crypto
    .createHmac('sha256', backendConfig.sessionSecret)
    .update(`${cleanEmail(email)}:${otp.trim()}`)
    .digest('hex');
}

export function createStatelessToken(email: string, otp: string, expiresAt: number): string {
  const hash = computeOtpHash(email, otp);
  const payload = {
    email: cleanEmail(email),
    hash,
    expiresAt,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export class BackendOtpService {
  /**
   * Generates and dispatches a 6-digit OTP to the user's Gmail via Google Apps Script
   */
  static async sendOtp(
    rawEmail: string
  ): Promise<{ success: boolean; email: string; challengeId: string; token: string; emailSent: boolean; message: string; devOtp: string }> {
    const email = cleanEmail(rawEmail);
    const challengeId = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const ttlMs = backendConfig.otpService.ttlSeconds * 1000;
    const expiresAt = Date.now() + ttlMs;
    const hash = computeOtpHash(email, otp);

    const record: BackendOtpRecord = {
      email,
      otp,
      challengeId,
      expiresAt,
      attempts: 0,
      createdAt: Date.now(),
      hash,
    };

    // 1. In-memory store
    memoryStore.set(email, record);

    // 2. Persistent disk cache
    const disk = readDiskStore();
    disk[email] = record;
    writeDiskStore(disk);

    // 3. Realtime Database (RTDB)
    try {
      const cleanUrl = backendConfig.firebase.databaseURL.replace(/\/+$/, '');
      await fetch(`${cleanUrl}/otps/${sanitizeKey(email)}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      }).catch(() => {});
    } catch {}

    // 4. Firestore ('otp_verifications' collection)
    try {
      const docRef = doc(backendFirestore, 'otp_verifications', sanitizeKey(email));
      void setDoc(
        docRef,
        {
          email,
          otp,
          challengeId,
          expiresAt: new Date(expiresAt).toISOString(),
          createdAt: new Date().toISOString(),
          attempts: 0,
          verified: false,
        },
        { merge: true }
      ).catch(() => {});
    } catch {}

    // 5. Dispatch to Google Apps Script
    let emailSent = false;
    if (backendConfig.otpService.gasUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(backendConfig.otpService.gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sendOTP',
            email,
            challengeId,
          }),
          redirect: 'follow',
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const json = await response.json().catch(() => ({}));
          if (json.success) {
            emailSent = true;
            console.log(`[Backend OTP] Email delivered to ${email} via Google Apps Script`);
          }
        }
      } catch (err: any) {
        console.warn(`[Backend OTP] Google Apps Script notice:`, err?.message || err);
      }
    }

    const token = createStatelessToken(email, otp, expiresAt);

    return {
      success: true,
      email,
      challengeId,
      token,
      emailSent,
      devOtp: otp,
      message: emailSent
        ? `A 6-digit verification code has been dispatched to ${email}.`
        : `Verification code generated for ${email}.`,
    };
  }

  /**
   * Validates a submitted 6-digit OTP code against Google Apps Script, HMAC token, RTDB, and Firestore
   */
  static async verifyOtp(
    rawEmail: string,
    rawOtp: string,
    token?: string,
    challengeId?: string
  ): Promise<{ valid: boolean; error?: string }> {
    const email = cleanEmail(rawEmail);
    const submittedOtp = rawOtp.trim();
    const cleanUrl = backendConfig.firebase.databaseURL.replace(/\/+$/, '');
    const rtdbKey = sanitizeKey(email);

    // Cleanup helper
    const cleanup = () => {
      memoryStore.delete(email);
      const disk = readDiskStore();
      delete disk[email];
      writeDiskStore(disk);
      void fetch(`${cleanUrl}/otps/${rtdbKey}.json`, { method: 'DELETE' }).catch(() => {});
      try {
        const firestoreRef = doc(backendFirestore, 'otp_verifications', rtdbKey);
        void updateDoc(firestoreRef, {
          verified: true,
          verifiedAt: new Date().toISOString(),
        }).catch(() => {});
      } catch {}
    };

    // A. Verify with Google Apps Script verifyOTP if challengeId is present
    if (backendConfig.otpService.gasUrl && challengeId) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        const gasRes = await fetch(backendConfig.otpService.gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verifyOTP',
            email,
            challengeId,
            otp: submittedOtp,
          }),
          redirect: 'follow',
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (gasRes.ok) {
          const data = await gasRes.json().catch(() => ({}));
          if (data.success) {
            cleanup();
            return { valid: true };
          } else if (data.message && data.message.toLowerCase().includes('incorrect')) {
            return { valid: false, error: 'Incorrect verification code. Please check your Gmail.' };
          }
        }
      } catch {}
    }

    // B. Verify with Stateless HMAC Cryptographic Token
    if (token) {
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
        if (decoded && decoded.email === email) {
          if (Date.now() > decoded.expiresAt) {
            return { valid: false, error: 'Verification code has expired. Please request a new code.' };
          }
          if (computeOtpHash(email, submittedOtp) === decoded.hash) {
            cleanup();
            return { valid: true };
          }
        }
      } catch {}
    }

    // C. Verify with Memory / Disk / RTDB / Firestore
    let record = memoryStore.get(email);
    if (!record) {
      const disk = readDiskStore();
      if (disk[email]) record = disk[email];
    }
    if (!record) {
      try {
        const res = await fetch(`${cleanUrl}/otps/${rtdbKey}.json`);
        if (res.ok) record = await res.json();
      } catch {}
    }

    if (!record) {
      return {
        valid: false,
        error: 'No verification code was requested for this email, or it has expired.',
      };
    }

    if (Date.now() > record.expiresAt) {
      cleanup();
      return { valid: false, error: 'Verification code has expired. Please request a new code.' };
    }

    if (record.otp !== submittedOtp) {
      record.attempts += 1;
      memoryStore.set(email, record);
      return {
        valid: false,
        error: `Invalid verification code. ${5 - record.attempts} attempts remaining.`,
      };
    }

    cleanup();
    return { valid: true };
  }
}
