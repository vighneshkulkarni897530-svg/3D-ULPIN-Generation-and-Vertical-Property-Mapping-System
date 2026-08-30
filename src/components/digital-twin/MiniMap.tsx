"use client";

import React from "react";
import { MapPin, Building2, Route } from "lucide-react";
import { TwinBuildingInfo } from "@/data/mockDigitalTwin";

interface MiniMapProps {
  building: TwinBuildingInfo;
  className?: string;
}

/**
 * Dark cyber mini-map showing property boundary (neon cyan),
 * adjacent roads and a building marker. Pure SVG — no external tiles.
 */
export function DigitalTwinMiniMap({ building, className }: MiniMapProps) {
  const W = 340;
  const H = 200;

  // Approximate road lines across the map
  const roads = [
    { name: "Baner-Pashan Link Rd", y: H * 0.3 },
    { name: "Service Road", y: H * 0.78 },
  ];
  const verticalRoad = { x: W * 0.24 };

  return (
    <div className={`dt-hud dt-card-accent dt-corners relative overflow-hidden rounded-2xl ${className ?? ""}`}>
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8FAFC]">
          Map & Property Boundary
        </span>
        <span className="flex items-center gap-1 font-mono text-[8px] text-[#64748B]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
          WGS 84 / UTM 43N
        </span>
      </div>

      <div className="relative">
        {/* Dark map background */}
        <div className="dt-grid-overlay absolute inset-0 bg-[#050F20]" />
        <svg viewBox={`0 0 ${W} ${H}`} className="relative h-full w-full" style={{ minHeight: 190 }}>
          {/* soft radial glows */}
          <defs>
            <radialGradient id="mm-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(0,140,255,0.28)" />
              <stop offset="100%" stopColor="rgba(0,140,255,0)" />
            </radialGradient>
          </defs>
          <ellipse cx={W / 2} cy={H / 2} rx={90} ry={70} fill="url(#mm-glow)" />

          {/* Roads */}
          {roads.map((r) => (
            <g key={r.name}>
              <rect x={0} y={r.y - 6} width={W} height={12} fill="rgba(26,58,90,0.6)" />
              <line x1={0} y1={r.y} x2={W} y2={r.y} stroke="#3B6E96" strokeWidth={1} strokeDasharray="10 8" />
              <text x={8} y={r.y - 10} fill="#64829E" fontSize={7} fontWeight={700}>{r.name}</text>
            </g>
          ))}
          <rect x={verticalRoad.x - 6} y={0} width={12} height={H} fill="rgba(26,58,90,0.5)" />
          <line x1={verticalRoad.x} y1={0} x2={verticalRoad.x} y2={H} stroke="#3B6E96" strokeWidth={1} strokeDasharray="10 8" />

          {/* Property boundary — neon cyan */}
          <polygon
            points={`${W / 2 - 62},${H / 2 - 34} ${W / 2 + 62},${H / 2 - 34} ${W / 2 + 55},${H / 2 + 36} ${W / 2 - 58},${H / 2 + 36}`}
            fill="rgba(0,217,255,0.08)"
            stroke="#00D9FF"
            strokeWidth={1.5}
            style={{ filter: "drop-shadow(0 0 5px rgba(0,217,255,0.7))" }}
          />
          {[
            [W / 2 - 62, H / 2 - 34],
            [W / 2 + 62, H / 2 - 34],
            [W / 2 + 55, H / 2 + 36],
            [W / 2 - 58, H / 2 + 36],
          ].map(([px, py], i) => (
            <circle key={i} cx={px} cy={py} r={2.5} fill="#020B18" stroke="#00D9FF" strokeWidth={1.5} />
          ))}

          {/* Building marker */}
          <g transform={`translate(${W / 2}, ${H / 2 - 4})`}>
            <path d="M0,-16 C9,-5 12,2 0,16 C-12,2 -9,-5 0,-16 Z" fill="#00D9FF" stroke="#7CE8FF" strokeWidth={1} opacity={0.95} />
            <circle cx={0} cy={-1} r={4} fill="#020B18" />
          </g>
          {/* Building footprint */}
          <rect x={W / 2 - 16} y={H / 2 + 8} width={32} height={18} rx={2} fill="rgba(0,140,255,0.35)" stroke="#008CFF" strokeWidth={1.2} />

          {/* Land boundary (outer dashed) */}
          <rect
            x={W / 2 - 88}
            y={H / 2 - 52}
            width={176}
            height={104}
            rx={6}
            fill="none"
            stroke="rgba(22,78,115,0.8)"
            strokeWidth={1.2}
            strokeDasharray="5 6"
          />

          {/* Building label */}
          <g transform={`translate(${W / 2 + 52}, ${H / 2 - 46})`}>
            <rect x={-4} y={-11} width={92} height={16} rx={8} fill="rgba(2,11,24,0.85)" stroke="#164E73" />
            <text x={0} y={0} fill="#00D9FF" fontSize={6.5} fontWeight={800}>Green Valley Residency</text>
          </g>
        </svg>

        {/* Overlay chips */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md border border-[#164E73] bg-[#020B18]/85 px-2 py-1">
          <Building2 className="h-2.5 w-2.5 text-[#00D9FF]" />
          <span className="text-[8px] font-bold text-[#94A3B8]">Survey 48/A</span>
        </div>
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-md border border-[#164E73] bg-[#020B18]/85 px-2 py-1">
          <Route className="h-2.5 w-2.5 text-[#008CFF]" />
          <span className="text-[8px] font-bold text-[#94A3B8]">3 roads</span>
        </div>
        <div className="absolute left-2 top-0 flex items-center gap-1 pt-2 text-[8px] font-mono text-[#64748B]">
          <MapPin className="h-2.5 w-2.5 text-[#8B5CF6]" />
          {building.latitude.toFixed(4)}°N, {building.longitude.toFixed(4)}°E
        </div>
      </div>
    </div>
  );
}