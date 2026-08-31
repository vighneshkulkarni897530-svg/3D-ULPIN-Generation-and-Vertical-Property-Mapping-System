"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useProperty } from "@/context/PropertyContext";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { DataTable, type ColumnDef } from "@/components/dashboard/DataTable";
import { DonutChart, BarChart } from "@/components/dashboard/charts";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { User, PropertyItem, DisputeRecord } from "@/types";
import { MOCK_USERS } from "@/data/mockUsers";
import { humanize, formatCompactINR } from "@/utils/format";
import {
  Users, Building2, ShieldCheck, Clock, AlertTriangle, UserCog, ScrollText, BarChart3, MapPin, Activity, Landmark,
} from "lucide-react";

type AdminTab = "dashboard" | "citizens" | "officers" | "properties" | "disputes" | "analytics" | "audit";

const allOfficers = [MOCK_USERS.officer, { ...MOCK_USERS.officer, id: "usr-off-204", name: "Sanjay Verma, IAS", designation: "District Revenue Officer", jurisdictionDistrict: "Gurugram District" }];
const allCitizens = [MOCK_USERS.citizen, { ...MOCK_USERS.citizen, id: "usr-cit-102", name: "Sunita V. Deshpande" }, { ...MOCK_USERS.citizen, id: "usr-cit-103", name: "Venkat Rao Deshmukh" }];

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PERMISSIONS } from "@/types/auth";

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute permission={PERMISSIONS.ACCESS_DASHBOARD_ADMIN}>
      <AdminDashboardPageContent />
    </ProtectedRoute>
  );
}

