'use client';

import React, { Suspense, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useProperty } from '@/context/PropertyContext';
import { useGIS } from '@/context/GISContext';
import { PropertyCard } from '@/components/property/PropertyCard';
import { SearchBar } from '@/components/common/SearchBar';
import { PropertyType, VerificationStatus } from '@/types';
import { 
  Search, 
  Filter, 
  Layers, 
  Grid, 
  List, 
  SlidersHorizontal, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  X,
  Sparkles,
  Building,
  ShieldAlert,
  MapPin,
  ArrowRight
} from 'lucide-react';
import { GisStatusBadge } from '@/components/common/GisStatusBadge';
import { formatRelativeTime } from '@/lib/gisUtils';
import type { PropertyUnit } from '@/types/gis';

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function PropertiesDirectoryPage() {
  return (
    <ProtectedRoute>
      <PropertiesDirectoryPageContent />
    </ProtectedRoute>
  );
}

function PropertiesDirectoryPageContent() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-slate-50">
          <p className="text-xs font-semibold text-slate-400">Loading cadastral registry...</p>
        </div>
      }
    >
      <PropertiesDirectoryPageInner />
    </Suspense>
  );
}

function PropertiesDirectoryPageInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('query') || '';
  const [view, setView] = useState<'units' | 'parcels'>(initialQuery ? 'parcels' : 'units');
  // Phase 7 — registry counts are derived from the centralized GIS state.
  const { properties: gisUnitsForCount, parcels: gisParcelsForCount } = useGIS();

  const activeCls =
    'flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1.5 text-[11px] font-bold text-slate-950 shadow-sm';
  const idleCls =
    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-500 transition-colors hover:text-slate-800';

  return (
    <>
      {/* Phase 7 — segmented registry control (sticky) */}
      <div className="sticky top-16 z-30 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registry view</span>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button type="button" onClick={() => setView('units')} className={view === 'units' ? activeCls : idleCls}>
              <Layers className="h-3.5 w-3.5" /> Vertical Property Units
            </button>
            <button type="button" onClick={() => setView('parcels')} className={view === 'parcels' ? activeCls : idleCls}>
              <Building className="h-3.5 w-3.5" /> Cadastre Parcels
            </button>
          </div>
          <span className="hidden font-mono text-[9px] uppercase tracking-widest text-slate-400 sm:inline">
            Unified GIS registry · {gisUnitsForCount.length} vertical units · {gisParcelsForCount.length} land parcels
          </span>
        </div>
      </div>

      {view === 'parcels' ? (
        <LegacyParcelRegistry initialQuery={initialQuery} />
      ) : (
        <VerticalUnitsRegistry />
      )}
    </>
  );
}

