"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScanLine, ShieldCheck, Map as MapIcon, Info } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader, SectionHeader } from "@/components/layout/PageHeader";
import { PageLoader } from "@/components/layout/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGIS } from "@/context/GISContext";
import { AiImageUploader } from "@/components/ai/AiImageUploader";
import { AiProcessingPipeline } from "@/components/ai/AiProcessingPipeline";
import { AiDetectionResults } from "@/components/ai/AiDetectionResults";
import { FootprintComparison } from "@/components/ai/FootprintComparison";
import { ReconstructionPreview3D } from "@/components/ai/ReconstructionPreview3D";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  PROCESSING_STEPS,
  classifySourceType,
  runSimulatedExtraction,
  saveExtractionToSession,
  loadExtractionFromSession,
  type AiImageSelection,
  type ExtractionResult,
  type ExtractionSourceType,
  type ExtractionProcessingPhase,
} from "@/lib/aiExtraction";

export default function AiExtractionPage() {
  return (
    <React.Suspense fallback={<PageLoader label="Preparing AI workspace…" />}>
      <AiExtractionWorkspace />
    </React.Suspense>
  );
}

function AiExtractionWorkspace() {
  const { addActivity } = useGIS();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phase, setPhase] = React.useState<ExtractionProcessingPhase>("idle");
  const [image, setImage] = React.useState<AiImageSelection | null>(null);
  const [sourceType, setSourceType] = React.useState<ExtractionSourceType>("BUILDING");
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [previewBroken, setPreviewBroken] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [result, setResult] = React.useState<ExtractionResult | null>(null);
  const [generated3D, setGenerated3D] = React.useState(false);
  const [generating3D, setGenerating3D] = React.useState(false);
  const stepTimer = React.useRef<number | null>(null);
  const restoredRef = React.useRef(false);

  const running = phase === "processing";
  const busy = running || generating3D;

  // Clear any pending pipeline timer on unmount.
  React.useEffect(
    () => () => {
      if (stepTimer.current) window.clearInterval(stepTimer.current);
    },
    [],
  );

  // Deep link: /ai-extraction?result=EXTR-XXXX restores a session result.
  React.useEffect(() => {
    if (restoredRef.current) return;
    const id = searchParams.get("result");
    if (!id) return;
    restoredRef.current = true;
    const found = loadExtractionFromSession(id);
    if (found) {
      setResult(found);
      setPhase("completed");
      setStep(PROCESSING_STEPS.length);
      setSourceType(found.sourceType);
    } else {
      setUploadError(`Prototype result "${id}" is not in this browser session — run the extraction again.`);
    }
  }, [searchParams]);

  const resetOutput = React.useCallback(() => {
    if (stepTimer.current) window.clearInterval(stepTimer.current);
    setStep(0);
    setResult(null);
    setGenerated3D(false);
    setGenerating3D(false);
  }, []);

  const handleFile = React.useCallback(
    (file: File) => {
      setUploadError(null);
      const typeOk = ACCEPTED_IMAGE_TYPES.includes(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name);
      if (!typeOk) {
        setUploadError("Unsupported file type — upload a PNG, JPG, JPEG or WEBP image.");
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB) — the demo limit is 12 MB.`);
        return;
      }
      if (image) URL.revokeObjectURL(image.previewUrl);
      resetOutput();
      setPreviewBroken(false);
      setImage({
        name: file.name,
        type: file.type || "image/*",
        size: file.size,
        previewUrl: URL.createObjectURL(file),
      });
      setSourceType(classifySourceType(file.name));
      setPhase("selected");
    },
    [image, resetOutput],
  );

  const removeImage = React.useCallback(() => {
    if (image) URL.revokeObjectURL(image.previewUrl);
    setImage(null);
    setUploadError(null);
    setPreviewBroken(false);
    resetOutput();
    setPhase("idle");
  }, [image, resetOutput]);

  const startProcessing = React.useCallback(() => {
    if (!image || running) return;
    resetOutput();
    setPhase("processing");
    setStep(0);
    stepTimer.current = window.setInterval(() => {
      setStep((prev) => {
        const next = prev + 1;
        if (next < PROCESSING_STEPS.length - 1) return next;
        if (stepTimer.current) window.clearInterval(stepTimer.current);
        const extraction = runSimulatedExtraction(image.name, sourceType);
        saveExtractionToSession(extraction);
        setResult(extraction);
        setPhase("completed");
        addActivity({
          type: "AI_EXTRACTION",
          title: "AI-Assisted Prototype Extraction Completed",
          description: `Simulated extraction completed for ${sourceType.toLowerCase()} image "${image.name}" — prototype result ${extraction.id} (not an official survey).`,
          entityType: "SYSTEM",
          entityId: extraction.id,
          timestamp: new Date().toISOString(),
          user: "Demo Officer",
          userRole: "OFFICER",
          status: "COMPLETED",
          metadata: { sourceType, detectionConfidence: extraction.detectionConfidence, isPrototype: true },
        });
        return PROCESSING_STEPS.length;
      });
    }, 620);
  }, [image, running, sourceType, addActivity, resetOutput]);

  const startReconstruction = React.useCallback(() => {
    setGenerating3D(true);
    setGenerated3D(false);
    window.setTimeout(() => {
      setGenerating3D(false);
      setGenerated3D(true);
      if (result) {
        addActivity({
          type: "3D_RECONSTRUCTION",
          title: "Prototype 3D Reconstruction Generated",
          description: `Simplified massing model generated from ${result.id} — ${result.estimatedFloors} prototype floors, ${result.estimatedHeightMeters.toFixed(1)} m (simulated).`,
          entityType: "SYSTEM",
          entityId: result.id,
          timestamp: new Date().toISOString(),
          user: "Demo Officer",
          userRole: "OFFICER",
          status: "COMPLETED",
          metadata: { isPrototype: true },
        });
      }
    }, 1400);
  }, [result, addActivity]);

  const handleViewInMap = React.useCallback(() => {
    if (!result) return;
    saveExtractionToSession(result);
    router.push(`/map?extraction=${encodeURIComponent(result.id)}`);
  }, [result, router]);

  const previewUrl = image && !previewBroken ? image.previewUrl : null;

  return (
    <PageContainer>
      <div className="space-y-5">
        <PageHeader
          eyebrow="AI-ASSISTED EXTRACTION"
          title="AI-Assisted Spatial Feature Extraction"
          description="Upload a building, drone or site image and run the simulated pipeline to draft a prototype footprint, floor estimate and 3D reconstruction — then carry the result into the GIS map for comparison."
          actions={
            <Badge variant="warning" className="text-[10px]">
              AI-Assisted Prototype Output — Not a Survey
            </Badge>
          }
        />

        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10.5px] font-semibold text-amber-800">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong className="font-black">Prototype demonstration only.</strong> No real AI/ML model, drone
            photogrammetry, LiDAR or GNSS is connected. Output is deterministic simulated analysis for the same demo
            input — never official government AI verification, legally authoritative boundaries or valid ULPIN
            generation.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {/* Left rail — upload, pipeline, GIS actions */}
          <div className="space-y-5">
            <AiImageUploader
              image={image}
              sourceType={sourceType}
              error={uploadError}
              busy={busy}
              onFile={handleFile}
              onSourceTypeChange={(t) => {
                setSourceType(t);
                resetOutput();
                setPhase(image ? "selected" : "idle");
              }}
              onRemove={removeImage}
              onPreviewError={() => setPreviewBroken(true)}
            />

            <AiProcessingPipeline
              step={step}
              running={running}
              imageName={image?.name ?? null}
              canStart={!!image && !busy}
              onStart={startProcessing}
            />
          </div>

          {/* Right rail — detection results, spatial analysis, 3D preview, GIS actions */}
          <div className="space-y-5">
            {phase === "completed" && result ? (
              <>
                <AiDetectionResults result={result} />

                <FootprintComparison result={result} previewUrl={previewUrl} />

                <ReconstructionPreview3D
                  result={result}
                  generated={generated3D}
                  generating={generating3D}
                  onGenerate={startReconstruction}
                />

                {/* GIS integration actions */}
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <SectionHeader
                    icon={<MapIcon className="h-4 w-4" />}
                    title="7 · GIS Integration Actions"
                    description="Carry the prototype result into the live GIS map for side-by-side review."
                  />
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <Button onClick={handleViewInMap}>
                      <MapIcon className="h-4 w-4" /> View in GIS Map
                    </Button>
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[9.5px] font-bold text-slate-500">
                      /map?extraction={result.id}
                    </span>
                  </div>
                  <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50/70 px-2.5 py-2 text-[10.5px] font-semibold text-cyan-900">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    The prototype footprint overlays the 2D map and the reconstruction appears as a translucent 3D
                    massing, visually distinguished from registry geometry. Demo property records are never modified
                    automatically — the result stays a prototype candidate.
                  </p>
                </section>
              </>
            ) : (
              /* Empty / awaiting-input state for the results column */
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50 text-cyan-600">
                  <ScanLine className="h-6 w-6" />
                </span>
                <h3 className="mt-3 text-sm font-black tracking-tight text-slate-900">
                  {running ? "Prototype analysis in progress…" : image ? "Ready to process" : "No extraction yet"}
                </h3>
                <p className="mt-1.5 max-w-sm text-[11px] font-semibold text-slate-500">
                  {running
                    ? "The simulated pipeline is stepping through detection, boundary tracing, floor estimation and reconstruction. Results appear automatically."
                    : image
                      ? "Press “Start AI Processing” in the pipeline panel to run the simulated extraction."
                      : "Upload a building, drone or site image to begin. The simulated pipeline will draft a prototype footprint, floor estimate and 3D preview."}
                </p>
                <p className="mt-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                  <Info className="h-3.5 w-3.5" /> AI-Assisted Prototype Output
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}