"use client";

import { useState, useTransition } from "react";
import type { TripEvent } from "@/lib/db/events";
import type { Trip } from "@/lib/domain/types";
import { deleteEventAction } from "@/app/actions";
import { Badge, Button, Card, CardHeader } from "./ui";
import { formatDate } from "@/lib/dates";

export interface EventsPanelProps {
  events: TripEvent[];
  tripId: number;
  trip?: Trip;
}

/**
 * Check if an event overlaps with the trip's date range.
 * Trip dates = trip.startDate to trip.endDate, or derived from stops if not set.
 */
function eventOverlapsTripDates(event: TripEvent, trip?: Trip): boolean {
  if (!trip) return false;

  // If trip has explicit dates, check overlap
  if (trip.startDate && trip.endDate) {
    const eventStart = event.startDate;
    const eventEnd = event.endDate;
    const tripStart = trip.startDate;
    const tripEnd = trip.endDate;

    // Events overlap if: eventStart <= tripEnd AND eventEnd >= tripStart
    return eventStart <= tripEnd && eventEnd >= tripStart;
  }

  return false;
}

export function EventsPanel({ events, tripId, trip }: EventsPanelProps) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  const handleDelete = (eventId: number) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("eventId", String(eventId));
      formData.set("tripId", String(tripId));
      await deleteEventAction(formData);
    });
  };

  const overlappingEventIds = new Set(events.filter((e) => eventOverlapsTripDates(e, trip)).map((e) => e.id));

  return (
    <Card>
      <CardHeader
        title="Constraints & opportunities"
        note={`${events.length} event${events.length === 1 ? "" : "s"}`}
      />

      <div className="divide-y divide-line px-4">
        {events.length === 0 ? (
          <div className="py-4 text-[13px] text-ink-3">
            No events yet. Add constraints like flight deadlines, visas, or seasons.
          </div>
        ) : (
          events.map((event) => {
            const isOverlapping = overlappingEventIds.has(event.id);
            return (
              <div
                key={event.id}
                className={`flex items-start justify-between gap-4 py-3 ${
                  isOverlapping ? "rounded-sm bg-amber-500/5" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-medium text-ink-2">{event.label}</span>
                    <Badge tone={event.kind === "constraint" ? "warning" : "good"}>
                      {event.kind}
                    </Badge>
                    {isOverlapping && (
                      <Badge tone="warning">
                        overlaps trip
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 text-[12px] text-ink-3">
                    {formatDate(event.startDate, { year: false })} – {formatDate(event.endDate, { year: false })}
                  </div>
                  {event.notes && (
                    <div className="mt-1.5 text-[12px] text-ink-2">{event.notes}</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(event.id)}
                  disabled={pending}
                  className="shrink-0 text-[12px] text-link hover:underline disabled:text-ink-4"
                >
                  Delete
                </button>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
