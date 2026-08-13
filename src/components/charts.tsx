import type { ClimateMonth, Destination } from "@/lib/domain/types";
import { MONTH_ABBR, MONTH_NAMES, datesInRange, leapDayIndexOf, formatDate } from "@/lib/dates";
import { climateFor } from "@/lib/climate";

/*
 * Hand-rolled SVG. No charting library: these are small, fixed forms that render on the
 * server, need no hydration, and stay legible in both themes because every colour comes
 * from a token. Hover detail rides on native <title>, so it survives with JS disabled.
 *
 * Deliberately NOT a climograph. Temperature and rainfall are different measures on
 * different scales — putting them on one pair of axes needs two y-scales, which makes
 * the relationship between the two curves an artefact of the scaling. They get separate
 * panels sharing an x-axis instead.
 */

const PLOT = { w: 720, padL: 34, padR: 12 };

function xFor(i: number, count: number): number {
  const inner = PLOT.w - PLOT.padL - PLOT.padR;
  return PLOT.padL + (inner * (i + 0.5)) / count;
}

function bandFor(i: number, count: number): { x: number; w: number } {
  const inner = PLOT.w - PLOT.padL - PLOT.padR;
  const w = inner / count;
  return { x: PLOT.padL + w * i, w };
}

const fmt = (n: number, dp = 0) => n.toFixed(dp);

// ---------------------------------------------------------------------------
// Monthly temperature and rainfall
// ---------------------------------------------------------------------------

