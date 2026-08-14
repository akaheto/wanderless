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
 * Estimated flight prices by destination
 * Based on real historical data from Wanderless research (Aug 2026)
 * Maps destination ID (from catalog) to flight estimates
 */
export const FLIGHT_ESTIMATES: Record<string, FlightEstimate> = {
  // Southeast Asia — 20-24 hours
  hanoi: { cheapest: 600, midrange: 850, premium: 1400, nonstop: false, avgHours: 22 },
  hcmc: { cheapest: 650, midrange: 900, premium: 1450, nonstop: false, avgHours: 21 },
  hoi_an: { cheapest: 700, midrange: 950, premium: 1500, nonstop: false, avgHours: 23 },
  "phu-quoc": { cheapest: 700, midrange: 950, premium: 1500, nonstop: false, avgHours: 23 },
  bangkok: { cheapest: 550, midrange: 800, premium: 1300, nonstop: false, avgHours: 20 },
  phuket: { cheapest: 600, midrange: 850, premium: 1400, nonstop: false, avgHours: 22 },
  krabi: { cheapest: 650, midrange: 900, premium: 1450, nonstop: false, avgHours: 23 },
  "koh-samui": { cheapest: 600, midrange: 850, premium: 1400, nonstop: false, avgHours: 22 },

  // Philippines
  palawan: { cheapest: 650, midrange: 900, premium: 1450, nonstop: false, avgHours: 23 },
  boracay: { cheapest: 700, midrange: 950, premium: 1500, nonstop: false, avgHours: 24 },
  siargao: { cheapest: 700, midrange: 950, premium: 1500, nonstop: false, avgHours: 24 },

  // Indonesia
  "south-bali": { cheapest: 550, midrange: 800, premium: 1300, nonstop: false, avgHours: 21 },
  ubud: { cheapest: 550, midrange: 800, premium: 1300, nonstop: false, avgHours: 21 },

  // East Asia
  tokyo: { cheapest: 550, midrange: 800, premium: 1350, nonstop: true, avgHours: 12 },
  kyoto: { cheapest: 600, midrange: 850, premium: 1400, nonstop: false, avgHours: 14 },
  singapore: { cheapest: 500, midrange: 750, premium: 1250, nonstop: false, avgHours: 19 },

  // Scandinavia
  stockholm: { cheapest: 450, midrange: 650, premium: 1050, nonstop: true, avgHours: 9 },
  copenhagen: { cheapest: 400, midrange: 600, premium: 1000, nonstop: true, avgHours: 8.5 },
  reykjavik: { cheapest: 350, midrange: 550, premium: 900, nonstop: true, avgHours: 6 },

  // Western Europe — 8-9 hours, mostly nonstop
  paris: { cheapest: 350, midrange: 550, premium: 900, nonstop: true, avgHours: 8 },
  london: { cheapest: 350, midrange: 550, premium: 850, nonstop: true, avgHours: 8 },
  barcelona: { cheapest: 400, midrange: 600, premium: 950, nonstop: true, avgHours: 9 },
  amsterdam: { cheapest: 350, midrange: 550, premium: 900, nonstop: true, avgHours: 8 },
  madrid: { cheapest: 400, midrange: 600, premium: 950, nonstop: true, avgHours: 9 },
  berlin: { cheapest: 400, midrange: 600, premium: 950, nonstop: true, avgHours: 9 },
  brussels: { cheapest: 350, midrange: 550, premium: 900, nonstop: true, avgHours: 8 },
  milan: { cheapest: 450, midrange: 650, premium: 1000, nonstop: false, avgHours: 10 },
  munich: { cheapest: 400, midrange: 600, premium: 950, nonstop: false, avgHours: 10 },
  nice: { cheapest: 450, midrange: 650, premium: 1000, nonstop: false, avgHours: 10 },

  // Southern Europe — 10-12 hours
  rome: { cheapest: 500, midrange: 700, premium: 1100, nonstop: false, avgHours: 11 },
  florence: { cheapest: 500, midrange: 700, premium: 1100, nonstop: false, avgHours: 11 },
  venice: { cheapest: 500, midrange: 700, premium: 1100, nonstop: false, avgHours: 11 },
  naples: { cheapest: 500, midrange: 700, premium: 1100, nonstop: false, avgHours: 11 },
  athens: { cheapest: 550, midrange: 750, premium: 1150, nonstop: false, avgHours: 11 },
  lisbon: { cheapest: 450, midrange: 650, premium: 1000, nonstop: false, avgHours: 10 },
  porto: { cheapest: 450, midrange: 650, premium: 1000, nonstop: false, avgHours: 10 },
  seville: { cheapest: 450, midrange: 650, premium: 1000, nonstop: false, avgHours: 10 },

  // Central Europe — 9-12 hours
  prague: { cheapest: 450, midrange: 650, premium: 1000, nonstop: false, avgHours: 11 },
  vienna: { cheapest: 500, midrange: 700, premium: 1100, nonstop: false, avgHours: 11 },
  budapest: { cheapest: 500, midrange: 700, premium: 1100, nonstop: false, avgHours: 12 },
  krakow: { cheapest: 500, midrange: 700, premium: 1100, nonstop: false, avgHours: 12 },
  dubrovnik: { cheapest: 550, midrange: 750, premium: 1150, nonstop: false, avgHours: 12 },
  salzburg: { cheapest: 500, midrange: 700, premium: 1100, nonstop: false, avgHours: 11 },

  // British Isles & Ireland
  dublin: { cheapest: 350, midrange: 550, premium: 900, nonstop: true, avgHours: 8 },
  edinburgh: { cheapest: 400, midrange: 600, premium: 950, nonstop: true, avgHours: 8.5 },

  // Turkey
  istanbul: { cheapest: 600, midrange: 850, premium: 1300, nonstop: false, avgHours: 13 },
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
