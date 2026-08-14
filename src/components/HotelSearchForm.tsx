"use client";

import { useState, useTransition } from "react";
import { searchHotelsAction } from "@/app/actions";
import { Button, Card, CardHeader } from "./ui";

interface HotelSearchFormProps {
  tripId: number;
  destinationId: string | null;
  tripStartDate: string | null;
  tripEndDate: string | null;
  tripTravellers: number;
}

/**
 * Form to search for hotels.
 *
 * User selects:
 * - Destination (from trip's selected stop)
 * - Check-in date (defaults to trip start date)
 * - Check-out date (defaults to trip end date)
 * - Number of guests (from trip)
 */
export function HotelSearchForm({
  tripId,
  destinationId,
  tripStartDate,
  tripEndDate,
  tripTravellers,
}: HotelSearchFormProps) {
  const [pending, startTransition] = useTransition();
  const [checkIn, setCheckIn] = useState(tripStartDate ?? "");
  const [checkOut, setCheckOut] = useState(tripEndDate ?? "");
  const [guests, setGuests] = useState(tripTravellers);
  const [error, setError] = useState<string | null>(null);

  // Only show form if destination is selected
  if (!destinationId) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!checkIn) {
      setError("Enter a check-in date");
      return;
    }

    if (!checkOut) {
      setError("Enter a check-out date");
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      setError("Check-out date must be after check-in date");
      return;
    }

    const formData = new FormData();
    formData.set("tripId", String(tripId));
    formData.set("destinationId", destinationId);
    formData.set("checkIn", checkIn);
    formData.set("checkOut", checkOut);
    formData.set("guests", String(guests));

    startTransition(async () => {
      try {
        await searchHotelsAction(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      }
    });
  };

  return (
    <Card>
      <CardHeader title="Search hotels" note={`For ${destinationId}`} />

      <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
        {error && (
          <div className="rounded-md bg-critical/10 p-3 text-sm text-red-800 dark:bg-critical/10 dark:text-critical">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="checkIn" className="block text-[12px] font-medium tracking-wide text-ink-3 uppercase mb-1">
              Check-in
            </label>
            <input
              id="checkIn"
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              disabled={pending}
              required
            />
          </div>

          <div>
            <label htmlFor="checkOut" className="block text-[12px] font-medium tracking-wide text-ink-3 uppercase mb-1">
              Check-out
            </label>
            <input
              id="checkOut"
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              disabled={pending}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="guests" className="block text-[12px] font-medium tracking-wide text-ink-3 uppercase mb-1">
            Guests
          </label>
          <input
            id="guests"
            type="number"
            min="1"
            max="20"
            value={guests}
            onChange={(e) => setGuests(Math.max(1, Math.min(20, Number(e.target.value))))}
            disabled={pending}
          />
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Searching..." : "Search hotels"}
        </Button>
      </form>
    </Card>
  );
}
