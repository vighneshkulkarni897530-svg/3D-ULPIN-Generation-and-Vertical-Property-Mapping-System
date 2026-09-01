"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { DATA_SOURCE_LEGEND, TOWNSHIP_LAYER_DEFS, TOWNSHIP_SITE, type TownshipLayerId, type TownshipLayerState } from "./townshipConfig";
import { cn } from "@/lib/utils";

/* ======================================================================
 * Township overlay panels — Phase 15A/15C.
 * All data shown here is static site metadata / illustrative-layer state.
 * No Firebase, ULPIN or verification data is invented in this component.
 * ==================================================================== */

interface TownshipLayerPanelProps {
  layers: TownshipLayerState;
  onToggle: (id: TownshipLayerId) => void;
  onClose: () => void;
  className?: string;
}

/** The current truth: geometry is illustrative; GIS/DB rows stay grey until real data lands. */
const ACTIVE_SOURCE_KEY = "illustrative";

/** Functional layer toggles + data-status legend. */
export function TownshipLayerPanel({ layers, onToggle, onClose, className }: TownshipLayerPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        "dt-hud dt-card-accent w-64 rounded-2xl p-3 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)]",
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between border-b border-[#164E73]/70 pb-1.5">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#00D9FF]">Layers</span>
        <button
          onClick={onClose}
          className="rounded-md border border-[#164E73] bg-[#061426] px-1.5 py-0.5 text-[8px] font-black text-[#94A3B8] transition-colors hover:border-[#00D9FF]/50 hover:text-[#00D9FF]"
        >
          OK
        </button>
      </div>

      <div className="grid grid-cols-1 gap-1">
        {TOWNSHIP_LAYER_DEFS.map((layer) => {
          const on = layers[layer.id];
          return (
            <button
              key={layer.id}
              disabled={!layer.available}
              onClick={() => onToggle(layer.id)}
              className={cn(
                "flex items-center justify-between rounded-lg border px-2 py-1 text-left text-[10px] font-semibold transition-colors",
                layer.available
                  ? "border-[#164E73]/70 bg-[#061426]/70 text-[#F8FAFC] hover:border-[#00D9FF]/50"
                  : "cursor-not-allowed border-[#164E73]/40 bg-[#061426]/30 text-[#64748B]",
                layer.available && on && "border-[#00D9FF]/40 bg-[#00D9FF]/10"
              )}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-2 w-2 rounded-sm border",
                    layer.available && on ? "border-[#00D9FF] bg-[#00D9FF]" : "border-[#4A6A82] bg-transparent"
                  )}
                />
                {layer.label}
              </span>
              {layer.available ? (
                <span className={cn("font-mono text-[8px]", on ? "text-[#00D9FF]" : "text-[#64748B]")}>
                  {on ? "ON" : "OFF"}
                </span>
              ) : (
                <span className="rounded border border-[#164E73] px-1 font-mono text-[7.5px] text-[#64748B]">
                  {layer.phase}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* data source legend (Phase 15C — from townshipConfig) */}
      <div className="mt-2.5 border-t border-[#164E73]/70 pt-2">
        <span className="mb-1.5 block text-[8px] font-black uppercase tracking-[0.2em] text-[#94A3B8]">
          Data Source
        </span>
        <div className="space-y-1">
          {DATA_SOURCE_LEGEND.map((row) => {
            const active = row.key === ACTIVE_SOURCE_KEY;
            return (
              <span
                key={row.key}
                className={cn(
                  "flex items-center gap-2 text-[9px] font-semibold",
                  active ? "text-[#00D9FF]" : "text-[#64748B]"
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: row.color }} />
                {row.label}
                {active && <span className="font-mono text-[7.5px] text-[#00D9FF]/80">← current</span>}
              </span>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/** Compact location information panel — collapsible on mobile. */
export function TownshipLocationPanel({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);

  // expanded by default on desktop, collapsed on mobile
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) setOpen(true);
  }, []);

  const rows: Array<[string, string]> = [
    ["Survey No", TOWNSHIP_SITE.surveyNo],
    ["Village", TOWNSHIP_SITE.village],
    ["Taluka", TOWNSHIP_SITE.taluka],
    ["District", TOWNSHIP_SITE.district],
    ["State", TOWNSHIP_SITE.state],
    ["PIN", TOWNSHIP_SITE.pin],
  ];

  return (
    <div className={cn("dt-hud dt-card-accent w-56 rounded-2xl shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)]", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#00D9FF]">
          <MapPin className="h-3 w-3" /> Location
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-[#94A3B8]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8]" />}
      </button>

      {open && (
        <div className="px-3 pb-2.5">
          <dl className="space-y-1 text-[10px]">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-2 border-b border-[#164E73]/40 pb-1 last:border-0">
                <dt className="font-semibold text-[#94A3B8]">{k}</dt>
                <dd className="font-mono font-bold text-[#F8FAFC]">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-2 rounded-lg border border-[#164E73]/70 bg-[#061426]/80 px-2 py-1.5">
            <p className="font-mono text-[10px] font-bold text-[#7CE8FF]">
              {TOWNSHIP_SITE.center.lat}, {TOWNSHIP_SITE.center.lng}
            </p>
            <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-[#64748B]">
              {TOWNSHIP_SITE.centerNote}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

