/**
 * Regenerates the OBJECTIVE data tier from public APIs.
 *
 *   npm run build:data
 *
 * Writes:
 *   src/data/generated/climate/<destination>.json   climate normals per destination
 *   src/data/generated/holidays.json                public holidays by country and year
 *   src/data/generated/manifest.json                what ran, when, and against which sources
 *
 * Nothing here is fetched at request time. The app reads only the generated files,
 * so a page render never depends on a third party being up, and every number in the
 * UI can be traced to a source and a fetch date.
 *
 * This script fails loudly. A destination that cannot be fetched aborts the run
 * rather than silently shipping a gap.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { DESTINATIONS } from "../src/data/destinations";
import type { ClimateMonth, ClimateRecord } from "../src/lib/domain/types";

const ARCHIVE_START = "2015-01-01";
const ARCHIVE_END = "2024-12-31";
const PERIOD_LABEL = "2015-2024";
const HOLIDAY_YEARS = [2026, 2027, 2028];

/** Smoothing half-width in days for the day-of-year normals. */
const SMOOTH_RADIUS = 7;
/** Measurable rain threshold, inches (1 mm). */
const RAIN_THRESHOLD_IN = 0.04;

const OUT_DIR = path.join(process.cwd(), "src", "data", "generated");
const today = new Date().toISOString().slice(0, 10);

