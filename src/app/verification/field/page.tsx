"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Footprints,
  MapPin,
  NotebookPen,
  Send,
  ClipboardCheck,
  ArrowRight,
  TriangleAlert,
  Building2,
  FlaskConical,
  FilePenLine,
  CheckCircle2,
} from "lucide-react";
import { PageLoader } from "@/components/layout/LoadingState";
import { PageHeader } from "@/components/layout/PageHeader";
import { GisStatusBadge } from "@/components/common/GisStatusBadge";
import { EmptyState } from "@/components/ui/empty-state";
import { GpsCheckCard, type GpsCheckResult } from "@/components/verification/GpsCheckCard";
import {
  BoundaryCompareCard,
  simulateBoundaryComparison,
  type BoundaryComparison,
} from "@/components/verification/BoundaryCompareCard";
import { EvidencePanel, type DemoEvidencePhoto } from "@/components/verification/EvidencePanel";
import { useGIS } from "@/context/GISContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import type { SpatialConflict } from "@/types/conflict";
import type { PropertyUnit } from "@/types/gis";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PERMISSIONS } from "@/types/auth";

export default function FieldVerificationPage() {
  return (
    <ProtectedRoute permission={PERMISSIONS.VIEW_FIELDSHEET}>
      <FieldVerificationPageContent />
    </ProtectedRoute>
  );
}

function FieldVerificationPageContent() {
  return (
    <React.Suspense fallback={<PageLoader label="Preparing field verification…" />}>
      <FieldVerification />
    </React.Suspense>
  );
}

