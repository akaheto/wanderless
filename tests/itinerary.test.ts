import { describe, expect, it } from "vitest";
import { getDestination } from "@/data/destinations";
import { buildItinerary, estimateTransfer, haversineKm, summariseItinerary } from "@/lib/itinerary";
import type { Origin, Trip, TripStop } from "@/lib/domain/types";
import { nightsBetween } from "@/lib/dates";

const trip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 1,
  name: "Test trip",
  status: "comparing",
  startDate: "2027-03-06",
  endDate: "2027-03-16",
  flexibility: "fixed",
  origins: ["JFK", "LGA", "EWR"] as Origin[],
  travelers: 2,
  purpose: "",
  priorities: "",
  notes: "",
  archived: false,
  ownerId: "0",
  permission: "private",
  currency: "USD",
  createdAt: "2026-08-10T00:00:00.000Z",
  updatedAt: "2026-08-10T00:00:00.000Z",
  ...overrides,
});

const stop = (destinationId: string, position: number, nights: number): TripStop => ({
  id: position + 1,
  tripId: 1,
  destinationId,
  position,
  nights,
  note: "",
});

describe("haversineKm", () => {
  it("matches known distances within a percent", () => {
    // JFK to LHR is ~5,555 km.
    expect(haversineKm({ lat: 40.64, lon: -73.78 }, { lat: 51.47, lon: -0.45 })).toBeCloseTo(5555, -2);
  });

  it("is zero for a point against itself, and symmetric", () => {
    const hanoi = getDestination("hanoi")!;
    const hoiAn = getDestination("hoi-an")!;
    expect(haversineKm(hanoi, hanoi)).toBe(0);
    expect(haversineKm(hanoi, hoiAn)).toBeCloseTo(haversineKm(hoiAn, hanoi), 6);
  });
});

