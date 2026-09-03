'use client';

/**
 * /resident/register — Resident Registration Wizard (Phase 3)
 * ============================================================
 * 7 steps: Society → Building → Floor → Flat → Profile → Occupancy → Review
 *
 * Safety & privacy:
 *   - `userId` and email come from the Firebase Auth session (never form data).
 *   - societyId/buildingId/floorId/flatId come ONLY from real Phase 1/2
 *     Firestore records selected in the wizard — never free text.
 *   - Flat availability is checked WITHOUT revealing other residents' data.
 *   - Cascading selections reset their dependents (spec §33).
 *   - No sensitive data is collected (no Aadhaar/PAN/password/OTP/bank data).
 *   - Hydration safe: all Firestore data and dates load inside effects.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Home,
  Info,
  Layers,
  Loader2,
  Search,
  User,
  Users,
  XCircle,
} from 'lucide-react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageHeader, SectionHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SafeImage } from '@/components/ui/SafeImage';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getAvailableSocieties } from '@/lib/society/service';
import { getBuildings } from '@/lib/society/buildingService';
import { getFloors } from '@/lib/society/floorService';
import { getFlats } from '@/lib/society/flatService';
import {
  createResidentRegistration,
  getFlatClaimInfo,
  type FlatClaimInfo,
} from '@/lib/society/residentService';
import {
  validateResidentOccupancy,
  validateResidentProfile,
  validateResidentRegistration,
  type ResidentOccupancyForm,
  type ResidentProfileForm,
} from '@/lib/society/residentValidation';
import {
  FLAT_STATUS_LABELS,
  FLAT_STATUS_VARIANTS,
  FLOOR_TYPE_LABELS,
  OCCUPANCY_TYPES,
  UNIT_TYPE_LABELS,
  type Building,
  type Flat,
  type Floor,
  type OccupancyType,
  type ResidentPayload,
  type Society,
} from '@/types/society';

const STEPS = [
  { id: 'society', label: 'Society', icon: Home },
  { id: 'building', label: 'Building', icon: Building2 },
  { id: 'floor', label: 'Floor', icon: Layers },
  { id: 'flat', label: 'Flat', icon: Grid3X3 },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'occupancy', label: 'Occupancy', icon: Users },
  { id: 'review', label: 'Review', icon: CheckCircle2 },
] as const;

const OCCUPANCY_DISCLAIMER =
  'Self-declared occupancy information. This is not government/legal ownership verification.';

const initialProfile: ResidentProfileForm = {
  fullName: '',
  preferredName: '',
  phone: '',
  occupation: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
};

const initialOccupancy: ResidentOccupancyForm = {
  type: '',
  moveInDate: '',
  residentCount: '',
  notes: '',
};

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

/** Accessible field wrapper: label, required marker, hint & error wiring. */
function FormField({ id, label, required = false, error, hint, className, children }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-[11px] font-bold tracking-tight text-slate-700">
        {label}
        {required && (
          <>
            <span className="ml-0.5 text-red-500" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(required)</span>
          </>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-[10px] leading-relaxed text-slate-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[10px] font-semibold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default function ResidentRegisterPage() {
  return (
    <ProtectedRoute>
      <ResidentRegisterContent />
    </ProtectedRoute>
  );
}

function ResidentRegisterContent() {
  const router = useRouter();
  const { sessionUser: user, authStatus } = useAuth();
  const { toast } = useToast();

  const [stepIndex, setStepIndex] = React.useState(0);
  const [societyId, setSocietyId] = React.useState('');
  const [buildingId, setBuildingId] = React.useState('');
  const [floorId, setFloorId] = React.useState('');
  const [flatId, setFlatId] = React.useState('');

  const [societies, setSocieties] = React.useState<Society[]>([]);
  const [buildings, setBuildings] = React.useState<Building[]>([]);
  const [floors, setFloors] = React.useState<Floor[]>([]);
  const [flats, setFlats] = React.useState<Flat[]>([]);

  const [profile, setProfile] = React.useState<ResidentProfileForm>({ ...initialProfile });
  const [occupancy, setOccupancy] = React.useState<ResidentOccupancyForm>({ ...initialOccupancy });

  const [listLoading, setListLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [societySearch, setSocietySearch] = React.useState('');
  const [claimInfo, setClaimInfo] = React.useState<FlatClaimInfo | null>(null);
  const [claimChecking, setClaimChecking] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [todayMax, setTodayMax] = React.useState<string | undefined>(undefined);

  const step = STEPS[stepIndex];
  const selectedSociety = societies.find((s) => s.id === societyId) ?? null;
  const selectedBuilding = buildings.find((b) => b.id === buildingId) ?? null;
  const selectedFloor = floors.find((f) => f.id === floorId) ?? null;
  const selectedFlat = flats.find((f) => f.id === flatId) ?? null;

  // Redirect signed-out visitors (middleware + ProtectedRoute also guard).
  React.useEffect(() => {
    if (authStatus !== 'initializing' && !user?.id) {
      router.replace('/auth/login?next=/resident/register');
    }
  }, [authStatus, user, router]);

  // Load real societies from Firestore (no mock data — spec §32).
  React.useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    getAvailableSocieties()
      .then((data) => {
        if (!cancelled) setSocieties(data);
      })
      .catch(() => {
        if (!cancelled) {
          setSocieties([]);
          toast({
            title: 'Could not load societies',
            description: 'Please refresh the page to try again.',
            variant: 'destructive',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Cascading loads — a parent change clears its dependents (spec §33).
  React.useEffect(() => {
    if (!societyId) {
      setBuildings([]);
      return;
    }
    let cancelled = false;
    setListLoading(true);
    getBuildings(societyId)
      .then((data) => {
        if (!cancelled) setBuildings(data);
      })
      .catch(() => {
        if (!cancelled) setBuildings([]);
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [societyId]);

  React.useEffect(() => {
    if (!societyId || !buildingId) {
      setFloors([]);
      return;
    }
    let cancelled = false;
    setListLoading(true);
    getFloors(societyId, buildingId)
      .then((data) => {
        if (!cancelled) setFloors(data);
      })
      .catch(() => {
        if (!cancelled) setFloors([]);
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [societyId, buildingId]);

  React.useEffect(() => {
    if (!societyId || !buildingId || !floorId) {
      setFlats([]);
      return;
    }
    let cancelled = false;
    setListLoading(true);
    getFlats(societyId, buildingId, floorId)
      .then((data) => {
        if (!cancelled) setFlats(data);
      })
      .catch(() => {
        if (!cancelled) setFlats([]);
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [societyId, buildingId, floorId]);

  // Privacy-preserving claim check whenever a flat is selected.
  React.useEffect(() => {
    if (!societyId || !buildingId || !floorId || !flatId) {
      setClaimInfo(null);
      return;
    }
    let cancelled = false;
    setClaimChecking(true);
    getFlatClaimInfo(societyId, buildingId, floorId, flatId)
      .then((info) => {
        if (!cancelled) setClaimInfo(info);
      })
      .catch(() => {
        if (!cancelled) {
          setClaimInfo({
            available: false,
            ownStatus: null,
            message: 'Could not verify flat availability. Please try again.',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setClaimChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [societyId, buildingId, floorId, flatId]);

  // Hydration-safe "today" for the move-in date max attribute.
  React.useEffect(() => {
    const now = new Date();
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`;
    setTodayMax(iso);
  }, []);

  // ── Cascading selection handlers (dependents reset on parent change) ──
  const selectSociety = (id: string) => {
    if (id === societyId) return;
    setSocietyId(id);
    setBuildingId('');
    setFloorId('');
    setFlatId('');
    setClaimInfo(null);
  };

  const selectBuilding = (id: string) => {
    if (id === buildingId) return;
    setBuildingId(id);
    setFloorId('');
    setFlatId('');
    setClaimInfo(null);
  };

  const selectFloor = (id: string) => {
    if (id === floorId) return;
    setFloorId(id);
    setFlatId('');
    setClaimInfo(null);
  };

  const selectFlat = (id: string) => {
    if (id === flatId) return;
    setFlatId(id);
    setClaimInfo(null);
  };

  // ── Per-step validation before advancing ──
  const validateStep = (index: number): boolean => {
    const nextErrors: Record<string, string> = {};
    if (index === 0 && !societyId) nextErrors.society = 'Please select a society.';
    if (index === 1 && !buildingId) nextErrors.building = 'Please select a building.';
    if (index === 2 && !floorId) nextErrors.floor = 'Please select a floor.';
    if (index === 3) {
      if (!flatId) nextErrors.flat = 'Please select a flat.';
      else if (claimChecking) nextErrors.flat = 'Checking flat availability…';
      else if (claimInfo && !claimInfo.available) nextErrors.flat = claimInfo.message;
    }
    if (index === 4) {
      const profileErrors = validateResidentProfile(profile);
      if (profileErrors.length > 0) nextErrors.profile = profileErrors.join(' ');
    }
    if (index === 5) {
      const occupancyErrors = validateResidentOccupancy(occupancy);
      if (occupancyErrors.length > 0) nextErrors.occupancy = occupancyErrors.join(' ');
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(stepIndex)) return;
    setErrors({});
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setErrors({});
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  // ── Final submission ──
  const handleSubmit = async () => {
    if (submitting) return; // duplicate-submission guard
    const validation = validateResidentRegistration(profile, occupancy, {
      societyId,
      buildingId,
      floorId,
      flatId,
    });
    if (!validation.valid) {
      setErrors(validation.errors);
      toast({
        title: 'Please complete the registration',
        description: 'Some required information is missing or invalid.',
        variant: 'destructive',
      });
      return;
    }
    if (claimInfo && !claimInfo.available) {
      setErrors({ flat: claimInfo.message });
      return;
    }

    setSubmitting(true);
    try {
      const payload: ResidentPayload = {
        societyId,
        buildingId,
        floorId,
        flatId,
        profile: {
          fullName: profile.fullName.trim(),
          preferredName: profile.preferredName.trim() || null,
          email: user?.email ?? '', // from the Auth session — never the form
          phone: profile.phone.trim() || null,
          occupation: profile.occupation.trim() || null,
          emergencyContactName: profile.emergencyContactName.trim() || null,
          emergencyContactPhone: profile.emergencyContactPhone.trim() || null,
        },
        occupancy: {
          type: occupancy.type as OccupancyType,
          moveInDate: occupancy.moveInDate || null,
          residentCount: parseInt(occupancy.residentCount, 10) || 1,
          notes: occupancy.notes.trim() || null,
        },
      };
      await createResidentRegistration(payload);
      toast({
        title: 'Registration submitted',
        description: 'Your residency application is awaiting Society Admin approval.',
        variant: 'success',
      });
      router.push('/resident/pending');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      toast({ title: 'Registration failed', description: message, variant: 'destructive' });
      // A duplicate claim surfaces as a flat error so the user can re-select.
      setErrors(message.includes('already has a resident') ? { flat: message } : {});
    } finally {
      setSubmitting(false);
    }
  };

  const progressValue = ((stepIndex + 1) / STEPS.length) * 100;

  const stepComplete = (index: number): boolean => {
    switch (STEPS[index].id) {
      case 'society':
        return Boolean(societyId);
      case 'building':
        return Boolean(buildingId);
      case 'floor':
        return Boolean(floorId);
      case 'flat':
        return Boolean(flatId);
      case 'profile':
        return profile.fullName.trim().length >= 2;
      case 'occupancy':
        return occupancy.type !== '' && occupancy.residentCount !== '';
      default:
        return false;
    }
  };

  const stepError = errors[step.id];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Society Digital Twin · Phase 3"
        title="Resident Registration"
        description="Select your society, building, floor and flat, then complete your personal profile and self-declared occupancy information."
        actions={
          <Badge variant="outline" className="px-3 py-1 text-xs">
            <Info className="h-3.5 w-3.5" aria-hidden="true" /> Society Admin approval required
          </Badge>
        }
      />

      {/* ── Progress ── */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <span aria-hidden="true">Step {stepIndex + 1} of {STEPS.length}</span>
          <span className="font-mono">{step.label}</span>
        </div>
        <Progress value={progressValue} aria-label={`Registration progress: ${step.label}`} />
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="list" aria-label="Registration steps">
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const active = index === stepIndex;
            const done = index < stepIndex && stepComplete(index);
            const reachable = index <= stepIndex;
            return (
              <button
                key={s.id}
                type="button"
                role="listitem"
                disabled={!reachable}
                aria-current={active ? 'step' : undefined}
                onClick={() => index <= stepIndex && setStepIndex(index)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors',
                  active && 'bg-cyan-100 text-cyan-800',
                  !active && done && 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  !active && !done && 'bg-slate-50 text-slate-400',
                  !reachable && 'cursor-not-allowed',
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Step content ── */}
      <Card className="mt-5">
        <CardContent className="p-5">
          {step.id === 'society' && renderSocietyStep()}
          {step.id === 'building' && renderBuildingStep()}
          {step.id === 'floor' && renderFloorStep()}
          {step.id === 'flat' && renderFlatStep()}
          {step.id === 'profile' && renderProfileStep()}
          {step.id === 'occupancy' && renderOccupancyStep()}
          {step.id === 'review' && renderReviewStep()}
        </CardContent>
      </Card>

      {stepError && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
        >
          {stepError}
        </p>
      )}

      {/* ── Navigation ── */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={goBack} disabled={stepIndex === 0 || submitting}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back
        </Button>
        {step.id === 'review' ? (
          <Button type="button" variant="gradient" onClick={handleSubmit} loading={submitting}>
            {submitting ? 'Submitting…' : 'Submit Registration'}
          </Button>
        ) : (
          <Button type="button" variant="gradient" onClick={goNext}>
            Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );

  // ── Step renderers ──

  function renderSocietyStep() {
    const term = societySearch.trim().toLowerCase();
    const filtered = term
      ? societies.filter(
          (s) =>
            s.name.toLowerCase().includes(term) ||
            s.address.city.toLowerCase().includes(term) ||
            (s.address.district ?? '').toLowerCase().includes(term),
        )
      : societies;

    return (
      <>
        <SectionHeader
          icon={<Home className="h-4 w-4" aria-hidden="true" />}
          title="Step 1 · Select Your Society"
        description="Search by society name, city or district. Only registered societies are listed."
      />
      <div className="mt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            id="society-search"
            value={societySearch}
            onChange={(e) => setSocietySearch(e.target.value)}
            placeholder="Search societies…"
            className="pl-9"
            aria-label="Search societies by name, city or district"
          />
        </div>

        {listLoading ? (
          <ListSkeleton />
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-xs font-semibold text-slate-400">
            {societies.length === 0
              ? 'No societies are currently available.'
              : 'No societies match your search.'}
          </p>
        ) : (
          <div className="mt-4 grid max-h-96 gap-3 overflow-y-auto pr-1">
            {filtered.map((s) => (
              <SelectionCard
                key={s.id}
                selected={societyId === s.id}
                onClick={() => selectSociety(s.id)}
                image={s.imageUrl}
                icon={<Home className="h-6 w-6" aria-hidden="true" />}
                title={s.name}
                subtitle={`${s.address.city}, ${s.address.state}${s.address.district ? ` · ${s.address.district}` : ''}`}
                badge={s.type}
              />
            ))}
          </div>
        )}
      </div>
      </>
    );
  }

  function renderBuildingStep() {
    return (
      <>
        <SectionHeader
          icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
          title="Step 2 · Select Your Building"
        description={
          selectedSociety
            ? `Buildings in ${selectedSociety.name}.`
            : 'Buildings belonging to the selected society.'
        }
      />
      <div className="mt-4">
        {listLoading ? (
          <ListSkeleton />
        ) : buildings.length === 0 ? (
          <p className="py-10 text-center text-xs font-semibold text-slate-400">
            No buildings have been added to this society yet.
          </p>
        ) : (
          <div className="grid max-h-96 gap-3 overflow-y-auto pr-1">
            {buildings.map((b) => (
              <SelectionCard
                key={b.id}
                selected={buildingId === b.id}
                onClick={() => selectBuilding(b.id)}
                icon={<Building2 className="h-6 w-6" aria-hidden="true" />}
                title={b.name}
                subtitle={`Code ${b.code} · ${b.floorCount} floors`}
                badge={b.type}
              />
            ))}
          </div>
        )}
      </div>
      </>
    );
  }

  function renderFloorStep() {
    return (
      <>
        <SectionHeader
          icon={<Layers className="h-4 w-4" aria-hidden="true" />}
          title="Step 3 · Select Your Floor"
        description={
          selectedBuilding
            ? `Floors in ${selectedBuilding.name}.`
            : 'Floors belonging to the selected building.'
        }
      />
      <div className="mt-4">
        {listLoading ? (
          <ListSkeleton />
        ) : floors.length === 0 ? (
          <p className="py-10 text-center text-xs font-semibold text-slate-400">
            No floors have been added to this building yet.
          </p>
        ) : (
          <div className="grid max-h-96 gap-3 overflow-y-auto pr-1">
            {floors.map((f) => (
              <SelectionCard
                key={f.id}
                selected={floorId === f.id}
                onClick={() => selectFloor(f.id)}
                icon={<Layers className="h-6 w-6" aria-hidden="true" />}
                title={f.floorLabel}
                subtitle={`Floor number ${f.floorNumber} · ${f.plannedFlatCount} planned flats`}
                badge={FLOOR_TYPE_LABELS[f.floorType] ?? f.floorType}
              />
            ))}
          </div>
        )}
      </div>
      </>
    );
  }

  function renderFlatStep() {
    return (
      <>
        <SectionHeader
          icon={<Grid3X3 className="h-4 w-4" aria-hidden="true" />}
          title="Step 4 · Select Your Flat"
          description={
            selectedFloor
              ? `Flats on ${selectedFloor.floorLabel}.`
              : 'Flats belonging to the selected floor.'
          }
        />

        {flatId && (
          <div className="mt-4" aria-live="polite">
            {claimChecking ? (
              <p className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Checking flat
                availability…
              </p>
            ) : claimInfo && !claimInfo.available ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800"
              >
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{' '}
                {claimInfo.message}
              </p>
            ) : claimInfo?.available ? (
              <p className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-semibold text-green-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {claimInfo.ownStatus === 'rejected'
                  ? claimInfo.message
                  : 'This flat is available for registration.'}
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-4">
          {listLoading ? (
            <ListSkeleton />
          ) : flats.length === 0 ? (
            <p className="py-10 text-center text-xs font-semibold text-slate-400">
              No flats have been added to this floor yet.
            </p>
          ) : (
            <div className="grid max-h-96 gap-3 overflow-y-auto pr-1">
              {flats.map((f) => (
                <SelectionCard
                  key={f.id}
                  selected={flatId === f.id}
                  onClick={() => selectFlat(f.id)}
                  icon={<Grid3X3 className="h-6 w-6" aria-hidden="true" />}
                  title={f.flatNumber}
                  subtitle={`${UNIT_TYPE_LABELS[f.unitType] ?? f.unitType}${
                    f.area ? ` · ${f.area} sq ft` : ''
                  }${f.facing ? ` · ${f.facing} facing` : ''}`}
                  badge={FLAT_STATUS_LABELS[f.status] ?? f.status}
                  badgeVariant={FLAT_STATUS_VARIANTS[f.status] ?? 'default'}
                />
              ))}
            </div>
          )}
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-medium leading-relaxed text-slate-600">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          Flat details come from the society&apos;s official records and cannot be changed during
          registration.
        </p>
      </>
    );
  }

  function renderProfileStep() {
    const setField =
      (key: keyof ResidentProfileForm) =>
      (e: React.ChangeEvent<HTMLInputElement>) =>
        setProfile((p) => ({ ...p, [key]: e.target.value }));

    return (
      <>
        <SectionHeader
          icon={<User className="h-4 w-4" aria-hidden="true" />}
          title="Step 5 · Personal Profile"
          description="Only minimal contact information is collected. It is never shared with other residents."
        />

        {errors.profile && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
          >
            {errors.profile}
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="profile-full-name" label="Full Name" required>
            <Input
              id="profile-full-name"
              value={profile.fullName}
              onChange={setField('fullName')}
              placeholder="e.g. Priya Sharma"
              maxLength={100}
              autoComplete="name"
              aria-invalid={Boolean(errors.profile)}
            />
          </FormField>

          <FormField id="profile-preferred-name" label="Preferred Name" hint="Optional.">
            <Input
              id="profile-preferred-name"
              value={profile.preferredName}
              onChange={setField('preferredName')}
              placeholder="e.g. Priya"
              maxLength={100}
            />
          </FormField>

          <FormField
            id="profile-email"
            label="Email"
            hint="Taken from your signed-in account — it cannot be changed here."
          >
            <Input id="profile-email" value={user?.email ?? ''} disabled readOnly />
          </FormField>

          <FormField id="profile-phone" label="Phone Number" hint="Optional.">
            <Input
              id="profile-phone"
              value={profile.phone}
              onChange={setField('phone')}
              type="tel"
              inputMode="tel"
              placeholder="e.g. +91 98765 43210"
              aria-invalid={Boolean(errors.profile)}
            />
          </FormField>

          <FormField id="profile-occupation" label="Occupation" hint="Optional.">
            <Input
              id="profile-occupation"
              value={profile.occupation}
              onChange={setField('occupation')}
              placeholder="e.g. Teacher"
              maxLength={100}
            />
          </FormField>

          <FormField id="profile-ec-name" label="Emergency Contact Name" hint="Optional.">
            <Input
              id="profile-ec-name"
              value={profile.emergencyContactName}
              onChange={setField('emergencyContactName')}
              maxLength={100}
              autoComplete="off"
            />
          </FormField>

          <FormField id="profile-ec-phone" label="Emergency Contact Phone" hint="Optional.">
            <Input
              id="profile-ec-phone"
              value={profile.emergencyContactPhone}
              onChange={setField('emergencyContactPhone')}
              type="tel"
              inputMode="tel"
              autoComplete="off"
            />
          </FormField>
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-medium leading-relaxed text-slate-600">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          For your privacy, sensitive information such as government IDs, passwords, OTPs or bank
          details is never collected here.
        </p>
      </>
    );
  }

  function renderOccupancyStep() {
    const setField = (key: keyof ResidentOccupancyForm, value: string) =>
      setOccupancy((o) => ({ ...o, [key]: value }));

    return (
      <>
        <SectionHeader
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
          title="Step 6 · Occupancy Information"
          description="Tell your society how you occupy the flat. This information is self-declared."
        />

        {errors.occupancy && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
          >
            {errors.occupancy}
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="occupancy-type" label="Occupancy Type" required>
            <Select
              id="occupancy-type"
              value={occupancy.type}
              onChange={(e) => setField('type', e.target.value)}
              aria-invalid={Boolean(errors.occupancy)}
            >
              <option value="">Select occupancy type…</option>
              {OCCUPANCY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField id="occupancy-move-in" label="Move-in Date" hint="Optional.">
            <Input
              id="occupancy-move-in"
              type="date"
              value={occupancy.moveInDate}
              onChange={(e) => setField('moveInDate', e.target.value)}
              max={todayMax}
            />
          </FormField>

          <FormField
            id="occupancy-count"
            label="Number of Residents in Flat"
            required
            hint="Including yourself (1–50)."
          >
            <Input
              id="occupancy-count"
              type="number"
              min={1}
              max={50}
              value={occupancy.residentCount}
              onChange={(e) => setField('residentCount', e.target.value)}
              placeholder="e.g. 3"
              aria-invalid={Boolean(errors.occupancy)}
            />
          </FormField>

          <div className="sm:col-span-2">
            <FormField id="occupancy-notes" label="Notes for the Society Admin" hint="Optional.">
              <Textarea
                id="occupancy-notes"
                value={occupancy.notes}
                onChange={(e) => setField('notes', e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Anything the society admin should know about your occupancy."
              />
            </FormField>
          </div>
        </div>

        <p
          role="note"
          className="mt-4 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[11px] font-semibold leading-relaxed text-blue-800"
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {OCCUPANCY_DISCLAIMER}
        </p>
      </>
    );
  }

  function renderReviewStep() {
    const areaLabel = selectedFlat?.area ? `${selectedFlat.area} sq ft` : null;

    return (
      <>
        <SectionHeader
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          title="Step 7 · Review & Submit"
          description="Please confirm your details. After submitting, your application will be pending Society Admin approval."
        />

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600">
              Property (official records)
            </p>
            <dl className="mt-2">
              <ReviewRow label="Society" value={selectedSociety?.name} />
              <ReviewRow label="Building" value={selectedBuilding?.name} />
              <ReviewRow label="Floor" value={selectedFloor?.floorLabel} />
              <ReviewRow label="Flat" value={selectedFlat?.flatNumber} />
              <ReviewRow
                label="Unit Type"
                value={
                  selectedFlat
                    ? (UNIT_TYPE_LABELS[selectedFlat.unitType] ?? selectedFlat.unitType)
                    : null
                }
              />
              <ReviewRow label="Area" value={areaLabel} />
              <ReviewRow label="Facing" value={selectedFlat?.facing} />
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600">
              Personal Profile
            </p>
            <dl className="mt-2">
              <ReviewRow label="Full Name" value={profile.fullName.trim()} />
              <ReviewRow label="Preferred Name" value={profile.preferredName.trim() || null} />
              <ReviewRow label="Email" value={user?.email ?? ''} />
              <ReviewRow label="Phone" value={profile.phone.trim() || null} />
              <ReviewRow label="Occupation" value={profile.occupation.trim() || null} />
              <ReviewRow
                label="Emergency Contact"
                value={
                  profile.emergencyContactName.trim()
                    ? `${profile.emergencyContactName.trim()}${
                        profile.emergencyContactPhone.trim()
                          ? ` · ${profile.emergencyContactPhone.trim()}`
                          : ''
                      }`
                    : null
                }
              />
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600">
              Occupancy (self-declared)
            </p>
            <dl className="mt-2">
              <ReviewRow label="Occupancy Type" value={occupancy.type || null} />
              <ReviewRow label="Move-in Date" value={occupancy.moveInDate || null} />
              <ReviewRow
                label="Residents"
                value={occupancy.residentCount ? String(occupancy.residentCount) : null}
              />
              <ReviewRow label="Notes" value={occupancy.notes.trim() || null} />
            </dl>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p
            role="note"
            className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[11px] font-semibold leading-relaxed text-blue-800"
          >
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {OCCUPANCY_DISCLAIMER}
          </p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            After submission your registration will be <strong>Pending Society Admin Approval</strong>.
            Society Admin approval confirms your registration within the society — it is not
            government or legal ownership verification.
          </p>
        </div>
      </>
    );
  }





}

/** Loading placeholder for the selection lists. */
function ListSkeleton() {
  return (
    <div className="mt-4" role="status" aria-label="Loading options">
      <div className="space-y-3" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

type BadgeVariant = React.ComponentProps<typeof Badge>['variant'];

interface SelectionCardProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: BadgeVariant;
  image?: string | null;
}

/** Keyboard-accessible selectable card used across the wizard steps. */
function SelectionCard({
  selected,
  onClick,
  icon,
  title,
  subtitle,
  badge,
  badgeVariant = 'default',
  image,
}: SelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-center gap-4 rounded-xl border p-3 text-left transition-colors',
        selected
          ? 'border-cyan-500 bg-cyan-50/50 ring-1 ring-cyan-500'
          : 'border-slate-200 bg-white hover:bg-slate-50',
      )}
    >
      {image ? (
        <SafeImage
          src={image}
          alt=""
          className="h-14 w-14 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-slate-900">{title}</span>
        {subtitle && (
          <span className="mt-0.5 block truncate text-xs text-slate-500">{subtitle}</span>
        )}
        {badge && (
          <Badge variant={badgeVariant} className="mt-1.5">
            {badge}
          </Badge>
        )}
      </span>
      {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-600" aria-hidden="true" />}
    </button>
  );
}

/** Definition-list row used by the review step. */
function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <dt className="shrink-0 text-[11px] font-semibold text-slate-400">{label}</dt>
      <dd className="break-words text-right text-xs font-semibold text-slate-800">{value ?? '—'}</dd>
    </div>
  );
}




