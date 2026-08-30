"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  TriangleAlert,
  AlertTriangle,
  Activity,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Box,
  FlaskConical,
  X,
  Info,
  ListOrdered,
  ScanSearch,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageLoader } from "@/components/layout/LoadingState";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ConflictDistributions } from "@/components/conflicts/ConflictDistributions";
import { ConflictQueue } from "@/components/conflicts/ConflictQueue";
import { ConflictInvestigationWorkspace } from "@/components/conflicts/ConflictInvestigationWorkspace";
import { ValidationRunPanel } from "@/components/conflicts/ValidationRunPanel";
import { EmptyState } from "@/components/ui/empty-state";
import { useGIS } from "@/context/GISContext";
import { useAuth } from "@/context/AuthContext";
import { selectOpenConflicts } from "@/lib/gisSelectors";
import { cn } from "@/lib/utils";
import type { SpatialConflict } from "@/types/conflict";
import type { ValidationReport } from "@/lib/spatialValidation";

export default function ConflictsPage() {
  return (
    <React.Suspense fallback={<PageLoader label="Preparing Spatial Conflict Center…" />}>
      <ConflictsCenter />
    </React.Suspense>
  );
}

function ConflictsCenter() {
  const {
    conflicts,
    properties,
    parcels,
    buildings,
    floors,
    activities,
    resolveConflict,
    sendConflictToFieldReview,
    requestConflictCorrection,
    recordSpatialValidation,
    addActivity,
  } = useGIS();
  const { role, currentUser } = useAuth();
  const searchParams = useSearchParams();

  const isOfficer = role === "OFFICER" || role === "ADMIN";
  const officerName = currentUser?.name || "Demo Officer";

  const [selectedConflictId, setSelectedConflictId] = React.useState<string | null>(null);
  const [queueOpen, setQueueOpen] = React.useState(true);
  const [investigationOpen, setInvestigationOpen] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [invalidConflictId, setInvalidConflictId] = React.useState<string | null>(null);

  // ── ?conflict=CONFLICT-ID deep link support ──
  React.useEffect(() => {
    const conflictParam = searchParams.get("conflict");
    if (conflictParam) {
      const match = conflicts.find((c) => c.id === conflictParam || c.conflictNumber === conflictParam);
      if (match) {
        setSelectedConflictId(match.id);
        setInvestigationOpen(true);
        setInvalidConflictId(null);
      } else {
        setInvalidConflictId(conflictParam);
        setNotice(`No conflict matches "${conflictParam}".`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const selectedConflict = conflicts.find((c) => c.id === selectedConflictId) ?? null;

  const handleSelectConflict = (conflict: SpatialConflict) => {
    setSelectedConflictId(conflict.id);
    setInvestigationOpen(true);
    setQueueOpen(false);
    setInvalidConflictId(null);
  };

  const handleSearchByProperty = (propertyId: string) => {
    const affected = conflicts.filter((c) => c.affectedPropertyIds.includes(propertyId));
    if (affected.length > 0) {
      setSelectedConflictId(affected[0].id);
      setInvestigationOpen(true);
      setNotice(`Showing conflicts affecting ${propertyId}.`);
    } else {
      setNotice(`No conflicts affect ${propertyId}.`);
    }
  };

  const handleClearSearch = () => {
    setSelectedConflictId(null);
    setInvestigationOpen(false);
  };

  const handleResolve = (conflictId: string, notes: string) => {
    resolveConflict(conflictId, officerName, notes);
    setNotice(`Conflict ${conflictId} marked as resolved.`);
  };

  const handleFieldReview = (conflictId: string, notes: string) => {
    sendConflictToFieldReview(conflictId, officerName, notes);
    setNotice(`Conflict ${conflictId} sent for field review.`);
  };

  const handleCorrection = (conflictId: string, category: string, notes: string) => {
    requestConflictCorrection(conflictId, officerName, category, notes);
    setNotice(`Demo data correction request submitted for ${conflictId}.`);
  };

  const handleValidationComplete = (report: ValidationReport) => {
    recordSpatialValidation(report.runAt);
    addActivity({
      type: "CONFLICT_DETECTION",
      title: "Demo Spatial Validation Run",
      description: `Spatial validation completed: ${report.totals.confirmedConflicts} confirmed conflict(s), ${report.totals.newIssues} new issue(s).`,
      entityType: "SYSTEM",
      entityId: "SYS-SPATIAL-VALIDATION",
      timestamp: report.runAt,
      user: officerName,
      userRole: role,
      status: "COMPLETED",
      metadata: {
        checks: report.totals.checks,
        findings: report.totals.findings,
        confirmedConflicts: report.totals.confirmedConflicts,
        newIssues: report.totals.newIssues,
      },
    });
    setNotice("Demo spatial validation completed — deterministic results confirmed.");
  };

  // ── Live metrics (never hardcoded) ──
  const totalConflicts = conflicts.length;
  const openConflicts = selectOpenConflicts(conflicts).length;
  const criticalConflicts = conflicts.filter((c) => c.severity === "Critical").length;
  const highConflicts = conflicts.filter((c) => c.severity === "High").length;
  const resolvedConflicts = conflicts.filter((c) => c.status === "Resolved").length;

  return (
    <PageContainer className="max-w-[1600px]">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Spatial Conflict Management Center"
          title="Conflict Detection & Resolution"
          description="Live spatial problems across parcels, buildings, floors and vertical properties. All metrics derive from the centralized GIS registry."
          actions={
            <span className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" />
              Prototype Spatial Validation
            </span>
          }
        />

        {/* Invalid ID notice */}
        {invalidConflictId && (
          <div role="alert" className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[11px] font-semibold text-amber-800">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">
              No conflict found for <strong className="font-mono">{invalidConflictId}</strong>. Check the ID or browse the queue below.
            </span>
            <button type="button" onClick={() => setInvalidConflictId(null)} className="rounded p-0.5 hover:text-amber-900" aria-label="Dismiss">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Success / status notice */}
        {notice && (
          <div role="status" className="flex items-center gap-2 rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-3 text-[11px] font-semibold text-cyan-800">
            <Info className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{notice}</span>
            <button type="button" onClick={() => setNotice(null)} className="rounded p-0.5 hover:text-cyan-900" aria-label="Dismiss">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── Live KPI overview ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <DashboardCard
            label="Total Conflicts"
            value={String(totalConflicts)}
            sub="All registered spatial conflicts"
            icon={<AlertTriangle className="h-5 w-5" />}
            tone="navy"
          />
          <DashboardCard
            label="Open Conflicts"
            value={String(openConflicts)}
            sub={`${criticalConflicts} critical · ${highConflicts} high`}
            icon={<TriangleAlert className="h-5 w-5" />}
            tone="red"
          />
          <DashboardCard
            label="Critical"
            value={String(criticalConflicts)}
            sub="Severity: Critical"
            icon={<TriangleAlert className="h-5 w-5" />}
            tone="red"
          />
          <DashboardCard
            label="High"
            value={String(highConflicts)}
            sub="Severity: High"
            icon={<AlertTriangle className="h-5 w-5" />}
            tone="amber"
          />
          <DashboardCard
            label="Resolved"
            value={String(resolvedConflicts)}
            sub="Closed conflicts"
            icon={<CheckCircle2 className="h-5 w-5" />}
            tone="green"
          />
        </div>

        {/* ── Distributions ── */}
        <ConflictDistributions conflicts={conflicts} />

        {/* ── Validation pipeline ── */}
        <ValidationRunPanel
          parcels={parcels}
          buildings={buildings}
          floors={floors}
          properties={properties}
          conflicts={conflicts}
          onComplete={handleValidationComplete}
        />

        {/* ── Queue + Investigation layout ── */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
          {/* Conflict Queue */}
          <section className={cn("rounded-2xl border border-slate-200 bg-white shadow-tech", !queueOpen && "hidden xl:block")}>
            <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                <ListOrdered className="h-3 w-3" /> Conflict Queue
              </p>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[9px] font-bold text-slate-500">
                {selectOpenConflicts(conflicts).length} open
              </span>
            </header>
            <div className="sidebar-scroll max-h-[calc(100vh-300px)] overflow-y-auto p-4">
              <ConflictQueue
                conflicts={conflicts}
                properties={properties}
                selectedConflictId={selectedConflictId}
                onSelectConflict={handleSelectConflict}
                onSearchByProperty={handleSearchByProperty}
                onClearSearch={handleClearSearch}
              />
            </div>
          </section>

          {/* Investigation workspace */}
          <section className={cn("min-w-0", !investigationOpen && "hidden")}>
            {selectedConflict ? (
              <>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="mb-3 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 shadow-tech transition-colors hover:border-cyan-400 hover:text-cyan-700 xl:hidden"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to conflict queue
                </button>
                <ConflictInvestigationWorkspace
                conflict={selectedConflict}
                parcels={parcels}
                buildings={buildings}
                floors={floors}
                properties={properties}
                activities={activities}
                isOfficer={isOfficer}
                currentUserName={officerName}
                onResolve={handleResolve}
                onSendFieldReview={handleFieldReview}
                onRequestCorrection={handleCorrection}
              />
              </>
            ) : (
              <EmptyState
                icon={<ScanSearch className="h-7 w-7" />}
                title="Select a conflict to investigate"
                description="Choose a conflict from the queue on the left, or open one via the map. The investigation workspace shows affected entities, spatial analysis and resolution history."
              />
            )}
          </section>
        </div>

        {/* ── Activity feed summary (conflict-focused) ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
          <header className="mb-4 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
              <Activity className="h-3 w-3" /> Conflict Activity Feed
            </p>
            <Link href="/dashboard" className="flex items-center gap-1 text-[11px] font-bold text-cyan-700 hover:underline">
              Dashboard <ArrowRight className="h-3 w-3" />
            </Link>
          </header>
          <ConflictActivityFeed activities={activities} />
        </section>
      </div>
    </PageContainer>
  );
}

// ── Conflict-focused activity feed ──────────────────────────────────────────

function ConflictActivityFeed({ activities }: { activities: ReturnType<typeof useGIS>["activities"] }) {
  const conflictActivities = [...activities]
    .filter((a) => a.type.startsWith("CONFLICT_") || a.title.toLowerCase().includes("conflict"))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 8);

  if (conflictActivities.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-6 text-center text-[10px] text-slate-400">
        No conflict activities recorded yet.
      </p>
    );
  }

  return (
    <ol className="space-y-2.5">
      {conflictActivities.map((a) => (
        <li key={a.id} className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
            <ConflictGlyph type={a.type} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-extrabold text-slate-900">{a.title}</p>
              <span className="shrink-0 font-mono text-[8px] font-semibold text-slate-400">{a.user}</span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-slate-500">{a.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ConflictGlyph({ type }: { type: string }) {
  switch (type) {
    case "CONFLICT_DETECTION":
      return <TriangleAlert className="h-3.5 w-3.5" />;
    case "CONFLICT_RESOLUTION":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "CONFLICT_FIELD_REVIEW":
      return <Box className="h-3.5 w-3.5" />;
    case "CONFLICT_CORRECTION":
      return <FlaskConical className="h-3.5 w-3.5" />;
    default:
      return <Activity className="h-3.5 w-3.5" />;
  }
}