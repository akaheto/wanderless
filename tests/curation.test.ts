import { describe, expect, it } from "vitest";
import { DESTINATIONS, getDestination } from "@/data/destinations";
import { CLIMATE_RECORDS } from "@/data/generated/climate-index";
import {
  STALENESS_THRESHOLD_DAYS,
  checkStaleness,
  filterStale,
  type StaleDestination,
} from "@/lib/curation/staleness";
import { filterChangedMonths, generateDraft } from "@/lib/curation/draft";
import type { ClimateMonth, Destination } from "@/lib/domain/types";

/**
 * Every staleness assertion is pinned to this date. Without a fixed `asOf` these tests
 * would change meaning every day the calendar advances, and would eventually fail for
 * reasons having nothing to do with the code.
 */
const ASOF = "2026-08-12";

const climateMonth = (month: number, overrides: Partial<ClimateMonth> = {}): ClimateMonth => ({
  month,
  highF: 72,
  lowF: 58,
  precipIn: 1.5,
  rainDays: 8,
  humidityPct: 60,
  sunHours: 7,
  sstF: null,
  ...overrides,
});

const twelveMonths = (overrides: Partial<ClimateMonth> = {}): ClimateMonth[] =>
  Array.from({ length: 12 }, (_, i) => climateMonth(i + 1, overrides));

describe("checkStaleness", () => {
  it("treats a destination reviewed today as fresh", () => {
    const result = checkStaleness("x", "X", ASOF, ASOF);
    expect(result.daysSinceCuration).toBe(0);
    expect(result.isStale).toBe(false);
    expect(result.reason).toBeNull();
  });

  it("counts days since curation, not days until", () => {
    // 2026-06-12 is 61 days before 2026-08-12.
    const result = checkStaleness("x", "X", "2026-06-12", ASOF);
    expect(result.daysSinceCuration).toBe(61);
    expect(result.isStale).toBe(false);
  });

  it("holds the threshold boundary — exactly 180 days is not yet stale", () => {
    // 2026-02-13 is exactly 180 days before 2026-08-12.
    const boundary = checkStaleness("x", "X", "2026-02-13", ASOF);
    expect(boundary.daysSinceCuration).toBe(STALENESS_THRESHOLD_DAYS);
    expect(boundary.isStale).toBe(false);

    // One day earlier crosses it.
    const past = checkStaleness("x", "X", "2026-02-12", ASOF);
    expect(past.daysSinceCuration).toBe(STALENESS_THRESHOLD_DAYS + 1);
    expect(past.isStale).toBe(true);
    expect(past.reason).toBe("overdue");
  });

  it("flags a never-curated destination without inventing an age", () => {
    const result = checkStaleness("x", "X", null, ASOF);
    expect(result.isStale).toBe(true);
    expect(result.reason).toBe("never-curated");
    // Regression: this was Infinity, which rendered as "Infinity days ago".
    expect(result.daysSinceCuration).toBeNull();
    expect(Number.isFinite(result.daysSinceCuration as number)).toBe(false);
  });

  it("treats a future curatedOn as a data error, not as staleness", () => {
    // Regression: Math.abs() made a far-future date read as long-overdue.
    const farFuture = checkStaleness("x", "X", "2027-08-12", ASOF);
    expect(farFuture.reason).toBe("invalid-date");
    expect(farFuture.daysSinceCuration).toBeNull();
    expect(farFuture.isStale).toBe(true);
  });

  it("flags an unparseable date rather than throwing", () => {
    const result = checkStaleness("x", "X", "not-a-date", ASOF);
    expect(result.reason).toBe("invalid-date");
    expect(result.daysSinceCuration).toBeNull();
  });
});

describe("filterStale", () => {
  it("keeps only stale entries and sorts most-overdue first", () => {
    const input: StaleDestination[] = [
      checkStaleness("fresh", "Fresh", ASOF, ASOF),
      checkStaleness("old", "Old", "2025-01-01", ASOF),
      checkStaleness("older", "Older", "2024-01-01", ASOF),
    ];

    const out = filterStale(input);
    expect(out.map((d) => d.destinationId)).toEqual(["older", "old"]);
  });

  it("sorts entries with no computable age above dated ones", () => {
    const input: StaleDestination[] = [
      checkStaleness("old", "Old", "2024-01-01", ASOF),
      checkStaleness("never", "Never", null, ASOF),
    ];

    expect(filterStale(input)[0].destinationId).toBe("never");
  });
});

