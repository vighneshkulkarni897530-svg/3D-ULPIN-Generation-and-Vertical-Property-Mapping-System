'use client';

/**
 * /government/ai-analysis — AI-Assisted Document & Blueprint Analysis (Phase 11)
 * ==============================================================================
 * Government Officer decision-support workspace for extracting, analyzing,
 * and cross-referencing sale deeds, khata certificates, tax receipts,
 * and architectural blueprints against live vertical property records.
 *
 * ABSOLUTE RULE: AI is an assistive decision-support tool only.
 * It never automatically makes legal decisions or approves land titles.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Download,
  Eye,
  FileCheck,
  FileSearch,
  FileText,
  Grid3X3,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  Scale,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from 'lucide-react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageHeader, SectionHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { PERMISSIONS } from '@/types/auth';
import {
  type PropertyDocument,
  type DocumentAnalysis,
  type PropertyDocumentType,
  type OfficerReviewStatus,
  PROPERTY_DOCUMENT_TYPES,
  PROPERTY_DOCUMENT_TYPE_LABELS,
  COMPARISON_STATUS_LABELS,
  COMPARISON_STATUS_VARIANTS,
  OFFICER_REVIEW_STATUS_LABELS,
  MANDATORY_AI_DISCLAIMER,
} from '@/types/aiAnalysis';
import {
  uploadAndAnalyzeDocument,
  getDocumentAnalysisById,
  updateOfficerReviewStatus,
  convertFindingToDiscrepancy,
} from '@/lib/ai/documentService';
import { getAvailableSocieties } from '@/lib/society/service';
import { getBuildings } from '@/lib/society/buildingService';
import { getFloors } from '@/lib/society/floorService';
import { getFlats } from '@/lib/society/flatService';
import { type Society, type Building, type Floor, type Flat } from '@/types/society';
import { ReportModal } from '@/components/reports/ReportModal';
import { generatePropertyReport, type PropertyReportData } from '@/lib/reports/reportService';

export default function GovernmentAiAnalysisPage() {
  return (
    <ProtectedRoute permission={PERMISSIONS.VIEW_VERIFICATION_QUEUE}>
      <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading AI Workspace...</div>}>
        <GovernmentAiAnalysisContent />
      </React.Suspense>
    </ProtectedRoute>
  );
}

function GovernmentAiAnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAnalysisId = searchParams.get('analysisId');
  const { sessionUser } = useAuth();

  // Society Hierarchy Picker State
  const [societies, setSocieties] = React.useState<Society[]>([]);
  const [selectedSocietyId, setSelectedSocietyId] = React.useState<string>('');
  const [buildings, setBuildings] = React.useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = React.useState<string>('');
  const [floors, setFloors] = React.useState<Floor[]>([]);
  const [selectedFloorId, setSelectedFloorId] = React.useState<string>('');
  const [flats, setFlats] = React.useState<Flat[]>([]);
  const [selectedFlatId, setSelectedFlatId] = React.useState<string>('');

  // Upload & Analysis State
  const [docType, setDocType] = React.useState<PropertyDocumentType>('SALE_DEED');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [processingStep, setProcessingStep] = React.useState<string>('');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Active Analysis Record
  const [analysis, setAnalysis] = React.useState<DocumentAnalysis | null>(null);
  const [documentMeta, setDocumentMeta] = React.useState<PropertyDocument | null>(null);

  // Officer Review Form
  const [officerNotes, setOfficerNotes] = React.useState('');
  const [submittingReview, setSubmittingReview] = React.useState(false);
  const [convertingFindingIdx, setConvertingFindingIdx] = React.useState<number | null>(null);

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = React.useState(false);
  const [reportData, setReportData] = React.useState<PropertyReportData | null>(null);
  const [generatingReport, setGeneratingReport] = React.useState(false);

  // Load Societies on mount
  React.useEffect(() => {
    getAvailableSocieties().then((list: Society[]) => {
      setSocieties(list);
      if (list.length > 0 && !selectedSocietyId) {
        setSelectedSocietyId(list[0].id);
      }
    }).catch(console.error);
  }, [selectedSocietyId]);

  // Load Buildings when society changes
  React.useEffect(() => {
    if (!selectedSocietyId) return;
    getBuildings(selectedSocietyId).then((bList: Building[]) => {
      setBuildings(bList);
      if (bList.length > 0) {
        setSelectedBuildingId(bList[0].id);
      } else {
        setSelectedBuildingId('');
        setFloors([]);
        setFlats([]);
      }
    }).catch(console.error);
  }, [selectedSocietyId]);

  // Load Floors when building changes
  React.useEffect(() => {
    if (!selectedSocietyId || !selectedBuildingId) return;
    getFloors(selectedSocietyId, selectedBuildingId).then((fList: Floor[]) => {
      setFloors(fList);
      if (fList.length > 0) {
        setSelectedFloorId(fList[0].id);
      } else {
        setSelectedFloorId('');
        setFlats([]);
      }
    }).catch(console.error);
  }, [selectedSocietyId, selectedBuildingId]);

  // Load Flats when floor changes
  React.useEffect(() => {
    if (!selectedSocietyId || !selectedBuildingId || !selectedFloorId) return;
    getFlats(selectedSocietyId, selectedBuildingId, selectedFloorId).then((uList: Flat[]) => {
      setFlats(uList);
      if (uList.length > 0) {
        setSelectedFlatId(uList[0].id);
      } else {
        setSelectedFlatId('');
      }
    }).catch(console.error);
  }, [selectedSocietyId, selectedBuildingId, selectedFloorId]);

  // Load Initial Analysis if query param exists
  React.useEffect(() => {
    if (!initialAnalysisId) return;
    getDocumentAnalysisById(initialAnalysisId).then((res) => {
      if (res) {
        setAnalysis(res);
        if (res.societyId) setSelectedSocietyId(res.societyId);
        if (res.buildingId) setSelectedBuildingId(res.buildingId);
        if (res.floorId) setSelectedFloorId(res.floorId);
        if (res.flatId) setSelectedFlatId(res.flatId);
      }
    }).catch(console.error);
  }, [initialAnalysisId]);

  const selectedSociety = societies.find((s) => s.id === selectedSocietyId) || null;
  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId) || null;
  const selectedFloor = floors.find((f) => f.id === selectedFloorId) || null;
  const selectedFlat = flats.find((u) => u.id === selectedFlatId) || null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      setErrorMsg(null);
    }
  };

  const handleLoadSampleDeed = () => {
    const sampleFile = new File(
      [
        `REGISTERED SALE DEED SCHEDULE B PROPERTY EXTRACT
Deed No: REG-2024-884920
Building: Tower B
Floor: 4th Floor
Flat: 402
Carpet Area: 1120 Sq. Ft.
Survey No: 140/2A`,
      ],
      'registered_sale_deed_flat402.pdf',
      { type: 'application/pdf' },
    );
    setSelectedFile(sampleFile);
    setDocType('SALE_DEED');
  };

  const handleRunAnalysis = async () => {
    if (!selectedFile) {
      setErrorMsg('Please select or upload a document or blueprint file.');
      return;
    }
    if (!selectedSocietyId) {
      setErrorMsg('Please select the target society for cadastral cross-verification.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg(null);

      setProcessingStep('1/4 — Uploading document & validating security rules...');
      await new Promise((r) => setTimeout(r, 400));

      setProcessingStep('2/4 — Performing OCR & cadastral pattern extraction...');
      await new Promise((r) => setTimeout(r, 600));

      setProcessingStep('3/4 — Running blueprint vision & structural checks...');
      await new Promise((r) => setTimeout(r, 600));

      setProcessingStep('4/4 — Cross-referencing against live Firestore cadastre records...');

      const result = await uploadAndAnalyzeDocument({
        file: selectedFile,
        documentType: docType,
        societyId: selectedSocietyId,
        buildingId: selectedBuildingId || null,
        floorId: selectedFloorId || null,
        flatId: selectedFlatId || null,
        targetRecords: {
          society: selectedSociety,
          building: selectedBuilding,
          floor: selectedFloor,
          flat: selectedFlat,
        },
      });

      setDocumentMeta(result.document);
      setAnalysis(result.analysis);
      setOfficerNotes(result.analysis.officerNotes || '');
    } catch (err) {
      console.error('Analysis failed:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to analyze document.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleOfficerReview = async (reviewStatus: OfficerReviewStatus) => {
    if (!analysis) return;
    try {
      setSubmittingReview(true);
      await updateOfficerReviewStatus(analysis.id, reviewStatus, officerNotes);
      setAnalysis((prev) =>
        prev
          ? {
              ...prev,
              officerReviewStatus: reviewStatus,
              officerNotes,
              reviewedByName: sessionUser?.name || 'Government Officer',
              reviewedAt: new Date(),
            }
          : null,
      );
    } catch (err) {
      console.error('Review update failed:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleConvertToDiscrepancy = async (findingIdx: number) => {
    if (!analysis) return;
    try {
      setConvertingFindingIdx(findingIdx);
      const justification = officerNotes || 'Flagged during AI-assisted document verification.';
      const res = await convertFindingToDiscrepancy(analysis, findingIdx, justification);
      setAnalysis((prev) =>
        prev
          ? {
              ...prev,
              officerReviewStatus: 'CONVERTED_TO_DISCREPANCY',
              convertedDiscrepancyId: res.discrepancyId,
              convertedCaseId: res.caseId || null,
            }
          : null,
      );
    } catch (err) {
      console.error('Failed to convert to discrepancy:', err);
    } finally {
      setConvertingFindingIdx(null);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedSocietyId) return;
    try {
      setGeneratingReport(true);
      const rep = await generatePropertyReport(
        selectedSocietyId,
        selectedBuildingId || '',
        selectedFloorId || '',
        selectedFlatId || '',
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

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <PageHeader
        eyebrow="GOVERNMENT CADASTRE &amp; DECISION INTELLIGENCE · PHASE 11"
        title="AI-Assisted Document &amp; Blueprint Analysis"
        description="Extract structured cadastral attributes, parse floor blueprints, and cross-reference deeds against live database records."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateReport}
              disabled={generatingReport || !selectedSocietyId}
              className="border-slate-300 font-bold"
            >
              <FileText className="h-4 w-4 mr-1.5 text-cyan-600" />
              {generatingReport ? 'Generating...' : 'Cadastral Dossier'}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/government/dashboard">
                <ShieldCheck className="h-4 w-4 mr-1.5 text-emerald-600" /> Gov Dashboard
              </Link>
            </Button>
          </div>
        }
      />

      {/* Mandatory Assistive AI Disclaimer Strip */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-900 shadow-2xs">
        <Bot className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed">
          <p className="font-extrabold text-amber-950">Statutory Decision-Support Notice:</p>
          <p className="text-[11px] text-amber-800">
            {MANDATORY_AI_DISCLAIMER}
          </p>
        </div>
      </div>

      {/* 2-Column Layout: Input / Controls (Left) | Analysis Dossier (Right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Upload & Property Selection (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* 1. Target Property Selector */}
          <Card className="border border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-cyan-600" />
                1. Target Cadastral Property
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Society / Project *</label>
                <select
                  value={selectedSocietyId}
                  onChange={(e) => setSelectedSocietyId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-semibold text-slate-800 focus:border-cyan-500 focus:outline-none"
                >
                  {societies.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.address.city})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Building</label>
                  <select
                    value={selectedBuildingId}
                    onChange={(e) => setSelectedBuildingId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs font-medium text-slate-800"
                  >
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Floor</label>
                  <select
                    value={selectedFloorId}
                    onChange={(e) => setSelectedFloorId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs font-medium text-slate-800"
                  >
                    {floors.map((f) => (
                      <option key={f.id} value={f.id}>{f.floorLabel || `Floor ${f.floorNumber}`}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Flat Unit</label>
                  <select
                    value={selectedFlatId}
                    onChange={(e) => setSelectedFlatId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs font-medium text-slate-800"
                  >
                    {flats.map((u) => (
                      <option key={u.id} value={u.id}>Flat {u.flatNumber}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedFlat && (
                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <p>Registered Flat: <strong className="text-slate-800">{selectedFlat.flatNumber}</strong> ({selectedFlat.unitType})</p>
                  <p>Registered Area: <strong className="text-slate-800">{selectedFlat.area || '—'} sq ft</strong></p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Document Upload & Type Selector */}
          <Card className="border border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <UploadCloud className="h-4 w-4 text-cyan-600" />
                2. Upload Document or Blueprint
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Document Category</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as PropertyDocumentType)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-semibold text-slate-800 focus:border-cyan-500 focus:outline-none"
                >
                  {PROPERTY_DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{PROPERTY_DOCUMENT_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              {/* File Input Box */}
              <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center hover:border-cyan-400 transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <FileSearch className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <p className="font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Choose a PDF or Image file'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  PDF, PNG, JPG, WEBP • Max 25 MB
                </p>
              </div>

              {/* Quick Sample Loader */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">Testing with sample file?</span>
                <button
                  type="button"
                  onClick={handleLoadSampleDeed}
                  className="text-[11px] font-bold text-cyan-700 hover:underline"
                >
                  Load Sample Deed
                </button>
              </div>

              {errorMsg && (
                <div className="rounded-lg bg-rose-50 p-3 text-[11px] font-semibold text-rose-700 border border-rose-200">
                  {errorMsg}
                </div>
              )}

              {/* Action Button */}
              <Button
                type="button"
                onClick={handleRunAnalysis}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 font-extrabold text-white shadow-md hover:from-cyan-500 hover:to-blue-500"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing Analysis...
                  </>
                ) : (
                  <>
                    <ScanLine className="h-4 w-4 mr-2" />
                    Analyze &amp; Cross-Reference
                  </>
                )}
              </Button>

              {isProcessing && (
                <div className="space-y-1.5 pt-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-cyan-600 animate-pulse w-3/4 rounded-full" />
                  </div>
                  <p className="text-center font-mono text-[10px] text-cyan-700 font-bold">{processingStep}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Analysis Dossier & Results (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {!analysis ? (
            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-12 text-center">
                <EmptyState
                  icon={<FileSearch className="h-10 w-10 text-cyan-600" />}
                  title="No Document Analyzed Yet"
                  description="Upload a property deed, tax certificate, or blueprint plan on the left to extract cadastral attributes and cross-reference against live records."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Header Analysis Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                      ANALYSIS-{analysis.id.slice(0, 8).toUpperCase()}
                    </span>
                    <Badge variant={analysis.status === 'COMPLETED' ? 'default' : 'secondary'}>
                      {analysis.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Overall Confidence: <strong className="text-slate-800 font-mono">{(analysis.overallConfidence * 100).toFixed(0)}%</strong> · Review Status: <strong className="text-slate-800">{OFFICER_REVIEW_STATUS_LABELS[analysis.officerReviewStatus]}</strong>
                  </p>
                </div>

                <div className="text-right text-[10px] text-slate-400 font-mono">
                  Completed: {analysis.completedAt ? analysis.completedAt.toLocaleTimeString('en-IN') : 'Just now'}
                </div>
              </div>

              {/* 3. Extracted Document Information */}
              {analysis.ocrResult && (
                <Card className="border border-slate-200 bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-cyan-600" /> Extracted Document Fields (OCR)
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-normal">
                        Language: {analysis.ocrResult.detectedLanguage.split('/')[0]}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-xs">
                      {Object.entries(analysis.ocrResult.fields)
                        .filter(([_, f]) => f.isDetected)
                        .map(([key, f]) => (
                          <div key={key} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              {f.label}
                            </span>
                            <p className="font-extrabold text-slate-800 mt-0.5 truncate">
                              {String(f.normalizedValue || f.rawValue)}
                            </p>
                            <span className="text-[9px] font-mono text-cyan-700">
                              Confidence: {(f.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 4. Blueprint Vision Findings */}
              {analysis.blueprintResult && (
                <Card className="border border-slate-200 bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-purple-600" /> Structural Blueprint Findings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-2 text-xs">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-purple-50 p-2 border border-purple-100">
                        <span className="text-[10px] font-bold text-purple-700">Units Detected</span>
                        <p className="text-sm font-extrabold text-purple-950 mt-0.5">
                          {analysis.blueprintResult.detectedUnitCount || '—'}
                        </p>
                      </div>
                      <div className="rounded-lg bg-purple-50 p-2 border border-purple-100">
                        <span className="text-[10px] font-bold text-purple-700">Floors Detected</span>
                        <p className="text-sm font-extrabold text-purple-950 mt-0.5">
                          {analysis.blueprintResult.detectedFloorCount || '—'}
                        </p>
                      </div>
                      <div className="rounded-lg bg-purple-50 p-2 border border-purple-100">
                        <span className="text-[10px] font-bold text-purple-700">Total Floor Area</span>
                        <p className="text-sm font-extrabold text-purple-950 mt-0.5">
                          ~{analysis.blueprintResult.dimensionsSummary.totalFloorAreaSqFt} sq ft
                        </p>
                      </div>
                    </div>

                    {analysis.blueprintResult.units.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-slate-700">Detected Unit Distribution:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.blueprintResult.units.map((u) => (
                            <span
                              key={u.unitId}
                              className="rounded bg-slate-100 px-2 py-1 text-[10px] font-mono font-bold text-slate-700 border border-slate-200"
                            >
                              {u.label} ({u.unitType}, {u.approxAreaSqFt} sqft)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 5. Database Cross-Comparison Table */}
              {analysis.comparisonResult && (
                <Card className="border border-slate-200 bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-cyan-600" /> Database Cross-Verification Table
                      </span>
                      <Badge variant={analysis.comparisonResult.mismatchCount > 0 ? 'destructive' : 'default'} className="text-[10px]">
                        {analysis.comparisonResult.mismatchCount > 0
                          ? `${analysis.comparisonResult.mismatchCount} MISMATCH FLAGGED`
                          : 'ALL FIELDS CONSISTENT'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Field</th>
                            <th className="p-2.5">Document Value</th>
                            <th className="p-2.5">Database Value</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {analysis.comparisonResult.fields.map((f, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-bold text-slate-800">{f.label}</td>
                              <td className="p-2.5 font-mono text-slate-700">{f.documentValue || <span className="text-slate-400 italic">Not detected</span>}</td>
                              <td className="p-2.5 font-mono text-slate-700">{f.databaseValue || <span className="text-slate-400 italic">Unlinked</span>}</td>
                              <td className="p-2.5">
                                <Badge variant={COMPARISON_STATUS_VARIANTS[f.status]} className="text-[9px]">
                                  {COMPARISON_STATUS_LABELS[f.status]}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 6. AI Findings & Recommended Actions */}
              <Card className="border border-slate-200 bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-500" /> AI Findings &amp; Risk Flags ({analysis.findings.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {analysis.findings.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">
                      No structural or title discrepancies detected across compared records.
                    </p>
                  ) : (
                    analysis.findings.map((finding, idx) => (
                      <div
                        key={finding.id || idx}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{finding.title}</span>
                            <Badge variant={finding.severity === 'CRITICAL' || finding.severity === 'HIGH' ? 'destructive' : 'warning'} className="text-[9px]">
                              {finding.severity}
                            </Badge>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            Confidence: {(finding.confidence * 100).toFixed(0)}%
                          </span>
                        </div>

                        <p className="text-slate-600 leading-relaxed">{finding.description}</p>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                          <span className="text-slate-500 italic">Action: {finding.recommendedAction}</span>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleConvertToDiscrepancy(idx)}
                            disabled={convertingFindingIdx === idx || analysis.officerReviewStatus === 'CONVERTED_TO_DISCREPANCY'}
                            className="h-7 text-[10px] font-bold"
                          >
                            {convertingFindingIdx === idx ? 'Creating...' : 'Flag as Discrepancy'}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* 7. Government Officer Review & Decision */}
              <Card className="border-2 border-cyan-500/50 bg-cyan-50/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-extrabold text-cyan-950 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-cyan-700" /> Government Officer Verification Decision
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Officer Verification Notes / Findings Justification
                    </label>
                    <Textarea
                      rows={3}
                      value={officerNotes}
                      onChange={(e) => setOfficerNotes(e.target.value)}
                      placeholder="Add official remarks, survey notes, or rationale for accepting/dismissing AI findings..."
                      className="resize-none text-xs bg-white"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleOfficerReview('ACCEPTED')}
                      disabled={submittingReview}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accept &amp; Verify Findings
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOfficerReview('REJECTED')}
                      disabled={submittingReview}
                      className="text-slate-600 font-bold"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1 text-rose-500" /> Dismiss / False Positive
                    </Button>
                  </div>

                  {analysis.reviewedBy && (
                    <p className="text-[10px] text-slate-400 font-mono pt-1">
                      Reviewed by {analysis.reviewedByName || 'Government Officer'} on {analysis.reviewedAt ? new Date(analysis.reviewedAt).toLocaleDateString('en-IN') : '—'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        reportType="PROPERTY"
        data={reportData}
      />
    </div>
  );
}
