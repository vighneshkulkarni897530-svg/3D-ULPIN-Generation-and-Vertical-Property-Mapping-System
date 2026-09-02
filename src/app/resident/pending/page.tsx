'use client';

/**
 * /resident/pending — My Registration Status (Phase 3)
 * =====================================================
 * Shows the signed-in resident their OWN registration: the selected
 * property, the submitted date and the current approval status.
 *   - pending  → "Your residency application is awaiting Society Admin approval."
 *   - rejected → shows the reason and offers resubmission (own claim only).
 *   - approved → links to the resident dashboard.
 * No other resident's data is reachable from this page (Firestore rules
 * additionally enforce single-record ownership).
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Home,
  Loader2,
  RefreshCcw,
  XCircle,
} from 'lucide-react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/context/AuthContext';
import {
  resolveResidentProperty,
  type ResolvedResidentProperty,
} from '@/lib/society/residentProperty';
import { getMyResidentRecord } from '@/lib/society/residentService';
import {
  RESIDENT_STATUS_LABELS,
  RESIDENT_STATUS_VARIANTS,
  type Resident,
} from '@/types/society';

type LoadState = 'loading' | 'ready' | 'error';

/** Formats a Firestore timestamp for display (client-side, post-fetch only). */
function formatDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <dt className="shrink-0 text-[11px] font-semibold text-slate-400">{label}</dt>
      <dd className="break-words text-right text-xs font-semibold text-slate-800">{value ?? '—'}</dd>
    </div>
  );
}

export default function ResidentPendingPage() {
  return (
    <ProtectedRoute>
      <ResidentPendingContent />
    </ProtectedRoute>
  );
}

function ResidentPendingContent() {
  const router = useRouter();
  const { sessionUser, authStatus } = useAuth();
  const [record, setRecord] = React.useState<Resident | null>(null);
  const [property, setProperty] = React.useState<ResolvedResidentProperty | null>(null);
  const [state, setState] = React.useState<LoadState>('loading');
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    if (authStatus !== 'initializing' && !sessionUser?.id) {
      router.replace('/auth/login?next=/resident/pending');
    }
  }, [authStatus, sessionUser, router]);

  React.useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let cancelled = false;
    setState('loading');
    (async () => {
      try {
        const rec = await getMyResidentRecord();
        if (cancelled) return;
        setRecord(rec);
        setProperty(rec ? await resolveResidentProperty(rec) : null);
        if (!cancelled) setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authStatus, reloadKey]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Society Digital Twin · Phase 3"
        title="My Registration"
        description="The status of your residency application. Only you can see this page."
        actions={
          <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)} disabled={state === 'loading'}>
            <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
          </Button>
        }
      />

      {state === 'loading' && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading your application…
          </p>
        </div>
      )}

      {state === 'error' && (
        <Card className="mt-6">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-fit rounded-2xl border border-red-200 bg-red-50 p-3">
              <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900">Could not load your application</h2>
            <p className="mt-1 text-xs text-slate-500">Please check your connection and try again.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {state === 'ready' && !record && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <EmptyState
              icon={<Home className="h-8 w-8" aria-hidden="true" />}
              title="No resident application yet"
              description="You have not registered as a resident yet. Start by selecting your society, building, floor and flat."
              action={
                <Button variant="gradient" asChild>
                  <Link href="/resident/register">Register as Resident</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {state === 'ready' && record && (
        <div className="mt-6 space-y-5">
          {record.status === 'pending' && (
            <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-amber-900">Pending Society Admin Approval</p>
                <p className="mt-0.5 text-xs font-medium text-amber-800">
                  Your residency application is awaiting Society Admin approval.
                </p>
              </div>
            </div>
          )}

          {record.status === 'approved' && (
            <div role="status" className="flex flex-col gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold text-green-900">Approved by Society Admin</p>
                  <p className="mt-0.5 text-xs font-medium text-green-800">
                    Your residency was approved on {formatDate(record.approvedAt)}.
                  </p>
                </div>
              </div>
              <Button variant="gradient" size="sm" asChild>
                <Link href="/resident/dashboard">Go to My Dashboard</Link>
              </Button>
            </div>
          )}

          {record.status === 'rejected' && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-red-900">Registration Rejected</p>
                  <p className="mt-0.5 text-xs font-medium text-red-800">
                    Your application was rejected on {formatDate(record.rejectedAt)}. Reason:
                  </p>
                  <p className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-800">
                    {record.rejectionReason ?? 'No reason was provided.'}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/resident/register">Resubmit Registration</Link>
                </Button>
              </div>
            </div>
          )}

          {record.status === 'removed' && (
            <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-700">
              Removed — your residency was removed by the society admin.
            </div>
          )}

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold tracking-tight text-slate-900">Application Details</h2>
                <Badge variant={RESIDENT_STATUS_VARIANTS[record.status]} className="px-2.5 py-0.5 text-[10px]">
                  {RESIDENT_STATUS_LABELS[record.status]}
                </Badge>
              </div>
              <dl className="mt-3">
                <DetailRow label="Society" value={property?.society?.name} />
                <DetailRow label="Building" value={property?.building?.name} />
                <DetailRow label="Floor" value={property?.floor?.floorLabel} />
                <DetailRow label="Flat" value={property?.flat?.flatNumber} />
                <DetailRow label="Submitted" value={formatDate(record.submittedAt)} />
                <DetailRow label="Last Updated" value={formatDate(record.updatedAt)} />
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                Society Admin approval confirms your registration within the society. It is not
                government or legal ownership verification.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
