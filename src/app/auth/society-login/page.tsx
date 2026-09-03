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
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowLeft,
  FileCheck,
} from "lucide-react";
import { DEMO_PASSWORD } from "@/lib/auth/authConstants";
import { MOCK_USERS } from "@/data/mockUsers";

export default function SocietyLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [societyRegNo, setSocietyRegNo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await login(email.trim(), password, {
      portalRole: "ADMIN",
      societyRegNo: societyRegNo.trim(),
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error || "Authentication failed. Please verify your society registration credentials.");
      return;
    }

    window.location.href = "/dashboard/admin";
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[200px] bg-purple-500/10 blur-[90px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Citizen Sign In
          </Link>
          <span className="rounded-md border border-indigo-500/30 bg-indigo-950/40 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-300">
            SOCIETY MANAGEMENT
          </span>
        </div>

        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-indigo-500/40 bg-slate-950 p-0.5 mx-auto shadow-lg flex items-center justify-center">
            <img src="/logo.jpeg" alt="CyberSpark Logo" className="w-full h-full object-cover rounded-[14px]" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Society Secretary Portal
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Authorized Co-operative Housing Society Management · Building Registration &amp; Periodic Renewals
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-7 rounded-3xl shadow-2xl backdrop-blur-xl space-y-5">
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
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Society Registration Number
              </label>
              <div className="relative">
                <Building className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                <input
                  type="text"
                  required
                  value={societyRegNo}
                  onChange={(e) => setSocietyRegNo(e.target.value)}
                  placeholder="e.g. PUN/HSG/2016/48201"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-xs font-mono font-medium text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-500">Government Society Registration Certificate No.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Authorized Secretary Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="secretary@greenvalley.soc.in"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-xs font-medium text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

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
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-xs font-medium text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-xs font-black text-white shadow-lg hover:from-indigo-400 hover:to-purple-500 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying Society Credentials...
                  </>
                ) : (
                  <>
                    Access Society Secretary Console <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <Link
                href="/auth/society-register"
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-950/30 py-2.5 text-xs font-bold text-indigo-300 hover:bg-indigo-900/40 hover:text-white transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> New Housing Society? Register Society &amp; Secretary ID &rarr;
              </Link>
            </div>
          </form>
        </div>

        {/* Footer Link to Officer Portal */}
        <div className="text-center text-xs text-slate-500">
          Government Revenue Officer?{" "}
          <Link href="/auth/officer-login" className="font-bold text-emerald-400 hover:underline">
            Go to Government Officer Portal &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
