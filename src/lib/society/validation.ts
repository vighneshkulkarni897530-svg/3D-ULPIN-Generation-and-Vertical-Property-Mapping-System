/**
 * Society registration validation (Phase 1)
 * ==========================================
 * Pure, framework-free validation for the society registration form.
 *
 * The project does not ship Zod or React Hook Form, so no new dependency is
 * introduced here; the module keeps a schema-like shape so a later migration
 * would be mechanical.
 */

import {
  SOCIETY_TYPES,
  type SocietyRegistrationFormValues,
  type SocietyType,
} from '@/types/society';

// ── Constants ────────────────────────────────────────────────────────────────

/** Indian postal PIN codes are exactly 6 numeric digits. */
export const PIN_CODE_REGEX = /^\d{6}$/;

export const SOCIETY_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Browsers normalize `.jpg` to the `image/jpeg` MIME type, so `image/jpg`
 * never appears in `File.type`.
 */
export const SOCIETY_IMAGE_ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const SOCIETY_IMAGE_ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;

export const SOCIETY_IMAGE_ACCEPT_ATTRIBUTE =
  'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

export const SOCIETY_IMAGE_LABEL = 'JPG, JPEG, PNG or WEBP · up to 5 MB';

export const MIN_ESTABLISHED_YEAR = 1800;
export const LATITUDE_MIN = -90;
export const LATITUDE_MAX = 90;
export const LONGITUDE_MIN = -180;
export const LONGITUDE_MAX = 180;

export const MAX_TEXT_LENGTH = {
  name: 120,
  registrationNumber: 60,
  description: 2000,
  addressLine1: 160,
  addressLine2: 160,
  city: 80,
  district: 80,
  state: 80,
} as const;

export type SocietyRegistrationField = keyof SocietyRegistrationFormValues;

