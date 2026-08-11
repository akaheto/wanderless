# 0013. Money is integer minor units with an explicit currency and a dated rate

- **Status**: Accepted
- **Date**: 2026-08-11

## Context

Release 6 introduces budgets: estimated against booked, refundable exposure, payment
deadlines, and multiple currencies. A trip pays for hotels in Vietnamese đồng, a flight in
US dollars, and a tour in Thai baht, then wants one total.

Three well-known ways to get this wrong, all of which look fine in testing:

**Floating point.** `0.1 + 0.2 !== 0.3`. Summing a few dozen line items in binary floating
point produces totals that are off by cents and that disagree depending on the order of
summation. The error is invisible until a total is compared with a real statement.

**A bare number with an implied currency.** `cost: 4500000` is either a rounding error or a
perfectly ordinary Hanoi hotel bill, and nothing in the type says which. Currencies also
differ in how many minor units they have — VND and JPY have none, so treating everything as
"cents" is wrong for a third of the catalog's countries.

**An undated exchange rate.** A total converted at "the rate" is meaningless without knowing
when the rate was taken. Rates move several percent within a trip's planning window, and a
budget that silently re-converts on every page load changes without any input changing.

The project already has an answer to the third problem in general form: the three-tier model
(ADR 0001) requires measured data to carry its source and date. An exchange rate is measured
data and gets the same treatment.

## Decision

**`Money` is an integer count of minor units plus an ISO 4217 currency code.** No floating
point anywhere in the representation or in arithmetic over it.

```
{ amount: 4500000, currency: "VND" }   // ₫45,000 — VND has 0 minor units
{ amount: 12550,   currency: "USD" }   // $125.50
```

Minor-unit exponents come from a table, defaulting to 2 with the zero-decimal currencies
(VND, JPY, KRW, CLP, ISK…) enumerated explicitly. Formatting uses `Intl.NumberFormat` so
locale conventions are not reimplemented.

**Arithmetic is closed over a single currency.** `add` throws on mismatched currencies
rather than coercing — an accidental cross-currency sum is a bug, not something to paper
over. Combining currencies requires an explicit conversion through a dated rate.

**A converted amount carries its rate and the date the rate was taken.** `ConvertedMoney`
holds the original, the result, the rate and `rateDate`. Conversion is a deliberate act with
a visible provenance trail, not a property accessor.

**Rounding is stated, not incidental.** Conversion rounds half-up at the target currency's
precision, once, at the point of conversion. Totals are summed in minor units and never
re-rounded.

## Alternatives considered

- **Floating-point dollars, rounded at display.** The default, and the source of every
  cent-level discrepancy. Rejected outright.
- **A decimal library (decimal.js, dinero.js).** Correct, and the right call if this grew
  into real accounting. Rejected for now: integer minor units solve the whole problem at
  this scale in far less code, with no dependency, and the project has a stated preference
  for adding dependencies deliberately. Dinero.js is the upgrade path if multi-currency
  arithmetic gets harder than sums and conversions.
- **Store everything in USD at entry.** One currency, simple totals. Rejected because it
  destroys information: the amount actually paid was in đồng, and re-deriving it from a USD
  figure and a later rate gives a different number than the receipt.
- **Convert lazily at render with a live rate.** Rejected — a budget that changes when
  nothing changed is not a budget.

## Consequences

**Easier:** Totals are exact. A cross-currency mistake fails loudly at the point of the
error. Every converted figure can show its rate and date, which is the same provenance
discipline the rest of the app already follows. Zero-decimal currencies work correctly
rather than being off by a factor of 100.

**Harder:** Every amount entering the system needs a currency, so forms carry a currency
field and parsing has to handle both `1,234.56` and `1.234,56`. Callers must convert
explicitly before combining currencies, which is more ceremony than `a + b`.

**Cost accepted:** Integer minor units cap safely at about 90 trillion minor units in a
JavaScript number — comfortable for VND, the catalog's largest denominator, at roughly
₫90 trillion. Well beyond any trip, but the bound is stated rather than assumed.

**Related:** Frankfurter (free, keyless, ECB-sourced) supplies rates, keeping the "no
secrets to manage" property intact through Release 6.
