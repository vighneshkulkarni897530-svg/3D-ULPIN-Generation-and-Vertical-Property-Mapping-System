'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup } from 'firebase/auth';
import { User, UserRole } from '@/types';
import { PERMISSIONS, type Permission } from '@/types/auth';
import { canAccessPath, hasPermission } from '@/lib/auth/permissions';
import { auth, googleProvider } from '@/lib/firebase';
import {
  firebaseLoginWithEmail,
  firebaseRegisterWithEmail,
  firebaseLoginWithGoogle,
  checkGoogleRedirectResult,
  firebaseLogout,
  requestEmailOtp,
  verifyEmailOtp,
} from '@/lib/firebase/auth';

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';

export const GUEST_USER: User = {
  id: 'guest',
  name: 'Guest',
  email: 'not-signed-in',
  role: 'CITIZEN',
  phone: '—',
  aadhaarOrGovId: '—',
};

export interface AuthActionResult {
  ok: boolean;
  error?: string;
  errorCode?: string;
  otpRequired?: boolean;
  email?: string;
  devOtp?: string;
  token?: string;
  challengeId?: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface AuthContextType {
  currentUser: User;
  role: UserRole;
  authStatus: AuthStatus;
  isAuthenticated: boolean;
  sessionUser: User | null;
  sessionExpiresAt: string | null;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  register: (input: RegisterInput) => Promise<AuthActionResult>;
  loginWithGoogle: () => Promise<AuthActionResult>;
  requestOtp: (email: string, name?: string) => Promise<AuthActionResult>;
  verifyOtp: (email: string, code: string, token?: string, challengeId?: string) => Promise<AuthActionResult>;
  completeLoginSession: (firebaseUser?: any, fallbackEmail?: string) => Promise<AuthActionResult>;
  loginAs: (roleKey: 'citizen' | 'officer' | 'admin') => void;
  demoLoginAs: (roleKey: 'citizen' | 'officer' | 'admin') => Promise<AuthActionResult>;
  setRole: (role: UserRole) => void;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  canAccessPath: (path: string) => boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_ROLE_BY_KEY: Record<'citizen' | 'officer' | 'admin', UserRole> = {
  citizen: 'CITIZEN',
  officer: 'OFFICER',
  admin: 'ADMIN',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('initializing');
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);

  const applySession = useCallback((firebaseUser: any | null) => {
    if (firebaseUser) {
      const mapped: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Verified User',
        email: firebaseUser.email || '',
        role: 'CITIZEN',
        phone: firebaseUser.phoneNumber || '',
        aadhaarOrGovId: 'PENDING-KYC',
      };

      setSessionUser(mapped);
      setSessionExpiresAt(new Date().toISOString());
      setAuthStatus('authenticated');
    } else {
      setSessionUser(null);
      setSessionExpiresAt(null);
      setAuthStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    // Check for existing server session first, then fall back to Firebase auth
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const initializeAuth = async () => {
      try {
        // Try to restore session from server cookie
        const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
        if (response.ok && mounted) {
          const data = await response.json();
          if (data.user) {
            setSessionUser({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: data.user.role,
              phone: data.user.phone || '',
              aadhaarOrGovId: data.user.aadhaarOrGovId || 'PENDING-KYC',
            });
            setSessionExpiresAt(data.expiresAt);
            setAuthStatus('authenticated');
            return; // Session restored from server
          }
        }
      } catch (err) {
        // Network error or other issue, fall through
      }

      // No valid server session, listen for Firebase auth changes
      if (mounted) {
        unsubscribe = onAuthStateChanged(auth, (user) => {
          if (mounted) {
            applySession(user);
          }
        });
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [applySession]);

  const refreshSession = useCallback(async () => {
    const current = auth.currentUser;
    applySession(current);
  }, [applySession]);

  const completeLoginSession = useCallback(async (firebaseUser?: any, fallbackEmail?: string): Promise<AuthActionResult> => {
    try {
      const userToUse = firebaseUser || auth.currentUser;
      if (userToUse) {
        let idToken: string | null = null;
        try {
          idToken = await userToUse.getIdToken();
        } catch {}

        const tokenToSend = idToken || `firebase_session_${userToUse.uid}`;

        await fetch('/api/auth/firebase-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: tokenToSend, expiresIn: 3600 * 24 * 7 }),
          credentials: 'same-origin',
        });

        applySession(userToUse);
        return { ok: true };
      }

      if (fallbackEmail) {
        const emailUser = {
          uid: 'otp_' + fallbackEmail.replace(/[^a-z0-9]/g, '_'),
          email: fallbackEmail,
          displayName: fallbackEmail.split('@')[0],
        };
        await fetch('/api/auth/firebase-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: `otp_session_${fallbackEmail}`, expiresIn: 3600 * 24 * 7 }),
          credentials: 'same-origin',
        });
        applySession(emailUser);
        return { ok: true };
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Failed to finalize session.' };
    }
  }, [applySession]);

  const login = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    try {
      const { user } = await firebaseLoginWithEmail(email, password);
      if (user && user.email) {
        const otpRes = await requestEmailOtp(user.email, user.displayName || undefined);
        return {
          ok: true,
          otpRequired: true,
          email: user.email,
          devOtp: otpRes.devOtp,
          token: otpRes.token,
          challengeId: otpRes.challengeId,
        };
      }
      return { ok: false, error: 'Invalid sign-in response.' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unable to sign in.', errorCode: 'AUTH_FAILED' };
    }
  }, []);

  const register = useCallback(async (input: RegisterInput): Promise<AuthActionResult> => {
    try {
      const { user } = await firebaseRegisterWithEmail(input.email, input.password, input.name, input.phone);
      if (user && user.email) {
        const otpRes = await requestEmailOtp(user.email, input.name);
        return {
          ok: true,
          otpRequired: true,
          email: user.email,
          devOtp: otpRes.devOtp,
          token: otpRes.token,
          challengeId: otpRes.challengeId,
        };
      }
      return { ok: false, error: 'Unable to create account.' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Registration failed.', errorCode: 'REGISTER_FAILED' };
    }
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<AuthActionResult> => {
    try {
      const result = await firebaseLoginWithGoogle();
      if ((result as any).redirecting) {
        return { ok: true, otpRequired: false };
      }
      const user = result.user;
      if (user && user.email) {
        const otpRes = await requestEmailOtp(user.email, user.displayName || undefined);
        return {
          ok: true,
          otpRequired: true,
          email: user.email,
          devOtp: otpRes.devOtp,
          token: otpRes.token,
          challengeId: otpRes.challengeId,
        };
      }
      return { ok: false, error: 'Google sign-in failed: no email provided.' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Google sign-in failed.', errorCode: 'GOOGLE_AUTH_FAILED' };
    }
  }, []);

  const requestOtp = useCallback(async (email: string, name?: string): Promise<AuthActionResult> => {
    try {
      const res = await requestEmailOtp(email, name);
      return { ok: true, devOtp: res.devOtp, token: res.token, challengeId: res.challengeId };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Could not send OTP.', errorCode: 'OTP_REQUEST_FAILED' };
    }
  }, []);

  const verifyOtp = useCallback(
    async (email: string, code: string, token?: string, challengeId?: string): Promise<AuthActionResult> => {
      try {
        await verifyEmailOtp(email, code, auth.currentUser?.uid, token, challengeId);
        await completeLoginSession(auth.currentUser, email);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'OTP verification failed.', errorCode: 'OTP_FAILED' };
      }
    },
    [completeLoginSession]
  );

  const demoLoginAs = useCallback(async (roleKey: 'citizen' | 'officer' | 'admin'): Promise<AuthActionResult> => {
    try {
      // Establish a REAL server session via the demo-login endpoint so the
      // role is derived from the server-side profile (not the browser).
      const response = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleKey }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        return {
          ok: false,
          error: payload?.error || 'Demo sign-in failed.',
          errorCode: payload?.code || 'DEMO_LOGIN_FAILED',
        };
      }

      const data: { user?: User; expiresAt?: string; authMethod?: string } = await response.json();
      if (data.user) {
        // Sync the rest of the client state from the server's projection.
        const mapped: User = {
          id: data.user.id,
          name: data.user.name || '',
          email: data.user.email || '',
          role: data.user.role || 'CITIZEN',
          phone: data.user.phone || '',
          aadhaarOrGovId: data.user.aadhaarOrGovId || 'PENDING-KYC',
        };
        setSessionUser(mapped);
        setSessionExpiresAt(data.expiresAt ?? null);
        setAuthStatus('authenticated');
        return { ok: true };
      }

      return { ok: false, error: 'Demo sign-in failed.', errorCode: 'DEMO_LOGIN_FAILED' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Demo sign-in failed.', errorCode: 'DEMO_LOGIN_FAILED' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Clear the SERVER-side session (httpOnly `spv_session` cookie) so the
      // middleware no longer treats the user as authenticated. This is the
      // missing step that previously left a stale cookie in place and caused
      // the "stuck on sign out" redirect loop (middleware kept redirecting
      // back to /dashboard while ProtectedRoute sent the client to /auth/login).
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      }).catch(() => {
        /* network errors are fine — we clear local state below regardless */
      });
    } finally {
      // Sign out of the Firebase client SDK as well, then drop client state.
      try {
        await firebaseLogout();
      } finally {
        applySession(null);
      }
    }
  }, [applySession]);

  const loginAs = useCallback((roleKey: 'citizen' | 'officer' | 'admin') => {
    void demoLoginAs(roleKey);
  }, [demoLoginAs]);

  const setRole = useCallback((newRole: UserRole) => {
    const key = (Object.keys(DEMO_ROLE_BY_KEY) as (keyof typeof DEMO_ROLE_BY_KEY)[]).find(
      (k) => DEMO_ROLE_BY_KEY[k] === newRole,
    );
    if (key) void demoLoginAs(key);
  }, [demoLoginAs]);

  const isAuthenticated = authStatus === 'authenticated';
  const role: UserRole = sessionUser?.role ?? 'CITIZEN';
  const currentUser: User = sessionUser ?? GUEST_USER;

  const hasPermissionFor = useCallback((permission: Permission) => hasPermission(role, permission), [role]);
  const canAccess = useCallback(
    (path: string) => {
      const decision = canAccessPath(path, isAuthenticated ? role : null);
      return decision === 'allowed' || decision === 'public';
    },
    [isAuthenticated, role],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      currentUser,
      role,
      authStatus,
      isAuthenticated,
      sessionUser,
      sessionExpiresAt,
      login,
      register,
      loginWithGoogle,
      requestOtp,
      verifyOtp,
      completeLoginSession,
      loginAs,
      demoLoginAs,
      setRole,
      logout,
      hasPermission: hasPermissionFor,
      canAccessPath: canAccess,
      refreshSession,
    }),
    [currentUser, role, authStatus, isAuthenticated, sessionUser, sessionExpiresAt, login, register, loginWithGoogle, requestOtp, verifyOtp, completeLoginSession, loginAs, demoLoginAs, setRole, logout, hasPermissionFor, canAccess, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { PERMISSIONS };

