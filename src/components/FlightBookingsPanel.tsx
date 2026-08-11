"use client";

import { useState } from "react";
import type { FlightBooking } from "@/lib/db/bookings";
import { Badge, Card, CardHeader } from "./ui";
import { FlightBookingForm } from "./FlightBookingForm";

export interface FlightBookingsPanelProps {
  tripId: number;
  bookings: FlightBooking[];
}

export function FlightBookingsPanel({ tripId, bookings }: FlightBookingsPanelProps) {
  const [editingId, setEditingId] = useState<number | null>(null);

  if (bookings.length === 0) {
    return null;
  }

  const confirmedBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "tentative");
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled");

  return (
    <>
      <Card>
        <CardHeader
          title="Flight bookings"
          note={`${confirmedBookings.length} active, ${cancelledBookings.length} cancelled`}
        />

        <div className="divide-y divide-line">
          {bookings.map((booking) => (
            <div key={booking.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(editingId === booking.id ? null : booking.id)}
                      className="text-left text-[13.5px] font-medium text-link hover:underline"
                    >
                      {booking.airline} {booking.flightNumber} · {booking.origin} → {booking.destination}
                    </button>
                    <Badge
                      tone={
                        booking.status === "confirmed"
                          ? "good"
                          : booking.status === "tentative"
                            ? "accent"
                            : booking.status === "cancelled"
                              ? "neutral"
                              : "neutral"
                      }
                    >
                      {booking.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
                    {booking.cabin && <span>{booking.cabin}</span>}
                    {booking.connections >= 0 && (
                      <span>{booking.connections} stop{booking.connections === 1 ? "" : "s"}</span>
                    )}
                    {booking.costUsd && (
                      <span className="font-medium text-ink-2">${booking.costUsd.toFixed(2)}</span>
                    )}
                    {booking.confirmation && <span className="text-ink-4">{booking.confirmation}</span>}
                  </div>
                </div>
              </div>

              {editingId === booking.id && (
                <div className="mt-3 border-t border-line pt-3">
                  <FlightBookingForm tripId={tripId} booking={booking} />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
