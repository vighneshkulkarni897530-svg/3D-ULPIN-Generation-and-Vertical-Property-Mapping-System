'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building, ShieldCheck, Lock, Mail, User, Phone, ArrowRight, Sparkles, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * Registration page (Phase 10).
 * Creates a real CITIZEN account via /api/auth/register (server-side
 * validation + scrypt password hashing) and signs the user in. Officer and
 * administrator accounts are provisioned administratively, NOT via
 * self-registration — the server rejects any other role.
 */
export default function RegisterPage() {
  const router = useRouter();
  const { register, authStatus } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (authStatus === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [authStatus, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const result = await register({ name, email, phone, password });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? 'Registration failed.');
      return;
    }
    router.push('/auth/login');
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden">
      <div className="max-w-md w-full space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 mx-auto shadow-tech-cyan flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Building className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            Create Cadastre Account
          </h2>
          <p className="text-xs text-slate-400">
            Register your digital profile for seamless property verification & dispute resolution.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-7 rounded-3xl shadow-2xl backdrop-blur-xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <div>
                  <p className="text-xs font-bold text-red-300">Registration failed</p>
                  <p className="text-[11px] text-red-300/80">{error}</p>
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Rajesh V. Sharma"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
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
                  placeholder="name@domain.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98XXX XXXXX"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Aadhaar / Govt ID
                </label>
                <input
                  type="text"
                  value="PENDING-KYC"
                  disabled
                  readOnly
                  placeholder="XXXX-XXXX-8921"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-500 rounded-xl px-3.5 py-2.5 text-xs font-medium font-mono outline-none cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Re-enter password"
                    className={`w-full bg-slate-950 border rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-red-500/70 text-red-300'
                        : 'border-slate-800 focus:border-cyan-400 text-white'
                    }`}
                  />
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="mt-1 text-[10px] font-bold text-red-400">
                    Passwords do not match
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
              <p className="text-[10px] leading-relaxed text-slate-400">
                Self-registration creates a <span className="font-bold text-cyan-300">Citizen</span> account. Government Officer and Administrator accounts are provisioned by the cadastre administration.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || (confirmPassword !== password)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-tech-cyan transition-all disabled:opacity-50"
            >
              {loading ? <span>Creating Account...</span> : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Complete Registration
                </span>
              )}
            </button>
          </form>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
            <span>Passwords are salted &amp; hashed (scrypt) on the server. Aadhaar linking happens after KYC in a production deployment (prototype).</span>
          </div>

          <div className="text-center pt-2 text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-cyan-400 font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
