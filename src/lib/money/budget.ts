import type { DataWarning } from "@/lib/domain/types";
import { daysUntil } from "@/lib/dates";
import {
  type ExchangeRate,
  type Money,
  allocate,
  compare,
  format,
  isZero,
  subtract,
  totalIn,
} from "./index";

/*
 * Budget arithmetic.
 *
 * The two questions a trip budget actually has to answer, neither of which is "what does it
 * cost":
 *
 *   1. How much of this can I still get back if the trip falls through?
 *   2. What do I owe, and when?
 *
 * A single total answers neither. Exposure — the non-refundable portion — is the number
 * that matters when deciding whether to book now, and it is the one most budget tools
 * never show.
 */

export type BudgetCategory =
  | "flights"
  | "lodging"
  | "activities"
  | "food"
  | "transport"
  | "other";

export interface BudgetItem {
  id: number;
  tripId: number;
  category: BudgetCategory;
  label: string;
  /** What we expect it to cost. Present before anything is booked. */
  estimated: Money | null;
  /** What was actually committed. Present once booked. */
  booked: Money | null;
  refundable: boolean;
  /** Last date this can be cancelled without losing the money. */
  refundableUntil: string | null;
  /** When payment is due, if it is not already paid. */
  dueOn: string | null;
  paid: boolean;
}

export interface BudgetTotals {
  currency: string;
  estimated: Money;
  booked: Money;
  /** booked − estimated. Positive means over budget. */
  variance: Money;
  /** Committed money that cannot be recovered today. */
  exposure: Money;
  /** Committed money still recoverable today. */
  recoverable: Money;
  conversions: ReturnType<typeof totalIn>["conversions"];
  /** Currencies present with no rate available — their items are excluded from totals. */
  missingRates: string[];
  warnings: DataWarning[];
}

/** The amount a line item represents right now: booked if it is, otherwise estimated. */
export function currentAmount(item: BudgetItem): Money | null {
  return item.booked ?? item.estimated;
}

/**
 * Is this item's money still recoverable as at `asOf`?
 *
 * Refundability expires. An item marked refundable with a `refundableUntil` in the past is
 * not refundable, and treating the flag alone as the answer overstates what can be
 * recovered — which is the direction that hurts.
 */
export function isRecoverable(item: BudgetItem, asOf?: string): boolean {
  if (!item.refundable) return false;
  if (item.refundableUntil === null) return true;
  return daysUntil(item.refundableUntil, asOf) >= 0;
}

export function summariseBudget(
  items: BudgetItem[],
  targetCurrency: string,
  rates: ExchangeRate[],
  asOf?: string,
): BudgetTotals {
  const currency = targetCurrency.toUpperCase();

  const estimatedItems = items.map((i) => i.estimated).filter((m): m is Money => m !== null);
  const bookedItems = items.map((i) => i.booked).filter((m): m is Money => m !== null);

  const estimated = totalIn(estimatedItems, currency, rates);
  const booked = totalIn(bookedItems, currency, rates);

  // Exposure counts only money actually committed. An estimate is not exposure — nothing
  // has been spent yet.
  const committed = items.filter((i) => i.booked !== null);
  const exposureItems = committed.filter((i) => !isRecoverable(i, asOf)).map((i) => i.booked!);
  const recoverableItems = committed.filter((i) => isRecoverable(i, asOf)).map((i) => i.booked!);

  const exposure = totalIn(exposureItems, currency, rates);
  const recoverable = totalIn(recoverableItems, currency, rates);

  const missingRates = [
    ...new Set([...estimated.missingRates, ...booked.missingRates, ...exposure.missingRates]),
  ];

  return {
    currency,
    estimated: estimated.total,
    booked: booked.total,
    variance: subtract(booked.total, estimated.total),
    exposure: exposure.total,
    recoverable: recoverable.total,
    conversions: [...estimated.conversions, ...booked.conversions],
    missingRates,
    warnings: budgetWarnings(items, booked.total, estimated.total, missingRates, currency, asOf),
  };
}