export type SocietyRegistrationErrors = Partial<Record<SocietyRegistrationField, string>>;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Establish-year bounds: a reasonable 4-digit year, never in the future. */
export function getEstablishedYearBounds(): { min: number; max: number } {
  return { min: MIN_ESTABLISHED_YEAR, max: new Date().getFullYear() };
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function exceedsLength(value: string, max: number): boolean {
  return value.trim().length > max;
}

// ── Form validation ──────────────────────────────────────────────────────────

/**
 * Validates every section of the society registration form and returns a
 * map of field → error message. An empty object means the form is valid.
 */
export function validateSocietyRegistration(
  values: SocietyRegistrationFormValues,
): SocietyRegistrationErrors {
  const errors: SocietyRegistrationErrors = {};
  const yearBounds = getEstablishedYearBounds();

  // ── Section A — Society information ──
  const name = values.name.trim();
  if (!name) {
    errors.name = 'Society name is required.';
  } else if (name.length < 3) {
    errors.name = 'Society name must be at least 3 characters.';
  } else if (exceedsLength(values.name, MAX_TEXT_LENGTH.name)) {
    errors.name = `Society name must be at most ${MAX_TEXT_LENGTH.name} characters.`;
  }

  if (!values.type) {
    errors.type = 'Select the society type.';
  } else if (!SOCIETY_TYPES.includes(values.type as SocietyType)) {
    errors.type = 'Unknown society type.';
  }

  if (exceedsLength(values.registrationNumber, MAX_TEXT_LENGTH.registrationNumber)) {
    errors.registrationNumber = `Registration number must be at most ${MAX_TEXT_LENGTH.registrationNumber} characters.`;
  }

  if (values.establishedYear.trim()) {
    const year = Number(values.establishedYear.trim());
    if (!Number.isInteger(year)) {
      errors.establishedYear = 'Enter a valid 4-digit year (e.g. 2015).';
    } else if (year < yearBounds.min || year > yearBounds.max) {
      errors.establishedYear = `Year must be between ${yearBounds.min} and ${yearBounds.max}. Future years are not allowed.`;
    }
  }

  if (exceedsLength(values.description, MAX_TEXT_LENGTH.description)) {
    errors.description = `Description must be at most ${MAX_TEXT_LENGTH.description} characters.`;
  }

  // ── Section B — Address ──
  if (!values.addressLine1.trim()) {
    errors.addressLine1 = 'Address line 1 is required.';
  } else if (exceedsLength(values.addressLine1, MAX_TEXT_LENGTH.addressLine1)) {
    errors.addressLine1 = `Address line 1 must be at most ${MAX_TEXT_LENGTH.addressLine1} characters.`;
  }

  if (exceedsLength(values.addressLine2, MAX_TEXT_LENGTH.addressLine2)) {
    errors.addressLine2 = `Address line 2 must be at most ${MAX_TEXT_LENGTH.addressLine2} characters.`;
  }

  if (!values.city.trim()) {
    errors.city = 'City is required.';
  } else if (exceedsLength(values.city, MAX_TEXT_LENGTH.city)) {
    errors.city = `City must be at most ${MAX_TEXT_LENGTH.city} characters.`;
  }

  if (exceedsLength(values.district, MAX_TEXT_LENGTH.district)) {
    errors.district = `District must be at most ${MAX_TEXT_LENGTH.district} characters.`;
  }

  if (!values.state.trim()) {
    errors.state = 'State is required.';
  } else if (exceedsLength(values.state, MAX_TEXT_LENGTH.state)) {
    errors.state = `State must be at most ${MAX_TEXT_LENGTH.state} characters.`;
  }

  if (!values.pinCode.trim()) {
    errors.pinCode = 'PIN code is required.';
  } else if (!PIN_CODE_REGEX.test(values.pinCode.trim())) {
    errors.pinCode = 'PIN code must be exactly 6 digits.';
  }

  // ── Section C — Location (optional, but validated when provided) ──
  const hasLatitude = values.latitude.trim() !== '';
  const hasLongitude = values.longitude.trim() !== '';
  const latitude = parseNumber(values.latitude);
  const longitude = parseNumber(values.longitude);

  if (hasLatitude) {
    if (latitude === null) {
      errors.latitude = 'Latitude must be a number (e.g. 12.9716).';
    } else if (latitude < LATITUDE_MIN || latitude > LATITUDE_MAX) {
      errors.latitude = `Latitude must be between ${LATITUDE_MIN} and ${LATITUDE_MAX}.`;
    }
  }

  if (hasLongitude) {
    if (longitude === null) {
      errors.longitude = 'Longitude must be a number (e.g. 77.5946).';
    } else if (longitude < LONGITUDE_MIN || longitude > LONGITUDE_MAX) {
      errors.longitude = `Longitude must be between ${LONGITUDE_MIN} and ${LONGITUDE_MAX}.`;
    }
  }

  // A single coordinate without its pair cannot be visualized.
  if (hasLatitude && !hasLongitude && !errors.longitude) {
    errors.longitude = 'Provide longitude as well, or leave both fields blank.';
  }
  if (!hasLatitude && hasLongitude && !errors.latitude) {
    errors.latitude = 'Provide latitude as well, or leave both fields blank.';
  }

  return errors;
}

// ── Image validation ─────────────────────────────────────────────────────────

export type SocietyImageValidation = { ok: true } | { ok: false; error: string };

/**
 * Validates a candidate society image against the Phase 1 constraints:
 * JPG / JPEG / PNG / WEBP, maximum 5 MB.
 */
export function validateSocietyImageFile(file: File | null | undefined): SocietyImageValidation {
  if (!file) return { ok: true };

  const mimeOk = (SOCIETY_IMAGE_ACCEPTED_MIME as readonly string[]).includes(
    file.type.toLowerCase(),
  );
  const nameLower = file.name.toLowerCase();
  const extensionOk = SOCIETY_IMAGE_ACCEPTED_EXTENSIONS.some((ext) => nameLower.endsWith(ext));

  if (!mimeOk && !extensionOk) {
    return {
      ok: false,
      error: 'Unsupported file type. Please choose a JPG, JPEG, PNG or WEBP image.',
    };
  }

  if (file.size > SOCIETY_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      error: `Image is too large (${formatBytes(file.size)}). Maximum size is 5 MB.`,
    };
  }

  return { ok: true };
}

/** Human-readable byte size, e.g. "4.2 MB" or "780 KB". */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}


