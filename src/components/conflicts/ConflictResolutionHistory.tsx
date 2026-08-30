"use client";

import * as React from "react";
import { History, TriangleAlert, Footprints, FilePenLine, CheckCircle2, Eye } from "lucide-react";
import type { SpatialConflict } from "@/types/conflict";
import type { ActivityRecord } from "@/types/activity";
import { formatRelativeTime } from "@/lib/gisUtils";
import { cn } from "@/lib/utils";

export interface ConflictResolutionHistoryProps {
  conflict: SpatialConflict;
  activities: ActivityRecord[];
  className?: string;
}

interface HistoryEvent {
  key: string;
  timestamp: string;
  label: string;
  detail: string;
  icon: React.ReactNode;
  tone: "red" | "cyan" | "blue" | "amber" | "green";
}

/**
 * Resolution History — a timeline of every action taken against a conflict,
 * derived from the centralized activity feed. No local arrays or duplicate
 * history state exist in this component.
 */
export function ConflictResolutionHistory({ conflict, activities, className }: ConflictResolutionHistoryProps) {
  const events = React.useMemo<HistoryEvent[]>(() => {
    const list: HistoryEvent[] = [];

    // 1. Detection (from the conflict record itself)
    list.push({
      key: `detected-${conflict.id}`,
      timestamp: conflict.detectedAt,
      label: "Conflict Detected",
      detail: `${conflict.type} identified by spatial analysis · severity ${conflict.severity}`,
      icon: <TriangleAlert className="h-3.5 w-3.5" />,
      tone: "red",
    });

    // 2. Follow-up actions from the centralized activity feed.
    const conflictActivities = [...activities]
      .filter((a) => a.entityId === conflict.id)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    for (const a of conflictActivities) {
      list.push({
        key: a.id,
        timestamp: a.timestamp,
        label: a.title,
        detail: `${a.description} — ${a.user}`,
        icon: <ActivityGlyph type={a.type} />,
        tone: resolveActivityTone(a.title),
      });
    }

    // 3. Field review request (stored centrally on the conflict)
    if (conflict.fieldReview) {
      list.push({
        key: `field-review-${conflict.id}`,
        timestamp: conflict.fieldReview.requestedAt,
        label: "Field Review Requested",
        detail: `Sent by ${conflict.fieldReview.requestedBy}. ${conflict.fieldReview.notes}`,
        icon: <Footprints className="h-3.5 w-3.5" />,
        tone: "blue",
      });
    }

    // 4. Data correction request (stored centrally on the conflict)
    if (conflict.correctionRequest) {
      list.push({
        key: `correction-${conflict.id}`,
        timestamp: conflict.correctionRequest.requestedAt,
        label: "Data Correction Requested",
        detail: `${conflict.correctionRequest.category} — requested by ${conflict.correctionRequest.requestedBy}. ${conflict.correctionRequest.notes}`,
        icon: <FilePenLine className="h-3.5 w-3.5" />,
        tone: "amber",
      });
    }

    // 5. Resolution (from the conflict record)
    if (conflict.resolvedAt && conflict.status === "Resolved") {
      list.push({
        key: `resolved-${conflict.id}`,
        timestamp: conflict.resolvedAt,
        label: "Conflict Resolved",
        detail: `Resolved by ${conflict.resolvedBy ?? "Officer"}. ${conflict.resolutionNotes ?? ""}`,
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        tone: "green",
      });
    }

    // Sort chronologically (oldest first).
    return list.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }, [conflict, activities]);

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 py-8 text-center">
        <History className="mx-auto h-6 w-6 text-slate-300" />
        <p className="mt-2 text-sm font-bold text-slate-900">No resolution history</p>
        <p className="mt-1 text-[10px] text-slate-500">
          Actions taken on this conflict will appear here as activities.
        </p>
      </div>
    );
  }

  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white", className)}>
      <header className="border-b border-slate-100 px-4 py-3">
        <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
          <History className="h-3 w-3" /> Resolution History
        </p>
      </header>
      <ol className="relative space-y-3 p-4 before:absolute before:left-[17px] before:top-4 before:bottom-4 before:w-px before:bg-slate-200">
        {events.map((ev) => (
          <li key={ev.key} className="relative flex items-start gap-3">
            <span className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border", TONE_CHIP[ev.tone])}>
              {ev.icon}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-extrabold text-slate-900">{ev.label}</p>
                <span className="shrink-0 font-mono text-[8px] font-semibold text-slate-400">
                  {formatRelativeTime(ev.timestamp)}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{ev.detail}</p>
              {ev.key.startsWith("detected-") && (
                <span className="mt-1 inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-slate-500">
                  <Eye className="h-2.5 w-2.5" /> Demo Spatial Conflict
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const TONE_CHIP: Record<HistoryEvent["tone"], string> = {
  red: "bg-red-50 border-red-200 text-red-600",
  cyan: "bg-cyan-50 border-cyan-200 text-cyan-600",
  blue: "bg-blue-50 border-blue-200 text-blue-600",
  amber: "bg-amber-50 border-amber-200 text-amber-600",
  green: "bg-emerald-50 border-emerald-200 text-emerald-600",
};

function resolveActivityTone(label: string): HistoryEvent["tone"] {
  const l = label.toLowerCase();
  if (l.includes("resolv")) return "green";
  if (l.includes("field")) return "blue";
  if (l.includes("correction")) return "amber";
  if (l.includes("review")) return "cyan";
  if (l.includes("detect")) return "red";
  return "cyan";
}

function ActivityGlyph({ type }: { type: ActivityRecord["type"] }) {
  switch (type) {
    case "CONFLICT_DETECTION":
      return <TriangleAlert className="h-3.5 w-3.5" />;
    case "CONFLICT_RESOLUTION":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "CONFLICT_FIELD_REVIEW":
      return <Footprints className="h-3.5 w-3.5" />;
    case "CONFLICT_CORRECTION":
      return <FilePenLine className="h-3.5 w-3.5" />;
    default:
      return <TriangleAlert className="h-3.5 w-3.5" />;
  }
}