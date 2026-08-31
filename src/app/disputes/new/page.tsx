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
import { StatusBadge } from "@/components/common/StatusBadge";
import { FileUploadZone, EvidencePreviewList, type UploadedEvidence } from "@/components/ui/file-upload";
import { DisputeCategory, PropertyItem } from "@/types";
import {
  CheckCircle2, Ticket, ArrowLeft, FileText, Camera, ClipboardCheck, Search, ShieldCheck,
} from "lucide-react";
import { generateTicketNumber } from "@/utils/format";
import { reportAudit } from "@/lib/auth/client";

const CATEGORIES: { value: DisputeCategory; label: string; icon: string }[] = [
  { value: "BOUNDARY_MISMATCH", label: "Boundary Mismatch / Encroachment", icon: "📍" },
  { value: "OWNERSHIP_DISPUTE", label: "Ownership / Title Dispute", icon: "👥" },
  { value: "AREA_DISCREPANCY", label: "Area / Dimension Discrepancy", icon: "📐" },
  { value: "ILLEGAL_ENCROACHMENT", label: "Illegal Construction / Encroachment", icon: "🚧" },
  { value: "DOCUMENT_FORGERY", label: "Document Discrepancy / Forgery", icon: "📄" },
  { value: "ZONING_VIOLATION", label: "Zoning / Land Use Violation", icon: "🏗️" },
  { value: "OTHER", label: "Other Cadastral Error", icon: "⚙️" },
];

const INCORRECT_FIELDS = [
  "Boundary Coordinates",
  "Land Area / Acreage",
  "Owner Name",
  "Survey Number",
  "Property Type / Land Use",
  "Tax Assessment Value",
  "Khata / Mutation Extract",
  "Building Sanction Plan",
];

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function RaiseDisputePage() {
  return (
    <ProtectedRoute>
      <RaiseDisputePageContent />
    </ProtectedRoute>
  );
}

function RaiseDisputePageContent() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-slate-50">
          <p className="text-xs font-semibold text-slate-400">Loading grievance portal...</p>
        </div>
      }
    >
      <RaiseDisputePageInner />
    </Suspense>
  );
}

