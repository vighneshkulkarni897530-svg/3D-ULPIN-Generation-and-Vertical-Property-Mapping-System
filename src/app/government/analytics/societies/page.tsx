"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building,
  Layers,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Download,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  ExternalLink,
  Box,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PERMISSIONS } from "@/types/auth";
import {
  getGovernmentFullAnalytics,
  type SocietyComparisonItem,
} from "@/lib/analytics/analyticsService";
import { exportToCsv } from "@/lib/reports/exportUtils";

export default function SocietiesComparisonPage() {
  return (
    <ProtectedRoute permission={PERMISSIONS.VIEW_VERIFICATION_QUEUE}>
      <SocietiesComparisonContent />
    </ProtectedRoute>
  );
}

function SocietiesComparisonContent() {
  const [loading, setLoading] = React.useState(true);
  const [societies, setSocieties] = React.useState<SocietyComparisonItem[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortBy, setSortBy] = React.useState<keyof SocietyComparisonItem>("verificationRate");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const fullAnalytics = await getGovernmentFullAnalytics();
        setSocieties(fullAnalytics.societiesComparison);
      } catch (err) {
        console.error("Failed to load societies comparison analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSort = (col: keyof SocietyComparisonItem) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
  };

  const filteredSocieties = React.useMemo(() => {
    return societies
      .filter((s) => {
        const q = searchTerm.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          (s.registrationNumber && s.registrationNumber.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const valA = a[sortBy];
        const valB = b[sortBy];
        if (typeof valA === "number" && typeof valB === "number") {
          return sortOrder === "asc" ? valA - valB : valB - valA;
        }
        return sortOrder === "asc"
          ? String(valA || "").localeCompare(String(valB || ""))
          : String(valB || "").localeCompare(String(valA || ""));
      });
  }, [societies, searchTerm, sortBy, sortOrder]);

  const handleExportCsv = () => {
    const headers = [
      "Society Name",
      "Registration",
      "City",
      "State",
      "Buildings",
      "Floors",
      "Total Flats",
      "Residents",
      "Verified Flats",
      "Pending Flats",
      "Discrepancies",
      "Open Cases",
      "Resolved Cases",
      "Verification %",
    ];
    const rows = filteredSocieties.map((s) => [
      s.name,
      s.registrationNumber || "—",
      s.city,
      s.state,
      s.buildingsCount,
      s.floorsCount,
      s.flatsCount,
      s.residentsCount,
      s.verifiedCount,
      s.pendingCount,
      s.discrepanciesCount,
      s.openCasesCount,
      s.resolvedCasesCount,
      s.verificationRate,
    ]);
    exportToCsv(`societies-comparison-${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          eyebrow="GOVERNMENT INTELLIGENCE"
          title="Society Cadastral Comparison"
          description="Cross-jurisdictional comparison of vertical property verification rates, discrepancy densities, and active case queues."
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all"
              >
                <Download className="h-4 w-4 text-cyan-400" />
                Export CSV
              </button>
            </div>
          }
        />

        {/* Search & Control bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by society name, registration, or city…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>
              Showing <span className="font-bold text-white">{filteredSocieties.length}</span> societies
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400">
              Aggregating real-time Firestore analytics…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3.5 pl-5 pr-3">Society</th>
                    <th
                      onClick={() => handleSort("buildingsCount")}
                      className="cursor-pointer py-3.5 px-3 hover:text-cyan-400 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Buildings <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("flatsCount")}
                      className="cursor-pointer py-3.5 px-3 hover:text-cyan-400 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Flats <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("verifiedCount")}
                      className="cursor-pointer py-3.5 px-3 hover:text-cyan-400 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Verified <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("pendingCount")}
                      className="cursor-pointer py-3.5 px-3 hover:text-cyan-400 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Pending <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("discrepanciesCount")}
                      className="cursor-pointer py-3.5 px-3 hover:text-cyan-400 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Discrepancies <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("openCasesCount")}
                      className="cursor-pointer py-3.5 px-3 hover:text-cyan-400 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Open Cases <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("verificationRate")}
                      className="cursor-pointer py-3.5 px-3 hover:text-cyan-400 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Rate % <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="py-3.5 pr-5 pl-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                  {filteredSocieties.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-500">
                        No societies found matching search criteria
                      </td>
                    </tr>
                  ) : (
                    filteredSocieties.map((s) => (
                      <tr key={s.societyId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 pl-5 pr-3">
                          <div>
                            <Link
                              href={`/government/societies/${s.societyId}/analytics`}
                              className="font-bold text-white hover:text-cyan-300 transition-colors block text-sm"
                            >
                              {s.name}
                            </Link>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {s.city}, {s.state} {s.registrationNumber ? `· Reg: ${s.registrationNumber}` : ""}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-3 font-mono">{s.buildingsCount}</td>
                        <td className="py-4 px-3 font-mono font-bold text-white">{s.flatsCount}</td>
                        <td className="py-4 px-3 font-mono text-emerald-400">{s.verifiedCount}</td>
                        <td className="py-4 px-3 font-mono text-amber-400">{s.pendingCount}</td>
                        <td className="py-4 px-3">
                          {s.discrepanciesCount > 0 ? (
                            <span className="inline-flex items-center rounded bg-rose-500/10 px-2 py-0.5 font-mono text-xs font-bold text-rose-400 border border-rose-500/20">
                              {s.discrepanciesCount}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-500">0</span>
                          )}
                        </td>
                        <td className="py-4 px-3">
                          {s.openCasesCount > 0 ? (
                            <span className="inline-flex items-center rounded bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-bold text-amber-400 border border-amber-500/20">
                              {s.openCasesCount}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-500">0</span>
                          )}
                        </td>
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-cyan-300 min-w-[2.2rem]">
                              {s.verificationRate}%
                            </span>
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-cyan-500"
                                style={{ width: `${s.verificationRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 pr-5 pl-3 text-right">
                          <Link
                            href={`/government/societies/${s.societyId}/analytics`}
                            className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all"
                          >
                            <BarChart3 className="h-3.5 w-3.5" />
                            Analytics
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
