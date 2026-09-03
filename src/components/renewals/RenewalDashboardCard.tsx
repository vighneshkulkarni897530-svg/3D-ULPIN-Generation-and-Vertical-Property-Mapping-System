'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, CheckCircle2, Bell, AlertTriangle, AlertOctagon, ArrowRight, ShieldCheck } from 'lucide-react';
import { useRenewals } from '@/context/RenewalContext';
import { cn } from '@/lib/utils';

export function RenewalDashboardCard({ className }: { className?: string }) {
  const { renewalStats } = useRenewals();

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-slate-900">
              Property Renewal & Verification
            </h3>
            <p className="text-[11px] font-medium text-slate-500">
              Configured 10-year review cycle tracking
            </p>
          </div>
        </div>
        <Link
          href="/renewals"
          className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700 hover:underline"
        >
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Up to Date */}
        <div className="flex flex-col justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Up to Date
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900 tabular-nums">
            {renewalStats.upToDate}
          </p>
          <span className="text-[10px] font-medium text-emerald-600">Record verified</span>
        </div>

        {/* Due Soon */}
        <div className="flex flex-col justify-between rounded-xl border border-amber-100 bg-amber-50/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Due Soon
            </span>
            <Bell className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-900 tabular-nums">
            {renewalStats.dueSoon}
          </p>
          <span className="text-[10px] font-medium text-amber-600">Within ~12 mos</span>
        </div>

        {/* Due */}
        <div className="flex flex-col justify-between rounded-xl border border-orange-100 bg-orange-50/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700">
              Due
            </span>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-orange-900 tabular-nums">
            {renewalStats.due}
          </p>
          <span className="text-[10px] font-medium text-orange-600">Milestone reached</span>
        </div>

        {/* Overdue */}
        <div className="flex flex-col justify-between rounded-xl border border-rose-100 bg-rose-50/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
              Overdue
            </span>
            <AlertOctagon className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-900 tabular-nums">
            {renewalStats.overdue}
          </p>
          <span className="text-[10px] font-medium text-rose-600">&gt;10-yr interval</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <ShieldCheck className="h-4 w-4 text-cyan-600" />
          <span>
            Pending Officer Review:{' '}
            <strong className="text-slate-900">{renewalStats.pendingReview} cases</strong>
          </span>
        </div>
        <Link
          href="/renewals?filter=pending"
          className="font-bold text-cyan-600 hover:text-cyan-700"
        >
          Review queue
        </Link>
      </div>
    </div>
  );
}
