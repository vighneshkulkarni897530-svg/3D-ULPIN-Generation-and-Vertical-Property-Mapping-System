'use client';

/**
 * /society/[societyId] — Society Dashboard (Phase 1)
 * ===================================================
 * Professional, read-only society dashboard rendered from live Firestore
 * data (no mock records):
 *
 *   - Society image, name, type, address, location status, registration
 *     details, description and society status.
 *   - A clear role badge: the creator / `society-admin` member sees
 *     "Society Admin"; other signed-in users see their own role.
 *   - A society setup progress section: Phase 1 items completed, future
 *     steps explicitly marked "Coming in next phase" (disabled).
 *   - "Add Buildings" and "View 3D Society" actions are DISABLED with a
 *     "Coming Soon" marker — no fake functionality in Phase 1.
 *
 * Hydration safety: all Firestore data (including dates) is loaded inside
 * an effect and rendered only afterwards, so server and client markup match.
 * The existing Digital Twin route is NOT touched by this page.
 */
import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Circle,
  Hash,
  Info,
  Loader2,
  Lock,
  MapPin,
  RefreshCcw,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageHeader, SectionHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SafeImage } from '@/components/ui/SafeImage';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { getSocietyById, getSocietyMembership, SocietyServiceError } from '@/lib/society/service';
import { getBuildings } from '@/lib/society/buildingService';
import { getFloors } from '@/lib/society/floorService';
import { getFlats } from '@/lib/society/flatService';
import { getSocietyResidents } from '@/lib/society/residentService';
import { generateSocietyUlpin } from '@/lib/society/ulpinGenerator';
import type { Society, SocietyMembership, SocietyRole } from '@/types/society';
import { Layers } from 'lucide-react';

const SOCIETY_ROLE_LABELS: Record<SocietyRole, string> = {
  'super-admin': 'Super Admin',
  'government-officer': 'Government Officer',
  'society-admin': 'Society Admin',
  resident: 'Resident',
};

const FUTURE_STEPS = [
  'Government Verification',
  'GIS / ULPIN',
  'Create Digital Twin',
] as const;

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

/** Formats a Firestore timestamp for display (client-side only, post-fetch). */
function formatDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatCoordinate(value: number | null): string {
  return value === null ? 'Not provided' : value.toFixed(6);
}

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <dt className="shrink-0 text-[11px] font-semibold text-slate-400">{label}</dt>
      <dd className="text-right text-xs font-semibold text-slate-800">{value ?? '—'}</dd>
    </div>
  );
}

export default function SocietyDashboardPage() {
  return (
    <ProtectedRoute>
      <SocietyDashboardContent />
    </ProtectedRoute>
  );
}

