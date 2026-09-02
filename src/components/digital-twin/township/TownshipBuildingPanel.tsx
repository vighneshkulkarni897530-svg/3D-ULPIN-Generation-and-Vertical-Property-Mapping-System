"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, Database, MapPinned, X } from "lucide-react";
import type { PropertyItem } from "@/types";
import type { Building as GisBuilding, Floor, LandParcel, PropertyUnit } from "@/types/gis";
import type { TowerDef } from "./townshipConfig";
import { dbField } from "./townshipData";
import { cn } from "@/lib/utils";

/* ======================================================================
 * Phase 15C & 16 — Selected-tower building information panel.
 *
 * Displays values present in the loaded data layers (passed in as
 * props from the page). Every missing field renders "Not available".
 * ==================================================================== */

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
  className?: string;
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[#164E73]/40 pb-1 last:border-0">
      <dt className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">{label}</dt>
      <dd
        className={cn(
          "max-w-[60%] truncate text-right text-[10px] font-black text-[#F8FAFC]",
          mono && "font-mono",
          value === "Not available" && "font-semibold normal-case tracking-normal text-[#64748B]"
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
  className,
}: TownshipBuildingPanelProps) {
  React.useEffect(() => {
    if (linkedBuilding && onViewed) onViewed(linkedBuilding.id);
  }, [linkedBuilding?.id, onViewed]);

  const societyId = parcel?.id ?? linkedBuilding?.parcelId ?? null;
  const buildingId = linkedBuilding?.id ?? null;
  const isRealData = linkedBuilding !== null;
  const isVerified =
    linkedBuilding?.status === "ACTIVE" ||
    (linkedBuilding?.status as string) === "APPROVED" ||
    (linkedBuilding?.status as string) === "VERIFIED" ||
    (property?.verificationStatus as string) === "Verified" ||
    (property?.verificationStatus as string) === "VERIFIED";

  const gisMapHref = societyId
    ? `/map?society=${societyId}${buildingId ? `&building=${buildingId}` : ""}`
    : "/map";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn("dt-hud dt-card-accent w-[280px] rounded-2xl p-3 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)]", className)}
    >
      {/* header */}
      <div className="mb-2 flex items-start justify-between gap-2 border-b border-[#164E73]/70 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#00D9FF]">
              <Building2 className="h-3 w-3" /> Building Info
            </span>
            <span
              className={cn(
                "rounded px-1.5 py-0.2 font-mono text-[7.5px] font-black uppercase",
                isVerified
                  ? "border border-[#22C55E]/50 bg-[#22C55E]/10 text-[#22C55E]"
                  : isRealData
                  ? "border border-[#00D9FF]/40 bg-[#00D9FF]/10 text-[#00D9FF]"
                  : "border border-[#FACC15]/40 bg-[#FACC15]/10 text-[#FACC15]"
              )}
            >
              {isVerified ? "Gov Verified" : isRealData ? "Real DB Data" : "Illustrative"}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[13px] font-black text-[#F8FAFC]">
            {linkedBuilding ? linkedBuilding.name : tower?.name ?? "No selection"}
          </p>
          <p className="font-mono text-[8.5px] text-[#64748B]">
            {linkedBuilding?.id ?? tower?.id ?? "—"}
          </p>
        </div>
        <button
          onClick={onClose}
          title="Close panel"
          className="rounded-md border border-[#164E73] bg-[#061426] p-1 text-[#94A3B8] transition-colors hover:border-[#00D9FF]/50 hover:text-[#00D9FF]"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2 py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-[#0A1B31]" />
          ))}
          <p className="pt-1 text-[9px] font-semibold uppercase tracking-wider text-[#64748B]">
            Loading property data...
          </p>
        </div>
      ) : (
        <div className="max-h-[46vh] space-y-3 overflow-y-auto pr-1 lg:max-h-[52vh]">
          {/* ── Building (database) ── */}
          <section>
            <span className="mb-1 flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.18em] text-[#22C55E]">
              <Database className="h-2.5 w-2.5" /> Database Structure
            </span>
            <dl className="space-y-1">
              <Field label="Building ID" value={dbField(linkedBuilding?.id)} mono />
              <Field label="Building Code" value={dbField(linkedBuilding?.buildingCode)} mono />
              <Field label="Society / Parcel" value={dbField(parcel?.parcelNumber ?? societyId)} />
              <Field label="Cadastral ULPIN" value={dbField(parcel?.parcelNumber ?? property?.ulpin)} mono />
              <Field label="Floors" value={linkedFloors.length ? String(linkedFloors.length) : "Not available"} />
              <Field label="Units Registered" value={linkedUnits.length ? String(linkedUnits.length) : "Not available"} />
              <Field label="Verification Status" value={dbField(linkedBuilding?.status ?? "Pending")} />
              <Field label="Latitude" value={dbField(linkedBuilding?.latitude ?? property?.coordinates.lat)} mono />
              <Field label="Longitude" value={dbField(linkedBuilding?.longitude ?? property?.coordinates.lng)} mono />
              <Field label="GIS Source" value={linkedBuilding ? "Firestore Hierarchy" : "Not available"} />
            </dl>
          </section>

          {/* ── GIS Status ── */}
          <section>
            <span className="mb-1 flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.18em] text-[#FACC15]">
              <MapPinned className="h-2.5 w-2.5" /> GIS &amp; Spatial Alignment
            </span>
            <div className="space-y-1">
              <p className="rounded-lg border border-[#164E73]/70 bg-[#061426]/80 px-2 py-1.5 text-[9px] font-semibold text-[#94A3B8]">
                {isRealData ? "Live Cadastral Mapping" : "Illustrative 3D geometry"}
              </p>
              <p className="rounded-lg border border-[#00D9FF]/20 bg-[#00D9FF]/5 px-2 py-1 text-[8.5px] leading-relaxed text-[#64748B]">
                Approximate 3D centroid projection. Not a legal survey certificate.
              </p>
            </div>
          </section>

          {/* ── Actions ── */}
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <Link
              href={gisMapHref}
              className="col-span-2 flex items-center justify-center gap-1 rounded-lg border border-[#00D9FF]/40 bg-[#00D9FF]/10 px-2 py-1.5 text-center text-[9px] font-black uppercase tracking-wider text-[#00D9FF] transition-colors hover:bg-[#00D9FF]/20"
            >
              <MapPinned className="h-3 w-3" /> View on 2D GIS Map
            </Link>
            {societyId && (
              <Link
                href={`/government/societies/${societyId}/analytics`}
                className="rounded-lg border border-[#164E73] bg-[#061426] px-2 py-1.5 text-center text-[9px] font-black uppercase tracking-wider text-[#00D9FF] transition-colors hover:border-[#00D9FF]/60 hover:text-white"
              >
                Analytics
              </Link>
            )}
            {societyId && (
              <Link
                href={`/government/societies/${societyId}`}
                className="rounded-lg border border-[#164E73] bg-[#061426] px-2 py-1.5 text-center text-[9px] font-black uppercase tracking-wider text-[#94A3B8] transition-colors hover:border-[#00D9FF]/50 hover:text-[#00D9FF]"
              >
                Gov Verify
              </Link>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}