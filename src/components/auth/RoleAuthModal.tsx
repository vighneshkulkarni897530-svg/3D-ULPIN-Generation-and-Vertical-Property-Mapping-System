"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types";
import {
  Shield,
  Building2,
  User as UserIcon,
  Lock,
  Mail,
  BadgeCheck,
  Building,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { DEMO_PASSWORD } from "@/lib/auth/authConstants";
import { MOCK_USERS } from "@/data/mockUsers";

interface RoleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: UserRole | null;
  onSuccess?: () => void;
}

export const RoleAuthModal: React.FC<RoleAuthModalProps> = ({
  isOpen,
  onClose,
  targetRole,
  onSuccess,
}) => {
  const { login, role: currentRole } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [societyRegNo, setSocietyRegNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state on target change
  React.useEffect(() => {
    if (isOpen && targetRole) {
      setError(null);
      setEmail("");
      setPassword("");
      setBadgeNumber("");
      setSocietyRegNo("");
    }
  }, [isOpen, targetRole]);

  if (!isOpen || !targetRole) return null;

  const isOfficer = targetRole === "OFFICER";
  const isSecretary = targetRole === "ADMIN";
  const isCitizen = targetRole === "CITIZEN";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await login(email.trim(), password, {
      portalRole: targetRole,
      badgeNumber: isOfficer ? badgeNumber.trim() : undefined,
      societyRegNo: isSecretary ? societyRegNo.trim() : undefined,
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error || "Authentication failed. Please verify credentials.");
      return;
    }

    onSuccess?.();
    onClose();

    // Redirect to respective dashboard
    if (isOfficer) {
      window.location.href = "/dashboard/officer";
    } else if (isSecretary) {
      window.location.href = "/dashboard/admin";
    } else {
      window.location.href = "/dashboard/citizen";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Badge & Title */}
        <div className="mb-6 flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl p-0.5 shadow-lg ${
              isOfficer
                ? "bg-gradient-to-br from-emerald-400 to-teal-700 text-slate-950"
                : isSecretary
                ? "bg-gradient-to-br from-indigo-500 to-purple-700 text-white"
                : "bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950"
            }`}
          >
            {isOfficer ? (
              <Shield className="h-6 w-6" />
            ) : isSecretary ? (
              <Building2 className="h-6 w-6" />
            ) : (
              <UserIcon className="h-6 w-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  isOfficer
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : isSecretary
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                }`}
              >
                {isOfficer
                  ? "Revenue Officer Portal"
                  : isSecretary
                  ? "Society Secretary Portal"
                  : "Citizen Portal"}
              </span>
              <span className="text-[10px] font-mono text-slate-500">Authentication Required</span>
            </div>
            <h3 className="mt-1 text-lg font-black text-white">
              {isOfficer
                ? "Government Officer Sign In"
                : isSecretary
                ? "Society Secretary Sign In"
                : "Citizen Sign In"}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {isOfficer
                ? "Access field inspections, cadastre verifications & 10-year periodic seal approvals."
                : isSecretary
                ? "Authorized building registration, vertical asset records & periodic society renewals."
                : "Search property records, view 3D digital twins & track disputes."}
            </p>
          </div>
        </div>

        {/* Security Warning Notice */}
        <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200/90 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            Direct persona switching without credentials has been disabled for data security. Please authenticate
            with your official credentials to proceed.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Officer-specific field: Badge Number */}
          {isOfficer && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                Official Revenue Badge ID
              </label>
              <div className="relative">
                <BadgeCheck className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                <input
                  type="text"
                  required
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  placeholder="e.g. KA-REV-7782"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-xs font-mono font-medium text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-500">Issued by Department of Land Records & Cadastre.</p>
            </div>
          )}

          {/* Society Secretary-specific field: Society Registration Number */}
          {isSecretary && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
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
              <p className="mt-1 text-[10px] text-slate-500">Government Co-operative Housing Society Reg No.</p>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
              {isOfficer
                ? "Official Government Email"
                : isSecretary
                ? "Authorized Secretary Email"
                : "Registered Email"}
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  isOfficer
                    ? "officer@rev.gov.in"
                    : isSecretary
                    ? "secretary@greenvalley.soc.in"
                    : "citizen@example.com"
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-xs font-medium text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
              Portal Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-xs font-medium text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 space-y-2.5">
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-black transition-all ${
                isOfficer
                  ? "bg-gradient-to-r from-emerald-500 to-teal-700 text-slate-950 hover:from-emerald-400 hover:to-teal-600 shadow-lg"
                  : isSecretary
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500 shadow-lg"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 hover:from-cyan-400 hover:to-blue-500 shadow-tech-cyan"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Authenticating Official Credentials...
                </>
              ) : (
                <>
                  Authenticate &amp; Enter Portal <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* Contextual ID Creation Link */}
            <div className="pt-1.5 text-center">
              {isOfficer && (
                <Link
                  href="/auth/officer-register"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline"
                >
                  <Sparkles className="h-3 w-3" /> Don't have an Officer ID? Create KA Revenue ID &rarr;
                </Link>
              )}
              {isSecretary && (
                <Link
                  href="/auth/society-register"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                  <Sparkles className="h-3 w-3" /> New Society? Register Society &amp; Secretary ID &rarr;
                </Link>
              )}
              {isCitizen && (
                <Link
                  href="/auth/register"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  <Sparkles className="h-3 w-3" /> Register Citizen Bhu-Aadhaar &rarr;
                </Link>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
