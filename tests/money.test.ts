import { describe, expect, it } from "vitest";
import {
  type ExchangeRate,
  add,
  allocate,
  convert,
  format,
  fromMajorUnits,
  isKnownCurrency,
  knownCurrencies,
  minorUnitExponent,
  money,
  multiply,
  subtract,
  sum,
  toMajorUnits,
  totalIn,
  zero,
} from "@/lib/money";
import {
  type BudgetItem,
  byCategory,
  isRecoverable,
  perTraveller,
  summariseBudget,
  upcomingPayments,
} from "@/lib/money/budget";

const usd = (major: number) => fromMajorUnits(major, "USD");
const vnd = (major: number) => fromMajorUnits(major, "VND");

const rate = (from: string, to: string, r: number): ExchangeRate => ({
  from,
  to,
  rate: r,
  rateDate: "2026-08-11",
  source: "Frankfurter (ECB)",
});

describe("minor units", () => {
  it("knows which currencies have no minor unit", () => {
    expect(minorUnitExponent("VND")).toBe(0);
    expect(minorUnitExponent("JPY")).toBe(0);
    expect(minorUnitExponent("USD")).toBe(2);
    expect(minorUnitExponent("KWD")).toBe(3);
  });

  it("is case-insensitive", () => {
    expect(minorUnitExponent("vnd")).toBe(0);
  });

  it("refuses an unknown currency rather than defaulting to two decimals", () => {
    // The one silent failure this module used to have: an unlisted zero-decimal currency
    // would quietly become a factor-of-100 error that looks entirely plausible on screen.
    expect(() => minorUnitExponent("ZZZ")).toThrow(/Unknown currency/);
    expect(() => fromMajorUnits(450_000, "ZZZ")).toThrow(/Unknown currency/);
    expect(() => money(100, "ZZZ")).not.toThrow(); // construction alone does not need it
  });

  it("can be asked whether a currency is known without throwing", () => {
    expect(isKnownCurrency("VND")).toBe(true);
    expect(isKnownCurrency("zzz")).toBe(false);
    expect(knownCurrencies()).toContain("THB");
    expect(knownCurrencies().length).toBeGreaterThan(100);
  });

  it("round-trips major units for a zero-decimal currency", () => {
    // The factor-of-100 bug: ₫450,000 must not become ₫4,500.
    const m = vnd(450_000);
    expect(m.amount).toBe(450_000);
    expect(toMajorUnits(m)).toBe(450_000);
  });

  it("round-trips major units for a two-decimal currency", () => {
    expect(usd(125.5).amount).toBe(12550);
    expect(toMajorUnits(usd(125.5))).toBe(125.5);
  });
});

describe("construction", () => {
  it("refuses fractional minor units", () => {
    expect(() => money(12.5, "USD")).toThrow(/whole minor units/);
  });

  it("refuses a non-ISO currency code", () => {
    expect(() => money(100, "DOLLARS")).toThrow(/ISO 4217/);
    expect(() => money(100, "$$")).toThrow();
  });

  it("normalises the currency to uppercase", () => {
    expect(money(100, "usd").currency).toBe("USD");
  });

  it("refuses an amount beyond the safe range", () => {
    expect(() => money(9e15, "USD")).toThrow(/out of supported range/);
  });

  it("rounds half-up symmetrically about zero", () => {
    // Math.round would give -0 here, so a refund and a charge would round differently.
    expect(fromMajorUnits(0.005, "USD").amount).toBe(1);
    expect(fromMajorUnits(-0.005, "USD").amount).toBe(-1);
  });
});

