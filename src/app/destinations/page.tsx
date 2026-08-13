'use client';

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { destinationsByRegion } from "@/data/destinations";
import { SuitabilityStrip } from "@/components/charts";
import { Badge, Card, PageHeader } from "@/components/ui";
import { monthClimate } from "@/lib/climate";
import { MONTH_ABBR, isValidDate } from "@/lib/dates";
import { defaultDates } from "@/lib/scoring/params";
import { DateRangePicker } from "@/components/DateRangePicker";

export default function DestinationsPage() {
  const searchParams = useSearchParams();
  const queryStart = searchParams.get("start");
  const queryEnd = searchParams.get("end");

  const defaults = defaultDates();
  const [startDate, setStartDate] = useState(
    queryStart && isValidDate(queryStart) ? queryStart : defaults.startDate
  );
  const [endDate, setEndDate] = useState(
    queryEnd && isValidDate(queryEnd) ? queryEnd : defaults.endDate
  );

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const regions = destinationsByRegion();

  return (
    <>
      <PageHeader
        title="Destination catalog"
        lede="The set of places the comparison engine will ever recommend. Keeping it curated is what stops a ranking from surfacing somewhere technically warm but not worth the flight."
      />

      <div className="mb-8 rounded-lg border border-line bg-surface-1 p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink-2">Filter by travel dates</h2>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onRangeChange={handleDateChange}
        />
      </div>

      {/* Destination count display */}
      <div className="mb-6 text-sm text-ink-2">
        Showing <span className="font-semibold">{regions.reduce((sum, r) => sum + r.items.length, 0)}</span> destinations for <span className="font-semibold">{startDate}</span> to <span className="font-semibold">{endDate}</span>
      </div>

      <div className="space-y-8">
        {regions.map((group) => (
          <section key={group.region}>
            <h2 className="mb-3 text-[13px] tracking-wide text-ink-3 uppercase">{group.region}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {group.items.map((d) => {
                const best = d.suitability.reduce(
                  (acc, v, i) => (v > acc.value ? { value: v, month: i + 1 } : acc),
                  { value: -1, month: 1 },
                );
                const jan = monthClimate(d.id, 1);
                const jul = monthClimate(d.id, 7);

                // Determine season emoji based on best month
                const getSeasonEmoji = (month: number) => {
                  if ([12, 1, 2].includes(month)) return '❄️'; // Winter
                  if ([3, 4, 5].includes(month)) return '🌸'; // Spring
                  if ([6, 7, 8].includes(month)) return '☀️'; // Summer
                  return '🍂'; // Fall
                };

                return (
                  <Card key={d.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-semibold tracking-tight">
                          <Link
                            href={`/destinations/${d.id}?start=${startDate}&end=${endDate}`}
                            className="hover:text-accent"
                          >
                            {d.name}
                          </Link>
                        </h3>
                        <p className="text-[12.5px] text-ink-3">
                          {d.area} · {d.country}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <Badge>{d.archetype}</Badge>
                        <span title={`Best in ${MONTH_ABBR[best.month - 1]}`}>
                          <Badge>{getSeasonEmoji(best.month)}</Badge>
                        </span>
                        {d.travel.nonstop && <Badge tone="accent">nonstop</Badge>}
                      </div>
                    </div>

                    <p className="mt-2 text-[13px] text-ink-2">{d.summary}</p>

                    <dl className="tnum mt-3 grid grid-cols-3 gap-2 text-[12px]">
                      <div>
                        <dt className="text-ink-3">Best month</dt>
                        <dd className="font-medium">
                          {MONTH_ABBR[best.month - 1]} · {best.value}/5
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ink-3">Jan / Jul high</dt>
                        <dd className="font-medium">
                          {Math.round(jan.highF)}° / {Math.round(jul.highF)}°F
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ink-3">From JFK</dt>
                        <dd className="font-medium">~{d.travel.typicalTotalHours}h</dd>
                      </div>
                    </dl>

                    <div className="mt-3">
                      <SuitabilityStrip destination={d} compact />
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
