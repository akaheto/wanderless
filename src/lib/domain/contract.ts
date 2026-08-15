/**
 * The destination data contract — §2 of docs/technical/specs/destination-data-contract.md,
 * made executable.
 *
 * Every field a `Destination` carries is declared here with where it comes from and what
 * happens when it is absent. Two things follow, and both are the point:
 *
 *   The completeness gate is *generated* from this table rather than hand-written, so a
 *   field's declared tier and its enforcement cannot drift apart.
 *
 *   A field added to `Destination` without an entry here fails the suite. Provenance
 *   becomes a thing you must declare to ship, not a thing you can forget.
 *
 * The distinction the contract exists to preserve: roughly twenty of a destination's
 * fields are editorial judgement and nine are sourced, and until now the app rendered
 * both identically. No API publishes `nightlife: 4.5`. Asking a model for one produces a
 * plausible number that feeds the ranking engine with nothing visibly wrong — which is
 * worse than an obvious gap, because nobody goes looking.
 */

import type { Destination } from "./types";

/**
 * Where a value comes from.
 *
 *   objective   a named external source, stored with the date that source published it
 *   derived     computed from objective data by a deterministic, testable rule
 *   editorial   human judgement; no source publishes it and none can be invented
 *   human       a figure a person looked up and entered, e.g. a nightly rate
 */
export type FieldTier = "objective" | "derived" | "editorial" | "human";

/** What absence means. `block` cannot publish; `flag` publishes once confirmed. */
export type OnMissing = "block" | "flag";

export interface FieldContract {
  /** Dotted path into a Destination, e.g. "lodging.fourStarUSD". */
  path: string;
  tier: FieldTier;
  /** Named source for objective/derived fields; the rule or rubric otherwise. */
  source: string;
  onMissing: OnMissing;
  note?: string;
}

/**
 * The contract. Order follows the shape of `Destination` so the two can be read together.
 */
export const DESTINATION_CONTRACT: readonly FieldContract[] = [
  // --- Identity and place -------------------------------------------------
  { path: "id", tier: "derived", source: "slug of name", onMissing: "block" },
  { path: "name", tier: "objective", source: "Nominatim", onMissing: "block" },
  { path: "country", tier: "objective", source: "Nominatim", onMissing: "block" },
  { path: "lat", tier: "objective", source: "Nominatim", onMissing: "block" },
  { path: "lon", tier: "objective", source: "Nominatim", onMissing: "block" },
  { path: "timezone", tier: "derived", source: "tz lookup from lat/lon", onMissing: "block" },
  { path: "region", tier: "derived", source: "country → region table", onMissing: "block" },
  {
    path: "coastal",
    tier: "derived",
    source: "Open-Meteo marine coverage",
    onMissing: "block",
  },
  {
    path: "arrivalAirport",
    tier: "editorial",
    source: "confirmed against departure airport route tables",
    onMissing: "block",
    note: "Not derivable — nearest-airport scored 14/20 against known-good values.",
  },
  { path: "area", tier: "editorial", source: "editorial", onMissing: "flag" },
  { path: "archetype", tier: "editorial", source: "editorial", onMissing: "flag" },
  { path: "tourismTier", tier: "editorial", source: "editorial", onMissing: "flag" },
  { path: "summary", tier: "editorial", source: "editorial prose", onMissing: "flag" },

  // --- Travel --------------------------------------------------------------
  {
    path: "travel.nonstop",
    tier: "objective",
    source: "published airport destination tables",
    onMissing: "block",
  },
  {
    path: "travel.typicalConnections",
    tier: "objective",
    source: "published airport destination tables",
    onMissing: "block",
  },
  {
    path: "travel.typicalTotalHours",
    tier: "derived",
    source: "great-circle distance, band resolution",
    onMissing: "block",
    note: "Only the band is defensible; the figure itself belongs to an itinerary.",
  },
  { path: "travel.arrivalEase", tier: "editorial", source: "editorial", onMissing: "flag" },
  { path: "travel.notes", tier: "editorial", source: "editorial prose", onMissing: "flag" },

  // --- Lodging -------------------------------------------------------------
  {
    path: "lodging.fourStarUSD",
    tier: "human",
    source: "admin, via generated Booking.com search",
    onMissing: "block",
    note: "No free API returns trustworthy nightly rates; a mock once invented these.",
  },
  {
    path: "lodging.fiveStarUSD",
    tier: "human",
    source: "admin, via generated Booking.com search",
    onMissing: "block",
  },
  {
    path: "lodging.peakMultiplier",
    tier: "derived",
    source: "seasons + sampled rates",
    onMissing: "block",
  },
  {
    path: "lodging.lowMultiplier",
    tier: "derived",
    source: "seasons + sampled rates",
    onMissing: "block",
  },
  {
    path: "lodging.bookingSearchUrl",
    tier: "derived",
    source: "template + shoulder-season dates",
    onMissing: "flag",
  },

  // --- Experience: seven judgements, no publisher ---------------------------
  ...(
    ["food", "culture", "beaches", "nightlife", "dayTrips", "nature", "shopping"] as const
  ).map(
    (k): FieldContract => ({
      path: `experience.${k}`,
      tier: "editorial",
      source: "editorial rubric, 0-5",
      onMissing: "flag",
    }),
  ),

  // --- Practicality ---------------------------------------------------------
  {
    path: "practicality.localTransport",
    tier: "editorial",
    source: "editorial rubric, 0-5",
    onMissing: "flag",
  },
  {
    path: "practicality.languageEase",
    tier: "editorial",
    source: "editorial rubric, 0-5",
    onMissing: "flag",
    note: "No proxy. EF EPI was considered and rejected — self-selected sample.",
  },
  {
    path: "practicality.safetyEase",
    tier: "editorial",
    source: "editorial rubric, evidence: State Dept advisory level",
    onMissing: "flag",
  },
  {
    path: "practicality.entryEase",
    tier: "editorial",
    source: "editorial rubric, evidence: visa dataset",
    onMissing: "flag",
  },
  {
    path: "practicality.tripSimplicity",
    tier: "editorial",
    source: "editorial rubric, 0-5",
    onMissing: "flag",
  },

  // --- Calendar -------------------------------------------------------------
  {
    path: "seasons",
    tier: "editorial",
    source: "editorial, informed by climate and holidays",
    onMissing: "block",
  },
  {
    path: "suitability",
    tier: "editorial",
    source: "editorial, 12 monthly ratings",
    onMissing: "block",
    note: "A scoring output in shape, but hand-entered in fact. Deriving it is Phase 2.",
  },
  { path: "monthNotes", tier: "editorial", source: "editorial prose", onMissing: "flag" },
  {
    path: "risks",
    tier: "editorial",
    source: "editorial, evidence: climate and advisories",
    onMissing: "flag",
  },

  // --- Provenance -----------------------------------------------------------
  {
    path: "curatedOn",
    tier: "derived",
    source: "timestamp at publish",
    onMissing: "block",
    note: "Per destination, written when a human confirmed that record.",
  },
] as const;

