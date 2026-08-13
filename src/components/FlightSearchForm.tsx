"use client";

import { useState, useTransition } from "react";
import type { Origin } from "@/lib/domain/types";
import { ORIGINS } from "@/lib/domain/types";
import { searchFlightsAction } from "@/app/actions";
import { Button, Card, CardHeader } from "./ui";

interface FlightSearchFormProps {
  tripId: number;
  tripOrigins: Origin[];
  tripStartDate: string | null;
  tripEndDate: string | null;
  tripTravellers: number;
  destinationAirportCode: string | null;
}

/**
 * Form to search for flights using Kiwi.com API.
 *
 * User selects:
 * - Origins (from trip's configured origins, all initially selected)
 * - Destination airport code
 * - Departure date (defaults to trip start date)
 * - Return date (optional, defaults to trip end date if applicable)
 * - Number of travellers (from trip)
 */
export function FlightSearchForm({
  tripId,
  tripOrigins,
  tripStartDate,
  tripEndDate,
  tripTravellers,
  destinationAirportCode,
}: FlightSearchFormProps) {
  const [pending, startTransition] = useTransition();
  const [selectedOrigins, setSelectedOrigins] = useState<Set<Origin>>(new Set(tripOrigins));
  const [destination, setDestination] = useState(destinationAirportCode ?? "");
  const [departDate, setDepartDate] = useState(tripStartDate ?? "");
  const [returnDate, setReturnDate] = useState(tripEndDate ?? "");
  const [travellers, setTravellers] = useState(tripTravellers);
  const [error, setError] = useState<string | null>(null);

  const handleOriginToggle = (origin: Origin) => {
    const newSet = new Set(selectedOrigins);
    if (newSet.has(origin)) {
      newSet.delete(origin);
    } else {
      newSet.add(origin);
    }
    setSelectedOrigins(newSet);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (selectedOrigins.size === 0) {
      setError("Select at least one departure airport");
      return;
    }

    if (!destination) {
      setError("Enter a destination airport code");
      return;
    }

    if (!departDate) {
      setError("Enter a departure date");
      return;
    }

    const formData = new FormData();
    formData.set("tripId", String(tripId));
    selectedOrigins.forEach((origin) => {
      formData.append("origins", origin);
    });
    formData.set("destinationAirport", destination.toUpperCase());
    formData.set("departDate", departDate);
    if (returnDate) {
      formData.set("returnDate", returnDate);
    }
    formData.set("travellers", String(travellers));

    console.log(`[Flight Search] Searching from ${Array.from(selectedOrigins).join(',')} to ${destination} on ${departDate}`);

    startTransition(async () => {
      try {
        await searchFlightsAction(formData);
        console.log(`[Flight Search] Search completed - check the "Flight searches" section below`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Search failed";
        console.error(`[Flight Search] Error: ${message}`);
        setError(message);
      }
    });
  };

  return (
    <Card>
      <CardHeader title="Search flights" note="Powered by Kiwi.com" />

      <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        <div>
          <label className="block text-[12px] font-medium tracking-wide text-ink-3 uppercase mb-2">
            Depart from
          </label>
          <div className="space-y-2">
            {ORIGINS.map((origin) => (
              <label key={origin} className="flex items-center gap-2 text-[13.5px]">
                <input
                  type="checkbox"
                  checked={selectedOrigins.has(origin)}
                  onChange={() => handleOriginToggle(origin)}
                  disabled={pending}
                  className="cursor-pointer"
                />
                <span>{origin}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="destination" className="block text-[12px] font-medium tracking-wide text-ink-3 uppercase mb-1">
            Destination airport
          </label>
          <input
            id="destination"
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value.toUpperCase())}
            placeholder="e.g., CPT, LHR, CDG"
            disabled={pending}
            maxLength={3}
            className="w-full"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="departDate" className="block text-[12px] font-medium tracking-wide text-ink-3 uppercase mb-1">
              Departure
            </label>
            <input
              id="departDate"
              type="date"
              value={departDate}
              onChange={(e) => setDepartDate(e.target.value)}
              disabled={pending}
              required
            />
          </div>

          <div>
            <label htmlFor="returnDate" className="block text-[12px] font-medium tracking-wide text-ink-3 uppercase mb-1">
              Return (optional)
            </label>
            <input
              id="returnDate"
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              disabled={pending}
            />
          </div>
        </div>

        <div>
          <label htmlFor="travellers" className="block text-[12px] font-medium tracking-wide text-ink-3 uppercase mb-1">
            Travellers
          </label>
          <input
            id="travellers"
            type="number"
            min="1"
            max="20"
            value={travellers}
            onChange={(e) => setTravellers(Math.max(1, Math.min(20, Number(e.target.value))))}
            disabled={pending}
          />
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Searching..." : "Search flights"}
        </Button>
      </form>
    </Card>
  );
}
