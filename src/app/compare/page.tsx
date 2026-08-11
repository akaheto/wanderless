import { DESTINATIONS, getDestination } from "@/data/destinations";
import { compareDestinations } from "@/lib/scoring/engine";
import { parseComparisonQuery, type SearchParams } from "@/lib/scoring/params";
import { ComparisonView } from "@/components/ComparisonView";
import { PreferenceForm } from "@/components/PreferenceForm";
import { Card, CardHeader, PageHeader } from "@/components/ui";

export const metadata = { title: "Compare destinations · Travel Intelligence Hub" };

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = parseComparisonQuery(params);

  // An empty selection means "rank everything" rather than "show nothing" — the whole
  // point of the page is to answer "where should I go?" before you have a shortlist.
  const chosen = query.destinationIds.length
    ? query.destinationIds.map(getDestination).filter((d) => d !== undefined)
    : DESTINATIONS;

  const result = compareDestinations(chosen, query.preferences, query.startDate, query.endDate);

  return (
    <>
      <PageHeader
        title="Compare destinations"
        lede="Score any set of destinations against your exact dates and what you actually want from the trip. Everything is recomputed from the dates, so a place that is superb in March and unusable in November scores that way."
      />

      <div className="grid gap-6 lg:grid-cols-[19rem_1fr] lg:items-start">
        <Card className="lg:sticky lg:top-6">
          <CardHeader title="Your brief" note="Saved in the URL — bookmark it to come back to this exact comparison." />
          <div className="px-4 py-4">
            <PreferenceForm
              action="/compare"
              startDate={query.startDate}
              endDate={query.endDate}
              preferences={query.preferences}
              selectedIds={query.destinationIds}
            />
          </div>
        </Card>

        <div className="min-w-0">
          <ComparisonView result={result} />
        </div>
      </div>
    </>
  );
}
