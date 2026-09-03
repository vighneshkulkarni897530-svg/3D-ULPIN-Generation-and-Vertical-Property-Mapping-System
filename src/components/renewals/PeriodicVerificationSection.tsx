'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Bell,
  AlertTriangle,
  AlertOctagon,
  FileText,
  FilePlus2,
  Layers,
  Building2,
  Info,
} from 'lucide-react';
import type { PropertyRenewalRecord } from '@/types/renewal';
import { formatDateDisplay } from '@/lib/renewals/renewalCalculator';
import { CreateRenewalReportModal } from './CreateRenewalReportModal';
import { cn } from '@/lib/utils';

interface PeriodicVerificationSectionProps {
  record: PropertyRenewalRecord;
  className?: string;
}

export function PeriodicVerificationSection({ record, className }: PeriodicVerificationSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const statusConfig = {
    UP_TO_DATE: {
      label: '✓ UP TO DATE',
      desc: 'No action required. Structural and cadastral records are current.',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: CheckCircle2,
      accent: 'emerald',
    },
    DUE_SOON: {
      label: '🔔 RENEWAL DUE SOON',
      desc: 'Approaching the configured 10-year review interval. Prepare documentation.',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: Bell,
      accent: 'amber',
    },
    DUE: {
      label: '⚠️ RENEWAL DUE',
      desc: 'Review milestone reached. Submission of periodic verification report recommended.',
      badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
      icon: AlertTriangle,
      accent: 'orange',
    },
    OVERDUE: {
      label: '🔴 VERIFICATION OVERDUE',
      desc: 'Property has crossed its 10-year review interval without re-verification.',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: AlertOctagon,
      accent: 'rose',
    },
  }[record.renewalStatus];

  const StatusIcon = statusConfig.icon;

  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white p-6 shadow-sm', className)}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
              <Clock className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900">Periodic Verification</h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Cadastral lifecycle tracking based on the configured 10-year review interval
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black tracking-wide',
              statusConfig.badgeClass
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {statusConfig.label}
          </span>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-cyan-600"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            Create Renewal Report
          </button>
        </div>
      </div>

      {/* Grid of Key Facts */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Calendar className="h-3 w-3 text-cyan-500" /> Construction Date
          </span>
          <p className="mt-1 text-sm font-extrabold text-slate-900">
            {formatDateDisplay(record.constructionDate)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Clock className="h-3 w-3 text-cyan-500" /> Building Age
          </span>
          <p className="mt-1 text-sm font-extrabold text-slate-900">
            {record.calculatedAgeYears} years
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Layers className="h-3 w-3 text-cyan-500" /> Review Interval
          </span>
          <p className="mt-1 text-sm font-extrabold text-slate-900">
            {record.reviewIntervalYears} years
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <ShieldCheck className="h-3 w-3 text-emerald-500" /> Last Verification
          </span>
          <p className="mt-1 text-sm font-extrabold text-slate-900">
            {formatDateDisplay(record.lastVerificationDate)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Calendar className="h-3 w-3 text-blue-500" /> Next Review
          </span>
          <p className="mt-1 text-sm font-extrabold text-slate-900">
            {formatDateDisplay(record.nextReviewDate)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <FileText className="h-3 w-3 text-purple-500" /> Case Status
          </span>
          <p className="mt-1 text-sm font-extrabold text-slate-900">
            {record.caseStatus.replace(/_/g, ' ')}
          </p>
        </div>
      </div>

      {/* Changes Detected Warning (if any) */}
      {record.changesDetected && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>⚠️ Change detected — requires revenue officer verification:</span>
          </div>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-[11px] text-amber-800">
            {record.changeNotes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Data Honesty Disclaimer */}
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">
        <Info className="h-4 w-4 shrink-0 text-cyan-600 mt-0.5" />
        <p>
          <strong>Policy Note:</strong> Periodic verification is a maintenance and verification-support
          milestone configured on a 10-year interval. This platform does not assert that buildings or property
          ownership legally expire after 10 years. Official determinations remain subject to municipal laws.
        </p>
      </div>

      {/* Modal */}
      <CreateRenewalReportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialRecord={record}
      />
    </div>
  );
}
