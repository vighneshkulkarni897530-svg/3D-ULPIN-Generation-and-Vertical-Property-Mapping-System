"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useProperty } from "@/context/PropertyContext";
import { useToast } from "@/hooks/use-toast";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FileUploadZone, EvidencePreviewList, type UploadedEvidence } from "@/components/ui/file-upload";
import { PropertyItem } from "@/types";
import {
  CheckCircle2, ArrowLeft, FileCheck2, Search, MapPin, CalendarDays,
  Rocket, Crosshair, ClipboardList, ShieldCheck,
} from "lucide-react";
import { generateTicketNumber } from "@/utils/format";
import { reportAudit } from "@/lib/auth/client";

const SURVEY_TYPES = [
  { value: "CORNER_DEMARCATION", label: "Corner Demarcation (Total Station)" },
  { value: "DRONE_CADASTRE_SCAN", label: "Drone Cadastral Scan (LiDAR)" },
  { value: "ENCROACHMENT_CHECK", label: "Encroachment Inspection" },
  { value: "BUILDING_HEIGHT_INSPECTION", label: "Building Height / FSI Inspection" },
  { value: "MUTATION_VERIFICATION", label: "Mutation / Record Verification" },
];

const URGENCY = [
  { value: "NORMAL", label: "Normal (7–10 days)" },
  { value: "URGENT", label: "Urgent (3–5 days)" },
  { value: "HIGH_PRIORITY", label: "High Priority (24–48 hrs)" },
];

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function FieldVerificationRequestPage() {
  return (
    <ProtectedRoute>
      <FieldVerificationRequestPageContent />
    </ProtectedRoute>
  );
}

function FieldVerificationRequestPageContent() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-slate-50">
          <p className="text-xs font-semibold text-slate-400">Loading field verification portal...</p>
        </div>
      }
    >
      <FieldVerificationRequestPageInner />
    </Suspense>
  );
}