function RaiseDisputePageInner() {
  const searchParams = useSearchParams();
  const prefilledPropertyId = searchParams.get("property") ?? "";

  const { properties, getPropertyByUlpinOrId, addDispute } = useProperty();
  const { toast } = useToast();
  const { isLoading, run } = useSimulatedLoading(1400);

  const [category, setCategory] = useState<DisputeCategory>("BOUNDARY_MISMATCH");
  const [query, setQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<PropertyItem | null>(
    properties.find((p) => p.id === prefilledPropertyId) ?? null
  );
  const [searching, setSearching] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [incorrectFields, setIncorrectFields] = useState<string[]>([]);
  const [evidences, setEvidences] = useState<UploadedEvidence[]>([]);
  const [submitted, setSubmitted] = useState<{ ticket: string } | null>(null);

  const toggleField = (field: string) => {
    setIncorrectFields((prev) => (prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]));
  };
const handleLookup = () => {
    if (!query.trim()) return;
    setSearching(true);
    setTimeout(() => {
      const matched = getPropertyByUlpinOrId(query);
      if (matched) {
        setSelectedProperty(matched);
        toast({ variant: "success", title: "Property matched", description: `${matched.title} — ULPIN ${matched.ulpin}` });
      } else {
        setSelectedProperty(null);
        toast({
          variant: "warning",
          title: "No record found",
          description: `No cadastral record matches "${query}". Try a sample ULPIN (14092837482910) or a property ID.`,
        });
      }
      setSearching(false);
    }, 500);
  };

  const addFiles = (files: File[]) => {
    const items: UploadedEvidence[] = files.map((f, i) => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      const sizeStr = f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(12, Math.round(f.size / 1024))} KB`;
      return {
        id: `ev-${Date.now()}-${i}`,
        fileName: f.name,
        fileType: ext === "pdf" ? ("PDF" as const) : ext === "mp4" || ext === "mov" ? ("VIDEO" as const) : ("IMAGE" as const),
        fileSize: sizeStr,
        uploadedAt: new Date().toISOString(),
      };
    });
    setEvidences((prev) => [...prev, ...items].slice(0, 6));
  };

  const handleSubmit = () => {
    if (!selectedProperty) {
      toast({ variant: "warning", title: "Select a property", description: "Search and select the property you want to dispute." });
      return;
    }
    if (!description.trim()) {
      toast({ variant: "warning", title: "Description required", description: "Please describe the cadastral error in detail." });
      return;
    }
    run(() => {
      const created = addDispute({
        propertyId: selectedProperty.id,
        ulpin: selectedProperty.ulpin,
        propertyTitle: selectedProperty.title,
        propertyAddress: selectedProperty.address,
        raisedByUserId: "usr-cit-101",
        raisedByUserName: "Rajesh V. Sharma",
        raisedByUserContact: "+91 98450 12345",
        category,
        title: title || `${category.replace(/_/g, " ")} — ${selectedProperty.title}`,
        description,
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
      setSubmitted({ ticket: created.disputeTicketNumber });
      // Phase 10: record the real submission in the server-side audit trail.
      reportAudit({
        action: "DISPUTE_SUBMITTED",
        entityType: "DISPUTE",
        entityId: created.disputeTicketNumber,
        newValue: "SUBMITTED",
        details: `${category} dispute filed on ${selectedProperty.ulpin} (${selectedProperty.title}).`,
      });
      toast({
        variant: "success",
        title: "Dispute report submitted",
        description: `Your report was filed as ${created.disputeTicketNumber}. The property is now flagged for official verification.`,
      });
    });
  };
if (submitted) {
    return (
      <div className="flex-1 bg-slate-50 animate-fade-in">
        <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
          {/* Success confirmation */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-tech-lg">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 border border-green-300 animate-zoom-in">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dispute Report Submitted</h1>
            <p className="mx-auto mt-2 max-w-md text-xs text-slate-500 leading-relaxed">
              Your grievance has been digitally lodged with the Department of Land Records. A revenue officer
              will review the evidence and the property now carries an active dispute flag.
            </p>

            {/* Ticket card */}
            <div className="mx-auto mt-6 max-w-sm overflow-hidden rounded-2xl border border-cyan-200 bg-cyan-50/60">
              <div className="flex items-center gap-2 border-b border-cyan-200/70 bg-cyan-500/10 px-4 py-2.5">
                <Ticket className="h-4 w-4 text-cyan-700" />
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-800">Tracking Reference</span>
              </div>
              <div className="px-4 py-4 font-mono text-lg font-black text-slate-900">{submitted.ticket}</div>
            </div>

            {/* Next steps */}
            <div className="mx-auto mt-6 grid max-w-md grid-cols-1 gap-2 text-left sm:grid-cols-3">
              {[
                { step: "1", text: "Officer desk review (24h)" },
                { step: "2", text: "Field DGPS inspection (≤ 4 days)" },
                { step: "3", text: "Status update + notification" },
              ].map((s) => (
                <div key={s.step} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-cyan-300">{s.step}</span>
                  <p className="mt-2 text-[10px] font-bold leading-snug text-slate-600">{s.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {selectedProperty && (
                <Link href={`/properties/${selectedProperty.id}/verification`}>
                  <Button variant="gradient">Track Verification Status</Button>
                </Link>
              )}
              <Link href="/dashboard/citizen">
                <Button variant="secondary">Open Citizen Dashboard</Button>
              </Link>
              <Link href="/disputes/new">
                <Button variant="ghost">Raise Another Report</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
<div className="flex-1 bg-slate-50 animate-fade-in">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/properties" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-cyan-700 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Registry
        </Link>

        <PageHeader
          eyebrow="CITIZEN GRIEVANCE PORTAL"
          title="Report Error / Raise Dispute"
          description="Flag incorrect cadastral information, boundary mismatches or document discrepancies. Evidence is cryptographically time-stamped and sent to the jurisdictional revenue officer."
          actions={
            selectedProperty && (
              <StatusBadge
                status={selectedProperty.hasActiveDispute ? "DISPUTED" : selectedProperty.verificationStatus}
                size="md"
              />
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
          {/* LEFT COLUMN */}
          <div className="space-y-5 lg:col-span-7">
            {/* Error category */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <ClipboardCheck className="h-4 w-4 text-cyan-600" /> Error Category
              </h3>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-xs font-bold transition-all ${
                      category === c.value
                        ? "border-cyan-500 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-500/20"
                        : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:bg-cyan-50/40"
                    }`}
                  >
                    <span className="text-base">{c.icon}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Property lookup */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <Search className="h-4 w-4 text-cyan-600" /> Linked Property
              </h3>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search ULPIN, Property ID or Survey No. (e.g. 14092837482910)"
                    className="input-tech h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-medium outline-none"
                  />
                </div>
                <Button type="button" variant="blue" onClick={handleLookup} loading={searching}>
                  {!searching && <Search className="h-3.5 w-3.5" />} Lookup
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
                      ULPIN {selectedProperty.ulpin} • Survey {selectedProperty.landDetails.surveyNumber}
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
                  Select the property whose cadastral record contains an error. The dispute will be linked to its ULPIN.
                </p>
              )}
            </div>
{/* Description & incorrect fields */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <FileText className="h-4 w-4 text-cyan-600" /> Dispute Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Short Title <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Western boundary encroached by 3 ft during road widening"
                    className="input-tech h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Detailed Description *
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explain the cadastral error, your observations, timestamps and what correction you expect..."
                    rows={4}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Incorrect Information (select all that apply)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {INCORRECT_FIELDS.map((field) => {
                      const active = incorrectFields.includes(field);
                      return (
                        <button
                          key={field}
                          type="button"
                          onClick={() => toggleField(field)}
                          className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all ${
                            active
                              ? "border-red-400 bg-red-50 text-red-700 ring-2 ring-red-500/15"
                              : "border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:text-red-600"
                          }`}
                        >
                          {active ? "✓ " : ""}{field}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — Evidence */}
          <div className="space-y-5 lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <Camera className="h-4 w-4 text-cyan-600" /> Photo Evidence
              </h3>
              <FileUploadZone
                accept="image/*"
                label="Upload photos of the discrepancy"
                hint="JPG, PNG, HEIC • Geotag optional"
                onFilesAdded={addFiles}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <FileText className="h-4 w-4 text-cyan-600" /> Document Evidence
              </h3>
              <FileUploadZone
                accept=".pdf,.jpg,.png"
                label="Upload supporting documents"
                hint="Title deed, khata extract, survey map, GNSS export"
                onFilesAdded={addFiles}
              />
            </div>

            {/* Evidence preview */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-cyan-600" /> Evidence Preview
                </h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-500">
                  {evidences.length} file{evidences.length !== 1 ? "s" : ""}
                </span>
              </div>
              <EvidencePreviewList items={evidences} onRemove={(id) => setEvidences((prev) => prev.filter((e) => e.id !== id))} />
              {evidences.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center text-[11px] text-slate-400">
                  No evidence uploaded yet. Photos and documents are sealed with SHA-256 & geotag before submission.
                </p>
              )}
            </div>

            {/* Submit */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white shadow-tech-lg">
              <p className="text-xs text-slate-300 leading-relaxed">
                By submitting, you confirm the information is genuine. False grievances attract penalties under
                the Indian Penal Code §203 & the Digital Personal Data Protection Act.
              </p>
              <Button type="submit" variant="gradient" size="lg" loading={isLoading} className="mt-4 w-full">
                {isLoading ? "Filing grievance with Revenue Dept..." : <>
                  <ShieldCheck className="h-4 w-4" /> Submit Dispute Report
                </>}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}