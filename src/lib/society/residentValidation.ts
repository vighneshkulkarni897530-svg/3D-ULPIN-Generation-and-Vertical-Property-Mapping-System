/**
 * Resident registration & profile validation (Phase 3)
 * Pure functions — no external dependencies (Zod is NOT installed in this project).
 *
 * These mirror the rules enforced in Firestore security rules so the UI
 * can give immediate, friendly feedback. Rules are the source of truth.
 */

export interface ResidentValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export interface ResidentProfileForm {
  fullName: string;
  preferredName: string;
  phone: string;
  occupation: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export interface ResidentOccupancyForm {
  type: string;
  moveInDate: string;
  residentCount: string;
  notes: string;
}

export const RESIDENT_OCCUPANCY_TYPES = [
  'Owner Occupant',
  'Tenant',
  'Family Member',
  'Authorized Occupant',
  'Other',
] as const;

/** Validates the resident profile fieldset. */
export function validateResidentProfile(form: ResidentProfileForm): string[] {
  const errors: string[] = [];

  if (!form.fullName || form.fullName.trim().length < 2) {
    errors.push('Full name is required (minimum 2 characters).');
  }

  if (form.fullName && form.fullName.trim().length > 100) {
    errors.push('Full name must be 100 characters or fewer.');
  }

  const phoneRegex = /^[\d\s()+\-]+$/;
  if (form.phone && form.phone.trim() !== '') {
    if (!phoneRegex.test(form.phone.trim())) {
      errors.push('Phone number contains invalid characters.');
    }
    if (form.phone.replace(/\D/g, '').length < 7) {
      errors.push('Phone number is too short.');
    }
  }

  if (form.emergencyContactName && form.emergencyContactName.trim().length > 100) {
    errors.push('Emergency contact name must be 100 characters or fewer.');
  }

  const ecpRegex = /^[\d\s()+\-]+$/;
  if (form.emergencyContactPhone && form.emergencyContactPhone.trim() !== '') {
    if (!ecpRegex.test(form.emergencyContactPhone.trim())) {
      errors.push('Emergency contact phone contains invalid characters.');
    }
  }

  if (form.occupation && form.occupation.trim().length > 100) {
    errors.push('Occupation must be 100 characters or fewer.');
  }

  return errors;
}

/** Validates the occupancy fieldset. */
export function validateResidentOccupancy(form: ResidentOccupancyForm): string[] {
  const errors: string[] = [];

  if (!form.type || form.type.trim() === '') {
    errors.push('Occupancy type is required.');
  }

  if (form.residentCount) {
    const count = parseInt(form.residentCount, 10);
    if (isNaN(count) || count < 1 || count > 50) {
      errors.push('Number of residents must be between 1 and 50.');
    }
  } else {
    errors.push('Number of residents is required.');
  }

  if (form.moveInDate) {
    const d = new Date(form.moveInDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(d.getTime()) || d > today) {
      errors.push('Move-in date cannot be in the future.');
    }
  }

  if (form.notes && form.notes.trim().length > 500) {
    errors.push('Notes must be 500 characters or fewer.');
  }

  return errors;
}

/** Validates the entire registration form. Returns field-level errors. */
export function validateResidentRegistration(
  profile: ResidentProfileForm,
  occupancy: ResidentOccupancyForm,
  claim: { societyId: string; buildingId: string; floorId: string; flatId: string },
): ResidentValidationResult {
  const errors: Record<string, string> = {};

  if (!claim.societyId) {
    errors.society = 'Please select a society.';
  }
  if (!claim.buildingId) {
    errors.building = 'Please select a building.';
  }
  if (!claim.floorId) {
    errors.floor = 'Please select a floor.';
  }
  if (!claim.flatId) {
    errors.flat = 'Please select a flat.';
  }

  const profileErrors = validateResidentProfile(profile);
  if (profileErrors.length > 0) {
    errors.profile = profileErrors.join(' ');
  }

  const occupancyErrors = validateResidentOccupancy(occupancy);
  if (occupancyErrors.length > 0) {
    errors.occupancy = occupancyErrors.join(' ');
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/** Validates profile edit form (subset). */
export function validateResidentProfileEdit(form: ResidentProfileForm): string[] {
  return validateResidentProfile(form);
}

/** Validates occupancy edit form. */
export function validateResidentOccupancyEdit(form: ResidentOccupancyForm): string[] {
  return validateResidentOccupancy(form);
}

/** Validates a rejection reason. */
export function validateRejectionReason(reason: string): string[] {
  const errors: string[] = [];
  if (!reason || reason.trim().length < 10) {
    errors.push('Rejection reason must be at least 10 characters.');
  }
  if (reason && reason.trim().length > 500) {
    errors.push('Rejection reason must be 500 characters or fewer.');
  }
  return errors;
}