export function MonthlyClimateChart({
  monthly,
  highlightMonths = [],
}: {
  monthly: ClimateMonth[];
  highlightMonths?: number[];
}) {
  const H = 148;
  const top = 12;
  const bottom = H - 22;

  const highs = monthly.map((m) => m.highF);
  const lows = monthly.map((m) => m.lowF);
  const min = Math.floor((Math.min(...lows) - 6) / 10) * 10;
  const max = Math.ceil((Math.max(...highs) + 6) / 10) * 10;
  const y = (v: number) => bottom - ((v - min) / (max - min)) * (bottom - top);

  const ticks: number[] = [];
  for (let v = min; v <= max; v += max - min > 60 ? 20 : 10) ticks.push(v);

  const highPath = monthly.map((m, i) => `${i === 0 ? "M" : "L"}${xFor(i, 12)},${y(m.highF)}`).join(" ");
  const lowPath = monthly.map((m, i) => `${i === 0 ? "M" : "L"}${xFor(i, 12)},${y(m.lowF)}`).join(" ");
  const band = `${highPath} L${xFor(11, 12)},${y(monthly[11].lowF)} ${monthly
    .slice()
    .reverse()
    .map((m, i) => `L${xFor(11 - i, 12)},${y(m.lowF)}`)
    .join(" ")} Z`;

  const warmest = monthly.reduce((a, m) => (m.highF > a.highF ? m : a));
  const coolest = monthly.reduce((a, m) => (m.lowF < a.lowF ? m : a));

  // Rainfall panel.
  const RH = 96;
  const rainTop = 10;
  const rainBottom = RH - 22;
  const maxRain = Math.max(...monthly.map((m) => m.precipIn), 1);
  const wettest = monthly.reduce((a, m) => (m.precipIn > a.precipIn ? m : a));
  const driest = monthly.reduce((a, m) => (m.precipIn < a.precipIn ? m : a));

  return (
    <div className="scroll-x">
      <div style={{ minWidth: 470 }}>
        <figure className="m-0">
          <figcaption className="mb-1 flex items-baseline justify-between gap-3 text-[12px]">
            <span className="text-ink-2">
              Average daily high and low, °F
              <span className="ml-2 inline-flex items-center gap-1 text-ink-3">
                <span
                  aria-hidden
                  className="inline-block h-0.5 w-3 rounded"
                  style={{ background: "var(--series-2)" }}
                />
                high
                <span
                  aria-hidden
                  className="ml-1.5 inline-block h-0.5 w-3 rounded"
                  style={{ background: "var(--series-1)" }}
                />
                low
              </span>
            </span>
          </figcaption>

          <svg viewBox={`0 0 ${PLOT.w} ${H}`} width="100%" role="img" aria-label="Monthly temperature range">
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={PLOT.padL}
                  x2={PLOT.w - PLOT.padR}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                <text x={PLOT.padL - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill="var(--text-muted)">
                  {t}
                </text>
              </g>
            ))}

            {highlightMonths.map((m) => {
              const b = bandFor(m - 1, 12);
              return (
                <rect
                  key={m}
                  x={b.x}
                  y={top - 6}
                  width={b.w}
                  height={bottom - top + 6}
                  fill="var(--accent-soft)"
                  opacity={0.75}
                />
              );
            })}

            <path d={band} fill="var(--series-1)" opacity={0.13} />
            <path d={highPath} fill="none" stroke="var(--series-2)" strokeWidth={2} strokeLinejoin="round" />
            <path d={lowPath} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" />

            {monthly.map((m, i) => (
              <g key={m.month}>
                <circle cx={xFor(i, 12)} cy={y(m.highF)} r={2.5} fill="var(--series-2)" />
                <circle cx={xFor(i, 12)} cy={y(m.lowF)} r={2.5} fill="var(--series-1)" />
                <rect
                  x={bandFor(i, 12).x}
                  y={top - 6}
                  width={bandFor(i, 12).w}
                  height={bottom - top + 6}
                  fill="transparent"
                >
                  <title>{`${MONTH_NAMES[i]}: ${m.highF}°F high, ${m.lowF}°F low, ${m.humidityPct}% humidity`}</title>
                </rect>
              </g>
            ))}

            {/* Direct labels on the two months that define the range. */}
            <text
              x={xFor(monthly.indexOf(warmest), 12)}
              y={y(warmest.highF) - 7}
              textAnchor="middle"
              fontSize={10.5}
              fontWeight={600}
              fill="var(--text-primary)"
            >
              {fmt(warmest.highF)}°
            </text>
            <text
              x={xFor(monthly.indexOf(coolest), 12)}
              y={y(coolest.lowF) + 13}
              textAnchor="middle"
              fontSize={10.5}
              fontWeight={600}
              fill="var(--text-primary)"
            >
              {fmt(coolest.lowF)}°
            </text>

            {monthly.map((m, i) => (
              <text
                key={m.month}
                x={xFor(i, 12)}
                y={H - 6}
                textAnchor="middle"
                fontSize={10}
                fill={highlightMonths.includes(m.month) ? "var(--accent)" : "var(--text-muted)"}
                fontWeight={highlightMonths.includes(m.month) ? 600 : 400}
              >
                {MONTH_ABBR[i]}
              </text>
            ))}
          </svg>

          <div className="mt-3 mb-1 text-[12px] text-ink-2">Monthly rainfall, inches</div>
          <svg viewBox={`0 0 ${PLOT.w} ${RH}`} width="100%" role="img" aria-label="Monthly rainfall">
            <line
              x1={PLOT.padL}
              x2={PLOT.w - PLOT.padR}
              y1={rainBottom}
              y2={rainBottom}
              stroke="var(--border-strong)"
              strokeWidth={1}
            />
            {monthly.map((m, i) => {
              const b = bandFor(i, 12);
              const h = Math.max(1.5, (m.precipIn / maxRain) * (rainBottom - rainTop));
              const highlighted = highlightMonths.includes(m.month);
              return (
                <g key={m.month}>
                  <rect
                    x={b.x + 2}
                    y={rainBottom - h}
                    width={b.w - 4}
                    height={h}
                    rx={3}
                    fill={highlighted ? "var(--series-1)" : "var(--seq-2)"}
                    opacity={highlighted ? 1 : 0.85}
                  >
                    <title>{`${MONTH_NAMES[i]}: ${m.precipIn}in over about ${m.rainDays} wet days`}</title>
                  </rect>
                  <text
                    x={xFor(i, 12)}
                    y={RH - 6}
                    textAnchor="middle"
                    fontSize={10}
                    fill={highlighted ? "var(--accent)" : "var(--text-muted)"}
                    fontWeight={highlighted ? 600 : 400}
                  >
                    {MONTH_ABBR[i]}
                  </text>
                </g>
              );
            })}
            {[wettest, driest].map((m) => (
              <text
                key={m.month}
                x={xFor(m.month - 1, 12)}
                y={rainBottom - Math.max(1.5, (m.precipIn / maxRain) * (rainBottom - rainTop)) - 4}
                textAnchor="middle"
                fontSize={10.5}
                fontWeight={600}
                fill="var(--text-primary)"
              >
                {m.precipIn}
              </text>
            ))}
          </svg>
        </figure>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month-by-month suitability
