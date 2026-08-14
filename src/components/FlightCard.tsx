'use client';

import Link from 'next/link';
import { Card, CardHeader } from '@/components/ui';
import type { FlightSearchResult, FlightOffer } from '@/lib/integrations/kiwi-flights';

interface FlightCardProps {
  result: FlightSearchResult;
  destination: string;
}

/**
 * Display flight options from NYC to destination
 * Shows: cheapest, fastest, and nonstop options
 */
export function FlightCard({ result, destination }: FlightCardProps) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const renderFlightOption = (flight: FlightOffer | null, label: string, icon: string) => {
    if (!flight) return null;

    const stopLabel =
      flight.stops === 0
        ? 'Nonstop'
        : flight.stops === 1
          ? '1 stop'
          : `${flight.stops} stops`;

    return (
      <Link href={flight.url} target="_blank" rel="noopener noreferrer">
        <div className="rounded-lg border border-line bg-surface-2 p-4 hover:border-accent hover:shadow-md transition-all cursor-pointer">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-xs font-medium uppercase text-accent mb-1">{icon} {label}</p>
              <p className="text-lg font-semibold text-ink">${flight.price.usd}</p>
            </div>
            <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-1 rounded">
              {stopLabel}
            </span>
          </div>

          {/* Flight times */}
          <div className="text-sm text-ink-2 space-y-1 mb-3">
            <p>
              {flight.departure.time} {flight.departure.airport} → {flight.arrival.time}{' '}
              {flight.arrival.airport}
            </p>
            <p className="text-xs text-ink-3">Duration: {formatDuration(flight.duration)}</p>
          </div>

          <div className="text-xs text-accent font-medium">Book now →</div>
        </div>
      </Link>
    );
  };

  return (
    <Card>
      <CardHeader
        title="Flights from NYC"
        note={`${result.foundCount} options found • Prices in USD`}
      />

      <div className="space-y-4 px-4 py-4">
        {/* Price Range Summary */}
        <div className="rounded-lg bg-accent/5 border border-accent/20 p-4">
          <p className="text-xs font-medium uppercase text-accent mb-1">Price Range</p>
          <p className="text-2xl font-bold text-ink">
            ${result.priceRange.min} – ${result.priceRange.max}
          </p>
          <p className="text-xs text-ink-3 mt-1">Round-trip from New York area airports</p>
        </div>

        {/* Flight Options Grid */}
        <div className="grid gap-3">
          {renderFlightOption(result.cheapest, 'Cheapest', '💰')}
          {renderFlightOption(result.nonstop, 'Nonstop', '✈️')}
          {renderFlightOption(result.fastest, 'Fastest', '⚡')}
        </div>

        {/* No flights message */}
        {!result.cheapest && !result.nonstop && !result.fastest && (
          <div className="rounded-lg bg-warning/5 border border-warning/20 p-4 text-center">
            <p className="text-sm text-ink-3">
              No flight data available for selected dates. Try different dates or check Kiwi.com directly.
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="border-t border-line pt-4">
          <Link
            href={`https://www.kiwi.com/en/search/results/${destination}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
          >
            Search all flights on Kiwi.com →
          </Link>
        </div>
      </div>
    </Card>
  );
}