function AdminDashboardPageContent() {
  const { properties, disputes, fieldRequests, activityLogs } = useProperty();
  const [tab, setTab] = useState<AdminTab>("dashboard");

  const stats = useMemo(() => {
    const verified = properties.filter((p) => p.verificationStatus === "VERIFIED").length;
    const pending = properties.filter((p) => ["SUBMITTED", "UNDER_REVIEW", "FIELD_VERIFICATION_REQUESTED", "OFFICER_ASSIGNED", "VERIFICATION_IN_PROGRESS"].includes(p.verificationStatus)).length;
    const activeDisputes = disputes.filter((d) => d.status === "OPEN" || d.status === "UNDER_INVESTIGATION").length;
    return {
      citizens: allCitizens.length,
      officers: allOfficers.length,
      properties: properties.length,
      verified,
      pending,
      activeDisputes,
    };
  }, [properties, disputes, fieldRequests]);

  const statusSegments = [
    { key: "verified", label: "Verified", value: stats.verified, color: "#22C55E" },
    { key: "pending", label: "Pending", value: stats.pending, color: "#F59E0B" },
    { key: "disputed", label: "Disputed", value: disputes.length, color: "#EF4444" },
    { key: "submitted", label: "Submitted", value: Math.max(0, stats.properties - stats.verified - stats.pending - disputes.length), color: "#94A3B8" },
  ];

  const monthlyVerifications = [
    { label: "Jan", value: 1240 }, { label: "Feb", value: 1620 }, { label: "Mar", value: 2080 },
    { label: "Apr", value: 1715 }, { label: "May", value: 2540 }, { label: "Jun", value: 3180 },
  ];

  const disputeByCategory = Object.entries(
    disputes.reduce<Record<string, number>>((acc, d) => { acc[d.category] = (acc[d.category] ?? 0) + 1; return acc; }, {})
  )
    .map(([k, v]) => ({ label: humanize(k).split(" ")[0], value: v }))
    .sort((a, b) => b.value - a.value);
const propertyCols: ColumnDef<PropertyItem>[] = [
    { key: "title", header: "Property", render: (p) => (<div className="min-w-0"><p className="max-w-[180px] truncate text-xs font-bold text-slate-900">{p.title}</p><p className="font-mono text-[10px] text-slate-400">{p.ulpin}</p></div>) },
    { key: "type", header: "Type", hiddenOnMobile: true, render: (p) => <Badge variant="blue">{humanize(p.propertyType)}</Badge> },
    { key: "district", header: "District", hiddenOnMobile: true, render: (p) => <span className="text-xs text-slate-600">{p.district}</span> },
    { key: "value", header: "Value", hiddenOnMobile: true, render: (p) => <span className="font-mono text-xs font-bold text-slate-800">{formatCompactINR(p.marketValuationINR)}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.verificationStatus} size="sm" /> },
    { key: "actions", header: "Action", render: (p) => <Link href={`/properties/${p.id}`} className="text-[11px] font-black text-blue-700 hover:underline">Open</Link> },
  ];

  const disputeCols: ColumnDef<DisputeRecord>[] = [
    { key: "ticket", header: "Ticket", render: (d) => <span className="font-mono text-xs font-black text-red-600">{d.disputeTicketNumber}</span> },
    { key: "title", header: "Case", render: (d) => (<div className="min-w-0"><p className="max-w-[200px] truncate text-xs font-bold text-slate-900">{d.title}</p><p className="font-mono text-[10px] text-slate-400">{d.ulpin}</p></div>) },
    { key: "category", header: "Category", hiddenOnMobile: true, render: (d) => <Badge variant="warning">{humanize(d.category)}</Badge> },
    { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status} size="sm" /> },
    { key: "assignee", header: "Assignee", hiddenOnMobile: true, render: (d) => <span className="text-xs text-slate-600">{d.assignedOfficerName ?? "Unassigned"}</span> },
    { key: "actions", header: "Action", render: (d) => <Link href={`/properties/${d.propertyId}/verification`} className="text-[11px] font-black text-blue-700 hover:underline">Review</Link> },
  ];

  const officerCols: ColumnDef<(typeof allOfficers)[number]>[] = [
    { key: "name", header: "Officer", render: (o) => (<div className="flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-[10px] font-black text-slate-950">{o.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</div><div><p className="text-xs font-bold text-slate-900">{o.name}</p><p className="text-[10px] text-slate-400">{o.badgeNumber}</p></div></div>) },
    { key: "dept", header: "Designation", hiddenOnMobile: true, render: (o) => <span className="text-xs text-slate-600">{o.designation}</span> },
    { key: "jurisdiction", header: "Jurisdiction", hiddenOnMobile: true, render: (o) => <span className="text-xs text-slate-600">{o.jurisdictionDistrict}</span> },
    { key: "status", header: "Status", render: () => <Badge variant="success">Active</Badge> },
    { key: "actions", header: "Action", render: () => <button className="text-[11px] font-black text-blue-700 hover:underline">Manage</button> },
  ];

  const logCols: ColumnDef<(typeof activityLogs)[number]>[] = [
    { key: "action", header: "Action", render: (l) => <span className="font-mono text-[11px] font-bold text-cyan-700">{l.action}</span> },
    { key: "actor", header: "Actor", render: (l) => <span className="text-xs text-slate-800">{l.actorName} <span className="text-slate-400">({l.actorRole})</span></span> },
    { key: "target", header: "Target", hiddenOnMobile: true, render: (l) => <span className="font-mono text-[11px] text-slate-500">{l.targetId}</span> },
    { key: "details", header: "Details", hiddenOnMobile: true, render: (l) => <span className="block max-w-[280px] truncate text-xs text-slate-600">{l.details}</span> },
    { key: "time", header: "Timestamp", hiddenOnMobile: true, render: (l) => <span className="font-mono text-[11px] text-slate-500">{l.timestamp}</span> },
  ];
const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Overview", icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { id: "citizens", label: "Citizens", icon: <Users className="h-3.5 w-3.5" /> },
    { id: "officers", label: "Officers", icon: <UserCog className="h-3.5 w-3.5" /> },
    { id: "properties", label: "Properties", icon: <Building2 className="h-3.5 w-3.5" /> },
    { id: "disputes", label: "Disputes", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { id: "audit", label: "Activity Logs", icon: <ScrollText className="h-3.5 w-3.5" /> },
  ];

  return (
    <PageContainer>
      <div className="space-y-7">
        <PageHeader
          eyebrow="CADASTRE ADMINISTRATION"
          title="Platform Command Centre"
          description="State-wide registry supervision, officer management, dispute analytics and system audit."
          actions={
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 sm:flex">
                <Activity className="h-3.5 w-3.5 text-green-500" /> All systems nominal
              </span>
              <Link href="/properties">
                <button className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-cyan-300 transition-colors hover:bg-slate-800">
                  Registry
                </button>
              </Link>
            </div>
          }
        />

        {/* Tab navigation */}
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-tech">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                tab === t.id ? "bg-slate-900 text-cyan-300 shadow-tech" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
{/* OVERVIEW TAB */}
        {tab === "dashboard" && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <DashboardCard label="Total Citizens" value={String(stats.citizens)} sub="Registered account holders" icon={<Users className="h-5 w-5" />} tone="cyan" />
              <DashboardCard label="Total Properties" value={String(stats.properties)} sub="Cadastral parcels in registry" icon={<Building2 className="h-5 w-5" />} tone="navy" />
              <DashboardCard label="Govt Officers" value={String(stats.officers)} sub="Verification workforce" icon={<ShieldCheck className="h-5 w-5" />} tone="blue" />
              <DashboardCard label="Pending Verifications" value={String(stats.pending)} sub="Queue awaiting action" icon={<Clock className="h-5 w-5" />} tone="amber" />
              <DashboardCard label="Active Disputes" value={String(stats.activeDisputes)} sub="Under investigation" icon={<AlertTriangle className="h-5 w-5" />} tone="red" />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
                <h3 className="mb-4 text-sm font-extrabold text-slate-900">Verification Statistics</h3>
                <DonutChart segments={statusSegments} centerLabel={String(stats.properties)} centerSub="parcels" size={150} />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
                <h3 className="mb-4 text-sm font-extrabold text-slate-900">Monthly Verifications</h3>
                <BarChart data={monthlyVerifications} height={200} formatValue={(v) => v.toLocaleString()} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <h3 className="mb-4 text-sm font-extrabold text-slate-900">System Activity Logs</h3>
              <ActivityTimeline
                items={activityLogs.slice(0, 4).map((l) => ({
                  id: l.id,
                  title: l.action.replace(/_/g, " "),
                  description: `${l.actorName} • ${l.details}`,
                  time: l.timestamp,
                  icon: l.actorRole === "ADMIN" ? <UserCog className="h-3.5 w-3.5" /> : l.actorRole === "OFFICER" ? <ShieldCheck className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />,
                  tone: (l.actorRole === "ADMIN" ? "navy" : l.actorRole === "OFFICER" ? "cyan" : "blue") as "navy" | "cyan" | "blue",
                }))}
              />
            </div>
          </>
        )}
{/* CITIZENS TAB */}
        {tab === "citizens" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-tech">
            <div className="border-b border-slate-100 p-5">
              <h3 className="text-sm font-extrabold text-slate-900">Manage Registered Citizens</h3>
              <p className="text-xs text-slate-500">Approve, verify and monitor citizen account profiles.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {allCitizens.map((c) => (
                <div key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-black text-slate-950">
                      {c.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{c.name}</p>
                      <p className="text-[10px] text-slate-400">{c.email} • {c.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">KYC Verified</Badge>
                    <Badge>{c.jurisdictionDistrict ?? "No jurisdiction"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OFFICERS TAB */}
        {tab === "officers" && (
          <DataTable
            columns={officerCols}
            data={allOfficers}
            rowKey={(o) => o.id}
            searchableKeys={["name", "designation", "jurisdictionDistrict", "badgeNumber"]}
            searchPlaceholder="Search officers..."
            defaultPageSize={5}
            onExport={() => undefined}
          />
        )}

        {/* PROPERTIES TAB */}
        {tab === "properties" && (
          <DataTable
            columns={propertyCols}
            data={properties}
            rowKey={(p) => p.id}
            searchableKeys={["title", "ulpin", "propertyId", "district", "primaryOwnerName"]}
            searchPlaceholder="Search registry by title, ULPIN or owner..."
            defaultPageSize={8}
          />
        )}
{/* DISPUTES TAB */}
        {tab === "disputes" && (
          <DataTable
            columns={disputeCols}
            data={disputes}
            rowKey={(d) => d.id}
            searchableKeys={["disputeTicketNumber", "title", "ulpin", "category"]}
            searchPlaceholder="Search disputes..."
            defaultPageSize={8}
          />
        )}

        {/* ANALYTICS TAB */}
        {tab === "analytics" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <AlertTriangle className="h-4 w-4 text-red-500" /> Disputes by Category
              </h3>
              <BarChart data={disputeByCategory} height={220} formatValue={(v) => String(v)} />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
              <h3 className="mb-4 text-sm font-extrabold text-slate-900">District Load</h3>
              <div className="space-y-3">
                {Array.from(new Set(properties.map((p) => p.district))).map((district) => {
                  const count = properties.filter((p) => p.district === district).length;
                  const max = Math.max(...Array.from(new Set(properties.map((p) => p.district))).map((d) => properties.filter((p) => p.district === d).length));
                  return (
                    <div key={district}>
                      <div className="mb-1 flex justify-between text-[11px]">
                        <span className="font-bold text-slate-700">{district}</span>
                        <span className="font-mono text-slate-400">{count} parcels</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* AUDIT TAB */}
        {tab === "audit" && (
          <DataTable
            columns={logCols}
            data={activityLogs}
            rowKey={(l) => l.id}
            searchableKeys={["action", "actorName", "actorRole", "targetId", "details"]}
            searchPlaceholder="Search audit trail..."
            defaultPageSize={8}
          />
        )}
      </div>
    </PageContainer>
  );
}