import { NextRequest, NextResponse } from "next/server";
import { getCitySuggestion, updateCitySuggestion } from "@/lib/db/city-suggestions";
import { requireAdmin } from "@/lib/auth/roles";

// Feature flag: Set to false to auto-approve without admin review
const REQUIRE_ADMIN_APPROVAL = true;

interface AdminApprovalInput {
  fourStarUSD: number;
  fiveStarUSD: number;
  hotelSource: string;
  influencerSpots: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  summary: string;
  adminNotes: string;
}

/**
 * POST /api/admin/research/[id]/approve
 * Admin approves and publishes research to catalog
 *
 * Protected: requires admin role
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

    const body = (await request.json()) as AdminApprovalInput;

    // Validate input
    if (!body.fourStarUSD || !body.fiveStarUSD) {
      return NextResponse.json(
        { error: "Both hotel prices required" },
        { status: 400 }
      );
    }

    if (!body.influencerSpots || body.influencerSpots.length < 20 || body.influencerSpots.length > 50) {
      return NextResponse.json(
        { error: `Need 20-50 influencer spots (got ${body.influencerSpots?.length})` },
        { status: 400 }
      );
    }

    if (!body.summary || body.summary.trim().length === 0) {
      return NextResponse.json(
        { error: "Summary required" },
        { status: 400 }
      );
    }

    // Store approved research in database
    const success = await updateCitySuggestion(id, {
      status: "reviewed",
      hotel_data: JSON.stringify({
        fourStarUSD: body.fourStarUSD,
        fiveStarUSD: body.fiveStarUSD,
        source: body.hotelSource,
      }),
      influencer_spots: JSON.stringify(body.influencerSpots),
      research_notes: `Admin approved: ${body.summary}\n\nAdmin notes: ${body.adminNotes}`,
    });

    if (!success) {
      return NextResponse.json(
        { error: "Failed to store research" },
        { status: 500 }
      );
    }

    console.log(
      `[Research Approved] ${suggestion.city}, ${suggestion.country} - Admin: ${body.adminNotes}`
    );

    return NextResponse.json({
      message: "Research approved and ready for catalog",
      suggestion: {
        ...suggestion,
        status: "reviewed",
      },
    });
  } catch (error) {
    const isAuthError =
      error instanceof Error && error.message.includes("Unauthorized");

    if (isAuthError) {
      console.warn("[Research Approve] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    console.error("[Research Approve API Error]", error);
    return NextResponse.json(
      { error: "Failed to approve research" },
      { status: 500 }
    );
  }
}

// Export for easy toggling
export { REQUIRE_ADMIN_APPROVAL };
