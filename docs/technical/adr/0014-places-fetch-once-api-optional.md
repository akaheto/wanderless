# 0014. Places are fetched once and persisted; the API is optional enrichment

- **Status**: Accepted
- **Date**: 2026-08-11

## Context

Release 3 introduces saved places — restaurants, beaches, day trips, shopping — and with
them the project's first keyed integration. Two questions have been deferred to this point:
where API keys live, and whether lookups happen at build time or per request.

The climate answer (ADR 0005) does not transfer. Climate is precomputable because the
catalog is 27 fixed destinations known at build time. Places are unbounded and user-driven:
which restaurants matter is not knowable until someone saves one, so there is nothing to
precompute.

That leaves request-time lookups, which brings in a key, a rate limit, a billing
relationship, and a page render that depends on a third party — everything the project has
so far avoided, and everything ADR 0005 was written to prevent.

There is also a subtler problem. A place record is not one kind of data. Its name,
coordinates and address come from an API and are *objective*. Its opening hours are
objective but decay fast. "Why it matters" and the decision to save it at all are
*personal*. This is the first record type in the system that spans tiers within a single
row, and the three-tier model (ADR 0001) has so far been applied per-record.

## Decision

**A place is created by the user. The API, when configured, pre-fills fields at the moment
of creation — once. The result is persisted and thereafter read from the database.**

Concretely:

- No API call happens on any page render. Ever. A place page reads the database.
- One lookup happens when a place is added or explicitly re-verified, at the user's
  instigation.
- The fetched values are stored alongside a `verified_on` date and a `source_id`. A place
  without both is not trusted for hours, prices or bookings — the schema comment has said
  so since migration 0002, and this is where it is enforced.
- **Without a key, the feature works.** Every field is manually enterable and the place is
  saved with the user as its own source. The API is an accelerant, never a requirement.
- Re-verification is a deliberate act that updates the fetched fields and the date, and
  never touches personal fields.

**The tier distinction moves to the field level for this record type.** Fields are grouped
as fetched, personal or derived, and the UI marks them accordingly. Re-verification is
defined as "refresh the fetched group"; nothing else can be overwritten by a refresh.

**Staleness is computed and shown, per category.** A beach does not close; a restaurant
does. Thresholds differ by kind of place, so a two-year-old beach record reads as fine and a
two-year-old restaurant record reads as suspect.

## Alternatives considered

- **Request-time lookups with a cache.** The conventional answer. Rejected: it makes every
  place page depend on a third party being up and a quota being unspent, for data that
  changes monthly at most. A cache with a long TTL is just this decision with extra
  machinery and a less honest name — a cached value is a fetched-once value whose fetch date
  is hidden.
- **Require a key; make the API the only way to add a place.** Rejected outright. It would
  block the whole feature on a credential, and the most valuable places are often the ones
  a friend told you about, which no Places API knows.
- **Build-time precompute, as for climate.** Not possible — the set of places is not known
  until users create them.
- **Store only a `place_id` and hydrate from the API on read.** Smallest storage and always
  current. Rejected for the same request-time reason, and because it makes the record
  worthless the moment the key is removed or the place is delisted.

## Consequences

**Easier:** Page renders stay free of third-party dependencies, so ADR 0005's property
survives with one narrow, user-initiated exception. The app remains fully functional with no
key, keeping "no secrets to manage" true for anyone who does not opt in. Every place carries
a visible verification date, which is the difference between a dossier and a bookmark.

**Harder:** Data goes stale and the system has to say so rather than hide it, which means
staleness rules, re-verification flows, and a UI that surfaces age. Two places can be
duplicates if added by different routes; a stored provider place id is kept for dedupe where
one exists.

**Cost accepted:** Field-level tiering is more granular than the rest of the app and adds
per-field labelling that no other record needs. Judged worth it because places are precisely
where an undated fact does the most damage — a restaurant that closed, presented as though
someone had checked.

**Deferred:** Which provider supplies enrichment. The lookup is behind a single interface
with a null implementation as the default, so Google Places, Foursquare or nothing are
configuration rather than a rewrite.
