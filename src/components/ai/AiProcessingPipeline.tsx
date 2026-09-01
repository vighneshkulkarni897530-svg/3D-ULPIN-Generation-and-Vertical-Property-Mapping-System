"use client";

import * as React from "react";
import {
  Loader2,
  CheckCircle2,
  Play,
  FileSearch,
  ScanSearch,
  Building2,
  Spline,
  Layers,
  Box,
  BadgeCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/layout/PageHeader";
import { PROCESSING_STEPS } from "@/lib/aiExtraction";
import { cn } from "@/lib/utils";

const STEP_ICONS = [FileSearch, ScanSearch, Building2, Spline, Layers, Box, BadgeCheck];

interface AiProcessingPipelineProps {
  /** Completed step count (0 = idle, PROCESSING_STEPS.length = finished). */
  step: number;
  running: boolean;
  imageName: string | null;
  canStart: boolean;
  onStart: () => void;
}

/**
 * Simulated AI-assisted processing pipeline. The step cadence is driven by
 * the workspace page; this component only renders progress. Clearly labelled
 * as simulated — no external AI/ML service is contacted.
 */
export function AiProcessingPipeline({
  step,
  running,
  imageName,
  canStart,
  onStart,
}: AiProcessingPipelineProps) {
  const total = PROCESSING_STEPS.length;
  const progress = Math.min(100, Math.round((step / total) * 100));
  const done = !running && step >= total;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <SectionHeader
        icon={<Loader2 className={cn("h-4 w-4", running && "animate-spin")} />}
        title="2 · Processing Pipeline"
        description="Deterministic, browser-side simulation — no external AI service is called."
        action={
          <Badge variant="warning" className="text-[9px]">
            Simulated AI-Assisted Processing
          </Badge>
        }
      />

      {imageName && (
        <p
          className="mt-3 truncate rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-[10px] font-bold text-slate-600"
          title={imageName}
        >
          Input · {imageName}
        </p>
      )}

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[9.5px] font-bold">
        <span className="text-slate-400">{done ? "Analysis Complete" : running ? "Processing…" : "Idle"}</span>
        <span className="font-mono text-cyan-700">{progress}%</span>
      </div>

      <ol className="mt-3 space-y-1.5">
        {PROCESSING_STEPS.map((label, i) => {
          const isDone = step > i || done;
          const isActive = running && step === i;
          const Icon = STEP_ICONS[i] ?? Box;
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 transition-colors",
                isDone
                  ? "border-emerald-200 bg-emerald-50/60"
                  : isActive
                    ? "border-cyan-300 bg-cyan-50/70"
                    : "border-slate-200 bg-slate-50/60 opacity-70",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
                  isDone
                    ? "border-emerald-300 text-emerald-600"
                    : isActive
                      ? "border-cyan-400 text-cyan-600"
                      : "border-slate-300 text-slate-400",
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : isActive ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[8.5px] font-extrabold uppercase tracking-widest text-slate-400">
                  Step {i + 1}
                </span>
                <span
                  className={cn(
                    "block truncate text-[11px] font-bold",
                    isDone ? "text-emerald-700" : isActive ? "text-cyan-700" : "text-slate-500",
                  )}
                >
                  {label}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-3.5 border-t border-slate-100 pt-3">
        {done ? (
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Analysis Complete — prototype results are shown on the right.
          </p>
        ) : running ? (
          <p className="text-[11px] font-bold text-cyan-700">
            Simulated pipeline running — results appear automatically when complete.
          </p>
        ) : (
          <Button size="sm" disabled={!canStart} onClick={onStart}>
            <Play className="h-3.5 w-3.5" /> Start AI Processing
          </Button>
        )}
      </div>
    </section>
  );
}