function FieldVerificationRequestPageInner() {
  const searchParams = useSearchParams();
  const prefilledPropertyId = searchParams.get("property") ?? "";

  const { properties, getPropertyByUlpinOrId, addFieldRequest } = useProperty();
  const { toast } = useToast();
  const { isLoading, run } = useSimulatedLoading(1500);

  const [query, setQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<PropertyItem | null>(
    properties.find((p) => p.id === prefilledPropertyId) ?? null
  );
  const [searching, setSearching] = useState(false);
  const [surveyType, setSurveyType] = useState("CORNER_DEMARCATION");
  const [urgency, setUrgency] = useState("NORMAL");
  const [preferredDate, setPreferredDate] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [evidences, setEvidences] = useState<UploadedEvidence[]>([]);
  const [submitted, setSubmitted] = useState<string | null>(null);

  const handleLookup = () => {
    if (!query.trim()) return;
    setSearching(true);
    setTimeout(() => {
      const matched = getPropertyByUlpinOrId(query);
      if (matched) {
        setSelectedProperty(matched);
        toast({ variant: "success", title: "Property linked", description: `${matched.title} (ULPIN ${matched.ulpin})` });
      } else {
        setSelectedProperty(null);
        toast({ variant: "warning", title: "No record found", description: `No property matched "${query}".` });
      }
      setSearching(false);
    }, 450);
  };

  const addFiles = (files: File[]) => {
    const items: UploadedEvidence[] = files.map((f, i) => ({
      id: `fv-${Date.now()}-${i}`,
      fileName: f.name,
      fileType: f.name.toLowerCase().endsWith(".pdf") ? "PDF" : "IMAGE",
      fileSize: f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(12, Math.round(f.size / 1024))} KB`,
      uploadedAt: new Date().toISOString(),
    }));
    setEvidences((prev) => [...prev, ...items].slice(0, 5));
  };

  const handleSubmit = () => {
    if (!selectedProperty) {
      toast({ variant: "warning", title: "Link a property", description: "Search and select the property requiring field verification." });
      return;
    }
    if (!reason.trim()) {
      toast({ variant: "warning", title: "Reason required", description: "Describe why field verification is needed." });
      return;
    }
    run(() => {
      const created = addFieldRequest({
        propertyId: selectedProperty.id,
        ulpin: selectedProperty.ulpin,
        propertyTitle: selectedProperty.title,
        propertyAddress: selectedProperty.address,
        requestedByUserId: "usr-cit-101",
        requestedByUserName: "Rajesh V. Sharma",
        surveyType: surveyType as any,
        urgency: urgency as any,
        preferredDate: preferredDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        reason,
        evidences: evidences.map((e) => ({
          id: e.id,
          fileName: e.fileName,
          fileType: e.fileType,
          fileUrl: `/mock-documents/${e.fileName}`,
          fileSize: e.fileSize,
          uploadedAt: new Date().toISOString(),
          sha256Hash: `sha256:${Math.random().toString(16).slice(2, 34)}`,
        })),
      });
      setSubmitted(created.requestNumber);
      // Phase 10: record the real request in the server-side audit trail.
      reportAudit({
        action: "FIELD_VERIFICATION_REQUESTED",
        entityType: "FIELD_VERIFICATION",
        entityId: created.requestNumber,
        newValue: "REQUESTED",
        details: `${surveyType} survey requested on ${selectedProperty.ulpin} (${selectedProperty.title}).`,
      });
      toast({
        variant: "success",
        title: "Field verification requested",
        description: `Request ${created.requestNumber} registered. An officer will be assigned shortly.`,
      });
    });
  };
if (submitted) {
    return (
      <div className="flex-1 bg-slate-50 animate-fade-in">
        <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-tech-lg">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100 border border-cyan-300 animate-zoom-in">
              <CheckCircle2 className="h-8 w-8 text-cyan-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Field Verification Requested</h1>
            <p className="mx-auto mt-2 max-w-md text-xs text-slate-500 leading-relaxed">
              Your request has been queued in the Revenue Department&apos;s inspection pipeline. A jurisdictional
              cadastral officer will schedule the ground survey.
            </p>

            <div className="mx-auto mt-6 max-w-sm overflow-hidden rounded-2xl border border-cyan-200 bg-cyan-50/60">
              <div className="flex items-center gap-2 border-b border-cyan-200/70 bg-cyan-500/10 px-4 py-2.5">
                <Rocket className="h-4 w-4 text-cyan-700" />
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-800">Request Reference</span>
              </div>
              <div className="px-4 py-4 font-mono text-lg font-black text-slate-900">{submitted}</div>
            </div>

            {/* Tracking steps */}
            <div className="mx-auto mt-6 grid max-w-md grid-cols-1 gap-2 text-left sm:grid-cols-4">
              {[
                { step: "1", text: "Request Registered" },
                { step: "2", text: "Officer Assigned" },
                { step: "3", text: "Field Survey" },
                { step: "4", text: "Report Issued" },
              ].map((s, i) => (
                <div key={s.step} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-black text-slate-950">{s.step}</span>
                  <p className="mt-2 text-[10px] font-bold leading-snug text-slate-600">{s.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {selectedProperty && (
                <Link href={`/properties/${selectedProperty.id}/verification`}>
                  <Button variant="gradient">Track Status Timeline</Button>
                </Link>
              )}
              <Link href="/dashboard/citizen">
                <Button variant="secondary">Open Citizen Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 animate-fade-in">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/properties" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-cyan-700 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Registry
        </Link>

        <PageHeader
          eyebrow="FIELD VERIFICATION PIPELINE"
          title="Request Field Verification"
          description="Book an official ground inspection — DGPS corner demarcation, drone cadastral scan, encroachment checks or mutation verification."
          actions={
            selectedProperty && (
              <StatusBadge status={selectedProperty.verificationStatus} size="md" />
            )
          }
        />
<form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="grid grid-cols-1 gap-6 lg:grid-cols-12"
        >
          <div className="space-y-5 lg:col-span-7">
            {/* Property link */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <MapPin className="h-4 w-4 text-cyan-600" /> Property Details
              </h3>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search ULPIN, Property ID or Survey No."
                    className="input-tech h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-medium outline-none"
                  />
                </div>
                <Button type="button" variant="blue" onClick={handleLookup} loading={searching}>
                  {!searching && <Search className="h-3.5 w-3.5" />} Link Property
                </Button>
              </div>

              {selectedProperty ? (
                <div className="mt-3 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50/60 p-3.5 animate-fade-in">
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                    <img src={selectedProperty.featuredImageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-slate-900">{selectedProperty.title}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                      ULPIN {selectedProperty.ulpin} • {selectedProperty.landDetails.surveyNumber}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-500">{selectedProperty.address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProperty(null)}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-red-600"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-slate-400">
                  Link the property record that needs an official ground survey.
                </p>
              )}
            </div>
{/* Survey type & urgency */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <Crosshair className="h-4 w-4 text-cyan-600" /> Survey Type & Urgency
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Verification Type
                  </label>
                  <Select value={surveyType} onChange={(e) => setSurveyType(e.target.value)}>
                    {SURVEY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Urgency / SLA
                  </label>
                  <Select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                    {URGENCY.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            {/* Reason + notes */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <ClipboardList className="h-4 w-4 text-cyan-600" /> Reason & Notes
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Reason for Field Verification *
                  </label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="e.g. Discrepancy between ground boundary stones and digital record; require official DGPS demarcation before purchase."
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Preferred Date
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                        <CalendarDays className="h-4 w-4" />
                      </div>
                      <input
                        type="date"
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        className="input-tech h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Additional Notes
                    </label>
                    <input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Gate access, site contact, etc."
                      className="input-tech h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
<div className="space-y-5 lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <FileCheck2 className="h-4 w-4 text-cyan-600" /> Evidence Upload
              </h3>
              <FileUploadZone
                accept="image/*,.pdf"
                label="Attach photos, maps or GNSS exports"
                hint="Max 5 files • JPG / PNG / PDF"
                onFilesAdded={addFiles}
              />
              <EvidencePreviewList
                className="mt-3"
                items={evidences}
                onRemove={(id) => setEvidences((prev) => prev.filter((e) => e.id !== id))}
              />
              {evidences.length === 0 && (
                <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3 text-center text-[11px] text-slate-400">
                  Optional — the survey officer can reference uploaded documents during inspection.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white shadow-tech-lg">
              <p className="text-xs text-slate-300 leading-relaxed">
                Field verification is conducted by authorised revenue surveyors using DGPS / Total Station.
                A digitally signed inspection report will be attached to the property record after completion.
              </p>
              <Button type="submit" variant="gradient" size="lg" loading={isLoading} className="mt-4 w-full">
                {isLoading ? "Registering inspection request..." : (
                  <>
                    <ShieldCheck className="h-4 w-4" /> Submit Field Verification Request
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}