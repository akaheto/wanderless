import { NextRequest, NextResponse } from "next/server";
import { updateCitySuggestion, getCitySuggestion } from "@/lib/db/city-suggestions";

/**
 * POST /api/admin/suggestions/[id]/reject
 * Reject a city suggestion (not suitable as a leisure destination).
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

    // Try to get rejection reason from request body
    const { body } = await request.json().catch(() => ({ body: {} }));
    const reason = (body?.reason || "Not a suitable leisure destination") as string;

    // Update status to 'rejected'
    const success = await updateCitySuggestion(id, {
      status: "rejected",
      decision: "rejected",
      research_notes: reason,
    });

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update suggestion" },
        { status: 500 }
      );
    }

    console.log(`[City Suggestion Rejected] ${suggestion.city}, ${suggestion.country}: ${reason}`);

    return NextResponse.json({
      message: "Suggestion rejected",
      suggestion,
    });
  } catch (error) {
    console.error("[Admin Reject API Error]", error);
    return NextResponse.json(
      { error: "Failed to process rejection" },
      { status: 500 }
    );
  }
}
