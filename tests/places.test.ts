import { describe, expect, it } from "vitest";
import type { Itinerary, Origin, Place, PlaceCategory, TripStop } from "@/lib/domain/types";
import { buildItinerary } from "@/lib/itinerary";
import {
  describeAge,
  freshnessOf,
  groupPlacesByStop,
  placeWarnings,
  summarisePlaces,
} from "@/lib/places";
import { NullPlaceLookup, lookupUnavailableReason, placeLookup } from "@/lib/places/lookup";
import { addDays } from "@/lib/dates";

const TODAY = "2026-08-11";

const place = (overrides: Partial<Place> = {}): Place => ({
  id: 1,
  destinationId: "hanoi",
  tripId: 1,
  category: "restaurant",
  name: "Bún Chả Hương Liên",
  address: "",
  neighborhood: "",
  lat: null,
  lon: null,
  hours: "",
  priceLevel: null,
  url: "",
  providerPlaceId: null,
  whyItMatters: "",
  notes: "",
  priority: "considering",
  reservationRequired: false,
  sourceId: 1,
  verifiedOn: TODAY,
  createdAt: "2026-08-11T00:00:00.000Z",
  updatedAt: "2026-08-11T00:00:00.000Z",
  ...overrides,
});

/** Verified n days before TODAY. */
const verifiedDaysAgo = (days: number, category: PlaceCategory = "restaurant"): Place =>
  place({ category, verifiedOn: addDays(TODAY, -days) });

describe("freshness", () => {
  it("distinguishes never-verified from stale", () => {
    // The distinction that matters: stale means someone checked once, a while ago.
    // Unverified means nobody ever checked, which is worse.
    expect(freshnessOf(place({ verifiedOn: null }), TODAY)).toBe("unverified");
    expect(freshnessOf(verifiedDaysAgo(2000), TODAY)).toBe("stale");
  });

  it("decays a restaurant on a six-month / eighteen-month scale", () => {
    expect(freshnessOf(verifiedDaysAgo(30), TODAY)).toBe("fresh");
    expect(freshnessOf(verifiedDaysAgo(180), TODAY)).toBe("fresh");
    expect(freshnessOf(verifiedDaysAgo(181), TODAY)).toBe("aging");
    expect(freshnessOf(verifiedDaysAgo(550), TODAY)).toBe("aging");
    expect(freshnessOf(verifiedDaysAgo(551), TODAY)).toBe("stale");
  });

  it("is far more relaxed about a beach than a restaurant", () => {
    // A beach does not close. Treating them the same means either nagging about beaches
    // or trusting two-year-old restaurant hours.
    const twoYears = 730;
    expect(freshnessOf(verifiedDaysAgo(twoYears, "restaurant"), TODAY)).toBe("stale");
    expect(freshnessOf(verifiedDaysAgo(twoYears, "beach"), TODAY)).toBe("fresh");
  });

  it("places museums between the two", () => {
    expect(freshnessOf(verifiedDaysAgo(500, "museum"), TODAY)).toBe("fresh");
    expect(freshnessOf(verifiedDaysAgo(1200, "museum"), TODAY)).toBe("stale");
  });

  it("treats a future verification date as fresh rather than as an error", () => {
    expect(freshnessOf(place({ verifiedOn: addDays(TODAY, 3) }), TODAY)).toBe("fresh");
  });

  it("has a threshold for every category", () => {
    const categories: PlaceCategory[] = [
      "restaurant", "bar", "cafe", "shop", "market", "museum",
      "sight", "activity", "beach", "viewpoint", "neighborhood", "other",
    ];
    for (const category of categories) {
      expect(freshnessOf(verifiedDaysAgo(1, category), TODAY), category).toBe("fresh");
      expect(freshnessOf(verifiedDaysAgo(4000, category), TODAY), category).toBe("stale");
    }
  });
});

