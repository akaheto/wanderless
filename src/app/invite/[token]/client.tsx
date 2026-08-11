"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TripInvite } from "@/lib/db/users";
import { acceptInviteAction, declineInviteAction } from "@/app/actions";
import { Button, Card, CardHeader } from "@/components/ui";
import { useState } from "react";

interface InvitePageClientProps {
  token: string;
  invite: TripInvite;
  tripName: string;
  ownerEmail: string;
}

export function InvitePageClient({ token, invite, tripName, ownerEmail }: InvitePageClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleAccept = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("token", token);
      const result = await acceptInviteAction(formData);

      if (result.error) {
        setError(result.error);
      } else if (result.tripId) {
        router.push(`/trips/${result.tripId}`);
      }
    });
  };

  const handleDecline = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("token", token);
      const result = await declineInviteAction(formData);

      if (result.error) {
        setError(result.error);
      } else {
        router.push("/");
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-0 px-4">
      <Card className="w-full max-w-md">
        <CardHeader title="You're Invited to Collaborate" />

        <div className="space-y-4 px-4 py-4">
          <div className="rounded bg-sunken px-3 py-2">
            <div className="text-[12px] text-ink-3">Trip</div>
            <div className="mt-1 text-[14px] font-medium text-ink-1">{tripName}</div>
          </div>

          <div className="rounded bg-sunken px-3 py-2">
            <div className="text-[12px] text-ink-3">From</div>
            <div className="mt-1 text-[14px] font-medium text-ink-1">{ownerEmail}</div>
          </div>

          <div className="rounded bg-sunken px-3 py-2">
            <div className="text-[12px] text-ink-3">Your Role</div>
            <div className="mt-1 capitalize">
              <span className="inline-block rounded bg-accent/10 px-2 py-1 text-[12px] font-medium text-accent">
                {invite.role}
              </span>
            </div>
          </div>

          <div className="border-t border-line pt-4">
            {invite.role === "editor" ? (
              <p className="text-[12px] text-ink-3">
                As an <strong>editor</strong>, you'll be able to view and edit this trip's details, itinerary, bookings, and places.
              </p>
            ) : (
              <p className="text-[12px] text-ink-3">
                As a <strong>viewer</strong>, you'll be able to view this trip's details, itinerary, bookings, and places.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAccept}
              disabled={pending}
              variant="primary"
              className="flex-1 text-[12px]"
            >
              {pending ? "Accepting..." : "Accept & Join"}
            </Button>
            <button
              onClick={handleDecline}
              disabled={pending}
              className="flex-1 rounded px-3 py-2 text-[12px] text-ink-3 hover:bg-surface-1 disabled:opacity-50"
            >
              {pending ? "..." : "Decline"}
            </button>
          </div>

          {error && (
            <div className="rounded bg-red-50 px-3 py-2 text-[12px] text-red-900">{error}</div>
          )}
        </div>
      </Card>
    </div>
  );
}
