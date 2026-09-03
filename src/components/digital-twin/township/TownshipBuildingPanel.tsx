"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Database,
  MapPinned,
  X,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  Maximize2,
  Home,
  Navigation,
  ShieldCheck,
  Ruler,
  Compass,
  FileCheck,
  Flame,
  Building,
  CheckCircle2,
  Info,
} from "lucide-react";
import type { PropertyItem } from "@/types";
import type { Building as GisBuilding, Floor, LandParcel, PropertyUnit } from "@/types/gis";
import type { TowerDef } from "./townshipConfig";
import { dbField } from "./townshipData";
import { cn } from "@/lib/utils";

interface TownshipBuildingPanelProps {
  tower: TowerDef | null;
  /** Real GIS building linked to the tower (null ⇒ none). */
  linkedBuilding: GisBuilding | null;
  /** Real floor records for the linked building. */
  linkedFloors: Floor[];
  /** Real property units for the linked building. */
  linkedUnits?: PropertyUnit[];
  /** Real parcel/society record for the linked building. */
  parcel?: LandParcel | null;
  /** Property record for the current route (may be null). */
  property: PropertyItem | null;
  /** True while the data context is still hydrating. */
  loading?: boolean;
  /** Fire-and-forget audit hook (building viewed). */
  onViewed?: (buildingId: string) => void;
  onClose: () => void;
  /** Interactive Action Handlers */
  onViewBuilding?: () => void;
  onToggleIsolate?: () => void;
  isIsolated?: boolean;
  onViewFloors?: () => void;
  onToggleExplode?: () => void;
  isExploded?: boolean;
  onOpenProperty?: () => void;
  className?: string;
}

