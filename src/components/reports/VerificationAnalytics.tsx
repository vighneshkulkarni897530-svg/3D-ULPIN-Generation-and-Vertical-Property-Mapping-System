"use client";

import * as React from "react";
import { ShieldCheck, Users } from "lucide-react";
import { DonutChart, HBarChart, type DonutSegment, type HBarDatum } from "@/components/dashboard/charts";
import { Progress } from "@/components/ui/progress";
import { SectionHeader } from "@/components/layout/PageHeader";
import { GisStatusBadge } from "@/components/common/GisStatusBadge";
import { VERIFICATION_STATUS_COLORS, type ReportAnalytics } from "@/lib/reportAnalytics";
import { formatRelativeTime } from "@/lib/gisUtils";

const humanizeMethod = (m: string) => m.replace(/_/g, " ");

interface VerificationAnalyticsProps {
  analytics: ReportAnalytics;
  className?: string;
}

/**
 * Section B — Verification Analytics. Donut for the status distribution,
 * method mix, building-wise progress and the latest verification records —
 * all derived from centralized verifications + properties.
 */
export function VerificationAnalytics({ analytics, className }: VerificationAnalyticsProps) {
  const a = analytics;
  const donutSegments: DonutSegment[] = a.statusDistribution
    .filter((s) => s.count > 0)
    .map((s) => ({ key: s.status, label: s.status, value: s.count, color: VERIFICATION_STATUS_COLORS[s.status] }));

  const methodData: HBarDatum[] = a.methodDistribution.map((m) => ({
    key: m.method,
    label: humanizeMethod(m.method),
    value: m.count,
    color: "#0EA5E9",
  }));

  const floorData: HBarDatum[] = a.floorAnalytics
    .filter((f) => f.units > 0)
    .slice(0, 8)
    .map((f) => ({
      key: f.floorId,
      label: `${f.floorName} · ${f.buildingName}`,
      value: f.units,
      sub: `${f.verified} verified`,
      color: "#6366F1",
    }));

  return (
    <section className={className} aria-label="Verification analytics">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
        <SectionHeader
          icon={<ShieldCheck className="h-4 w-4" />}
          title="B · Verification Analytics"
          description={`${a.verifications} verification records · avg demo confidence ${a.avgVerificationConfidence}%`}
        />

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Status distribution */}
          <div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Property verification status distribution</p>
            {a.properties === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-[11px] text-slate-400">
                No property units in the current scope.
              </p>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <DonutChart
                  segments={donutSegments}
                  centerLabel={`${a.verificationRate}%`}
                  centerSub="Verified"
                  size={150}
                  strokeWidth={18}
                  ariaLabel="Verification status distribution donut chart"
                />
                <table className="w-full text-[11px]">
                  <caption className="sr-only">Verification status counts per property unit</caption>
                  <thead>
                    <tr className="text-left text-[9px] uppercase tracking-widest text-slate-400">
                      <th className="pb-1 font-bold">Status</th>
                      <th className="pb-1 text-right font-bold">Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.statusDistribution.map((s) => (
                      <tr key={s.status} className="border-t border-slate-100">
                        <td className="py-1.5">
                          <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: VERIFICATION_STATUS_COLORS[s.status] }} />
                            {s.status}
                          </span>
                        </td>
                        <td className="py-1.5 text-right font-black tabular-nums text-slate-900">{s.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Method distribution */}
          <div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Verification method distribution</p>
            <HBarChart
              data={methodData}
              ariaLabel="Verification records by survey method"
              emptyLabel="No verification records in the current scope yet."
            />
            <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-slate-400">
              Prototype analytics — method mix from centralized verification records
            </p>
          </div>
        </div>

        {/* Building-wise verification progress */}
        <div className="mt-6">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Building-wise verification rate</p>
          {a.buildingAnalytics.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-400">
              No buildings in the current scope.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
              {a.buildingAnalytics.map((b) => (
                <div key={b.buildingId}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate font-bold text-slate-800" title={b.buildingName}>
                      {b.buildingName} <span className="font-mono text-[9px] text-slate-400">{b.buildingCode}</span>
                    </span>
                    <span className="shrink-0 font-black tabular-nums text-slate-900">
                      {b.verified}/{b.units} · {b.verificationRate}%
                    </span>
                  </div>
                  <Progress value={b.verificationRate} aria-label={`${b.buildingName} verification rate ${b.verificationRate}%`} />
                  <p className="mt-1 font-mono text-[9px] text-slate-400">
                    {b.pending} pending · {b.inProgress} in progress · {b.rejected} rejected · {b.openConflicts} open conflicts
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floor-wise units + recent verification records */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Floor-wise property units</p>
            <HBarChart data={floorData} ariaLabel="Property units per floor" emptyLabel="No mapped floor units in the current scope." />
          </div>
          <div>
            <p className="mb-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <Users className="h-3 w-3" /> Recent verification activity
            </p>
            {a.recentVerifications.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-400">
                No verification records in the current scope.
              </p>
            ) : (
              <ul className="space-y-2">
                {a.recentVerifications.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-slate-800">
                        {v.propertyId} <span className="font-mono text-[9px] font-semibold text-slate-400">{humanizeMethod(v.method)}</span>
                      </p>
                      <p className="truncate text-[10px] text-slate-500">
                        {v.verifiedBy} · {formatRelativeTime(v.verificationDate)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-[9px] font-bold text-cyan-700">{v.confidenceScore}%</span>
                      <GisStatusBadge status={v.newStatus} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}