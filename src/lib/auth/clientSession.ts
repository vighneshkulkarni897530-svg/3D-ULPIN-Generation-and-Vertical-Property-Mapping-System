/**
 * Client-Side Session Resolution Helper
 * =====================================
 * Resolves the active user ID across Firebase Client Auth, local memory,
 * and session/local storage, ensuring services have seamless access to
 * the authenticated user even when using cookie-based server sessions.
 */
import { auth } from '@/lib/firebase';
import type { User } from '@/types';

declare global {
  // eslint-disable-next-line no-var
  var __ACTIVE_SESSION_USER: User | null | undefined;
}

export function setActiveSessionUser(user: User | null): void {
  globalThis.__ACTIVE_SESSION_USER = user;
  if (typeof window !== 'undefined') {
    try {
      if (user) {
        sessionStorage.setItem('bhu_active_user', JSON.stringify(user));
        localStorage.setItem('bhu_active_user', JSON.stringify(user));
      } else {
        sessionStorage.removeItem('bhu_active_user');
        localStorage.removeItem('bhu_active_user');
      }
    } catch {}
  }
}

export function getActiveSessionUser(): User | null {
  // 1. In-memory global
  if (globalThis.__ACTIVE_SESSION_USER) {
    return globalThis.__ACTIVE_SESSION_USER;
  }

  // 2. Storage cache
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('bhu_active_user') || localStorage.getItem('bhu_active_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.id || parsed.uid)) {
          return {
            id: parsed.id || parsed.uid,
            name: parsed.name || 'Verified User',
            email: parsed.email || '',
            role: parsed.role || 'CITIZEN',
            phone: parsed.phone || '',
            aadhaarOrGovId: parsed.aadhaarOrGovId || 'PENDING-KYC',
            badgeNumber: parsed.badgeNumber,
            societyName: parsed.societyName,
            societyRegNo: parsed.societyRegNo,
            department: parsed.department,
            designation: parsed.designation,
            avatarUrl: parsed.avatarUrl,
          };
        }
      }
    } catch {}
  }

  // 3. Firebase Client Auth
  const fbUser = auth.currentUser;
  if (fbUser) {
    return {
      id: fbUser.uid,
      name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Verified User',
      email: fbUser.email || '',
      role: 'CITIZEN',
      phone: fbUser.phoneNumber || '',
      aadhaarOrGovId: 'PENDING-KYC',
    };
  }

  return null;
}

export function getActiveSessionUid(): string | null {
  // 1. Firebase client auth
  const fbUid = auth.currentUser?.uid;
  if (fbUid) return fbUid;

  // 2. Resolved session user
  const user = getActiveSessionUser();
  if (user?.id) return user.id;

  return null;
}
