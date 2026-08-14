'use client';

import Link from 'next/link';
import type { EventCard } from '@/lib/integrations/ticketmaster';

interface EventCardProps {
  event: EventCard;
}

/**
 * Display a single upcoming event from Ticketmaster
 */
export function EventCardComponent({ event }: EventCardProps) {
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={event.url} target="_blank" rel="noopener noreferrer">
      <div className="group cursor-pointer rounded-lg border border-line bg-surface-1 overflow-hidden transition-all hover:shadow-md hover:border-accent">
        {/* Image */}
        {event.image && (
          <div className="relative h-32 overflow-hidden bg-surface-2">
            <img
              src={event.image}
              alt={event.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          <p className="text-xs font-medium uppercase text-accent mb-1">{event.category}</p>

          <h3 className="font-semibold text-sm text-ink line-clamp-2 mb-2 group-hover:text-accent">
            {event.name}
          </h3>

          {/* Date & Time */}
          <div className="text-xs text-ink-3 space-y-1 mb-3">
            <p>📅 {formattedDate}</p>
            {event.time && <p>🕒 {event.time}</p>}
            {event.venue && <p>📍 {event.venue}</p>}
          </div>

          {/* Price & CTA */}
          <div className="flex items-center justify-between">
            {event.priceRange && (
              <span className="text-xs font-medium text-ink-2">{event.priceRange}</span>
            )}
            <span className="text-xs text-accent font-medium">Get tickets →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

interface EventsGridProps {
  events: EventCard[];
  title?: string;
}

/**
 * Display grid of upcoming events
 */
export function EventsGrid({ events, title = 'Upcoming Events' }: EventsGridProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCardComponent key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
