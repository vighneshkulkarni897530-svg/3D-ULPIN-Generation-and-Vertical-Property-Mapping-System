'use client';

import React, { useState } from 'react';
import {
  X,
  FilePlus2,
  Building2,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Home,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { PropertyRenewalRecord, PropertyCondition } from '@/types/renewal';
import { useRenewals } from '@/context/RenewalContext';
import { formatDateDisplay } from '@/lib/renewals/renewalCalculator';

interface CreateRenewalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRecord: PropertyRenewalRecord;
}

export function CreateRenewalReportModal({
  isOpen,
  onClose,
  initialRecord,
}: CreateRenewalReportModalProps) {
  const { createRenewalReport } = useRenewals();

  // Pre-populate with existing property information
  const [floors, setFloors] = useState(
    initialRecord.currentSubmission?.floors || initialRecord.previousRecord.floors || 5
  );
  const [units, setUnits] = useState(
    initialRecord.currentSubmission?.units || initialRecord.previousRecord.units || 20
  );
  const [builtUpArea, setBuiltUpArea] = useState(
    initialRecord.currentSubmission?.builtUpAreaSqFt || initialRecord.previousRecord.builtUpAreaSqFt || 25000
  );
  const [condition, setCondition] = useState<PropertyCondition>(
    initialRecord.currentSubmission?.condition || 'GOOD'
  );
  const [renovationDetails, setRenovationDetails] = useState(
    initialRecord.currentSubmission?.renovationDetails || ''
  );
  const [structuralAlterations, setStructuralAlterations] = useState(
    initialRecord.currentSubmission?.structuralAlterations || false
  );
  const [remarks, setRemarks] = useState(
    initialRecord.remarks || 'Periodic verification report submitted for cadastral record renewal.'
  );

  const [photos, setPhotos] = useState<string[]>(
    initialRecord.photos.length > 0
      ? initialRecord.photos
      : ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80']
  );

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  // Real-time diff calculation
  const hasFloorDiff = floors !== initialRecord.previousRecord.floors;
  const hasUnitDiff = units !== initialRecord.previousRecord.units;
  const hasAreaDiff =
    initialRecord.previousRecord.builtUpAreaSqFt &&
    Math.abs(builtUpArea - initialRecord.previousRecord.builtUpAreaSqFt) > 50;
  const hasChanges = hasFloorDiff || hasUnitDiff || hasAreaDiff || structuralAlterations;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createRenewalReport({
        propertyId: initialRecord.propertyId,
        buildingId: initialRecord.buildingId,
        buildingName: initialRecord.buildingName,
        societyName: initialRecord.societyName,
        ulpin: initialRecord.ulpin,
        address: initialRecord.address,
        constructionDate: initialRecord.constructionDate,
        lastVerificationDate: initialRecord.lastVerificationDate,
        reviewIntervalYears: initialRecord.reviewIntervalYears,
        currentSubmission: {
          floors: Number(floors),
          units: Number(units),
          builtUpAreaSqFt: Number(builtUpArea),
          condition,
          renovationDetails,
          structuralAlterations,
          structuralNotes: renovationDetails,
        },
        photos,
        remarks,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-tech-cyan">
              <FilePlus2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Create Renewal Report</h2>
              <p className="text-xs text-slate-500">
                Periodic Cadastral Verification &amp; Property Record Update
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          {/* Automatically populated property summary */}
          <div className="rounded-xl border border-cyan-100 bg-cyan-50/50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-900">
              <Sparkles className="h-4 w-4 text-cyan-600" />
              <span>Auto-Populated Cadastral Information</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Property ID</span>
                <p className="font-mono font-bold text-slate-800">{initialRecord.propertyId}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">ULPIN / Spatial ID</span>
                <p className="font-mono font-bold text-slate-800 truncate" title={initialRecord.ulpin}>
                  {initialRecord.ulpin}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Society / Building</span>
                <p className="font-semibold text-slate-800 truncate" title={initialRecord.buildingName}>
                  {initialRecord.buildingName}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Building Age</span>
                <p className="font-bold text-slate-800">{initialRecord.calculatedAgeYears} years</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Construction Date</span>
                <p className="font-semibold text-slate-800">
                  {formatDateDisplay(initialRecord.constructionDate)}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Last Verification</span>
                <p className="font-semibold text-slate-800">
                  {formatDateDisplay(initialRecord.lastVerificationDate)}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Review Interval</span>
                <p className="font-semibold text-slate-800">{initialRecord.reviewIntervalYears} years</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Next Review Milestone</span>
                <p className="font-bold text-cyan-700">
                  {formatDateDisplay(initialRecord.nextReviewDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Current building details / updates */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Updated Building Details &amp; Physical Condition
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Floors
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={floors}
                  onChange={(e) => setFloors(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Units
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={units}
                  onChange={(e) => setUnits(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Built-up Area (sq ft)
                </label>
                <input
                  type="number"
                  value={builtUpArea}
                  onChange={(e) => setBuiltUpArea(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Physical Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as PropertyCondition)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-cyan-500 focus:outline-none bg-white"
              >
                <option value="EXCELLENT">Excellent — Sound structural &amp; cosmetic condition</option>
                <option value="GOOD">Good — Minor cosmetic wear, no structural damage</option>
                <option value="FAIR">Fair — Normal age-related wear, maintenance scheduled</option>
                <option value="REQUIRES_MAINTENANCE">Requires Maintenance — Seepage, cracked plaster, or utility fixes needed</option>
                <option value="CRITICAL">Critical — Structural assessment / repair mandated</option>
              </select>
            </div>
          </div>

          {/* Renovations / Alterations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Structural Alterations or Renovations
              </label>
              <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={structuralAlterations}
                  onChange={(e) => setStructuralAlterations(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="font-medium text-slate-600">Physical changes occurred since last verification</span>
              </label>
            </div>
            <textarea
              rows={2}
              value={renovationDetails}
              onChange={(e) => setRenovationDetails(e.target.value)}
              placeholder="Describe any floor additions, partition removals, balcony enclosures, or structural renovations..."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* LIVE BEFORE / AFTER DIFF COMPARISON */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Before / After Information Comparison
            </h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-[10px] font-bold uppercase text-slate-400">Previous Cadastral Record</span>
                <p className="mt-1 font-semibold text-slate-800">
                  Year: {initialRecord.previousRecord.constructionYear}
                </p>
                <p className="text-slate-600">Floors: {initialRecord.previousRecord.floors}</p>
                <p className="text-slate-600">Units: {initialRecord.previousRecord.units}</p>
                <p className="text-slate-600">
                  Area: {initialRecord.previousRecord.builtUpAreaSqFt?.toLocaleString('en-IN')} sq.ft
                </p>
              </div>

              <div className="rounded-lg border border-cyan-200 bg-cyan-50/50 p-3">
                <span className="text-[10px] font-bold uppercase text-cyan-600">Current Submission</span>
                <p className="mt-1 font-semibold text-slate-800">
                  Condition: {condition}
                </p>
                <p className={hasFloorDiff ? 'font-bold text-amber-700' : 'text-slate-600'}>
                  Floors: {floors} {hasFloorDiff && '⚠️ Changed'}
                </p>
                <p className={hasUnitDiff ? 'font-bold text-amber-700' : 'text-slate-600'}>
                  Units: {units} {hasUnitDiff && '⚠️ Changed'}
                </p>
                <p className={hasAreaDiff ? 'font-bold text-amber-700' : 'text-slate-600'}>
                  Area: {builtUpArea.toLocaleString('en-IN')} sq.ft
                </p>
              </div>
            </div>

            {hasChanges && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-100/70 p-2.5 text-xs text-amber-900 font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>⚠️ Change detected — requires revenue officer verification upon submission.</span>
              </div>
            )}
          </div>

          {/* Photographs & Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current Photographs &amp; Supporting Evidence
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((url, idx) => (
                <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Building evidence ${idx + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-3 text-center text-slate-500 hover:border-cyan-500 hover:bg-cyan-50/20 cursor-pointer">
                <Upload className="h-5 w-5 text-slate-400 mb-1" />
                <span className="text-[10px] font-bold">Attach Photo / Doc</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Additional Remarks
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2 text-xs font-bold text-white shadow-tech-cyan hover:opacity-95 disabled:opacity-50"
            >
              <FilePlus2 className="h-4 w-4" />
              {submitting ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
