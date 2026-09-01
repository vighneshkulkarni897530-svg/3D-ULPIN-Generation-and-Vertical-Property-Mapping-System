"use client";

import * as React from "react";
import { History, MapPin, Link2, FileText } from "lucide-react";
import { useGIS } from "@/context/GISContext";
import { GisStatusBadge } from "@/components/common/GisStatusBadge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeTime } from "@/lib/gisUtils";

/**
 * Verification history timeline for one property, rendered straight from the
 * centralized VerificationRecord list — no duplicated history data.
 */
export function VerificationTimeline({ propertyId }: { propertyId: string }) {
  const { verifications } = useGIS();

  const records = React.useMemo(
    () =>
      verifications
        .filter((v) => v.propertyId === propertyId)
        .sort((a, b) => b.verificationDate.localeCompare(a.verificationDate)),
    [verifications, propertyId],
  );

  if (records.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-6 w-6" />}
        title="No verification history yet"
        description="Once an officer verifies, rejects or requests reinspection for this property, every decision is recorded here with its full audit details."
        className="border-slate-200 bg-white"
      />
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tech">
      <h3 className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-slate-900">
        <History className="h-4 w-4 text-cyan-600" /> Verification History
        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-500">
          {records.length} {records.length === 1 ? "record" : "records"}
        </span>
      </h3>

      <ol className="mt-4 space-y-0">
        {records.map((v, i) => (
          <li key={v.id} className="relative flex gap-3 pb-5 last:pb-0">
            {/* Timeline rail */}
            {i < records.length - 1 && <span aria-hidden className="absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-px bg-slate-200" />}
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-white text-[9px] font-extrabold ${
                v.newStatus === "Verified"
                  ? "border-emerald-400 text-emerald-600"
                  : v.newStatus === "Rejected"
                    ? "border-red-400 text-red-600"
                    : "border-amber-400 text-amber-600"
              }`}
              aria-hidden
            >
              {records.length - i}
            </span>

            <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <GisStatusBadge status={v.previousStatus} kind="property" />
                  <span aria-hidden className="text-slate-400">→</span>
                  <GisStatusBadge status={v.newStatus} kind="property" />
                </div>
                <span className="font-mono text-[9.5px] text-slate-400">{formatRelativeTime(v.verificationDate)}</span>
              </div>

              <dl className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                <Row icon={<History className="h-3 w-3" />} label="Verified by" value={`${v.verifiedBy} · ${v.verifiedByRole}`} />
                <Row icon={<FileText className="h-3 w-3" />} label="Method" value={v.method.replace(/_/g, " ")} />
                <Row
                  icon={<MapPin className={`h-3 w-3 ${v.gpsMatched ? "text-emerald-500" : "text-red-500"}`} />}
                  label="GPS match"
                  value={v.gpsMatched ? "Matched ✓" : "Not matched ✗"}
                  tone={v.gpsMatched ? "ok" : "bad"}
                />
                <Row
                  icon={<Link2 className={`h-3 w-3 ${v.boundaryMatched ? "text-emerald-500" : "text-red-500"}`} />}
                  label="Boundary match"
                  value={v.boundaryMatched ? "Matched ✓" : "Not matched ✗"}
                  tone={v.boundaryMatched ? "ok" : "bad"}
                />
              </dl>

              <p className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10.5px] leading-relaxed text-slate-600">
                <span className="font-bold text-slate-500">Notes: </span>
                {v.notes || "—"}
              </p>
              <p className="mt-1.5 font-mono text-[9px] uppercase tracking-wider text-slate-400">
                Confidence {v.confidenceScore}% · Source {v.source}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Row({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "ok" | "bad";
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd
        className={`ml-auto font-mono text-[10px] font-bold ${
          tone === "ok" ? "text-emerald-700" : tone === "bad" ? "text-red-600" : "text-slate-700"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
