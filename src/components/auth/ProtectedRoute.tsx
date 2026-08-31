'use client';

/**
 * ProtectedRoute (Phase 10)
 * ==========================
 * Client-side route guard. Complements (never replaces) the server-side
 * checks: every /api route re-validates the session cookie, so bypassing
 * this component grants access to UI only, never to data.
 *
 * Behaviour:
 *   - unauthenticated  → redirect to /auth/login?next=<current path>
 *   - unauthorized     → redirect to /unauthorized?next=<current path>
 *   - initializing     → full-page loading state (no flash of content)
 */
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { canAccessPath } from '@/lib/auth/permissions';
import { FullScreenLoader } from './FullScreenLoader';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Optionally override the permission required (defaults to the route map). */
  permission?: import('@/types/auth').Permission;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, permission }) => {
  const { authStatus, role, isAuthenticated, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '/';

  const decision: 'allowed' | 'unauthorized' = permission
    ? hasPermission(permission)
      ? 'allowed'
      : 'unauthorized'
    : canAccessPath(pathname, role) === 'unauthorized'
      ? 'unauthorized'
      : 'allowed';

  React.useEffect(() => {
    if (authStatus === 'initializing') return;
    if (!isAuthenticated) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (decision === 'unauthorized') {
      router.replace(`/unauthorized?next=${encodeURIComponent(pathname)}`);
    }
  }, [authStatus, isAuthenticated, decision, pathname, router]);

  if (authStatus === 'initializing') {
    return <FullScreenLoader label="Restoring your secure session…" />;
  }

  if (!isAuthenticated || decision === 'unauthorized') {
    return <FullScreenLoader label="Redirecting…" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
