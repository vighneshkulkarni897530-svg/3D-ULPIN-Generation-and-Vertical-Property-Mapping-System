"use client";

import * as React from "react";
import { type LucideIcon } from "lucide-react";

export interface KPICardProps {
  title: string;
  value: number | string;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    label: string;
    direction?: "up" | "down" | "neutral";
  };
  percentage?: number;
  tone?: "default" | "cyan" | "success" | "warning" | "alert";
  className?: string;
}

export function KPICard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  percentage,
  tone = "default",
  className = "",
}: KPICardProps) {
  const toneStyles = {
    default: "border-slate-800 bg-slate-900/90 text-slate-100",
    cyan: "border-cyan-500/30 bg-cyan-950/20 text-cyan-200",
    success: "border-emerald-500/30 bg-emerald-950/20 text-emerald-200",
    warning: "border-amber-500/30 bg-amber-950/20 text-amber-200",
    alert: "border-rose-500/30 bg-rose-950/20 text-rose-200",
  }[tone];

  const iconBg = {
    default: "bg-slate-800/80 text-slate-300",
    cyan: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
    success: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    warning: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    alert: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
  }[tone];

  return (
    <div
      className={`relative flex flex-col justify-between rounded-xl border p-4 shadow-sm transition-all hover:border-slate-700 ${toneStyles} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-400">
            {title}
          </p>
          <p className="mt-1.5 text-2xl font-black tracking-tight text-white">
            {typeof value === "number" ? value.toLocaleString("en-IN") : value}
          </p>
        </div>
        {Icon && (
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {(description || trend || typeof percentage === "number") && (
        <div className="mt-3.5 space-y-2 border-t border-slate-800/80 pt-2.5">
          {typeof percentage === "number" && !isNaN(percentage) && (
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Coverage</span>
                <span className="font-bold text-slate-200">{Math.min(100, Math.max(0, percentage))}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    tone === "success"
                      ? "bg-emerald-500"
                      : tone === "warning"
                      ? "bg-amber-500"
                      : tone === "alert"
                      ? "bg-rose-500"
                      : "bg-cyan-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            {description && <p>{description}</p>}
            {trend && (
              <span
                className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-medium ${
                  trend.direction === "up"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : trend.direction === "down"
                    ? "bg-rose-500/10 text-rose-400"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {trend.label}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
