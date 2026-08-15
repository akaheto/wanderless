import { NextRequest, NextResponse } from "next/server";
import { getCitySuggestion } from "@/lib/db/city-suggestions";
import { draftResearch } from "@/lib/research/city-research-v2";
import { requireAdmin } from "@/lib/auth/roles";

/**
 * GET /api/admin/research/[id]/draft
 * Get research draft for admin review
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id: idStr } = await params;
    const id = parseInt(idStr);

    if (!id) {
      return NextResponse.json(
        { error: "Invalid research ID" },
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

    // Generate draft research
    const draft = await draftResearch(suggestion.city, suggestion.country);

    return NextResponse.json(draft);
  } catch (error) {
    const isAuthError =
      error instanceof Error && error.message.includes("Unauthorized");

    if (isAuthError) {
      console.warn("[Research Draft] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    console.error("[Research Draft API Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch research draft" },
      { status: 500 }
    );
  }
}
