# 0016. Live flight data belongs to a chosen trip, never to a ranking

- **Status**: Accepted
- **Date**: 2026-08-11

## Context

Release 5 introduces real flight data. It is the project's first paid, keyed API, and the
obvious thing to do with it is make the travel score accurate: search actual itineraries,
use the real duration, stop estimating.

That instinct is wrong, and for a reason the project has already worked out once.

ADR 0012 established that forecasts never reach the scoring engine, because a ranking that
changes depending on when it ran stops being reproducible from its URL — and the change is
invisible, since no input the user can see has moved. Live flight data has exactly this
shape and worse. Schedules shift, fares move hourly, availability depends on the search.
A comparison run on Tuesday would rank differently from the same comparison on Wednesday,
with no visible cause.

There is a second problem the forecast case did not have. Scoring 27 destinations means 27
searches, each of them a billable API call, on a page that is currently free to render and
that users are encouraged to re-run repeatedly by moving sliders.

Against that: once a destination is *chosen*, the estimate stops being good enough. "22h,
one connection" is fine for deciding between Vietnam and Thailand and useless for deciding
whether to fly Tuesday or Wednesday.

## Decision

**Live flight data attaches to a trip that has a chosen destination. It never enters the
comparison engine.**

- **Ranking** uses the curated route table (ADR 0015) — deterministic, free, reproducible
  from a URL, identical whenever it runs.
- **A chosen trip** can search real itineraries, on explicit user action, and store the
  results against the trip with the time they were retrieved.
- The two are shown as different things, as normals and forecasts are: the curated estimate
  is what ranked the destination, the searched itinerary is what you would actually book.
  Where they disagree materially, say so — that disagreement is information about the
  curated table's staleness.

**Fetching follows the places rule (ADR 0014):** never on a page render, only from a
deliberate user action, and the result is persisted. A stored search carries `retrievedAt`
and goes stale visibly.

**The provider sits behind an interface with a null implementation as the default**, exactly
as `PlaceLookup` does. With no key configured the app is fully functional: rankings work,
trips work, and flight search reports itself unavailable rather than erroring. The key is
never required.

**Fares are recorded, never tracked.** A price is stored with the moment it was seen. The
system does not poll, does not alert, and does not present a stored fare as current — a
fare with a timestamp is a fact, a fare without one is a lie.

## Alternatives considered

- **Feed live durations into the travel score.** The intuitive version. Rejected: it breaks
  URL reproducibility (ADR 0002), makes rankings depend on wall-clock time, and costs a
  billable call per destination per slider move.
- **Search live but cache aggressively for scoring.** A cache long enough to be affordable
  is long enough to be stale, and a cached fare presented as live is the exact failure the
  three-tier model exists to prevent. It is also just this decision with the retrieval date
  hidden.
- **Replace the curated route table with live data entirely.** Removes a maintenance burden,
  and removes the app's ability to rank anything without a key and a billing relationship.
  The curated table is what makes the product work for free.
- **Use live data to auto-correct the curated table.** Tempting, and deferred rather than
  rejected — it is a good Release 7 idea. It must produce a *draft for review*, not a silent
  rewrite, or curated data stops being curated (ADR 0003).

## Consequences

**Easier:** Comparisons stay free, deterministic and reproducible. A ranking from six months
ago still reproduces. The app keeps working with no key. Costs are bounded by user actions
on chosen trips rather than by slider movements across the catalog.

**Harder:** Two representations of "how long the flight is" — the curated estimate that
ranked it and the searched itinerary that you book. This must be explained wherever both
appear, which is more UI than one number would need.

**Cost accepted:** The travel score keeps its curated estimate even for a trip where a real
itinerary is known to be different. That is deliberate: the score's job is to be comparable
across destinations and stable over time, not to be the most current figure available.

**Follow-on:** Where a search materially contradicts the curated route, that is a signal the
route table needs review. Surfacing it is the natural bridge into Release 7.
