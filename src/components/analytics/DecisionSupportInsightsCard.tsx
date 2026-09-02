"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
} from "lucide-react";
import {
  type DecisionSupportInsight,
  type PriorityCaseItem,
} from "@/lib/analytics/analyticsService";
import { CaseStatusBadge, CaseSeverityBadge } from "@/components/verification/CaseStatusBadge";

interface DecisionSupportInsightsCardProps {
  insights: DecisionSupportInsight[];
  priorityCases: PriorityCaseItem[];
  className?: string;
}

export function DecisionSupportInsightsCard({
  insights,
  priorityCases,
  className = "",
}: DecisionSupportInsightsCardProps) {
  const toneStyles = {
    info: "border-cyan-500/30 bg-cyan-950/20 text-cyan-300",
    warning: "border-amber-500/30 bg-amber-950/20 text-amber-300",
    alert: "border-rose-500/30 bg-rose-950/20 text-rose-300",
    success: "border-emerald-500/30 bg-emerald-950/20 text-emerald-300",
  };

  const toneIcons = {
    info: HelpCircle,
    warning: AlertTriangle,
    alert: ShieldAlert,
    success: CheckCircle2,
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* System Insights Section */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Decision Support Insights</h3>
            <p className="text-xs text-slate-400">
              Descriptive operational intelligence derived from active cadastral queues
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((ins) => {
            const Icon = toneIcons[ins.tone];
            return (
              <div
                key={ins.id}
                className={`rounded-xl border p-4 flex items-start gap-3 ${toneStyles[ins.tone]}`}
              >
                <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white flex items-center gap-2">
                    {ins.title}
                    <span className="text-[10px] font-normal uppercase tracking-wider opacity-70">
                      (System Insight)
                    </span>
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">{ins.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-[10px] text-slate-500 italic">
          * System insights provide analytical observations only and do not constitute automated or legal determinations.
        </p>
      </div>

      {/* Priority Cases Queue */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Priority Cadastral Cases</h3>
              <p className="text-xs text-slate-400">
                Sorted by discrepancy severity, duration open, and reinspection requirements
              </p>
            </div>
          </div>
          <span className="font-mono text-xs font-bold text-amber-400">
            {priorityCases.length} prioritized
          </span>
        </div>

        <div className="mt-4 space-y-2.5">
          {priorityCases.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              No cases currently meet high priority escalation thresholds
            </div>
          ) : (
            priorityCases.slice(0, 6).map((c) => (
              <div
                key={c.caseId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-950 p-3 hover:border-slate-700 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-300">
                      {c.caseNumber}
                    </span>
                    <CaseSeverityBadge severity={c.severity} />
                    <CaseStatusBadge status={c.status} />
                  </div>
                  <p className="text-xs font-semibold text-white">{c.title}</p>
                  <p className="text-[11px] text-slate-400">
                    {c.societyName} {c.buildingName ? `· ${c.buildingName}` : ""} {c.flatNumber ? `· ${c.flatNumber}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-amber-400 border border-slate-800">
                      <Clock className="h-3 w-3" />
                      {c.ageDays}d open
                    </span>
                    <p className="mt-0.5 text-[10px] text-slate-400">{c.priorityReason}</p>
                  </div>

                  <Link
                    href={`/government/cases/${c.caseId}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all"
                  >
                    Inspect
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
