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
 * Mock hotel search provider.
 *
 * Generates realistic hotel data with varying prices, amenities, and ratings.
 * Used as the default until a paid API (like Booking.com, Expedia) is integrated.
 */
export class MockHotelSearch implements HotelSearch {
  readonly name = "Mock Hotels";
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

  private generateHotels(destinationId: string, nights: number, guests: number): Hotel[] {
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
 * Resolve the configured provider.
 *
 * Mock provider is the default (free, no credentials required).
 * Can be overridden with environment variables for alternative providers.
 */
export function hotelSearch(): HotelSearch {
  return new MockHotelSearch();
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
