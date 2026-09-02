'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PERMISSIONS } from '@/types/auth';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import {
  getGovernmentDashboardStats,
  type GovernmentDashboardStats,
} from '@/lib/society/governmentService';
import { getAvailableSocieties } from '@/lib/society/service';
import { getAllVerifications } from '@/lib/society/governmentService';
import {
  type GovVerification,
  type GovVerificationStatus,
  type Society,
  GOV_VERIFICATION_STATUS_LABELS,
  GOV_VERIFICATION_STATUS_VARIANTS,
} from '@/types/society';
import {
  getAllVerificationCases,
} from '@/lib/society/verificationWorkflowService';
import { type VerificationCase } from '@/types/verificationCase';
import { CaseStatusBadge, CaseSeverityBadge } from '@/components/verification/CaseStatusBadge';
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
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
  FileCheck2,
  History,
  ArrowRight,
  Search,
  Landmark,
  ShieldCheck,
  RefreshCw,
  Eye,
  Layers,
  MapPin,
  Flag,
  BarChart3,
  SlidersHorizontal,
  Gavel,
  Sparkles,
} from 'lucide-react';

export default function GovernmentDashboardPage() {
  return (
    <ProtectedRoute permission={PERMISSIONS.VIEW_VERIFICATION_QUEUE}>
      <GovernmentDashboardContent />
    </ProtectedRoute>
  );
}