describe("arithmetic", () => {
  it("adds without floating-point drift", () => {
    // 0.1 + 0.2 !== 0.3 in floats. In minor units it is exact.
    expect(add(usd(0.1), usd(0.2))).toEqual(usd(0.3));
    expect(add(usd(0.1), usd(0.2)).amount).toBe(30);
  });

  it("stays exact over many additions", () => {
    // In floats this drifts: 0.07 has no exact binary representation, so summing it a
    // thousand times lands near 70.00000000000023.
    const items = Array.from({ length: 1000 }, () => usd(0.07));
    expect(sum(items, "USD").amount).toBe(7_000);
    expect(toMajorUnits(sum(items, "USD"))).toBe(70);
  });

  it("is order-independent", () => {
    const a = [usd(19.99), usd(0.01), usd(1234.56), usd(0.07)];
    const forwards = sum(a, "USD");
    const backwards = sum([...a].reverse(), "USD");
    expect(forwards).toEqual(backwards);
  });

  it("refuses to combine different currencies", () => {
    expect(() => add(usd(10), vnd(10))).toThrow(/Cannot combine USD with VND/);
    expect(() => subtract(usd(10), vnd(10))).toThrow(/convert through a dated rate/);
  });

  it("multiplies by a count exactly", () => {
    expect(multiply(usd(286), 10)).toEqual(usd(2860));
    expect(multiply(vnd(1_150_000), 7)).toEqual(vnd(8_050_000));
  });

  it("sums an empty list to zero in the target currency", () => {
    expect(sum([], "VND")).toEqual(zero("VND"));
  });
});

describe("allocate", () => {
  it("splits without losing a minor unit", () => {
    const parts = allocate(usd(10), 3);
    expect(parts.map((p) => p.amount)).toEqual([334, 333, 333]);
    expect(sum(parts, "USD")).toEqual(usd(10));
  });

  it("always sums back to the original, for any split", () => {
    for (const total of [usd(0.01), usd(99.99), usd(1), vnd(1_000_001)]) {
      for (const parts of [1, 2, 3, 4, 7, 11]) {
        expect(sum(allocate(total, parts), total.currency), `${total.amount}/${parts}`).toEqual(
          total,
        );
      }
    }
  });

  it("handles a negative total without losing a unit", () => {
    const parts = allocate(usd(-10), 3);
    expect(sum(parts, "USD")).toEqual(usd(-10));
  });

  it("refuses a nonsensical split", () => {
    expect(() => allocate(usd(10), 0)).toThrow();
    expect(() => allocate(usd(10), 2.5)).toThrow();
  });
});

describe("conversion", () => {
  it("converts between currencies with different exponents", () => {
    // ₫1,150,000 at 0.0000391 USD/VND ≈ $44.97
    const result = convert(vnd(1_150_000), rate("VND", "USD", 0.0000391));
    expect(result.converted.currency).toBe("USD");
    expect(toMajorUnits(result.converted)).toBeCloseTo(44.97, 2);
  });

  it("keeps the original, the rate and the date", () => {
    const result = convert(usd(100), rate("USD", "VND", 25_575));
    expect(result.original).toEqual(usd(100));
    expect(result.converted).toEqual(vnd(2_557_500));
    expect(result.rateDate).toBe("2026-08-11");
    expect(result.source).toContain("Frankfurter");
  });

  it("refuses a rate for the wrong currency", () => {
    expect(() => convert(usd(100), rate("VND", "USD", 0.00004))).toThrow(/Rate converts VND/);
  });

  it("refuses an impossible rate", () => {
    expect(() => convert(usd(100), rate("USD", "VND", 0))).toThrow(/Invalid exchange rate/);
    expect(() => convert(usd(100), rate("USD", "VND", -1))).toThrow();
  });
});

