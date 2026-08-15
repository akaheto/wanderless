/**
 * Verify that every catalog country resolves to a published State Department advisory.
 *
 * Why this exists
 * ---------------
 * The advisory feed publishes no machine-readable country key: of its 214 items, only
 * 10 links carry an ISO code and the remaining 203 are name slugs. The country name is
 * therefore the only join available, and names drift — the State Department publishes
 * "Czechia" where the catalog says "Czech Republic", and scopes Denmark's advisory to
 * the "Kingdom of Denmark".
 *
 * A mismatch renders no advisory section at all, and on safety data a missing section
 * reads as "no problems here". That is the failure this script exists to make loud.
 *
 * Run it whenever a destination is added, and alongside `build:data`:
 *   npx tsx scripts/verify-advisory-coverage.ts
 *
 * Exits non-zero when any country fails to resolve, so it can gate CI.
 */

import { DESTINATIONS } from "../src/data/destinations";
import {
  ADVISORY_FEED_URL,
  countryKey,
  mergeAdvisories,
  normalizeCountry,
  parseAdvisoryFeed,
  type ParsedAdvisory,
} from "../src/lib/integrations/state-dept-feed";

/** Crude similarity, used only to suggest a fix to a human — never to resolve one. */
function suggest(name: string, published: string[]): string[] {
  const head = name.toLowerCase().split(/\s+/)[0];
  return published
    .filter((p) => {
      const l = p.toLowerCase();
      return l.includes(head) || head.includes(l.split(/\s+/)[0]);
    })
    .slice(0, 3);
}

async function main() {
  // Mirrors what the app does at runtime. A single read is not enough: the CDN serves
  // several generations of the feed, and any one of them omits around a dozen countries.
  const ATTEMPTS = 4;
  console.log(`Fetching ${ADVISORY_FEED_URL} (${ATTEMPTS}x, unioned) ...`);

  const batches = await Promise.all(
    Array.from({ length: ATTEMPTS }, async () => {
      try {
        const res = await fetch(ADVISORY_FEED_URL, {
          headers: { accept: "application/rss+xml, application/xml, text/xml" },
        });
        if (!res.ok) return [];
        return parseAdvisoryFeed(await res.text()).advisories;
      } catch {
        return [];
      }
    }),
  );

  // Same layering the app uses: committed baseline first, live reads over the top.
  //
  // The baseline is loaded before the live result is judged, and an unreachable feed is
  // a warning rather than a failure. That is the whole point of having a floor — the
  // State Department rate-limits, and coverage must not depend on catching it in a good
  // mood. What would be a genuine failure is a country missing from *both*.
  const { readFile } = await import("node:fs/promises");
  const baseline = (
    JSON.parse(
      await readFile("src/data/generated/advisories.json", "utf-8"),
    ) as { advisories: ParsedAdvisory[] }
  ).advisories;

  const counts = batches.map((b) => b.length).filter((c) => c > 0);
  if (counts.length === 0) {
    console.warn(
      "WARN: no live read succeeded (feed unreachable or rate-limited) — verifying against the committed baseline alone.\n",
    );
  }

  const index = mergeAdvisories([baseline, ...batches]);
  const publishedNames = [...index.values()].map((a) => a.country);

  console.log(
    `baseline: ${baseline.length} countries` +
      (counts.length > 0 ? `; live reads: ${counts.join(", ")} items` : "") +
      `; merged: ${index.size}\n`,
  );

  const countries = [...new Set(DESTINATIONS.map((d) => d.country))].sort();
  const unresolved: string[] = [];
  let aliased = 0;

  for (const country of countries) {
    const normalized = normalizeCountry(country);
    const hit = index.get(countryKey(normalized));

    if (!hit) {
      unresolved.push(country);
      continue;
    }

    const via = normalized === country ? "" : `  (via alias -> "${normalized}")`;
    if (via) aliased++;
    console.log(
      `  ok    ${country.padEnd(24)} Level ${hit.level}  ${hit.publishedOn}${via}`,
    );
  }

  console.log(
    `\n${countries.length - unresolved.length}/${countries.length} resolved` +
      (aliased > 0 ? `, ${aliased} via alias` : ""),
  );

  // The feed's own freshness. A stale advisory is a different failure from a missing
  // one, and worth surfacing here rather than only at request time.
  let newest = "";
  for (const a of index.values()) if (a.publishedOn > newest) newest = a.publishedOn;
  const ageDays = Math.floor(
    (Date.now() - new Date(newest).getTime()) / 86_400_000,
  );
  console.log(`Most recent advisory: ${newest} (${ageDays}d ago)`);

  if (unresolved.length > 0) {
    console.error(`\nFAIL: ${unresolved.length} country/countries did not resolve:\n`);
    for (const c of unresolved) {
      const near = suggest(c, publishedNames);
      console.error(`  "${c}"`);
      console.error(
        near.length > 0
          ? `      feed publishes: ${near.map((n) => `"${n}"`).join(", ")}`
          : "      no similarly-named advisory found",
      );
    }
    console.error(
      "\nAdd the mapping to COUNTRY_ALIASES in src/lib/integrations/state-dept-feed.ts.",
    );
    console.error(
      "Do not leave it unresolved: the destination will render no advisory at all,",
    );
    console.error("which on safety data reads as an all-clear.\n");
    process.exit(1);
  }

  console.log("\nAll catalog countries resolve to a published advisory.");
}

main().catch((error) => {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