/** Home-city baseline for the "compared with New York" context. Never ranked. */
const NYC_REFERENCE = { id: "nyc-reference", lat: 40.7128, lon: -74.006 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * A ten-year daily request carries enough weight to trip Open-Meteo's per-minute
 * quota after a handful of destinations. Back off and retry rather than aborting a
 * run that is otherwise healthy; anything that is not a rate limit still fails fast.
 */
async function fetchJson(url: string, label: string, attempt = 1): Promise<unknown> {
  const MAX_ATTEMPTS = 5;
  const res = await fetch(url);
  const body = await res.text();

  if (res.status === 429) {
    if (attempt >= MAX_ATTEMPTS) {
      throw new Error(`${label}: still rate limited after ${MAX_ATTEMPTS} attempts`);
    }
    const wait = 65_000;
    console.log(`\n    rate limited, waiting ${wait / 1000}s (attempt ${attempt}/${MAX_ATTEMPTS})...`);
    await sleep(wait);
    return fetchJson(url, label, attempt + 1);
  }

  if (!res.ok) {
    throw new Error(`${label}: HTTP ${res.status} ${res.statusText}\n${body.slice(0, 400)}\n${url}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error(`${label}: response was not JSON\n${body.slice(0, 400)}`);
  }
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    throw new Error(`${label}: API error — ${JSON.stringify(parsed).slice(0, 400)}`);
  }
  return parsed;
}

const DAYS_IN_MONTH_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Index into a fixed 366-day leap calendar: 1 Jan = 0, 29 Feb = 59, 1 Mar = 60.
 *
 * Using a leap calendar everywhere means 1 March always lands on index 60 regardless
 * of the year, so the day-of-year normals do not smear by a day across the sample.
 * 29 February only draws observations from leap years, which the smoothing window covers.
 */
function leapIndex(month: number, day: number): number {
  let idx = 0;
  for (let m = 0; m < month - 1; m++) idx += DAYS_IN_MONTH_LEAP[m];
  return idx + day - 1;
}

const round = (n: number, dp = 1) => Number(n.toFixed(dp));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Collect every value whose day-of-year falls within +/- radius of `i`, wrapping the year. */
function window<T>(buckets: T[][], i: number, radius: number): T[] {
  const out: T[] = [];
  for (let d = -radius; d <= radius; d++) {
    out.push(...buckets[(i + d + 366) % 366]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Climate
// ---------------------------------------------------------------------------

interface DailyRow {
  month: number;
  day: number;
  year: number;
  highF: number;
  lowF: number;
  precipIn: number;
  humidityPct: number;
  sunHours: number;
}

interface ArchiveResponse {
  daily: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_sum: (number | null)[];
    relative_humidity_2m_mean: (number | null)[];
    sunshine_duration: (number | null)[];
  };
}

async function fetchDaily(lat: number, lon: number, label: string): Promise<DailyRow[]> {
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&start_date=${ARCHIVE_START}&end_date=${ARCHIVE_END}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,sunshine_duration` +
    `&timezone=auto&temperature_unit=fahrenheit&precipitation_unit=inch`;

  const data = (await fetchJson(url, `climate ${label}`)) as ArchiveResponse;
  const d = data.daily;
  const rows: DailyRow[] = [];

  for (let i = 0; i < d.time.length; i++) {
    const high = d.temperature_2m_max[i];
    const low = d.temperature_2m_min[i];
    const precip = d.precipitation_sum[i];
    const humidity = d.relative_humidity_2m_mean[i];
    const sun = d.sunshine_duration[i];
    // A day missing any core field is dropped rather than zero-filled — a zero would
    // silently drag the normals down.
    if (high == null || low == null || precip == null) continue;

    const [y, m, dd] = d.time[i].split("-").map(Number);
    rows.push({
      year: y,
      month: m,
      day: dd,
      highF: high,
      lowF: low,
      precipIn: precip,
      humidityPct: humidity ?? Number.NaN,
      sunHours: sun == null ? Number.NaN : sun / 3600,
    });
  }

  const expected = 3653; // 2015-2024 inclusive, two leap years
  if (rows.length < expected * 0.95) {
    throw new Error(`climate ${label}: only ${rows.length} usable days of an expected ${expected}`);
  }
  return rows;
}

async function fetchSst(lat: number, lon: number, label: string): Promise<Map<number, number[]>> {
  const url =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
    `&start_date=${ARCHIVE_START}&end_date=${ARCHIVE_END}` +
    `&daily=sea_surface_temperature_max&timezone=auto&temperature_unit=fahrenheit`;

  const data = (await fetchJson(url, `sst ${label}`)) as {
    daily: { time: string[]; sea_surface_temperature_max: (number | null)[] };
  };

  const byMonth = new Map<number, number[]>();
  const d = data.daily;
  for (let i = 0; i < d.time.length; i++) {
    const v = d.sea_surface_temperature_max[i];
    if (v == null) continue;
    const m = Number(d.time[i].slice(5, 7));
    const list = byMonth.get(m) ?? [];
    list.push(v);
    byMonth.set(m, list);
  }
  if (byMonth.size < 12) {
    throw new Error(`sst ${label}: only ${byMonth.size} months returned data`);
  }
  return byMonth;
}

function buildClimate(
  destinationId: string,
  rows: DailyRow[],
  sst: Map<number, number[]> | null,
): ClimateRecord {
  // --- day-of-year normals ------------------------------------------------
  const buckets: DailyRow[][] = Array.from({ length: 366 }, () => []);
  for (const r of rows) buckets[leapIndex(r.month, r.day)].push(r);

  const daily = {
    highF: [] as number[],
    lowF: [] as number[],
    precipIn: [] as number[],
    rainDayPct: [] as number[],
    humidityPct: [] as number[],
    sunHours: [] as number[],
  };

  for (let i = 0; i < 366; i++) {
    const w = window(buckets, i, SMOOTH_RADIUS);
    if (w.length === 0) throw new Error(`${destinationId}: no observations near day index ${i}`);

    const humid = w.map((r) => r.humidityPct).filter((n) => !Number.isNaN(n));
    const sun = w.map((r) => r.sunHours).filter((n) => !Number.isNaN(n));

    daily.highF.push(round(mean(w.map((r) => r.highF))));
    daily.lowF.push(round(mean(w.map((r) => r.lowF))));
    daily.precipIn.push(round(mean(w.map((r) => r.precipIn)), 3));
    daily.rainDayPct.push(round((w.filter((r) => r.precipIn >= RAIN_THRESHOLD_IN).length / w.length) * 100));
    daily.humidityPct.push(humid.length ? round(mean(humid)) : 0);
    daily.sunHours.push(sun.length ? round(mean(sun)) : 0);
  }

  // --- monthly normals ----------------------------------------------------
  const monthly: ClimateMonth[] = [];
  for (let m = 1; m <= 12; m++) {
    const inMonth = rows.filter((r) => r.month === m);
    if (inMonth.length === 0) throw new Error(`${destinationId}: no observations in month ${m}`);

    // Precipitation and rain-day counts are per-month totals averaged across years,
    // not daily means, so the figure reads as "what a typical March delivers".
    const years = [...new Set(inMonth.map((r) => r.year))];
    const monthTotals = years.map((y) => {
      const yr = inMonth.filter((r) => r.year === y);
      return {
        precip: yr.reduce((a, r) => a + r.precipIn, 0),
        rainDays: yr.filter((r) => r.precipIn >= RAIN_THRESHOLD_IN).length,
      };
    });

    const humid = inMonth.map((r) => r.humidityPct).filter((n) => !Number.isNaN(n));
    const sun = inMonth.map((r) => r.sunHours).filter((n) => !Number.isNaN(n));
    const sstVals = sst?.get(m);

    monthly.push({
      month: m,
      highF: round(mean(inMonth.map((r) => r.highF))),
      lowF: round(mean(inMonth.map((r) => r.lowF))),
      precipIn: round(mean(monthTotals.map((t) => t.precip)), 2),
      rainDays: round(mean(monthTotals.map((t) => t.rainDays))),
      humidityPct: humid.length ? round(mean(humid)) : 0,
      sunHours: sun.length ? round(mean(sun)) : 0,
      sstF: sstVals && sstVals.length ? round(mean(sstVals)) : null,
    });
  }

  return {
    destinationId,
    source: {
      source: "Open-Meteo historical reanalysis archive (ERA5)",
      url: "https://open-meteo.com/en/docs/historical-weather-api",
      verifiedOn: today,
      tier: "objective",
      note: `${PERIOD_LABEL} normals; day-of-year values smoothed over a ±${SMOOTH_RADIUS} day window`,
    },
    sstSource: sst
      ? {
          source: "Open-Meteo marine archive — daily maximum sea surface temperature",
          url: "https://open-meteo.com/en/docs/marine-weather-api",
          verifiedOn: today,
          tier: "objective",
          note: `${PERIOD_LABEL} monthly means of the daily maximum, so it runs slightly warm against a 24-hour mean`,
        }
      : null,
    daily,
    monthly,
  };
}

// ---------------------------------------------------------------------------
// Holidays
// ---------------------------------------------------------------------------

const COUNTRY_CODES: Record<string, string> = {
  Vietnam: "VN",
  Thailand: "TH",
  Philippines: "PH",
  Indonesia: "ID",
  Japan: "JP",
  Singapore: "SG",
  Sweden: "SE",
  Portugal: "PT",
  Spain: "ES",
  Italy: "IT",
  Mexico: "MX",
  "United States": "US",
  "United Arab Emirates": "AE",
  Morocco: "MA",
  "South Africa": "ZA",
  Maldives: "MV",
};

export interface HolidayEntry {
  date: string;
  name: string;
  localName: string;
}

interface HolidayFile {
  source: { source: string; url: string; verifiedOn: string; note: string };
  /** ISO country code -> holidays, sorted by date. */
  byCountry: Record<string, HolidayEntry[]>;
  /** Countries in the catalog that Nager.Date does not cover. Surfaced in the UI, not hidden. */
  unsupportedCountries: string[];
}

async function buildHolidays(): Promise<HolidayFile> {
  const supported = new Set(
    (
      (await fetchJson("https://date.nager.at/api/v3/AvailableCountries", "holiday countries")) as {
        countryCode: string;
      }[]
    ).map((c) => c.countryCode),
  );

  const byCountry: Record<string, HolidayEntry[]> = {};
  const unsupported: string[] = [];

  for (const [country, code] of Object.entries(COUNTRY_CODES)) {
    if (!supported.has(code)) {
      unsupported.push(country);
      continue;
    }
    const all: HolidayEntry[] = [];
    for (const year of HOLIDAY_YEARS) {
      const list = (await fetchJson(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/${code}`,
        `holidays ${code} ${year}`,
      )) as { date: string; name: string; localName: string }[];
      all.push(...list.map((h) => ({ date: h.date, name: h.name, localName: h.localName })));
      await sleep(120);
    }
    byCountry[code] = all.sort((a, b) => a.date.localeCompare(b.date));
    console.log(`  holidays ${code}: ${all.length} across ${HOLIDAY_YEARS.join(", ")}`);
  }

  if (unsupported.length) {
    console.log(`  not covered by Nager.Date: ${unsupported.join(", ")}`);
  }

  return {
    source: {
      source: "Nager.Date public holiday API",
      url: "https://date.nager.at",
      verifiedOn: today,
      note: `National public holidays for ${HOLIDAY_YEARS.join(", ")}. Regional and observance-only days are not included.`,
    },
    byCountry,
    unsupportedCountries: unsupported,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const force = process.argv.includes("--force");
  const climateDir = path.join(OUT_DIR, "climate");
  await mkdir(climateDir, { recursive: true });

  console.log(`Building reference data for ${DESTINATIONS.length} destinations (${PERIOD_LABEL})\n`);

  for (const d of DESTINATIONS) {
    const outPath = path.join(climateDir, `${d.id}.json`);
    if (!force && existsSync(outPath)) {
      console.log(`  ${d.id.padEnd(16)}already built (use --force to refetch)`);
      continue;
    }
    process.stdout.write(`  ${d.id.padEnd(16)}`);
    const rows = await fetchDaily(d.lat, d.lon, d.id);
    await sleep(2000);

    let sst: Map<number, number[]> | null = null;
    if (d.coastal) {
      sst = await fetchSst(d.lat, d.lon, d.id);
      await sleep(2000);
    }

    const record = buildClimate(d.id, rows, sst);
    await writeFile(outPath, JSON.stringify(record), "utf8");

    const jan = record.monthly[0];
    const jul = record.monthly[6];
    console.log(
      `${rows.length} days  |  Jan ${jan.highF}/${jan.lowF}°F  Jul ${jul.highF}/${jul.lowF}°F` +
        (sst ? `  |  sea ${jan.sstF}–${jul.sstF}°F` : ""),
    );
  }

  // The home-city baseline that powers the "compared with New York" context in the
  // climate views. Not a destination — it is never ranked.
  const nycPath = path.join(climateDir, `${NYC_REFERENCE.id}.json`);
  if (force || !existsSync(nycPath)) {
    process.stdout.write(`  ${NYC_REFERENCE.id.padEnd(16)}`);
    const rows = await fetchDaily(NYC_REFERENCE.lat, NYC_REFERENCE.lon, NYC_REFERENCE.id);
    const record = buildClimate(NYC_REFERENCE.id, rows, null);
    await writeFile(nycPath, JSON.stringify(record), "utf8");
    console.log(`${rows.length} days  |  Jan ${record.monthly[0].highF}/${record.monthly[0].lowF}°F`);
  } else {
    console.log(`  ${NYC_REFERENCE.id.padEnd(16)}already built (use --force to refetch)`);
  }

  // A static import map, so the app never touches the filesystem at request time and
  // the bundler can see exactly which climate files are reachable.
  const ids = [...DESTINATIONS.map((d) => d.id), NYC_REFERENCE.id];
  const varName = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "_");
  await writeFile(
    path.join(OUT_DIR, "climate-index.ts"),
    [
      "// GENERATED by scripts/build-reference-data.ts — do not edit by hand.",
      'import type { ClimateRecord } from "@/lib/domain/types";',
      "",
      ...ids.map((id) => `import ${varName(id)} from "./climate/${id}.json";`),
      "",
      "export const CLIMATE_RECORDS: Record<string, ClimateRecord> = {",
      ...ids.map((id) => `  "${id}": ${varName(id)} as unknown as ClimateRecord,`),
      "};",
      "",
      `export const NYC_REFERENCE_ID = "${NYC_REFERENCE.id}";`,
      "",
    ].join("\n"),
    "utf8",
  );

  console.log("\nHolidays:");
  const holidays = await buildHolidays();
  await writeFile(path.join(OUT_DIR, "holidays.json"), JSON.stringify(holidays), "utf8");

  await writeFile(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(
      {
        generatedOn: today,
        climatePeriod: PERIOD_LABEL,
        destinations: DESTINATIONS.length,
        coastalDestinations: DESTINATIONS.filter((d) => d.coastal).length,
        sources: [
          "Open-Meteo historical reanalysis archive (ERA5)",
          "Open-Meteo marine archive",
          "Nager.Date public holiday API",
        ],
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`\nDone. Wrote ${DESTINATIONS.length} climate files + holidays to src/data/generated/`);
}

main().catch((err) => {
  console.error(`\nFAILED: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
