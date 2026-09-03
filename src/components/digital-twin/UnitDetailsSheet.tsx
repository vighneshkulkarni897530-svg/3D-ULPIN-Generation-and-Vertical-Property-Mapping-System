"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, User, Ruler, FileText, Home, Fingerprint, Hash, TrendingUp,
} from "lucide-react";
import { TwinUnit } from "@/data/mockDigitalTwin";
import { UnitStatusBadge } from "./PropertyUnitGrid";
import { cn } from "@/lib/utils";

interface UnitDetailsSheetProps {
  unit: TwinUnit | null;
  onClose: () => void;
  className?: string;
}

/** Animated side sheet showing full cadastral details for a unit. */
export function UnitDetailsSheet({ unit, onClose, className }: UnitDetailsSheetProps) {
  return (
    <AnimatePresence>
      {unit && (
        <motion.div
          key="unit-sheet"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={cn("relative", className)}
        >
          <div className="dt-hud dt-card-accent dt-corners relative rounded-2xl p-5">
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute right-3 top-3 rounded-lg border border-[#164E73] bg-[#061426] p-1.5 text-[#94A3B8] transition-colors hover:text-[#00D9FF]"
              title="Close panel"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="pr-6">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#00D9FF]">
                Unit Details
              </span>
              <h3 className="mt-1 flex items-center gap-2.5 font-mono text-lg font-black tracking-tight text-[#F8FAFC]">
                {unit.number}
                <UnitStatusBadge status={unit.status} />
              </h3>
              <p className="mt-0.5 font-mono text-[10px] text-[#64748B]">
                {unit.taxAssessment} · Floor {unit.floorLevel === 0 ? "Ground" : unit.floorLevel}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { icon: Ruler, label: "Area", value: `${unit.areaSqFt.toLocaleString("en-IN")} sq.ft` },
                { icon: Home, label: "Type", value: unit.type.replace(/_/g, " ") },
                { icon: Home, label: "Occupancy", value: unit.occupancy },
                { icon: TrendingUp, label: "Health Score", value: `${unit.healthScore}%` },
              ].map((row) => (
                <div key={row.label} className="rounded-xl border border-[#164E73]/60 bg-[#061426] p-2.5">
                  <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-[#64748B]">
                    <row.icon className="h-2.5 w-2.5 text-[#00D9FF]" /> {row.label}
                  </span>
                  <p className="mt-1 truncate text-[11px] font-black text-[#F8FAFC]">{row.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-[#164E73]/60 bg-[#061426] p-3">
              <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-[#64748B]">
                <User className="h-2.5 w-2.5 text-[#8B5CF6]" /> Registered Owner
              </span>
              <p className="mt-1 text-xs font-black text-[#F8FAFC]">{unit.ownerName}</p>
              <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] text-[#64748B]">
                <Fingerprint className="h-2.5 w-2.5" /> {unit.ownerAadhaarMasked}
              </p>
            </div>

            {unit.fromRegistry ? (
              /* ── Phase 19 — canonical registry unit panel (honest data) ── */
              <>
                <div className="mt-3 rounded-xl border border-[#00D9FF]/40 bg-[#00D9FF]/5 p-3">
                  <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-[#00D9FF]">
                    <Fingerprint className="h-2.5 w-2.5" /> Demo Spatial Identifier
                  </span>
                  <p className="mt-1 break-all font-mono text-[11px] font-black text-[#F8FAFC]">
                    {unit.demoSpatialId ?? "—"}
                  </p>
                  <p className="mt-0.5 break-all font-mono text-[9px] text-[#64748B]">
                    Registry ID: {unit.propertyRecordId ?? unit.id}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-[#FACC15]/40 bg-[#FACC15]/5 p-2.5 text-center">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[#64748B]">Data Status</p>
                    <p className="mt-1 text-[11px] font-black text-[#FACC15]">DEMO</p>
                  </div>
                  <div className="rounded-xl border border-[#FACC15]/40 bg-[#FACC15]/5 p-2.5 text-center">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[#64748B]">Official ULPIN</p>
                    <p className="mt-1 text-[11px] font-black text-[#FACC15]">NO</p>
                  </div>
                  <div className="rounded-xl border border-[#164E73]/60 bg-[#061426] p-2.5 text-center">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[#64748B]">Source</p>
                    <p className="mt-1 text-[11px] font-black text-[#F8FAFC]">Illustrative</p>
                  </div>
                </div>
                <p className="mt-3 rounded-xl border border-[#FACC15]/30 bg-[#FACC15]/5 px-3 py-2 text-[9px] font-semibold leading-relaxed text-[#FACC15]">
                  DEMO DATA — NOT AN OFFICIAL GOVERNMENT CADASTRAL RECORD
                </p>
              </>
            ) : (
              <div className="mt-3 rounded-xl border border-[#164E73]/60 bg-[#061426] p-3">
                <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-[#64748B]">
                  <FileText className="h-2.5 w-2.5 text-[#008CFF]" /> Cadastral Records
                </span>
                <div className="mt-2 space-y-1.5">
                  {["Title deed", "Khata extract", "Tax receipts"].map((doc, i) => (
                    <div key={doc} className="flex items-center justify-between text-[10px]">
                      <span className="text-[#94A3B8]">{doc}</span>
                      <span className="flex items-center gap-1 font-black uppercase tracking-wide text-[#22C55E]">
                        <Hash className="h-2.5 w-2.5" /> Sealed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}