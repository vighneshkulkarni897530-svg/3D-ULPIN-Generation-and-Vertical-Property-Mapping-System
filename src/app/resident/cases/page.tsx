'use client';

/**
 * /resident/cases — Citizen Cases & Grievance Registry (Phase 10)
 * ===============================================================
 * Lists all active and historical verification cases, property disputes,
 * and cadastral determinations for the logged-in citizen.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Scale,
  Plus,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Clock,
  Building2,
  Layers,
  Home,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/context/AuthContext';
import { getCitizenCases } from '@/lib/citizen/citizenService';
import { type VerificationCase } from '@/types/verificationCase';
import { CaseStatusBadge, CaseSeverityBadge } from '@/components/verification/CaseStatusBadge';

export default function ResidentCasesPage() {
  return (
    <ProtectedRoute>
      <ResidentCasesContent />
    </ProtectedRoute>
  );
}

function ResidentCasesContent() {
  const router = useRouter();
  const { sessionUser, authStatus } = useAuth();
  const [cases, setCases] = React.useState<VerificationCase[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadCases = React.useCallback(async () => {
    try {
      const items = await getCitizenCases();
      setCases(items);
    } catch (err) {
      console.error('Failed to load citizen cases:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    if (authStatus === 'authenticated') {
      loadCases();
    }
  }, [authStatus, loadCases]);

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '—';
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="CITIZEN GRIEVANCES &amp; CASES · PHASE 10"
        title="My Verification Cases"
        description="Track the progress of your property verification disputes, field inspection requests, and official government determinations."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRefreshing(true);
                loadCases();
              }}
              disabled={refreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button asChild size="sm" className="bg-gradient-to-r from-cyan-600 to-blue-600 font-bold text-white shadow-sm">
              <Link href="/disputes/new">
                <Plus className="h-4 w-4 mr-1.5" />
                Report Property Issue
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : cases.length === 0 ? (
          <EmptyState
            title="No Active Verification Cases"
            description="You have not raised any property disputes or verification grievances. If you notice structural, spatial, or title discrepancies, you can file an issue."
            action={
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href="/disputes/new">
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Report Property Issue
                </Link>
              </Button>
            }
          />
        ) : (
          cases.map((c) => (
            <Card key={c.id} className="border border-slate-200 bg-white transition-all hover:border-cyan-400/70 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200">
                        {c.caseNumber}
                      </span>
                      <CaseStatusBadge status={c.status} />
                      <CaseSeverityBadge severity={c.severity} />
                      {c.decision && (
                        <Badge variant="secondary" className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                          DECISION: {c.decision.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 line-clamp-1">
                        {c.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {c.decisionReason || 'Under official investigation by revenue officer.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3.5 w-3.5" /> Filed: {formatDate(c.createdAt)}
                      </span>
                      {c.assignedOfficerName && (
                        <span>
                          Assigned Officer: <strong className="text-slate-700 font-semibold">{c.assignedOfficerName}</strong>
                        </span>
                      )}
                      {c.discrepancyIds && c.discrepancyIds.length > 0 && (
                        <span>· {c.discrepancyIds.length} discrepancy item{c.discrepancyIds.length === 1 ? '' : 's'}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end sm:shrink-0">
                    <Button asChild size="sm" variant="outline" className="border-slate-300 font-bold hover:border-cyan-500 hover:text-cyan-700">
                      <Link href={`/resident/cases/${c.id}`}>
                        View Dossier <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
