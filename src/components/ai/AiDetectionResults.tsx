"use client";

import * as React from "react";
import {
  Building2,
  Ruler,
  Box,
  Layers,
  Gauge,
  ScanLine,
  CheckCircle2,
  XCircle,
  Percent,
  Image as ImageIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import type { ExtractionResult } from "@/lib/aiExtraction";

type Tone = "cyan" | "emerald" | "amber" | "slate";

const TONE_CLS: Record<Tone, string> = {
  cyan: "border-cyan-200 bg-cyan-50/50 text-cyan-700",
  emerald: "border-emerald-200 bg-emerald-50/50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50/50 text-amber-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

function Tile({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  check,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  tone: Tone;
  check?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border px-3 py-2.5", TONE_CLS[tone])}>
      <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest opacity-80">
        <Icon className="h-3 w-3 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {check !== undefined &&
          (check ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          ) : (
            <XCircle className="h-3 w-3 text-amber-500" />
          ))}
      </p>
      <p className="mt-1 truncate text-lg font-black tracking-tight">{value}</p>
      <p className="mt-0.5 truncate text-[9.5px] font-semibold opacity-70">{sub}</p>
    </div>
  );
}

/** Section 3 — simulated AI detection metrics. All values are prototype output. */
export function AiDetectionResults({ result }: { result: ExtractionResult }) {
  const sqft = Math.round(result.estimatedFootprintAreaSqm * 10.7639);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <SectionHeader
        icon={<ScanLine className="h-4 w-4" />}
        title="3 · AI Detection Results"
        description="Prototype detection metrics derived from the demo image."
        action={
          <Badge variant="navy" className="text-[9px]">
            AI-Assisted Prototype Output
          </Badge>
        }
      />

      <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Tile
          icon={Building2}
          label="Building Detected"
          value={result.buildingDetected ? "Detected" : "Not detected"}
          sub={`Detection confidence ${result.detectionConfidence}%`}
          tone={result.buildingDetected ? "emerald" : "amber"}
          check={result.buildingDetected}
        />
        <Tile
          icon={Percent}
          label="Detection Confidence"
          value={`${result.detectionConfidence}%`}
          sub="Simulated vision score"
          tone="cyan"
        />
        <Tile
          icon={ScanLine}
          label="Boundary Detected"
          value={result.boundaryDetected ? "Traced" : "Fallback applied"}
          sub={`Boundary confidence ${result.boundaryConfidence}%`}
          tone={result.boundaryDetected ? "emerald" : "amber"}
          check={result.boundaryDetected}
        />
        <Tile
          icon={Ruler}
          label="Estimated Height"
          value={`${result.estimatedHeightMeters.toFixed(1)} m`}
          sub={`${result.estimatedFloors} prototype floors`}
          tone="cyan"
        />
        <Tile
          icon={Box}
          label="Footprint Area"
          value={`${result.estimatedFootprintAreaSqm.toLocaleString()} m²`}
          sub={`≈ ${sqft.toLocaleString()} sq.ft`}
          tone="cyan"
        />
        <Tile
          icon={Layers}
          label="Vertical Units"
          value={String(result.verticalUnitsEstimate)}
          sub="Estimated units (prototype)"
          tone="slate"
        />
        <Tile
          icon={Gauge}
          label="Reconstruction Confidence"
          value={`${result.reconstructionConfidence}%`}
          sub="Weighted prototype score"
          tone="cyan"
        />
        <Tile
          icon={ImageIcon}
          label="Image Quality"
          value={result.imageQuality}
          sub={`Quality score ${result.qualityScore}/100`}
          tone={result.imageQuality === "Good" ? "emerald" : result.imageQuality === "Moderate" ? "cyan" : "amber"}
        />
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5" /> Detection Status: Prototype Analysis Complete
        </p>
        <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-emerald-600">
          AI-Assisted · Not a survey
        </span>
      </div>

      {result.warnings.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {result.warnings.map((w) => (
            <li
              key={w}
              className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10.5px] font-semibold text-amber-800"
            >
              <XCircle className="mt-0.5 h-3 w-3 shrink-0" /> {w}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}