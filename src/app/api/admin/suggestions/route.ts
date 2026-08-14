import { NextRequest, NextResponse } from "next/server";
import { getPendingSuggestions } from "@/lib/db/city-suggestions";

/**
 * GET /api/admin/suggestions
 * List pending city suggestions for review and approval.
 *
 * Protected endpoint (future: add auth check).
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const session = await getSession();
    // if (!session?.user?.isAdmin) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    // }

    const suggestions = await getPendingSuggestions();

    return NextResponse.json({
      suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    console.error("[Admin Suggestions API Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
