/**
 * The destination comparison engine (Phase 2).
 *
 * Design commitments:
 *
 *  - DETERMINISTIC. The same inputs always produce the same ranking. No model is in the
 *    loop, so a score can be argued with rather than merely trusted.
 *  - AUDITABLE. Every category score decomposes into named factors carrying their own
 *    value, sub-score and weight. Nothing contributes to a total without being shown.
 *  - BOUNDED TO REAL DESTINATIONS. Only entries in the curated catalog are ever ranked.
 *    This is the guard against the failure we hit doing this by hand: ranking European
 *    cities in January by temperature alone and surfacing places nobody wants to visit
 *    then. A destination that is warm but seasonally wrong scores badly here, because
 *    seasonal suitability, daylight and crowding are first-class inputs, not footnotes.
 */

import type {
  CategoryKey,
  CategoryScore,
  ComparisonPreferences,
  Confidence,
  DataWarning,
  DateWindowClimate,
  Destination,
  DestinationScore,
  ScoreFactor,
  Season,
} from "@/lib/domain/types";
import { CATEGORY_KEYS } from "@/lib/domain/types";
import type { SelectedRoute } from "@/lib/domain/types";
import { dateWindowClimate } from "@/lib/climate";
import { holidaysDuring } from "@/lib/holidays";
import { selectRoute } from "@/lib/routes";
import { daysUntil, monthOf, monthsInRange, nightsBetween, datesInRange, parseDate, today } from "@/lib/dates";
import { buildNarrative, assignBestFor } from "./narrative";
import { HOME_AIRPORTS } from "@/lib/config/home";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n: number, dp = 0) => Number(n.toFixed(dp));

/** Combine weighted factors into a single 0-100 category score. */
function combine(key: CategoryKey, factors: ScoreFactor[]): CategoryScore {
  const total = factors.reduce((a, f) => a + f.weight, 0);
  if (Math.abs(total - 1) > 0.001) {
    throw new Error(`Factor weights for "${key}" sum to ${total.toFixed(3)}, expected 1`);
  }
  return {
    key,
    score: round(factors.reduce((a, f) => a + f.score * f.weight, 0)),
    factors,
  };
}

/** Days of the trip falling in each calendar month, used to weight monthly figures. */
function monthWeights(startDate: string, endDate: string): Map<number, number> {
  const counts = new Map<number, number>();
  for (const d of datesInRange(startDate, endDate)) {
    counts.set(monthOf(d), (counts.get(monthOf(d)) ?? 0) + 1);
  }
  return counts;
}

function weightedByMonth(weights: Map<number, number>, valueFor: (month: number) => number): number {
  let sum = 0;
  let total = 0;
  for (const [month, days] of weights) {
    sum += valueFor(month) * days;
    total += days;
  }
  return sum / total;
}

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

function scoreWeather(
  destination: Destination,
  climate: DateWindowClimate,
  prefs: ComparisonPreferences,
): CategoryScore {
  // Temperature: a Gaussian around the traveller's ideal, penalised harder on the hot
  // side. Ten degrees too cold costs you a jumper; ten degrees too hot costs you the
  // middle of every day.
  const delta = climate.avgHighF - prefs.idealHighF;
  const effective = delta > 0 ? delta * 1.25 : Math.abs(delta);
  const tempScore = clamp(100 * Math.exp(-(effective ** 2) / (2 * 12 ** 2)));

  // Rain: what share of the trip's days can be expected to be wet, scaled by tolerance.
  const rainShare = climate.expectedRainDays / climate.days;
  const rainSlope = { low: 165, medium: 120, high: 80 }[prefs.rainTolerance];
  const intensity = climate.totalPrecipIn / climate.days;
  // A wet day in a monsoon is not a wet day in Lisbon; heavy daily totals cost extra.
  const intensityPenalty = intensity > 0.3 ? Math.min(25, (intensity - 0.3) * 45) : 0;
  const rainScore = clamp(100 - rainShare * rainSlope - intensityPenalty);

  // Humidity only bites when it is already warm.
  const humidityScore =
    climate.avgHighF >= 78
      ? clamp(100 - Math.max(0, climate.avgHumidityPct - 58) * 2.1)
      : clamp(92 - Math.max(0, climate.avgHumidityPct - 80));

  const factors: ScoreFactor[] = [
    {
      label: "Daytime temperature",
      value: `${climate.avgHighF}° / ${climate.avgLowF}°F (want ${prefs.idealHighF}°)`,
      score: round(tempScore),
      weight: 0.45,
      tier: "objective",
    },
    {
      label: "Rain",
      value: `${climate.expectedRainDays} wet days of ${climate.days}, ${climate.totalPrecipIn}in total`,
      score: round(rainScore),
      weight: 0.35,
      tier: "objective",
    },
    {
      label: "Humidity",
      value: `${climate.avgHumidityPct}%`,
      score: round(humidityScore),
      weight: 0.2,
      tier: "objective",
    },
  ];

  return combine("weather", factors);
}

