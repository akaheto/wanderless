import Link from "next/link";
import { Card, CardHeader, DataAge } from "@/components/ui";
import type { AdvisoryResult, TravelWarningLevel } from "@/lib/integrations/travel-warnings";
import { getAdvisoryLabel } from "@/lib/integrations/travel-warnings";

/**
 * Advisories are safety data, so a failed lookup is rendered rather than dropped.
 * A card that simply disappears reads as "nothing to worry about here", which is the
 * one thing an unknown risk must never look like.
 */
const STALE_AFTER_DAYS = 30;

const LEVEL_STYLE: Record<TravelWarningLevel, string> = {
  level1: "bg-good/10 border-good/40",
  level2: "bg-warning/10 border-warning/40",
  level3: "bg-serious/10 border-serious/40",
  level4: "bg-critical/10 border-critical/40",
};

/** Paired with the text label — the level is never carried by colour alone. */
const LEVEL_MARK: Record<TravelWarningLevel, string> = {
  level1: "✓",
  level2: "!",
  level3: "!!",
  level4: "✕",
};

export function TravelAdvisoryCard({ result }: { result: AdvisoryResult }) {
  if (result.status === "unavailable") {
    return (
      <Card>
        <CardHeader title="Travel advisory" />
        <div className="px-4 py-4">
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
            <p className="text-sm font-medium text-ink">Advisory unavailable</p>
            <p className="mt-1 text-[13px] text-ink-2">{result.reason}</p>
            <p className="mt-2 text-[12.5px] text-ink-3">
              This is not an all-clear — it means the current advisory could not be
              read. Check travel.state.gov directly before relying on this page.
            </p>
          </div>
          <div className="mt-4 border-t border-line pt-3">
            <Link
              href="https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-accent hover:underline"
            >
              Open travel.state.gov advisories →
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  const { advisory } = result;

  return (
    <Card>
      <CardHeader
        title="Travel advisory"
        right={
          <DataAge
            source={advisory.sourceName}
            sourceDate={advisory.sourceRevisedOn}
            asOf={result.asOf}
            staleAfterDays={STALE_AFTER_DAYS}
          />
        }
      />

      <div className="space-y-4 px-4 py-4">
        <div className={`rounded-lg border-2 p-4 ${LEVEL_STYLE[advisory.advisoryLevel]}`}>
          <p className="font-semibold text-ink">
            <span aria-hidden className="mr-1.5">
              {LEVEL_MARK[advisory.advisoryLevel]}
            </span>
            Level {advisory.advisoryLevel.replace("level", "")} —{" "}
            {getAdvisoryLabel(advisory.advisoryLevel)}
          </p>
          <p className="mt-1 text-sm text-ink-2">{advisory.advisoryTitle}</p>
        </div>

        {advisory.summary && (
          <p className="text-[13px] leading-relaxed text-ink-2">{advisory.summary}</p>
        )}

        <div className="border-t border-line pt-4">
          <Link
            href={advisory.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            View full advisory on travel.state.gov →
          </Link>
          <p className="mt-2 text-xs text-ink-3">
            {advisory.sourceName} advisory for {advisory.country}. The date above is when
            it was last revised, not when this page loaded it.
          </p>
        </div>
      </div>
    </Card>
  );
}
