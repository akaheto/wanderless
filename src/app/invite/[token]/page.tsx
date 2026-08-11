import { Suspense } from "react";
import * as usersStore from "@/lib/db/users";
import * as store from "@/lib/db/trips";
import { InvitePageClient } from "./client";
import { Card, CardHeader, ButtonLink } from "@/components/ui";

interface InvitePageProps {
  params: { token: string };
}

async function loadInviteData(token: string) {
  try {
    const invite = await usersStore.getInviteByToken(token);
    if (!invite) {
      return { error: "Invite not found or has expired" };
    }

    const trip = await store.getTrip(invite.tripId);
    if (!trip) {
      return { error: "Trip not found" };
    }

    const owner = await usersStore.getUserById(trip.ownerId);

    return {
      invite,
      tripName: trip.name,
      ownerEmail: owner?.email || "Unknown",
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to load invite" };
  }
}

export default async function InvitePage({ params }: InvitePageProps) {
  const result = await loadInviteData(params.token);

  if ("error" in result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-0 px-4">
        <Card className="w-full max-w-md">
          <CardHeader title="Invitation Error" />
          <div className="px-4 py-4">
            <div className="rounded bg-red-50 px-3 py-2 text-[13px] text-red-900">{result.error}</div>
            <div className="mt-4">
              <ButtonLink href="/" variant="primary" className="w-full text-[12px]">
                Go to Home
              </ButtonLink>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const { invite, tripName, ownerEmail } = result;

  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-surface-0">
        <div className="text-center">
          <div className="text-[14px] text-ink-3">Loading...</div>
        </div>
      </div>
    }>
      <InvitePageClient 
        token={params.token}
        invite={invite}
        tripName={tripName}
        ownerEmail={ownerEmail}
      />
    </Suspense>
  );
}
