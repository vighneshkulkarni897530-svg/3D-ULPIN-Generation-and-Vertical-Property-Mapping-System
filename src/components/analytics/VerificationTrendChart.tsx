"use client";

import * as React from "react";
import { TrendingUp, Activity, Calendar } from "lucide-react";
import { type TimeSeriesDataPoint } from "@/lib/analytics/analyticsService";

interface VerificationTrendChartProps {
  trends7Days: TimeSeriesDataPoint[];
  trends30Days: TimeSeriesDataPoint[];
  trends90Days: TimeSeriesDataPoint[];
  className?: string;
}

export function VerificationTrendChart({
  trends7Days,
  trends30Days,
  trends90Days,
  className = "",
}: VerificationTrendChartProps) {
  const [range, setRange] = React.useState<"7d" | "30d" | "90d">("30d");

  const currentData = range === "7d" ? trends7Days : range === "30d" ? trends30Days : trends90Days;

  const maxVal = Math.max(
    1,
    ...currentData.map((d) =>
      Math.max(d.casesCreated, d.casesResolved, d.discrepanciesCreated, d.verificationsRecorded),
    ),
  );

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Verification & Activity Trends</h3>
            <p className="text-xs text-slate-400">Operational throughput based on verified Firestore timestamps</p>
          </div>
        </div>

        <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setRange("7d")}
            className={`rounded-md px-2.5 py-1 transition-all ${
              range === "7d"
                ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            7 Days
          </button>
          <button
            type="button"
            onClick={() => setRange("30d")}
            className={`rounded-md px-2.5 py-1 transition-all ${
              range === "30d"
                ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            30 Days
          </button>
          <button
            type="button"
            onClick={() => setRange("90d")}
            className={`rounded-md px-2.5 py-1 transition-all ${
              range === "90d"
                ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
          <span className="text-slate-300">Cases Created</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="text-slate-300">Cases Resolved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="text-slate-300">Discrepancies Flagged</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
          <span className="text-slate-300">Verifications Recorded</span>
        </div>
      </div>

      {/* Chart visualization */}
      <div className="mt-5">
        <div className="h-44 w-full flex items-end gap-1 sm:gap-2 pb-6 pt-2 border-b border-slate-800">
          {currentData.map((pt, idx) => {
            const hCases = Math.max(4, Math.round((pt.casesCreated / maxVal) * 100));
            const hResolved = Math.max(4, Math.round((pt.casesResolved / maxVal) * 100));
            const hDisc = Math.max(4, Math.round((pt.discrepanciesCreated / maxVal) * 100));

            return (
              <div
                key={pt.date}
                className="group relative flex-1 flex flex-col justify-end items-center h-full gap-0.5"
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col rounded-lg border border-slate-700 bg-slate-950 p-2 text-[10px] text-white shadow-xl z-20 whitespace-nowrap">
                  <span className="font-bold text-cyan-300">{pt.date}</span>
                  <span>Cases: {pt.casesCreated}</span>
                  <span>Resolved: {pt.casesResolved}</span>
                  <span>Discrepancies: {pt.discrepanciesCreated}</span>
                  <span>Verifications: {pt.verificationsRecorded}</span>
                </div>

                <div className="w-full flex items-end justify-center gap-0.5 h-full">
                  {pt.casesCreated > 0 && (
                    <div
                      className="w-1.5 rounded-t bg-cyan-400 transition-all duration-300 group-hover:bg-cyan-300"
                      style={{ height: `${hCases}%` }}
                    />
                  )}
                  {pt.casesResolved > 0 && (
                    <div
                      className="w-1.5 rounded-t bg-emerald-400 transition-all duration-300 group-hover:bg-emerald-300"
                      style={{ height: `${hResolved}%` }}
                    />
                  )}
                  {pt.discrepanciesCreated > 0 && (
                    <div
                      className="w-1.5 rounded-t bg-amber-400 transition-all duration-300 group-hover:bg-amber-300"
                      style={{ height: `${hDisc}%` }}
                    />
                  )}
                  {pt.casesCreated === 0 && pt.casesResolved === 0 && pt.discrepanciesCreated === 0 && (
                    <div className="w-1 h-1 rounded-full bg-slate-800" />
                  )}
                </div>

                {/* Date label on sample intervals */}
                {(idx === 0 ||
                  idx === currentData.length - 1 ||
                  (range === "7d" && true) ||
                  (range === "30d" && idx % 5 === 0) ||
                  (range === "90d" && idx % 15 === 0)) && (
                  <span className="absolute -bottom-5 text-[9px] font-mono text-slate-400 whitespace-nowrap">
                    {pt.date.slice(5)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
