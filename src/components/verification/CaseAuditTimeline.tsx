'use client';

import React from 'react';
import { type CaseAuditHistory } from '@/types/verificationCase';
import { Badge } from '@/components/ui/badge';
import { History, ShieldCheck, UserCheck, FileText, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CaseAuditTimelineProps {
  history: CaseAuditHistory[];
  isLoading?: boolean;
  className?: string;
}

export function CaseAuditTimeline({
  history,
  isLoading = false,
  className,
}: CaseAuditTimelineProps) {
  if (isLoading) {
    return <div className="py-6 text-center text-xs text-slate-400">Loading audit history…</div>;
  }

  if (!history || history.length === 0) {
    return (
      <div className={cn('rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400', className)}>
        <History className="mx-auto mb-1.5 h-6 w-6 text-slate-300" />
        <p className="font-semibold text-slate-600">No audit events recorded</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="relative pl-6 before:absolute before:bottom-0 before:left-2.5 before:top-2 before:w-0.5 before:bg-slate-200 space-y-4">
        {history.map((event) => {
          return (
            <div key={event.id} className="relative group">
              {/* Timeline node icon */}
              <div className="absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-cyan-600 text-white shadow-sm">
                <History className="h-2.5 w-2.5" />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:border-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-slate-400 pb-1 border-b border-slate-100">
                  <span className="font-bold uppercase tracking-wider text-slate-700">
                    {event.action.replace(/_/g, ' ')}
                  </span>
                  <span className="font-mono">
                    {event.createdAt ? event.createdAt.toLocaleString('en-IN') : '—'}
                  </span>
                </div>

                <p className="mt-2 text-xs font-semibold text-slate-800 leading-relaxed">
                  {event.reason || 'Status updated in official verification workflow.'}
                </p>

                {event.previousStatus && event.newStatus && event.previousStatus !== event.newStatus && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5">{event.previousStatus}</span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="rounded bg-cyan-50 font-bold text-cyan-800 px-1.5 py-0.5">
                      {event.newStatus}
                    </span>
                  </div>
                )}

                <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-50 pt-1.5">
                  <span>Actor: {event.performedByName || 'Officer'}</span>
                  <span className="font-semibold text-slate-500">{event.performedByRole || 'Government Officer'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
