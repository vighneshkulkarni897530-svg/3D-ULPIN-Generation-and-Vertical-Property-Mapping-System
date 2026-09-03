'use client';

import React, { useState } from 'react';
import {
  type VerificationEvidence,
  EVIDENCE_TYPE_LABELS,
} from '@/types/verificationCase';
import { SafeImage } from '@/components/ui/SafeImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Eye,
  Calendar,
  User,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EvidenceViewerProps {
  evidenceList: VerificationEvidence[];
  isLoading?: boolean;
  className?: string;
}

export function EvidenceViewer({
  evidenceList,
  isLoading = false,
  className,
}: EvidenceViewerProps) {
  const [selectedPreview, setSelectedPreview] = useState<VerificationEvidence | null>(null);

  if (isLoading) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        Loading attached evidence records…
      </div>
    );
  }

  if (!evidenceList || evidenceList.length === 0) {
    return (
      <div className={cn('rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400', className)}>
        <FileText className="mx-auto mb-1.5 h-6 w-6 text-slate-300" />
        <p className="font-semibold text-slate-600">No evidence attached yet</p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          Upload photographs, documents, or GIS screenshots to support this investigation.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {evidenceList.map((item) => {
          const isImage = item.mimeType?.startsWith('image/');
          const isPdf = item.mimeType?.includes('pdf');
          const sizeKb = (item.fileSize / 1024).toFixed(0);

          return (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:border-slate-300 hover:shadow"
            >
              {/* Thumbnail / File Icon header */}
              <div>
                <div className="mb-2.5 flex items-start justify-between gap-2">
                  <Badge variant="outline" className="text-[9px] font-bold">
                    {EVIDENCE_TYPE_LABELS[item.type] || item.type}
                  </Badge>
                  <span className="font-mono text-[9px] text-slate-400">{sizeKb} KB</span>
                </div>

                {isImage && item.downloadUrl ? (
                  <div
                    onClick={() => setSelectedPreview(item)}
                    className="group relative mb-2.5 h-32 w-full cursor-pointer overflow-hidden rounded-lg border border-slate-100 bg-slate-100"
                  >
                    <SafeImage
                      src={item.downloadUrl}
                      alt={item.description || item.fileName}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-900">
                        <Eye className="h-3 w-3" /> Preview
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-2.5 flex h-24 w-full flex-col items-center justify-center rounded-lg border border-slate-100 bg-slate-50 p-2 text-center text-xs text-slate-500">
                    {isPdf ? (
                      <FileText className="mb-1 h-7 w-7 text-red-600" />
                    ) : (
                      <Layers className="mb-1 h-7 w-7 text-slate-400" />
                    )}
                    <span className="truncate max-w-[90%] font-semibold text-slate-700">
                      {item.fileName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isPdf ? 'PDF Document' : 'Evidence File'}
                    </span>
                  </div>
                )}

                <p className="line-clamp-2 text-xs font-semibold text-slate-800">
                  {item.description || item.fileName}
                </p>
              </div>

              {/* Footer Metadata */}
              <div className="mt-3 border-t border-slate-100 pt-2 text-[10px] text-slate-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 truncate max-w-[65%]">
                    <User className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate text-slate-600 font-medium">
                      {item.uploadedByName || 'Officer'}
                    </span>
                  </span>
                  <span className="font-mono">
                    {item.createdAt ? item.createdAt.toLocaleDateString('en-IN') : '—'}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-1 pt-1">
                  {item.downloadUrl && (
                    <a
                      href={item.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <ExternalLink className="h-3 w-3" /> Open
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Lightbox Preview Dialog */}
      <Dialog open={!!selectedPreview} onOpenChange={(open) => !open && setSelectedPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {selectedPreview?.description || selectedPreview?.fileName}
            </DialogTitle>
          </DialogHeader>
          {selectedPreview && (
            <div className="space-y-3">
              <div className="max-h-[65vh] overflow-hidden rounded-xl border border-slate-200 bg-slate-900 flex items-center justify-center">
                <SafeImage
                  src={selectedPreview.downloadUrl}
                  alt={selectedPreview.fileName}
                  className="max-h-[65vh] w-auto object-contain"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Category: {EVIDENCE_TYPE_LABELS[selectedPreview.type]}</span>
                {selectedPreview.downloadUrl && (
                  <a
                    href={selectedPreview.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-600 hover:underline font-bold"
                  >
                    <Download className="h-3.5 w-3.5" /> Download original
                  </a>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
