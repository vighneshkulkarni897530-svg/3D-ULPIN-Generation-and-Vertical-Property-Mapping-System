"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Search,
  MapPin,
  Link2,
  Building2,
  Compass,
  ClipboardCheck,
  Smartphone,
  TriangleAlert,
  Lock,
  History,
  X,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { GisStatusBadge } from "@/components/common/GisStatusBadge";
import { useGIS, type VerificationActionDetails } from "@/context/GISContext";
import { useAuth } from "@/context/AuthContext";
import { formatArea, formatCoordinate, formatElevation, formatRelativeTime, geometryTypeLabel } from "@/lib/gisUtils";
import { GpsCheckCard, type GpsCheckResult } from "@/components/verification/GpsCheckCard";
import { BoundaryCompareCard, simulateBoundaryComparison, type BoundaryComparison } from "@/components/verification/BoundaryCompareCard";
import { EvidencePanel, type DemoEvidencePhoto } from "@/components/verification/EvidencePanel";
import { VerificationTimeline } from "@/components/verification/VerificationTimeline";
import { DecisionDialog, type VerificationAction } from "@/components/verification/DecisionDialog";
import type { PropertyUnit, PropertyVerificationStatus } from "@/types/gis";
import { cn } from "@/lib/utils";

const QUEUE_FILTERS: Array<{ key: "All" | PropertyVerificationStatus; label: string }> = [
  { key: "All", label: "All" },
  { key: "Pending", label: "Pending" },
  { key: "Under Review", label: "Under Review" },
  { key: "Field Verification", label: "Field Verification" },
  { key: "Reinspection Required", label: "Reinspection Required" },
  { key: "Verified", label: "Verified" },
  { key: "Rejected", label: "Rejected" },
];

/** Officer-capable roles may mutate verification state. */
const isOfficerRole = (role: string) => role === "OFFICER" || role === "ADMIN";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PERMISSIONS } from "@/types/auth";

export default function VerificationCentrePage() {
  return (
    <ProtectedRoute permission={PERMISSIONS.VIEW_VERIFICATION_QUEUE}>
      <VerificationCentrePageContent />
    </ProtectedRoute>
  );
}

function VerificationCentrePageContent() {
  return (
    <React.Suspense fallback={null}>
      <VerificationCentre />
    </React.Suspense>
  );
}

