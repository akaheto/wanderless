/**
 * Draft generation: propose month notes based on current climate data vs. curated ratings.
 *
 * When measured climate disagrees with existing suitability, suggest a redline.
 * Format is "current (suggested)" so the curator can review and accept/reject.
 */

import type { ClimateMonth, Destination } from "@/lib/domain/types";

export interface DraftMonth {
  month: number;
  monthName: string;
  currentRating: number;
  suggestedRating: number;
  hasChange: boolean;
  currentNote: string;
  suggestedNote: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Calculate suitability rating from climate data (mirrors destination-data-pipeline.ts).
 * Scores 1-5 based on temperature, rain, sun, coastal factors.
 */
function calculateRatingFromClimate(
  climate: ClimateMonth,
  coastal: boolean,
): number {
  let score = 3; // Start neutral

  // Temperature comfort (aim for 60-80°F)
  const avgTemp = (climate.highF + climate.lowF) / 2;
  if (avgTemp >= 60 && avgTemp <= 80) score += 1;
  else if (avgTemp < 40 || avgTemp > 90) score -= 1;

  // Precipitation (lower is better)
  if (climate.rainDays < 5) score += 0.5;
  else if (climate.rainDays > 15) score -= 0.5;

  // Sun hours (higher is better)
  if (climate.sunHours > 6) score += 0.5;
  else if (climate.sunHours < 3) score -= 0.5;

  // Sea temperature for coastal cities (bonus if warm)
  if (coastal && climate.sstF && climate.sstF > 70) score += 0.5;

  // Clamp to 1-5 range
  return Math.max(1, Math.min(5, Math.round(score * 10) / 10));
}

/**
 * Generate a human-readable note for a month based on climate.
 */
function generateNoteFromClimate(climate: ClimateMonth, monthName: string): string {
  const highF = climate.highF;
  const lowF = climate.lowF;
  const rainDays = climate.rainDays;
  const sunHours = climate.sunHours;

  let note = `Average high ${highF}°F, low ${lowF}°F with ${rainDays} rain days.`;

  if (sunHours > 6) {
    note += ` ${Math.round(sunHours)} sun hours on average.`;
  } else if (sunHours < 3) {
    note += ` Only ${Math.round(sunHours)} sun hours on average.`;
  }

  return note;
}

/**
 * Generate draft month data comparing current climate vs. existing curated ratings.
 * Returns months where climate suggests a different suitability rating.
 */
export function generateDraft(
  destination: Destination,
  climateData: ClimateMonth[],
): DraftMonth[] {
  const drafts: DraftMonth[] = [];

  for (let month = 1; month <= 12; month++) {
    const climate = climateData[month - 1];
    if (!climate) continue;

    const currentRating = destination.suitability[month - 1] ?? 3;
    const suggestedRating = calculateRatingFromClimate(climate, destination.coastal);
    const currentNote = (destination.monthNotes?.[String(month) as never] ?? "") as string;
    const suggestedNote = generateNoteFromClimate(climate, MONTH_NAMES[month - 1]);

    const hasChange = Math.abs(currentRating - suggestedRating) >= 0.5;

    drafts.push({
      month,
      monthName: MONTH_NAMES[month - 1],
      currentRating,
      suggestedRating,
      hasChange,
      currentNote,
      suggestedNote,
    });
  }

  return drafts;
}

/**
 * Filter to only months where climate suggests a change.
 */
export function filterChangedMonths(drafts: DraftMonth[]): DraftMonth[] {
  return drafts.filter((d) => d.hasChange);
}
