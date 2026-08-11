"use client";

import { useTransition } from "react";
import type { HotelBooking } from "@/lib/db/bookings";
import { createHotelBookingAction } from "@/app/actions";
import { Button, Card, CardHeader } from "./ui";

export interface HotelBookingFormProps {
  tripId: number;
  booking: HotelBooking;
  nights?: number;
}

export function HotelBookingForm({ tripId, booking, nights }: HotelBookingFormProps) {
  const [pending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      formData.set("tripId", String(tripId));
      formData.set("bookingId", String(booking.id));
      await createHotelBookingAction(formData);
    });
  };

  return (
    <Card>
      <CardHeader
        title="Confirm hotel booking"
        note={booking.name || "Hotel booking"}
      />

      <form action={handleSubmit} className="space-y-4 px-4 py-4">
        {/* Hotel details display */}
        <div className="rounded bg-surface-1 p-3">
          <div className="grid gap-2 text-[12.5px] text-ink-3">
            {booking.checkIn && (
              <div className="flex justify-between">
                <span>Check-in:</span>
                <span className="font-medium text-ink-2">{booking.checkIn}</span>
              </div>
            )}
            {booking.checkOut && (
              <div className="flex justify-between">
                <span>Check-out:</span>
                <span className="font-medium text-ink-2">{booking.checkOut}</span>
              </div>
            )}
            {booking.nightlyUsd && (
              <div className="flex justify-between">
                <span>Nightly rate:</span>
                <span className="font-medium text-ink-2">${booking.nightlyUsd.toFixed(2)}</span>
              </div>
            )}
            {nights && (
              <div className="flex justify-between">
                <span>Nights:</span>
                <span className="font-medium text-ink-2">{nights}</span>
              </div>
            )}
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
              Hotel name
            </label>
            <input
              type="text"
              name="name"
              defaultValue={booking.name}
              placeholder="e.g., Four Seasons, The Peninsula"
              maxLength={200}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
                Nightly rate (USD)
              </label>
              <input
                type="number"
                name="nightlyUsd"
                defaultValue={booking.nightlyUsd ?? ""}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
                Taxes (USD)
              </label>
              <input
                type="number"
                name="taxesUsd"
                defaultValue={booking.taxesUsd ?? ""}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
              Resort fee (USD)
            </label>
            <input
              type="number"
              name="resortFeeUsd"
              defaultValue={booking.resortFeeUsd ?? ""}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="refundable"
                defaultChecked={booking.refundable}
              />
              <span className="text-[13px] text-ink-2">Refundable</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="breakfastIncluded"
                defaultChecked={booking.breakfastIncluded}
              />
              <span className="text-[13px] text-ink-2">Breakfast included</span>
            </label>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
              Cancellation deadline
            </label>
            <input
              type="date"
              name="cancelBy"
              defaultValue={booking.cancelBy ?? ""}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
              Confirmation code
            </label>
            <input
              type="text"
              name="confirmation"
              defaultValue={booking.confirmation}
              placeholder="e.g., CONF12345"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
              Status
            </label>
            <select name="status" defaultValue={booking.status}>
              <option value="option">Option</option>
              <option value="tentative">Tentative</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              defaultValue={booking.notes}
              placeholder="Any additional notes…"
              maxLength={2000}
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-2 border-t border-line pt-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save booking"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
