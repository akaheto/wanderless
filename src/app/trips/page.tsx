import { listCandidates, listTrips } from "@/lib/db/trips";
import { getCurrentUser } from "@/lib/auth";
import { TripCard } from "@/components/TripCard";
import { ButtonLink, Empty, PageHeader } from "@/components/ui";
import { daysUntil } from "@/lib/dates";

export const metadata = { title: "Trips · Wanderless" };

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const user = await getCurrentUser();
  const showArchived = (await searchParams).archived === "1";
  const allTrips = await listTrips(showArchived);
  
  // Filter trips to only show user's own trips (owner_id matches user.id) or trips owned by system user (for backwards compat)
  const trips = allTrips.filter(t => !user || t.ownerId === "0" || t.ownerId === user.id);
  const candidatesByTrip = new Map(
    await Promise.all(trips.map(async (t) => [t.id, await listCandidates(t.id)] as const)),
  );

  const isPast = (t: (typeof trips)[number]) =>
    t.status === "completed" || (t.endDate !== null && daysUntil(t.endDate) < 0);
  const upcoming = trips.filter((t) => !isPast(t));
  const past = trips.filter(isPast);

  return (
    <>
      <PageHeader
        title="Trips"
        lede="Every trip, from a one-line idea to a fully booked itinerary."
        actions={
          <>
            <ButtonLink href={showArchived ? "/trips" : "/trips?archived=1"} variant="ghost">
              {showArchived ? "Hide archived" : "Show archived"}
            </ButtonLink>
            <ButtonLink href="/trips/new" variant="primary">
              New trip
            </ButtonLink>
          </>
        }
      />

      {trips.length === 0 ? (
        <Empty
          title="No trips yet"
          body="A trip can start as nothing more than a name and a month. Everything else — dates, destinations, comparisons — attaches to it later."
          action={
            <ButtonLink href="/trips/new" variant="primary">
              Create a trip
            </ButtonLink>
          }
        />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-[13px] tracking-wide text-ink-3 uppercase">
              Upcoming and in planning
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-[13.5px] text-ink-3">Nothing upcoming.</p>
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
              <h2 className="mb-3 text-[13px] tracking-wide text-ink-3 uppercase">Past</h2>
              <div className="space-y-2.5">
                {past.map((t) => (
                  <TripCard key={t.id} trip={t} candidates={candidatesByTrip.get(t.id) ?? []} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
