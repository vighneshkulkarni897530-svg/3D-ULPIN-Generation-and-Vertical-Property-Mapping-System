'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

const DEMO_PASSWORD = 'Bhu-Verify#2024';

const DEMO_ACCOUNTS: Record<'citizen' | 'officer' | 'admin', { email: string; dashboard: string }> = {
  citizen: { email: 'rajesh.sharma@example.com', dashboard: '/dashboard/citizen' },
  officer: { email: 'ananya.iyer@rev.gov.in', dashboard: '/dashboard/officer' },
  admin: { email: 'admin.cadastre@gov.in', dashboard: '/dashboard/admin' },
};

function destinationAfterLogin(roleKey: 'citizen' | 'officer' | 'admin'): string {
  if (typeof window !== 'undefined') {
    const next = new URLSearchParams(window.location.search).get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  }
  return DEMO_ACCOUNTS[roleKey].dashboard;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, authStatus } = useAuth();

  const [selectedRole, setSelectedRole] = useState<'citizen' | 'officer' | 'admin'>('citizen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleSelect = (roleKey: 'citizen' | 'officer' | 'admin') => {
    setSelectedRole(roleKey);
    setError(null);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await login(email.trim(), password);
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? 'Invalid email or password.');
      return;
    }

    const matchedRole = (Object.keys(DEMO_ACCOUNTS) as (keyof typeof DEMO_ACCOUNTS)[]).find(
      (k) => DEMO_ACCOUNTS[k].email.toLowerCase() === email.trim().toLowerCase(),
    );
    window.location.href = destinationAfterLogin(matchedRole ?? selectedRole ?? 'citizen');
  };

  const handleFillDemo = (roleKey: 'citizen' | 'officer' | 'admin') => {
    setSelectedRole(roleKey);
    setEmail(DEMO_ACCOUNTS[roleKey].email);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-cyan-500/10 blur-[110px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[200px] bg-blue-500/10 blur-[90px] rounded-full pointer-events-none" />

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
            Access ULPIN verification, 3D property records &amp; official portals.
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
            <span>Director Admin</span>
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
                Official Email / Aadhaar ID
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
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
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-tech-cyan transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In with Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="pt-2 border-t border-slate-800/80">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 text-center">
              Quick Test Accounts
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleFillDemo('citizen')}
                className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-[11px] font-medium text-slate-400 hover:text-cyan-300 transition-all text-center"
              >
                Citizen
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('officer')}
                className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-[11px] font-medium text-slate-400 hover:text-cyan-300 transition-all text-center"
              >
                Officer
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('admin')}
                className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-[11px] font-medium text-slate-400 hover:text-cyan-300 transition-all text-center"
              >
                Admin
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
