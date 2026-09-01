'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Building,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  User,
  Shield,
  Building2,
  AlertCircle,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  ArrowLeft,
  Send,
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
  const { login, verifyOtp, requestOtp, authStatus } = useAuth();

  const [step, setStep] = useState<'CREDENTIALS' | 'OTP'>('CREDENTIALS');
  const [selectedRole, setSelectedRole] = useState<'citizen' | 'officer' | 'admin'>('citizen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP State
  const [otpEmail, setOtpEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [otpChallengeId, setOtpChallengeId] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'OTP' && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, resendCountdown]);

  // Focus first OTP input when transitioning to OTP step
  useEffect(() => {
    if (step === 'OTP') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  const handleRoleSelect = (roleKey: 'citizen' | 'officer' | 'admin') => {
    setSelectedRole(roleKey);
    setError(null);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await login(email, password);
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? 'Sign-in failed. Please check your credentials.');
      return;
    }

    if (result.otpRequired) {
      const targetEmail = result.email || email;
      setOtpEmail(targetEmail);
      setDevOtp(result.devOtp || null);
      setOtpToken(result.token || null);
      setOtpChallengeId(result.challengeId || null);
      setOtpDigits(['', '', '', '', '', '']);
      setResendCountdown(60);
      setOtpError(null);
      setOtpNotice(`Verification code sent to ${targetEmail}`);
      setStep('OTP');
      return;
    }

    const matchedRole = (Object.keys(DEMO_ACCOUNTS) as (keyof typeof DEMO_ACCOUNTS)[]).find(
      (k) => DEMO_ACCOUNTS[k].email.toLowerCase() === email.trim().toLowerCase(),
    );
    router.push(destinationAfterLogin(matchedRole ?? 'citizen'));
  };

  const handleDirectEmailOtp = async (targetEmail?: string) => {
    const emailToSend = targetEmail || email;
    if (!emailToSend || !emailToSend.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await requestOtp(emailToSend);
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? 'Could not send verification code.');
      return;
    }

    setOtpEmail(emailToSend);
    setDevOtp(result.devOtp || null);
    setOtpToken(result.token || null);
    setOtpChallengeId(result.challengeId || null);
    setOtpDigits(['', '', '', '', '', '']);
    setResendCountdown(60);
    setOtpError(null);
    setOtpNotice(`Verification code sent to ${emailToSend}`);
    setStep('OTP');
  };

  // OTP input handlers
  const handleOtpChange = (index: number, value: string) => {
    const char = value.slice(-1);
    if (char && !/^[0-9]$/.test(char)) return;

    const updated = [...otpDigits];
    updated[index] = char;
    setOtpDigits(updated);
    setOtpError(null);

    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto verify if all 6 digits are filled
    if (char && index === 5 && updated.every((d) => d !== '')) {
      void verifyCode(updated.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      } else {
        const updated = [...otpDigits];
        updated[index] = '';
        setOtpDigits(updated);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;

    const updated = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i];
    }
    setOtpDigits(updated);
    setOtpError(null);

    const nextIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIndex]?.focus();

    if (pasted.length === 6) {
      void verifyCode(pasted);
    }
  };

  const verifyCode = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    if (code.length < 6) {
      setOtpError('Please enter all 6 digits of the verification code.');
      return;
    }

    setOtpLoading(true);
    setOtpError(null);

    const result = await verifyOtp(otpEmail, code, otpToken || undefined, otpChallengeId || undefined);
    setOtpLoading(false);

    if (!result.ok) {
      setOtpError(result.error || 'Invalid or expired verification code. Please try again.');
      return;
    }

    const matchedRole = (Object.keys(DEMO_ACCOUNTS) as (keyof typeof DEMO_ACCOUNTS)[]).find(
      (k) => DEMO_ACCOUNTS[k].email.toLowerCase() === otpEmail.trim().toLowerCase(),
    );
    const dest = destinationAfterLogin(matchedRole ?? selectedRole ?? 'citizen');
    window.location.href = dest;
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || otpLoading) return;
    setOtpLoading(true);
    setOtpError(null);

    const result = await requestOtp(otpEmail);
    setOtpLoading(false);

    if (result.ok) {
      setDevOtp(result.devOtp || null);
      setOtpToken(result.token || null);
      setOtpChallengeId(result.challengeId || null);
      setResendCountdown(60);
      setOtpNotice(`New verification code sent to ${otpEmail}`);
    } else {
      setOtpError(result.error || 'Failed to resend verification code.');
    }
  };

  const handleAutoFillDevOtp = () => {
    if (!devOtp || devOtp.length !== 6) return;
    const digits = devOtp.split('');
    setOtpDigits(digits);
    otpInputRefs.current[5]?.focus();
    void verifyCode(devOtp);
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
            {step === 'OTP' ? 'Two-Factor Verification' : 'Sign In to Smart Cadastre'}
          </h2>
          <p className="text-xs text-slate-400">
            {step === 'OTP'
              ? 'Enter the 6-digit security code sent to your registered email'
              : 'Access ULPIN verification, 3D property records & official portals.'}
          </p>
        </div>

        {/* STEP 1: CREDENTIALS / GOOGLE SIGN IN */}
        {step === 'CREDENTIALS' && (
          <>
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
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                {error && (
                  <div
                    className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300"
                    role="alert"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                    <span>{error}</span>
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
                    <span>Authenticating &amp; Sending OTP...</span>
                  ) : (
                    <>
                      <span>Sign In with Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDirectEmailOtp()}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-700/80 bg-slate-950 hover:border-cyan-500/60 hover:bg-slate-900 text-cyan-400 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Direct Email OTP</span>
                </button>
              </form>



              <div className="text-center pt-2 text-xs text-slate-400">
                Don't have an account?{' '}
                <Link href="/auth/register" className="text-cyan-400 font-bold hover:underline">
                  Register Bhu-Aadhaar
                </Link>
              </div>
            </div>
          </>
        )}

        {/* STEP 2: 6-DIGIT OTP VERIFICATION */}
        {step === 'OTP' && (
          <div className="bg-slate-900/90 border border-slate-800 p-7 rounded-3xl shadow-2xl backdrop-blur-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Target Email Banner */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-950 rounded-2xl border border-cyan-500/20 text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[11px] font-bold">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Security Code Sent</span>
              </div>
              <p className="text-sm font-semibold text-white truncate max-w-xs">{otpEmail}</p>
              <p className="text-[11px] text-slate-400">Check your Gmail inbox or spam folder</p>
            </div>

            {otpNotice && (
              <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2.5 text-xs text-cyan-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400" />
                <span>{otpNotice}</span>
              </div>
            )}

            {otpError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <div>
                  <p className="text-xs font-bold text-red-300">Verification Failed</p>
                  <p className="text-[11px] text-red-300/80">{otpError}</p>
                </div>
              </div>
            )}

            {/* 6-Box Segmented OTP Input */}
            <div className="space-y-3">
              <label className="block text-center text-xs font-bold text-slate-300 uppercase tracking-wider">
                Enter 6-Digit Code
              </label>
              <div className="flex justify-center items-center gap-2 sm:gap-3">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-mono font-extrabold rounded-xl border bg-slate-950 text-white outline-none transition-all ${
                      digit
                        ? 'border-cyan-400 ring-2 ring-cyan-500/30 bg-cyan-950/20'
                        : 'border-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Verify Button */}
            <button
              type="button"
              disabled={otpLoading || otpDigits.some((d) => d === '')}
              onClick={() => verifyCode()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-tech-cyan transition-all disabled:opacity-50"
            >
              {otpLoading ? (
                <span>Verifying Security Code...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify &amp; Access Cadastre</span>
                </>
              )}
            </button>

            {/* Resend OTP & Return Options */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setStep('CREDENTIALS');
                  setError(null);
                }}
                className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={resendCountdown > 0 || otpLoading}
                onClick={handleResendOtp}
                className={`flex items-center gap-1.5 font-semibold transition-colors ${
                  resendCountdown > 0
                    ? 'text-slate-500 cursor-not-allowed'
                    : 'text-cyan-400 hover:underline cursor-pointer'
                }`}
              >
                <RotateCcw className={`w-3.5 h-3.5 ${otpLoading ? 'animate-spin' : ''}`} />
                <span>
                  {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend OTP code'}
                </span>
              </button>
            </div>

            {/* Information Notice */}
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 text-center">
              Please check your Gmail inbox or spam folder for your 6-digit code.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
