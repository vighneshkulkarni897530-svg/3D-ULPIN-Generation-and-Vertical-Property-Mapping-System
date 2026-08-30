"use client";

import * as React from "react";
import { PropertyItem } from "@/types";
import { ZoomIn, ZoomOut, Layers, RotateCcw, Route, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapPanelProps {
  property?: PropertyItem;
  showLabels?: boolean;
  height?: number;
  className?: string;
}

/**
 * Lightweight interactive SVG cadastral map — property boundary polygon,
 * nearby roads, land parcels, landmarks and a location marker. Used for
 * dashboards and side-panel map previews where a full canvas map is too heavy.
 */
export function MapPanel({ property, showLabels = true, height = 260, className }: MapPanelProps) {
  const [zoom, setZoom] = React.useState(1);
  const [layer, setLayer] = React.useState<"cadastral" | "satellite" | "zoning">("cadastral");
  const [selected, setSelected] = React.useState<string | null>(property?.ulpin ?? null);

  const W = 800;
  const H = 500;

  // Deterministic pseudo-random polygon from the property ULPIN
  const seed = property ? parseInt(property.ulpin.slice(-4), 10) || 42 : 42;
  const polyPoints = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const r = 120 + ((seed * (i + 3)) % 40) - 20;
    return [W / 2 + Math.cos(angle) * r, H / 2 + Math.sin(angle) * r * 0.78];
  });

  const roads = [
    { y: H * 0.28, name: "Outer Ring Road" },
    { y: H * 0.72, name: "Service Lane" },
    { x: W * 0.22, name: "BH Road" },
  ];

  const landmarks = [
    { x: W * 0.18, y: H * 0.2, label: "City Park" },
    { x: W * 0.82, y: H * 0.25, label: "Metro Station" },
    { x: W * 0.8, y: H * 0.8, label: "Municipal Tower" },
  ];

  const bg = layer === "satellite" ? "#0a1f2a" : layer === "zoning" ? "#0e1b3d" : "#0B1120";
  const gridColor = layer === "satellite" ? "#16405a" : "#1E293B";

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-tech-lg relative", className)}>
      {/* Layer toolbar */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5">
        {(["cadastral", "satellite", "zoning"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLayer(l)}
            className={cn(
              "rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors",
              layer === l ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-300" : "border-slate-700 bg-slate-900 text-slate-400 hover:text-white"
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Zoom + reset controls */}
      <div className="absolute right-3 top-3 z-10 flex flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
        <button onClick={() => setZoom((z) => Math.min(z + 0.25, 2))} className="p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setZoom((z) => Math.max(z - 0.25, 0.6))} className="border-t border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setZoom(1)} className="border-t border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative w-full overflow-hidden" style={{ height }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full"
          style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.3s ease" }}
        >
          {/* Background + grid */}
          <rect width={W} height={H} fill={bg} />
          {Array.from({ length: 20 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={H} stroke={gridColor} strokeWidth={0.6} opacity={0.6} />
          ))}
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 40} x2={W} y2={i * 40} stroke={gridColor} strokeWidth={0.6} opacity={0.6} />
          ))}

          {/* Roads */}
          {roads.map((r) =>
            r.y !== undefined ? (
              <g key={r.name}>
                <rect x={0} y={r.y - 5} width={W} height={10} fill="#334155" opacity={0.7} />
                <line x1={0} y1={r.y} x2={W} y2={r.y} stroke="#e2e8f0" strokeWidth={2} strokeDasharray="14 10" opacity={0.35} />
                {showLabels && (
                  <text x={12} y={r.y + (r.y < H / 2 ? 18 : -8)} fill="#7dd3fc" fontSize={12} fontWeight={700} opacity={0.8}>
                    {r.name}
                  </text>
                )}
              </g>
            ) : (
              <g key={r.name}>
                <rect x={(r.x ?? W / 2) - 5} y={0} width={10} height={H} fill="#334155" opacity={0.7} />
                <line x1={r.x ?? W / 2} y1={0} x2={r.x ?? W / 2} y2={H} stroke="#e2e8f0" strokeWidth={2} strokeDasharray="14 10" opacity={0.35} />
                {showLabels && (
                  <text x={(r.x ?? W / 2) - 12} y={26} fill="#7dd3fc" fontSize={12} fontWeight={700} textAnchor="end" opacity={0.8}>
                    {r.name}
                  </text>
                )}
              </g>
            )
          )}

          {/* Adjacent parcels */}
          {property?.adjacentParcels?.map((p, i) => {
            const dirs = [
              { dx: 0, dy: -1.6 },
              { dx: 1.7, dy: 0 },
              { dx: 0, dy: 1.6 },
              { dx: -1.7, dy: 0 },
            ];
            const cx = W / 2 + dirs[i % dirs.length].dx * 150 * zoom * 0.8;
            const cy = H / 2 + dirs[i % dirs.length].dy * 130 * zoom * 0.8;
            return (
              <rect key={p.ulpin} x={cx - 90} y={cy - 70} width={180} height={140} rx={8} fill="#1e293b80" stroke="#475569" strokeWidth={1} strokeDasharray="6 5" />
            );
          })}

          {/* Main parcel polygon */}
          <polygon
            points={polyPoints.map(([x, y]) => `${x},${y}`).join(" ")}
            fill={selected === property?.ulpin ? "#06b6d433" : "#06b6d421"}
            stroke={selected === property?.ulpin ? "#22d3ee" : "#06b6d4"}
            strokeWidth={2.5}
            className="cursor-pointer transition-all"
            onClick={() => setSelected(property?.ulpin ?? null)}
          />
          {/* Boundary gripper stones */}
          {polyPoints.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={4.5} fill="#0B1120" stroke="#22d3ee" strokeWidth={2} />
          ))}

          {/* Location marker */}
          <g transform={`translate(${W / 2}, ${H / 2 - 8})`}>
            <path d="M0,-18 C10,-6 14,2 0,20 C-14,2 -10,-6 0,-18 Z" fill="#06B6D4" stroke="#fff" strokeWidth={2} />
            <circle cx={0} cy={2} r={6} fill="#0B1120" />
          </g>

          {/* Landmarks */}
          {showLabels &&
            landmarks.map((lm) => (
              <g key={lm.label}>
                <circle cx={lm.x} cy={lm.y} r={7} fill="#3b82f680" stroke="#60a5fa" strokeWidth={1.5} />
                <rect x={lm.x - 55} y={lm.y - 30} width={110} height={18} rx={9} fill="#0f172acc" stroke="#475569" />
                <text x={lm.x} y={lm.y - 17} textAnchor="middle" fill="#93c5fd" fontSize={11} fontWeight={600}>
                  {lm.label}
                </text>
              </g>
            ))}

          {/* Property info popup */}
          {selected && property && (
            <g transform="translate(190, 78)">
              <rect width={225} height={74} rx={10} fill="#0f172af2" stroke="#06b6d4aa" strokeWidth={1} />
              <text x={12} y={20} fill="#22d3ee" fontSize={11} fontWeight={800}>
                {property.title.slice(0, 26)}
              </text>
              <text x={12} y={38} fill="#94a3b8" fontSize={10}>
                ULPIN {property.ulpin}
              </text>
              <text x={12} y={56} fill="#4ade80" fontSize={10} fontWeight={700}>
                Survey {property.landDetails.surveyNumber} • {property.landDetails.landAreaAcres} acres
              </text>
            </g>
          )}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-10 rounded-lg border border-slate-700 bg-slate-900/90 px-2.5 py-2 text-[9px] text-slate-300 backdrop-blur">
          <span className="mb-1 flex items-center gap-1.5 font-bold uppercase tracking-wider">Legend</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-cyan-500" /> Target Parcel
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm border border-dashed border-slate-400" /> Adjacent Parcel
          </span>
          <span className="flex items-center gap-1.5">
            <Route className="h-2.5 w-2.5 text-slate-400" /> <Landmark className="h-2.5 w-2.5 text-blue-400" /> Road / Landmark
          </span>
        </div>
      </div>
    </div>
  );
}