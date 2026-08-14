"use client";

import { useState } from "react";
import { DESTINATIONS } from "@/data/destinations";
import { createHotelBookingAction } from "@/app/actions";
import { Button, Card, CardHeader } from "./ui";

interface ManualHotelBookingFormProps {
  tripId: number;
  selectedDestinationId?: string;
  onSuccess?: () => void;
}

export function ManualHotelBookingForm({ tripId, selectedDestinationId, onSuccess }: ManualHotelBookingFormProps) {
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
      await createHotelBookingAction(formData);
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
        <CardHeader title="Hotels" note="Book outside the app? Log it here" />
        <div className="px-4 py-4">
          <Button onClick={() => setIsOpen(true)} variant="secondary" className="w-full">
            + Add hotel booking
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Add hotel booking" />
      <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
        {error && (
          <div className="rounded-md bg-critical/10 p-3 text-sm text-red-800 dark:bg-critical/10 dark:text-critical">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="destinationId" className="block text-[12px] font-medium tracking-wide text-ink-3 uppercase mb-1">
            Destination
          </label>
          <select
            id="destinationId"
            name="destinationId"
            defaultValue={selectedDestinationId || ""}
            required
            disabled={isSubmitting}
            className="w-full"
          >
            <option value="">Select destination...</option>
            {DESTINATIONS.map((dest) => (
              <option key={dest.id} value={dest.id}>
                {dest.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="name" className="block text-[12px] font-medium tracking-wide text-ink-3 uppercase mb-1">
            Hotel name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="e.g., The Ritz-Carlton"
            required
            disabled={isSubmitting}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="nightlyAmount" className="block text-[12px] font-medium tracking-wide text-ink-3 uppercase mb-1">
              Nightly rate (optional)
            </label>
            <input
              id="nightlyAmount"
              name="nightlyAmount"
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
