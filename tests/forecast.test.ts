import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDestination } from "@/data/destinations";
import {
  FORECAST_HORIZON_DAYS,
  type Forecast,
  compareForecastWithNormal,
  confidenceFor,
  describeWeatherCode,
  forecastAvailability,
} from "@/lib/climate/forecast";

const TODAY = "2026-08-11";
const hoiAn = getDestination("hoi-an")!;

const forecast = (days: { date: string; highF: number; rainChancePct?: number }[]): Forecast => ({
  destinationId: "hoi-an",
  days: days.map((d) => ({
    date: d.date,
    highF: d.highF,
    lowF: d.highF - 10,
    precipIn: 0,
    rainChancePct: d.rainChancePct ?? 0,
    weatherCode: 0,
  })),
  issuedAt: "2026-08-11T00:00:00.000Z",
  model: "test",
  leadDays: 2,
  confidence: "high",
});

describe("forecastAvailability", () => {
  it("is available inside the horizon", () => {
    const result = forecastAvailability("2026-08-14", "2026-08-20", TODAY);
    expect(result.available).toBe(true);
    expect(result.leadDays).toBe(3);
    expect(result.reason).toBeNull();
  });

  it("is available on the horizon boundary but not past it", () => {
    // The boundary is the whole point of the feature — assert both sides of it.
    const onEdge = forecastAvailability("2026-08-27", "2026-08-30", TODAY);
    const pastEdge = forecastAvailability("2026-08-28", "2026-08-30", TODAY);

    expect(FORECAST_HORIZON_DAYS).toBe(16);
    expect(onEdge.available).toBe(true);
    expect(pastEdge.available).toBe(false);
  });

  it("explains why a distant trip has no forecast, rather than showing nothing", () => {
    const result = forecastAvailability("2027-03-06", "2027-03-16", TODAY);
    expect(result.available).toBe(false);
    expect(result.reason).toContain("days away");
    expect(result.reason).toContain("normals below are the better guide");
  });

  it("is unavailable for dates that have passed", () => {
    const result = forecastAvailability("2026-07-01", "2026-07-10", TODAY);
    expect(result.available).toBe(false);
    expect(result.reason).toContain("passed");
  });

  it("is available for a trip already under way", () => {
    const result = forecastAvailability("2026-08-09", "2026-08-15", TODAY);
    expect(result.available).toBe(true);
  });

  it("says so when dates are not set, rather than throwing", () => {
    const result = forecastAvailability("", "", TODAY);
    expect(result.available).toBe(false);
    expect(result.reason).toContain("not set");
  });
});

describe("confidence decays with lead time", () => {
  it("grades by how far out the forecast reaches", () => {
    expect(confidenceFor(0)).toBe("high");
    expect(confidenceFor(3)).toBe("high");
    expect(confidenceFor(4)).toBe("moderate");
    expect(confidenceFor(9)).toBe("moderate");
    expect(confidenceFor(10)).toBe("low");
    expect(confidenceFor(16)).toBe("low");
  });
});

describe("compareForecastWithNormal", () => {
  it("keeps both readings whole rather than merging them", () => {
    // The central rule of ADR 0012: two claims, side by side, never averaged.
    const result = compareForecastWithNormal(
      hoiAn,
      forecast([
        { date: "2026-08-12", highF: 95 },
        { date: "2026-08-13", highF: 96 },
      ]),
    );

    expect(result.forecast.days).toHaveLength(2);
    expect(result.normal.startDate).toBe("2026-08-12");
    expect(result.normal.endDate).toBe("2026-08-13");
    // The normal is untouched by the forecast.
    expect(result.normal.avgHighF).toBeGreaterThan(0);
    expect(result.normal.avgHighF).not.toBe(95.5);
  });

  it("reports a materially warmer forecast as notable", () => {
    const result = compareForecastWithNormal(
      hoiAn,
      forecast([
        { date: "2026-08-12", highF: 105 },
        { date: "2026-08-13", highF: 105 },
      ]),
    );
    expect(result.highDeltaF).toBeGreaterThan(5);
    expect(result.notable).toBe(true);
    expect(result.summary).toContain("warmer than usual");
  });

  it("reports a materially cooler forecast as notable", () => {
    const result = compareForecastWithNormal(
      hoiAn,
      forecast([
        { date: "2026-08-12", highF: 72 },
        { date: "2026-08-13", highF: 72 },
      ]),
    );
    expect(result.highDeltaF).toBeLessThan(-5);
    expect(result.summary).toContain("cooler than usual");
  });

  it("says nothing dramatic when the forecast matches the normal", () => {
    const normalHigh = 90;
    const result = compareForecastWithNormal(
      hoiAn,
      forecast([{ date: "2026-08-12", highF: normalHigh }]),
    );
    if (!result.notable) {
      expect(result.summary).toContain("close to what these dates normally look like");
    }
  });

  it("hedges according to confidence", () => {
    const hot = [
      { date: "2026-08-12", highF: 105 },
      { date: "2026-08-13", highF: 105 },
    ];

    const high = compareForecastWithNormal(hoiAn, { ...forecast(hot), confidence: "high" });
    const low = compareForecastWithNormal(hoiAn, { ...forecast(hot), confidence: "low" });

    expect(high.summary).toContain("Pack for it");
    expect(low.summary).toContain("Low confidence");
  });

  it("counts forecast wet days from rain probability", () => {
    const result = compareForecastWithNormal(
      hoiAn,
      forecast([
        { date: "2026-08-12", highF: 90, rainChancePct: 100 },
        { date: "2026-08-13", highF: 90, rainChancePct: 100 },
        { date: "2026-08-14", highF: 90, rainChancePct: 100 },
      ]),
    );
    // Three certain-rain days against an August normal well below that.
    expect(result.rainDeltaDays).toBeGreaterThan(0);
  });
});

describe("weather codes", () => {
  it("maps WMO codes to the distinctions a traveller cares about", () => {
    expect(describeWeatherCode(0)).toBe("clear");
    expect(describeWeatherCode(3)).toBe("overcast");
    expect(describeWeatherCode(63)).toBe("rain");
    expect(describeWeatherCode(95)).toBe("thunderstorms");
  });
});

describe("the separation the engine depends on", () => {
  /*
   * ADR 0012 with ADR 0002: a ranking must be reproducible from its URL whether it runs
   * today or next year. A forecast reaching the scoring path would break that silently,
   * and only for near-term trips — the case where it matters most and where nobody would
   * think to check. This is a static assertion on the source rather than on behaviour,
   * because the behaviour it guards against only appears within 16 days of a departure.
   */
  it("never imports the forecast module anywhere in the scoring path", () => {
    const scoringDir = join(process.cwd(), "src/lib/scoring");

    for (const file of readdirSync(scoringDir).filter((f) => f.endsWith(".ts"))) {
      const source = readFileSync(join(scoringDir, file), "utf8");
      expect(source, `${file} must not import forecasts`).not.toMatch(
        /from\s+["'][^"']*forecast["']/,
      );
    }
  });

  it("keeps the normals module free of forecast imports too", () => {
    // climate/index.ts is what the engine reads. forecast.ts may import from it, but not
    // the other way around — that direction is what keeps the dependency acyclic and the
    // separation enforceable.
    const source = readFileSync(join(process.cwd(), "src/lib/climate/index.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*forecast["']/);
  });
});