function budgetWarnings(
  items: BudgetItem[],
  booked: Money,
  estimated: Money,
  missingRates: string[],
  currency: string,
  asOf?: string,
): DataWarning[] {
  const warnings: DataWarning[] = [];

  if (missingRates.length > 0) {
    warnings.push({
      label: `No exchange rate for ${missingRates.join(", ")}`,
      detail: `Items in ${
        missingRates.length === 1 ? "that currency are" : "those currencies are"
      } excluded from the totals — the figures below are incomplete, not converted at 1:1.`,
      severity: "serious",
    });
  }

  // Deadlines. Sorted so the most urgent is named rather than just counted.
  const unpaid = items
    .filter((i) => !i.paid && i.dueOn !== null)
    .map((i) => ({ item: i, days: daysUntil(i.dueOn!, asOf) }))
    .sort((a, b) => a.days - b.days);

  const overdue = unpaid.filter((u) => u.days < 0);
  if (overdue.length > 0) {
    warnings.push({
      label: `${overdue.length} payment${overdue.length === 1 ? "" : "s"} overdue`,
      detail: `${overdue[0].item.label} was due ${Math.abs(overdue[0].days)} day${
        Math.abs(overdue[0].days) === 1 ? "" : "s"
      } ago.`,
      severity: "serious",
    });
  }

  const soon = unpaid.filter((u) => u.days >= 0 && u.days <= 7);
  if (soon.length > 0) {
    warnings.push({
      label: `${soon.length} payment${soon.length === 1 ? "" : "s"} due within a week`,
      detail: `${soon[0].item.label} ${soon[0].days === 0 ? "is due today" : `in ${soon[0].days} days`}.`,
      severity: "warning",
    });
  }

  // Refundability expiring is the deadline people miss, because nothing bills them for it.
  const expiring = items
    .filter((i) => i.booked !== null && i.refundable && i.refundableUntil !== null)
    .map((i) => ({ item: i, days: daysUntil(i.refundableUntil!, asOf) }))
    .filter((x) => x.days >= 0 && x.days <= 3)
    .sort((a, b) => a.days - b.days);

  if (expiring.length > 0) {
    warnings.push({
      label: `Free cancellation ends on ${expiring.length} booking${expiring.length === 1 ? "" : "s"}`,
      detail: `${expiring[0].item.label} stops being refundable ${
        expiring[0].days === 0 ? "today" : `in ${expiring[0].days} days`
      }. After that it becomes exposure.`,
      severity: "warning",
    });
  }

  if (!isZero(estimated) && compare(booked, estimated) > 0) {
    const over = subtract(booked, estimated);
    warnings.push({
      label: `${format(over)} over the estimate`,
      detail: "Booked costs exceed what was budgeted for the same items.",
      severity: "warning",
    });
  }

  const unestimated = items.filter((i) => i.estimated === null && i.booked === null);
  if (unestimated.length > 0) {
    warnings.push({
      label: `${unestimated.length} item${unestimated.length === 1 ? "" : "s"} with no figure`,
      detail: "Neither estimated nor booked, so they contribute nothing to the totals.",
      severity: "info",
    });
  }

  return warnings;
}

/** Per-category breakdown, for showing where the money goes. */
export function byCategory(
  items: BudgetItem[],
  targetCurrency: string,
  rates: ExchangeRate[],
): { category: BudgetCategory; total: Money; count: number }[] {
  const currency = targetCurrency.toUpperCase();
  const groups = new Map<BudgetCategory, Money[]>();

  for (const item of items) {
    const amount = currentAmount(item);
    if (!amount) continue;
    const existing = groups.get(item.category) ?? [];
    existing.push(amount);
    groups.set(item.category, existing);
  }

  return [...groups.entries()]
    .map(([category, amounts]) => ({
      category,
      total: totalIn(amounts, currency, rates).total,
      count: amounts.length,
    }))
    .sort((a, b) => b.total.amount - a.total.amount);
}

/** Payments still to make, soonest first — the "what do I owe and when" answer. */
export function upcomingPayments(
  items: BudgetItem[],
  asOf?: string,
): { item: BudgetItem; dueOn: string; days: number; amount: Money }[] {
  return items
    .filter((i) => !i.paid && i.dueOn !== null && currentAmount(i) !== null)
    .map((i) => ({
      item: i,
      dueOn: i.dueOn!,
      days: daysUntil(i.dueOn!, asOf),
      amount: currentAmount(i)!,
    }))
    .sort((a, b) => a.days - b.days);
}

/**
 * Each traveller's share, splitting exactly.
 *
 * Shares differ by at most one minor unit and sum back to the total — `allocate` handles
 * the remainder, so three people splitting $10 get 3.34/3.33/3.33 rather than three times
 * $3.33 and a missing cent.
 */
export function perTraveller(total: Money, travellers: number): Money[] {
  if (travellers < 1) throw new Error(`Cannot divide a budget between ${travellers} travellers`);
  return allocate(total, travellers);
}
