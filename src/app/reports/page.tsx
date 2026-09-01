"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Download, Printer } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PERMISSIONS } from "@/types/auth";
import { ReportFilters as ReportFiltersPanel } from "@/components/reports/ReportFilters";
import { AnalyticsOverview } from "@/components/reports/AnalyticsOverview";
import { VerificationAnalytics } from "@/components/reports/VerificationAnalytics";
import { ConflictAnalytics } from "@/components/reports/ConflictAnalytics";
import { VerticalPropertyAnalytics } from "@/components/reports/VerticalPropertyAnalytics";
import { SpatialCoverageAnalytics } from "@/components/reports/SpatialCoverageAnalytics";
import { ActivityAnalytics } from "@/components/reports/ActivityAnalytics";
import { DecisionSupport } from "@/components/reports/DecisionSupport";
import { useGIS } from "@/context/GISContext";
import { useAuth } from "@/context/AuthContext";
import {
  applyReportFilters,
  computeReportAnalytics,
  isFilterActive,
  selectPropertyTypes,
  type ReportFilters,
} from "@/lib/reportAnalytics";
import type { PropertyTypeGis, PropertyVerificationStatus } from "@/types/gis";
import type { ConflictSeverity } from "@/types/conflict";

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <React.Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <p className="text-xs font-semibold text-slate-400">Loading analytics workspace…</p>
          </div>
        }
      >
        <ReportsPageInner />
      </React.Suspense>
    </ProtectedRoute>
  );
}

function parseFilters(sp: URLSearchParams): ReportFilters {
  return {
    parcelId: sp.get("parcel"),
    buildingId: sp.get("building"),
    verificationStatus: (sp.get("status") as PropertyVerificationStatus) || null,
    propertyType: (sp.get("type") as PropertyTypeGis) || null,
    conflictSeverity: (sp.get("severity") as ConflictSeverity) || null,
  };
}

function describeFilters(f: ReportFilters): string {
  const parts: string[] = [];
  if (f.parcelId) parts.push(`Parcel: ${f.parcelId}`);
  if (f.buildingId) parts.push(`Building: ${f.buildingId}`);
  if (f.verificationStatus) parts.push(`Verification: ${f.verificationStatus}`);
  if (f.propertyType) parts.push(`Type: ${f.propertyType}`);
  if (f.conflictSeverity) parts.push(`Severity: ${f.conflictSeverity}`);
  return parts.length > 0 ? parts.join(" · ") : "Full registry scope (no filters)";
}

