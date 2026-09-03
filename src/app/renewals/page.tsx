'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  Bell,
  AlertTriangle,
  AlertOctagon,
  Search,
  Filter,
  FilePlus2,
  ShieldCheck,
  Building2,
  Box,
  Layers,
  Info,
  Calendar,
  Eye,
  ArrowUpDown,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { useRenewals } from '@/context/RenewalContext';
import { useAuth } from '@/context/AuthContext';
import type { PropertyRenewalRecord, RenewalStatus } from '@/types/renewal';
import { formatDateDisplay } from '@/lib/renewals/renewalCalculator';
import { CreateRenewalReportModal } from '@/components/renewals/CreateRenewalReportModal';
import { RenewalReviewDrawer } from '@/components/renewals/RenewalReviewDrawer';
import { cn } from '@/lib/utils';

export default function RenewalsPage() {
  return (
    <ProtectedRoute>
      <RenewalsPageContent />
    </ProtectedRoute>
  );
}

type FilterTab = 'ALL' | 'UP_TO_DATE' | 'DUE_SOON' | 'DUE' | 'OVERDUE' | 'PENDING';

function RenewalsPageContent() {
  const { renewalRecords, renewalStats, refreshRenewals } = useRenewals();
  const { role } = useAuth();

  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecordForCreate, setSelectedRecordForCreate] = useState<PropertyRenewalRecord | null>(null);
  const [selectedRecordForReview, setSelectedRecordForReview] = useState<PropertyRenewalRecord | null>(null);

  const isOfficerOrAdmin = role === 'OFFICER' || role === 'ADMIN';

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return renewalRecords.filter((rec) => {
      // Tab filter
      if (activeTab === 'UP_TO_DATE' && rec.renewalStatus !== 'UP_TO_DATE') return false;
      if (activeTab === 'DUE_SOON' && rec.renewalStatus !== 'DUE_SOON') return false;
      if (activeTab === 'DUE' && rec.renewalStatus !== 'DUE') return false;
      if (activeTab === 'OVERDUE' && rec.renewalStatus !== 'OVERDUE') return false;
      if (
        activeTab === 'PENDING' &&
        rec.caseStatus !== 'PENDING_REVIEW' &&
        rec.caseStatus !== 'UNDER_VERIFICATION'
      )
        return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchBuilding = rec.buildingName.toLowerCase().includes(q);
        const matchSociety = rec.societyName.toLowerCase().includes(q);
        const matchUlpin = rec.ulpin.toLowerCase().includes(q);
        const matchPropertyId = rec.propertyId.toLowerCase().includes(q);
        if (!matchBuilding && !matchSociety && !matchUlpin && !matchPropertyId) {
          return false;
        }
      }

      return true;
    });
  }, [renewalRecords, activeTab, searchQuery]);

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          eyebrow="CADASTRAL LIFECYCLE MANAGEMENT"
          title="Periodic Property Verification & Renewal"
          description="Continuous property record maintenance and milestone tracking based on the configured 10-year review interval. Monitors building age, structural renovations, and periodic re-certifications."
          actions={
            <button
              onClick={refreshRenewals}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              title="Reset to default demo data"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
              Reset Demo Records
            </button>
          }
        />

        {/* Policy Banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4 text-xs text-cyan-950">
          <Info className="h-4 w-4 shrink-0 text-cyan-600 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Configured 10-Year Review Interval:</strong> This system automatically tracks building
            age from construction/completion dates and prompts periodic verification every 10 years.
            This is a <em>verification-support and records maintenance tool</em> — it does not assert that
            ownership or building structures legally expire after 10 years.
          </div>
        </div>

        {/* Citizen Role Notification */}
        {role === 'CITIZEN' && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-950 shadow-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Citizen Information Notice:</strong> Periodic building structural filings and renewal reports
              are prepared and submitted exclusively by the authorized <strong>Society Secretary</strong>, and inspected by
              <strong> Government Revenue Officers</strong>. As a citizen, you can track society verification milestones below or manage your individual apartment/flat records from your personal dashboard.
            </div>
          </div>
        )}

        {/* Stats Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Buildings
            </span>
            <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">
              {renewalStats.totalProperties}
            </p>
            <span className="text-[11px] text-slate-500">In cadastre database</span>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              ✓ Up to Date
            </span>
            <p className="mt-1 text-2xl font-black text-emerald-900 tabular-nums">
              {renewalStats.upToDate}
            </p>
            <span className="text-[11px] text-emerald-600">Verified &lt; 10 yrs</span>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              🔔 Due Soon
            </span>
            <p className="mt-1 text-2xl font-black text-amber-900 tabular-nums">
              {renewalStats.dueSoon}
            </p>
            <span className="text-[11px] text-amber-600">Due within ~12 mos</span>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
              ⚠️ Overdue
            </span>
            <p className="mt-1 text-2xl font-black text-rose-900 tabular-nums">
              {renewalStats.overdue}
            </p>
            <span className="text-[11px] text-rose-600">Crossed 10-yr cycle</span>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">
              Pending Review
            </span>
            <p className="mt-1 text-2xl font-black text-cyan-900 tabular-nums">
              {renewalStats.pendingReview}
            </p>
            <span className="text-[11px] text-cyan-600">Officer verification</span>
          </div>
        </div>

        {/* Controls: Search and Filter Tabs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'ALL', label: 'All Records' },
              { id: 'UP_TO_DATE', label: '✓ Up to Date' },
              { id: 'DUE_SOON', label: '🔔 Due Soon' },
              { id: 'OVERDUE', label: '🔴 Overdue' },
              { id: 'PENDING', label: 'Review Queue' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FilterTab)}
                className={cn(
                  'rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors',
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search building, ULPIN..."
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Records Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Building &amp; Cadastre</th>
                  <th className="px-4 py-3">Construction / Age</th>
                  <th className="px-4 py-3">Last Verified</th>
                  <th className="px-4 py-3">Next Review Due</th>
                  <th className="px-4 py-3">Milestone Status</th>
                  <th className="px-4 py-3">Case Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No property renewal records found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => {
                    const statusBadge = {
                      UP_TO_DATE: {
                        label: 'Up to Date',
                        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        icon: CheckCircle2,
                      },
                      DUE_SOON: {
                        label: 'Due Soon (~6 mos)',
                        cls: 'bg-amber-50 text-amber-700 border-amber-200',
                        icon: Bell,
                      },
                      DUE: {
                        label: 'Due Now',
                        cls: 'bg-orange-50 text-orange-700 border-orange-200',
                        icon: AlertTriangle,
                      },
                      OVERDUE: {
                        label: 'Overdue (10+ yrs)',
                        cls: 'bg-rose-50 text-rose-700 border-rose-200',
                        icon: AlertOctagon,
                      },
                    }[rec.renewalStatus];

                    const StatusIcon = statusBadge.icon;

                    return (
                      <tr key={rec.renewalId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{rec.buildingName}</div>
                          <div className="font-mono text-[10px] text-cyan-700">{rec.ulpin}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{rec.societyName}</div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-800">
                            {formatDateDisplay(rec.constructionDate)}
                          </div>
                          <span className="inline-block mt-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                            Age: {rec.calculatedAgeYears} years
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-slate-600">
                          {formatDateDisplay(rec.lastVerificationDate)}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">
                            {formatDateDisplay(rec.nextReviewDate)}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Interval: {rec.reviewIntervalYears} yrs
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold',
                              statusBadge.cls
                            )}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusBadge.label}
                          </span>
                          {rec.changesDetected && (
                            <span className="block mt-1 text-[9px] font-bold text-amber-700">
                              ⚠️ Change detected
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-medium text-[11px] text-slate-700">
                            {rec.caseStatus.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Officer Review button — ONLY Government Revenue Officer */}
                            {role === 'OFFICER' && (
                              <button
                                onClick={() => setSelectedRecordForReview(rec)}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                                title="Official revenue inspection"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Officer Review
                              </button>
                            )}

                            {/* Create Renewal Report button — ONLY Authorized Society Secretary */}
                            {role === 'ADMIN' && (
                              <button
                                onClick={() => setSelectedRecordForCreate(rec)}
                                className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1 text-[11px] font-bold text-white shadow-sm hover:from-indigo-500 hover:to-purple-500 transition-all"
                                title="Prepare renewal report with auto-populated data"
                              >
                                <FilePlus2 className="h-3.5 w-3.5" />
                                {rec.renewalStatus === 'UP_TO_DATE' ? 'Update Filing' : 'Renew'}
                              </button>
                            )}

                            {/* Citizen notice */}
                            {role === 'CITIZEN' && (
                              <span className="text-[10px] text-slate-400 italic px-2 py-1">
                                Monitored by Society
                              </span>
                            )}

                            {/* Link to Digital Twin */}
                            <Link
                              href={`/properties/${rec.propertyId}/digital-twin`}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              title="Open 3D Digital Twin"
                            >
                              <Box className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal for creating / preparing renewal report */}
      {selectedRecordForCreate && (
        <CreateRenewalReportModal
          isOpen={!!selectedRecordForCreate}
          onClose={() => setSelectedRecordForCreate(null)}
          initialRecord={selectedRecordForCreate}
        />
      )}

      {/* Drawer for government officer review */}
      {selectedRecordForReview && (
        <RenewalReviewDrawer
          record={selectedRecordForReview}
          onClose={() => setSelectedRecordForReview(null)}
        />
      )}
    </PageContainer>
  );
}
