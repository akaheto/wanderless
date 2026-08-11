import type {
  Freshness,
  Itinerary,
  Place,
  PlacePriority,
  Source,
} from "@/lib/domain/types";
import {
  PLACE_CATEGORIES,
  PLACE_CATEGORY_LABELS,
  PLACE_PRIORITY_LABELS,
} from "@/lib/domain/types";
import {
  FRESHNESS_LABELS,
  describeAge,
  freshnessOf,
  groupPlacesByStop,
  placeWarnings,
  summarisePlaces,
} from "@/lib/places";
import { lookupUnavailableReason, placeLookup } from "@/lib/places/lookup";
import { Badge, Button, Card, CardHeader, Empty, Warnings } from "./ui";
import { formatDate } from "@/lib/dates";
import {
  addPlaceAction,
  copyPlaceToTripAction,
  deletePlaceAction,
  reverifyPlaceAction,
  setPlacePriorityAction,
} from "@/app/actions";

/**
 * Saved places.
 *
 * The organising idea is that a recommendation you cannot date is worthless, so freshness
 * is the most prominent thing on every row — ahead of the name's own metadata, and ahead
 * of anything decorative.
 */

const FRESHNESS_TONE: Record<Freshness, "good" | "neutral" | "warning" | "serious"> = {
  fresh: "good",
  aging: "neutral",
  stale: "warning",
  unverified: "serious",
};

