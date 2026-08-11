import Link from "next/link";
import { destinationsByRegion } from "@/data/destinations";
import { SuitabilityStrip } from "@/components/charts";
import { Badge, Card, PageHeader } from "@/components/ui";
import { monthClimate } from "@/lib/climate";
import { MONTH_ABBR } from "@/lib/dates";

export const metadata = { title: "Destination catalog · Travel Intelligence Hub" };

export default function DestinationsPage() {
  const regions = destinationsByRegion();

  return (
    <>
      <PageHeader
        title="Destination catalog"
        lede="The set of places the comparison engine will ever recommend. Keeping it curated is what stops a ranking from surfacing somewhere technically warm but not worth the flight."
      />

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

                return (
                  <Card key={d.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-semibold tracking-tight">
                          <Link href={`/destinations/${d.id}`} className="hover:text-accent">
                            {d.name}
                          </Link>
                        </h3>
                        <p className="text-[12.5px] text-ink-3">
                          {d.area} · {d.country}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <Badge>{d.archetype}</Badge>
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
