import { NextRequest, NextResponse } from "next/server";
import { deleteCitySuggestion, getCitySuggestion } from "@/lib/db/city-suggestions";
import { requireAdmin } from "@/lib/auth/roles";

/**
 * DELETE /api/admin/suggestions/[id]/delete
 * Delete a city suggestion permanently.
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

    const success = await deleteCitySuggestion(id);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete suggestion" },
        { status: 500 }
      );
    }

    console.log(`[City Suggestion Deleted] ${suggestion.city}, ${suggestion.country}`);

    return NextResponse.json({
      message: "Suggestion deleted",
      suggestion,
    });
  } catch (error) {
    const isAuthError = error instanceof Error && error.message.includes("Unauthorized");

    if (isAuthError) {
      console.warn("[City Suggestion Delete] Unauthorized access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    console.error("[Admin Delete API Error]", error);
    return NextResponse.json(
      { error: "Failed to delete suggestion" },
      { status: 500 }
    );
  }
}
