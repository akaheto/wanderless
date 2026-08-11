import { notFound } from "next/navigation";
import { DESTINATIONS, getDestination } from "@/data/destinations";
import { getPreferences, getTrip, listCandidates } from "@/lib/db/trips";
import { compareDestinations } from "@/lib/scoring/engine";
import { parseComparisonQuery, type SearchParams } from "@/lib/scoring/params";
import { ComparisonView } from "@/components/ComparisonView";
import { PreferenceForm } from "@/components/PreferenceForm";
import { Button, Card, CardHeader, PageHeader } from "@/components/ui";
import { setCandidateStatusAction } from "@/app/actions";
import type { CandidateStatus } from "@/lib/domain/types";

export default async function TripComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const id = Number((await params).id);
  const trip = Number.isFinite(id) ? await getTrip(id) : null;
  if (!trip) notFound();

  const [candidates, saved] = await Promise.all([listCandidates(trip.id), getPreferences(trip.id)]);
  const sp = await searchParams;

  // Trip dates and airport win over anything in the URL — comparing a trip against dates
  // it does not have would produce a ranking that means nothing for this trip.
  const query = parseComparisonQuery(
    {
      ...sp,
      ...(trip.startDate ? { start: trip.startDate } : {}),
      ...(trip.endDate ? { end: trip.endDate } : {}),
      from: trip.origins.join(","),
    },
    saved,
  );

  const activeIds = candidates.filter((c) => c.status !== "rejected").map((c) => c.destinationId);
  const selectedIds = query.destinationIds.length ? query.destinationIds : activeIds;
  const chosen = selectedIds.length
    ? selectedIds.map(getDestination).filter((d) => d !== undefined)
    : DESTINATIONS;

  const result = compareDestinations(chosen, query.preferences, query.startDate, query.endDate);
  const statusById = new Map(candidates.map((c) => [c.destinationId, c.status]));

  const hasDates = Boolean(trip.startDate && trip.endDate);

  return (
    <>
      <PageHeader
        title={`Compare for ${trip.name}`}
        lede={
          hasDates
            ? "Scored against this trip's exact dates. Shortlist or choose straight from the results."
            : "This trip has no dates yet, so the comparison is running against a placeholder window. Add dates for a result you can act on."
        }
        breadcrumb={{ href: `/trips/${trip.id}`, label: trip.name }}
      />

      {!hasDates && (
        <div className="mb-5 rounded-md border px-4 py-2.5 text-[13px]" style={{ borderColor: "var(--warning)" }}>
          No travel dates set on this trip — everything below is scored against a default window and should
          not be used to decide anything.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[19rem_1fr] lg:items-start">
        <Card className="lg:sticky lg:top-6">
          <CardHeader title="Your brief" note="Dates come from the trip itself." />
          <div className="px-4 py-4">
            <PreferenceForm
              action={`/trips/${trip.id}/compare`}
              startDate={query.startDate}
              endDate={query.endDate}
              preferences={query.preferences}
              selectedIds={selectedIds}
            />
          </div>
        </Card>

        <div className="min-w-0">
          <ComparisonView
            result={result}
            candidateActions={(score) => {
              const status = statusById.get(score.destination.id);
              return (
                <>
                  {(["shortlisted", "selected", "rejected"] as CandidateStatus[])
                    .filter((s) => s !== status)
                    .map((s) => (
                      <form key={s} action={setCandidateStatusAction}>
                        <input type="hidden" name="tripId" value={trip.id} />
                        <input type="hidden" name="destinationId" value={score.destination.id} />
                        <input type="hidden" name="status" value={s} />
                        <Button
                          type="submit"
                          variant={s === "selected" ? "primary" : "secondary"}
                          className="px-2 py-1 text-[12px]"
                        >
                          {s === "shortlisted" ? "Shortlist" : s === "selected" ? "Choose this" : "Reject"}
                        </Button>
                      </form>
                    ))}
                  {status && (
                    <span className="self-center text-[11.5px] text-ink-3">currently {status}</span>
                  )}
                </>
              );
            }}
          />
        </div>
      </div>
    </>
  );
}
