import { NextRequest, NextResponse } from "next/server";
import { updateCitySuggestion, getCitySuggestion } from "@/lib/db/city-suggestions";
import { requireAdmin } from "@/lib/auth/roles";

/**
 * POST /api/admin/suggestions/[id]/reject
 * Reject a city suggestion (not suitable as a leisure destination).
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
    const isAuthError = error instanceof Error && error.message.includes("Unauthorized");

    if (isAuthError) {
      console.warn("[City Suggestion Reject] Unauthorized access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    console.error("[Admin Reject API Error]", error);
    return NextResponse.json(
      { error: "Failed to process rejection" },
      { status: 500 }
    );
  }
}
