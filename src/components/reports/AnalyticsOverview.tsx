"use client";

import * as React from "react";
import {
  AlertTriangle,
  Box,
  Building,
  CheckCircle2,
  Clock,
  CheckCheck,
  Layers,
  Map,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { SectionHeader } from "@/components/layout/PageHeader";
import type { ReportAnalytics } from "@/lib/reportAnalytics";

interface AnalyticsOverviewProps {
  analytics: ReportAnalytics;
  className?: string;
}

/**
 * Section A — Analytics Overview. Every KPI is derived from the centralized
 * registry via computeReportAnalytics (which itself reuses
 * computeDashboardStats). No value is hardcoded.
 */
export function AnalyticsOverview({ analytics, className }: AnalyticsOverviewProps) {
  const a = analytics;
  const kpis: Array<{
    label: string;
    value: string;
    sub: string;
    icon: React.ReactNode;
    tone: "cyan" | "blue" | "green" | "amber" | "red" | "navy";
  }> = [
    { label: "Land Parcels", value: String(a.totalParcels), sub: `${a.disputedParcels} disputed`, icon: <Map className="h-5 w-5" />, tone: "blue" },
    { label: "Buildings", value: String(a.totalBuildings), sub: `${a.activeBuildings} active`, icon: <Building className="h-5 w-5" />, tone: "navy" },
    { label: "Floors", value: String(a.totalFloors), sub: "Registered floor slabs", icon: <Layers className="h-5 w-5" />, tone: "cyan" },
    { label: "Vertical Property Units", value: String(a.totalVerticalProperties), sub: "Street-to-sky registry", icon: <Box className="h-5 w-5" />, tone: "cyan" },
    { label: "Verification Rate", value: `${a.verificationRate}%`, sub: `${a.verifiedProperties} of ${a.totalVerticalProperties} units verified`, icon: <ShieldCheck className="h-5 w-5" />, tone: "green" },
    { label: "Verified Properties", value: String(a.verifiedProperties), sub: "Sealed demo records", icon: <CheckCircle2 className="h-5 w-5" />, tone: "green" },
    { label: "Pending Properties", value: String(a.pendingProperties), sub: "Awaiting officer action", icon: <Clock className="h-5 w-5" />, tone: "amber" },
    { label: "Under Review", value: String(a.underReviewProperties), sub: "In officer investigation", icon: <Search className="h-5 w-5" />, tone: "blue" },
    { label: "Field Verification", value: String(a.fieldVerificationProperties), sub: "Queued for field workflow", icon: <ShieldAlert className="h-5 w-5" />, tone: "amber" },
    { label: "Rejected Properties", value: String(a.rejectedProperties), sub: "Requires re-submission", icon: <XCircle className="h-5 w-5" />, tone: "red" },
    { label: "Reinspection Required", value: String(a.reinspectionRequiredProperties), sub: "Flagged for re-check", icon: <AlertTriangle className="h-5 w-5" />, tone: "amber" },
    { label: "Open Conflicts", value: String(a.openConflicts), sub: `${a.criticalConflicts} critical`, icon: <AlertTriangle className="h-5 w-5" />, tone: "red" },
    { label: "Resolved Conflicts", value: String(a.resolvedConflicts), sub: `${a.totalConflicts} total detected`, icon: <CheckCheck className="h-5 w-5" />, tone: "green" },
  ];

  return (
    <section className={className} aria-label="Analytics overview">
      <div className="mb-4">
        <SectionHeader
          icon={<ShieldCheck className="h-4 w-4" />}
          title="A · Analytics Overview"
          description="All key performance indicators are computed live from the centralized GIS registry under the active filters."
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {kpis.map((k) => (
          <DashboardCard key={k.label} label={k.label} value={k.value} sub={k.sub} icon={k.icon} tone={k.tone} />
        ))}
      </div>
    </section>
  );
}