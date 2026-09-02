'use client';

/**
 * Route guards (Phase 10)
 * ========================
 * <ProtectedRoute> — requires an authenticated session (401 → /auth/login).
 * <RoleGuard>      — additionally requires a permission (403 → /unauthorized).
 *
 * Behavior:
 *   - While the session is initializing, a branded loading state is shown
 *     (no protected content flashes).
 *   - After sign-in the user is returned to `?next=<original path>`.
 *   - Guards re-evaluate on every navigation/route change.
 *
 * These guards shape the UI; the server always re-checks authorization at the
 * API boundary — the guard alone is never the security control.
 */

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { canAccessPath, type AccessDecision } from '@/lib/auth/permissions';
import type { Permission } from '@/types/auth';

function safeNextPath(pathname: string): string {
  return encodeURIComponent(pathname || '/');
}

function AuthLoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
      <p className="text-xs font-bold uppercase tracking-widest">{label}</p>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authStatus, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const redirectKey = `${authStatus}:${isAuthenticated ? 'in' : 'out'}`;
  const lastRedirect = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (redirectKey === 'unauthenticated:out' && lastRedirect.current !== pathname) {
      lastRedirect.current = pathname;
      router.replace(`/auth/login?next=${safeNextPath(pathname)}`);
    }
    if (redirectKey === 'authenticated:in') {
      lastRedirect.current = null;
    }
  }, [redirectKey, pathname, router]);

  if (authStatus === 'initializing') return <AuthLoadingState label="Checking your session…" />;
  if (!isAuthenticated) return null;
  return <>{children}</>;
}

export function RoleGuard({
  permission,
  children,
  fallback,
}: {
  /** Required permission (from the centralized matrix). */
  permission: Permission | null;
  children: React.ReactNode;
  /** Optional custom fallback instead of the standard redirect. */
  fallback?: React.ReactNode;
}) {
  const { authStatus, isAuthenticated, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const lastRedirect = React.useRef<string | null>(null);

  const decision: AccessDecision =
    authStatus === 'initializing'
      ? 'public'
      : canAccessPath(pathname, isAuthenticated ? role : null);

  React.useEffect(() => {
    if (authStatus === 'initializing') return;
    if (decision === 'unauthenticated' && lastRedirect.current !== pathname) {
      lastRedirect.current = pathname;
      router.replace(`/auth/login?next=${safeNextPath(pathname)}`);
    } else if (decision === 'unauthorized' && lastRedirect.current !== pathname) {
      lastRedirect.current = pathname;
      router.replace(`/unauthorized?next=${safeNextPath(pathname)}`);
    } else if (decision === 'allowed' || decision === 'public') {
      lastRedirect.current = null;
    }
  }, [decision, authStatus, pathname, router]);

  if (authStatus === 'initializing') return <AuthLoadingState label="Checking your session…" />;
  if (fallback !== undefined && (decision === 'unauthorized' || decision === 'unauthenticated')) {
    return <>{fallback}</>;
  }
  if (decision === 'unauthorized') return <AuthLoadingState label="Redirecting…" />;
  if (decision === 'unauthenticated') return null;
  return <>{children}</>;
}

/** True when the page content should render (used by pages that self-gate). */
export function useRouteAccess(): { checking: boolean; decision: AccessDecision } {
  const { authStatus, isAuthenticated, role } = useAuth();
  const pathname = usePathname();
  if (authStatus === 'initializing') return { checking: true, decision: 'public' };
  return { checking: false, decision: canAccessPath(pathname, isAuthenticated ? role : null) };
}

/** Inline "insufficient permission" panel used by custom fallbacks. */
export function PermissionDeniedPanel({ message }: { message: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
      <ShieldAlert className="h-7 w-7 text-amber-600" />
      <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Permission required</p>
      <p className="text-xs text-slate-600">{message}</p>
    </div>
  );
}
