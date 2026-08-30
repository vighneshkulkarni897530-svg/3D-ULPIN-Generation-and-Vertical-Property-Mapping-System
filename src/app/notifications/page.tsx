"use client";

import React from "react";
import Link from "next/link";
import { useProperty } from "@/context/PropertyContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { humanize } from "@/utils/format";
import {
  Bell, CheckCheck, ShieldCheck, AlertTriangle, FileCheck2, Lock, Sparkles, ArrowRight,
} from "lucide-react";

export default function NotificationsPage() {
  const { notifications, markAllNotificationsAsRead, markNotificationAsRead } = useProperty();
  const unread = notifications.filter((n) => !n.isRead).length;

  const typeIcon = (type: string) => {
    switch (type) {
      case "VERIFICATION": return <ShieldCheck className="h-4 w-4 text-green-400" />;
      case "DISPUTE": return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case "FIELD_INSPECTION": return <Sparkles className="h-4 w-4 text-cyan-400" />;
      case "SECURITY": return <Lock className="h-4 w-4 text-amber-400" />;
      default: return <Bell className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex-1 bg-slate-50">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="NOTIFICATION CENTRE"
          title="Notifications & Alerts"
          description="Verification updates, dispute milestones, field inspection schedules and system advisories."
          actions={
            <Button variant="outline" onClick={() => markAllNotificationsAsRead()} disabled={unread === 0}>
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          }
        />

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-cyan-100 px-3 py-1 text-[11px] font-black text-cyan-800 border border-cyan-200">
            {unread} unread
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500 border border-slate-200">
            {notifications.length} total
          </span>
        </div>

        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border p-5 shadow-tech transition-all ${
                n.isRead ? "border-slate-200 bg-white" : "border-cyan-300 bg-cyan-50/50 ring-1 ring-cyan-500/15"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                  n.type === "VERIFICATION"
                    ? "border-green-200 bg-green-50"
                    : n.type === "DISPUTE"
                    ? "border-red-200 bg-red-50"
                    : n.type === "FIELD_INSPECTION"
                    ? "border-cyan-200 bg-cyan-50"
                    : "border-amber-200 bg-amber-50"
                }`}>
                  {typeIcon(n.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900">{n.title}</h3>
                      {n.priority === "HIGH" && <StatusBadge status="VERIFICATION_IN_PROGRESS" size="sm" showIcon={false} />}
                    </div>
                    <span className="font-mono text-[10px] font-bold text-slate-400">{n.createdAt}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">{n.message}</p>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                      {humanize(n.type)} • {n.priority} priority
                    </span>
                    {n.linkUrl ? (
                      <Link
                        href={n.linkUrl}
                        onClick={() => markNotificationAsRead(n.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-black text-cyan-700 hover:underline"
                      >
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : (
                      <button
                        onClick={() => markNotificationAsRead(n.id)}
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
                      >
                        {n.isRead ? "Read" : "Mark as read"}
                      </button>
                    )}
                  </div>
                </div>
                {!n.isRead && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}