// ---------------------------------------------------------------------------
// Seasonal
// ---------------------------------------------------------------------------

function dominantSeason(destination: Destination, weights: Map<number, number>): Season {
  let best: Season = "shoulder";
  let bestDays = -1;
  for (const [month, days] of weights) {
    if (days > bestDays) {
      bestDays = days;
      best = destination.seasons[month - 1];
    }
  }
  return best;
}

function scoreSeasonal(
  destination: Destination,
  prefs: ComparisonPreferences,
  startDate: string,
  endDate: string,
): { category: CategoryScore; season: Season } {
  const weights = monthWeights(startDate, endDate);
  const season = dominantSeason(destination, weights);

  // Curated verdict on whether this is a good time to be here at all.
  const suitability = weightedByMonth(weights, (m) => destination.suitability[m - 1]);
  const suitabilityScore = clamp((suitability / 5) * 100);

  // Crowding. Peak season is only a problem to the extent the traveller minds.
  const crowdBase = weightedByMonth(weights, (m) => {
    const s = destination.seasons[m - 1];
    if (s === "peak") return 34;
    if (s === "shoulder") return 84;
    return 94;
  });
  const crowdScore = clamp(
    crowdBase + (crowdBase < 80 ? (prefs.crowdTolerance / 5) * (95 - crowdBase) : 0),
  );

  // Known seasonal hazards overlapping the trip.
  const tripMonths = monthsInRange(startDate, endDate);
  const hits = destination.risks.filter((r) => r.months.some((m) => tripMonths.includes(m)));
  const penalty = hits.reduce(
    (a, r) => a + { high: 34, moderate: 17, low: 5 }[r.severity],
    0,
  );
  const riskScore = clamp(100 - penalty);

  const factors: ScoreFactor[] = [
    {
      label: "Seasonal suitability",
      value: `${season} season, rated ${round(suitability, 1)}/5`,
      score: round(suitabilityScore),
      weight: 0.45,
      tier: "curated",
    },
    {
      label: "Crowds",
      value: season === "peak" ? "Peak season" : season === "shoulder" ? "Shoulder season" : "Low season",
      score: round(crowdScore),
      weight: 0.25,
      tier: "curated",
    },
    {
      label: "Seasonal risks",
      value: hits.length ? hits.map((h) => h.label.split(" — ")[0]).join("; ") : "None known for these dates",
      score: round(riskScore),
      weight: 0.3,
      tier: "curated",
    },
  ];

  return { category: combine("seasonal", factors), season };
}

// ---------------------------------------------------------------------------
// Travel
// ---------------------------------------------------------------------------

