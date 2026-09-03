"use client";

/**
 * Phase 15E — Solar analysis configuration (data-only, no React).
 *
 * ACCURACY / HONESTY:
 *  - The solar system is a SIMULATION for visualization only. It is NOT a
 *    measured, surveyed or engineering-certified radiation analysis.
 *  - Site coordinates are the APPROXIMATE VISUALIZATION CENTER from
 *    townshipConfig.ts — never a surveyed parcel boundary.
 *  - Everything shown must carry "Simulated" / "Illustrative" labels.
 */

import { TOWNSHIP_SITE } from "./townshipConfig";

/** Simulated site coordinates — the approximate visualization center only. */
export const SOLAR_SITE = {
  lat: TOWNSHIP_SITE.center.lat,
  lng: TOWNSHIP_SITE.center.lng,
  note: TOWNSHIP_SITE.centerNote,
} as const;

/** Fixed internal simulation date (labeled on screen; no date selector). */
export const SOLAR_SIM_DATE = {
  year: 2026,
  month: 9,
  day: 1,
  label: "01 September 2026",
} as const;

/** Simulated day window shown by the time slider: 06:00 – 18:00. */
export const SOLAR_DAY_START_MIN = 6 * 60;
export const SOLAR_DAY_END_MIN = 18 * 60;

/** Hour ticks under the slider (spec: 06 / 08 / 10 / 12 / 14 / 16 / 18). */
export const SOLAR_HOUR_TICKS = [6, 8, 10, 12, 14, 16, 18] as const;

/** Day-period visualization presets (visualization only, time stays editable). */
export const SOLAR_PERIOD_PRESETS = [
  { id: "morning", label: "Morning", timeMinutes: 8 * 60 },
  { id: "noon", label: "Noon", timeMinutes: 12 * 60 },
  { id: "evening", label: "Evening", timeMinutes: 17 * 60 },
] as const;
export type SolarPeriodId = (typeof SOLAR_PERIOD_PRESETS)[number]["id"];

/** Simulation playback speeds — simulation time, not real time. */
export const SOLAR_SPEEDS = [1, 2, 4] as const;
export type SolarSpeed = (typeof SOLAR_SPEEDS)[number];
/** Simulated minutes advanced per real second at 1x (full sweep ≈ 24 s at 1x). */
export const SOLAR_MINUTES_PER_SECOND: Record<SolarSpeed, number> = { 1: 30, 2: 60, 4: 120 };

export const SOLAR_DEFAULT_TIME_MIN = 12 * 60;

export type SolarExposureBand = "low" | "medium" | "high";
export type SolarExposureFocus = "all" | SolarExposureBand;

export interface SolarSettings {
  /** ☑ Simulated Sun — off returns the scene to neutral daylight. */
  sunEnabled: boolean;
  /** Simulated time-of-day, minutes since midnight (within the day window). */
  timeMinutes: number;
  /** ☑ Building shadows (towers + amenity clubhouse). */
  buildingShadows: boolean;
  /** ☑ Tree shadows (instanced trees + palms). */
  treeShadows: boolean;
  /** Solar-exposure heatmap emphasis — all bands or one. */
  exposureFocus: SolarExposureFocus;
  /** Subtle simulated sun-path arc in the sky (toggleable, req. 14). */
  showSunPath: boolean;
  /** In-scene sun disc + readout label (toggleable, req. 9). */
  showSunIndicator: boolean;
}

export const defaultSolarSettings: SolarSettings = {
  sunEnabled: true,
  timeMinutes: SOLAR_DEFAULT_TIME_MIN,
  buildingShadows: true,
  treeShadows: true,
  exposureFocus: "all",
  showSunPath: false,
  showSunIndicator: true,
};

/** Restrained variations of the existing project palette (no neon/rainbow). */
export const SOLAR_EXPOSURE_COLORS: Record<SolarExposureBand, string> = {
  low: "#2E5F86", // shaded steel blue (variant of the #164E73 border tone)
  medium: "#008CFF", // existing brand blue
  high: "#EAB308", // existing amber accent
};

export const SOLAR_EXPOSURE_LEGEND: Array<{ band: SolarExposureBand; label: string; color: string }> = [
  { band: "low", label: "LOW", color: SOLAR_EXPOSURE_COLORS.low },
  { band: "medium", label: "MEDIUM", color: SOLAR_EXPOSURE_COLORS.medium },
  { band: "high", label: "HIGH", color: SOLAR_EXPOSURE_COLORS.high },
];

/** Simulation disclaimer — visible wherever solar results are shown. */
export const SOLAR_DISCLAIMER =
  "Solar and shadow results are simulated for visualization and are not a substitute for surveyed or engineering analysis.";

/** "08:00" from minutes-since-midnight (zero-padded 24 h). */
export function formatSolarTime(minutes: number): string {
  const clamped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
