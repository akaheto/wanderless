import { DESTINATIONS } from "@/data/destinations";
import { CLIMATE_RECORDS } from "@/data/generated/climate-index";
import { checkStaleness, filterStale } from "@/lib/curation/staleness";
import { generateDraft, filterChangedMonths } from "@/lib/curation/draft";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/dates";

export default function CurationPage() {
  // Map destinations to staleness info
  const stalenessInfo = DESTINATIONS.map((dest) =>
    checkStaleness(dest.id, dest.name, dest.curatedOn),
  );

  const staleDestinations = filterStale(stalenessInfo);

  return (
    <>
      <PageHeader
        title="Curation Review"
        lede="Flag outdated destination data and review climate-based rating updates"
        breadcrumb={{ href: "/", label: "Home" }}
      />

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Overview card */}
        <Card>
          <CardHeader
            title="Curation Status"
            note={`${staleDestinations.length} of ${DESTINATIONS.length} destinations need review`}
          />
          <div className="px-4 py-3 text-[13px] text-ink-3">
            <p>
              This curation dashboard flags destinations where climate data suggests suitability ratings
              may need updating. Review each redline and accept/reject changes manually. Nothing is
              auto-applied.
            </p>
          </div>
        </Card>

        {/* Stale destinations list */}
        {staleDestinations.length > 0 ? (
          <Card>
            <CardHeader title="Stale Destinations" note={`${staleDestinations.length} needing review`} />

            <div className="divide-y divide-line">
              {staleDestinations.map((staleness) => {
                const destination = DESTINATIONS.find((d) => d.id === staleness.destinationId);
                if (!destination) return null;

                const climateRecord = CLIMATE_RECORDS[destination.id];
                if (!climateRecord) return null;

                const drafts = generateDraft(destination, climateRecord.monthly);
                const changedMonths = filterChangedMonths(drafts);

                return (
                  <div key={destination.id} className="px-4 py-4">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-[14px] font-medium text-ink-1">{destination.name}</h3>
                        <div className="mt-1 text-[12px] text-ink-3">
                          Last curated: {staleness.curatedOn ? formatDate(staleness.curatedOn) : "never"} (
                          {staleness.daysSinceCuration} days ago)
                        </div>
                      </div>
                      <Badge tone="warning">{changedMonths.length} months changed</Badge>
                    </div>

                    {changedMonths.length > 0 && (
                      <div className="mt-3 space-y-2 rounded-sm bg-surface-1 p-3">
                        {changedMonths.map((draft) => (
                          <div key={draft.month} className="text-[12px]">
                            <div className="font-medium text-ink-2">
                              {draft.monthName}
                            </div>
                            <div className="mt-1 grid gap-1">
                              <div className="text-ink-3">
                                <strong>Rating:</strong> {draft.currentRating} → {draft.suggestedRating}
                              </div>
                              <div className="text-ink-3">
                                <strong>Current:</strong> {draft.currentNote}
                              </div>
                              <div className="text-ink-3">
                                <strong>Suggested:</strong> {draft.suggestedNote}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card>
            <div className="px-4 py-8 text-center text-[13px] text-ink-3">
              <p>All destinations are up-to-date. No curation needed.</p>
            </div>
          </Card>
        )}

        {/* Current destinations (up to date) */}
        {stalenessInfo.filter((s) => !s.isStale).length > 0 && (
          <Card>
            <CardHeader
              title="Up-to-Date"
              note={`${stalenessInfo.filter((s) => !s.isStale).length} destinations current`}
            />

            <div className="divide-y divide-line">
              {stalenessInfo
                .filter((s) => !s.isStale)
                .map((staleness) => (
                  <div key={staleness.destinationId} className="px-4 py-2 text-[12px]">
                    <div className="text-ink-2">{staleness.name}</div>
                    <div className="mt-0.5 text-ink-4">
                      Last curated {staleness.daysSinceCuration} days ago
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
