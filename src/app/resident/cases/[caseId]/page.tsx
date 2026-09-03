'use client';

/**
 * /resident/cases/[caseId] — Citizen Case Investigation Dossier (Phase 10)
 * ========================================================================
 * Detailed case view for citizens: inspects property details, submitted evidence,
 * public investigation timeline, and official government determinations.
 * Excludes internal government notes to preserve administrative confidentiality.
 */

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileText,
  Home,
  Layers,
  MapPin,
  Printer,
  Scale,
  ShieldCheck,
  User,
  XCircle,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/context/AuthContext';
import { getCitizenCaseDetail } from '@/lib/citizen/citizenService';
import { generateCaseReport, type CaseReportData } from '@/lib/reports/reportService';
import { ReportModal } from '@/components/reports/ReportModal';
import { type VerificationCase, type VerificationEvidence } from '@/types/verificationCase';
import { type ResolvedResidentProperty } from '@/lib/society/residentProperty';
import { CaseStatusBadge, CaseSeverityBadge } from '@/components/verification/CaseStatusBadge';

export default function ResidentCaseDetailPage() {
  return (
    <ProtectedRoute>
      <ResidentCaseDetailContent />
    </ProtectedRoute>
  );
}

function ResidentCaseDetailContent() {
  const params = useParams();
  const caseId = Array.isArray(params?.caseId) ? params.caseId[0] : (params?.caseId as string);
  const router = useRouter();
  const { authStatus } = useAuth();

  const [caseDoc, setCaseDoc] = React.useState<VerificationCase | null>(null);
  const [evidence, setEvidence] = React.useState<VerificationEvidence[]>([]);
  const [property, setProperty] = React.useState<ResolvedResidentProperty | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Report modal
  const [reportModalOpen, setReportModalOpen] = React.useState(false);
  const [reportData, setReportData] = React.useState<CaseReportData | null>(null);
  const [generatingReport, setGeneratingReport] = React.useState(false);

  React.useEffect(() => {
    if (!caseId || authStatus !== 'authenticated') return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await getCitizenCaseDetail(caseId);
        if (cancelled) return;
        setCaseDoc(data.caseDoc);
        setEvidence(data.evidence);
        setProperty(data.property);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load case details');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [caseId, authStatus]);

  const handleGenerateReport = async () => {
    if (!caseId) return;
    try {
      setGeneratingReport(true);
      const rep = await generateCaseReport(caseId);
      if (rep) {
        setReportData(rep);
        setReportModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to generate case report:', err);
    } finally {
      setGeneratingReport(false);
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '—';
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-60 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error || !caseDoc) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-12">
        <EmptyState
          title="Case Dossier Not Available"
          description={error || 'The requested verification case could not be located or you are not authorized to view it.'}
          action={
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/resident/cases">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to My Cases
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top back navigation */}
      <Link
        href="/resident/cases"
        className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-cyan-700 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to My Cases
      </Link>

      <PageHeader
        eyebrow="CASE INVESTIGATION DOSSIER · PHASE 10"
        title={caseDoc.title}
        description={`Case Reference: ${caseDoc.caseNumber} · Filed on ${formatDate(caseDoc.createdAt)}`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="border-slate-300 font-bold hover:border-cyan-500 hover:text-cyan-700"
          >
            <FileText className="h-4 w-4 mr-1.5 text-cyan-600" />
            {generatingReport ? 'Generating...' : 'Case Report Dossier'}
          </Button>
        }
      />

      {/* Case Status Strip */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-xs font-extrabold text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded border border-cyan-200">
            {caseDoc.caseNumber}
          </span>
          <CaseStatusBadge status={caseDoc.status} />
          <CaseSeverityBadge severity={caseDoc.severity} />
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Last Updated: {formatDate(caseDoc.updatedAt || caseDoc.createdAt)}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Details & Decision */}
        <div className="space-y-6 lg:col-span-2">
          {/* Official Government Decision (If Recorded) */}
          {caseDoc.decision && (
            <Card className="border-2 border-emerald-500/60 bg-emerald-50/30 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-extrabold text-emerald-900">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" /> Official Government Determination
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2 text-xs">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                  <span className="font-bold text-emerald-800">Determination</span>
                  <Badge variant="secondary" className="border-emerald-300 bg-emerald-100 text-emerald-900 font-extrabold text-xs">
                    {caseDoc.decision.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-emerald-900">Officer Justification &amp; Findings:</span>
                  <p className="rounded-lg bg-white/80 p-3 text-slate-700 leading-relaxed border border-emerald-100">
                    {caseDoc.decisionReason || 'Decision recorded in platform records.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-emerald-700 font-mono">
                  <span>Determined by: {caseDoc.decisionMadeByName || 'Government Officer'}</span>
                  <span>Date: {formatDate(caseDoc.decisionMadeAt)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grievance Description */}
          <Card className="border border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-extrabold text-slate-900">
                Grievance Summary &amp; Description
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2 text-xs text-slate-600 leading-relaxed">
              <p className="rounded-lg bg-slate-50 p-3.5 border border-slate-100 font-medium">
                {caseDoc.decisionReason || caseDoc.title}
              </p>

              {caseDoc.assignedOfficerName && (
                <div className="flex items-center gap-2 text-slate-500 pt-1">
                  <User className="h-3.5 w-3.5 text-cyan-600" />
                  <span>Investigating Officer: <strong className="text-slate-800 font-bold">{caseDoc.assignedOfficerName}</strong></span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attached Evidence */}
          <Card className="border border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-extrabold text-slate-900">
                <span>Submitted Evidence Records</span>
                <span className="text-[11px] font-mono text-slate-400 font-normal">
                  {evidence.length} record{evidence.length === 1 ? '' : 's'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {evidence.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No documentary evidence attached to this case.</p>
              ) : (
                <div className="space-y-2">
                  {evidence.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="font-bold text-slate-800 truncate">{ev.fileName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {ev.type} · {(ev.fileSize / 1024).toFixed(0)} KB · Uploaded {formatDate(ev.createdAt)}
                        </p>
                      </div>

                      {ev.downloadUrl && (
                        <Button asChild size="sm" variant="outline" className="shrink-0 h-7 text-[11px]">
                          <a href={ev.downloadUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3 w-3 mr-1" /> View File
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Document Assistance Notice */}
          <Card className="border border-cyan-200 bg-cyan-50/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-extrabold text-cyan-900 flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-cyan-600" /> AI-Assisted Document &amp; Blueprint Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-1 text-xs text-slate-600">
              <p className="text-[11px] leading-relaxed">
                Supporting sale deeds, sanction blueprints, and tax receipts attached to this case are processed by our optical extraction engine to cross-verify unit dimensions and boundary landmarks against official records.
              </p>
              <p className="text-[10px] font-mono text-cyan-800">
                Status: Available for government officer desk review.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Property Scope & Actions */}
        <div className="space-y-6">
          {/* Property Summary */}
          {property && (
            <Card className="border border-slate-200 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Property Under Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-1 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Building2 className="h-4 w-4 text-cyan-600" />
                  <span>{property.society?.name || 'Society'}</span>
                </div>
                <div className="text-slate-600 pl-6 space-y-1 text-[11px]">
                  <p>Building: <strong className="text-slate-800">{property.building?.name || '—'} ({property.building?.code || '—'})</strong></p>
                  <p>Floor: <strong className="text-slate-800">{property.floor?.floorLabel || `Floor ${property.floor?.floorNumber || '—'}`}</strong></p>
                  <p>Flat: <strong className="text-slate-800">{property.flat?.flatNumber || '—'}</strong> ({property.flat?.unitType || 'Unit'})</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                  <Button asChild size="sm" variant="outline" className="w-full text-xs">
                    <Link href="/resident/property">
                      <Home className="h-3.5 w-3.5 mr-1.5" /> View Property Portal
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="w-full text-xs">
                    <Link href={`/map?society=${property.society?.id || ''}&flat=${property.flat?.id || ''}&mode=3d`}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open in 3D Digital Twin
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Legal Notice Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-500 leading-relaxed">
            <p className="font-bold text-slate-700 mb-1">Cadastral Support Note</p>
            Official case determinations reflect administrative review by the verification officer and do not constitute an autonomous legal land title.
          </div>
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        reportType="CASE"
        data={reportData}
      />
    </div>
  );
}
