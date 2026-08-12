import { notFound } from "next/navigation";
import Link from "next/link";
import { getShareByToken } from "@/lib/db/users";
import { getTrip, listCandidates } from "@/lib/db/trips";
import { listStops } from "@/lib/db/stops";
import { listPlacesForTrip } from "@/lib/db/places";
import { listFlightBookings, listHotelBookings } from "@/lib/db/bookings";
import { DESTINATIONS, getDestination } from "@/data/destinations";
import { PageHeader, Card, CardHeader, Empty } from "@/components/ui";
import { ItineraryPanel } from "@/components/ItineraryPanel";
import { PlacesPanel } from "@/components/PlacesPanel";
import { TripBudgetPanel } from "@/components/TripBudgetPanel";
import { buildItinerary } from "@/lib/itinerary";
import { formatDateRange, nightsBetween } from "@/lib/dates";
import { summariseBudget, byCategory, upcomingPayments, type BudgetItem as BudgetItemType } from "@/lib/money/budget";

export default async function SharedTripPage({ params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  const share = await getShareByToken(token);

  if (!share) notFound();

  const trip = await getTrip(share.tripId);
  if (!trip) notFound();

  const [candidates, stops, flightBookings, hotelBookings] = await Promise.all([
    listCandidates(trip.id),
    listStops(trip.id),
    listFlightBookings(trip.id),
    listHotelBookings(trip.id),
  ]);

  const selected = candidates.find((c) => c.status === "selected");
  if (!selected) {
    return (
      <>
        <PageHeader
          title={trip.name}
          breadcrumb={{ href: "/", label: "Home" }}
          lede="Shared trip (preview)"
        />
        <div className="mx-auto max-w-2xl">
          <Empty
            title="Trip not yet planned"
            body="The trip creator hasn't selected a destination yet. Come back once they've made their decision."
          />
        </div>
      </>
    );
  }

  const destination = getDestination(selected.destinationId);
  if (!destination) notFound();

  const itinerary = buildItinerary(trip, stops);
  const nights = trip.startDate && trip.endDate ? nightsBetween(trip.startDate, trip.endDate) : null;

  const { attached: places } = await listPlacesForTrip(trip.id, [selected.destinationId]);

  return (
    <>
      <PageHeader
        title={trip.name}
        lede={`Shared by someone planning a trip • Destination: ${destination.name}`}
        breadcrumb={{ href: "/", label: "Home" }}
      />

      <div className="mx-auto max-w-4xl space-y-6">
        <Card>
          <CardHeader
            title="Trip summary"
            note="This is a curated view — shared by the trip planner, no personal notes included"
          />
          <div className="grid gap-3 px-4 py-4 sm:grid-cols-3">
            <div>
              <div className="text-[12px] tracking-wide text-ink-3 uppercase">Destination</div>
              <div className="mt-1 text-[15px] font-medium text-ink-2">{destination.name}</div>
            </div>
            <div>
              <div className="text-[12px] tracking-wide text-ink-3 uppercase">Dates</div>
              <div className="mt-1 text-[15px] font-medium text-ink-2">
                {formatDateRange(trip.startDate, trip.endDate)}
              </div>
            </div>
            <div>
              <div className="text-[12px] tracking-wide text-ink-3 uppercase">Duration</div>
              <div className="mt-1 text-[15px] font-medium text-ink-2">
                {nights} night{nights === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        </Card>

        {itinerary && (
          <ItineraryPanel
            tripId={trip.id}
            itinerary={itinerary}
            catalog={DESTINATIONS}
            selectedDestination={destination}
            tripNights={nights ?? 0}
          />
        )}

        {(() => {
          // Convert bookings to budget items for display
          const budgetForDisplay: BudgetItemType[] = [
            ...flightBookings.map((flight) => ({
              id: flight.id,
              tripId: trip.id,
              category: "flights" as const,
              label: `${flight.airline} ${flight.flightNumber}`,
              estimated: null,
              booked: flight.cost,
              refundable: flight.status !== "confirmed",
              refundableUntil: null,
              dueOn: null,
              paid: false,
            })),
            ...hotelBookings.map((hotel) => ({
              id: hotel.id,
              tripId: trip.id,
              category: "lodging" as const,
              label: hotel.name || "Hotel",
              estimated: null,
              booked: hotel.nightly
                ? {
                    amount: (hotel.nightly.amount + (hotel.taxes?.amount || 0) + (hotel.resortFee?.amount || 0)) *
                      (hotel.checkIn && hotel.checkOut
                        ? Math.ceil((new Date(hotel.checkOut).getTime() - new Date(hotel.checkIn).getTime()) / (1000 * 60 * 60 * 24))
                        : 0),
                    currency: hotel.nightly.currency,
                  }
                : null,
              refundable: hotel.refundable,
              refundableUntil: hotel.cancelBy,
              dueOn: null,
              paid: false,
            })),
          ];

          return (
            <TripBudgetPanel
              totals={summariseBudget(budgetForDisplay, trip.currency, [])}
              byCategory={byCategory(budgetForDisplay, trip.currency, [])}
              upcomingPayments={upcomingPayments(budgetForDisplay)}
            />
          );
        })()}

        {places.length > 0 && (
          <PlacesPanel
            tripId={trip.id}
            places={places}
            standing={[]}
            itinerary={itinerary}
            destinationIds={[{ id: selected.destinationId, name: destination.name }]}
            tripStartDate={trip.startDate}
            sources={new Map()}
          />
        )}

        <Card>
          <CardHeader title="About shared trips" note="What you're seeing" />
          <div className="space-y-3 px-4 py-4 text-[13px] text-ink-2">
            <p>
              This is a <strong>curated view</strong> of someone's trip plan. You can see:
            </p>
            <ul className="space-y-2 pl-4">
              <li>✓ The destination they chose</li>
              <li>✓ How long they're staying and where</li>
              <li>✓ Flights and hotels they've booked</li>
              <li>✓ Places and experiences they've saved</li>
            </ul>
            <p className="mt-3">You cannot see their personal notes, rejected options, or preferences — only what they've decided to do.</p>
            <p className="mt-3 text-[12px] text-ink-3">
              If you'd like to help plan a trip together, ask the trip creator to add you as a collaborator.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
