'use client';

/**
 * /society/[societyId]/residents — Society Admin Resident Management (Phase 3)
 * ==============================================================================
 * ONLY an active `society-admin` of THIS society can perform management
 * actions (UI gate here + Firestore rules enforce the same independently —
 * a society admin from another society is blocked by the rules even if the
 * UI were bypassed).
 *
 * Features: statistics, search (name / flat number), filters (status,
 * building, occupancy type), approve / reject (reason required) / delete
 * rejected claims. Personal data shown is limited to what the admin needs.
 */

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  Home,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageHeader, SectionHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSocietyAdmin } from '@/hooks/useResidentPermissions';
import { cn } from '@/lib/utils';
import { getBuildings } from '@/lib/society/buildingService';
import { getFlat } from '@/lib/society/flatService';
import {
  approveResident,
  deleteRejectedResident,
  getSocietyResidents,
  rejectResident,
} from '@/lib/society/residentService';
import { validateRejectionReason } from '@/lib/society/residentValidation';
import { getSocietyById } from '@/lib/society/service';
import {
  OCCUPANCY_TYPES,
  RESIDENT_STATUSES,
  RESIDENT_STATUS_LABELS,
  RESIDENT_STATUS_VARIANTS,
  type Building,
  type Resident,
  type ResidentStatus,
  type Society,
} from '@/types/society';

type GateState = 'loading' | 'ready' | 'error';
type ListState = 'loading' | 'ready' | 'error';

interface ResolvedRow {
  resident: Resident;
  flatNumber: string | null;
  buildingName: string | null;
}

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: ResidentStatus }) {
  return (
    <Badge variant={RESIDENT_STATUS_VARIANTS[status]} className="px-2 py-0.5 text-[10px]">
      {RESIDENT_STATUS_LABELS[status]}
    </Badge>
  );
}

export default function SocietyResidentsPage() {
  return (
    <ProtectedRoute>
      <SocietyResidentsContent />
    </ProtectedRoute>
  );
}

