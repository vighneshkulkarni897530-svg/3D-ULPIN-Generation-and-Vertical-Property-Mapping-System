'use client';

/**
 * /auth/logout (Phase 10)
 * -----------------------
 * Signs the user out (destroying the server session) and confirms it.
 * Route-based logout complements the navbar User Menu action.
 */
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2, CheckCircle2, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LogoutPage() {
  const { logout, isAuthenticated, authStatus } = useAuth();
  const router = useRouter();
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (authStatus === 'initializing') return;
    if (!isAuthenticated) {
      setDone(true);
      return;
    }
    let cancelled = false;
    void logout().then(() => {
      if (!cancelled) setDone(true);
    });
    return () => {
      cancelled = true;
    };
  }, [authStatus, isAuthenticated, logout]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm space-y-4">
        {!done ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              <LogOut className="h-3.5 w-3.5" /> Signing you out…
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900">You have been signed out</h1>
            <p className="text-xs leading-relaxed text-slate-500">
              Your session was closed on the server and the session cookie has been cleared. The logout action has been recorded in the audit trail.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-tech-cyan transition-all hover:from-cyan-400 hover:to-blue-500"
              >
                <LogIn className="h-3.5 w-3.5" /> Sign in again
              </Link>
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-cyan-400 hover:text-cyan-700"
              >
                Back to home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
