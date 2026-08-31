'use client';

/**
 * /admin/audit-log (Phase 10) — ADMIN ONLY
 * ----------------------------------------
 * Live view of the server-side audit trail. Only records created by real
 * prototype actions (logins, user changes, verification updates, workflow
 * actions…) appear here — no fake historical entries are seeded.
 */
import React from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Clock,
  KeyRound,
  LogIn,
  LogOut,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  UserCog,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { PERMISSIONS } from '@/types/auth';
import { useAuth } from '@/context/AuthContext';
import { apiGetAuditLog, AuthApiError, type AuditRecordClient } from '@/lib/auth/client';
import { ROLE_LABELS } from '@/lib/auth/permissions';

const ACTION_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  LOGIN: { label: 'Login', icon: LogIn, tone: 'bg-emerald-50 text-emerald-600' },
  LOGOUT: { label: 'Logout', icon: LogOut, tone: 'bg-slate-100 text-slate-600' },
  REGISTER: { label: 'Registration', icon: UserCog, tone: 'bg-cyan-50 text-cyan-600' },
  LOGIN_FAILED: { label: 'Failed sign-in', icon: ShieldAlert, tone: 'bg-red-50 text-red-600' },
  USER_ROLE_CHANGE: { label: 'Role change', icon: UserCog, tone: 'bg-indigo-50 text-indigo-600' },
  USER_STATUS_CHANGE: { label: 'Status change', icon: UserCog, tone: 'bg-amber-50 text-amber-600' },
  USER_CREATED: { label: 'Account created', icon: UserCog, tone: 'bg-cyan-50 text-cyan-600' },
  VERIFICATION_UPDATED: { label: 'Verification update', icon: ShieldCheck, tone: 'bg-emerald-50 text-emerald-600' },
  CONFLICT_UPDATED: { label: 'Conflict update', icon: AlertTriangle, tone: 'bg-amber-50 text-amber-600' },
  WORKFLOW_ACTION: { label: 'Workflow action', icon: ScrollText, tone: 'bg-blue-50 text-blue-600' },
  DISPUTE_SUBMITTED: { label: 'Dispute submitted', icon: AlertTriangle, tone: 'bg-amber-50 text-amber-600' },
  FIELD_VERIFICATION_REQUESTED: { label: 'Field verification', icon: ShieldCheck, tone: 'bg-emerald-50 text-emerald-600' },
  PROPERTY_UPDATED: { label: 'Property update', icon: ScrollText, tone: 'bg-blue-50 text-blue-600' },
  ADMIN_ACTION: { label: 'Administrative', icon: KeyRound, tone: 'bg-indigo-50 text-indigo-600' },
};

const ENTITY_LABELS: Record<string, string> = {
  USER: 'User Account',
  SESSION: 'Session',
  PROPERTY: 'Property Verification',
  PARCEL: 'Parcel',
  BUILDING: 'Building',
  FLOOR: 'Floor',
  VERIFICATION: 'Verification',
  CONFLICT: 'Spatial Conflict',
  WORKFLOW_TASK: 'Workflow Task',
  DISPUTE: 'Dispute',
  FIELD_VERIFICATION: 'Field Verification',
  REPORT: 'Report',
  SYSTEM: 'System',
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AuditLogPage() {
  const router = useRouter();
  const { hasPermission, authStatus } = useAuth();
  const [records, setRecords] = React.useState<AuditRecordClient[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionFilter, setActionFilter] = React.useState<string>('ALL');
  const [entityFilter, setEntityFilter] = React.useState<string>('ALL');
  const [refreshKey, setRefreshKey] = React.useState(0);
  const allowed = React.useMemo(() => hasPermission(PERMISSIONS.VIEW_ACTIVITY_LOG), [hasPermission]);

  React.useEffect(() => {
    if (authStatus === 'initializing') return;
    if (!allowed) router.replace('/unauthorized?next=/admin/audit-log');
  }, [authStatus, allowed, router]);

  React.useEffect(() => {
    if (authStatus !== 'authenticated' || !allowed) return;
    let cancelled = false;
    setLoading(true);
    apiGetAuditLog({ limit: 200 })
      .then((data) => {
        if (!cancelled) {
          setRecords(data.records);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof AuthApiError ? err.message : 'Failed to load the audit trail.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authStatus, allowed, refreshKey]);

  const actions = React.useMemo(() => Array.from(new Set(records.map((r) => r.action))).sort(), [records]);
  const entityTypes = React.useMemo(() => Array.from(new Set(records.map((r) => r.entityType))).sort(), [records]);
  const filtered = React.useMemo(
    () =>
      records.filter(
        (r) => (actionFilter === 'ALL' || r.action === actionFilter) && (entityFilter === 'ALL' || r.entityType === entityFilter),
      ),
    [records, actionFilter, entityFilter],
  );

  if (authStatus === 'initializing' || !allowed) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center gap-2 py-24 text-xs font-semibold text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          eyebrow="SECURITY · ADMINISTRATION"
          title="Audit Trail"
          description="Every security-relevant action performed in the prototype — sign-ins, account changes, verification updates, conflict and workflow actions — recorded with actor, entity, previous/new values and server timestamp."
          actions={
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-cyan-400 hover:text-cyan-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          }
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-cyan-400"
          >
            <option value="ALL">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>{ACTION_META[a]?.label ?? a}</option>
            ))}
          </select>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-cyan-400"
          >
            <option value="ALL">All entity types</option>
            {entityTypes.map((t) => (
              <option key={t} value={t}>{ENTITY_LABELS[t] ?? t}</option>
            ))}
          </select>
          <span className="ml-auto text-[11px] font-semibold text-slate-400">
            {filtered.length} of {records.length} record{records.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Error state */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700" role="alert">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-12 text-xs font-semibold text-slate-400">
            <RefreshCw className="h-4 w-4 animate-spin" /> Loading audit records…
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <ScrollText className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-600">No audit records yet</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
              Records appear here as real actions are performed in the prototype — sign-ins, account changes, verification updates, conflict and workflow actions. No historical data is seeded.
            </p>
          </div>
        )}

        {/* Records */}
        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {filtered.map((r) => {
                const meta = ACTION_META[r.action];
                const Icon = meta?.icon ?? ScrollText;
                return (
                  <li key={r.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${meta?.tone ?? 'bg-slate-100 text-slate-500'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-xs font-bold text-slate-900">{meta?.label ?? r.action}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{ENTITY_LABELS[r.entityType] ?? r.entityType}</span>
                        <span className="font-mono text-[10px] text-slate-400">{r.entityId}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">{r.actorName}</span>
                        <span className="text-slate-400"> · {ROLE_LABELS[r.actorRole as keyof typeof ROLE_LABELS] ?? r.actorRole}</span>
                        {(r.previousValue !== undefined || r.newValue !== undefined) && (
                          <span className="ml-1.5 inline-flex items-center gap-1 font-mono text-[10px]">
                            <span className="text-slate-500">{r.previousValue ?? '—'}</span>
                            <span className="text-slate-300">→</span>
                            <span className="font-bold text-cyan-700">{r.newValue ?? '—'}</span>
                          </span>
                        )}
                      </p>
                      {r.details && <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">{r.details}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="flex items-center justify-end gap-1 text-[10px] font-semibold text-slate-500">
                        <Clock className="h-3 w-3 text-slate-300" /> {formatTime(r.timestamp)}
                      </p>
                      <p className="mt-0.5 font-mono text-[9px] text-slate-300">IP {r.ipAddressMasked}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
