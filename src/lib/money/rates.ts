/**
 * Exchange rate fetching via Frankfurter API (free, ECB-sourced).
 *
 * Returns ExchangeRate objects compatible with money/budget.ts::totalIn().
 * On failure, returns an empty array — the budget layer treats missing rates as
 * incomplete data (warns the user) rather than silently guessing at 1:1.
 */

import type { ExchangeRate } from "./index";

const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour
const rateCache = new Map<string, { rates: ExchangeRate[]; timestamp: number }>();

/**
 * Fetch current exchange rates for a set of source currencies → one target.
 *
 * Example: rates({ sources: ["EUR", "GBP", "JPY"], target: "USD" })
 *   returns [
 *     { from: "EUR", to: "USD", rate: 1.08, rateDate: "2026-08-12", source: "Frankfurter" },
 *     { from: "GBP", to: "USD", rate: 1.27, rateDate: "2026-08-12", source: "Frankfurter" },
 *     { from: "JPY", to: "USD", rate: 0.0067, rateDate: "2026-08-12", source: "Frankfurter" }
 *   ]
 */
export async function fetchRates(options: {
  sources: string[];
  target: string;
}): Promise<ExchangeRate[]> {
  const { sources, target } = options;
  const cacheKey = `${sources.sort().join(",")}→${target}`;

  // Check cache
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.rates;
  }

  // Fetch from Frankfurter
  try {
    const uniqueSources = [...new Set(sources.map((s) => s.toUpperCase()))];
    const url = `https://api.frankfurter.app/latest?from=${uniqueSources.join(",")}&to=${target.toUpperCase()}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      console.warn(`Frankfurter API error: ${response.status}`);
      return [];
    }

    interface FrankfurterResponse {
      date: string;
      rates?: Record<string, number>;
    }

    const data = (await response.json()) as FrankfurterResponse;
    if (!data.rates) {
      console.warn("Frankfurter API: no rates in response");
      return [];
    }

    const rates: ExchangeRate[] = Object.entries(data.rates).map(([fromCode, rate]) => ({
      from: fromCode.toUpperCase(),
      to: target.toUpperCase(),
      rate: Number(rate),
      rateDate: data.date || new Date().toISOString().split("T")[0],
      source: "Frankfurter (ECB reference rates)",
    }));

    rateCache.set(cacheKey, { rates, timestamp: Date.now() });
    return rates;
  } catch (error) {
    console.warn(`Failed to fetch exchange rates: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Convenience: fetch rates for all currencies in a list of Money objects.
 */
export async function fetchRatesForMoney(
  items: Array<{ currency: string } | { currency: string } | null | undefined>,
  targetCurrency: string,
): Promise<ExchangeRate[]> {
  const sources = [
    ...new Set(
      items
        .filter((item): item is { currency: string } => item !== null && item !== undefined)
        .map((item) => item.currency.toUpperCase())
        .filter((c) => c !== targetCurrency.toUpperCase()),
    ),
  ];

  if (sources.length === 0) return [];
  return fetchRates({ sources, target: targetCurrency });
}
