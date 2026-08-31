"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useProperty } from "@/context/PropertyContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { DataTable, type ColumnDef } from "@/components/dashboard/DataTable";
import { MapPanel } from "@/components/map/MapPanel";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Badge } from "@/components/ui/badge";
import { FieldVerificationRequest, PropertyItem, VerificationStatus } from "@/types";
import { humanize } from "@/utils/format";
import {
  FileCheck2, ShieldCheck, ClipboardCheck, AlertTriangle, MapPin, Clock,
  CheckCircle2, XCircle, RefreshCcw, Eye, FileText, CalendarDays, ArrowRight,
  Search, Layers, Landmark,
} from "lucide-react";

type ActionTone = "approve" | "reject" | "correction" | "status";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PERMISSIONS } from "@/types/auth";

export default function OfficerDashboardPage() {
  return (
    <ProtectedRoute permission={PERMISSIONS.VIEW_VERIFICATION_QUEUE}>
      <OfficerDashboardPageContent />
    </ProtectedRoute>
  );
}

function OfficerDashboardPageContent() {
  const {
    fieldRequests, disputes, properties, updatePropertyVerificationStatus, updateDisputeStatus,
  } = useProperty();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(fieldRequests[0]?.id ?? null);
  const [confirm, setConfirm] = useState<{ type: ActionTone; requestId: string | null; propertyId: string | null } | null>(null);
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);

  const activeRequest = fieldRequests.find((r) => r.id === selectedRequestId) ?? fieldRequests[0];
  const detailProperty = activeRequest ? properties.find((p) => p.id === activeRequest.propertyId) : undefined;
  const detailDispute = activeRequest
    ? disputes.find((d) => d.propertyId === activeRequest.propertyId)
    : undefined;

  const stats = useMemo(() => {
    const pending = fieldRequests.filter((r) => r.status === "PENDING_ASSIGNMENT").length;
    const scheduled = fieldRequests.filter((r) => r.status === "SCHEDULED").length;
    const inProgress = fieldRequests.filter((r) => r.status === "IN_PROGRESS").length;
    const completed = fieldRequests.filter((r) => r.status === "COMPLETED").length;
    const highPriority = fieldRequests.filter((r) => r.urgency === "HIGH_PRIORITY" && r.status !== "COMPLETED").length;
    const openDisputes = disputes.filter((d) => d.status === "OPEN" || d.status === "UNDER_INVESTIGATION").length;
    return { pending, scheduled, inProgress, completed, highPriority, openDisputes };
  }, [fieldRequests, disputes]);
