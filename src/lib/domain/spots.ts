/**
 * The gate for influencer spots: no citation, no spot.
 *
 * This is the whole safeguard. Everything else about the feature — which platforms to
 * read, how to rank, who writes the description — can change without weakening it,
 * because a spot that cannot name where it was seen cannot be stored at all.
 *
 * The rule exists because the previous shape, `{ name, type, description }`, was three
 * strings a model could produce without consulting anything. Nothing about a fabricated
 * spot looked different from a real one, which is how a fabricated destination entry
 * survived review once already.
 */

import type { InfluencerSpot, SpotCitation } from "./types";

export const MIN_SPOTS = 20;
export const MAX_SPOTS = 50;

const PLATFORMS = new Set([
  "tiktok",
  "instagram",
  "youtube",
  "reddit",
  "wikivoyage",
  "tripadvisor",
  "editorial",
]);

function validCitation(c: SpotCitation): string | null {
  if (!PLATFORMS.has(c.platform)) return `unknown platform "${c.platform}"`;
  if (!/^https?:\/\/\S+$/.test(c.url ?? "")) return `citation url is not a URL: "${c.url}"`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.seenOn ?? "")) return `seenOn is not a date: "${c.seenOn}"`;
  return null;
}

/** Everything wrong with a spot. Empty means it may be stored. */
export function validateSpot(spot: InfluencerSpot): string[] {
  const errors: string[] = [];

  if (!spot.name?.trim()) errors.push("name is empty");
  if (!spot.description?.trim()) errors.push("description is empty");

  if (!Array.isArray(spot.citations) || spot.citations.length === 0) {
    // The one that matters. Everything above is hygiene; this is the safeguard.
    errors.push(
      `"${spot.name ?? "unnamed"}" has no citation — a spot nobody can point at is ` +
        `indistinguishable from an invented one`,
    );
    return errors;
  }

  spot.citations.forEach((c, i) => {
    const problem = validCitation(c);
    if (problem) errors.push(`citation ${i}: ${problem}`);
  });

  return errors;
}

/**
 * How many independent sources featured this place.
 *
 * The ranking signal, and the reason citations are a list rather than one field. A paid
 * places API sells a popularity score; the same thing can be assembled from free sources
 * by counting agreement between them. Two citations from the same platform count once —
 * one creator posting twice is not corroboration.
 */
export function corroboration(spot: InfluencerSpot): number {
  return new Set(spot.citations.map((c) => c.platform)).size;
}

/** Best-evidenced first. Ties keep their original order, so the sort is stable. */
export function byCorroboration(spots: InfluencerSpot[]): InfluencerSpot[] {
  return [...spots].sort((a, b) => corroboration(b) - corroboration(a));
}

export interface SpotsCheck {
  ok: boolean;
  errors: string[];
}

/**
 * Validate a whole set, as it would be stored against a destination.
 *
 * Rejects the set if any single spot is uncited: one fabrication in fifty is still a
 * fabrication, and letting the rest through would mean publishing it.
 */
export function checkSpots(spots: InfluencerSpot[]): SpotsCheck {
  const errors: string[] = [];

  if (spots.length < MIN_SPOTS) errors.push(`${spots.length} spots, need at least ${MIN_SPOTS}`);
  if (spots.length > MAX_SPOTS) errors.push(`${spots.length} spots, at most ${MAX_SPOTS}`);

  const names = spots.map((s) => s.name?.trim().toLowerCase());
  const duplicated = [...new Set(names.filter((n, i) => n && names.indexOf(n) !== i))];
  if (duplicated.length > 0) errors.push(`duplicate spots: ${duplicated.join(", ")}`);

  spots.forEach((s) => errors.push(...validateSpot(s)));

  return { ok: errors.length === 0, errors };
}
