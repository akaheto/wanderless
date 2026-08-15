import { describe, expect, it } from "vitest";
import { DESTINATIONS } from "@/data/destinations";
import { CLIMATE_RECORDS, NYC_REFERENCE_ID } from "@/data/generated/climate-index";
import { ROUTES } from "@/data/routes";
import BASELINE from "@/data/generated/advisories.json";
import { countryKey, normalizeCountry } from "@/lib/integrations/state-dept-feed";

/**
 * Catalog integrity — the guard that lets destinations be added safely.
 *
 * A `Destination` is not self-contained. It is the hub of several reference datasets
 * (climate, routes, advisories, holidays), each generated or maintained separately, and
 * adding a destination means adding a row to every one of them. Nothing enforced that,
 * so the catalog drifted: 26 of 46 destinations silently score off fallback travel data,
 * and a deleted destination left dangling references that only surfaced as a runtime
 * crash inside an unrelated module.
 *
 * These assertions run in CI so that drift fails at commit time rather than being
 * discovered later from a stack trace.
 *
 * The datasets fail inconsistently today, and that is the deeper issue this guards:
 * `climateFor` throws with instructions when data is missing, while `routesFor` returns
 * undefined and lets `selectRoute` quietly substitute hand-written figures. Loud is
 * correct. These tests hold every dataset to the loud standard regardless of how its
 * own lookup behaves.
 */

// ---------------------------------------------------------------------------
// Quarantine
// ---------------------------------------------------------------------------

/**
 * Pre-existing gaps, enumerated so they cannot grow.
 *
 * This exists only to introduce these invariants against a catalog that already breaks
 * them. Two rules keep it from becoming a permanent excuse:
 *
 *   1. It may only ever shrink. A newly added destination must never be listed here —
 *      that is the entire point.
 *   2. It is self-cleaning: an entry that no longer needs quarantine fails the suite,
 *      so fixing a gap forces its removal rather than leaving the list to rot.
 *
 * Tracked as Phase 1c in docs/technical/specs/destination-data-contract.md §3.7.4.
 */
const MISSING_ROUTES = new Set([
  "paris", "london", "barcelona", "amsterdam", "madrid", "istanbul", "prague",
  "vienna", "berlin", "florence", "venice", "athens", "budapest", "copenhagen",
  "milan", "dublin", "edinburgh", "munich", "brussels", "porto", "krakow",
  "dubrovnik", "nice", "naples", "salzburg", "reykjavik",
]);

/**
 * Countries with no advisory in the committed baseline.
 *
 * Austria resolved from the feed on 2026-08-15 and then vanished from 16 consecutive
 * reads. Its country page sits behind Cloudflare, so withdrawal could not be confirmed,
 * and it is deliberately not resurrected — see the spec. Destinations in Austria render
 * the "advisory unavailable" card, which is the honest outcome.
 */
const MISSING_ADVISORY_COUNTRIES = new Set(["Austria"]);

const advisoryKeys = new Set(
  (BASELINE.advisories as { country: string }[]).map((a) => countryKey(a.country)),
);

const ids = DESTINATIONS.map((d) => d.id);

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------

