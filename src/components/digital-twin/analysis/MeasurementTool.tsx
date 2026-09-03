"use client";

import React from "react";
import { Ruler, Trash2, X, Info, CheckCircle2 } from "lucide-react";
import { useDigitalTwinInspection } from "@/context/DigitalTwinInspectionContext";
import { cn } from "@/lib/utils";

interface MeasurementToolProps {
  className?: string;
}

export function MeasurementTool({ className }: MeasurementToolProps) {
  const {
    measurementMode,
    measurePointA,
    measurePointB,
    measuredDistance,
    clearMeasurement,
    toggleMeasurementMode,
  } = useDigitalTwinInspection();

  if (!measurementMode) return null;

  return (
    <div
      className={cn(
        "dt-hud dt-card-accent w-full max-w-[290px] rounded-2xl p-3.5 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md",
        className
      )}
    >
      {/* ── Header ── */}
      <div className="mb-2.5 flex items-center justify-between border-b border-[#164E73]/60 pb-2">
        <div className="flex items-center gap-1.5">
          <Ruler className="h-4 w-4 text-[#00D9FF]" />
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8FAFC]">
              3D Measurement Tool
            </h4>
            <span className="text-[8px] font-semibold text-[#00D9FF]">
              Point-to-Point Raycast
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleMeasurementMode}
          title="Exit Measurement Mode"
          className="rounded-md p-1 text-[#64748B] hover:bg-[#061426] hover:text-[#F8FAFC]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Instructions / Status Banner ── */}
      <div className="mb-3 rounded-lg border border-[#164E73]/70 bg-[#061426] p-2.5">
        {!measurePointA && (
          <p className="flex items-center gap-1.5 text-[9px] font-bold text-[#00D9FF]">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#00D9FF]/20 text-[8px] font-black">
              1
            </span>
            Click on any building or ground point in the 3D scene.
          </p>
        )}
        {measurePointA && !measurePointB && (
          <p className="flex items-center gap-1.5 text-[9px] font-bold text-[#FACC15]">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FACC15]/20 text-[8px] font-black">
              2
            </span>
            Click a second point to measure distance.
          </p>
        )}
        {measurePointA && measurePointB && (
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-[9px] font-bold text-[#22C55E]">
              <CheckCircle2 className="h-3.5 w-3.5" /> Measurement Complete
            </p>
            <div className="flex items-baseline justify-between border-t border-[#164E73]/50 pt-1">
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-[#94A3B8]">
                Approx. Distance
              </span>
              <span className="font-mono text-base font-black text-[#00D9FF]">
                {measuredDistance !== null ? `${measuredDistance.toFixed(2)} m` : "—"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Point Telemetry ── */}
      <div className="mb-3 grid grid-cols-2 gap-1.5 font-mono text-[8px]">
        <div className="rounded-lg border border-[#164E73]/50 bg-[#061426]/60 p-2">
          <span className="font-bold uppercase tracking-wider text-[#00D9FF]">Point A</span>
          <p className="mt-0.5 text-[#F8FAFC]">
            {measurePointA
              ? `X: ${measurePointA.x.toFixed(1)} | Y: ${measurePointA.y.toFixed(1)} | Z: ${measurePointA.z.toFixed(1)}`
              : "Not placed"}
          </p>
        </div>
        <div className="rounded-lg border border-[#164E73]/50 bg-[#061426]/60 p-2">
          <span className="font-bold uppercase tracking-wider text-[#FACC15]">Point B</span>
          <p className="mt-0.5 text-[#F8FAFC]">
            {measurePointB
              ? `X: ${measurePointB.x.toFixed(1)} | Y: ${measurePointB.y.toFixed(1)} | Z: ${measurePointB.z.toFixed(1)}`
              : "Not placed"}
          </p>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={clearMeasurement}
          disabled={!measurePointA}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[9px] font-black uppercase tracking-wider transition-colors",
            measurePointA
              ? "border-[#EF4444]/60 bg-[#EF4444]/10 text-red-300 hover:bg-[#EF4444]/20"
              : "cursor-not-allowed border-[#164E73]/30 text-[#64748B]"
          )}
        >
          <Trash2 className="h-3 w-3" /> Clear Points
        </button>
      </div>

      {/* ── Disclaimer ── */}
      <div className="mt-2.5 flex items-start gap-1 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2 text-[8px] leading-relaxed text-cyan-300/80">
        <Info className="mt-0.5 h-2.5 w-2.5 shrink-0 text-cyan-400" />
        <span>Approximate 3D measurement in local Three.js coordinates. Not a legal cadastral land survey.</span>
      </div>
    </div>
  );
}
