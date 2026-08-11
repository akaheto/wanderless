import { describe, expect, it } from "vitest";
import { DESTINATIONS, getDestination } from "@/data/destinations";
import { CATEGORY_KEYS, type ComparisonPreferences } from "@/lib/domain/types";
import { DEFAULT_PREFERENCES, compareDestinations, scoreDestination } from "@/lib/scoring/engine";

const prefs = (overrides: Partial<ComparisonPreferences> = {}): ComparisonPreferences => ({
  ...DEFAULT_PREFERENCES,
  ...overrides,
  weights: { ...DEFAULT_PREFERENCES.weights, ...overrides.weights },
});

const ids = (result: { scores: { destination: { id: string } }[] }) =>
  result.scores.map((s) => s.destination.id);

const VIETNAM = ["hanoi", "hcmc", "hoi-an", "phu-quoc"].map((id) => getDestination(id)!);

describe("score integrity", () => {
  it("keeps every score inside 0-100", () => {
    const result = compareDestinations(DESTINATIONS, prefs(), "2027-02-06", "2027-02-18");
    for (const s of result.scores) {
      expect(s.overall, s.destination.id).toBeGreaterThanOrEqual(0);
      expect(s.overall, s.destination.id).toBeLessThanOrEqual(100);
      for (const key of CATEGORY_KEYS) {
        expect(s.categories[key].score, `${s.destination.id}.${key}`).toBeGreaterThanOrEqual(0);
        expect(s.categories[key].score, `${s.destination.id}.${key}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it("gives every category factor weights that sum to 1", () => {
    const result = compareDestinations(DESTINATIONS, prefs(), "2027-08-01", "2027-08-10");
    for (const s of result.scores) {
      for (const key of CATEGORY_KEYS) {
        const total = s.categories[key].factors.reduce((a, f) => a + f.weight, 0);
        expect(total, `${s.destination.id}.${key}`).toBeCloseTo(1, 3);
      }
    }
  });

  it("is deterministic — the same brief always produces the same ranking", () => {
    const run = () => compareDestinations(DESTINATIONS, prefs(), "2027-05-02", "2027-05-12");
    expect(ids(run())).toEqual(ids(run()));
    expect(run().scores[0].overall).toBe(run().scores[0].overall);
  });

  it("labels every factor with the tier it came from", () => {
    const s = scoreDestination(VIETNAM[0], prefs(), "2027-03-06", "2027-03-16");
    for (const key of CATEGORY_KEYS) {
      for (const f of s.categories[key].factors) {
        expect(["objective", "curated", "personal"]).toContain(f.tier);
      }
    }
  });

  it("refuses a brief that weights nothing", () => {
    expect(() =>
      scoreDestination(
        VIETNAM[0],
        prefs({ weights: Object.fromEntries(CATEGORY_KEYS.map((k) => [k, 0])) as never }),
        "2027-03-06",
        "2027-03-16",
      ),
    ).toThrow(/non-zero weight/);
  });
});

describe("dates change the answer", () => {
  /*
   * The Vietnam inversion. Central Vietnam's monsoon runs opposite to the north's, so
   * Hoi An should beat Hanoi in March and lose to it in November. If this ever stops
   * holding, the engine has stopped being date-aware in the way the whole product depends on.
   */
  it("prefers Hoi An in March and Hanoi in November", () => {
    const march = compareDestinations(VIETNAM, prefs(), "2027-03-06", "2027-03-16");
    const november = compareDestinations(VIETNAM, prefs(), "2027-11-06", "2027-11-16");

    const rank = (r: typeof march, id: string) => ids(r).indexOf(id);
    expect(rank(march, "hoi-an")).toBeLessThan(rank(march, "hanoi"));
    expect(rank(november, "hanoi")).toBeLessThan(rank(november, "hoi-an"));
  });

  it("scores Hoi An far worse in its flood season than in its dry season", () => {
    const dry = scoreDestination(getDestination("hoi-an")!, prefs(), "2027-04-05", "2027-04-15");
    const flood = scoreDestination(getDestination("hoi-an")!, prefs(), "2027-11-05", "2027-11-15");
    expect(dry.overall - flood.overall).toBeGreaterThan(15);
    expect(flood.cons.join(" ")).toMatch(/flood/i);
  });

  it("puts the two Thai coasts on opposite monsoons", () => {
    // Andaman versus Gulf. July is the Phuket monsoon and the best of the Samui year;
    // November is the reverse. This is the single most useful thing the engine knows
    // about Thailand, and the reason a date-blind "best beaches" list is useless.
    const p = prefs({ beachImportance: 5, maxTravelHours: 30 });
    const coasts = [getDestination("phuket")!, getDestination("koh-samui")!];

    expect(ids(compareDestinations(coasts, p, "2027-07-05", "2027-07-15"))[0]).toBe("koh-samui");
    expect(ids(compareDestinations(coasts, p, "2027-11-05", "2027-11-15"))[0]).toBe("phuket");
  });
});

describe("the seasonal viability gate", () => {
  /*
   * The regression this product exists to prevent. Ranking European cities in January by
   * temperature alone surfaced places nobody should visit then. Stockholm in January is
   * cheap, uncrowded and effortless to travel in — and has under six hours of daylight.
   * It must not out-rank destinations that are actually good in January.
   */
  it("keeps Stockholm out of the top half of a January ranking", () => {
    const result = compareDestinations(
      DESTINATIONS,
      prefs({ beachImportance: 1, cityVsResort: -2, maxTravelHours: 12, activityLevel: 4 }),
      "2027-01-15",
      "2027-01-21",
    );
    const order = ids(result);
    const stockholmRank = order.indexOf("stockholm");
    const withinLimit = result.scores.filter((s) => !s.exceedsTravelLimit).length;

    expect(stockholmRank).toBeGreaterThan(withinLimit / 2);
    expect(order.indexOf("lisbon")).toBeLessThan(stockholmRank);
    expect(order.indexOf("mexico-city")).toBeLessThan(stockholmRank);
  });

  it("applies no gate when the catalog rates the month well", () => {
    const s = scoreDestination(getDestination("hanoi")!, prefs(), "2027-10-06", "2027-10-16");
    expect(s.seasonalGate).toBe(1);
    expect(s.overall).toBe(s.rawOverall);
  });

  it("applies a gate, and says so, when the month is rated poorly", () => {
    const s = scoreDestination(getDestination("dubai")!, prefs(), "2027-07-06", "2027-07-16");
    expect(s.seasonalGate).toBeLessThan(0.8);
    expect(s.overall).toBeLessThan(s.rawOverall);
    expect(s.warnings.some((w) => w.label.includes("Score reduced"))).toBe(true);
  });

  it("never lets the gate silently improve a score", () => {
    for (const d of DESTINATIONS) {
      const s = scoreDestination(d, prefs(), "2027-09-01", "2027-09-10");
      expect(s.seasonalGate, d.id).toBeLessThanOrEqual(1);
      expect(s.overall, d.id).toBeLessThanOrEqual(s.rawOverall);
    }
  });
});

describe("travel time is a constraint, not a hint", () => {
  it("ranks everything that fits above everything that does not", () => {
    const result = compareDestinations(DESTINATIONS, prefs({ maxTravelHours: 10 }), "2027-02-06", "2027-02-16");
    const firstViolator = result.scores.findIndex((s) => s.exceedsTravelLimit);
    const lastCompliant = result.scores.map((s) => s.exceedsTravelLimit).lastIndexOf(false);
    expect(lastCompliant).toBeLessThan(firstViolator);
  });

  it("still scores and explains the ones it demotes", () => {
    const result = compareDestinations(DESTINATIONS, prefs({ maxTravelHours: 10 }), "2027-02-06", "2027-02-16");
    const demoted = result.scores.find((s) => s.exceedsTravelLimit)!;
    expect(demoted.overall).toBeGreaterThan(0);
    expect(demoted.warnings.some((w) => w.label.includes("exceeds your"))).toBe(true);
  });
});

describe("preferences change the ranking", () => {
  it("moves beach destinations up when beaches matter and down when they do not", () => {
    const pool = ["phu-quoc", "hanoi", "bangkok", "krabi"].map((id) => getDestination(id)!);
    const beachy = ids(
      compareDestinations(pool, prefs({ beachImportance: 5, cityVsResort: 2, maxTravelHours: 30 }), "2027-02-06", "2027-02-16"),
    );
    const cityish = ids(
      compareDestinations(pool, prefs({ beachImportance: 0, cityVsResort: -2, maxTravelHours: 30 }), "2027-02-06", "2027-02-16"),
    );

    expect(beachy.indexOf("krabi")).toBeLessThan(beachy.indexOf("bangkok"));
    expect(cityish.indexOf("bangkok")).toBeLessThan(cityish.indexOf("krabi"));
  });

  it("honours exclusions", () => {
    const result = compareDestinations(
      VIETNAM,
      prefs({ exclusions: ["hoi-an", "hanoi"] }),
      "2027-03-06",
      "2027-03-16",
    );
    expect(ids(result)).not.toContain("hoi-an");
    expect(ids(result)).not.toContain("hanoi");
    expect(ids(result)).toHaveLength(2);
  });

  it("lets a zero weight remove a category from the result entirely", () => {
    const withLodging = compareDestinations(VIETNAM, prefs(), "2027-03-06", "2027-03-16").scores[0];
    const withoutLodging = compareDestinations(
      VIETNAM,
      prefs({ weights: { ...DEFAULT_PREFERENCES.weights, lodging: 0 } }),
      "2027-03-06",
      "2027-03-16",
    ).scores[0];
    // The category is still computed and shown; it just stops moving the total.
    expect(withoutLodging.categories.lodging.score).toBeGreaterThan(0);
    expect(withoutLodging.rawOverall).not.toBe(withLodging.rawOverall);
  });
});

describe("narrative output", () => {
  it("writes a verdict that names the destination and cites its own numbers", () => {
    const s = scoreDestination(getDestination("phu-quoc")!, prefs(), "2027-02-06", "2027-02-16");
    expect(s.verdict).toContain("Phú Quốc");
    expect(s.verdict).toContain(String(s.overall));
    expect(s.verdict).toContain(`${s.climate.avgHighF}°F`);
  });

  it("caps pros and cons so the reader gets the strongest points, not all of them", () => {
    for (const d of DESTINATIONS) {
      const s = scoreDestination(d, prefs(), "2027-06-06", "2027-06-16");
      expect(s.pros.length, d.id).toBeLessThanOrEqual(4);
      expect(s.cons.length, d.id).toBeLessThanOrEqual(4);
    }
  });

  it("awards best-for labels only within a comparison, never to a lone destination", () => {
    const alone = compareDestinations([VIETNAM[0]], prefs(), "2027-03-06", "2027-03-16");
    expect(alone.scores[0].bestFor).toEqual([]);

    const many = compareDestinations(VIETNAM, prefs(), "2027-03-06", "2027-03-16");
    expect(many.scores.flatMap((s) => s.bestFor).length).toBeGreaterThan(0);
  });

  it("always attaches the caveat that hotel figures are estimates", () => {
    for (const d of DESTINATIONS) {
      const s = scoreDestination(d, prefs(), "2027-04-06", "2027-04-16");
      expect(s.warnings.some((w) => w.label.includes("planning estimates")), d.id).toBe(true);
    }
  });

  it("flags a public holiday falling inside the dates", () => {
    // Japanese Golden Week, 29 April to 5 May 2027.
    const s = scoreDestination(getDestination("tokyo")!, prefs(), "2027-04-28", "2027-05-06");
    expect(s.cons.join(" ")).toMatch(/falls during your dates/);
  });

  it("reduces confidence where holiday data does not exist", () => {
    const thai = scoreDestination(getDestination("phuket")!, prefs(), "2027-02-06", "2027-02-16");
    expect(thai.warnings.some((w) => w.label.includes("No public-holiday data"))).toBe(true);
    expect(thai.confidence).not.toBe("high");
  });
});

describe("catalog integrity", () => {
  it("gives every destination twelve months of seasons and suitability", () => {
    for (const d of DESTINATIONS) {
      expect(d.seasons, d.id).toHaveLength(12);
      expect(d.suitability, d.id).toHaveLength(12);
      for (const v of d.suitability) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(5);
      }
    }
  });

  it("uses unique ids", () => {
    expect(new Set(DESTINATIONS.map((d) => d.id)).size).toBe(DESTINATIONS.length);
  });

  it("keeps every rating on the 0-5 scale", () => {
    for (const d of DESTINATIONS) {
      for (const v of [...Object.values(d.experience), ...Object.values(d.practicality)]) {
        expect(v, d.id).toBeGreaterThanOrEqual(0);
        expect(v, d.id).toBeLessThanOrEqual(5);
      }
    }
  });

  it("only marks a destination nonstop if it has no connections", () => {
    for (const d of DESTINATIONS) {
      if (d.travel.nonstop) expect(d.travel.typicalConnections, d.id).toBe(0);
    }
  });

  it("dates every curated record", () => {
    for (const d of DESTINATIONS) {
      expect(d.curatedOn, d.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
