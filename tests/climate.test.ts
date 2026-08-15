import { describe, expect, it } from "vitest";
import { catalogDestination } from "./fixtures/destinations";
import { DESTINATIONS } from "@/data/destinations";
import { climateFor, dateWindowClimate, compareWithHome, interpretConditions } from "@/lib/climate";
import { solarDay, utcOffsetHours } from "@/lib/climate/solar";

const hoiAn = catalogDestination("hoi-an");
const stockholm = catalogDestination("stockholm");
const phuQuoc = catalogDestination("phu-quoc");

describe("generated climate data", () => {
  it("covers every destination in the catalog", () => {
    for (const d of DESTINATIONS) {
      expect(() => climateFor(d.id), `missing climate for ${d.id}`).not.toThrow();
    }
  });

  it("has 366 day-of-year values and 12 months for every destination", () => {
    for (const d of DESTINATIONS) {
      const c = climateFor(d.id);
      expect(c.daily.highF, d.id).toHaveLength(366);
      expect(c.daily.lowF, d.id).toHaveLength(366);
      expect(c.daily.rainDayPct, d.id).toHaveLength(366);
      expect(c.monthly, d.id).toHaveLength(12);
    }
  });

  it("never reports a low above its high", () => {
    for (const d of DESTINATIONS) {
      const c = climateFor(d.id);
      for (let i = 0; i < 366; i++) {
        expect(c.daily.lowF[i], `${d.id} day ${i}`).toBeLessThanOrEqual(c.daily.highF[i]);
      }
    }
  });

  it("keeps rain probability a probability", () => {
    for (const d of DESTINATIONS) {
      for (const pct of climateFor(d.id).daily.rainDayPct) {
        expect(pct).toBeGreaterThanOrEqual(0);
        expect(pct).toBeLessThanOrEqual(100);
      }
    }
  });

  it("carries sea temperature for coastal destinations and none for inland ones", () => {
    for (const d of DESTINATIONS) {
      const c = climateFor(d.id);
      const hasSst = c.monthly.some((m) => m.sstF !== null);
      expect(hasSst, `${d.id} coastal=${d.coastal}`).toBe(d.coastal);
    }
  });

  it("records a source and a fetch date on every record", () => {
    for (const d of DESTINATIONS) {
      const c = climateFor(d.id);
      expect(c.source.source).toBeTruthy();
      expect(c.source.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(c.source.tier).toBe("objective");
    }
  });
});

describe("dateWindowClimate", () => {
  it("aggregates over the exact dates, inclusive", () => {
    const w = dateWindowClimate(hoiAn, "2027-03-06", "2027-03-16");
    expect(w.days).toBe(11);
    expect(w.avgHighF).toBeGreaterThan(w.avgLowF);
    expect(w.warmestHighF).toBeGreaterThanOrEqual(w.avgHighF);
    expect(w.coolestLowF).toBeLessThanOrEqual(w.avgLowF);
  });

  it("cannot expect more wet days than there are days", () => {
    for (const d of DESTINATIONS) {
      const w = dateWindowClimate(d, "2027-07-01", "2027-07-14");
      expect(w.expectedRainDays, d.id).toBeLessThanOrEqual(w.days);
      expect(w.expectedRainDays, d.id).toBeGreaterThanOrEqual(0);
    }
  });

  it("puts the northern and southern hemispheres in opposite seasons", () => {
    const bali = catalogDestination("south-bali");
    const rome = catalogDestination("rome");
    const janBali = dateWindowClimate(bali, "2027-01-10", "2027-01-17").avgHighF;
    const julBali = dateWindowClimate(bali, "2027-07-10", "2027-07-17").avgHighF;
    const janRome = dateWindowClimate(rome, "2027-01-10", "2027-01-17").avgHighF;
    const julRome = dateWindowClimate(rome, "2027-07-10", "2027-07-17").avgHighF;

    expect(janBali).toBeGreaterThan(julBali);
    expect(julRome).toBeGreaterThan(janRome);
  });

  it("reports warm dry-season water at Phú Quốc in February", () => {
    const w = dateWindowClimate(phuQuoc, "2027-02-05", "2027-02-15");
    expect(w.sstF).not.toBeNull();
    expect(w.sstF!).toBeGreaterThan(78);
  });
});

describe("solar geometry", () => {
  it("gives Stockholm under 7 hours of light in January and over 17 in June", () => {
    const jan = dateWindowClimate(stockholm, "2027-01-10", "2027-01-16");
    const jun = dateWindowClimate(stockholm, "2027-06-15", "2027-06-21");
    expect(jan.avgDaylightHours).toBeLessThan(7);
    expect(jun.avgDaylightHours).toBeGreaterThan(17);
  });

  it("gives the equator roughly twelve hours all year", () => {
    const singapore = catalogDestination("singapore");
    for (const start of ["2027-01-05", "2027-04-05", "2027-07-05", "2027-10-05"]) {
      const w = dateWindowClimate(singapore, start, start);
      expect(Math.abs(w.avgDaylightHours - 12)).toBeLessThan(0.4);
    }
  });

  it("puts the equinox near twelve hours everywhere", () => {
    for (const d of DESTINATIONS) {
      const w = dateWindowClimate(d, "2027-03-20", "2027-03-20");
      expect(Math.abs(w.avgDaylightHours - 12), d.id).toBeLessThan(0.5);
    }
  });

  it("resolves summer and winter UTC offsets for a DST zone", () => {
    expect(utcOffsetHours("America/New_York", "2027-01-15")).toBe(-5);
    expect(utcOffsetHours("America/New_York", "2027-07-15")).toBe(-4);
    expect(utcOffsetHours("Asia/Ho_Chi_Minh", "2027-07-15")).toBe(7);
  });

  it("returns clock times that bracket solar noon", () => {
    const day = solarDay("2027-06-21", 40.7128, -74.006, -4);
    expect(day.sunrise).toMatch(/^0[45]:\d{2}$/);
    expect(day.sunset).toMatch(/^20:\d{2}$/);
    expect(day.daylightHours).toBeGreaterThan(15);
  });
});

describe("compareWithHome", () => {
  it("frames a tropical destination as much warmer than New York in January", () => {
    const home = compareWithHome(phuQuoc, "2027-01-10", "2027-01-17");
    expect(home.highDeltaF).toBeGreaterThan(30);
    expect(home.daylightDeltaHours).toBeGreaterThan(1);
  });

  it("frames Stockholm as colder and darker than New York in January", () => {
    const home = compareWithHome(stockholm, "2027-01-10", "2027-01-17");
    expect(home.highDeltaF).toBeLessThan(0);
    expect(home.daylightDeltaHours).toBeLessThan(-2);
  });
});

describe("interpretConditions", () => {
  it("says there is no beach at an inland destination rather than reporting a sea temperature", () => {
    const hanoi = catalogDestination("hanoi");
    const reading = interpretConditions(hanoi, dateWindowClimate(hanoi, "2027-03-06", "2027-03-16"));
    expect(reading.beach).toMatch(/no beach/i);
  });

  it("flags a short winter day as materially limiting", () => {
    const reading = interpretConditions(
      stockholm,
      dateWindowClimate(stockholm, "2027-01-10", "2027-01-16"),
    );
    expect(reading.daylight).toMatch(/shortens/i);
    expect(reading.outdoorDining).toMatch(/too cold/i);
  });
});
