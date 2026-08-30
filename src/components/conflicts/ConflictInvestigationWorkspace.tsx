"use client";

import * as React from "react";
import Link from "next/link";
import {
  ExternalLink,
  MapPin,
  Hash,
  Building2,
  ScanSearch,
  TriangleAlert,
  CheckCircle2,
  Box,
  Fingerprint,
  Edit3,
} from "lucide-react";
import type { SpatialConflict } from "@/types/conflict";
import type { LandParcel, Building, Floor, PropertyUnit } from "@/types/gis";
import type { ActivityRecord } from "@/types/activity";
import { GisStatusBadge } from "@/components/common/GisStatusBadge";
import { SpatialAnalysisView } from "@/components/conflicts/SpatialAnalysisView";
import { ConflictResolutionHistory } from "@/components/conflicts/ConflictResolutionHistory";
import { ConflictActionDialog, type ConflictAction } from "@/components/conflicts/ConflictActionDialog";
import { formatRelativeTime, getPropertyLineage } from "@/lib/gisUtils";
import { cn } from "@/lib/utils";

export interface ConflictInvestigationWorkspaceProps {
  conflict: SpatialConflict;
  parcels: LandParcel[];
  buildings: Building[];
  floors: Floor[];
  properties: PropertyUnit[];
  activities: ActivityRecord[];
  isOfficer: boolean;
  currentUserName: string;
  onResolve: (conflictId: string, notes: string) => void;
  onSendFieldReview: (conflictId: string, notes: string) => void;
  onRequestCorrection: (conflictId: string, category: string, notes: string) => void;
  className?: string;
}
/**
 * Conflict Investigation Workspace — a professional GIS spatial investigation
 * view. All entity details are resolved from the centralized GIS registry;
 * officer actions flow through GISContext.
 */
