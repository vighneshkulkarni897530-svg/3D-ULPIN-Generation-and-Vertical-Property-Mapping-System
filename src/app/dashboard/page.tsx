"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Map,
  Building2,
  Layers,
  ScanLine,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  CheckCheck,
  Database,
  Sparkles,
  Box,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader, SectionHeader } from "@/components/layout/PageHeader";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ActivityTimeline, type ActivityItem } from "@/components/dashboard/ActivityTimeline";
import { GisStatusBadge } from "@/components/common/GisStatusBadge";
import { useGIS } from "@/context/GISContext";
import { computeDashboardStats } from "@/lib/gisSelectors";
import { formatRelativeTime } from "@/lib/gisUtils";
import type { ActivityRecord } from "@/types/activity";

const QUICK_LINKS = [
  { label: "3D Map", desc: "Parcel canvas & vertical viewer", href: "/map", icon: Map },
  { label: "Buildings", desc: "Registry of the 3 surveyed buildings", href: "/buildings", icon: Building2 },
  { label: "Floor Explorer", desc: "Drill into floors & property units", href: "/floors", icon: Layers },
  { label: "AI Extraction", desc: "Spatial-ID generation pipeline", href: "/ai-extraction", icon: ScanLine },
  { label: "Verification", desc: "Officer verification queue", href: "/verification", icon: ShieldCheck },
  { label: "Conflicts", desc: "Spatial conflict tracking", href: "/conflicts", icon: AlertTriangle },
];

function activityToItem(a: ActivityRecord): ActivityItem {
  switch (a.type) {
    case "PROPERTY_VERIFICATION":
      return { id: a.id, title: a.title, description: a.description, time: formatRelativeTime(a.timestamp), icon: <CheckCircle2 className="h-4 w-4" />, tone: "green" };
    case "CONFLICT_DETECTION":
      return { id: a.id, title: a.title, description: a.description, time: formatRelativeTime(a.timestamp), icon: <AlertTriangle className="h-4 w-4" />, tone: "red" };
    case "CONFLICT_RESOLUTION":
      return { id: a.id, title: a.title, description: a.description, time: formatRelativeTime(a.timestamp), icon: <CheckCheck className="h-4 w-4" />, tone: "green" };
    case "AI_EXTRACTION":
      return { id: a.id, title: a.title, description: a.description, time: formatRelativeTime(a.timestamp), icon: <Sparkles className="h-4 w-4" />, tone: "cyan" };
    case "3D_RECONSTRUCTION":
      return { id: a.id, title: a.title, description: a.description, time: formatRelativeTime(a.timestamp), icon: <Box className="h-4 w-4" />, tone: "blue" };
    case "BUILDING_UPDATE":
      return { id: a.id, title: a.title, description: a.description, time: formatRelativeTime(a.timestamp), icon: <Building2 className="h-4 w-4" />, tone: "blue" };
    default:
      return { id: a.id, title: a.title, description: a.description, time: formatRelativeTime(a.timestamp), icon: <Database className="h-4 w-4" />, tone: "cyan" };
  }
}

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function GisDashboardPage() {
  return (
    <ProtectedRoute>
      <GisDashboardPageContent />
    </ProtectedRoute>
  );
}

