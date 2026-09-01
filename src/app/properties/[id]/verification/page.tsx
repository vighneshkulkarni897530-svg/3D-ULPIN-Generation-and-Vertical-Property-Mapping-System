"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useProperty } from "@/context/PropertyContext";
import { useGIS } from "@/context/GISContext";
import { VerificationTimeline } from "@/components/property/VerificationTimeline";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ShieldCheck, AlertTriangle, FileCheck2, MapPin, CalendarDays, UserCheck, BadgeCheck, ClipboardCheck,
} from "lucide-react";
import { formatCompactINR, humanize } from "@/utils/format";

export default function PropertyVerificationPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { properties } = useProperty();
  const { properties: gisUnits } = useGIS();
  const property = properties.find((p) => p.id === id || p.propertyId.toLowerCase() === id.toLowerCase());

  if (!property) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 className="text-xl font-extrabold text-slate-900">Record Not Found</h1>
        <Link href="/properties" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-cyan-300">
          <ArrowLeft className="h-4 w-4" /> Back to Registry
        </Link>
      </div>
    );
  }

  const current = property.verificationStatus;
  const officer = property.assignedOfficer;

  // Phase 4 bridge — offer the new GIS verification workspace when this legacy
  // record is mapped to a vertical property unit (e.g. prop-pun-003 → PROP-306-*).
  const mappedGisUnit = gisUnits.find((u) => u.propertyId === property.id);
  const progressMap: Record<string, number> = {
    SUBMITTED: 1,
    UNDER_REVIEW: 2,
    FIELD_VERIFICATION_REQUESTED: 3,
    OFFICER_ASSIGNED: 4,
    VERIFICATION_IN_PROGRESS: 5,
    VERIFIED: 6,
    DISPUTED: 3,
    REJECTED: 2,
  };
  const progress = progressMap[current] ?? 1;

  return (
    <div className="flex-1 bg-slate-50 animate-fade-in">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <Link href={`/properties/${property.id}`} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-cyan-700 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to {property.title}
        </Link>

        <PageHeader
          eyebrow="CADASTRE VERIFICATION LIFECYCLE"
          title="Property Verification Status"
          description={`Track the real-time verification journey of ULPIN ${property.ulpin}.`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={current} size="lg" />
              {mappedGisUnit && (
                <Link
                  href={`/verification?property=${mappedGisUnit.id}`}
                  title="Open the GIS verification workspace for the mapped vertical unit"
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-700 transition-colors hover:bg-cyan-500/20"
                >
                  <ClipboardCheck className="h-4 w-4" /> GIS Verification Workspace
                </Link>
              )}
            </div>
          }
        />

        {/* Status overview card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">{property.title}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {property.address} • {humanize(property.propertyType)} • {formatCompactINR(property.marketValuationINR)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600">
                <CalendarDays className="h-3.5 w-3.5 text-cyan-600" /> Stage {progress} of 6
              </span>
              {officer && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700">
                  <UserCheck className="h-3.5 w-3.5" /> {officer.name}
                </span>
              )}
            </div>
          </div>
{/* Progress bar */}
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>Application Ingested</span>
              <span>Digital Bhu-Aadhaar Seal</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  current === "VERIFIED"
                    ? "bg-gradient-to-r from-green-500 to-emerald-400"
                    : current === "REJECTED"
                    ? "bg-gradient-to-r from-red-500 to-red-400"
                    : current === "DISPUTED"
                    ? "bg-gradient-to-r from-red-400 to-amber-400"
                    : "bg-gradient-to-r from-cyan-500 to-blue-600"
                }`}
                style={{ width: `${(progress / 6) * 100}%` }}
              />
            </div>
          </div>

          {/* Quick action chips */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {current === "VERIFIED" && (
              <>
                <Button size="sm">
                  <BadgeCheck className="h-3.5 w-3.5" /> Download Certificate
                </Button>
                <Link href="/dashboard/citizen">
                  <Button size="sm" variant="outline">
                    <ShieldCheck className="h-3.5 w-3.5" /> Open Citizen Dashboard
                  </Button>
                </Link>
              </>
            )}
            {current !== "VERIFIED" && current !== "DISPUTED" && (
              <Link href={`/disputes/new?property=${property.id}`}>
                <Button size="sm" variant="warning">
                  <AlertTriangle className="h-3.5 w-3.5" /> Report Error / Raise Dispute
                </Button>
              </Link>
            )}
            <Link href={`/field-verification/request?property=${property.id}`}>
              <Button size="sm" variant="blue">
                <FileCheck2 className="h-3.5 w-3.5" /> Request Field Verification
              </Button>
            </Link>
            <Link href={`/properties/${property.id}?tab=map`}>
              <Button size="sm" variant="outline">
                <MapPin className="h-3.5 w-3.5" /> View Cadastral Map
              </Button>
            </Link>
          </div>
        </div>

        {/* Full lifecycle timeline */}
        <VerificationTimeline property={property} />
      </div>
    </div>
  );
}