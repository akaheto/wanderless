# 0010. Derive stop dates from nights, rather than storing both

- **Status**: Accepted
- **Date**: 2026-08-10

## Context

A multi-stop itinerary needs each stop to have dates. There are two ways to hold this:

1. Store an arrival and departure date per stop, and validate that they tile the trip.
2. Store only the number of nights per stop, and derive dates from the trip's start date
   plus the nights preceding each stop.

The original `trip_stops` schema hedged, carrying both `nights` and `arrive_date`.

The failure mode for stored dates is well known from calendar software: two stops overlap,
or a day falls between them belonging to neither. Both are representable, so both must be
checked on every write — and every path that changes a date has to re-run the check. Moving
the trip's start date by a day means rewriting every stop.

## Decision

**Nights are the source of truth. All dates are derived.**

Stop *n* arrives on `tripStart + Σ(nights of stops 0..n-1)` and departs after its own
nights. Migration 0004 drops `arrive_date` from `trip_stops` so the two cannot disagree.

One consistency question remains — whether the nights allocated match the nights the trip
has — and it is a single comparison rather than a pairwise check. When they disagree, the
itinerary still renders with the shortfall or excess stated explicitly; it is not
auto-corrected.

## Alternatives considered

- **Store arrival and departure dates per stop.** More flexible — it could express a gap
  deliberately (a night in transit belonging to no stop). Rejected: that flexibility is
  almost entirely a source of invalid states, and the one legitimate case is better modelled
  as an explicit transit stop later than as a hole that every consumer must handle.
- **Store both, with a trigger keeping them in sync.** Rejected as the worst of both — two
  representations of one fact, and a sync mechanism to get wrong.
- **Store dates, derive nights.** Symmetrical, but inverts which operation is easy. Users
  think in "three nights in Hanoi", and reordering stops under stored dates means rewriting
  all of them.

## Consequences

**Easier:** Gaps and overlaps are unrepresentable rather than merely invalid — an entire
class of bug is designed out. Reordering is a permutation of `position` with no date
arithmetic. Changing the trip's start date shifts the whole itinerary for free. The
validation surface is one number against one number.

**Harder:** A deliberate gap cannot be expressed. If a night in transit needs representing —
an overnight flight belonging to neither stop — it needs an explicit transit stop type,
which is a schema change rather than just leaving a hole.

**Cost accepted:** Stops cannot exist meaningfully on a trip with no start date. The
itinerary panel requires dates to be set, and says so rather than rendering positions
without dates.
