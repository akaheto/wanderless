/**
 * The provider contract — one shape for every external source.
 *
 * Two rules, and they are the whole point:
 *
 *   A provider returns a value with provenance, or a stated reason it could not. It never
 *   returns a plausible fallback. The hotel search proved why: with no credentials it
 *   quietly substituted invented inventory that reached production and the database, and
 *   because the substitute reported itself configured, the one warning path never fired.
 *
 *   Freshness is the source's, not ours. `sourceDate` records when the publisher last
 *   revised the fact, never when we fetched it. Downloading a stale file today does not
 *   make its contents current, and stamping it with our clock launders it as fresh.
 *
 * `Fetched<T>` began life inside state-dept-feed.ts. It lives here now so every client
 * can share it rather than each inventing its own convention.
 */

/**
 * The result of reading a source.
 *
 * Deliberately not `T | null`. A null cannot say *why*, so callers cannot distinguish
 * "this country has no advisory" from "we could not reach the State Department" — and a
 * section that silently disappears reads to a user as "nothing to report here".
 */
export type Fetched<T> =
  | { ok: true; value: T; sourceDate: string }
  | { ok: false; reason: string };

export function fetched<T>(value: T, sourceDate: string): Fetched<T> {
  return { ok: true, value, sourceDate };
}

export function unavailable<T>(reason: string): Fetched<T> {
  return { ok: false, reason };
}

/**
 * How much to trust a source, independent of whether it is reachable.
 *
 *   primary       the body that produces the fact — the State Department on its own
 *                 advisories, the ECB on its own rates
 *   secondary     an aggregation or scrape of someone else's data; usable, but its
 *                 errors and staleness are inherited and not ours to fix
 *   crowdsourced  community-maintained; generally current for well-trafficked subjects
 *                 and unreliable at the margins
 */
export type SourceKind = "primary" | "secondary" | "crowdsourced";

export interface SourceSpec {
  id: string;
  /** As it should appear to a reader, not as a hostname. */
  name: string;
  url?: string;
  kind: SourceKind;
  /** Env vars required to use it. Empty means keyless. */
  requiresKey: string[];
  /**
   * Age past which this source should be re-read, in days.
   *
   * Per-source because the right answer varies by orders of magnitude: a climate normal
   * drawn from a decade of observations is fine for years, while a security advisory
   * stale by a month is not. A single global threshold would be wrong for nearly
   * everything.
   */
  staleAfterDays: number;
  note?: string;
}

/**
 * Every external source the catalog draws on.
 *
 * `npm run check:providers` probes these for reachability; this registry records what
 * they are and how long their answers stay good.
 */
export const SOURCES: readonly SourceSpec[] = [
  {
    id: "state-dept",
    name: "US Department of State",
    url: "https://travel.state.gov/_res/rss/TAsTWs.xml",
    kind: "primary",
    requiresKey: [],
    staleAfterDays: 30,
    note: "Safety data. Individual advisories legitimately run years old — that is the department's current position, not our staleness.",
  },
  {
    id: "cdc",
    name: "US CDC",
    url: "https://wwwnc.cdc.gov/travel/rss/notices.xml",
    kind: "primary",
    requiresKey: [],
    staleAfterDays: 30,
  },
  {
    id: "open-meteo-archive",
    name: "Open-Meteo ERA5 archive",
    url: "https://open-meteo.com/en/docs/historical-weather-api",
    kind: "primary",
    requiresKey: [],
    staleAfterDays: 1825,
    note: "Ten-year normals. Stable for years by construction.",
  },
  {
    id: "open-meteo-marine",
    name: "Open-Meteo marine archive",
    kind: "primary",
    requiresKey: [],
    staleAfterDays: 1825,
  },
  {
    id: "nager-date",
    name: "Nager.Date",
    url: "https://date.nager.at",
    kind: "secondary",
    requiresKey: [],
    staleAfterDays: 365,
    note: "Community project. Next year's holidays appear late in the prior year.",
  },
  {
    id: "frankfurter",
    name: "ECB via Frankfurter",
    url: "https://api.frankfurter.app",
    kind: "primary",
    requiresKey: [],
    staleAfterDays: 7,
  },
  {
    id: "nominatim",
    name: "OpenStreetMap Nominatim",
    kind: "crowdsourced",
    requiresKey: [],
    staleAfterDays: 365,
  },
  {
    id: "ourairports",
    name: "OurAirports",
    url: "https://davidmegginson.github.io/ourairports-data/",
    kind: "crowdsourced",
    requiresKey: [],
    staleAfterDays: 365,
  },
  {
    id: "wikipedia-airports",
    name: "Wikipedia airport route tables",
    kind: "crowdsourced",
    requiresKey: [],
    staleAfterDays: 180,
    note: "Airline networks change seasonally. Community-maintained, not an airline source.",
  },
  {
    id: "yelp",
    name: "Yelp Fusion",
    kind: "secondary",
    requiresKey: ["YELP_API_KEY"],
    staleAfterDays: 90,
  },
  {
    id: "ticketmaster",
    name: "Ticketmaster Discovery",
    kind: "secondary",
    requiresKey: ["TICKETMASTER_API_KEY"],
    staleAfterDays: 30,
  },
  {
    id: "rapidapi-booking",
    name: "Booking.com via RapidAPI",
    kind: "secondary",
    requiresKey: ["RAPIDAPI_KEY", "RAPIDAPI_HOST"],
    staleAfterDays: 7,
    note: "Nightly rates move constantly. A stored search is a record of what was seen, never a current price.",
  },
] as const;

const BY_ID = new Map(SOURCES.map((s) => [s.id, s]));

export function sourceSpec(id: string): SourceSpec | undefined {
  return BY_ID.get(id);
}

/** Whether a source has the credentials it needs. Keyless sources are always configured. */
export function isConfigured(
  spec: SourceSpec,
  env: Record<string, string | undefined> = process.env,
): boolean {
  return spec.requiresKey.every((k) => Boolean(env[k]));
}

/**
 * Whether an answer from this source has aged past its threshold.
 *
 * Takes the clock rather than reading it, so callers — tests above all — can pin it.
 * The same reason `checkStaleness` takes an `asOf`.
 */
export function isStale(spec: SourceSpec, sourceDate: string, asOf: string): boolean {
  const then = Date.parse(sourceDate);
  const now = Date.parse(asOf);
  if (Number.isNaN(then) || Number.isNaN(now)) return true;
  return (now - then) / 86_400_000 > spec.staleAfterDays;
}
