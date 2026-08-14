import { NextRequest, NextResponse } from "next/server";
import { updateCitySuggestion, getCitySuggestion } from "@/lib/db/city-suggestions";
import { researchCity } from "@/lib/research/city-research";
import { sendCityApprovedNotification } from "@/lib/email";
import { requireAdmin } from "@/lib/auth/roles";

/**
 * POST /api/admin/suggestions/[id]/approve
 * Approve a city suggestion and trigger Claude API research.
 *
 * Protected: requires admin or owner role.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id: idStr } = await params;
    const id = parseInt(idStr);

    if (!id) {
      return NextResponse.json(
        { error: "Invalid suggestion ID" },
        { status: 400 }
      );
    }

    const suggestion = await getCitySuggestion(id);
    if (!suggestion) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      );
    }

    // Update status to 'researching'
    await updateCitySuggestion(id, {
      status: "researching",
      research_notes: "Researching via Claude API...",
    });

    // Trigger Claude API research
    console.log(`[City Research Starting] ${suggestion.city}, ${suggestion.country}`);
    const research = await researchCity(suggestion.city, suggestion.country);

    if (!research) {
      // Research failed - mark as reviewed but keep pending
      await updateCitySuggestion(id, {
        status: "reviewed",
        research_notes:
          "Research failed - could not find reliable data. Manual review required.",
      });

      return NextResponse.json(
        {
          error: "Research incomplete - data not found",
          message: "City requires manual research or may not be suitable",
        },
        { status: 200 }
      );
    }

    // Store researched data
    const success = await updateCitySuggestion(id, {
      status: "reviewed",
      hotel_data: JSON.stringify(research.hotelData),
      flight_data: JSON.stringify(research.flightData),
      visa_info: research.visaInfo,
      climate_data: research.climateData,
      research_notes: `Research complete: ${research.summary}`,
    });

    if (!success) {
      return NextResponse.json(
        { error: "Failed to store research results" },
        { status: 500 }
      );
    }

    console.log(`[City Research Complete] ${suggestion.city}, ${suggestion.country}`);

    // Send notification email to the user who suggested the city
    if (suggestion.user_email) {
      await sendCityApprovedNotification(
        suggestion.user_email,
        suggestion.city,
        suggestion.country
      );
      console.log(`[City Approved Email] Sent to ${suggestion.user_email}`);
    }

    return NextResponse.json({
      message: "City researched successfully",
      suggestion: {
        ...suggestion,
        status: "reviewed",
        research: research,
      },
    });
  } catch (error) {
    const isAuthError = error instanceof Error && error.message.includes("Unauthorized");

    if (isAuthError) {
      console.warn("[City Research Approve] Unauthorized access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    console.error("[Admin Approve API Error]", error);
    return NextResponse.json(
      { error: "Failed to process approval" },
      { status: 500 }
    );
  }
}
