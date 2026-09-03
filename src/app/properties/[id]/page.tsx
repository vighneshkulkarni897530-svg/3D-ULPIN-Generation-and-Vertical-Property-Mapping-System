"use client";

import { SafeImage } from '@/components/ui/SafeImage';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useProperty } from "@/context/PropertyContext";
import { useGIS } from "@/context/GISContext";
import { CadastralMap2D } from "@/components/property/CadastralMap2D";
import { Property3DViewer } from "@/components/property/Property3DViewer";
import { FloorUnitExplorer } from "@/components/property/FloorUnitExplorer";
import { PropertyLineage } from "@/components/property/PropertyLineage";
import { VerificationTimeline } from "@/components/property/VerificationTimeline";
import { DocumentViewerModal } from "@/components/property/DocumentViewerModal";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PropertyDocument } from "@/types";
import { formatCompactINR, formatSqFt, formatAcres, humanize } from "@/utils/format";
import { generatePropertyReportFromEntity, type PropertyReportData } from "@/lib/reports/reportService";
import { ReportModal } from "@/components/reports/ReportModal";
import {
  MapPin, ArrowLeft, ShieldCheck, AlertTriangle, Building2, Layers, Box, Home,
  FileText, History, Landmark, Banknote, Ruler, ScanLine, Users, Hash, CalendarDays,
  CheckCircle2, ArrowRight, Clock, Printer, Download,
} from "lucide-react";
import { useRenewals } from "@/context/RenewalContext";
import { RenewalBanner } from "@/components/renewals/RenewalBanner";
import { PeriodicVerificationSection } from "@/components/renewals/PeriodicVerificationSection";
import { CreateRenewalReportModal } from "@/components/renewals/CreateRenewalReportModal";

const TABS = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "renewal", label: "Periodic Verification", icon: Clock },
  { id: "map", label: "2D Map", icon: MapPin },
  { id: "3d", label: "3D View", icon: Box },
  { id: "floors", label: "Floors & Units", icon: Layers },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "history", label: "Verification History", icon: History },
];

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function PropertyDetailsPage() {
  return (
    <ProtectedRoute>
      <PropertyDetailsPageContent />
    </ProtectedRoute>
  );
}

