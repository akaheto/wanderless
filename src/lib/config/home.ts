/**
 * Centralized home base configuration.
 *
 * This is the single source of truth for where the traveller is located. Changing
 * home base requires updating three separate systems:
 *   1. Departure airports and preference order (affects route scoring)
 *   2. Climate baseline (affects "Compared with home" context)
 *   3. Airline table (affects what carriers are reachable)
 *
 * Making this explicit means the cost of a second home base is visible: one new
 * climate reference record and one new 27×N route table are required. Without
 * this seam, that work would be discovered halfway through a refactor.
 */

import type { Origin } from "@/lib/domain/types";

export interface AirportInfo {
  code: Origin;
  name: string;
  /** Shown where the trade-off matters, e.g. LaGuardia's perimeter rule. */
  note?: string;
}

export interface HomeBase {
  id: string;
  /** How the traveller refers to home, e.g. "New York". */
  name: string;
  /** Airports in order of preference. The first is the default baseline. */
  airports: AirportInfo[];
  /** Climate record id used for the "compared with home" context. */
  climateReferenceId: string;
  lat: number;
  lon: number;
  timezone: string;
}

/**
 * The single, fixed home base configuration. Everything else derives from this.
 *
 * Order matters: airports[0] is the baseline for anything needing a single origin.
 */
export const HOME: HomeBase = {
  id: "nyc",
  name: "New York",
  airports: [
    { code: "JFK", name: "JFK — Kennedy" },
    {
      code: "LGA",
      name: "LGA — LaGuardia",
      note: "A 1,500-mile perimeter rule and no long-haul international service — every route in the catalog connects.",
    },
    { code: "EWR", name: "EWR — Newark", note: "United hub. Reaches Cape Town and Marrakech nonstop; JFK does not." },
  ],
  climateReferenceId: "nyc-reference",
  lat: 40.7128,
  lon: -74.006,
  timezone: "America/New_York",
};

/** The preferred airport — the baseline for anything that needs a single origin. */
export const BASELINE_ORIGIN: Origin = HOME.airports[0].code;

/** All home airports in preference order. Used as a default when none are specified. */
export const HOME_AIRPORTS: Origin[] = HOME.airports.map((a) => a.code);

export function airportInfo(code: Origin): AirportInfo | undefined {
  return HOME.airports.find((a) => a.code === code);
}

export function airportNote(code: Origin): string | undefined {
  return airportInfo(code)?.note;
}
