import * as React from "react";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Live system status indicator for the top bar.
 * Static for Phase 2 (the GIS self-test endpoint already validates the stack
 * at runtime and is the future data source for this pill).
 */
export function SystemStatus({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "hidden items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1.5 xl:flex",
        className,
      )}
      title="All cadastral services operational"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      <span className="text-[10px] font-bold tracking-tight text-slate-300">
        All systems operational
      </span>
      <span className="font-mono text-[9px] text-slate-500">· Engine v3.4</span>
      <Activity className="h-3 w-3 text-cyan-400" />
    </div>
  );
}