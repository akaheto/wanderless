import Link from "next/link";
import type { Destination, Itinerary, ItineraryStop, Transfer } from "@/lib/domain/types";
import { TRANSFER_BURDEN_LABEL, TRANSFER_MODE_LABEL } from "@/lib/itinerary";
import { Badge, Button, Card, CardHeader, Empty, Warnings } from "./ui";
import { formatDate } from "@/lib/dates";
import {
  addStopAction,
  moveStopAction,
  removeStopAction,
  seedItineraryAction,
  setStopNightsAction,
} from "@/app/actions";

/**
 * The itinerary.
 *
 * Reads as a vertical timeline rather than a table, because the thing being communicated
 * is a sequence with gaps of travel between its items — and the travel is the part that
 * gets underestimated. Transfers get their own row between stops rather than a column
 * inside them, so the cost of moving is impossible to skim past.
 */
export function ItineraryPanel({
  tripId,
  itinerary,
  catalog,
  selectedDestination,
  tripNights,
}: {
  tripId: number;
  itinerary: Itinerary | null;
  catalog: Destination[];
  selectedDestination: Destination | null;
  tripNights: number;
}) {
  if (itinerary === null) {
    return (
      <Card>
        <CardHeader title="Itinerary" note="Where you actually go, and what moving costs." />
        <div className="px-4 py-5">
          <Empty
            title="Set the trip dates first"
            body="Stops are laid out from the departure date, so the trip needs dates before an itinerary means anything."
            action={
              <Link href={`/trips/${tripId}/edit`} className="text-[13px] text-accent hover:underline">
                Edit trip dates →
              </Link>
            }
          />
        </div>
      </Card>
    );
  }

  const { stops, unallocatedNights, transferHours } = itinerary;

  return (
    <Card>
      <CardHeader
        title="Itinerary"
        note="Dates follow from the nights you allocate — stops always tile the trip exactly."
      />

      {stops.length === 0 ? (
        <div className="px-4 py-5">
          <Empty
            title="No stops yet"
            body={
              selectedDestination
                ? `Start from ${selectedDestination.name}, or add stops one at a time to build a multi-city trip.`
                : "Add the places you will actually stay. A single-stop trip is fine — the itinerary just confirms it."
            }
            action={
              selectedDestination ? (
                <form action={seedItineraryAction}>
                  <input type="hidden" name="tripId" value={tripId} />
                  <input type="hidden" name="destinationId" value={selectedDestination.id} />
                  <input type="hidden" name="nights" value={Math.max(1, tripNights)} />
                  <Button type="submit" variant="primary">
                    Start with {selectedDestination.name} for all {tripNights} nights
                  </Button>
                </form>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <div className="grid gap-px border-b border-line bg-line sm:grid-cols-3">
            <Tile label="Stops" value={String(stops.length)} sub={stops.length === 1 ? "single base" : "multi-city"} />
            <Tile
              label="Nights allocated"
              value={`${itinerary.allocatedNights} of ${itinerary.tripNights}`}
              sub={
                unallocatedNights === 0
                  ? "tiles the trip exactly"
                  : unallocatedNights > 0
                    ? `${unallocatedNights} still to place`
                    : `${Math.abs(unallocatedNights)} past the return date`
              }
              tone={unallocatedNights === 0 ? "normal" : unallocatedNights > 0 ? "warning" : "serious"}
            />
            <Tile
              label="Time moving"
              value={stops.length > 1 ? `${transferHours}h` : "—"}
              sub={stops.length > 1 ? "between stops, door to door" : "no internal transfers"}
            />
          </div>

          <ol className="px-4 py-4">
            {stops.map((s, index) => (
              <li key={s.stop.id}>
                {s.transferIn && <TransferRow transfer={s.transferIn} />}
                <StopRow
                  tripId={tripId}
                  stop={s}
                  index={index}
                  isFirst={index === 0}
                  isLast={index === stops.length - 1}
                />
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="border-t border-line px-4 py-3">
        <AddStopForm
          tripId={tripId}
          catalog={catalog}
          defaultNights={Math.max(1, unallocatedNights)}
          usedIds={stops.map((s) => s.destination.id)}
        />
      </div>

      {itinerary.warnings.length > 0 && (
        <div className="border-t border-line bg-sunken px-4 py-3">
          <Warnings warnings={itinerary.warnings} />
        </div>
      )}
    </Card>
  );
}

function Tile({
  label,
  value,
  sub,
  tone = "normal",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "normal" | "warning" | "serious";
}) {
  const color =
    tone === "serious" ? "var(--serious)" : tone === "warning" ? "var(--warning)" : undefined;
  return (
    <div className="bg-surface-1 px-4 py-3">
      <div className="text-[11.5px] tracking-wide text-ink-3 uppercase">{label}</div>
      <div className="tnum mt-0.5 text-[17px] font-semibold tracking-tight" style={{ color }}>
        {value}
      </div>
      <div className="mt-0.5 text-[12px] text-ink-3">{sub}</div>
    </div>
  );
}

const BURDEN_TONE = {
  easy: "neutral",
  "half-day": "neutral",
  "full-day": "warning",
  punishing: "warning",
} as const;

/** The gap between two stops, drawn as an interruption rather than a row of data. */
function TransferRow({ transfer }: { transfer: Transfer }) {
  const heavy = transfer.burden === "full-day" || transfer.burden === "punishing";
  return (
    <div className="flex items-start gap-3 py-1.5 pl-[7px]">
      <div
        aria-hidden
        className="mt-1 w-px shrink-0 self-stretch border-l border-dashed"
        style={{ borderColor: heavy ? "var(--warning)" : "var(--border-strong)", minHeight: 26 }}
      />
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pb-1 text-[12.5px]">
        <span className="text-ink-2">
          {TRANSFER_MODE_LABEL[transfer.mode]}, <span className="tnum">{transfer.hours}h</span>
        </span>
        <Badge tone={BURDEN_TONE[transfer.burden]}>{TRANSFER_BURDEN_LABEL[transfer.burden]}</Badge>
        <span className="tnum text-ink-3">{transfer.distanceKm.toLocaleString()} km</span>
        <span className="w-full text-ink-3">{transfer.note}</span>
      </div>
    </div>
  );
}

function StopRow({
  tripId,
  stop: s,
  index,
  isFirst,
  isLast,
}: {
  tripId: number;
  stop: ItineraryStop;
  index: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div
        aria-hidden
        className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
      >
        {index + 1}
      </div>

      <div className="min-w-0 flex-1 pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <Link
              href={`/destinations/${s.destination.id}?start=${s.arriveDate}&end=${s.departDate}`}
              className="text-[14px] font-medium hover:text-accent"
            >
              {s.destination.name}
            </Link>
            <span className="tnum text-[12.5px] text-ink-3">
              {formatDate(s.arriveDate, { year: false })} – {formatDate(s.departDate, { year: false })}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <StopReorder tripId={tripId} stopId={s.stop.id} direction="up" disabled={isFirst} />
            <StopReorder tripId={tripId} stopId={s.stop.id} direction="down" disabled={isLast} />
            <form action={removeStopAction}>
              <input type="hidden" name="tripId" value={tripId} />
              <input type="hidden" name="stopId" value={s.stop.id} />
              <button
                type="submit"
                aria-label={`Remove ${s.destination.name}`}
                className="rounded px-1.5 py-0.5 text-[13px] text-ink-3 hover:text-serious"
              >
                ×
              </button>
            </form>
          </div>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
          <form action={setStopNightsAction} className="flex items-center gap-1.5">
            <input type="hidden" name="tripId" value={tripId} />
            <input type="hidden" name="stopId" value={s.stop.id} />
            <label className="flex items-center gap-1.5">
              <input
                type="number"
                name="nights"
                defaultValue={s.stop.nights}
                min={0}
                max={365}
                className="w-14 px-1.5 py-0.5 text-[12.5px]"
                aria-label={`Nights in ${s.destination.name}`}
              />
              <span>nights</span>
            </label>
            <button type="submit" className="text-[12px] text-accent hover:underline">
              update
            </button>
          </form>

          {/* Per-stop climate, not the trip's — a fortnight can cross a monsoon boundary. */}
          <span className="tnum">
            {s.climate.avgHighF}° / {s.climate.avgLowF}°F
          </span>
          <span className="tnum">{s.climate.expectedRainDays} wet days</span>
        </div>

        {s.warnings.length > 0 && (
          <div className="mt-1.5">
            <Warnings warnings={s.warnings} />
          </div>
        )}
      </div>
    </div>
  );
}

function StopReorder({
  tripId,
  stopId,
  direction,
  disabled,
}: {
  tripId: number;
  stopId: number;
  direction: "up" | "down";
  disabled: boolean;
}) {
  return (
    <form action={moveStopAction}>
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="stopId" value={stopId} />
      <input type="hidden" name="direction" value={direction} />
      <button
        type="submit"
        disabled={disabled}
        aria-label={`Move ${direction}`}
        className="rounded px-1.5 py-0.5 text-[13px] text-ink-3 hover:text-accent disabled:pointer-events-none disabled:opacity-25"
      >
        {direction === "up" ? "↑" : "↓"}
      </button>
    </form>
  );
}

function AddStopForm({
  tripId,
  catalog,
  defaultNights,
  usedIds,
}: {
  tripId: number;
  catalog: Destination[];
  defaultNights: number;
  usedIds: string[];
}) {
  return (
    <form action={addStopAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="tripId" value={tripId} />
      <label className="min-w-0 flex-1 text-[12.5px]">
        <span className="sr-only">Destination to add</span>
        <select name="destinationId" required defaultValue="" className="w-full">
          <option value="" disabled>
            Add a stop…
          </option>
          {catalog.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
              {usedIds.includes(d.id) ? " (already a stop)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="text-[12.5px]">
        <span className="sr-only">Nights</span>
        <input
          type="number"
          name="nights"
          defaultValue={defaultNights}
          min={0}
          max={365}
          className="w-16"
          aria-label="Nights at this stop"
        />
      </label>
      <Button type="submit">Add</Button>
    </form>
  );
}
