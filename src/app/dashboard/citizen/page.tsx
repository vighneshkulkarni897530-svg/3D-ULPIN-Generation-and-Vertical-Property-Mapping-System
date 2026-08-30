"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useProperty } from "@/context/PropertyContext";
import { useAuth } from "@/context/AuthContext";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { DonutChart, BarChart, Sparkline } from "@/components/dashboard/charts";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { PropertyCard } from "@/components/property/PropertyCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { humanize } from "@/utils/format";
import {
  Building2, ShieldCheck, Clock, AlertTriangle, Search, FileCheck2, Plus,
  Bell, ArrowRight, Radio, TrendingUp,
} from "lucide-react";

export default function CitizenDashboardPage() {
  const { properties, disputes, fieldRequests, notifications, activityLogs } = useProperty();
  const { currentUser } = useAuth();
  const [showAllProperties, setShowAllProperties] = useState(false);

  const stat = useMemo(() => {
    const mine = properties; // frontend demo: citizen sees registry
    const verified = mine.filter((p) => p.verificationStatus === "VERIFIED").length;
    const pending = mine.filter((p) =>
      ["SUBMITTED", "UNDER_REVIEW", "FIELD_VERIFICATION_REQUESTED", "OFFICER_ASSIGNED", "VERIFICATION_IN_PROGRESS"].includes(p.verificationStatus)
    ).length;
    const disputed = mine.filter((p) => p.hasActiveDispute || p.verificationStatus === "DISPUTED").length;
    return { total: mine.length, verified, pending, disputed };
  }, [properties]);

  const myRequests = fieldRequests.filter((r) => r.requestedByUserId === "usr-cit-101");
  const myDisputes = disputes.filter((d) => d.raisedByUserId === "usr-cit-101");
  const myNotifications = notifications.filter((n) => n.recipientRole === "CITIZEN" || n.recipientUserId === "usr-cit-101").slice(0, 4);

  const donutSegments = [
    { key: "verified", label: "Verified", value: stat.verified, color: "#22C55E" },
    { key: "pending", label: "Pending", value: stat.pending, color: "#F59E0B" },
    { key: "disputed", label: "Disputed", value: stat.disputed, color: "#EF4444" },
    { key: "other", label: "Other", value: Math.max(0, stat.total - stat.verified - stat.pending - stat.disputed), color: "#94A3B8" },
  ];

  const typeCounts = properties.reduce<Record<string, number>>((acc, p) => {
    acc[p.propertyType] = (acc[p.propertyType] ?? 0) + 1;
    return acc;
  }, {});
  const barData = Object.entries(typeCounts)
    .map(([k, v]) => ({ label: humanize(k).split(" ")[0], value: v }))
    .sort((a, b) => b.value - a.value);

  const recentActivity = activityLogs.slice(0, 5).map((log) => ({
    id: log.id,
    title: log.action.replace(/_/g, " "),
    description: log.details,
    time: log.timestamp,
    icon: log.action === "PROPERTY_VERIFIED" ? (<ShieldCheck className="h-3.5 w-3.5" />) : log.action === "DISPUTE_RAISED" ? (<AlertTriangle className="h-3.5 w-3.5" />) : (<FileCheck2 className="h-3.5 w-3.5" />),
    tone: (log.action === "PROPERTY_VERIFIED" ? "green" : log.action === "DISPUTE_RAISED" ? "red" : "cyan") as "green" | "red" | "cyan" | "amber" | "blue" | "navy",
  }));

  return (
    <PageContainer>
      <div className="space-y-7">
        <PageHeader
          eyebrow="CITIZEN HUB"
          title={`Welcome back, ${currentUser.name.split(" ")[0]}`}
          description="Your personal property verification command centre — track verifications, disputes and field surveys in one place."
          actions={
            <div className="flex items-center gap-2">
              <Link href="/properties">
                <Button variant="secondary">
                  <Search className="h-3.5 w-3.5" /> Search Property
                </Button>
              </Link>
              <Link href="/disputes/new">
                <Button variant="gradient">
                  <Plus className="h-3.5 w-3.5" /> Raise Dispute
                </Button>
              </Link>
            </div>
          }
        />

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            label="Total Properties"
            value={String(stat.total)}
            sub="Across your registered portfolio"
            icon={<Building2 className="h-5 w-5" />}
            tone="navy"
            trend={{ direction: "up", value: "12%" }}
          />
          <DashboardCard
            label="Verified Properties"
            value={String(stat.verified)}
            sub="Bhu-Aadhaar digital seal issued"
            icon={<ShieldCheck className="h-5 w-5" />}
            tone="green"
            trend={{ direction: "up", value: "2 this month" }}
          />
          <DashboardCard
            label="Pending Verification"
            value={String(stat.pending)}
            sub="Awaiting officer action"
            icon={<Clock className="h-5 w-5" />}
            tone="amber"
          />
          <DashboardCard
            label="Active Disputes"
            value={String(stat.disputed)}
            sub="Cases under investigation"
            icon={<AlertTriangle className="h-5 w-5" />}
            tone="red"
            actionable
            onClick={() => window.location.assign("/disputes")}
          />
        </div>
{/* CHARTS ROW */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Portfolio Status</h3>
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-500">
                {stat.total} parcels
              </span>
            </div>
            <DonutChart segments={donutSegments} centerLabel={String(stat.total)} centerSub="parcels" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Property Types</h3>
              <TrendingUp className="h-4 w-4 text-cyan-600" />
            </div>
            <BarChart data={barData} height={200} formatValue={(v) => String(v)} />
          </div>

          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Verification Momentum</h3>
              <Radio className="h-4 w-4 text-cyan-600" />
            </div>
            <div className="flex flex-1 flex-col items-center justify-center">
              <Sparkline points={[2, 3, 3, 5, 4, 7, 6, 8]} className="w-full" />
              <p className="mt-3 text-center text-xs text-slate-500">
                <span className="font-black text-green-600">+8 records</span> verified in the last
                quarter across your properties (6-month trend shown).
              </p>
              <Link href="/properties" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-cyan-700 hover:underline">
                Explore registry <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div>
          <h3 className="mb-3 text-sm font-extrabold text-slate-900">Quick Actions</h3>
          <QuickActions
            items={[
              { label: "Verify a ULPIN", description: "Search any 14-digit parcel ID", icon: <Search className="h-4 w-4" />, href: "/properties" },
              { label: "Request Field Verification", description: "Book DGPS / drone survey", icon: <FileCheck2 className="h-4 w-4" />, href: "/field-verification/request", tone: "blue" },
              { label: "Report an Error", description: "Raise a cadastral dispute", icon: <AlertTriangle className="h-4 w-4" />, href: "/disputes/new" },
              { label: "View Notifications", description: `${myNotifications.filter((n) => !n.isRead).length} unread alerts`, icon: <Bell className="h-4 w-4" />, href: "/notifications", tone: "secondary" },
            ]}
          />
        </div>

        {/* MY PROPERTIES */}
        <div>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">My Properties</h3>
              <p className="text-xs text-slate-500">Your registered cadastral portfolio & their verification state.</p>
            </div>
            <button
              onClick={() => setShowAllProperties((v) => !v)}
              className="text-xs font-bold text-cyan-700 hover:underline"
            >
              {showAllProperties ? "Show fewer" : `View all ${properties.length}`}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {(showAllProperties ? properties : properties.slice(0, 3)).map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </div>
{/* BOTTOM GRID */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Recent activity */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Recent Activity</h3>
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                Live audit trail
              </span>
            </div>
            <ActivityTimeline items={recentActivity} />
          </div>

          {/* Verification requests */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900">Field Verification Requests</h3>
                <span className="rounded-full bg-cyan-100 px-2 py-0.5 font-mono text-[10px] font-black text-cyan-700">
                  {myRequests.length}
                </span>
              </div>
              <div className="space-y-3">
                {myRequests.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-400">
                    No field verification requests yet.
                  </p>
                )}
                {myRequests.map((r) => {
                  const prop = properties.find((p) => p.id === r.propertyId);
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-slate-900">{r.propertyTitle}</p>
                        <p className="font-mono text-[10px] text-slate-400">{r.requestNumber} • {r.surveyType.replace(/_/g, " ")}</p>
                      </div>
                      <StatusBadge status={r.status} size="sm" />
                    </div>
                  );
                })}
              </div>
              <Link href="/field-verification/request" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-cyan-700 hover:underline">
                Request a new survey <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Dispute status */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900">Dispute Status</h3>
                <span className="rounded-full bg-red-100 px-2 py-0.5 font-mono text-[10px] font-black text-red-700">
                  {myDisputes.length}
                </span>
              </div>
              <div className="space-y-3">
                {myDisputes.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-400">
                    No active disputes — all records clean.
                  </p>
                )}
                {myDisputes.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-slate-900">{d.title}</p>
                      <p className="font-mono text-[10px] text-slate-400">{d.disputeTicketNumber}</p>
                    </div>
                    <StatusBadge status={d.status} size="sm" />
                  </div>
                ))}
              </div>
              <Link href="/disputes" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-cyan-700 hover:underline">
                Open dispute registry <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* NOTIFICATIONS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">Latest Notifications</h3>
            <Link href="/notifications" className="text-xs font-bold text-cyan-700 hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {myNotifications.map((n) => (
              <div key={n.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-600">
                  {n.type === "VERIFICATION" ? <ShieldCheck className="h-4 w-4" /> : n.type === "DISPUTE" ? <AlertTriangle className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-900 line-clamp-1">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{n.message}</p>
                  <span className="mt-1 inline-block font-mono text-[9px] font-bold text-slate-400">{n.createdAt}</span>
                </div>
                {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-500" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}