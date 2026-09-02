"use client";

import * as React from "react";
import { AlertOctagon, AlertTriangle, Layers, CheckCircle2 } from "lucide-react";
import {
  type DiscrepancyBreakdownMetrics,
} from "@/lib/analytics/analyticsService";
import {
  type DiscrepancyType,
  type DiscrepancySeverity,
  DISCREPANCY_TYPES,
  DISCREPANCY_TYPE_LABELS,
  DISCREPANCY_SEVERITIES,
  DISCREPANCY_SEVERITY_LABELS,
} from "@/types/verificationCase";

interface DiscrepancyAnalyticsCardProps {
  data: DiscrepancyBreakdownMetrics;
  className?: string;
}

export function DiscrepancyAnalyticsCard({ data, className = "" }: DiscrepancyAnalyticsCardProps) {
  const [activeTab, setActiveTab] = React.useState<"type" | "severity" | "status">("type");

  const total = data.totalDiscrepancies;

  const severityColors: Record<DiscrepancySeverity, { bg: string; text: string; bar: string }> = {
    LOW: { bg: "bg-blue-500/10", text: "text-blue-400", bar: "bg-blue-500" },
    MEDIUM: { bg: "bg-amber-500/10", text: "text-amber-400", bar: "bg-amber-500" },
    HIGH: { bg: "bg-orange-500/10", text: "text-orange-400", bar: "bg-orange-500" },
    CRITICAL: { bg: "bg-rose-500/10", text: "text-rose-400", bar: "bg-rose-500" },
  };

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Discrepancy Distribution</h3>
            <p className="text-xs text-slate-400">
              {total.toLocaleString("en-IN")} total recorded physical & cadastral mismatches
            </p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("type")}
            className={`rounded-md px-3 py-1.5 transition-all ${
              activeTab === "type"
                ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            By Type
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("severity")}
            className={`rounded-md px-3 py-1.5 transition-all ${
              activeTab === "severity"
                ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            By Severity
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("status")}
            className={`rounded-md px-3 py-1.5 transition-all ${
              activeTab === "status"
                ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            By Status
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-3.5">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2 opacity-80" />
            <p className="text-xs font-medium text-slate-300">No discrepancies recorded</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Cadastral structures match verified plans</p>
          </div>
        ) : activeTab === "type" ? (
          DISCREPANCY_TYPES.map((typeKey) => {
            const count = data.byType[typeKey] || 0;
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={typeKey} className="group">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-300 group-hover:text-cyan-300 transition-colors">
                    {DISCREPANCY_TYPE_LABELS[typeKey]}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-slate-400">
                      {percentage}%
                    </span>
                    <span className="font-mono text-xs font-bold text-white min-w-[2rem] text-right">
                      {count}
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : activeTab === "severity" ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {DISCREPANCY_SEVERITIES.map((sev) => {
              const count = data.bySeverity[sev] || 0;
              const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
              const style = severityColors[sev];
              return (
                <div
                  key={sev}
                  className={`rounded-xl border border-slate-800 p-3.5 text-center ${style.bg}`}
                >
                  <p className={`text-[11px] font-bold uppercase tracking-wide ${style.text}`}>
                    {DISCREPANCY_SEVERITY_LABELS[sev]}
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">{count}</p>
                  <p className="mt-0.5 text-[11px] font-mono text-slate-400">{percentage}% of total</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(data.byStatus).map(([status, count]) => {
              const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium uppercase tracking-wider text-slate-300">
                      {status.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-400">{percentage}%</span>
                      <span className="font-mono text-xs font-bold text-white">{count}</span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-slate-400 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