function SocietyResidentsContent() {
  const params = useParams<{ societyId: string }>();
  const societyId = params?.societyId ?? '';
  const { sessionUser, authStatus } = useAuth();
  const { toast } = useToast();
  const { isSocietyAdmin, isLoading: adminLoading } = useSocietyAdmin(societyId || undefined);

  const [society, setSociety] = React.useState<Society | null>(null);
  const [buildings, setBuildings] = React.useState<Building[]>([]);
  const [gateState, setGateState] = React.useState<GateState>('loading');

  const [rows, setRows] = React.useState<ResolvedRow[]>([]);
  const [listState, setListState] = React.useState<ListState>('loading');
  const [reloadKey, setReloadKey] = React.useState(0);

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | ResidentStatus>('all');
  const [buildingFilter, setBuildingFilter] = React.useState('all');
  const [occupancyFilter, setOccupancyFilter] = React.useState('all');

  const [approveTarget, setApproveTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = React.useState('');
  const [rejectError, setRejectError] = React.useState('');
  const [actionLoading, setActionLoading] = React.useState(false);

  // Creator fallback mirrors the Phase 1 dashboard's admin resolution.
  const canManage =
    isSocietyAdmin || Boolean(society && sessionUser?.id && society.createdBy === sessionUser.id);

  // Gate data: society record + buildings (for filters).
  React.useEffect(() => {
    if (authStatus !== 'authenticated' || !societyId) return;
    let cancelled = false;
    setGateState('loading');
    (async () => {
      try {
        const [societyResult, buildingsResult] = await Promise.all([
          getSocietyById(societyId),
          getBuildings(societyId).catch(() => [] as Building[]),
        ]);
        if (cancelled) return;
        setSociety(societyResult);
        setBuildings(buildingsResult);
        setGateState('ready');
      } catch {
        if (!cancelled) setGateState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authStatus, societyId]);

  // Residents list — only loaded for admins of THIS society.
  React.useEffect(() => {
    if (adminLoading || !canManage || !societyId) return;
    let cancelled = false;
    setListState('loading');
    (async () => {
      try {
        const list = await getSocietyResidents(societyId);
        const resolved = await Promise.all(
          list.map(async (r) => {
            const flat = await getFlat(societyId, r.buildingId, r.floorId, r.flatId).catch(
              () => null,
            );
            return {
              resident: r,
              flatNumber: flat?.flatNumber ?? null,
              buildingName: buildings.find((b) => b.id === r.buildingId)?.name ?? null,
            };
          }),
        );
        if (!cancelled) {
          setRows(resolved);
          setListState('ready');
        }
      } catch {
        if (!cancelled) setListState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminLoading, canManage, societyId, reloadKey]);

  const stats = React.useMemo(
    () => ({
      total: rows.length,
      pending: rows.filter((r) => r.resident.status === 'pending').length,
      approved: rows.filter((r) => r.resident.status === 'approved').length,
      rejected: rows.filter((r) => r.resident.status === 'rejected').length,
    }),
    [rows],
  );

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(({ resident, flatNumber }) => {
      if (statusFilter !== 'all' && resident.status !== statusFilter) return false;
      if (buildingFilter !== 'all' && resident.buildingId !== buildingFilter) return false;
      if (occupancyFilter !== 'all' && resident.occupancy.type !== occupancyFilter) return false;
      if (term) {
        const haystack =
          `${resident.profile.fullName} ${resident.profile.preferredName ?? ''} ${flatNumber ?? ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, buildingFilter, occupancyFilter]);

  // ── Admin actions (all verified again by Firestore rules) ──

  const handleApprove = async () => {
    if (!approveTarget || actionLoading) return;
    setActionLoading(true);
    try {
      await approveResident(societyId, approveTarget.id);
      toast({
        title: 'Registration approved',
        description: `${approveTarget.name} has been approved as a resident.`,
        variant: 'success',
      });
      setApproveTarget(null);
      setReloadKey((k) => k + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Approval failed. Please try again.';
      toast({ title: 'Could not approve', description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || actionLoading) return;
    const reasonErrors = validateRejectionReason(rejectReason);
    if (reasonErrors.length > 0) {
      setRejectError(reasonErrors.join(' '));
      return;
    }
    setRejectError('');
    setActionLoading(true);
    try {
      await rejectResident(societyId, rejectTarget.id, rejectReason);
      toast({
        title: 'Registration rejected',
        description: 'The resident can view the rejection reason and may resubmit.',
      });
      setRejectTarget(null);
      setRejectReason('');
      setReloadKey((k) => k + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Rejection failed. Please try again.';
      toast({ title: 'Could not reject', description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || actionLoading) return;
    setActionLoading(true);
    try {
      await deleteRejectedResident(societyId, deleteTarget.id);
      toast({
        title: 'Rejected registration removed',
        description: 'The flat is available for new registrations again.',
      });
      setDeleteTarget(null);
      setReloadKey((k) => k + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Removal failed. Please try again.';
      toast({ title: 'Could not remove', description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const gateLoading = gateState === 'loading' || adminLoading;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Society Digital Twin · Phase 3"
        title="Residents"
        description={
          society
            ? `Resident registration management for ${society.name}.`
            : 'Resident registration management.'
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)} disabled={listState === 'loading'}>
            <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
          </Button>
        }
      />

      {gateLoading && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Verifying your access…
          </p>
        </div>
      )}

      {gateState === 'error' && (
        <Card className="mt-6">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-fit rounded-2xl border border-red-200 bg-red-50 p-3">
              <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900">Could not load this society</h2>
            <p className="mt-1 text-xs text-slate-500">Please check your connection and try again.</p>
          </CardContent>
        </Card>
      )}

      {gateState === 'ready' && !society && (
        <Card className="mt-6">
          <CardContent className="p-8 text-center">
            <p className="text-sm font-bold text-slate-900">Society not found</p>
            <p className="mt-1 text-xs text-slate-500">
              This society does not exist or is not accessible.
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {gateState === 'ready' && society && !canManage && (
        <Card className="mt-6">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-fit rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <ShieldCheck className="h-8 w-8 text-slate-400" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900">Society admin access required</h2>
            <p className="mt-1 text-xs text-slate-500">
              Only an active Society Admin of this society can manage resident registrations.
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href={`/society/${societyId}`}>Back to Society</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {gateState === 'ready' && society && canManage && (
        <div className="mt-6 space-y-5">
          {/* ── Statistics ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total', value: stats.total, tone: 'text-slate-900' },
              { label: 'Pending', value: stats.pending, tone: 'text-amber-600' },
              { label: 'Approved', value: stats.approved, tone: 'text-green-600' },
              { label: 'Rejected', value: stats.rejected, tone: 'text-red-600' },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4 text-center">
                  <p className={cn('text-2xl font-extrabold tracking-tight', item.tone)} aria-hidden="true">
                    {item.value}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {item.label}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Search & filters ── */}
          <Card>
            <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <Input
                  id="resident-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or flat number…"
                  className="pl-9"
                  aria-label="Search residents by name or flat number"
                />
              </div>
              <div>
                <label htmlFor="filter-status" className="sr-only">Filter by status</label>
                <Select
                  id="filter-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | ResidentStatus)}
                >
                  <option value="all">All statuses</option>
                  {RESIDENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {RESIDENT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label htmlFor="filter-building" className="sr-only">Filter by building</label>
                <Select
                  id="filter-building"
                  value={buildingFilter}
                  onChange={(e) => setBuildingFilter(e.target.value)}
                >
                  <option value="all">All buildings</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label htmlFor="filter-occupancy" className="sr-only">Filter by occupancy type</label>
                <Select
                  id="filter-occupancy"
                  value={occupancyFilter}
                  onChange={(e) => setOccupancyFilter(e.target.value)}
                >
                  <option value="all">All occupancy types</option>
                  {OCCUPANCY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

          {listState === 'loading' ? (
            <Card>
              <CardContent className="flex min-h-[30vh] items-center justify-center">
                <p className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading residents…
                </p>
              </CardContent>
            </Card>
          ) : listState === 'error' ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="mx-auto w-fit rounded-2xl border border-red-200 bg-red-50 p-3">
                  <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-base font-bold text-slate-900">Could not load residents</h2>
                <p className="mt-1 text-xs text-slate-500">Please check your connection and try again.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setReloadKey((k) => k + 1)}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <EmptyState
                  icon={<Users className="h-8 w-8" aria-hidden="true" />}
                  title={rows.length === 0 ? 'No residents yet' : 'No residents match your filters'}
                  description={
                    rows.length === 0
                      ? 'Resident registrations submitted for this society will appear here for approval.'
                      : 'Try adjusting the search term or filters.'
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop: horizontally scrollable accessible table */}
              <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resident</TableHead>
                      <TableHead>Flat</TableHead>
                      <TableHead>Occupancy</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(({ resident, flatNumber, buildingName }) => (
                      <TableRow key={resident.id}>
                        <TableCell>
                          <p className="text-xs font-bold text-slate-900">{resident.profile.fullName}</p>
                          {resident.profile.preferredName && (
                            <p className="text-[10px] text-slate-400">
                              Prefers: {resident.profile.preferredName}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-xs font-semibold text-slate-800">{flatNumber ?? '—'}</p>
                          {buildingName && <p className="text-[10px] text-slate-400">{buildingName}</p>}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">{resident.occupancy.type}</TableCell>
                        <TableCell>
                          <StatusBadge status={resident.status} />
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">{formatDate(resident.submittedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            {resident.status === 'pending' && (
                              <>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() =>
                                    setApproveTarget({ id: resident.id, name: resident.profile.fullName })
                                  }
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setRejectReason('');
                                    setRejectError('');
                                    setRejectTarget({ id: resident.id, name: resident.profile.fullName });
                                  }}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {resident.status === 'rejected' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setDeleteTarget({ id: resident.id, name: resident.profile.fullName })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                              </Button>
                            )}
                            {resident.status === 'approved' && (
                              <span className="text-[10px] font-semibold text-slate-400">
                                Approved {formatDate(resident.approvedAt)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: touch-friendly cards */}
              <div className="grid gap-3 md:hidden">
                {filtered.map(({ resident, flatNumber, buildingName }) => (
                  <Card key={resident.id}>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {resident.profile.fullName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {flatNumber ?? '—'}
                            {buildingName ? ` · ${buildingName}` : ''}
                          </p>
                        </div>
                        <StatusBadge status={resident.status} />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {resident.occupancy.type} · {resident.occupancy.residentCount} resident(s) ·
                        Submitted {formatDate(resident.submittedAt)}
                      </p>
                      {resident.status === 'rejected' && resident.rejectionReason && (
                        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
                          Reason: {resident.rejectionReason}
                        </p>
                      )}
                      {resident.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            className="flex-1"
                            onClick={() =>
                              setApproveTarget({ id: resident.id, name: resident.profile.fullName })
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setRejectReason('');
                              setRejectError('');
                              setRejectTarget({ id: resident.id, name: resident.profile.fullName });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                      {resident.status === 'rejected' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() =>
                            setDeleteTarget({ id: resident.id, name: resident.profile.fullName })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete Rejected Claim
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Approve confirmation ── */}
      <ConfirmationDialog
        open={approveTarget !== null}
        onOpenChange={(open) => !open && setApproveTarget(null)}
        title="Approve this resident registration?"
        description={`Approve ${approveTarget?.name ?? 'this resident'}'s registration? This confirms the resident's registration within the society. It does not constitute government or legal ownership verification.`}
        confirmLabel="Approve"
        tone="success"
        loading={actionLoading}
        onConfirm={handleApprove}
      />

      {/* ── Reject with mandatory reason ── */}
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectError('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject registration</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting{' '}
              {rejectTarget?.name ?? "this resident"}&apos;s registration. The resident will be able
              to see this reason and may resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor="reject-reason" className="block text-[11px] font-bold tracking-tight text-slate-700">
              Reason for rejection
              <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>
            </label>
            <Textarea
              id="reject-reason"
              rows={3}
              maxLength={500}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. The submitted occupancy details could not be verified."
              aria-invalid={Boolean(rejectError)}
              aria-describedby={rejectError ? 'reject-reason-error' : undefined}
            />
            {rejectError && (
              <p id="reject-reason-error" role="alert" className="text-[10px] font-semibold text-red-600">
                {rejectError}
              </p>
            )}
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setRejectTarget(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} loading={actionLoading}>
              Reject Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete rejected claim confirmation ── */}
      <ConfirmationDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this rejected registration?"
        description={`Remove the rejected registration for ${deleteTarget?.name ?? 'this resident'}? This frees the flat for new registrations. Only rejected registrations can be removed, and this cannot be undone.`}
        confirmLabel="Delete"
        tone="destructive"
        loading={actionLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
