'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PERMISSIONS } from '@/types/auth';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  getVerificationCaseById,
  getPropertyDiscrepancy,
  getEvidenceForCase,
  getInvestigationNotes,
  getAuditHistoryForCase,
  updateCaseStatus,
  assignOfficerToCase,
} from '@/lib/society/verificationWorkflowService';
import { getSocietyById } from '@/lib/society/service';
import { getBuilding } from '@/lib/society/buildingService';
import {
  type VerificationCase,
  type PropertyDiscrepancy,
  type VerificationEvidence,
  type InvestigationNote,
  type CaseAuditHistory,
  type CaseStatus,
  CASE_STATUS_LABELS,
  CASE_STATUS_VARIANTS,
  DISCREPANCY_TYPE_LABELS,
  VERIFICATION_DECISION_LABELS,
  VERIFICATION_DECISION_VARIANTS,
} from '@/types/verificationCase';
import { type Society, type Building } from '@/types/society';
import { generateSocietyUlpin } from '@/lib/society/ulpinGenerator';
import { CaseStatusBadge, CaseSeverityBadge } from '@/components/verification/CaseStatusBadge';
import { EvidenceUploader } from '@/components/verification/EvidenceUploader';
import { EvidenceViewer } from '@/components/verification/EvidenceViewer';
import { InvestigationNotesCard } from '@/components/verification/InvestigationNotesCard';
import { DecisionMakerDialog } from '@/components/verification/DecisionMakerDialog';
import { CaseAuditTimeline } from '@/components/verification/CaseAuditTimeline';
import { generateCaseReport, type CaseReportData } from '@/lib/reports/reportService';
import { ReportModal } from '@/components/reports/ReportModal';
import {
  ShieldCheck,
  Building2,
  Layers,
  ArrowLeft,
  UserCheck,
  FileText,
  AlertTriangle,
  History,
  MessageSquare,
  Upload,
  CheckCircle2,
  RefreshCw,
  MapPin,
  ExternalLink,
  Lock,
  Flag,
} from 'lucide-react';

export default function VerificationCaseDetailPage() {
  return (
    <ProtectedRoute permission={PERMISSIONS.VIEW_VERIFICATION_QUEUE}>
      <CaseDetailContent />
    </ProtectedRoute>
  );
}

