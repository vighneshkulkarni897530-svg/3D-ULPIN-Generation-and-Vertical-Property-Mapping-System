'use client';

/**
 * /society/register — Society Registration (Phase 1)
 * ===================================================
 * Professional multi-section registration form for Society Secretaries:
 *
 *   A · Society Information   (name, type, registration no., year, description)
 *   B · Address               (line1/2, city, district, state, 6-digit PIN)
 *   C · Location              (optional lat/lng — user-provided & illustrative)
 *   D · Society Image         (JPG/JPEG/PNG/WEBP, ≤ 5 MB, preview/replace/remove)
 *
 * Behaviour:
 *   - Route is protected twice: middleware (server) + <ProtectedRoute>.
 *   - On submit the creator automatically becomes `society-admin`; the role
 *     is NEVER selectable in the form.
 *   - `createdBy` is taken from the Firebase session inside the service —
 *     never from form data.
 *   - An image upload failure never loses the registration (imageUrl: null).
 *
 * Hydration safety: no random values, no browser APIs during render; the
 * only object-URL (image preview) lives inside the uploader's effects.
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Building2, MapPin, ShieldCheck } from 'lucide-react';

import { PERMISSIONS } from '@/types/auth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageHeader, SectionHeader } from '@/components/layout/PageHeader';
import { SocietyImageUploader } from '@/components/society/SocietyImageUploader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  createSocietyWithAdmin,
  setSocietyImageUrl,
  SocietyServiceError,
} from '@/lib/society/service';
import { uploadSocietyImageSafe } from '@/lib/society/storage';
import {
  MAX_TEXT_LENGTH,
  validateSocietyImageFile,
  validateSocietyRegistration,
  type SocietyRegistrationErrors,
  type SocietyRegistrationField,
} from '@/lib/society/validation';
import {
  SOCIETY_TYPES,
  type SocietyRegistrationFormValues,
  type SocietyRegistrationPayload,
  type SocietyType,
} from '@/types/society';

const EMPTY_FORM: SocietyRegistrationFormValues = {
  name: '',
  type: '',
  registrationNumber: '',
  establishedYear: '',
  description: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  district: '',
  state: '',
  pinCode: '',
  latitude: '',
  longitude: '',
};

const LOCATION_NOTE =
  'Location is user-provided and intended for visualization. It is not a surveyed/legal boundary.';

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
        <p id={`${id}-hint`} className="text-[10px] font-medium text-slate-400">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-center gap-1 text-[11px] font-semibold text-red-600"
        >
          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Maps validated form values to the service payload (nulls for blanks). */
function toRegistrationPayload(values: SocietyRegistrationFormValues): SocietyRegistrationPayload {
  const latitude = values.latitude.trim() ? Number(values.latitude.trim()) : null;
  const longitude = values.longitude.trim() ? Number(values.longitude.trim()) : null;
  const establishedYear = values.establishedYear.trim() ? Number(values.establishedYear.trim()) : null;

  return {
    name: values.name.trim(),
    type: values.type as SocietyType,
    registrationNumber: values.registrationNumber.trim() || null,
    establishedYear,
    description: values.description.trim() || null,
    address: {
      line1: values.addressLine1.trim(),
      line2: values.addressLine2.trim() || null,
      city: values.city.trim(),
      district: values.district.trim() || null,
      state: values.state.trim(),
      pinCode: values.pinCode.trim(),
    },
    location: { latitude, longitude, source: 'user-provided', dataStatus: 'illustrative' },
  };
}

export default function SocietyRegisterPage() {
  return (
    <ProtectedRoute permission={PERMISSIONS.REGISTER_BUILDING}>
      <SocietyRegisterPageContent />
    </ProtectedRoute>
  );
}

function SocietyRegisterPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [values, setValues] = React.useState<SocietyRegistrationFormValues>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<SocietyRegistrationErrors>({});
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [submitImageError, setSubmitImageError] = React.useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [notice, setNotice] = React.useState<{ tone: 'error' | 'warning'; message: string } | null>(
    null,
  );

  const update =
    (field: SocietyRegistrationField) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setValues((prev) => ({ ...prev, [field]: value }));
      // Clear the field-level error as soon as the user edits the field.
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    };

  /** aria-describedby wiring: error wins over hint. */
  const describedBy = (field: SocietyRegistrationField, hasHint: boolean): string | undefined =>
    errors[field] ? `${field}-error` : hasHint ? `${field}-hint` : undefined;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return; // guard against duplicate submissions

    const nextErrors = validateSocietyRegistration(values);
    const imageCheck = validateSocietyImageFile(imageFile);
    setErrors(nextErrors);

    if (!imageCheck.ok) {
      setSubmitImageError(imageCheck.error);
      toast({ variant: 'warning', title: 'Check the society image', description: imageCheck.error });
      return;
    }
    setSubmitImageError(null);

    if (Object.keys(nextErrors).length > 0) {
      toast({
        variant: 'warning',
        title: 'Please fix the highlighted fields',
        description: 'Some required information is missing or invalid.',
      });
      return;
    }

    setSubmitting(true);
    setNotice(null);
    setUploadProgress(null);

    try {
      // 1 · Society + `society-admin` membership (atomic; createdBy = Authenticated UID).
      const { societyId } = await createSocietyWithAdmin(toRegistrationPayload(values), currentUser?.id);

      // 2 · Image upload — best-effort; failure must NOT lose the registration.
      if (imageFile) {
        setUploadProgress(0);
        const outcome = await uploadSocietyImageSafe(societyId, imageFile, (percent) =>
          setUploadProgress(percent),
        );
        setUploadProgress(null);
        if (outcome.url) {
          try {
            await setSocietyImageUrl(societyId, outcome.url);
          } catch {
            toast({
              variant: 'warning',
              title: 'Society created',
              description: 'The image uploaded, but its link could not be attached to the record.',
            });
          }
        } else if (outcome.warning) {
          setNotice({ tone: 'warning', message: outcome.warning });
          toast({ variant: 'warning', title: 'Society created without image', description: outcome.warning });
        }
      }

      // 3 · Hand over to the new society dashboard.
      toast({
        variant: 'success',
        title: 'Society registered',
        description: `${values.name.trim()} — you are now its Society Admin.`,
      });
      router.replace(`/society/${societyId}`);
    } catch (error) {
      setSubmitting(false);
      setUploadProgress(null);
      const message =
        error instanceof SocietyServiceError
          ? error.message
          : 'Something went wrong while creating the society. Please try again.';
      setNotice({ tone: 'error', message });
      toast({ variant: 'destructive', title: 'Registration failed', description: message });
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Society Digital Twin · Phase 1"
        title="Register a Society"
        description="Create the society record with its address and an approximate location. Buildings, floors, flats and residents arrive in later phases."
      />

      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-cyan-200 bg-cyan-50 p-3.5 text-cyan-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" aria-hidden="true" />
        <p className="text-xs leading-relaxed">
          Registering as <span className="font-bold">{currentUser.name}</span> ({currentUser.email}).
          Your role will be assigned automatically as{' '}
          <span className="font-bold">Society Admin</span> — it cannot be selected or changed from this
          form.
        </p>
      </div>

      {notice && (
        <div
          role="alert"
          className={cn(
            'mt-3 flex items-start gap-2.5 rounded-xl border p-3.5',
            notice.tone === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-amber-200 bg-amber-50 text-amber-800',
          )}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="text-xs font-semibold leading-relaxed">{notice.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate autoComplete="off" className="mt-6 space-y-6">
        <fieldset disabled={submitting} className="space-y-6">
          {/* ── SECTION A · SOCIETY INFORMATION ── */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader
                icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
                title="A · Society Information"
                description="Basic identity of the society as it should appear across the platform."
              />
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  id="society-name"
                  label="Society Name"
                  required
                  error={errors.name}
                  className="md:col-span-2"
                >
                  <Input
                    id="society-name"
                    value={values.name}
                    onChange={update('name')}
                    placeholder="e.g. Green Meadows Housing Society"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={describedBy('name', false)}
                  />
                </FormField>

                <FormField id="society-type" label="Society Type" required error={errors.type}>
                  <Select
                    id="society-type"
                    value={values.type}
                    onChange={update('type')}
                    aria-invalid={Boolean(errors.type)}
                    aria-describedby={describedBy('type', false)}
                  >
                    <option value="">Select society type…</option>
                    {SOCIETY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField
                  id="society-reg"
                  label="Registration Number"
                  error={errors.registrationNumber}
                  hint="Optional — society / cooperative registration number."
                >
                  <Input
                    id="society-reg"
                    value={values.registrationNumber}
                    onChange={update('registrationNumber')}
                    placeholder="e.g. SOC/2015/1234"
                    aria-invalid={Boolean(errors.registrationNumber)}
                    aria-describedby={describedBy('registrationNumber', true)}
                  />
                </FormField>

                <FormField
                  id="society-year"
                  label="Year Established"
                  error={errors.establishedYear}
                  hint="Optional — a 4-digit year, no future years."
                >
                  <Input
                    id="society-year"
                    value={values.establishedYear}
                    onChange={update('establishedYear')}
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="e.g. 2015"
                    aria-invalid={Boolean(errors.establishedYear)}
                    aria-describedby={describedBy('establishedYear', true)}
                  />
                </FormField>

                <FormField
                  id="society-desc"
                  label="Description"
                  error={errors.description}
                  hint="Optional — a short public summary of the society."
                  className="md:col-span-2"
                >
                  <Textarea
                    id="society-desc"
                    value={values.description}
                    onChange={update('description')}
                    rows={3}
                    maxLength={MAX_TEXT_LENGTH.description}
                    placeholder="Briefly describe the society, its amenities and its layout…"
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={describedBy('description', true)}
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* ── SECTION B · ADDRESS ── */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader
                icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
                title="B · Address"
                description="Official correspondence address of the society."
              />
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  id="society-line1"
                  label="Address Line 1"
                  required
                  error={errors.addressLine1}
                  className="md:col-span-2"
                >
                  <Input
                    id="society-line1"
                    value={values.addressLine1}
                    onChange={update('addressLine1')}
                    placeholder="Street / society address"
                    aria-invalid={Boolean(errors.addressLine1)}
                    aria-describedby={describedBy('addressLine1', false)}
                  />
                </FormField>

                <FormField
                  id="society-line2"
                  label="Address Line 2"
                  error={errors.addressLine2}
                  className="md:col-span-2"
                >
                  <Input
                    id="society-line2"
                    value={values.addressLine2}
                    onChange={update('addressLine2')}
                    placeholder="Landmark, area, locality (optional)"
                    aria-invalid={Boolean(errors.addressLine2)}
                    aria-describedby={describedBy('addressLine2', false)}
                  />
                </FormField>

                <FormField id="society-city" label="City" required error={errors.city}>
                  <Input
                    id="society-city"
                    value={values.city}
                    onChange={update('city')}
                    placeholder="e.g. Pune"
                    aria-invalid={Boolean(errors.city)}
                    aria-describedby={describedBy('city', false)}
                  />
                </FormField>

                <FormField id="society-district" label="District" error={errors.district} hint="Optional.">
                  <Input
                    id="society-district"
                    value={values.district}
                    onChange={update('district')}
                    placeholder="e.g. Pune"
                    aria-invalid={Boolean(errors.district)}
                    aria-describedby={describedBy('district', true)}
                  />
                </FormField>

                <FormField id="society-state" label="State" required error={errors.state}>
                  <Input
                    id="society-state"
                    value={values.state}
                    onChange={update('state')}
                    placeholder="e.g. Maharashtra"
                    aria-invalid={Boolean(errors.state)}
                    aria-describedby={describedBy('state', false)}
                  />
                </FormField>

                <FormField
                  id="society-pin"
                  label="PIN Code"
                  required
                  error={errors.pinCode}
                  hint="Exactly 6 digits."
                >
                  <Input
                    id="society-pin"
                    value={values.pinCode}
                    onChange={update('pinCode')}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="e.g. 411001"
                    aria-invalid={Boolean(errors.pinCode)}
                    aria-describedby={describedBy('pinCode', true)}
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* ── SECTION C · LOCATION ── */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader
                icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
                title="C · Approximate Location"
                description="Optional approximate coordinates used for visualization."
                action={
                  <div className="flex gap-1.5">
                    <Badge variant="secondary">source · user-provided</Badge>
                    <Badge variant="outline">status · illustrative</Badge>
                  </div>
                }
              />
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  id="society-lat"
                  label="Latitude"
                  error={errors.latitude}
                  hint="Decimal degrees, −90 to 90."
                >
                  <Input
                    id="society-lat"
                    value={values.latitude}
                    onChange={update('latitude')}
                    inputMode="decimal"
                    placeholder="e.g. 18.5204"
                    aria-invalid={Boolean(errors.latitude)}
                    aria-describedby={describedBy('latitude', true)}
                  />
                </FormField>

                <FormField
                  id="society-lng"
                  label="Longitude"
                  error={errors.longitude}
                  hint="Decimal degrees, −180 to 180."
                >
                  <Input
                    id="society-lng"
                    value={values.longitude}
                    onChange={update('longitude')}
                    inputMode="decimal"
                    placeholder="e.g. 73.8567"
                    aria-invalid={Boolean(errors.longitude)}
                    aria-describedby={describedBy('longitude', true)}
                  />
                </FormField>
              </div>
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] font-medium leading-relaxed text-slate-600">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                {LOCATION_NOTE}
              </p>
            </CardContent>
          </Card>

          {/* ── SECTION D · SOCIETY IMAGE ── */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader
                icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
                title="D · Society Image"
                description="Optional cover photo shown on the society dashboard."
              />
              <div className="mt-4">
                <SocietyImageUploader
                  file={imageFile}
                  onFileChange={setImageFile}
                  uploadProgress={uploadProgress}
                  uploadError={submitImageError}
                  disabled={submitting}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── SUBMIT ── */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-tech sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-slate-400">
              Fields marked <span className="font-bold text-red-500">*</span> are required. By
              registering you confirm you are authorised to administer this society.
            </p>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={submitting}
                onClick={() => router.push('/dashboard')}
              >
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="lg" loading={submitting}>
                {submitting ? 'Creating Society…' : 'Register Society'}
              </Button>
            </div>
          </div>





        </fieldset>
      </form>
    </div>
  );
}


