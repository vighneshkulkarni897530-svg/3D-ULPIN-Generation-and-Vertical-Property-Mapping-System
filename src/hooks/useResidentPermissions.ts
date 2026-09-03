/**
 * Resident permission hooks (Phase 3)
 * ====================================
 * Thin, hydration-safe wrappers over the EXISTING AuthContext + the Phase 1
 * society membership service. No second auth system is introduced —
 * `useAuth()` remains the single source of session state, and Firestore
 * rules remain the real authorization boundary.
 */

import { useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { getSocietyMembership } from '@/lib/society/service';
import type { SocietyMembership } from '@/types/society';

export interface ResidentAuthInfo {
  /** Firebase UID of the signed-in user ('' when signed out or guest). */
  uid: string;
  email: string | null;
  isLoading: boolean;
  /** The user's membership for the target society (null = none). */
  membership: SocietyMembership | null;
  /** True when the user is an ACTIVE society-admin of the target society. */
  isSocietyAdmin: boolean;
  /** True when the user holds any membership for the target society. */
  hasMembership: boolean;
}

/**
 * Returns authenticated user info plus, when `targetSocietyId` is provided,
 * the user's membership for THAT society.
 *
 * Correct service argument order: getSocietyMembership(societyId, userId).
 * The guest pseudo-user from AuthContext is ignored — it has no Firebase
 * account, so membership lookups are skipped for it.
 */
export function useResidentPermissions(targetSocietyId?: string): ResidentAuthInfo {
  const { sessionUser: user, authStatus } = useAuth();
  const [membership, setMembership] = useState<SocietyMembership | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(false);

  const uid = user?.id ?? '';
  const isRealUser = uid !== '' && uid !== 'guest';
  const shouldCheck = isRealUser && Boolean(targetSocietyId);

  useEffect(() => {
    // Wait for the auth state to settle before checking membership.
    if (authStatus === 'initializing') {
      setMembershipLoading(true);
      return;
    }
    if (!shouldCheck) {
      setMembership(null);
      setMembershipLoading(false);
      return;
    }

    let cancelled = false;
    setMembershipLoading(true);

    getSocietyMembership(targetSocietyId as string, uid)
      .then((mem) => {
        if (!cancelled) setMembership(mem);
      })
      .catch(() => {
        // Membership is optional context — degrade to "not a member".
        if (!cancelled) setMembership(null);
      })
      .finally(() => {
        if (!cancelled) setMembershipLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authStatus, shouldCheck, targetSocietyId, uid]);

  return {
    uid: isRealUser ? uid : '',
    email: user?.email ?? null,
    isLoading: authStatus === 'initializing' || membershipLoading,
    membership,
    isSocietyAdmin:
      membership?.role === 'society-admin' && membership.status === 'active',
    hasMembership: membership !== null,
  };
}

/**
 * Proper hook variant of the removed `requireSocietyAdmin()` (which illegally
 * called hooks inside a plain function). Use it to gate society-admin UI.
 */
export function useSocietyAdmin(
  societyId: string | undefined,
): { isSocietyAdmin: boolean; isLoading: boolean; membership: SocietyMembership | null } {
  const { isSocietyAdmin, isLoading, membership } = useResidentPermissions(societyId);
  return { isSocietyAdmin, isLoading, membership };
}