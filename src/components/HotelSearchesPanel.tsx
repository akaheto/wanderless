"use client";

import { useState, useTransition } from "react";
import type { StoredHotelSearch } from "@/lib/db/searches";
import { deleteHotelSearchAction, createHotelBookingAction } from "@/app/actions";
import { searchAge } from "@/lib/hotels";
import type { HotelSearchResult } from "@/lib/hotels";
import { Badge, Button, Card, CardHeader } from "./ui";
import { formatDate } from "@/lib/dates";

export interface HotelSearchesPanelProps {
  searches: StoredHotelSearch[];
  tripId: number;
}

export function HotelSearchesPanel({ searches, tripId }: HotelSearchesPanelProps) {
  const [pending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<number | null>(searches[0]?.id ?? null);

  const handleDelete = (searchId: number) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("searchId", String(searchId));
      formData.set("tripId", String(tripId));
      await deleteHotelSearchAction(formData);
    });
  };

  const handleBookHotel = (search: StoredHotelSearch, result: HotelSearchResult, hotelIndex: number) => {
    startTransition(async () => {
      const hotel = result.hotels[hotelIndex];

      const formData = new FormData();
      formData.set("tripId", String(tripId));
      formData.set("destinationId", search.destinationId);
      formData.set("name", hotel.name);
      formData.set("nightlyAmount", String(hotel.pricePerNight));
      formData.set("currency", hotel.currency);

      await createHotelBookingAction(formData);
    });
  };

  if (searches.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader
        title="Hotel searches"
        note={`${searches.length} saved search${searches.length === 1 ? "" : "es"}`}
      />

      <div className="divide-y divide-line">
        {searches.map((search) => {
          const isExpanded = expandedId === search.id;
          const result = search.payload as unknown as HotelSearchResult;
          const age = searchAge(result);

          return (
            <div key={search.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : search.id)}
                      className="text-left text-[13.5px] font-medium text-link hover:underline"
                    >
                      {search.destinationId} · {result.nights} night{result.nights === 1 ? "" : "s"}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
                    <span>
                      {formatDate(search.checkIn, { year: false })} – {formatDate(search.checkOut, { year: false })} ·{" "}
                      {result.hotels.length} option{result.hotels.length === 1 ? "" : "s"}
                    </span>
                    {age.priceIsStale && <Badge tone="warning">prices stale</Badge>}
                    <span className="text-ink-4">retrieved {age.days} day{age.days === 1 ? "" : "s"} ago</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(search.id)}
                  disabled={pending}
                  className="shrink-0 text-[12px] text-link hover:underline disabled:text-ink-4"
                >
                  Delete
                </button>
              </div>

              {isExpanded && (
                <div className="mt-3 space-y-2 border-t border-line pt-3">
                  {result.hotels.map((hotel, idx) => (
                    <div key={hotel.id} className="rounded bg-bg-2 p-2 text-[12px]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-ink-1">{hotel.name}</div>
                          <div className="text-ink-3">
                            {"★".repeat(hotel.starRating)}
                            {"☆".repeat(5 - hotel.starRating)} ·{" "}
                            {hotel.pricePerNight}
                            {hotel.currency === "USD" ? "$" : "€"} per night
                          </div>
                          <div className="mt-1 text-ink-3">
                            Total: {hotel.totalForStay}
                            {hotel.currency === "USD" ? "$" : "€"} for {result.nights} night{result.nights === 1 ? "" : "s"}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => handleBookHotel(search, result, idx)}
                          disabled={pending}
                          className="shrink-0"
                        >
                          Book
                        </Button>
                      </div>
                      <div className="mt-1.5 text-ink-4">
                        <div className="text-[11px]">
                          <strong>Amenities:</strong> {hotel.amenities.slice(0, 3).join(" · ")}
                        </div>
                        <div className="mt-0.5 text-[11px]">
                          <strong>Cancellation:</strong> {hotel.cancellationPolicy}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
