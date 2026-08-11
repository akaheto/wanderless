"use client";

import type { FlightItinerary } from "@/lib/flights";
import type { OriginRoute } from "@/lib/domain/types";
import { itineraryHours } from "@/lib/flights";
import { Badge, Card, CardHeader } from "./ui";

export interface SearchComparisonPanelProps {
  itinerary: FlightItinerary;
  estimate: OriginRoute;
}

export function SearchComparisonPanel({ itinerary, estimate }: SearchComparisonPanelProps) {
  const searchedHours = itineraryHours(itinerary);
  const hoursDelta = Math.round((searchedHours - estimate.typicalTotalHours) * 2) / 2;
  const stopsDelta = itinerary.stops - estimate.typicalConnections;
  const contradictsEstimate =
    Math.abs(hoursDelta) >= 3 || (itinerary.stops === 0) !== estimate.nonstop;

  return (
    <Card>
      <CardHeader
        title="Searched vs curated"
        note="The estimate ranked this destination. The search is what you can book."
      />

      <div className="grid gap-px bg-line sm:grid-cols-2">
        <div className="bg-surface-1 px-4 py-3">
          <div className="text-[11.5px] tracking-wide text-ink-3 uppercase">Searched itinerary</div>
          <div className="tnum mt-1 text-[18px] font-semibold tracking-tight">
            {searchedHours}h {itinerary.stops === 0 ? "(nonstop)" : `(${itinerary.stops} stop${itinerary.stops === 1 ? "" : "s"})`}
          </div>
          {itinerary.priceMinorUnits && itinerary.currency && (
            <div className="mt-0.5 text-[12px] text-ink-3">
              {(itinerary.priceMinorUnits / 100).toFixed(2)} {itinerary.currency}
            </div>
          )}
        </div>

        <div className="bg-surface-1 px-4 py-3">
          <div className="text-[11.5px] tracking-wide text-ink-3 uppercase">Curated estimate</div>
          <div className="tnum mt-1 text-[18px] font-semibold tracking-tight">
            {estimate.typicalTotalHours}h
            {estimate.nonstop ? " (nonstop)" : ` (${estimate.typicalConnections} stop${estimate.typicalConnections === 1 ? "" : "s"})`}
          </div>
          <div className="mt-0.5 text-[12px] text-ink-3">Ranking estimate</div>
        </div>
      </div>

      <div className="border-t border-line px-4 py-3 text-[13px] text-ink-2">
        {contradictsEstimate ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge tone="serious">Material difference</Badge>
            </div>
            <p>
              The search is {Math.abs(hoursDelta)}h {hoursDelta > 0 ? " longer" : " shorter"} than the estimate. This is a
              signal the curated route table may be out of date. The ranking still used the estimate — searched figures
              never retro-score.
            </p>
          </div>
        ) : (
          <p>✓ The search aligns with the estimate. The ranking stands.</p>
        )}
      </div>
    </Card>
  );
}
