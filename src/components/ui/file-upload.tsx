"use client";

import * as React from "react";
import { UploadCloud, FileText, Image as ImageIcon, Trash2, FileVideo, FileScan } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface UploadedEvidence {
  id: string;
  fileName: string;
  fileType: "IMAGE" | "PDF" | "VIDEO" | "GEO_SURVEY";
  fileSize: string;
  previewUrl?: string;
  uploadedAt: string;
}

interface FileUploadZoneProps {
  accept?: string;
  label?: string;
  hint?: string;
  variant?: "photo" | "document";
  onFilesAdded?: (files: File[]) => void;
  className?: string;
}

/** Drag & drop upload zone — files are handled locally (frontend-only simulation). */
export function FileUploadZone({
  accept = "image/*,.pdf",
  label = "Drag & drop files here or click to browse",
  hint = "JPG, PNG, PDF • Max 25 MB each",
  onFilesAdded,
  className,
}: FileUploadZoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const processFiles = (fileList: FileList | null) => {
    if (fileList && fileList.length) onFilesAdded?.(Array.from(fileList));
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        processFiles(e.dataTransfer.files);
      }}
      className={cn(
        "w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer",
        isDragging
          ? "border-cyan-500 bg-cyan-50/60 scale-[1.01]"
          : "border-slate-300 bg-slate-50/60 hover:border-cyan-400 hover:bg-cyan-50/40",
        className
      )}
    >
      <div className="p-2.5 rounded-xl bg-slate-900 shadow-tech">
        <UploadCloud className="h-5 w-5 text-cyan-400" />
      </div>
      <span className="text-xs font-bold text-slate-800">{label}</span>
      <span className="text-[10px] text-slate-400 font-medium">{hint}</span>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          processFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </button>
  );
}

interface EvidencePreviewListProps {
  items: UploadedEvidence[];
  onRemove?: (id: string) => void;
  className?: string;
}

/** Preview strip for uploaded evidence with simulated geotag + checksum. */
export function EvidencePreviewList({ items, onRemove, className }: EvidencePreviewListProps) {
  if (!items.length) return null;
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2.5", className)}>
      {items.map((item) => {
        const Icon =
          item.fileType === "IMAGE" ? ImageIcon : item.fileType === "PDF" ? FileText : item.fileType === "VIDEO" ? FileVideo : FileScan;
        return (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm animate-fade-in"
          >
            <div className="p-2 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-600 shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{item.fileName}</p>
              <p className="text-[10px] text-slate-400 font-mono">
                {item.fileSize} • uploaded {timeAgo(item.uploadedAt)}
              </p>
              <Badge variant="success" className="mt-1 text-[9px] px-1.5 py-0">
                Geotag + SHA-256 sealed
              </Badge>
            </div>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                title="Remove evidence"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
