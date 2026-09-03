'use client';

/**
 * /unauthorized (Phase 10)
 * ------------------------
 * Professional access-denied state shown when an AUTHENTICATED user tries to
 * reach a resource their role does not permit. Explains what happened, which
 * requirement blocked the request, and offers sensible onward actions.
 */
import React from 'react';
import Link from 'next/link';
import { ShieldAlert, LayoutDashboard, LogIn, Home } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, getRouteRuleReason } from '@/lib/auth/permissions';

function attemptedPath(): string | null {
  if (typeof window === 'undefined') return null;
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

export default function UnauthorizedPage() {
  const { isAuthenticated, role } = useAuth();
  const [path] = React.useState<string | null>(attemptedPath);
  const reason = path ? getRouteRuleReason(path) : null;

  return (
    <PageContainer>
      <div className="mx-auto max-w-xl py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300 bg-amber-50">
              <ShieldAlert className="h-8 w-8 text-amber-600" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-600">HTTP 403 · FORBIDDEN</span>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">You don&apos;t have permission to view this page</h1>
              <p className="text-xs leading-relaxed text-slate-500">
                Your account is signed in as <span className="font-bold text-slate-700">{ROLE_LABELS[role]}</span>, which is not
                authorized for this resource. If you believe this is a mistake, contact your society secretary or revenue authority to review your role assignment.
              </p>
              {reason && (
                <p className="mx-auto mt-2 max-w-md rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                  {reason}
                </p>
              )}
              {path && (
                <p className="mt-1 font-mono text-[10px] text-slate-400">
                  Requested: <span className="text-slate-500">{path}</span>
                </p>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-tech-cyan transition-all hover:from-cyan-400 hover:to-blue-500"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" /> Go to my dashboard
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-tech-cyan transition-all hover:from-cyan-400 hover:to-blue-500"
                >
                  <LogIn className="h-3.5 w-3.5" /> Sign in
                </Link>
              )}
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-cyan-400 hover:text-cyan-700"
              >
                <Home className="h-3.5 w-3.5" /> Back to home
              </Link>
            </div>

            <p className="mt-2 text-[10px] text-slate-400">
              This attempt may be recorded in the system audit trail. Repeated unauthorized access attempts are reviewed by administrators.
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
