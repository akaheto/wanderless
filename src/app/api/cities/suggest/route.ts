import { NextRequest, NextResponse } from "next/server";
import {
  submitCitySuggestion,
  hasCitySuggestion,
} from "@/lib/db/city-suggestions";
import { checkSubmissionLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";

/**
 * POST /api/cities/suggest
 * Submit a new city suggestion for research and possible inclusion in catalog.
 *
 * Rate limiting: 10 submissions per day per user
 * Admins and owners: unlimited
 *
 * Workflow:
 * 1. Check rate limit (10/day for users, unlimited for admins)
 * 2. Validate input (city and country required)
 * 3. Check if already suggested (prevent duplicates)
 * 4. Store in city_suggestions table with status='pending'
 * 5. Return confirmation to user
 */
export async function POST(request: NextRequest) {
  try {
    // Check rate limit first
    const rateLimit = await checkSubmissionLimit();
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: rateLimit.message || "Rate limit exceeded",
          remaining: rateLimit.remaining,
        },
        { status: 429 }
      );
    }

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

    // Get current user for email notification
    const user = await getCurrentUser();
    const userEmail = user?.email;

    // Store suggestion in database
    const suggestion = await submitCitySuggestion(trimmedCity, trimmedCountry, userEmail);

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
      remaining: rateLimit.remaining,
    });

    return NextResponse.json(
      {
        message: "Suggestion received and queued for research",
        suggestion: {
          city: suggestion.city,
          country: suggestion.country,
          status: suggestion.status,
        },
        remaining: rateLimit.remaining,
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
