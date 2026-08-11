import { describe, expect, it } from "vitest";
import {
  addDays,
  datesInRange,
  formatDateRange,
  leapDayIndex,
  leapDayIndexOf,
  monthsInRange,
  nightsBetween,
  parseDate,
} from "@/lib/dates";

describe("parseDate", () => {
  it("parses at UTC midnight so the calendar day never shifts with the server timezone", () => {
    expect(parseDate("2027-03-06").toISOString()).toBe("2027-03-06T00:00:00.000Z");
  });

  it("rejects anything that is not a plain calendar date", () => {
    expect(() => parseDate("6 March 2027")).toThrow();
    expect(() => parseDate("2027-3-6")).toThrow();
    expect(() => parseDate("2027-13-01")).toThrow();
  });
});

describe("nightsBetween", () => {
  it("counts nights, not days — arrive the 1st, leave the 5th is 4 nights", () => {
    expect(nightsBetween("2027-03-01", "2027-03-05")).toBe(4);
  });

  it("is unaffected by daylight saving transitions", () => {
    // US clocks go forward on 14 March 2027; a naive local-time diff would give 9.958 days.
    expect(nightsBetween("2027-03-10", "2027-03-20")).toBe(10);
  });
});

describe("datesInRange", () => {
  it("is inclusive of both ends", () => {
    expect(datesInRange("2027-03-06", "2027-03-09")).toEqual([
      "2027-03-06",
      "2027-03-07",
      "2027-03-08",
      "2027-03-09",
    ]);
  });

  it("crosses a month boundary", () => {
    expect(datesInRange("2027-02-27", "2027-03-02")).toHaveLength(4);
  });

  it("handles a leap day", () => {
    expect(datesInRange("2028-02-28", "2028-03-01")).toEqual(["2028-02-28", "2028-02-29", "2028-03-01"]);
  });
});

describe("leapDayIndex", () => {
  /*
   * This is the contract between the climate build script and the app. If these move,
   * every exact-date lookup silently reads the wrong day of the year.
   */
  it("pins the calendar anchors", () => {
    expect(leapDayIndex(1, 1)).toBe(0);
    expect(leapDayIndex(2, 29)).toBe(59);
    expect(leapDayIndex(3, 1)).toBe(60);
    expect(leapDayIndex(12, 31)).toBe(365);
  });

  it("maps 1 March to the same slot in leap and non-leap years", () => {
    expect(leapDayIndexOf("2027-03-01")).toBe(leapDayIndexOf("2028-03-01"));
  });
});

describe("monthsInRange", () => {
  it("returns each month touched, in order, once", () => {
    expect(monthsInRange("2027-02-25", "2027-04-03")).toEqual([2, 3, 4]);
  });
});

describe("addDays", () => {
  it("crosses a year boundary", () => {
    expect(addDays("2027-12-30", 3)).toBe("2028-01-02");
  });
});

describe("formatDateRange", () => {
  it("collapses a shared month", () => {
    expect(formatDateRange("2027-03-06", "2027-03-16")).toBe("6–16 Mar 2027");
  });

  it("collapses a shared year", () => {
    expect(formatDateRange("2027-02-27", "2027-03-04")).toBe("27 Feb – 4 Mar 2027");
  });

  it("spells out a range crossing new year", () => {
    expect(formatDateRange("2027-12-28", "2028-01-04")).toBe("Dec 28, 2027 – Jan 4, 2028");
  });

  it("says so when dates are missing rather than inventing them", () => {
    expect(formatDateRange(null, "2027-03-16")).toBe("Dates not set");
  });
});