describe("totalIn", () => {
  const rates = [rate("VND", "USD", 0.0000391), rate("THB", "USD", 0.0281)];

  it("totals a mixed-currency set and reports its working", () => {
    const result = totalIn([usd(500), vnd(2_300_000), fromMajorUnits(4000, "THB")], "USD", rates);
    expect(toMajorUnits(result.total)).toBeCloseTo(500 + 89.93 + 112.4, 1);
    expect(result.conversions).toHaveLength(2);
    expect(result.missingRates).toEqual([]);
  });

  it("excludes what it cannot convert and says so, rather than assuming 1:1", () => {
    const result = totalIn([usd(500), fromMajorUnits(200, "GBP")], "USD", rates);
    expect(result.total).toEqual(usd(500));
    expect(result.missingRates).toEqual(["GBP"]);
  });

  it("reports each missing currency once", () => {
    const result = totalIn(
      [fromMajorUnits(1, "GBP"), fromMajorUnits(2, "GBP"), fromMajorUnits(3, "EUR")],
      "USD",
      rates,
    );
    expect(result.missingRates).toEqual(["GBP", "EUR"]);
  });

  it("needs no rate for amounts already in the target currency", () => {
    const result = totalIn([usd(10), usd(20)], "USD", []);
    expect(result.total).toEqual(usd(30));
    expect(result.conversions).toEqual([]);
  });
});

describe("format", () => {
  it("shows no decimals for a zero-decimal currency", () => {
    expect(format(vnd(450_000))).not.toContain(".");
  });

  it("shows two decimals for USD", () => {
    expect(format(usd(1234.5))).toBe("$1,234.50");
  });
});

// ---------------------------------------------------------------------------

const item = (overrides: Partial<BudgetItem> = {}): BudgetItem => ({
  id: 1,
  tripId: 1,
  category: "lodging",
  label: "Hotel",
  estimated: usd(1000),
  booked: null,
  refundable: true,
  refundableUntil: null,
  dueOn: null,
  paid: false,
  ...overrides,
});

const TODAY = "2026-08-11";

describe("refundability", () => {
  it("treats a non-refundable booking as unrecoverable", () => {
    expect(isRecoverable(item({ refundable: false }), TODAY)).toBe(false);
  });

  it("treats an open-ended refundable booking as recoverable", () => {
    expect(isRecoverable(item({ refundable: true, refundableUntil: null }), TODAY)).toBe(true);
  });

  it("treats a refundable booking past its window as unrecoverable", () => {
    // The bug that overstates what you can get back: trusting the flag alone.
    expect(isRecoverable(item({ refundableUntil: "2026-08-01" }), TODAY)).toBe(false);
  });

  it("counts the last refundable day as still recoverable", () => {
    expect(isRecoverable(item({ refundableUntil: TODAY }), TODAY)).toBe(true);
  });
});

