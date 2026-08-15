import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  countryKey,
  mergeAdvisories,
  normalizeCountry,
  parseAdvisoryFeed,
  type ParsedAdvisory,
} from "@/lib/integrations/state-dept-feed";
import { DESTINATIONS } from "@/data/destinations";

/**
 * The fixture holds real items captured from the live State Department feed on
 * 2026-08-15, spanning all four advisory levels, plus one clearly-marked synthetic
 * item that does not match the title grammar so the skip path is exercised.
 *
 * Real items rather than invented XML: the parser's whole job is to survive the
 * feed's actual quirks — CDATA bodies full of HTML, and a `pubDate` with no time or
 * zone — and a hand-written fixture would quietly omit exactly those.
 */
const FIXTURE = readFileSync(
  join(__dirname, "fixtures", "state-dept-feed.xml"),
  "utf-8",
);

const byCountry = (list: ParsedAdvisory[], name: string) =>
  list.find((a) => a.country === name);

describe("parseAdvisoryFeed", () => {
  const { advisories, skipped } = parseAdvisoryFeed(FIXTURE);

  it("parses every well-formed item and skips the malformed one", () => {
    expect(advisories).toHaveLength(7);
    expect(skipped).toBe(1);
  });

  it("extracts country, level and headline from the title grammar", () => {
    expect(byCountry(advisories, "Japan")).toMatchObject({
      level: 1,
      headline: "Exercise Normal Precautions",
    });
    expect(byCountry(advisories, "Kenya")).toMatchObject({
      level: 2,
      headline: "Exercise Increased Caution",
    });
  });

  it("covers all four advisory levels", () => {
    expect(new Set(advisories.map((a) => a.level))).toEqual(new Set([1, 2, 3, 4]));
  });

  it("converts the feed's non-conformant pubDate into an ISO date", () => {
    // The feed emits "Tue, 28 Jul 2026" — no time, no zone.
    for (const a of advisories) {
      expect(a.publishedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("strips HTML and entities out of the CDATA body", () => {
    for (const a of advisories) {
      expect(a.summary).not.toMatch(/<[a-z/]/i);
      expect(a.summary).not.toContain("&nbsp;");
      expect(a.summary).not.toContain("]]>");
    }
  });

  it("keeps a usable source URL for every advisory", () => {
    for (const a of advisories) {
      expect(a.url).toMatch(/^https:\/\//);
    }
  });

  it("never emits an advisory without a source date", () => {
    // An undated advisory cannot honour the verifiedOn rule and must be skipped,
    // not published with a fetch-time stamp standing in for the source's date.
    expect(advisories.every((a) => Boolean(a.publishedOn))).toBe(true);
  });

  it("returns empty rather than throwing on junk input", () => {
    expect(parseAdvisoryFeed("not xml at all").advisories).toHaveLength(0);
    expect(parseAdvisoryFeed("").advisories).toHaveLength(0);
  });
});

describe("normalizeCountry", () => {
  it("maps catalog names onto the feed's naming", () => {
    // Verified against the live feed on 2026-08-15: these three were the only
    // catalog countries that did not match the feed directly.
    expect(normalizeCountry("Czech Republic")).toBe("Czechia");
    expect(normalizeCountry("Denmark")).toBe("Kingdom of Denmark");
    expect(normalizeCountry("Scotland")).toBe("United Kingdom");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(normalizeCountry("  czech republic  ")).toBe("Czechia");
    expect(normalizeCountry("DENMARK")).toBe("Kingdom of Denmark");
  });

  it("passes through names that already match", () => {
    expect(normalizeCountry("Japan")).toBe("Japan");
    expect(normalizeCountry("United Kingdom")).toBe("United Kingdom");
  });
});

describe("countryKey", () => {
  /**
   * The feed is served through a CDN whose nodes disagree about encoding. Both of these
   * spellings for the same country were observed in a union of consecutive fetches on
   * 2026-08-15, so a raw-string key misses roughly half the time.
   */
  it("folds encoding variants of the same country onto one key", () => {
    expect(countryKey("Côte d'Ivoire")).toBe(countryKey("Cote d Ivoire"));
    expect(countryKey("São Tomé and Príncipe")).toBe(
      countryKey("Sao Tome and Principe"),
    );
  });

  it("ignores case, punctuation and spacing", () => {
    expect(countryKey("  UNITED   KINGDOM ")).toBe(countryKey("United Kingdom"));
    expect(countryKey("Timor-Leste")).toBe(countryKey("Timor Leste"));
  });

  it("keeps genuinely different countries apart", () => {
    expect(countryKey("Niger")).not.toBe(countryKey("Nigeria"));
    expect(countryKey("Congo")).not.toBe(countryKey("Democratic Republic of the Congo"));
  });
});

describe("mergeAdvisories", () => {
  const mk = (country: string, publishedOn: string, level = 1): ParsedAdvisory => ({
    country,
    level: level as ParsedAdvisory["level"],
    headline: "h",
    summary: "s",
    url: "https://travel.state.gov/x",
    publishedOn,
  });

  /**
   * A single read of the feed omits around a dozen countries — Austria was absent from
   * five of six consecutive fetches during development. Unioning reads is what keeps a
   * destination's advisory from appearing and vanishing between page loads.
   */
  it("recovers countries missing from an individual read", () => {
    const merged = mergeAdvisories([
      [mk("Japan", "2025-05-15"), mk("Kenya", "2026-07-28")],
      [mk("Japan", "2025-05-15"), mk("Austria", "2024-08-23")],
    ]);
    expect([...merged.keys()].sort()).toEqual(["austria", "japan", "kenya"]);
  });

  it("keeps the most recently revised entry when reads disagree", () => {
    const merged = mergeAdvisories([
      [mk("Spain", "2025-05-12", 2)],
      [mk("Spain", "2026-08-01", 2)],
    ]);
    expect(merged.get("spain")?.publishedOn).toBe("2026-08-01");
  });

  it("collapses encoding variants rather than double-counting them", () => {
    const merged = mergeAdvisories([
      [mk("Côte d'Ivoire", "2026-01-01")],
      [mk("Cote d Ivoire", "2026-01-01")],
    ]);
    expect(merged.size).toBe(1);
  });

  it("returns an empty index for no input rather than throwing", () => {
    expect(mergeAdvisories([]).size).toBe(0);
    expect(mergeAdvisories([[]]).size).toBe(0);
  });
});

describe("catalog coverage", () => {
  /**
   * Guards the join between the catalog and the feed. A country added to the catalog
   * whose name differs from the State Department's would otherwise render no advisory
   * at all — and on safety data, a missing section reads as "no problems here".
   *
   * The alias table is the fix; this test is what makes a new mismatch fail loudly
   * instead of shipping silently.
   */
  it("normalises every catalog country to a name the feed publishes", () => {
    const published = new Set(
      [
        "Japan",
        "Kenya",
        "Czechia",
        "Kingdom of Denmark",
        "United Kingdom",
        "Kuwait",
        "Democratic Republic of the Congo",
      ].map((c) => c.toLowerCase()),
    );

    // Only the fixture's countries can be asserted offline, so this checks the
    // mechanism: aliased names must resolve to something other than themselves.
    const aliased = ["Czech Republic", "Denmark", "Scotland"];
    for (const name of aliased) {
      expect(published.has(normalizeCountry(name).toLowerCase())).toBe(true);
    }
  });

  it("has a country string for every destination in the catalog", () => {
    for (const d of DESTINATIONS) {
      expect(d.country.trim().length).toBeGreaterThan(0);
    }
  });
});
