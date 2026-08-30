import * as React from "react";
import { Construction, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleInProgressProps {
  icon: LucideIcon;
  title: string;
  description: string;
  eyebrow?: string;
  /** Human-readable phase + module label, e.g. "Scheduled · Phase 3". */
  phase?: string;
  /** Optional preview content rendered below the header (real registry data). */
  children?: React.ReactNode;
  accent?: "cyan" | "blue" | "green" | "amber";
  className?: string;
}

const ACCENTS = {
  cyan: { tile: "from-cyan-500 to-blue-600 shadow-tech-cyan", ring: "border-cyan-500/40" },
  blue: { tile: "from-blue-500 to-indigo-600 shadow-tech-glow", ring: "border-blue-500/40" },
  green: { tile: "from-emerald-500 to-teal-600", ring: "border-emerald-500/40" },
  amber: { tile: "from-amber-500 to-orange-600", ring: "border-amber-500/40" },
};

/**
 * Professional "module under implementation" state. Used for routes whose
 * full feature ships in a later phase. Never pretends the feature exists and
 * never renders dead buttons — the optional `children` preview surfaces real
 * Phase 1 registry data instead.
 */
export function ModuleInProgress({
  icon: Icon,
  title,
  description,
  eyebrow,
  phase = "Module under implementation — scheduled for a later phase",
  children,
  accent = "cyan",
  className,
}: ModuleInProgressProps) {
  const a = ACCENTS[accent];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header band */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-tech">
        <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-0.5", accent === "cyan" && "bg-gradient-to-r from-cyan-500 via-blue-500 to-transparent", accent === "blue" && "bg-gradient-to-r from-blue-500 via-indigo-500 to-transparent", accent === "green" && "bg-gradient-to-r from-emerald-500 via-teal-500 to-transparent", accent === "amber" && "bg-gradient-to-r from-amber-500 via-orange-500 to-transparent")} />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-4">
            <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-slate-950", a.tile)}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              {eyebrow && (
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-600">
                  {eyebrow}
                </span>
              )}
              <h1 className="mt-0.5 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                {title}
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">{description}</p>
            </div>
          </div>

          {/* Status chip */}
          <div className={cn("inline-flex shrink-0 items-center gap-2 self-start rounded-full border bg-amber-50/70 px-3 py-1.5 sm:self-auto", a.ring)}>
            <Construction className={cn("h-3.5 w-3.5", accent === "cyan" ? "text-amber-600" : "text-amber-600")} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Under implementation
            </span>
          </div>
        </div>

        {/* Phase line */}
        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-2.5 sm:px-6">
          <p className="text-[11px] font-medium text-slate-500">
            <span className="font-bold text-slate-700">Current scope:</span>{" "}
            {phase}
          </p>
        </div>
      </div>

      {/* Optional live preview from centralized Phase 1 data */}
      {children && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-tech">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <p className="text-xs font-extrabold tracking-tight text-slate-900">
              Live registry preview
            </p>
            <span className="rounded-full bg-cyan-50 border border-cyan-200 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-cyan-700">
              Phase 1 · Read-only
            </span>
          </div>
          <div className="p-5">{children}</div>
        </div>
      )}
    </div>
  );
}