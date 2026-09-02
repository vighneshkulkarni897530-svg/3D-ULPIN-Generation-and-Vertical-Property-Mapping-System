"use client";

import * as React from "react";
import { Gavel, CheckCircle2, RotateCcw, AlertCircle, XCircle } from "lucide-react";
import { type DecisionAnalyticsMetrics } from "@/lib/analytics/analyticsService";
import {
  type VerificationDecision,
  VERIFICATION_DECISIONS,
  VERIFICATION_DECISION_LABELS,
} from "@/types/verificationCase";

interface DecisionAnalyticsCardProps {
  data: DecisionAnalyticsMetrics;
  className?: string;
}

export function DecisionAnalyticsCard({ data, className = "" }: DecisionAnalyticsCardProps) {
  const decisionConfigs: Record<
    VerificationDecision,
    { icon: typeof CheckCircle2; tone: string; textTone: string; border: string; bg: string }
  > = {
    VERIFIED: {
      icon: CheckCircle2,
      tone: "bg-emerald-500",
      textTone: "text-emerald-400",
      border: "border-emerald-500/30",
      bg: "bg-emerald-950/20",
    },
    REQUIRES_CORRECTION: {
      icon: AlertCircle,
      tone: "bg-amber-500",
      textTone: "text-amber-400",
      border: "border-amber-500/30",
      bg: "bg-amber-950/20",
    },
    REINSPECTION_REQUIRED: {
      icon: RotateCcw,
      tone: "bg-cyan-500",
      textTone: "text-cyan-400",
      border: "border-cyan-500/30",
      bg: "bg-cyan-950/20",
    },
    REJECTED: {
      icon: XCircle,
      tone: "bg-rose-500",
      textTone: "text-rose-400",
      border: "border-rose-500/30",
      bg: "bg-rose-950/20",
    },
  };

  const total = data.totalDecisions;

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <Gavel className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Government Decision Intelligence</h3>
            <p className="text-xs text-slate-400">
              Distribution of official cadastral determinations ({total.toLocaleString("en-IN")} recorded)
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {VERIFICATION_DECISIONS.map((dec) => {
          const cfg = decisionConfigs[dec];
          const count = data.byDecision[dec] || 0;
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          const Icon = cfg.icon;

          return (
            <div
              key={dec}
              className={`rounded-xl border p-3.5 flex flex-col justify-between ${cfg.border} ${cfg.bg}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${cfg.textTone}`}>
                  {VERIFICATION_DECISION_LABELS[dec]}
                </span>
                <Icon className={`h-4 w-4 ${cfg.textTone}`} />
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-white">{count}</p>
                <p className="mt-0.5 text-[11px] font-mono text-slate-400">{percentage}% of decisions</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reinspection Tracking Sub-Card */}
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300">Reinspection Pipeline</span>
          <span className="font-mono text-xs font-bold text-cyan-400">
            {data.reinspectionRequiredCount} total orders
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
          <div className="rounded-lg bg-slate-900 p-2 border border-slate-800/80">
            <span className="text-[11px] text-slate-400">Completed Reinspections</span>
            <p className="mt-0.5 font-mono text-sm font-bold text-emerald-400">
              {data.reinspectionsCompleted}
            </p>
          </div>
          <div className="rounded-lg bg-slate-900 p-2 border border-slate-800/80">
            <span className="text-[11px] text-slate-400">Pending Field Visits</span>
            <p className="mt-0.5 font-mono text-sm font-bold text-amber-400">
              {data.reinspectionsPending}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
