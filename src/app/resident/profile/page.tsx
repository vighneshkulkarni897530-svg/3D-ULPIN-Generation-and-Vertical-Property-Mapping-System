'use client';

/**
 * /resident/profile — My Profile (Phase 3)
 * =========================================
 * The signed-in resident edits ONLY their own editable fields:
 *   - Personal: fullName, preferredName, phone, occupation, emergency contact.
 *   - Occupancy: type, move-in date, resident count, notes.
 *   - Email is read-only (it comes from the Firebase Auth session).
 * Immutable fields (userId, claim IDs, status, approval/rejection metadata,
 * createdAt/submittedAt) are NEVER editable here — and Firestore rules
 * enforce the same immutability independently.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCcw,
  Save,
  User,
} from 'lucide-react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageHeader, SectionHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  resolveResidentProperty,
  type ResolvedResidentProperty,
} from '@/lib/society/residentProperty';
import {
  getMyResidentRecord,
  updateMyResidentOccupancy,
  updateMyResidentProfile,
} from '@/lib/society/residentService';
import {
  validateResidentOccupancyEdit,
  validateResidentProfileEdit,
  type ResidentOccupancyForm,
  type ResidentProfileForm,
} from '@/lib/society/residentValidation';
import {
  OCCUPANCY_TYPES,
  RESIDENT_STATUS_LABELS,
  RESIDENT_STATUS_VARIANTS,
  type OccupancyType,
  type Resident,
} from '@/types/society';

type LoadState = 'loading' | 'ready' | 'error';

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

function FormField({ id, label, required = false, error, hint, className, children }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-[11px] font-bold tracking-tight text-slate-700">
        {label}
        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-[10px] leading-relaxed text-slate-400">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[10px] font-semibold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <dt className="shrink-0 text-[11px] font-semibold text-slate-400">{label}</dt>
      <dd className="break-words text-right text-xs font-semibold text-slate-800">{value ?? '—'}</dd>
    </div>
  );
}

export default function ResidentProfilePage() {
  return (
    <ProtectedRoute>
      <ResidentProfileContent />
    </ProtectedRoute>
  );
}

function ResidentProfileContent() {
  const router = useRouter();
  const { sessionUser, authStatus } = useAuth();
  const { toast } = useToast();
  const [record, setRecord] = React.useState<Resident | null>(null);
  const [property, setProperty] = React.useState<ResolvedResidentProperty | null>(null);
  const [state, setState] = React.useState<LoadState>('loading');
  const [reloadKey, setReloadKey] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [profileForm, setProfileForm] = React.useState<ResidentProfileForm>({
    fullName: '',
    preferredName: '',
    phone: '',
    occupation: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });
  const [occupancyForm, setOccupancyForm] = React.useState<ResidentOccupancyForm>({
    type: '',
    moveInDate: '',
    residentCount: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (authStatus !== 'initializing' && !sessionUser?.id) {
      router.replace('/auth/login?next=/resident/profile');
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

  // Prefill forms once the record arrives (and after each reload).
  React.useEffect(() => {
    if (!record) return;
    setProfileForm({
      fullName: record.profile.fullName === 'Unnamed' ? '' : record.profile.fullName,
      preferredName: record.profile.preferredName ?? '',
      phone: record.profile.phone ?? '',
      occupation: record.profile.occupation ?? '',
      emergencyContactName: record.profile.emergencyContactName ?? '',
      emergencyContactPhone: record.profile.emergencyContactPhone ?? '',
    });
    setOccupancyForm({
      type: record.occupancy.type,
      moveInDate: record.occupancy.moveInDate ?? '',
      residentCount: String(record.occupancy.residentCount ?? 1),
      notes: record.occupancy.notes ?? '',
    });
  }, [record]);

  // Hydration-safe "today" for the move-in date max attribute.
  const [todayMax, setTodayMax] = React.useState<string | undefined>(undefined);
  React.useEffect(() => {
    const now = new Date();
    setTodayMax(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate(),
      ).padStart(2, '0')}`,
    );
  }, []);

  const handleSave = async () => {
    if (!record || saving) return;
    const profileErrors = validateResidentProfileEdit(profileForm);
    const occupancyErrors = validateResidentOccupancyEdit(occupancyForm);
    const nextErrors: Record<string, string> = {};
    if (profileErrors.length > 0) nextErrors.profile = profileErrors.join(' ');
    if (occupancyErrors.length > 0) nextErrors.occupancy = occupancyErrors.join(' ');
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast({ title: 'Please fix the highlighted fields', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await updateMyResidentProfile(record.id, {
        fullName: profileForm.fullName.trim(),
        preferredName: profileForm.preferredName.trim() || null,
        phone: profileForm.phone.trim() || null,
        occupation: profileForm.occupation.trim() || null,
        emergencyContactName: profileForm.emergencyContactName.trim() || null,
        emergencyContactPhone: profileForm.emergencyContactPhone.trim() || null,
      });
      await updateMyResidentOccupancy(record.id, {
        type: occupancyForm.type as OccupancyType,
        moveInDate: occupancyForm.moveInDate || null,
        residentCount: parseInt(occupancyForm.residentCount, 10) || 1,
        notes: occupancyForm.notes.trim() || null,
      });
      toast({
        title: 'Profile updated',
        description: 'Your changes have been saved.',
        variant: 'success',
      });
      setReloadKey((k) => k + 1);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not save your profile. Please try again.';
      toast({ title: 'Save failed', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Society Digital Twin · Phase 3"
        title="My Profile"
        description="Update your personal details and self-declared occupancy information."
        actions={
          record ? (
            <Badge variant={RESIDENT_STATUS_VARIANTS[record.status]} className="px-3 py-1 text-xs">
              {RESIDENT_STATUS_LABELS[record.status]}
            </Badge>
          ) : undefined
        }
      />

      {state === 'loading' && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading your profile…
          </p>
        </div>
      )}

      {state === 'error' && (
        <Card className="mt-6">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-fit rounded-2xl border border-red-200 bg-red-50 p-3">
              <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900">Could not load your profile</h2>
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
              icon={<User className="h-8 w-8" aria-hidden="true" />}
              title="No resident profile yet"
              description="Register as a resident first — your profile is created with your registration."
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
            <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
              Your registration is pending Society Admin approval — you can still update your
              details.
            </p>
          )}

          <Card>
            <CardContent className="p-5">
              <SectionHeader
                icon={<User className="h-4 w-4" aria-hidden="true" />}
                title="A · Personal Profile"
                description="Visible to your society admin for management purposes only — never to other residents."
              />
              {formErrors.profile && (
                <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                  {formErrors.profile}
                </p>
              )}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField id="pf-full-name" label="Full Name" required error={formErrors.profile}>
                  <Input
                    id="pf-full-name"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))}
                    maxLength={100}
                    autoComplete="name"
                    aria-invalid={Boolean(formErrors.profile)}
                  />
                </FormField>
                <FormField id="pf-preferred" label="Preferred Name" hint="Optional.">
                  <Input
                    id="pf-preferred"
                    value={profileForm.preferredName}
                    onChange={(e) => setProfileForm((p) => ({ ...p, preferredName: e.target.value }))}
                    maxLength={100}
                  />
                </FormField>
                <FormField id="pf-phone" label="Phone Number" hint="Optional.">
                  <Input
                    id="pf-phone"
                    type="tel"
                    inputMode="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                    aria-invalid={Boolean(formErrors.profile)}
                  />
                </FormField>
                <FormField id="pf-occupation" label="Occupation" hint="Optional.">
                  <Input
                    id="pf-occupation"
                    value={profileForm.occupation}
                    onChange={(e) => setProfileForm((p) => ({ ...p, occupation: e.target.value }))}
                    maxLength={100}
                  />
                </FormField>
                <FormField id="pf-ec-name" label="Emergency Contact Name" hint="Optional.">
                  <Input
                    id="pf-ec-name"
                    value={profileForm.emergencyContactName}
                    onChange={(e) =>
                      setProfileForm((p) => ({ ...p, emergencyContactName: e.target.value }))
                    }
                    maxLength={100}
                    autoComplete="off"
                  />
                </FormField>
                <FormField id="pf-ec-phone" label="Emergency Contact Phone" hint="Optional.">
                  <Input
                    id="pf-ec-phone"
                    type="tel"
                    inputMode="tel"
                    value={profileForm.emergencyContactPhone}
                    onChange={(e) =>
                      setProfileForm((p) => ({ ...p, emergencyContactPhone: e.target.value }))
                    }
                    autoComplete="off"
                  />
                </FormField>
                <FormField
                  id="pf-email"
                  label="Email"
                  hint="From your signed-in account — it cannot be changed here."
                  className="sm:col-span-2"
                >
                  <Input id="pf-email" value={record.profile.email || ''} disabled readOnly />
                </FormField>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <SectionHeader
                title="B · Occupancy Information"
                description="Self-declared details about how you occupy the flat."
              />
              {formErrors.occupancy && (
                <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                  {formErrors.occupancy}
                </p>
              )}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField id="pf-occ-type" label="Occupancy Type" required>
                  <Select
                    id="pf-occ-type"
                    value={occupancyForm.type}
                    onChange={(e) => setOccupancyForm((o) => ({ ...o, type: e.target.value }))}
                    aria-invalid={Boolean(formErrors.occupancy)}
                  >
                    {OCCUPANCY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField id="pf-occ-date" label="Move-in Date" hint="Optional.">
                  <Input
                    id="pf-occ-date"
                    type="date"
                    value={occupancyForm.moveInDate}
                    onChange={(e) => setOccupancyForm((o) => ({ ...o, moveInDate: e.target.value }))}
                    max={todayMax}
                  />
                </FormField>
                <FormField
                  id="pf-occ-count"
                  label="Number of Residents in Flat"
                  required
                  hint="Including yourself (1–50)."
                >
                  <Input
                    id="pf-occ-count"
                    type="number"
                    min={1}
                    max={50}
                    value={occupancyForm.residentCount}
                    onChange={(e) => setOccupancyForm((o) => ({ ...o, residentCount: e.target.value }))}
                    aria-invalid={Boolean(formErrors.occupancy)}
                  />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField id="pf-occ-notes" label="Notes" hint="Optional.">
                    <Textarea
                      id="pf-occ-notes"
                      rows={3}
                      maxLength={500}
                      value={occupancyForm.notes}
                      onChange={(e) => setOccupancyForm((o) => ({ ...o, notes: e.target.value }))}
                    />
                  </FormField>
                </div>
              </div>
              <p className="mt-4 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[11px] font-semibold leading-relaxed text-blue-800">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Self-declared occupancy information. This is not government/legal ownership
                verification.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <SectionHeader
                title="C · Registered Property"
                description="Official society records — read-only."
              />
              <dl className="mt-3">
                <DetailRow label="Society" value={property?.society?.name} />
                <DetailRow label="Building" value={property?.building?.name} />
                <DetailRow label="Floor" value={property?.floor?.floorLabel} />
                <DetailRow label="Flat" value={property?.flat?.flatNumber} />
              </dl>
              <div className="mt-3">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/resident/property">View Full Property Details</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-slate-400">
              Protected details (status, flat assignment, approval records) cannot be changed here.
            </p>
            <Button variant="gradient" onClick={handleSave} loading={saving} className="shrink-0">
              <Save className="h-4 w-4" aria-hidden="true" />
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
