"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Shield,
  ShieldCheck,
  Building,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  Camera,
  UploadCloud,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  MapPin,
  FileBadge,
} from "lucide-react";

export default function OfficerRegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [department, setDepartment] = useState("Department of Land Records & Revenue, Karnataka");
  const [designation, setDesignation] = useState("Assistant Revenue Officer / Tahsildar");
  const [jurisdictionDistrict, setJurisdictionDistrict] = useState("Bengaluru Urban");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate official KA Revenue ID
  const handleGenerateKaRevId = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setBadgeNumber(`KA-REV-${randomNum}`);
  };

  // Handle profile photo upload and convert to base64 data URL
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image file size should be less than 5MB.");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAvatarUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify both password fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (!badgeNumber.trim()) {
      setError("Please generate or enter your official KA Revenue Officer ID.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          role: "OFFICER",
          badgeNumber: badgeNumber.trim().toUpperCase(),
          department: department.trim(),
          designation: designation.trim(),
          jurisdictionDistrict: jurisdictionDistrict.trim(),
          avatarUrl: avatarUrl || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.error || "Registration failed. Please check your details.");
      }

      // Automatically sign in to establish official session
      const loginRes = await login(email.trim(), password, {
        portalRole: "OFFICER",
        badgeNumber: badgeNumber.trim().toUpperCase(),
      });

      if (!loginRes.ok) {
        window.location.href = "/auth/officer-login?registered=1";
        return;
      }

      window.location.href = "/dashboard/officer";
    } catch (err: any) {
      setError(err?.message || "Failed to create officer ID. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[350px] h-[250px] bg-teal-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-xl w-full space-y-6 relative z-10">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Link
            href="/auth/officer-login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Officer Sign In
          </Link>
          <span className="rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
            OFFICER ONBOARDING
          </span>
        </div>

        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-emerald-500/40 bg-slate-950 p-0.5 mx-auto shadow-lg flex items-center justify-center">
            <img src="/logo.jpeg" alt="CyberSpark Logo" className="w-full h-full object-cover rounded-[14px]" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Create Government Revenue Officer ID
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Official registration for Revenue Officers, Tahsildars, and Cadastral Surveyors. Assigns authenticated KA Revenue ID.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-7 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl space-y-6">
          {error && (
            <div
              className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Profile Photo Upload Section */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Official Profile Photo
              </label>
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden border-2 border-emerald-500/50 bg-slate-900 flex items-center justify-center shadow-inner">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Officer Photo Preview" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-slate-500" />
                  )}
                  <label
                    htmlFor="officer-photo-input"
                    className="absolute inset-0 bg-slate-950/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    <Camera className="h-5 w-5 text-white" />
                  </label>
                </div>

                <div className="flex-1">
                  <input
                    id="officer-photo-input"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="officer-photo-input"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white cursor-pointer transition-colors"
                  >
                    <UploadCloud className="h-3.5 w-3.5 text-emerald-400" />
                    {avatarUrl ? "Change Photo" : "Upload Profile Photo"}
                  </label>
                  <p className="mt-1 text-[10px] text-slate-500">
                    PNG, JPG, or WEBP up to 5MB. Photo will appear on verification sheets &amp; audit stamps.
                  </p>
                </div>
              </div>
            </div>

            {/* Officer ID / Badge Generator Field */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  KA Revenue Officer ID (Service Badge)
                </label>
                <button
                  type="button"
                  onClick={handleGenerateKaRevId}
                  className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-400 hover:text-emerald-300 hover:underline"
                >
                  <Sparkles className="h-3 w-3" /> ⚡ Generate KA Revenue ID
                </button>
              </div>
              <div className="relative">
                <FileBadge className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                <input
                  type="text"
                  required
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  placeholder="e.g. KA-REV-7821"
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 py-2.5 pl-10 pr-4 text-xs font-mono font-bold text-white uppercase outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Official Revenue Department identification number used for field inspections and 10-year renewals.
              </p>
            </div>

            {/* Name and Official Email */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Officer Full Name
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh K. Patil"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3 text-xs font-medium text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Official Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ramesh.patil@rev.gov.in"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3 text-xs font-medium text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Phone and Jurisdiction */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Official Mobile No.
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98450 12345"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3 text-xs font-medium text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Jurisdiction District
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={jurisdictionDistrict}
                    onChange={(e) => setJurisdictionDistrict(e.target.value)}
                    placeholder="e.g. Bengaluru Urban"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3 text-xs font-medium text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Department and Designation */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Department
                </label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Department of Revenue & Survey"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-xs font-medium text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Designation
                </label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Assistant Revenue Officer"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-xs font-medium text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Password and Confirm */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Account Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3 text-xs font-medium text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3 text-xs font-medium text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-xs font-black text-white shadow-lg hover:from-emerald-400 hover:to-teal-500 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Provisioning KA Revenue Officer ID...
                  </>
                ) : (
                  <>
                    Create KA Revenue Officer ID &amp; Enter Portal <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center text-xs text-slate-500">
          Already have an Officer ID?{" "}
          <Link href="/auth/officer-login" className="font-bold text-emerald-400 hover:underline">
            Sign In Here &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
