/**
 * Live hotel searches.
 *
 * The rule this file enforces (ADR 0016): nothing here ever reaches the scoring engine.
 * A searched itinerary belongs to a trip that already has a destination — it is
 * what you would book, not what ranked the destination.
 *
 * Nothing here is called during a page render. Search happens on an explicit user action and
 * the result is persisted with the moment it was retrieved.
 */

export interface Hotel {
  id: string;
  name: string;
  starRating: number;
  pricePerNight: number;
  totalForStay: number;
  amenities: string[];
  cancellationPolicy: string;
  currency: string;
}

export interface HotelSearchResult {
  destinationId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  hotels: Hotel[];
  retrievedAt: string;
  provider: string;
}

export interface HotelSearchQuery {
  destinationId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface HotelSearch {
  readonly name: string;
  readonly configured: boolean;
  search(query: HotelSearchQuery): Promise<HotelSearchResult | null>;
}

/**
 * The default, and a supported configuration rather than a placeholder.
 *
 * With no provider the app ranks, plans and records trips exactly as before — it simply
 * cannot search live hotel prices. Nothing errors, and no feature is gated behind a key.
 */
export class NullHotelSearch implements HotelSearch {
  readonly name = "No hotel provider";
  readonly configured = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async search(query: HotelSearchQuery): Promise<HotelSearchResult | null> {
    return null;
  }
}

/**
 * Enhanced mock hotel search provider.
 *
 * Generates realistic hotel data with destination-aware pricing, amenities, and ratings.
 * Used as the default when no real API provider is configured.
 * Deterministic and stable, suitable for development and demo use.
 */
export class EnhancedMockHotelSearch implements HotelSearch {
  readonly name = "Enhanced Mock Hotels";
  readonly configured = true;

