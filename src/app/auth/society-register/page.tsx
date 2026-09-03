"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Building2,
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
  MapPin,
  FileCheck2,
} from "lucide-react";

export default function SocietyRegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [societyName, setSocietyName] = useState("");
  const [societyRegNo, setSocietyRegNo] = useState("");
  const [jurisdictionDistrict, setJurisdictionDistrict] = useState("Pune City");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate official Society Registration Number
  const handleGenerateRegNo = () => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    setSocietyRegNo(`PUN/HSG/${year}/${randomNum}`);
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
      setError("Passwords do not match. Please check both password fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (!societyName.trim()) {
      setError("Please enter your Housing Society Name.");
      return;
    }

    if (!societyRegNo.trim()) {
      setError("Please enter or generate your Society Registration Certificate Number.");
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
          role: "ADMIN",
          societyName: societyName.trim(),
          societyRegNo: societyRegNo.trim().toUpperCase(),
          department: societyName.trim(),
          designation: "Authorized Society Secretary",
          jurisdictionDistrict: jurisdictionDistrict.trim(),
          avatarUrl: avatarUrl || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.error || "Registration failed. Please check your details.");
      }

      // Automatically sign in to establish society session
      const loginRes = await login(email.trim(), password, {
        portalRole: "ADMIN",
        societyRegNo: societyRegNo.trim().toUpperCase(),
      });

      if (!loginRes.ok) {
        window.location.href = "/auth/society-login?registered=1";
        return;
      }

      window.location.href = "/dashboard/admin";
    } catch (err: any) {
      setError(err?.message || "Failed to create Society Secretary ID. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[350px] h-[250px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-xl w-full space-y-6 relative z-10">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Link
            href="/auth/society-login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Society Sign In
          </Link>
          <span className="rounded-md border border-indigo-500/30 bg-indigo-950/40 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-300">
            SOCIETY ONBOARDING
          </span>
        </div>

        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-indigo-500/40 bg-slate-950 p-0.5 mx-auto shadow-lg flex items-center justify-center">
            <img src="/logo.jpeg" alt="CyberSpark Logo" className="w-full h-full object-cover rounded-[14px]" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Register Housing Society &amp; Secretary ID
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Authorize your Co-operative Housing Society, register buildings into cadastre, and manage 10-year verification renewals.
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
                Secretary Profile Photo
              </label>
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden border-2 border-indigo-500/50 bg-slate-900 flex items-center justify-center shadow-inner">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Secretary Preview" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-slate-500" />
                  )}
                  <label
                    htmlFor="secretary-photo-input"
                    className="absolute inset-0 bg-slate-950/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    <Camera className="h-5 w-5 text-white" />
                  </label>
                </div>

                <div className="flex-1">
                  <input
                    id="secretary-photo-input"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="secretary-photo-input"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white cursor-pointer transition-colors"
                  >
                    <UploadCloud className="h-3.5 w-3.5 text-indigo-400" />
                    {avatarUrl ? "Change Photo" : "Upload Profile Photo"}
                  </label>
                  <p className="mt-1 text-[10px] text-slate-500">
                    PNG, JPG, or WEBP up to 5MB. Photo will appear on building registration &amp; renewal certificates.
                  </p>
                </div>
              </div>
            </div>

            {/* Society Name & Registration Certificate */}
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1.5">
                  Co-operative Housing Society Name
                </label>
                <div className="relative">
                  <Building className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                  <input
                    type="text"
                    required
                    value={societyName}
                    onChange={(e) => setSocietyName(e.target.value)}
                    placeholder="e.g. Green Valley Co-operative Housing Society"
                    className="w-full rounded-xl border border-indigo-500/40 bg-slate-950 py-2.5 pl-10 pr-4 text-xs font-bold text-white outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                    Society Registration Certificate No.
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRegNo}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-400 hover:text-indigo-300 hover:underline"
                  >
                    <Sparkles className="h-3 w-3" /> ⚡ Generate Reg. No
                  </button>
                </div>
                <div className="relative">
                  <FileCheck2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                  <input
                    type="text"
                    required
                    value={societyRegNo}
                    onChange={(e) => setSocietyRegNo(e.target.value)}
                    placeholder="e.g. PUN/HSG/2024/48201"
                    className="w-full rounded-xl border border-indigo-500/40 bg-slate-950 py-2.5 pl-10 pr-4 text-xs font-mono font-bold text-white uppercase outline-none focus:border-indigo-400"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Government Co-operative Registrar Certificate Number required to file building renewals.
                </p>
              </div>
            </div>

            {/* Secretary Name & Official Email */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Authorized Secretary Name
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. K. S. Narayana Swamy"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3 text-xs font-medium text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Secretary Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="secretary@greenvalley.soc.in"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3 text-xs font-medium text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Phone and Jurisdiction */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Secretary Contact Mobile
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98450 98765"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3 text-xs font-medium text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Division / Jurisdiction
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={jurisdictionDistrict}
                    onChange={(e) => setJurisdictionDistrict(e.target.value)}
                    placeholder="e.g. Shivaji Nagar Division, Pune"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3 text-xs font-medium text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Password and Confirm */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Society Portal Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3 text-xs font-medium text-white outline-none focus:border-indigo-500"
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
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3 text-xs font-medium text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-xs font-black text-white shadow-lg hover:from-indigo-400 hover:to-purple-500 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Registering Society &amp; Issuing Secretary ID...
                  </>
                ) : (
                  <>
                    Register Housing Society &amp; Enter Portal <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center text-xs text-slate-500">
          Already registered as a Society Secretary?{" "}
          <Link href="/auth/society-login" className="font-bold text-indigo-400 hover:underline">
            Sign In Here &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
