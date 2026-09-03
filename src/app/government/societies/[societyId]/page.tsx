'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PERMISSIONS } from '@/types/auth';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { SafeImage } from '@/components/ui/SafeImage';
import {
  getSocietyFullHierarchy,
  recordVerificationDecision,
  createDiscrepancy,
  updateDiscrepancyStatus,
  type SocietyFullHierarchyData,
} from '@/lib/society/governmentService';
import {
  type CreateDiscrepancyPayload,
  type Discrepancy,
  type DiscrepancyCategory,
  type DiscrepancyStatus,
  type GovVerificationStatus,
  type VerificationTargetType,
  DISCREPANCY_CATEGORIES,
  DISCREPANCY_CATEGORY_LABELS,
  DISCREPANCY_STATUS_LABELS,
  DISCREPANCY_STATUS_VARIANTS,
  GOV_VERIFICATION_STATUS_LABELS,
  GOV_VERIFICATION_STATUS_VARIANTS,
  OCCUPANCY_TYPE_LABELS,
  RESIDENT_STATUS_LABELS,
  RESIDENT_STATUS_VARIANTS,
  BUILDING_TYPE_LABELS,
  FLOOR_TYPE_LABELS,
} from '@/types/society';
import {
  generateSocietyUlpin,
  generateBuildingSpatialId,
  generate3DVerticalSubUlpin,
} from '@/lib/society/ulpinGenerator';
import {
  getVerificationCasesForSociety,
} from '@/lib/society/verificationWorkflowService';
import {
  type VerificationCase,
  CASE_STATUS_LABELS,
  DISCREPANCY_SEVERITY_LABELS,
} from '@/types/verificationCase';
import { CaseStatusBadge, CaseSeverityBadge } from '@/components/verification/CaseStatusBadge';
import { CreateDiscrepancyModal } from '@/components/verification/CreateDiscrepancyModal';
import { generateSocietyReport, type SocietyReportData } from '@/lib/reports/reportService';
import { ReportModal } from '@/components/reports/ReportModal';
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
  XCircle,
  FileCheck2,
  History,
  ArrowLeft,
  RefreshCw,
  MapPin,
  Calendar,
  Layers,
  Users,
  Flag,
  ShieldCheck,
  Building,
  Home,
  FileText,
  UserCheck,
  Info,
  Check,
  Landmark,
  ArrowRight,
  Search,
  Eye,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Plus,
  BarChart3,
} from 'lucide-react';

export default function GovernmentSocietyVerificationPage() {
  return (
    <ProtectedRoute permission={PERMISSIONS.VIEW_VERIFICATION_QUEUE}>
      <SocietyVerificationContent />
    </ProtectedRoute>
  );
}

