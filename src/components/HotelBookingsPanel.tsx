"use client";

import { useState } from "react";
import type { HotelBooking } from "@/lib/db/bookings";
import { Badge, Card, CardHeader } from "./ui";
import { HotelBookingForm } from "./HotelBookingForm";
import { formatDate } from "@/lib/dates";

export interface HotelBookingsPanelProps {
  tripId: number;
  bookings: HotelBooking[];
}

export function HotelBookingsPanel({ tripId, bookings }: HotelBookingsPanelProps) {
  const [editingId, setEditingId] = useState<number | null>(null);

  if (bookings.length === 0) {
    return null;
  }

  const confirmedBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "tentative");
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled");

  const getNights = (booking: HotelBooking): number => {
    if (booking.checkIn && booking.checkOut) {
      return Math.ceil(
        (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
          (1000 * 60 * 60 * 24)
      );
    }
    return 0;
  };

  const getTotalNightCost = (booking: HotelBooking): number => {
    const nights = getNights(booking);
    const nightly = booking.nightlyUsd || 0;
    const taxes = booking.taxesUsd || 0;
    const resort = booking.resortFeeUsd || 0;
    return (nightly + taxes + resort) * nights;
  };

  return (
    <>
      <Card>
        <CardHeader
          title="Hotel bookings"
          note={`${confirmedBookings.length} active, ${cancelledBookings.length} cancelled`}
        />

        <div className="divide-y divide-line">
          {bookings.map((booking) => {
            const nights = getNights(booking);
            const totalCost = getTotalNightCost(booking);

            return (
              <div key={booking.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(editingId === booking.id ? null : booking.id)}
                        className="text-left text-[13.5px] font-medium text-link hover:underline"
                      >
                        {booking.name}
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
                      {booking.checkIn && booking.checkOut && (
                        <span>
                          {formatDate(booking.checkIn, { year: false })} – {formatDate(booking.checkOut, { year: false })} · {nights} night{nights === 1 ? "" : "s"}
                        </span>
                      )}
                      {booking.nightlyUsd && (
                        <span>${booking.nightlyUsd.toFixed(2)}/night</span>
                      )}
                      {totalCost > 0 && (
                        <span className="font-medium text-ink-2">${totalCost.toFixed(2)}</span>
                      )}
                      {booking.refundable && <span className="text-ink-4">refundable</span>}
                      {booking.breakfastIncluded && <span className="text-ink-4">breakfast included</span>}
                      {booking.confirmation && <span className="text-ink-4">{booking.confirmation}</span>}
                    </div>
                  </div>
                </div>

                {editingId === booking.id && (
                  <div className="mt-3 border-t border-line pt-3">
                    <HotelBookingForm tripId={tripId} booking={booking} nights={nights} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
