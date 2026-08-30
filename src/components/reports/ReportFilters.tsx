"use client";

import * as React from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Select } from "@/components/ui/select";
import { FilterField, FilterPanel } from "@/components/dashboard/FilterPanel";
import { SectionHeader } from "@/components/layout/PageHeader";
import {
  CONFLICT_SEVERITY_ORDER,
  VERIFICATION_STATUS_ORDER,
  type ReportFilters,
} from "@/lib/reportAnalytics";
import type { Building, LandParcel, PropertyTypeGis } from "@/types/gis";
import type { ConflictSeverity } from "@/types/conflict";
import type { PropertyVerificationStatus } from "@/types/gis";

export type ReportFilterPatch = Partial<ReportFilters>;

interface ReportFiltersProps {
  filters: ReportFilters;
  onChange: (patch: ReportFilterPatch) => void;
  onClear: () => void;
  parcels: LandParcel[];
  /** Buildings already scoped to the selected parcel by the caller. */
  buildings: Building[];
  propertyTypes: PropertyTypeGis[];
  active: boolean;
  className?: string;
}

const ALL = "ALL";

function orAll(value: string | null): string {
  return value ?? ALL;
}

/**
 * Interactive report filters (Phase 8 §4). Every control is functional —
 * changes flow up to the page and re-derive the whole analytics model.
 */
export function ReportFilters({ filters, onChange, onClear, parcels, buildings, propertyTypes, active, className }: ReportFiltersProps) {
  return (
    <section className={className} aria-label="Report filters">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-tech sm:p-5">
        <SectionHeader
          icon={<SlidersHorizontal className="h-4 w-4" />}
          title="Report Filters"
          description="Filters re-derive every analytics section below in real time. Deep-linkable via URL parameters."
          action={
            active ? (
              <button
                type="button"
                onClick={onClear}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-500 transition-colors hover:border-red-300 hover:text-red-600"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
              </button>
            ) : (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Full registry scope
              </span>
            )
          }
        />
        <FilterPanel className="mt-4 lg:grid-cols-5">
          <FilterField label="Land Parcel">
            <Select
              value={orAll(filters.parcelId)}
              onChange={(e) => onChange({ parcelId: e.target.value === ALL ? null : e.target.value, buildingId: null })}
              aria-label="Filter by land parcel"
            >
              <option value={ALL}>All parcels</option>
              {parcels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.parcelNumber} — {p.location}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Building">
            <Select
              value={orAll(filters.buildingId)}
              onChange={(e) => onChange({ buildingId: e.target.value === ALL ? null : e.target.value })}
              aria-label="Filter by building"
            >
              <option value={ALL}>All buildings</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.buildingCode})
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Verification Status">
            <Select
              value={orAll(filters.verificationStatus)}
              onChange={(e) => onChange({ verificationStatus: e.target.value === ALL ? null : (e.target.value as PropertyVerificationStatus) })}
              aria-label="Filter by verification status"
            >
              <option value={ALL}>All statuses</option>
              {VERIFICATION_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Property Type">
            <Select
              value={orAll(filters.propertyType)}
              onChange={(e) => onChange({ propertyType: e.target.value === ALL ? null : (e.target.value as PropertyTypeGis) })}
              aria-label="Filter by property type"
            >
              <option value={ALL}>All types</option>
              {propertyTypes.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Conflict Severity">
            <Select
              value={orAll(filters.conflictSeverity)}
              onChange={(e) => onChange({ conflictSeverity: e.target.value === ALL ? null : (e.target.value as ConflictSeverity) })}
              aria-label="Filter by conflict severity"
            >
              <option value={ALL}>All severities</option>
              {CONFLICT_SEVERITY_ORDER.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FilterField>
        </FilterPanel>
      </div>
    </section>
  );
}