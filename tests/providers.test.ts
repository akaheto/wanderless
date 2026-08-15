import { describe, expect, it } from "vitest";
import {
  SOURCES,
  fetched,
  isConfigured,
  isStale,
  sourceSpec,
  unavailable,
  type Fetched,
} from "@/lib/providers/contract";

describe("Fetched", () => {
  it("carries a value with the source's own date", () => {
    const r = fetched(42, "2026-08-15");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toBe(42);
      expect(r.sourceDate).toBe("2026-08-15");
    }
  });

  it("carries a reason when it fails, not a null", () => {
    // The distinction the type exists for: a null cannot say why, so a caller cannot
    // tell "nothing to report" from "could not reach the source".
    const r: Fetched<number> = unavailable("feed returned HTTP 503");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("503");
  });

  it("narrows so a failure cannot be read as a value", () => {
    const r: Fetched<string> = unavailable("nope");
    // @ts-expect-error `value` does not exist on the failure branch
    expect(r.value).toBeUndefined();
  });
});

describe("source registry", () => {
  it("gives every source a unique id", () => {
    const ids = SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every source a reader-facing name and a positive threshold", () => {
    for (const s of SOURCES) {
      expect(s.name.trim(), s.id).not.toBe("");
      expect(s.staleAfterDays, s.id).toBeGreaterThan(0);
    }
  });

  it("looks sources up by id", () => {
    expect(sourceSpec("state-dept")?.kind).toBe("primary");
    expect(sourceSpec("nager-date")?.kind).toBe("secondary");
    expect(sourceSpec("no-such-source")).toBeUndefined();
  });

  /**
   * Thresholds should differ by orders of magnitude, because the right answer does. A
   * climate normal drawn from a decade holds for years; a security advisory stale by a
   * month does not. A registry where everything shared one number would be wrong for
   * nearly everything in it.
   */
  it("varies the staleness threshold by what the source actually is", () => {
    const advisory = sourceSpec("state-dept")!.staleAfterDays;
    const climate = sourceSpec("open-meteo-archive")!.staleAfterDays;
    const rates = sourceSpec("frankfurter")!.staleAfterDays;
    expect(rates).toBeLessThan(advisory);
    expect(advisory).toBeLessThan(climate);
  });

  it("marks the crowdsourced ones as such rather than as primary", () => {
    // Wikipedia route tables and OSM are useful and not authoritative. Recording that
    // distinction is what stops them being cited like the State Department.
    expect(sourceSpec("wikipedia-airports")?.kind).toBe("crowdsourced");
    expect(sourceSpec("nominatim")?.kind).toBe("crowdsourced");
  });
});

describe("isConfigured", () => {
  it("treats keyless sources as always configured", () => {
    expect(isConfigured(sourceSpec("state-dept")!, {})).toBe(true);
  });

  it("requires every declared key", () => {
    const booking = sourceSpec("rapidapi-booking")!;
    expect(isConfigured(booking, {})).toBe(false);
    expect(isConfigured(booking, { RAPIDAPI_KEY: "k" })).toBe(false);
    expect(isConfigured(booking, { RAPIDAPI_KEY: "k", RAPIDAPI_HOST: "h" })).toBe(true);
  });

  it("does not accept an empty string as a credential", () => {
    expect(isConfigured(sourceSpec("yelp")!, { YELP_API_KEY: "" })).toBe(false);
  });
});

describe("isStale", () => {
  const advisory = sourceSpec("state-dept")!; // 30 days

  it("is fresh inside the threshold", () => {
    expect(isStale(advisory, "2026-08-01", "2026-08-15")).toBe(false);
  });

  it("is stale past it", () => {
    expect(isStale(advisory, "2026-06-01", "2026-08-15")).toBe(true);
  });

  it("treats an unparseable or missing date as stale", () => {
    // Not knowing how old something is is not the same as it being fresh.
    expect(isStale(advisory, "not-a-date", "2026-08-15")).toBe(true);
    expect(isStale(advisory, "", "2026-08-15")).toBe(true);
  });

  it("takes the clock rather than reading it, so assertions stay stable", () => {
    // Pinned both sides: this test means the same thing next year.
    expect(isStale(advisory, "2020-01-01", "2020-01-15")).toBe(false);
    expect(isStale(advisory, "2020-01-01", "2020-03-01")).toBe(true);
  });
});
