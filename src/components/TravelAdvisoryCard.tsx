'use client';

import Link from 'next/link';
import { Card, CardHeader } from '@/components/ui';
import type { CityTravelAdvisory } from '@/lib/integrations/travel-warnings';
import { getAdvisoryLabel } from '@/lib/integrations/travel-warnings';

interface TravelAdvisoryCardProps {
  advisory: CityTravelAdvisory;
}

/**
 * Display US State Department travel advisory for a destination
 */
export function TravelAdvisoryCard({ advisory }: TravelAdvisoryCardProps) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'level1':
        return 'bg-good/10 border-good/30 text-good';
      case 'level2':
        return 'bg-warning/10 border-warning/30 text-warning';
      case 'level3':
        return 'bg-serious/10 border-serious/30 text-serious';
      case 'level4':
        return 'bg-critical/10 border-critical/30 text-critical';
      default:
        return 'bg-surface-2 border-line text-ink';
    }
  };

  return (
    <Card>
      <CardHeader
        title="Travel Advisory"
        note={`Updated: ${new Date(advisory.lastUpdated).toLocaleDateString()}`}
      />

      <div className="space-y-4 px-4 py-4">
        {/* Advisory Level */}
        <div className={`rounded-lg border-2 p-4 ${getLevelColor(advisory.advisoryLevel)}`}>
          <div className="font-semibold">
            {advisory.advisoryLevel === 'level1' && '✓'}
            {advisory.advisoryLevel === 'level2' && '⚠'}
            {advisory.advisoryLevel === 'level3' && '⚠⚠'}
            {advisory.advisoryLevel === 'level4' && '✗'}
            {' '}
            {getAdvisoryLabel(advisory.advisoryLevel)}
          </div>
          <p className="text-sm mt-1 opacity-90">{advisory.advisoryTitle}</p>
        </div>

        {/* Specific Warnings */}
        {advisory.warnings.length > 0 && (
          <div className="space-y-3 border-t border-line pt-4">
            <p className="text-xs font-medium uppercase text-ink-2">Active Warnings</p>
            {advisory.warnings.map((warning, idx) => (
              <div key={idx} className="rounded bg-surface-2 p-3">
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 text-lg ${
                      warning.category === 'safety'
                        ? 'text-critical'
                        : warning.category === 'health'
                          ? 'text-warning'
                          : warning.category === 'political'
                            ? 'text-serious'
                            : warning.category === 'crime'
                              ? 'text-serious'
                              : 'text-warning'
                    }`}
                  >
                    {warning.category === 'safety' && '🚨'}
                    {warning.category === 'health' && '⚕️'}
                    {warning.category === 'political' && '🏛️'}
                    {warning.category === 'crime' && '🚔'}
                    {warning.category === 'natural-disaster' && '🌋'}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-ink-2 uppercase">{warning.category}</p>
                    <p className="text-sm font-semibold text-ink mt-0.5">{warning.title}</p>
                    <p className="text-xs text-ink-3 mt-1">{warning.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Active Warnings */}
        {advisory.warnings.length === 0 && advisory.advisoryLevel === 'level1' && (
          <div className="rounded bg-good/10 border border-good/20 p-3">
            <p className="text-sm text-good">
              ✓ No specific warnings. Standard travel safety precautions recommended.
            </p>
          </div>
        )}

        {/* Source Link */}
        <div className="border-t border-line pt-4">
          <Link
            href={advisory.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
          >
            View full advisory on travel.state.gov →
          </Link>
          <p className="text-xs text-ink-3 mt-2">
            Source: US State Department Travel Advisory for {advisory.country}
          </p>
        </div>
      </div>
    </Card>
  );
}
