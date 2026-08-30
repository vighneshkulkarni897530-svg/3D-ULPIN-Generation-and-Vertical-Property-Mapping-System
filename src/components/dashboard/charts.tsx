"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Pure-SVG charts — zero dependencies, fully responsive, Midnight Tech */
/* ------------------------------------------------------------------ */

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string; // tailwind bg class or hex
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSub?: string;
  ariaLabel?: string;
  className?: string;
}

export function DonutChart({ segments, size = 168, strokeWidth = 20, centerLabel, centerSub, ariaLabel, className }: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((acc, s) => acc + s.value, 0) || 1;
  let offset = 0;

  return (
    <div className={cn("flex flex-col items-center gap-4", className)} role="img" aria-label={ariaLabel ?? "Donut chart"}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {segments.map((s) => {
            const dash = (s.value / total) * circumference;
            const node = (
              <circle
                key={s.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                className="transition-all duration-700"
              />
            );
            offset += dash;
            return node;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-900 tabular-nums">{centerLabel ?? total}</span>
          {centerSub && <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{centerSub}</span>}
        </div>
      </div>
      <div className="grid w-full grid-cols-1 gap-1.5">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-500 font-medium">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
            <span className="font-bold text-slate-800 tabular-nums">
              {total > 0 ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  formatValue?: (v: number) => string;
  ariaLabel?: string;
  className?: string;
}

export function BarChart({ data, height = 180, formatValue, ariaLabel, className }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn("w-full", className)} role="img" aria-label={ariaLabel ?? "Bar chart"}>
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((d, i) => {
          const h = Math.max((d.value / max) * 100, 3);
          return (
            <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-2 h-full">
              <span className="text-[9px] font-mono font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                {formatValue ? formatValue(d.value) : d.value}
              </span>
              <div
                className={cn("w-full max-w-[42px] rounded-t-lg transition-all duration-500 group-hover:opacity-80", d.color ?? "bg-gradient-to-t from-cyan-600 to-cyan-400")}
                style={{ height: `${h}%` }}
              />
              <span className="text-[9px] font-semibold text-slate-500 truncate max-w-full">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SparklineProps {
  points: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: boolean;
  className?: string;
}

export function Sparkline({ points, width = 120, height = 40, stroke = "#06B6D4", fill = true, className }: SparklineProps) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const coords = points.map((p, i) => [i * step, height - ((p - min) / range) * (height - 6) - 3]);
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} className={className} preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
      {fill && <path d={area} fill={stroke} opacity={0.12} />}
      <path d={line} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export interface HBarDatum {
  key: string;
  label: string;
  value: number;
  /** Optional secondary label rendered after the value (e.g. "open / resolved"). */
  sub?: string;
  color?: string;
}

interface HBarChartProps {
  data: HBarDatum[];
  max?: number;
  valueFormatter?: (v: number) => string;
  emptyLabel?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Horizontal bar chart — responsive rows with label, proportional fill and
 * value. Complements the vertical BarChart for long labels (buildings,
 * severities, activity types). Pure SVG/DOM, zero dependencies.
 */
export function HBarChart({ data, max, valueFormatter, emptyLabel = 'No data for the current scope.', ariaLabel, className }: HBarChartProps) {
  if (data.length === 0) {
    return <p className={cn('rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-400', className)}>{emptyLabel}</p>;
  }
  const maxValue = Math.max(max ?? 0, ...data.map((d) => d.value), 1);
  return (
    <div className={cn('space-y-2.5', className)} role="img" aria-label={ariaLabel ?? 'Horizontal bar chart'}>
      {data.map((d) => (
        <div key={d.key} className="flex items-center gap-2.5">
          <span className="w-28 shrink-0 truncate text-[11px] font-semibold text-slate-600 sm:w-36" title={d.label}>
            {d.label}
          </span>
          <div className="h-3.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.max((d.value / maxValue) * 100, 2)}%`, backgroundColor: d.color ?? '#06B6D4' }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-[11px] font-black tabular-nums text-slate-800">
            {valueFormatter ? valueFormatter(d.value) : d.value}
          </span>
          {d.sub && <span className="hidden w-20 shrink-0 text-right font-mono text-[9px] text-slate-400 sm:block">{d.sub}</span>}
        </div>
      ))}
    </div>
  );
}