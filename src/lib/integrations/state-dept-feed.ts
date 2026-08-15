/**
 * US State Department travel advisory feed.
 *
 * Replaces the hand-maintained 10-country table that previously lived in
 * `travel-warnings.ts` and had not been updated since 2024-08-10. The feed publishes
 * all 214 countries and is the authoritative source for US travellers.
 *
 * Parsing is deliberately kept pure and separate from fetching so the grammar can be
 * tested against a fixture without a network call.
 *
 * Feed: https://travel.state.gov/_res/rss/TAsTWs.xml  (no key, no rate limit)
 */

import { parse as parseDate, isValid as isValidDate, formatISO } from "date-fns";

export type AdvisoryLevel = 1 | 2 | 3 | 4;

/**
 * Result of a source read. A provider either produced a value with provenance, or it
 * failed for a stated reason — it never invents a fallback.
 *
 * Safety data makes the reason for this rule concrete: defaulting a failed advisory
 * lookup to "Level 1 — Exercise Normal Precautions" would render an unknown risk as an
 * all-clear. Absence must read as absence.
 *
 * Phase 1b generalises this into the shared provider layer; it is scoped here for now.
 */
export type Fetched<T> =
  | { ok: true; value: T; sourceDate: string }
  | { ok: false; reason: string };

export interface ParsedAdvisory {
  /** Country exactly as the feed names it, e.g. "Czechia". */
  country: string;
  level: AdvisoryLevel;
  /** The clause after the level, e.g. "Exercise Increased Caution". */
  headline: string;
  /** First sentence of the advisory body, tags stripped. */
  summary: string;
  url: string;
  /**
   * The feed item's own publication date (ISO yyyy-MM-dd).
   *
   * This is the source's date, never our fetch date — see spec §3.6.1. Downloading a
   * stale advisory today does not make it current.
   */
  publishedOn: string;
}

/**
 * Catalog country names that differ from the feed's naming.
 *
 * Verified against the live feed on 2026-08-15: 23 of 26 catalog countries matched
 * directly; these three did not. Kept explicit rather than solved with fuzzy matching,
 * because a wrong fuzzy match on safety data is worse than no match at all.
 */
const COUNTRY_ALIASES: Record<string, string> = {
  // The State Department adopted the short-form name; the catalog still uses the old one.
  "czech republic": "Czechia",
  // Feed scopes the advisory to the whole realm, including Greenland and the Faroes.
  denmark: "Kingdom of Denmark",
  // Not a sovereign state — the advisory that governs it is the UK's.
  scotland: "United Kingdom",
  // Common spellings that would otherwise miss.
  "united states": "United States of America",
  usa: "United States of America",
  turkiye: "Turkey",
  "south korea": "Republic of Korea",
  "north macedonia": "Macedonia",
};

/**
 * Fold a country name into a stable lookup key.
 *
 * The feed is served through a CDN whose nodes disagree about text encoding: the same
 * country arrives as "Côte d'Ivoire" from one node and "Cote d Ivoire" from another,
 * and both spellings appear in a union of consecutive fetches. Keying on the raw string
 * therefore misses roughly half the time for any accented country.
 *
 * Diacritics are stripped, punctuation collapsed to spaces, and case normalised, so
 * every spelling of a country converges on one key.
 */
export function countryKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Resolve a catalog country name onto the name the feed uses. */
export function normalizeCountry(country: string): string {
  return COUNTRY_ALIASES[countryKey(country)] ?? country.trim();
}

/** Strip HTML tags and collapse whitespace from a CDATA description body. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Convert the feed's `pubDate` into an ISO date.
 *
 * The feed emits `Tue, 28 Jul 2026` — a date with no time or zone, which is not a
 * conformant RFC-822 pubDate. `new Date()` parses this inconsistently across runtimes,
 * so the format is pinned explicitly.
 */
function parsePubDate(raw: string): string | null {
  const parsed = parseDate(raw.trim(), "EEE, d MMM yyyy", new Date());
  if (!isValidDate(parsed)) return null;
  return formatISO(parsed, { representation: "date" });
}

const ITEM_RE = /<item>([\s\S]*?)<\/item>/g;
const TITLE_RE = /<title>([\s\S]*?)<\/title>/;
const LINK_RE = /<link>([\s\S]*?)<\/link>/;
const PUBDATE_RE = /<pubDate>([\s\S]*?)<\/pubDate>/;
const DESC_RE = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/;
/** Every one of the 214 items matched this on 2026-08-15. */
const TITLE_GRAMMAR = /^(.+?)\s+-\s+Level\s+([1-4])\s*:\s*(.+)$/;

/**
 * Parse the advisory feed. Pure — no network, no clock.
 *
 * Items that do not match the expected grammar are skipped rather than guessed at, and
 * reported by count so a silent format change upstream shows up as a drop in coverage
 * instead of quietly wrong data.
 */