describe("catalog shape", () => {
  it("has no null or undefined entries", () => {
    expect(DESTINATIONS.every(Boolean)).toBe(true);
  });

  it("gives every destination a unique id", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses slug-shaped ids", () => {
    // Ids appear in URLs and as reference-data filenames, so anything else breaks a
    // lookup somewhere downstream rather than here.
    for (const id of ids) expect(id, id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("gives every destination a non-empty country", () => {
    for (const d of DESTINATIONS) expect(d.country.trim(), d.id).not.toBe("");
  });
});

// ---------------------------------------------------------------------------
// Reference data — every destination, every dataset
// ---------------------------------------------------------------------------

describe("climate coverage", () => {
  it("has a climate record for every destination", () => {
    const missing = ids.filter((id) => !(id in CLIMATE_RECORDS));
    expect(missing, `run \`npm run build:data\` for: ${missing.join(", ")}`).toEqual([]);
  });

  it("has no climate records for destinations that no longer exist", () => {
    // The failure that took cape-town three modules deep before anyone noticed.
    //
    // NYC is a legitimate non-destination record: it is the home baseline every
    // destination's climate is compared against. Excluded via the exported constant
    // rather than a literal, so renaming the reference does not silently re-open
    // this check.
    const orphans = Object.keys(CLIMATE_RECORDS).filter(
      (id) => id !== NYC_REFERENCE_ID && !ids.includes(id),
    );
    expect(orphans, `orphaned climate data: ${orphans.join(", ")}`).toEqual([]);
  });
});

describe("route coverage", () => {
  it("has a route entry for every destination outside the quarantine", () => {
    const missing = ids.filter((id) => !(id in ROUTES) && !MISSING_ROUTES.has(id));
    expect(
      missing,
      `No route entry, and not a known gap: ${missing.join(", ")}. ` +
        `A destination without routes silently scores travel from its hand-written ` +
        `\`travel\` figures instead of the route table.`,
    ).toEqual([]);
  });

  it("keeps the quarantine free of entries that are already fixed", () => {
    const fixed = [...MISSING_ROUTES].filter((id) => id in ROUTES);
    expect(
      fixed,
      `These now have routes — remove them from MISSING_ROUTES: ${fixed.join(", ")}`,
    ).toEqual([]);
  });

  it("keeps the quarantine free of destinations that no longer exist", () => {
    const stale = [...MISSING_ROUTES].filter((id) => !ids.includes(id));
    expect(stale, `no longer in the catalog: ${stale.join(", ")}`).toEqual([]);
  });

  it("does not let the quarantine grow", () => {
    // Ratchet. Lower this number as routes land; never raise it.
    expect(MISSING_ROUTES.size).toBeLessThanOrEqual(26);
  });
});

/**
 * Destinations still awaiting a confirmed arrival airport.
 *
 * Same ratchet as MISSING_ROUTES: may only shrink, and self-cleans.
 *
 * Auto-derivation was tried and rejected. Nearest-airport scored 14/20 against the
 * known-correct values across three heuristics, and six of the original 26 would have
 * been wrong on distance alone — Paris resolving to Le Bourget, a private-aviation
 * field; London to City; Reykjavík to the domestic terminal. The other 45 were instead
 * confirmed against the JFK and Newark destination tables on 2026-08-15: an airport New
 * York actually flies to is the gateway, and that is evidence rather than inference.
 */
const MISSING_AIRPORT = new Set([
  // Florence alone. Neither Florence nor Pisa receives a nonstop from JFK or Newark, so
  // "whichever the US flies to" cannot decide it — the choice is between the city's own
  // small airport and the larger regional one an hour away, which is a traveller
  // judgement rather than a fact about route networks.
  "florence",
]);

describe("arrival airports", () => {
  it("gives every destination outside the quarantine an arrival airport", () => {
    const missing = DESTINATIONS.filter(
      (d) => !d.arrivalAirport && !MISSING_AIRPORT.has(d.id),
    ).map((d) => d.id);
    expect(
      missing,
      `No arrivalAirport, and not a known gap: ${missing.join(", ")}. Without it no ` +
        `route source can be joined to this destination automatically.`,
    ).toEqual([]);
  });

  it("uses well-formed IATA codes", () => {
    for (const d of DESTINATIONS) {
      if (!d.arrivalAirport) continue;
      expect(d.arrivalAirport, d.id).toMatch(/^[A-Z]{3}$/);
    }
  });

  it("keeps the quarantine free of destinations that now have one", () => {
    const fixed = [...MISSING_AIRPORT].filter(
      (id) => DESTINATIONS.find((d) => d.id === id)?.arrivalAirport,
    );
    expect(
      fixed,
      `These have an airport now — remove from MISSING_AIRPORT: ${fixed.join(", ")}`,
    ).toEqual([]);
  });

  it("does not let the quarantine grow", () => {
    // Ratchet. Lower as airports are confirmed; never raise.
    expect(MISSING_AIRPORT.size).toBeLessThanOrEqual(1);
  });
});

describe("advisory coverage", () => {
  it("resolves every destination's country to a published advisory", () => {
    const unresolved = [
      ...new Set(
        DESTINATIONS.filter(
          (d) => !advisoryKeys.has(countryKey(normalizeCountry(d.country))),
        ).map((d) => d.country),
      ),
    ].filter((c) => !MISSING_ADVISORY_COUNTRIES.has(c));

    expect(
      unresolved,
      `No advisory resolves for: ${unresolved.join(", ")}. Add the mapping to ` +
        `COUNTRY_ALIASES in state-dept-feed.ts — a missing advisory section reads to a ` +
        `traveller as an all-clear.`,
    ).toEqual([]);
  });

  it("keeps the advisory quarantine free of countries that now resolve", () => {
    const fixed = [...MISSING_ADVISORY_COUNTRIES].filter((c) =>
      advisoryKeys.has(countryKey(normalizeCountry(c))),
    );
    expect(
      fixed,
      `These resolve now — remove from MISSING_ADVISORY_COUNTRIES: ${fixed.join(", ")}`,
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

describe("curation dates", () => {
  it("gives every destination a parseable curatedOn", () => {
    for (const d of DESTINATIONS) {
      expect(Number.isNaN(Date.parse(d.curatedOn)), `${d.id}: "${d.curatedOn}"`).toBe(
        false,
      );
    }
  });

  it("never dates a curation in the future", () => {
    // A single hand-edited global constant can drift past the clock, and did — it was
    // set to 2026-08-13 while a pinned test asserted against 2026-08-12, marking all 46
    // destinations invalid. A per-destination date written at publish cannot do this.
    const today = new Date().toISOString().slice(0, 10);
    const future = DESTINATIONS.filter((d) => d.curatedOn > today).map(
      (d) => `${d.id}=${d.curatedOn}`,
    );
    expect(future, `curated in the future: ${future.join(", ")}`).toEqual([]);
  });
});
