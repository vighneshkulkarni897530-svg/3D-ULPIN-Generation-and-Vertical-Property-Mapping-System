'use client';

import React, { useState, useRef } from 'react';
import {
  type EvidenceType,
  type VerificationEvidence,
  EVIDENCE_TYPES,
  EVIDENCE_TYPE_LABELS,
} from '@/types/verificationCase';
import { uploadVerificationEvidence } from '@/lib/society/verificationWorkflowService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EvidenceUploaderProps {
  societyId: string;
  caseId?: string | null;
  discrepancyId?: string | null;
  buildingId?: string | null;
  floorId?: string | null;
  flatId?: string | null;
  propertyId?: string | null;
  onUploaded?: (evidence: VerificationEvidence) => void;
  className?: string;
}

export function EvidenceUploader({
  societyId,
  caseId,
  discrepancyId,
  buildingId,
  floorId,
  flatId,
  propertyId,
  onUploaded,
  className,
}: EvidenceUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('PROPERTY_PHOTO');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Unsupported file format',
        description: 'Allowed formats: JPEG, PNG, WEBP, and PDF documents.',
      });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Maximum permitted file size is 15 MB.',
      });
      return;
    }

    setSelectedFile(file);

    // Auto-detect type suggestion
    if (file.type === 'application/pdf') {
      setEvidenceType('SUPPORTING_DOCUMENT');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast({
        variant: 'destructive',
        title: 'File required',
        description: 'Please select a document or photograph to upload.',
      });
      return;
    }

    if (!description.trim()) {
      toast({
        variant: 'destructive',
        title: 'Description required',
        description: 'Please provide a short description for this evidence piece.',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploaded = await uploadVerificationEvidence(
        {
          societyId,
          caseId,
          discrepancyId,
          buildingId,
          floorId,
          flatId,
          propertyId,
          type: evidenceType,
          file: selectedFile,
          description: description.trim(),
        },
        (percent) => setUploadProgress(percent),
      );

      toast({
        variant: 'success',
        title: 'Evidence attached successfully',
        description: `Uploaded ${selectedFile.name} to verification case.`,
      });

      setSelectedFile(null);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onUploaded) onUploaded(uploaded);
    } catch (err) {
      console.error('Evidence upload failed:', err);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Could not upload file.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white p-5 shadow-tech', className)}>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
          <Upload className="h-4 w-4 text-cyan-600" />
          Attach Verification Evidence
        </h4>
        <span className="text-[10px] font-semibold text-slate-400">PDF, JPG, PNG up to 15MB</span>
      </div>

      <form onSubmit={handleUpload} className="space-y-3.5">
        {/* Dropzone */}
        {!selectedFile ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-6 px-4 text-center transition-all',
              dragOver
                ? 'border-cyan-500 bg-cyan-50/50'
                : 'border-slate-200 bg-slate-50/60 hover:border-cyan-400 hover:bg-slate-50',
            )}
          >
            <Upload className="mb-2 h-7 w-7 text-slate-400" />
            <p className="text-xs font-bold text-slate-700">
              Click to select evidence file or drag &amp; drop here
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Photographs, field inspection logs, architectural drawings, or documents
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-cyan-200 bg-cyan-50/60 p-3 text-xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {selectedFile.type.includes('pdf') ? (
                <FileText className="h-5 w-5 text-red-600 shrink-0" />
              ) : (
                <ImageIcon className="h-5 w-5 text-cyan-600 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-900">{selectedFile.name}</p>
                <p className="text-[10px] font-mono text-slate-500">
                  {(selectedFile.size / 1024).toFixed(0)} KB • {selectedFile.type}
                </p>
              </div>
            </div>
            {!isUploading && (
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Evidence Category & Description */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Evidence Category
            </label>
            <select
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
              disabled={isUploading}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {EVIDENCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {EVIDENCE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Evidence Description / Context
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. South wall boundary alignment photo"
              disabled={isUploading}
              className="text-xs"
            />
          </div>
        </div>

        {/* Progress bar */}
        {isUploading && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-slate-600">
              <span>Uploading evidence to secure storage…</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-cyan-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            size="sm"
            disabled={!selectedFile || isUploading}
            className="gap-1.5 text-xs font-bold"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <FileCheck className="h-3.5 w-3.5" /> Attach Evidence
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
