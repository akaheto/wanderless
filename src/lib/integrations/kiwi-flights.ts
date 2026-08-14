/**
 * Kiwi.com Flight Search Integration
 * Real-time flight search from NYC (JFK/LGA/EWR) to destinations
 * Free tier: 2,000 calls/month
 */

export interface FlightOffer {
  id: string;
  departure: {
    time: string;
    airport: string;
  };
  arrival: {
    time: string;
    airport: string;
  };
  duration: number; // minutes
  stops: number;
  airlines: string[];
  price: {
    eur: number;
    usd: number;
  };
  url: string;
}

export interface FlightSearchResult {
  cheapest: FlightOffer | null;
  fastest: FlightOffer | null;
  nonstop: FlightOffer | null;
  priceRange: {
    min: number;
    max: number;
    currency: 'USD';
  };
  foundCount: number;
  searchDate: string;
}

const KIWI_API_KEY = process.env.KIWI_API_KEY;
const KIWI_BASE = 'https://api.kiwi.com/v2';

/**
 * Format time (HH:MM from ISO string)
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Calculate flight duration in hours and minutes
 */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Search for flights from NYC to a destination
 * Returns cheapest, fastest, and nonstop options
 */
export async function searchFlights(
  destination: string,
  departDate: string, // YYYY-MM-DD
  returnDate?: string // YYYY-MM-DD
): Promise<FlightSearchResult | null> {
  if (!KIWI_API_KEY) {
    console.warn('[Kiwi] No API key configured');
    return null;
  }

  try {
    // NYC has multiple airports; search them all
    const searchParams = new URLSearchParams({
      fly_from: 'NYC', // NYC metropolitan area (JFK, LGA, EWR)
      fly_to: destination,
      date_from: departDate,
      date_to: departDate,
      sort: 'price', // Get cheapest first
      limit: '100', // Get top 100 to analyze
      curr: 'USD',
    });

    if (returnDate) {
      searchParams.set('return_from', returnDate);
    }

    const response = await fetch(
      `${KIWI_BASE}/search?${searchParams}&apikey=${KIWI_API_KEY}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      console.error(`[Kiwi] ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const flights = data.data || [];

    if (flights.length === 0) {
      console.warn(`[Kiwi] No flights found: ${destination} on ${departDate}`);
      return null;
    }

    // Extract useful flights
    const cheapest = flights[0]; // Already sorted by price
    const fastest = flights.reduce((best: any, flight: any) =>
      flight.duration < best.duration ? flight : best
    );
    const nonstop = flights.find((f: any) => f.stops === 0) || null;

    // Get price range
    const prices = flights.map((f: any) => f.price).slice(0, 20); // Top 20 flights
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Format results
    const formatFlight = (flight: any): FlightOffer => ({
      id: flight.id,
      departure: {
        time: formatTime(flight.local_departure),
        airport: flight.flyFrom,
      },
      arrival: {
        time: formatTime(flight.local_arrival),
        airport: flight.flyTo,
      },
      duration: flight.duration / 60, // Convert to minutes
      stops: flight.stops,
      airlines: [flight.airline || 'Various'],
      price: {
        eur: Math.round(flight.price),
        usd: Math.round(flight.price * 1.1), // Rough USD conversion
      },
      url: flight.deep_link || `https://www.kiwi.com/search/results/${flight.id}`,
    });

    return {
      cheapest: cheapest ? formatFlight(cheapest) : null,
      fastest: fastest ? formatFlight(fastest) : null,
      nonstop: nonstop ? formatFlight(nonstop) : null,
      priceRange: {
        min: Math.round(minPrice),
        max: Math.round(maxPrice),
        currency: 'USD',
      },
      foundCount: flights.length,
      searchDate: new Date().toISOString().split('T')[0],
    };
  } catch (error) {
    console.error('[Kiwi] Error searching flights:', error);
    return null;
  }
}

/**
 * Get typical flight pricing for a destination (cached data)
 * Used for destination cards when live search isn't available
 */
export function getTypicalFlightPrice(destination: string): { min: number; max: number } | null {
  // This would be populated from cached search results or historical data
  // For now, return null to indicate live search should be used
  return null;
}
