import {
  type ForecastVsNormal,
  FORECAST_HORIZON_DAYS,
  describeWeatherCode,
  forecastAvailability,
} from "@/lib/climate/forecast";
import { Badge, Card, CardHeader } from "./ui";
import { formatDate } from "@/lib/dates";

/**
 * Forecast against normal.
 *
 * The layout is the argument (ADR 0012). Two labelled columns, never one blended number:
 * the normal is what these dates are usually like and is what ranked the destination; the
 * forecast is what is currently predicted and exists only inside the horizon. Merging them
 * would produce a figure whose meaning depends on today's date.
 *
 * Outside the horizon this renders the *reason* rather than an empty panel — "no forecast"
 * and "departure is eight months away" are different statements.
 */
export function ForecastPanel({
  startDate,
  endDate,
  comparison,
  today,
}: {
  startDate: string;
  endDate: string;
  /** Null when outside the horizon, or when the fetch failed. */
  comparison: ForecastVsNormal | null;
  today?: string;
}) {
  const availability = forecastAvailability(startDate, endDate, today);

  if (!availability.available) {
    return (
      <Card>
        <CardHeader title="Forecast" note={`Available inside ${FORECAST_HORIZON_DAYS} days.`} />
        <div className="px-4 py-4 text-[13px] text-ink-2">
          <p>{availability.reason}</p>
          <p className="mt-2 text-[12.5px] text-ink-3">
            The climate figures on this page are <strong className="font-medium text-ink-2">normals</strong> —
            what these calendar dates have historically looked like over 2015–2024. They are
            not a prediction, and they are what the comparison scored.
          </p>
        </div>
      </Card>
    );
  }

  if (comparison === null) {
    // Inside the horizon but no data. Said plainly rather than falling back to the normal,
    // which would be indistinguishable on screen from a forecast that happened to agree.
    return (
      <Card>
        <CardHeader title="Forecast" note="Inside the forecast window." />
        <div className="px-4 py-4 text-[13px] text-ink-2">
          <p>
            The forecast could not be retrieved. The normals below still apply — they are
            what these dates are usually like, and they have not changed.
          </p>
        </div>
      </Card>
    );
  }

  const { forecast, normal, highDeltaF, rainDeltaDays, notable } = comparison;

  return (
    <Card>
      <CardHeader
        title="Forecast against normal"
        note="Two different claims, kept side by side. The normal is what ranked this destination."
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
        <Badge
          tone={
            forecast.confidence === "high"
              ? "good"
              : forecast.confidence === "moderate"
                ? "neutral"
                : "warning"
          }
        >
          {forecast.confidence} confidence
        </Badge>
        <span className="text-[12px] text-ink-3">
          {forecast.leadDays === 0 ? "departing today" : `${forecast.leadDays} days out`} ·{" "}
          {forecast.model} · issued {formatDate(forecast.issuedAt.slice(0, 10), { year: false })}
        </span>
      </div>

      <p className="px-4 py-3 text-[13.5px] text-ink-2">{comparison.summary}</p>

      {/* The two readings, never averaged. */}
      <div className="grid gap-px bg-line sm:grid-cols-2">
        <Reading
          label="Forecast"
          sub="what is currently predicted"
          highF={Math.round(mean(forecast.days.map((d) => d.highF)) * 10) / 10}
          lowF={Math.round(mean(forecast.days.map((d) => d.lowF)) * 10) / 10}
          wetDays={Math.round((forecast.days.reduce((a, d) => a + d.rainChancePct, 0) / 100) * 10) / 10}
          days={forecast.days.length}
          emphasis
        />
        <Reading
          label="Normal"
          sub="what these dates are usually like"
          highF={normal.avgHighF}
          lowF={normal.avgLowF}
          wetDays={normal.expectedRainDays}
          days={normal.days}
        />
      </div>

      {notable && (
        <div className="border-t border-line bg-sunken px-4 py-2.5 text-[12.5px] text-ink-2">
          Difference from normal:{" "}
          <span className="tnum font-medium">
            {highDeltaF > 0 ? "+" : ""}
            {highDeltaF}°F
          </span>{" "}
          and{" "}
          <span className="tnum font-medium">
            {rainDeltaDays > 0 ? "+" : ""}
            {rainDeltaDays}
          </span>{" "}
          wet days. The comparison used the normal — a forecast cannot rank a destination,
          because a ranking has to mean the same thing whenever it is run.
        </div>
      )}

      <div className="scroll-x border-t border-line">
        <table className="w-full min-w-[460px] text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-left text-ink-3">
              <th scope="col" className="px-4 py-2 font-medium">Day</th>
              <th scope="col" className="px-3 py-2 font-medium">High / low</th>
              <th scope="col" className="px-3 py-2 font-medium">Rain</th>
              <th scope="col" className="px-3 py-2 font-medium">Conditions</th>
            </tr>
          </thead>
          <tbody>
            {forecast.days.map((day) => (
              <tr key={day.date} className="border-b border-line last:border-0">
                <th scope="row" className="px-4 py-1.5 text-left font-normal">
                  {formatDate(day.date, { year: false })}
                </th>
                <td className="tnum px-3 py-1.5">
                  {day.highF}° / {day.lowF}°F
                </td>
                <td className="tnum px-3 py-1.5">{day.rainChancePct}%</td>
                <td className="px-3 py-1.5 text-ink-2">{describeWeatherCode(day.weatherCode)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Reading({
  label,
  sub,
  highF,
  lowF,
  wetDays,
  days,
  emphasis = false,
}: {
  label: string;
  sub: string;
  highF: number;
  lowF: number;
  wetDays: number;
  days: number;
  emphasis?: boolean;
}) {
  return (
    <div className="bg-surface-1 px-4 py-3">
      <div className="flex items-baseline gap-2">
        <span className="text-[11.5px] tracking-wide text-ink-3 uppercase">{label}</span>
        {emphasis && <Badge tone="accent">live</Badge>}
      </div>
      <div className="tnum mt-1 text-[18px] font-semibold tracking-tight">
        {highF}° / {lowF}°F
      </div>
      <div className="mt-0.5 text-[12px] text-ink-3">
        {wetDays} wet days of {days} · {sub}
      </div>
    </div>
  );
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
