import { NextRequest, NextResponse } from "next/server";
import {
  submitCitySuggestion,
  hasCitySuggestion,
} from "@/lib/db/city-suggestions";

/**
 * POST /api/cities/suggest
 * Submit a new city suggestion for research and possible inclusion in catalog.
 *
 * Workflow:
 * 1. Validate input (city and country required)
 * 2. Check if already suggested (prevent duplicates)
 * 3. Store in city_suggestions table with status='pending'
 * 4. Queue async Claude API research job (future: Vercel Queues)
 * 5. Return confirmation to user
 *
 * Future research via Claude:
 * - Real hotel pricing from Booking.com, Trip.com, Expedia
 * - Flight availability and nonstop routes
 * - Visa requirements per US State Dept
 * - Climate normals and seasonal patterns
 * - Return for manual review before adding to catalog
 */
export async function POST(request: NextRequest) {
  try {
    const { city, country } = await request.json();

    if (!city || !country) {
      return NextResponse.json(
        { error: "City and country are required" },
        { status: 400 }
      );
    }

    // Validate input types
    if (typeof city !== "string" || typeof country !== "string") {
      return NextResponse.json(
        { error: "City and country must be strings" },
        { status: 400 }
      );
    }

    const trimmedCity = city.trim();
    const trimmedCountry = country.trim();

    // Validate lengths
    if (trimmedCity.length < 2 || trimmedCity.length > 100) {
      return NextResponse.json(
        { error: "City name must be 2-100 characters" },
        { status: 400 }
      );
    }

    if (trimmedCountry.length < 2 || trimmedCountry.length > 100) {
      return NextResponse.json(
        { error: "Country name must be 2-100 characters" },
        { status: 400 }
      );
    }

    // Check if already suggested
    if (await hasCitySuggestion(trimmedCity, trimmedCountry)) {
      return NextResponse.json(
        {
          error: `${trimmedCity}, ${trimmedCountry} has already been suggested`,
        },
        { status: 409 }
      );
    }

    // Store suggestion in database
    const suggestion = await submitCitySuggestion(trimmedCity, trimmedCountry);

    if (!suggestion) {
      return NextResponse.json(
        { error: "Failed to store suggestion" },
        { status: 500 }
      );
    }

    console.log("[City Suggestion Stored]", {
      city: suggestion.city,
      country: suggestion.country,
      status: suggestion.status,
    });

    // TODO: Queue Claude API research task
    // await queueCityResearch(suggestion.id);

    return NextResponse.json(
      {
        message: "Suggestion received and queued for research",
        suggestion: {
          city: suggestion.city,
          country: suggestion.country,
          status: suggestion.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[City Suggest API Error]", error);
    return NextResponse.json(
      { error: "Failed to process suggestion" },
      { status: 500 }
    );
  }
}
