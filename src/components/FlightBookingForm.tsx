"use client";

import { useTransition } from "react";
import type { FlightBooking } from "@/lib/db/bookings";
import { updateFlightBookingAction } from "@/app/actions";
import { toMajorUnits } from "@/lib/money";
import { Button, Card, CardHeader } from "./ui";

export interface FlightBookingFormProps {
  tripId: number;
  booking: FlightBooking;
}

export function FlightBookingForm({ tripId, booking }: FlightBookingFormProps) {
  const [pending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      formData.set("tripId", String(tripId));
      formData.set("bookingId", String(booking.id));
      await updateFlightBookingAction(formData);
    });
  };

  return (
    <Card>
      <CardHeader
        title="Confirm flight booking"
        note={`${booking.origin} → ${booking.destination}`}
      />

      <form action={handleSubmit} className="space-y-4 px-4 py-4">
        {/* Flight details display */}
        <div className="rounded bg-surface-1 p-3">
          <div className="grid gap-2 text-[12.5px] text-ink-3">
            <div className="flex justify-between">
              <span>Route:</span>
              <span className="font-medium text-ink-2">
                {booking.origin} → {booking.destination}
              </span>
            </div>
            {booking.departAt && (
              <div className="flex justify-between">
                <span>Departs:</span>
                <span className="font-medium text-ink-2">{booking.departAt}</span>
              </div>
            )}
            {booking.arriveAt && (
              <div className="flex justify-between">
                <span>Arrives:</span>
                <span className="font-medium text-ink-2">{booking.arriveAt}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Connections:</span>
              <span className="font-medium text-ink-2">{booking.connections} stop{booking.connections === 1 ? "" : "s"}</span>
            </div>
            {booking.totalMinutes && (
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-medium text-ink-2">
                  {Math.floor(booking.totalMinutes / 60)}h {booking.totalMinutes % 60}m
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
              Airline
            </label>
            <input
              type="text"
              name="airline"
              defaultValue={booking.airline}
              placeholder="e.g., United, Delta, Emirates"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
              Flight number
            </label>
            <input
              type="text"
              name="flightNumber"
              defaultValue={booking.flightNumber}
              placeholder="e.g., UA1234"
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
              Cabin
            </label>
            <select name="cabin" defaultValue={booking.cabin}>
              <option value="">Select cabin…</option>
              <option value="economy">Economy</option>
              <option value="premium-economy">Premium Economy</option>
              <option value="business">Business</option>
              <option value="first">First</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
              Confirmation code
            </label>
            <input
              type="text"
              name="confirmation"
              defaultValue={booking.confirmation}
              placeholder="e.g., ABC123"
              maxLength={50}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
                Cost Amount
              </label>
              <input
                type="number"
                name="costAmount"
                defaultValue={booking.cost ? toMajorUnits(booking.cost) : ""}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
                Currency
              </label>
              <input
                type="text"
                name="currency"
                defaultValue={booking.cost?.currency ?? "USD"}
                placeholder="USD"
                maxLength={3}
                className="uppercase"
              />
            </div>
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