function SocietyVerificationContent() {
  const params = useParams();
  const societyId = typeof params.societyId === 'string' ? params.societyId : '';
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SocietyFullHierarchyData | null>(null);
  const [cases, setCases] = useState<VerificationCase[]>([]);

  // Active tab
  const [activeTab, setActiveTab] = useState<
    'society' | 'buildings' | 'residents' | 'cases' | 'discrepancies' | 'history'
  >('society');

  // Discrepancy modal target
  const [showNewDiscrepancyModal, setShowNewDiscrepancyModal] = useState(false);
  const [modalTargetBuilding, setModalTargetBuilding] = useState<{ id?: string; name?: string } | null>(null);
  const [modalTargetFlat, setModalTargetFlat] = useState<{ id?: string; number?: string; floorId?: string; floorLabel?: string } | null>(null);

  // Selected building in property explorer
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  // Verification decision form state
  const [decisionTarget, setDecisionTarget] = useState<{
    targetType: VerificationTargetType;
    targetId: string;
    targetName: string;
    buildingId?: string;
    floorId?: string;
    flatId?: string;
    currentStatus: GovVerificationStatus;
  } | null>(null);

  const [selectedStatus, setSelectedStatus] = useState<GovVerificationStatus>('verified');
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [decisionEvidence, setDecisionEvidence] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [showConfirmDecision, setShowConfirmDecision] = useState(false);

  // Discrepancy creation modal
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [discrepancyCategory, setDiscrepancyCategory] =
    useState<DiscrepancyCategory>('society_mismatch');
  const [discrepancyDescription, setDiscrepancyDescription] = useState('');
  const [discrepancyTargetType, setDiscrepancyTargetType] =
    useState<VerificationTargetType>('society');
  const [discrepancyTargetId, setDiscrepancyTargetId] = useState('');
  const [isSubmittingDiscrepancy, setIsSubmittingDiscrepancy] = useState(false);

  // Discrepancy update modal
  const [editingDiscrepancy, setEditingDiscrepancy] = useState<Discrepancy | null>(null);
  const [newDiscrepancyStatus, setNewDiscrepancyStatus] = useState<DiscrepancyStatus>('resolved');
  const [discrepancyResolutionNotes, setDiscrepancyResolutionNotes] = useState('');
  const [isUpdatingDiscrepancy, setIsUpdatingDiscrepancy] = useState(false);

  // Report generation state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<SocietyReportData | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const handleGenerateReport = async () => {
    if (!societyId) return;
    try {
      setGeneratingReport(true);
      const rep = await generateSocietyReport(societyId);
      setReportData(rep);
      setReportModalOpen(true);
    } catch (err) {
      console.error('Failed to generate society report:', err);
      toast({
        variant: 'destructive',
        title: 'Report generation failed',
        description: 'Could not generate society verification report.',
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  // Load complete hierarchy and verification cases
  const loadHierarchy = async () => {
    if (!societyId) return;
    setLoading(true);
    setError(null);
    try {
      const [hierarchy, casesList] = await Promise.all([
        getSocietyFullHierarchy(societyId),
        getVerificationCasesForSociety(societyId),
      ]);
      if (!hierarchy) {
        setError('Society not found.');
      } else {
        setData(hierarchy);
        setCases(casesList);
        if (hierarchy.buildings.length > 0 && !selectedBuildingId) {
          setSelectedBuildingId(hierarchy.buildings[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load society hierarchy:', err);
      setError(err instanceof Error ? err.message : 'Unable to load society details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHierarchy();
  }, [societyId]);

  const activeBuilding = useMemo(() => {
    if (!data || !data.buildings) return null;
    return (
      data.buildings.find((b) => b.id === selectedBuildingId) || data.buildings[0] || null
    );
  }, [data, selectedBuildingId]);

  // Open decision dialog
  const openDecisionModal = (
    targetType: VerificationTargetType,
    targetId: string,
    targetName: string,
    currentStatus: GovVerificationStatus = 'pending',
    buildingId?: string,
    floorId?: string,
    flatId?: string,
  ) => {
    setDecisionTarget({
      targetType,
      targetId,
      targetName,
      buildingId,
      floorId,
      flatId,
      currentStatus,
    });
    setSelectedStatus(currentStatus === 'pending' ? 'verified' : currentStatus);
    setDecisionRemarks('');
    setDecisionEvidence('');
  };

  // Execute verification decision
  const handleExecuteDecision = async () => {
    if (!decisionTarget || !data) return;

    if (!decisionRemarks.trim()) {
      toast({
        variant: 'destructive',
        title: 'Remarks required',
        description: 'Please provide official remarks for this verification decision.',
      });
      return;
    }

    setIsSubmittingDecision(true);
    try {
      const evidenceList = decisionEvidence
        .split('\n')
        .map((e) => e.trim())
        .filter(Boolean);

      await recordVerificationDecision({
        targetType: decisionTarget.targetType,
        targetId: decisionTarget.targetId,
        societyId: data.society.id,
        buildingId: decisionTarget.buildingId,
        floorId: decisionTarget.floorId,
        flatId: decisionTarget.flatId,
        status: selectedStatus,
        remarks: decisionRemarks.trim(),
        evidenceReferences: evidenceList,
      });

      toast({
        variant: 'success',
        title: 'Verification decision recorded',
        description: `Marked ${decisionTarget.targetName} as ${GOV_VERIFICATION_STATUS_LABELS[selectedStatus]}.`,
      });

      setDecisionTarget(null);
      setShowConfirmDecision(false);
      await loadHierarchy();
    } catch (err) {
      console.error('Failed to record verification decision:', err);
      toast({
        variant: 'destructive',
        title: 'Decision recording failed',
        description: err instanceof Error ? err.message : 'Something went wrong.',
      });
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Submit new discrepancy flag
  const handleCreateDiscrepancy = async () => {
    if (!data || !discrepancyDescription.trim()) {
      toast({
        variant: 'destructive',
        title: 'Description required',
        description: 'Please explain the discrepancy observed during inspection.',
      });
      return;
    }

    setIsSubmittingDiscrepancy(true);
    try {
      await createDiscrepancy({
        societyId: data.society.id,
        targetType: discrepancyTargetType,
        targetId: discrepancyTargetId || data.society.id,
        category: discrepancyCategory,
        description: discrepancyDescription.trim(),
      });

      toast({
        variant: 'success',
        title: 'Discrepancy flag raised',
        description: 'Flag recorded in official registry and attached to audit log.',
      });

      setShowDiscrepancyModal(false);
      setDiscrepancyDescription('');
      await loadHierarchy();
    } catch (err) {
      console.error('Failed to raise discrepancy:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to create flag',
        description: err instanceof Error ? err.message : 'Something went wrong.',
      });
    } finally {
      setIsSubmittingDiscrepancy(false);
    }
  };

  // Update discrepancy status
  const handleUpdateDiscrepancy = async () => {
    if (!editingDiscrepancy) return;

    setIsUpdatingDiscrepancy(true);
    try {
      await updateDiscrepancyStatus(
        editingDiscrepancy.id,
        newDiscrepancyStatus,
        discrepancyResolutionNotes.trim() || undefined,
      );

      toast({
        variant: 'success',
        title: 'Discrepancy status updated',
        description: `Flag marked as ${DISCREPANCY_STATUS_LABELS[newDiscrepancyStatus]}.`,
      });

      setEditingDiscrepancy(null);
      setDiscrepancyResolutionNotes('');
      await loadHierarchy();
    } catch (err) {
      console.error('Failed to update discrepancy:', err);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Something went wrong.',
      });
    } finally {
      setIsUpdatingDiscrepancy(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="py-24 text-center text-xs text-slate-400">
          <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-cyan-600" />
          Loading full society hierarchy and verification records…
        </div>
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Link href="/government/societies">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Societies
            </Button>
          </Link>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-xs text-red-800">
            <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-600" />
            <p className="font-bold">{error || 'Society not found'}</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  const { society, societyVerification, buildings, residents, discrepancies, history } = data;
  const overallSocietyStatus: GovVerificationStatus = societyVerification
    ? societyVerification.status
    : 'pending';

  const baseUlpin = generateSocietyUlpin(society);

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Top bar navigation & actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link
              href="/government/societies"
              className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Societies Directory
            </Link>
            <span>/</span>
            <span className="font-bold text-slate-900">{society.name}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1.5 text-xs text-cyan-700 border-cyan-300 bg-cyan-50/50 hover:bg-cyan-100/50"
            >
              <Link href={`/government/societies/${society.id}/analytics`}>
                <BarChart3 className="h-3.5 w-3.5 text-cyan-600" /> Society Analytics
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="gap-1.5 text-xs font-semibold text-slate-700 hover:text-cyan-700"
            >
              <FileText className="h-3.5 w-3.5 text-cyan-600" />
              {generatingReport ? 'Generating…' : 'Generate Society Report'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1.5 text-xs text-cyan-700 border-cyan-300 bg-cyan-50/50 hover:bg-cyan-100/50"
            >
              <Link href={`/map?society=${society.id}&ulpin=${baseUlpin}`}>
                <Layers className="h-3.5 w-3.5 text-cyan-600" /> Inspect on 2D GIS Map
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDiscrepancyTargetType('society');
                setDiscrepancyTargetId(society.id);
                setShowDiscrepancyModal(true);
              }}
              className="gap-1.5 text-xs"
            >
              <Flag className="h-3.5 w-3.5 text-red-500" /> Raise Discrepancy
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() =>
                openDecisionModal(
                  'society',
                  society.id,
                  society.name,
                  overallSocietyStatus,
                )
              }
              className="gap-1.5 text-xs"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Record Verification
            </Button>
          </div>
        </div>

        {/* Society Header Overview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-extrabold text-slate-900">{society.name}</h1>
                <Badge
                  variant={GOV_VERIFICATION_STATUS_VARIANTS[overallSocietyStatus]}
                  className="text-xs"
                >
                  {GOV_VERIFICATION_STATUS_LABELS[overallSocietyStatus]}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                {society.type} • Cadastral Base ULPIN:{' '}
                <span className="font-mono font-bold text-cyan-800">{baseUlpin}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Buildings
                </span>
                <p className="mt-0.5 text-base font-extrabold text-slate-800">
                  {buildings.length}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Residents
                </span>
                <p className="mt-0.5 text-base font-extrabold text-slate-800">
                  {residents.length}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Open Flags
                </span>
                <p className="mt-0.5 text-base font-extrabold text-red-600">
                  {discrepancies.filter((d) => d.status === 'open' || d.status === 'under-review').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Workbench Tabs Navigation */}
        <div className="flex flex-wrap border-b border-slate-200 text-xs font-semibold gap-1">
          {[
            { key: 'society', label: '1. Society Master Verification', icon: Landmark },
            { key: 'buildings', label: `2. Property Structure (${buildings.length})`, icon: Building },
            { key: 'residents', label: `3. Resident Applications (${residents.length})`, icon: Users },
            { key: 'cases', label: `4. Verification Cases (${cases.length})`, icon: ShieldCheck },
            { key: 'discrepancies', label: `5. Discrepancies & Flags (${discrepancies.length})`, icon: Flag },
            { key: 'history', label: `6. Audit History (${history.length})`, icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
                  active
                    ? 'border-cyan-600 text-cyan-800 font-bold bg-cyan-50/40 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? 'text-cyan-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Society Master Verification */}
        {activeTab === 'society' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              {/* Society Master Details Panel */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Society Master Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Registration Number
                    </span>
                    <p className="font-mono font-bold text-slate-800">
                      {society.registrationNumber || 'Not provided'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Established Year
                    </span>
                    <p className="font-bold text-slate-800">
                      {society.establishedYear || 'Not provided'}
                    </p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Registered Address
                    </span>
                    <p className="font-medium text-slate-800">
                      {society.address.line1}
                      {society.address.line2 ? `, ${society.address.line2}` : ''},{' '}
                      {society.address.city}
                      {society.address.district ? `, ${society.address.district}` : ''},{' '}
                      {society.address.state} — {society.address.pinCode}
                    </p>
                  </div>
                  {society.description && (
                    <div className="space-y-1 sm:col-span-2">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        Description / Scope
                      </span>
                      <p className="text-slate-600 leading-relaxed">{society.description}</p>
                    </div>
                  )}
                </div>

                {/* Location Metadata */}
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/40 p-3.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1">
                    <MapPin className="h-3.5 w-3.5 text-blue-600" /> Location Coordinates
                  </div>
                  <p className="font-mono text-[11px] text-slate-700">
                    Latitude: {society.location.latitude ?? '—'} | Longitude:{' '}
                    {society.location.longitude ?? '—'}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Source: {society.location.source} • Status: {society.location.dataStatus}{' '}
                    (Illustrative reference).
                  </p>
                </div>

                {/* Society image preview if available */}
                {society.imageUrl && (
                  <div className="mt-4">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                      Submitted Society Photo
                    </span>
                    <div className="h-48 w-full max-w-md overflow-hidden rounded-xl border border-slate-200">
                      <SafeImage
                        src={society.imageUrl}
                        alt={society.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Decision Status Box (4 cols) */}
            <div className="space-y-5 lg:col-span-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900">Official Decision</h3>
                  <Badge
                    variant={GOV_VERIFICATION_STATUS_VARIANTS[overallSocietyStatus]}
                    className="text-xs"
                  >
                    {GOV_VERIFICATION_STATUS_LABELS[overallSocietyStatus]}
                  </Badge>
                </div>

                {societyVerification && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs space-y-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        Verified By
                      </span>
                      <p className="font-semibold text-slate-800">
                        {societyVerification.verifiedByOfficerName || 'Authorized Officer'}
                      </p>
                    </div>
                    {societyVerification.verifiedAt && (
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">
                          Timestamp
                        </span>
                        <p className="font-mono text-slate-600">
                          {societyVerification.verifiedAt.toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        Officer Remarks
                      </span>
                      <p className="text-slate-700 italic">
                        &ldquo;{societyVerification.remarks}&rdquo;
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() =>
                    openDecisionModal(
                      'society',
                      society.id,
                      society.name,
                      overallSocietyStatus,
                    )
                  }
                  className="w-full text-xs font-bold"
                >
                  <ShieldCheck className="h-4 w-4 mr-1.5" />
                  {societyVerification ? 'Update Decision' : 'Record Verification'}
                </Button>
              </div>

              {/* Distinction notice */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
                <p className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Government Verification Note:</strong> Recording an official decision
                    reflects government cadastral review and does not constitute legal title
                    ownership confirmation.
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Property Structure (Buildings → Floors → Flats) */}
        {activeTab === 'buildings' && (
          <div className="space-y-6">
            {buildings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-500 shadow-tech">
                <Building className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                <p className="text-sm font-bold text-slate-800">No buildings registered</p>
                <p className="mt-1 text-slate-400">
                  The society admin has not added buildings to this society yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Buildings selector sidebar (4 cols) */}
                <div className="space-y-3 lg:col-span-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Buildings ({buildings.length})
                  </h3>
                  <div className="space-y-2">
                    {buildings.map((b) => {
                      const isSelected = b.id === activeBuilding?.id;
                      const bStatus: GovVerificationStatus = b.verification
                        ? b.verification.status
                        : 'pending';

                      return (
                        <div
                          key={b.id}
                          onClick={() => setSelectedBuildingId(b.id)}
                          className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                            isSelected
                              ? 'border-cyan-600 bg-cyan-50/50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-slate-900 text-xs">{b.name}</h4>
                              <p className="font-mono text-[10px] text-slate-400">
                                Code: {b.code} • {b.type}
                              </p>
                            </div>
                            <Badge
                              variant={GOV_VERIFICATION_STATUS_VARIANTS[bStatus]}
                              className="text-[9px]"
                            >
                              {GOV_VERIFICATION_STATUS_LABELS[bStatus]}
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                            <span>{b.floorCount} Floors</span>
                            <span>•</span>
                            <span>
                              {b.floors.reduce((acc, f) => acc + f.flats.length, 0)} Flats
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Building Details & Floor Explorer (8 cols) */}
                {activeBuilding && (
                  <div className="space-y-5 lg:col-span-8">
                    {/* Building Info Card */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-extrabold text-slate-900">
                              {activeBuilding.name}
                            </h3>
                            <Badge
                              variant={
                                GOV_VERIFICATION_STATUS_VARIANTS[
                                  activeBuilding.verification
                                    ? activeBuilding.verification.status
                                    : 'pending'
                                ]
                              }
                              className="text-[10px]"
                            >
                              {
                                GOV_VERIFICATION_STATUS_LABELS[
                                  activeBuilding.verification
                                    ? activeBuilding.verification.status
                                    : 'pending'
                                ]
                              }
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {BUILDING_TYPE_LABELS[activeBuilding.type]} • Code:{' '}
                            {activeBuilding.code}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDiscrepancyTargetType('building');
                              setDiscrepancyTargetId(activeBuilding.id);
                              setShowDiscrepancyModal(true);
                            }}
                            className="text-xs h-8"
                          >
                            <Flag className="h-3 w-3 mr-1 text-red-500" /> Flag
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() =>
                              openDecisionModal(
                                'building',
                                activeBuilding.id,
                                `Building: ${activeBuilding.name}`,
                                activeBuilding.verification
                                  ? activeBuilding.verification.status
                                  : 'pending',
                                activeBuilding.id,
                              )
                            }
                            className="text-xs h-8"
                          >
                            <ShieldCheck className="h-3 w-3 mr-1" /> Verify Building
                          </Button>
                        </div>
                      </div>

                      {/* Building specs grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3">
                        <div className="rounded-lg bg-slate-50 p-2.5">
                          <span className="text-[10px] text-slate-400 font-bold block">Floors</span>
                          <span className="font-bold text-slate-800">
                            {activeBuilding.floorCount} (Basement: {activeBuilding.basementFloors})
                          </span>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-2.5">
                          <span className="text-[10px] text-slate-400 font-bold block">
                            Planned Flats
                          </span>
                          <span className="font-bold text-slate-800">
                            {activeBuilding.plannedFlatCount}
                          </span>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-2.5">
                          <span className="text-[10px] text-slate-400 font-bold block">Lifts</span>
                          <span className="font-bold text-slate-800">
                            {activeBuilding.liftAvailable
                              ? `${activeBuilding.liftCount} available`
                              : 'None'}
                          </span>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-2.5">
                          <span className="text-[10px] text-slate-400 font-bold block">Parking</span>
                          <span className="font-bold text-slate-800">
                            {activeBuilding.parkingAvailable
                              ? `${activeBuilding.parkingCapacity} bays`
                              : 'None'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Floors & Flats Structure */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        Floors & Property Units ({activeBuilding.floors.length} Floors)
                      </h4>

                      {activeBuilding.floors.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-400">
                          No floors configured for this building.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {activeBuilding.floors.map((floor) => (
                            <div
                              key={floor.id}
                              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
                            >
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-[11px] font-bold text-white">
                                    {floor.floorNumber}
                                  </span>
                                  <span className="font-bold text-xs text-slate-800">
                                    {floor.floorLabel} ({FLOOR_TYPE_LABELS[floor.floorType]})
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {floor.flats.length} flats
                                </span>
                              </div>

                              {/* Flats Grid */}
                              {floor.flats.length === 0 ? (
                                <p className="text-[11px] text-slate-400 italic py-1">
                                  No flats added to this floor.
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                  {floor.flats.map((flat) => {
                                    const flatStatus: GovVerificationStatus = flat.verification
                                      ? flat.verification.status
                                      : 'pending';

                                    const flat3dUlpin = generate3DVerticalSubUlpin(
                                      baseUlpin,
                                      floor.floorNumber,
                                      flat.flatNumber,
                                    );

                                    return (
                                      <div
                                        key={flat.id}
                                        className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs flex flex-col justify-between space-y-2 hover:border-slate-300 transition-colors"
                                      >
                                        <div>
                                          <div className="flex items-center justify-between">
                                            <span className="font-extrabold text-slate-900">
                                              Flat {flat.flatNumber}
                                            </span>
                                            <Badge
                                              variant={GOV_VERIFICATION_STATUS_VARIANTS[flatStatus]}
                                              className="text-[9px] px-1 py-0"
                                            >
                                              {GOV_VERIFICATION_STATUS_LABELS[flatStatus]}
                                            </Badge>
                                          </div>
                                          <p className="font-mono text-[9.5px] font-bold text-cyan-800 mt-1 break-all">
                                            {flat3dUlpin}
                                          </p>
                                          <p className="text-[10px] text-slate-500 mt-0.5">
                                            {flat.unitType} • {flat.area ? `${flat.area} sqft` : '—'}
                                            {flat.facing ? ` • Facing: ${flat.facing}` : ''}
                                          </p>
                                          {flat.verification?.remarks && (
                                            <p className="text-[10px] text-slate-600 italic mt-1 line-clamp-1">
                                              &ldquo;{flat.verification.remarks}&rdquo;
                                            </p>
                                          )}
                                        </div>

                                        <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between gap-1">
                                          <div className="flex items-center gap-2">
                                            <Link
                                              href={`/map?society=${society.id}&building=${activeBuilding.id}&flat=${flat.id}`}
                                              className="text-[9.5px] font-bold text-cyan-700 hover:underline inline-flex items-center gap-0.5"
                                              title="Inspect unit on 2D GIS Map"
                                            >
                                              <Layers className="h-3 w-3" /> Map
                                            </Link>
                                            <button
                                              onClick={() => {
                                                setDiscrepancyTargetType('flat');
                                                setDiscrepancyTargetId(flat.id);
                                                setShowDiscrepancyModal(true);
                                              }}
                                              className="text-[9.5px] font-bold text-red-600 hover:underline"
                                            >
                                              Flag
                                            </button>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                              openDecisionModal(
                                                'flat',
                                                flat.id,
                                                `Flat ${flat.flatNumber} (${activeBuilding.name})`,
                                                flatStatus,
                                                activeBuilding.id,
                                                floor.id,
                                                flat.id,
                                              )
                                            }
                                            className="h-6 text-[10px] px-2"
                                          >
                                            Verify Flat
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Resident Applications Review */}
        {activeTab === 'residents' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-900">
              <p className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Privacy Notice:</strong> Government Officers can review resident
                  application claims for official verification. Officers cannot edit resident
                  personal profiles. Society Admin residency approval is distinct from Government
                  cadastre verification.
                </span>
              </p>
            </div>

            {residents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-500 shadow-tech">
                <Users className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                <p className="text-sm font-bold text-slate-800">No resident records found</p>
                <p className="mt-1 text-slate-400">
                  No resident registration applications have been submitted for this society.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {residents.map((resident) => {
                  const rVerificationStatus: GovVerificationStatus = resident.verification
                    ? resident.verification.status
                    : 'pending';

                  return (
                    <div
                      key={resident.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900">
                              {resident.profile.fullName}
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              {OCCUPANCY_TYPE_LABELS[resident.occupancy.type]} •{' '}
                              {resident.occupancy.residentCount} occupants
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              variant={RESIDENT_STATUS_VARIANTS[resident.status]}
                              className="text-[9px]"
                            >
                              Society: {RESIDENT_STATUS_LABELS[resident.status]}
                            </Badge>
                            <Badge
                              variant={GOV_VERIFICATION_STATUS_VARIANTS[rVerificationStatus]}
                              className="text-[9px]"
                            >
                              Gov: {GOV_VERIFICATION_STATUS_LABELS[rVerificationStatus]}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600 bg-slate-50 rounded-xl p-3">
                          <p>
                            <span className="font-semibold text-slate-700">Flat Claim:</span> Flat{' '}
                            {resident.flatId} (Building {resident.buildingId})
                          </p>
                          {resident.occupancy.moveInDate && (
                            <p>
                              <span className="font-semibold text-slate-700">Move-in Date:</span>{' '}
                              {resident.occupancy.moveInDate}
                            </p>
                          )}
                          {resident.profile.emergencyContactName && (
                            <p>
                              <span className="font-semibold text-slate-700">Emergency:</span>{' '}
                              {resident.profile.emergencyContactName}
                            </p>
                          )}
                          {resident.verification?.remarks && (
                            <p className="mt-1 pt-1 border-t border-slate-200 text-slate-700 italic">
                              Gov Remarks: &ldquo;{resident.verification.remarks}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => {
                            setDiscrepancyTargetType('resident');
                            setDiscrepancyTargetId(resident.id);
                            setShowDiscrepancyModal(true);
                          }}
                          className="text-xs font-bold text-red-600 hover:underline"
                        >
                          Flag Discrepancy
                        </button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            openDecisionModal(
                              'resident',
                              resident.id,
                              `Resident: ${resident.profile.fullName}`,
                              rVerificationStatus,
                              resident.buildingId,
                              resident.floorId,
                              resident.flatId,
                            )
                          }
                          className="text-xs h-8"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                          Verify Resident Claim
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Official Verification Cases */}
        {activeTab === 'cases' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Official Verification &amp; Dispute Cases ({cases.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Active cadastral investigation workflows, evidence gathering, and official determinations.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setModalTargetBuilding(null);
                  setModalTargetFlat(null);
                  setShowNewDiscrepancyModal(true);
                }}
                className="gap-1.5 text-xs font-bold"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Open Verification Case
              </Button>
            </div>

            {cases.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-500 shadow-tech">
                <ShieldCheck className="mx-auto mb-2 h-10 w-10 text-cyan-600" />
                <p className="text-sm font-bold text-slate-800">No active verification cases</p>
                <p className="mt-1 text-slate-400">
                  All properties in this society are operating under standard verification status.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-tech space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-[10px] font-extrabold text-cyan-700">
                            {c.caseNumber}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm">{c.title}</h4>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <CaseStatusBadge status={c.status} />
                          <CaseSeverityBadge severity={c.severity} />
                        </div>
                      </div>

                      <div className="mt-2.5 rounded-xl bg-slate-50 p-2.5 text-xs space-y-1 text-slate-600">
                        <p className="text-[11px]">
                          <strong>Target Scope:</strong>{' '}
                          {c.buildingId ? `Building ${c.buildingId}` : 'Society Level'}
                          {c.flatId ? ` • Flat ${c.flatId}` : ''}
                        </p>
                        <p className="text-[11px]">
                          <strong>Assigned Officer:</strong> {c.assignedOfficerName || 'Unassigned'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Created on {c.createdAt ? c.createdAt.toLocaleDateString('en-IN') : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {c.discrepancyIds.length} Linked Discrepanc{c.discrepancyIds.length === 1 ? 'y' : 'ies'}
                      </span>
                      <Button size="sm" variant="default" asChild className="text-xs h-7 font-bold gap-1">
                        <Link href={`/government/cases/${c.id}`}>
                          Inspect Case &amp; Evidence <ShieldCheck className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Discrepancies & Flags */}
        {activeTab === 'discrepancies' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Discrepancy Flags</h3>
                <p className="text-[11px] text-slate-500">
                  Issues, mismatches, or missing documentation identified by government officers.
                </p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setDiscrepancyTargetType('society');
                  setDiscrepancyTargetId(society.id);
                  setShowDiscrepancyModal(true);
                }}
                className="text-xs"
              >
                <Flag className="h-3.5 w-3.5 mr-1" /> Raise New Flag
              </Button>
            </div>

            {discrepancies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-500 shadow-tech">
                <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-500" />
                <p className="text-sm font-bold text-slate-800">No discrepancies flagged</p>
                <p className="mt-1 text-slate-400">
                  No open issues or data mismatches recorded for this society.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {discrepancies.map((disc) => (
                  <div
                    key={disc.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="outline" className="text-[10px] mb-1 capitalize">
                            Target: {disc.targetType}
                          </Badge>
                          <h4 className="font-extrabold text-xs text-slate-900">
                            {DISCREPANCY_CATEGORY_LABELS[disc.category]}
                          </h4>
                        </div>
                        <Badge
                          variant={DISCREPANCY_STATUS_VARIANTS[disc.status]}
                          className="text-[10px]"
                        >
                          {DISCREPANCY_STATUS_LABELS[disc.status]}
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-700 mt-2 font-medium leading-relaxed">
                        {disc.description}
                      </p>

                      {disc.resolutionNotes && (
                        <div className="mt-2 rounded-lg bg-green-50/70 border border-green-200 p-2.5 text-xs text-green-900">
                          <span className="font-bold block text-[10px] uppercase">
                            Resolution Notes:
                          </span>
                          {disc.resolutionNotes}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        Flagged by {disc.officerName || 'Officer'} on{' '}
                        {disc.createdAt ? disc.createdAt.toLocaleDateString('en-IN') : '—'}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingDiscrepancy(disc);
                          setNewDiscrepancyStatus(disc.status);
                          setDiscrepancyResolutionNotes(disc.resolutionNotes || '');
                        }}
                        className="text-xs h-7"
                      >
                        Update Status
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: Audit History */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Official Verification Audit Trail
              </h3>
              <p className="text-[11px] text-slate-500">
                Immutable chronological log of all government verification actions.
              </p>
            </div>

            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-500 shadow-tech">
                <History className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                <p className="text-sm font-bold text-slate-800">No audit records yet</p>
                <p className="mt-1 text-slate-400">
                  Verification actions taken on this society will be logged here automatically.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-tech">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Target</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Status Transition</th>
                      <th className="px-4 py-3">Officer</th>
                      <th className="px-4 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {h.createdAt ? h.createdAt.toLocaleString('en-IN') : '—'}
                        </td>
                        <td className="px-4 py-3 font-semibold capitalize text-slate-800">
                          {h.targetType}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900">{h.action}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-slate-400">{h.previousStatus || 'none'}</span>
                          <span className="mx-1 text-slate-400">→</span>
                          <Badge
                            variant={GOV_VERIFICATION_STATUS_VARIANTS[h.newStatus]}
                            className="text-[9px]"
                          >
                            {h.newStatus}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          {h.officerName || 'Officer'}
                        </td>
                        <td className="px-4 py-3 text-slate-700 italic max-w-xs truncate">
                          {h.remarks || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Decision Modal ──────────────────────────────────────────────────── */}
      {decisionTarget && (
        <Dialog
          open={decisionTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDecisionTarget(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold text-slate-900">
                Record Verification Decision
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Target: <strong>{decisionTarget.targetName}</strong> ({decisionTarget.targetType})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Verification Decision Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'verified', label: 'Verified', variant: 'success' },
                    { key: 'needs-review', label: 'Needs Review', variant: 'default' },
                    { key: 'flagged', label: 'Flag Discrepancy', variant: 'destructive' },
                    { key: 'rejected', label: 'Reject', variant: 'destructive' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setSelectedStatus(s.key as GovVerificationStatus)}
                      className={`rounded-xl border p-2.5 text-center font-bold text-xs transition-all ${
                        selectedStatus === s.key
                          ? 'border-cyan-600 bg-cyan-50/70 text-cyan-900 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Official Remarks & Findings <span className="text-red-500">*</span>
                </label>
                <Textarea
                  rows={3}
                  value={decisionRemarks}
                  onChange={(e) => setDecisionRemarks(e.target.value)}
                  placeholder="Record cadastral observations, survey notes, reasons for decision..."
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Evidence References (Optional, one per line)
                </label>
                <Textarea
                  rows={2}
                  value={decisionEvidence}
                  onChange={(e) => setDecisionEvidence(e.target.value)}
                  placeholder="Registration certificate number, municipal scan link, survey map doc ID..."
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDecisionTarget(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setShowConfirmDecision(true)}
                disabled={isSubmittingDecision || !decisionRemarks.trim()}
                className="text-xs font-bold"
              >
                Confirm & Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Dialog before submitting decision */}
      <ConfirmationDialog
        open={showConfirmDecision}
        onOpenChange={(open) => setShowConfirmDecision(open)}
        title="Confirm Verification Decision?"
        description={`You are about to record status '${GOV_VERIFICATION_STATUS_LABELS[selectedStatus]}' for ${decisionTarget?.targetName}. This decision will be stamped with your authenticated officer UID and written to the permanent audit history.`}
        confirmLabel="Yes, Record Decision"
        tone={
          selectedStatus === 'verified'
            ? 'success'
            : selectedStatus === 'rejected'
            ? 'destructive'
            : 'default'
        }
        onConfirm={handleExecuteDecision}
        loading={isSubmittingDecision}
      />

      {/* ── Raise Discrepancy Flag Modal ────────────────────────────────────── */}
      <Dialog open={showDiscrepancyModal} onOpenChange={setShowDiscrepancyModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Flag className="h-4 w-4 text-red-500" /> Raise Discrepancy Flag
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Flag an issue, structural mismatch, or missing evidence for official investigation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Discrepancy Category
              </label>
              <select
                value={discrepancyCategory}
                onChange={(e) => setDiscrepancyCategory(e.target.value as DiscrepancyCategory)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 outline-none"
              >
                {DISCREPANCY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {DISCREPANCY_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Detailed Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                rows={4}
                value={discrepancyDescription}
                onChange={(e) => setDiscrepancyDescription(e.target.value)}
                placeholder="Explain the mismatch, missing verification requirement, or conflicting data..."
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDiscrepancyModal(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleCreateDiscrepancy}
              disabled={isSubmittingDiscrepancy || !discrepancyDescription.trim()}
              className="text-xs font-bold"
            >
              {isSubmittingDiscrepancy ? 'Submitting…' : 'Raise Flag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Update Discrepancy Modal ────────────────────────────────────────── */}
      {editingDiscrepancy && (
        <Dialog
          open={editingDiscrepancy !== null}
          onOpenChange={(open) => {
            if (!open) setEditingDiscrepancy(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold text-slate-900">
                Update Discrepancy Status
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {DISCREPANCY_CATEGORY_LABELS[editingDiscrepancy.category]}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Lifecycle Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'open', label: 'Open' },
                    { key: 'under-review', label: 'Under Review' },
                    { key: 'resolved', label: 'Resolved' },
                    { key: 'dismissed', label: 'Dismissed' },
                  ].map((st) => (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => setNewDiscrepancyStatus(st.key as DiscrepancyStatus)}
                      className={`rounded-xl border p-2 text-center font-bold text-xs transition-all ${
                        newDiscrepancyStatus === st.key
                          ? 'border-cyan-600 bg-cyan-50 font-bold text-cyan-900'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Resolution Notes
                </label>
                <Textarea
                  rows={3}
                  value={discrepancyResolutionNotes}
                  onChange={(e) => setDiscrepancyResolutionNotes(e.target.value)}
                  placeholder="Record resolution findings, evidence supplied, or dismissal rationale..."
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingDiscrepancy(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleUpdateDiscrepancy}
                disabled={isUpdatingDiscrepancy}
                className="text-xs font-bold"
              >
                {isUpdatingDiscrepancy ? 'Updating…' : 'Save Status'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Phase 8 Create Discrepancy & Verification Case Modal ────────────── */}
      <CreateDiscrepancyModal
        isOpen={showNewDiscrepancyModal}
        onClose={() => {
          setShowNewDiscrepancyModal(false);
          setModalTargetBuilding(null);
          setModalTargetFlat(null);
        }}
        societyId={society.id}
        buildingId={modalTargetBuilding?.id}
        buildingName={modalTargetBuilding?.name}
        floorId={modalTargetFlat?.floorId}
        floorLabel={modalTargetFlat?.floorLabel}
        flatId={modalTargetFlat?.id}
        flatNumber={modalTargetFlat?.number}
        onCreated={() => {
          void loadHierarchy();
        }}
      />

      {/* ── Official Society Verification & Inspection Report Modal ───────── */}
      <ReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        reportType="SOCIETY"
        data={reportData}
      />
    </PageContainer>
  );
}
