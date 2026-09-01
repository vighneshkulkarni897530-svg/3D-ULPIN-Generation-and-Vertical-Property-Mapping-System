"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Lightbulb, Lock, ShieldAlert } from "lucide-react";
import { SectionHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import type { DecisionInsight, ReportAnalytics } from "@/lib/reportAnalytics";

interface DecisionSupportProps {
  analytics: ReportAnalytics;
  /** Officers/admins receive the full operational panel; citizens a read-only summary. */
  canOperate: boolean;
  className?: string;
}

const levelStyles: Record<DecisionInsight["level"], { chip: string; card: string }> = {
  critical: { chip: "bg-red-100 text-red-700 border-red-200", card: "border-red-200 bg-red-50/60" },
  warning: { chip: "bg-amber-100 text-amber-700 border-amber-200", card: "border-amber-200 bg-amber-50/60" },
  info: { chip: "bg-cyan-100 text-cyan-700 border-cyan-200", card: "border-slate-200 bg-slate-50/60" },
};

/**
 * Decision Support (Phase 8 §7). Every card is derived from the centralized
 * registry by computeReportAnalytics and links into a real existing route.
 * Officers/admins see the full operational panel; citizens receive a
 * read-only summary (no second auth system — the existing demo role switcher
 * governs access).
 */
export function DecisionSupport({ analytics, canOperate, className }: DecisionSupportProps) {
  const a = analytics;
  const visible: DecisionInsight[] = canOperate
    ? a.insights
    : a.insights.filter((i) => i.level === "info" || i.level === "critical").slice(0, 3);

  return (
    <section className={className} aria-label="Decision support">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
        <SectionHeader
          icon={<Lightbulb className="h-4 w-4" />}
          title="Decision Support"
          description="System-generated operational insights computed from the filtered registry scope."
          action={
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">
              {canOperate ? `Full access · ${a.insights.length} insights` : "Read-only summary"}
            </span>
          }
        />

        {!canOperate && (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            You are viewing analytics as {`\u201CCITIZEN\u201D`} — a read-only summary. Officers and admins receive the
            complete operational recommendation set (use the demo role switcher in the top bar).
          </p>
        )}

        {visible.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-[11px] text-slate-400">
            No operational findings for the current scope — every tracked building, unit and conflict in scope is in a healthy state.
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {visible.map((insight) => {
              const s = levelStyles[insight.level];
              return (
                <li key={insight.id} className={cn("rounded-2xl border p-4", s.card)}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-xs font-extrabold tracking-tight text-slate-900">{insight.title}</p>
                    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest", s.chip)}>
                      {insight.level}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">{insight.detail}</p>
                  <Link
                    href={insight.actionHref}
                    className="mt-2.5 inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-[10px] font-extrabold text-cyan-300 transition-colors hover:bg-slate-800"
                  >
                    {insight.actionLabel} <ArrowRight className="h-3 w-3" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-800">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          All recommendations are prototype / system-generated operational insights derived from demo registry data —
          they are NOT legal determinations or official government decisions.
        </p>
      </div>
    </section>
  );
}