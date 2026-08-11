/**
 * Reads the generated climate normals and answers questions about specific dates.
 *
 * The distinction that matters here (Phase 3): everything below is a NORMAL — what a
 * date has historically looked like over 2015-2024. It is not a forecast and must never
 * be presented as one. Forecasts live in ./forecast.ts and only surface when a trip is
 * close enough for them to mean anything.
 */

import { CLIMATE_RECORDS } from "@/data/generated/climate-index";
import { HOME } from "@/data/home";
import type { ClimateMonth, ClimateRecord, DateWindowClimate, Destination } from "@/lib/domain/types";
import { datesInRange, leapDayIndexOf, monthOf } from "@/lib/dates";
import { solarDay, utcOffsetHours } from "./solar";

export function climateFor(destinationId: string): ClimateRecord {
  const record = CLIMATE_RECORDS[destinationId];
  if (!record) {
    throw new Error(
      `No climate data for "${destinationId}". Run \`npm run build:data\` after adding a destination.`,
    );
  }
  return record;
}

/** Climate at the traveller's home base, for the "compared with home" context. */
export function homeClimate(): ClimateRecord {
  return climateFor(HOME.climateReferenceId);
}

export function monthClimate(destinationId: string, month: number): ClimateMonth {
  const m = climateFor(destinationId).monthly.find((x) => x.month === month);
  if (!m) throw new Error(`No climate for month ${month} of "${destinationId}"`);
  return m;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round = (n: number, dp = 1) => Number(n.toFixed(dp));

/**
 * Aggregate the normals across the exact dates of a trip.
 *
 * Daily values are per-day expectations, so summing precipitation across the window
 * gives the rain a typical trip of those dates would see, and summing rain-day
 * probabilities gives the expected count of wet days.
 */
export function dateWindowClimate(
  destination: Destination,
  startDate: string,
  endDate: string,
): DateWindowClimate {
  const record = climateFor(destination.id);
  const dates = datesInRange(startDate, endDate);
  const idx = dates.map(leapDayIndexOf);
  const { daily } = record;

  const highs = idx.map((i) => daily.highF[i]);
  const lows = idx.map((i) => daily.lowF[i]);

  const offset = utcOffsetHours(destination.timezone, startDate);
  const sun = dates.map((d) => solarDay(d, destination.lat, destination.lon, offset));
  const first = sun[0];

  // Sea temperature is monthly, so weight each month by how many trip days fall in it.
  let sstF: number | null = null;
  const monthDays = new Map<number, number>();
  for (const d of dates) monthDays.set(monthOf(d), (monthDays.get(monthOf(d)) ?? 0) + 1);
  const sstParts: { value: number; weight: number }[] = [];
  for (const [month, count] of monthDays) {
    const v = record.monthly.find((m) => m.month === month)?.sstF;
    if (v != null) sstParts.push({ value: v, weight: count });
  }
  if (sstParts.length > 0) {
    const totalWeight = sstParts.reduce((a, p) => a + p.weight, 0);
    sstF = round(sstParts.reduce((a, p) => a + p.value * p.weight, 0) / totalWeight);
  }

  return {
    startDate,
    endDate,
    days: dates.length,
    avgHighF: round(mean(highs)),
    avgLowF: round(mean(lows)),
    warmestHighF: round(Math.max(...highs)),
    coolestLowF: round(Math.min(...lows)),
    totalPrecipIn: round(idx.reduce((a, i) => a + daily.precipIn[i], 0), 2),
    expectedRainDays: round(idx.reduce((a, i) => a + daily.rainDayPct[i], 0) / 100),
    avgHumidityPct: round(mean(idx.map((i) => daily.humidityPct[i]))),
    avgSunHours: round(mean(idx.map((i) => daily.sunHours[i]))),
    avgDaylightHours: round(mean(sun.map((s) => s.daylightHours))),
    sunriseFirstDay: first.sunrise ?? (first.polarDay ? "always up" : "never rises"),
    sunsetFirstDay: first.sunset ?? (first.polarDay ? "always up" : "never rises"),
    sstF,
  };
}

/**
 * How the destination's conditions compare with home over the same dates — the context
 * that makes an unfamiliar number legible. "84 °F" means little; "26 degrees warmer than
 * home" means a great deal.
 *
 * Home is a parameter (`src/data/home.ts`), not a constant scattered through this file.
 */
export interface HomeComparison {
  highDeltaF: number;
  daylightDeltaHours: number;
  rainDeltaDays: number;
  homeHighF: number;
  homeDaylightHours: number;
  homeRainDays: number;
}

export function compareWithHome(
  destination: Destination,
  startDate: string,
  endDate: string,
): HomeComparison {
  const there = dateWindowClimate(destination, startDate, endDate);
  const dates = datesInRange(startDate, endDate);
  const idx = dates.map(leapDayIndexOf);
  const home = homeClimate().daily;

  const homeOffset = utcOffsetHours(HOME.timezone, startDate);
  const homeDaylight = mean(
    dates.map((d) => solarDay(d, HOME.lat, HOME.lon, homeOffset).daylightHours),
  );
  const homeHigh = mean(idx.map((i) => home.highF[i]));
  const homeRainDays = idx.reduce((a, i) => a + home.rainDayPct[i], 0) / 100;

  return {
    highDeltaF: round(there.avgHighF - homeHigh),
    daylightDeltaHours: round(there.avgDaylightHours - homeDaylight),
    rainDeltaDays: round(there.expectedRainDays - homeRainDays),
    homeHighF: round(homeHigh),
    homeDaylightHours: round(homeDaylight),
    homeRainDays: round(homeRainDays),
  };
}

/**
 * Plain-language reading of what the conditions mean for actually being there.
 *
 * These are interpretations of measured values, not measurements — kept in one place
 * and labelled as such wherever they surface.
 */
export interface ConditionReading {
  sightseeing: string;
  beach: string;
  outdoorDining: string;
  daylight: string;
}

export function interpretConditions(
  destination: Destination,
  climate: DateWindowClimate,
): ConditionReading {
  const { avgHighF, avgLowF, avgHumidityPct, expectedRainDays, days, sstF, avgDaylightHours } = climate;
  const rainShare = expectedRainDays / days;

  // Sightseeing — heat and humidity compound, so a humid 88 reads worse than a dry 95.
  const muggy = avgHighF >= 84 && avgHumidityPct >= 70;
  let sightseeing: string;
  if (avgHighF >= 97) {
    sightseeing = "Too hot for daytime sightseeing. Plan early mornings and evenings, with the middle of the day indoors.";
  } else if (muggy) {
    sightseeing = "Hot and humid. Two or three hours out at a time is realistic; build in air-conditioned breaks.";
  } else if (avgHighF >= 78) {
    sightseeing = "Comfortable for full days out, with a hat and an afternoon pause.";
  } else if (avgHighF >= 60) {
    sightseeing = "Ideal walking weather — all-day sightseeing without heat or cold as a factor.";
  } else if (avgHighF >= 45) {
    sightseeing = "Cool. Fine for walking in a coat, but outdoor time will be shorter than you plan for.";
  } else {
    sightseeing = "Cold. Expect to structure days around indoor stops rather than wandering.";
  }
  if (rainShare >= 0.5) {
    sightseeing += " Rain on roughly half the days means you need indoor alternatives ready.";
  }

  // Beach.
  let beach: string;
  if (!destination.coastal) {
    beach = "No beach — this is an inland destination.";
  } else if (sstF == null) {
    beach = "Sea temperature is not available for this location.";
  } else if (sstF >= 80 && avgHighF >= 80 && rainShare < 0.4) {
    beach = `Excellent. ${sstF} °F water and reliable sun — swimming is comfortable all day.`;
  } else if (sstF >= 78) {
    beach = `Water is warm at ${sstF} °F, but ${rainShare >= 0.4 ? "frequent rain will interrupt beach days" : "cooler air limits how long you will want to stay out"}.`;
  } else if (sstF >= 70) {
    beach = `At ${sstF} °F the water is swimmable but bracing — expect short swims rather than lounging in the sea.`;
  } else {
    beach = `At ${sstF} °F the water is too cold for casual swimming.`;
  }

  // Outdoor dining — the evening low is what governs this, not the daytime high.
  let outdoorDining: string;
  if (avgLowF >= 68 && rainShare < 0.4) {
    outdoorDining = "Warm evenings — outdoor dining works every night without a jacket.";
  } else if (avgLowF >= 58) {
    outdoorDining = "Pleasant evenings, though you will want a layer after dark.";
  } else if (avgLowF >= 45) {
    outdoorDining = "Cool evenings. Terraces will need heaters; most dinners will be indoors.";
  } else {
    outdoorDining = "Too cold to eat outside.";
  }

  // Daylight.
  let daylight: string;
  if (avgDaylightHours >= 14) {
    daylight = `${avgDaylightHours} hours of daylight — long evenings and plenty of room in the day.`;
  } else if (avgDaylightHours >= 11) {
    daylight = `${avgDaylightHours} hours of daylight — a normal-feeling day.`;
  } else if (avgDaylightHours >= 9) {
    daylight = `${avgDaylightHours} hours of daylight. Dark by late afternoon, so plan the outdoor half of the day first.`;
  } else {
    daylight = `Only ${avgDaylightHours} hours of daylight. This materially shortens what you can see in a day.`;
  }

  return { sightseeing, beach, outdoorDining, daylight };
}