export function PlacesPanel({
  tripId,
  places,
  standing,
  itinerary,
  destinationIds,
  tripStartDate,
  sources,
}: {
  tripId: number;
  places: Place[];
  standing: Place[];
  itinerary: Itinerary | null;
  destinationIds: { id: string; name: string }[];
  tripStartDate: string | null;
  sources: Map<number, Source>;
}) {
  const { grouped, unplaced } = groupPlacesByStop(places, itinerary);
  const summary = summarisePlaces(places);
  const warnings = placeWarnings(places, { tripStartDate });

  return (
    <Card>
      <CardHeader
        title="Places"
        note="Everything you have been told about, with where it came from and when it was last checked."
      />

      {places.length === 0 && standing.length === 0 ? (
        <div className="px-4 py-5">
          <Empty
            title="Nothing saved yet"
            body="Add the restaurants, beaches and day trips you have been told about. What makes this worth doing is the source and the date — a recommendation you cannot date is a rumour."
          />
        </div>
      ) : (
        <div className="grid gap-px border-b border-line bg-line sm:grid-cols-3">
          <Tile label="Saved" value={String(summary.total)} sub={`${summary.mustDo} must-do`} />
          <Tile
            label="Need attention"
            value={String(summary.needsAttention)}
            sub="stale or never verified"
            tone={summary.needsAttention > 0 ? "warning" : "normal"}
          />
          <Tile
            label="Ruled out"
            value={String(summary.ruledOut)}
            sub="kept, so you know you considered them"
          />
        </div>
      )}

      {grouped.length > 0 && (
        <div className="divide-y divide-line">
          {grouped.map((group) => (
            <section key={`${group.destinationId}-${group.stopIndex}`}>
              <div className="flex flex-wrap items-baseline gap-x-2 bg-sunken px-4 py-2">
                <h3 className="text-[13px] font-medium">{group.destinationName}</h3>
                <span className="tnum text-[12px] text-ink-3">
                  {formatDate(group.arriveDate, { year: false })} –{" "}
                  {formatDate(group.departDate, { year: false })}
                </span>
                <span className="ml-auto text-[12px] text-ink-3">
                  {group.places.length} place{group.places.length === 1 ? "" : "s"}
                </span>
              </div>
              {group.places.length === 0 ? (
                <p className="px-4 py-3 text-[12.5px] text-ink-3">
                  Nothing saved for this stop yet.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {group.places.map((place) => (
                    <PlaceRow
                      key={place.id}
                      place={place}
                      tripId={tripId}
                      source={place.sourceId ? sources.get(place.sourceId) : undefined}
                    />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {unplaced.length > 0 && (
        <section className="border-t border-line">
          <div className="bg-sunken px-4 py-2">
            <h3 className="text-[13px] font-medium">Not on the itinerary</h3>
            <p className="text-[12px] text-ink-3">
              Saved for destinations this trip has no stop in. Add a stop, or leave them for
              another time.
            </p>
          </div>
          <ul className="divide-y divide-line">
            {unplaced.map((place) => (
              <PlaceRow
                key={place.id}
                place={place}
                tripId={tripId}
                source={place.sourceId ? sources.get(place.sourceId) : undefined}
              />
            ))}
          </ul>
        </section>
      )}

      {standing.length > 0 && (
        <section className="border-t border-line">
          <div className="bg-sunken px-4 py-2">
            <h3 className="text-[13px] font-medium">Saved from previous trips</h3>
            <p className="text-[12px] text-ink-3">
              Standing notes for these destinations. Bring one onto this trip and the original
              stays where it is.
            </p>
          </div>
          <ul className="divide-y divide-line">
            {standing.map((place) => (
              <li key={place.id} className="flex flex-wrap items-baseline gap-x-2 px-4 py-2.5">
                <span className="text-[13.5px] font-medium">{place.name}</span>
                <Badge>{PLACE_CATEGORY_LABELS[place.category]}</Badge>
                <FreshnessBadge place={place} />
                <form action={copyPlaceToTripAction} className="ml-auto">
                  <input type="hidden" name="placeId" value={place.id} />
                  <input type="hidden" name="tripId" value={tripId} />
                  <button type="submit" className="text-[12.5px] text-accent hover:underline">
                    Add to this trip
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="border-t border-line px-4 py-3">
        <AddPlaceForm tripId={tripId} destinations={destinationIds} />
      </div>

      {warnings.length > 0 && (
        <div className="border-t border-line bg-sunken px-4 py-3">
          <Warnings warnings={warnings} />
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
  tone?: "normal" | "warning";
}) {
  return (
    <div className="bg-surface-1 px-4 py-3">
      <div className="text-[11.5px] tracking-wide text-ink-3 uppercase">{label}</div>
      <div
        className="tnum mt-0.5 text-[17px] font-semibold tracking-tight"
        style={{ color: tone === "warning" ? "var(--warning)" : undefined }}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[12px] text-ink-3">{sub}</div>
    </div>
  );
}

function FreshnessBadge({ place }: { place: Place }) {
  const freshness = freshnessOf(place);
  return (
    <Badge tone={FRESHNESS_TONE[freshness]}>
      {FRESHNESS_LABELS[freshness]}
    </Badge>
  );
}

const PRIORITY_TONE: Record<PlacePriority, "accent" | "neutral"> = {
  must: "accent",
  considering: "neutral",
  if_time: "neutral",
  ruled_out: "neutral",
};

function PlaceRow({
  place,
  tripId,
  source,
}: {
  place: Place;
  tripId: number;
  source?: Source;
}) {
  const freshness = freshnessOf(place);
  const needsAttention = freshness === "stale" || freshness === "unverified";

  return (
    <li className={`px-4 py-3 ${place.priority === "ruled_out" ? "opacity-55" : ""}`}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[13.5px] font-medium">{place.name}</span>
        <Badge>{PLACE_CATEGORY_LABELS[place.category]}</Badge>
        <Badge tone={PRIORITY_TONE[place.priority]}>{PLACE_PRIORITY_LABELS[place.priority]}</Badge>
        {place.reservationRequired && <Badge tone="warning">booking needed</Badge>}
        <FreshnessBadge place={place} />
      </div>

      {(place.neighborhood || place.hours || place.priceLevel) && (
        <div className="mt-1 flex flex-wrap gap-x-3 text-[12.5px] text-ink-3">
          {place.neighborhood && <span>{place.neighborhood}</span>}
          {place.hours && <span>{place.hours}</span>}
          {place.priceLevel && <span>{"$".repeat(place.priceLevel)}</span>}
        </div>
      )}

      {place.whyItMatters && (
        <p className="mt-1 text-[13px] text-ink-2">{place.whyItMatters}</p>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-3">
        {/* Provenance is the point of the record, so it sits on the row rather than
            behind a disclosure. */}
        <span>
          {source ? (
            source.url ? (
              <a href={source.url} className="text-accent hover:underline" rel="noreferrer noopener">
                {source.label}
              </a>
            ) : (
              source.label
            )
          ) : (
            <span style={{ color: "var(--warning)" }}>no source recorded</span>
          )}
        </span>
        <span>{describeAge(place)}</span>

        <form action={setPlacePriorityAction} className="ml-auto flex items-center gap-1.5">
          <input type="hidden" name="placeId" value={place.id} />
          <label className="sr-only" htmlFor={`priority-${place.id}`}>
            Priority for {place.name}
          </label>
          <select
            id={`priority-${place.id}`}
            name="priority"
            defaultValue={place.priority}
            className="px-1.5 py-0.5 text-[12px]"
          >
            {(Object.keys(PLACE_PRIORITY_LABELS) as PlacePriority[]).map((p) => (
              <option key={p} value={p}>
                {PLACE_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          <button type="submit" className="text-[12px] text-accent hover:underline">
            set
          </button>
        </form>

        <form action={deletePlaceAction}>
          <input type="hidden" name="placeId" value={place.id} />
          <button
            type="submit"
            aria-label={`Remove ${place.name}`}
            className="rounded px-1 text-[13px] text-ink-3 hover:text-serious"
          >
            ×
          </button>
        </form>
      </div>

      {needsAttention && <ReverifyForm place={place} tripId={tripId} />}
    </li>
  );
}

/**
 * Re-verification. Only the fetched fields appear — notes and priority are deliberately
 * absent, because re-verifying must not be able to touch them (ADR 0001).
 */
function ReverifyForm({ place, tripId }: { place: Place; tripId: number }) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer list-none text-[12px] font-medium text-accent hover:underline">
        Re-check this →
      </summary>
      <form
        action={reverifyPlaceAction}
        className="mt-2 grid gap-2 rounded-md bg-sunken p-3 sm:grid-cols-2"
      >
        <input type="hidden" name="placeId" value={place.id} />
        <input type="hidden" name="tripId" value={tripId} />

        <TextField name="name" label="Name" defaultValue={place.name} required />
        <TextField name="neighborhood" label="Neighbourhood" defaultValue={place.neighborhood} />
        <TextField name="hours" label="Hours" defaultValue={place.hours} />
        <TextField name="url" label="Website" defaultValue={place.url} />
        <TextField name="sourceLabel" label="Checked against" placeholder="e.g. their website" />
        <TextField name="sourceUrl" label="Source link" placeholder="https://…" />

        <p className="text-[12px] text-ink-3 sm:col-span-2">
          Saving marks this verified today. Your notes and priority are not touched.
        </p>
        <div className="sm:col-span-2">
          <Button type="submit" variant="primary">
            Mark as checked today
          </Button>
        </div>
      </form>
    </details>
  );
}

function TextField({
  name,
  label,
  defaultValue,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="text-[12px]">
      <span className="mb-0.5 block text-ink-2">{label}</span>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full"
      />
    </label>
  );
}

function AddPlaceForm({
  tripId,
  destinations,
}: {
  tripId: number;
  destinations: { id: string; name: string }[];
}) {
  const lookup = placeLookup();
  const unavailable = lookupUnavailableReason(lookup);

  return (
    <details>
      <summary className="cursor-pointer list-none text-[13px] font-medium text-accent hover:underline">
        Add a place →
      </summary>

      <form action={addPlaceAction} className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <input type="hidden" name="tripId" value={tripId} />

        <label className="text-[12px]">
          <span className="mb-0.5 block text-ink-2">Where</span>
          <select name="destinationId" required defaultValue="" className="w-full">
            <option value="" disabled>
              Pick a destination…
            </option>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-[12px]">
          <span className="mb-0.5 block text-ink-2">Kind</span>
          <select name="category" defaultValue="restaurant" className="w-full">
            {PLACE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {PLACE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>

        <TextField name="name" label="Name" required />
        <TextField name="neighborhood" label="Neighbourhood" />
        <TextField name="hours" label="Hours" placeholder="as given" />
        <TextField name="url" label="Website" placeholder="https://…" />

        <label className="text-[12px] sm:col-span-2">
          <span className="mb-0.5 block text-ink-2">Why it matters</span>
          <textarea name="whyItMatters" rows={2} className="w-full" />
        </label>

        <TextField name="sourceLabel" label="Who or what recommended it" placeholder="e.g. Mai, or Eater" />
        <TextField name="sourceUrl" label="Link" placeholder="https://…" />

        <label className="text-[12px]">
          <span className="mb-0.5 block text-ink-2">Priority</span>
          <select name="priority" defaultValue="considering" className="w-full">
            {(Object.keys(PLACE_PRIORITY_LABELS) as PlacePriority[]).map((p) => (
              <option key={p} value={p}>
                {PLACE_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col justify-end gap-1.5 text-[12px]">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="reservationRequired" />
            <span>Needs a booking</span>
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="verifiedNow" />
            <span>I have just checked these details</span>
          </label>
        </div>

        {unavailable && (
          <p className="text-[12px] text-ink-3 sm:col-span-2">{unavailable}</p>
        )}

        <div className="sm:col-span-2">
          <Button type="submit" variant="primary">
            Save place
          </Button>
        </div>
      </form>
    </details>
  );
}
