'use client';

/**
 * Authentication Context (Phase 10)
 * ==================================
 * Single source of truth for the current user, session state and permissions.
 *
 * Security model:
 *   - The session lives in an httpOnly cookie managed by /api/auth/*; this
 *     context mirrors it client-side for UI purposes only.
 *   - On boot the context asks the server (`GET /api/auth/session`) whether a
 *     valid session exists — localStorage NEVER grants authentication.
 *   - Sign-out / session expiry clear the mirrored state immediately; the
 *     server rejects any further authorized API calls with 401/403.
 *   - `setRole` / `loginAs` (the legacy demo persona switcher) now establish
 *     a REAL server session via /api/auth/demo-login so authorization always
 *     follows the server session, never a browser-supplied role.
 *
 * Backwards compatibility: `currentUser`, `role`, `setRole`, `loginAs`,
 * `logout` and `isAuthenticated` keep their previous shapes so existing
 * consumers continue to work. When signed out, `currentUser` falls back to a
 * clearly-marked GUEST placeholder — protected pages are gated by
 * <ProtectedRoute> so they never render for signed-out visitors.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { User, UserRole } from '@/types';
import { PERMISSIONS, type Permission } from '@/types/auth';
import { canAccessPath, hasPermission } from '@/lib/auth/permissions';
import {
  apiDemoLogin,
  apiGetSession,
  apiLogin,
  apiLogout,
  apiRegister,
  AuthApiError,
  type SessionUser,
} from '@/lib/auth/client';

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';

/** Clearly-marked placeholder shown to signed-out visitors (never persisted). */
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
}

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface AuthContextType {
  /** Signed-in user; falls back to GUEST_USER when signed out (legacy shape). */
  currentUser: User;
  /** Active role — equals the session user's role, or 'CITIZEN' when signed out. */
  role: UserRole;
  /** Boot/session state — 'initializing' until the server has been asked. */
  authStatus: AuthStatus;
  /** Legacy flag — true only while a valid session exists. */
  isAuthenticated: boolean;
  /** The real session user (null when signed out). Prefer over currentUser. */
  sessionUser: User | null;
  sessionExpiresAt: string | null;
  /** Email/password sign-in. */
  login: (email: string, password: string) => Promise<AuthActionResult>;
  /** Citizen self-registration (auto signs in on success). */
  register: (input: RegisterInput) => Promise<AuthActionResult>;
  /** Legacy demo persona switch (now establishes a real demo session). */
  loginAs: (roleKey: 'citizen' | 'officer' | 'admin') => void;
  /** Awaitable demo persona sign-in. */
  demoLoginAs: (roleKey: 'citizen' | 'officer' | 'admin') => Promise<AuthActionResult>;
  /** Legacy role setter — maps to demoLoginAs. */
  setRole: (role: UserRole) => void;
  /** Signs out on the server and clears local state. */
  logout: () => Promise<void>;
  /** Permission check against the active role. */
  hasPermission: (permission: Permission) => boolean;
  /** Route-level access check for the active role. */
  canAccessPath: (path: string) => boolean;
  /** Re-sync state with the server (e.g. after a 401 elsewhere). */
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
  const bootstrapped = useRef(false);

  // ── Session bootstrap + expiry watch ──────────────────────────────────────

  const applySession = useCallback((user: SessionUser | null, expiresAt?: string) => {
    if (user) {
      setSessionUser({ ...user } as User);
      setSessionExpiresAt(expiresAt ?? (user.sessionExpiresAt ? new Date(user.sessionExpiresAt).toISOString() : null));
      setAuthStatus('authenticated');
    } else {
      setSessionUser(null);
      setSessionExpiresAt(null);
      setAuthStatus('unauthenticated');
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const session = await apiGetSession();
      applySession(session?.user ?? null, session?.expiresAt);
    } catch {
      applySession(null);
    }
  }, [applySession]);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    void refreshSession();
  }, [refreshSession]);

  // Client-side session-expiry watchdog (the server remains the authority).
  useEffect(() => {
    if (authStatus !== 'authenticated' || !sessionExpiresAt) return;
    const msRemaining = new Date(sessionExpiresAt).getTime() - Date.now();
    if (msRemaining <= 0) {
      void refreshSession();
      return;
    }
    const timer = setTimeout(() => void refreshSession(), Math.min(msRemaining + 1000, 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [authStatus, sessionExpiresAt, refreshSession]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const login = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      try {
        const { user } = await apiLogin(email, password);
        applySession(user);
        return { ok: true };
      } catch (err) {
        const message = err instanceof AuthApiError ? err.message : 'Sign-in failed. Please try again.';
        return { ok: false, error: message, errorCode: err instanceof AuthApiError ? err.code : 'UNKNOWN' };
      }
    },
    [applySession],
  );

  const register = useCallback(
    async (input: RegisterInput): Promise<AuthActionResult> => {
      try {
        const { user } = await apiRegister(input);
        applySession(user);
        return { ok: true };
      } catch (err) {
        const message = err instanceof AuthApiError ? err.message : 'Registration failed. Please try again.';
        return { ok: false, error: message, errorCode: err instanceof AuthApiError ? err.code : 'UNKNOWN' };
      }
    },
    [applySession],
  );

  const demoLoginAs = useCallback(
    async (roleKey: 'citizen' | 'officer' | 'admin'): Promise<AuthActionResult> => {
      try {
        const { user } = await apiDemoLogin(roleKey);
        applySession(user);
        return { ok: true };
      } catch (err) {
        const message = err instanceof AuthApiError ? err.message : 'Demo sign-in failed.';
        return { ok: false, error: message, errorCode: err instanceof AuthApiError ? err.code : 'UNKNOWN' };
      }
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Clear local state regardless — the httpOnly cookie is expired server-side.
    }
    applySession(null);
  }, [applySession]);

  // Legacy sync-shaped helpers kept for existing callers (fire-and-forget).
  const loginAs = useCallback(
    (roleKey: 'citizen' | 'officer' | 'admin') => {
      void demoLoginAs(roleKey);
    },
    [demoLoginAs],
  );

  const setRole = useCallback(
    (newRole: UserRole) => {
      const key = (Object.keys(DEMO_ROLE_BY_KEY) as (keyof typeof DEMO_ROLE_BY_KEY)[]).find(
        (k) => DEMO_ROLE_BY_KEY[k] === newRole,
      );
      if (key) void demoLoginAs(key);
    },
    [demoLoginAs],
  );

  // ── Derived values ────────────────────────────────────────────────────────

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
      loginAs,
      demoLoginAs,
      setRole,
      logout,
      hasPermission: hasPermissionFor,
      canAccessPath: canAccess,
      refreshSession,
    }),
    [
      currentUser, role, authStatus, isAuthenticated, sessionUser, sessionExpiresAt,
      login, register, loginAs, demoLoginAs, setRole, logout, hasPermissionFor, canAccess, refreshSession,
    ],
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

/** Convenience re-export so consumers can reference the permission keys. */
export { PERMISSIONS };

