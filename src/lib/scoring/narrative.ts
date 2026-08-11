/**
 * Turns scores into sentences.
 *
 * Everything here is generated from numbers already computed and shown elsewhere in the
 * UI — no model, no outside knowledge. If a sentence claims something, the figure behind
 * it is visible in the factor table. That is what keeps the written verdict in the same
 * epistemic category as the score rather than becoming a separate, unverifiable opinion.
 */

import type {
  CategoryKey,
  CategoryScore,
  ComparisonPreferences,
  DateWindowClimate,
  Destination,
  DestinationScore,
  Season,
} from "@/lib/domain/types";
import type { SelectedRoute } from "@/lib/domain/types";
import { CATEGORY_KEYS, CATEGORY_LABELS } from "@/lib/domain/types";
import { MONTH_NAMES, monthOf, monthsInRange } from "@/lib/dates";

interface NarrativeInput {
  destination: Destination;
  prefs: ComparisonPreferences;
  /** The airport and airline routing chosen for these preferences. */
  route: SelectedRoute;
  climate: DateWindowClimate;
  categories: Record<CategoryKey, CategoryScore>;
  season: Season;
  nights: number;
  nightlyUSD: number;
  totalUSD: number;
  holidays: { date: string; name: string }[];
  overall: number;
  startDate: string;
  endDate: string;
}

interface Narrative {
  pros: string[];
  cons: string[];
  verdict: string;
}

/** A candidate line with the strength of its claim, used to keep only what matters most. */
interface Line {
  text: string;
  strength: number;
}

const factor = (c: CategoryScore, label: string) => c.factors.find((f) => f.label === label);

function monthLabel(startDate: string, endDate: string): string {
  const months = monthsInRange(startDate, endDate);
  const names = months.map((m) => MONTH_NAMES[m - 1]);
  return names.length === 1 ? names[0] : names.join(" into ");
}

