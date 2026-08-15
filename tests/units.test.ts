import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DESTINATIONS } from "@/data/destinations";
import { climateFor } from "@/lib/climate";

/**
 * Temperatures are Fahrenheit everywhere, and this is where that is enforced.
 *
 * Unit drift is unusually hard to catch by eye: 25 is a plausible number in a field
 * called `highF`, and a page can show 25°C beside 77°F without anything looking broken.
 * It happened — the weather panel requested metric from OpenWeatherMap and omitted
 * `temperature_unit` from Open-Meteo, which defaults to Celsius, and rendered °C on a
 * destination page whose every other temperature was °F. The heat-warning threshold was
 * 35, correct for Celsius and nonsense for Fahrenheit.
 */

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(entry)) acc.push(full);
  }
  return acc;
}

const SRC = sourceFiles("src").map((f) => ({ path: f, text: readFileSync(f, "utf-8") }));

describe("every weather call asks for Fahrenheit", () => {
  it("never requests metric units", () => {
    const offenders = SRC.filter((f) => /units:\s*['"]metric['"]/.test(f.text)).map(
      (f) => f.path,
    );
    expect(offenders, `requests metric units: ${offenders.join(", ")}`).toEqual([]);
  });

  it("never requests celsius explicitly", () => {
    const offenders = SRC.filter((f) =>
      /temperature_unit['"\s:=]+['"]celsius/.test(f.text),
    ).map((f) => f.path);
    expect(offenders, `requests celsius: ${offenders.join(", ")}`).toEqual([]);
  });

  it("sets temperature_unit on every Open-Meteo call, since it defaults to celsius", () => {
    // Only files that actually call the API. A documentation link or a source-attribution
    // string mentions the host without requesting anything from it.
    const missing = SRC.filter(
      (f) =>
        /open-meteo\.com/.test(f.text) &&
        /fetch\s*\(/.test(f.text) &&
        !/temperature_unit/.test(f.text),
    ).map((f) => f.path);
    expect(
      missing,
      `calls Open-Meteo without temperature_unit, so it will return celsius: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("shows no °C anywhere in the UI", () => {
    const offenders = SRC.filter(
      (f) => f.path.endsWith(".tsx") && /°C/.test(f.text),
    ).map((f) => f.path);
    expect(offenders, `renders °C: ${offenders.join(", ")}`).toEqual([]);
  });
});

describe("stored climate values are Fahrenheit, not Celsius", () => {
  /**
   * A Celsius value in a Fahrenheit field is not out of range, only wrong — so the check
   * is whether a destination's warmest month is warmer than anywhere on earth manages in
   * Celsius. Reykjavík, the coldest in this catalog, peaks near 57°F; the same figure in
   * Celsius would be 14. Anything whose annual maximum sits below 45 is being read in the
   * wrong unit.
   */
  it("gives every destination a summer high above the celsius ceiling", () => {
    for (const d of DESTINATIONS) {
      const monthly = climateFor(d.id).monthly;
      const warmest = Math.max(...monthly.map((m) => m.highF));
      expect(warmest, `${d.id} peaks at ${warmest} — that reads as celsius`).toBeGreaterThan(45);
    }
  });

  it("keeps every monthly value inside a plausible Fahrenheit range", () => {
    for (const d of DESTINATIONS) {
      for (const m of climateFor(d.id).monthly) {
        expect(m.highF, `${d.id} month ${m.month} high`).toBeGreaterThan(-40);
        expect(m.highF, `${d.id} month ${m.month} high`).toBeLessThan(135);
        expect(m.lowF, `${d.id} month ${m.month} low`).toBeLessThanOrEqual(m.highF);
        if (m.sstF !== null) {
          // Sea temperature in Celsius would read in the twenties.
          expect(m.sstF, `${d.id} month ${m.month} sst`).toBeGreaterThan(28);
          expect(m.sstF, `${d.id} month ${m.month} sst`).toBeLessThan(100);
        }
      }
    }
  });
});
