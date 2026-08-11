import type { Destination, DateWindowClimate } from "@/lib/domain/types";
import { datesInRange, daysUntil, isValidDate } from "@/lib/dates";
import { dateWindowClimate } from "./index";

/*
 * Forecasts.
 *
 * The rule this file exists to enforce (ADR 0012): a forecast is a DIFFERENT KIND OF CLAIM
 * from a normal, and the two are never merged. There is deliberately no function here that
 * returns "the temperature" — every entry point returns something explicitly typed as a
 * forecast, or null. A caller that wants a number for a date still gets it from
 * `dateWindowClimate`, which only ever speaks about normals.
 *
 * Nothing here is imported by the scoring engine, and nothing here should ever be. Rankings
 * must be reproducible from their URL whether run today or next year (ADR 0002).
 */

/** Open-Meteo's practical useful range. Beyond this a forecast is not worth showing. */
export const FORECAST_HORIZON_DAYS = 16;

export interface ForecastDay {
  date: string;
  highF: number;
  lowF: number;
  precipIn: number;
  /** Probability of precipitation, 0-100. */
  rainChancePct: number;
  /** WMO weather code, for a plain-language summary. */
  weatherCode: number;
}

/**
 * How much to trust this. Forecast skill decays with lead time; past about ten days a
 * daily forecast carries little more information than the normal does.
 */
export type ForecastConfidence = "high" | "moderate" | "low";

export interface Forecast {
  destinationId: string;
  days: ForecastDay[];
  /** When the model ran. A forecast without this is not a forecast, it is a rumour. */
  issuedAt: string;
  model: string;
  /** Lead time in days to the first forecast date. */
  leadDays: number;
  confidence: ForecastConfidence;
}

/**
 * How a forecast compares with what the date normally looks like.
 *
 * This is the reason to show both. "84 °F" means little; "6 degrees warmer than late March
 * usually is" is the thing worth knowing, and it is only expressible with both readings
 * present.
 */
export interface ForecastVsNormal {
  forecast: Forecast;
  normal: DateWindowClimate;
  highDeltaF: number;
  rainDeltaDays: number;
  /** Whether the difference is large enough to be worth mentioning. */
  notable: boolean;
  summary: string;
}

export function confidenceFor(leadDays: number): ForecastConfidence {
  if (leadDays <= 3) return "high";
  if (leadDays <= 9) return "moderate";
  return "low";
}

/**
 * Is a forecast meaningful for these dates yet?
 *
 * Exported so callers can ask before fetching, and so the UI can explain *why* there is no
 * forecast rather than just showing an empty panel.
 */
export function forecastAvailability(
  startDate: string,
  endDate: string,
  today?: string,
): { available: boolean; leadDays: number; reason: string | null } {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return { available: false, leadDays: 0, reason: "Trip dates are not set." };
  }

  const leadDays = daysUntil(startDate, today);

  if (daysUntil(endDate, today) < 0) {
    return { available: false, leadDays, reason: "These dates have passed." };
  }
  if (leadDays > FORECAST_HORIZON_DAYS) {
    return {
      available: false,
      leadDays,
      reason: `Departure is ${leadDays} days away. Forecasts only mean anything inside ${FORECAST_HORIZON_DAYS} days — until then the normals below are the better guide.`,
    };
  }
  return { available: true, leadDays: Math.max(0, leadDays), reason: null };
}

const OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast";

/**
 * Fetch a forecast for a destination over a date range.
 *
 * Returns null when the dates are outside the horizon — never a normal dressed up as a
 * forecast. Throws when the request itself fails, so a network problem surfaces rather
 * than silently degrading into a normal (which would be indistinguishable on screen from
 * a forecast that happened to match).
 */
