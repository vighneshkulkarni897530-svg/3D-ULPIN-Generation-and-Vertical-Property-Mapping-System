'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Building, ShieldCheck, Lock, Mail, ArrowRight, Sparkles, User, Shield, Building2, AlertCircle } from 'lucide-react';

/**
 * Login page (Phase 10).
 * Performs REAL authentication against /api/auth/login (scrypt-verified
 * credentials + httpOnly session cookie). The three demo personas share the
 * published prototype password below — this is clearly-labelled demo access,
 * not a production credential.
 */
const DEMO_PASSWORD = 'Bhu-Verify#2024';

const DEMO_ACCOUNTS: Record<'citizen' | 'officer' | 'admin', { email: string; dashboard: string }> = {
  citizen: { email: 'rajesh.sharma@example.com', dashboard: '/dashboard/citizen' },
  officer: { email: 'ananya.iyer@rev.gov.in', dashboard: '/dashboard/officer' },
  admin: { email: 'admin.cadastre@gov.in', dashboard: '/dashboard/admin' },
};

/** Honours the ?next= redirect target (same-origin paths only). */
function destinationAfterLogin(roleKey: 'citizen' | 'officer' | 'admin'): string {
  if (typeof window !== 'undefined') {
    const next = new URLSearchParams(window.location.search).get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  }
  return DEMO_ACCOUNTS[roleKey].dashboard;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, demoLoginAs, authStatus } = useAuth();

  const [selectedRole, setSelectedRole] = useState<'citizen' | 'officer' | 'admin'>('citizen');
  const [email, setEmail] = useState(DEMO_ACCOUNTS.citizen.email);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<'citizen' | 'officer' | 'admin' | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (authStatus === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [authStatus, router]);

  const handleRoleSelect = (roleKey: 'citizen' | 'officer' | 'admin') => {
    setSelectedRole(roleKey);
    setEmail(DEMO_ACCOUNTS[roleKey].email);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? 'Sign-in failed.');
      return;
    }
    const matchedRole = (Object.keys(DEMO_ACCOUNTS) as (keyof typeof DEMO_ACCOUNTS)[]).find(
      (k) => DEMO_ACCOUNTS[k].email.toLowerCase() === email.trim().toLowerCase(),
    );
    router.push(destinationAfterLogin(matchedRole ?? 'citizen'));
  };

  const handleDemoAccess = async (roleKey: 'citizen' | 'officer' | 'admin') => {
    setDemoLoading(roleKey);
    setError(null);
    const result = await demoLoginAs(roleKey);
    setDemoLoading(null);
    if (!result.ok) {
      setError(result.error ?? 'Demo sign-in failed.');
      return;
    }
    router.push(destinationAfterLogin(roleKey));
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 mx-auto shadow-tech-cyan flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Building className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            Sign In to Smart Cadastre
          </h2>
          <p className="text-xs text-slate-400">
            Access ULPIN verification, 3D property records & official portals.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="p-1 bg-slate-900 border border-slate-800 rounded-2xl grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => handleRoleSelect('citizen')}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              selectedRole === 'citizen'
                ? 'bg-cyan-500 text-slate-950 shadow-tech-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Citizen</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSelect('officer')}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              selectedRole === 'officer'
                ? 'bg-cyan-500 text-slate-950 shadow-tech-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Govt Officer</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSelect('admin')}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              selectedRole === 'admin'
                ? 'bg-cyan-500 text-slate-950 shadow-tech-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Cadastre Admin</span>
          </button>
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-900/90 border border-slate-800 p-7 rounded-3xl shadow-2xl backdrop-blur-xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <div>
                  <p className="text-xs font-bold text-red-300">Sign-in failed</p>
                  <p className="text-[11px] text-red-300/80">{error}</p>
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Official Email / Aadhaar ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none"
                  placeholder="Enter email or ID"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-[11px] text-cyan-400 hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-500/30"
                />
                <span>Remember session</span>
              </label>
              <span className="text-[11px] text-cyan-400 font-mono">256-bit SSL</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-tech-cyan transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo credentials + instant demo access */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] space-y-1.5 text-slate-400">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold text-slate-300">Prototype demo access</span>
              </div>
              <span className="font-mono text-cyan-400">{DEMO_PASSWORD}</span>
            </div>
            <p className="text-[10px] leading-relaxed text-slate-500">
              The three demo personas share the published password above. Accounts reset when the server restarts — this is clearly-labelled prototype authentication, not production security.
            </p>
          </div>

          {/* Instant demo access */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-800" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Instant demo access</span>
              <span className="h-px flex-1 bg-slate-800" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={demoLoading !== null || loading}
                onClick={() => handleDemoAccess('citizen')}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 py-2.5 text-xs font-bold text-slate-300 transition-all hover:border-cyan-500/50 hover:text-white disabled:opacity-50"
                title="Sign in instantly as the demo Citizen"
              >
                <User className="w-4 h-4 text-cyan-400" />
                <span>{demoLoading === 'citizen' ? '…' : 'Citizen'}</span>
              </button>
              <button
                type="button"
                disabled={demoLoading !== null || loading}
                onClick={() => handleDemoAccess('officer')}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 py-2.5 text-xs font-bold text-slate-300 transition-all hover:border-emerald-500/50 hover:text-white disabled:opacity-50"
                title="Sign in instantly as the demo Government Officer"
              >
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>{demoLoading === 'officer' ? '…' : 'Officer'}</span>
              </button>
              <button
                type="button"
                disabled={demoLoading !== null || loading}
                onClick={() => handleDemoAccess('admin')}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 py-2.5 text-xs font-bold text-slate-300 transition-all hover:border-indigo-500/50 hover:text-white disabled:opacity-50"
                title="Sign in instantly as the demo Cadastre Admin"
              >
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span>{demoLoading === 'admin' ? '…' : 'Admin'}</span>
              </button>
            </div>
          </div>

          <div className="text-center pt-2 text-xs text-slate-400">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-cyan-400 font-bold hover:underline">
              Register Bhu-Aadhaar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