describe("describeAge", () => {
  it("reads naturally at each scale", () => {
    expect(describeAge(verifiedDaysAgo(0), TODAY)).toBe("checked today");
    expect(describeAge(verifiedDaysAgo(1), TODAY)).toBe("checked yesterday");
    expect(describeAge(verifiedDaysAgo(10), TODAY)).toBe("checked 10 days ago");
    expect(describeAge(verifiedDaysAgo(90), TODAY)).toBe("checked 3 months ago");
    expect(describeAge(verifiedDaysAgo(400), TODAY)).toBe("checked about a year ago");
    expect(describeAge(verifiedDaysAgo(1100), TODAY)).toBe("checked 3 years ago");
  });

  it("says so when nothing was ever checked", () => {
    expect(describeAge(place({ verifiedOn: null }), TODAY)).toBe("never verified");
  });
});

// ---------------------------------------------------------------------------

const trip = {
  id: 1,
  name: "Vietnam",
  status: "comparing" as const,
  startDate: "2027-03-06",
  endDate: "2027-03-16",
  flexibility: "fixed" as const,
  origins: ["JFK", "LGA", "EWR"] as Origin[],
  travelers: 2,
  purpose: "",
  priorities: "",
  notes: "",
  archived: false,
  ownerId: "0",
  permission: "private" as const,
  currency: "USD",
  createdAt: "",
  updatedAt: "",
};

const stop = (destinationId: string, position: number, nights: number): TripStop => ({
  id: position + 1,
  tripId: 1,
  destinationId,
  position,
  nights,
  note: "",
});

const itineraryOf = (...stops: TripStop[]): Itinerary => buildItinerary(trip, stops)!;

describe("grouping places under stops", () => {
  it("derives stop membership from the destination", () => {
    const itinerary = itineraryOf(stop("hanoi", 0, 4), stop("hoi-an", 1, 6));
    const { grouped, unplaced } = groupPlacesByStop(
      [
        place({ id: 1, destinationId: "hanoi", name: "Bún chả" }),
        place({ id: 2, destinationId: "hoi-an", name: "Tailor" }),
      ],
      itinerary,
    );

    expect(grouped.map((g) => g.destinationId)).toEqual(["hanoi", "hoi-an"]);
    expect(grouped[0].places.map((p) => p.name)).toEqual(["Bún chả"]);
    expect(grouped[1].places.map((p) => p.name)).toEqual(["Tailor"]);
    expect(unplaced).toEqual([]);
  });

  it("carries each stop's dates, so a place inherits when you will be there", () => {
    const itinerary = itineraryOf(stop("hanoi", 0, 4), stop("hoi-an", 1, 6));
    const { grouped } = groupPlacesByStop([place({ destinationId: "hoi-an" })], itinerary);

    expect(grouped[1].arriveDate).toBe("2027-03-10");
    expect(grouped[1].departDate).toBe("2027-03-16");
  });

  it("leaves a place unplaced when the trip has no stop for its destination", () => {
    const itinerary = itineraryOf(stop("hanoi", 0, 10));
    const { grouped, unplaced } = groupPlacesByStop(
      [place({ destinationId: "hanoi" }), place({ id: 2, destinationId: "phu-quoc", name: "Beach" })],
      itinerary,
    );

    expect(grouped[0].places).toHaveLength(1);
    expect(unplaced.map((p) => p.name)).toEqual(["Beach"]);
  });

  it("does not duplicate a place when a destination is visited twice", () => {
    // Showing the same restaurant under two stops would imply two bookings.
    const itinerary = itineraryOf(stop("hanoi", 0, 3), stop("hoi-an", 1, 4), stop("hanoi", 2, 3));
    const { grouped } = groupPlacesByStop([place({ destinationId: "hanoi" })], itinerary);

    const total = grouped.reduce((n, g) => n + g.places.length, 0);
    expect(total).toBe(1);
    expect(grouped[0].places).toHaveLength(1);
  });

  it("treats everything as unplaced when there is no itinerary", () => {
    const places = [place({ id: 1 }), place({ id: 2 })];
    expect(groupPlacesByStop(places, null).unplaced).toHaveLength(2);
    expect(groupPlacesByStop(places, null).grouped).toEqual([]);
  });

  it("orders must-dos first and ruled-out last", () => {
    const itinerary = itineraryOf(stop("hanoi", 0, 10));
    const { grouped } = groupPlacesByStop(
      [
        place({ id: 1, name: "Ruled", priority: "ruled_out" }),
        place({ id: 2, name: "Maybe", priority: "considering" }),
        place({ id: 3, name: "Essential", priority: "must" }),
        place({ id: 4, name: "Spare", priority: "if_time" }),
      ],
      itinerary,
    );
    expect(grouped[0].places.map((p) => p.name)).toEqual(["Essential", "Maybe", "Spare", "Ruled"]);
  });
});

