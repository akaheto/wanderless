/**
 * Staleness detection: identify destinations needing curation review.
 */

import { daysUntil } from "@/lib/dates";

const STALENESS_THRESHOLD_DAYS = 180;

export interface StaleDestination {
  destinationId: string;
  name: string;
  curatedOn: string | null;
  daysSinceCuration: number;
  isStale: boolean;
}

/**
 * Check if a destination's curation is stale (>180 days without review).
 * Returns staleness info for display and filtering.
 */
export function checkStaleness(
  destinationId: string,
  name: string,
  curatedOn: string | null,
): StaleDestination {
  if (!curatedOn) {
    return {
      destinationId,
      name,
      curatedOn: null,
      daysSinceCuration: Infinity,
      isStale: true,
    };
  }

  const daysSince = Math.abs(daysUntil(curatedOn));

  return {
    destinationId,
    name,
    curatedOn,
    daysSinceCuration: daysSince,
    isStale: daysSince > STALENESS_THRESHOLD_DAYS,
  };
}

/**
 * Filter destinations for curation review (only stale ones).
 */
export function filterStale(destinations: StaleDestination[]): StaleDestination[] {
  return destinations.filter((d) => d.isStale).sort((a, b) => b.daysSinceCuration - a.daysSinceCuration);
}
