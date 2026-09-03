"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  Layers,
  MapPin,
  Box,
  FileText,
  Printer,
  Download,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PERMISSIONS } from "@/types/auth";
import {
  getSocietyAnalytics,
  type SocietyDetailAnalytics,
} from "@/lib/analytics/analyticsService";
import { generateSocietyReport, type SocietyReportData } from "@/lib/reports/reportService";
import { KPICard } from "@/components/analytics/KPICard";
import { DiscrepancyAnalyticsCard } from "@/components/analytics/DiscrepancyAnalyticsCard";
import { CaseAgingCard } from "@/components/analytics/CaseAgingCard";
import { DecisionAnalyticsCard } from "@/components/analytics/DecisionAnalyticsCard";
import { BuildingFloorAnalyticsTable } from "@/components/analytics/BuildingFloorAnalyticsTable";
import { DecisionSupportInsightsCard } from "@/components/analytics/DecisionSupportInsightsCard";
import { DiscrepancyDensityMap } from "@/components/analytics/DiscrepancyDensityMap";
import { ReportModal } from "@/components/reports/ReportModal";

export default function SocietyAnalyticsPage() {
  const params = useParams();
  const societyId = String(params?.societyId || "");

  return (
    <ProtectedRoute permission={PERMISSIONS.VIEW_VERIFICATION_QUEUE}>
      <SocietyAnalyticsContent societyId={societyId} />
    </ProtectedRoute>
  );
}

function SocietyAnalyticsContent({ societyId }: { societyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [analytics, setAnalytics] = React.useState<SocietyDetailAnalytics | null>(null);
  const [reportModalOpen, setReportModalOpen] = React.useState(false);
  const [reportData, setReportData] = React.useState<SocietyReportData | null>(null);
  const [generatingReport, setGeneratingReport] = React.useState(false);

  React.useEffect(() => {
    async function loadData() {
      if (!societyId) return;
      try {
        setLoading(true);
        const data = await getSocietyAnalytics(societyId);
        setAnalytics(data);
      } catch (err) {
        console.error("Failed to load society analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [societyId]);

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      const rep = await generateSocietyReport(societyId);
      setReportData(rep);
      setReportModalOpen(true);
    } catch (err) {
      console.error("Failed to generate society report:", err);
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="py-24 text-center text-xs text-slate-400">
          Loading comprehensive society analytics & spatial telemetry…
        </div>
      </PageContainer>
    );
  }

  if (!analytics) {
    return (
      <PageContainer>
        <div className="py-20 text-center text-slate-400 space-y-3">
          <p className="text-sm font-semibold text-white">Society records not found</p>
          <Link
            href="/government/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Government Dashboard
          </Link>
        </div>
      </PageContainer>
    );
  }

  const { society, overview, verification, disputes, discrepancies, caseAging, decisions } = analytics;

  return (
    <PageContainer>
      <div className="space-y-7">
        {/* Navigation & Header */}
        <div>
          <Link
            href={`/government/societies/${societyId}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Society Verification Workbench
          </Link>

          <PageHeader
            eyebrow="SOCIETY ANALYTICS INTELLIGENCE"
            title={society.name}
            description={`Comprehensive vertical property analysis, verification rate telemetry, and cadastral discrepancy intelligence for ${society.address.city}, ${society.address.state}.`}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-tech-cyan hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
                >
                  <FileText className="h-4 w-4" />
                  {generatingReport ? "Generating…" : "Generate Inspection Report"}
                </button>

                <Link
                  href={`/properties/default-township/digital-twin?societyId=${societyId}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all"
                >
                  <Box className="h-4 w-4 text-cyan-400" />
                  3D Digital Twin
                </Link>

                <Link
                  href={`/map?society=${societyId}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all"
                >
                  <MapPin className="h-4 w-4 text-cyan-400" />
                  2D GIS Map
                </Link>
              </div>
            }
          />
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Vertical Units"
            value={overview.flatsCount}
            description={`${overview.buildingsCount} Buildings · ${overview.floorsCount} Floors`}
            icon={Building2}
            tone="default"
          />
          <KPICard
            title="Verification Rate"
            value={`${verification.verificationRate}%`}
            description={`${verification.verifiedCount} verified · ${verification.pendingCount} pending`}
            percentage={verification.verificationRate}
            icon={ShieldCheck}
            tone={verification.verificationRate >= 80 ? "success" : "cyan"}
          />
          <KPICard
            title="Recorded Discrepancies"
            value={discrepancies.totalDiscrepancies}
            description={`${discrepancies.bySeverity.CRITICAL} Critical · ${discrepancies.bySeverity.HIGH} High`}
            icon={AlertTriangle}
            tone={discrepancies.totalDiscrepancies > 0 ? "alert" : "success"}
          />
          <KPICard
            title="Active Cadastral Cases"
            value={disputes.openCount + disputes.assignedCount + disputes.underInvestigationCount}
            description={`${disputes.resolvedCount} Resolved · ${disputes.reinspectionRequiredCount} Reinspection`}
            icon={Clock}
            tone="warning"
          />
        </div>

        {/* Discrepancy Map Density & Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DiscrepancyAnalyticsCard data={discrepancies} />
          <DiscrepancyDensityMap buildings={analytics.buildings} societyName={society.name} />
        </div>

        {/* Case Aging & Decision Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CaseAgingCard data={caseAging} />
          <DecisionAnalyticsCard data={decisions} />
        </div>

        {/* Building & Floor Breakdown Table */}
        <BuildingFloorAnalyticsTable
          buildings={analytics.buildings}
          floors={analytics.floors}
          societyId={societyId}
          societyName={society.name}
        />

        {/* Decision Support Insights & Priority Cases */}
        <DecisionSupportInsightsCard
          insights={analytics.insights}
          priorityCases={analytics.priorityCases}
        />

        {/* Report Modal */}
        <ReportModal
          open={reportModalOpen}
          onOpenChange={setReportModalOpen}
          reportType="SOCIETY"
          data={reportData}
        />
      </div>
    </PageContainer>
  );
}
