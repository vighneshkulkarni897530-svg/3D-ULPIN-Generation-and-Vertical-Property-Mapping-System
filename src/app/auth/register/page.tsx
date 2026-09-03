'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CreditCard,
  Sparkles,
  Camera,
  UploadCloud,
} from 'lucide-react';
import { requestEmailOtp, verifyEmailOtp, firebaseRegisterWithEmail } from '@/lib/firebase/auth';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Email verification states
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Form submission states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCountdown]);

  const handleSendEmailOtp = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address before requesting verification.');
      return;
    }

    setOtpSending(true);
    setOtpError(null);
    setError(null);

    try {
      const res = await requestEmailOtp(email.trim(), name.trim() || 'Citizen');
      setChallengeId(res.challengeId || null);
      setToken(res.token || null);
      setOtpSent(true);
      setResendCountdown(60);
      if (typeof window !== 'undefined') {
        if (res.challengeId) sessionStorage.setItem('bhu_challengeId', res.challengeId);
        if (res.token) sessionStorage.setItem('bhu_token', res.token);
        sessionStorage.setItem('bhu_reg_email', email.trim());
      }
    } catch (err: any) {
      setOtpError(err?.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError('Please enter the 6-digit code received in your email.');
      return;
    }

    setOtpVerifying(true);
    setOtpError(null);

    try {
      await verifyEmailOtp(
        email.trim(),
        otpCode.trim(),
        undefined,
        token || undefined,
        challengeId || undefined
      );
      setEmailVerified(true);
      setOtpSent(false);
      setError(null);
    } catch (err: any) {
      setOtpError(err?.message || 'Invalid or expired OTP code. Please try again.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size should be less than 5MB.');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!emailVerified) {
      setError('Please verify your email address with the OTP code first.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please check your password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      // 1. Permanently register in durable userStore (data/users.json)
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          aadhaarOrGovId: aadhaar.trim() || 'PENDING-KYC',
          password,
          avatarUrl: avatarUrl || undefined,
        }),
      });

      const regData = await regRes.json().catch(() => ({}));
      if (!regRes.ok) {
        throw new Error(regData?.error?.message || regData?.error || 'Registration failed. Please check your details.');
      }

      // 2. Also ensure Firebase Auth profile exists
      try {
        await firebaseRegisterWithEmail(email.trim(), password, name.trim(), phone.trim());
      } catch {}

      // 3. Immediately sign in to establish active session & persistent cookie
      await login(email.trim(), password);

      // 4. Open Citizen Dashboard directly (no sign-in screen redirect!)
      window.location.href = '/dashboard/citizen';
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden">
      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-cyan-500/40 bg-slate-950 p-0.5 mx-auto shadow-tech-cyan flex items-center justify-center">
            <img src="/logo.jpeg" alt="CyberSpark Logo" className="w-full h-full object-cover rounded-[14px]" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            Create Cadastre Account
          </h2>
          <p className="text-xs text-slate-400">
            Register your digital profile for transparent property verification &amp; dispute resolution.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-7 rounded-3xl shadow-2xl backdrop-blur-xl space-y-5">
          {success ? (
            <div className="text-center space-y-3 py-6 animate-in fade-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Registration Complete!</h3>
              <p className="text-xs text-slate-400">
                Your account is permanently saved in the cadastre database. Redirecting to sign in...
              </p>
              <button
                type="button"
                onClick={() => router.push('/auth/login')}
                className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider"
              >
                Proceed to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300" role="alert">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Profile Photo Upload */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Citizen Profile Photo (Optional)
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 shrink-0 rounded-2xl overflow-hidden border-2 border-cyan-500/40 bg-slate-900 flex items-center justify-center shadow-inner">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Citizen Photo" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-7 w-7 text-slate-500" />
                    )}
                    <label
                      htmlFor="citizen-photo-input"
                      className="absolute inset-0 bg-slate-950/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    >
                      <Camera className="h-4 w-4 text-white" />
                    </label>
                  </div>

                  <div className="flex-1">
                    <input
                      id="citizen-photo-input"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="citizen-photo-input"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white cursor-pointer transition-colors"
                    >
                      <UploadCloud className="h-3.5 w-3.5 text-cyan-400" />
                      {avatarUrl ? "Change Photo" : "Upload Profile Photo"}
                    </label>
                    <p className="mt-1 text-[10px] text-slate-500">
                      PNG, JPG, or WEBP. Displayed across ownership records and digital badges.
                    </p>
                  </div>
                </div>
              </div>

              {/* Full Name */}
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
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Official Email with Inline Verify Option */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Official Email Address
                  </label>
                  {emailVerified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Email Verified
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailVerified) setEmailVerified(false);
                        setError(null);
                      }}
                      required
                      placeholder="name@domain.com"
                      className={`w-full bg-slate-950 border text-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium outline-none transition-all ${
                        emailVerified
                          ? 'border-emerald-500/60 bg-emerald-950/10 text-emerald-200'
                          : 'border-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20'
                      }`}
                    />
                  </div>

                  {!emailVerified && (
                    <button
                      type="button"
                      onClick={handleSendEmailOtp}
                      disabled={otpSending || !email || !email.includes('@')}
                      className="px-3.5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs whitespace-nowrap shadow-tech-cyan disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {otpSending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <span>{otpSent ? 'Resend' : 'Verify Email'}</span>
                      )}
                    </button>
                  )}
                </div>

                {/* Inline OTP Verification Panel */}
                {otpSent && !emailVerified && (
                  <div className="mt-2.5 p-3.5 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-2.5 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-cyan-300 font-bold text-[11px] flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Enter 6-digit code sent to your Gmail:</span>
                      </span>
                      {resendCountdown > 0 ? (
                        <span className="text-slate-500 text-[10px]">Resend in {resendCountdown}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendEmailOtp}
                          className="text-cyan-400 hover:underline text-[10px] font-bold"
                        >
                          Resend Code
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => {
                          setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
                          setOtpError(null);
                        }}
                        placeholder="••••••"
                        maxLength={6}
                        className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-400 text-cyan-300 font-mono text-center tracking-widest text-sm font-bold rounded-lg px-3 py-2 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otpVerifying || otpCode.length !== 6}
                        className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs disabled:opacity-50 transition-all flex items-center gap-1 cursor-pointer shadow-tech-cyan"
                      >
                        {otpVerifying ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <span>Confirm OTP</span>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>

                    {otpError && (
                      <p className="text-[11px] text-red-400 font-medium">{otpError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile Number & Typable Aadhaar Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98XXX XXXXX"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Aadhaar Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <CreditCard className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={aadhaar}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 12);
                        const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
                        setAadhaar(formatted);
                      }}
                      placeholder="5489 2145 9874"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Confirm Password */}
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
                      minLength={6}
                      placeholder="Min. 6 chars"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
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
                      minLength={6}
                      placeholder="Re-enter"
                      className={`w-full bg-slate-950 border rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all ${
                        confirmPassword && confirmPassword !== password
                          ? 'border-red-500/70 text-red-300'
                          : 'border-slate-800 focus:border-cyan-400 text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Simple Register Button */}
              <button
                type="submit"
                disabled={loading || (confirmPassword !== password)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-tech-cyan transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registering Account...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Register Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="text-center pt-2 text-xs text-slate-400 border-t border-slate-800/80">
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
