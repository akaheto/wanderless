import type {
  DataWarning,
  Destination,
  Itinerary,
  ItineraryStop,
  Trip,
  TripStop,
} from "@/lib/domain/types";
import { getDestination } from "@/data/destinations";
import { dateWindowClimate } from "@/lib/climate";
import { addDays, nightsBetween } from "@/lib/dates";
import { estimateTransfer, TRANSFER_BURDEN_LABEL } from "./transfers";

export * from "./transfers";

/**
 * Assemble an itinerary from a trip and its stops.
 *
 * Dates are derived, never stored (ADR 0010): stop n arrives on the trip start plus the
 * nights of every stop before it. Gaps and overlaps are therefore not possible — the only
 * way the itinerary can be inconsistent is for the allocated nights to differ from the
 * trip's own, which is one number against one number and is reported rather than corrected.
 */
export function buildItinerary(trip: Trip, stops: TripStop[]): Itinerary | null {
  if (trip.startDate === null || trip.endDate === null) return null;

  const tripNights = nightsBetween(trip.startDate, trip.endDate);
  const ordered = [...stops].sort((a, b) => a.position - b.position);

  const itineraryStops: ItineraryStop[] = [];
  let cursor = trip.startDate;
  let previous: Destination | null = null;
  let transferHours = 0;

  for (const stop of ordered) {
    const destination = getDestination(stop.destinationId);
    if (!destination) continue; // A stop pointing at a destination no longer in the catalog.

    const arriveDate = cursor;
    // Exactly the nights allocated, including zero. Forcing a minimum of one night made the
    // derived dates disagree with the night count for a stop the UI already flags as a
    // problem, and silently pushed every later stop a day out.
    const departDate = addDays(arriveDate, stop.nights);
    const transferIn = previous ? estimateTransfer(previous, destination) : null;
    if (transferIn) transferHours += transferIn.hours;

    itineraryStops.push({
      stop,
      destination,
      arriveDate,
      departDate,
      // The climate that matters is this stop's own — a fortnight can cross a monsoon.
      // A zero-night stop has arrive === depart, which reads as a single day rather than
      // an empty range.
      climate: dateWindowClimate(destination, arriveDate, departDate),
      transferIn,
      warnings: stopWarnings(stop, transferIn),
    });

    cursor = departDate;
    previous = destination;
  }

  const allocatedNights = ordered.reduce((total, s) => total + s.nights, 0);

  return {
    stops: itineraryStops,
    tripNights,
    allocatedNights,
    unallocatedNights: tripNights - allocatedNights,
    transferHours: Math.round(transferHours * 2) / 2,
    warnings: itineraryWarnings(tripNights, allocatedNights, itineraryStops, transferHours),
  };
}

/**
 * Is this stop worth the journey to reach it?
 *
 * The comparison is transfer hours against hours actually spent at the stop, taking a
 * waking day as 14 hours. A three-hour hop for three nights is fine; a nine-hour one for
 * a single night is a day of travel for an evening.
 */
function stopWarnings(stop: TripStop, transferIn: ReturnType<typeof estimateTransfer> | null): DataWarning[] {
  const warnings: DataWarning[] = [];

  if (stop.nights === 0) {
    warnings.push({
      label: "No nights allocated",
      detail: "This stop has nowhere to sleep. Give it nights or remove it.",
      severity: "serious",
    });
  }

  if (transferIn) {
    // A stop buys you roughly 14 waking hours a night. Flag when getting there costs more
    // than 30% of that: a 4.5h hop for one night trips it, the same hop for three does not.
    const wakingHoursHere = stop.nights * 14;
    if (stop.nights > 0 && transferIn.hours >= wakingHoursHere * 0.3) {
      warnings.push({
        label: "Transfer costs more than the stop is worth",
        detail: `${transferIn.hours}h of travel for ${stop.nights} night${
          stop.nights === 1 ? "" : "s"
        } here. Either stay longer or cut the stop.`,
        severity: "warning",
      });
    }
    if (transferIn.burden === "punishing") {
      warnings.push({
        label: "Punishing transfer",
        detail: `${transferIn.hours}h door to door. Mid-trip journeys this long tend to cost more than the stop adds.`,
        severity: "warning",
      });
    }
  }

  return warnings;
}

function itineraryWarnings(
  tripNights: number,
  allocatedNights: number,
  stops: ItineraryStop[],
  transferHours: number,
): DataWarning[] {
  const warnings: DataWarning[] = [];
  const difference = tripNights - allocatedNights;

  if (difference > 0) {
    warnings.push({
      label: `${difference} night${difference === 1 ? "" : "s"} unallocated`,
      detail: `The trip is ${tripNights} nights and the stops account for ${allocatedNights}. Dates below run short of the return date.`,
      severity: "warning",
    });
  } else if (difference < 0) {
    const over = Math.abs(difference);
    warnings.push({
      label: `${over} night${over === 1 ? "" : "s"} over`,
      detail: `The stops account for ${allocatedNights} nights but the trip is ${tripNights}. The itinerary runs past the return date.`,
      severity: "serious",
    });
  }

  // Transfer time as a share of the trip. Above a sixth of waking hours the trip is
  // substantially about moving rather than being anywhere.
  const wakingHours = tripNights * 14;
  if (stops.length > 2 && wakingHours > 0 && transferHours > wakingHours / 6) {
    warnings.push({
      label: "A lot of this trip is transit",
      detail: `${Math.round(transferHours)}h between stops across ${tripNights} nights. Consider dropping a stop.`,
      severity: "warning",
    });
  }

  if (stops.length > 0) {
    warnings.push({
      label: "Transfer times are estimates",
      detail:
        "Derived from great-circle distance plus typical airport overhead — not searched routes. Specific legs known to be wrong are corrected by hand; real flight timings arrive with Release 5.",
      severity: "info",
    });
  }

  return warnings;
}

/** One-line summary for the trip dashboard. */
export function summariseItinerary(itinerary: Itinerary): string {
  const { stops, transferHours } = itinerary;
  if (stops.length === 0) return "No stops yet";
  if (stops.length === 1) return `Single stop — ${stops[0].destination.name}`;

  const worst = stops
    .map((s) => s.transferIn)
    .filter((t): t is NonNullable<typeof t> => t !== null)
    .sort((a, b) => b.hours - a.hours)[0];

  return `${stops.length} stops · ${transferHours}h moving · worst leg ${
    worst ? TRANSFER_BURDEN_LABEL[worst.burden] : "none"
  }`;
}