describe("generateDraft", () => {
  const base = (): Destination => {
    const d = getDestination(DESTINATIONS[0].id);
    if (!d) throw new Error("catalog is empty");
    return d;
  };

  it("returns one entry per month, in calendar order", () => {
    const drafts = generateDraft(base(), twelveMonths());
    expect(drafts).toHaveLength(12);
    expect(drafts.map((d) => d.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(drafts[0].monthName).toBe("January");
    expect(drafts[11].monthName).toBe("December");
  });

  it("skips months with no climate data rather than emitting a hole", () => {
    const sparse = twelveMonths().slice(0, 6);
    expect(generateDraft(base(), sparse)).toHaveLength(6);
  });

  it("reads the existing curated note for the month", () => {
    // Regression: monthNotes is keyed by number. A String(month) index silently missed
    // every note, so every draft compared against "".
    const destination: Destination = {
      ...base(),
      monthNotes: { 3: "March is the one to book." },
    };

    const drafts = generateDraft(destination, twelveMonths());
    expect(drafts[2].currentNote).toBe("March is the one to book.");
    // A month without a note reads as empty, not undefined.
    expect(drafts[0].currentNote).toBe("");
  });

  it("keeps every suggested rating inside the 1-5 scale", () => {
    const brutal = twelveMonths({ highF: 130, lowF: 120, rainDays: 31, sunHours: 0 });
    const idyllic = twelveMonths({ highF: 76, lowF: 64, rainDays: 0, sunHours: 11 });

    for (const climate of [brutal, idyllic]) {
      for (const draft of generateDraft(base(), climate)) {
        expect(draft.suggestedRating).toBeGreaterThanOrEqual(1);
        expect(draft.suggestedRating).toBeLessThanOrEqual(5);
      }
    }
  });

  it("rates a comfortable dry month above a hostile wet one", () => {
    const good = generateDraft(base(), twelveMonths({ highF: 75, lowF: 62, rainDays: 2, sunHours: 9 }));
    const bad = generateDraft(base(), twelveMonths({ highF: 104, lowF: 92, rainDays: 22, sunHours: 2 }));

    expect(good[0].suggestedRating).toBeGreaterThan(bad[0].suggestedRating);
  });

  it("only marks hasChange when the gap is at least half a point", () => {
    const destination: Destination = { ...base(), suitability: Array(12).fill(4) };
    // A comfortable month scores 4 (3 neutral +1 temp), matching suitability exactly.
    const drafts = generateDraft(destination, twelveMonths({ rainDays: 8, sunHours: 5 }));

    for (const draft of drafts) {
      const gap = Math.abs(draft.currentRating - draft.suggestedRating);
      expect(draft.hasChange).toBe(gap >= 0.5);
    }
  });

  it("is deterministic — same inputs, same drafts", () => {
    const climate = twelveMonths();
    expect(generateDraft(base(), climate)).toEqual(generateDraft(base(), climate));
  });
});

describe("filterChangedMonths", () => {
  it("returns only the months flagged as changed", () => {
    const drafts = generateDraft(
      { ...getDestination(DESTINATIONS[0].id)!, suitability: Array(12).fill(1) },
      twelveMonths({ highF: 75, lowF: 62, rainDays: 1, sunHours: 10 }),
    );

    const changed = filterChangedMonths(drafts);
    expect(changed.length).toBeGreaterThan(0);
    expect(changed.every((d) => d.hasChange)).toBe(true);
  });

  it("returns nothing when no month disagrees", () => {
    const drafts = generateDraft(DESTINATIONS[0], twelveMonths()).map((d) => ({
      ...d,
      hasChange: false,
    }));
    expect(filterChangedMonths(drafts)).toHaveLength(0);
  });
});

describe("curation against the real catalog", () => {
  it("produces a full draft for every destination that has climate data", () => {
    for (const destination of DESTINATIONS) {
      const record = CLIMATE_RECORDS[destination.id];
      if (!record) continue;

      const drafts = generateDraft(destination, record.monthly);
      expect(drafts, `${destination.id} produced no drafts`).toHaveLength(12);

      for (const draft of drafts) {
        expect(draft.suggestedRating).toBeGreaterThanOrEqual(1);
        expect(draft.suggestedRating).toBeLessThanOrEqual(5);
        expect(draft.suggestedNote.length).toBeGreaterThan(0);
      }
    }
  });

  it("gives every catalog destination a parseable curatedOn", () => {
    /*
     * Uses today rather than the shared ASOF pin. ASOF is fixed at 2026-08-12 so the
     * threshold assertions above can rely on exact day counts — one of them depends on a
     * precise 180-day gap — but the catalog is edited on its own schedule, and CURATED_ON
     * moved to 2026-08-13. Judged against the pin, every destination looked curated
     * *tomorrow* and came back invalid-date.
     *
     * That all 46 share one hand-edited constant able to drift past a fixed clock is the
     * defect itself; see docs/technical/specs/destination-data-contract.md §3.7.1. The
     * "never dates a curation in the future" assertion in catalog-integrity.test.ts is
     * what now guards it against the real calendar.
     */
    const today = new Date().toISOString().slice(0, 10);
    for (const destination of DESTINATIONS) {
      const result = checkStaleness(destination.id, destination.name, destination.curatedOn, today);
      expect(result.reason, `${destination.id} has an unusable curatedOn`).not.toBe("invalid-date");
    }
  });
});
