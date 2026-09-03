"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGIS } from "@/context/GISContext";
import { useRenewals } from "@/context/RenewalContext";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Building as BuildingIcon,
  Layers,
  Home,
  Ruler,
  Calendar,
  MapPin,
  X,
  Plus,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { Building } from "@/types/gis";
import type { PropertyRenewalRecord } from "@/types/renewal";
import { calculateBuildingAge, calculateNextReviewDate } from "@/lib/renewals/renewalCalculator";

interface RegisterBuildingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RegisterBuildingModal: React.FC<RegisterBuildingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { role, currentUser } = useAuth();
  const { parcels, addBuilding } = useGIS();
  const { toast } = useToast();

  const [buildingName, setBuildingName] = useState("");
  const [buildingCode, setBuildingCode] = useState("");
  const [structureType, setStructureType] = useState("RESIDENTIAL");
  const [totalFloors, setTotalFloors] = useState<number>(6);
  const [totalUnits, setTotalUnits] = useState<number>(24);
  const [builtUpArea, setBuiltUpArea] = useState<number>(28000);
  const [constructionYear, setConstructionYear] = useState<number>(2024);
  const [selectedParcelId, setSelectedParcelId] = useState(parcels[0]?.id || "parcel-pune-001");
  const [address, setAddress] = useState("Survey No. 42/B, Shivaji Nagar, Pune, Maharashtra 411005");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  // Strict RBAC safety check
  if (role !== "ADMIN") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-slate-900 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-500 mb-3" />
          <h3 className="text-base font-bold text-white">Access Restricted</h3>
          <p className="mt-1 text-xs text-slate-400">
            Only Authorized Society Secretaries have permission to register new buildings in the cadastre registry.
          </p>
          <button
            onClick={onClose}
            className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const societyName = currentUser.societyName || "Green Valley Co-operative Housing Society";
  const societyRegNo = currentUser.societyRegNo || "PUN/HSG/2016/48201";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const generatedId = `bldg-${Date.now().toString(36)}`;
    const finalCode = buildingCode.trim() || `B-${Math.floor(100 + Math.random() * 900)}`;
    const matchedParcel = parcels.find((p) => p.id === selectedParcelId) || parcels[0];

    const newBuilding: Building = {
      id: generatedId,
      parcelId: selectedParcelId,
      name: buildingName.trim(),
      buildingCode: finalCode,
      address: address.trim(),
      latitude: matchedParcel?.latitude ?? 18.5204,
      longitude: matchedParcel?.longitude ?? 73.8567,
      height: totalFloors * 3.2,
      totalFloors,
      builtUpArea,
      yearBuilt: constructionYear,
      geometry: {
        type: "Point",
        coordinates: [matchedParcel?.longitude ?? 73.8567, matchedParcel?.latitude ?? 18.5204],
      },
      status: "ACTIVE",
    };

    // Update GIS building registry
    addBuilding(newBuilding);

    setSubmitting(false);
    toast({
      variant: "success",
      title: "Building Registered Successfully",
      description: `${newBuilding.name} (${newBuilding.buildingCode}) registered into ${societyName} registry.`,
    });

    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 rounded-3xl border border-slate-800 bg-slate-900/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-300 border border-indigo-500/30">
                Society Secretary Exclusive Action
              </span>
              <span className="text-[10px] font-mono text-slate-400">ULPIN 3.0 Building Onboarding</span>
            </div>
            <h3 className="mt-1 text-xl font-black text-white">Register New Society Building</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Register a newly constructed or surveyed building wing into the official cadastral registry.
            </p>
          </div>
        </div>

        {/* Society Credentials Strip */}
        <div className="mb-6 rounded-2xl border border-indigo-500/30 bg-indigo-950/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-indigo-300">Authorized Society</p>
              <p className="font-extrabold text-white">{societyName}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-indigo-300">Society Reg. Number</p>
              <p className="font-mono font-bold text-indigo-200">{societyRegNo}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-indigo-300">Registered By</p>
              <p className="font-bold text-slate-300">{currentUser.name} (Secretary)</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Building Wing / Tower Name
              </label>
              <div className="relative">
                <BuildingIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  placeholder="e.g. Tower D - Sun Valley"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-xs font-medium text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Building Code / Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={buildingCode}
                  onChange={(e) => setBuildingCode(e.target.value)}
                  placeholder="e.g. B-108"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-xs font-mono font-medium text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Structure Type
              </label>
              <select
                value={structureType}
                onChange={(e) => setStructureType(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-xs font-semibold text-white outline-none focus:border-indigo-500"
              >
                <option value="RESIDENTIAL">Residential Complex</option>
                <option value="COMMERCIAL">Commercial Wing</option>
                <option value="MIXED_USE">Mixed Use</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Total Floors (G+N)
              </label>
              <div className="relative">
                <Layers className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="number"
                  min={1}
                  max={60}
                  required
                  value={totalFloors}
                  onChange={(e) => setTotalFloors(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-xs font-mono text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Total Units / Flats
              </label>
              <div className="relative">
                <Home className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="number"
                  min={1}
                  max={500}
                  required
                  value={totalUnits}
                  onChange={(e) => setTotalUnits(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-xs font-mono text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Built-Up Area (sq.ft)
              </label>
              <div className="relative">
                <Ruler className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="number"
                  min={100}
                  required
                  value={builtUpArea}
                  onChange={(e) => setBuiltUpArea(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-xs font-mono text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Completion / Construction Year
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="number"
                  min={1950}
                  max={2030}
                  required
                  value={constructionYear}
                  onChange={(e) => setConstructionYear(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-xs font-mono text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Cadastral Base Parcel
            </label>
            <select
              value={selectedParcelId}
              onChange={(e) => setSelectedParcelId(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-xs font-semibold text-white outline-none focus:border-indigo-500"
            >
              {parcels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.parcelNumber} · {p.location} ({p.district})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Building Physical Address
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-xs font-medium text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Registering Building...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Register Building into Cadastre
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
