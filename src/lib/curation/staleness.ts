/**
 * Staleness detection: identify destinations needing curation review.
 *
 * `curatedOn` is the curated tier's own freshness claim. Once it drifts far enough past
 * the review threshold the editorial judgement it stands for is no longer defensible, and
 * the destination is surfaced for review — never auto-corrected.
 */

import { daysUntil, isValidDate } from "@/lib/dates";

export const STALENESS_THRESHOLD_DAYS = 180;

/** Why a destination is being surfaced. Distinguishing these matters for the UI copy. */
export type StaleReason =
  /** Reviewed, but longer ago than the threshold allows. */
  | "overdue"
  /** No `curatedOn` at all — never reviewed. */
  | "never-curated"
  /** `curatedOn` is unparseable or in the future. Data error, not staleness. */
  | "invalid-date"
  /** Within the threshold. */
  | null;

export interface StaleDestination {
  destinationId: string;
  name: string;
  curatedOn: string | null;
  /**
   * Whole days between `curatedOn` and `asOf`. Null when that cannot be computed —
   * a missing or invalid date has no meaningful age, and rendering one as a number
   * (previously `Infinity`) put "Infinity days ago" on screen.
   */
  daysSinceCuration: number | null;
  isStale: boolean;
  reason: StaleReason;
}

/**
 * Check whether a destination's curation has gone stale.
 *
 * `asOf` defaults to today and exists so callers — tests above all — can pin the clock.
 * Without it every assertion about staleness would change meaning with the calendar.
 */
export function checkStaleness(
  destinationId: string,
  name: string,
  curatedOn: string | null,
  asOf?: string,
): StaleDestination {
  if (!curatedOn) {
    return {
      destinationId,
      name,
      curatedOn: null,
      daysSinceCuration: null,
      isStale: true,
      reason: "never-curated",
    };
  }

  if (!isValidDate(curatedOn)) {
    return {
      destinationId,
      name,
      curatedOn,
      daysSinceCuration: null,
      isStale: true,
      reason: "invalid-date",
    };
  }

  // daysUntil is negative for a past date, so days *since* curation is its negation.
  // Negating zero yields -0, which is invisible in output but fails Object.is against 0;
  // normalise it so a destination curated today reports a plain 0.
  const negated = -daysUntil(curatedOn, asOf);
  const daysSince = negated === 0 ? 0 : negated;

  // A curatedOn in the future is a data error, not freshness. Flag it rather than
  // letting an absolute value quietly recast it as staleness.
  if (daysSince < 0) {
    return {
      destinationId,
      name,
      curatedOn,
      daysSinceCuration: null,
      isStale: true,
      reason: "invalid-date",
    };
  }

  const isStale = daysSince > STALENESS_THRESHOLD_DAYS;

  return {
    destinationId,
    name,
    curatedOn,
    daysSinceCuration: daysSince,
    isStale,
    reason: isStale ? "overdue" : null,
  };
}

/**
 * Destinations needing review, most urgent first.
 *
 * Entries with no computable age (never curated, invalid date) sort above every dated
 * one — an unreviewed destination is a larger gap than an overdue one.
 */
export function filterStale(destinations: StaleDestination[]): StaleDestination[] {
  return destinations
    .filter((d) => d.isStale)
    .sort((a, b) => {
      if (a.daysSinceCuration === null && b.daysSinceCuration === null) return 0;
      if (a.daysSinceCuration === null) return -1;
      if (b.daysSinceCuration === null) return 1;
      return b.daysSinceCuration - a.daysSinceCuration;
    });
}