describe("estimateTransfer", () => {
  it("calls a short domestic hop a flight and prices in airport overhead", () => {
    const t = estimateTransfer(getDestination("hanoi")!, getDestination("hoi-an")!);
    expect(t.mode).toBe("short-flight");
    // ~600 km of flying, but the overhead dominates — this is the point of the model.
    expect(t.hours).toBeGreaterThan(4);
    expect(t.hours).toBeLessThan(6);
    expect(t.burden).toBe("half-day");
  });

  it("calls a nearby pair overland", () => {
    const t = estimateTransfer(getDestination("phuket")!, getDestination("krabi")!);
    expect(t.mode).toBe("ground");
    expect(t.hours).toBeLessThan(4);
  });

  it("treats a transpacific leg as punishing", () => {
    const t = estimateTransfer(getDestination("tokyo")!, getDestination("mexico-city")!);
    expect(t.mode).toBe("long-flight");
    expect(t.burden).toBe("punishing");
    expect(t.hours).toBeGreaterThan(14);
  });

  it("adds an international penalty over a comparable domestic distance", () => {
    const domestic = estimateTransfer(getDestination("bangkok")!, getDestination("phuket")!);
    const international = estimateTransfer(getDestination("bangkok")!, getDestination("hcmc")!);
    // Similar distances; the border is the difference.
    expect(international.hours).toBeGreaterThan(domestic.hours);
  });

  it("prefers a curated override over the distance model", () => {
    // Krabi to Koh Samui is 200 km, which the distance model calls a 3-hour drive. It
    // actually crosses the peninsula from the Andaman coast to the Gulf — a bus and a
    // ferry, or a connecting flight. This is the case ADR 0011 exists to handle.
    const t = estimateTransfer(getDestination("krabi")!, getDestination("koh-samui")!);
    expect(t.hours).toBe(8);
    expect(t.burden).toBe("full-day");
    expect(t.note).toMatch(/peninsula/i);
  });

  it("applies an override in both directions", () => {
    const there = estimateTransfer(getDestination("krabi")!, getDestination("koh-samui")!);
    const back = estimateTransfer(getDestination("koh-samui")!, getDestination("krabi")!);
    expect(back.hours).toBe(there.hours);
    expect(back.fromDestinationId).toBe("koh-samui");
  });

  it("leaves uncurated pairs on the heuristic", () => {
    const t = estimateTransfer(getDestination("phuket")!, getDestination("krabi")!);
    expect(t.mode).toBe("ground");
    expect(t.note).not.toMatch(/peninsula/i);
  });

  it("never returns a negative or non-finite estimate", () => {
    const ids = ["hanoi", "tokyo", "lisbon", "maldives", "cape-town", "krabi"];
    for (const a of ids) {
      for (const b of ids) {
        const t = estimateTransfer(getDestination(a)!, getDestination(b)!);
        expect(Number.isFinite(t.hours), `${a}→${b}`).toBe(true);
        expect(t.hours, `${a}→${b}`).toBeGreaterThanOrEqual(0);
        expect(t.distanceKm, `${a}→${b}`).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("buildItinerary", () => {
  it("returns null without trip dates, rather than inventing them", () => {
    expect(buildItinerary(trip({ startDate: null, endDate: null }), [])).toBeNull();
  });

  it("derives dates that tile the trip with no gaps or overlaps", () => {
    const it = buildItinerary(trip(), [
      stop("hanoi", 0, 3),
      stop("hoi-an", 1, 4),
      stop("hcmc", 2, 3),
    ])!;

    expect(it.stops.map((s) => s.arriveDate)).toEqual(["2027-03-06", "2027-03-09", "2027-03-13"]);
    expect(it.stops.map((s) => s.departDate)).toEqual(["2027-03-09", "2027-03-13", "2027-03-16"]);

    // Each stop starts exactly where the previous ended — the tiling property itself.
    for (let i = 1; i < it.stops.length; i++) {
      expect(it.stops[i].arriveDate).toBe(it.stops[i - 1].departDate);
    }
    // And the whole thing lands on the return date.
    expect(it.stops.at(-1)!.departDate).toBe(trip().endDate);
    expect(it.unallocatedNights).toBe(0);
  });

  it("orders by position regardless of the order rows arrive in", () => {
    const it = buildItinerary(trip(), [
      stop("hcmc", 2, 3),
      stop("hanoi", 0, 3),
      stop("hoi-an", 1, 4),
    ])!;
    expect(it.stops.map((s) => s.destination.id)).toEqual(["hanoi", "hoi-an", "hcmc"]);
  });

  it("reports unallocated nights without silently correcting them", () => {
    const it = buildItinerary(trip(), [stop("hanoi", 0, 3), stop("hoi-an", 1, 4)])!;
    expect(it.allocatedNights).toBe(7);
    expect(it.tripNights).toBe(10);
    expect(it.unallocatedNights).toBe(3);
    expect(it.warnings.some((w) => w.label.includes("3 nights unallocated"))).toBe(true);
    // The stops keep their own nights — nothing was stretched to fit.
    expect(it.stops.map((s) => s.stop.nights)).toEqual([3, 4]);
  });

  it("flags an over-allocated trip as serious", () => {
    const it = buildItinerary(trip(), [stop("hanoi", 0, 8), stop("hoi-an", 1, 8)])!;
    expect(it.unallocatedNights).toBe(-6);
    const warning = it.warnings.find((w) => w.label.includes("6 nights over"));
    expect(warning?.severity).toBe("serious");
  });

  it("gives each stop the climate for its own dates, not the trip's", () => {
    const it = buildItinerary(trip({ startDate: "2027-03-01", endDate: "2027-03-29" }), [
      stop("hanoi", 0, 14),
      stop("phu-quoc", 1, 14),
    ])!;

    expect(it.stops[0].climate.startDate).toBe("2027-03-01");
    expect(it.stops[1].climate.startDate).toBe("2027-03-15");
    // Different places over different halves of the month: the numbers must differ.
    expect(it.stops[0].climate.avgHighF).not.toBe(it.stops[1].climate.avgHighF);
  });

  it("has no inbound transfer on the first stop", () => {
    const it = buildItinerary(trip(), [stop("hanoi", 0, 5), stop("hoi-an", 1, 5)])!;
    expect(it.stops[0].transferIn).toBeNull();
    expect(it.stops[1].transferIn).not.toBeNull();
  });

  it("sums only the transfers between stops, not the flights at either end", () => {
    const it = buildItinerary(trip(), [
      stop("hanoi", 0, 4),
      stop("hoi-an", 1, 3),
      stop("hcmc", 2, 3),
    ])!;
    const legs = it.stops.map((s) => s.transferIn).filter(Boolean);
    expect(legs).toHaveLength(2);
    expect(it.transferHours).toBeCloseTo(legs.reduce((a, t) => a + t!.hours, 0), 5);
  });

  it("warns when a stop costs more to reach than it is worth", () => {
    // One night in Hoi An after flying from Hanoi: ~5h travel for ~14 waking hours there.
    const it = buildItinerary(trip(), [stop("hanoi", 0, 9), stop("hoi-an", 1, 1)])!;
    const warnings = it.stops[1].warnings.map((w) => w.label);
    expect(warnings).toContain("Transfer costs more than the stop is worth");
  });

  it("does not raise that warning for a stop with room to breathe", () => {
    const it = buildItinerary(trip(), [stop("hanoi", 0, 4), stop("hoi-an", 1, 6)])!;
    expect(it.stops[1].warnings.map((w) => w.label)).not.toContain(
      "Transfer costs more than the stop is worth",
    );
  });

  it("does not let a zero-night stop consume a calendar day", () => {
    // Forcing a minimum of one night made the derived dates disagree with the night count
    // for a stop the UI already flags as a problem, and pushed every later stop a day out.
    const it = buildItinerary(trip(), [
      stop("hanoi", 0, 4),
      stop("hoi-an", 1, 0),
      stop("hcmc", 2, 6),
    ])!;

    expect(it.stops[1].arriveDate).toBe(it.stops[1].departDate);
    expect(it.stops[2].arriveDate).toBe("2027-03-10");
    expect(it.stops.at(-1)!.departDate).toBe("2027-03-16");
    expect(it.unallocatedNights).toBe(0);
  });

  it("flags a stop with no nights allocated", () => {
    const it = buildItinerary(trip(), [stop("hanoi", 0, 10), stop("hoi-an", 1, 0)])!;
    const warning = it.stops[1].warnings.find((w) => w.label === "No nights allocated");
    expect(warning?.severity).toBe("serious");
  });

  it("always states that transfer times are estimates", () => {
    const it = buildItinerary(trip(), [stop("hanoi", 0, 10)])!;
    expect(it.warnings.some((w) => w.label === "Transfer times are estimates")).toBe(true);
  });

  it("skips a stop whose destination has left the catalog rather than throwing", () => {
    const it = buildItinerary(trip(), [stop("hanoi", 0, 5), stop("atlantis", 1, 5)])!;
    expect(it.stops).toHaveLength(1);
    expect(it.stops[0].destination.id).toBe("hanoi");
  });

  it("handles a single-stop trip without inventing transfers or warnings", () => {
    const it = buildItinerary(trip(), [stop("hoi-an", 0, 10)])!;
    expect(it.stops).toHaveLength(1);
    expect(it.transferHours).toBe(0);
    expect(it.unallocatedNights).toBe(0);
    expect(it.stops[0].warnings).toEqual([]);
    expect(summariseItinerary(it)).toBe("Single stop — Hoi An");
  });

  it("handles an empty itinerary", () => {
    const it = buildItinerary(trip(), [])!;
    expect(it.stops).toEqual([]);
    expect(it.unallocatedNights).toBe(10);
    expect(summariseItinerary(it)).toBe("No stops yet");
  });

  it("shifts the whole itinerary when the trip start moves", () => {
    const stops = [stop("hanoi", 0, 5), stop("hoi-an", 1, 5)];
    const before = buildItinerary(trip(), stops)!;
    const after = buildItinerary(
      trip({ startDate: "2027-04-06", endDate: "2027-04-16" }),
      stops,
    )!;

    expect(after.stops[0].arriveDate).toBe("2027-04-06");
    expect(after.stops[1].arriveDate).toBe("2027-04-11");
    // Same shape, different dates — nothing was stored that needed rewriting.
    expect(after.stops.map((s) => s.stop.nights)).toEqual(before.stops.map((s) => s.stop.nights));
    expect(after.unallocatedNights).toBe(before.unallocatedNights);
  });

  it("keeps allocated nights consistent with the derived span", () => {
    const it = buildItinerary(trip(), [
      stop("hanoi", 0, 2),
      stop("hoi-an", 1, 5),
      stop("phu-quoc", 2, 3),
    ])!;
    const span = nightsBetween(it.stops[0].arriveDate, it.stops.at(-1)!.departDate);
    expect(span).toBe(it.allocatedNights);
  });
});
