# Story: saved places with provenance and staleness

- **Epic**: places and dossiers
- **Status**: done *(2026-08-11)*
- **Size**: L
- **Scope**: both

## User story

As someone planning a trip, I want to save the places I have been told about with a record
of where each came from and when it was last checked, so that I arrive knowing which
recommendations I can still trust.

## Acceptance criteria

- [x] A place can be saved against a destination, optionally attached to a trip, with a
      category, a source and a verification date.
- [x] A place can be saved with no API key configured — every field is manually enterable
      and the feature is fully usable without one.
- [x] Staleness is shown per place and varies by category: a two-year-old beach reads as
      fine, a two-year-old restaurant reads as suspect.
- [x] A place never verified is distinguishable from one verified long ago.
- [x] Re-verifying a place updates its fetched fields and date, and leaves personal fields
      untouched.
- [x] Places on a trip are grouped under the stop whose destination they belong to, derived
      rather than stored.
- [x] A place attached to no trip persists as a standing note on the destination and is
      offered on future trips there.
- [x] No page render performs an external lookup.

## Notes

- ADR 0014 for the fetch-once/API-optional decision; `docs/technical/specs/places.md` for
  the design.
- The `places` and `sources` tables exist from migration 0002; 0005 adds the fields the
  spec needs.
- Stop membership is derived from `destination_id`, not stored — same reasoning as ADR 0010.

## Dependencies

Itinerary and stops (done) — places group under stops.
