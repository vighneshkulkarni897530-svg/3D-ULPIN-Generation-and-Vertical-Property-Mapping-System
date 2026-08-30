"use client";

import * as React from "react";
import { BarChart3 } from "lucide-react";
import type { SpatialConflict, ConflictSeverity, ConflictStatus, ConflictType } from "@/types/conflict";
import { cn } from "@/lib/utils";

/**
 * Lightweight SVG distribution summaries (severity / type / status) derived
 * live from the centralized conflict registry. No chart library — the project
 * ships without one and these bars are static and deterministic.
 */
export function ConflictDistributions({ conflicts }: { conflicts: SpatialConflict[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <DistributionCard
        title="Severity Distribution"
        rows={countBy(conflicts, (c) => c.severity, SEVERITY_ORDER)}
        colors={SEVERITY_BAR}
      />
      <DistributionCard
        title="Conflict Type Distribution"
        rows={countBy(conflicts, (c) => c.type, TYPE_ORDER)}
        colors={TYPE_BAR}
      />
      <DistributionCard
        title="Status Distribution"
        rows={countBy(conflicts, (c) => c.status, STATUS_ORDER)}
        colors={STATUS_BAR}
      />
    </div>
  );
}

// ── Canonical orders & bar colours (semantic, consistent with GisStatusBadge) ──

const SEVERITY_ORDER: ConflictSeverity[] = ["Critical", "High", "Medium", "Low"];
const SEVERITY_BAR: Record<string, string> = {
  Critical: "#DC2626",
  High: "#EA580C",
  Medium: "#D97706",
  Low: "#CA8A04",
};

const STATUS_ORDER: ConflictStatus[] = ["Pending Review", "Under Investigation", "Resolved"];
const STATUS_BAR: Record<string, string> = {
  "Pending Review": "#F59E0B",
  "Under Investigation": "#3B82F6",
  Resolved: "#10B981",
};

const TYPE_ORDER: ConflictType[] = [
  "Boundary Overlap",
  "Outside Parent Parcel",
  "Missing Boundary",
  "Invalid Geometry",
  "Duplicate Spatial ID",
];
const TYPE_BAR: Record<string, string> = {
  "Boundary Overlap": "#8B5CF6",
  "Outside Parent Parcel": "#EC4899",
  "Missing Boundary": "#14B8A6",
  "Invalid Geometry": "#F97316",
  "Duplicate Spatial ID": "#6366F1",
};

function countBy<T extends string>(items: SpatialConflict[], pick: (c: SpatialConflict) => T, order: T[]) {
  const counts = new Map<T, number>();
  for (const item of items) {
    const key = pick(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  // Include any type not present in the canonical order (future-proof).
  const extras = Array.from(counts.keys()).filter((k) => !order.includes(k)) as T[];
  return [...order, ...extras].map((key) => ({ key, count: counts.get(key) ?? 0 }));
}

function DistributionCard({
  title,
  rows,
  colors,
}: {
  title: string;
  rows: Array<{ key: string; count: number }>;
  colors: Record<string, string>;
}) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  const visible = rows.filter((r) => r.count > 0 || total === 0);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
        <BarChart3 className="h-3.5 w-3.5 text-cyan-600" /> {title}
      </p>
      <ul className="mt-3 space-y-2">
        {visible.map((r) => (
          <li key={r.key}>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span className="min-w-0 truncate">{r.key}</span>
              <span className="font-mono tabular-nums text-slate-900">{r.count}</span>
            </div>
            <div
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"
              role="meter"
              aria-valuenow={r.count}
              aria-valuemin={0}
              aria-valuemax={Math.max(total, 1)}
              aria-label={`${r.key}: ${r.count}`}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${total === 0 ? 0 : Math.max(4, (r.count / total) * 100)}%`,
                  backgroundColor: colors[r.key] ?? "#64748B",
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      {total === 0 && <p className={cn("mt-1 text-[10px] italic text-slate-400")}>No conflicts registered.</p>}
    </div>
  );
}
