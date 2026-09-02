/**
 * Building / Floor / Flat validation (Phase 2)
 * ===============================================
 * Pure, framework-free validation — mirrors the Phase 1 approach
 * (`validation.ts`). No new dependency: Zod/React Hook Form are not used.
 */

export type {
  BuildingFormValues,
  BuildingPayload,
  BuildingType,
  FloorFormValues,
  FloorPayload,
  FloorType,
  FlatFormValues,
  FlatPayload,
  UnitType,
  FlatStatus,
  FlatFacing,
  SocietyLocation,
} from '@/types/society';

/**
 * Building / Floor / Flat validation (Phase 2)
 * ===============================================
 * Pure, framework-free validation — mirrors the Phase 1 approach
 * (`validation.ts`). No new dependency: Zod/React Hook Form are not used.
 */

import {
  BUILDING_TYPES,
  FLOOR_TYPES,
  FLAT_STATUSES,
  UNIT_TYPES,
  FLAT_FACINGS,
  type BuildingFormValues,
  type BuildingPayload,
  type BuildingType,
  type FloorFormValues,
  type FloorPayload,
  type FloorType,
  type FlatFormValues,
  type FlatPayload,
  type UnitType,
  type FlatStatus,
  type FlatFacing,
  type SocietyLocation,
} from '@/types/society';
import { LATITUDE_MIN, LATITUDE_MAX, LONGITUDE_MIN, LONGITUDE_MAX } from '@/lib/society/validation';

// ── Constants ────────────────────────────────────────────────────────────────

export const MAX_BUILDING_TEXT_LENGTH = {
  name: 120,
  code: 20,
  description: 1000,
} as const;

export const MAX_FLAT_TEXT_LENGTH = {
  flatNumber: 20,
  description: 500,
} as const;

export const MAX_FLOOR_LABEL = 40;

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function exceedsLength(value: string, max: number): boolean {
  return value.trim().length > max;
}

function validateCoordinates(values: { latitude: string; longitude: string }): {
  location: SocietyLocation;
  errors: { latitude?: string; longitude?: string };
} {
  const errors: { latitude?: string; longitude?: string } = {};
  const hasLatitude = values.latitude.trim() !== '';
  const hasLongitude = values.longitude.trim() !== '';
  const latitude = parseNumber(values.latitude);
  const longitude = parseNumber(values.longitude);

  if (hasLatitude) {
    if (latitude === null) {
      errors.latitude = 'Latitude must be a number (e.g. 18.5204).';
    } else if (latitude < LATITUDE_MIN || latitude > LATITUDE_MAX) {
      errors.latitude = `Latitude must be between ${LATITUDE_MIN} and ${LATITUDE_MAX}.`;
    }
  }

  if (hasLongitude) {
    if (longitude === null) {
      errors.longitude = 'Longitude must be a number (e.g. 73.8567).';
    } else if (longitude < LONGITUDE_MIN || longitude > LONGITUDE_MAX) {
      errors.longitude = `Longitude must be between ${LONGITUDE_MIN} and ${LONGITUDE_MAX}.`;
    }
  }

  if (hasLatitude && !hasLongitude && !errors.longitude) {
    errors.longitude = 'Provide longitude as well, or leave both fields blank.';
  }
  if (!hasLatitude && hasLongitude && !errors.latitude) {
    errors.latitude = 'Provide latitude as well, or leave both fields blank.';
  }

  return {
    location: {
      latitude: hasLatitude && latitude !== null ? latitude : null,
      longitude: hasLongitude && longitude !== null ? longitude : null,
      source: 'user-provided',
      dataStatus: 'illustrative',
    },
    errors,
  };
}

// ── Building validation ──────────────────────────────────────────────────────

export type BuildingField = keyof BuildingFormValues;
export type BuildingErrors = Partial<Record<BuildingField | 'latitude' | 'longitude', string>>;

