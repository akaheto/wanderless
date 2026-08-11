import type {
  DataWarning,
  Freshness,
  Itinerary,
  Place,
  PlaceCategory,
  PlacePriority,
} from "@/lib/domain/types";
import { daysUntil } from "@/lib/dates";

/*
 * Places.
 *
 * A saved place is only worth having if you know where it came from and when it was last
 * checked. Everything here follows from that: staleness is the product, the place record
 * is just what carries it.
 */

/**
 * How long a category's facts stay true, in days.
 *
 * These differ because things decay at different rates. A restaurant closes, changes hands
 * or moves; a beach does not. Treating them the same means either nagging about beaches or
 * trusting two-year-old restaurant hours, and the second one gets you a locked door.
 */
const FRESHNESS_DAYS: Record<PlaceCategory, { fresh: number; aging: number }> = {
  restaurant: { fresh: 180, aging: 550 },
  bar: { fresh: 180, aging: 550 },
  cafe: { fresh: 180, aging: 550 },
  shop: { fresh: 365, aging: 730 },
  market: { fresh: 365, aging: 730 },
  museum: { fresh: 550, aging: 1095 },
  sight: { fresh: 550, aging: 1095 },
  activity: { fresh: 550, aging: 1095 },
  beach: { fresh: 1095, aging: 1825 },
  viewpoint: { fresh: 1095, aging: 1825 },
  neighborhood: { fresh: 1095, aging: 1825 },
  other: { fresh: 365, aging: 730 },
};

/**
 * Computed at read time, never stored — a stored staleness would itself go stale.
 *
 * `unverified` is deliberately distinct from `stale`. Stale means someone checked once and
 * it was a while ago; unverified means nobody ever checked. The second is worse and the UI
 * needs to be able to say so.
 */
export function freshnessOf(place: Place, asOf?: string): Freshness {
  if (place.verifiedOn === null) return "unverified";

  const ageDays = -daysUntil(place.verifiedOn, asOf);
  if (ageDays < 0) return "fresh"; // Verified "in the future" — clock skew, not a problem.

  const thresholds = FRESHNESS_DAYS[place.category] ?? FRESHNESS_DAYS.other;
  if (ageDays <= thresholds.fresh) return "fresh";
  if (ageDays <= thresholds.aging) return "aging";
  return "stale";
}

export function ageInDays(place: Place, asOf?: string): number | null {
  if (place.verifiedOn === null) return null;
  return Math.max(0, -daysUntil(place.verifiedOn, asOf));
}

export const FRESHNESS_LABELS: Record<Freshness, string> = {
  fresh: "recently checked",
  aging: "worth re-checking",
  stale: "out of date",
  unverified: "never verified",
};

/** Human-readable age, for showing next to the freshness badge. */
export function describeAge(place: Place, asOf?: string): string {
  const days = ageInDays(place, asOf);
  if (days === null) return "never verified";
  if (days === 0) return "checked today";
  if (days === 1) return "checked yesterday";
  if (days < 31) return `checked ${days} days ago`;
  if (days < 365) return `checked ${Math.round(days / 30)} months ago`;
  const years = days / 365;
  return years < 1.5 ? "checked about a year ago" : `checked ${Math.round(years)} years ago`;
}

/**
 * Places grouped under the stops they fall in.
 *
 * Stop membership is derived from the destination rather than stored (spec: places.md). A
 * stored stop id could disagree with the place's destination, and would break when a stop
 * is reordered or removed — the same class of problem ADR 0010 designed out of dates.
 */
export interface PlacesByStop {
  /** Index into the itinerary's stops. */
  stopIndex: number;
  destinationId: string;
  destinationName: string;
  arriveDate: string;
  departDate: string;
  places: Place[];
}