function DetailRow({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5 pt-0.5 last:border-0">
      <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd
        className={cn(
          "max-w-[65%] truncate text-right text-[10px] font-black",
          highlight ? "text-cyan-300 font-extrabold" : "text-slate-100",
          mono && "font-mono",
          value === "Not available" && "font-semibold normal-case tracking-normal text-slate-500"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function TownshipBuildingPanel({
  tower,
  linkedBuilding,
  linkedFloors,
  linkedUnits = [],
  parcel,
  property,
  loading = false,
  onViewed,
  onClose,
  onViewBuilding,
  onToggleIsolate,
  isIsolated = false,
  onViewFloors,
  onToggleExplode,
  isExploded = false,
  onOpenProperty,
  className,
}: TownshipBuildingPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "location" | "engineering">("overview");

  React.useEffect(() => {
    if (linkedBuilding && onViewed) onViewed(linkedBuilding.id);
  }, [linkedBuilding?.id, onViewed]);

  const buildingName = linkedBuilding?.name ?? tower?.name ?? "Tower B";
  const societyId = parcel?.id ?? linkedBuilding?.parcelId ?? "PARCEL-MH-PUN-074";
  const buildingId = linkedBuilding?.id ?? tower?.id ?? "B-LR-B";
  const buildingCode = linkedBuilding?.buildingCode ?? `BLDG-LR-${tower?.id?.replace("tower-", "").toUpperCase() ?? "B"}`;
  const isRealData = linkedBuilding !== null;
  const isVerified =
    linkedBuilding?.status === "ACTIVE" ||
    (linkedBuilding?.status as string) === "APPROVED" ||
    (linkedBuilding?.status as string) === "VERIFIED" ||
    (property?.verificationStatus as string) === "Verified" ||
    (property?.verificationStatus as string) === "VERIFIED";

  const totalFloors = linkedFloors.length > 0 ? linkedFloors.length : (tower?.floors ?? 20);
  const totalUnits = linkedUnits.length > 0 ? linkedUnits.length : (totalFloors * 4);
  const heightM = (totalFloors * 3.1).toFixed(1);
  const footprintArea = tower ? Math.round(tower.footprint[0] * tower.footprint[1] * 2.8) : 1280;
  const builtUpArea = (footprintArea * totalFloors * 0.92).toLocaleString("en-IN");

  const gisMapHref = `/map?society=${societyId}&building=${buildingId}`;
  const defaultPropertyHref = `/properties/${property?.id ?? "PROP-LR-B-0402"}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 25 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 25 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "dt-hud dt-card-accent w-[320px] sm:w-[340px] rounded-2xl p-3.5 shadow-[0_24px_70px_-15px_rgba(0,0,0,0.95)] border border-cyan-500/40 bg-slate-950/95 backdrop-blur-2xl",
        className
      )}
    >
      {/* ── Header ── */}
      <div className="mb-2.5 flex items-start justify-between gap-2 border-b border-cyan-500/30 pb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#00D9FF]">
              <Building2 className="h-4 w-4" /> {buildingName}
            </span>
            <span className="rounded bg-cyan-500/15 border border-cyan-400/40 px-1.5 py-0.5 font-mono text-[8px] font-bold text-cyan-300 uppercase">
              {buildingCode}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] font-bold text-slate-200">
            High-Rise Residential · {totalFloors} Floors · {heightM} m
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-0.5 font-mono text-[7.5px] font-black text-emerald-400 uppercase">
              <CheckCircle2 className="h-2.5 w-2.5" /> Gov Verified &amp; Active
            </span>
            <span className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 font-mono text-[7.5px] font-bold text-amber-300 uppercase">
              DEMO DATA
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          title="Close panel"
          className="rounded-lg border border-slate-700 bg-slate-900/80 p-1.5 text-slate-400 transition-colors hover:border-cyan-400 hover:text-cyan-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Action Buttons Grid (Prompt Specification) ── */}
      <div className="mb-3 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={onViewBuilding}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/50 bg-gradient-to-r from-cyan-500/20 to-blue-600/15 px-2.5 py-2 text-[9.5px] font-black uppercase tracking-wider text-cyan-300 transition-all hover:from-cyan-500/30 hover:to-blue-600/25 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,217,255,0.3)]"
        >
          <Eye className="h-3.5 w-3.5 text-cyan-400" /> View Building
        </button>

        <button
          type="button"
          onClick={onToggleIsolate}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-[9.5px] font-black uppercase tracking-wider transition-all",
            isIsolated
              ? "border-amber-500/50 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
              : "border-slate-700 bg-slate-900/80 text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
          )}
        >
          {isIsolated ? (
            <>
              <EyeOff className="h-3.5 w-3.5 text-amber-400" /> Show All
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" /> Isolate
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onViewFloors}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-2.5 py-2 text-[9.5px] font-black uppercase tracking-wider text-slate-200 transition-all hover:border-cyan-400 hover:text-cyan-300"
        >
          <Layers className="h-3.5 w-3.5 text-cyan-400" /> View Floors
        </button>

        <button
          type="button"
          onClick={onToggleExplode}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-[9.5px] font-black uppercase tracking-wider transition-all",
            isExploded
              ? "border-cyan-400 bg-cyan-500/25 text-cyan-200 shadow-[0_0_12px_rgba(0,217,255,0.4)]"
              : "border-slate-700 bg-slate-900/80 text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
          )}
        >
          <Maximize2 className="h-3.5 w-3.5 text-cyan-400" />
          {isExploded ? "Collapse" : "Explode"}
        </button>

        <button
          type="button"
          onClick={() => {
            if (onOpenProperty) onOpenProperty();
            else router.push(defaultPropertyHref);
          }}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-2.5 py-2 text-[9.5px] font-black uppercase tracking-wider text-slate-200 transition-all hover:border-cyan-400 hover:text-cyan-300"
        >
          <Home className="h-3.5 w-3.5 text-cyan-400" /> Open Property
        </button>

        <Link
          href={gisMapHref}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-2 text-[9.5px] font-black uppercase tracking-wider text-emerald-300 transition-all hover:bg-emerald-500/20 hover:border-emerald-400"
        >
          <Navigation className="h-3.5 w-3.5 text-emerald-400" /> Open 2D GIS
        </Link>
      </div>

      {/* ── Detail Tabs ── */}
      <div className="mb-2.5 flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={cn(
            "flex-1 rounded-lg py-1 text-[8.5px] font-black uppercase tracking-wider transition-all",
            activeTab === "overview"
              ? "bg-cyan-500/20 border border-cyan-400/40 text-cyan-300"
              : "text-slate-400 hover:text-white"
          )}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("location")}
          className={cn(
            "flex-1 rounded-lg py-1 text-[8.5px] font-black uppercase tracking-wider transition-all",
            activeTab === "location"
              ? "bg-cyan-500/20 border border-cyan-400/40 text-cyan-300"
              : "text-slate-400 hover:text-white"
          )}
        >
          Cadastre
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("engineering")}
          className={cn(
            "flex-1 rounded-lg py-1 text-[8.5px] font-black uppercase tracking-wider transition-all",
            activeTab === "engineering"
              ? "bg-cyan-500/20 border border-cyan-400/40 text-cyan-300"
              : "text-slate-400 hover:text-white"
          )}
        >
          Engineering
        </button>
      </div>

      {loading ? (
        <div className="space-y-2 py-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3.5 animate-pulse rounded bg-[#0A1B31]" />
          ))}
          <p className="pt-1 text-[9px] font-semibold uppercase tracking-wider text-[#64748B]">
            Loading full building dossier...
          </p>
        </div>
      ) : (
        <div className="max-h-[38vh] space-y-2 overflow-y-auto pr-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-2.5">
                <span className="mb-1.5 flex items-center gap-1 text-[8.5px] font-black uppercase tracking-[0.18em] text-[#00D9FF]">
                  <Building className="h-3 w-3" /> Building Identity
                </span>
                <dl className="space-y-1">
                  <DetailRow label="Building Name" value={buildingName} highlight />
                  <DetailRow label="Building Code" value={buildingCode} mono />
                  <DetailRow label="Building ID" value={buildingId} mono />
                  <DetailRow label="Total Floors" value={`${totalFloors} Floors (0 to ${totalFloors})`} />
                  <DetailRow label="Total Height" value={`${heightM} meters (3.1m/floor)`} />
                  <DetailRow label="Total Units" value={`${totalUnits} Residential Units`} />
                  <DetailRow label="Unit Types" value="2 BHK & 3 BHK" />
                  <DetailRow label="Featured Unit" value="Flat 402 (Floor 4)" mono highlight />
                  <DetailRow label="3D Spatial ID" value="3D-MH-PUN-LR-B-0402" mono highlight />
                </dl>
              </section>

              <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-2.5">
                <span className="mb-1.5 flex items-center gap-1 text-[8.5px] font-black uppercase tracking-[0.18em] text-emerald-400">
                  <ShieldCheck className="h-3 w-3" /> Legal &amp; Verification Status
                </span>
                <dl className="space-y-1">
                  <DetailRow label="Verification Status" value="Government Verified" highlight />
                  <DetailRow label="Cadastral State" value="DEMO / ILLUSTRATIVE DATA" />
                  <DetailRow label="Official ULPIN" value="NO (Demonstration System)" />
                  <DetailRow label="Occupancy Cert (OC)" value="Issued (OC-2024-MH-089)" mono />
                  <DetailRow label="Fire Safety NOC" value="Verified & Active" />
                </dl>
              </section>
            </motion.div>
          )}

          {/* TAB 2: CADASTRE & LOCATION */}
          {activeTab === "location" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-2.5">
                <span className="mb-1.5 flex items-center gap-1 text-[8.5px] font-black uppercase tracking-[0.18em] text-[#00D9FF]">
                  <MapPinned className="h-3 w-3" /> Cadastral Location
                </span>
                <dl className="space-y-1">
                  <DetailRow label="Society / Project" value="Kolte Patil Life Republic" highlight />
                  <DetailRow label="Survey / Parcel No." value="Survey No. 74" mono highlight />
                  <DetailRow label="Cadastral Parcel ID" value={societyId} mono />
                  <DetailRow label="Village / Locality" value="Marunji" />
                  <DetailRow label="Taluka / District" value="Mulshi, Pune" />
                  <DetailRow label="State & PIN" value="Maharashtra · 411057" mono />
                </dl>
              </section>

              <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-2.5">
                <span className="mb-1.5 flex items-center gap-1 text-[8.5px] font-black uppercase tracking-[0.18em] text-amber-400">
                  <Compass className="h-3 w-3" /> Coordinates &amp; Elevation
                </span>
                <dl className="space-y-1">
                  <DetailRow label="Latitude" value="18.6178° N" mono />
                  <DetailRow label="Longitude" value="73.7138° E" mono />
                  <DetailRow label="Elevation (MSL)" value="582.4 m above sea level" mono />
                  <DetailRow label="Base Plinth Level" value="0.00 m (Ground Zero)" mono />
                  <DetailRow label="GIS Projection" value="WGS 84 / UTM Zone 43N" mono />
                </dl>
              </section>
            </motion.div>
          )}

          {/* TAB 3: ENGINEERING & ARCHITECTURE */}
          {activeTab === "engineering" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-2.5">
                <span className="mb-1.5 flex items-center gap-1 text-[8.5px] font-black uppercase tracking-[0.18em] text-cyan-400">
                  <Ruler className="h-3 w-3" /> Architectural Dimensions
                </span>
                <dl className="space-y-1">
                  <DetailRow label="Plinth Footprint" value={`${footprintArea} sq.m`} mono />
                  <DetailRow label="Total Built-Up Area" value={`${builtUpArea} sq.m`} mono highlight />
                  <DetailRow label="Floor-to-Ceiling" value="3.10 meters" mono />
                  <DetailRow label="Structure Type" value="RCC Monolithic Zone III" />
                  <DetailRow label="Passenger Elevators" value="3 High-Speed Lifts" />
                  <DetailRow label="Year Built" value="2023 - 2024" mono />
                </dl>
              </section>

              <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-2.5">
                <span className="mb-1.5 flex items-center gap-1 text-[8.5px] font-black uppercase tracking-[0.18em] text-emerald-400">
                  <Flame className="h-3 w-3" /> Compliance &amp; Safety
                </span>
                <dl className="space-y-1">
                  <DetailRow label="Fire NOC Ref" value="NOC-MH-PUN-FIRE-2024" mono />
                  <DetailRow label="Fire Staircases" value="2 Enclosed Fire Exits" />
                  <DetailRow label="Occupancy Status" value="OC Certified & Handed Over" />
                  <DetailRow label="Water Supply" value="Dual Source (Municipal + STP)" />
                </dl>
              </section>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}