import type { Destination } from "@/lib/domain/types";
import { getDestination } from "@/data/destinations";
import { routesFor } from "@/data/routes";

/**
 * A `Destination` for route-selection tests, independent of catalog membership.
 *
 * `selectRoute` reads only two things from a destination: its `id`, to find the route
 * table entry, and its `travel.*` figures, used as a fallback when no entry exists.
 * Whether the place is currently in the marketed catalog is irrelevant to what these
 * tests assert.
 *
 * Coupling them to `getDestination(id)!` was the actual defect. When the catalog was
 * pivoted — 26 European cities in, seven long-haul destinations out — the non-null
 * assertion silenced the compiler and the removal surfaced instead as
 * `Cannot read properties of undefined (reading 'id')` deep inside `dateWindowClimate`
 * and `selectRoute`, three modules from the cause. Twelve tests failed for a reason
 * having nothing to do with routing.
 *
 * Prefers the real catalog entry when there is one, so tests keep exercising real data
 * wherever it exists, and synthesises a minimal stand-in when the route table has an
 * entry the catalog no longer carries.
 *
 * Tests needing *climate* cannot use this: climate records are generated only for
 * catalog destinations, so those must name a destination that actually exists.
 */
/**
 * A catalog destination, or a clear failure naming what is missing.
 *
 * The replacement for `getDestination(id)!` in tests that need real generated data —
 * climate above all, which exists only for catalog destinations.
 *
 * The non-null assertion is what made the catalog pivot so expensive to diagnose: it
 * satisfies the compiler, so removing a destination produced no build error and instead
 * threw `Cannot read properties of undefined (reading 'id')` from inside whichever module
 * happened to dereference it first. This says which id vanished, at the point of use.
 */
export function catalogDestination(id: string): Destination {
  const d = getDestination(id);
  if (!d) {
    throw new Error(
      `catalogDestination("${id}"): no such destination. It was probably removed from ` +
        `the catalog — update this test to name one that exists, rather than asserting ` +
        `the lookup away with "!".`,
    );
  }
  return d;
}

export function routeTestDestination(id: string): Destination {
  const real = getDestination(id);
  if (real) return real;

  const table = routesFor(id);
  if (!table) {
    throw new Error(
      `routeTestDestination("${id}"): not in the catalog and not in the route table. ` +
        `Nothing can be built for it — pick an id that exists in one of them.`,
    );
  }

  // Travel figures come from the route table's JFK entry so the fallback path stays
  // consistent with what the table would report, rather than inventing numbers.
  const jfk = table.byOrigin.JFK;

  return {
    id,
    name: id,
    area: id,
    country: "Test",
    region: "Test",
    lat: 0,
    lon: 0,
    timezone: "UTC",
    coastal: false,
    archetype: "city",
    tourismTier: 1,
    summary: `Route-table stand-in for ${id}.`,
    travel: {
      nonstop: jfk?.nonstop ?? false,
      typicalTotalHours: jfk?.typicalTotalHours ?? 12,
      typicalConnections: jfk?.nonstop ? 0 : 1,
      arrivalEase: 3,
      notes: "",
    },
    lodging: {
      fourStarUSD: 150,
      fiveStarUSD: 300,
      peakMultiplier: 1.2,
      lowMultiplier: 0.9,
    },
    experience: {
      food: 3,
      culture: 3,
      beaches: 0,
      nightlife: 3,
      dayTrips: 3,
      nature: 3,
      shopping: 3,
    },
    practicality: {
      localTransport: 3,
      languageEase: 3,
      safetyEase: 3,
      entryEase: 3,
      tripSimplicity: 3,
    },
    seasons: Array.from({ length: 12 }, () => "shoulder" as const),
    suitability: Array.from({ length: 12 }, () => 3),
    monthNotes: {},
    risks: [],
    curatedOn: "2026-01-01",
  };
}
