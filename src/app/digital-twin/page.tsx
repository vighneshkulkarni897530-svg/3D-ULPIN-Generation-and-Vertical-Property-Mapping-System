"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  Building2,
  MapPin,
  Compass,
  Layers,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Info,
  ExternalLink,
  Sparkles,
  Map as MapIcon,
  RotateCcw,
} from "lucide-react";
import {
  resolveSocietyBy3DUlpin,
  resolveSocietyByAnyId,
  getAllSociety3DUlpins,
  type Society3DUlpinRecord,
} from "@/lib/society/society3DUlpinRegistry";

// Dynamically import Leaflet 2D location preview with ssr: false
const Society2DLocationPreview = dynamic(
  () => import("@/components/society/Society2DLocationPreview").then((m) => m.Society2DLocationPreview),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 w-full items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 font-mono text-xs text-slate-400">
        Loading 2D GIS Location Preview...
      </div>
    ),
  }
);

export default function Society3DUlpinGatewayPage() {
  return (
    <Suspense fallback={<GatewayLoadingFallback />}>
      <GatewayContent />
    </Suspense>
  );
}

function GatewayLoadingFallback() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-950 p-6 text-slate-200">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        <p className="font-mono text-xs uppercase tracking-widest text-slate-400">
          Initializing Society 3D ULPIN Gateway...
        </p>
      </div>
    </div>
  );
}

function GatewayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [inputUlpin, setInputUlpin] = useState("");
  const [verifiedRecord, setVerifiedRecord] = useState<Society3DUlpinRecord | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const allSocieties = getAllSociety3DUlpins();

  // Auto-resolve if query parameters exist (?ulpin= or ?society= or ?parcel=)
  useEffect(() => {
    const ulpinParam = searchParams.get("ulpin");
    const societyParam = searchParams.get("society") || searchParams.get("societyId");
    const parcelParam = searchParams.get("parcel") || searchParams.get("parcelId");

    const queryKey = ulpinParam || societyParam || parcelParam;
    if (queryKey) {
      const match = resolveSocietyByAnyId(queryKey);
      if (match) {
        setInputUlpin(match.society3DUlpin);
        setVerifiedRecord(match);
        setHasSearched(true);
        setErrorMsg(null);
      } else {
        setInputUlpin(queryKey);
        setHasSearched(true);
        setErrorMsg(`Society 3D ULPIN / ID "${queryKey}" was not found in the registry.`);
      }
    }
  }, [searchParams]);

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputUlpin.trim()) {
      setErrorMsg("Please enter a Society 3D ULPIN identifier.");
      setVerifiedRecord(null);
      setHasSearched(true);
      return;
    }

    const match = resolveSocietyBy3DUlpin(inputUlpin) || resolveSocietyByAnyId(inputUlpin);
    setHasSearched(true);

    if (match) {
      setVerifiedRecord(match);
      setErrorMsg(null);
    } else {
      setVerifiedRecord(null);
      setErrorMsg(`❌ Society 3D ULPIN "${inputUlpin}" not found. Please verify the identifier or select a registered society below.`);
    }
  };

  const handleSelectQuickSociety = (soc: Society3DUlpinRecord) => {
    setInputUlpin(soc.society3DUlpin);
    setVerifiedRecord(soc);
    setHasSearched(true);
    setErrorMsg(null);
  };

  const handleResetSearch = () => {
    setInputUlpin("");
    setVerifiedRecord(null);
    setHasSearched(false);
    setErrorMsg(null);
  };

  const handleOpen3D = () => {
    if (!verifiedRecord) return;
    const targetProp = verifiedRecord.representativePropertyId || "PROP-MH-PUN-GVR-102";
    router.push(
      `/properties/${targetProp}/digital-twin?society=${verifiedRecord.societyId}&parcel=${verifiedRecord.parcelId}&ulpin=${verifiedRecord.society3DUlpin}`
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Gateway Header Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/40 p-6 shadow-2xl backdrop-blur sm:p-8">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" />
                3D SMART ULPIN DIGITAL TWIN GATEWAY
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Open Society 3D Digital Twin
              </h1>
              <p className="max-w-2xl text-xs text-slate-400 sm:text-sm">
                Enter the Society 3D ULPIN to validate cadastral identity, preview the 2D GIS location, and launch the society-specific 3D environment.
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1.5">
              <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-[10px] font-bold text-amber-300">
                Non-Official Digital Twin ID
              </span>
              <span className="text-[10px] text-slate-500">
                Demo & Illustrative Verification
              </span>
            </div>
          </div>
        </div>

        {/* ULPIN Verification Search Form */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
          <form onSubmit={handleVerify} className="space-y-4">
            <label htmlFor="ulpin-input" className="block text-xs font-extrabold uppercase tracking-wider text-slate-300">
              Enter Society 3D ULPIN
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  id="ulpin-input"
                  type="text"
                  value={inputUlpin}
                  onChange={(e) => setInputUlpin(e.target.value.toUpperCase())}
                  placeholder="e.g. S3D-MH-PUN-GVR-001"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3 pl-10 pr-4 font-mono text-sm font-bold text-cyan-200 placeholder-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-xs font-bold text-slate-950 shadow-tech-cyan transition-all hover:from-cyan-400 hover:to-blue-500 active:scale-95 sm:w-auto"
              >
                <ShieldCheck className="h-4 w-4" /> Verify Society
              </button>
              {hasSearched && (
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700 active:scale-95"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              )}
            </div>

            {/* Information Notice */}
            <p className="text-[11px] leading-relaxed text-slate-400">
              <strong className="text-slate-300">Notice:</strong> Your Digital Twin is dynamically generated from the society's registered site data and source plans. Cross-society scene sharing is strictly prohibited.
            </p>
          </form>

          {/* Quick Select Registered Societies */}
          <div className="mt-6 border-t border-slate-800/80 pt-5">
            <p className="mb-2.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              Or Select Registered Society from Catalog:
            </p>
            <div className="flex flex-wrap gap-2">
              {allSocieties.map((soc) => {
                const isSelected = verifiedRecord?.societyId === soc.societyId;
                return (
                  <button
                    key={soc.societyId}
                    type="button"
                    onClick={() => handleSelectQuickSociety(soc)}
                    className={`group flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-xs font-medium transition-all ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-tech-cyan"
                        : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60"
                    }`}
                  >
                    <Building2 className={`h-3.5 w-3.5 ${isSelected ? "text-cyan-300" : "text-slate-500 group-hover:text-cyan-400"}`} />
                    <span className="font-bold">{soc.societyName}</span>
                    <span className="font-mono text-[10px] text-slate-500 group-hover:text-slate-400">
                      [{soc.society3DUlpin}]
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Verification Result Card */}
        {errorMsg && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-xs font-semibold text-red-300 shadow-lg backdrop-blur">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <div className="space-y-1">
                <p className="font-bold">{errorMsg}</p>
                <p className="text-[11px] text-red-400/80">
                  Please check the ULPIN code spelling or choose one of the configured societies above.
                </p>
              </div>
            </div>
          </div>
        )}

        {verifiedRecord && (
          <div className="space-y-6">
            {/* Society Verified Cadastral Card */}
            <div className="rounded-2xl border border-cyan-500/40 bg-slate-900/80 p-6 shadow-2xl backdrop-blur">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                      Identity Verified
                    </span>
                    <h2 className="text-xl font-bold text-white">{verifiedRecord.societyName}</h2>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="rounded-lg border border-cyan-500/30 bg-cyan-950/60 px-3 py-1 font-bold text-cyan-300">
                    {verifiedRecord.society3DUlpin}
                  </span>
                  <span className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-300">
                    {verifiedRecord.surveyNumber}
                  </span>
                </div>
              </div>

              {/* Cadastral Specs Grid */}
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Parcel ID</p>
                  <p className="font-mono text-xs font-extrabold text-slate-200">{verifiedRecord.parcelId}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Location / Ward</p>
                  <p className="text-xs font-bold text-slate-200 truncate">{verifiedRecord.locationName}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Area & Buildings</p>
                  <p className="text-xs font-extrabold text-cyan-300">
                    {verifiedRecord.areaSqMeters} m² · {verifiedRecord.totalBuildings} Bldgs ({verifiedRecord.totalFloors} Fl)
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">3D Twin Status</p>
                  <p className="text-xs font-extrabold text-emerald-400">
                    {verifiedRecord.digitalTwinStatus} ({verifiedRecord.digitalTwinVersion})
                  </p>
                </div>
              </div>

              {/* Disclaimer Notice */}
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3.5 py-2 text-[11px] text-amber-300">
                <Info className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Disclaimer:</strong> This Society 3D ULPIN is a digital-twin identifier generated for 3D spatial mapping and does not constitute an official government survey deed.
                </span>
              </div>
            </div>

            {/* 2D Society Location Preview */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                    <MapIcon className="h-4 w-4 text-cyan-400" />
                    2D Cadastral Location Verification
                  </h3>
                  <p className="text-xs text-slate-400">
                    Confirm society boundaries and building footprints on the survey grid before loading the 3D twin.
                  </p>
                </div>
                <Link
                  href={`/map?society=${verifiedRecord.societyId}&parcel=${verifiedRecord.parcelId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Full GIS Workspace
                </Link>
              </div>

              {/* 2D Location Leaflet Canvas */}
              <div className="h-72 w-full overflow-hidden rounded-xl border border-slate-800 shadow-inner">
                <Society2DLocationPreview record={verifiedRecord} />
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-xs font-bold text-slate-200 hover:bg-slate-700 active:scale-95"
                >
                  <Search className="h-4 w-4" /> Search Another Society
                </button>
                <button
                  type="button"
                  onClick={handleOpen3D}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 px-7 py-3 text-xs font-extrabold text-slate-950 shadow-tech-cyan transition-all hover:scale-105 active:scale-95"
                >
                  <Compass className="h-4 w-4" /> Open 3D Digital Twin <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
