"use client";

import * as React from "react";
import { CheckCircle2, Loader2, ScanLine, Box, Layers, Building2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GisWorkflowProps {
  open: boolean;
  /** Fired after the deterministic pipeline finishes (switches to 3D mode). */
  onComplete: () => void;
  onCancel: () => void;
}

const STEPS = [
  { label: "Analyzing 2D Parcel Geometry", icon: ScanLine },
  { label: "Extracting Building Footprint", icon: Box },
  { label: "Applying Height and Floor Data", icon: RulerGlyph },
  { label: "Generating Vertical Property Structure", icon: Layers },
  { label: "3D Visualization Ready", icon: Building2 },
];

function RulerGlyph({ className }: { className?: string }) {
  return <span className={cn("inline-block h-3.5 w-3.5 rounded-sm border-2 border-current", className)} />;
}

const STEP_MS = 700;

/**
 * 2D → 3D reconstruction workflow overlay.
 *
 * IMPORTANT: this is a deterministic visualization pipeline over the
 * centralized demo geometry — it is clearly labelled as such and must never
 * be presented as an AI reconstruction or a legal survey.
 */
export function GisWorkflow({ open, onComplete, onCancel }: GisWorkflowProps) {
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (!open) {
      setStep(0);
      return;
    }
    const timer = window.setInterval(() => {
      setStep((s) => (s < STEPS.length ? s + 1 : s));
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [open]);

  React.useEffect(() => {
    if (open && step >= STEPS.length) {
      const t = window.setTimeout(onComplete, 550);
      return () => window.clearTimeout(t);
    }
  }, [open, step, onComplete]);

  if (!open) return null;

  const progress = Math.min(100, Math.round((step / STEPS.length) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="2D to 3D reconstruction workflow"
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl shadow-cyan-500/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-cyan-400">2D → 3D Reconstruction</p>
            <h3 className="mt-0.5 text-[15px] font-extrabold text-slate-100">Visualization Pipeline</h3>
          </div>
          <button
            type="button"
            aria-label="Cancel reconstruction"
            title="Cancel reconstruction"
            onClick={onCancel}
            className="rounded-md border border-slate-800 bg-slate-900 p-1.5 text-slate-500 transition-colors hover:border-slate-700 hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <p className="mt-1.5 text-right font-mono text-[10px] font-bold text-cyan-300">{progress}%</p>

        {/* Steps */}
        <ol className="mt-3 space-y-2">
          {STEPS.map((s, i) => {
            const done = step > i;
            const active = step === i;
            const Icon = s.icon;
            return (
              <li
                key={s.label}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors",
                  done && "border-emerald-500/25 bg-emerald-500/5",
                  active && "border-cyan-500/40 bg-cyan-500/10",
                  !done && !active && "border-slate-800 bg-slate-900/50 opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
                    done && "border-emerald-500/40 text-emerald-400",
                    active && "border-cyan-400 text-cyan-300",
                    !done && !active && "border-slate-700 text-slate-500",
                  )}
                >
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] font-black uppercase tracking-widest text-slate-500">Step {i + 1}</span>
                  <span className={cn("block text-[11px] font-bold", done ? "text-emerald-300" : active ? "text-cyan-200" : "text-slate-400")}>
                    {s.label}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>

        <p className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/5 px-2.5 py-2 text-[9px] leading-relaxed text-amber-300/90">
          <strong className="font-black">Demo Reconstruction / Visualization Pipeline</strong> — deterministic
          processing over the centralized demo geometry. Not an AI reconstruction and not a legal survey.
        </p>
      </div>
    </div>
  );
}