export function validateBuildingForm(values: BuildingFormValues): BuildingErrors {
  const errors: BuildingErrors = {};

  const name = values.name.trim();
  if (!name) {
    errors.name = 'Building name is required.';
  } else if (name.length < 2) {
    errors.name = 'Building name must be at least 2 characters.';
  } else if (exceedsLength(values.name, MAX_BUILDING_TEXT_LENGTH.name)) {
    errors.name = `Building name must be at most ${MAX_BUILDING_TEXT_LENGTH.name} characters.`;
  }

  const code = values.code.trim();
  if (!code) {
    errors.code = 'Building code/number is required.';
  } else if (exceedsLength(values.code, MAX_BUILDING_TEXT_LENGTH.code)) {
    errors.code = `Building code must be at most ${MAX_BUILDING_TEXT_LENGTH.code} characters.`;
  }

  if (!values.type) {
    errors.type = 'Select the building type.';
  } else if (!BUILDING_TYPES.includes(values.type as BuildingType)) {
    errors.type = 'Unknown building type.';
  }

  const floorCount = parseNumber(values.floorCount);
  if (values.floorCount.trim() && floorCount === null) {
    errors.floorCount = 'Number of floors must be a whole number.';
  } else if (floorCount !== null && floorCount < 1) {
    errors.floorCount = 'Number of floors must be at least 1.';
  } else if (floorCount !== null && floorCount > 200) {
    errors.floorCount = 'Number of floors seems too high (max 200).';
  }

  const basementFloors = parseNumber(values.basementFloors) ?? 0;
  if (values.basementFloors.trim() && parseNumber(values.basementFloors) === null) {
    errors.basementFloors = 'Basement floors must be a whole number.';
  } else if (basementFloors < 0) {
    errors.basementFloors = 'Basement floors cannot be negative.';
  } else if (basementFloors > 10) {
    errors.basementFloors = 'Basement floors seems too high (max 10).';
  }

  const plannedFlatCount = parseNumber(values.plannedFlatCount) ?? 0;
  if (values.plannedFlatCount.trim() && parseNumber(values.plannedFlatCount) === null) {
    errors.plannedFlatCount = 'Planned flats must be a whole number.';
  } else if (plannedFlatCount < 0) {
    errors.plannedFlatCount = 'Planned flats cannot be negative.';
  }

  if (values.liftAvailable) {
    const liftCount = parseNumber(values.liftCount);
    if (values.liftCount.trim() && liftCount === null) {
      errors.liftCount = 'Lift count must be a whole number.';
    } else if (liftCount !== null && liftCount < 1) {
      errors.liftCount = 'Provide at least 1 lift, or mark lift as unavailable.';
    } else if (liftCount !== null && liftCount > 20) {
      errors.liftCount = 'Lift count seems too high (max 20).';
    }
  } else {
    const liftCount = parseNumber(values.liftCount);
    if (liftCount !== null && liftCount > 0) {
      errors.liftCount = 'Lift count must be 0 when lift is unavailable.';
    }
  }

  if (values.parkingAvailable) {
    const parkingCapacity = parseNumber(values.parkingCapacity);
    if (values.parkingCapacity.trim() && parkingCapacity === null) {
      errors.parkingCapacity = 'Parking capacity must be a whole number.';
    } else if (parkingCapacity !== null && parkingCapacity < 1) {
      errors.parkingCapacity = 'Provide at least 1 parking space, or mark parking as unavailable.';
    }
  } else {
    const parkingCapacity = parseNumber(values.parkingCapacity);
    if (parkingCapacity !== null && parkingCapacity > 0) {
      errors.parkingCapacity = 'Parking capacity must be 0 when parking is unavailable.';
    }
  }

  if (exceedsLength(values.description, MAX_BUILDING_TEXT_LENGTH.description)) {
    errors.description = `Description must be at most ${MAX_BUILDING_TEXT_LENGTH.description} characters.`;
  }

  const { errors: locErrors } = validateCoordinates(values);
  Object.assign(errors, locErrors);

  return errors;
}

export function normalizeBuildingPayload(values: BuildingFormValues): BuildingPayload {
  const { location } = validateCoordinates(values);
  return {
    name: values.name.trim(),
    code: values.code.trim(),
    type: values.type as BuildingType,
    floorCount: parseNumber(values.floorCount) ?? 1,
    basementFloors: parseNumber(values.basementFloors) ?? 0,
    plannedFlatCount: parseNumber(values.plannedFlatCount) ?? 0,
    liftAvailable: values.liftAvailable,
    liftCount: values.liftAvailable ? parseNumber(values.liftCount) ?? 0 : 0,
    parkingAvailable: values.parkingAvailable,
    parkingCapacity: values.parkingAvailable ? parseNumber(values.parkingCapacity) ?? 0 : 0,
    description: values.description.trim() || null,
    location,
  };
}

// ── Floor validation ─────────────────────────────────────────────────────────

export type FloorField = keyof FloorFormValues;
export type FloorErrors = Partial<Record<FloorField, string>>;

export function validateFloorForm(values: FloorFormValues): FloorErrors {
  const errors: FloorErrors = {};

  const floorNumber = parseNumber(values.floorNumber);
  if (values.floorNumber.trim() && floorNumber === null) {
    errors.floorNumber = 'Floor number must be a whole number.';
  } else if (floorNumber !== null && !Number.isInteger(floorNumber)) {
    errors.floorNumber = 'Floor number must be a whole number.';
  } else if (floorNumber !== null && floorNumber < -10) {
    errors.floorNumber = 'Floor number cannot be below -10.';
  } else if (floorNumber !== null && floorNumber > 200) {
    errors.floorNumber = 'Floor number cannot exceed 200.';
  }

  const floorLabel = values.floorLabel.trim();
  if (!floorLabel) {
    errors.floorLabel = 'Floor label is required.';
  } else if (exceedsLength(values.floorLabel, MAX_FLOOR_LABEL)) {
    errors.floorLabel = `Floor label must be at most ${MAX_FLOOR_LABEL} characters.`;
  }

  if (!values.floorType) {
    errors.floorType = 'Select the floor type.';
  } else if (!FLOOR_TYPES.includes(values.floorType as FloorType)) {
    errors.floorType = 'Unknown floor type.';
  }

  const plannedFlatCount = parseNumber(values.plannedFlatCount) ?? 0;
  if (values.plannedFlatCount.trim() && parseNumber(values.plannedFlatCount) === null) {
    errors.plannedFlatCount = 'Planned flats must be a whole number.';
  } else if (plannedFlatCount < 0) {
    errors.plannedFlatCount = 'Planned flats cannot be negative.';
  }

  return errors;
}

