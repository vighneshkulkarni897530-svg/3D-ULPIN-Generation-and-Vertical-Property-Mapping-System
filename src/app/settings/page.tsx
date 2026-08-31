"use client";

import * as React from "react";
import {
  Settings,
  User,
  Database,
  ShieldCheck,
  Link2,
  Globe2,
  Lock,
  Info,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { useGIS } from "@/context/GISContext";
import { computeDashboardStats } from "@/lib/gisSelectors";
import { GisStatusBadge } from "@/components/common/GisStatusBadge";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PERMISSIONS } from "@/types/auth";

export default function SettingsPage() {
  return (
    <ProtectedRoute permission={PERMISSIONS.SYSTEM_ADMIN}>
      <SettingsPageContent />
    </ProtectedRoute>
  );
}

function SettingsPageContent() {
  const { currentUser, role } = useAuth();
  const { parcels, buildings, floors, properties, conflicts, demoSpatialIds } = useGIS();

  const stats = React.useMemo(
    () => computeDashboardStats(parcels, buildings, floors, properties, conflicts),
    [parcels, buildings, floors, properties, conflicts],
  );

  const roleLabel =
    role === "OFFICER" ? "Revenue Officer" : role === "ADMIN" ? "Cadastre Admin" : "Verified Citizen";

  const surname = currentUser.name.split(",")[0]?.trim() ?? currentUser.name;

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          eyebrow="SYSTEM CONFIGURATION"
          title="Settings"
          description="Registry integrity, integration status and platform preferences for the 3D ULPIN generation system."
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Officer profile */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
            <div className="mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-cyan-600" />
              <h2 className="text-xs font-extrabold tracking-tight text-slate-900">Officer / Demo Profile</h2>
            </div>
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <img
                src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
                alt={currentUser.name}
                className="h-14 w-14 rounded-2xl object-cover ring-2 ring-cyan-500/40"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black tracking-tight text-slate-900">{surname}</p>
                <p className="text-[11px] font-semibold text-cyan-700">{roleLabel}</p>
                <p className="mt-1 truncate text-[10px] text-slate-500">
                  {currentUser.designation ?? currentUser.email} · {currentUser.jurisdictionDistrict ?? currentUser.department ?? "Demo workspace"}
                </p>
              </div>
              <GisStatusBadge status="ACTIVE" />
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
              Identity, jurisdiction and departmental settings are seeded from the demo auth context. Official officer onboarding is an external government integration.
            </p>
          </section>
          {/* GIS data snapshot */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
            <div className="mb-4 flex items-center gap-2">
              <Database className="h-4 w-4 text-cyan-600" />
              <h2 className="text-xs font-extrabold tracking-tight text-slate-900">GIS Data Snapshot</h2>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <Stat label="Parcels" value={String(stats.totalParcels)} />
              <Stat label="Buildings" value={String(stats.totalBuildings)} />
              <Stat label="Floors" value={String(stats.totalFloors)} />
              <Stat label="Vertical Units" value={String(stats.totalVerticalProperties)} />
              <Stat label="Demo Spatial IDs" value={String(demoSpatialIds.length)} />
              <Stat label="Verification Rate" value={`${stats.verificationRate}%`} />
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400">
              <Info className="h-3 w-3 text-cyan-500" />
              Seeded from the centralized Phase 1 dataset. Runtime integrity is validated by the self-test API.
            </p>
          </section>

          {/* Official ULPIN integration */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-cyan-600" />
                <h2 className="text-xs font-extrabold tracking-tight text-slate-900">Official ULPIN Integration</h2>
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                <Lock className="h-3 w-3" /> Not integrated — future government API
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                  <Globe2 className="h-3.5 w-3.5 text-cyan-500" /> Integration Status
                </div>
                <p className="mt-1.5 font-mono text-[11px] font-black text-slate-900">
                  FUTURE · EXTERNAL_GOVERNMENT_API
                </p>
                <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
                  Demo spatial IDs stay explicitly non-official (isOfficialUlpin: false) until the Bhu-Aadhaar API is onboarded.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 md:col-span-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Safeguards baked in
                </div>
                <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-slate-500">
                  <li>• All {properties.length} units carry isOfficialUlpin: false — a type-level guarantee.</li>
                  <li>• officialUlpinReference remains null until the government endpoint is live.</li>
                  <li>• Algorithm v2.4 spatial hash keeps demo IDs deterministic and URL-safe.</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-center">
      <p className="font-mono text-lg font-black text-slate-900">{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}