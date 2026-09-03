'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileText,
  Clock,
  Building2,
  Layers,
  Home,
  Check,
} from 'lucide-react';
import type { PropertyRenewalRecord, RenewalCaseStatus } from '@/types/renewal';
import { useRenewals } from '@/context/RenewalContext';
import { formatDateDisplay } from '@/lib/renewals/renewalCalculator';

interface RenewalReviewDrawerProps {
  record: PropertyRenewalRecord | null;
  onClose: () => void;
}

export function RenewalReviewDrawer({ record, onClose }: RenewalReviewDrawerProps) {
  const { reviewRenewalCase } = useRenewals();
  const [officerRemarks, setOfficerRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!record) return null;

  const handleAction = async (decision: RenewalCaseStatus) => {
    setProcessing(true);
    try {
      await reviewRenewalCase(
        record.renewalId,
        decision,
        officerRemarks || (decision === 'VERIFIED' ? 'Periodic verification passed. 10-year cadastral seal renewed.' : 'Correction requested on submitted details.')
      );
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm">
      <div className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500 text-slate-950 font-bold">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Official Periodic Verification Review
              </h2>
              <p className="text-xs text-cyan-300 font-mono">
                {record.ulpin} · Case {record.renewalId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Building info strip */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">{record.buildingName}</h3>
                <p className="text-xs text-slate-500">{record.address}</p>
              </div>
              <span className="rounded-full bg-cyan-100 px-3 py-1 font-mono text-xs font-bold text-cyan-800">
                Age: {record.calculatedAgeYears} yrs
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Construction</span>
                <p className="font-semibold text-slate-800">
                  {formatDateDisplay(record.constructionDate)}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Last Verified</span>
                <p className="font-semibold text-slate-800">
                  {formatDateDisplay(record.lastVerificationDate)}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Review Due</span>
                <p className="font-bold text-amber-700">
                  {formatDateDisplay(record.nextReviewDate)}
                </p>
              </div>
            </div>
          </div>

          {/* SIDE-BY-SIDE BEFORE / AFTER COMPARISON */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Before / After Record Comparison
            </h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Previous Record */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Cadastral Baseline Record
                </span>
                <div className="mt-2 space-y-1.5 text-slate-700">
                  <p>Construction Year: <strong>{record.previousRecord.constructionYear}</strong></p>
                  <p>Floors: <strong>{record.previousRecord.floors}</strong></p>
                  <p>Units: <strong>{record.previousRecord.units}</strong></p>
                  <p>Built-up Area: <strong>{record.previousRecord.builtUpAreaSqFt?.toLocaleString('en-IN') || '—'} sq.ft</strong></p>
                  <p>Condition: <span className="font-semibold text-slate-800">{record.previousRecord.condition || 'GOOD'}</span></p>
                </div>
              </div>

              {/* Current Submission */}
              <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">
                  Current Citizen Submission
                </span>
                <div className="mt-2 space-y-1.5 text-slate-800">
                  <p>
                    Floors:{' '}
                    <strong className={record.currentSubmission && record.currentSubmission.floors !== record.previousRecord.floors ? 'text-amber-700 underline' : ''}>
                      {record.currentSubmission?.floors ?? record.previousRecord.floors}
                    </strong>
                  </p>
                  <p>
                    Units:{' '}
                    <strong className={record.currentSubmission && record.currentSubmission.units !== record.previousRecord.units ? 'text-amber-700 underline' : ''}>
                      {record.currentSubmission?.units ?? record.previousRecord.units}
                    </strong>
                  </p>
                  <p>
                    Built-up Area:{' '}
                    <strong>
                      {record.currentSubmission?.builtUpAreaSqFt?.toLocaleString('en-IN') ?? record.previousRecord.builtUpAreaSqFt?.toLocaleString('en-IN')} sq.ft
                    </strong>
                  </p>
                  <p>
                    Condition:{' '}
                    <span className="font-bold text-emerald-700">
                      {record.currentSubmission?.condition || 'GOOD'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {record.changesDetected && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Physical Changes Flagged for Officer Verification:</span>
                </div>
                <ul className="list-inside list-disc space-y-0.5 text-[11px] text-amber-800 pl-1">
                  {record.changeNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Photographic Evidence */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Submitted Photographs &amp; Site Evidence
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {record.photos.map((url, idx) => (
                <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Site evidence ${idx + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Citizen remarks */}
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400">Citizen Remarks</span>
            <p className="mt-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100">
              {record.remarks || 'None provided.'}
            </p>
          </div>

          {/* Officer remarks input */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Revenue Officer Verification Remarks
            </label>
            <textarea
              rows={3}
              value={officerRemarks}
              onChange={(e) => setOfficerRemarks(e.target.value)}
              placeholder="Record structural check observations, sanction plan verification, or corrective directions..."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            disabled={processing}
            onClick={() => handleAction('REQUIRES_CORRECTION')}
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"
          >
            Request Correction
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={processing}
              onClick={() => handleAction('REJECTED')}
              className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
            >
              Reject
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={() => handleAction('VERIFIED')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              <Check className="h-4 w-4" />
              {processing ? 'Processing...' : 'Approve & Issue 10-Yr Seal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