// ---------------------------------------------------------------------------

const SUITABILITY_STEPS = ["var(--seq-1)", "var(--seq-2)", "var(--seq-3)", "var(--seq-4)", "var(--seq-5)", "var(--seq-6)"];

function suitabilityFill(value: number): string {
  return SUITABILITY_STEPS[Math.max(0, Math.min(5, Math.round(value)))];
}

/**
 * Twelve cells, one per month, shaded by how good a time it is to visit. Ordinal
 * magnitude, so a single-hue ramp — and the number is printed in every cell, because
 * the ramp alone is not a readable value.
 */
export function SuitabilityStrip({
  destination,
  highlightMonths = [],
  compact = false,
}: {
  destination: Destination;
  highlightMonths?: number[];
  compact?: boolean;
}) {
  return (
    <div className="scroll-x">
      <table className={`w-full ${compact ? "min-w-[300px]" : "min-w-[340px]"} border-separate border-spacing-[2px]`}>
        <caption className="sr-only">
          Seasonal suitability for {destination.name} by month, rated out of 5
        </caption>
        <thead>
          <tr>
            {MONTH_ABBR.map((m, i) => (
              <th
                key={m}
                scope="col"
                className={`text-center text-[10.5px] font-normal ${
                  highlightMonths.includes(i + 1) ? "font-semibold text-accent" : "text-ink-3"
                }`}
              >
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {destination.suitability.map((value, i) => {
              const season = destination.seasons[i];
              const highlighted = highlightMonths.includes(i + 1);
              return (
                <td
                  key={i}
                  title={`${MONTH_NAMES[i]}: ${value}/5, ${season} season`}
                  className="rounded text-center align-middle"
                  style={{
                    background: suitabilityFill(value),
                    color: value >= 3 ? "#ffffff" : "var(--text-primary)",
                    height: compact ? 26 : 32,
                    outline: highlighted ? "2px solid var(--accent)" : undefined,
                    outlineOffset: 1,
                  }}
                >
                  <span className="tnum text-[11.5px] font-semibold">{value}</span>
                </td>
              );
            })}
          </tr>
          <tr>
            {destination.seasons.map((season, i) => (
              <td
                key={i}
                className="text-center text-[9.5px] tracking-wide text-ink-3 uppercase"
                title={`${MONTH_NAMES[i]}: ${season} season`}
              >
                {season === "peak" ? "pk" : season === "shoulder" ? "sh" : "lo"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Daily comfort profile across the exact trip dates
// ---------------------------------------------------------------------------

export function DailyComfortChart({
  destination,
  startDate,
  endDate,
}: {
  destination: Destination;
  startDate: string;
  endDate: string;
}) {
  const record = climateFor(destination.id);
  const dates = datesInRange(startDate, endDate);
  const idx = dates.map(leapDayIndexOf);
  const highs = idx.map((i) => record.daily.highF[i]);
  const lows = idx.map((i) => record.daily.lowF[i]);
  const rain = idx.map((i) => record.daily.rainDayPct[i]);

  const H = 132;
  const top = 12;
  const bottom = H - 30;
  const min = Math.floor((Math.min(...lows) - 5) / 10) * 10;
  const max = Math.ceil((Math.max(...highs) + 5) / 10) * 10;
  const y = (v: number) => bottom - ((v - min) / (max - min)) * (bottom - top);
  const n = dates.length;

  // Responsive width: more compact on mobile for long date ranges
  const pixelsPerDay = n > 60 ? 12 : n > 30 ? 18 : 24;
  const minWidth = Math.max(320, n * pixelsPerDay);

  return (
    <div className="scroll-x">
      <div style={{ minWidth }}>
        <figure className="m-0">
          <figcaption className="mb-1 text-[12px] text-ink-2">
            Typical conditions day by day, {formatDate(startDate)} – {formatDate(endDate, { year: false })}.
            Bar height is the chance of rain.
          </figcaption>
          <svg viewBox={`0 0 ${PLOT.w} ${H}`} width="100%" role="img" aria-label="Daily temperature and rain probability">
            {[min, (min + max) / 2, max].map((t) => (
              <g key={t}>
                <line x1={PLOT.padL} x2={PLOT.w - PLOT.padR} y1={y(t)} y2={y(t)} stroke="var(--border)" />
                <text x={PLOT.padL - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill="var(--text-muted)">
                  {t}
                </text>
              </g>
            ))}

            {rain.map((pct, i) => {
              const b = bandFor(i, n);
              const h = (pct / 100) * (bottom - top) * 0.55;
              return (
                <rect
                  key={i}
                  x={b.x + 2}
                  y={bottom - h}
                  width={Math.max(2, b.w - 4)}
                  height={Math.max(0.8, h)}
                  rx={3}
                  fill="var(--seq-1)"
                  opacity={0.65}
                >
                  <title>{`${formatDate(dates[i])}: ${pct}% chance of rain`}</title>
                </rect>
              );
            })}

            <path
              d={highs.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i, n)},${y(v)}`).join(" ")}
              fill="none"
              stroke="var(--series-2)"
              strokeWidth={2}
            />
            <path
              d={lows.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i, n)},${y(v)}`).join(" ")}
              fill="none"
              stroke="var(--series-1)"
              strokeWidth={2}
            />

            {dates.map((d, i) => (
              <g key={d}>
                <circle cx={xFor(i, n)} cy={y(highs[i])} r={2.5} fill="var(--series-2)" stroke="var(--surface-1)" strokeWidth={1.5} />
                <circle cx={xFor(i, n)} cy={y(lows[i])} r={2.5} fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth={1.5} />
                <rect x={bandFor(i, n).x} y={top - 6} width={bandFor(i, n).w} height={bottom - top + 6} fill="transparent">
                  <title>{`${formatDate(d)}: ${highs[i]}°F / ${lows[i]}°F, ${rain[i]}% chance of rain`}</title>
                </rect>
                {(i === 0 || i === n - 1 || n <= 14) && (
                  <text x={xFor(i, n)} y={H - 16} textAnchor="middle" fontSize={9.5} fill="var(--text-muted)">
                    {d.slice(8)}
                  </text>
                )}
              </g>
            ))}
            <text x={xFor(0, n)} y={y(highs[0]) - 8} textAnchor="middle" fontSize={10.5} fontWeight={600} fill="var(--text-primary)">
              {highs[0]}°
            </text>
            <text x={PLOT.padL} y={H - 3} fontSize={10} fill="var(--text-muted)">
              day of month
            </text>
          </svg>
        </figure>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compared with the traveller's home base (src/data/home.ts)
// ---------------------------------------------------------------------------

/** Diverging bars around a zero line: warmer/longer to the right, colder/shorter to the left. */
export function HomeDeltaChart({
  rows,
}: {
  rows: { label: string; delta: number; unit: string; homeValue: string; thereValue: string }[];
}) {
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.delta)), 1);

  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const share = Math.abs(r.delta) / maxAbs;
        const positive = r.delta >= 0;
        return (
          <li key={r.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[12.5px]">
              <span className="text-ink-2">{r.label}</span>
              <span className="tnum text-ink-3">
                {r.thereValue} <span className="text-ink-3">vs</span> {r.homeValue} at home
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative h-3.5 flex-1" style={{ background: "var(--diverge-mid)", borderRadius: 4 }}>
                <div className="absolute inset-y-0 left-1/2 w-px" style={{ background: "var(--border-strong)" }} />
                <div
                  className="absolute inset-y-0"
                  style={{
                    left: positive ? "50%" : `${50 - share * 50}%`,
                    width: `${share * 50}%`,
                    background: positive ? "var(--diverge-warm)" : "var(--diverge-cool)",
                    borderRadius: 4,
                  }}
                />
              </div>
              <span className="tnum w-16 shrink-0 text-right text-[12.5px] font-medium">
                {positive ? "+" : "−"}
                {Math.abs(r.delta)}
                {r.unit}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
