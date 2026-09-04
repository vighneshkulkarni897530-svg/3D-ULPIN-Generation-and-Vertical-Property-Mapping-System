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
import { setActiveSessionUser } from '@/lib/auth/clientSession';

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
  role?: string;
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
  login: (
    email: string,
    password: string,
    options?: { portalRole?: 'CITIZEN' | 'OFFICER' | 'ADMIN'; badgeNumber?: string; societyRegNo?: string }
  ) => Promise<AuthActionResult>;
  register: (input: RegisterInput) => Promise<AuthActionResult>;
  loginWithGoogle: () => Promise<AuthActionResult>;
  requestOtp: (email: string, name?: string) => Promise<AuthActionResult>;
  verifyOtp: (email: string, code: string, token?: string, challengeId?: string) => Promise<AuthActionResult>;
  completeLoginSession: (firebaseUser?: any, fallbackEmail?: string, otpClaim?: string) => Promise<AuthActionResult>;
  loginAs: (roleKey: 'citizen' | 'officer' | 'admin') => void;
  demoLoginAs: (roleKey: 'citizen' | 'officer' | 'admin') => Promise<AuthActionResult>;
  setRole: (role: UserRole) => void;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<{ ok: boolean; error?: string; user?: User }>;
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
      setActiveSessionUser(mapped);
      setSessionExpiresAt(new Date().toISOString());
      setAuthStatus('authenticated');
    } else {
      setSessionUser(null);
      setActiveSessionUser(null);
      setSessionExpiresAt(null);
      setAuthStatus('unauthenticated');
    }
  }, []);

  const completeLoginSession = useCallback(
    async (firebaseUser?: any, fallbackEmail?: string, otpClaim?: string): Promise<AuthActionResult> => {
    try {
      const userToUse = firebaseUser || auth.currentUser;
        if (userToUse) {
                let idToken: string | null = null;
        try {
          idToken = await userToUse.getIdToken();
        } catch {
          idToken = null;
        }
        if (!idToken) {
          // Phase 15: fail closed — no forged-token fallback.
          return { ok: false, error: 'Unable to obtain a verified sign-in token. Please sign in again.', errorCode: 'NO_TOKEN' };
        }
        const res = await fetch('/api/auth/firebase-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            expiresIn: 3600 * 24 * 365,
            user: {
              uid: userToUse.uid,
              email: userToUse.email || fallbackEmail,
              name: userToUse.displayName || (userToUse.email || fallbackEmail)?.split('@')[0] || 'Cadastre User',
              phone: userToUse.phoneNumber || '',
            },
            // Only the OTP-only flow attaches a signed claim.
            ...(otpClaim ? { claim: otpClaim } : {}),
          }),
          credentials: 'same-origin',
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          return { ok: false, error: payload?.error || 'Login session rejected.' };
        }

        const data = await res.json().catch(() => ({}));
        if (data.user) {
          const userObj: User = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            phone: data.user.phone || '',
            aadhaarOrGovId: data.user.aadhaarOrGovId || 'PENDING-KYC',
          };
          setSessionUser(userObj);
          setActiveSessionUser(userObj);
          setSessionExpiresAt(new Date(Date.now() + 3600 * 24 * 365 * 1000).toISOString());
          setAuthStatus('authenticated');
        } else {
          applySession(userToUse);
        }
        return { ok: true, role: data?.user?.role };
      }

      if (fallbackEmail) {
        const emailUser = {
          uid: 'usr_' + fallbackEmail.replace(/[^a-z0-9]/g, '_'),
          email: fallbackEmail,
          displayName: fallbackEmail.split('@')[0],
        };
        const res = await fetch('/api/auth/firebase-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken: `otp_session_${fallbackEmail}`,
            expiresIn: 3600 * 24 * 365,
            user: {
              uid: emailUser.uid,
              email: fallbackEmail,
              name: emailUser.displayName,
            },
          }),
          credentials: 'same-origin',
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          return { ok: false, error: payload?.error || 'Login session rejected.' };
        }

        const data = await res.json().catch(() => ({}));
        if (data.user) {
          const userObj: User = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            phone: data.user.phone || '',
            aadhaarOrGovId: data.user.aadhaarOrGovId || 'PENDING-KYC',
          };
          setSessionUser(userObj);
          setActiveSessionUser(userObj);
          setSessionExpiresAt(new Date(Date.now() + 3600 * 24 * 365 * 1000).toISOString());
          setAuthStatus('authenticated');
        } else {
          applySession(emailUser);
        }
        return { ok: true, role: data?.user?.role };
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Failed to finalize session.' };
    }
  }, [applySession]);

  useEffect(() => {
    // Check for existing server session on initial load
    let mounted = true;

    const initializeAuth = async () => {
      // Phase 15: process a pending Google sign-in redirect FIRST. When the
      // Google popup is blocked, `firebaseLoginWithGoogle` falls back to
      // `signInWithRedirect`; on return to the app the result must be consumed
      // (and the server session established) before the session check below
      // would otherwise mark the user unauthenticated and sign them out.
      // Previously this import was unused — the redirect path was dead.
      try {
        const redirectResult = await checkGoogleRedirectResult();
        if (redirectResult?.user?.email && mounted) {
          const sessionRes = await completeLoginSession(
            redirectResult.user,
            redirectResult.user.email,
          );
          if (sessionRes.ok) return; // session state set by completeLoginSession
        }
      } catch {
        // No pending redirect (or transient error) — continue normally.
      }

      try {
        // Try to restore session from server cookie
        const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
        if (response.ok && mounted) {
          const data = await response.json();
          if (data.user) {
            const userObj: User = {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: data.user.role,
              phone: data.user.phone || '',
              aadhaarOrGovId: data.user.aadhaarOrGovId || 'PENDING-KYC',
              badgeNumber: data.user.badgeNumber,
              societyName: data.user.societyName,
              societyRegNo: data.user.societyRegNo,
              department: data.user.department,
              designation: data.user.designation,
              avatarUrl: data.user.avatarUrl,
            };
            setSessionUser(userObj);
            setActiveSessionUser(userObj);
            setSessionExpiresAt(data.expiresAt);
            setAuthStatus('authenticated');
            return; // Session restored from server
          }
        }
      } catch (err) {
        // Network error or other issue, fall through
      }

      // If no valid server session was returned, ensure completely unauthenticated state.
      // Purge any stale client-side Firebase Auth tokens so ghost users (e.g. badgujardhruv007)
      // are NOT falsely displayed or automatically restored!
      if (mounted) {
        setSessionUser(null);
        setActiveSessionUser(null);
        setSessionExpiresAt(null);
        setAuthStatus('unauthenticated');
        try {
          await firebaseLogout();
        } catch {}
      }
    };

    initializeAuth();

    // Phase 15 — bfcache/back-button session re-validation: when the browser
    // restores this page from the back-forward cache (e.g. pressing Back after
    // logout) the stale in-memory state would otherwise show protected content.
    // Re-checking the server session on `pageshow` forces a fresh
    // authenticated/unauthenticated decision.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void initializeAuth();
      }
    };
    window.addEventListener('pageshow', onPageShow);

    return () => {
      mounted = false;
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  const refreshSession = useCallback(async () => {
    const current = auth.currentUser;
    applySession(current);
  }, [applySession]);

  const login = useCallback(
    async (
      email: string,
      password: string,
      options?: { portalRole?: 'CITIZEN' | 'OFFICER' | 'ADMIN'; badgeNumber?: string; societyRegNo?: string }
    ): Promise<AuthActionResult> => {
      // 1. Authenticate against server route first (validates against durable userStore & reset passwords)
      let attemptFirebaseFallback = false;
      try {
        const serverRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, ...options }),
          credentials: 'same-origin',
        });
        if (serverRes.ok) {
          const data = await serverRes.json();
          if (data.user) {
            const userObj: User = {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: data.user.role,
              phone: data.user.phone || '',
              aadhaarOrGovId: data.user.aadhaarOrGovId || 'PENDING-KYC',
              badgeNumber: data.user.badgeNumber,
              societyName: data.user.societyName,
              societyRegNo: data.user.societyRegNo,
              department: data.user.department,
              designation: data.user.designation,
              avatarUrl: data.user.avatarUrl,
            };
            setSessionUser(userObj);
            setActiveSessionUser(userObj);
            setSessionExpiresAt(new Date(Date.now() + 3600 * 24 * 365 * 1000).toISOString());
            setAuthStatus('authenticated');
            return { ok: true, otpRequired: false, email: data.user.email, role: data.user.role };
          }
          return { ok: false, error: 'Authentication response was incomplete. Please try again.' };
        }
        const payload = await serverRes.json().catch(() => ({}));
        const code = payload?.error?.code;
        if (code === 'ACCOUNT_DISABLED') {
          return { ok: false, error: payload?.error?.message || 'This account has been disabled by the administrator.' };
        }
        if (payload?.error?.message || payload?.error) {
          return {
            ok: false,
            error: payload?.error?.message || payload?.error || 'Invalid credentials or unauthorized portal access.',
          };
        }
        attemptFirebaseFallback = true;
      } catch {
        attemptFirebaseFallback = true;
      }

      // 2. Firebase client-auth fallback — only on network failure
      if (attemptFirebaseFallback) {
        try {
          const { user } = await firebaseLoginWithEmail(email, password);
          if (user && user.email) {
            const sessionRes = await completeLoginSession(user, user.email);
            if (!sessionRes.ok) {
              return { ok: false, error: sessionRes.error || 'Failed to establish session.' };
            }
            return { ok: true, otpRequired: false, email: user.email, role: sessionRes.role };
          }
          return { ok: false, error: 'Invalid sign-in response.' };
        } catch (err: any) {
          return { ok: false, error: err?.message || 'Invalid email or password.', errorCode: 'AUTH_FAILED' };
        }
      }
      return { ok: false, error: 'Invalid email or password.', errorCode: 'AUTH_FAILED' };
    },
    [completeLoginSession]
  );

  const register = useCallback(async (input: RegisterInput): Promise<AuthActionResult> => {
    try {
      // 1. Sync registration with server userStore
      try {
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
          credentials: 'same-origin',
        });
      } catch {}

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
        const sessionRes = await completeLoginSession(user, user.email);
        if (!sessionRes.ok) {
          return { ok: false, error: sessionRes.error || 'Failed to establish session.' };
        }
                return {
          ok: true,
          otpRequired: false,
          email: user.email,
          role: sessionRes.role,
        };
      }
      return { ok: false, error: 'Google sign-in failed: no email provided.' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Google sign-in failed.', errorCode: 'GOOGLE_AUTH_FAILED' };
    }
  }, [completeLoginSession]);

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
        const claim = await verifyEmailOtp(email, code, auth.currentUser?.uid, token, challengeId);
        const sessionRes = await completeLoginSession(
          undefined,
          email,
          typeof claim === 'string' ? claim : undefined
        );
        if (!sessionRes.ok) {
          return { ok: false, error: sessionRes.error || 'Failed to establish session.' };
        }
        return { ok: true, otpRequired: false, role: sessionRes.role };
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
        const errPayload: { error?: { message?: string } } = await response.json().catch(() => ({}));
        return {
          ok: false,
          error: errPayload.error?.message ?? 'Demo sign-in failed.',
          errorCode: 'DEMO_LOGIN_FAILED',
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
          badgeNumber: data.user.badgeNumber,
          societyName: data.user.societyName,
          societyRegNo: data.user.societyRegNo,
          department: data.user.department,
          designation: data.user.designation,
          avatarUrl: data.user.avatarUrl,
        };
        setSessionUser(mapped);
        setActiveSessionUser(mapped);
        setSessionExpiresAt(data.expiresAt ?? null);
        setAuthStatus('authenticated');
        return { ok: true };
      }

      return { ok: false, error: 'Demo sign-in failed.', errorCode: 'DEMO_LOGIN_FAILED' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Demo sign-in failed.', errorCode: 'DEMO_LOGIN_FAILED' };
    }
  }, []);

  const updateProfile = useCallback(async (patch: Partial<User>) => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data?.error?.message || data?.error || 'Failed to update profile.' };
      }
      if (data.user) {
        setSessionUser((prev) => (prev ? { ...prev, ...data.user } : data.user));
        return { ok: true, user: data.user };
      }
      return { ok: false, error: 'Failed to update profile.' };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Network error updating profile.' };
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
      updateProfile,
      hasPermission: hasPermissionFor,
      canAccessPath: canAccess,
      refreshSession,
    }),
    [currentUser, role, authStatus, isAuthenticated, sessionUser, sessionExpiresAt, login, register, loginWithGoogle, requestOtp, verifyOtp, completeLoginSession, loginAs, demoLoginAs, setRole, logout, updateProfile, hasPermissionFor, canAccess, refreshSession],
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