export function normalizeFloorPayload(values: FloorFormValues): FloorPayload {
  return {
    floorNumber: parseNumber(values.floorNumber) ?? 0,
    floorLabel: values.floorLabel.trim(),
    floorType: (values.floorType || 'other') as FloorType,
    plannedFlatCount: parseNumber(values.plannedFlatCount) ?? 0,
  };
}

// ── Flat validation ──────────────────────────────────────────────────────────

export type FlatField = keyof FlatFormValues;
export type FlatErrors = Partial<Record<FlatField, string>>;

export function validateFlatForm(values: FlatFormValues): FlatErrors {
  const errors: FlatErrors = {};

  const flatNumber = values.flatNumber.trim();
  if (!flatNumber) {
    errors.flatNumber = 'Flat number is required.';
  } else if (exceedsLength(values.flatNumber, MAX_FLAT_TEXT_LENGTH.flatNumber)) {
    errors.flatNumber = `Flat number must be at most ${MAX_FLAT_TEXT_LENGTH.flatNumber} characters.`;
  }

  if (!values.unitType) {
    errors.unitType = 'Select the unit type.';
  } else if (!UNIT_TYPES.includes(values.unitType as UnitType)) {
    errors.unitType = 'Unknown unit type.';
  }

  if (!values.status) {
    errors.status = 'Select the flat status.';
  } else if (!FLAT_STATUSES.includes(values.status as FlatStatus)) {
    errors.status = 'Unknown flat status.';
  }

  const area = parseNumber(values.area);
  if (values.area.trim() && area === null) {
    errors.area = 'Area must be a number.';
  } else if (area !== null && area <= 0) {
    errors.area = 'Area must be greater than 0.';
  }

  const floorPosition = parseNumber(values.floorPosition);
  if (values.floorPosition.trim() && floorPosition === null) {
    errors.floorPosition = 'Floor position must be a number.';
  } else if (floorPosition !== null && floorPosition < 0) {
    errors.floorPosition = 'Floor position cannot be negative.';
  }

  if (values.facing && !FLAT_FACINGS.includes(values.facing as FlatFacing)) {
    errors.facing = 'Unknown facing direction.';
  }

  const bedrooms = parseNumber(values.bedrooms);
  if (values.bedrooms.trim() && bedrooms === null) {
    errors.bedrooms = 'Bedrooms must be a whole number.';
  } else if (bedrooms !== null && bedrooms < 0) {
    errors.bedrooms = 'Bedrooms cannot be negative.';
  }

  const bathrooms = parseNumber(values.bathrooms);
  if (values.bathrooms.trim() && bathrooms === null) {
    errors.bathrooms = 'Bathrooms must be a whole number.';
  } else if (bathrooms !== null && bathrooms < 0) {
    errors.bathrooms = 'Bathrooms cannot be negative.';
  }

  const balconyCount = parseNumber(values.balconyCount);
  if (values.balconyCount.trim() && balconyCount === null) {
    errors.balconyCount = 'Balcony count must be a whole number.';
  } else if (balconyCount !== null && balconyCount < 0) {
    errors.balconyCount = 'Balcony count cannot be negative.';
  }

  const parkingSpaces = parseNumber(values.parkingSpaces) ?? 0;
  if (values.parkingSpaces.trim() && parseNumber(values.parkingSpaces) === null) {
    errors.parkingSpaces = 'Parking spaces must be a whole number.';
  } else if (parkingSpaces < 0) {
    errors.parkingSpaces = 'Parking spaces cannot be negative.';
  }

  if (exceedsLength(values.description, MAX_FLAT_TEXT_LENGTH.description)) {
    errors.description = `Description must be at most ${MAX_FLAT_TEXT_LENGTH.description} characters.`;
  }

  return errors;
}

export function normalizeFlatPayload(values: FlatFormValues): FlatPayload {
  return {
    flatNumber: values.flatNumber.trim(),
    unitType: values.unitType as UnitType,
    area: parseNumber(values.area),
    areaUnit: 'sqft',
    floorPosition: parseNumber(values.floorPosition),
    facing: values.facing.trim() || null,
    bedrooms: parseNumber(values.bedrooms),
    bathrooms: parseNumber(values.bathrooms),
    balconyCount: parseNumber(values.balconyCount),
    parkingSpaces: parseNumber(values.parkingSpaces) ?? 0,
    status: values.status as FlatStatus,
    description: values.description.trim() || null,
  };
}