"use client";

import * as React from "react";
import {
  BarChart3,
  FileText,
  PieChart,
  Map,
  ShieldCheck,
  TrendingUp,
  CalendarClock,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModuleInProgress } from "@/components/layout/ModuleInProgress";

const REPORT_TYPES = [
  {
    icon: FileText,
    title: "Registry Summary",
    desc: "Parcels, buildings, floors and units with status roll-ups.",
  },
  {
    icon: ShieldCheck,
    title: "Verification Performance",
    desc: "Officer throughput, confidence deltas and seal issuance.",
  },
  {
    icon: Map,
    title: "Conflict Heatmap",
    desc: "Geospatial spread of boundary overlaps and ID collisions.",
  },
  {
    icon: TrendingUp,
    title: "Area & Height Compliance",
    desc: "Built-up vs sanctioned FSI across vertical units.",
  },
  {
    icon: PieChart,
    title: "Extraction Source Mix",
    desc: "AI / drone / survey contribution and confidence bands.",
  },
  {
    icon: CalendarClock,
    title: "Scheduled Exports",
    desc: "Scheduled PDF / GeoPackage / CSV deliveries to officers.",
  },
];

export default function ReportsPage() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          eyebrow="REPORTS & ANALYTICS"
          title="Cadastral Reports & Analytics"
          description="Standardised government reporting across verification, conflicts and vertical asset compliance."
        />

        <ModuleInProgress
          icon={BarChart3}
          eyebrow="Module 7 · Reporting"
          title="Reports & Analytics"
          description="Prebuilt report templates, exportable to PDF / GeoPackage, generated from the unified GIS registry. The query engine and export pipeline are scheduled for this module."
          phase="Planned — report builder, scheduler, role-scoped exports and dashboards."
          accent="green"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {REPORT_TYPES.map((report) => {
              const Icon = report.icon;
              return (
                <div
                  key={report.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-cyan-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                      Scheduled
                    </span>
                  </div>
                  <h3 className="mt-3 text-xs font-extrabold tracking-tight text-slate-900">{report.title}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{report.desc}</p>
                </div>
              );
            })}
          </div>

          <p className="pt-2 text-center font-mono text-[9px] uppercase tracking-widest text-slate-400">
            Report templates are scoped — they become interactive with Module 7
          </p>
        </ModuleInProgress>
      </div>
    </PageContainer>
  );
}