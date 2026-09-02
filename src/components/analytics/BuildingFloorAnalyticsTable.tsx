"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Layers,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ExternalLink,
  Download,
  Box,
} from "lucide-react";
import {
  type BuildingAnalyticsItem,
  type FloorAnalyticsItem,
} from "@/lib/analytics/analyticsService";
import { exportToCsv } from "@/lib/reports/exportUtils";

interface BuildingFloorAnalyticsTableProps {
  buildings: BuildingAnalyticsItem[];
  floors?: FloorAnalyticsItem[];
  societyId?: string;
  societyName?: string;
  className?: string;
}

export function BuildingFloorAnalyticsTable({
  buildings,
  floors = [],
  societyId,
  societyName,
  className = "",
}: BuildingFloorAnalyticsTableProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortBy, setSortBy] = React.useState<keyof BuildingAnalyticsItem>("discrepanciesCount");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [expandedBuildingId, setExpandedBuildingId] = React.useState<string | null>(null);

  const handleSort = (column: keyof BuildingAnalyticsItem) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const filteredBuildings = React.useMemo(() => {
    return buildings
      .filter((b) => {
        const q = searchTerm.toLowerCase();
        return (
          b.buildingName.toLowerCase().includes(q) ||
          b.buildingCode.toLowerCase().includes(q) ||
          b.societyName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const valA = a[sortBy];
        const valB = b[sortBy];
        if (typeof valA === "number" && typeof valB === "number") {
          return sortOrder === "asc" ? valA - valB : valB - valA;
        }
        return sortOrder === "asc"
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
  }, [buildings, searchTerm, sortBy, sortOrder]);

  const handleExportCsv = () => {
    const headers = [
      "Building Name",
      "Building Code",
      "Society",
      "Total Floors",
      "Total Units",
      "Verified Units",
      "Pending Units",
      "Discrepancies",
      "Open Cases",
      "Resolved Cases",
      "Verification %",
    ];

    const rows = filteredBuildings.map((b) => [
      b.buildingName,
      b.buildingCode,
      b.societyName,
      b.totalFloors,
      b.totalUnits,
      b.verifiedUnits,
      b.pendingUnits,
      b.discrepanciesCount,
      b.openCasesCount,
      b.resolvedCasesCount,
      b.verificationRate,
    ]);

    exportToCsv(
      `building-analytics-${societyName || "platform"}-${new Date().toISOString().slice(0, 10)}`,
      headers,
      rows,
    );
  };

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/90 shadow-sm ${className}`}>
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Building & Floor Analytics</h3>
            <p className="text-xs text-slate-400">
              Granular breakdown of vertical property verification rates and discrepancies
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search buildings…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-cyan-400" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-3 pl-5 pr-3">Building</th>
              <th
                onClick={() => handleSort("totalUnits")}
                className="cursor-pointer py-3 px-3 hover:text-cyan-400 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Units <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("verifiedUnits")}
                className="cursor-pointer py-3 px-3 hover:text-cyan-400 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Verified <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("pendingUnits")}
                className="cursor-pointer py-3 px-3 hover:text-cyan-400 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Pending <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("discrepanciesCount")}
                className="cursor-pointer py-3 px-3 hover:text-cyan-400 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Discrepancies <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("openCasesCount")}
                className="cursor-pointer py-3 px-3 hover:text-cyan-400 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Open Cases <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("verificationRate")}
                className="cursor-pointer py-3 px-3 hover:text-cyan-400 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Rate % <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 pr-5 pl-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
            {filteredBuildings.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No buildings found matching filter criteria
                </td>
              </tr>
            ) : (
              filteredBuildings.map((b) => {
                const isExpanded = expandedBuildingId === b.buildingId;
                const bFloors = floors.filter((f) => f.buildingId === b.buildingId);

                return (
                  <React.Fragment key={b.buildingId}>
                    <tr
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isExpanded ? "bg-slate-800/30" : ""
                      }`}
                    >
                      <td className="py-3.5 pl-5 pr-3">
                        <div className="flex items-center gap-2">
                          {floors.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedBuildingId(isExpanded ? null : b.buildingId)
                              }
                              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                              title="Toggle floor details"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          <div>
                            <span className="font-bold text-white block">{b.buildingName}</span>
                            <span className="text-[11px] font-mono text-slate-400">
                              Code: {b.buildingCode} · {b.totalFloors} Floors
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-white">{b.totalUnits}</td>
                      <td className="py-3.5 px-3 font-mono text-emerald-400">{b.verifiedUnits}</td>
                      <td className="py-3.5 px-3 font-mono text-amber-400">{b.pendingUnits}</td>
                      <td className="py-3.5 px-3">
                        {b.discrepanciesCount > 0 ? (
                          <span className="inline-flex items-center rounded-md bg-rose-500/10 px-2 py-0.5 font-mono text-xs font-bold text-rose-400 border border-rose-500/20">
                            {b.discrepanciesCount}
                          </span>
                        ) : (
                          <span className="font-mono text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        {b.openCasesCount > 0 ? (
                          <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-bold text-amber-400 border border-amber-500/20">
                            {b.openCasesCount}
                          </span>
                        ) : (
                          <span className="font-mono text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-cyan-300 min-w-[2.2rem]">
                            {b.verificationRate}%
                          </span>
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-cyan-500"
                              style={{ width: `${b.verificationRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-5 pl-3 text-right">
                        <Link
                          href={`/properties/default-township/digital-twin?societyId=${b.societyId}&buildingId=${b.buildingId}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all"
                        >
                          <Box className="h-3 w-3" />
                          View in 3D
                        </Link>
                      </td>
                    </tr>

                    {/* Expandable Floor Rows */}
                    {isExpanded && bFloors.length > 0 && (
                      <tr className="bg-slate-950/80">
                        <td colSpan={8} className="py-3 px-6">
                          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                              <Layers className="h-3.5 w-3.5 text-cyan-400" />
                              <span>Floors in {b.buildingName}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                              {bFloors.map((f) => (
                                <div
                                  key={f.floorId}
                                  className="rounded-md border border-slate-800/80 bg-slate-950 p-2.5 flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <span className="font-bold text-white block">
                                      {f.floorLabel || `Floor ${f.floorNumber}`}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {f.totalFlats} Flats · {f.verifiedCount} Verified · {f.pendingCount} Pending
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono text-xs font-bold text-cyan-300 block">
                                      {f.verificationRate}%
                                    </span>
                                    {f.discrepanciesCount > 0 && (
                                      <span className="text-[10px] font-bold text-rose-400">
                                        {f.discrepanciesCount} disc.
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