function FieldVerification() {
  const { properties, buildings, floors, conflicts, verifyProperty, requestReinspection } = useGIS();
  const { currentUser: user } = useAuth();
  const searchParams = useSearchParams();

  // ── Selected property (deep-linkable via ?property= or ?conflict=) ──
  const conflictParam = searchParams.get("conflict");
  const propertyParam = searchParams.get("property");
  const [selectedId, setSelectedId] = React.useState<string | null>(propertyParam);

  // Resolve a conflict parameter to its first affected property.
  React.useEffect(() => {
    if (!conflictParam || selectedId) return;
    const conflict = conflicts.find((c) => c.id === conflictParam || c.conflictNumber === conflictParam);
    if (conflict && conflict.affectedPropertyIds.length > 0) {
      setSelectedId(conflict.affectedPropertyIds[0]);
    }
    // Conflict resolution runs once per URL change; registry data is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conflictParam]);

  const [gps, setGps] = React.useState<GpsCheckResult | null>(null);
  const [photo, setPhoto] = React.useState<DemoEvidencePhoto | null>(null);
  const [notes, setNotes] = React.useState("");
  const [notesTouched, setNotesTouched] = React.useState(false);
  const [submitted, setSubmitted] = React.useState<{ id: string; status: string } | null>(null);

  // Reset the workflow evidence when the officer switches properties.
  React.useEffect(() => {
    setGps(null);
    setPhoto(null);
    setNotes("");
    setNotesTouched(false);
    setSubmitted(null);
  }, [selectedId]);

  const property = properties.find((p) => p.id === selectedId) ?? null;
  const building = property ? buildings.find((b) => b.id === property.buildingId) : null;
  const floor = property ? floors.find((f) => f.id === property.floorId) : null;

  // Deterministic demo boundary comparison (page-owned so the submit decision uses it).
  const boundary: BoundaryComparison | null = React.useMemo(
    () => (property ? simulateBoundaryComparison(property).comparison : null),
    [property],
  );

  const isOfficer = user?.role === "OFFICER" || user?.role === "ADMIN";
  const notesInvalid = notesTouched && notes.trim().length === 0;
  const canSubmit = !!property && isOfficer && notes.trim().length > 0;

  const submit = React.useCallback(() => {
    if (!property || !canSubmit || !user) return;
    const officerName = user.name || "Demo Officer";
    verifyProperty(property.id, officerName, notes.trim(), {
      gpsMatched: gps?.matched ?? false,
      boundaryMatched: boundary?.status === "Matched",
      method: "RTK_GNSS",
      confidenceScore: gps?.matched ? 92 : 68,
      photoUrl: photo?.name,
    });
    setSubmitted({ id: property.id, status: "Verified" });
  }, [property, canSubmit, user, notes, gps, photo, boundary, verifyProperty]);

  const handleReinspection = React.useCallback(() => {
    if (!property || !user) return;
    const officerName = user.name || "Demo Officer";
    const reason = notes.trim() || "Field checks require a follow-up site visit.";
    requestReinspection(property.id, officerName, reason);
    setSubmitted({ id: property.id, status: "Reinspection Required" });
  }, [property, user, notes, requestReinspection]);

  // Demo data-correction request from the field workflow (centralized action).
  const handleCorrection = React.useCallback(
    (category: string, correctionNotes: string) => {
      if (!property || !user) return;
      const officerName = user.name || "Demo Officer";
      const reason = `Demo data correction request (${category}): ${correctionNotes}`;
      requestReinspection(property.id, officerName, reason);
    },
    [property, user, requestReinspection],
  );

  // ── Post-submit confirmation ──
  if (submitted) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
          <ClipboardCheck className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="mt-3 text-base font-extrabold tracking-tight text-emerald-900">Field Verification Submitted</h1>
          <p className="mt-1 text-xs leading-relaxed text-emerald-700/90">
            <span className="font-mono font-bold">{submitted.id}</span> was recorded as{" "}
            <strong>{submitted.status}</strong>. The queue, dashboards, activity feed and GIS map are updated
            immediately.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href={`/map?property=${submitted.id}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-xs font-bold text-slate-950"
            >
              <MapPin className="h-4 w-4" /> View on Map
            </Link>
            <Link
              href="/verification"
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-bold text-slate-700"
            >
              Open Verification Workspace <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setSubmitted(null)}
              className="rounded-xl px-4 py-2.5 text-[11px] font-bold text-slate-500 hover:text-slate-800"
            >
              Verify another property
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-3 pb-40 pt-2 sm:px-4">
      <PageHeader
        eyebrow="FIELD OPERATIONS · MOBILE WORKFLOW"
        title="Field Verification"
        description="Demo GPS, boundary and photo checks performed on site, then submitted to the central verification record."
      />

      {!isOfficer && (
        <p className="mb-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-[11px] font-semibold leading-relaxed text-amber-800">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Read-only preview — field submission requires an officer demo account. Use the role switcher in the top
          navigation to continue.
        </p>
      )}

      {/* Conflict context (arrived via ?conflict=) */}
      {conflictParam && (
        <ConflictContextBanner conflictId={conflictParam} conflicts={conflicts} properties={properties} />
      )}

      {/* Step 0 — property picker */}
      <section aria-label="Property selection" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-tech">
        <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
          <Building2 className="h-3.5 w-3.5" /> Property
        </p>
        <label htmlFor="field-property-select" className="sr-only">
          Select property for field verification
        </label>
        <select
          id="field-property-select"
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value || null)}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-xs font-bold text-slate-800 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200"
        >
          <option value="">— Select a property —</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id} · {p.demoSpatialId}
            </option>
          ))}
        </select>
        {selectedId && !property && (
          <p role="alert" className="mt-2 text-[11px] font-bold text-red-600">
            Property &quot;{selectedId}&quot; was not found — pick a unit from the list.
          </p>
        )}
        {property && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate font-mono text-[11px] font-extrabold text-slate-900">{property.id}</p>
              <p className="truncate text-[10px] font-semibold text-slate-500">
                {building?.buildingCode ?? property.buildingId} · {floor?.name ?? property.floorId} · Unit{" "}
                {property.unitNumber}
              </p>
            </div>
            <GisStatusBadge status={property.verificationStatus} kind="property" />
          </div>
        )}
      </section>

      {!property && (
        <div className="mt-4">
          <EmptyState
            icon={<Footprints className="h-7 w-7" />}
            title="No property selected"
            description="Choose a property above (or arrive via a deep link) to begin the field workflow."
          />
        </div>
      )}

      {property && (
        <div className="mt-4 space-y-4">
          <FieldWorkflow
            property={property}
            gps={gps}
            setGps={setGps}
            boundary={boundary}
            photo={photo}
            setPhoto={setPhoto}
            notes={notes}
            setNotes={setNotes}
            notesTouched={notesTouched}
            setNotesTouched={setNotesTouched}
            canSubmit={canSubmit}
            isOfficer={isOfficer}
            onSubmit={submit}
            onReinspection={handleReinspection}
            onCorrection={handleCorrection}
          />
        </div>
      )}
    </div>
  );
}

// ── Conflict context banner ─────────────────────────────────────────────────

function ConflictContextBanner({
  conflictId,
  conflicts,
  properties,
}: {
  conflictId: string;
  conflicts: SpatialConflict[];
  properties: PropertyUnit[];
}) {
  const conflict = conflicts.find((c) => c.id === conflictId || c.conflictNumber === conflictId);
  if (!conflict) {
    return (
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] font-semibold text-amber-800">
        Unknown conflict ID &quot;{conflictId}&quot; — no conflict context available.
      </div>
    );
  }
  const affected = conflict.affectedPropertyIds
    .map((id) => properties.find((p) => p.id === id))
    .filter(Boolean);
  return (
    <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-cyan-700">
        <TriangleAlert className="h-3 w-3" /> Originated from Spatial Conflict
      </p>
      <p className="mt-0.5 font-mono text-[10px] font-bold text-slate-900">{conflict.conflictNumber}</p>
      <p className="mt-1 text-[10px] text-slate-600">
        {conflict.type} · Severity {conflict.severity} · {affected.length} affected unit(s).
      </p>
    </div>
  );
}

// ── FieldWorkflow ──────────────────────────────────────────────────────────

interface FieldWorkflowProps {
  property: PropertyUnit;
  gps: GpsCheckResult | null;
  setGps: (gps: GpsCheckResult | null) => void;
  boundary: BoundaryComparison | null;
  photo: DemoEvidencePhoto | null;
  setPhoto: (photo: DemoEvidencePhoto | null) => void;
  notes: string;
  setNotes: (notes: string) => void;
  notesTouched: boolean;
  setNotesTouched: (touched: boolean) => void;
  canSubmit: boolean;
  isOfficer: boolean;
  onSubmit: () => void;
  onReinspection: () => void;
  /** Records a demo data-correction request through the parent (centralized). */
  onCorrection: (category: string, notes: string) => void;
}

/**
 * The mobile-first field workflow: demo GPS check → boundary comparison →
 * demo photo evidence → notes → sticky submit. Every check is clearly
 * labelled as a simulation; nothing here is a legal measurement.
 */
function FieldWorkflow({
  property,
  gps,
  setGps,
  boundary,
  photo,
  setPhoto,
  notes,
  setNotes,
  notesTouched,
  setNotesTouched,
  canSubmit,
  isOfficer,
  onSubmit,
  onReinspection,
  onCorrection,
}: FieldWorkflowProps) {
  const locationOk = gps?.matched ?? false;
  const boundaryOk = boundary?.status === "Matched";
  const photoOk = !!photo;
  const notesOk = notes.trim().length > 0;
  const stepsDone = [locationOk, boundaryOk, photoOk, notesOk].filter(Boolean).length;

  const [showCorrectionDialog, setShowCorrectionDialog] = React.useState(false);
  const [correctionCategory, setCorrectionCategory] = React.useState("Geometry Correction");
  const [submittedCorrection, setSubmittedCorrection] = React.useState(false);

  const handleCorrectionRequest = () => {
    setCorrectionCategory("Geometry Correction");
    setShowCorrectionDialog(true);
  };

  const handleCorrectionSubmit = () => {
    if (!notes.trim()) return;
    onCorrection(correctionCategory, notes.trim());
    setShowCorrectionDialog(false);
    setSubmittedCorrection(true);
  };

  return (
    <>
      {/* Checklist summary */}
      <section
        aria-label="Field checklist progress"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-tech"
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Field Checklist</p>
          <p className="font-mono text-[11px] font-extrabold text-cyan-700">{stepsDone}/4</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
            style={{ width: `${(stepsDone / 4) * 100}%` }}
          />
        </div>

        {/* GPS check */}
        <details className="mt-3 open:mt-0">
          <summary className="flex cursor-pointer items-center gap-2 text-[10.5px] font-bold text-slate-700">
            <MapPin className="h-3.5 w-3.5 text-cyan-600" /> Demo GPS Location Check
          </summary>
          <div className="mt-2">
            <GpsCheckCard expectedLat={property.latitude} expectedLng={property.longitude} result={gps} onResult={setGps} />
          </div>
        </details>

        {/* Boundary comparison */}
        <details className="mt-2">
          <summary className="flex cursor-pointer items-center gap-2 text-[10.5px] font-bold text-slate-700">
            <NotebookPen className="h-3.5 w-3.5 text-amber-600" /> Demo Boundary Comparison
          </summary>
          <div className="mt-2">
            <BoundaryCompareCard property={property} />
          </div>
        </details>

        {/* Evidence photo */}
        <details className="mt-2">
          <summary className="flex cursor-pointer items-center gap-2 text-[10.5px] font-bold text-slate-700">
            <MapPin className="h-3.5 w-3.5 text-violet-600" /> Demo Evidence Upload
          </summary>
          <div className="mt-2">
            <EvidencePanel property={property} gps={gps} boundary={boundary} photo={photo} onPhotoChange={setPhoto} />
          </div>
        </details>

        {/* Notes */}
        <div className="mt-3">
          <label htmlFor="field-notes" className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Officer Notes <span className="text-red-500">*</span>
          </label>
          <textarea
            id="field-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => setNotesTouched(true)}
            aria-invalid={notesTouched && !notes.trim()}
            placeholder="Record GPS match, boundary discrepancy, and field observations…"
            className={cn(
              "w-full resize-none rounded-lg border bg-white px-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20",
              notesTouched && !notes.trim() ? "border-red-400" : "border-slate-300 focus:border-cyan-500",
            )}
          />
          {notesTouched && !notes.trim() && (
            <p role="alert" className="mt-1 text-[10px] font-bold text-red-600">
              Notes are required before this step can be recorded.
            </p>
          )}
        </div>
      </section>

      {/* Sticky submit bar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 p-3 shadow-tech backdrop-blur sm:static sm:rounded-xl sm:border sm:bg-white sm:p-4">
        <div className="flex flex-col-reverse items-center gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onReinspection}
            disabled={!isOfficer || !property}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" /> Request Reinspection
          </button>
          <button
            type="button"
            onClick={handleCorrectionRequest}
            disabled={!isOfficer || !property}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FlaskConical className="h-3.5 w-3.5" /> Request Correction
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ClipboardCheck className="h-4 w-4" /> Submit
          </button>
        </div>
      </div>

      {/* Demo Data Correction Request dialog */}
      {showCorrectionDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCorrectionDialog(false); }}
        >
          <div className="w-full max-w-md rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <FilePenLine className="h-4 w-4 text-amber-600" /> Demo Data Correction Request
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              This is a demo request routed to the registry maintainers. It does not modify any
              government cadastral record.
            </p>

            <label htmlFor="correction-category-field" className="mt-3 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Correction Category
            </label>
            <select
              id="correction-category-field"
              value={correctionCategory}
              onChange={(e) => setCorrectionCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option>Geometry Correction</option>
              <option>Spatial Identifier Correction</option>
              <option>Parcel Boundary Review</option>
              <option>Property Relationship Review</option>
            </select>

            <label htmlFor="correction-notes-field" className="mt-3 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              id="correction-notes-field"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => setNotesTouched(true)}
              placeholder="Describe the correction required…"
              className={cn(
                "mt-1 w-full resize-none rounded-lg border bg-white px-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20",
                notesTouched && !notes.trim() ? "border-red-400" : "border-slate-300 focus:border-cyan-500",
              )}
            />
            {notesTouched && !notes.trim() && (
              <p role="alert" className="mt-1 text-[10px] font-bold text-red-600">
                Notes are required before submission.
              </p>
            )}

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowCorrectionDialog(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:border-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!notes.trim()}
                onClick={handleCorrectionSubmit}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" /> Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {submittedCorrection && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-2xl">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
            <p className="mt-2 text-xs font-bold text-emerald-900">Demo correction request submitted</p>
            <button
              type="button"
              onClick={() => setSubmittedCorrection(false)}
              className="mt-3 rounded-xl bg-cyan-600 px-3 py-1.5 text-[10px] font-bold text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
}

