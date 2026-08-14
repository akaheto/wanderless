import { NextRequest, NextResponse } from "next/server";

interface CitySuggestion {
  city: string;
  country: string;
  submittedAt: string;
  status: "pending" | "researching" | "approved" | "rejected";
  notes?: string;
}

/**
 * POST /api/cities/suggest
 * Submit a new city suggestion for research and possible inclusion in catalog.
 *
 * Future: This endpoint will:
 * - Store the suggestion in a database
 * - Trigger a Claude API research task via background worker
 * - Validate the city is a real leisure destination
 * - Research real hotel pricing, flights, visa requirements
 * - Return the researched data for manual review before adding to catalog
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

    // Validate input
    if (typeof city !== "string" || typeof country !== "string") {
      return NextResponse.json(
        { error: "City and country must be strings" },
        { status: 400 }
      );
    }

    const trimmedCity = city.trim();
    const trimmedCountry = country.trim();

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

    // Create suggestion object
    const suggestion: CitySuggestion = {
      city: trimmedCity,
      country: trimmedCountry,
      submittedAt: new Date().toISOString(),
      status: "pending",
      notes: `Submitted via UI for research`,
    };

    // TODO: Store in database (e.g., Turso, PostgreSQL)
    // For now, log it and return success
    console.log("[City Suggestion]", JSON.stringify(suggestion));

    return NextResponse.json(
      {
        message: "Suggestion received",
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