function PropertyDetailsPageContent() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { properties } = useProperty();
  const { properties: gisUnits, conflicts, activities } = useGIS();
  const { getRecordByPropertyId } = useRenewals();
  const property = properties.find((p) => p.id === id || p.propertyId.toLowerCase() === id.toLowerCase());

  const [activeTab, setActiveTab] = useState("overview");
  const [activeDoc, setActiveDoc] = useState<PropertyDocument | null>(null);
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);

  const renewalRecord = property ? getRecordByPropertyId(property.id) : undefined;

  // Property report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<PropertyReportData | null>(null);

  const handleGeneratePropertyReport = () => {
    if (!property) return;
    const rep = generatePropertyReportFromEntity(property);
    setReportData(rep);
    setReportModalOpen(true);
  };

  useEffect(() => {
    const queryTab = new URLSearchParams(window.location.search).get("tab");
    if (queryTab) {
      const matched = TABS.find((t) => t.id === queryTab || (queryTab === "status" && t.id === "history") || (queryTab === "renewal" && t.id === "renewal"));
      if (matched) setActiveTab(matched.id);
    }
  }, []);

  if (!property) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200">
          <Building2 className="h-10 w-10 text-slate-400" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Cadastral Record Not Found</h1>
        <p className="max-w-sm text-xs text-slate-500">
          The property record you requested could not be located in the registry. Please verify the ULPIN
          or property ID and try again.
        </p>
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-tech-cyan"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Registry
        </Link>
      </div>
    );
  }

  const building = property.building;

  // Phase 4 §13 — map this legacy record to its GIS vertical unit (if any) so
  // the verification workspace opens with the correct unit pre-selected.
  const mappedGisUnit = gisUnits.find((u) => u.propertyId === property.id);

  // Phase 7 §13 — centralized activity history for this property / unit / building / parcel
  const relatedEntityIds = [property.id, mappedGisUnit?.id, mappedGisUnit?.buildingId, mappedGisUnit?.parcelId].filter(
    Boolean,
  ) as string[];
  const relatedActivities = activities
    .filter((a) => relatedEntityIds.includes(a.entityId))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 6);

  return (
    <div className="flex-1 animate-fade-in">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 tech-grid-dark opacity-40 pointer-events-none" />
        <div className="absolute -top-20 right-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-[90px]" />
        <div className="absolute bottom-0 left-1/4 h-52 w-52 rounded-full bg-blue-600/10 blur-[80px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href="/properties" className="mb-5 inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-cyan-300 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Cadastral Registry
          </Link>
<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1 font-mono text-[10px] font-bold text-cyan-300">
                  ULPIN {property.ulpin}
                </span>
                <span className="rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1 font-mono text-[10px] font-bold text-slate-300">
                  {property.propertyId}
                </span>
                <span className="rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1 font-mono text-[10px] font-bold text-blue-300">
                  Survey {property.landDetails.surveyNumber}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{property.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                  {property.address}, {property.city}, {property.state} — {property.pincode}
                </span>
                <span className="flex items-center gap-1.5">
                  <ScanLine className="h-3.5 w-3.5 text-blue-400" />
                  {property.coordinates.lat.toFixed(4)}°N, {property.coordinates.lng.toFixed(4)}°E — WGS 84
                </span>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <StatusBadge status={property.verificationStatus} size="lg" />
              <div className="flex flex-wrap gap-2">
                <Link
                  href={mappedGisUnit ? `/verification?property=${mappedGisUnit.id}` : "/verification"}
                  title={
                    mappedGisUnit
                      ? "Open the verification workspace for this property"
                      : "Open the verification queue — this record is not yet mapped to the GIS vertical registry"
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-tech-cyan transition-all hover:from-cyan-400 hover:to-blue-500"
                >
                  <ShieldCheck className="h-4 w-4" /> Verify Status
                </Link>
                <button
                  type="button"
                  onClick={handleGeneratePropertyReport}
                  title="Generate and print official property cadastral report"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
                >
                  <FileText className="h-4 w-4 text-cyan-400" /> Cadastral Report
                </button>
                <Link
                  href={`/disputes/new?property=${property.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:border-red-500/50 hover:text-red-300"
                >
                  <AlertTriangle className="h-4 w-4" /> Report Error
                </Link>
                {mappedGisUnit && (
                  <>
                    <Link
                      href={`/map?property=${mappedGisUnit.id}`}
                      title="Select this unit on the 2D GIS map"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
                    >
                      <MapPin className="h-4 w-4" /> 2D Map
                    </Link>
                    <Link
                      href={`/map?property=${mappedGisUnit.id}&mode=3d`}
                      title="Open this unit in the 3D GIS viewer"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
                    >
                      <Box className="h-4 w-4" /> 3D Map
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick facts strip */}
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Property Type", value: humanize(property.propertyType), icon: Building2 },
              { label: "Land Area", value: formatAcres(property.landDetails.landAreaAcres), icon: Ruler },
              { label: "Area (sq ft)", value: formatSqFt(property.landDetails.landAreaSqFt), icon: Layers },
              { label: "Govt Valuation", value: formatCompactINR(property.governmentValuationINR), icon: Banknote },
              { label: "Market Value", value: formatCompactINR(property.marketValuationINR), icon: Landmark },
              { label: "Tax Status", value: property.landDetails.taxPaymentStatus, icon: FileText },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <f.icon className="h-3 w-3 text-cyan-400" /> {f.label}
                </span>
                <p className="mt-1 text-sm font-extrabold text-white tabular-nums">{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Phase 5 §13 — related demo spatial conflicts for the mapped GIS unit */}
      {(() => {
        const openConflicts = mappedGisUnit
          ? conflicts.filter((c) => c.affectedPropertyIds.includes(mappedGisUnit.id) && c.status !== "Resolved")
          : [];
        if (openConflicts.length === 0) return null;
        return (
          <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 shadow-tech">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-red-900">Spatial Conflict Detected</p>
                <p className="text-[11px] leading-relaxed text-red-700/90">
                  {openConflicts.length} open demo spatial conflict{openConflicts.length === 1 ? "" : "s"} affect the
                  linked vertical property unit ({mappedGisUnit?.id}). Prototype validation — not an official cadastral
                  determination.
                </p>
              </div>
              <Link
                href={`/conflicts?conflict=${openConflicts[0].id}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-[10.5px] font-bold text-white transition-colors hover:bg-red-700"
              >
                Review Conflict <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        );
      })()}

      {/* Renewal / Periodic Verification Banner */}
      {renewalRecord && (
        <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
          <RenewalBanner
            record={renewalRecord}
            onCreateReport={() => setRenewalModalOpen(true)}
          />
        </div>
      )}

      {/* Tab bar */}
      <div className="sticky top-20 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-3">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold tracking-tight transition-all ${
                    active
                      ? "bg-slate-900 text-cyan-300 shadow-tech"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-cyan-400" : "text-slate-400"}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
{/* ============ TAB CONTENT ============ */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 animate-fade-in">
            <div className="lg:col-span-8 space-y-6">
              {/* Periodic Verification Section */}
              {renewalRecord && (
                <PeriodicVerificationSection record={renewalRecord} />
              )}

              {/* Image gallery */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-tech">
                <div className="relative h-64 sm:h-80 bg-slate-900">
                  <SafeImage src={property.featuredImageUrl} alt={property.title} className="h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-slate-950/90 to-transparent p-4">
                    <span className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-slate-950/70 px-2.5 py-1 text-[10px] font-bold text-cyan-300 backdrop-blur">
                      <Landmark className="h-3 w-3" /> {building ? "3D Digital Twin Available" : "2D Cadastre Parcel"}
                    </span>
                    {building ? (
                      <Link
                        href={`/properties/${property.id}/digital-twin`}
                        className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1.5 text-[11px] font-extrabold text-slate-950 shadow-tech-cyan transition-transform hover:scale-105"
                      >
                        Launch Digital Twin
                      </Link>
                    ) : (
                      <button
                        onClick={() => setActiveTab("3d")}
                        className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1.5 text-[11px] font-extrabold text-slate-950 shadow-tech-cyan"
                      >
                        View Parcel Map
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Land & property records */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <Hash className="h-4 w-4 text-cyan-600" /> Land & Property Records
                  </h3>
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-500">
                    Bhoomi Ledger Sync
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { label: "Property ID", value: property.propertyId },
                    { label: "ULPIN (Bhu-Aadhaar)", value: property.ulpin },
                    { label: "Survey Number", value: `${property.landDetails.surveyNumber}/${property.landDetails.subDivisionNumber}` },
                    { label: "Village", value: property.landDetails.villageName },
                    { label: "Taluk / Hobli", value: property.landDetails.hobliOrTehsil },
                    { label: "District", value: property.landDetails.district },
                    { label: "Address", value: property.address, wide: true },
                    { label: "Cadastral Zone", value: property.landDetails.cadastralZone.replace(/_/g, " ") },
                    { label: "Soil Classification", value: property.landDetails.soilClassification },
                    { label: "Water Source", value: property.landDetails.waterSource ?? "—", wide: true },
                    { label: "Guideline Valuation", value: `\u20B9${property.landDetails.guidelineValuationPerSqFt.toLocaleString("en-IN")}/sq ft` },
                    { label: "Annual Property Tax", value: `\u20B9${property.landDetails.annualPropertyTax.toLocaleString("en-IN")}` },
                  ].map((row) => (
                    <div key={row.label} className="rounded-xl bg-slate-50 border border-slate-100 p-3 sm:col-span-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{row.label}</span>
                      <p className="mt-1 text-xs font-bold text-slate-800">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adjacent parcels */}
              {property.adjacentParcels && property.adjacentParcels.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <MapPin className="h-4 w-4 text-cyan-600" /> Adjacent Cadastral Parcels
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {property.adjacentParcels.map((p) => (
                      <div key={p.ulpin} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-extrabold text-cyan-300">
                          {p.direction}
                        </span>
                        <p className="mt-2 line-clamp-1 text-xs font-bold text-slate-800">{p.owner}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-slate-400">Survey {p.surveyNo} • {p.ulpin}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
{/* Right rail */}
            <div className="lg:col-span-4 space-y-6">
              {/* Phase 7 §5 — clickable vertical lineage (Parcel → Building → Floor → Unit) */}
              {mappedGisUnit && <PropertyLineage unit={mappedGisUnit} />}

              {/* Phase 7 §13 — centralized activity history (single activity store) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <History className="h-4 w-4 text-cyan-600" /> Recent Activity
                </h3>
                {relatedActivities.length === 0 ? (
                  <p className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-[11px] text-slate-500">
                    No centralized activity has been recorded for this property yet. Verification, conflict and GIS
                    actions will appear here automatically.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {relatedActivities.map((a) => (
                      <div key={a.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-extrabold text-slate-900">{a.title}</p>
                          <span className="shrink-0 font-mono text-[9px] text-slate-400">
                            {new Date(a.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500">{a.description}</p>
                        <p className="mt-1 font-mono text-[9px] text-cyan-700">{a.user} · {a.userRole}</p>
                      </div>
                    ))}
                    <Link
                      href="/dashboard"
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-cyan-400 hover:text-cyan-700"
                    >
                      Full Activity Feed <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Owner information */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <Users className="h-4 w-4 text-cyan-600" /> Owner Information
                </h3>
                <div className="space-y-2.5">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Primary Owner</span>
                    <p className="mt-1 text-sm font-extrabold text-slate-900">{property.primaryOwnerName}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                      Aadhaar: {property.ownerAadhaarMasked} • {property.ownerContactMasked}
                    </p>
                  </div>
                  {property.coOwners?.map((c) => (
                    <div key={c} className="rounded-xl bg-blue-50/60 border border-blue-100 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Co-Owner</span>
                      <p className="mt-1 text-xs font-bold text-slate-800">{c}</p>
                    </div>
                  ))}
                  <button
                    onClick={() => setActiveTab("documents")}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:border-cyan-400 hover:text-cyan-700"
                  >
                    <FileText className="h-3.5 w-3.5" /> View Khata Documents
                  </button>
                </div>
              </div>

              {/* Government record */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white shadow-tech-lg">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold">
                  <Landmark className="h-4 w-4 text-cyan-400" /> Government Record
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Primary Authority</span>
                    <span className="font-bold text-slate-100">Dept. of Land Records</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Jurisdiction</span>
                    <span className="font-bold text-slate-100">{property.district}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Mutated</span>
                    <span className="font-bold text-slate-100">
                      {new Date(property.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                    <span className="text-slate-400">Digital Seal</span>
                    <span className="flex items-center gap-1.5 font-extrabold text-emerald-400">
                      <ShieldCheck className="h-3.5 w-3.5" /> SHA-256 Certified
                    </span>
                  </div>
                </div>
              </div>
{/* Assigned officer */}
              {property.assignedOfficer && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <ShieldCheck className="h-4 w-4 text-cyan-600" /> Assigned Officer
                  </h3>
                  <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-extrabold text-slate-950">
                      {property.assignedOfficer.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-900">{property.assignedOfficer.name}</p>
                      <p className="line-clamp-1 text-[10px] text-slate-500">{property.assignedOfficer.designation}</p>
                      <p className="mt-1 font-mono text-[10px] text-cyan-700">ID: {property.assignedOfficer.id}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Building summary */}
              {building && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-tech">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <Building2 className="h-4 w-4 text-cyan-600" /> Building Structure
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Structure Type</span><span className="font-bold text-slate-800">{building.structureType.replace(/_/g, " ")}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Floors</span><span className="font-bold text-slate-800">G+{Math.max(0, building.floorsCount - 1)} (Basement: {building.basementsCount})</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Height</span><span className="font-bold text-slate-800">{building.heightMeters}m</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">FSI Consumed</span><span className="font-bold text-slate-800">{building.fsiConsumed} / {building.fsiApproved}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Year Built</span><span className="font-bold text-slate-800">{building.yearOfConstruction}</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
{/* 2D MAP */}
        {activeTab === "map" && (
          <div className="animate-fade-in">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Interactive Cadastral Map</h2>
                <p className="text-xs text-slate-500">
                  High-precision DGPS boundary polygon, adjacent parcels, survey stones & roads.
                </p>
              </div>
              <Link
                href={`/disputes/new?property=${property.id}`}
                className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 hover:border-red-400 hover:text-red-600 transition-colors"
              >
                Report Boundary Error
              </Link>
            </div>
            <CadastralMap2D property={property} />
          </div>
        )}

        {/* PERIODIC VERIFICATION TAB */}
        {activeTab === "renewal" && renewalRecord && (
          <div className="animate-fade-in space-y-6">
            <PeriodicVerificationSection record={renewalRecord} />
          </div>
        )}

        {/* 3D VIEW */}
        {activeTab === "3d" && (
          <div className="animate-fade-in">
            <div className="mb-4">
              <h2 className="text-lg font-extrabold text-slate-900">3D Property & Building Digital Twin</h2>
              <p className="text-xs text-slate-500">
                Explore the structure floor by floor. Select a floor to highlight it and inspect its units.
              </p>
            </div>
            {building ? (
              <Property3DViewer
                property={property}
                onSelectUnit={(unit) => setActiveTab("floors")}
              />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center shadow-tech">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200">
                  <Layers className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">No 3D Building Record</h3>
                <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                  This parcel has no registered building structure. Only the 2D cadastral boundary is available —
                  switch to the 2D Map tab to inspect the survey polygon.
                </p>
                <button
                  onClick={() => setActiveTab("map")}
                  className="mt-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-tech-cyan"
                >
                  Open 2D Map
                </button>
              </div>
            )}
          </div>
        )}

        {/* FLOORS & UNITS */}
        {activeTab === "floors" && (
          <div className="animate-fade-in">
            <div className="mb-4">
              <h2 className="text-lg font-extrabold text-slate-900">Floors & Property Units</h2>
              <p className="text-xs text-slate-500">
                Interactive unit-level cadastre — carpet areas, ownership, occupancy & compliance.
              </p>
            </div>
            {building ? (
              <FloorUnitExplorer property={property} />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center shadow-tech">
                <Home className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-3 text-sm font-extrabold text-slate-900">No Unit Registry for Parcel</h3>
                <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                  Petitions, agricultural or vacant parcels do not carry building unit registrations on this platform.
                </p>
              </div>
            )}
          </div>
        )}
{/* DOCUMENTS */}
        {activeTab === "documents" && (
          <div className="animate-fade-in">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Cadastral Document Vault</h2>
                <p className="text-xs text-slate-500">
                  Cryptographically sealed records, mutations, sanctions & title deeds.
                </p>
              </div>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-[11px] font-bold text-cyan-300 shadow-tech transition-colors hover:bg-slate-800"
              >
                <FileText className="h-3.5 w-3.5" /> Request Full Extract
              </a>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {property.documents.map((doc) => {
                const verified = doc.isVerified;
                return (
                  <button
                    key={doc.id}
                    onClick={() => setActiveDoc(doc)}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-tech transition-all hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-tech-cyan"
                  >
                    <div className="flex items-start justify-between">
                      <div className={`p-2.5 rounded-xl border ${verified ? "bg-green-50 border-green-200 text-green-600" : "bg-amber-50 border-amber-200 text-amber-600"}`}>
                        <FileText className="h-5 w-5" />
                      </div>
                      {verified ? (
                        <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-extrabold text-green-700 border border-green-200">
                          <CheckCircle2 className="h-3 w-3" /> VERIFIED
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold text-amber-700 border border-amber-200">
                          PENDING
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-sm font-extrabold text-slate-900 line-clamp-1 group-hover:text-cyan-700">
                      {doc.title}
                    </h3>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{doc.documentType.replace(/_/g, " ")}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400 font-mono">
                      <span>{doc.fileSize}</span>
                      <span>{doc.uploadDate}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* VERIFICATION HISTORY */}
        {activeTab === "history" && (
          <div className="animate-fade-in">
            <div className="mb-4">
              <h2 className="text-lg font-extrabold text-slate-900">Verification Status & Audit Trail</h2>
              <p className="text-xs text-slate-500">
                Timeline of every cadastral check, officer action and status transition for this property.
              </p>
            </div>
            <VerificationTimeline property={property} />
          </div>
        )}
      </div>

      {/* Document viewer modal */}
      <DocumentViewerModal document={activeDoc} onClose={() => setActiveDoc(null)} />

      {/* Renewal Report Modal */}
      {renewalRecord && (
        <CreateRenewalReportModal
          isOpen={renewalModalOpen}
          onClose={() => setRenewalModalOpen(false)}
          initialRecord={renewalRecord}
        />
      )}

      {/* Official Property Cadastral Verification Report Modal */}
      <ReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        reportType="PROPERTY"
        data={reportData}
      />
    </div>
  );
}