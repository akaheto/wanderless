"use client";

import { useState } from "react";
import { createFlightBookingAction } from "@/app/actions";
import { Button, Card, CardHeader } from "./ui";

interface ManualFlightBookingFormProps {
  tripId: number;
  onSuccess?: () => void;
}

export function ManualFlightBookingForm({ tripId, onSuccess }: ManualFlightBookingFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set("tripId", String(tripId));
      await createFlightBookingAction(formData);
      e.currentTarget.reset();
      setIsOpen(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <Card>
        <CardHeader title="Flights" note="Book outside the app? Log it here" />
        <div className="px-4 py-4">
          <Button onClick={() => setIsOpen(true)} variant="secondary" className="w-full">
            + Add flight booking
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Add flight booking" />
      <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
        {error && (
          <div className="rounded-md bg-critical/10 p-3 text-sm text-critical">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="origin" className="block text-[12px] font-medium tracking-wide text-ink-3 uppercase mb-1">
              From (airport code)
            </label>
            <input
              id="origin"
              name="origin"
              type="text"
              maxLength={3}
              placeholder="JFK"
              required
              disabled={isSubmitting}
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="destination" className="block text-[12px] font-medium tracking-wide text-ink-3 uppercase mb-1">
              To (airport code)
            </label>
            <input
              id="destination"
              name="destination"
              type="text"
              maxLength={3}
              placeholder="LHR"
              required
              disabled={isSubmitting}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="airline" className="block text-[12px] font-medium tracking-wide text-ink-3 uppercase mb-1">
              Airline
            </label>
            <input
              id="airline"
              name="airline"
              type="text"
              placeholder="United Airlines"
              required
              disabled={isSubmitting}
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="flightNumber" className="block text-[12px] font-medium tracking-wide text-ink-3 uppercase mb-1">
              Flight number
            </label>
            <input
              id="flightNumber"
              name="flightNumber"
              type="text"
              placeholder="UA123"
              required
              disabled={isSubmitting}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="costAmount" className="block text-[12px] font-medium tracking-wide text-ink-3 uppercase mb-1">
              Price (optional)
            </label>
            <input
              id="costAmount"
              name="costAmount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              disabled={isSubmitting}
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="currency" className="block text-[12px] font-medium tracking-wide text-ink-3 uppercase mb-1">
              Currency
            </label>
            <select name="currency" defaultValue="USD" disabled={isSubmitting} className="w-full">
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
              <option value="AUD">AUD</option>
              <option value="CAD">CAD</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Adding..." : "Add booking"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
