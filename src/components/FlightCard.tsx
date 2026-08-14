'use client';

import Link from 'next/link';
import { Card, CardHeader } from '@/components/ui';
import type { FlightEstimate } from '@/lib/integrations/flight-links';
import { generateFlightLinks } from '@/lib/integrations/flight-links';

interface FlightCardProps {
  estimate: FlightEstimate;
  destination: string;
  iataCode: string;
  departDate?: string;
  returnDate?: string;
}

/**
 * Display flight pricing estimates and search links
 * No API key needed—direct links to booking sites
 */
export function FlightCard({
  estimate,
  destination,
  iataCode,
  departDate,
  returnDate,
}: FlightCardProps) {
  const links = generateFlightLinks(destination, iataCode, departDate, returnDate);

  return (
    <Card>
      <CardHeader
        title="Flights from NYC"
        note={`Estimated prices • Round-trip USD`}
      />

      <div className="space-y-4 px-4 py-4">
        {/* Nonstop Indicator */}
        {estimate.nonstop && (
          <div className="rounded-lg bg-good/10 border border-good/20 p-2">
            <p className="text-xs font-medium text-good">✓ Nonstop flights available</p>
          </div>
        )}

        {/* Price Estimates Grid */}
        <div className="grid grid-cols-3 gap-3">
          <Link href={links.kiwi} target="_blank" rel="noopener noreferrer">
            <div className="rounded-lg border border-line bg-surface-2 p-3 hover:border-accent hover:shadow-md transition-all cursor-pointer text-center">
              <p className="text-xs text-ink-3 mb-1">💰 Budget</p>
              <p className="text-2xl font-bold text-ink">${estimate.cheapest}</p>
              <p className="text-xs text-ink-3 mt-1">typical low</p>
            </div>
          </Link>

          <Link href={links.skyscanner} target="_blank" rel="noopener noreferrer">
            <div className="rounded-lg border border-line bg-surface-2 p-3 hover:border-accent hover:shadow-md transition-all cursor-pointer text-center">
              <p className="text-xs text-ink-3 mb-1">🎯 Mid-range</p>
              <p className="text-2xl font-bold text-ink">${estimate.midrange}</p>
              <p className="text-xs text-ink-3 mt-1">avg price</p>
            </div>
          </Link>

          <Link href={links.booking} target="_blank" rel="noopener noreferrer">
            <div className="rounded-lg border border-line bg-surface-2 p-3 hover:border-accent hover:shadow-md transition-all cursor-pointer text-center">
              <p className="text-xs text-ink-3 mb-1">✈️ Premium</p>
              <p className="text-2xl font-bold text-ink">${estimate.premium}</p>
              <p className="text-xs text-ink-3 mt-1">peak season</p>
            </div>
          </Link>
        </div>

        {/* Flight Details */}
        <div className="border-t border-line pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-ink-3">Typical flight time</span>
            <span className="font-semibold text-ink">{estimate.avgHours}h</span>
          </div>
          <p className="text-xs text-ink-3">
            💡 Click any price box to search current flights on Kiwi.com, Booking.com, or Skyscanner
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="border-t border-line pt-4 space-y-2">
          <Link
            href={links.kiwi}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs font-medium text-accent hover:underline py-2 bg-accent/10 rounded"
          >
            Search on Kiwi.com →
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={links.booking}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-xs font-medium text-accent hover:underline py-1.5 border border-accent/30 rounded"
            >
              Booking.com
            </Link>
            <Link
              href={links.skyscanner}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-xs font-medium text-accent hover:underline py-1.5 border border-accent/30 rounded"
            >
              Skyscanner
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