function ReportsPageInner() {
  const registry = useGIS();
  const { role } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = React.useState<ReportFilters>(() => parseFilters(searchParams));

  // Back/forward navigation keeps the URL authoritative for deep links.
  React.useEffect(() => {
    setFilters(parseFilters(searchParams));
  }, [searchParams]);

  const handleFilterChange = (patch: Partial<ReportFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    const params = new URLSearchParams();
    if (next.parcelId) params.set("parcel", next.parcelId);
    if (next.buildingId) params.set("building", next.buildingId);
    if (next.verificationStatus) params.set("status", next.verificationStatus);
    if (next.propertyType) params.set("type", next.propertyType);
    if (next.conflictSeverity) params.set("severity", next.conflictSeverity);
    const qs = params.toString();
    router.replace(qs ? `/reports?${qs}` : "/reports", { scroll: false });
  };

  const handleClearFilters = () =>
    handleFilterChange({ parcelId: null, buildingId: null, verificationStatus: null, propertyType: null, conflictSeverity: null });

  // Derived analytics — recomputed from the centralized registry on every
  // state change; no duplicated or hardcoded statistics anywhere.
  const scope = applyReportFilters(registry, filters);
  const analytics = computeReportAnalytics(scope, registry);
  const propertyTypes = selectPropertyTypes(registry.properties);
  const buildingsForFilter = filters.parcelId
    ? registry.buildings.filter((b) => b.parcelId === filters.parcelId)
    : registry.buildings;

  const canOperate = role === "OFFICER" || role === "ADMIN";
  const active = isFilterActive(filters);
  const generatedAt = new Date();

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [
      ["3D ULPIN System — Analytics Report (Prototype / Demo — Not an Official Government Record)"],
      ["Generated", generatedAt.toISOString()],
      ["Role", role],
      ["Filters", describeFilters(filters)],
      [],
      ["Metric", "Value"],
      ["Total Land Parcels", analytics.totalParcels],
      ["Total Buildings", analytics.totalBuildings],
      ["Total Floors", analytics.totalFloors],
      ["Total Vertical Property Units", analytics.totalVerticalProperties],
      ["Verified Properties", analytics.verifiedProperties],
      ["Pending Properties", analytics.pendingProperties],
      ["Under Review Properties", analytics.underReviewProperties],
      ["Rejected Properties", analytics.rejectedProperties],
      ["Reinspection Required", analytics.reinspectionRequiredProperties],
      ["Verification Rate (%)", analytics.verificationRate],
      ["Open Conflicts", analytics.openConflicts],
      ["Critical Conflicts", analytics.criticalConflicts],
      ["Resolved Conflicts", analytics.resolvedConflicts],
      [],
      ["Building", "Code", "Units", "Verified", "Pending", "In Progress", "Rejected", "Verification Rate %", "Open Conflicts"],
      ...analytics.buildingAnalytics.map((b) => [
        b.buildingName, b.buildingCode, b.units, b.verified, b.pending, b.inProgress, b.rejected, b.verificationRate, b.openConflicts,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gis-analytics-report-${generatedAt.toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageContainer>
      <div className="space-y-7">
        {/* Print-only report cover block */}
        <div className="hidden print:block">
          <p className="text-lg font-extrabold tracking-tight text-slate-900">
            3D ULPIN Generation &amp; Vertical Property Mapping System — Analytics Report
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Generated {generatedAt.toLocaleString("en-IN")} · Viewer role: {role} · Filters: {describeFilters(filters)}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-red-700">
            Prototype / Demo System — Not an Official Government Record
          </p>
          <hr className="mt-3 border-slate-300" />
        </div>

        <PageHeader
          eyebrow="REPORTS & ANALYTICS"
          title="Advanced Analytics & Decision Support"
          description="Operational analytics derived live from the unified GIS registry — verification progress, conflict posture, vertical coverage and activity, with print-ready reporting."
          actions={
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-tech-cyan transition-all hover:from-cyan-400 hover:to-blue-500"
              >
                <Printer className="h-4 w-4" /> Print / Save as PDF
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:border-cyan-400 hover:text-cyan-700"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>
          }
        />

        {/* Role context line */}
        <p className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[11px] font-semibold text-slate-600 print:hidden">
          <BarChart3 className="h-3.5 w-3.5 text-cyan-600" />
          Viewing as <span className="font-extrabold text-slate-900">{role}</span> —{" "}
          {canOperate
            ? "full operational analytics access."
            : "read-only analytics view (demo role switcher grants officer/admin access)."}
        </p>

        <ReportFiltersPanel
          filters={filters}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
          parcels={registry.parcels}
          buildings={buildingsForFilter}
          propertyTypes={propertyTypes}
          active={active}
          className="print:hidden"
        />

        <AnalyticsOverview analytics={analytics} />
        <VerificationAnalytics analytics={analytics} />
        <ConflictAnalytics analytics={analytics} />
        <VerticalPropertyAnalytics analytics={analytics} />
        <SpatialCoverageAnalytics analytics={analytics} />
        <ActivityAnalytics analytics={analytics} />
        <DecisionSupport analytics={analytics} canOperate={canOperate} />

        {/* Print footer disclaimer */}
        <p className="hidden border-t border-slate-300 pt-3 text-center font-mono text-[9px] uppercase tracking-widest text-slate-500 print:block">
          Prototype / Demo System — Not an Official Government Record · Generated by the 3D ULPIN analytics workspace
        </p>
      </div>
    </PageContainer>
  );
}