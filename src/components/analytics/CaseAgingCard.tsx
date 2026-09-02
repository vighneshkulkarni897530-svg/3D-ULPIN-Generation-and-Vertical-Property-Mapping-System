"use client";

import * as React from "react";
import { Clock, CheckCircle, Calendar } from "lucide-react";
import { type CaseAgingMetrics } from "@/lib/analytics/analyticsService";

interface CaseAgingCardProps {
  data: CaseAgingMetrics;
  className?: string;
}

export function CaseAgingCard({ data, className = "" }: CaseAgingCardProps) {
  const buckets = [
    { label: "0–7 Days", count: data.bucket0to7, tone: "bg-emerald-500", textTone: "text-emerald-400" },
    { label: "8–30 Days", count: data.bucket8to30, tone: "bg-cyan-500", textTone: "text-cyan-400" },
    { label: "31–60 Days", count: data.bucket31to60, tone: "bg-amber-500", textTone: "text-amber-400" },
    { label: "61–90 Days", count: data.bucket61to90, tone: "bg-orange-500", textTone: "text-orange-400" },
    { label: "90+ Days", count: data.bucket90Plus, tone: "bg-rose-500", textTone: "text-rose-400" },
  ];

  const totalCases = buckets.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Case Aging & Velocity</h3>
            <p className="text-xs text-slate-400">Aging profile across active and resolved cases</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Avg. Resolution Time
          </span>
          <span className="font-mono text-sm font-black text-cyan-300">
            {data.averageResolutionDays !== null
              ? `${data.averageResolutionDays} Days`
              : "No resolved cases yet"}
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-3.5">
        {totalCases === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">No active or historical cases</div>
        ) : (
          buckets.map((b) => {
            const percentage = totalCases > 0 ? Math.round((b.count / totalCases) * 100) : 0;
            return (
              <div key={b.label}>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-300">{b.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400">{percentage}%</span>
                    <span className="font-mono text-xs font-bold text-white min-w-[2rem] text-right">
                      {b.count}
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${b.tone} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-800/80 pt-4 text-center">
        <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800">
          <p className="text-[11px] text-slate-400">Average Active Case Age</p>
          <p className="mt-1 text-base font-black text-slate-200">
            {data.averageAgeDays} <span className="text-xs font-normal text-slate-400">days</span>
          </p>
        </div>
        <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800">
          <p className="text-[11px] text-slate-400">Resolved Cases Count</p>
          <p className="mt-1 text-base font-black text-emerald-400">
            {data.resolvedCasesCount}{" "}
            <span className="text-xs font-normal text-slate-400">cases</span>
          </p>
        </div>
      </div>
    </div>
  );
}