export function groupPlacesByStop(
  places: Place[],
  itinerary: Itinerary | null,
): { grouped: PlacesByStop[]; unplaced: Place[] } {
  if (itinerary === null || itinerary.stops.length === 0) {
    return { grouped: [], unplaced: [...places] };
  }

  const grouped: PlacesByStop[] = itinerary.stops.map((stop, stopIndex) => ({
    stopIndex,
    destinationId: stop.destination.id,
    destinationName: stop.destination.name,
    arriveDate: stop.arriveDate,
    departDate: stop.departDate,
    places: [],
  }));

  const byDestination = new Map<string, PlacesByStop[]>();
  for (const group of grouped) {
    const existing = byDestination.get(group.destinationId) ?? [];
    existing.push(group);
    byDestination.set(group.destinationId, existing);
  }

  const unplaced: Place[] = [];
  for (const place of places) {
    // A destination visited twice gets its places on the first stop rather than duplicated
    // — showing the same restaurant under two stops would imply two bookings.
    const groups = byDestination.get(place.destinationId);
    if (groups && groups.length > 0) {
      groups[0].places.push(place);
    } else {
      unplaced.push(place);
    }
  }

  for (const group of grouped) {
    group.places.sort(comparePlaces);
  }

  return { grouped, unplaced: unplaced.sort(comparePlaces) };
}

const PRIORITY_ORDER: Record<PlacePriority, number> = {
  must: 0,
  considering: 1,
  if_time: 2,
  ruled_out: 3,
};

/** Must-dos first, ruled-out last, alphabetical within a band. */
export function comparePlaces(a: Place, b: Place): number {
  const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  return byPriority !== 0 ? byPriority : a.name.localeCompare(b.name);
}

/**
 * What is wrong with this set of places, stated rather than implied.
 *
 * `tripStartDate` sharpens the language: a stale place on a trip three weeks out is worth
 * acting on, the same place on a trip next year is not yet urgent.
 */
export function placeWarnings(
  places: Place[],
  options: { tripStartDate?: string | null; asOf?: string } = {},
): DataWarning[] {
  const warnings: DataWarning[] = [];
  const live = places.filter((p) => p.priority !== "ruled_out");
  if (live.length === 0) return warnings;

  const stale = live.filter((p) => freshnessOf(p, options.asOf) === "stale");
  const unverified = live.filter((p) => freshnessOf(p, options.asOf) === "unverified");
  const aging = live.filter((p) => freshnessOf(p, options.asOf) === "aging");

  const daysToTrip =
    options.tripStartDate != null ? daysUntil(options.tripStartDate, options.asOf) : null;
  const imminent = daysToTrip !== null && daysToTrip >= 0 && daysToTrip <= 45;

  if (unverified.length > 0) {
    warnings.push({
      label: `${unverified.length} place${unverified.length === 1 ? " has" : "s have"} never been verified`,
      detail: `${unverified[0].name}${
        unverified.length > 1 ? ` and ${unverified.length - 1} other${unverified.length > 2 ? "s" : ""}` : ""
      } — nothing has been checked, so treat the details as unconfirmed.`,
      severity: imminent ? "serious" : "warning",
    });
  }

  if (stale.length > 0) {
    warnings.push({
      label: `${stale.length} place${stale.length === 1 ? " is" : "s are"} out of date`,
      detail: imminent
        ? `Departure is in ${daysToTrip} days — worth re-checking ${stale[0].name} before relying on it.`
        : `${stale[0].name} was last checked ${describeAge(stale[0], options.asOf)}.`,
      severity: imminent ? "serious" : "warning",
    });
  }

  if (aging.length > 0 && stale.length === 0) {
    warnings.push({
      label: `${aging.length} place${aging.length === 1 ? "" : "s"} worth re-checking`,
      detail: "Still probably fine, but old enough that hours and prices may have moved.",
      severity: "info",
    });
  }

  const noSource = live.filter((p) => p.sourceId === null);
  if (noSource.length > 0) {
    warnings.push({
      label: `${noSource.length} place${noSource.length === 1 ? " has" : "s have"} no recorded source`,
      detail: "You will not be able to tell later where the recommendation came from.",
      severity: "info",
    });
  }

  return warnings;
}

/** Counts for a summary tile. Ruled-out places are excluded from the live count. */
export function summarisePlaces(places: Place[], asOf?: string) {
  const live = places.filter((p) => p.priority !== "ruled_out");
  const counts: Record<Freshness, number> = { fresh: 0, aging: 0, stale: 0, unverified: 0 };
  for (const place of live) counts[freshnessOf(place, asOf)]++;

  return {
    total: live.length,
    ruledOut: places.length - live.length,
    mustDo: live.filter((p) => p.priority === "must").length,
    needsAttention: counts.stale + counts.unverified,
    counts,
  };
}
