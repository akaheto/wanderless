"use client";

import type { FlightBooking, HotelBooking } from "@/lib/db/bookings";
import type { BudgetItem } from "@/lib/db/budget";
import type { TripStop } from "@/lib/domain/types";
import { Badge, Card, CardHeader } from "./ui";
import { formatDate } from "@/lib/dates";

export interface TripBudgetPanelProps {
  flightBookings: FlightBooking[];
  hotelBookings: HotelBooking[];
  budgetItems?: BudgetItem[];
  stops: TripStop[];
  estimatedNightlyUsd?: number;
  tripCurrency?: string;
}

/**
 * Check if a payment is due soon (within 14 days).
 */
function isDueSoon(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const today = new Date();
  const due = new Date(dueDate);
  const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntilDue > 0 && daysUntilDue <= 14;
}

export function TripBudgetPanel({
  flightBookings,
  hotelBookings,
  budgetItems = [],
  stops,
  estimatedNightlyUsd = 200,
  tripCurrency = "USD",
}: TripBudgetPanelProps) {
  const totalFlightCost = flightBookings
    .filter((f) => f.status !== "cancelled")
    .reduce((sum, f) => sum + (f.costUsd || 0), 0);

  const totalNights = stops.reduce((sum, s) => sum + s.nights, 0);
  const estimatedHotelCost = totalNights * estimatedNightlyUsd;

  const actualHotelCost = hotelBookings
    .filter((h) => h.status !== "cancelled")
    .reduce((sum, h) => {
      const nightly = h.nightlyUsd || 0;
      const taxes = h.taxesUsd || 0;
      const resort = h.resortFeeUsd || 0;
      const nights =
        h.checkIn && h.checkOut
          ? Math.ceil((new Date(h.checkOut).getTime() - new Date(h.checkIn).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
      return sum + (nightly + taxes + resort) * nights;
    }, 0);

  const budgetTotal = budgetItems
    .filter((b) => b.bookedUsd !== null || b.estimatedUsd !== null)
    .reduce((sum, b) => sum + (b.bookedUsd ?? b.estimatedUsd ?? 0), 0);

  const estimatedTotal = totalFlightCost + estimatedHotelCost + budgetTotal;
  const bookedTotal = totalFlightCost + actualHotelCost + budgetTotal;

  // Get upcoming payment deadlines (due within 14 days)
  const upcomingDeadlines = budgetItems.filter((b) => isDueSoon(b.dueOn));

  // Show booked total if we have any bookings, otherwise show estimated
  const displayTotal = actualHotelCost > 0 ? bookedTotal : estimatedTotal;
  const hasSavings = actualHotelCost > 0 && estimatedHotelCost > actualHotelCost;
  const savingsAmount = hasSavings ? estimatedHotelCost - actualHotelCost : 0;

  return (
    <Card>
      <CardHeader
        title="Trip budget"
        note={
          hotelBookings.length > 0 || budgetItems.length > 0
            ? `${flightBookings.filter((f) => f.status === "confirmed").length} flights, ${hotelBookings.filter((h) => h.status === "confirmed").length} hotels, ${budgetItems.length} items`
            : "Estimates from the comparison"
        }
      />

      <div className="grid gap-px bg-line sm:grid-cols-2">
        <div className="space-y-3 bg-surface-1 px-4 py-3">
          <div>
            <div className="text-[11.5px] tracking-wide text-ink-3 uppercase">Flights</div>
            <div className="tnum mt-1 text-[16px] font-semibold">
              ${totalFlightCost > 0 ? totalFlightCost.toFixed(2) : "—"}
            </div>
            <div className="mt-0.5 text-[12px] text-ink-3">
              {flightBookings.filter((f) => f.status === "confirmed").length > 0
                ? `${flightBookings.filter((f) => f.status === "confirmed").length} booked`
                : "No flights booked yet"}
            </div>
          </div>
        </div>

        <div className="space-y-3 bg-surface-1 px-4 py-3">
          <div>
            <div className="text-[11.5px] tracking-wide text-ink-3 uppercase">Hotels</div>
            <div className="tnum mt-1 text-[16px] font-semibold">
              ${actualHotelCost > 0 ? actualHotelCost.toFixed(2) : estimatedHotelCost.toFixed(2)}
            </div>
            <div className="mt-0.5 text-[12px] text-ink-3">
              {actualHotelCost > 0
                ? `${hotelBookings.filter((h) => h.status === "confirmed").length} booked, ${totalNights} nights`
                : `Estimate: ${totalNights} nights × $${estimatedNightlyUsd}`}
            </div>
          </div>
        </div>
      </div>

      {budgetItems.length > 0 && (
        <>
          <div className="border-t border-line">
            <div className="divide-y divide-line">
              {budgetItems.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-ink-2">{item.label}</span>
                      {isDueSoon(item.dueOn) && <Badge tone="warning">due soon</Badge>}
                    </div>
                    {item.dueOn && (
                      <div className="mt-0.5 text-[12px] text-ink-3">Due {formatDate(item.dueOn, { year: false })}</div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="tnum text-[13px] font-semibold text-ink-2">${item.bookedUsd ?? item.estimatedUsd ?? 0}</div>
                    <div className="text-[11px] text-ink-3">{item.category}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {upcomingDeadlines.length > 0 && (
        <div className="border-t border-line bg-amber-500/5 px-4 py-2.5">
          <div className="text-[12px] font-medium text-amber-900">
            ⚠️ {upcomingDeadlines.length} payment{upcomingDeadlines.length === 1 ? "" : "s"} due within 14 days
          </div>
        </div>
      )}

      <div className="border-t border-line px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11.5px] tracking-wide text-ink-3 uppercase">
              {actualHotelCost > 0 ? "Booked total" : "Estimated total"}
              {tripCurrency !== "USD" && ` (${tripCurrency})`}
            </div>
            <div className="tnum mt-1 text-[20px] font-semibold text-ink-2">
              {tripCurrency === "USD" ? "$" : tripCurrency + " "}
              {displayTotal.toFixed(2)}
            </div>
            {tripCurrency !== "USD" && <div className="mt-1 text-[12px] text-ink-3">≈ ${displayTotal.toFixed(2)} USD</div>}
          </div>
          {hasSavings && <Badge tone="good">saving ${savingsAmount.toFixed(2)}</Badge>}
        </div>
      </div>
    </Card>
  );
}
