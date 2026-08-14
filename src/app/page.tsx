import Link from "next/link";
import { listTrips, listCandidates } from "@/lib/db/trips";
import { DESTINATIONS } from "@/data/destinations";
import { TripCard } from "@/components/TripCard";
import { ButtonLink, Card, CardHeader, Empty, PageHeader, StatTile } from "@/components/ui";
import { daysUntil } from "@/lib/dates";
import manifest from "@/data/generated/manifest.json";

// Reads the trips table, so it must never be prerendered — a statically generated
// dashboard would show whatever trips existed at build time, which is none.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const trips = await listTrips();
  const candidatesByTrip = new Map(
    await Promise.all(
      trips.map(async (t) => [t.id, await listCandidates(t.id)] as const),
    ),
  );

  const isPast = (t: (typeof trips)[number]) =>
    t.status === "completed" || (t.endDate !== null && daysUntil(t.endDate) < 0);

  const upcoming = trips.filter((t) => !isPast(t));
  const past = trips.filter(isPast);
  const nextTrip = upcoming.find((t) => t.startDate !== null);
  const decided = trips.filter((t) =>
    (candidatesByTrip.get(t.id) ?? []).some((c) => c.status === "selected"),
  ).length;

  return (
    <>
      <PageHeader
        title="Wanderless"
        lede="One place to decide where to go, compare destinations against real dates, and keep everything a trip needs in one structured record."
        actions={
          <>
            <ButtonLink href="/compare">Compare destinations</ButtonLink>
            <ButtonLink href="/trips/new" variant="primary">
              New trip
            </ButtonLink>
          </>
        }
      />

      <div className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Trips in progress" value={String(upcoming.length)} sub={`${past.length} completed`} />
        <StatTile
          label="Destination chosen"
          value={`${decided} of ${trips.length || 0}`}
          sub="trips with a decision made"
        />
        <StatTile
          label="Next departure"
          value={nextTrip?.startDate ? `${Math.max(0, daysUntil(nextTrip.startDate))} days` : "—"}
          sub={nextTrip?.name ?? "nothing booked yet"}
        />
        <StatTile
          label="Destinations rankable"
          value={String(DESTINATIONS.length)}
          sub={`climate normals ${manifest.climatePeriod}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold tracking-tight">Upcoming</h2>
              <Link href="/trips" className="text-[13px] text-ink-3 hover:text-accent">
                All trips →
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <Empty
                title="No trips yet"
                body="Start with a trip — even just a name and a rough month. You can compare destinations for it before anything is decided."
                action={
                  <ButtonLink href="/trips/new" variant="primary">
                    Create your first trip
                  </ButtonLink>
                }
              />
            ) : (
              <div className="space-y-2.5">
                {upcoming.map((t) => (
                  <TripCard key={t.id} trip={t} candidates={candidatesByTrip.get(t.id) ?? []} />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-[15px] font-semibold tracking-tight">Past</h2>
              <div className="space-y-2.5">
                {past.slice(0, 4).map((t) => (
                  <TripCard key={t.id} trip={t} candidates={candidatesByTrip.get(t.id) ?? []} />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Start here" />
            <div className="space-y-3 px-4 py-4 text-[13.5px]">
              <p className="text-ink-2">
                The comparison engine answers <strong className="font-medium text-ink">where should I go</strong>{" "}
                for a specific set of dates. It ranks a curated catalog of{" "}
                {DESTINATIONS.length} real destinations — never a list of whichever coordinates happen to be
                warmest, which is how you end up being told to spend January in a city with six hours of
                daylight.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <ButtonLink href="/compare">Rank everything</ButtonLink>
                <ButtonLink href="/destinations">Browse the catalog</ButtonLink>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Where the numbers come from" />
            <div className="space-y-2 px-4 py-4 text-[13px] text-ink-2">
              <p>
                Climate figures are measured — {manifest.climatePeriod} reanalysis normals, refreshed by a
                script, never typed by hand. Seasonal ratings and cost estimates are curated judgements with a
                review date. Your notes and weightings are yours and are never overwritten.
              </p>
              <Link href="/sources" className="inline-block pt-1 text-accent hover:underline">
                Full provenance →
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
