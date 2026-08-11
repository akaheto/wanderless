import type { Alliance, Origin, OriginRoute, SelectedRoute } from "@/lib/domain/types";
import { allianceOf, airlineName } from "@/data/airlines";
import { KiwiFlightSearch } from "./kiwi";

/*
 * Live flight itineraries.
 *
 * The rule this file enforces (ADR 0016): nothing here ever reaches the scoring engine.
 * Rankings run on the curated route table so they stay free, deterministic and reproducible
 * from a URL. A searched itinerary belongs to a trip that already has a destination — it is
 * what you would book, not what ranked the destination.
 *
 * Nothing here is called during a page render. Search happens on an explicit user action and
 * the result is persisted with the moment it was retrieved.
 */

export interface FlightSegment {
  /** Marketing carrier IATA code. */
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  /** ISO 8601 local departure and arrival. */
  departsAt: string;
  arrivesAt: string;
  durationMinutes: number;
}

export interface FlightItinerary {
  id: string;
  origin: Origin;
  destinationAirport: string;
  segments: FlightSegment[];
  /** Door-to-door for the flown portion, in minutes. */
  totalMinutes: number;
  stops: number;
  /** Cheapest fare seen for this itinerary, in minor units, with its currency. */
  priceMinorUnits: number | null;
  currency: string | null;
  cabin: string;
}

/**
 * A completed search.
 *
 * `retrievedAt` is mandatory. A fare without the moment it was seen is not a fact about the
 * world, and the app must never present one as current.
 */
export interface FlightSearchResult {
  origin: Origin;
  destinationAirport: string;
  departDate: string;
  returnDate: string | null;
  itineraries: FlightItinerary[];
  retrievedAt: string;
  provider: string;
}

export interface FlightSearchQuery {
  origins: Origin[];
  destinationAirport: string;
  departDate: string;
  returnDate?: string;
  travellers: number;
  /** Restrict to these alliances, if any. */
  alliances?: Alliance[];
  /** Restrict to these airline codes, if any. */
  airlines?: string[];
}

export interface FlightSearch {
  readonly name: string;
  readonly configured: boolean;
  search(query: FlightSearchQuery): Promise<FlightSearchResult[]>;
}

/**
 * The default, and a supported configuration rather than a placeholder.
 *
 * With no provider the app ranks, plans and records trips exactly as before — it simply
 * cannot search live itineraries. Nothing errors, and no feature is gated behind a key.
 */
export class NullFlightSearch implements FlightSearch {
  readonly name = "No flight provider";
  readonly configured = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async search(query: FlightSearchQuery): Promise<FlightSearchResult[]> {
    return [];
  }
}

/**
 * Resolve the configured provider.
 *
 * Kiwi.com is the default (free-tier API, no credentials required).
 * Can be overridden with environment variables for alternative providers.
 */
export function flightSearch(): FlightSearch {
  return new KiwiFlightSearch();
}

export function searchUnavailableReason(search: FlightSearch): string | null {
  if (search.configured) return null;
  return "No flight provider is configured, so journey times come from the curated route table. Those are planning estimates — they are what ranked this destination, not a bookable itinerary.";
}

// ---------------------------------------------------------------------------
// Comparing a search against what ranked the destination
// ---------------------------------------------------------------------------

/**
 * How a real itinerary compares with the curated estimate that ranked the destination.
 *
 * Both are kept whole. Nothing here averages them or overwrites one with the other — the
 * disagreement is the useful part, and a material gap is a signal the route table needs
 * review rather than something to paper over.
 */
export interface ItineraryVsEstimate {
  itinerary: FlightItinerary;
  estimate: OriginRoute;
  /** Searched hours minus estimated hours. Positive means the real trip is longer. */
  hoursDelta: number;
  stopsDelta: number;
  /** Large enough that the curated table is probably wrong, not just imprecise. */
  contradictsEstimate: boolean;
  summary: string;
}

/** Beyond this the estimate is not merely imprecise — it is telling you the wrong thing. */
const CONTRADICTION_HOURS = 3;

export function compareWithEstimate(
  itinerary: FlightItinerary,
  selected: SelectedRoute,
): ItineraryVsEstimate {
  const estimate = selected.route;
  const searchedHours = Math.round((itinerary.totalMinutes / 60) * 2) / 2;
  const hoursDelta = Math.round((searchedHours - estimate.typicalTotalHours) * 2) / 2;
  const stopsDelta = itinerary.stops - estimate.typicalConnections;

  const contradicts =
    Math.abs(hoursDelta) >= CONTRADICTION_HOURS ||
    (itinerary.stops === 0) !== estimate.nonstop;

  return {
    itinerary,
    estimate,
    hoursDelta,
    stopsDelta,
    contradictsEstimate: contradicts,
    summary: summarise(searchedHours, estimate, hoursDelta, contradicts),
  };
}

function summarise(
  searchedHours: number,
  estimate: OriginRoute,
  hoursDelta: number,
  contradicts: boolean,
): string {
  const direction = hoursDelta > 0 ? "longer" : "shorter";

  if (!contradicts) {
    return `${searchedHours}h searched against a ${estimate.typicalTotalHours}h estimate — close enough that the ranking stands.`;
  }
  return `${searchedHours}h searched against a ${estimate.typicalTotalHours}h estimate — ${Math.abs(
    hoursDelta,
  )}h ${direction}. The route table is probably out of date for this destination; the ranking used the estimate.`;
}

/** Itineraries the traveller would actually fly, given their alliance and airline filter. */
export function filterItineraries(
  itineraries: FlightItinerary[],
  filter: { alliances?: Alliance[]; airlines?: string[] },
): FlightItinerary[] {
  const alliances = filter.alliances ?? [];
  const airlines = filter.airlines ?? [];
  if (alliances.length === 0 && airlines.length === 0) return itineraries;

  return itineraries.filter((it) =>
    it.segments.every(
      (s) => airlines.includes(s.airline) || alliances.includes(allianceOf(s.airline)),
    ),
  );
}

/** Carriers on an itinerary, named and de-duplicated, in the order flown. */
export function itineraryAirlines(itinerary: FlightItinerary): string[] {
  return [...new Set(itinerary.segments.map((s) => s.airline))].map(airlineName);
}

export function itineraryHours(itinerary: FlightItinerary): number {
  return Math.round((itinerary.totalMinutes / 60) * 2) / 2;
}

/**
 * Is a stored search still worth showing?
 *
 * Schedules are stable for weeks; fares are not. A stored search is presented as a record of
 * what was seen, with its date — never as the current price.
 */
export function searchAge(result: FlightSearchResult, now = new Date()): {
  days: number;
  fareIsStale: boolean;
  scheduleIsStale: boolean;
} {
  const days = Math.max(
    0,
    Math.floor((now.getTime() - new Date(result.retrievedAt).getTime()) / 86_400_000),
  );
  return { days, fareIsStale: days >= 3, scheduleIsStale: days >= 30 };
}
