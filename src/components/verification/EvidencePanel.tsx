"use client";

import { SafeImage } from '@/components/ui/SafeImage';

import * as React from "react";
import {
  Image as ImageIcon,
  CheckCircle2,
  Circle,
  Upload,
  Trash2,
  ShieldAlert,
  MapPin,
  Shapes,
} from "lucide-react";
import type { PropertyUnit } from "@/types/gis";
import type { GpsCheckResult } from "@/components/verification/GpsCheckCard";
import type { BoundaryComparison } from "@/components/verification/BoundaryCompareCard";
import { cn } from "@/lib/utils";

export interface DemoEvidencePhoto {
  /** Original file name. */
  name: string;
  /** Object-URL preview â€” session-only, never persisted. */
  url: string;
}

interface EvidencePanelProps {
  property: PropertyUnit;
  gps: GpsCheckResult | null;
  boundary: BoundaryComparison | null;
  photo: DemoEvidencePhoto | null;
  onPhotoChange: (photo: DemoEvidencePhoto | null) => void;
  className?: string;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic"];

/**
 * Verification evidence panel: simulated-check checklist, geometry status and
 * the Demo Evidence Upload. Uploaded files stay in the browser session as
 * object URLs â€” nothing is persisted to any backend or government repository.
 */
export function EvidencePanel({ property, gps, boundary, photo, onPhotoChange, className }: EvidencePanelProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Revoke stale object URLs when the photo is replaced or removed.
  React.useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.url);
    };
  }, [photo]);

  const handleFiles = React.useCallback(
    (files: FileList | null) => {
      setError(null);
      const file = files?.[0];
      if (!file) return;
      if (!ACCEPTED.includes(file.type)) {
        setError("Unsupported file type â€” please attach a JPEG, PNG, WebP or HEIC image.");
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setError("Image is larger than 8 MB â€” please attach a smaller photo.");
        return;
      }
      if (photo) URL.revokeObjectURL(photo.url);
      onPhotoChange({ name: file.name, url: URL.createObjectURL(file) });
    },
    [photo, onPhotoChange],
  );

  const checklist = [
    {
      label: "Location Matched",
      done: !!gps?.matched,
      warn: !!gps && !gps.matched,
      icon: <MapPin className="h-3.5 w-3.5" />,
      hint: gps ? `${gps.distanceM.toFixed(1)} m from expected point` : "Run the demo GPS check",
    },
    {
      label: "Boundary Matched",
      done: boundary?.status === "Matched",
      warn: !!boundary && boundary.status !== "Matched",
      icon: <Shapes className="h-3.5 w-3.5" />,
      hint: boundary ? `${boundary.status} Â· ${boundary.deviationM.toFixed(2)} m max deviation` : "Run the boundary comparison",
    },
    {
      label: "Property Image Available",
      done: !!photo,
      warn: false,
      icon: <ImageIcon className="h-3.5 w-3.5" />,
      hint: photo ? photo.name : "Optional â€” attach a demo field photo",
    },
  ];

  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-tech", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-slate-900">
            <ShieldAlert className="h-4 w-4 text-cyan-600" /> Verification Evidence
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            Simulated field evidence for <span className="font-mono font-bold text-slate-700">{property.id}</span>.
          </p>
        </div>
        <span className="shrink-0 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-700">
          Demo Evidence
        </span>
      </div>
      <Checklist checklist={checklist} />
      <UploadBlock
        photo={photo}
        error={error}
        inputRef={inputRef}
        propertyId={property.id}
        onPick={() => inputRef.current?.click()}
        onReplace={() => inputRef.current?.click()}
        onRemove={() => {
          if (photo) URL.revokeObjectURL(photo.url);
          onPhotoChange(null);
        }}
        onFiles={handleFiles}
      />
      <p className="mt-3 text-[9px] leading-relaxed text-slate-400">
        Uploaded evidence is a local demo preview held only for this browser session. It is not stored in any
        government repository and carries no legal validity.
      </p>
    </section>
  );
}

// â”€â”€ Subcomponents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ChecklistItem {
  label: string;
  done: boolean;
  warn: boolean;
  icon: React.ReactNode;
  hint: string;
}

function Checklist({ checklist }: { checklist: ChecklistItem[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {checklist.map((item) => (
        <li
          key={item.label}
          className={cn(
            "flex items-center gap-3 rounded-xl border px-3 py-2.5",
            item.done && "border-emerald-200 bg-emerald-50/60",
            item.warn && "border-amber-200 bg-amber-50/60",
            !item.done && !item.warn && "border-slate-200 bg-slate-50/60",
          )}
        >
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
              item.done && "border-emerald-400 text-emerald-600",
              item.warn && "border-amber-400 text-amber-600",
              !item.done && !item.warn && "border-slate-300 text-slate-400",
            )}
          >
            {item.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : item.warn ? <ShieldAlert className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
            <span className="sr-only">{item.done ? "complete" : item.warn ? "attention" : "pending"}</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn("block text-[11.5px] font-bold", item.done ? "text-emerald-800" : item.warn ? "text-amber-800" : "text-slate-600")}>
              {item.done ? `âœ“ ${item.label}` : item.warn ? `âš  ${item.label}` : item.label}
            </span>
            <span className="block truncate text-[10px] text-slate-500">{item.hint}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

interface UploadBlockProps {
  photo: DemoEvidencePhoto | null;
  error: string | null;
  inputRef: { current: HTMLInputElement | null };
  propertyId: string;
  onPick: () => void;
  onReplace: () => void;
  onRemove: () => void;
  onFiles: (files: FileList | null) => void;
}

function UploadBlock({ photo, error, inputRef, propertyId, onPick, onReplace, onRemove, onFiles }: UploadBlockProps) {
  return (
    <>
      <p className="mb-1.5 mt-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Demo Evidence Upload</p>
      {photo ? (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <SafeImage src={photo.url} alt={`Demo field evidence for ${propertyId}`} className="h-40 w-full bg-slate-950 object-cover" />
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2">
            <p className="min-w-0 truncate text-[10px] font-semibold text-slate-600">{photo.name}</p>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={onReplace}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 transition-colors hover:border-cyan-400 hover:text-cyan-700"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPick}
          className="flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 transition-colors hover:border-cyan-400 hover:bg-cyan-50/40"
        >
          <Upload className="h-5 w-5 text-slate-400" />
          <span className="text-[11px] font-bold text-slate-600">Attach demo field photo</span>
          <span className="text-[9.5px] text-slate-400">JPEG / PNG / WebP / HEIC Â· max 8 MB Â· browser session only</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        aria-label="Attach demo evidence photo"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] font-semibold text-red-700">
          {error}
        </p>
      )}
    </>
  );
}

