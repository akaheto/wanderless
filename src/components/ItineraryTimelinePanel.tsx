"use client";

import { useState } from "react";
import Link from "next/link";
import type { TripStop } from "@/lib/domain/types";
import type { Trip } from "@/lib/domain/types";
import { getDestination } from "@/data/destinations";
import { Card, CardHeader, Button } from "./ui";
import { formatDate, nightsBetween } from "@/lib/dates";

interface ItineraryTimelinePanelProps {
  trip: Trip;
  stops: TripStop[];
  onEdit?: (stopId: number) => void;
  onDelete?: (stopId: number) => void;
}

export function ItineraryTimelinePanel({
  trip,
  stops,
  onEdit,
  onDelete,
}: ItineraryTimelinePanelProps) {
  const [draggedStop, setDraggedStop] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  if (stops.length === 0) {
    return (
      <Card>
        <CardHeader title="Itinerary" />
        <div className="px-4 py-8 text-center text-ink-3">
          <p>No stops yet. Add destinations to build your itinerary.</p>
        </div>
      </Card>
    );
  }

  const totalNights = stops.reduce((sum, stop) => sum + stop.nights, 0);
  const tripStartDay = trip.startDate
    ? Math.ceil((nightsBetween(trip.startDate, new Date().toISOString().split("T")[0]) || 0) * -1)
    : 1;

  return (
    <Card>
      <CardHeader
        title="Itinerary"
        note={`${stops.length} stop${stops.length !== 1 ? "s" : ""} • ${totalNights} nights`}
      />

      {/* Progress Bar */}
      {trip.startDate && trip.endDate && (
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-2 text-xs text-ink-3">
            <span>Trip timeline</span>
            <span>
              Day {Math.max(1, tripStartDay)} of {totalNights + 1}
            </span>
          </div>
          <div className="h-1 bg-line rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-series-2"
              style={{ width: `${Math.min(100, (tripStartDay / (totalNights + 1)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="px-4 py-6 space-y-6 border-l-4 border-accent ml-4">
        {stops.map((stop, idx) => {
          const destination = getDestination(stop.destinationId);
          const isLast = idx === stops.length - 1;

          return (
            <div
              key={stop.id}
              draggable
              onDragStart={() => {
                setDraggedStop(stop.id);
                setReordering(true);
              }}
              onDragEnd={() => setDraggedStop(null)}
              className={`-ml-8 pl-8 relative cursor-move transition-opacity ${
                draggedStop === stop.id ? "opacity-50" : "opacity-100"
              }`}
            >
              {/* Timeline Dot */}
              <div className="absolute -left-6 top-1 w-4 h-4 bg-accent rounded-full border-4 border-surface-2 shadow-md" />

              {/* Stop Card */}
              <div className="bg-surface-2 rounded-lg p-4 shadow-sm border border-line hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/destinations/${stop.destinationId}`}
                      className="text-lg font-bold text-teal-600 hover:underline block truncate"
                    >
                      {destination?.name ?? stop.destinationId}
                    </Link>
                    <div className="text-sm text-ink-3 mt-0.5">
                      Stop {stop.position + 1} • {stop.nights} nights
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-ink-2">{stop.nights}</div>
                    <div className="text-xs text-ink-3">night{stop.nights !== 1 ? "s" : ""}</div>
                  </div>
                </div>

                {/* Airport Code */}
                {destination && (
                  <div className="font-mono text-sm font-bold text-teal-600 mb-3">
                    {stop.destinationId.toUpperCase()}
                  </div>
                )}

                {/* Flight Leg (if not last) */}
                {!isLast && (
                  <div className="flex items-center gap-2 my-3 py-2 px-3 bg-accent-soft rounded">
                    <span className="text-sm">✈️</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-ink-3">
                        {stops[idx + 1]
                          ? `Fly to ${getDestination(stops[idx + 1].destinationId)?.name || stops[idx + 1].destinationId}`
                          : "Final destination"}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-ink-2 shrink-0">2-4h</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-line">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onEdit?.(stop.id)}
                    className="text-xs px-2 py-1"
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onDelete?.(stop.id)}
                    className="text-xs px-2 py-1 text-critical hover:text-red-700"
                  >
                    🗑️ Delete
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {reordering && (
        <div className="px-4 py-2 text-xs text-ink-3 border-t border-line">
          💡 Drag stops to reorder (web only)
        </div>
      )}
    </Card>
  );
}
