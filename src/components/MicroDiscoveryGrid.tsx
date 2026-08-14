"use client";

import type { Destination, Place } from "@/lib/domain/types";
import type { TripEvent } from "@/lib/db/events";
import type { BudgetTotals } from "@/lib/money/budget";
import { Card } from "./ui";

interface MicroDiscoveryGridProps {
  destination?: Destination;
  trip: { id: number; currency: string };
  budgetTotals?: BudgetTotals;
  events?: TripEvent[];
  places?: Place[];
  selectedMonth?: number;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function MicroCard({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-40 flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-line">
        <span className="text-xl">{emoji}</span>
        <h3 className="font-medium text-sm text-ink-1">{title}</h3>
      </div>
      <div className="flex-1 px-4 py-3 overflow-hidden text-sm text-ink-2">
        {children}
      </div>
    </Card>
  );
}

export function MicroDiscoveryGrid({
  destination,
  trip,
  budgetTotals,
  events,
  places,
  selectedMonth,
}: MicroDiscoveryGridProps) {
  const monthName = selectedMonth ? MONTH_NAMES[selectedMonth - 1] : "This month";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-full">
      {/* Weather Card */}
      <MicroCard emoji="🌤️" title="Forecast">
        {destination ? (
          <div className="space-y-2">
            <div className="text-xs text-ink-3">7-day forecast</div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="flex-1 h-6 bg-gradient-to-t from-blue-400 to-yellow-300 rounded-full opacity-70"
                />
              ))}
            </div>
            <div className="text-xs text-ink-3 pt-1">68–75°F typical</div>
          </div>
        ) : (
          <div className="text-ink-4 italic">Select a destination</div>
        )}
      </MicroCard>

      {/* Budget Card */}
      <MicroCard emoji="💰" title="Budget">
        {budgetTotals ? (
          <div className="space-y-2">
            <div className="text-sm font-medium text-ink-1">
              {budgetTotals.currency} {budgetTotals.estimated.amount / 100}
            </div>
            <div className="text-xs text-ink-3">
              Booked: {budgetTotals.currency} {budgetTotals.booked.amount / 100}
            </div>
            <div className="text-xs text-good pt-1">
              Save up to {budgetTotals.currency} {budgetTotals.recoverable.amount / 100}
            </div>
          </div>
        ) : (
          <div className="text-ink-4 italic">No budget items yet</div>
        )}
      </MicroCard>

      {/* Events Card */}
      <MicroCard emoji="🎉" title="Events">
        {events && events.length > 0 ? (
          <div className="space-y-1">
            {events.slice(0, 3).map((event) => (
              <div key={event.id} className="text-xs">
                <span className={event.kind === "constraint" ? "text-critical" : "text-good"}>
                  {event.kind === "constraint" ? "🚫" : "✨"}
                </span>
                <span className="ml-1">{event.label}</span>
              </div>
            ))}
            {events.length > 3 && (
              <div className="text-xs text-ink-4 pt-1">+{events.length - 3} more</div>
            )}
          </div>
        ) : (
          <div className="text-ink-4 italic">No events scheduled</div>
        )}
      </MicroCard>

      {/* Highlights Card */}
      <MicroCard emoji="⭐" title="Highlights">
        {places && places.length > 0 ? (
          <div className="space-y-1">
            {places.slice(0, 3).map((place) => (
              <div key={place.id} className="text-xs truncate">
                {place.name}
                <span className="text-ink-4"> • {place.category}</span>
              </div>
            ))}
            {places.length > 3 && (
              <div className="text-xs text-teal-600 pt-1 cursor-pointer hover:underline">
                View all {places.length} places
              </div>
            )}
          </div>
        ) : (
          <div className="text-ink-4 italic">No places saved</div>
        )}
      </MicroCard>
    </div>
  );
}