export function buildNarrative(input: NarrativeInput): Narrative {
  const { destination, prefs, route, climate, categories, season, nights, nightlyUSD, overall } = input;
  const d = destination;
  const pros: Line[] = [];
  const cons: Line[] = [];

  const rainShare = climate.expectedRainDays / climate.days;
  const tempFactor = factor(categories.weather, "Daytime temperature");
  const rainFactor = factor(categories.weather, "Rain");
  const humidityFactor = factor(categories.weather, "Humidity");
  const shareFactor = factor(categories.travel, "Travel as a share of the trip");
  const coverageFactor = factor(categories.lodging, "Budget coverage");

  // ----- weather -----
  if (tempFactor && tempFactor.score >= 82) {
    pros.push({
      text: `Days average ${climate.avgHighF}°F, close to the ${prefs.idealHighF}° you asked for`,
      strength: tempFactor.score,
    });
  } else if (tempFactor && tempFactor.score < 55) {
    const delta = Math.round(climate.avgHighF - prefs.idealHighF);
    cons.push({
      text:
        delta > 0
          ? `Hotter than you want — ${climate.avgHighF}°F days, ${delta}° above your target`
          : `Cooler than you want — ${climate.avgHighF}°F days, ${Math.abs(delta)}° below your target`,
      strength: 100 - tempFactor.score,
    });
  }

  if (rainShare <= 0.2) {
    pros.push({
      text: `Dry — around ${climate.expectedRainDays} wet days across ${climate.days}`,
      strength: rainFactor?.score ?? 80,
    });
  } else if (rainShare >= 0.45) {
    cons.push({
      text: `Wet — rain expected on about ${climate.expectedRainDays} of ${climate.days} days (${climate.totalPrecipIn}in)`,
      strength: 100 - (rainFactor?.score ?? 40),
    });
  }

  if (humidityFactor && humidityFactor.score < 50) {
    cons.push({
      text: `Humid at ${climate.avgHumidityPct}% with ${climate.avgHighF}°F days — draining to walk around in`,
      strength: 100 - humidityFactor.score,
    });
  }

  if (climate.avgDaylightHours >= 13.5) {
    pros.push({ text: `${climate.avgDaylightHours} hours of daylight a day`, strength: 70 });
  } else if (climate.avgDaylightHours < 10) {
    cons.push({
      text: `Only ${climate.avgDaylightHours} hours of daylight — dark by mid-afternoon`,
      strength: 88,
    });
  }

  // ----- water -----
  if (d.coastal && climate.sstF != null && prefs.beachImportance >= 3) {
    if (climate.sstF >= 80) {
      pros.push({ text: `Sea at ${climate.sstF}°F — warm enough to stay in`, strength: 85 });
    } else if (climate.sstF < 72) {
      cons.push({ text: `Sea only ${climate.sstF}°F — too cold for the beach days you want`, strength: 85 });
    }
  }

  // ----- season -----
  const suitability = d.suitability[monthOf(input.startDate) - 1];
  if (categories.seasonal.score >= 78) {
    pros.push({
      text: `${monthLabel(input.startDate, input.endDate)} is one of the better months here (${suitability}/5)`,
      strength: categories.seasonal.score,
    });
  } else if (categories.seasonal.score < 55) {
    cons.push({
      text: `${monthLabel(input.startDate, input.endDate)} is a weak month here (${suitability}/5 seasonally)`,
      strength: 100 - categories.seasonal.score,
    });
  }

  const tripMonths = monthsInRange(input.startDate, input.endDate);
  for (const risk of d.risks.filter(
    (r) => r.severity === "high" && r.months.some((m) => tripMonths.includes(m)),
  )) {
    cons.push({ text: risk.label, strength: 95 });
  }

  if (season !== "peak" && categories.seasonal.score >= 65) {
    pros.push({ text: `Outside peak season — fewer crowds and lower rates`, strength: 68 });
  }
  if (season === "peak" && prefs.crowdTolerance <= 2) {
    cons.push({ text: `Peak season, and you said crowds bother you`, strength: 72 });
  }

  // ----- travel -----
  // Reads the route actually selected for these preferences, not the catalog's JFK figure.
  if (route.route.nonstop) {
    pros.push({
      text: `Nonstop from ${route.route.origin}, about ${route.route.typicalTotalHours}h${
        route.route.seasonal ? " (seasonal)" : ""
      }`,
      strength: 90,
    });
  } else if (route.route.typicalConnections >= 2) {
    cons.push({
      text: `${route.route.typicalConnections} connections and roughly ${route.route.typicalTotalHours}h each way from ${route.route.origin}`,
      strength: 82,
    });
  }
  if (shareFactor && shareFactor.score < 55) {
    cons.push({ text: `${shareFactor.value} is spent travelling`, strength: 100 - shareFactor.score });
  }

  // ----- lodging -----
  if (coverageFactor && coverageFactor.score >= 95) {
    pros.push({
      text: `Your $${prefs.hotelBudgetUSD} budget covers a five-star room at about $${nightlyUSD}/night`,
      strength: 84,
    });
  } else if (coverageFactor && coverageFactor.score < 55) {
    cons.push({
      text: `$${prefs.hotelBudgetUSD} is short of the ~$${nightlyUSD}/night a four-star costs on these dates`,
      strength: 100 - coverageFactor.score,
    });
  }

  // ----- experience and fit -----
  const topExperience = categories.experience.factors
    .filter((f) => f.score >= 90 && f.weight >= 0.1)
    .slice(0, 2);
  for (const f of topExperience) {
    pros.push({ text: `${f.label} rates ${f.value} here — as good as anywhere on the list`, strength: 80 });
  }

  const archetypeFit = factor(categories.personalFit, "City versus resort");
  if (archetypeFit && archetypeFit.score < 55) {
    cons.push({
      text:
        prefs.cityVsResort > 0
          ? `This is a ${d.archetype} destination and you asked for something more resort-like`
          : `This is a ${d.archetype} destination and you asked for something more city-like`,
      strength: 100 - archetypeFit.score,
    });
  }

  const beachFit = factor(categories.personalFit, "Beach requirement");
  if (beachFit && beachFit.score < 60) {
    cons.push({
      text: `Beaches rate ${d.experience.beaches}/5 — below what a beach-led trip needs`,
      strength: 100 - beachFit.score,
    });
  }

  if (categories.practicality.score >= 88) {
    pros.push({ text: `Straightforward to travel in — transport, language and entry are all easy`, strength: 74 });
  } else if (categories.practicality.score < 58) {
    cons.push({ text: `Harder work than most — ${weakestPracticality(categories.practicality)}`, strength: 70 });
  }

  // ----- holidays -----
  if (input.holidays.length > 0) {
    const names = [...new Set(input.holidays.map((h) => h.name))].slice(0, 2).join(" and ");
    // Ranked high deliberately: a national holiday closes restaurants and museums and
    // moves prices, and it is the kind of thing you only discover on arrival.
    cons.push({
      text: `${names} falls during your dates — expect closures and higher demand`,
      strength: 86,
    });
  }

  const take = (lines: Line[], n: number) =>
    [...lines].sort((a, b) => b.strength - a.strength).slice(0, n).map((l) => l.text);

  return {
    pros: take(pros, 4),
    cons: take(cons, 4),
    verdict: buildVerdict(input, overall, nights),
  };
}