export function parseAdvisoryFeed(xml: string): {
  advisories: ParsedAdvisory[];
  skipped: number;
} {
  const advisories: ParsedAdvisory[] = [];
  let skipped = 0;

  for (const [, body] of xml.matchAll(ITEM_RE)) {
    const title = TITLE_RE.exec(body)?.[1]?.trim();
    if (!title) {
      skipped++;
      continue;
    }

    const grammar = TITLE_GRAMMAR.exec(title);
    if (!grammar) {
      skipped++;
      continue;
    }

    const publishedOn = parsePubDate(PUBDATE_RE.exec(body)?.[1] ?? "");
    if (!publishedOn) {
      // Without the source's own date we cannot honour the verifiedOn rule, so the
      // item is unusable rather than merely undated.
      skipped++;
      continue;
    }

    const rawDesc = DESC_RE.exec(body)?.[1] ?? "";
    const summary = stripHtml(rawDesc);

    advisories.push({
      country: grammar[1].trim(),
      level: Number(grammar[2]) as AdvisoryLevel,
      headline: grammar[3].trim(),
      summary: summary.length > 400 ? `${summary.slice(0, 397)}...` : summary,
      url: LINK_RE.exec(body)?.[1]?.trim() ?? "https://travel.state.gov",
      publishedOn,
    });
  }

  return { advisories, skipped };
}

export const ADVISORY_FEED_URL = "https://travel.state.gov/_res/rss/TAsTWs.xml";
export const ADVISORY_SOURCE = "US Department of State";

/** Advisories are safety data; six hours keeps them current without hammering the feed. */
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;

/**
 * How many times to read the feed per refresh.
 *
 * The endpoint is not deterministic. Consecutive reads of the identical URL return
 * documents of 213, 222, 226 and 230 items — CDN nodes holding different generations of
 * the feed. Around a dozen countries are missing from any single read; Austria was
 * absent from five of six consecutive fetches during development.
 *
 * A single read would therefore make a destination's advisory appear and vanish between
 * page loads. Unioning several reads recovers full coverage: six fetches yielded every
 * country the feed publishes.
 */
const FETCH_ATTEMPTS = 4;

/**
 * Merge advisory sets, preferring the most recently revised entry per country.
 *
 * Exported for tests: the union is the part of this module that makes coverage stable,
 * so it is worth asserting directly rather than only through the network path.
 */
export function mergeAdvisories(
  batches: ParsedAdvisory[][],
): Map<string, ParsedAdvisory> {
  const index = new Map<string, ParsedAdvisory>();
  for (const batch of batches) {
    for (const a of batch) {
      const key = countryKey(a.country);
      const existing = index.get(key);
      // Later revision wins; ties keep the first seen, so the result is order-stable.
      if (!existing || a.publishedOn > existing.publishedOn) index.set(key, a);
    }
  }
  return index;
}

/**
 * Committed coverage floor, generated by `scripts/build-advisory-baseline.ts`.
 *
 * Live reads are layered over this. A newer revision from the feed always wins, but a
 * country can never drop out of the index because the CDN happened to serve a
 * generation that omits it. Regenerate deliberately, not automatically.
 */
import BASELINE from "@/data/generated/advisories.json";

const baselineAdvisories = BASELINE.advisories as ParsedAdvisory[];

interface CachedIndex {
  index: Map<string, ParsedAdvisory>;
  sourceDate: string;
  at: number;
}

/**
 * Module-level cache.
 *
 * `fetch`'s own cache cannot be used here: every attempt deliberately bypasses it to
 * reach a different CDN node, which is the whole point of the union.
 */
let cached: CachedIndex | null = null;

async function readFeedOnce(): Promise<ParsedAdvisory[] | null> {
  try {
    const res = await fetch(ADVISORY_FEED_URL, {
      cache: "no-store",
      headers: { accept: "application/rss+xml, application/xml, text/xml" },
    });
    if (!res.ok) return null;
    return parseAdvisoryFeed(await res.text()).advisories;
  } catch {
    return null;
  }
}

/**
 * Fetch and index every published advisory, keyed by folded country name.
 *
 * Returns a reason on failure rather than an empty index, so callers can distinguish
 * "this country has no advisory" from "we could not reach the State Department".
 */
export async function fetchAdvisoryIndex(
  now: number = Date.now(),
): Promise<Fetched<Map<string, ParsedAdvisory>>> {
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return { ok: true, value: cached.index, sourceDate: cached.sourceDate };
  }

  const live = (
    await Promise.all(Array.from({ length: FETCH_ATTEMPTS }, () => readFeedOnce()))
  ).filter((b): b is ParsedAdvisory[] => b !== null && b.length > 0);

  // Baseline first, live reads over the top: newer revisions win, coverage never
  // regresses. With the feed unreachable this still serves the committed set, whose
  // true age stays visible to the reader through each advisory's own revision date.
  const index = mergeAdvisories([baselineAdvisories, ...live]);

  if (index.size === 0) {
    return {
      ok: false,
      reason: "No advisories available from either the baseline or the live feed",
    };
  }

  // The index's freshness is that of its most recently revised advisory.
  let newest = "";
  for (const a of index.values()) if (a.publishedOn > newest) newest = a.publishedOn;

  cached = { index, sourceDate: newest, at: now };
  return { ok: true, value: index, sourceDate: newest };
}
