import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

import { auth, db, googleProvider } from '@/lib/firebase';
import { saveUserToRtdb } from '@/lib/firebase/rtdb';

export type FirebaseRole = 'CITIZEN' | 'OFFICER' | 'ADMIN';

export const OTP_SERVICE_URL = process.env.NEXT_PUBLIC_OTP_SERVICE_URL ?? '';
export { googleProvider };

export interface FirebaseUserProfile {
  uid: string;
  email: string;
  name: string;
  phone: string;
  role: FirebaseRole;
  accountStatus: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  authMethod: 'EMAIL_PASSWORD' | 'GOOGLE' | 'OTP';
  otpVerified: boolean;
  lastLoginAt?: string;
}

/**
 * Resilient timeout helper to prevent hanging on Firestore network or permission blocks
 */
async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]).catch(() => fallback);
}

/**
 * Ensures user record exists in Firestore & Realtime Database
 */
export async function ensureUserProfile(
  user: User,
  role: FirebaseRole = 'CITIZEN',
  authMethod: FirebaseUserProfile['authMethod'] = 'EMAIL_PASSWORD',
): Promise<FirebaseUserProfile> {
  const baseProfile: FirebaseUserProfile = {
    uid: user.uid,
    email: user.email ?? '',
    name: user.displayName ?? (user.email ? user.email.split('@')[0] : 'Cadastre User'),
    phone: user.phoneNumber ?? '',
    role,
    accountStatus: 'ACTIVE',
    createdAt: new Date().toISOString(),
    authMethod,
    otpVerified: false,
    lastLoginAt: new Date().toISOString(),
  };

  // Sync with Realtime Database (RTDB)
  void saveUserToRtdb({
    uid: user.uid,
    email: baseProfile.email,
    name: baseProfile.name,
    role: baseProfile.role,
    phone: baseProfile.phone,
    authMethod: baseProfile.authMethod,
  });

  try {
    const ref = doc(db, 'users', user.uid);
    // 2-second safe timeout for Firestore reads
    const snapshot = await withTimeout(getDoc(ref), 2000, null as any);

    if (!snapshot || !snapshot.exists || !snapshot.exists()) {
      // Non-blocking write
      void withTimeout(
        setDoc(ref, {
          ...baseProfile,
          updatedAt: new Date().toISOString(),
        }),
        2000,
        null
      );
      return baseProfile;
    }

    const existing = snapshot.data() as Partial<FirebaseUserProfile>;
    const merged: FirebaseUserProfile = {
      ...baseProfile,
      ...existing,
      uid: user.uid,
      email: user.email ?? existing.email ?? baseProfile.email,
      name: user.displayName || existing.name || baseProfile.name,
      role: existing.role ?? role,
      accountStatus: existing.accountStatus ?? 'ACTIVE',
      authMethod: existing.authMethod ?? authMethod,
      createdAt: existing.createdAt ?? baseProfile.createdAt,
      otpVerified: existing.otpVerified ?? false,
      lastLoginAt: new Date().toISOString(),
    };

    // Non-blocking update
    void withTimeout(
      updateDoc(ref, {
        name: merged.name,
        email: merged.email,
        authMethod: merged.authMethod,
        lastLoginAt: merged.lastLoginAt,
        updatedAt: new Date().toISOString(),
      }),
      2000,
      null
    );

    // Sync merged profile to RTDB
    void saveUserToRtdb({
      uid: merged.uid,
      email: merged.email,
      name: merged.name,
      role: merged.role,
      phone: merged.phone,
      authMethod: merged.authMethod,
    });

    return merged;
  } catch (error) {
    console.warn('[Firestore] Profile operation fallback:', error);
    return baseProfile;
  }
}

export async function markUserOtpVerifiedInFirestore(uid: string, email: string) {
  try {
    const ref = doc(db, 'users', uid);
    await withTimeout(
      updateDoc(ref, {
        otpVerified: true,
        lastLoginAt: new Date().toISOString(),
        verifiedEmail: email,
      }),
      2000,
      null
    );
  } catch (err) {
    console.warn('[Firestore] Could not update otpVerified status:', err);
  }
}

export async function firebaseLoginWithEmail(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await ensureUserProfile(userCredential.user, 'CITIZEN', 'EMAIL_PASSWORD');
    return { user: userCredential.user, profile, otpRequired: false };
  } catch (error: any) {
    console.error('Firebase login error:', {
      code: error?.code,
      message: error?.message,
    });

    // Phase 15 security: do NOT auto-provision accounts from a wrong-password
    // lookup. Previously this branch created a brand-new Firebase account with
    // the attacker-supplied password whenever the email was unknown — a trivial
    // account-creation + role-escalation vector. We now fail closed instead.
    if (
      error?.code === 'auth/user-not-found' ||
      error?.code === 'auth/invalid-login-credentials' ||
      error?.code === 'auth/invalid-credential'
    ) {
      throw new Error('Incorrect email or password.');
    }

    if (error?.code === 'auth/wrong-password') {
      throw new Error('Incorrect password. Please try again or use demo credentials.');
    }
    if (error?.code === 'auth/too-many-requests') {
      throw new Error('Too many sign-in attempts. Please wait a few moments before trying again.');
    }

    // Surface only a generic, user-friendly message; never the raw Firebase code.
    throw new Error('Incorrect email or password.');
  }
}

