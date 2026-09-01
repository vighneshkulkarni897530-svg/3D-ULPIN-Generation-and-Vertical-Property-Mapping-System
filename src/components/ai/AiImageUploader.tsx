"use client";

import { SafeImage } from '@/components/ui/SafeImage';
import * as React from "react";
import {
  Building2,
  Plane,
  MapPinned,
  RefreshCw,
  Trash2,
  Image as ImageIcon,
  FileWarning,
} from "lucide-react";
import { FileUploadZone } from "@/components/ui/file-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import {
  formatFileSize,
  type AiImageSelection,
  type ExtractionSourceType,
} from "@/lib/aiExtraction";

const SOURCE_OPTIONS: {
  value: ExtractionSourceType;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "BUILDING", label: "Building Image", hint: "Facade / elevation capture", icon: Building2 },
  { value: "DRONE", label: "Drone Image", hint: "Aerial / overhead capture", icon: Plane },
  { value: "SITE", label: "Site Image", hint: "Ground-level site capture", icon: MapPinned },
];

interface AiImageUploaderProps {
  image: AiImageSelection | null;
  sourceType: ExtractionSourceType;
  error: string | null;
  /** Disables source-type switching while the pipeline is running. */
  busy?: boolean;
  onFile: (file: File) => void;
  onSourceTypeChange: (type: ExtractionSourceType) => void;
  onRemove: () => void;
  /** Fired when the browser cannot decode the preview image. */
  onPreviewError: () => void;
}

/**
 * Phase 6 upload panel — PNG/JPG/JPEG/WEBP only, browser-session only.
 * Validation lives in the workspace page so error/failed states stay in one
 * place; this component is purely presentational.
 */
export function AiImageUploader({
  image,
  sourceType,
  error,
  busy = false,
  onFile,
  onSourceTypeChange,
  onRemove,
  onPreviewError,
}: AiImageUploaderProps) {
  const replaceInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <SectionHeader
        icon={<ImageIcon className="h-4 w-4" />}
        title="1 · Image Upload"
        description="Select the demo source image for prototype extraction."
        action={
          <Badge variant="warning" className="text-[9px]">
            Demo Image Upload — Browser Session Only
          </Badge>
        }
      />

      {!image ? (
        <div className="mt-4">
          <FileUploadZone
            accept="image/png,image/jpeg,image/webp"
            label="Drag & drop or browse — building, drone or site image"
            hint="PNG · JPG · JPEG · WEBP — Max 12 MB (demo validation)"
            onFilesAdded={(files) => {
              const file = files[0];
              if (file) onFile(file);
            }}
          />
          {error && (
            <p
              role="alert"
              className="mt-3 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[10.5px] font-semibold text-red-700"
            >
              <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:w-48">
              <SafeImage
                src={image.previewUrl}
                alt={`Preview of ${image.name}`}
                onError={onPreviewError}
                className="h-full w-full object-cover"
              />
              <span className="absolute left-2 top-2 rounded-md bg-slate-950/80 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-widest text-cyan-300">
                Selected Image
              </span>
            </div>
            <dl className="min-w-0 flex-1 space-y-1.5 text-[11px]">
              <div className="flex items-start justify-between gap-2">
                <dt className="shrink-0 font-bold uppercase tracking-wider text-slate-400">File</dt>
                <dd className="min-w-0 truncate text-right font-mono font-bold text-slate-900" title={image.name}>
                  {image.name}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-2 border-t border-slate-100 pt-1.5">
                <dt className="shrink-0 font-bold uppercase tracking-wider text-slate-400">Type</dt>
                <dd className="font-mono text-slate-700">{image.type}</dd>
              </div>
              <div className="flex items-start justify-between gap-2 border-t border-slate-100 pt-1.5">
                <dt className="shrink-0 font-bold uppercase tracking-wider text-slate-400">Size</dt>
                <dd className="font-mono text-slate-700">{formatFileSize(image.size)}</dd>
              </div>
              <div className="flex items-start justify-between gap-2 border-t border-slate-100 pt-1.5">
                <dt className="shrink-0 font-bold uppercase tracking-wider text-slate-400">Classified</dt>
                <dd>
                  <Badge variant="navy" className="text-[9px]">
                    {sourceType} source
                  </Badge>
                </dd>
              </div>
            </dl>
          </div>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[10.5px] font-semibold text-red-700"
            >
              <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          <div>
            <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              Source type (prototype classification)
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {SOURCE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = sourceType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={busy}
                    onClick={() => onSourceTypeChange(opt.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all disabled:opacity-50",
                      active ? "border-cyan-400 bg-cyan-50/70 shadow-sm" : "border-slate-200 bg-white hover:border-cyan-300",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-cyan-600" : "text-slate-400")} />
                    <span className="min-w-0">
                      <span className={cn("block text-[11px] font-bold", active ? "text-cyan-800" : "text-slate-700")}>
                        {opt.label}
                      </span>
                      <span className="block text-[9px] text-slate-400">{opt.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[9px] text-slate-400">
              Auto-classified from the file name — override if the prototype guess is wrong.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => replaceInputRef.current?.click()}>
              <RefreshCw className="h-3.5 w-3.5" /> Replace Image
            </Button>
            <Button variant="destructive" size="sm" disabled={busy} onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5" /> Remove Image
            </Button>
            <input
              ref={replaceInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFile(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}