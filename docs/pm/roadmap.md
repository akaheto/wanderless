# Roadmap

High level. Detail lives in `backlog/epics.md`. Release numbers match the labels shown in
the app on `/sources` and on the trip page's "not built yet" panel — they are user-visible,
so they do not get renumbered.

- **Last reviewed**: 2026-08-11

## Done

**Release 8 — accounts and sharing** *(2026-08-11)*. Multi-user collaboration with ownership
and permission levels (owner, editor, viewer). Anonymous sharing via token URLs that show
only curated data (destination, itinerary, bookings, places) — personal notes and rejected
options excluded. Sharing panel with link management wired into trip page.

**Release 5 — getting there and staying** *(2026-08-11)*. Flight and hotel search storage
with staleness indicators. Booking schema and CRUD. Comparison panel showing searched vs
curated with staleness signals. Forecast panel live and working inside 16-day horizon. All
wired into trip page. ADR 0016 (live data never ranks) enforced with static tests.

**Release 4 — time-bound things** *(2026-08-11)*. Date-constrained events at trip level
(visa deadlines, festivals, school holidays), tagged constraint/opportunity. Full CRUD and
UI panel wired into trip page.

**Release 6 — what it costs** *(2026-08-11)*. Budget panel showing flights (booked), hotels
(booked vs estimated), and trip total with savings indicator. Estimated nightly rate from
comparison engine. Multi-currency ready (input as minor units, display USD).

## Next

## Later

Deliberately loose. Neither is scoped, and the shape of both depends on how Releases 2–6
land.

**Release 7 — research automation.** Reduce the manual work of keeping the curated tier
fresh: flag destinations whose `curatedOn` date has gone stale, draft month notes for
review, reconcile curated ratings against measured data where they disagree. The output is
always a draft for the owner to accept — automation assists curation, it does not replace
it.

**Release 8 — accounts and sharing.** Multi-user, and sharing a trip or a comparison with
a specific person by link.

**Correction (2026-08-11):** an earlier version of this file claimed the data model already
carried the seams for this. It does not — `trips` has no owner column, and neither does
anything else. Release 8 therefore starts with a migration adding ownership to every table
and backfilling existing rows, plus an auth decision that has not been made. Costed as a
real epic, not a rename.

## Done

**Release 3 — places worth going** *(2026-08-11)*. Phase 5: saved places carrying their
source and a verification date, staleness graded per category, re-verification that cannot
touch personal fields, and standing destination notes that carry across trips. The planned
Google Places integration was made optional rather than required — the feature works fully
with no key (ADR 0014).

**Release 2 — structure the trip** *(2026-08-11)*. Phase 4: ordered stops whose dates derive
from night counts so the itinerary always tiles the trip, night allocation reported rather
than auto-corrected, transfer burden between stops with flags for stops that cost more than
they are worth, and per-stop climate. The planned Google Routes integration was withdrawn
(ADR 0011) rather than deferred.

**Release 1 — decide where to go** *(2026-08-10)*. Phases 0–3: foundation and the
three-tier model, the trip workspace, the comparison engine with its seasonal gate and
travel-time constraint, and the climate layer of 2015–2024 normals for 27 destinations.
See `CHANGELOG.md` for the detail.

## Sequencing rationale

The order is dependency-driven, not preference-driven:

- **Itinerary before places** — a saved restaurant needs a stop to attach to, otherwise it
  is just a bookmark.
- **Places before events** — events are places with a date constraint; the place model has
  to exist first.
- **Everything before budget** — a budget assembled from flights, hotels and activities
  cannot precede them.
- **Research automation late** — it optimises the curation workflow, which needs to be felt
  as a burden before it is worth automating.
- **Sharing last** — it is the only phase that changes the trust model, and it is much
  easier to add to a system whose data boundaries have already settled.
