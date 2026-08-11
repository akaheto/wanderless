import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  HotelSearch,
  HotelSearchQuery,
  HotelSearchResult,
  EnhancedMockHotelSearch,
  RapidAPIHotelSearch,
  hotelSearch,
  searchUnavailableReason,
  searchAge,
  NullHotelSearch,
} from "@/lib/hotels";

describe("Hotel search providers", () => {
  const testQuery: HotelSearchQuery = {
    destinationId: "new-york",
    checkIn: "2024-09-15",
    checkOut: "2024-09-20",
    guests: 2,
  };

  describe("EnhancedMockHotelSearch", () => {
    let provider: EnhancedMockHotelSearch;

    beforeEach(() => {
      provider = new EnhancedMockHotelSearch();
    });

    it("is marked as configured", () => {
      expect(provider.configured).toBe(true);
    });

    it("has a descriptive name", () => {
      expect(provider.name).toBe("Enhanced Mock Hotels");
    });

    it("searches hotels for a destination", async () => {
      const result = await provider.search(testQuery);
      expect(result).not.toBeNull();
      expect(result?.destinationId).toBe("new-york");
      expect(result?.checkIn).toBe("2024-09-15");
      expect(result?.checkOut).toBe("2024-09-20");
      expect(result?.nights).toBe(5);
    });

    it("returns a populated hotel list", async () => {
      const result = await provider.search(testQuery);
      expect(result?.hotels).toHaveLength(6);
    });

    it("includes realistic hotel data", async () => {
      const result = await provider.search(testQuery);
      const hotel = result?.hotels[0];

      expect(hotel?.id).toBeDefined();
      expect(hotel?.name).toBeDefined();
      expect(hotel?.starRating).toBeGreaterThanOrEqual(2);
      expect(hotel?.starRating).toBeLessThanOrEqual(4);
      expect(hotel?.pricePerNight).toBeGreaterThan(0);
      expect(hotel?.totalForStay).toBe(hotel?.pricePerNight! * 5);
      expect((hotel?.amenities ?? []).length).toBeGreaterThan(0);
      expect(hotel?.cancellationPolicy).toBeDefined();
      expect(hotel?.currency).toBe("USD");
    });

    it("includes provider name in result", async () => {
      const result = await provider.search(testQuery);
      expect(result?.provider).toBe("mock");
    });

    it("rejects invalid date ranges", async () => {
      const invalidQuery = {
        ...testQuery,
        checkOut: "2024-09-10", // Before check-in
      };
      const result = await provider.search(invalidQuery);
      expect(result).toBeNull();
    });

    it("returns deterministic results for the same input", async () => {
      const result1 = await provider.search(testQuery);
      const result2 = await provider.search(testQuery);

      expect(result1?.hotels[0].name).toBe(result2?.hotels[0].name);
      expect(result1?.hotels[0].pricePerNight).toBe(result2?.hotels[0].pricePerNight);
    });

    it("varies results by destination", async () => {
      const result1 = await provider.search(testQuery);
      const result2 = await provider.search({
        ...testQuery,
        destinationId: "london",
      });

      // Different destinations should produce different data
      expect(result1?.hotels[0].name).not.toBe(result2?.hotels[0].name);
    });
  });

  describe("RapidAPIHotelSearch", () => {
    it("requires both API key and host", () => {
      expect(() => new RapidAPIHotelSearch("", "host")).toThrow();
      expect(() => new RapidAPIHotelSearch("key", "")).toThrow();
      expect(() => new RapidAPIHotelSearch("", "")).toThrow();
    });

    it("is marked as configured when initialized with credentials", () => {
      const provider = new RapidAPIHotelSearch("test-key", "test-host");
      expect(provider.configured).toBe(true);
    });

    it("has a descriptive name", () => {
      const provider = new RapidAPIHotelSearch("test-key", "test-host");
      expect(provider.name).toBe("Booking.com Hotels (via RapidAPI)");
    });

    it("handles API errors gracefully", async () => {
      const provider = new RapidAPIHotelSearch("invalid-key", "invalid-host");
      // This will fail to connect, but should return a result with empty hotels rather than throwing
      const result = await provider.search(testQuery);
      expect(result).not.toBeNull();
      expect(result?.hotels).toHaveLength(0);
      expect(result?.provider).toBe("rapidapi-booking");
    });
  });

  describe("provider selection", () => {
    afterEach(() => {
      delete process.env.RAPIDAPI_KEY;
      delete process.env.RAPIDAPI_HOST;
    });

    it("defaults to enhanced mock when no API credentials provided", () => {
      const provider = hotelSearch();
      expect(provider.name).toBe("Enhanced Mock Hotels");
    });

    it("uses RapidAPI when credentials are configured", () => {
      process.env.RAPIDAPI_KEY = "test-key";
      process.env.RAPIDAPI_HOST = "test-host";

      const provider = hotelSearch();
      expect(provider.name).toContain("Booking.com");
    });

    it("falls back to mock if RapidAPI initialization fails", () => {
      // Set invalid credentials that will fail validation
      process.env.RAPIDAPI_KEY = "";
      process.env.RAPIDAPI_HOST = "";

      const provider = hotelSearch();
      // Should fall back to enhanced mock
      expect(provider.name).toBe("Enhanced Mock Hotels");
    });
  });

  describe("NullHotelSearch", () => {
    it("is not configured", () => {
      const provider = new NullHotelSearch();
      expect(provider.configured).toBe(false);
    });

    it("returns no results", async () => {
      const provider = new NullHotelSearch();
      const result = await provider.search(testQuery);
      expect(result).toBeNull();
    });
  });

  describe("searchUnavailableReason", () => {
    it("returns null when provider is configured", () => {
      const provider = new EnhancedMockHotelSearch();
      const reason = searchUnavailableReason(provider);
      expect(reason).toBeNull();
    });

    it("returns a message when provider is not configured", () => {
      const provider = new NullHotelSearch();
      const reason = searchUnavailableReason(provider);
      expect(reason).toBeDefined();
      expect(reason).toContain("No hotel provider");
    });
  });

  describe("searchAge", () => {
    it("calculates days since retrieval", () => {
      const now = new Date("2024-09-20T12:00:00");
      const result: HotelSearchResult = {
        destinationId: "new-york",
        checkIn: "2024-09-15",
        checkOut: "2024-09-20",
        nights: 5,
        hotels: [],
        retrievedAt: "2024-09-17T12:00:00",
        provider: "test",
      };

      const age = searchAge(result, now);
      expect(age.days).toBe(3);
    });

    it("marks prices as stale after 3 days", () => {
      const now = new Date("2024-09-20T12:00:00");
      const result: HotelSearchResult = {
        destinationId: "new-york",
        checkIn: "2024-09-15",
        checkOut: "2024-09-20",
        nights: 5,
        hotels: [],
        retrievedAt: "2024-09-17T12:00:00",
        provider: "test",
      };

      const age = searchAge(result, now);
      expect(age.priceIsStale).toBe(true);
    });

    it("marks prices as fresh within 3 days", () => {
      const now = new Date("2024-09-20T12:00:00");
      const result: HotelSearchResult = {
        destinationId: "new-york",
        checkIn: "2024-09-15",
        checkOut: "2024-09-20",
        nights: 5,
        hotels: [],
        retrievedAt: "2024-09-19T12:00:00",
        provider: "test",
      };

      const age = searchAge(result, now);
      expect(age.priceIsStale).toBe(false);
    });
  });

  describe("HotelSearchResult format", () => {
    it("matches the expected interface", async () => {
      const provider = new EnhancedMockHotelSearch();
      const result = await provider.search(testQuery);

      expect(result).toEqual(
        expect.objectContaining({
          destinationId: expect.any(String),
          checkIn: expect.any(String),
          checkOut: expect.any(String),
          nights: expect.any(Number),
          hotels: expect.any(Array),
          retrievedAt: expect.any(String),
          provider: expect.any(String),
        }),
      );
    });

    it("includes valid hotel objects", async () => {
      const provider = new EnhancedMockHotelSearch();
      const result = await provider.search(testQuery);

      result?.hotels.forEach((hotel) => {
        expect(hotel).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            starRating: expect.any(Number),
            pricePerNight: expect.any(Number),
            totalForStay: expect.any(Number),
            amenities: expect.any(Array),
            cancellationPolicy: expect.any(String),
            currency: expect.any(String),
          }),
        );

        // Validate price calculations
        expect(hotel.totalForStay).toBe(hotel.pricePerNight * result!.nights);
      });
    });
  });
});
