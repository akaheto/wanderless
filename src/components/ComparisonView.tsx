import Link from "next/link";
import type { ComparisonResult } from "@/lib/scoring/engine";
import type { DestinationScore } from "@/lib/domain/types";
import { CATEGORY_KEYS, CATEGORY_LABELS } from "@/lib/domain/types";
import { SuitabilityStrip } from "./charts";
import {
  Badge,
  Card,
  CardHeader,
  ConfidenceBadge,
  ScoreBar,
  SeasonBadge,
  TierMark,
  Warnings,
  money,
  scoreColor,
} from "./ui";
import { formatDateRange } from "@/lib/dates";

/**
 * The side-by-side comparison.
 *
 * Structure follows the question being asked: the headline answer first, then the table
 * that lets you disagree with it, then the full working for each option. Nothing is
 * hidden behind a tooltip that you would need to know to look for.
 */
export function ComparisonView({
  result,
  candidateActions,
}: {
  result: ComparisonResult;
  /** Optional per-destination controls, e.g. shortlist buttons when inside a trip. */
  candidateActions?: (score: DestinationScore) => React.ReactNode;
}) {
  const { scores, startDate, endDate, nights } = result;

  if (scores.length === 0) {
    return (
      <Card className="px-5 py-8 text-center">
        <p className="text-[14px] font-medium">Nothing to compare yet</p>
        <p className="mt-1 text-[13px] text-ink-2">
          Pick at least one destination, or leave them all unticked to rank the whole catalog.
        </p>
      </Card>
    );
  }

  const winner = scores[0];
  const runnerUp = scores[1];
  const withinLimits = scores.filter((s) => !s.exceedsTravelLimit);
  const beyondLimits = scores.filter((s) => s.exceedsTravelLimit);

  return (
    <div className="space-y-6">
      {/* ---------- headline ---------- */}
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[12px] tracking-wide text-ink-3 uppercase">Top of the ranking</span>
            <span className="text-[12px] text-ink-3">
              {formatDateRange(startDate, endDate)} · {nights} nights
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-[22px] font-semibold tracking-tight">{winner.destination.name}</h2>
            <span
              className="tnum rounded-md px-2 py-0.5 text-[15px] font-semibold text-white"
              style={{ background: scoreColor(winner.overall) }}
            >
              {winner.overall}
            </span>
            <SeasonBadge season={winner.season} />
            <ConfidenceBadge confidence={winner.confidence} />
          </div>
          <p className="mt-2 max-w-[76ch] text-[14px] text-ink-2">{winner.verdict}</p>
          {runnerUp && (
            <p className="mt-2 text-[13px] text-ink-3">
              {runnerUp.destination.name} is {winner.overall - runnerUp.overall === 0
                ? "level with it"
                : `${winner.overall - runnerUp.overall} behind`}{" "}
              at {runnerUp.overall}.
            </p>
          )}
        </div>

        <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-surface-1 p-4">
            <StatTileInline
              label="Typical days"
              value={`${winner.climate.avgHighF}° / ${winner.climate.avgLowF}°F`}
              sub={`${Math.round(winner.climate.avgHumidityPct)}% humidity`}
            />
          </div>
          <div className="bg-surface-1 p-4">
            <StatTileInline
              label="Wet days expected"
              value={`${winner.climate.expectedRainDays} of ${winner.climate.days}`}
              sub={`${winner.climate.totalPrecipIn}in of rain`}
            />
          </div>
          <div className="bg-surface-1 p-4">
            <StatTileInline
              label="Getting there"
              value={
                winner.route.route.nonstop
                  ? `${winner.route.route.typicalTotalHours}h nonstop`
                  : `~${winner.route.route.typicalTotalHours}h`
              }
              sub={
                winner.route.route.nonstop
                  ? `from ${winner.route.route.origin}${winner.route.route.seasonal ? ", seasonal" : ""}`
                  : `from ${winner.route.route.origin}, ${winner.route.route.typicalConnections} connection${winner.route.route.typicalConnections === 1 ? "" : "s"}`
              }
            />
          </div>
          <div className="bg-surface-1 p-4">
            <StatTileInline
              label="Hotels, whole trip"
              value={money(winner.estimatedLodgingUSD)}
              sub={`${money(winner.estimatedNightlyUSD)} a night`}
            />
          </div>
        </div>
      </Card>

      {/* ---------- side by side ---------- */}
      <Card>
        <CardHeader
          title="Side by side"
          note="Every score is a weighted average of the factors shown lower down. Higher is better."
        />
        <div className="scroll-x">
          <table className="w-full min-w-[860px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="px-4 py-2.5 font-medium text-ink-3">
                  Destination
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium text-ink-3">
                  Overall
                </th>
                {CATEGORY_KEYS.map((key) => (
                  <th key={key} scope="col" className="px-3 py-2.5 font-medium text-ink-3">
                    {CATEGORY_LABELS[key]}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2.5 text-right font-medium text-ink-3">
                  Hotels
                </th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, index) => (
                <tr
                  key={s.destination.id}
                  className={`border-b border-line last:border-0 ${
                    s.exceedsTravelLimit ? "opacity-70" : ""
                  }`}
                >
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <Link
                      href={`/destinations/${s.destination.id}`}
                      className="font-medium hover:text-accent"
                    >
                      {s.destination.name}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-3">
                      <span>{s.destination.area}</span>
                      {s.exceedsTravelLimit && <Badge tone="warning">over travel limit</Badge>}
                    </div>
                  </th>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="tnum w-6 text-[14px] font-semibold" style={{ color: scoreColor(s.overall) }}>
                        {s.overall}
                      </span>
                      <ScoreBar score={s.overall} label={`${s.destination.name} overall`} width={54} showValue={false} />
                      {index === 0 && !s.exceedsTravelLimit && <Badge tone="accent">top</Badge>}
                    </div>
                    {s.seasonalGate < 1 && (
                      <div className="mt-0.5 text-[11px] text-ink-3">
                        ×{s.seasonalGate} seasonal gate (was {s.rawOverall})
                      </div>
                    )}
                  </td>
                  {CATEGORY_KEYS.map((key) => (
                    <td key={key} className="px-3 py-3">
                      <ScoreBar
                        score={s.categories[key].score}
                        label={`${s.destination.name} ${CATEGORY_LABELS[key]}`}
                        width={44}
                      />
                    </td>
                  ))}
                  <td className="tnum px-3 py-3 text-right">
                    <div className="font-medium">{money(s.estimatedLodgingUSD)}</div>
                    <div className="text-[11.5px] text-ink-3">{money(s.estimatedNightlyUSD)}/night</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {beyondLimits.length > 0 && withinLimits.length > 0 && (
          <p className="border-t border-line px-4 py-2.5 text-[12px] text-ink-3">
            {beyondLimits.length === 1
              ? `1 destination exceeds your ${result.preferences.maxTravelHours}h travel limit and is ranked below everything that fits, whatever it scores.`
              : `${beyondLimits.length} destinations exceed your ${result.preferences.maxTravelHours}h travel limit and are ranked below everything that fits, whatever they score.`}
          </p>
        )}
      </Card>

      {/* ---------- per destination ---------- */}
      <div className="space-y-4">
        <h2 className="text-[15px] font-semibold tracking-tight">The working</h2>
        {scores.map((s) => (
          <DestinationDetail key={s.destination.id} score={s} actions={candidateActions?.(s)} />
        ))}
      </div>
    </div>
  );
}

function StatTileInline({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="text-[11.5px] tracking-wide text-ink-3 uppercase">{label}</div>
      <div className="tnum mt-1 text-[18px] font-semibold tracking-tight">{value}</div>
      <div className="mt-0.5 text-[12px] text-ink-3">{sub}</div>
    </div>
  );
}

function DestinationDetail({ score: s, actions }: { score: DestinationScore; actions?: React.ReactNode }) {
  return (
    <Card as="article">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold tracking-tight">
              <Link href={`/destinations/${s.destination.id}`} className="hover:text-accent">
                {s.destination.name}
              </Link>
            </h3>
            <span
              className="tnum rounded px-1.5 py-0.5 text-[12px] font-semibold text-white"
              style={{ background: scoreColor(s.overall) }}
            >
              {s.overall}
            </span>
            <SeasonBadge season={s.season} />
            <ConfidenceBadge confidence={s.confidence} />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {s.bestFor.map((label) => (
              <Badge key={label} tone="accent">
                {label}
              </Badge>
            ))}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-1.5">{actions}</div>}
      </div>

      <div className="grid gap-5 px-4 py-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-4">
          <p className="text-[13.5px] text-ink-2">{s.verdict}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-1.5 text-[12px] tracking-wide text-ink-3 uppercase">In its favour</h4>
              <ul className="space-y-1">
                {s.pros.length === 0 && <li className="text-[13px] text-ink-3">Nothing stands out.</li>}
                {s.pros.map((p) => (
                  <li key={p} className="flex gap-1.5 text-[13px]">
                    <span aria-hidden style={{ color: "var(--good)" }}>
                      +
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-1.5 text-[12px] tracking-wide text-ink-3 uppercase">Against it</h4>
              <ul className="space-y-1">
                {s.cons.length === 0 && <li className="text-[13px] text-ink-3">Nothing significant.</li>}
                {s.cons.map((c) => (
                  <li key={c} className="flex gap-1.5 text-[13px]">
                    <span aria-hidden style={{ color: "var(--serious)" }}>
                      −
                    </span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <h4 className="mb-1.5 text-[12px] tracking-wide text-ink-3 uppercase">
              Month by month, out of 5
            </h4>
            <SuitabilityStrip
              destination={s.destination}
              highlightMonths={monthsOf(s.climate.startDate, s.climate.endDate)}
              compact
            />
          </div>
        </div>

        <div className="space-y-3">
          <details className="group">
            <summary className="cursor-pointer list-none text-[12px] tracking-wide text-ink-3 uppercase hover:text-accent">
              How the score is built
              <span className="ml-1 inline-block transition-transform group-open:rotate-90">›</span>
            </summary>
            <div className="mt-2 space-y-3">
              {CATEGORY_KEYS.map((key) => {
                const cat = s.categories[key];
                return (
                  <div key={key}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="text-[12.5px] font-medium">{CATEGORY_LABELS[key]}</span>
                      <ScoreBar score={cat.score} label={CATEGORY_LABELS[key]} width={56} />
                    </div>
                    <ul className="space-y-0.5 border-l border-line pl-2.5">
                      {cat.factors.map((f) => (
                        <li key={f.label} className="flex flex-wrap items-baseline gap-x-2 text-[12px]">
                          <span className="text-ink-2">{f.label}</span>
                          <TierMark tier={f.tier} />
                          <span className="text-ink-3">{f.value}</span>
                          <span className="tnum ml-auto text-ink-3">
                            {f.score} × {Math.round(f.weight * 100)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </details>

          <div className="rounded-md bg-sunken px-3 py-2.5">
            <h4 className="mb-1.5 text-[12px] tracking-wide text-ink-3 uppercase">
              What this rests on
            </h4>
            <Warnings warnings={s.warnings} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function monthsOf(start: string, end: string): number[] {
  const months = new Set<number>();
  const startMonth = Number(start.slice(5, 7));
  const endMonth = Number(end.slice(5, 7));
  months.add(startMonth);
  months.add(endMonth);
  return [...months];
}
