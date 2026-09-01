"use client";

import * as React from "react";
import { Search, X, Filter } from "lucide-react";
import type { SpatialConflict, ConflictStatus, ConflictSeverity, ConflictType } from "@/types/conflict";
import type { PropertyUnit } from "@/types/gis";
import { GisStatusBadge } from "@/components/common/GisStatusBadge";
import { formatRelativeTime } from "@/lib/gisUtils";
import { cn } from "@/lib/utils";

export interface ConflictQueueProps {
  conflicts: SpatialConflict[];
  properties: PropertyUnit[];
  selectedConflictId: string | null;
  onSelectConflict: (conflict: SpatialConflict) => void;
  onSearchByProperty: (propertyId: string) => void;
  onClearSearch: () => void;
  className?: string;
}

export type ConflictStatusFilter = "All" | ConflictStatus;
export type ConflictSeverityFilter = "All" | ConflictSeverity;
export type ConflictTypeFilter = "All" | ConflictType;

const STATUS_FILTERS: ConflictStatusFilter[] = ["All", "Pending Review", "Under Investigation", "Resolved"];
const SEVERITY_FILTERS: ConflictSeverityFilter[] = ["All", "Critical", "High", "Medium", "Low"];
const TYPE_FILTERS: ConflictTypeFilter[] = [
  "All",
  "Boundary Overlap",
  "Outside Parent Parcel",
  "Missing Boundary",
    "Invalid Geometry",
  "Duplicate Spatial ID",
];

function conflictAffectedUnits(c: SpatialConflict, properties: PropertyUnit[]): PropertyUnit[] {
  return c.affectedPropertyIds
        .map((pid) => properties.find((p) => p.id === pid))
    .filter(Boolean) as PropertyUnit[];
}

/**
 * Conflict Queue — a searchable, filterable list of spatial conflicts derived
 * from the centralized GISContext. All filtering is computed from the live
 * `conflicts` prop so counts are always accurate.
 */
export function ConflictQueue({
  conflicts,
  properties,
  selectedConflictId,
  onSelectConflict,
  onSearchByProperty,
  onClearSearch,
  className,
}: ConflictQueueProps) {
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<ConflictStatusFilter>("All");
  const [severityFilter, setSeverityFilter] = React.useState<ConflictSeverityFilter>("All");
  const [typeFilter, setTypeFilter] = React.useState<ConflictTypeFilter>("All");
  const [showFilters, setShowFilters] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return conflicts.filter((c) => {
      if (statusFilter !== "All" && c.status !== statusFilter) return false;
      if (severityFilter !== "All" && c.severity !== severityFilter) return false;
      if (typeFilter !== "All" && c.type !== typeFilter) return false;
      if (q) {
        const affectedUnits = conflictAffectedUnits(c, properties);
        const searchFields = [
          c.id, c.conflictNumber, c.buildingId ?? "", c.parcelId ?? "",
          ...c.affectedPropertyIds,
          ...affectedUnits.map((p) => p.demoSpatialId),
          ...affectedUnits.map((p) => p.propertyId),
        ];
        if (!searchFields.some((f) => f?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [conflicts, properties, query, statusFilter, severityFilter, typeFilter]);

  const activeFilterCount =
    (statusFilter !== "All" ? 1 : 0) +
    (severityFilter !== "All" ? 1 : 0) +
    (typeFilter !== "All" ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const clearAllFilters = () => {
    setQuery(""); setStatusFilter("All"); setSeverityFilter("All"); setTypeFilter("All");
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Search bar + filter toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by conflict ID, property, building, parcel, or demo spatial ID…"
            className="input-tech h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
              aria-label="Clear search">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors",
            showFilters ? "border-cyan-500 bg-cyan-500/10 text-cyan-300" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-400",
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-cyan-500 px-1.5 py-0.25 text-[9px] font-extrabold text-slate-950">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-cyan-400 hover:text-cyan-700"
            title="Clear all filters"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter rows */}
      {showFilters && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <FilterRow label="Status" value={statusFilter} options={STATUS_FILTERS} onChange={setStatusFilter} />
          <FilterRow label="Severity" value={severityFilter} options={SEVERITY_FILTERS} onChange={setSeverityFilter} />
          <FilterRow label="Type" value={typeFilter} options={TYPE_FILTERS} onChange={setTypeFilter} />
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>
          Showing {filtered.length} of {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""}
        </span>
        {query && <span className="font-mono">Search: "{query}"</span>}
      </div>

      {/* Queue list */}
      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 py-10 text-center">
            <p className="text-sm font-bold text-slate-900">No conflicts match</p>
            <p className="mt-1 max-w-xs text-[10px] text-slate-500">
              {activeFilterCount > 0
                ? "Try adjusting your filters or search terms."
                : "No spatial conflicts have been detected yet."}
            </p>
          </div>
        ) : (
          filtered.map((conflict) => {
            const isActive = selectedConflictId === conflict.id;
            const affectedUnits = conflictAffectedUnits(conflict, properties);
            return (
              <button
                key={conflict.id}
                type="button"
                onClick={() => onSelectConflict(conflict)}
                aria-pressed={isActive}
                className={cn(
                  "w-full rounded-xl border p-3.5 text-left transition-all",
                  isActive
                    ? "border-cyan-500 bg-cyan-50/70 ring-1 ring-cyan-400/40 shadow-sm"
                    : "border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/30",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-extrabold text-slate-900">
                        {conflict.conflictNumber}
                      </span>
                      <GisStatusBadge status={conflict.severity} kind="severity" />
                    </div>
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{conflict.type}</p>
                  </div>
                  <GisStatusBadge status={conflict.status} kind="conflict-status" className="shrink-0" />
                </div>

                <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                  {conflict.description}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-[9px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="font-extrabold">Detected:</span>
                    {formatRelativeTime(conflict.detectedAt)}
                  </span>
                  {conflict.parcelId && (
                    <span className="flex items-center gap-1">
                      <span className="font-extrabold">Parcel:</span>
                      <span className="font-mono">{conflict.parcelId}</span>
                    </span>
                  )}
                  {conflict.buildingId && (
                    <span className="flex items-center gap-1">
                      <span className="font-extrabold">Building:</span>
                      <span className="font-mono">{conflict.buildingId}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <span className="font-extrabold">Units:</span>
                    {affectedUnits.length}
                  </span>
                </div>

                {affectedUnits.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {affectedUnits.slice(0, 3).map((unit) => (
                      <span
                        key={unit.id}
                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[8px] font-bold text-slate-600"
                        title={`Search by property ${unit.id}`}
                        onClick={(e) => { e.stopPropagation(); onSearchByProperty(unit.id); }}
                      >
                        {unit.id}
                      </span>
                    ))}
                    {affectedUnits.length > 3 && (
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[8px] font-bold text-slate-400">
                        +{affectedUnits.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function FilterRow<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T; options: T[]; onChange: (v: T) => void; }) {
  return (
    <div>
      <label className="mb-1 block text-[8px] font-extrabold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="input-tech h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-800 focus:border-cyan-500 focus:outline-none"
      >
        {options.map((opt) => (
          <option key={String(opt)} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
