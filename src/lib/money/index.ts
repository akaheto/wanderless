/*
 * Money.
 *
 * Integer minor units plus a currency (ADR 0013). No floating point in the representation
 * or in any arithmetic over it, because a budget that disagrees with a bank statement by
 * three cents is worse than no budget.
 *
 * Two rules the rest of the app depends on:
 *   1. Arithmetic is closed over a single currency. Mixing throws.
 *   2. Conversion is explicit and carries the rate and the date it was taken.
 */

export interface Money {
  /** Integer count of minor units — cents for USD, whole đồng for VND. */
  amount: number;
  /** ISO 4217, uppercase. */
  currency: string;
}

/**
 * Minor-unit exponents, enumerated rather than defaulted.
 *
 * An earlier version defaulted anything unlisted to two decimals. That is right for most
 * currencies and a silent factor-of-100 error for the ones it is not — ₫450,000 becoming
 * ₫4,500 looks entirely plausible on screen. Since the whole point of this module is that
 * money bugs are silent, an unknown currency now fails loudly instead.
 */
const ZERO_DECIMAL = [
  "BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW", "PYG",
  "RWF", "UGX", "UYI", "VND", "VUV", "XAF", "XOF", "XPF",
] as const;

/** Three minor units. Rare, and wrong by 10× if assumed to be two. */
const THREE_DECIMAL = ["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"] as const;

/**
 * Two minor units. Not exhaustive over ISO 4217 — it covers the currencies of the catalog's
 * countries plus the majors anyone is likely to book in. Adding one is a one-line change,
 * which is the point: a deliberate edit rather than a silent default.
 */
const TWO_DECIMAL = [
  "AED", "ALL", "AMD", "ANG", "ARS", "AUD", "AZN", "BAM", "BBD", "BDT", "BGN", "BMD",
  "BND", "BOB", "BRL", "BSD", "BWP", "BZD", "CAD", "CHF", "CNY", "COP", "CRC", "CUP",
  "CZK", "DKK", "DOP", "DZD", "EGP", "ETB", "EUR", "FJD", "GBP", "GEL", "GHS", "GTQ",
  "HKD", "HNL", "HRK", "HUF", "IDR", "ILS", "INR", "JMD", "KES", "KHR", "KZT", "LAK",
  "LKR", "MAD", "MDL", "MKD", "MMK", "MNT", "MOP", "MUR", "MVR", "MXN", "MYR", "MZN",
  "NAD", "NGN", "NIO", "NOK", "NPR", "NZD", "PAB", "PEN", "PHP", "PKR", "PLN", "QAR",
  "RON", "RSD", "RUB", "SAR", "SCR", "SEK", "SGD", "THB", "TRY", "TTD", "TWD",
  "TZS", "UAH", "USD", "UYU", "UZS", "VES", "XCD", "ZAR",
] as const;

const EXPONENTS: Map<string, number> = new Map<string, number>([
  ...ZERO_DECIMAL.map((c) => [c, 0] as [string, number]),
  ...THREE_DECIMAL.map((c) => [c, 3] as [string, number]),
  ...TWO_DECIMAL.map((c) => [c, 2] as [string, number]),
]);

export function minorUnitExponent(currency: string): number {
  const code = currency.toUpperCase();
  const exponent = EXPONENTS.get(code);
  if (exponent === undefined) {
    throw new Error(
      `Unknown currency "${code}" — its minor-unit exponent is not recorded. ` +
        `Add it to ZERO_DECIMAL, TWO_DECIMAL or THREE_DECIMAL in src/lib/money/index.ts. ` +
        `Defaulting to 2 decimals would be a silent factor-of-100 error for a zero-decimal currency.`,
    );
  }
  return exponent;
}

/** Whether the app knows how to handle a currency, without throwing to find out. */
export function isKnownCurrency(currency: string): boolean {
  return EXPONENTS.has(currency.toUpperCase());
}

/** Every currency the app can handle, for populating a picker. */
export function knownCurrencies(): string[] {
  return [...EXPONENTS.keys()].sort();
}

/**
 * Largest amount we will accept, in minor units.
 *
 * Number.MAX_SAFE_INTEGER is ~9e15; this leaves three orders of magnitude of headroom for
 * summing without approaching the boundary. In VND — the catalog's largest denominator —
 * this is roughly ₫9 trillion, far beyond any trip.
 */
const MAX_MINOR_UNITS = 9e12;

export function money(amount: number, currency: string): Money {
  if (!Number.isInteger(amount)) {
    throw new Error(`Money must be whole minor units, got ${amount} ${currency}`);
  }
  if (!Number.isFinite(amount) || Math.abs(amount) > MAX_MINOR_UNITS) {
    throw new Error(`Amount out of supported range: ${amount} ${currency}`);
  }
  if (!/^[A-Za-z]{3}$/.test(currency)) {
    throw new Error(`Expected a three-letter ISO 4217 code, got "${currency}"`);
  }
  return { amount, currency: currency.toUpperCase() };
}

export const zero = (currency: string): Money => money(0, currency);

/**
 * Build Money from a major-unit figure — what a user types, or an API returns.
 *
 * Rounds half-up at the currency's precision. This is the one place a float legitimately
 * enters, and it leaves immediately as an integer.
 */
