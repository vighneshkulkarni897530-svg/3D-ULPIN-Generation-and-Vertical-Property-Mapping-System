'use client';

/**
 * /resident/dashboard — Citizen Command Dashboard (Phase 10)
 * ==========================================================
 * Complete end-to-end citizen portal connecting My Property, Spatial Identity,
 * 2D GIS, 3D Digital Twin, Cadastral Verification, Disputes, Government Cases,
 * Notifications, and Activity Timeline.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Box,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Grid3X3,
  Home,
  Layers,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Scale,
  ScanLine,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageHeader, SectionHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/context/AuthContext';
import { getCitizenOverview, type CitizenOverviewData } from '@/lib/citizen/citizenService';
import { generatePropertyReport, type PropertyReportData } from '@/lib/reports/reportService';
import { ReportModal } from '@/components/reports/ReportModal';
import { CaseStatusBadge, CaseSeverityBadge } from '@/components/verification/CaseStatusBadge';
import {
  FLAT_STATUS_LABELS,
  RESIDENT_STATUS_LABELS,
  RESIDENT_STATUS_VARIANTS,
  UNIT_TYPE_LABELS,
} from '@/types/society';

type LoadState = 'loading' | 'ready' | 'error';

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <dt className="shrink-0 text-[11px] font-semibold text-slate-400">{label}</dt>
      <dd className="break-words text-right text-xs font-semibold text-slate-800">{value ?? '—'}</dd>
    </div>
  );
}

export default function ResidentDashboardPage() {
  return (
    <ProtectedRoute>
      <ResidentDashboardContent />
    </ProtectedRoute>
  );
}

function ResidentDashboardContent() {
  const router = useRouter();
  const { sessionUser, authStatus } = useAuth();
  const [data, setData] = React.useState<CitizenOverviewData | null>(null);
  const [state, setState] = React.useState<LoadState>('loading');
  const [reloadKey, setReloadKey] = React.useState(0);

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = React.useState(false);
  const [reportData, setReportData] = React.useState<PropertyReportData | null>(null);
  const [generatingReport, setGeneratingReport] = React.useState(false);

  React.useEffect(() => {
    if (authStatus !== 'initializing' && !sessionUser?.id) {
      router.replace('/auth/login?next=/resident/dashboard');
    }
  }, [authStatus, sessionUser, router]);

  React.useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let cancelled = false;
    setState('loading');

    (async () => {
      try {
        const res = await getCitizenOverview();
        if (cancelled) return;
        setData(res);
        setState('ready');
      } catch (err) {
        console.error('Failed to load citizen overview:', err);
        if (!cancelled) setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authStatus, reloadKey]);

  const handleGenerateReport = async () => {
    if (!data?.resident) return;
    try {
      setGeneratingReport(true);
      const rep = await generatePropertyReport(
        data.resident.societyId,
        data.resident.buildingId,
        data.resident.floorId,
        data.resident.flatId,
      );
      if (rep) {
        setReportData(rep);
        setReportModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setGeneratingReport(false);
    }
  };

  const record = data?.resident;
  const property = data?.property;
  const spatial = data?.spatialIdentity;
  const verification = data?.verification;
  const disputes = data?.discrepancies || [];
  const cases = data?.cases || [];
  const notifications = data?.notifications || [];
  const timeline = data?.timeline || [];

  const displayName = record
    ? record.profile.preferredName || record.profile.fullName || 'Resident'
    : sessionUser?.name || 'Citizen';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <PageHeader
        eyebrow="CITIZEN COMMAND CENTRE · PHASE 10"
        title={record ? `Welcome, ${displayName}` : 'Citizen Portal'}
        description={
          record && property?.society
            ? `Your verified residence at ${property.society.name}.`
            : 'Welcome to your vertical cadastral management dashboard.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {record && (
              <Badge variant={RESIDENT_STATUS_VARIANTS[record.status]} className="px-3 py-1 text-xs">
                {RESIDENT_STATUS_LABELS[record.status]}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
          </div>
        }
      />

      {state === 'loading' && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading your citizen workspace…
          </p>
        </div>
      )}

      {state === 'error' && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-fit rounded-2xl border border-red-200 bg-red-50 p-3">
              <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900">Could not load citizen dashboard</h2>
            <p className="mt-1 text-xs text-slate-500">Please check your connection and try again.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Unregistered State */}
      {state === 'ready' && !record && (
        <Card className="border border-slate-200 bg-white">
          <CardContent className="p-8">
            <EmptyState
              icon={<Home className="h-10 w-10 text-cyan-600" aria-hidden="true" />}
              title="No Residency Claim Linked"
              description="Select your housing society, building, floor, and apartment flat to submit a verified residency registration."
              action={
                <Button variant="gradient" asChild className="mt-4">
                  <Link href="/resident/register">Register as Resident</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Pending / Rejected Registration State */}
      {state === 'ready' && record && record.status !== 'approved' && (
        <Card className="border border-slate-200 bg-white">
          <CardContent className="p-6">
            {record.status === 'pending' && (
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold text-slate-900">Residency Registration Pending Society Approval</p>
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                    Submitted on {formatDate(record.submittedAt)}. Your residency claim for{' '}
                    <strong>{property?.society?.name || 'Society'}</strong> is currently under review by your Society Administrator.
                  </p>
                </div>
              </div>
            )}
            {record.status === 'rejected' && (
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">Registration Not Approved</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Reason provided: {record.rejectionReason || 'No reason was specified.'}
                  </p>
                </div>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/resident/pending">View Application Dossier</Link>
              </Button>
              {record.status === 'rejected' && (
                <Button variant="gradient" size="sm" asChild>
                  <Link href="/resident/register">Resubmit Registration</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved Citizen Dashboard */}
      {state === 'ready' && record && record.status === 'approved' && (
        <div className="space-y-6">
          {/* Quick Action Navigation Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Button asChild variant="outline" className="h-auto flex-col items-center justify-center p-3 border-slate-200 hover:border-cyan-500 hover:bg-cyan-50/50">
              <Link href="/resident/property">
                <Home className="h-5 w-5 text-cyan-600 mb-1" />
                <span className="text-[11px] font-bold text-slate-800">My Property</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col items-center justify-center p-3 border-slate-200 hover:border-blue-500 hover:bg-blue-50/50">
              <Link href={`/map?society=${record.societyId}&flat=${record.flatId}`}>
                <MapPin className="h-5 w-5 text-blue-600 mb-1" />
                <span className="text-[11px] font-bold text-slate-800">2D GIS Map</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col items-center justify-center p-3 border-slate-200 hover:border-purple-500 hover:bg-purple-50/50">
              <Link href={`/map?society=${record.societyId}&flat=${record.flatId}&mode=3d`}>
                <Box className="h-5 w-5 text-purple-600 mb-1" />
                <span className="text-[11px] font-bold text-slate-800">3D Digital Twin</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col items-center justify-center p-3 border-slate-200 hover:border-red-500 hover:bg-red-50/50">
              <Link href="/disputes/new">
                <AlertTriangle className="h-5 w-5 text-red-500 mb-1" />
                <span className="text-[11px] font-bold text-slate-800">Report Issue</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col items-center justify-center p-3 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50">
              <Link href="/resident/cases">
                <Scale className="h-5 w-5 text-emerald-600 mb-1" />
                <span className="text-[11px] font-bold text-slate-800">My Cases ({cases.length})</span>
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="h-auto flex-col items-center justify-center p-3 border-slate-200 hover:border-amber-500 hover:bg-amber-50/50"
            >
              <FileText className="h-5 w-5 text-amber-600 mb-1" />
              <span className="text-[11px] font-bold text-slate-800">
                {generatingReport ? 'Generating...' : 'Cadastral Report'}
              </span>
            </Button>
          </div>

          {/* Main Grid: Left 2 Cols (Property & Spatial & Cases) | Right Col (Notifications & Activity) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {/* 1. My Property Card */}
              <Card className="border border-slate-200 bg-white">
                <CardContent className="p-5">
                  <SectionHeader
                    icon={<Grid3X3 className="h-4 w-4 text-cyan-600" aria-hidden="true" />}
                    title="My Property Structure"
                    description="Official vertical property records resolved from society cadastral layers."
                    action={
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/resident/property">View Full Details</Link>
                      </Button>
                    }
                  />
                  <dl className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                    <DetailRow label="Society" value={property?.society?.name} />
                    <DetailRow label="Building" value={`${property?.building?.name || '—'} (${property?.building?.code || '—'})`} />
                    <DetailRow label="Floor" value={property?.floor?.floorLabel || `Floor ${property?.floor?.floorNumber || '—'}`} />
                    <DetailRow label="Flat Unit" value={`Flat ${property?.flat?.flatNumber || '—'}`} />
                    <DetailRow
                      label="Unit Type"
                      value={
                        property?.flat
                          ? (UNIT_TYPE_LABELS[property.flat.unitType] ?? property.flat.unitType)
                          : null
                      }
                    />
                    <DetailRow
                      label="Society Status"
                      value={
                        property?.flat
                          ? (FLAT_STATUS_LABELS[property.flat.status] ?? property.flat.status)
                          : null
                      }
                    />
                  </dl>
                </CardContent>
              </Card>

              {/* 2. Spatial Identity & ULPIN */}
              {spatial && (
                <Card className="border border-cyan-200/70 bg-gradient-to-br from-cyan-50/40 via-white to-blue-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                      <ScanLine className="h-4 w-4 text-cyan-600" />
                      Spatial Identity &amp; 3D Coordinates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-1 text-xs">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Vertical Spatial ID</span>
                        <p className="font-mono text-xs font-black text-cyan-800 mt-0.5 truncate">{spatial.spatialId}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">ULPIN Reference</span>
                        <p className="font-mono text-xs font-black text-slate-800 mt-0.5 truncate">{spatial.baseUlpin}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                      <span>
                        Coordinates: <strong className="text-slate-800 font-mono">{spatial.approximateCoordinates?.lat.toFixed(4)}°N, {spatial.approximateCoordinates?.lng.toFixed(4)}°E</strong>
                      </span>
                      <span>
                        Elevation (Z): <strong className="text-slate-800 font-mono">~{spatial.elevationMeters}m</strong>
                      </span>
                      <Badge variant="secondary" className="border-amber-200 bg-amber-50 text-amber-800 text-[10px]">
                        {spatial.dataStatus.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-cyan-100">
                      <Button asChild size="sm" variant="outline" className="text-xs h-8">
                        <Link href={`/map?society=${record.societyId}&flat=${record.flatId}`}>
                          <MapPin className="h-3 w-3 mr-1 text-blue-600" /> Open in 2D GIS Map
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="text-xs h-8">
                        <Link href={`/map?society=${record.societyId}&flat=${record.flatId}&mode=3d`}>
                          <Box className="h-3 w-3 mr-1 text-purple-600" /> Inspect in 3D Digital Twin
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 3. Government Verification Status */}
              <Card className="border border-slate-200 bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm font-extrabold text-slate-900">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" /> Government Cadastral Verification
                    </span>
                    <Badge variant={verification?.status === 'verified' ? 'default' : 'secondary'} className="text-xs">
                      {verification?.status ? verification.status.toUpperCase() : 'NOT SUBMITTED'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-1 text-xs text-slate-600">
                  {verification ? (
                    <div className="space-y-2">
                      <p className="leading-relaxed">
                        Verified by: <strong className="text-slate-800">{verification.verifiedByOfficerName || 'Government Officer'}</strong>
                      </p>
                      {verification.remarks && (
                        <p className="rounded-lg bg-slate-50 p-2.5 border border-slate-100 italic">
                          "{verification.remarks}"
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 font-mono">
                        Date: {formatDate(verification.verifiedAt)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-500 leading-relaxed">
                      Your unit is currently in queue for official municipal and cadastral verification review.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* 4. Active Verification Cases & Grievances */}
              <Card className="border border-slate-200 bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm font-extrabold text-slate-900">
                    <span className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-cyan-600" /> Active Verification Cases ({cases.length})
                    </span>
                    <Button asChild size="sm" variant="ghost" className="text-xs text-cyan-700 h-7">
                      <Link href="/resident/cases">View All <ArrowRight className="h-3 w-3 ml-1" /></Link>
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  {cases.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      No active dispute cases filed for this property.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cases.slice(0, 3).map((c) => (
                        <div
                          key={c.id}
                          className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-cyan-800">{c.caseNumber}</span>
                              <CaseStatusBadge status={c.status} />
                              <CaseSeverityBadge severity={c.severity} />
                            </div>
                            <p className="mt-1 text-xs font-bold text-slate-800 truncate">{c.title}</p>
                          </div>
                          <Button asChild size="sm" variant="outline" className="h-7 text-xs shrink-0">
                            <Link href={`/resident/cases/${c.id}`}>View Dossier</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Notifications & Activity Timeline */}
            <div className="space-y-6">
              {/* Recent Notifications Feed */}
              <Card className="border border-slate-200 bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm font-extrabold text-slate-900">
                    <span className="flex items-center gap-1.5">
                      <Bell className="h-4 w-4 text-amber-500" /> Alerts &amp; Notifications
                    </span>
                    <Button asChild size="sm" variant="ghost" className="text-xs text-cyan-700 h-7">
                      <Link href="/resident/notifications">View All</Link>
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  {notifications.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-400">No recent notifications.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {notifications.slice(0, 4).map((n) => (
                        <div
                          key={n.id}
                          className={`rounded-lg border p-2.5 text-xs transition-colors ${
                            n.read ? 'border-slate-100 bg-white' : 'border-cyan-200 bg-cyan-50/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-bold text-slate-800 line-clamp-1">{n.title}</p>
                            {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 shrink-0" />}
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">{n.message}</p>
                          <span className="mt-1 block text-[10px] font-mono text-slate-400">
                            {formatDate(n.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Activity Timeline */}
              <Card className="border border-slate-200 bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-cyan-600" /> Activity Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  {timeline.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-400">No activity logged yet.</p>
                  ) : (
                    <div className="space-y-3 relative pl-4 border-l-2 border-slate-200 ml-2">
                      {timeline.slice(0, 5).map((t, idx) => (
                        <div key={idx} className="relative text-xs">
                          <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-cyan-500 ring-4 ring-white" />
                          <p className="font-bold text-slate-800 leading-tight">{t.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{t.description}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{formatDate(t.date)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cadastral Legal Disclaimer */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-500 leading-relaxed">
                <p className="font-bold text-slate-700 mb-1">Cadastral Support Note</p>
                Property status and spatial identifiers displayed in this portal reflect system records and do not replace official registered sale deeds or legal cadastral certificates.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Property Cadastral Report Modal */}
      <ReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        reportType="PROPERTY"
        data={reportData}
      />
    </div>
  );
}
