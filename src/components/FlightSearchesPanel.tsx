"use client";

import { useState, useTransition } from "react";
import type { StoredFlightSearch } from "@/lib/db/searches";
import { deleteFlightSearchAction, createFlightBookingAction } from "@/app/actions";
import { searchAge } from "@/lib/flights";
import { Badge, Button, Card, CardHeader } from "./ui";
import { formatDate } from "@/lib/dates";
import { toMajorUnits } from "@/lib/money";

export interface FlightSearchesPanelProps {
  searches: StoredFlightSearch[];
  tripId: number;
}

export function FlightSearchesPanel({ searches, tripId }: FlightSearchesPanelProps) {
  const [expandedId, setExpandedId] = useState<number | null>(searches[0]?.id ?? null);
  const [pending, startTransition] = useTransition();

  const handleDelete = (searchId: number) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("searchId", String(searchId));
      formData.set("tripId", String(tripId));
      await deleteFlightSearchAction(formData);
    });
  };

  const handleBookFlight = (search: StoredFlightSearch, itineraryIndex: number) => {
    startTransition(async () => {
      const it = search.result.itineraries[itineraryIndex];
      const firstSegment = it.segments[0];

      const formData = new FormData();
      formData.set("tripId", String(tripId));
      formData.set("origin", search.origin);
      formData.set("destination", search.destinationAirport);
      formData.set("airline", firstSegment?.airline ?? "");
      formData.set("flightNumber", firstSegment?.flightNumber ?? "");
      if (it.priceMinorUnits && it.currency) {
        formData.set("costAmount", String(toMajorUnits({ amount: it.priceMinorUnits, currency: it.currency })));
        formData.set("currency", it.currency);
      }

      await createFlightBookingAction(formData);
    });
  };

  if (searches.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader
        title="Flight searches"
        note={`${searches.length} saved search${searches.length === 1 ? "" : "es"}`}
      />

      <div className="divide-y divide-line">
        {searches.map((search) => {
          const age = searchAge(search.result);
          const isExpanded = expandedId === search.id;

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
                      {search.origin} → {search.destinationAirport}
                      {search.returnDate ? " (round trip)" : " (one way)"}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
                    <span>
                      {formatDate(search.departDate, { year: false })} ·{" "}
                      {search.result.itineraries.length} option{search.result.itineraries.length === 1 ? "" : "s"}
                    </span>
                    {age.fareIsStale && <Badge tone="warning">fares stale</Badge>}
                    {age.scheduleIsStale && <Badge tone="warning">schedules stale</Badge>}
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
                <div className="mt-3 space-y-3 border-t border-line pt-3">
                  {search.result.itineraries.map((it, idx) => (
                    <div key={it.id} className="text-[12px]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-medium text-ink-2">
                            Option {idx + 1} · {Math.floor(it.totalMinutes / 60)}h {it.totalMinutes % 60}m
                            {it.stops === 0 ? " (nonstop)" : ` (${it.stops} stop${it.stops === 1 ? "" : "s"})`}
                          </div>
                          {it.priceMinorUnits && it.currency && (
                            <div className="text-ink-3">
                              {(it.priceMinorUnits / 100).toFixed(2)} {it.currency}
                            </div>
                          )}
                          <div className="mt-1 text-ink-3">
                            {it.segments.map((seg, i) => (
                              <div key={i}>
                                {seg.airline} {seg.flightNumber} · {seg.from} → {seg.to}
                              </div>
                            ))}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => handleBookFlight(search, idx)}
                          disabled={pending}
                          className="shrink-0"
                        >
                          Book
                        </Button>
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
