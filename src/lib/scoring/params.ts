import type {
  Alliance,
  CandidateStatus,
  ComparisonPreferences,
  Origin,
  RainTolerance,
} from "@/lib/domain/types";
import { ALLIANCES, CATEGORY_KEYS, ORIGINS } from "@/lib/domain/types";
import { DEFAULT_PREFERENCES } from "./engine";
import { addDays, isValidDate, nightsBetween, today } from "@/lib/dates";

/**
 * Comparison state lives in the URL.
 *
 * That makes a comparison a thing you can bookmark, send to yourself, or come back to in
 * six months and reproduce exactly — which matters, because a ranking is only as useful
 * as your ability to see what inputs produced it.
 */

export type SearchParams = Record<string, string | string[] | undefined>;

function one(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

function many(params: SearchParams, key: string): string[] {
  const v = params[key];
  const raw = Array.isArray(v) ? v : v === undefined ? [] : [v];
  return [...new Set(raw.flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean))];
}

function num(params: SearchParams, key: string, fallback: number, lo: number, hi: number): number {
  const raw = one(params, key);
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

export interface ComparisonQuery {
  startDate: string;
  endDate: string;
  destinationIds: string[];
  preferences: ComparisonPreferences;
}

/** Sensible default window: a ten-night trip about five months out. */
export function defaultDates(): { startDate: string; endDate: string } {
  const startDate = addDays(today(), 150);
  return { startDate, endDate: addDays(startDate, 10) };
}

export function parseComparisonQuery(
  params: SearchParams,
  base: ComparisonPreferences = DEFAULT_PREFERENCES,
): ComparisonQuery {
  const fallback = defaultDates();
  const rawStart = one(params, "start");
  const rawEnd = one(params, "end");

  const startDate = rawStart && isValidDate(rawStart) ? rawStart : fallback.startDate;
  let endDate = rawEnd && isValidDate(rawEnd) ? rawEnd : fallback.endDate;
  // An end before the start would make every window calculation nonsense downstream.
  if (nightsBetween(startDate, endDate) < 1) endDate = addDays(startDate, 1);

  // Accepts both shapes: `dest=a,b` from a shared link, and `dest=a&dest=b` from the
  // checkbox form, which is what a browser submits without any JavaScript involved.
  const destinationIds = many(params, "dest");

  const rain = one(params, "rain");
  const rainTolerance: RainTolerance =
    rain === "low" || rain === "medium" || rain === "high" ? rain : base.rainTolerance;

  const weights = { ...base.weights };
  for (const key of CATEGORY_KEYS) {
    weights[key] = num(params, `w_${key}`, base.weights[key], 0, 5);
  }

  const exclusions = many(params, "exclude");

  return {
    startDate,
    endDate,
    destinationIds,
    preferences: {
      origins: originList(params, base.origins),
      alliances: allianceList(params, base.alliances),
      airlines: many(params, "airlines").map((c) => c.toUpperCase()),
      maxTravelHours: num(params, "maxHours", base.maxTravelHours, 2, 40),
      idealHighF: num(params, "idealHigh", base.idealHighF, 20, 105),
      rainTolerance,
      beachImportance: num(params, "beach", base.beachImportance, 0, 5),
      cityVsResort: num(params, "cityResort", base.cityVsResort, -2, 2),
      activityLevel: num(params, "activity", base.activityLevel, 0, 5),
      crowdTolerance: num(params, "crowds", base.crowdTolerance, 0, 5),
      hotelBudgetUSD: num(params, "budget", base.hotelBudgetUSD, 40, 3000),
      exclusions: exclusions.length ? exclusions : base.exclusions,
      weights,
    },
  };
}

/**
 * Airports in the order given. `many` preserves insertion order while de-duplicating, and
 * that order is the traveller's preference — so it must survive the round trip.
 */
function originList(params: SearchParams, fallback: Origin[]): Origin[] {
  const raw = many(params, "from")
    .map((v) => v.toUpperCase())
    .filter((v): v is Origin => (ORIGINS as readonly string[]).includes(v));
  return raw.length > 0 ? raw : fallback;
}

function allianceList(params: SearchParams, fallback: Alliance[]): Alliance[] {
  const raw = many(params, "alliances")
    .map((v) => v.toLowerCase())
    .filter((v): v is Alliance => (ALLIANCES as readonly string[]).includes(v));
  return raw.length > 0 ? raw : fallback;
}

export function comparisonQueryString(query: ComparisonQuery): string {
  const p = query.preferences;
  const search = new URLSearchParams({
    start: query.startDate,
    end: query.endDate,
    from: p.origins.join(","),
    maxHours: String(p.maxTravelHours),
    idealHigh: String(p.idealHighF),
    rain: p.rainTolerance,
    beach: String(p.beachImportance),
    cityResort: String(p.cityVsResort),
    activity: String(p.activityLevel),
    crowds: String(p.crowdTolerance),
    budget: String(p.hotelBudgetUSD),
  });
  if (p.alliances.length > 0) search.set("alliances", p.alliances.join(","));
  if (p.airlines.length > 0) search.set("airlines", p.airlines.join(","));
  if (query.destinationIds.length) search.set("dest", query.destinationIds.join(","));
  if (p.exclusions.length) search.set("exclude", p.exclusions.join(","));
  for (const key of CATEGORY_KEYS) search.set(`w_${key}`, String(p.weights[key]));
  return search.toString();
}

/** Candidate statuses that mean "still in the running". */
export const ACTIVE_CANDIDATE_STATUSES: CandidateStatus[] = ["considering", "shortlisted", "selected"];
