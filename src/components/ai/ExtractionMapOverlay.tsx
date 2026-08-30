"use client";

import * as React from "react";
import { ScanLine, Map as MapIcon, X, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ExtractionResult } from "@/lib/aiExtraction";

/**
 * Floating card shown on the GIS map when `?extraction=` resolves to a
 * prototype result transported through the browser-session store. Clearly
 * labelled as prototype output; it never mutates demo property records.
 */
export function ExtractionMapOverlay({
  result,
  onClose,
}: {
  result: ExtractionResult;
  onClose: () => void;
}) {
  const rows: [string, string][] = [
    ["Source", `${result.sourceType} · ${result.sourceImageName}`],
    ["Estimated Floors", String(result.estimatedFloors)],
    ["Est. Height", `${result.estimatedHeightMeters.toFixed(1)} m`],
    ["Footprint Area", `${result.estimatedFootprintAreaSqm.toLocaleString()} m²`],
    ["Est. Vertical Units", String(result.verticalUnitsEstimate)],
  ];

  return (
    <div className="pointer-events-auto w-[19rem] max-w-[85vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="flex items-center justify-between gap-2 bg-slate-950 px-3 py-2">
        <p className="flex min-w-0 items-center gap-1.5 text-[10.5px] font-black uppercase tracking-widest text-cyan-300">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate">Prototype Extraction</span>
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close extraction overlay"
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-2.5 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="navy" className="text-[9px]">
            AI-Assisted Prototype Output
          </Badge>
          <Badge variant="warning" className="text-[9px]">
            Not a survey
          </Badge>
        </div>

        <p className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-900">
          <ScanLine className="h-3.5 w-3.5 text-cyan-600" /> {result.id}
        </p>

        <dl className="space-y-1 text-[10.5px]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1 last:border-0">
              <dt className="shrink-0 font-bold uppercase tracking-wider text-slate-400">{k}</dt>
              <dd className="min-w-0 truncate text-right font-mono font-bold text-slate-800" title={v}>
                {v}
              </dd>
            </div>
          ))}
        </dl>

        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1.5">
            <p className="text-[8.5px] font-extrabold uppercase tracking-widest text-cyan-600">Detection</p>
            <p className="text-sm font-black text-cyan-800">{result.detectionConfidence}%</p>
          </div>
          <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1.5">
            <p className="text-[8.5px] font-extrabold uppercase tracking-widest text-cyan-600">Reconstruction</p>
            <p className="text-sm font-black text-cyan-800">{result.reconstructionConfidence}%</p>
          </div>
        </div>

        <p className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[9.5px] font-semibold text-amber-800">
          Dashed cyan geometry is the simulated prototype footprint anchored near demo building B-306. It is displayed
          for comparison only and is not written to any property, parcel or building record.
        </p>

        <Button asChild variant="secondary" size="sm" className="w-full">
          <Link href={`/ai-extraction?result=${encodeURIComponent(result.id)}`}>
            <MapIcon className="h-3.5 w-3.5" /> Open in AI Workspace
          </Link>
        </Button>
      </div>
    </div>
  );
}