import { NextRequest, NextResponse } from "next/server";
import { updateCitySuggestion, getCitySuggestion } from "@/lib/db/city-suggestions";

/**
 * POST /api/admin/suggestions/[id]/approve
 * Approve a city suggestion for Claude API research.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication check
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

    // Update status to 'researching' (Claude API job will be queued next)
    const success = await updateCitySuggestion(id, {
      status: "researching",
      research_notes: "Approved for Claude API research",
    });

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update suggestion" },
        { status: 500 }
      );
    }

    // TODO: Queue async Claude API research job via Vercel Queues or similar
    // await queueCityResearch(id, suggestion.city, suggestion.country);

    console.log(`[City Suggestion Approved] ${suggestion.city}, ${suggestion.country}`);

    return NextResponse.json({
      message: "Suggestion approved and queued for research",
      suggestion,
    });
  } catch (error) {
    console.error("[Admin Approve API Error]", error);
    return NextResponse.json(
      { error: "Failed to process approval" },
      { status: 500 }
    );
  }
}
