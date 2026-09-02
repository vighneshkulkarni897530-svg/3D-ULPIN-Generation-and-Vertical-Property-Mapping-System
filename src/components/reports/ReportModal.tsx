"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Printer, Download, FileText, CheckCircle2, AlertTriangle, ShieldCheck, X } from "lucide-react";
import {
  type PropertyReportData,
  type CaseReportData,
  type SocietyReportData,
} from "@/lib/reports/reportService";
import { exportToCsv, triggerPrintReport } from "@/lib/reports/exportUtils";

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: "PROPERTY" | "CASE" | "SOCIETY";
  data: PropertyReportData | CaseReportData | SocietyReportData | null;
}

export function ReportModal({ open, onOpenChange, reportType, data }: ReportModalProps) {
  if (!data) return null;

  const handleExportCsv = () => {
    if (reportType === "CASE") {
      const cData = data as CaseReportData;
      const headers = ["Field", "Value"];
      const rows = [
        ["Report ID", cData.reportId],
        ["Generated Date", cData.generatedAt.toISOString()],
        ["Case Number", cData.case.caseNumber],
        ["Case Title", cData.case.title],
        ["Status", cData.case.status],
        ["Severity", cData.case.severity],
        ["Assigned Officer", cData.case.assignedOfficerName || "None"],
        ["Society", cData.case.societyName],
        ["Decision", cData.case.decision || "Pending"],
        ["Decision Reason", cData.case.decisionReason || "None"],
        [],
        ["Discrepancies", ""],
        ...cData.discrepancies.map((d) => [d.type, `${d.severity} - ${d.description}`]),
        [],
        ["Evidence Files", ""],
        ...cData.evidenceList.map((e) => [e.title, `${e.category} (${e.fileSizeKB} KB)`]),
        [],
        ["Disclaimer", cData.disclaimer],
      ];
      exportToCsv(`case-report-${cData.case.caseNumber}`, headers, rows);
    } else if (reportType === "SOCIETY") {
      const sData = data as SocietyReportData;
      const headers = ["Building", "Code", "Floors", "Units", "Verified", "Pending", "Discrepancies", "Verification Rate %"];
      const rows = sData.buildings.map((b) => [
        b.name,
        b.code,
        b.floors,
        b.units,
        b.verified,
        b.pending,
        b.discrepancies,
        b.verificationRate,
      ]);
      exportToCsv(`society-report-${sData.society.name}`, headers, rows);
    } else {
      const pData = data as PropertyReportData;
      const headers = ["Field", "Value"];
      const rows = [
        ["Report ID", pData.reportId],
        ["Property Unit", pData.property.flatNumber],
        ["Floor", pData.property.floorLabel],
        ["Building", pData.property.buildingName],
        ["Society", pData.property.societyName],
        ["Spatial ID", pData.property.spatialId],
        ["ULPIN Reference", pData.property.ulpinReference],
        ["Verification Status", pData.verificationStatus],
        ["Verified Officer", pData.verifiedByOfficer || "None"],
        ["Disclaimer", pData.disclaimer],
      ];
      exportToCsv(`property-report-${pData.property.flatNumber}`, headers, rows);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-slate-100 p-6">
        <DialogHeader className="border-b border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" />
              <DialogTitle className="text-base font-bold text-white">
                {data.title}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={triggerPrintReport}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1.5 text-xs font-bold text-slate-950 hover:from-cyan-400 hover:to-blue-500 transition-all shadow"
              >
                <Printer className="h-3.5 w-3.5" />
                Print / Save PDF
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-400 mt-1">
            Report Reference: <span className="font-mono text-cyan-300 font-bold">{data.reportId}</span> · Generated:{" "}
            {new Date(data.generatedAt).toLocaleString("en-IN")}
          </DialogDescription>
        </DialogHeader>

        {/* Disclaimer Banner */}
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-[11px] text-amber-300">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
            <p>{data.disclaimer}</p>
          </div>
        </div>

        {/* Report Body Rendering */}
        <div className="mt-5 space-y-5 text-xs">
          {reportType === "CASE" && (
            <CaseReportView data={data as CaseReportData} />
          )}
          {reportType === "SOCIETY" && (
            <SocietyReportView data={data as SocietyReportData} />
          )}
          {reportType === "PROPERTY" && (
            <PropertyReportView data={data as PropertyReportData} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CaseReportView({ data }: { data: CaseReportData }) {
  return (
    <div className="space-y-4">
      {/* Case Details */}
      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Case Overview</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400">Case Number:</span>{" "}
            <span className="font-mono font-bold text-white">{data.case.caseNumber}</span>
          </div>
          <div>
            <span className="text-slate-400">Status:</span>{" "}
            <span className="font-bold text-white">{data.case.status}</span>
          </div>
          <div>
            <span className="text-slate-400">Severity:</span>{" "}
            <span className="font-bold text-white">{data.case.severity}</span>
          </div>
          <div>
            <span className="text-slate-400">Assigned Officer:</span>{" "}
            <span className="text-white">{data.case.assignedOfficerName || "Unassigned"}</span>
          </div>
          <div>
            <span className="text-slate-400">Society:</span>{" "}
            <span className="text-white">{data.case.societyName}</span>
          </div>
          <div>
            <span className="text-slate-400">Building / Flat:</span>{" "}
            <span className="text-white">
              {data.case.buildingName || "—"} {data.case.flatNumber ? `· Unit ${data.case.flatNumber}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Official Determination */}
      {data.case.decision && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1.5">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Official Determination
          </h4>
          <p className="font-bold text-white">{data.case.decision}</p>
          <p className="text-xs text-slate-300">{data.case.decisionReason}</p>
          <p className="text-[10px] text-slate-400">
            Determined by {data.case.decisionMadeBy || "Government Officer"} on{" "}
            {data.case.decisionMadeAt ? new Date(data.case.decisionMadeAt).toLocaleString("en-IN") : "—"}
          </p>
        </div>
      )}

      {/* Discrepancies */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Linked Discrepancies ({data.discrepancies.length})
        </h4>
        <div className="space-y-1.5">
          {data.discrepancies.map((d) => (
            <div key={d.id} className="rounded border border-slate-800 bg-slate-950 p-2.5">
              <div className="flex items-center justify-between font-semibold text-slate-200">
                <span>{d.type}</span>
                <span className="text-[11px] text-amber-400 font-mono">{d.severity}</span>
              </div>
              <p className="mt-1 text-slate-400">{d.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Evidence */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Attached Evidence ({data.evidenceList.length})
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {data.evidenceList.map((e) => (
            <div key={e.id} className="rounded border border-slate-800 bg-slate-950 p-2">
              <p className="font-semibold text-slate-200 truncate">{e.title}</p>
              <p className="text-[10px] text-slate-400">
                {e.category} · {e.fileSizeKB} KB · By {e.uploadedByName}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SocietyReportView({ data }: { data: SocietyReportData }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
          Society Profile & Metrics
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-slate-400">Society Name:</span>{" "}
            <span className="font-bold text-white">{data.society.name}</span>
          </div>
          <div>
            <span className="text-slate-400">Reg. Number:</span>{" "}
            <span className="font-mono text-white">{data.society.registrationNumber || "—"}</span>
          </div>
          <div>
            <span className="text-slate-400">Location:</span>{" "}
            <span className="text-white">
              {data.society.city}, {data.society.state}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Verification Rate:</span>{" "}
            <span className="font-mono font-bold text-cyan-300">{data.metrics.verificationRate}%</span>
          </div>
          <div>
            <span className="text-slate-400">Total Units:</span>{" "}
            <span className="font-mono text-white">{data.metrics.totalFlats}</span>
          </div>
          <div>
            <span className="text-slate-400">Verified Units:</span>{" "}
            <span className="font-mono text-emerald-400">{data.metrics.verifiedUnits}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Building Breakdown ({data.buildings.length})
        </h4>
        <div className="rounded border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase">
              <tr>
                <th className="p-2">Building</th>
                <th className="p-2">Floors</th>
                <th className="p-2">Units</th>
                <th className="p-2">Verified</th>
                <th className="p-2">Discrepancies</th>
                <th className="p-2">Rate %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {data.buildings.map((b) => (
                <tr key={b.code}>
                  <td className="p-2 font-bold text-white">{b.name}</td>
                  <td className="p-2">{b.floors}</td>
                  <td className="p-2">{b.units}</td>
                  <td className="p-2 text-emerald-400">{b.verified}</td>
                  <td className="p-2 text-rose-400">{b.discrepancies}</td>
                  <td className="p-2 font-mono font-bold text-cyan-300">{b.verificationRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PropertyReportView({ data }: { data: PropertyReportData }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
          Vertical Property Identity
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-slate-400">Unit Number:</span>{" "}
            <span className="font-bold text-white">{data.property.flatNumber}</span>
          </div>
          <div>
            <span className="text-slate-400">Floor:</span>{" "}
            <span className="text-white">{data.property.floorLabel}</span>
          </div>
          <div>
            <span className="text-slate-400">Building:</span>{" "}
            <span className="text-white">{data.property.buildingName}</span>
          </div>
          <div>
            <span className="text-slate-400">Society:</span>{" "}
            <span className="text-white">{data.property.societyName}</span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-400">Spatial ID:</span>{" "}
            <span className="font-mono font-bold text-cyan-300">{data.property.spatialId}</span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-400">ULPIN Reference:</span>{" "}
            <span className="font-mono text-slate-300">{data.property.ulpinReference}</span>
          </div>
          <div>
            <span className="text-slate-400">Status:</span>{" "}
            <span className="font-bold text-emerald-400">{data.verificationStatus}</span>
          </div>
          <div>
            <span className="text-slate-400">Verified By:</span>{" "}
            <span className="text-white">{data.verifiedByOfficer || "Pending Verification"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
