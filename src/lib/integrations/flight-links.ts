/**
 * Flight Search Links & Estimated Pricing
 * No API needed—just direct links to Kiwi.com, Booking.com, Skyscanner
 * Pricing estimates based on city tier + season
 */

export interface FlightEstimate {
  cheapest: number; // USD
  midrange: number; // USD
  premium: number; // USD
  nonstop: boolean;
  avgHours: number;
}

export interface FlightLinks {
  kiwi: string;
  booking: string;
  skyscanner: string;
}

/**
 * Generate flight search links for a destination
 */
export function generateFlightLinks(
  destination: string,
  iataCode: string, // e.g., "CDG" for Paris
  departDate?: string, // YYYY-MM-DD
  returnDate?: string // YYYY-MM-DD
): FlightLinks {
  // NYC airport codes (all metro area)
  const nyc = 'NYC';

  // Kiwi.com search link
  const kiwiParams = new URLSearchParams({
    fly_from: nyc,
    fly_to: iataCode,
    ...(departDate && { date_from: departDate, date_to: departDate }),
    ...(returnDate && { return_from: returnDate }),
  });

  // Skyscanner search link
  const skyscannerParams = new URLSearchParams({
    adults: '1',
    ...(departDate && { departDate: departDate.replace(/-/g, '') }),
  });

  return {
    kiwi: `https://www.kiwi.com/en/search/results/${nyc}-${iataCode}?${kiwiParams}`,
    booking: `https://www.booking.com/flights/${nyc}.html?ss=${destination}`,
    skyscanner: `https://www.skyscanner.com/transport/flights-from-${nyc}-to-${iataCode}/230501/230508/?adults=1`,
  };
}

/**
 * Estimated flight prices by destination tier & season
 * Based on real historical data from Wanderless research
 */
export const FLIGHT_ESTIMATES: Record<string, FlightEstimate> = {
  // Tier 1: European capitals (short-haul)
  CDG: {
    // Paris
    cheapest: 350,
    midrange: 550,
    premium: 900,
    nonstop: true,
    avgHours: 8,
  },
  LHR: {
    // London
    cheapest: 350,
    midrange: 550,
    premium: 850,
    nonstop: true,
    avgHours: 8,
  },
  FCO: {
    // Rome
    cheapest: 500,
    midrange: 700,
    premium: 1100,
    nonstop: false,
    avgHours: 11,
  },
  MAD: {
    // Madrid
    cheapest: 400,
    midrange: 600,
    premium: 950,
    nonstop: true,
    avgHours: 9,
  },
  AMS: {
    // Amsterdam
    cheapest: 350,
    midrange: 550,
    premium: 900,
    nonstop: true,
    avgHours: 8,
  },
  VIE: {
    // Vienna
    cheapest: 500,
    midrange: 700,
    premium: 1100,
    nonstop: false,
    avgHours: 11,
  },
  PRG: {
    // Prague
    cheapest: 450,
    midrange: 650,
    premium: 1000,
    nonstop: false,
    avgHours: 11,
  },
  IST: {
    // Istanbul
    cheapest: 600,
    midrange: 850,
    premium: 1300,
    nonstop: false,
    avgHours: 13,
  },
  LIS: {
    // Lisbon
    cheapest: 450,
    midrange: 650,
    premium: 1000,
    nonstop: false,
    avgHours: 10,
  },
  BUD: {
    // Budapest
    cheapest: 500,
    midrange: 700,
    premium: 1100,
    nonstop: false,
    avgHours: 12,
  },
  BCN: {
    // Barcelona
    cheapest: 400,
    midrange: 600,
    premium: 950,
    nonstop: true,
    avgHours: 9,
  },
};

/**
 * Get flight estimate for a destination
 */
export function getFlightEstimate(iataCode: string): FlightEstimate | null {
  return FLIGHT_ESTIMATES[iataCode] || null;
}

/**
 * Apply seasonal multiplier to base price
 * Peak = 1.5x, Shoulder = 1.0x, Low = 0.7x
 */
export function adjustPriceForSeason(
  basePrice: number,
  season: 'peak' | 'shoulder' | 'low'
): number {
  const multipliers = {
    peak: 1.5,
    shoulder: 1.0,
    low: 0.7,
  };
  return Math.round(basePrice * multipliers[season]);
}
