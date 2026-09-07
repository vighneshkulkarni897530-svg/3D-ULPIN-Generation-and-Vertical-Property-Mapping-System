'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Building,
  Lock,
  Mail,
  ArrowRight,
  User,
  Shield,
  Building2,
  AlertCircle,
  Loader2,
  KeyRound,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

import { DEMO_PASSWORD } from '@/lib/auth/authConstants';

const DEMO_ACCOUNTS: Record<'citizen' | 'officer' | 'admin', { email: string; dashboard: string }> = {
  citizen: { email: 'rajesh.sharma@example.com', dashboard: '/dashboard/citizen' },
  officer: { email: 'ananya.iyer@rev.gov.in', dashboard: '/dashboard/officer' },
  admin: { email: 'secretary@greenvalley.soc.in', dashboard: '/dashboard/admin' },
};

/** Safe `?next=` handling: same-origin relative paths only. */
function safeNextPath(): string | null {
  if (typeof window === 'undefined') return null;
  const next = new URLSearchParams(window.location.search).get('next');
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return null;
}

function destinationAfterLogin(roleKey: 'citizen' | 'officer' | 'admin'): string {
  return safeNextPath() ?? DEMO_ACCOUNTS[roleKey].dashboard;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFillDemo = () => {
    setEmail('rajesh.sharma@example.com');
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await login(email.trim(), password, { portalRole: 'CITIZEN' });
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? 'Invalid email or password.');
      return;
    }

    window.location.href = safeNextPath() ?? destinationAfterLogin('citizen');
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-6 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-md w-full space-y-6 relative z-10 mx-auto">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-cyan-500/40 bg-slate-950 p-0.5 mx-auto shadow-tech-cyan flex items-center justify-center">
            <img src="/logo.jpeg" alt="CyberSpark Logo" className="w-full h-full object-cover rounded-[14px]" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-cyan-500/30 text-[11px] font-mono font-bold text-cyan-300 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>SIH 2026 · Digital Cadastre 3D Earth</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            Citizen Portal Sign In
          </h2>
          <p className="text-xs text-slate-400">
            Access your 3D property records, ULPIN verification &amp; dispute tracking.
          </p>
        </div>

        {/* Portal Switching Bar */}
        <div className="p-1 bg-slate-900 border border-slate-800 rounded-2xl grid grid-cols-3 gap-1">
          <div
            className="flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 shadow-tech-cyan cursor-default"
          >
            <User className="w-4 h-4" />
            <span>Citizen Portal</span>
          </div>

          <Link
            href="/auth/officer-login"
            className="flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all text-center"
            title="Official login form for Revenue Officers"
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Govt Officer</span>
          </Link>

          <Link
            href="/auth/society-login"
            className="flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all text-center"
            title="Official login form for Society Secretaries"
          >
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span>Society Sec.</span>
          </Link>
        </div>

        {/* Quick Demo Fill Card */}
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-3.5 flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
              ⚡ Quick Test Credentials
            </span>
            <span className="text-[11px] text-slate-300 font-mono">
              rajesh.sharma@example.com
            </span>
          </div>
          <button
            type="button"
            onClick={handleFillDemo}
            className="shrink-0 rounded-xl border border-cyan-400/40 bg-cyan-500/20 px-3 py-1.5 font-bold text-cyan-300 hover:bg-cyan-500/30 hover:border-cyan-400 transition-colors cursor-pointer"
          >
            Auto-Fill
          </button>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-7 rounded-3xl shadow-2xl backdrop-blur-xl space-y-5">
          {error && (
            <div
              className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Citizen Registered Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@domain.gov.in"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white rounded-xl pl-10 pr-10 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <span className="text-[10px] font-bold text-cyan-400">HIDE</span> : <span className="text-[10px] font-bold text-slate-400">SHOW</span>}
                </button>
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
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-tech-cyan transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-3 border-t border-slate-800/80 text-xs text-slate-400">
            Don't have a Citizen account?{' '}
            <Link href="/auth/register" className="text-cyan-400 font-bold hover:underline">
              Register Citizen Bhu-Aadhaar &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