function CaseDetailContent() {
  const params = useParams();
  const caseId = typeof params.caseId === 'string' ? params.caseId : '';
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core records
  const [caseRecord, setCaseRecord] = useState<VerificationCase | null>(null);
  const [society, setSociety] = useState<Society | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [discrepancies, setDiscrepancies] = useState<PropertyDiscrepancy[]>([]);
  const [evidenceList, setEvidenceList] = useState<VerificationEvidence[]>([]);
  const [notes, setNotes] = useState<InvestigationNote[]>([]);
  const [auditHistory, setAuditHistory] = useState<CaseAuditHistory[]>([]);

  // Modals & form state
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignOfficerName, setAssignOfficerName] = useState('');
  const [assignOfficerId, setAssignOfficerId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Report generation state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<CaseReportData | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Status transition state
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleGenerateReport = async () => {
    if (!caseId) return;
    try {
      setGeneratingReport(true);
      const rep = await generateCaseReport(caseId);
      setReportData(rep);
      setReportModalOpen(true);
    } catch (err) {
      console.error('Failed to generate case report:', err);
      toast({
        variant: 'destructive',
        title: 'Report generation failed',
        description: err instanceof Error ? err.message : 'Unable to generate case report.',
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  const loadCaseData = async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const c = await getVerificationCaseById(caseId);
      if (!c) {
        setError('Verification case record not found.');
        return;
      }
      setCaseRecord(c);

      const [soc, notesList, evList, histList] = await Promise.all([
        getSocietyById(c.societyId),
        getInvestigationNotes(caseId),
        getEvidenceForCase(caseId),
        getAuditHistoryForCase(caseId),
      ]);

      setSociety(soc);
      setNotes(notesList);
      setEvidenceList(evList);
      setAuditHistory(histList);

      if (c.buildingId) {
        const b = await getBuilding(c.societyId, c.buildingId);
        setBuilding(b);
      }

      // Load linked discrepancies
      if (c.discrepancyIds && c.discrepancyIds.length > 0) {
        const discPromises = c.discrepancyIds.map((id) => getPropertyDiscrepancy(id));
        const discResults = await Promise.all(discPromises);
        setDiscrepancies(discResults.filter((d): d is PropertyDiscrepancy => d !== null));
      }
    } catch (err) {
      console.error('Failed to load verification case:', err);
      setError(err instanceof Error ? err.message : 'Unable to load verification case.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCaseData();
  }, [caseId]);

  // Handle officer assignment
  const handleAssignOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseRecord || !assignOfficerName.trim()) return;

    setIsAssigning(true);
    try {
      await assignOfficerToCase({
        caseId,
        officerId: assignOfficerId.trim() || 'GOV_OFFICER_ASSIGNED',
        officerName: assignOfficerName.trim(),
        notes: assignNotes.trim(),
      });

      toast({
        variant: 'success',
        title: 'Officer assigned',
        description: `Case assigned to ${assignOfficerName.trim()}.`,
      });

      setShowAssignModal(false);
      setAssignOfficerName('');
      setAssignOfficerId('');
      setAssignNotes('');
      await loadCaseData();
    } catch (err) {
      console.error('Failed to assign officer:', err);
      toast({
        variant: 'destructive',
        title: 'Assignment failed',
        description: err instanceof Error ? err.message : 'Could not assign officer.',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle controlled status transition
  const handleStatusTransition = async (newStatus: CaseStatus) => {
    if (!caseRecord) return;
    const reason = window.prompt(
      `Enter reason for moving status from ${caseRecord.status} to ${newStatus}:`,
      `Status updated to ${newStatus} during investigation review.`,
    );

    if (!reason || !reason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Reason required',
        description: 'Status updates require an official reason.',
      });
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await updateCaseStatus({
        caseId,
        newStatus,
        reason: reason.trim(),
      });

      toast({
        variant: 'success',
        title: 'Case status updated',
        description: `Case is now marked as ${CASE_STATUS_LABELS[newStatus]}.`,
      });

      await loadCaseData();
    } catch (err) {
      console.error('Failed to update status:', err);
      toast({
        variant: 'destructive',
        title: 'Status update failed',
        description: err instanceof Error ? err.message : 'Something went wrong.',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="py-24 text-center text-xs text-slate-400">
          <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-cyan-600" />
          Loading verification case details and evidence records…
        </div>
      </PageContainer>
    );
  }

  if (error || !caseRecord) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Link href="/government/dashboard">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </Button>
          </Link>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-xs text-red-800">
            <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-600" />
            <p className="font-bold">{error || 'Verification case not found'}</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  const baseUlpin = society ? generateSocietyUlpin(society) : null;
  const isClosed = caseRecord.status === 'RESOLVED' || caseRecord.status === 'REJECTED';

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Navigation strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link
              href="/government/dashboard"
              className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Disputes &amp; Verification
            </Link>
            <span>/</span>
            {society && (
              <>
                <Link
                  href={`/government/societies/${society.id}`}
                  className="font-semibold text-slate-600 hover:text-slate-900"
                >
                  {society.name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="font-mono font-bold text-slate-900">{caseRecord.caseNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            {society && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-1.5 text-xs text-cyan-700 border-cyan-300 bg-cyan-50/50 hover:bg-cyan-100/50"
              >
                <Link
                  href={`/properties/${society.id}/digital-twin${building ? `?building=${building.id}` : ''}`}
                >
                  <Layers className="h-3.5 w-3.5 text-cyan-600" /> View in 3D Digital Twin
                </Link>
              </Button>
            )}
            {society && (
              <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
                <Link
                  href={`/map?society=${society.id}${building ? `&building=${building.id}` : ''}`}
                >
                  <MapPin className="h-3.5 w-3.5 text-slate-500" /> 2D GIS Map
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="gap-1.5 text-xs font-semibold text-slate-700 hover:text-cyan-700"
            >
              <FileText className="h-3.5 w-3.5 text-cyan-600" />
              {generatingReport ? 'Generating…' : 'Generate Case Report'}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowDecisionDialog(true)}
              className="gap-1.5 text-xs font-bold"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Record Decision
            </Button>
          </div>
        </div>

        {/* Case Header Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs font-extrabold text-cyan-700">
                  {caseRecord.caseNumber}
                </span>
                <CaseStatusBadge status={caseRecord.status} />
                <CaseSeverityBadge severity={caseRecord.severity} />
              </div>
              <h1 className="text-xl font-extrabold text-slate-900">{caseRecord.title}</h1>
              <p className="text-xs text-slate-500">
                Created on{' '}
                {caseRecord.createdAt ? caseRecord.createdAt.toLocaleDateString('en-IN') : '—'} by{' '}
                <span className="font-semibold text-slate-700">{caseRecord.createdByName || 'Officer'}</span>
              </p>
            </div>

            {/* Quick Status Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {caseRecord.status === 'OPEN' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAssignModal(true)}
                  className="text-xs font-bold gap-1"
                >
                  <UserCheck className="h-3.5 w-3.5 text-cyan-600" /> Assign Officer
                </Button>
              )}
              {caseRecord.status === 'ASSIGNED' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusTransition('UNDER_INVESTIGATION')}
                  className="text-xs font-bold gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-blue-600" /> Begin Investigation
                </Button>
              )}
              {caseRecord.status === 'UNDER_INVESTIGATION' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusTransition('EVIDENCE_REQUIRED')}
                    className="text-xs font-bold text-amber-700 border-amber-300"
                  >
                    Request Evidence
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusTransition('REINSPECTION_REQUIRED')}
                    className="text-xs font-bold text-blue-700 border-blue-300"
                  >
                    Require Reinspection
                  </Button>
                </>
              )}
              {isClosed && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusTransition('UNDER_INVESTIGATION')}
                  className="text-xs font-bold"
                >
                  Reopen Case
                </Button>
              )}
            </div>
          </div>

          {/* Decision banner if recorded */}
          {caseRecord.decision && (
            <div className="rounded-xl border border-green-200 bg-green-50/70 p-4 text-xs">
              <div className="flex items-center justify-between font-bold text-green-900 pb-1 border-b border-green-200/60">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  Official Determination: {VERIFICATION_DECISION_LABELS[caseRecord.decision]}
                </span>
                <span className="font-mono text-[10px] text-green-700">
                  {caseRecord.decisionMadeAt
                    ? caseRecord.decisionMadeAt.toLocaleString('en-IN')
                    : '—'}
                </span>
              </div>
              <p className="mt-2 text-slate-800 italic">
                &ldquo;{caseRecord.decisionReason}&rdquo;
              </p>
              <p className="mt-1 text-[10px] text-green-800">
                Determined by: {caseRecord.decisionMadeByName || 'Authorized Officer'}
              </p>
            </div>
          )}
        </div>

        {/* 2-Column Main Workspace */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Property Details, Discrepancies, Evidence (7 cols) */}
          <div className="space-y-6 lg:col-span-7">
            {/* Property Hierarchy Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Property &amp; Cadastral Context
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Society / Township
                  </span>
                  <span className="font-bold text-slate-800">{society?.name || '—'}</span>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Building Structure
                  </span>
                  <span className="font-bold text-slate-800">{building?.name || 'All Buildings'}</span>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Cadastral ULPIN
                  </span>
                  <span className="font-mono font-bold text-cyan-800">{baseUlpin || '—'}</span>
                </div>
              </div>
            </div>

            {/* Discrepancies List Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech space-y-3">
              <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
                <Flag className="h-4 w-4 text-red-600" />
                Linked Discrepancy Flags ({discrepancies.length})
              </h3>

              {discrepancies.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-400">
                  No individual discrepancy items linked.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {discrepancies.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="rounded bg-red-100 px-1.5 py-0.5 font-bold text-[9px] text-red-800 uppercase tracking-wider">
                            {DISCREPANCY_TYPE_LABELS[d.type] || d.type}
                          </span>
                          <h4 className="mt-1 font-bold text-slate-900">{d.title}</h4>
                        </div>
                        <CaseSeverityBadge severity={d.severity} />
                      </div>
                      <p className="text-slate-700 leading-relaxed">{d.description}</p>
                      {d.resolution && (
                        <div className="mt-2 rounded-lg bg-green-50 p-2 text-[11px] text-green-900">
                          <strong>Resolution:</strong> {d.resolution}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Evidence Section */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech space-y-3">
                <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
                  <FileText className="h-4 w-4 text-cyan-600" />
                  Attached Verification Evidence ({evidenceList.length})
                </h3>
                <EvidenceViewer evidenceList={evidenceList} />
              </div>

              {/* Evidence Uploader */}
              <EvidenceUploader
                societyId={caseRecord.societyId}
                caseId={caseId}
                buildingId={caseRecord.buildingId}
                floorId={caseRecord.floorId}
                flatId={caseRecord.flatId}
                onUploaded={(ev) => setEvidenceList((prev) => [ev, ...prev])}
              />
            </div>
          </div>

          {/* Right Column: Officer, Notes, Audit Timeline (5 cols) */}
          <div className="space-y-6 lg:col-span-5">
            {/* Officer Assignment Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Assigned Officer
                </h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAssignModal(true)}
                  className="h-7 text-xs font-bold"
                >
                  {caseRecord.assignedOfficerName ? 'Reassign' : 'Assign'}
                </Button>
              </div>

              {caseRecord.assignedOfficerName ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs space-y-1">
                  <p className="font-bold text-slate-900">{caseRecord.assignedOfficerName}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    ID: {caseRecord.assignedOfficerId || '—'}
                  </p>
                  {caseRecord.assignedAt && (
                    <p className="text-[10px] text-slate-500">
                      Assigned:{' '}
                      {caseRecord.assignedAt ? caseRecord.assignedAt.toLocaleDateString('en-IN') : '—'}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 font-semibold">
                  No officer assigned yet. Assign an authorized officer to begin formal investigation.
                </p>
              )}
            </div>

            {/* Investigation Notes Thread */}
            <InvestigationNotesCard
              caseId={caseId}
              notes={notes}
              onNoteAdded={(n) => setNotes((prev) => [...prev, n])}
            />

            {/* Audit History Timeline */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech space-y-3">
              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
                <History className="h-4 w-4 text-cyan-600" />
                Case Audit Timeline ({auditHistory.length})
              </h4>
              <CaseAuditTimeline history={auditHistory} />
            </div>
          </div>
        </div>
      </div>

      {/* Decision Maker Dialog */}
      <DecisionMakerDialog
        caseId={caseId}
        isOpen={showDecisionDialog}
        onClose={() => setShowDecisionDialog(false)}
        onDecisionRecorded={loadCaseData}
      />

      {/* Assign Officer Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-cyan-600" /> Assign Government Officer
            </h3>
            <form onSubmit={handleAssignOfficer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Officer Full Name</label>
                <Input
                  value={assignOfficerName}
                  onChange={(e) => setAssignOfficerName(e.target.value)}
                  placeholder="e.g. Smt. Radha Murthy"
                  required
                  className="text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Officer Code / ID</label>
                <Input
                  value={assignOfficerId}
                  onChange={(e) => setAssignOfficerId(e.target.value)}
                  placeholder="e.g. KA-REV-0412"
                  className="text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Assignment Instructions</label>
                <Textarea
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="e.g. Conduct field survey of unit boundary and verify elevation measurements…"
                  rows={2}
                  className="text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssignModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isAssigning} className="font-bold">
                  {isAssigning ? 'Assigning…' : 'Confirm Assignment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Case Report Dossier Modal */}
      <ReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        reportType="CASE"
        data={reportData}
      />
    </PageContainer>
  );
}
