# Story: trip stops and transfer burden

- **Epic**: itinerary and stops
- **Status**: done *(2026-08-10)*
- **Size**: L
- **Scope**: both

## User story

As someone planning a multi-city trip, I want to lay out the stops and see what moving
between them actually costs, so that I don't discover on arrival that a three-night stop
was really one night plus two travel days.

## Acceptance criteria

- [x] A trip can hold an ordered list of stops, each a catalog destination with a number of
      nights.
- [x] Stop dates are derived from the trip start and the nights before them, so the
      itinerary always tiles the trip with no gaps or overlaps.
- [x] Allocating more or fewer nights than the trip has is surfaced as a specific,
      quantified problem ("2 nights unallocated"), not silently corrected.
- [x] Each stop shows the climate for **its own** dates, not the trip's.
- [x] Transfer burden between consecutive stops is shown — distance, mode, hours, and a
      plain-language judgement.
- [x] A stop whose transfer cost is large relative to its length is flagged.
- [x] Stops can be added, removed and reordered.
- [x] A single-stop trip is not made worse by the feature existing.

## Notes

- Nights are the source of truth; dates are derived. See ADR 0010.
- Transfer burden is estimated from great-circle distance plus a curated heuristic, and must
  be labelled as an estimate. Google Routes replaces it later in this release.
- The `trip_stops` table already exists from migration 0002. Its `arrive_date` column is
  removed by migration 0004 — storing it alongside `nights` would allow the two to
  disagree.
- Per-stop climate reuses `dateWindowClimate` unchanged.

## Dependencies

None. The destination catalog and climate layer are complete.