export function ConflictInvestigationWorkspace({
  conflict,
  parcels,
  buildings,
  floors,
  properties,
  activities,
  isOfficer,
  currentUserName,
  onResolve,
  onSendFieldReview,
  onRequestCorrection,
  className,
}: ConflictInvestigationWorkspaceProps) {
  const [action, setAction] = React.useState<ConflictAction | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const affectedUnits = properties.filter((p) => conflict.affectedPropertyIds.includes(p.id));
  const parcel = parcels.find((p) => p.id === conflict.parcelId);
  const building = buildings.find((b) => b.id === conflict.buildingId);
  const detectedSource = detectSource(conflict);

  const openAction = (a: ConflictAction) => {
    setAction(a);
    setDialogOpen(true);
  };

  const handleConfirm = (notes: string, category?: string) => {
    if (!action) return;
    if (action === "resolve") onResolve(conflict.id, notes);
    else if (action === "field") onSendFieldReview(conflict.id, notes);
    else if (action === "correction" && category) onRequestCorrection(conflict.id, category, notes);
    setDialogOpen(false);
    setAction(null);
  };

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {/* ── Conflict Summary Header ── */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-tech">
        <div className="relative border-b border-slate-100 bg-slate-950 px-5 py-4 text-white">
          <div className="absolute inset-0 tech-grid-dark opacity-40" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-cyan-400">
                <TriangleAlert className="h-3 w-3" /> Spatial Conflict
              </p>
              <h2 className="mt-1 truncate text-base font-black tracking-tight">{conflict.conflictNumber}</h2>
              <p className="mt-0.5 text-[11px] text-slate-300">{conflict.type}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <GisStatusBadge status={conflict.severity} kind="severity" />
              <GisStatusBadge status={conflict.status} kind="conflict-status" />
            </div>
          </div>
          <p className="relative mt-2.5 text-[11px] leading-relaxed text-slate-300">{conflict.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-3 lg:grid-cols-5">
          <InfoCell label="Detected" value={<span className="font-mono">{formatRelativeTime(conflict.detectedAt)}</span>} />
          <InfoCell label="Source" value={detectedSource} />
          <InfoCell label="Last Updated" value={conflict.lastActionAt ? formatRelativeTime(conflict.lastActionAt) : "—"} />
          <InfoCell label="Affected Units" value={`${affectedUnits.length}`} />
          <InfoCell
            label="Location"
            value={
              <span className="truncate">
                {building?.name ?? conflict.buildingId ?? "—"}
                {parcel ? ` · ${parcel.parcelNumber}` : ""}
              </span>
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
          <Link
            href={`/map?conflict=${conflict.id}`}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[10.5px] font-bold text-cyan-300 transition-colors hover:bg-slate-800"
          >
            <MapPin className="h-3.5 w-3.5" /> View on Map
          </Link>
          <span className="ml-auto text-[8px] font-mono font-bold uppercase tracking-widest text-amber-600">
            Demo Spatial Conflict · prototype validation
          </span>
        </div>
      </section>

      {/* ── Conflict Information + Affected Entities ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <InfoSection title="Conflict Information" icon={<Hash className="h-3.5 w-3.5" />}>
          <InfoRow label="Conflict ID" value={conflict.id} mono />
          <InfoRow label="Conflict Number" value={conflict.conflictNumber} mono />
          <InfoRow label="Type" value={conflict.type} />
          <InfoRow label="Severity" value={<GisStatusBadge status={conflict.severity} kind="severity" />} />
          <InfoRow label="Status" value={<GisStatusBadge status={conflict.status} kind="conflict-status" />} />
          <InfoRow label="Detected Date" value={<span className="font-mono">{formatDateTime(conflict.detectedAt)}</span>} />
          <InfoRow label="Detection Source" value={detectedSource} />
          <InfoRow
            label="Last Updated"
            value={conflict.lastActionAt ? <span className="font-mono">{formatDateTime(conflict.lastActionAt)}</span> : <span className="text-slate-300">—</span>}
          />
          {conflict.resolvedAt && (
            <>
              <InfoRow label="Resolved Date" value={<span className="font-mono">{formatDateTime(conflict.resolvedAt)}</span>} />
              <InfoRow label="Resolved By" value={conflict.resolvedBy ?? "—"} />
              <InfoRow label="Resolution Notes" value={conflict.resolutionNotes ?? "—"} />
            </>
          )}
        </InfoSection>

        <InfoSection title="Affected Entities" icon={<ScanSearch className="h-3.5 w-3.5" />}>
          {affectedUnits.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-6 text-center text-[10px] text-slate-400">
              No affected property units could be resolved from the registry.
            </p>
          ) : (
            <div className="space-y-2.5">
              {affectedUnits.map((unit) => (
                <AffectedEntityCard
                  key={unit.id}
                  unit={unit}
                  parcels={parcels}
                  buildings={buildings}
                  floors={floors}
                />
              ))}
            </div>
          )}
        </InfoSection>
      </div>

      {/* ── Spatial Analysis ── */}
      <SpatialAnalysisView conflict={conflict} properties={properties} parcels={parcels} buildings={buildings} />

      {/* ── Resolution History ── */}
      <ConflictResolutionHistory conflict={conflict} activities={activities} />

      {/* ── Officer Action ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
        <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
          <Edit3 className="h-3 w-3" /> Officer Action
        </p>
        <p className="mt-1 text-[11px] font-semibold text-slate-500">
          Record the next step for this conflict. Actions are logged to the activity feed and update dashboard metrics.
        </p>

        {!isOfficer ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] font-semibold text-amber-800">
            Read-only mode — switch to an <strong>Officer</strong> or <strong>Admin</strong> persona to take resolution actions.
          </div>
        ) : conflict.status === "Resolved" ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[10px] font-semibold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" /> This conflict is already resolved. No further actions are available.
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <ActionButton
              tone="success"
              label="Mark as Resolved"
              icon={<CheckCircle2 className="h-4 w-4" />}
              onClick={() => openAction("resolve")}
            />
            <ActionButton
              tone="blue"
              label="Send for Field Review"
              icon={<MapPin className="h-4 w-4" />}
              onClick={() => openAction("field")}
            />
            <ActionButton
              tone="amber"
              label="Request Data Correction"
              icon={<Building2 className="h-4 w-4" />}
              onClick={() => openAction("correction")}
            />
          </div>
        )}

        <p className="mt-3 text-[8px] font-mono uppercase tracking-widest text-slate-400">
          Officer: {currentUserName || "—"}
        </p>
      </section>

      <ConflictActionDialog
        open={dialogOpen}
        action={action}
        conflict={conflict}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function detectSource(conflict: SpatialConflict): string {
  if (conflict.type === "Duplicate Spatial ID") return "AI Extraction Pipeline";
  return "Spatial Analysis Engine";
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-0.5 text-[11px] font-bold text-slate-800">{value}</p>
    </div>
  );
}

function InfoSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
      <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
        {icon} {title}
      </p>
      <div className="mt-2">{children}</div>
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

function AffectedEntityCard({
  unit,
  parcels,
  buildings,
  floors,
}: {
  unit: PropertyUnit;
  parcels: LandParcel[];
  buildings: Building[];
  floors: Floor[];
}) {
  const lineage = getPropertyLineage(unit, parcels, buildings, floors);
  const parcel = lineage.parcel;
  const building = lineage.building;
  const floor = lineage.floor;
  const legacyPropertyId = unit.propertyId;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-[11px] font-black text-slate-900">{unit.id}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate font-mono text-[9.5px] text-slate-500">
            <Fingerprint className="h-3 w-3 shrink-0 text-cyan-600" />
            {unit.demoSpatialId}
          </p>
        </div>
        <GisStatusBadge status={unit.verificationStatus} kind="property" className="shrink-0" />
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[9.5px]">
        <EntityRow label="Building" value={building?.name ?? unit.buildingId} />
        <EntityRow label="Floor" value={floor?.name ?? unit.floorId} />
        <EntityRow label="Parent Parcel" value={parcel?.parcelNumber ?? unit.parcelId} />
        <EntityRow label="Unit Type" value={unit.propertyType} />
      </dl>

      <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-200 pt-2.5">
        <Link
          href={`/properties/${legacyPropertyId}`}
          className="flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[9.5px] font-bold text-cyan-300 transition-colors hover:bg-slate-800"
        >
          <ExternalLink className="h-3 w-3" /> Open Property
        </Link>
        <Link
          href={`/map?property=${unit.id}`}
          className="flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-[9.5px] font-bold text-slate-600 transition-colors hover:border-cyan-400 hover:text-cyan-700"
        >
          <Box className="h-3 w-3" /> View in 3D
        </Link>
      </div>
    </div>
  );
}

function EntityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <dt className="shrink-0 text-[8px] font-black uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="min-w-0 truncate font-semibold text-slate-700">{value}</dd>
    </div>
  );
}

function ActionButton({
  tone,
  label,
  icon,
  onClick,
}: {
  tone: "success" | "blue" | "amber";
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const tones: Record<string, string> = {
    success: "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-400 hover:to-green-500",
    blue: "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 hover:from-cyan-400 hover:to-blue-500",
    amber: "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[10.5px] font-bold transition-all", tones[tone])}
    >
      {icon} {label}
    </button>
  );
}