export async function fetchForecast(
  destination: Destination,
  startDate: string,
  endDate: string,
  options: { today?: string; signal?: AbortSignal } = {},
): Promise<Forecast | null> {
  const availability = forecastAvailability(startDate, endDate, options.today);
  if (!availability.available) return null;

  const url = new URL(OPEN_METEO_FORECAST);
  url.searchParams.set("latitude", String(destination.lat));
  url.searchParams.set("longitude", String(destination.lon));
  url.searchParams.set("timezone", destination.timezone);
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("precipitation_unit", "inch");
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", clampToHorizon(endDate, options.today));
  url.searchParams.set(
    "daily",
    [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "precipitation_probability_max",
      "weather_code",
    ].join(","),
  );

  const response = await fetch(url, { signal: options.signal });
  if (!response.ok) {
    throw new Error(
      `Forecast request for ${destination.id} failed: ${response.status} ${response.statusText}`,
    );
  }

  const body = (await response.json()) as {
    daily?: {
      time: string[];
      temperature_2m_max: (number | null)[];
      temperature_2m_min: (number | null)[];
      precipitation_sum: (number | null)[];
      precipitation_probability_max: (number | null)[];
      weather_code: (number | null)[];
    };
  };

  const daily = body.daily;
  if (!daily || !Array.isArray(daily.time) || daily.time.length === 0) {
    throw new Error(`Forecast response for ${destination.id} contained no daily series`);
  }

  const days: ForecastDay[] = [];
  for (let i = 0; i < daily.time.length; i++) {
    const highF = daily.temperature_2m_max[i];
    const lowF = daily.temperature_2m_min[i];
    // A day missing its temperatures is dropped rather than defaulted — a zero here would
    // read as a real reading.
    if (highF == null || lowF == null) continue;

    days.push({
      date: daily.time[i],
      highF: round(highF),
      lowF: round(lowF),
      precipIn: round(daily.precipitation_sum[i] ?? 0, 2),
      rainChancePct: Math.round(daily.precipitation_probability_max[i] ?? 0),
      weatherCode: daily.weather_code[i] ?? 0,
    });
  }

  if (days.length === 0) {
    throw new Error(`Forecast response for ${destination.id} had no usable days`);
  }

  return {
    destinationId: destination.id,
    days,
    issuedAt: new Date().toISOString(),
    model: "Open-Meteo forecast API",
    leadDays: availability.leadDays,
    confidence: confidenceFor(availability.leadDays),
  };
}

/** Trim a range to the forecast horizon, so we never ask for days the model cannot answer. */
function clampToHorizon(endDate: string, today?: string): string {
  const lead = daysUntil(endDate, today);
  if (lead <= FORECAST_HORIZON_DAYS) return endDate;
  const dates = datesInRange(
    todayString(today),
    endDate,
  );
  return dates[Math.min(FORECAST_HORIZON_DAYS, dates.length - 1)];
}

function todayString(today?: string): string {
  return today ?? new Date().toISOString().slice(0, 10);
}

const round = (n: number, dp = 1) => Number(n.toFixed(dp));

/**
 * Set a forecast against the normal for the same dates.
 *
 * Both readings are kept whole on the result. Nothing here averages them together — the
 * comparison is the point, and a merged number would have no honest label (ADR 0012).
 */
export function compareForecastWithNormal(
  destination: Destination,
  forecast: Forecast,
): ForecastVsNormal {
  const startDate = forecast.days[0].date;
  const endDate = forecast.days[forecast.days.length - 1].date;
  const normal = dateWindowClimate(destination, startDate, endDate);

  const forecastHigh = mean(forecast.days.map((d) => d.highF));
  const forecastRainDays = forecast.days.reduce((a, d) => a + d.rainChancePct, 0) / 100;

  const highDeltaF = round(forecastHigh - normal.avgHighF);
  const rainDeltaDays = round(forecastRainDays - normal.expectedRainDays);

  // Thresholds are the point at which a traveller would pack differently.
  const notable = Math.abs(highDeltaF) >= 5 || Math.abs(rainDeltaDays) >= 2;

  return {
    forecast,
    normal,
    highDeltaF,
    rainDeltaDays,
    notable,
    summary: summarise(highDeltaF, rainDeltaDays, notable, forecast.confidence),
  };
}

function summarise(
  highDeltaF: number,
  rainDeltaDays: number,
  notable: boolean,
  confidence: ForecastConfidence,
): string {
  if (!notable) {
    return "The forecast is close to what these dates normally look like.";
  }

  const parts: string[] = [];
  if (Math.abs(highDeltaF) >= 5) {
    parts.push(`${Math.abs(highDeltaF)}°F ${highDeltaF > 0 ? "warmer" : "cooler"} than usual`);
  }
  if (Math.abs(rainDeltaDays) >= 2) {
    parts.push(
      `${Math.abs(rainDeltaDays)} ${rainDeltaDays > 0 ? "more" : "fewer"} wet days than usual`,
    );
  }

  const hedge =
    confidence === "high"
      ? "Pack for it."
      : confidence === "moderate"
        ? "Worth watching as it firms up."
        : "Low confidence at this range — treat it as a hint, not a plan.";

  return `Currently forecast ${parts.join(" and ")}. ${hedge}`;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** WMO weather codes, grouped to the distinctions a traveller actually cares about. */
export function describeWeatherCode(code: number): string {
  if (code === 0) return "clear";
  if (code <= 2) return "mostly sunny";
  if (code === 3) return "overcast";
  if (code <= 48) return "fog";
  if (code <= 57) return "drizzle";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "showers";
  if (code <= 86) return "snow showers";
  return "thunderstorms";
}
