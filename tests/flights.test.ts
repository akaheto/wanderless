import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { routeTestDestination } from "./fixtures/destinations";
import { BASELINE_ORIGIN, HOME, airportInfo, airportNote } from "@/data/home";
import { ORIGINS } from "@/lib/domain/types";
import { selectRoute } from "@/lib/routes";
import {
  type FlightItinerary,
  NullFlightSearch,
  compareWithEstimate,
  filterItineraries,
  flightSearch,
  itineraryAirlines,
  itineraryHours,
  searchAge,
  searchUnavailableReason,
} from "@/lib/flights";

const segment = (airline: string, from: string, to: string, minutes: number) => ({
  airline,
  flightNumber: `${airline}100`,
  from,
  to,
  departsAt: "2027-02-06T18:00:00",
  arrivesAt: "2027-02-07T12:00:00",
  durationMinutes: minutes,
});

const itinerary = (
  overrides: Partial<FlightItinerary> = {},
): FlightItinerary => ({
  id: "it-1",
  origin: "EWR",
  destinationAirport: "CPT",
  segments: [segment("UA", "EWR", "CPT", 930)],
  totalMinutes: 930,
  stops: 0,
  priceMinorUnits: 128_000,
  currency: "USD",
  cabin: "economy",
  ...overrides,
});

describe("the flight search provider", () => {
  it("kiwi.com is the default configured provider", () => {
    const search = flightSearch();
    expect(search.configured).toBe(true);
    expect(search.name).toContain("Kiwi");
  });

  it("the null provider is still available and returns nothing", async () => {
    const search = new NullFlightSearch();
    expect(search.configured).toBe(false);
    await expect(
      search.search({
        origins: ["JFK"],
        destinationAirport: "CPT",
        departDate: "2027-02-06",
        travellers: 2,
      }),
    ).resolves.toEqual([]);
  });

  it("explains when no provider is configured", () => {
    const nullSearch = new NullFlightSearch();
    const reason = searchUnavailableReason(nullSearch);
    expect(reason).toContain("curated route table");
    expect(reason).toContain("ranked this destination");
  });

  it("returns no unavailable reason when a provider is configured", () => {
    const search = flightSearch();
    const reason = searchUnavailableReason(search);
    expect(reason).toBeNull();
  });
});

describe("comparing a searched itinerary with the curated estimate", () => {
  it("keeps both figures whole rather than overwriting one", () => {
    const selected = selectRoute(routeTestDestination("cape-town"), {
      origins: ["EWR"],
      alliances: [],
      airlines: [],
    });
    const result = compareWithEstimate(itinerary(), selected);

    expect(result.itinerary.totalMinutes).toBe(930);
    expect(result.estimate.typicalTotalHours).toBe(15.5);
    expect(itineraryHours(result.itinerary)).toBe(15.5);
  });

  it("accepts a small difference without calling the estimate wrong", () => {
    const selected = selectRoute(routeTestDestination("cape-town"), {
      origins: ["EWR"],
      alliances: [],
      airlines: [],
    });
    const result = compareWithEstimate(itinerary({ totalMinutes: 990 }), selected);

    expect(result.contradictsEstimate).toBe(false);
    expect(result.summary).toContain("the ranking stands");
  });

  it("flags a material contradiction as a signal the route table is stale", () => {
    const selected = selectRoute(routeTestDestination("cape-town"), {
      origins: ["EWR"],
      alliances: [],
      airlines: [],
    });
    const result = compareWithEstimate(itinerary({ totalMinutes: 1_500 }), selected);

    expect(result.contradictsEstimate).toBe(true);
    expect(result.hoursDelta).toBeGreaterThan(3);
    expect(result.summary).toContain("out of date");
    // The ranking still used the estimate — the searched figure never retro-scores.
    expect(result.summary).toContain("the ranking used the estimate");
  });

  it("treats a nonstop estimate contradicted by a connecting itinerary as material", () => {
    const selected = selectRoute(routeTestDestination("cape-town"), {
      origins: ["EWR"],
      alliances: [],
      airlines: [],
    });
    const connecting = itinerary({
      stops: 1,
      totalMinutes: 960,
      segments: [segment("UA", "EWR", "JNB", 900), segment("UA", "JNB", "CPT", 60)],
    });
    expect(compareWithEstimate(connecting, selected).contradictsEstimate).toBe(true);
  });
});

