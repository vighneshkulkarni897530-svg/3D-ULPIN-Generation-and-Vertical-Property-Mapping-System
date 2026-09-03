/**
 * Renewal Milestone Calculator & Change Detection Engine
 * =======================================================
 * Pure local mathematical logic for computing building age, review milestones,
 * and detecting structural/footprint alterations between submissions.
 *
 * Guaranteed 100% free with zero paid APIs.
 */

import type {
  RenewalStatus,
  PreviousPropertySnapshot,
  CurrentPropertySubmission,
} from '@/types/renewal';

/**
 * Calculates current building age in years from construction or completion date.
 * Building Age = Current Date - Construction/Completion Date
 */
export function calculateBuildingAge(constructionDate: string): number {
  if (!constructionDate) return 0;
  const parsed = new Date(constructionDate);
  if (isNaN(parsed.getTime())) return 0;

  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const monthDiff = now.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < parsed.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * Calculates the next review date:
 * Next Review Date = Last Verification/Report Date + configured review interval.
 * Defaults to 10 years if not configured.
 */
export function calculateNextReviewDate(
  lastVerificationDate: string,
  intervalYears = 10
): string {
  if (!lastVerificationDate) {
    const fallback = new Date();
    fallback.setFullYear(fallback.getFullYear() + intervalYears);
    return fallback.toISOString().split('T')[0];
  }

  const base = new Date(lastVerificationDate);
  if (isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setFullYear(fallback.getFullYear() + intervalYears);
    return fallback.toISOString().split('T')[0];
  }

  const next = new Date(base);
  next.setFullYear(next.getFullYear() + intervalYears);
  return next.toISOString().split('T')[0];
}

/**
 * Determines whether a property is:
 *  - UP_TO_DATE (Next review > warning threshold)
 *  - DUE_SOON (Approaching review date within warning threshold, e.g. 12 months)
 *  - DUE (Review month/year reached)
 *  - OVERDUE (Review date has passed)
 */
export function determineRenewalStatus(
  nextReviewDate: string,
  warningMonths = 12
): RenewalStatus {
  if (!nextReviewDate) return 'UP_TO_DATE';

  const next = new Date(nextReviewDate);
  if (isNaN(next.getTime())) return 'UP_TO_DATE';

  const now = new Date();
  const diffTimeMs = next.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTimeMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.ceil(diffDays / 30.4375);

  if (diffDays < 0) {
    // Review date passed
    return 'OVERDUE';
  } else if (diffDays <= 30) {
    // Due within 30 days
    return 'DUE';
  } else if (diffMonths <= warningMonths) {
    // Approaching within warning window (e.g. ~6-12 months)
    return 'DUE_SOON';
  } else {
    return 'UP_TO_DATE';
  }
}

/**
 * Automated Diff Engine: Compares previous cadastral record with current submission
 * and flags discrepancies for official revenue officer verification.
 * Does NOT declare changes illegal — flags for review.
 */
export function detectPropertyChanges(
  previous: PreviousPropertySnapshot,
  current: CurrentPropertySubmission
): { hasChanges: boolean; changeNotes: string[] } {
  const changeNotes: string[] = [];

  if (previous.floors !== current.floors) {
    changeNotes.push(
      `Vertical floor count altered: Previously recorded as ${previous.floors} floors, current submission declares ${current.floors} floors.`
    );
  }

  if (previous.units !== current.units) {
    changeNotes.push(
      `Property unit count altered: Previously recorded as ${previous.units} units, current submission declares ${current.units} units.`
    );
  }

  if (
    previous.builtUpAreaSqFt &&
    current.builtUpAreaSqFt &&
    Math.abs(previous.builtUpAreaSqFt - current.builtUpAreaSqFt) > 50
  ) {
    changeNotes.push(
      `Built-up area variance detected: ${previous.builtUpAreaSqFt} sq.ft vs ${current.builtUpAreaSqFt} sq.ft.`
    );
  }

  if (current.structuralAlterations) {
    changeNotes.push(
      `Structural alterations / renovation declared: ${current.structuralNotes || 'Details in attached engineer report'}.`
    );
  }

  return {
    hasChanges: changeNotes.length > 0,
    changeNotes,
  };
}

/**
 * User-friendly date formatter e.g. "15 Aug 2016".
 */
export function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return '—';
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