describe("warnings", () => {
  it("flags never-verified places", () => {
    const warnings = placeWarnings([place({ verifiedOn: null, sourceId: 1 })], { asOf: TODAY });
    expect(warnings.some((w) => w.label.includes("never been verified"))).toBe(true);
  });

  it("escalates staleness to serious when departure is close", () => {
    const stale = [verifiedDaysAgo(900)];

    const distant = placeWarnings(stale, { tripStartDate: "2027-06-01", asOf: TODAY });
    const imminent = placeWarnings(stale, { tripStartDate: "2026-09-01", asOf: TODAY });

    expect(distant.find((w) => w.label.includes("out of date"))?.severity).toBe("warning");
    const urgent = imminent.find((w) => w.label.includes("out of date"));
    expect(urgent?.severity).toBe("serious");
    expect(urgent?.detail).toContain("21 days");
  });

  it("ignores ruled-out places", () => {
    const warnings = placeWarnings([place({ verifiedOn: null, priority: "ruled_out" })], {
      asOf: TODAY,
    });
    expect(warnings).toEqual([]);
  });

  it("mentions aging places only when nothing is outright stale", () => {
    const aging = placeWarnings([verifiedDaysAgo(300)], { asOf: TODAY });
    expect(aging.some((w) => w.label.includes("worth re-checking"))).toBe(true);

    const withStale = placeWarnings([verifiedDaysAgo(300), verifiedDaysAgo(900)], { asOf: TODAY });
    expect(withStale.some((w) => w.label.includes("worth re-checking"))).toBe(false);
  });

  it("notes places with no recorded source", () => {
    const warnings = placeWarnings([place({ sourceId: null })], { asOf: TODAY });
    const warning = warnings.find((w) => w.label.includes("no recorded source"));
    expect(warning?.severity).toBe("info");
  });

  it("says nothing about an empty list", () => {
    expect(placeWarnings([], { asOf: TODAY })).toEqual([]);
  });
});

describe("summarisePlaces", () => {
  it("counts live places and separates what needs attention", () => {
    const summary = summarisePlaces(
      [
        place({ id: 1, priority: "must" }),
        place({ id: 2, verifiedOn: null }),
        place({ id: 3, verifiedOn: addDays(TODAY, -900) }),
        place({ id: 4, priority: "ruled_out" }),
      ],
      TODAY,
    );

    expect(summary.total).toBe(3);
    expect(summary.ruledOut).toBe(1);
    expect(summary.mustDo).toBe(1);
    expect(summary.needsAttention).toBe(2);
  });
});

describe("place lookup", () => {
  it("defaults to unconfigured, and the app is expected to work that way", () => {
    const lookup = placeLookup();
    expect(lookup.configured).toBe(false);
    expect(lookupUnavailableReason(lookup)).toContain("entered by hand");
  });

  it("returns nothing rather than throwing when unconfigured", async () => {
    await expect(new NullPlaceLookup().search("bun cha")).resolves.toEqual([]);
  });

  it("names itself for the UI", () => {
    expect(placeLookup().name).toBe("Manual entry");
  });
});

describe("the tier guarantee", () => {
  it("keeps fetched and personal fields in separate write paths", async () => {
    // ADR 0001 and 0014: re-verification must not be able to touch personal fields. The
    // enforcement is that no single function writes both groups, so assert that the
    // reverify SQL never mentions a personal column.
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const source = readFileSync(join(process.cwd(), "src/lib/db/places.ts"), "utf8");

    const reverify = source.slice(
      source.indexOf("export async function reverifyPlace"),
      source.indexOf("export async function updatePersonalFields"),
    );

    for (const personalColumn of ["why_it_matters", "notes", "priority", "reservation_required"]) {
      expect(reverify, `reverifyPlace must not write ${personalColumn}`).not.toContain(
        personalColumn,
      );
    }
  });
});
