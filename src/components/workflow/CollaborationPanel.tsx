"use client";

import * as React from "react";
import { Radio, UsersRound } from "lucide-react";
import { SectionHeader } from "@/components/layout/PageHeader";
import { formatRelativeTime } from "@/lib/gisUtils";
import { cn } from "@/lib/utils";
import type { Collaborator } from "@/types/workflow";

interface CollaborationPanelProps {
  collaborators: Collaborator[];
  recentEvents: Array<{ id: string; taskId: string; actor: string; action: string; timestamp: string }>;
  className?: string;
}

const presenceTone: Record<Collaborator["status"], { dot: string; label: string }> = {
  ACTIVE: { dot: "bg-emerald-500", label: "Active" },
  AWAY: { dot: "bg-amber-500", label: "Away" },
  OFFLINE: { dot: "bg-slate-400", label: "Offline" },
};

/**
 * Demo Collaboration Presence — clearly labelled simulated presence built
 * from demo personas plus assignment/activity visibility. NOT real-time.
 */
export function CollaborationPanel({ collaborators, recentEvents, className }: CollaborationPanelProps) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-tech", className)} aria-label="Team collaboration presence">
      <SectionHeader
        icon={<UsersRound className="h-4 w-4" />}
        title="Team & Presence"
        description="Demo Collaboration Presence — simulated."
      />

      <div className="mt-4 space-y-2.5">
        {collaborators.map((c) => {
          const tone = presenceTone[c.status];
          return (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-[11px] font-extrabold text-slate-950">
                {c.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white", tone.dot)} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-extrabold text-slate-900">{c.name}</p>
                <p className="truncate text-[9.5px] text-slate-500">{c.designation}</p>
              </div>
              <div className="shrink-0 text-right">
                <span className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-500">{tone.label}</span>
                <span className="block font-mono text-[8.5px] text-slate-400">seen {formatRelativeTime(c.lastSeen)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
          <Radio className="h-3 w-3" /> Recent task changes
        </p>
        {recentEvents.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-400">
            No task activity yet in this session.
          </p>
        ) : (
          <ul className="space-y-2">
            {recentEvents.map((e) => (
              <li key={e.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                <p className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="font-mono font-extrabold text-cyan-700">{e.taskId}</span>
                  <span className="font-mono text-[8.5px] text-slate-400">{formatRelativeTime(e.timestamp)}</span>
                </p>
                <p className="mt-0.5 text-[10px] text-slate-600">
                  <strong>{e.actor}</strong> — {e.action}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[9px] leading-relaxed text-amber-800">
        <strong className="font-extrabold">Demo Collaboration Presence</strong> — presence and assignment indicators are
        simulated for this prototype. No real-time multi-user synchronization is claimed.
      </p>
    </section>
  );
}