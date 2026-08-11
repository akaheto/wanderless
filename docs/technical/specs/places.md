# Spec: places and dossiers

How Release 3 works. The *what* is in `docs/pm/backlog/STORY-places.md`; the decisions
behind it are ADR 0014.

- **Status**: implemented
- **Last reviewed**: 2026-08-11

## The problem being solved

A trip accumulates recommendations from everywhere — a friend, a guide, a article, a
half-remembered comment. They end up in notes apps and browser tabs, and by the time the
trip arrives nobody knows which are still true. The restaurant closed. The beach needs a
permit now. The market moved.

A saved place is only worth having if you know **where it came from** and **when it was last
checked**. Everything below follows from that.

## Data model

`places` (migration 0002, extended by 0005) with fields in three groups. The grouping is
the point — re-verification refreshes group A and nothing else.

**A — fetched or externally sourced.** `name`, `address`, `neighborhood`, `lat`, `lon`,
`hours`, `price_level`, `url`, `provider_place_id`. Objective, decays, carries
`verified_on` and `source_id`.

**B — personal.** `why_it_matters`, `notes`, `priority`, `reservation_required`. Never
overwritten by anything automated (ADR 0001).

**C — classifying.** `category`, `destination_id`, `trip_id`. Set once, rarely changed.

### Attachment

A place attaches to a **destination**, and optionally to a **trip**. It does *not* carry a
stop id.

Stop membership is derivable: a place with `destination_id = hanoi` on a trip whose
itinerary has a Hanoi stop belongs to that stop, and inherits its dates. Storing a stop id
as well would let the two disagree — the same class of bug ADR 0010 designed out of the
itinerary. Deriving it also means places survive a stop being reordered or removed.

A place with no `trip_id` is a standing note about a destination, reusable across trips.
This is the mechanism by which the catalog gets better with each trip planned.

## Staleness

The core of the dossier idea. `verified_on` alone is a date; staleness is the judgement.

Thresholds vary by category, because things decay at different rates:

| Category | Fresh | Aging | Stale |
|---|---|---|---|
| restaurant, bar, cafe | < 6 months | 6–18 months | > 18 months |
| shop, market | < 12 months | 1–2 years | > 2 years |
| museum, sight, activity | < 18 months | 18 months–3 years | > 3 years |
| beach, viewpoint, neighbourhood | < 3 years | 3–5 years | > 5 years |

A beach does not close. A restaurant does. A record with no `verified_on` at all is
`unverified` — a distinct state from stale, and worse, because nothing was ever checked.

Staleness is computed at read time from `verified_on` and the category, never stored — a
stored staleness would itself go stale.

## Enrichment

Behind one interface, with a null implementation as the default:

```ts
interface PlaceLookup {
  readonly name: string;
  readonly configured: boolean;
  search(query: string, near: {lat, lon}): Promise<PlaceCandidate[]>;
}
```

`NullPlaceLookup` reports `configured: false` and returns nothing. It is the default, and
the app is fully usable with it — every field is manually enterable.

When a provider is configured, the user searches, picks a candidate, and its fields
pre-fill group A with `verified_on` set to today and a source recorded. Adding remains a
deliberate act; nothing is saved without confirmation.

**No lookup happens on a page render.** Search runs only from an explicit user action.

## Re-verification

One action, `reverifyPlace`, which:

1. Updates group A fields from whatever the user confirms (fetched or typed).
2. Sets `verified_on` to today and records a source.
3. Leaves group B untouched.

The UI offers it prominently on anything `stale`, and quietly on anything `aging`.

## Surfaces

**Trip page** — places for this trip, grouped by the stop they fall under, with unattached
destination-level places for the same destinations offered alongside. A stale place in an
upcoming trip is flagged.

**Destination page** — all places for that destination across trips, which is where the
standing-notes value shows up.

**Place detail** — *not built.* The row on the trip page carries everything a place
record holds, so a dedicated page would add a click without adding information. Revisit if
places grow richer (photos, multiple sources, visit history).

## Out of scope

- Map rendering. Coordinates are stored and displayed as numbers with a link out; an
  embedded map is a keyed dependency for decoration.
- Opening-hours parsing into structured form. Stored as text as given.
- Events and anything date-bound — Release 4.
- Automatic re-verification. It is a deliberate act (ADR 0014).

## Testing

- Staleness at each category boundary, and `unverified` as distinct from `stale`.
- Stop derivation, including a place whose destination has no stop on the trip.
- Re-verification leaves personal fields untouched — the ADR 0001 guarantee.
- `NullPlaceLookup` reports unconfigured and the add flow still completes.
