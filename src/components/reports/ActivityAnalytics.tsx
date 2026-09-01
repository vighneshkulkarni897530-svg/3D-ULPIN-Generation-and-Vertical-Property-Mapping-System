"use client";

import * as React from "react";
import { Activity, Box, Sparkles } from "lucide-react";
import { BarChart, HBarChart, type BarDatum, type HBarDatum } from "@/components/dashboard/charts";
import { ActivityTimeline, type ActivityItem } from "@/components/dashboard/ActivityTimeline";
import { SectionHeader } from "@/components/layout/PageHeader";
import { ACTIVITY_TYPE_META, type ReportAnalytics } from "@/lib/reportAnalytics";
import { formatRelativeTime } from "@/lib/gisUtils";
import { Database, AlertTriangle, CheckCheck, CheckCircle2, Building2 } from "lucide-react";
import type { ActivityRecord } from "@/types/activity";

interface ActivityAnalyticsProps {
  analytics: ReportAnalytics;
  className?: string;
}

function activityIcon(a: ActivityRecord): React.ReactNode {
  switch (a.type) {
    case "PROPERTY_VERIFICATION":
      return <CheckCircle2 className="h-4 w-4" />;
    case "CONFLICT_DETECTION":
      return <AlertTriangle className="h-4 w-4" />;
    case "CONFLICT_RESOLUTION":
      return <CheckCheck className="h-4 w-4" />;
    case "BUILDING_UPDATE":
      return <Building2 className="h-4 w-4" />;
    case "AI_EXTRACTION":
      return <Sparkles className="h-4 w-4" />;
    case "3D_RECONSTRUCTION":
      return <Box className="h-4 w-4" />;
    default:
      return <Database className="h-4 w-4" />;
  }
}

function activityTone(a: ActivityRecord): ActivityItem["tone"] {
  switch (a.type) {
    case "PROPERTY_VERIFICATION":
    case "CONFLICT_RESOLUTION":
      return "green";
    case "CONFLICT_DETECTION":
      return "red";
    case "CONFLICT_FIELD_REVIEW":
    case "CONFLICT_CORRECTION":
      return "amber";
    case "3D_RECONSTRUCTION":
      return "blue";
    default:
      return "cyan";
  }
}

/**
 * Section F — Activity Analytics. Type distribution and a day-by-day view are
 * derived from the centralized activity feed (real record timestamps only —
 * no synthetic trend data). AI extraction and 3D reconstruction activity from
 * earlier phases surface here alongside verification and conflict actions.
 */
export function ActivityAnalytics({ analytics, className }: ActivityAnalyticsProps) {
  const a = analytics;

  const typeData: HBarDatum[] = a.activityBreakdown.map((row) => ({
    key: row.type,
    label: ACTIVITY_TYPE_META[row.type]?.label ?? row.type,
    value: row.count,
    color: ACTIVITY_TYPE_META[row.type]?.color ?? "#64748B",
  }));

  const dayData: BarDatum[] = a.activityByDay.map((d) => ({ label: d.day, value: d.count }));

  const aiCount = a.activityBreakdown.find((r) => r.type === "AI_EXTRACTION")?.count ?? 0;
  const reconstructionCount = a.activityBreakdown.find((r) => r.type === "3D_RECONSTRUCTION")?.count ?? 0;

  return (
    <section className={className} aria-label="Activity analytics">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
        <SectionHeader
          icon={<Activity className="h-4 w-4" />}
          title="F · Activity Analytics"
          description={`${a.activities} centralized activity records in the current scope.`}
        />

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Activity by type</p>
            <HBarChart data={typeData} ariaLabel="Activity records by type" emptyLabel="No activity records in the current scope." />
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-cyan-700">
                <Sparkles className="h-3 w-3" /> AI extractions: {aiCount}
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
                <Box className="h-3 w-3" /> 3D reconstructions: {reconstructionCount}
              </span>
            </div>
          </div>
          <div>
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Records per day (latest 7 active days)</p>
            {dayData.length < 2 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-400">
                Not enough timestamped records in the current scope for a trend view — see the type distribution instead.
              </p>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-4">
                <BarChart data={dayData} height={150} ariaLabel="Activity records per day" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Recent activity</p>
          <ActivityTimeline
            items={a.recentActivities.map((rec) => ({
              id: rec.id,
              title: rec.title,
              description: `${rec.description} — ${rec.user} (${rec.userRole})`,
              time: formatRelativeTime(rec.timestamp),
              icon: activityIcon(rec),
              tone: activityTone(rec),
            }))}
          />
        </div>
      </div>
    </section>
  );
}