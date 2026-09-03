"use client";

import { SafeImage } from '@/components/ui/SafeImage';
import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useProperty } from "@/context/PropertyContext";
import { useAuth } from "@/context/AuthContext";
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
import { createNotification } from "@/lib/citizen/notificationService";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

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
  const { sessionUser } = useAuth();
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
        raisedByUserId: sessionUser?.id || "usr-cit-101",
        raisedByUserName: sessionUser?.name || "Citizen Resident",
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

      if (sessionUser?.id) {
        createNotification({
          recipientUid: sessionUser.id,
          type: 'DISPUTE_CREATED',
          title: `Dispute Filed: ${created.disputeTicketNumber}`,
          message: `Your property dispute report for "${selectedProperty.title}" has been registered for official verification review.`,
          relatedEntityType: 'property',
          relatedEntityId: selectedProperty.id,
          severity: 'INFO',
          linkUrl: '/resident/cases',
        }).catch((err) => console.warn('Dispute notification warning:', err));
      }

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
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dispute Report Submitted</h1>
            <p className="mx-auto mt-2 max-w-md text-xs text-slate-500 leading-relaxed">
              Your grievance has been digitally lodged with the Department of Land Records. A revenue officer
              will review the evidence and the property now carries an active dispute flag.
            </p>

            {/* Ticket card */}
            <div className="mx-auto mt-6 max-w-sm overflow-hidden rounded-2xl border border-cyan-200 bg-cyan-50/60">
              <div className="flex items-center gap-2 border-b border-cyan-200/70 bg-cyan-500/10 px-4 py-2.5">
                <Ticket className="h-4 w-4 text-cyan-700" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-800">Tracking Reference</span>
              </div>
              <div className="px-4 py-4 font-mono text-lg font-extrabold text-slate-900">{submitted.ticket}</div>
            </div>

            {/* Next steps */}
            <div className="mx-auto mt-6 grid max-w-md grid-cols-1 gap-2 text-left sm:grid-cols-3">
              {[
                { step: "1", text: "Officer desk review (24h)" },
                { step: "2", text: "Field DGPS inspection (≤ 4 days)" },
                { step: "3", text: "Status update + notification" },
              ].map((s) => (
                <div key={s.step} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-extrabold text-cyan-300">{s.step}</span>
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
              <Link href="/resident/dashboard">
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
                {CATEGORIES.map((cat) => {
                  const active = category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`flex items-center gap-3 rounded-xl border p-3.5 text-left text-xs font-semibold transition-all ${
                        active
                          ? "border-cyan-500 bg-cyan-50 text-cyan-950 ring-2 ring-cyan-500/20 shadow-2xs font-extrabold"
                          : "border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-lg">{cat.icon}</span>
                      <span className="leading-tight">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Disputed Fields */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <h3 className="mb-2 text-sm font-extrabold text-slate-900">Incorrect / Contested Attributes</h3>
              <p className="mb-4 text-xs text-slate-500">Select all fields in the cadastral record that you believe contain inaccuracies.</p>
              <div className="flex flex-wrap gap-2">
                {INCORRECT_FIELDS.map((field) => {
                  const selected = incorrectFields.includes(field);
                  return (
                    <button
                      key={field}
                      type="button"
                      onClick={() => toggleField(field)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                        selected
                          ? "bg-rose-50 text-rose-700 border border-rose-300 ring-2 ring-rose-500/20"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"
                      }`}
                    >
                      {field}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description & Narrative */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <h3 className="mb-4 text-sm font-extrabold text-slate-900">Grievance Narrative &amp; Facts</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Subject / Headline</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={`e.g., East boundary wall overlaps Survey #42 by 1.8 meters`}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Detailed Statement of Facts *</label>
                  <Textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what is wrong, when it was noticed, and what official record supports your claim..."
                    className="mt-1.5 resize-none text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Supporting Evidence */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <h3 className="mb-2 text-sm font-extrabold text-slate-900">Documentary &amp; Geo Evidence</h3>
              <p className="mb-4 text-xs text-slate-500">Upload geotagged photos, registered deeds, encumbrance certificates or survey sketches.</p>
              <FileUploadZone onFilesAdded={addFiles} />
              <EvidencePreviewList
                items={evidences}
                onRemove={(id) => setEvidences((prev) => prev.filter((e) => e.id !== id))}
              />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-5 lg:col-span-5">
            {/* Property Selector */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <Search className="h-4 w-4 text-cyan-600" /> Target Property
              </h3>

              {!selectedProperty ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Enter ULPIN or property ID..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none"
                    />
                    <Button type="button" size="sm" onClick={handleLookup} disabled={searching}>
                      {searching ? "..." : "Lookup"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-400">Search by 14-digit Bhu-Aadhaar ULPIN or property system ID.</p>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">{selectedProperty.title}</h4>
                      <p className="font-mono text-[11px] text-cyan-700 mt-0.5">{selectedProperty.ulpin}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProperty(null)}
                      className="text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{selectedProperty.address}</p>
                </div>
              )}
            </div>

            {/* Declaration & Submit Button */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-[11px] text-amber-900 leading-relaxed">
                <span className="font-extrabold">Legal Notice:</span> Lodging false or frivolous cadastral claims is subject to administrative review under the Revenue Records Act.
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 font-extrabold text-white shadow-md hover:from-cyan-500 hover:to-blue-500"
              >
                {isLoading ? "Lodging Report..." : "Submit Grievance Dossier"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}