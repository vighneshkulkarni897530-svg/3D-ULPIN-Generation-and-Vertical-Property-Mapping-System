import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ChartColumn } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionItem {
  label: string;
  description?: string;
  icon: React.ReactNode;
  href: string;
  tone?: "default" | "secondary" | "blue";
}

interface QuickActionsProps {
  items: QuickActionItem[];
  className?: string;
}

/** Dashboard quick action grid. */
export function QuickActions({ items, className }: QuickActionsProps) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3", className)}>
      {items.map((item) => (
        <Link
          key={item.href + item.label}
          href={item.href}
          className={cn(
            "group flex items-center justify-between gap-3 rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5",
            item.tone === "secondary"
              ? "border-slate-800 bg-slate-900 text-white hover:border-cyan-500/50 hover:shadow-tech-cyan"
              : item.tone === "blue"
              ? "border-blue-200 bg-blue-50/60 text-slate-900 hover:border-blue-400 hover:shadow-tech-glow"
              : "border-slate-200 bg-white shadow-tech hover:border-cyan-400 hover:shadow-tech-cyan"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={cn(
                "p-2 rounded-lg shrink-0",
                item.tone === "secondary"
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                  : item.tone === "blue"
                  ? "bg-blue-100 text-blue-600 border border-blue-200"
                  : "bg-cyan-50 text-cyan-600 border border-cyan-200"
              )}
            >
              {item.icon}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-extrabold tracking-tight">{item.label}</span>
              {item.description && (
                <span className={cn("block truncate text-[10px] font-medium", item.tone === "secondary" ? "text-slate-400" : "text-slate-500")}>
                  {item.description}
                </span>
              )}
            </span>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-500" />
        </Link>
      ))}
    </div>
  );
}

export { ChartColumn };