const BY_PATH = new Map(DESTINATION_CONTRACT.map((c) => [c.path, c]));

export function contractFor(path: string): FieldContract | undefined {
  return BY_PATH.get(path);
}

/** Read a dotted path off a destination. */
export function valueAt(destination: Destination, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined,
      destination,
    );
}

/**
 * Absent means absent, not falsy.
 *
 * A score of 0 and an empty note are legitimate values; `!value` would treat both as
 * missing and block a destination for carrying an honest zero.
 */
function isAbsent(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export interface CompletenessResult {
  complete: boolean;
  /** Blocking fields with no value. A record carrying any of these cannot publish. */
  blocking: FieldContract[];
  /** Non-blocking gaps, surfaced for review. */
  flagged: FieldContract[];
}

/**
 * The gate, generated from the contract above rather than written alongside it.
 *
 * Hand-written gates drift from the contract they enforce. This one cannot: adding a
 * field to the table is what makes the gate check it.
 */
export function checkCompleteness(destination: Destination): CompletenessResult {
  const blocking: FieldContract[] = [];
  const flagged: FieldContract[] = [];

  for (const field of DESTINATION_CONTRACT) {
    if (!isAbsent(valueAt(destination, field.path))) continue;
    (field.onMissing === "block" ? blocking : flagged).push(field);
  }

  return { complete: blocking.length === 0, blocking, flagged };
}

/** Every field the contract governs, by tier — the shape of what a card is made of. */
export function tierCounts(): Record<FieldTier, number> {
  const counts: Record<FieldTier, number> = {
    objective: 0,
    derived: 0,
    editorial: 0,
    human: 0,
  };
  for (const c of DESTINATION_CONTRACT) counts[c.tier]++;
  return counts;
}

/**
 * The provenance status of a whole card section, computed from the fields it displays.
 *
 * The overlay initially hardcoded which sections were sourced, which meant two
 * declarations of the same fact — the contract, and a literal typed into the page — free
 * to disagree. Reading it from here means relabelling a field's tier updates the card,
 * and a section cannot claim to be measured while displaying editorial values.
 *
 * A section is only as sourced as its weakest field: any editorial or human input makes
 * the whole section unverified, because a reader cannot tell which number came from where.
 */
export function sectionStatus(paths: string[]): FieldTier | "mixed" {
  const tiers = new Set(
    paths.map((p) => contractFor(p)?.tier).filter((t): t is FieldTier => t !== undefined),
  );
  if (tiers.size === 0) return "editorial";
  if (tiers.size === 1) return [...tiers][0];
  if (tiers.has("editorial") || tiers.has("human")) return "editorial";
  return "mixed";
}

/** Every contract path under a prefix, e.g. "experience" → its seven scores. */
export function pathsUnder(prefix: string): string[] {
  return DESTINATION_CONTRACT.filter(
    (c) => c.path === prefix || c.path.startsWith(`${prefix}.`),
  ).map((c) => c.path);
}
