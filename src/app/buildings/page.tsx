"use client";

import * as React from "react";
import { Building2, Layers, Search, SlidersHorizontal, X, Plus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildingCard } from "@/components/gis/BuildingCard";
import { useGIS } from "@/context/GISContext";
import { useAuth } from "@/context/AuthContext";
import { RegisterBuildingModal } from "@/components/buildings/RegisterBuildingModal";
import type { BuildingStatus } from "@/types/gis";

type SortKey = "NAME" | "FLOORS_DESC" | "UNITS_DESC" | "VERIFIED_DESC";

interface BuildingStats {
  floors: number;
  units: number;
  verified: number;
  pending: number;
  openConflicts: number;
}

const PENDING_STATUSES = ["Pending", "Under Review", "Field Verification", "Reinspection Required"];

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function BuildingsDirectoryPage() {
  return (
    <ProtectedRoute>
      <BuildingsDirectoryPageContent />
    </ProtectedRoute>
  );
}

function BuildingsDirectoryPageContent() {
  const { buildings, floors, properties, parcels, conflicts } = useGIS();
  const { role } = useAuth();
  const [registerModalOpen, setRegisterModalOpen] = React.useState(false);

  const [query, setQuery] = React.useState("");
  const [parcelFilter, setParcelFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | BuildingStatus>("ALL");
  const [sortBy, setSortBy] = React.useState<SortKey>("NAME");

  // All counts derive live from the centralized GIS registry — no duplication.
  const statsByBuilding = React.useMemo(() => {
    const map = new Map<string, BuildingStats>();
    for (const b of buildings) {
      const units = properties.filter((p) => p.buildingId === b.id);
      const unitIds = new Set(units.map((u) => u.id));
      map.set(b.id, {
        floors: floors.filter((f) => f.buildingId === b.id).length,
        units: units.length,
        verified: units.filter((u) => u.verificationStatus === "Verified").length,
        pending: units.filter((u) => PENDING_STATUSES.includes(u.verificationStatus)).length,
        openConflicts: conflicts.filter(
          (c) =>
            c.status !== "Resolved" &&
            (c.buildingId === b.id || c.affectedPropertyIds.some((id) => unitIds.has(id))),
        ).length,
      });
    }
    return map;
  }, [buildings, floors, properties, conflicts]);

  const filteredBuildings = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return buildings
      .filter((b) => {
        if (parcelFilter !== "ALL" && b.parcelId !== parcelFilter) return false;
        if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
        if (q) {
          const parcel = parcels.find((p) => p.id === b.parcelId);
          const fields = [b.id, b.buildingCode, b.name, b.address, parcel?.parcelNumber ?? "", parcel?.location ?? ""];
          if (!fields.some((f) => f.toLowerCase().includes(q))) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const sa = statsByBuilding.get(a.id);
        const sb = statsByBuilding.get(b.id);
        if (!sa || !sb) return 0;
        if (sortBy === "FLOORS_DESC") return sb.floors - sa.floors;
        if (sortBy === "UNITS_DESC") return sb.units - sa.units;
        if (sortBy === "VERIFIED_DESC") return sb.verified - sa.verified;
        return a.name.localeCompare(b.name);
      });
  }, [buildings, parcels, parcelFilter, statusFilter, query, sortBy, statsByBuilding]);

  const hasFilters = query.trim() !== "" || parcelFilter !== "ALL" || statusFilter !== "ALL";
  const clearFilters = () => {
    setQuery("");
    setParcelFilter("ALL");
    setStatusFilter("ALL");
    setSortBy("NAME");
  };

  const totalFloors = floors.length;
  const totalUnits = properties.length;

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          eyebrow="VERTICAL ASSET REGISTRY"
          title="Building Registry"
          description={`${buildings.length} surveyed buildings on ${parcels.length} cadastral parcels — ${totalFloors} floors and ${totalUnits} vertical property units. All counts derive live from the unified GIS registry.`}
          actions={
            role === "ADMIN" ? (
              <button
                onClick={() => setRegisterModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-indigo-400 hover:to-purple-500 transition-all"
              >
                <Plus className="h-4 w-4" /> Register New Building
              </button>
            ) : undefined
          }
        />

        {/* Search + filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search building ID, code, name, address or parcel…"
                aria-label="Search buildings"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <SlidersHorizontal className="h-4 w-4 text-cyan-600" />
            </div>

            <select
              value={parcelFilter}
              onChange={(e) => setParcelFilter(e.target.value)}
              aria-label="Filter by parent parcel"
              className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="ALL">All parcels</option>
              {parcels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.parcelNumber}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | BuildingStatus)}
              aria-label="Filter by building status"
              className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="UNDER_CONSTRUCTION">Under construction</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="Sort buildings"
              className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="NAME">Sort: Name</option>
              <option value="FLOORS_DESC">Most floors</option>
              <option value="UNITS_DESC">Most units</option>
              <option value="VERIFIED_DESC">Most verified units</option>
            </select>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
              >
                <X className="h-3.5 w-3.5" /> Reset
              </button>
            )}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            Showing {filteredBuildings.length} of {buildings.length} buildings
          </p>
        </div>

        {buildings.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-7 w-7" />}
            title="No buildings in the registry"
            description="The Phase 1 dataset does not contain any building records yet."
            action={
              <span className="rounded-full bg-cyan-50 border border-cyan-200 px-3 py-1 text-[10px] font-bold text-cyan-700">
                Awaiting cadastral survey data
              </span>
            }
          />
        ) : filteredBuildings.length === 0 ? (
          <EmptyState
            icon={<Search className="h-7 w-7" />}
            title="No buildings match your filters"
            description="Adjust the search text, parcel or status filters to find buildings in the registry."
            action={
              <button
                onClick={clearFilters}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-cyan-300 transition-colors hover:bg-slate-800"
              >
                Reset All Filters
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredBuildings.map((building) => {
              const parcel = parcels.find((p) => p.id === building.parcelId);
              const stats = statsByBuilding.get(building.id);
              return (
                <BuildingCard
                  key={building.id}
                  building={building}
                  floorsCount={stats?.floors ?? 0}
                  unitsCount={stats?.units ?? 0}
                  parcelLocation={parcel?.location}
                  parcelNumber={parcel?.parcelNumber}
                  verifiedCount={stats?.verified}
                  pendingCount={stats?.pending}
                  openConflicts={stats?.openConflicts}
                />
              );
            })}
          </div>
        )}

        <p className="flex items-center justify-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-slate-400">
          <Layers className="h-3 w-3" /> Building &rarr; Floor &rarr; PropertyUnit hierarchy from the unified GIS model
        </p>

        {/* Society Secretary Register Building Modal */}
        <RegisterBuildingModal
          isOpen={registerModalOpen}
          onClose={() => setRegisterModalOpen(false)}
        />
      </div>
    </PageContainer>
  );
}