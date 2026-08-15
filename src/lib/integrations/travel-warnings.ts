/**
 * Travel advisories, sourced live from the US State Department.
 *
 * This module previously shipped a hand-maintained table of 10 countries stamped
 * `lastUpdated: '2024-08-10'`. It now reads the published feed, which covers all 214
 * countries the State Department rates. See `state-dept-feed.ts` for the parser and
 * `scripts/verify-advisory-coverage.ts` for the guard that keeps the catalog joined
 * to it.
 *
 * Advisories are country-scoped. The old table was keyed by city, which is why only
 * ten destinations ever resolved.
 */

import "server-only";

import {
  ADVISORY_SOURCE,
  countryKey,
  fetchAdvisoryIndex,
  normalizeCountry,
  type AdvisoryLevel,
} from "./state-dept-feed";

export type TravelWarningLevel = "level1" | "level2" | "level3" | "level4";

export interface CityTravelAdvisory {
  /** Country as the State Department names it, which may differ from the catalog's. */
  country: string;
  advisoryLevel: TravelWarningLevel;
  /** The clause the State Department attaches to the level. */
  advisoryTitle: string;
  /** Opening of the advisory body, tags stripped. */
  summary: string;
  /**
   * The date the State Department last revised *this* advisory — not the date we
   * fetched it (spec §3.6.1).
   *
   * These legitimately run old: a country whose advisory has not been revised in two
   * years is a stable one, and that is meaningful rather than a data failure. Showing
   * a fetch date here would misrepresent a 2024 position as a fresh one.
   */
  sourceRevisedOn: string;
  sourceUrl: string;
  sourceName: string;
}

/**
 * Either an advisory, or a stated reason there isn't one.
 *
 * Deliberately not `CityTravelAdvisory | undefined`. An absent advisory section reads
 * to a traveller as "no problems here", so the failure has to be representable and
 * rendered, not silently dropped.
 */
export type AdvisoryResult =
  | { status: "ok"; advisory: CityTravelAdvisory; asOf: string }
  | { status: "unavailable"; reason: string; asOf: string };

const LEVEL_KEY: Record<AdvisoryLevel, TravelWarningLevel> = {
  1: "level1",
  2: "level2",
  3: "level3",
  4: "level4",
};

/**
 * Look up the advisory governing a destination's country.
 *
 * @param country Catalog country name; aliased onto the feed's naming internally.
 */
export async function getTravelAdvisory(country: string): Promise<AdvisoryResult> {
  // Read the clock here rather than in the component: this is a plain async function,
  // where doing so is legitimate, and it gives the UI a pinned `asOf` to measure
  // advisory age against without calling an impure function during render.
  const asOf = new Date().toISOString().slice(0, 10);

  const index = await fetchAdvisoryIndex();
  if (!index.ok) {
    return { status: "unavailable", reason: index.reason, asOf };
  }

  const normalized = normalizeCountry(country);
  const hit = index.value.get(countryKey(normalized));

  if (!hit) {
    // A name the feed does not publish. Surfaced rather than swallowed so it gets
    // fixed in COUNTRY_ALIASES — run scripts/verify-advisory-coverage.ts.
    return {
      status: "unavailable",
      reason: `No published State Department advisory matches "${country}"`,
      asOf,
    };
  }

  return {
    status: "ok",
    asOf,
    advisory: {
      country: hit.country,
      advisoryLevel: LEVEL_KEY[hit.level],
      advisoryTitle: hit.headline,
      summary: hit.summary,
      sourceRevisedOn: hit.publishedOn,
      sourceUrl: hit.url,
      sourceName: ADVISORY_SOURCE,
    },
  };
}

/**
 * Advisory level as a themed colour set.
 *
 * Colour never carries the level on its own — every caller pairs this with the label
 * below.
 */
export function getAdvisoryColor(level: TravelWarningLevel): string {
  switch (level) {
    case "level1":
      return "bg-good/20 border-good text-good";
    case "level2":
      return "bg-warning/20 border-warning text-warning";
    case "level3":
      return "bg-serious/20 border-serious text-serious";
    case "level4":
      return "bg-critical/20 border-critical text-critical";
  }
}

export function getAdvisoryLabel(level: TravelWarningLevel): string {
  switch (level) {
    case "level1":
      return "Normal Precautions";
    case "level2":
      return "Increased Caution";
    case "level3":
      return "Reconsider Travel";
    case "level4":
      return "Do Not Travel";
  }
}
