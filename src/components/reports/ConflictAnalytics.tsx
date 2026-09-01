"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Map as MapIcon } from "lucide-react";
import { DonutChart, HBarChart, type DonutSegment, type HBarDatum } from "@/components/dashboard/charts";
import { SectionHeader } from "@/components/layout/PageHeader";
import { CONFLICT_SEVERITY_COLORS, type ReportAnalytics } from "@/lib/reportAnalytics";

interface ConflictAnalyticsProps {
  analytics: ReportAnalytics;
  className?: string;
}

/**
 * Section C — Conflict Analytics. Severity distribution, open vs resolved
 * mix, groupings by parcel/building, and real action links into the existing
 * conflict workspace and GIS map deep links.
 */
export function ConflictAnalytics({ analytics, className }: ConflictAnalyticsProps) {
  const a = analytics;

  const severityData: HBarDatum[] = a.severitySlices.map((s) => ({
    key: s.severity,
    label: s.severity,
    value: s.open,
    sub: `${s.resolved} resolved`,
    color: CONFLICT_SEVERITY_COLORS[s.severity],
  }));

  const openResolvedSegments: DonutSegment[] = [
    { key: "open", label: "Open", value: a.openConflicts, color: "#EF4444" },
    { key: "resolved", label: "Resolved", value: a.resolvedConflicts, color: "#10B981" },
  ].filter((s) => s.value > 0);

  const groupRows = (rows: Array<{ id: string; label: string; open: number; resolved: number }>, emptyLabel: string) => {
    if (rows.length === 0) {
      return <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-400">{emptyLabel}</p>;
    }
    return (
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
            <span className="min-w-0 truncate text-[11px] font-bold text-slate-800" title={row.label}>{row.label}</span>
            <span className="flex shrink-0 items-center gap-2 text-[10px] font-bold">
              <span className={row.open > 0 ? "rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-red-600" : "rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-slate-400"}>
                {row.open} open
              </span>
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-emerald-700">{row.resolved} resolved</span>
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <section className={className} aria-label="Conflict analytics">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
        <SectionHeader
          icon={<AlertTriangle className="h-4 w-4" />}
          title="C · Conflict Analytics"
          description={`${a.totalConflicts} demo conflicts in scope — ${a.openConflicts} open, ${a.criticalConflicts} critical, ${a.resolvedConflicts} resolved`}
          action={
            <Link href="/conflicts" className="flex items-center gap-1 text-[11px] font-bold text-cyan-700 transition-colors hover:underline">
              Conflict workspace <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Open conflicts by severity</p>
            <HBarChart data={severityData} ariaLabel="Open conflicts by severity" emptyLabel="No conflicts recorded in the current scope." />
            <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-slate-400">
              Demo spatial conflict detection — prototype validation, not a legal determination
            </p>
          </div>
          <div>
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Open vs resolved</p>
            {a.totalConflicts === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-[11px] text-slate-400">
                No conflicts in the current scope.
              </p>
            ) : (
              <div className="flex justify-center">
                <DonutChart
                  segments={openResolvedSegments}
                  centerLabel={String(a.openConflicts)}
                  centerSub="Open"
                  size={140}
                  strokeWidth={18}
                  ariaLabel="Open versus resolved conflicts donut chart"
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Conflicts grouped by land parcel</p>
            {groupRows(a.conflictsByParcel, "No parcel-level conflicts in the current scope.")}
          </div>
          <div>
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Conflicts grouped by building</p>
            {groupRows(a.conflictsByBuilding, "No building-level conflicts in the current scope.")}
          </div>
        </div>

        {a.criticalConflicts > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <p className="min-w-0 flex-1 text-[11px] font-bold text-red-800">
              {a.criticalConflicts} critical demo conflict{a.criticalConflicts === 1 ? "" : "s"} in this scope — review the investigation workspace before scheduling field work.
            </p>
            <Link href="/conflicts" className="flex items-center gap-1 rounded-xl bg-red-600 px-3 py-1.5 text-[10px] font-extrabold text-white transition-colors hover:bg-red-700">
              <MapIcon className="h-3 w-3" /> Investigate
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}