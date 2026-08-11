import type { FlightSearch, FlightSearchQuery, FlightSearchResult, FlightItinerary, FlightSegment } from "./index";
import type { Origin } from "@/lib/domain/types";

/**
 * Kiwi.com flight search provider.
 *
 * Free-tier API, no authentication required. Converts Kiwi API responses to the
 * app's normalized FlightSearchResult format.
 *
 * API docs: https://tequila.kiwi.com/
 */
export class KiwiFlightSearch implements FlightSearch {
  readonly name = "Kiwi.com";
  readonly configured = true;

  private readonly baseUrl = "https://tequila.kiwi.com/v2";

  async search(query: FlightSearchQuery): Promise<FlightSearchResult[]> {
    const results: FlightSearchResult[] = [];

    // Search from each origin
    for (const origin of query.origins) {
      const result = await this.searchFromOrigin(origin, query);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  private async searchFromOrigin(
    origin: string,
    query: FlightSearchQuery,
  ): Promise<FlightSearchResult | null> {
    try {
      const params = new URLSearchParams({
        fly_from: origin,
        fly_to: query.destinationAirport,
        date_from: query.departDate,
        date_to: query.departDate,
        ...(query.returnDate && {
          return_from: query.returnDate,
          return_to: query.returnDate,
        }),
        adults: String(query.travellers),
        // Sort by price (cheapest first), limit results
        sort: "price",
        limit: "50",
        // Only flights that depart on the specified date (not range)
        fly_days: query.departDate.split("-")[2],
        ...(query.returnDate && {
          fly_days_return: query.returnDate.split("-")[2],
        }),
      });

      const url = `${this.baseUrl}/search?${params}`;
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(`Kiwi API error for ${origin}: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json() as { data?: KiwiApiFlightData[] };
      const typedOrigin = origin as Origin;

      // Handle empty results
      if (!data.data || data.data.length === 0) {
        return {
          origin: typedOrigin,
          destinationAirport: query.destinationAirport,
          departDate: query.departDate,
          returnDate: query.returnDate ?? null,
          itineraries: [],
          retrievedAt: new Date().toISOString(),
          provider: "kiwi",
        };
      }

      const itineraries = (data.data as KiwiApiFlightData[])
        .map((flight: KiwiApiFlightData, index: number) => this.convertFlight(flight, typedOrigin, query, index))
        .filter((it: FlightItinerary | null): it is FlightItinerary => it !== null);

      return {
        origin: typedOrigin,
        destinationAirport: query.destinationAirport,
        departDate: query.departDate,
        returnDate: query.returnDate ?? null,
        itineraries,
        retrievedAt: new Date().toISOString(),
        provider: "kiwi",
      };
    } catch (error) {
      console.error(`Error searching flights from ${origin}:`, error);
      return null;
    }
  }

  private convertFlight(
    flight: KiwiApiFlightData,
    origin: Origin,
    query: FlightSearchQuery,
    index: number,
  ): FlightItinerary | null {
    try {
      const segments: FlightSegment[] = [];

      // Outbound segments
      if (flight.route) {
        for (const route of flight.route) {
          segments.push({
            airline: route.airline,
            flightNumber: route.flight_no,
            from: route.departure.airport,
            to: route.arrival.airport,
            departsAt: new Date(route.departure.at * 1000).toISOString(),
            arrivesAt: new Date(route.arrival.at * 1000).toISOString(),
            durationMinutes: Math.round((route.arrival.at - route.departure.at) / 60),
          });
        }
      }

      // Calculate total trip duration
      let totalMinutes = 0;
      let stops = 0;

      if (segments.length > 0) {
        const firstDeparture = new Date(flight.route[0].departure.at * 1000);
        const lastArrival = new Date(flight.route[flight.route.length - 1].arrival.at * 1000);
        totalMinutes = Math.round((lastArrival.getTime() - firstDeparture.getTime()) / 60000);
        stops = Math.max(0, segments.length - 1);
      }

      return {
        id: `kiwi-${origin}-${index}`,
        origin,
        destinationAirport: query.destinationAirport,
        segments,
        totalMinutes,
        stops,
        priceMinorUnits: flight.price ? Math.round(flight.price * 100) : null,
        currency: flight.currency || "USD",
        cabin: "economy", // Kiwi API doesn't provide cabin class in free tier
      };
    } catch (error) {
      console.error("Error converting flight data:", error);
      return null;
    }
  }
}

// Kiwi.com API response types
interface KiwiApiFlightData {
  id: string;
  price: number;
  currency: string;
  fly_duration: string;
  route: Array<{
    airline: string;
    flight_no: string;
    departure: { airport: string; at: number };
    arrival: { airport: string; at: number };
  }>;
  duration?: {
    total: number;
    flyover: number;
  };
}
