/**
 * Generate the committed advisory baseline.
 *
 * Why a baseline is necessary
 * ---------------------------
 * The State Department feed is served through a CDN whose nodes hold different
 * generations of the document. Consecutive reads of the identical URL return 213, 222,
 * 223, 226 or 230 items, and the larger documents are *not* supersets — they omit around
 * a dozen countries that the 213-item generation contains. Austria is one of them.
 *
 * Unioning several live reads helps but cannot guarantee coverage: if every read in a
 * batch happens to land on a generation missing Austria, Austria is missing. That was
 * observed on one run in three during development.
 *
 * So coverage is pinned here instead. This script reads the feed many times, unions
 * everything it sees, and commits the result. At runtime the live feed is layered *over*
 * this baseline: fresh revisions win, but a country can never drop out entirely.
 *
 * This mirrors how `build-reference-data.ts` already handles climate and holidays —
 * generated, committed, regenerated deliberately rather than fetched hopefully.
 *
 *   npx tsx scripts/build-advisory-baseline.ts
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  ADVISORY_FEED_URL,
  mergeAdvisories,
  parseAdvisoryFeed,
  type ParsedAdvisory,
} from "../src/lib/integrations/state-dept-feed";

/**
 * Enough reads that every generation the CDN holds is very likely seen at least once.
 * Cheap: this runs deliberately, not per request.
 */
const ATTEMPTS = 16;

const OUT = path.join(process.cwd(), "src/data/generated/advisories.json");

async function readOnce(): Promise<ParsedAdvisory[]> {
  try {
    const res = await fetch(ADVISORY_FEED_URL, {
      headers: { accept: "application/rss+xml, application/xml, text/xml" },
    });
    if (!res.ok) return [];
    return parseAdvisoryFeed(await res.text()).advisories;
  } catch {
    return [];
  }
}

async function main() {
  console.log(`Reading ${ADVISORY_FEED_URL} ${ATTEMPTS}x ...`);

  // Sequential in small waves: hammering in one burst tends to be served by a single
  // node, which defeats the point of reading repeatedly.
  const batches: ParsedAdvisory[][] = [];
  for (let i = 0; i < ATTEMPTS; i += 4) {
    batches.push(...(await Promise.all([readOnce(), readOnce(), readOnce(), readOnce()])));
    process.stdout.write(`  ${Math.min(i + 4, ATTEMPTS)}/${ATTEMPTS}\r`);
  }

  const counts = batches.map((b) => b.length).filter((c) => c > 0);
  if (counts.length === 0) {
    console.error("FAIL: could not read the feed at all");
    process.exit(1);
  }

  const merged = mergeAdvisories(batches);
  const advisories = [...merged.values()].sort((a, b) =>
    a.country.localeCompare(b.country),
  );

  console.log(`\nreads returned: ${[...new Set(counts)].sort((a, b) => a - b).join(", ")} items`);
  console.log(`union: ${advisories.length} distinct countries`);

  // Guard against committing a baseline built from a bad run. The feed publishes ~213
  // countries; anything far below that means the reads mostly failed.
  if (advisories.length < 200) {
    console.error(
      `FAIL: only ${advisories.length} countries — refusing to commit a thin baseline`,
    );
    process.exit(1);
  }

  const existing = await fs
    .readFile(OUT, "utf-8")
    .then((t) => JSON.parse(t) as { advisories: ParsedAdvisory[] })
    .catch(() => null);

  if (existing) {
    const before = new Set(existing.advisories.map((a) => a.country));
    const after = new Set(advisories.map((a) => a.country));
    const dropped = [...before].filter((c) => !after.has(c));
    const added = [...after].filter((c) => !before.has(c));
    if (added.length) console.log(`added:   ${added.join(", ")}`);
    if (dropped.length) {
      // Never silently shrink coverage — a country vanishing is exactly the failure
      // this baseline exists to prevent.
      console.error(`\nFAIL: ${dropped.length} country/countries would be dropped:`);
      console.error(`  ${dropped.join(", ")}`);
      console.error("Re-run; if it persists the State Department has withdrawn them.");
      process.exit(1);
    }
  }

  const payload = {
    generatedOn: new Date().toISOString().slice(0, 10),
    source: "US Department of State travel advisories (RSS)",
    url: ADVISORY_FEED_URL,
    note: `Union of ${ATTEMPTS} reads; the feed's CDN serves several generations and no single read is complete.`,
    count: advisories.length,
    advisories,
  };

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  console.log(`\nWrote ${OUT}`);
}

main().catch((error) => {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
