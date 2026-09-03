'use client';

/**
 * Society image picker (Phase 1)
 * ===============================
 * JPG / JPEG / PNG / WEBP only, max 5 MB — with live preview, replace,
 * remove, validation errors, upload progress and failure states. Upload
 * progress/error are rendered here too so the image UX stays in one
 * accessible component.
 *
 * Hydration safety: the object-URL preview is created/released inside an
 * effect (never during render).
 */
import * as React from 'react';
import { AlertTriangle, ImagePlus, RefreshCcw, Trash2 } from 'lucide-react';

import { SafeImage } from '@/components/ui/SafeImage';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  SOCIETY_IMAGE_ACCEPT_ATTRIBUTE,
  SOCIETY_IMAGE_LABEL,
  formatBytes,
  validateSocietyImageFile,
} from '@/lib/society/validation';

export interface SocietyImageUploaderProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** 0–100 while the submit-time upload runs; `null` when idle. */
  uploadProgress?: number | null;
  /** Submit-time upload failure message (already user-friendly). */
  uploadError?: string | null;
  /** Disable while the society is being created. */
  disabled?: boolean;
}

export function SocietyImageUploader({
  file,
  onFileChange,
  uploadProgress = null,
  uploadError = null,
  disabled = false,
}: SocietyImageUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleSelect = (selected: File | null) => {
    if (!selected) return;
    const validation = validateSocietyImageFile(selected);
    if (!validation.ok) {
      // Keep any previously selected valid file; only surface the problem.
      setLocalError(validation.error);
      return;
    }
    setLocalError(null);
    onFileChange(selected);
  };

  const error = uploadError ?? localError;
  const uploading = uploadProgress !== null;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={SOCIETY_IMAGE_ACCEPT_ATTRIBUTE}
        className="sr-only"
        aria-label="Select a society image"
        onChange={(event) => {
          handleSelect(event.target.files?.[0] ?? null);
          event.target.value = '';
        }}
      />

      {!file && !uploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          aria-describedby="society-image-hint"
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-all',
            'border-slate-300 bg-slate-50/60 hover:border-cyan-400 hover:bg-cyan-50/40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <span className="rounded-xl bg-slate-900 p-2.5 shadow-tech">
            <ImagePlus className="h-5 w-5 text-cyan-400" aria-hidden="true" />
          </span>
          <span className="text-xs font-bold text-slate-800">Choose a society image</span>
          <span id="society-image-hint" className="text-[10px] font-medium text-slate-400">
            {SOCIETY_IMAGE_LABEL}
          </span>
        </button>
      )}

      {file && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-tech">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <SafeImage
              src={previewUrl ?? undefined}
              alt={`Preview of ${file.name}`}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-900">{file.name}</p>
              <p className="text-[10px] font-mono text-slate-400">{formatBytes(file.size)}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={disabled || uploading}
              >
                <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" /> Replace
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setLocalError(null);
                  onFileChange(null);
                }}
                disabled={disabled || uploading}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {uploading && uploadProgress !== null && (
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-500">
            <span>Uploading society image…</span>
            <span className="font-mono">{uploadProgress}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={uploadProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Image upload progress"
            className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className="h-full rounded-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] font-semibold text-red-700"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}