function scoreTravel(
  destination: Destination,
  prefs: ComparisonPreferences,
  nights: number,
  selected: SelectedRoute,
): CategoryScore {
  // Hours now come from the chosen route rather than a single JFK figure, so changing the
  // departure airport actually changes the score instead of just the label.
  const hours = selected.route.typicalTotalHours;

  // Journey length against the traveller's stated ceiling. Comfortably inside is fine;
  // past the ceiling the score falls away sharply rather than tapering.
  const ratio = hours / prefs.maxTravelHours;
  const lengthScore =
    ratio <= 0.5 ? 100 : ratio <= 1 ? clamp(100 - (ratio - 0.5) * 90) : clamp(55 - (ratio - 1) * 130);

  const connections = selected.route.typicalConnections;
  const connectionScore = selected.route.nonstop ? 100 : [88, 70, 45, 25][Math.min(connections, 3)];

  // The figure that decides whether a long-haul beach trip is worth it: how much of the
  // trip is spent travelling. Two 26-hour journeys inside five nights is a third of it.
  const share = (2 * hours) / (nights * 24);
  const shareScore =
    share <= 0.08 ? 100 : share <= 0.2 ? clamp(100 - (share - 0.08) * 375) : clamp(55 - (share - 0.2) * 265);

  const factors: ScoreFactor[] = [
    {
      label: "Journey length",
      value: `~${hours}h each way from ${selected.route.origin} (limit ${prefs.maxTravelHours}h)`,
      score: round(lengthScore),
      weight: 0.35,
      tier: "curated",
    },
    {
      label: "Connections",
      value: selected.route.nonstop
        ? `Nonstop from ${selected.route.origin}${selected.route.seasonal ? ", seasonal" : ""}`
        : `${connections} ${connections === 1 ? "connection" : "connections"} from ${selected.route.origin}`,
      score: round(connectionScore),
      weight: 0.25,
      tier: "curated",
    },
    {
      label: "Travel as a share of the trip",
      value: `${round(share * 100)}% of ${nights} nights`,
      score: round(shareScore),
      weight: 0.25,
      tier: "curated",
    },
    {
      label: "Arrival",
      value: destination.travel.notes,
      score: round((destination.travel.arrivalEase / 5) * 100),
      weight: 0.15,
      tier: "curated",
    },
  ];

  return combine("travel", factors);
}

// ---------------------------------------------------------------------------
// Lodging
// ---------------------------------------------------------------------------

interface LodgingResult {
  category: CategoryScore;
  nightlyUSD: number;
  totalUSD: number;
  tierLabel: string;
}

function scoreLodging(
  destination: Destination,
  prefs: ComparisonPreferences,
  startDate: string,
  endDate: string,
  nights: number,
): LodgingResult {
  const weights = monthWeights(startDate, endDate);
  const seasonMultiplier = weightedByMonth(weights, (m) => {
    const s = destination.seasons[m - 1];
    if (s === "peak") return destination.lodging.peakMultiplier;
    if (s === "low") return destination.lodging.lowMultiplier;
    return 1;
  });

  const fourStar = destination.lodging.fourStarUSD * seasonMultiplier;
  const fiveStar = destination.lodging.fiveStarUSD * seasonMultiplier;
  const budget = prefs.hotelBudgetUSD;

  // What the budget actually buys on these dates.
  let nightlyUSD: number;
  let tierLabel: string;
  let coverageScore: number;
  if (budget >= fiveStar) {
    nightlyUSD = fiveStar;
    tierLabel = "Five-star within budget";
    coverageScore = 100;
  } else if (budget >= fourStar) {
    nightlyUSD = Math.max(fourStar, budget * 0.92);
    tierLabel = "Four-star comfortably, five-star a stretch";
    coverageScore = 62 + ((budget - fourStar) / (fiveStar - fourStar)) * 33;
  } else {
    nightlyUSD = fourStar;
    tierLabel = "Below the four-star rate for these dates";
    coverageScore = clamp(62 * (budget / fourStar) ** 1.5);
  }

  // Absolute affordability, independent of the stated budget — what a good hotel costs here.
  const valueScore = clamp(100 - Math.max(0, fiveStar - 160) / 5.5);

  const factors: ScoreFactor[] = [
    {
      label: "Budget coverage",
      value: `${tierLabel} — 4★ ~$${round(fourStar)}, 5★ ~$${round(fiveStar)}/night`,
      score: round(coverageScore),
      weight: 0.65,
      tier: "curated",
    },
    {
      label: "Value for money",
      value: `$${round(fiveStar)}/night buys a top hotel here`,
      score: round(valueScore),
      weight: 0.35,
      tier: "curated",
    },
  ];

  return {
    category: combine("lodging", factors),
    nightlyUSD: round(nightlyUSD),
    totalUSD: round(nightlyUSD * nights),
    tierLabel,
  };
}

// ---------------------------------------------------------------------------
// Experience
// ---------------------------------------------------------------------------

