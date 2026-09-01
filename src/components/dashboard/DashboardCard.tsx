"use client";

import * as React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardCardTone = "cyan" | "blue" | "green" | "amber" | "red" | "navy";

interface DashboardCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  tone?: DashboardCardTone;
  trend?: { direction: "up" | "down"; value: string; positive?: boolean };
  actionable?: boolean;
  onClick?: () => void;
  className?: string;
}

const toneMap: Record<DashboardCardTone, { iconBg: string; glow: string }> = {
  cyan: { iconBg: "bg-cyan-50 border-cyan-200 text-cyan-600", glow: "hover:shadow-tech-cyan" },
  blue: { iconBg: "bg-blue-50 border-blue-200 text-blue-600", glow: "hover:shadow-tech-glow" },
  green: { iconBg: "bg-green-50 border-green-200 text-green-600", glow: "hover:shadow-[0_0_25px_-5px_rgba(34,197,94,0.3)]" },
  amber: { iconBg: "bg-amber-50 border-amber-200 text-amber-600", glow: "hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.3)]" },
  red: { iconBg: "bg-red-50 border-red-200 text-red-600", glow: "hover:shadow-[0_0_25px_-5px_rgba(239,68,68,0.3)]" },
  navy: { iconBg: "bg-slate-900 border-slate-800 text-cyan-400", glow: "hover:shadow-tech-lg" },
};

/** KPI summary card with icon, trend indicator and optional click action. */
export function DashboardCard({
  label,
  value,
  sub,
  icon,
  tone = "cyan",
  trend,
  actionable = false,
  onClick,
  className,
}: DashboardCardProps) {
  const Trix = trend?.direction === "up" ? TrendingUp : TrendingDown;
  const trendPositive = trend?.positive ?? true;
  const { iconBg, glow } = toneMap[tone];

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className={cn("p-2.5 rounded-xl border", iconBg)}>{icon}</div>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
              trendPositive ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
            )}
          >
            <Trix className="h-3 w-3" />
            {trend.value}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-slate-400 font-medium">{sub}</p>}
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-tech transition-all duration-300",
        glow,
        actionable && "cursor-pointer hover:-translate-y-0.5",
        className
      )}
      onClick={actionable ? onClick : undefined}
      role={actionable ? "button" : undefined}
    >
      {content}
    </div>
  );
}