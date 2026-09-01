'use client';

/**
 * /profile (Phase 10)
 * -------------------
 * Current user's account overview: identity, role, account status, session
 * information and the permission matrix for their role.
 */
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User, Mail, Phone, Fingerprint, Calendar, Building, BadgeCheck, ShieldCheck,
  Clock, Ban, KeyRound, LogOut, LogIn, Loader2,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, PERMISSION_MATRIX } from '@/lib/auth/permissions';
import { apiLogout } from '@/lib/auth/client';

export default function ProfilePage() {
  const { sessionUser, currentUser, role, authStatus, sessionExpiresAt, logout } = useAuth();
  const router = useRouter();
  const user = sessionUser ?? currentUser;
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiLogout();
      await logout();
      router.push('/auth/login');
    } finally {
      setLoggingOut(false);
    }
  };

  if (authStatus === 'initializing') {
    return (
      <PageContainer>
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
          <p className="text-xs font-bold uppercase tracking-widest">Checking your session…</p>
        </div>
      </PageContainer>
    );
  }

  if (!sessionUser) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-md py-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <User className="h-7 w-7 text-slate-400" />
          </div>
          <h1 className="text-lg font-extrabold text-slate-900">You are signed out</h1>
          <p className="text-xs text-slate-500">Sign in to view your profile and account information.</p>
          <Link
            href="/auth/login?next=%2Fprofile"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-tech-cyan"
          >
            <LogIn className="h-3.5 w-3.5" /> Sign in
          </Link>
        </div>
      </PageContainer>
    );
  }

  const isActive = user.accountStatus !== 'DISABLED';
  const infoRows: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }[] = [
    { icon: Mail, label: 'Email', value: user.email },
    { icon: Phone, label: 'Phone', value: user.phone || '—' },
    { icon: Fingerprint, label: 'Aadhaar / Govt ID', value: user.aadhaarOrGovId || '—' },
    ...(user.department ? [{ icon: Building, label: 'Department', value: user.department }] : []),
    ...(user.designation ? [{ icon: BadgeCheck, label: 'Designation', value: user.designation }] : []),
    ...(user.badgeNumber ? [{ icon: KeyRound, label: 'Badge / Service No.', value: user.badgeNumber }] : []),
    ...(user.jurisdictionDistrict ? [{ icon: Building, label: 'Jurisdiction', value: user.jurisdictionDistrict }] : []),
    { icon: Calendar, label: 'Account created', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' },
  ];

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          eyebrow="ACCOUNT"
          title="My Profile"
          description="Your identity, role and account standing within the 3D ULPIN Generation & Vertical Property Mapping System."
          actions={
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-red-400 hover:text-red-600 disabled:opacity-60"
            >
              {loggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              Sign out
            </button>
          }
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Identity card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-extrabold text-slate-950">
                {user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-extrabold tracking-tight text-slate-900">{user.name}</h2>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-cyan-700">
                <ShieldCheck className="h-3 w-3" /> {ROLE_LABELS[role]}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                  isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {isActive ? <BadgeCheck className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                {isActive ? 'Active' : 'Disabled'}
              </span>
            </div>
            <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4">
              {infoRows.map((row) => (
                <div key={row.label} className="flex items-start gap-2.5">
                  <row.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{row.label}</p>
                    <p className="truncate text-xs font-semibold text-slate-700">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            {/* Session card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-slate-900">
                <Clock className="h-4 w-4 text-cyan-600" /> Session
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                  <p className="text-xs font-bold text-emerald-700">Signed in · session valid</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expires</p>
                  <p className="text-xs font-bold text-slate-700">
                    {sessionExpiresAt ? new Date(sessionExpiresAt).toLocaleString() : '—'}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                The session lives in an httpOnly cookie managed by the server; this page only mirrors it. Sessions expire automatically after 8 hours of inactivity (sliding window) and are re-checked against the server.
              </p>
            </div>

            {/* Permission matrix card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-slate-900">
                <ShieldCheck className="h-4 w-4 text-cyan-600" /> Permissions for your role
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Centralized permission matrix (Phase 10) — enforced server-side at the API boundary, not just hidden in the UI.
              </p>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-3 py-2">Feature</th>
                      <th className="px-3 py-2 text-center">Citizen</th>
                      <th className="px-3 py-2 text-center">Officer</th>
                      <th className="px-3 py-2 text-center">Admin</th>
                      <th className="px-3 py-2 text-center">You</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_MATRIX.map((row) => {
                      const mine = role === 'CITIZEN' ? row.citizen : role === 'OFFICER' ? row.officer : row.admin;
                      return (
                        <tr key={row.feature} className="border-b border-slate-50 last:border-0">
                          <td className="px-3 py-2 font-semibold text-slate-700">{row.feature}</td>
                          {[row.citizen, row.officer, row.admin].map((allowed, i) => (
                            <td key={i} className="px-3 py-2 text-center">
                              {allowed ? <span className="text-emerald-600">✓</span> : <span className="text-slate-300">✗</span>}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center">
                            {mine ? <span className="font-bold text-cyan-700">✓</span> : <span className="font-bold text-red-400">✗</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

      </div>
    </PageContainer>
  );
}