function weakestPracticality(category: CategoryScore): string {
  const worst = [...category.factors].sort((a, b) => a.score - b.score)[0];
  return `${worst.label.toLowerCase()} is the weak point`;
}

function buildVerdict(input: NarrativeInput, overall: number, nights: number): string {
  const { destination: d, categories, climate } = input;
  const months = monthLabel(input.startDate, input.endDate);

  const opener =
    overall >= 80
      ? "a strong match for what you have described"
      : overall >= 70
        ? "a good fit, with trade-offs worth knowing about"
        : overall >= 60
          ? "workable, but not the obvious choice on these dates"
          : overall >= 50
            ? "a compromise on these dates"
            : "the wrong time of year for this one";

  const ranked = CATEGORY_KEYS.map((k) => ({ key: k, score: categories[k].score })).sort(
    (a, b) => b.score - a.score,
  );
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];

  const sentences = [
    `${d.name} in ${months} is ${opener}, scoring ${overall} out of 100 for ${nights} nights.`,
    `${CATEGORY_LABELS[best.key]} is its strongest card at ${best.score}, while ${CATEGORY_LABELS[worst.key].toLowerCase()} is the weakest at ${worst.score}.`,
  ];

  const startMonth = monthOf(input.startDate);
  const note = d.monthNotes[startMonth];
  if (note) sentences.push(note);

  sentences.push(
    `Expect ${climate.avgHighF}°F days, ${climate.expectedRainDays} wet days in ${climate.days}, and about $${input.totalUSD.toLocaleString()} in hotels at your budget.`,
  );

  return sentences.join(" ");
}

// ---------------------------------------------------------------------------
// "Best for" labels, assigned across the compared set
// ---------------------------------------------------------------------------

const CATEGORY_LABEL_FOR_WINNER: Record<CategoryKey, string> = {
  weather: "Best weather",
  seasonal: "Best time of year",
  travel: "Easiest to reach",
  lodging: "Best hotel value",
  experience: "Most to do",
  practicality: "Easiest to travel in",
  personalFit: "Closest to your brief",
};

/**
 * Label each destination by what it wins at within this comparison. A label is only
 * awarded when the winner is both good in absolute terms and clearly ahead — otherwise
 * "best weather" would be handed out in a field where every option is wet.
 */
export function assignBestFor(scores: DestinationScore[]): void {
  if (scores.length < 2) {
    if (scores.length === 1) scores[0].bestFor = [];
    return;
  }

  const award = (label: string, winner: DestinationScore | undefined) => {
    if (winner && !winner.bestFor.includes(label)) winner.bestFor.push(label);
  };

  for (const key of CATEGORY_KEYS) {
    const ranked = [...scores].sort((a, b) => b.categories[key].score - a.categories[key].score);
    const top = ranked[0];
    const runnerUp = ranked[1];
    if (top.categories[key].score >= 70 && top.categories[key].score - runnerUp.categories[key].score >= 3) {
      award(CATEGORY_LABEL_FOR_WINNER[key], top);
    }
  }

  const cheapest = [...scores].sort((a, b) => a.estimatedLodgingUSD - b.estimatedLodgingUSD)[0];
  const nextCheapest = [...scores].sort((a, b) => a.estimatedLodgingUSD - b.estimatedLodgingUSD)[1];
  if (nextCheapest && nextCheapest.estimatedLodgingUSD - cheapest.estimatedLodgingUSD > cheapest.estimatedLodgingUSD * 0.12) {
    award("Cheapest", cheapest);
  }

  const driest = [...scores].sort(
    (a, b) => a.climate.expectedRainDays / a.climate.days - b.climate.expectedRainDays / b.climate.days,
  )[0];
  if (driest.climate.expectedRainDays / driest.climate.days <= 0.25) award("Driest", driest);

  const swimmable = scores.filter((s) => s.destination.coastal && s.climate.sstF != null);
  if (swimmable.length >= 2) {
    const warmest = swimmable.sort((a, b) => (b.climate.sstF ?? 0) - (a.climate.sstF ?? 0))[0];
    if ((warmest.climate.sstF ?? 0) >= 80) award("Warmest water", warmest);
  }

  // Compares the routes actually selected, so the label reflects the traveller's own
  // airports and airline filter rather than a fixed JFK baseline.
  const shortest = [...scores].sort(
    (a, b) => a.route.route.typicalTotalHours - b.route.route.typicalTotalHours,
  )[0];
  award("Shortest journey", shortest);
}
