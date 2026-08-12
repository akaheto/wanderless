"use client";

import { useState, useTransition } from "react";
import type { TripEvent } from "@/lib/db/events";
import type { Trip } from "@/lib/domain/types";
import { deleteEventAction, updateEventAction } from "@/app/actions";
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
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleUpdate = (event: TripEvent) => {
    return (formData: FormData) => {
      startTransition(async () => {
        formData.set("eventId", String(event.id));
        formData.set("tripId", String(tripId));
        await updateEventAction(formData);
        setEditingId(null);
      });
    };
  };

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
            const isEditing = editingId === event.id;

            return (
              <div
                key={event.id}
                className={`py-3 ${isOverlapping && !isEditing ? "rounded-sm bg-amber-500/5" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
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

                  {!isEditing && (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(event.id)}
                        className="text-[12px] text-link hover:underline disabled:text-ink-4"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(event.id)}
                        disabled={pending}
                        className="text-[12px] text-link hover:underline disabled:text-ink-4"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <form action={handleUpdate(event)} className="mt-3 space-y-2 border-t border-line pt-3">
                    <div>
                      <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
                        Label
                      </label>
                      <input
                        type="text"
                        name="label"
                        defaultValue={event.label}
                        maxLength={200}
                        required
                        className="w-full"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
                          Start date
                        </label>
                        <input
                          type="date"
                          name="startDate"
                          defaultValue={event.startDate}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
                          End date
                        </label>
                        <input
                          type="date"
                          name="endDate"
                          defaultValue={event.endDate}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
                        Kind
                      </label>
                      <select name="kind" defaultValue={event.kind} className="w-full">
                        <option value="constraint">Constraint</option>
                        <option value="opportunity">Opportunity</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[12px] font-medium text-ink-3 uppercase tracking-wide mb-1">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        defaultValue={event.notes}
                        maxLength={1000}
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button type="submit" disabled={pending}>
                        {pending ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setEditingId(null)}
                        disabled={pending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
