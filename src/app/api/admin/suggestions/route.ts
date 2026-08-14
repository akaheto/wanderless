import { NextRequest, NextResponse } from "next/server";
import { getPendingSuggestions } from "@/lib/db/city-suggestions";
import { requireAdmin } from "@/lib/auth/roles";

/**
 * GET /api/admin/suggestions
 * List pending city suggestions for review and approval.
 *
 * Protected: requires admin or owner role.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const suggestions = await getPendingSuggestions();

    return NextResponse.json({
      suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    const isAuthError = error instanceof Error && error.message.includes("Unauthorized");

    if (isAuthError) {
      console.warn("[Admin Suggestions] Unauthorized access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    console.error("[Admin Suggestions API Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
