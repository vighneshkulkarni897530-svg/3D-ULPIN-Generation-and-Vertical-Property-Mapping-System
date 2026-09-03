'use client';

import React, { useState } from 'react';
import {
  type DiscrepancyType,
  type DiscrepancySeverity,
  DISCREPANCY_TYPES,
  DISCREPANCY_TYPE_LABELS,
  DISCREPANCY_SEVERITIES,
  DISCREPANCY_SEVERITY_LABELS,
} from '@/types/verificationCase';
import { createPropertyDiscrepancy } from '@/lib/society/verificationWorkflowService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Flag, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';

interface CreateDiscrepancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  societyId: string;
  buildingId?: string | null;
  buildingName?: string | null;
  floorId?: string | null;
  floorLabel?: string | null;
  flatId?: string | null;
  flatNumber?: string | null;
  propertyId?: string | null;
  location?: { latitude: number; longitude: number } | null;
  onCreated?: (discrepancyId: string, caseId?: string) => void;
}

export function CreateDiscrepancyModal({
  isOpen,
  onClose,
  societyId,
  buildingId,
  buildingName,
  floorId,
  floorLabel,
  flatId,
  flatNumber,
  propertyId,
  location,
  onCreated,
}: CreateDiscrepancyModalProps) {
  const { toast } = useToast();

  const [type, setType] = useState<DiscrepancyType>('BUILDING_STRUCTURE_MISMATCH');
  const [severity, setSeverity] = useState<DiscrepancySeverity>('MEDIUM');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [openCase, setOpenCase] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast({
        variant: 'destructive',
        title: 'Title & description required',
        description: 'Please detail the specific observation or discrepancy detected.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createPropertyDiscrepancy({
        societyId,
        buildingId,
        floorId,
        flatId,
        propertyId,
        type,
        title: title.trim(),
        description: description.trim(),
        severity,
        location,
        openVerificationCase: openCase,
      });

      toast({
        variant: 'success',
        title: 'Discrepancy recorded',
        description: openCase
          ? 'Recorded discrepancy and initiated an official verification case.'
          : 'Recorded discrepancy in official property log.',
      });

      setTitle('');
      setDescription('');
      onClose();
      if (onCreated) onCreated(result.discrepancyId, result.caseId);
    } catch (err) {
      console.error('Failed to create discrepancy:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to record discrepancy',
        description: err instanceof Error ? err.message : 'Something went wrong.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Flag className="h-4 w-4 text-red-600" />
            Raise Property Discrepancy Flag
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Flag a physical, structural, or cadastral difference for official verification review.
          </DialogDescription>
        </DialogHeader>

        {/* Context Target Chip */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
            Target Property Scope
          </span>
          <p className="font-semibold text-slate-800">
            {buildingName ? `Building: ${buildingName}` : 'Society Level'}
            {floorLabel ? ` • Floor: ${floorLabel}` : ''}
            {flatNumber ? ` • Flat ${flatNumber}` : ''}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 py-1 text-xs">
          {/* Discrepancy Type */}
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Discrepancy Category
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DiscrepancyType)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-cyan-500 focus:outline-none"
            >
              {DISCREPANCY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DISCREPANCY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Severity Level
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {DISCREPANCY_SEVERITIES.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSeverity(s)}
                  className={`rounded-lg border py-1.5 text-center text-[10px] font-bold transition-all ${
                    severity === s
                      ? 'border-cyan-600 bg-cyan-50 font-black text-cyan-900 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Discrepancy Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Unit layout area mismatch vs approved plan"
              required
              className="text-xs"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Detailed Observations
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the discrepancy observed between on-site/3D digital twin observation and registered cadastral data…"
              rows={3}
              required
              className="text-xs"
            />
          </div>

          {/* Open case checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="openCaseCheck"
              checked={openCase}
              onChange={(e) => setOpenCase(e.target.checked)}
              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <label htmlFor="openCaseCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Initiate official Verification Case immediately
            </label>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="text-xs font-bold gap-1.5">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Recording…
                </>
              ) : (
                <>
                  <Flag className="h-3.5 w-3.5" /> Submit Discrepancy
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