export async function firebaseRegisterWithEmail(
  email: string,
  password: string,
  name: string,
  phone: string
) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const profile = await ensureUserProfile(userCredential.user, 'CITIZEN', 'EMAIL_PASSWORD');

    const ref = doc(db, 'users', userCredential.user.uid);
    void withTimeout(
      updateDoc(ref, {
        name,
        phone,
        email,
        role: 'CITIZEN',
        authMethod: 'EMAIL_PASSWORD',
        updatedAt: new Date().toISOString(),
      }),
      2000,
      null
    );

    return {
      user: userCredential.user,
      profile: {
        ...profile,
        name,
        phone,
      },
    };
  } catch (error: any) {
    if (error?.code === 'auth/email-already-in-use') {
      throw new Error('An account with this email address already exists. Please sign in.');
    }
    if (error?.code === 'auth/weak-password') {
      throw new Error('Password should be at least 6 characters long.');
    }
    throw error;
  }
}

export async function checkGoogleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const profile = await ensureUserProfile(result.user, 'CITIZEN', 'GOOGLE');
      return { user: result.user, profile, otpRequired: true };
    }
  } catch (err) {
    console.warn('[Firebase] Redirect result check notice:', err);
  }
  return null;
}

export async function firebaseLoginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const profile = await ensureUserProfile(result.user, 'CITIZEN', 'GOOGLE');
    return { user: result.user, profile, otpRequired: true, redirecting: false };
  } catch (error: any) {
    console.warn('Firebase Google popup interrupted, launching redirect fallback:', error?.code);
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      // Seamlessly redirect to Google Auth so Brave / popup blockers never break the login
      await signInWithRedirect(auth, googleProvider);
      return { user: null, profile: null, otpRequired: false, redirecting: true };
    }
    if (error?.code === 'auth/network-request-failed') {
      throw new Error('Network error during Google sign-in. Please check your internet connection.');
    }
    if (error?.code === 'auth/account-exists-with-different-credential') {
      throw new Error('An account already exists with this email using a different sign-in method.');
    }
    throw new Error(error?.message || 'Google sign-in could not be completed.');
  }
}

export async function firebaseLogout() {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase signOut notice:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      if (window.indexedDB) {
        window.indexedDB.deleteDatabase('firebaseLocalStorageDb');
      }
    } catch {}

    try {
      const clearStorage = (storage: Storage) => {
        const toDelete: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && (key.startsWith('firebase:') || key.includes('firebase:authUser') || key.includes('firebaseApp'))) {
            toDelete.push(key);
          }
        }
        toDelete.forEach((k) => storage.removeItem(k));
      };
      clearStorage(window.localStorage);
      clearStorage(window.sessionStorage);
    } catch {}
  }
}

export const clearFirebaseAuthSystem = firebaseLogout;
export const loginWithEmail = firebaseLoginWithEmail;
export const loginWithGoogle = firebaseLoginWithGoogle;
export const registerWithEmail = firebaseRegisterWithEmail;
export const logout = firebaseLogout;

/**
 * Sends a 6-digit OTP to the user's email via the Next.js backend and Google Apps Script
 */
export async function requestEmailOtp(
  email: string,
  name?: string
): Promise<{ success: boolean; devOtp?: string; challengeId?: string; token?: string; message: string }> {
  const res = await fetch('/api/auth/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(payload.error || 'Failed to send verification code.');
  }

  return {
    success: true,
    devOtp: payload.devOtp,
    challengeId: payload.challengeId,
    token: payload.token,
    message: payload.message || `Verification code sent to ${email}.`,
  };
}

/**
 * Verifies the 6-digit OTP code against Google Apps Script, backend, and HMAC Token
 */
export async function verifyEmailOtp(
  email: string,
  otp: string,
  uid?: string,
  token?: string,
  challengeId?: string
): Promise<string | boolean> {
  const res = await fetch('/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, uid, token, challengeId }),
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(payload.error || 'Invalid or expired OTP code.');
  }

  if (auth.currentUser) {
    await markUserOtpVerifiedInFirestore(auth.currentUser.uid, email);
  }

  // Return the signed session claim so the caller can pass it to the login
  // route, where it is verified server-side before minting a session.
  return (payload as any).sessionClaim || true;
}