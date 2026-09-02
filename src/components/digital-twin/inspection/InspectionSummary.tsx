"use client";

import React from "react";
import {
  FileText,
  Building2,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Fingerprint,
  Printer,
  X,
  Info,
} from "lucide-react";
import type { Building, Floor, LandParcel, PropertyUnit } from "@/types/gis";
import type { SpatialConflict } from "@/types/conflict";
import { cn } from "@/lib/utils";

interface InspectionSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  parcel?: LandParcel | null;
  building?: Building | null;
  floors?: Floor[];
  units?: PropertyUnit[];
  conflicts?: SpatialConflict[];
  selectedFloorNumber?: number | null;
  selectedFlatId?: string | null;
}

export function InspectionSummary({
  isOpen,
  onClose,
  parcel,
  building,
  floors = [],
  units = [],
  conflicts = [],
  selectedFloorNumber = null,
  selectedFlatId = null,
}: InspectionSummaryProps) {
  if (!isOpen) return null;

  const baseUlpin = parcel?.parcelNumber ?? "27412104101A8F";
  const buildingCode = building?.buildingCode ?? "A";
  const spatialBuildingId = `${baseUlpin}-BLD-${buildingCode}`;

  const selectedFloor = selectedFloorNumber !== null
    ? floors.find((f) => f.floorNumber === selectedFloorNumber)
    : null;

  const selectedFlat = selectedFlatId
    ? units.find((u) => u.id === selectedFlatId)
    : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="dt-hud dt-card-accent max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#164E73] p-6 shadow-2xl">
        {/* ── Top Bar ── */}
        <div className="flex items-start justify-between border-b border-[#164E73]/70 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#00D9FF]/40 bg-[#00D9FF]/10 text-[#00D9FF]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#00D9FF]">
                National Cadastre Engine v3.4
              </p>
              <h2 className="text-base font-black text-[#F8FAFC]">
                3D Property Spatial Inspection Summary
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg border border-[#164E73] bg-[#061426] px-3 py-1.5 text-[10px] font-bold text-[#F8FAFC] hover:border-[#00D9FF]/50"
            >
              <Printer className="h-3.5 w-3.5" /> Print / Export
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#061426] hover:text-[#F8FAFC]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Content Sections ── */}
        <div className="mt-4 space-y-4 text-[11px]">
          {/* Cadastral Core */}
          <div className="rounded-xl border border-[#164E73]/60 bg-[#061426]/70 p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#00D9FF]">
              <Fingerprint className="h-3 w-3" /> Society &amp; Cadastral Identifier
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 font-mono">
              <div>
                <span className="text-[8px] font-bold uppercase text-[#64748B]">Cadastral Base ULPIN</span>
                <p className="font-bold text-[#F8FAFC]">{baseUlpin}</p>
              </div>
              <div>
                <span className="text-[8px] font-bold uppercase text-[#64748B]">Parent Parcel ID</span>
                <p className="font-bold text-[#F8FAFC]">{parcel?.id ?? "life-republic"}</p>
              </div>
              <div>
                <span className="text-[8px] font-bold uppercase text-[#64748B]">State / District</span>
                <p className="font-bold text-[#F8FAFC]">{parcel?.state ?? "Maharashtra"} · {parcel?.district ?? "Pune"}</p>
              </div>
            </div>
          </div>

          {/* Building Overview */}
          {building && (
            <div className="rounded-xl border border-[#164E73]/60 bg-[#061426]/70 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#22C55E]">
                <Building2 className="h-3 w-3" /> Inspected Building Structure
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <span className="text-[8px] font-bold uppercase text-[#64748B]">Building Name</span>
                  <p className="font-bold text-[#F8FAFC]">{building.name}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold uppercase text-[#64748B]">Building Spatial ID</span>
                  <p className="font-mono font-bold text-[#F8FAFC]">{spatialBuildingId}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold uppercase text-[#64748B]">Total Floors</span>
                  <p className="font-mono font-bold text-[#F8FAFC]">{building.totalFloors}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold uppercase text-[#64748B]">Registered Units</span>
                  <p className="font-mono font-bold text-[#F8FAFC]">{units.length}</p>
                </div>
              </div>
            </div>
          )}

          {/* Selected Unit / Flat */}
          {selectedFlat && (
            <div className="rounded-xl border border-[#00D9FF]/40 bg-[#00D9FF]/5 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#00D9FF]">
                <Layers className="h-3 w-3" /> Selected Vertical Property Unit
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <span className="text-[8px] font-bold uppercase text-[#64748B]">Unit Number</span>
                  <p className="font-bold text-[#F8FAFC]">Unit {selectedFlat.unitNumber}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold uppercase text-[#64748B]">Property Type</span>
                  <p className="font-bold text-[#F8FAFC]">{selectedFlat.propertyType}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold uppercase text-[#64748B]">Carpet Area</span>
                  <p className="font-mono font-bold text-[#F8FAFC]">{selectedFlat.area} sq ft</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold uppercase text-[#64748B]">3D Vertical ULPIN</span>
                  <p className="font-mono font-bold text-[#00D9FF]">{selectedFlat.demoSpatialId}</p>
                </div>
              </div>
            </div>
          )}

          {/* Spatial Discrepancies */}
          <div className="rounded-xl border border-[#164E73]/60 bg-[#061426]/70 p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#EF4444]">
              <AlertTriangle className="h-3 w-3" /> Spatial Discrepancies &amp; Flags ({conflicts.length})
            </h3>
            {conflicts.length === 0 ? (
              <p className="text-[9.5px] text-[#94A3B8]">No active spatial conflicts recorded for this site.</p>
            ) : (
              <div className="space-y-1.5">
                {conflicts.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 p-2">
                    <div>
                      <span className="font-mono font-bold text-red-300">{c.conflictNumber}</span>
                      <p className="text-[9px] text-[#94A3B8]">{c.description}</p>
                    </div>
                    <span className="rounded border border-red-500/40 px-1.5 py-0.5 text-[8px] font-bold uppercase text-red-300">
                      {c.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mandatory Legal Notice */}
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[9px] leading-relaxed text-amber-300/90">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <div>
              <strong className="font-black">Inspection Notice:</strong> This summary is generated from the 3D ULPIN Property Inspection &amp; Spatial Analysis Workbench. All vertical elevations, solar projections, and spatial IDs are derived digital representations. Official land titles and survey certifications require verification by authorized Government Land Officers.
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#164E73] bg-[#061426] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-[#F8FAFC] hover:bg-[#0B2544]"
          >
            Close Summary
          </button>
        </div>
      </div>
    </div>
  );
}