function GovernmentDashboardContent() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<GovernmentDashboardStats | null>(null);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [verifications, setVerifications] = useState<GovVerification[]>([]);
  const [cases, setCases] = useState<VerificationCase[]>([]);
  const [fullAnalytics, setFullAnalytics] = useState<FullGovernmentAnalytics | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'analytics' | 'queue'>('analytics');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashStats, allSocieties, allVerifications, allCases, analyticsData] = await Promise.all([
        getGovernmentDashboardStats(),
        getAvailableSocieties(),
        getAllVerifications(),
        getAllVerificationCases(),
        getGovernmentFullAnalytics(),
      ]);
      setStats(dashStats);
      setSocieties(allSocieties);
      setVerifications(allVerifications);
      setCases(allCases);
      setFullAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to load government dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Map verification status for each society
  const societyVerificationsMap = useMemo(() => {
    const map = new Map<string, GovVerification>();
    verifications
      .filter((v) => v.targetType === 'society')
      .forEach((v) => {
        map.set(v.targetId, v);
      });
    return map;
  }, [verifications]);

  const filteredSocieties = useMemo(() => {
    return societies.filter((society) => {
      const ver = societyVerificationsMap.get(society.id);
      const currentStatus = ver ? ver.status : 'pending';

      const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        society.name.toLowerCase().includes(q) ||
        (society.registrationNumber && society.registrationNumber.toLowerCase().includes(q)) ||
        society.address.city.toLowerCase().includes(q) ||
        society.address.state.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [societies, societyVerificationsMap, searchQuery, statusFilter]);

  return (
    <PageContainer>
      <div className="space-y-7">
        <PageHeader
          eyebrow="OFFICIAL GOVERNMENT CADASTRE & DECISION INTELLIGENCE"
          title="Government Officer Portal"
          description={`Welcome back, ${currentUser.name}. Unified command center for vertical property verification, discrepancy telemetry, case resolution, and decision-support intelligence.`}
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
                  <BarChart3 className="h-3.5 w-3.5 text-cyan-500" /> Society Analytics
                </Button>
              </Link>
              <Link href="/government/societies">
                <Button variant="default" size="sm">
                  <Landmark className="h-3.5 w-3.5" /> All Societies
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

        {/* Tab switcher */}
        <div className="flex rounded-xl border border-slate-800 bg-slate-900/90 p-1 text-xs font-semibold w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Decision Intelligence & Analytics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all ${
              activeTab === 'queue'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Verification Queue & Cases ({cases.length})
          </button>
        </div>

        {/* Tab 1: Advanced Analytics & Decision Intelligence (Phase 9) */}
        {activeTab === 'analytics' && fullAnalytics && (
          <div className="space-y-6">
            {/* Top KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KPICard
                title="Registered Vertical Properties"
                value={fullAnalytics.overview.totalFlats}
                description={`${fullAnalytics.overview.totalSocieties} Societies · ${fullAnalytics.overview.totalBuildings} Buildings`}
                icon={Building2}
                tone="default"
              />
              <KPICard
                title="Verification Rate"
                value={`${fullAnalytics.verification.verificationRate}%`}
                description={`${fullAnalytics.verification.verifiedCount} verified · ${fullAnalytics.verification.pendingCount} pending`}
                percentage={fullAnalytics.verification.verificationRate}
                icon={ShieldCheck}
                tone={fullAnalytics.verification.verificationRate >= 80 ? 'success' : 'cyan'}
              />
              <KPICard
                title="Recorded Discrepancies"
                value={fullAnalytics.discrepancies.totalDiscrepancies}
                description={`${fullAnalytics.discrepancies.bySeverity.CRITICAL} Critical · ${fullAnalytics.discrepancies.bySeverity.HIGH} High`}
                icon={AlertTriangle}
                tone={fullAnalytics.discrepancies.totalDiscrepancies > 0 ? 'alert' : 'success'}
              />
              <KPICard
                title="Resolution Rate"
                value={`${fullAnalytics.disputes.resolutionRate}%`}
                description={`${fullAnalytics.disputes.resolvedCount} resolved · ${fullAnalytics.disputes.totalCases} total cases`}
                percentage={fullAnalytics.disputes.resolutionRate}
                icon={CheckCircle2}
                tone="success"
              />
            </div>

            {/* Time Series Trend & Decision Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <VerificationTrendChart
                  trends7Days={fullAnalytics.trends7Days}
                  trends30Days={fullAnalytics.trends30Days}
                  trends90Days={fullAnalytics.trends90Days}
                />
              </div>
              <div className="lg:col-span-5">
                <DecisionAnalyticsCard data={fullAnalytics.decisions} />
              </div>
            </div>

            {/* Discrepancy Breakdown & Case Aging */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DiscrepancyAnalyticsCard data={fullAnalytics.discrepancies} />
              <CaseAgingCard data={fullAnalytics.caseAging} />
            </div>

            {/* Building Breakdown Table */}
            <BuildingFloorAnalyticsTable buildings={fullAnalytics.buildingAnalytics} />

            {/* Decision Support & Priority Cases */}
            <DecisionSupportInsightsCard
              insights={fullAnalytics.insights}
              priorityCases={fullAnalytics.priorityCases}
            />
          </div>
        )}

        {/* Tab 2: Cadastral Queue & Operations (Phase 4 / 8) */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            {/* Executive Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <DashboardCard
                label="Total Societies"
                value={loading ? '—' : String(stats?.totalSocieties ?? 0)}
                sub="Registered on platform"
                icon={<Building2 className="h-5 w-5" />}
                tone="navy"
              />
              <DashboardCard
                label="Verified Societies"
                value={loading ? '—' : String(stats?.verifiedSocieties ?? 0)}
                sub="Official government clearance"
                icon={<CheckCircle2 className="h-5 w-5" />}
                tone="green"
              />
              <DashboardCard
                label="Pending Review"
                value={loading ? '—' : String(stats?.pendingSocieties ?? 0)}
                sub="Awaiting officer inspection"
                icon={<Clock className="h-5 w-5" />}
                tone="cyan"
              />
              <DashboardCard
                label="Needs Review"
                value={loading ? '—' : String(stats?.needsReviewSocieties ?? 0)}
                sub="Action or evidence required"
                icon={<HelpCircle className="h-5 w-5" />}
                tone="cyan"
              />
              <DashboardCard
                label="Flagged Discrepancies"
                value={loading ? '—' : String(stats?.openDiscrepancies ?? 0)}
                sub="Open investigation flags"
                icon={<AlertTriangle className="h-5 w-5" />}
                tone="red"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Societies Queue (8 cols) */}
              <div className="space-y-4 lg:col-span-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Society Verification Queue
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Real Firestore society master records pending or reviewed by government officers.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status filter tabs */}
                      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
                        <button
                          onClick={() => setStatusFilter('all')}
                          className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                            statusFilter === 'all'
                              ? 'bg-white font-bold text-slate-900 shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setStatusFilter('pending')}
                          className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                            statusFilter === 'pending'
                              ? 'bg-white font-bold text-amber-800 shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Pending
                        </button>
                        <button
                          onClick={() => setStatusFilter('verified')}
                          className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                            statusFilter === 'verified'
                              ? 'bg-white font-bold text-green-800 shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Verified
                        </button>
                        <button
                          onClick={() => setStatusFilter('flagged')}
                          className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                            statusFilter === 'flagged'
                              ? 'bg-white font-bold text-red-800 shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Flagged
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Search input */}
                  <div className="mb-4 relative">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter societies by name, registration number, city or district..."
                      className="pl-9 text-xs"
                    />
                  </div>

                  {/* Societies Table */}
                  {loading ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-cyan-600" />
                      Loading real society data from Firestore…
                    </div>
                  ) : filteredSocieties.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center text-xs text-slate-500">
                      <Landmark className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      <p className="font-bold text-slate-700">No societies found</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {searchQuery
                          ? 'No societies match the current search criteria.'
                          : 'No societies currently match this status filter.'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="px-3.5 py-3">Society Details</th>
                            <th className="px-3.5 py-3">Location</th>
                            <th className="px-3.5 py-3">Reg. Number</th>
                            <th className="px-3.5 py-3">Gov Status</th>
                            <th className="px-3.5 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {filteredSocieties.map((society) => {
                            const ver = societyVerificationsMap.get(society.id);
                            const status: GovVerificationStatus = ver ? ver.status : 'pending';
                            const badgeVariant = GOV_VERIFICATION_STATUS_VARIANTS[status];
                            const badgeLabel = GOV_VERIFICATION_STATUS_LABELS[status];

                            return (
                              <tr key={society.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-3.5 py-3 font-medium text-slate-900">
                                  <div className="font-bold text-slate-900">{society.name}</div>
                                  <div className="text-[10px] text-slate-400">{society.type}</div>
                                </td>
                                <td className="px-3.5 py-3 text-slate-600">
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                    {society.address.city}, {society.address.state}
                                  </span>
                                </td>
                                <td className="px-3.5 py-3 font-mono text-[11px] text-slate-600">
                                  {society.registrationNumber || '—'}
                                </td>
                                <td className="px-3.5 py-3">
                                  <Badge variant={badgeVariant} className="text-[10px] whitespace-nowrap">
                                    {badgeLabel}
                                  </Badge>
                                </td>
                                <td className="px-3.5 py-3 text-right">
                                  <Link href={`/government/societies/${society.id}`}>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                                      <Eye className="h-3 w-3" /> Inspect & Verify
                                    </Button>
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Activity & Verification Audit Sidebar (4 cols) */}
              <div className="space-y-5 lg:col-span-4">
                {/* Quick Actions Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <ShieldCheck className="h-4 w-4 text-cyan-600" /> Verification Framework
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Official government decisions recorded here are legally distinct from society-admin
                    resident approvals. Verification updates an immutable audit trail.
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                    <Link href="/government/analytics/societies" className="w-full">
                      <Button variant="outline" size="sm" className="w-full justify-between text-xs">
                        <span>Society Analytics Comparison</span>
                        <BarChart3 className="h-3.5 w-3.5 text-cyan-600" />
                      </Button>
                    </Link>
                    <Link href="/government/societies" className="w-full">
                      <Button variant="outline" size="sm" className="w-full justify-between text-xs">
                        <span>Browse All Registered Societies</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Link href="/map" className="w-full">
                      <Button variant="secondary" size="sm" className="w-full justify-between text-xs">
                        <span>Open 3D Cadastre Map</span>
                        <Layers className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Verification Cases Queue (Phase 8) */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                      <ShieldCheck className="h-4 w-4 text-cyan-600" /> Active Verification Cases ({cases.length})
                    </h3>
                  </div>

                  {loading ? (
                    <div className="py-6 text-center text-xs text-slate-400">Loading cases…</div>
                  ) : cases.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center text-[11px] text-slate-400">
                      No active verification cases found.
                    </p>
                  ) : (
                    <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                      {cases.slice(0, 5).map((c) => (
                        <Link
                          key={c.id}
                          href={`/government/cases/${c.id}`}
                          className="block rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs transition-all hover:border-cyan-400 hover:bg-cyan-50/30"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <span className="font-mono text-[9px] font-bold text-cyan-700">
                                {c.caseNumber}
                              </span>
                              <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{c.title}</h4>
                            </div>
                            <CaseStatusBadge status={c.status} className="text-[8px]" />
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                            <span>Officer: {c.assignedOfficerName || 'Unassigned'}</span>
                            <span className="font-bold text-cyan-700 inline-flex items-center gap-0.5">
                              Inspect <ArrowRight className="h-2.5 w-2.5" />
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Verification Activity Log */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                      <History className="h-4 w-4 text-blue-600" /> Recent Audit Activity
                    </h3>
                  </div>

                  {loading ? (
                    <div className="py-6 text-center text-xs text-slate-400">Loading history…</div>
                  ) : !stats || stats.recentActivity.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center text-[11px] text-slate-400">
                      No government verification actions recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {stats.recentActivity.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-slate-700 capitalize">
                              {event.targetType} Decision: {event.action}
                            </span>
                            <span className="font-mono text-slate-400">
                              {event.createdAt ? event.createdAt.toLocaleDateString('en-IN') : '—'}
                            </span>
                          </div>
                          <p className="mt-1 font-medium text-slate-800 line-clamp-2">
                            {event.remarks || 'No remarks provided.'}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200/60 pt-1">
                            <span>By: {event.officerName || 'Officer'}</span>
                            <Badge
                              variant={GOV_VERIFICATION_STATUS_VARIANTS[event.newStatus]}
                              className="text-[9px] px-1.5 py-0"
                            >
                              {event.newStatus}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
