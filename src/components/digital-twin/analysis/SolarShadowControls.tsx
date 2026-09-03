"use client";

import React, { useMemo } from "react";
import { Sun, SunMedium, X, Info } from "lucide-react";
import { useDigitalTwinInspection } from "@/context/DigitalTwinInspectionContext";
import { formatSolarTime } from "@/components/digital-twin/township/solarConfig";
import { cn } from "@/lib/utils";

interface SolarShadowControlsProps {
  className?: string;
}

export function SolarShadowControls({ className }: SolarShadowControlsProps) {
  const {
    shadowAnalysis,
    solarTimeMinutes,
    setSolarTimeMinutes,
    toggleShadowAnalysis,
  } = useDigitalTwinInspection();

  // Compute approximate sun position angles from time of day (minutes 360 to 1080)
  const { altitudeDeg, azimuthDeg } = useMemo(() => {
    // Normalised day fraction: 0 at 06:00, 0.5 at 12:00, 1.0 at 18:00
    const dayFraction = Math.max(0, Math.min(1, (solarTimeMinutes - 360) / 720));
    // Parabolic altitude: peaks at ~72 deg at noon
    const alt = Math.max(5, Math.sin(dayFraction * Math.PI) * 72);
    // Azimuth: sweeps ~80 deg (East) to ~280 deg (West)
    const az = 80 + dayFraction * 200;
    return {
      altitudeDeg: Math.round(alt),
      azimuthDeg: Math.round(az),
    };
  }, [solarTimeMinutes]);

  if (!shadowAnalysis) return null;

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
          <SunMedium className="h-4 w-4 text-[#FACC15]" />
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8FAFC]">
              Solar &amp; Shadow Analysis
            </h4>
            <span className="text-[8px] font-semibold text-[#FACC15]">
              Approximate Visualization
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleShadowAnalysis}
          title="Close Solar Controls"
          className="rounded-md p-1 text-[#64748B] hover:bg-[#061426] hover:text-[#F8FAFC]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Time Readout & Preset Buttons ── */}
      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-[#164E73]/60 bg-[#061426] px-2.5 py-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Simulated Time
          </span>
          <span className="font-mono text-sm font-black text-[#FACC15]">
            {formatSolarTime(solarTimeMinutes)}
          </span>
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-3 gap-1">
          {[
            { label: "Morning", mins: 8 * 60 },
            { label: "Noon", mins: 12 * 60 },
            { label: "Evening", mins: 17 * 60 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setSolarTimeMinutes(preset.mins)}
              className={cn(
                "rounded-md border py-1 text-[8.5px] font-black uppercase tracking-wider transition-colors",
                Math.abs(solarTimeMinutes - preset.mins) < 30
                  ? "border-[#FACC15]/80 bg-[#FACC15]/20 text-[#FACC15]"
                  : "border-[#164E73] bg-[#061426] text-[#94A3B8] hover:text-[#F8FAFC]"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Time Slider ── */}
      <div className="mb-3 space-y-1">
        <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-wider text-[#64748B]">
          <span>06:00 AM</span>
          <span>12:00 PM</span>
          <span>06:00 PM</span>
        </div>
        <input
          type="range"
          min={360}
          max={1080}
          step={15}
          value={solarTimeMinutes}
          onChange={(e) => setSolarTimeMinutes(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#061426] accent-[#FACC15]"
          aria-label="Simulated Time of Day"
        />
      </div>

      {/* ── Sun Telemetry ── */}
      <div className="grid grid-cols-2 gap-1.5 text-center">
        <div className="rounded-lg border border-[#164E73]/50 bg-[#061426]/80 py-1.5">
          <p className="text-[7.5px] font-bold uppercase tracking-wider text-[#64748B]">Sun Altitude</p>
          <p className="font-mono text-[10.5px] font-black text-[#F8FAFC]">{altitudeDeg}&deg;</p>
        </div>
        <div className="rounded-lg border border-[#164E73]/50 bg-[#061426]/80 py-1.5">
          <p className="text-[7.5px] font-bold uppercase tracking-wider text-[#64748B]">Sun Azimuth</p>
          <p className="font-mono text-[10.5px] font-black text-[#F8FAFC]">{azimuthDeg}&deg;</p>
        </div>
      </div>

      {/* ── Mandatory Disclaimer ── */}
      <div className="mt-2.5 flex items-start gap-1 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-[8px] leading-relaxed text-amber-300/80">
        <Info className="mt-0.5 h-2.5 w-2.5 shrink-0 text-amber-400" />
        <span>Approximate solar/shadow simulation for architectural spatial planning. Not a certified solar radiation audit.</span>
      </div>
    </div>
  );
}
