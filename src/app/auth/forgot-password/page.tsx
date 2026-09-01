'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Building, Mail, ArrowRight, CheckCircle2, AlertCircle, Loader2, Info, KeyRound } from 'lucide-react';
import { apiForgotPassword } from '@/lib/auth/client';

/**
 * Forgot-password page (Phase — Login & Sign Up completion).
 * Calls POST /api/auth/forgot-password. The response is always generic — the
 * page NEVER reveals whether an account exists. If no email delivery is
 * configured (prototype/development), the API returns the reset token in
 * `devResetToken`; the panel below shows it clearly labelled as a DEVELOPMENT
 * LIMITATION. Production builds never receive a token here.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [devNote, setDevNote] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // prevent duplicate submissions
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Email address is required.');
      return;
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError('Enter a valid email address (e.g. name@example.com).');
      return;
    }

    setLoading(true);
    try {
      const result = await apiForgotPassword(trimmed);
      setSubmitted(true);
      if (result.devMode && result.devResetToken) {
        setDevToken(result.devResetToken);
        setDevNote(result.devNote ?? null);
      }
    } catch {
      setError('Cannot reach the authentication service. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
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
          <h2 className="text-2xl font-extrabold tracking-tight text-white">Reset Cadastre Password</h2>
          <p className="text-xs text-slate-400">
            Enter your registered email address to receive secure OTP authentication.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-7 rounded-3xl shadow-2xl backdrop-blur-xl space-y-5">
          <div aria-live="assertive">
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden />
                <p className="text-[11px] font-bold text-red-300">{error}</p>
              </div>
            )}
          </div>

          {submitted ? (
            <div className="text-center space-y-4 py-2" aria-live="polite">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" aria-hidden />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Reset Link Generated</h4>
                <p className="text-xs text-slate-400 mt-1">
                  If an account exists for <strong className="text-cyan-400">{email.trim()}</strong>, a single-use reset link valid for 15 minutes has been generated for it.
                </p>
              </div>

              {devToken && (
                <div className="text-left p-3 bg-slate-950 rounded-xl border border-amber-500/40 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-400" aria-hidden />
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Development mode</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-400">
                    {devNote ?? 'Email delivery is not configured in this prototype, so the reset token is shown below instead of being emailed.'}
                  </p>
                  <code className="block truncate rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-[10px] font-mono text-cyan-300">
                    {devToken}
                  </code>
                  <Link
                    href={`/auth/reset-password?token=${encodeURIComponent(devToken)}`}
                    className="inline-flex w-full items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-tech-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  >
                    <KeyRound className="w-4 h-4" aria-hidden /> Continue to Reset
                  </Link>
                </div>
              )}

              <Link
                href="/auth/reset-password"
                className="inline-flex w-full items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-tech-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                Proceed to Reset <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="forgot-email" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Registered Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" aria-hidden />
                  </div>
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    required
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'forgot-email-error' : undefined}
                    placeholder="name@example.com"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none"
                  />
                </div>
                {error && (
                  <p id="forgot-email-error" className="mt-1 text-[10px] font-bold text-red-400">
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-tech-cyan transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    <span>Generating secure link…</span>
                  </>
                ) : (
                  <>
                    <span>Send Secure Reset Link</span>
                    <ArrowRight className="w-4 h-4" aria-hidden />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="text-center pt-2 text-xs text-slate-400">
            Remember password?{' '}
            <Link href="/auth/login" className="text-cyan-400 font-bold hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
