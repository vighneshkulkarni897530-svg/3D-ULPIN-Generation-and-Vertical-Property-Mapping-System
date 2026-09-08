"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  Layers,
  ArrowRight,
  Eye,
  RefreshCw,
  Trees,
  Car,
  Waves,
  ShieldCheck,
  AlertCircle,
  FileImage,
  Loader2,
  AlertTriangle,
  Info,
  Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Society } from "@/types/society";
import type { SocietyDigitalTwin, DigitalTwinStatus } from "@/types/digitalTwin";
import {
  getSocietyDigitalTwin,
  saveSocietyDigitalTwin,
} from "@/lib/digital-twin/digitalTwinRegistry";

interface Society3DSiteImageSectionProps {
  society: Society;
  isAdmin: boolean;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export function Society3DSiteImageSection({
  society,
  isAdmin,
}: Society3DSiteImageSectionProps) {
  const [digitalTwin, setDigitalTwin] = useState<SocietyDigitalTwin | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<DigitalTwinStatus>("SOURCE_IMAGE_REQUIRED");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(society.imageUrl || null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load digital twin from registry or server status on mount
  const syncDigitalTwinStatus = useCallback(async () => {
    // Check local registry first
    const localTwin = getSocietyDigitalTwin(society.id);
    if (localTwin) {
      setDigitalTwin(localTwin);
      setGenerationStatus(localTwin.generationStatus || "READY");
      if (localTwin.sourceImageUrl) {
        setPreviewImage(localTwin.sourceImageUrl);
      }
    }

    // Fetch server status
    try {
      const res = await fetch(`/api/digital-twin/status?societyId=${encodeURIComponent(society.id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status) {
          setGenerationStatus(data.status);
        }
        if (data.digitalTwin) {
          setDigitalTwin(data.digitalTwin);
          saveSocietyDigitalTwin(data.digitalTwin);
          if (data.digitalTwin.sourceImageUrl) {
            setPreviewImage(data.digitalTwin.sourceImageUrl);
          }
        }
      }
    } catch {
      // Fallback quietly to local state
    }
  }, [society.id]);

  useEffect(() => {
    syncDigitalTwinStatus();
  }, [syncDigitalTwinStatus]);

  // Polling helper if generation is currently in progress
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (generationStatus === "GENERATING" || generationStatus === "QUEUED") {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`/api/digital-twin/status?societyId=${encodeURIComponent(society.id)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "COMPLETED" || data.status === "READY") {
              setGenerationStatus(data.status);
              setIsGenerating(false);
              setProgressPercent(100);
              setStatusMessage("3D Digital Twin successfully generated!");
              if (data.digitalTwin) {
                setDigitalTwin(data.digitalTwin);
                saveSocietyDigitalTwin(data.digitalTwin);
              }
            } else if (data.status === "FAILED") {
              setGenerationStatus("FAILED");
              setIsGenerating(false);
              setErrorMessage(data.error || "Generation encountered an error.");
            } else {
              setGenerationStatus(data.status);
              setProgressPercent((prev) => Math.min(prev + 15, 85));
            }
          }
        } catch {
          // ignore poll error
        }
      }, 2500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [generationStatus, society.id]);

  // Client-side file validation & processing
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);

    // Validate type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      setErrorMessage("Unsupported file format. Please upload a PNG, JPG, JPEG, or WEBP image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate size (max 10MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 10MB limit. Please upload an image under 10MB.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setPreviewImage(dataUrl);
      await triggerGeneration(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Trigger server-side AI generation route
  const triggerGeneration = async (imageDataUrl: string) => {
    if (!isAdmin) {
      setErrorMessage("Citizen role is read-only. Only Society Administrators can generate 3D Digital Twins.");
      return;
    }

    setIsGenerating(true);
    setGenerationStatus("GENERATING");
    setProgressPercent(15);
    setStatusMessage("Uploading site layout & initiating Hugging Face 3D inference...");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/digital-twin/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "society_admin",
          "x-user-society": society.id,
        },
        body: JSON.stringify({
          societyId: society.id,
          societyName: society.name,
          imageDataUrl,
          role: "society_admin",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setGenerationStatus("FAILED");
        setIsGenerating(false);
        setErrorMessage(result.error || "3D generation request failed.");
        setStatusMessage(null);
        return;
      }

      if (result.status === "COMPLETED" || result.status === "READY") {
        setGenerationStatus("COMPLETED");
        setIsGenerating(false);
        setProgressPercent(100);
        setStatusMessage("3D Digital Twin synthesized successfully!");
        if (result.digitalTwin) {
          setDigitalTwin(result.digitalTwin);
          saveSocietyDigitalTwin(result.digitalTwin);
        }
        setTimeout(() => setStatusMessage(null), 4000);
      } else if (result.status === "GENERATING" || result.status === "QUEUED") {
        setGenerationStatus(result.status);
        setProgressPercent(40);
        setStatusMessage("AI 3D synthesis pipeline active in background...");
      } else {
        setGenerationStatus("FAILED");
        setIsGenerating(false);
        setErrorMessage(result.error || "Generation failed");
      }
    } catch (err) {
      setGenerationStatus("FAILED");
      setIsGenerating(false);
      setErrorMessage(err instanceof Error ? err.message : "Network error during 3D generation.");
      setStatusMessage(null);
    }
  };

  const handleRegenerate = async () => {
    if (previewImage) {
      await triggerGeneration(previewImage);
    }
  };

  const hasTwin =
    digitalTwin !== null &&
    (digitalTwin.buildings.length > 0 || !!digitalTwin.generatedModelUrl);

  const twinUrl = `/properties/${society.id}/digital-twin?societyId=${society.id}`;

  return (
    <Card className="border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white shadow-xl">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Building2 className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                AI 3D Digital Twin &amp; Site Model
              </h3>

              {/* Dynamic Status Badges */}
              {generationStatus === "COMPLETED" || generationStatus === "READY" || hasTwin ? (
                <Badge variant="success" className="gap-1 px-2 py-0.5 text-[10px] font-bold">
                  <CheckCircle2 className="h-3 w-3" /> 3D Generated ({digitalTwin?.sourceImageVersion || "v1"})
                </Badge>
              ) : generationStatus === "GENERATING" || generationStatus === "QUEUED" ? (
                <Badge variant="outline" className="gap-1 border-cyan-500/40 bg-cyan-500/10 text-cyan-300 px-2 py-0.5 text-[10px] font-bold animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" /> AI Generating 3D Twin...
                </Badge>
              ) : generationStatus === "FAILED" ? (
                <Badge variant="destructive" className="gap-1 px-2 py-0.5 text-[10px] font-bold">
                  <AlertCircle className="h-3 w-3" /> Generation Failed
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-400 px-2 py-0.5 text-[10px] font-bold">
                  <AlertCircle className="h-3 w-3" /> Source Image Required
                </Badge>
              )}
            </div>

            <p className="mt-1 text-xs text-slate-400">
              Each society features an isolated 3D digital twin generated from its uploaded site layout.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasTwin && (
              <Button
                size="sm"
                asChild
                className="gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-slate-950 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20"
              >
                <Link href={twinUrl}>
                  <Eye className="h-3.5 w-3.5" /> View 3D Digital Twin <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* ── Citizen View-Only Banner ── */}
        {!isAdmin && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-400">
            <Info className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>
              <strong className="text-slate-200">View-Only (Citizen Mode):</strong> Only Society Administrators or Cadastral Officers can upload site layouts or trigger 3D generation.
            </span>
          </div>
        )}

        {/* ── Status / Details Grid ── */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Left Column: Image Thumbnail & Upload */}
          <div className="space-y-3">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center group">
              {previewImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewImage}
                    alt={`${society.name} site plan`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowImageModal(true)}
                      className="rounded-lg bg-slate-900/90 p-2 text-xs font-bold text-cyan-300 border border-slate-700 hover:bg-slate-800"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center p-4 text-slate-500">
                  <FileImage className="h-8 w-8 text-slate-600" />
                  <span className="text-xs font-semibold">No Site Plan Image</span>
                  <span className="text-[10px] text-slate-500">PNG, JPG, WEBP &lt; 10MB</span>
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="flex flex-col gap-2">
                <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-500/40 bg-cyan-500/5 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/10 cursor-pointer transition-colors disabled:opacity-50">
                  <UploadCloud className="h-4 w-4" /> Upload Site Plan Image
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isGenerating}
                  />
                </label>
                {previewImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    className="gap-1.5 border-slate-700 bg-slate-900 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-cyan-300"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin text-cyan-400" : ""}`} />
                    Regenerate 3D Twin
                  </Button>
                )}
              </div>
            )}

            {/* In Progress Bar */}
            {isGenerating && (
              <div className="space-y-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 p-2.5">
                <div className="flex justify-between text-[10px] font-bold text-cyan-300">
                  <span>Generating 3D Twin</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Status Message */}
            {statusMessage && (
              <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/60 p-2 text-[11px] font-bold text-cyan-300 text-center animate-pulse">
                {statusMessage}
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-start gap-1.5 rounded-lg border border-red-500/40 bg-red-950/60 p-2.5 text-[11px] font-semibold text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Center & Right Columns: 3D Twin Architecture Metrics */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Extracted 3D Scene Components
              </h4>
              {digitalTwin?.generationProvider && (
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                  Provider: {digitalTwin.generationProvider}
                </span>
              )}
            </div>

            {hasTwin && digitalTwin ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                {/* Buildings / Towers */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <Building2 className="h-4 w-4" /> Buildings
                  </div>
                  <div className="mt-1 text-lg font-black text-white font-mono">
                    {digitalTwin.buildings.length}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    {digitalTwin.buildings.map((b) => b.name).join(", ") || "Main Structure"}
                  </p>
                </div>

                {/* Parks */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <Trees className="h-4 w-4" /> Green Zones
                  </div>
                  <div className="mt-1 text-lg font-black text-white font-mono">
                    {digitalTwin.parks?.length || 0}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {digitalTwin.parks?.length > 0 ? "Landscaped Lawns" : "None"}
                  </p>
                </div>

                {/* Parking */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Car className="h-4 w-4" /> Parking Lots
                  </div>
                  <div className="mt-1 text-lg font-black text-white font-mono">
                    {digitalTwin.parkingAreas?.length || 0}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {digitalTwin.parkingAreas?.length > 0
                      ? `${digitalTwin.parkingAreas.reduce((s, p) => s + (p.baysPerRow || 8), 0)} Total Bays`
                      : "None"}
                  </p>
                </div>

                {/* Amenities */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                    <ShieldCheck className="h-4 w-4" /> Amenities
                  </div>
                  <div className="mt-1 text-lg font-black text-white font-mono">
                    {digitalTwin.amenities?.length || 0}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    {digitalTwin.amenities?.length > 0
                      ? digitalTwin.amenities.map((a) => a.name).join(", ")
                      : "None"}
                  </p>
                </div>

                {/* Water Bodies */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                    <Waves className="h-4 w-4" /> Water Features
                  </div>
                  <div className="mt-1 text-lg font-black text-white font-mono">
                    {digitalTwin.waterBodies?.length || 0}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {digitalTwin.waterBodies?.length > 0
                      ? digitalTwin.waterBodies.map((w) => w.type).join(", ")
                      : "None"}
                  </p>
                </div>

                {/* Trees / Vegetation */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="flex items-center gap-1.5 text-teal-400 font-bold">
                    <Trees className="h-4 w-4" /> Vegetation
                  </div>
                  <div className="mt-1 text-lg font-black text-white font-mono">
                    {digitalTwin.trees?.length || 0}
                  </div>
                  <p className="text-[10px] text-slate-400">Trees &amp; Plantings</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-amber-500/80 mb-2" />
                <p className="text-xs font-bold text-slate-200">
                  No 3D Digital Twin Synthesized Yet
                </p>
                <p className="mt-1 text-[11px] text-slate-400 max-w-sm mx-auto">
                  Upload a site plan or aerial photograph above to analyze the layout, extract building massing, and construct this society&apos;s custom 3D model.
                </p>
              </div>
            )}

            {/* Disclaimer & Launch Banner */}
            {hasTwin && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3 text-xs">
                  <div>
                    <span className="font-bold text-cyan-300">Active Digital Twin: </span>
                    <span className="text-slate-300">{digitalTwin?.societyName}</span>
                    <span className="ml-2 font-mono text-[10px] text-slate-500">
                      (Version {digitalTwin?.sourceImageVersion || "v1"})
                    </span>
                  </div>
                  <Button
                    size="sm"
                    asChild
                    variant="outline"
                    className="gap-1 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/20 text-xs font-bold"
                  >
                    <Link href={twinUrl}>
                      Launch 3D Explorer <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>

                <div className="text-[10px] text-slate-500 flex items-center justify-between px-1">
                  <span>Data Status: DEMO • Unofficial Visualization</span>
                  <span>isOfficialUlpin: false • sourceType: AI_GENERATED_VISUALIZATION</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