function GisDashboardPageContent() {
  const { parcels, buildings, floors, properties, verifications, conflicts, activities } = useGIS();

  const stats = React.useMemo(
    () => computeDashboardStats(parcels, buildings, floors, properties, conflicts),
    [parcels, buildings, floors, properties, conflicts],
  );

  const openConflicts = conflicts.filter((c) => c.status !== "Resolved");
  const recentActivities = [...activities].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 9);

  return (
    <PageContainer>
      <div className="space-y-7">
        <PageHeader
          eyebrow="GIS COMMAND CENTRE"
          title="Unified Cadastre Dashboard"
          description="Single operational view of the 3D ULPIN Generation and Vertical Property Mapping System — parcels, buildings, floors, units, verification and spatial conflicts."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/map" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-tech-cyan transition-all hover:from-cyan-400 hover:to-blue-500">
                <Map className="h-3.5 w-3.5" /> Open 3D Map
              </Link>
              <Link href="/buildings" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-cyan-400 hover:text-cyan-700">
                <Building2 className="h-3.5 w-3.5" /> Building Registry
              </Link>
            </div>
          }
        />
        {/* Quick module navigation */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-tech transition-all hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-tech-cyan"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-cyan-600">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-500" />
                </div>
                <p className="mt-2.5 text-xs font-extrabold tracking-tight text-slate-900">{link.label}</p>
                <p className="mt-0.5 text-[10px] leading-snug text-slate-400">{link.desc}</p>
              </Link>
            );
          })}
        </div>

        {/* Key statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <DashboardCard label="Vertical Properties" value={String(stats.totalVerticalProperties)} sub="Street-to-sky units in registry" icon={<Box className="h-5 w-5" />} tone="cyan" />
          <DashboardCard label="Verification Rate" value={`${stats.verificationRate}%`} sub={`${stats.verifiedProperties} of ${stats.totalVerticalProperties} verified`} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" trend={{ direction: "up", value: "+12%" }} />
          <DashboardCard label="Buildings" value={String(stats.totalBuildings)} sub={`${stats.totalFloors} floors surveyed`} icon={<Building2 className="h-5 w-5" />} tone="navy" />
          <DashboardCard label="Land Parcels" value={String(stats.totalParcels)} sub={`${stats.disputedParcels} disputed`} icon={<Map className="h-5 w-5" />} tone="blue" />
          <DashboardCard label="Open Conflicts" value={String(stats.openConflicts)} sub={`${stats.criticalConflicts} critical · ${stats.resolvedConflicts} resolved`} icon={<AlertTriangle className="h-5 w-5" />} tone="red" />
        </div>
        {/* Activity + conflicts split */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* Recent activity */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
            <div className="mb-4">
              <SectionHeader
                icon={<Building2 className="h-4 w-4" />}
                title="Recent Registry Activity"
                description={`${verifications.length} verification records · unified activity feed`}
                action={
                  <Link href="/verification" className="flex items-center gap-1 text-[11px] font-bold text-cyan-700 hover:underline">
                    Verification centre <ArrowRight className="h-3 w-3" />
                  </Link>
                }
              />
            </div>
            <ActivityTimeline items={recentActivities.map(activityToItem)} />
          </section>

          {/* Open conflicts */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
            <div className="mb-4">
              <SectionHeader
                icon={<AlertTriangle className="h-4 w-4" />}
                title="Open Spatial Conflicts"
                description="Detection log from GIS analysis"
                action={
                  <Link href="/conflicts" className="flex items-center gap-1 text-[11px] font-bold text-cyan-700 hover:underline">
                    All conflicts <ArrowRight className="h-3 w-3" />
                  </Link>
                }
              />
            </div>

            {openConflicts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-xs text-slate-400">
                No open spatial conflicts. The registry is clean.
              </p>
            ) : (
              <div className="space-y-3">
                {openConflicts.map((conflict) => (
                  <Link
                    key={conflict.id}
                    href="/conflicts"
                    className="block rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 transition-colors hover:border-cyan-300 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-[11px] font-bold text-slate-900">{conflict.conflictNumber}</p>
                        <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{conflict.type}</p>
                      </div>
                      <GisStatusBadge status={conflict.severity} kind="severity" />
                    </div>
                    <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-slate-500">{conflict.description}</p>
                    <div className="mt-2 flex items-center justify-between border-t border-slate-200/70 pt-2 text-[9px] text-slate-400">
                      <GisStatusBadge status={conflict.status} kind="conflict-status" />
                      <span className="font-mono">{formatRelativeTime(conflict.detectedAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </PageContainer>
  );
}