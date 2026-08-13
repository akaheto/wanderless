# Roadmap

High level. Detail lives in `backlog/epics.md`. Release numbers match the labels shown in
the app on `/sources` and on the trip page's "not built yet" panel — they are user-visible,
so they do not get renumbered.

- **Last reviewed**: 2026-08-12

## Done

**Release 7 — research automation** *(2026-08-12)*. Reduce the manual work of keeping the
curated tier fresh: flag destinations whose `curatedOn` date has gone stale (> 180 days),
draft month-level redlines reconciling curated ratings against measured climate data, and
display them for owner review. All output is draft-only; nothing auto-applies. Admin
dashboard at `/curation` shows staleness status and side-by-side redlines.

**Release 8 — accounts and sharing** *(2026-08-11)*. Multi-user collaboration with ownership
and permission levels (owner, editor, viewer). Anonymous sharing via token URLs that show
only curated data (destination, itinerary, bookings, places) — personal notes and rejected
options excluded. Sharing panel with link management wired into trip page.

**Release 6 — what it costs** *(2026-08-11)*. Budget line items with category, currency,
estimated/booked amounts. Flight and hotel costs tracked with Money type (integer minor
units). Multi-currency totals via Frankfurter API (1-hour cached rates). Per-category
breakdown, upcoming payment deadlines, refundable exposure tracking.

**Release 5 — getting there and staying** *(2026-08-11)*. Flight and hotel search storage
with staleness indicators. Booking schema and CRUD. Booking creation from search results.
Comparison panel showing searched vs curated with staleness signals. Forecast panel live
and working inside 16-day horizon. All wired into trip page. ADR 0016 (live data never ranks)
enforced with static tests.

**Release 4 — time-bound things** *(2026-08-11)*. Date-constrained events at trip level
(visa deadlines, festivals, school holidays), tagged constraint/opportunity. Full CRUD and
UI panel wired into trip page. Overlap detection against trip dates.

**Release 3 — places worth going** *(2026-08-11)*. Saved places carrying their source and a
verification date, staleness graded per category, re-verification that cannot touch personal
fields, and standing destination notes that carry across trips. The planned Google Places
integration was made optional rather than required — the feature works fully with no key (ADR 0014).

**Release 2 — structure the trip** *(2026-08-11)*. Ordered stops whose dates derive from night
counts so the itinerary always tiles the trip, night allocation reported rather than auto-corrected,
transfer burden between stops with flags for stops that cost more than they are worth, and
per-stop climate. The planned Google Routes integration was withdrawn (ADR 0011) rather than deferred.

**Release 1 — decide where to go** *(2026-08-10)*. Foundation and the three-tier model, the trip
workspace, the comparison engine with its seasonal gate and travel-time constraint, and the climate
layer of 2015–2024 normals for 27 destinations. See `CHANGELOG.md` for the detail.

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
