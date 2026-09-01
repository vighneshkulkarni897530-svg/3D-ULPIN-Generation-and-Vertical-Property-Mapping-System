'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building, ShieldCheck, Mail, User, Phone, Sparkles, AlertCircle, Info, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordRequirements, evaluatePasswordRequirements } from '@/components/auth/PasswordRequirements';

/**
 * Registration page (Phase 10 + Login/Sign-Up completion).
 * Creates a real CITIZEN account via /api/auth/register (server-side
 * validation + scrypt password hashing) and signs the user in. Officer and
 * administrator accounts are provisioned administratively, NOT via
 * self-registration — the server rejects any other role, and no role selector
 * exists anywhere in the registration UI.
 *
 * Features: live password-requirements checklist (mirrors the server policy),
 * show/hide password toggles, field-level validation, duplicate-email
 * handling, loading/duplicate-submission guards and a clear success state.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+\d][\d\s-]{5,20}$/;

function getSafeNext(): string | null {
  if (typeof window !== 'undefined') {
    const next = new URLSearchParams(window.location.search).get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  }
  return null;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, authStatus } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  React.useEffect(() => {
    if (authStatus === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [authStatus, router]);

  const passwordStatus = useMemo(() => evaluatePasswordRequirements(password), [password]);
  const passwordCompliant = Object.keys(passwordStatus).every((k) => passwordStatus[k]);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const setFieldError = (field: string, message: string | null) =>
    setFieldErrors((prev) => ({ ...prev, [field]: message }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // prevent accidental duplicate submissions
    setError(null);
    setFieldErrors({});

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    let invalid = false;

    if (!trimmedName) {
      setFieldError('name', 'Full name is required.');
      invalid = true;
    } else if (trimmedName.length < 2) {
      setFieldError('name', 'Full name must be at least 2 characters.');
      invalid = true;
    }
    if (!trimmedEmail) {
      setFieldError('email', 'Email address is required.');
      invalid = true;
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setFieldError('email', 'Enter a valid email address (e.g. name@example.com).');
      invalid = true;
    }
    if (!trimmedPhone) {
      setFieldError('phone', 'Mobile number is required.');
      invalid = true;
    } else if (!PHONE_PATTERN.test(trimmedPhone)) {
      setFieldError('phone', 'Enter a valid mobile number (e.g. +91 98XXX XXXXX).');
      invalid = true;
    }
    if (!passwordCompliant) {
      setFieldError('password', 'The password does not meet all the requirements listed below.');
      invalid = true;
    }
    if (!confirmPassword) {
      setFieldError('confirmPassword', 'Please confirm your password.');
      invalid = true;
    } else if (password !== confirmPassword) {
      setFieldError('confirmPassword', 'Passwords do not match.');
      invalid = true;
    }
    if (invalid) return;

    setLoading(true);
    const result = await register({ name: trimmedName, email: trimmedEmail, phone: trimmedPhone, password });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? 'Registration failed. Please try again.');
      return;
    }
    // Success — show the confirmation panel, then continue to the dashboard.
    setSuccess(true);
    const next = getSafeNext();
    window.setTimeout(() => router.push(next ?? '/dashboard/citizen'), 1600);
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
          {success ? (
            <div className="text-center space-y-4 py-4" aria-live="polite">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" aria-hidden />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Account Created Successfully</h4>
                <p className="text-xs text-slate-400 mt-1.5">
                  Welcome to Smart Cadastre! Your <span className="font-bold text-cyan-300">Citizen</span> account is active and you are now signed in.
                </p>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-cyan-400" aria-hidden /> Taking you to your dashboard…
              </p>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Live region — announced immediately when registration fails */}
            <div aria-live="assertive">
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5" role="alert">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden />
                  <div>
                    <p className="text-xs font-bold text-red-300">Registration failed</p>
                    <p className="text-[11px] text-red-300/80">{error}</p>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="register-name" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" aria-hidden />
                </div>
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldError('name', null);
                  }}
                  required
                  aria-invalid={fieldErrors.name ? true : undefined}
                  aria-describedby={fieldErrors.name ? 'register-name-error' : undefined}
                  placeholder="e.g. Rajesh V. Sharma"
                  className={`w-full bg-slate-950 border focus:border-cyan-400 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none ${
                    fieldErrors.name ? 'border-red-500/70' : 'border-slate-800'
                  }`}
                />
              </div>
              {fieldErrors.name && (
                <p id="register-name-error" className="mt-1 text-[10px] font-bold text-red-400">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="register-email" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" aria-hidden />
                </div>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldError('email', null);
                  }}
                  required
                  aria-invalid={fieldErrors.email ? true : undefined}
                  aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
                  placeholder="name@domain.com"
                  className={`w-full bg-slate-950 border focus:border-cyan-400 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none ${
                    fieldErrors.email ? 'border-red-500/70' : 'border-slate-800'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p id="register-email-error" className="mt-1 text-[10px] font-bold text-red-400">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="register-phone" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-3.5 h-3.5" aria-hidden />
                  </div>
                  <input
                    id="register-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (fieldErrors.phone) setFieldError('phone', null);
                    }}
                    required
                    aria-invalid={fieldErrors.phone ? true : undefined}
                    aria-describedby={fieldErrors.phone ? 'register-phone-error' : undefined}
                    placeholder="+91 98XXX XXXXX"
                    className={`w-full bg-slate-950 border focus:border-cyan-400 text-white rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none ${
                      fieldErrors.phone ? 'border-red-500/70' : 'border-slate-800'
                    }`}
                  />
                </div>
                {fieldErrors.phone && (
                  <p id="register-phone-error" className="mt-1 text-[10px] font-bold text-red-400">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="register-aadhaar" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Aadhaar / Govt ID
                </label>
                <input
                  id="register-aadhaar"
                  type="text"
                  value="PENDING-KYC"
                  disabled
                  readOnly
                  aria-describedby="register-aadhaar-note"
                  placeholder="XXXX-XXXX-8921"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-500 rounded-xl px-3.5 py-2.5 text-xs font-medium font-mono outline-none cursor-not-allowed"
                />
                <p id="register-aadhaar-note" className="sr-only">
                  Assigned after KYC verification in a production deployment.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="register-password" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <PasswordInput
                id="register-password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldError('password', null);
                }}
                required
                aria-invalid={fieldErrors.password ? true : undefined}
                aria-describedby="register-password-requirements"
                className={fieldErrors.password ? 'border-red-500/70' : ''}
                placeholder="Create a strong password"
              />
              {fieldErrors.password && (
                <p className="mt-1 text-[10px] font-bold text-red-400" role="alert">
                  {fieldErrors.password}
                </p>
              )}
              <div id="register-password-requirements" className="mt-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                <PasswordRequirements password={password} />
              </div>
            </div>

            <div>
              <label htmlFor="register-confirm-password" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <PasswordInput
                id="register-confirm-password"
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) setFieldError('confirmPassword', null);
                }}
                required
                aria-invalid={fieldErrors.confirmPassword ? true : undefined}
                aria-describedby={fieldErrors.confirmPassword ? 'register-confirm-error' : undefined}
                className={
                  confirmPassword && confirmPassword !== password
                    ? 'border-red-500/70 text-red-300'
                    : fieldErrors.confirmPassword
                      ? 'border-red-500/70'
                      : ''
                }
                placeholder="Re-enter password"
              />
              {fieldErrors.confirmPassword ? (
                <p id="register-confirm-error" className="mt-1 text-[10px] font-bold text-red-400">
                  {fieldErrors.confirmPassword}
                </p>
              ) : passwordsMatch ? (
                <p className="mt-1 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" aria-hidden /> Passwords match
                </p>
              ) : null}
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" aria-hidden />
              <p className="text-[10px] leading-relaxed text-slate-400">
                Self-registration creates a <span className="font-bold text-cyan-300">Citizen</span> account. Government Officer and Administrator accounts are provisioned by the cadastre administration. By registering you agree that the details you provide must be accurate and truthful.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-tech-cyan transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" aria-hidden /> Complete Registration
                </span>
              )}
            </button>
          </form>
          )}
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