const executeAction = () => {
    if (!activeRequest || !confirm) return;
    const propertyId = confirm.propertyId ?? activeRequest.propertyId;

    if (confirm.type === "approve") {
      updatePropertyVerificationStatus(propertyId, "VERIFIED", inspectionNotes || "Field inspection passed — RTK DGPS boundary confirmed within tolerance.", currentUser.name);
      if (detailDispute) updateDisputeStatus(detailDispute.id, "RESOLVED", "Resolved after successful field verification.");
      toast({ variant: "success", title: "Verification approved", description: `${activeRequest.requestNumber} marked VERIFIED. Digital Bhu-Aadhaar seal issued.` });
    } else if (confirm.type === "reject") {
      updatePropertyVerificationStatus(propertyId, "REJECTED", inspectionNotes || "Ground coordinates do not match cadastral record.", currentUser.name);
      if (detailDispute) updateDisputeStatus(detailDispute.id, "REJECTED", "Rejected after field inspection.");
      toast({ variant: "destructive", title: "Verification rejected", description: `${activeRequest.requestNumber} marked REJECTED with corrective notes.` });
    } else if (confirm.type === "correction") {
      updatePropertyVerificationStatus(propertyId, "UNDER_REVIEW", inspectionNotes || "Correction requested — re-survey scheduled with updated evidence.", currentUser.name);
      toast({ variant: "warning", title: "Correction requested", description: `${activeRequest.requestNumber} sent back to UNDER_REVIEW for corrective action.` });
    } else {
      updatePropertyVerificationStatus(propertyId, "VERIFICATION_IN_PROGRESS", inspectionNotes || "Inspection team dispatched; status advanced.", currentUser.name);
      toast({ variant: "success", title: "Status updated", description: "Verification stage advanced to IN PROGRESS." });
    }
    setConfirm(null);
    setInspectionNotes("");
  };

  const saveNotes = () => {
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
    toast({ variant: "success", title: "Inspection notes saved", description: "Notes synced to the case file and audit log." });
  };

  const columns: ColumnDef<FieldVerificationRequest>[] = [
    { key: "req", header: "Request", render: (r) => (<div className="min-w-0"><p className="font-mono text-xs font-black text-cyan-700">{r.requestNumber}</p><p className="max-w-[200px] truncate text-[10px] text-slate-500">{r.propertyTitle}</p></div>) },
    { key: "type", header: "Survey Type", hiddenOnMobile: true, render: (r) => (<Badge variant="blue">{humanize(r.surveyType)}</Badge>) },
    { key: "urgency", header: "Urgency", render: (r) => (r.urgency === "HIGH_PRIORITY" ? <Badge variant="destructive">High Priority</Badge> : r.urgency === "URGENT" ? <Badge variant="warning">Urgent</Badge> : <Badge>Normal</Badge>) },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} size="sm" /> },
    { key: "date", header: "Preferred", hiddenOnMobile: true, render: (r) => (<span className="font-mono text-[11px] text-slate-500">{new Date(r.preferredDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>) },
    { key: "actions", header: "Action", render: (r) => (<Button size="sm" variant={selectedRequestId === r.id ? "default" : "outline"} onClick={() => setSelectedRequestId(r.id)}>{selectedRequestId === r.id ? "Viewing" : "Open"}</Button>) },
  ];
return (
    <PageContainer>
      <div className="space-y-7">
        <PageHeader
          eyebrow="REVENUE OFFICER PORTAL"
          title={`Field Operations, ${currentUser.name.split(",")[0]}`}
          description={`${currentUser.designation ?? "Cadastral Revenue Officer"} • ${currentUser.badgeNumber ?? ""} • ${currentUser.jurisdictionDistrict ?? ""}`}
          actions={
            <div className="flex items-center gap-2">
              <Link href="/disputes">
                <Button variant="secondary">
                  <AlertTriangle className="h-3.5 w-3.5" /> Dispute Cases ({stats.openDisputes})
                </Button>
              </Link>
              <Link href="/properties">
                <Button variant="outline">
                  <Search className="h-3.5 w-3.5" /> Registry Search
                </Button>
              </Link>
            </div>
          }
        />

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard label="Assigned Requests" value={String(fieldRequests.length)} sub="Inspections in your jurisdiction" icon={<FileCheck2 className="h-5 w-5" />} tone="navy" />
          <DashboardCard label="Pending Inspections" value={String(stats.pending + stats.scheduled)} sub={`${stats.scheduled} scheduled • ${stats.pending} unassigned`} icon={<Clock className="h-5 w-5" />} tone="cyan" />
          <DashboardCard label="Completed Verifications" value={String(stats.completed)} sub="Reports submitted digitally" icon={<CheckCircle2 className="h-5 w-5" />} tone="green" trend={{ direction: "up", value: "90%" }} />
          <DashboardCard label="High Priority Cases" value={String(stats.highPriority)} sub="Require action within 48 hrs" icon={<AlertTriangle className="h-5 w-5" />} tone="red" />
        </div>

        {/* Work queue */}
        <DataTable
          columns={columns}
          data={fieldRequests}
          rowKey={(r) => r.id}
          searchableKeys={["requestNumber", "propertyTitle", "ulpin", "surveyType"]}
          searchPlaceholder="Search requests, ULPIN or titles..."
          defaultPageSize={6}
          className="rounded-2xl"
        />

        {/* CASE DETAIL PANEL */}
        {activeRequest && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-7">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{activeRequest.propertyTitle}</h3>
                    <p className="font-mono text-[10px] text-slate-400">
                      {activeRequest.requestNumber} • ULPIN {activeRequest.ulpin}
                    </p>
                  </div>
                  <StatusBadge status={activeRequest.status} size="md" />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Layers className="h-3 w-3 text-cyan-500" /> Survey</span>
                    <p className="mt-1 text-xs font-bold text-slate-800">{humanize(activeRequest.surveyType)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400"><CalendarDays className="h-3 w-3 text-blue-500" /> Preferred</span>
                    <p className="mt-1 font-mono text-xs font-bold text-slate-800">{new Date(activeRequest.preferredDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">👤 Requester</span>
                    <p className="mt-1 truncate text-xs font-bold text-slate-800">{activeRequest.requestedByUserName}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400"><MapPin className="h-3 w-3 text-amber-500" /> District</span>
                    <p className="mt-1 text-xs font-bold text-slate-800">{detailProperty?.district ?? "—"}</p>
                  </div>
                </div>

                {detailProperty && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
                    <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                      <img src={detailProperty.featuredImageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-bold text-slate-800">{detailProperty.address}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Survey {detailProperty.landDetails.surveyNumber} • {detailProperty.landDetails.landAreaAcres} acres • Owner: {detailProperty.primaryOwnerName}
                      </p>
                      <Link href={`/properties/${detailProperty.id}`} className="mt-1 inline-flex items-center gap-1 text-[11px] font-black text-blue-700 hover:underline">
                        Open cadastral record <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <MapPin className="h-4 w-4 text-cyan-600" /> Property Location
                </h3>
                <MapPanel property={detailProperty} height={280} />
              </div>
            </div>
<div className="space-y-5 lg:col-span-5">
              {/* Dispute details */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <AlertTriangle className="h-4 w-4 text-red-500" /> Citizen Dispute Details
                </h3>
                {detailDispute ? (
                  <div className="space-y-2.5 text-xs">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                      <span className="font-mono text-[10px] font-black text-red-600">{detailDispute.disputeTicketNumber}</span>
                      <p className="mt-1 font-bold text-slate-800">{detailDispute.title}</p>
                      {detailDispute.officerInspectionNotes && (
                        <p className="mt-1.5 border-t border-slate-200 pt-2 text-[11px] text-slate-500">{detailDispute.officerInspectionNotes}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-500">Case Status</span>
                      <StatusBadge status={detailDispute.status} size="sm" />
                    </div>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center text-[11px] text-slate-400">
                    No linked dispute for this request.
                  </p>
                )}
              </div>

              {/* Evidence preview */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <Eye className="h-4 w-4 text-cyan-600" /> Evidence Preview
                </h3>
                {activeRequest.evidences.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center text-[11px] text-slate-400">
                    No evidence attached to this request.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activeRequest.evidences.map((ev) => (
                      <div key={ev.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-600">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-slate-800">{ev.fileName}</p>
                          <p className="font-mono text-[10px] text-slate-400">{ev.fileSize} • {ev.fileType}</p>
                        </div>
                        <span className="rounded-md bg-green-50 border border-green-200 px-1.5 py-0.5 text-[9px] font-black text-green-700">SHA-256</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inspection notes */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <ClipboardCheck className="h-4 w-4 text-cyan-600" /> Inspection Notes
                </h3>
                <textarea
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  rows={4}
                  placeholder="Record DGPS observations, boundary stone conditions, drone flight logs, discrepancies found..."
                  className="input-tech w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium outline-none"
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400">
                    {notesSaved ? "✓ Synced to audit log" : "Notes saved to case file on submit"}
                  </span>
                  <Button size="sm" variant="outline" onClick={saveNotes}>Save Notes</Button>
                </div>
              </div>
{/* Action buttons */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white shadow-tech-lg">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold">
                  <ShieldCheck className="h-4 w-4 text-cyan-400" /> Verification Decision
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <Button variant="success" onClick={() => setConfirm({ type: "approve", requestId: activeRequest.id, propertyId: activeRequest.propertyId })}>
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </Button>
                  <Button variant="destructive" onClick={() => setConfirm({ type: "reject", requestId: activeRequest.id, propertyId: activeRequest.propertyId })}>
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                  <Button variant="warning" onClick={() => setConfirm({ type: "correction", requestId: activeRequest.id, propertyId: activeRequest.propertyId })}>
                    <RefreshCcw className="h-4 w-4" /> Request Correction
                  </Button>
                  <Button variant="blue" onClick={() => setConfirm({ type: "status", requestId: activeRequest.id, propertyId: activeRequest.propertyId })}>
                    <ClipboardCheck className="h-4 w-4" /> Update Status
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action confirmation dialog */}
      <ConfirmationDialog
        open={confirm !== null}
        onOpenChange={(open) => { if (!open) setConfirm(null); }}
        title={
          confirm?.type === "approve"
            ? "Approve verification?"
            : confirm?.type === "reject"
            ? "Reject verification?"
            : confirm?.type === "correction"
            ? "Request correction?"
            : "Advance verification status?"
        }
        description={
          confirm?.type === "approve"
            ? "This will issue the digital Bhu-Aadhaar seal for the property and resolve any linked dispute."
            : confirm?.type === "reject"
            ? "The record will be marked REJECTED and the citizen notified with your inspection notes."
            : confirm?.type === "correction"
            ? "The property returns to UNDER_REVIEW so the citizen can supply corrected evidence."
            : "The verification lifecycle advances to VERIFICATION IN PROGRESS for the assigned request."
        }
        confirmLabel={
          confirm?.type === "approve" ? "Yes, Approve" : confirm?.type === "reject" ? "Yes, Reject" : confirm?.type === "correction" ? "Request Correction" : "Update Status"
        }
        tone={confirm?.type === "approve" ? "success" : confirm?.type === "reject" ? "destructive" : "default"}
        onConfirm={executeAction}
        loading={false}
      />
    </PageContainer>
  );
}