function VerificationCentre() {
  const {
    properties,
    buildings,
    floors,
    selectProperty,
    selectedPropertyId,
    verifyProperty,
    rejectProperty,
    requestReinspection,
    sendToFieldVerification,
  } = useGIS();
  const { currentUser, role } = useAuth();
  const searchParams = useSearchParams();

  const officer = isOfficerRole(role);

  // ── Queue state ──
  const [statusFilter, setStatusFilter] = React.useState<"All" | PropertyVerificationStatus>("All");
  const [query, setQuery] = React.useState("");
  const [buildingFilter, setBuildingFilter] = React.useState<string>("");
  const [queueVisible, setQueueVisible] = React.useState(false);

  // ── Workspace state ──
  const [gpsResult, setGpsResult] = React.useState<GpsCheckResult | null>(null);
  const [photo, setPhoto] = React.useState<DemoEvidencePhoto | null>(null);
  const [decision, setDecision] = React.useState<VerificationAction | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const selected = properties.find((p) => p.id === selectedPropertyId) ?? null;

  // ?property= deep link (global search, property page, dashboards).
  // Accepts GIS unit IDs (PROP-102-301) and legacy PropertyItem IDs
  // (prop-pun-003) — the latter resolves through the unit's propertyId map.
  React.useEffect(() => {
    const param = searchParams.get("property");
    if (!param) return;
    if (properties.some((p) => p.id === param)) {
      selectProperty(param);
    } else {
      const mapped = properties.find((p) => p.propertyId === param);
      if (mapped) selectProperty(mapped.id);
      else setNotice(`Property "${param}" was not found in the verification registry.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Reset simulated evidence when the inspected property changes.
  React.useEffect(() => {
    setGpsResult(null);
    setPhoto(null);
  }, [selectedPropertyId]);

  // ── Derived queue ──
  const counts = React.useMemo(() => {
    const c: Record<string, number> = { All: properties.length };
    for (const p of properties) c[p.verificationStatus] = (c[p.verificationStatus] ?? 0) + 1;
    return c;
  }, [properties]);

  const queue = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return properties
      .filter((p) => (statusFilter === "All" ? true : p.verificationStatus === statusFilter))
      .filter((p) => (buildingFilter ? p.buildingId === buildingFilter : true))
      .filter(
        (p) =>
          !q ||
          p.id.toLowerCase().includes(q) ||
          p.demoSpatialId.toLowerCase().includes(q) ||
          (p.ownerReferenceName ?? "").toLowerCase().includes(q),
      )
      .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
  }, [properties, statusFilter, buildingFilter, query]);

  const boundary = React.useMemo(() => (selected ? simulateBoundaryComparison(selected) : null), [selected]);

  // ── Officer decision ──
  const confirmDecision = React.useCallback(
    (notes: string) => {
      if (!selected || !decision) return;
      const gpsOk = gpsResult ? gpsResult.matched : undefined;
      const boundaryOk = boundary ? boundary.comparison.status === "Matched" : undefined;
      const details: VerificationActionDetails = {
        gpsMatched: gpsOk,
        boundaryMatched: boundaryOk,
        method: gpsOk ? "RTK_GNSS" : "VISUAL_INSPECTION",
        confidenceScore:
          gpsOk && boundaryOk ? 92 : gpsOk || boundaryOk ? 74 : 48,
        photoUrl: photo?.name,
      };
      if (decision === "verify") verifyProperty(selected.id, currentUser.name, notes, details);
      else if (decision === "reject") rejectProperty(selected.id, currentUser.name, notes);
      else if (decision === "reinspection") requestReinspection(selected.id, currentUser.name, notes);
      else sendToFieldVerification(selected.id, currentUser.name, notes);
      setDecision(null);
    },
    [selected, decision, gpsResult, boundary, photo, verifyProperty, rejectProperty, requestReinspection, sendToFieldVerification, currentUser.name],
  );

  const selectFromQueue = (id: string) => {
    selectProperty(id);
    setQueueVisible(false);
  };

  return (
    <PageContainer>
      <div className="space-y-5">
        {/* Invalid ?property= notice */}
        {notice && (
          <div role="alert" className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-[11.5px] font-semibold text-amber-800">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{notice}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notice" className="rounded p-0.5 hover:text-amber-950">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {!officer && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-4 py-2.5 text-[11.5px] font-semibold text-slate-600">
            <Lock className="h-4 w-4 shrink-0 text-slate-400" />
            Read-only mode — verification decisions require an officer account. Switch role from the top bar to act on the queue.
          </div>
        )}

        <PageHeader
          eyebrow="VERIFICATION CENTRE"
          title="Property Verification Workflow"
          description="Review spatial evidence, run the demo GPS and boundary checks, then seal or flag vertical property units."
          actions={
            <Link
              href="/verification/field"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-tech-cyan transition-all hover:from-cyan-400 hover:to-blue-500"
            >
              <Smartphone className="h-4 w-4" /> Open Field Mode
            </Link>
          }
        />

        {/* Workspace grid: queue + inspection panel */}
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          {/* Mobile queue toggle */}
          <button
            type="button"
            onClick={() => setQueueVisible(true)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-tech xl:hidden"
            aria-expanded={queueVisible}
          >
            <span className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
              <ClipboardCheck className="h-4 w-4 text-cyan-600" /> Verification queue
            </span>
            <span className="font-mono text-[11px] font-bold text-slate-500">
              {selected ? selected.id : `${queue.length} in view`}
            </span>
          </button>

          {/* Queue panel — sidebar on desktop, drawer on mobile */}
          <aside
            className={cn(
              "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-tech xl:sticky xl:top-24 xl:block",
              queueVisible ? "fixed inset-x-3 bottom-3 top-20 z-50 flex flex-col rounded-2xl shadow-2xl" : "hidden",
            )}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-900">
                <ClipboardCheck className="h-4 w-4 text-cyan-600" /> Verification Queue
              </p>
              {queueVisible && (
                <button type="button" onClick={() => setQueueVisible(false)} aria-label="Close queue" className="rounded-md border border-slate-200 p-1 text-slate-500 hover:text-slate-900">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {/* Status chips */}
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
                {QUEUE_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={statusFilter === f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors",
                      statusFilter === f.key
                        ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-700",
                    )}
                  >
                    {f.label}
                    <span className="ml-1 font-mono">{counts[f.key] ?? 0}</span>
                  </button>
                ))}
              </div>

              {/* Search + building filter */}
              <div className="mt-3 space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Property ID, Demo Spatial ID or owner…"
                    aria-label="Search the verification queue"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white"
                  />
                </div>
                <select
                  value={buildingFilter}
                  onChange={(e) => setBuildingFilter(e.target.value)}
                  aria-label="Filter by building"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-colors focus:border-cyan-400 focus:bg-white"
                >
                  <option value="">All buildings</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.buildingCode} — {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Queue list */}
              <ul className="mt-3 space-y-2">
                {queue.map((p) => (
                  <li key={p.id}>
                    <QueueRow property={p} active={p.id === selectedPropertyId} onSelect={() => selectFromQueue(p.id)} />
                  </li>
                ))}
              </ul>

              {queue.length === 0 && (
                <EmptyState
                  icon={<Search className="h-7 w-7" />}
                  title="No properties match"
                  description="Adjust the status filter, building or search text to find units in the queue."
                />
              )}
            </div>
          </aside>

          {/* Inspection workspace */}
          <section aria-label="Property verification workspace" className="min-w-0 space-y-4">
            {!selected ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
                <EmptyState
                  icon={<ClipboardCheck className="h-7 w-7" />}
                  title="No property selected"
                  description="Choose a unit from the verification queue to review its spatial evidence and record an officer decision."
                />
              </div>
            ) : (
              <VerificationWorkspace
                property={selected}
                officer={officer}
                gpsResult={gpsResult}
                onGpsResult={setGpsResult}
                boundary={boundary}
                photo={photo}
                onPhotoChange={setPhoto}
                onDecision={setDecision}
              />
            )}
          </section>
        </div>

        {/* Confirmation dialog for every officer decision */}
        <DecisionDialog
          open={decision !== null}
          action={decision}
          property={selected}
          onClose={() => setDecision(null)}
          onConfirm={confirmDecision}
        />
      </div>
    </PageContainer>
  );
}

// ── Workspace column ────────────────────────────────────────────────────────

function VerificationWorkspace({
  property,
  officer,
  gpsResult,
  onGpsResult,
  boundary,
  photo,
  onPhotoChange,
  onDecision,
}: {
  property: PropertyUnit;
  officer: boolean;
  gpsResult: GpsCheckResult | null;
  onGpsResult: (r: GpsCheckResult | null) => void;
  boundary: { ring: [number, number][]; comparison: BoundaryComparison } | null;
  photo: DemoEvidencePhoto | null;
  onPhotoChange: (p: DemoEvidencePhoto | null) => void;
  onDecision: (a: VerificationAction) => void;
}) {
  const { buildings, floors, parcels } = useGIS();
  const building = buildings.find((b) => b.id === property.buildingId);
  const floor = floors.find((f) => f.id === property.floorId);
  const parcel = parcels.find((p) => p.id === property.parcelId);

  return (
    <div className="space-y-4">
      {/* Selection header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-cyan-600">Property Inspection</p>
            <h2 className="mt-0.5 font-mono text-base font-black text-slate-900">{property.id}</h2>
            <p className="truncate text-[11px] font-semibold text-slate-500">
              {property.ownerReferenceName ?? "Owner reference on file"} · Unit {property.unitNumber}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <GisStatusBadge status={property.verificationStatus} kind="property" />
            <Link
              href={`/map?property=${property.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 transition-colors hover:border-cyan-400 hover:text-cyan-700"
            >
              <MapPin className="h-3 w-3" /> View on Map
            </Link>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3.5 sm:grid-cols-4">
          <Fact label="Building" value={building ? `${building.buildingCode}` : property.buildingId} />
          <Fact label="Floor" value={floor?.name ?? property.floorId} />
          <Fact label="Type" value={property.propertyType} />
          <Fact label="Area" value={`${property.area.toLocaleString("en-IN")} sq ft`} />
        </div>
      </div>

      {/* Property + spatial information */}
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard title="Property Information">
          <InfoRow label="Property ID" value={property.id} mono />
          <InfoRow label="Demo Spatial Identifier" value={property.demoSpatialId} mono />
          <InfoRow
            label="Official ULPIN"
            value={
              property.officialUlpinReference ? (
                <span className="font-mono text-emerald-700">{property.officialUlpinReference}</span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600">
                  External Government Integration Required
                </span>
              )
            }
          />
          <InfoRow label="Building" value={building ? `${building.buildingCode} — ${building.name}` : property.buildingId} />
          <InfoRow label="Floor" value={floor ? `${floor.name} (Level ${floor.floorNumber})` : property.floorId} />
          <InfoRow label="Unit Number" value={property.unitNumber} mono />
          <InfoRow label="Property Type" value={property.propertyType} />
          <InfoRow label="Area" value={`${property.area.toLocaleString("en-IN")} sq ft`} mono />
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[9.5px] leading-relaxed text-amber-800">
            <strong className="font-black">Demo Spatial Identifier</strong> — platform-generated for this demo
            environment. It is <strong>not</strong> a legally valid government ULPIN.
          </p>
        </InfoCard>

        <InfoCard title="Spatial Information">
          <InfoRow label="Latitude" value={property.latitude.toFixed(6)} mono />
          <InfoRow label="Longitude" value={property.longitude.toFixed(6)} mono />
          <InfoRow label="Elevation" value={formatElevation(property.elevation)} mono />
          <InfoRow label="Parent Parcel" value={parcel?.parcelNumber ?? property.parcelId} mono />
          <InfoRow label="Geometry Status" value={geometryTypeLabel(property.geometry.type, property.dataSource)} />
          <InfoRow label="Data Source" value={property.dataSource.replace(/_/g, " ")} />
          <InfoRow label="Last Updated" value={formatRelativeTime(property.lastUpdated)} />
          <InfoRow label="Extraction Confidence" value={`${Math.round(property.demoSpatialIdMetadata.confidence * 100)}%`} mono />
        </InfoCard>
      </div>

      {/* Demo GPS + boundary checks */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GpsCheckCard
          expectedLat={property.latitude}
          expectedLng={property.longitude}
          result={gpsResult}
          onResult={onGpsResult}
        />
        <BoundaryCompareCard property={property} />
      </div>

      {/* Evidence: checklist, demo photo upload, previous notes */}
      <EvidencePanel
        property={property}
        gps={gpsResult}
        boundary={boundary ? boundary.comparison : null}
        photo={photo}
        onPhotoChange={onPhotoChange}
      />

      {/* Verification history */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-900">
          <History className="h-4 w-4 text-cyan-600" /> Verification History
        </p>
        <div className="mt-3">
          <VerificationTimeline propertyId={property.id} />
        </div>
      </section>

      {/* Officer decision */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-900">
          <ShieldCheck className="h-4 w-4 text-cyan-600" /> Officer Decision
        </p>
        {!officer && (
          <p className="mt-2 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold text-slate-500">
            <Lock className="h-3 w-3" /> Read-only — switch to an officer role in the top bar to record decisions.
          </p>
        )}
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <DecisionButton tone="primary" icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Verify Property" disabled={!officer} onClick={() => onDecision("verify")} />
          <DecisionButton tone="danger" icon={<X className="h-3.5 w-3.5" />} label="Reject Property" disabled={!officer} onClick={() => onDecision("reject")} />
          <DecisionButton tone="warn" icon={<TriangleAlert className="h-3.5 w-3.5" />} label="Request Re-inspection" disabled={!officer} onClick={() => onDecision("reinspection")} />
          <DecisionButton tone="neutral" icon={<Smartphone className="h-3.5 w-3.5" />} label="Send to Field" disabled={!officer} onClick={() => onDecision("field")} />
        </div>
        <p className="mt-2.5 text-[9.5px] leading-relaxed text-slate-400">
          Decisions are recorded in the centralized verification registry and instantly synchronize to the GIS map,
          dashboard statistics and the activity feed — no page refresh required.
        </p>
      </section>
    </div>
  );
}

// ── Small shared pieces ─────────────────────────────────────────────────────

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[8.5px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="truncate font-mono text-[11px] font-bold text-slate-800">{value}</p>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-900">
        <Compass className="h-4 w-4 text-cyan-600" /> {title}
      </p>
      <dl className="mt-2">{children}</dl>
    </section>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-1.5 last:border-0">
      <dt className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={cn("min-w-0 break-words text-right text-[11px] font-semibold text-slate-800", mono && "font-mono")}>
        {value}
      </dd>
    </div>
  );
}

function DecisionButton({
  tone,
  icon,
  label,
  disabled,
  onClick,
}: {
  tone: "primary" | "danger" | "warn" | "neutral";
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const tones: Record<string, string> = {
    primary: "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 hover:from-cyan-400 hover:to-blue-500",
    danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    warn: "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    neutral: "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? "Switch to an officer role to record decisions" : label}
      className={cn(
        "flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-all",
        tones[tone],
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {icon} {label}
    </button>
  );
}

function QueueRow({
  property,
  active,
  onSelect,
}: {
  property: PropertyUnit;
  active: boolean;
  onSelect: () => void;
}) {
  const { buildings, floors } = useGIS();
  const building = buildings.find((b) => b.id === property.buildingId);
  const floor = floors.find((f) => f.id === property.floorId);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "w-full rounded-xl border p-3 text-left transition-colors",
        active
          ? "border-cyan-500 bg-cyan-50/70 ring-1 ring-cyan-400/40"
          : "border-slate-200 bg-slate-50 hover:border-cyan-300 hover:bg-white",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-black text-slate-900">{property.id}</span>
        <GisStatusBadge status={property.verificationStatus} kind="property" />
      </div>
      <p className="mt-1 truncate font-mono text-[9.5px] text-slate-500">{property.demoSpatialId}</p>
      <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-600">
        {building?.buildingCode ?? property.buildingId} · {floor?.name ?? property.floorId} · {property.propertyType}
      </p>
      <p className="text-[9px] text-slate-400">Updated {formatRelativeTime(property.lastUpdated)}</p>
    </button>
  );
}
