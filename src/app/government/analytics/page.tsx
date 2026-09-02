'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PERMISSIONS } from '@/types/auth';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import {
  getGovernmentFullAnalytics,
  type FullGovernmentAnalytics,
} from '@/lib/analytics/analyticsService';
import { KPICard } from '@/components/analytics/KPICard';
import { DiscrepancyAnalyticsCard } from '@/components/analytics/DiscrepancyAnalyticsCard';
import { CaseAgingCard } from '@/components/analytics/CaseAgingCard';
import { DecisionAnalyticsCard } from '@/components/analytics/DecisionAnalyticsCard';
import { VerificationTrendChart } from '@/components/analytics/VerificationTrendChart';
import { BuildingFloorAnalyticsTable } from '@/components/analytics/BuildingFloorAnalyticsTable';
import { DecisionSupportInsightsCard } from '@/components/analytics/DecisionSupportInsightsCard';
import { DiscrepancyDensityMap } from '@/components/analytics/DiscrepancyDensityMap';
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Landmark,
  ShieldCheck,
  BarChart3,
  Layers,
  ArrowLeft,
  FileText,
} from 'lucide-react';

export default function GovernmentAnalyticsPage() {
  return (
    <ProtectedRoute permission={PERMISSIONS.VIEW_VERIFICATION_QUEUE}>
      <GovernmentAnalyticsContent />
    </ProtectedRoute>
  );
}

function GovernmentAnalyticsContent() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<FullGovernmentAnalytics | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGovernmentFullAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load government analytics:', err);
      setError(err instanceof Error ? err.message : 'Unable to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <PageContainer>
      <div className="space-y-7">
        <PageHeader
          eyebrow="OFFICIAL CADASTRE INTELLIGENCE & TELEMETRY"
          title="Government Analytics & Decision Support"
          description={`Comprehensive analytical intelligence derived strictly from live Firestore cadastral records. Real-time overview of vertical property mapping, verification velocity, discrepancy concentrations, and decision distributions.`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadData()}
                disabled={loading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
              </Button>
              <Link href="/government/analytics/societies">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-cyan-500" /> Society Comparison
                </Button>
              </Link>
              <Link href="/government/dashboard">
                <Button variant="default" size="sm" className="gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verification Portal
                </Button>
              </Link>
            </div>
          }
        />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
            <p className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              {error}
            </p>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center text-xs text-slate-400 space-y-3">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-cyan-500" />
            <p className="font-semibold text-slate-300">Aggregating live Firestore cadastral records…</p>
            <p className="text-[11px] text-slate-500">Calculating zero-division verified metrics & case aging distributions</p>
          </div>
        ) : !analytics ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <Landmark className="mx-auto h-8 w-8 text-slate-500" />
            <p className="text-sm font-bold text-slate-300">No verification data available yet</p>
            <p className="text-xs text-slate-500">Register societies and submit property hierarchies to populate analytics.</p>
          </div>
        ) : (
          <div className="space-y-7">
            {/* ── 1. Top Executive KPIs ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KPICard
                title="Total Registered Flats"
                value={analytics.overview.totalFlats}
                description={`${analytics.overview.totalSocieties} Societies · ${analytics.overview.totalBuildings} Buildings · ${analytics.overview.totalFloors} Floors`}
                icon={Building2}
                tone="default"
              />
              <KPICard
                title="Cadastral Verification Rate"
                value={`${analytics.verification.verificationRate}%`}
                description={`${analytics.verification.verifiedCount} verified · ${analytics.verification.pendingCount} pending`}
                percentage={analytics.verification.verificationRate}
                icon={ShieldCheck}
                tone={analytics.verification.verificationRate >= 80 ? 'success' : 'cyan'}
              />
              <KPICard
                title="Recorded Discrepancies"
                value={analytics.discrepancies.totalDiscrepancies}
                description={`${analytics.discrepancies.bySeverity.CRITICAL} Critical · ${analytics.discrepancies.bySeverity.HIGH} High`}
                icon={AlertTriangle}
                tone={analytics.discrepancies.totalDiscrepancies > 0 ? 'alert' : 'success'}
              />
              <KPICard
                title="Dispute Resolution Rate"
                value={`${analytics.disputes.resolutionRate}%`}
                description={`${analytics.disputes.resolvedCount} resolved · ${analytics.disputes.totalCases} total cases`}
                percentage={analytics.disputes.resolutionRate}
                icon={CheckCircle2}
                tone="success"
              />
            </div>

            {/* ── 2. Spatial Density Map & Time Series Trends ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <VerificationTrendChart
                  trends7Days={analytics.trends7Days}
                  trends30Days={analytics.trends30Days}
                  trends90Days={analytics.trends90Days}
                />
              </div>
              <div className="lg:col-span-5">
                <DiscrepancyDensityMap buildings={analytics.buildingAnalytics} />
              </div>
            </div>

            {/* ── 3. Discrepancy Breakdown & Case Aging ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DiscrepancyAnalyticsCard data={analytics.discrepancies} />
              <CaseAgingCard data={analytics.caseAging} />
            </div>

            {/* ── 4. Government Decision Intelligence & Reinspections ── */}
            <DecisionAnalyticsCard data={analytics.decisions} />

            {/* ── 5. Building & Floor Level Breakdown Table ── */}
            <BuildingFloorAnalyticsTable buildings={analytics.buildingAnalytics} />

            {/* ── 6. Decision Support Insights & Priority Cases Queue ── */}
            <DecisionSupportInsightsCard
              insights={analytics.insights}
              priorityCases={analytics.priorityCases}
            />

            {/* Data Freshness & Disclaimer Footer */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Firestore data · Last calculated: {analytics.lastUpdated.toLocaleTimeString('en-IN')}</span>
              </div>
              <p className="text-[10px] text-slate-500 italic text-center sm:text-right">
                System insights provide descriptive intelligence only and do not constitute autonomous legal determinations.
              </p>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