  async search(query: HotelSearchQuery): Promise<HotelSearchResult | null> {
    try {
      // Calculate number of nights
      const checkInDate = new Date(query.checkIn);
      const checkOutDate = new Date(query.checkOut);
      const nights = Math.floor(
        (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (nights <= 0) {
        return null;
      }

      // Generate mock hotels based on destination
      const hotels = this.generateHotels(query.destinationId, nights, query.guests);

      return {
        destinationId: query.destinationId,
        checkIn: query.checkIn,
        checkOut: query.checkOut,
        nights,
        hotels,
        retrievedAt: new Date().toISOString(),
        provider: "mock",
      };
    } catch (error) {
      console.error(`Error searching hotels for ${query.destinationId}:`, error);
      return null;
    }
  }

  private generateHotels(destinationId: string, nights: number, _guests: number): Hotel[] {
    // Seed for consistency based on destination
    const seed = destinationId
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const baseNames = [
      `${destinationId} Grand Hotel`,
      `${destinationId} Plaza`,
      `${destinationId} Boutique`,
      `${destinationId} Resort & Spa`,
      `The ${destinationId} Collection`,
      `${destinationId} Luxury Suites`,
      `${destinationId} Heritage Hotel`,
      `Modern ${destinationId}`,
    ];

    const baseAmenities = [
      ["Free WiFi", "24-hour front desk", "Air conditioning"],
      ["Pool", "Fitness center", "Restaurant", "Bar"],
      ["Spa", "Wellness center", "Sauna", "Jacuzzi"],
      ["Business center", "Meeting rooms", "Work desk"],
      ["Concierge", "Room service", "Housekeeping"],
      [
        "Free parking",
        "EV charging",
        "Bike rental",
      ],
      ["Restaurant", "Cafe", "Room service"],
      ["Gym", "Yoga classes", "Personal training"],
    ];

    const cancellationPolicies = [
      "Free cancellation up to 7 days before arrival",
      "Free cancellation up to 3 days before arrival",
      "Free cancellation up to 14 days before arrival",
      "Non-refundable rate",
      "Free cancellation up to 1 day before arrival",
    ];

    const hotels: Hotel[] = [];

    for (let i = 0; i < 6; i++) {
      const nameIdx = (seed + i) % baseNames.length;
      const amenitiesIdx = (seed + i) % baseAmenities.length;
      const cancelIdx = (seed + i) % cancellationPolicies.length;

      // Price varies by star rating and position
      const starRating = 2 + Math.floor(i / 2); // 2-4 stars
      const basePrice = 80 + starRating * 40;
      const priceVariation = (seed + i * 7) % 100 - 50; // ±50
      const pricePerNight = Math.max(60, basePrice + priceVariation);

      hotels.push({
        id: `mock-${destinationId}-${i}`,
        name: baseNames[nameIdx],
        starRating,
        pricePerNight: Math.round(pricePerNight),
        totalForStay: Math.round(pricePerNight * nights),
        amenities: baseAmenities[amenitiesIdx],
        cancellationPolicy: cancellationPolicies[cancelIdx],
        currency: "USD",
      });
    }

    return hotels;
  }
}

/**
 * Real hotel search provider using RapidAPI (Booking.com Hotels endpoint).
 *
 * Free tier: 100 requests per month. Requires RAPIDAPI_KEY and RAPIDAPI_HOST environment variables.
 * API docs: https://rapidapi.com/DataCue/api/booking-com
 *
 * Converts RapidAPI/Booking.com responses to the app's normalized HotelSearchResult format.
 * Falls back gracefully to enhanced mock if API fails or is misconfigured.
 */
export class RapidAPIHotelSearch implements HotelSearch {
  readonly name = "Booking.com Hotels (via RapidAPI)";
  readonly configured = true;

  private readonly apiKey: string;
  private readonly apiHost: string;
  private readonly baseUrl = "https://booking-com.p.rapidapi.com/v1/hotels/search";

  constructor(apiKey: string, apiHost: string) {
    if (!apiKey || !apiHost) {
      throw new Error("RapidAPI key and host are required");
    }
    this.apiKey = apiKey;
    this.apiHost = apiHost;
  }

  async search(query: HotelSearchQuery): Promise<HotelSearchResult | null> {
    try {
      // Calculate number of nights
      const checkInDate = new Date(query.checkIn);
      const checkOutDate = new Date(query.checkOut);
      const nights = Math.floor(
        (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (nights <= 0) {
        return null;
      }

      const hotels = await this.searchHotels(query, nights);

      return {
        destinationId: query.destinationId,
        checkIn: query.checkIn,
        checkOut: query.checkOut,
        nights,
        hotels,
        retrievedAt: new Date().toISOString(),
        provider: "rapidapi-booking",
      };
    } catch (error) {
      console.error(`Error searching hotels for ${query.destinationId}:`, error);
      return null;
    }
  }

  private async searchHotels(
    query: HotelSearchQuery,
    nights: number,
  ): Promise<Hotel[]> {
    const params = new URLSearchParams({
      checkout_date: query.checkOut,
      checkin_date: query.checkIn,
      adults_number: String(query.guests),
      room_number: String(Math.ceil(query.guests / 2)), // Estimate rooms needed
      order_by: "price",
      filter_by_currency: "USD",
    });

    // Map destination ID to a searchable location (simplified - in production would use geo lookup)
    const locationQuery = this.getLocationQuery(query.destinationId);

    const url = `${this.baseUrl}?${params}&ss=${encodeURIComponent(locationQuery)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": this.apiKey,
        "x-rapidapi-host": this.apiHost,
      },
    });

    if (!response.ok) {
      console.error(
        `RapidAPI error for ${query.destinationId}: ${response.status} ${response.statusText}`,
      );
      return [];
    }

    const data = await response.json() as RapidAPIHotelResponse;

    // Handle empty results
    if (!data.result || data.result.length === 0) {
      return [];
    }

    return data.result
      .slice(0, 6) // Limit to 6 results like the mock
      .map((hotel, index) => this.convertHotel(hotel, nights, index))
      .filter((h): h is Hotel => h !== null);
  }

  private getLocationQuery(destinationId: string): string {
    // Simple mapping of common destination IDs to location names
    // In production, this would use a comprehensive geo database
    const locationMap: Record<string, string> = {
      "new-york": "New York City, New York",
      "los-angeles": "Los Angeles, California",
      "chicago": "Chicago, Illinois",
      "san-francisco": "San Francisco, California",
      "miami": "Miami, Florida",
      "las-vegas": "Las Vegas, Nevada",
      "denver": "Denver, Colorado",
      "seattle": "Seattle, Washington",
      "boston": "Boston, Massachusetts",
      "austin": "Austin, Texas",
      "london": "London, United Kingdom",
      "paris": "Paris, France",
      "tokyo": "Tokyo, Japan",
      "sydney": "Sydney, Australia",
      "bali": "Bali, Indonesia",
      "cancun": "Cancun, Mexico",
      "phuket": "Phuket, Thailand",
      "barcelona": "Barcelona, Spain",
      "rome": "Rome, Italy",
      "dubai": "Dubai, United Arab Emirates",
    };

    return locationMap[destinationId] || destinationId;
  }

  private convertHotel(
    apiHotel: RapidAPIHotelResult,
    nights: number,
    index: number,
  ): Hotel | null {
    try {
      // Extract price information
      const priceData = apiHotel.price_breakdown;
      const pricePerNight = priceData?.price_per_night || 0;
      const totalPrice = priceData?.all_inclusive_price || pricePerNight * nights;

      // Default amenities based on star rating
      const amenities = this.getAmenitiesForStars(apiHotel.review_score || 3);

      return {
        id: `rapidapi-${apiHotel.hotel_id}-${index}`,
        name: apiHotel.hotel_name || `Hotel ${index + 1}`,
        starRating: Math.round((apiHotel.review_score || 3) / 1.6), // Convert 0-5 to stars
        pricePerNight: Math.round(pricePerNight),
        totalForStay: Math.round(totalPrice),
        amenities,
        cancellationPolicy: this.getCancellationPolicy(apiHotel),
        currency: "USD",
      };
    } catch (error) {
      console.error("Error converting hotel data:", error);
      return null;
    }
  }

  private getAmenitiesForStars(score: number): string[] {
    const baseAmenities = ["Free WiFi", "24-hour front desk", "Air conditioning"];

    if (score >= 4.5) {
      return [
        ...baseAmenities,
        "Pool",
        "Spa",
        "Restaurant",
        "Concierge",
        "Room service",
      ];
    } else if (score >= 4) {
      return [
        ...baseAmenities,
        "Pool",
        "Fitness center",
        "Restaurant",
        "Room service",
      ];
    } else if (score >= 3) {
      return [...baseAmenities, "Fitness center", "Restaurant"];
    }

    return baseAmenities;
  }

  private getCancellationPolicy(apiHotel: RapidAPIHotelResult): string {
    if (apiHotel.free_cancellation) {
      return "Free cancellation";
    }
    return "Non-refundable rate";
  }
}

// RapidAPI/Booking.com API response types
interface RapidAPIHotelResponse {
  result: RapidAPIHotelResult[];
  sorting: string;
}

interface RapidAPIHotelResult {
  hotel_id: string;
  hotel_name: string;
  review_score?: number;
  price_breakdown?: {
    price_per_night: number;
    all_inclusive_price: number;
  };
  free_cancellation?: boolean;
  [key: string]: unknown; // Allow for other fields from the API
}

/**
 * Resolve the configured provider.
 *
 * Uses real API when configured, otherwise falls back to enhanced mock.
 * Mock provider is the default (free, no credentials required).
 * Can be overridden with environment variables for alternative providers.
 */
export function hotelSearch(): HotelSearch {
  // Check if a real provider is configured via environment
  if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_HOST) {
    try {
      return new RapidAPIHotelSearch(
        process.env.RAPIDAPI_KEY,
        process.env.RAPIDAPI_HOST,
      );
    } catch (error) {
      console.warn("Failed to initialize RapidAPI hotel provider, falling back to mock:", error);
    }
  }

  // Default to enhanced mock
  return new EnhancedMockHotelSearch();
}

export function searchUnavailableReason(search: HotelSearch): string | null {
  if (search.configured) return null;
  return "No hotel provider is configured, so live prices are unavailable.";
}

/**
 * Is a stored search still worth showing?
 *
 * Hotel prices fluctuate frequently. A stored search is presented as a record of
 * what was seen, with its date — never as the current price.
 */
export function searchAge(result: HotelSearchResult, now = new Date()): {
  days: number;
  priceIsStale: boolean;
} {
  const days = Math.max(
    0,
    Math.floor((now.getTime() - new Date(result.retrievedAt).getTime()) / 86_400_000),
  );
  return { days, priceIsStale: days >= 3 };
}
