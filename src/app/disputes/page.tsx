"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useProperty } from "@/context/PropertyContext";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnDef } from "@/components/dashboard/DataTable";
import { DisputeRecord } from "@/types";
import { humanize } from "@/utils/format";
import { AlertTriangle, Plus, Scale } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function DisputesRegistryPage() {
  return (
    <ProtectedRoute>
      <DisputesRegistryPageContent />
    </ProtectedRoute>
  );
}

function DisputesRegistryPageContent() {
  const { disputes } = useProperty();
  const { role } = useAuth();

  // Officers & admins see all; citizens see their own
  const visible = role === "CITIZEN" ? disputes.filter((d) => d.raisedByUserId === "usr-cit-101") : disputes;

  const columns: ColumnDef<DisputeRecord>[] = [
    {
      key: "ticket",
      header: "Ticket No.",
      render: (d) => (
        <span className="font-mono text-xs font-extrabold text-cyan-700">{d.disputeTicketNumber}</span>
      ),
    },
    {
      key: "property",
      header: "Property",
      render: (d) => (
        <div className="min-w-0">
          <p className="max-w-[220px] truncate text-xs font-bold text-slate-900">{d.propertyTitle}</p>
          <p className="font-mono text-[10px] text-slate-400">{d.ulpin}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      hiddenOnMobile: true,
      render: (d) => <Badge variant="warning">{humanize(d.category)}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      render: (d) => <StatusBadge status={d.status} size="sm" />,
    },
    {
      key: "raisedBy",
      header: "Raised By",
      hiddenOnMobile: true,
      render: (d) => <span className="text-xs text-slate-600">{d.raisedByUserName}</span>,
    },
    {
      key: "created",
      header: "Filed On",
      hiddenOnMobile: true,
      render: (d) => (
        <span className="font-mono text-[11px] text-slate-500">
          {new Date(d.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (d) => (
        <Link href={`/properties/${d.propertyId}/verification`}>
          <Button size="sm" variant="outline">Review</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="flex-1 bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="DISPUTE REGISTRY"
          title="Dispute Cases"
          description={
            role === "CITIZEN"
              ? "Grievances raised by you against cadastral records, with live status tracking."
              : "All cadastral disputes across your jurisdiction awaiting investigation and resolution."
          }
          actions={
            <Link href="/disputes/new">
              <Button variant="gradient">
                <Plus className="h-4 w-4" /> Raise New Dispute
              </Button>
            </Link>
          }
        />

        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Cases", value: visible.length, tone: "text-slate-900" },
            { label: "Open", value: visible.filter((d) => d.status === "OPEN").length, tone: "text-amber-600" },
            { label: "Under Investigation", value: visible.filter((d) => d.status === "UNDER_INVESTIGATION").length, tone: "text-cyan-600" },
            { label: "Resolved", value: visible.filter((d) => d.status === "RESOLVED").length, tone: "text-green-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-tech">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
              <p className={`mt-1 text-2xl font-extrabold tabular-nums ${s.tone}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-14 text-center">
            <Scale className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-sm font-extrabold text-slate-900">No disputes filed</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
              You haven't raised any cadastral grievances. If you found an error in a property record, file a report.
            </p>
            <Link href="/disputes/new" className="mt-5 inline-block">
              <Button variant="gradient" size="sm">
                <AlertTriangle className="h-3.5 w-3.5" /> Report an Error
              </Button>
            </Link>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={visible}
            rowKey={(d) => d.id}
            searchableKeys={["disputeTicketNumber", "propertyTitle", "ulpin", "category"]}
            searchPlaceholder="Search by ticket, ULPIN or title..."
            defaultPageSize={8}
          />
        )}
      </div>
    </div>
  );
}