describe("filtering itineraries", () => {
  it("returns everything when no filter is set", () => {
    const all = [itinerary(), itinerary({ id: "it-2", segments: [segment("DL", "JFK", "CPT", 990)] })];
    expect(filterItineraries(all, {})).toHaveLength(2);
  });

  it("requires every segment to match, not just one", () => {
    const mixed = itinerary({
      id: "mixed",
      stops: 1,
      segments: [segment("UA", "EWR", "LHR", 400), segment("BA", "LHR", "CPT", 700)],
    });
    // United is Star, British Airways is Oneworld — a Star-only traveller cannot fly this.
    expect(filterItineraries([mixed], { alliances: ["star"] })).toHaveLength(0);
    expect(filterItineraries([mixed], { alliances: ["star", "oneworld"] })).toHaveLength(1);
  });

  it("supports naming an airline directly", () => {
    expect(filterItineraries([itinerary()], { airlines: ["UA"] })).toHaveLength(1);
    expect(filterItineraries([itinerary()], { airlines: ["DL"] })).toHaveLength(0);
  });

  it("names the carriers flown, de-duplicated", () => {
    const twoLegs = itinerary({
      segments: [segment("UA", "EWR", "LHR", 400), segment("UA", "LHR", "CPT", 700)],
    });
    expect(itineraryAirlines(twoLegs)).toEqual(["United"]);
  });
});

describe("stored searches age", () => {
  it("treats a fare as stale within days and a schedule within weeks", () => {
    const result = {
      origin: "EWR" as const,
      destinationAirport: "CPT",
      departDate: "2027-02-06",
      returnDate: null,
      itineraries: [itinerary()],
      retrievedAt: "2026-08-01T00:00:00.000Z",
      provider: "test",
    };
    const age = searchAge(result, new Date("2026-08-11T00:00:00.000Z"));
    expect(age.days).toBe(10);
    expect(age.fareIsStale).toBe(true);
    expect(age.scheduleIsStale).toBe(false);

    const fresh = searchAge({ ...result, retrievedAt: "2026-08-11T00:00:00.000Z" }, new Date("2026-08-11T06:00:00.000Z"));
    expect(fresh.fareIsStale).toBe(false);
  });
});

describe("the separation the ranking depends on", () => {
  /*
   * ADR 0016, and the same reasoning as ADR 0012 for forecasts. A ranking must mean the
   * same thing whenever it runs and must reproduce from its URL. Live flight data would
   * break that invisibly, and would bill a search per destination per slider move.
   */
  it("never imports the flight module anywhere in the scoring path", () => {
    const scoringDir = join(process.cwd(), "src/lib/scoring");
    for (const file of readdirSync(scoringDir).filter((f) => f.endsWith(".ts"))) {
      const source = readFileSync(join(scoringDir, file), "utf8");
      expect(source, `${file} must not import live flight data`).not.toMatch(
        /from\s+["'][^"']*\/flights["']/,
      );
    }
  });

  it("keeps the curated route module free of flight-search imports", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/routes/index.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*\/flights["']/);
  });
});

describe("home base", () => {
  it("is the single place the New York assumption lives", () => {
    expect(HOME.airports.map((a) => a.code)).toEqual([...ORIGINS]);
    expect(BASELINE_ORIGIN).toBe("JFK");
    expect(HOME.climateReferenceId).toBe("nyc-reference");
  });

  it("names every airport and notes the ones with a catch", () => {
    for (const origin of ORIGINS) {
      expect(airportInfo(origin)?.name, origin).toBeTruthy();
    }
    expect(airportNote("LGA")).toContain("perimeter");
    expect(airportNote("EWR")).toContain("Cape Town");
    expect(airportNote("JFK")).toBeUndefined();
  });

  it("no longer hardcodes home coordinates in the climate module", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/climate/index.ts"), "utf8");
    expect(source).not.toContain("40.7128");
    expect(source).not.toContain("America/New_York");
  });
});
