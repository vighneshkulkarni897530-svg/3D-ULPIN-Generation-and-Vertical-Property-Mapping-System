'use client';

import React from 'react';
import { Bell, AlertTriangle, ArrowRight, FilePlus2, CheckCircle2 } from 'lucide-react';
import type { PropertyRenewalRecord } from '@/types/renewal';
import { formatDateDisplay } from '@/lib/renewals/renewalCalculator';
import { cn } from '@/lib/utils';

interface RenewalBannerProps {
  record: PropertyRenewalRecord;
  onCreateReport?: () => void;
  className?: string;
}

export function RenewalBanner({ record, onCreateReport, className }: RenewalBannerProps) {
  if (record.renewalStatus === 'UP_TO_DATE') {
    return null;
  }

  const isOverdue = record.renewalStatus === 'OVERDUE';
  const isDue = record.renewalStatus === 'DUE';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all',
        isOverdue
          ? 'border-rose-300 bg-rose-50/90 text-rose-950'
          : isDue
          ? 'border-orange-300 bg-orange-50/90 text-orange-950'
          : 'border-amber-300 bg-amber-50/90 text-amber-950',
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm',
              isOverdue
                ? 'bg-rose-500 text-white'
                : isDue
                ? 'bg-orange-500 text-white'
                : 'bg-amber-500 text-white'
            )}
          >
            {isOverdue ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
          </span>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider">
                {isOverdue
                  ? '⚠️ Periodic Verification Overdue'
                  : isDue
                  ? '⚠️ Periodic Verification Due'
                  : '🔔 Property Review Reminder'}
              </span>
              <span className="rounded-full bg-white/80 px-2 py-0.5 font-mono text-[10px] font-bold">
                Age: {record.calculatedAgeYears} yrs
              </span>
            </div>

            <p className="text-xs leading-relaxed text-slate-800">
              {isOverdue ? (
                <>
                  <strong>{record.buildingName}</strong> has crossed its configured 10-year review interval.
                  Last verified on <strong>{formatDateDisplay(record.lastVerificationDate)}</strong>. Periodic
                  verification was due <strong>{formatDateDisplay(record.nextReviewDate)}</strong>.
                </>
              ) : (
                <>
                  <strong>{record.buildingName}</strong> will reach its configured 10-year review interval.
                  Review due: <strong>{formatDateDisplay(record.nextReviewDate)}</strong>.
                </>
              )}
            </p>

            <p className="text-[10px] font-medium text-slate-500">
              * Non-punitive decision support: Periodic verification ensures updated structural records,
              renovation lineage, and cadastral accuracy.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:self-center">
          {onCreateReport && (
            <button
              onClick={onCreateReport}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]',
                isOverdue
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                  : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
              )}
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              {isOverdue ? 'Create Renewal Report' : 'Prepare Renewal Report'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