function SocietyDashboardContent() {
  const params = useParams<{ societyId: string }>();
  const societyId = params?.societyId ?? '';
  const { currentUser } = useAuth();

  const [society, setSociety] = React.useState<Society | null>(null);
  const [membership, setMembership] = React.useState<SocietyMembership | null>(null);
  const [buildingCount, setBuildingCount] = React.useState(0);
  const [floorsCount, setFloorsCount] = React.useState(0);
  const [flatsCount, setFlatsCount] = React.useState(0);
  const [residentsCount, setResidentsCount] = React.useState<number | null>(null);
  const [state, setState] = React.useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setState('loading');
      try {
        const [societyResult, membershipResult] = await Promise.all([
          getSocietyById(societyId),
          getSocietyMembership(societyId, currentUser.id),
        ]);
        if (cancelled) return;
        if (!societyResult) {
          setSociety(null);
          setMembership(null);
          setState('not-found');
          return;
        }
        setSociety(societyResult);
        setMembership(membershipResult);

        // Load real structure counts for setup progress
        try {
          const buildings = await getBuildings(societyId);
          const perBuildingFloors = await Promise.all(
            buildings.map((b) => getFloors(societyId, b.id)),
          );
          const perFloorFlats = await Promise.all(
            perBuildingFloors.flatMap((floors, idx) =>
              floors.map((f) => getFlats(societyId, buildings[idx].id, f.id)),
            ),
          );
          if (!cancelled) {
            setBuildingCount(buildings.length);
            setFloorsCount(perBuildingFloors.reduce((s, f) => s + f.length, 0));
            setFlatsCount(perFloorFlats.flat().length);
          }
        } catch {
          // Non-fatal: structure counts are best-effort for the progress UI
        }

        // Residents count (Phase 3) — loaded only for society admins, since
        // Firestore rules scope resident reads to the caller's membership.
        const adminNow =
          societyResult.createdBy === currentUser.id ||
          (membershipResult?.role === 'society-admin' && membershipResult?.status === 'active');
        if (adminNow) {
          try {
            const residents = await getSocietyResidents(societyId);
            if (!cancelled) setResidentsCount(residents.length);
          } catch {
            // Non-fatal: checklist item degrades to "Not started"
          }
        }

        setState('ready');
      } catch (error) {
        if (cancelled) return;
        setState('error');
        setErrorMessage(
          error instanceof SocietyServiceError
            ? error.message
            : 'Could not load this society. Please try again.',
        );
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [societyId, currentUser.id, reloadKey]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading society…
        </p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-10 w-10 text-red-500" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Could Not Load Society</h1>
        <p className="max-w-sm text-xs text-slate-500">{errorMessage}</p>
        <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
          <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
        </Button>
      </div>
    );
  }

  if (state === 'not-found' || !society) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-tech">
          <Building2 className="h-10 w-10 text-slate-400" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Society Not Found</h1>
        <p className="max-w-sm text-xs text-slate-500">
          This society record does not exist, or it has not been registered yet.
        </p>
        <Link
          href="/society/register"
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-tech-cyan transition-colors hover:bg-cyan-400"
        >
          <Building2 className="h-4 w-4" aria-hidden="true" /> Register a Society
        </Link>
      </div>
    );
  }

  // Role resolution: creator or an active `society-admin` member is an admin.
  const isAdmin =
    society.createdBy === currentUser.id ||
    (membership?.role === 'society-admin' && membership.status === 'active');

  const roleBadge = isAdmin ? (
    <Badge variant="navy" className="px-3 py-1 text-xs">
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Society Admin
    </Badge>
  ) : membership ? (
    <Badge variant="blue" className="px-3 py-1 text-xs">
      <UserCheck className="h-3.5 w-3.5" aria-hidden="true" /> {SOCIETY_ROLE_LABELS[membership.role]}
    </Badge>
  ) : (
    <Badge variant="outline" className="px-3 py-1 text-xs">
      <UserCheck className="h-3.5 w-3.5" aria-hidden="true" /> Signed-in Viewer
    </Badge>
  );

  const statusLabel =
    society.status === 'active' ? 'Active' : society.status === 'inactive' ? 'Inactive' : 'Archived';

  const baseUlpin = generateSocietyUlpin(society);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Society Cadastre & Digital Twin"
        title={society.name}
        description={society.description ?? undefined}
        actions={
          <>
            <Badge variant="success" className="px-3 py-1 text-xs">
              <span aria-hidden="true">●</span> {statusLabel}
            </Badge>
            <Button variant="default" size="sm" asChild>
              <Link href={`/map?society=${societyId}&ulpin=${baseUlpin}`}>
                <Layers className="h-3.5 w-3.5" aria-hidden="true" /> View on 2D GIS Map
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/society/${societyId}/buildings`}>
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" /> Manage Buildings
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/society/${societyId}/residents`}>
                <Users className="h-3.5 w-3.5" aria-hidden="true" /> Manage Residents
              </Link>
            </Button>
            <Button variant="secondary" size="sm" disabled title="Coming in a future phase">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" /> View 3D Society
              <span className="ml-1 font-mono text-[9px] font-bold uppercase text-cyan-300">
                Coming Soon
              </span>
            </Button>
          </>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ── LEFT · SOCIETY PROFILE ── */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              {society.imageUrl ? (
                <SafeImage
                  src={society.imageUrl}
                  alt={`Society image of ${society.name}`}
                  className="aspect-[16/9] w-full rounded-xl object-cover"
                />
              ) : (
                <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl bg-slate-100 text-slate-400">
                  <Building2 className="h-8 w-8" aria-hidden="true" />
                  <p className="text-[11px] font-semibold">No society image uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <SectionHeader
                icon={<Hash className="h-4 w-4" aria-hidden="true" />}
                title="Registration & Cadastre Details"
              />
              <dl className="mt-3">
                <DetailRow label="Society Type" value={society.type} />
                <DetailRow
                  label="Registration Number"
                  value={society.registrationNumber ?? 'Not provided'}
                />
                <DetailRow
                  label="Cadastral Base ULPIN"
                  value={
                    <span className="font-mono text-cyan-700 font-bold">
                      {baseUlpin}
                    </span>
                  }
                />
                <DetailRow
                  label="Established Year"
                  value={
                    society.establishedYear === null ? (
                      'Not provided'
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3 w-3 text-slate-400" aria-hidden="true" />
                        {society.establishedYear}
                      </span>
                    )
                  }
                />
                <DetailRow label="Society Status" value={statusLabel} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <SectionHeader
                icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
                title="Registered Address"
              />
              <div className="mt-3 space-y-1 text-sm">
                <p className="font-bold text-slate-900">{society.address.line1 || '—'}</p>
                {society.address.line2 && (
                  <p className="text-xs text-slate-500">{society.address.line2}</p>
                )}
                <p className="text-xs text-slate-600">
                  {society.address.city || '—'}
                  {society.address.district ? `, ${society.address.district}` : ''}
                  {society.address.state ? `, ${society.address.state}` : ''}
                  {society.address.pinCode ? ` — ${society.address.pinCode}` : ''}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <SectionHeader
                icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
                title="Location"
                description="Approximate location recorded at registration."
                action={
                  <div className="flex gap-1.5">
                    <Badge variant="secondary">user-provided</Badge>
                    <Badge variant="outline">illustrative</Badge>
                  </div>
                }
              />
              <dl className="mt-3">
                <DetailRow label="Latitude" value={formatCoordinate(society.location.latitude)} />
                <DetailRow label="Longitude" value={formatCoordinate(society.location.longitude)} />
                <DetailRow label="Location Status" value="User-provided · illustrative" />
              </dl>
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] font-medium leading-relaxed text-slate-600">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                Location is user-provided and intended for visualization. It is not a surveyed/legal
                boundary.
              </p>
            </CardContent>
          </Card>

          {society.description && (
            <Card>
              <CardContent className="p-5">
                <SectionHeader
                  icon={<Info className="h-4 w-4" aria-hidden="true" />}
                  title="Description"
                />
                <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                  {society.description}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── RIGHT · ACCESS & SETUP ── */}
        <div className="space-y-5">
          <Card>
            <CardContent className="p-5">
              <SectionHeader
                icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                title="Your Role"
              />
              <div className="mt-3 space-y-3">
                {roleBadge}
                <p className="text-[11px] leading-relaxed text-slate-500">
                  {isAdmin ? (
                    <>
                      You administer this society. Building, floor, flat, resident and verification
                      management tools arrive in later phases.
                    </>
                  ) : (
                    <>You are viewing this society as a signed-in visitor. Management tools are
                    restricted to its Society Admin.</>
                  )}
                </p>
                <p className="border-t border-slate-100 pt-2 text-[10px] font-medium text-slate-400">
                  Viewing as <span className="font-bold text-slate-500">{currentUser.name}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <SectionHeader
                icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                title="Society Setup"
                description="Phase 1 registration progress and what comes next."
              />
              <ul className="mt-4 space-y-2.5">
                <li className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
                  Society Information
                  <span className="sr-only">(completed)</span>
                </li>
                <li className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
                  Address &amp; Location
                  <span className="sr-only">(completed)</span>
                </li>
                <li className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  {society.imageUrl ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                  )}
                  Society Image
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-slate-400">
                    {society.imageUrl ? 'Added' : 'Optional · not added'}
                  </span>
                </li>
                <li className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  {buildingCount > 0 ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                  )}
                  Buildings
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-slate-400">
                    {buildingCount > 0 ? `${buildingCount} added` : 'Not started'}
                  </span>
                </li>
              </ul>

              <p className="mt-4 border-t border-slate-100 pt-3 text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-600">
                Next Steps
              </p>
              <ul className="mt-2.5 space-y-2.5">
                <li className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  {floorsCount > 0 ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                  )}
                  Floors
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-slate-400">
                    {floorsCount > 0 ? `${floorsCount} added` : 'Not started'}
                  </span>
                </li>
                <li className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  {flatsCount > 0 ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                  )}
                  Flats
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-slate-400">
                    {flatsCount > 0 ? `${flatsCount} added` : 'Not started'}
                  </span>
                </li>
                <li className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  {residentsCount !== null && residentsCount > 0 ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                  )}
                  Residents
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-slate-400">
                    {residentsCount !== null && residentsCount > 0
                      ? `${residentsCount} registered`
                      : 'Not started'}
                  </span>
                </li>
                {FUTURE_STEPS.map((step) => (
                  <li
                    key={step}
                    className="flex items-center gap-2 text-xs font-semibold text-slate-400"
                    aria-label={`${step} — coming in next phase`}
                  >
                    <Circle className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                    {step}
                    <span className="ml-auto rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-400">
                      Coming in next phase
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <SectionHeader
                icon={<Hash className="h-4 w-4" aria-hidden="true" />}
                title="Record Details"
              />
              <dl className="mt-3">
                <DetailRow
                  label="Society ID"
                  value={<span className="break-all font-mono text-[10px]">{society.id}</span>}
                />
                <DetailRow label="Created" value={formatDate(society.createdAt)} />
                <DetailRow label="Last Updated" value={formatDate(society.updatedAt)} />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}




