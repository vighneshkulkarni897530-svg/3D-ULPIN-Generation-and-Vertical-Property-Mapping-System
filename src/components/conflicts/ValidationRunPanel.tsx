"use client";

import * as React from "react";
import { Play, CheckCircle2, Loader2, FlaskConical, TriangleAlert, ShieldCheck } from "lucide-react";
import { runSpatialValidation, type ValidationReport, type ValidationFinding } from "@/lib/spatialValidation";
import type { LandParcel, Building, Floor, PropertyUnit } from "@/types/gis";
import type { SpatialConflict } from "@/types/conflict";
import { CONFLICT_COLORS } from "@/lib/gisLayers";
import { cn } from "@/lib/utils";

export interface ValidationRunPanelProps {
  parcels: LandParcel[];
  buildings: Building[];
  floors: Floor[];
  properties: PropertyUnit[];
  conflicts: SpatialConflict[];
  /** Fired when a run completes so the page can surface it as an activity. */
  onComplete?: (report: ValidationReport) => void;
  className?: string;
}

const STEP_MS = 650;

/**
 * Demo Spatial Validation Pipeline runner.
 *
 * Deterministic: the same registry always produces the same report — the
 * engine re-derives findings from centralized geometry and matches them
 * against registered demo conflicts. Clearly labelled as a demo pipeline.
 */
export function ValidationRunPanel({
  parcels,
  buildings,
  floors,
  properties,
  conflicts,
  onComplete,
  className,
}: ValidationRunPanelProps) {
  const [phase, setPhase] = React.useState<"idle" | "running" | "done">("idle");
  const [visibleSteps, setVisibleSteps] = React.useState(0);
  const [report, setReport] = React.useState<ValidationReport | null>(null);

  // Sweep the progress across the five steps, then reveal the summary.
  React.useEffect(() => {
    if (phase !== "running") return;
    const timer = window.setInterval(() => {
      setVisibleSteps((s) => {
        if (s >= 5) {
          window.clearInterval(timer);
          return s;
        }
        return s + 1;
      });
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [phase]);

  React.useEffect(() => {
    if (phase === "running" && visibleSteps >= 5) {
      const t = window.setTimeout(() => setPhase("done"), 450);
      return () => window.clearTimeout(t);
    }
  }, [phase, visibleSteps]);

  const run = () => {
    // The engine is pure — computing the report up front keeps results
    // deterministic while the UI animates through the steps.
    const result = runSpatialValidation({ parcels, buildings, floors, properties, conflicts });
    setReport(result);
    setVisibleSteps(0);
    setPhase("running");
  };

  React.useEffect(() => {
    if (phase === "done" && report) onComplete?.(report);
    // Fire once per completed run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white", className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
            <FlaskConical className="h-3 w-3" /> Demo Spatial Validation Pipeline
          </p>
          <h3 className="mt-0.5 text-[13px] font-extrabold text-slate-900">Run Spatial Validation</h3>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Deterministic checks over the centralized demo registry — results are stable across runs.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={phase === "running"}
          aria-label="Run demo spatial validation"
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all",
            phase === "running"
              ? "cursor-not-allowed bg-slate-100 text-slate-400"
              : "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-tech-cyan hover:from-cyan-400 hover:to-blue-500",
          )}
        >
          {phase === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {phase === "running" ? "Validating…" : phase === "done" ? "Run Again" : "Run Spatial Validation"}
        </button>
      </header>

      {/* Five deterministic pipeline steps */}
      <ol className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-2 lg:grid-cols-5">
        {(
          [
            "Loading Parcel Geometry",
            "Validating Property Boundaries",
            "Checking Vertical Property Relationships",
            "Checking Spatial Identifiers",
            "Detecting Conflicts",
          ] as const
        ).map((label, i) => {
          const done = phase === "done" || (phase === "running" && visibleSteps > i);
          const active = phase === "running" && visibleSteps === i;
          return (
            <li
              key={label}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
                done && "border-emerald-200 bg-emerald-50",
                active && "border-cyan-300 bg-cyan-50",
                !done && !active && "border-slate-200 bg-slate-50 opacity-70",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[10px] font-extrabold",
                  done && "border-emerald-300 bg-emerald-500 text-white",
                  active && "border-cyan-400 text-cyan-700",
                  !done && !active && "border-slate-300 text-slate-400",
                )}
              >
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : i + 1}
              </span>
              <span className={cn("min-w-0 text-[10.5px] font-bold leading-tight", done ? "text-emerald-800" : active ? "text-cyan-800" : "text-slate-500")}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Validation Complete — summary (real engine contract) */}
      {phase === "done" && report && (
        <div className="border-t border-slate-100 px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">
              <ShieldCheck className="h-3 w-3" /> Validation Complete
            </span>
            <span className="font-mono text-[10px] font-bold text-slate-500">
              {new Date(report.runAt).toLocaleTimeString("en-IN")}
            </span>
            <span className="text-[10.5px] font-semibold text-slate-600">
              {report.totals.checks} checks · {report.totals.confirmedConflicts} registered conflict
              {report.totals.confirmedConflicts === 1 ? "" : "s"} confirmed
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                report.totals.findings > 0
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700",
              )}
            >
              <TriangleAlert className="h-3 w-3" /> {report.totals.findings} finding
              {report.totals.findings === 1 ? "" : "s"}
            </span>
            {report.totals.newIssues > 0 && (
              <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                {report.totals.newIssues} new issue{report.totals.newIssues === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {/* Pipeline step details */}
          <ol className="mt-3 space-y-1">
            {report.steps.map((s) => (
              <li key={s.index} className="flex items-start gap-2 text-[10.5px] text-slate-600">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-emerald-100 font-mono text-[8.5px] font-extrabold text-emerald-700">
                  {s.index}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-bold text-slate-700">{s.label}</span> — {s.detail}
                </span>
              </li>
            ))}
          </ol>

          {/* Findings table */}
          {report.findings.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[600px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                    <th className="py-1.5 pr-3">Conflict Type</th>
                    <th className="py-1.5 pr-3">Severity</th>
                    <th className="py-1.5 pr-3">Entities</th>
                    <th className="py-1.5 pr-3">Registered Conflict</th>
                  </tr>
                </thead>
                <tbody>
                  {report.findings.map((f) => (
                    <tr key={f.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3">
                        <span className="block text-[11px] font-bold text-slate-800">{f.type}</span>
                        <span className="block text-[10px] leading-snug text-slate-500">{f.message}</span>
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide",
                            f.severity === "Critical" && "bg-rose-100 text-rose-700",
                            f.severity === "High" && "bg-orange-100 text-orange-700",
                            f.severity === "Medium" && "bg-amber-100 text-amber-700",
                            f.severity === "Low" && "bg-yellow-100 text-yellow-700",
                          )}
                        >
                          {f.severity}
                        </span>
                      </td>
                      <td className="py-2 pr-3 font-mono text-[10px] text-slate-500">{f.entityIds.join(", ")}</td>
                      <td className="py-2 pr-3 font-mono text-[10px]">
                        {f.matchedConflictId ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {f.matchedConflictId}
                          </span>
                        ) : (
                          <span className="text-slate-400">unmatched</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[9.5px] leading-relaxed text-amber-800">
            <strong className="font-extrabold">Prototype Spatial Validation Result</strong> — deterministic demo rules over
            the centralized demo registry. Not a legally authoritative cadastral validation; registered demo conflicts
            are confirmed rather than re-created.
          </p>
        </div>
      )}
    </section>
  );
}