describe("summariseBudget", () => {
  it("counts only committed money as exposure, never estimates", () => {
    const totals = summariseBudget(
      [item({ estimated: usd(2000), booked: null, refundable: false })],
      "USD",
      [],
      TODAY,
    );
    expect(totals.estimated).toEqual(usd(2000));
    expect(totals.exposure).toEqual(zero("USD"));
  });

  it("separates recoverable from exposed committed money", () => {
    const totals = summariseBudget(
      [
        item({ id: 1, label: "Flights", booked: usd(1800), refundable: false }),
        item({ id: 2, label: "Hotel", booked: usd(2860), refundable: true, refundableUntil: "2027-02-01" }),
      ],
      "USD",
      [],
      TODAY,
    );
    expect(totals.booked).toEqual(usd(4660));
    expect(totals.exposure).toEqual(usd(1800));
    expect(totals.recoverable).toEqual(usd(2860));
  });

  it("moves a lapsed refundable booking into exposure", () => {
    const totals = summariseBudget(
      [item({ booked: usd(2860), refundable: true, refundableUntil: "2026-08-01" })],
      "USD",
      [],
      TODAY,
    );
    expect(totals.exposure).toEqual(usd(2860));
    expect(totals.recoverable).toEqual(zero("USD"));
  });

  it("computes variance against the estimate", () => {
    const totals = summariseBudget(
      [item({ estimated: usd(1000), booked: usd(1250) })],
      "USD",
      [],
      TODAY,
    );
    expect(totals.variance).toEqual(usd(250));
    expect(totals.warnings.some((w) => w.label.includes("over the estimate"))).toBe(true);
  });

  it("flags a missing rate as serious and excludes the item", () => {
    const totals = summariseBudget(
      [item({ estimated: usd(500) }), item({ id: 2, estimated: vnd(2_300_000) })],
      "USD",
      [],
      TODAY,
    );
    expect(totals.estimated).toEqual(usd(500));
    const warning = totals.warnings.find((w) => w.label.includes("No exchange rate"));
    expect(warning?.severity).toBe("serious");
    expect(warning?.detail).toContain("not converted at 1:1");
  });

  it("flags overdue payments", () => {
    const totals = summariseBudget(
      [item({ label: "Balance", booked: usd(900), dueOn: "2026-08-04", paid: false })],
      "USD",
      [],
      TODAY,
    );
    const warning = totals.warnings.find((w) => w.label.includes("overdue"));
    expect(warning?.severity).toBe("serious");
    expect(warning?.detail).toContain("7 days ago");
  });

  it("flags a payment due within the week", () => {
    const totals = summariseBudget(
      [item({ label: "Deposit", booked: usd(400), dueOn: "2026-08-14" })],
      "USD",
      [],
      TODAY,
    );
    expect(totals.warnings.some((w) => w.label.includes("due within a week"))).toBe(true);
  });

  it("ignores payments already made", () => {
    const totals = summariseBudget(
      [item({ booked: usd(400), dueOn: "2026-08-04", paid: true })],
      "USD",
      [],
      TODAY,
    );
    expect(totals.warnings.some((w) => w.label.includes("overdue"))).toBe(false);
  });

  it("warns when free cancellation is about to lapse", () => {
    const totals = summariseBudget(
      [item({ label: "Resort", booked: usd(2000), refundable: true, refundableUntil: "2026-08-13" })],
      "USD",
      [],
      TODAY,
    );
    const warning = totals.warnings.find((w) => w.label.includes("Free cancellation ends"));
    expect(warning?.detail).toContain("becomes exposure");
  });

  it("handles an empty budget without inventing figures", () => {
    const totals = summariseBudget([], "USD", [], TODAY);
    expect(totals.estimated).toEqual(zero("USD"));
    expect(totals.booked).toEqual(zero("USD"));
    expect(totals.exposure).toEqual(zero("USD"));
    expect(totals.warnings.filter((w) => w.severity === "serious")).toEqual([]);
  });
});

describe("byCategory", () => {
  it("groups by category, largest first, preferring booked over estimated", () => {
    const rows = byCategory(
      [
        item({ id: 1, category: "lodging", estimated: usd(1000), booked: usd(2860) }),
        item({ id: 2, category: "flights", estimated: usd(1800) }),
        item({ id: 3, category: "food", estimated: usd(600) }),
      ],
      "USD",
      [],
    );
    expect(rows.map((r) => r.category)).toEqual(["lodging", "flights", "food"]);
    expect(rows[0].total).toEqual(usd(2860));
  });
});

describe("upcomingPayments", () => {
  it("returns unpaid items soonest first", () => {
    const rows = upcomingPayments(
      [
        item({ id: 1, label: "Late", booked: usd(100), dueOn: "2026-09-01" }),
        item({ id: 2, label: "Soon", booked: usd(200), dueOn: "2026-08-12" }),
        item({ id: 3, label: "Paid", booked: usd(300), dueOn: "2026-08-11", paid: true }),
      ],
      TODAY,
    );
    expect(rows.map((r) => r.item.label)).toEqual(["Soon", "Late"]);
    expect(rows[0].days).toBe(1);
  });
});

describe("perTraveller", () => {
  it("splits a total so the shares sum back exactly", () => {
    const shares = perTraveller(usd(2860), 3);
    expect(shares).toHaveLength(3);
    expect(sum(shares, "USD")).toEqual(usd(2860));
    expect(shares[0].amount - shares[2].amount).toBeLessThanOrEqual(1);
  });
});
