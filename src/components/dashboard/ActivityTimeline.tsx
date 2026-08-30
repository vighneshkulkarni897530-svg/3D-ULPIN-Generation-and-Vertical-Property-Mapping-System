import * as React from "react";
import { cn } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: React.ReactNode;
  tone?: "cyan" | "green" | "amber" | "red" | "blue" | "navy";
}

const toneMap: Record<NonNullable<ActivityItem["tone"]>, string> = {
  cyan: "bg-cyan-50 border-cyan-200 text-cyan-600",
  green: "bg-green-50 border-green-200 text-green-600",
  amber: "bg-amber-50 border-amber-200 text-amber-600",
  red: "bg-red-50 border-red-200 text-red-600",
  blue: "bg-blue-50 border-blue-200 text-blue-600",
  navy: "bg-slate-900 border-slate-800 text-cyan-400",
};

interface ActivityTimelineProps {
  items: ActivityItem[];
  className?: string;
}

/** Vertical activity / audit timeline with colored nodes. */
export function ActivityTimeline({ items, className }: ActivityTimelineProps) {
  if (!items.length)
    return <p className="p-6 text-center text-xs text-slate-400">No recent activity recorded.</p>;

  return (
    <div className={cn("relative space-y-4 pl-1 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200", className)}>
      {items.map((item) => (
        <div key={item.id} className="relative flex items-start gap-3.5">
          <span className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border", toneMap[item.tone ?? "cyan"])}>
            {item.icon}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-900 tracking-tight truncate">{item.title}</p>
              <span className="shrink-0 text-[9px] font-mono font-semibold text-slate-400">{item.time}</span>
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}