'use client';

/**
 * /admin/users (Phase 10) — ADMIN ONLY
 * -------------------------------------
 * User management console: account list (name, email, role, status, created),
 * role change, enable/disable and per-user details. Data comes from the
 * ADMIN-only /api/users endpoint; every mutation is audited server-side.
 *
 * Protection: <RoleGuard permission={USER_MANAGEMENT}> redirects non-admins to
 * /unauthorized; the API independently enforces the same rule (401/403).
 */

import React from 'react';
import {
  Users,
  Search,
  ShieldCheck,
  Ban,
  CheckCircle2,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  UserCog,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader, SectionHeader } from '@/components/layout/PageHeader';
import { ProtectedRoute, RoleGuard } from '@/components/auth/RouteGuards';
import { useAuth } from '@/context/AuthContext';
import { PERMISSIONS } from '@/types/auth';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import { apiListUsers, apiUpdateUser, AuthApiError, type ManagedUser } from '@/lib/auth/client';

export default function AdminUsersPage() {
  return (
    <ProtectedRoute>
      <RoleGuard permission={PERMISSIONS.USER_MANAGEMENT}>
        <AdminUsersInner />
      </RoleGuard>
    </ProtectedRoute>
  );
}

function AdminUsersInner() {
  const { sessionUser } = useAuth();
  const [users, setUsers] = React.useState<ManagedUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<'ALL' | 'CITIZEN' | 'OFFICER' | 'ADMIN'>('ALL');
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { users: list } = await apiListUsers();
      setUsers(list);
    } catch (err) {
      setLoadError(err instanceof AuthApiError ? err.message : 'Could not load user accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  /** Citizens/officers can be managed; ADMIN accounts and your own account are protected. */
  const canManage = (user: ManagedUser): boolean => user.role !== 'ADMIN' && user.id !== sessionUser?.id;

  const applyChange = async (user: ManagedUser, patch: { role?: ManagedUser['role']; accountStatus?: 'ACTIVE' | 'DISABLED' }) => {
    setBusyId(user.id);
    setActionError(null);
    try {
      const { user: updated } = await apiUpdateUser(user.id, patch);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
    } catch (err) {
      setActionError(err instanceof AuthApiError ? err.message : 'The change could not be applied.');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department ?? '').toLowerCase().includes(q)
      );
    });
  }, [users, query, roleFilter]);

  const counts = React.useMemo(
    () => ({
      total: users.length,
      admins: users.filter((u) => u.role === 'ADMIN').length,
      officers: users.filter((u) => u.role === 'OFFICER').length,
      citizens: users.filter((u) => u.role === 'CITIZEN').length,
      disabled: users.filter((u) => u.accountStatus === 'DISABLED').length,
    }),
    [users],
  );

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          eyebrow="ADMINISTRATION"
          title="User Management"
          description="Provisioned accounts, roles and access status for the prototype identity store. Role and status changes are audited with previous → new values."
          actions={
            <button
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-cyan-400 hover:text-cyan-700 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: 'Total', value: counts.total, tone: 'text-slate-900' },
            { label: 'Citizens', value: counts.citizens, tone: 'text-cyan-700' },
            { label: 'Officers', value: counts.officers, tone: 'text-emerald-700' },
            { label: 'Admins', value: counts.admins, tone: 'text-indigo-700' },
            { label: 'Disabled', value: counts.disabled, tone: 'text-red-600' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
              <p className={`mt-1 text-xl font-extrabold ${s.tone}`}>{loading ? '…' : s.value}</p>
            </div>
          ))}
        </div>

        {actionError && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-xs font-semibold text-red-700">{actionError}</p>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email or department…"
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-cyan-500"
          >
            <option value="ALL">All roles</option>
            <option value="CITIZEN">Citizens</option>
            <option value="OFFICER">Officers</option>
            <option value="ADMIN">Administrators</option>
          </select>
        </div>

        {/* Accounts table */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <SectionHeader
              icon={<UserCog className="h-4 w-4" />}
              title="Accounts"
              description={loading ? 'Loading…' : `${filtered.length} of ${users.length} accounts shown`}
            />
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-3 px-5 py-14 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
              <p className="text-xs font-bold uppercase tracking-widest">Loading accounts…</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <p className="text-xs font-bold uppercase tracking-widest text-red-600">Could not load accounts</p>
              <p className="max-w-sm text-xs text-slate-500">{loadError}</p>
              <button
                onClick={() => void load()}
                className="mt-1 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:border-cyan-400 hover:text-cyan-700"
              >
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
              <Users className="h-6 w-6 text-slate-300" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No accounts match</p>
              <p className="text-xs text-slate-500">Adjust the search or role filter to see more accounts.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3 text-right">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const manageable = canManage(u);
                    const busy = busyId === u.id;
                    const isDisabled = u.accountStatus === 'DISABLED';
                    const expanded = expandedId === u.id;
                    return (
                      <React.Fragment key={u.id}>
                        <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[10px] font-extrabold text-slate-600">
                                {u.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-bold text-slate-800">{u.name}</p>
                                <button
                                  onClick={() => setExpandedId(expanded ? null : u.id)}
                                  className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-cyan-700 hover:text-cyan-600"
                                >
                                  {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  {expanded ? 'Hide details' : 'View details'}
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-slate-600">{u.email}</td>
                          <td className="px-5 py-3">
                            {manageable ? (
                              <select
                                value={u.role}
                                disabled={busy}
                                onChange={(e) => void applyChange(u, { role: e.target.value as ManagedUser['role'] })}
                                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-cyan-500 disabled:opacity-50"
                                title="Change role"
                              >
                                <option value="CITIZEN">Citizen</option>
                                <option value="OFFICER">Officer</option>
                                <option value="ADMIN">Admin</option>
                              </select>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700"
                                title="Administrator accounts are protected from modification"
                              >
                                <ShieldCheck className="h-3 w-3" /> {ROLE_LABELS[u.role]}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                                isDisabled ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {isDisabled ? <Ban className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                              {isDisabled ? 'Disabled' : 'Active'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                          <td className="px-5 py-3 text-right">
                            {manageable ? (
                              <button
                                disabled={busy}
                                onClick={() => void applyChange(u, { accountStatus: isDisabled ? 'ACTIVE' : 'DISABLED' })}
                                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-bold transition-colors disabled:opacity-50 ${
                                  isDisabled
                                    ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                                    : 'border-red-300 text-red-600 hover:bg-red-50'
                                }`}
                                title={isDisabled ? 'Re-enable this account' : 'Disable this account (sign-in will be rejected)'}
                              >
                                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : isDisabled ? <CheckCircle2 className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                                {isDisabled ? 'Enable' : 'Disable'}
                              </button>
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-400">Protected</span>
                            )}
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="border-b border-slate-50 bg-slate-50/40 last:border-0">
                            <td colSpan={6} className="px-5 py-3">
                              <div className="flex items-start gap-2">
                                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <div className="grid flex-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
                                  {[
                                    ['User ID', u.id],
                                    ['Phone', u.phone || '—'],
                                    ['Gov ID', u.aadhaarOrGovId || '—'],
                                    ['Department', u.department ?? '—'],
                                    ['Designation', u.designation ?? '—'],
                                    ['Badge / Service No.', u.badgeNumber ?? '—'],
                                    ['Jurisdiction', u.jurisdictionDistrict ?? '—'],
                                    ['Role label', ROLE_LABELS[u.role]],
                                  ].map(([label, value]) => (
                                    <div key={label}>
                                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                                      <p className="truncate text-[11px] font-semibold text-slate-600">{value}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </PageContainer>
  );
}
