import { NextRequest, NextResponse } from "next/server";
import { updateCitySuggestion, getCitySuggestion } from "@/lib/db/city-suggestions";
import { requireAdmin } from "@/lib/auth/roles";

/**
 * POST /api/admin/suggestions/[id]/retry
 * Retry research for a failed city suggestion.
 * Resets status to 'pending' for re-research.
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

    // Reset status to 'pending' for re-research
    const success = await updateCitySuggestion(id, {
      status: "pending",
      research_notes: "Retrying research...",
    });

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update suggestion" },
        { status: 500 }
      );
    }

    console.log(`[City Suggestion Retry] ${suggestion.city}, ${suggestion.country}`);

    return NextResponse.json({
      message: "Suggestion reset for retry",
      suggestion: {
        ...suggestion,
        status: "pending",
        research_notes: "Retrying research...",
      },
    });
  } catch (error) {
    const isAuthError = error instanceof Error && error.message.includes("Unauthorized");

    if (isAuthError) {
      console.warn("[City Suggestion Retry] Unauthorized access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    console.error("[Admin Retry API Error]", error);
    return NextResponse.json(
      { error: "Failed to process retry" },
      { status: 500 }
    );
  }
}