function scoreExperience(destination: Destination, prefs: ComparisonPreferences): CategoryScore {
  const e = destination.experience;
  const resortLean = Math.max(0, prefs.cityVsResort) / 2;
  const cityLean = Math.max(0, -prefs.cityVsResort) / 2;
  const activity = prefs.activityLevel / 5;

  // Sub-weights bend towards what the traveller said they care about, so the same
  // destination scores differently for a beach trip and a city trip.
  const parts: { label: string; value: number; weight: number }[] = [
    { label: "Food", value: e.food, weight: 1.2 },
    { label: "Culture & sights", value: e.culture, weight: 0.7 + cityLean * 0.9 },
    { label: "Beaches", value: e.beaches, weight: (prefs.beachImportance / 5) * 2.2 },
    { label: "Nightlife", value: e.nightlife, weight: 0.4 + activity * 0.6 },
    { label: "Day trips", value: e.dayTrips, weight: 0.35 + activity * 0.95 },
    { label: "Nature", value: e.nature, weight: 0.5 + resortLean * 0.5 },
    { label: "Shopping", value: e.shopping, weight: 0.45 },
  ].filter((p) => p.weight > 0.05);

  const totalWeight = parts.reduce((a, p) => a + p.weight, 0);

  const factors: ScoreFactor[] = parts
    .map((p) => ({
      label: p.label,
      value: `${p.value}/5`,
      score: round((p.value / 5) * 100),
      weight: p.weight / totalWeight,
      tier: "curated" as const,
    }))
    .sort((a, b) => b.weight - a.weight);

  return combine("experience", factors);
}

// ---------------------------------------------------------------------------
// Practicality
// ---------------------------------------------------------------------------

function scorePracticality(destination: Destination): CategoryScore {
  const p = destination.practicality;
  const infrastructure = { 1: 100, 2: 76, 3: 52 }[destination.tourismTier];

  const factors: ScoreFactor[] = [
    { label: "Everyday safety & health", value: `${p.safetyEase}/5`, score: round((p.safetyEase / 5) * 100), weight: 0.22, tier: "curated" },
    { label: "Trip simplicity", value: `${p.tripSimplicity}/5`, score: round((p.tripSimplicity / 5) * 100), weight: 0.22, tier: "curated" },
    { label: "Getting around", value: `${p.localTransport}/5`, score: round((p.localTransport / 5) * 100), weight: 0.18, tier: "curated" },
    { label: "Visitor infrastructure", value: `Tier ${destination.tourismTier} destination`, score: infrastructure, weight: 0.15, tier: "curated" },
    { label: "Language", value: `${p.languageEase}/5`, score: round((p.languageEase / 5) * 100), weight: 0.12, tier: "curated" },
    { label: "Entry & visas", value: `${p.entryEase}/5`, score: round((p.entryEase / 5) * 100), weight: 0.11, tier: "curated" },
  ];

  return combine("practicality", factors);
}

// ---------------------------------------------------------------------------
// Personal fit
// ---------------------------------------------------------------------------

const ARCHETYPE_POSITION: Record<Destination["archetype"], number> = {
  city: -2,
  mixed: 0,
  nature: 0.5,
  beach: 1.5,
  resort: 2,
};

function scorePersonalFit(destination: Destination, prefs: ComparisonPreferences): CategoryScore {
  const archetypeDelta = Math.abs(ARCHETYPE_POSITION[destination.archetype] - prefs.cityVsResort);
  const archetypeScore = clamp(100 - archetypeDelta * 22);

  // How busy a trip here naturally is, inferred from what there is to do.
  const e = destination.experience;
  const pace = (e.dayTrips + e.culture + e.nightlife) / 3;
  const paceScore = clamp(100 - Math.abs(pace - prefs.activityLevel) * 18);

  const beachScore =
    prefs.beachImportance <= 1
      ? 100
      : clamp(100 - Math.max(0, prefs.beachImportance - e.beaches) * 26);

  const factors: ScoreFactor[] = [
    {
      label: "City versus resort",
      value: `${destination.archetype} destination`,
      score: round(archetypeScore),
      weight: 0.45,
      tier: "curated",
    },
    {
      label: "Pace",
      value: `Naturally a ${round(pace, 1)}/5 pace, you want ${prefs.activityLevel}/5`,
      score: round(paceScore),
      weight: 0.3,
      tier: "curated",
    },
    {
      label: "Beach requirement",
      value:
        prefs.beachImportance <= 1
          ? "Not a factor for you"
          : `Beaches ${destination.experience.beaches}/5, you want ${prefs.beachImportance}/5`,
      score: round(beachScore),
      weight: 0.25,
      tier: "curated",
    },
  ];

  return combine("personalFit", factors);
}