function LegacyParcelRegistry({ initialQuery }: { initialQuery: string }) {
  const { properties } = useProperty();

  // Filters State
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'VALUATION_DESC' | 'VALUATION_ASC' | 'AREA_DESC' | 'NEWEST'>('NEWEST');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter and Sort Logic
  const filteredProperties = useMemo(() => {
    return properties
      .filter((prop) => {
        // Query match
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchUlpin = prop.ulpin.toLowerCase().includes(q);
          const matchId = prop.propertyId.toLowerCase().includes(q);
          const matchTitle = prop.title.toLowerCase().includes(q);
          const matchAddress = prop.address.toLowerCase().includes(q);
          const matchOwner = prop.primaryOwnerName.toLowerCase().includes(q);
          const matchSurvey = prop.landDetails.surveyNumber.toLowerCase().includes(q);
          if (!matchUlpin && !matchId && !matchTitle && !matchAddress && !matchOwner && !matchSurvey) {
            return false;
          }
        }

        // Type filter
        if (selectedType !== 'ALL' && prop.propertyType !== selectedType) {
          return false;
        }

        // Status filter
        if (selectedStatus !== 'ALL') {
          if (selectedStatus === 'DISPUTED' && !prop.hasActiveDispute && prop.verificationStatus !== 'DISPUTED') return false;
          if (selectedStatus === 'VERIFIED' && prop.verificationStatus !== 'VERIFIED') return false;
          if (selectedStatus === 'PENDING' && !['SUBMITTED', 'UNDER_REVIEW', 'FIELD_VERIFICATION_REQUESTED', 'OFFICER_ASSIGNED'].includes(prop.verificationStatus)) return false;
        }

        // District filter
        if (selectedDistrict !== 'ALL' && prop.district !== selectedDistrict) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'VALUATION_DESC') return b.marketValuationINR - a.marketValuationINR;
        if (sortBy === 'VALUATION_ASC') return a.marketValuationINR - b.marketValuationINR;
        if (sortBy === 'AREA_DESC') return b.landDetails.landAreaSqFt - a.landDetails.landAreaSqFt;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [properties, searchQuery, selectedType, selectedStatus, selectedDistrict, sortBy]);

  const uniqueDistricts = Array.from(new Set(properties.map((p) => p.district)));

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType('ALL');
    setSelectedStatus('ALL');
    setSelectedDistrict('ALL');
    setSortBy('NEWEST');
  };

  const hasActiveFilters = searchQuery || selectedType !== 'ALL' || selectedStatus !== 'ALL' || selectedDistrict !== 'ALL';

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Directory Header */}
        <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>National Geospatial Cadastre Directory</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Search Land & Property Registry
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Locate any land parcel by 14-digit ULPIN Bhu-Aadhaar, Survey Number, Property ID, or Owner Name with instant 3D Digital Twin & 2D GIS boundary overlays.
            </p>

            <div className="pt-2">
              <SearchBar
                initialValue={searchQuery}
                onSearch={(q) => setSearchQuery(q)}
                placeholder="Search ULPIN (e.g. 14092837482910), Survey No (42/B), or District..."
                size="large"
              />
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-tech flex flex-wrap items-center justify-between gap-4">
          {/* Filters Selectors */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <SlidersHorizontal className="w-4 h-4 text-cyan-600" />
              <span>Filters:</span>
            </div>

            {/* Property Type Dropdown */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500/20 outline-none cursor-pointer"
            >
              <option value="ALL">All Property Types</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="RESIDENTIAL">Residential</option>
              <option value="INDUSTRIAL">Industrial</option>
              <option value="AGRICULTURAL">Agricultural</option>
            </select>

            {/* Verification Status Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500/20 outline-none cursor-pointer"
            >
              <option value="ALL">All Verification Statuses</option>
              <option value="VERIFIED">Verified (Bhu-Aadhaar)</option>
              <option value="PENDING">Pending / Under Review</option>
              <option value="DISPUTED">Disputed / Encroachment</option>
            </select>

            {/* District Dropdown */}
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500/20 outline-none cursor-pointer"
            >
              <option value="ALL">All Districts</option>
              {uniqueDistricts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold border border-rose-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>

          {/* Sort By & View Toggles */}
          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500/20 outline-none cursor-pointer"
            >
              <option value="NEWEST">Sort: Newest Ingested</option>
              <option value="VALUATION_DESC">Valuation: High to Low</option>
              <option value="VALUATION_ASC">Valuation: Low to High</option>
              <option value="AREA_DESC">Land Area: Largest First</option>
            </select>

            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-sm text-cyan-700 font-bold' : 'text-slate-500'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-sm text-cyan-700 font-bold' : 'text-slate-500'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-slate-600">
          <p>
            Showing <strong className="text-slate-900 font-bold">{filteredProperties.length}</strong> cadastre parcels
            {searchQuery && <span> matching "<strong className="text-cyan-700">{searchQuery}</strong>"</span>}
          </p>
        </div>

        {/* Results Grid */}
        {filteredProperties.length > 0 ? (
          <div
            className={`grid gap-6 ${
              viewMode === 'grid'
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1'
            }`}
          >
            {filteredProperties.map((prop) => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-tech">
            <Building className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">No Cadastral Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We couldn't find any property matching your search terms. Try searching by a sample ULPIN like <strong className="text-cyan-700 font-mono">14092837482910</strong> or clear your filters.
            </p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-bold transition-all"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* Phase 7 — Vertical Property Units registry (GISContext-backed). All data
 * derives from the centralized GIS demo registry — no duplicated state. */
function VerticalUnitsRegistry() {
  const { properties, buildings, floors, conflicts } = useGIS();
  const { properties: legacyProperties } = useProperty();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [buildingFilter, setBuildingFilter] = useState("ALL");
  const [floorFilter, setFloorFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [conflictFilter, setConflictFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"NEWEST" | "ID" | "AREA_DESC" | "AREA_ASC" | "FLOOR_HIGH">("NEWEST");

  const buildingById = useMemo(() => new Map(buildings.map((b) => [b.id, b])), [buildings]);
  const floorById = useMemo(() => new Map(floors.map((f) => [f.id, f])), [floors]);

  // Unit id → open (unresolved) conflict ids, from GISContext only.
  const openConflictsByUnit = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of conflicts) {
      if (c.status === "Resolved") continue;
      for (const unitId of c.affectedPropertyIds) map.set(unitId, [...(map.get(unitId) ?? []), c.id]);
    }
    return map;
  }, [conflicts]);

  const statusOptions = useMemo(() => Array.from(new Set(properties.map((p) => p.verificationStatus))).sort(), [properties]);
  const typeOptions = useMemo(() => Array.from(new Set(properties.map((p) => p.propertyType))).sort(), [properties]);
  const floorOptions = useMemo(() => {
    const scoped = new Set(properties.filter((p) => buildingFilter === "ALL" || p.buildingId === buildingFilter).map((p) => p.floorId));
    return floors.filter((f) => scoped.has(f.id));
  }, [properties, floors, buildingFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "ALL" || buildingFilter !== "ALL" ||
    floorFilter !== "ALL" || typeFilter !== "ALL" || conflictFilter !== "ALL";

  const resetFilters = () => {
    setSearchQuery(""); setStatusFilter("ALL"); setBuildingFilter("ALL");
    setFloorFilter("ALL"); setTypeFilter("ALL"); setConflictFilter("ALL"); setSortBy("NEWEST");
  };

  const verifiedCount = properties.filter((p) => String(p.verificationStatus) === "VERIFIED").length;
  const conflictUnitCount = properties.filter((p) => (openConflictsByUnit.get(p.id) ?? []).length > 0).length;

  const filteredUnits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rows = properties.filter((p) => {
      if (statusFilter !== "ALL" && p.verificationStatus !== statusFilter) return false;
      if (buildingFilter !== "ALL" && p.buildingId !== buildingFilter) return false;
      if (floorFilter !== "ALL" && p.floorId !== floorFilter) return false;
      if (typeFilter !== "ALL" && p.propertyType !== typeFilter) return false;
      const unitConflicts = openConflictsByUnit.get(p.id) ?? [];
      if (conflictFilter === "CONFLICT" && unitConflicts.length === 0) return false;
      if (conflictFilter === "CLEAR" && unitConflicts.length > 0) return false;
      if (q) {
        const b = buildingById.get(p.buildingId);
        const hay = [p.id, p.demoSpatialId, p.propertyId, p.ownerReferenceName, p.unitNumber, p.buildingId, b?.name, b?.buildingCode]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const floorNumber = (u: PropertyUnit) => floorById.get(u.floorId)?.floorNumber ?? 0;
    return rows.sort((a, b) => {
      switch (sortBy) {
        case "ID":
          return a.id.localeCompare(b.id);
        case "AREA_DESC":
          return b.area - a.area;
        case "AREA_ASC":
          return a.area - b.area;
        case "FLOOR_HIGH":
          return floorNumber(b) - floorNumber(a) || a.id.localeCompare(b.id);
        default:
          return b.lastUpdated.localeCompare(a.lastUpdated);
      }
    });
  }, [properties, searchQuery, statusFilter, buildingFilter, floorFilter, typeFilter, conflictFilter, sortBy, openConflictsByUnit, buildingById, floorById]);

  // Real destination: legacy cadastral record when linked, else the floor explorer.
  const unitHref = (u: PropertyUnit) => {
    const legacy = legacyProperties.find((lp) => lp.id === u.propertyId);
    return legacy ? `/properties/${legacy.id}` : `/buildings/${u.buildingId}/floors?unit=${u.id}`;
  };

  const selectCls =
    "cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500/20";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Derived stats — computed from centralized GIS state */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Vertical Units", value: properties.length, icon: Layers },
          { label: "Verified Units", value: verifiedCount, icon: CheckCircle2 },
          { label: "Units w/ Open Conflicts", value: conflictUnitCount, icon: ShieldAlert },
          { label: "Buildings", value: buildings.length, icon: Building },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-tech">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <s.icon className="h-3.5 w-3.5 text-cyan-600" /> {s.label}
            </span>
            <p className="mt-1 text-xl font-black tabular-nums text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filters + sorting */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-tech">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Property ID, Demo Spatial ID, building, owner…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls} title="Verification status">
              <option value="ALL">Status: All</option>
              {statusOptions.map((s) => (
                <option key={String(s)} value={String(s)}>Status: {String(s)}</option>
              ))}
            </select>
            <select value={buildingFilter} onChange={(e) => { setBuildingFilter(e.target.value); setFloorFilter("ALL"); }} className={selectCls} title="Building">
              <option value="ALL">Building: All</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <select value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)} className={selectCls} title="Floor">
              <option value="ALL">Floor: All</option>
              {floorOptions.map((f) => (
                <option key={f.id} value={f.id}>{f.name} (L{f.floorNumber})</option>
              ))}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectCls} title="Property type">
              <option value="ALL">Type: All</option>
              {typeOptions.map((t) => (
                <option key={String(t)} value={String(t)}>{String(t)}</option>
              ))}
            </select>
            <select value={conflictFilter} onChange={(e) => setConflictFilter(e.target.value)} className={selectCls} title="Conflict state">
              <option value="ALL">Conflicts: All</option>
              <option value="CONFLICT">With open conflicts</option>
              <option value="CLEAR">Conflict-free</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className={selectCls} title="Sort">
              <option value="NEWEST">Sort: Recently updated</option>
              <option value="ID">Sort: Property ID</option>
              <option value="AREA_DESC">Sort: Area (largest)</option>
              <option value="AREA_ASC">Sort: Area (smallest)</option>
              <option value="FLOOR_HIGH">Sort: Highest floor</option>
            </select>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:border-red-300 hover:text-red-600">
                <X className="h-3.5 w-3.5" /> Reset
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Showing <strong className="font-black text-slate-900">{filteredUnits.length}</strong> of {properties.length} vertical property units
          {searchQuery && <> matching &quot;<strong className="text-cyan-700">{searchQuery}</strong>&quot;</>}
        </p>
      </div>

      {/* Registry rows */}
      {filteredUnits.length > 0 ? (
        <div className="mt-5 space-y-3">
          {filteredUnits.map((u) => {
            const b = buildingById.get(u.buildingId);
            const f = floorById.get(u.floorId);
            const unitConflicts = openConflictsByUnit.get(u.id) ?? [];
            return (
              <div key={u.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-tech transition-shadow hover:shadow-tech-lg">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={unitHref(u)} className="font-mono text-sm font-black text-slate-900 transition-colors hover:text-cyan-700">
                        {u.id}
                      </Link>
                      <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan-300">{u.unitNumber}</span>
                      {unitConflicts.length > 0 && (
                        <Link
                          href={`/conflicts?conflict=${unitConflicts[0]}`}
                          title="Open the conflict investigation workspace"
                          className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-black text-red-600 transition-colors hover:bg-red-100"
                        >
                          <ShieldAlert className="h-3 w-3" /> {unitConflicts.length} open conflict{unitConflicts.length === 1 ? "" : "s"}
                        </Link>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-slate-500">{u.demoSpatialId}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3 text-slate-400" />
                        <Link href={`/buildings/${u.buildingId}`} className="font-bold transition-colors hover:text-cyan-700">{b ? b.name : u.buildingId}</Link>
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3 text-slate-400" />
                        <Link href={`/buildings/${u.buildingId}/floors`} className="font-bold transition-colors hover:text-cyan-700">
                          {f ? `${f.name} (L${f.floorNumber})` : u.floorId}
                        </Link>
                      </span>
                      <span>{u.propertyType}</span>
                      <span>{u.area.toLocaleString()} sq ft</span>
                      <span className="text-slate-400">Owner ref: {u.ownerReferenceName}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" /> {formatRelativeTime(u.lastUpdated)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <GisStatusBadge status={u.verificationStatus} />
                    <Link
                      href={`/map?property=${u.id}`}
                      title="View on the 2D GIS map"
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 transition-colors hover:border-cyan-400 hover:text-cyan-700"
                    >
                      <MapPin className="h-3 w-3" /> Map
                    </Link>
                    <Link
                      href={unitHref(u)}
                      className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1.5 text-[10px] font-black text-slate-950 shadow-sm transition-all hover:from-cyan-400 hover:to-blue-500"
                    >
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-tech">
          <Search className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-sm font-black text-slate-900">No Vertical Units Match</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            Try a Property ID, Demo Spatial Identifier, building or owner reference — or clear the filters.
          </p>
          <button onClick={resetFilters} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-cyan-300 transition-all hover:bg-slate-800">
            Reset All Filters
          </button>
        </div>
      )}

      <p className="mt-6 text-center text-[10px] text-slate-400">
        Demo Spatial Identifiers are prototype identifiers — External Government Integration Required for official ULPINs.
      </p>
    </div>
  );
}
