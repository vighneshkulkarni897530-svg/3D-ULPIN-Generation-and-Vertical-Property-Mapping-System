'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building, ArrowRight, CheckCircle2, AlertCircle, Loader2, KeyRound, ShieldCheck, Info } from 'lucide-react';
import { apiResetPassword } from '@/lib/auth/client';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordRequirements, evaluatePasswordRequirements } from '@/components/auth/PasswordRequirements';

/**
 * Reset-password page (Phase — Login & Sign Up completion).
 * Consumes a single-use reset token (POST /api/auth/reset-password) and sets
 * the new password. Tokens arrive via ?token=<…> (from the forgot-password
 * flow) or can be pasted manually. Expired/invalid tokens are reported
 * generically with a path back to /auth/forgot-password. On success all
 * existing sessions for the account are invalidated server-side and the user
 * is redirected to the login page.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [tokenMissing, setTokenMissing] = useState(false);

  // Pre-fill the token from the URL once on mount (query-param driven flow).
  React.useEffect(() => {
    const urlToken = new URLSearchParams(window.location.search).get('token');
    if (urlToken) setToken(urlToken);
  }, []);

  const passwordStatus = useMemo(() => evaluatePasswordRequirements(password), [password]);
  const passwordCompliant = Object.keys(passwordStatus).every((k) => passwordStatus[k]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // prevent duplicate submissions
    setError(null);
    setFieldError(null);

    const trimmedToken = token.trim();
    if (!trimmedToken) {
      setTokenMissing(true);
      setError('Paste the reset token you received, or request a new reset link.');
      return;
    }
    if (!passwordCompliant) {
      setFieldError('The new password does not meet all the requirements listed below.');
      return;
    }
    if (!confirmPassword) {
      setFieldError('Please confirm your new password.');
      return;
    }
    if (password !== confirmPassword) {
      setFieldError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiResetPassword(trimmedToken, password);
      setSuccess(true);
      window.setTimeout(() => router.push('/auth/login'), 1800);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password reset failed. Please try again.';
      setError(message);
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
          <h2 className="text-2xl font-extrabold tracking-tight text-white">Create New Password</h2>
          <p className="text-xs text-slate-400">
            Paste your single-use reset token and choose a strong new password.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-7 rounded-3xl shadow-2xl backdrop-blur-xl space-y-5">
          <div aria-live="assertive">
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden />
                <div>
                  <p className="text-xs font-bold text-red-300">Reset failed</p>
                  <p className="text-[11px] text-red-300/80">{error}</p>
                  {error.toLowerCase().includes('invalid or has expired') && (
                    <Link href="/auth/forgot-password" className="mt-1 inline-block text-[11px] font-bold text-cyan-400 hover:underline">
                      Request a new reset link →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {success ? (
            <div className="text-center space-y-3 py-4" aria-live="polite">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" aria-hidden />
              </div>
              <h4 className="text-base font-bold text-white">Password Updated Successfully</h4>
              <p className="text-xs text-slate-400">
                All existing sessions were signed out for security. Redirecting to the login portal…
              </p>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-cyan-400" aria-hidden /> Redirecting…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="reset-token" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Reset Token
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" aria-hidden />
                  </div>
                  <input
                    id="reset-token"
                    name="token"
                    type="text"
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      if (tokenMissing) setTokenMissing(false);
                      if (error) setError(null);
                    }}
                    required
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={tokenMissing ? true : undefined}
                    placeholder="Paste your reset token"
                    className={`w-full bg-slate-950 border focus:border-cyan-400 text-cyan-300 rounded-xl pl-10 pr-4 py-2.5 text-[11px] font-mono focus:ring-2 focus:ring-cyan-500/20 outline-none ${
                      tokenMissing ? 'border-red-500/70' : 'border-slate-800'
                    }`}
                  />
                </div>
                {!token && (
                  <p className="mt-1 text-[10px] text-slate-500 flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" aria-hidden />
                    Open the link from your reset request, or paste the token shown on the forgot-password page.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="reset-password" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <PasswordInput
                  id="reset-password"
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                  required
                  aria-invalid={fieldError ? true : undefined}
                  aria-describedby="reset-password-requirements"
                  placeholder="Create a strong password"
                />
                {fieldError && (
                  <p className="mt-1 text-[10px] font-bold text-red-400" role="alert">
                    {fieldError}
                  </p>
                )}
                <div id="reset-password-requirements" className="mt-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                  <PasswordRequirements password={password} />
                </div>
              </div>

              <div>
                <label htmlFor="reset-confirm" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <PasswordInput
                  id="reset-confirm"
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                  required
                  aria-invalid={fieldError ? true : undefined}
                  className={
                    confirmPassword && confirmPassword !== password ? 'border-red-500/70 text-red-300' : ''
                  }
                  placeholder="Re-enter new password"
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="mt-1 text-[10px] font-bold text-red-400">Passwords do not match</p>
                )}
                {confirmPassword && confirmPassword === password && passwordCompliant && (
                  <p className="mt-1 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" aria-hidden /> Passwords match
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
                    <span>Saving new password…</span>
                  </>
                ) : (
                  <>
                    <span>Save New Password</span>
                    <ArrowRight className="w-4 h-4" aria-hidden />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