// ---------------------------------------------------------------------------
// Confidence and warnings
// ---------------------------------------------------------------------------

function assessConfidence(
  destination: Destination,
  startDate: string,
  holidaysUnavailable: boolean,
): { confidence: Confidence; warnings: DataWarning[] } {
  const warnings: DataWarning[] = [];
  const curatedAgeDays = Math.round(
    (parseDate(today()).getTime() - parseDate(destination.curatedOn).getTime()) / 86_400_000,
  );

  let penalty = 0;

  if (curatedAgeDays > 365) {
    penalty += 2;
    warnings.push({
      label: `Seasonal and cost assessments were last reviewed ${Math.round(curatedAgeDays / 30)} months ago`,
      severity: "warning",
    });
  } else if (curatedAgeDays > 180) {
    penalty += 1;
    warnings.push({ label: "Cost estimates are over six months old", severity: "info" });
  }

  if (destination.tourismTier === 3) {
    penalty += 1;
    warnings.push({
      label: "Niche destination — on-the-ground details change faster than the catalog is reviewed",
      severity: "info",
    });
  }

  if (holidaysUnavailable) {
    penalty += 1;
    warnings.push({
      label: `No public-holiday data available for ${destination.country}`,
      severity: "warning",
    });
  }

  const until = daysUntil(startDate);
  if (until > 330) {
    warnings.push({
      label: "More than a year out — hotel rates and flight schedules are not yet meaningful",
      severity: "info",
    });
  }

  warnings.push({
    label: "Hotel figures are planning estimates from the catalog, not live rates",
    severity: "info",
  });

  const confidence: Confidence = penalty >= 3 ? "low" : penalty >= 1 ? "medium" : "high";
  return { confidence, warnings };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const DEFAULT_PREFERENCES: ComparisonPreferences = {
  origins: HOME_AIRPORTS,
  alliances: [],
  airlines: [],
  maxTravelHours: 24,
  idealHighF: 80,
  rainTolerance: "medium",
  beachImportance: 3,
  cityVsResort: 0,
  activityLevel: 3,
  crowdTolerance: 3,
  hotelBudgetUSD: 350,
  exclusions: [],
  weights: {
    weather: 3,
    seasonal: 3,
    travel: 2,
    lodging: 2,
    experience: 3,
    practicality: 1,
    personalFit: 2,
  },
};

export function scoreDestination(
  destination: Destination,
  prefs: ComparisonPreferences,
  startDate: string,
  endDate: string,
): DestinationScore {
  const nights = Math.max(1, nightsBetween(startDate, endDate));
  const climate = dateWindowClimate(destination, startDate, endDate);
  const { holidays, unavailable } = holidaysDuring(destination, startDate, endDate);

  const seasonal = scoreSeasonal(destination, prefs, startDate, endDate);
  const lodging = scoreLodging(destination, prefs, startDate, endDate, nights);

  // Which airport and airline the traveller would actually use. Everything travel-related
  // below reads from this rather than from the catalog's JFK-shaped baseline.
  const selectedRoute = selectRoute(destination, {
    origins: prefs.origins,
    alliances: prefs.alliances,
    airlines: prefs.airlines,
  });

  const categories: Record<CategoryKey, CategoryScore> = {
    weather: scoreWeather(destination, climate, prefs),
    seasonal: seasonal.category,
    travel: scoreTravel(destination, prefs, nights, selectedRoute),
    lodging: lodging.category,
    experience: scoreExperience(destination, prefs),
    practicality: scorePracticality(destination),
    personalFit: scorePersonalFit(destination, prefs),
  };

  const totalWeight = CATEGORY_KEYS.reduce((a, k) => a + prefs.weights[k], 0);
  if (totalWeight <= 0) {
    throw new Error("At least one category must carry a non-zero weight");
  }
  const rawOverall = round(
    CATEGORY_KEYS.reduce((a, k) => a + categories[k].score * prefs.weights[k], 0) / totalWeight,
  );

  // Seasonal viability gate. A destination rated a poor time to visit cannot climb the
  // ranking on the strength of everything else — which is precisely what happens
  // otherwise, because a bad month is usually also cheap, quiet and easy to book.
  const suitability = weightedByMonth(
    monthWeights(startDate, endDate),
    (m) => destination.suitability[m - 1],
  );
  const seasonalGate = Number((0.6 + 0.4 * Math.min(1, Math.max(0, (suitability - 1) / 2.5))).toFixed(3));
  const overall = round(rawOverall * seasonalGate);

  const exceedsTravelLimit = selectedRoute.route.typicalTotalHours > prefs.maxTravelHours;

  const { confidence, warnings } = assessConfidence(destination, startDate, unavailable);
  const narrative = buildNarrative({
    destination,
    prefs,
    route: selectedRoute,
    climate,
    categories,
    season: seasonal.season,
    nights,
    nightlyUSD: lodging.nightlyUSD,
    totalUSD: lodging.totalUSD,
    holidays,
    overall,
    startDate,
    endDate,
  });

  if (seasonalGate < 1) {
    warnings.push({
      label: `Score reduced ×${seasonalGate} — the catalog rates these dates ${round(suitability, 1)}/5 for visiting ${destination.name}`,
      severity: "warning",
    });
  }
  if (exceedsTravelLimit) {
    warnings.push({
      label: `~${selectedRoute.route.typicalTotalHours}h each way from ${selectedRoute.route.origin} exceeds your ${prefs.maxTravelHours}h limit`,
      severity: "warning",
    });
  }

  // A filter that removes every option is information, not an empty result — the same
  // principle as the travel-time constraint (ADR 0009).
  if (selectedRoute.noRouteMatches) {
    warnings.push({
      label: "No route matches your airline filter",
      detail: `The figures below are for the best available routing, which your chosen airlines do not cover. Widen the filter, or treat this destination as unreachable as specified.`,
      severity: "serious",
    });
  } else if (selectedRoute.constrainedByFilter) {
    warnings.push({
      label: "Your airline filter costs you a better routing",
      detail: "A faster or more direct option exists on a carrier you have excluded.",
      severity: "warning",
    });
  }
  if (selectedRoute.route.seasonal) {
    warnings.push({
      label: `The ${selectedRoute.route.origin} nonstop is seasonal`,
      detail: "Check it operates on your dates before counting on it.",
      severity: "warning",
    });
  }

  return {
    destination,
    overall,
    rawOverall,
    seasonalGate,
    exceedsTravelLimit,
    route: selectedRoute,
    categories,
    climate,
    estimatedNightlyUSD: lodging.nightlyUSD,
    estimatedLodgingUSD: lodging.totalUSD,
    season: seasonal.season,
    pros: narrative.pros,
    cons: narrative.cons,
    bestFor: [],
    verdict: narrative.verdict,
    confidence,
    warnings,
  };
}

export interface ComparisonResult {
  scores: DestinationScore[];
  startDate: string;
  endDate: string;
  nights: number;
  preferences: ComparisonPreferences;
}

/**
 * Rank a set of destinations for exact dates. "Best for" labels are assigned across the
 * compared set, so they describe a destination relative to its actual rivals rather than
 * against an abstract standard.
 */
export function compareDestinations(
  destinations: Destination[],
  prefs: ComparisonPreferences,
  startDate: string,
  endDate: string,
): ComparisonResult {
  const eligible = destinations.filter((d) => !prefs.exclusions.includes(d.id));
  const scores = eligible
    .map((d) => scoreDestination(d, prefs, startDate, endDate))
    // A stated maximum travel time is a constraint, not a mild preference. Destinations
    // that break it are still scored and still shown — but never above one that fits.
    .sort((a, b) => {
      if (a.exceedsTravelLimit !== b.exceedsTravelLimit) return a.exceedsTravelLimit ? 1 : -1;
      return b.overall - a.overall;
    });

  assignBestFor(scores);

  return {
    scores,
    startDate,
    endDate,
    nights: Math.max(1, nightsBetween(startDate, endDate)),
    preferences: prefs,
  };
}