export function fromMajorUnits(value: number, currency: string): Money {
  if (!Number.isFinite(value)) {
    throw new Error(`Cannot build money from ${value} ${currency}`);
  }
  const factor = 10 ** minorUnitExponent(currency);
  return money(roundHalfUp(value * factor), currency);
}

export function toMajorUnits(m: Money): number {
  return m.amount / 10 ** minorUnitExponent(m.currency);
}

/**
 * Half-up rounding, symmetric about zero.
 *
 * Math.round breaks ties toward positive infinity, so -0.5 becomes -0, meaning a refund
 * and a charge of the same size round differently. Over a budget with credits that is a
 * real, if small, asymmetry.
 */
function roundHalfUp(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot combine ${a.currency} with ${b.currency} directly — convert through a dated rate first`,
    );
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
}

/** Multiply by a count — nights, travellers. Rounds half-up so the result stays integral. */
export function multiply(m: Money, factor: number): Money {
  if (!Number.isFinite(factor)) throw new Error(`Cannot multiply money by ${factor}`);
  return money(roundHalfUp(m.amount * factor), m.currency);
}

/**
 * Split into n parts that sum exactly back to the original.
 *
 * The naive version — divide and round each way — loses or gains minor units, so splitting
 * $10 three ways gives $3.33 × 3 = $9.99. The remainder is distributed one unit at a time
 * across the first parts instead, which is what any bill-splitting convention does.
 */
export function allocate(m: Money, parts: number): Money[] {
  if (!Number.isInteger(parts) || parts < 1) {
    throw new Error(`Cannot split money into ${parts} parts`);
  }
  const base = Math.trunc(m.amount / parts);
  let remainder = m.amount - base * parts;

  return Array.from({ length: parts }, () => {
    const extra = remainder > 0 ? 1 : remainder < 0 ? -1 : 0;
    remainder -= extra;
    return money(base + extra, m.currency);
  });
}

export function sum(items: Money[], currency: string): Money {
  return items.reduce((total, item) => add(total, item), zero(currency));
}

export const isZero = (m: Money): boolean => m.amount === 0;
export const isNegative = (m: Money): boolean => m.amount < 0;
export const compare = (a: Money, b: Money): number => {
  assertSameCurrency(a, b);
  return a.amount - b.amount;
};

export function format(m: Money, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: m.currency,
    minimumFractionDigits: minorUnitExponent(m.currency),
    maximumFractionDigits: minorUnitExponent(m.currency),
  }).format(toMajorUnits(m));
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

/**
 * A rate, with the date it was taken.
 *
 * An undated rate is not usable: rates move several percent inside a planning window, and
 * a total that silently re-converts on every page load changes without any input changing.
 */
export interface ExchangeRate {
  from: string;
  to: string;
  /** Units of `to` per one unit of `from`, in major units. */
  rate: number;
  /** YYYY-MM-DD the rate was published. */
  rateDate: string;
  source: string;
}

/** A converted amount keeps its original alongside the working. */
export interface ConvertedMoney {
  original: Money;
  converted: Money;
  rate: number;
  rateDate: string;
  source: string;
}

export function convert(m: Money, rate: ExchangeRate): ConvertedMoney {
  if (m.currency !== rate.from.toUpperCase()) {
    throw new Error(`Rate converts ${rate.from}, but the amount is ${m.currency}`);
  }
  if (!Number.isFinite(rate.rate) || rate.rate <= 0) {
    throw new Error(`Invalid exchange rate ${rate.rate} for ${rate.from}→${rate.to}`);
  }

  // Via major units, because the rate is quoted in them and the currencies may have
  // different exponents (VND→USD is 0 → 2). Rounded once, here.
  const converted = fromMajorUnits(toMajorUnits(m) * rate.rate, rate.to);

  return {
    original: m,
    converted,
    rate: rate.rate,
    rateDate: rate.rateDate,
    source: rate.source,
  };
}

/**
 * Total a set of amounts in mixed currencies.
 *
 * Returns the total plus every conversion performed, so the UI can show what was converted
 * and at what rate. A total that cannot show its working is not auditable, and an
 * unauditable budget is the thing this design exists to prevent.
 */
export function totalIn(
  items: Money[],
  target: string,
  rates: ExchangeRate[],
): { total: Money; conversions: ConvertedMoney[]; missingRates: string[] } {
  const targetCode = target.toUpperCase();
  const byPair = new Map(rates.map((r) => [`${r.from.toUpperCase()}|${r.to.toUpperCase()}`, r]));

  const conversions: ConvertedMoney[] = [];
  const missingRates: string[] = [];
  let total = zero(targetCode);

  for (const item of items) {
    if (item.currency === targetCode) {
      total = add(total, item);
      continue;
    }
    const rate = byPair.get(`${item.currency}|${targetCode}`);
    if (!rate) {
      // Recorded, not silently dropped and not guessed at 1:1 — either would produce a
      // total that looks complete and is not.
      if (!missingRates.includes(item.currency)) missingRates.push(item.currency);
      continue;
    }
    const conversion = convert(item, rate);
    conversions.push(conversion);
    total = add(total, conversion.converted);
  }

  return { total, conversions, missingRates };
}
