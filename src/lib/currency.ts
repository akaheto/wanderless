/**
 * Currency conversion utilities using Frankfurter API.
 * Free, no auth required: https://www.frankfurter.app/
 *
 * Rates are cached for the duration of the session to avoid spamming the API.
 */

// In-memory cache: key = "EUR_USD", value = { rate: 1.15, timestamp: ... }
const rateCache = new Map<string, { rate: number; timestamp: number }>();
const CACHE_DURATION_MS = 1000 * 60 * 60; // 1 hour

/**
 * Convert an amount from one currency to USD using Frankfurter API.
 * Falls back to returning the original amount if the API fails.
 */
export async function convertToUSD(amount: number, fromCurrency: string): Promise<number> {
  // Already in USD
  if (fromCurrency === "USD") {
    return amount;
  }

  try {
    // Check cache first
    const cacheKey = `${fromCurrency}_USD`;
    const cached = rateCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      return amount * cached.rate;
    }

    // Fetch from Frankfurter API
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${fromCurrency}&to=USD`,
      {
        signal: AbortSignal.timeout(5000), // 5 second timeout
      }
    );

    if (!response.ok) {
      console.warn(`Frankfurter API error: ${response.status}`);
      return amount; // Fallback: return original amount
    }

    const data = (await response.json()) as {
      rates?: Record<string, number>;
    };
    const rate = data.rates?.USD;

    if (!rate) {
      console.warn(`No USD rate found for ${fromCurrency}`);
      return amount; // Fallback: return original amount
    }

    // Cache the rate
    rateCache.set(cacheKey, { rate, timestamp: Date.now() });

    return amount * rate;
  } catch (error) {
    console.warn(`Currency conversion failed for ${fromCurrency}:`, error);
    return amount; // Fallback: return original amount
  }
}

/**
 * Get the exchange rate from one currency to USD.
 * Returns null if the conversion fails.
 */
export async function getExchangeRate(fromCurrency: string): Promise<number | null> {
  if (fromCurrency === "USD") {
    return 1;
  }

  try {
    // Check cache first
    const cacheKey = `${fromCurrency}_USD`;
    const cached = rateCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      return cached.rate;
    }

    // Fetch from Frankfurter API
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${fromCurrency}&to=USD`,
      {
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      rates?: Record<string, number>;
    };
    const rate = data.rates?.USD;

    if (!rate) {
      return null;
    }

    // Cache the rate
    rateCache.set(cacheKey, { rate, timestamp: Date.now() });

    return rate;
  } catch (error) {
    console.warn(`Failed to fetch exchange rate for ${fromCurrency}:`, error);
    return null;
  }
}

/**
 * Clear the rate cache. Useful for testing.
 */
export function clearRateCache(): void {
  rateCache.clear();
}
