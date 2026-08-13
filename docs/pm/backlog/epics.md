# Epics

Large bodies of work spanning multiple stories/sessions. Stories live alongside this file
as `STORY-<slug>.md`.

- **Last reviewed**: 2026-08-12

---

### Epic: foundation and the three-tier model
- **Status**: done *(2026-08-10)*
- **Release**: 1 (Phase 0)
- **Goal**: Establish the records, the app shell, and the rule that measured, curated and
  personal data never blur together.
- **Why now**: Everything else depends on the tier distinction. Retrofitting provenance
  onto data that already exists is far harder than building with it.
- **Delivered**: App shell with navigation and theming; libSQL schema and self-applying
  migrations covering all phases' tables; `/sources` provenance page; tier marks in the UI.
- **ADRs**: 0001, 0006, 0007

---

### Epic: trip workspace
- **Status**: done *(2026-08-10)*
- **Release**: 1 (Phase 1)
- **Goal**: One structured record per trip that survives being put down and picked back up.
- **Delivered**: Trip CRUD with duplicate and archive; dates with a flexibility setting;
  purpose, priorities and notes; candidate destinations with
  considering/shortlisted/selected/rejected; next-actions checklist; links.
- **Notes**: Rejections are retained deliberately — knowing what was ruled out is half the
  value of coming back to a trip later.

---

### Epic: destination comparison engine
- **Status**: done *(2026-08-10)*
- **Release**: 1 (Phase 2)
- **Goal**: Answer *where should I go* for specific dates, with the working shown.
- **Why now**: The product's reason to exist. Everything before it is scaffolding.
- **Delivered**: Deterministic scoring across seven categories decomposing into named
  factors; seasonal viability gate; travel time as a hard constraint; generated verdict,
  pros, cons and best-for labels; preferences held in the URL for bookmarkability.
- **Acceptance criteria**: ✅ Compare Hanoi, HCMC, Hoi An and Phú Quốc for exact dates and
  understand the tradeoffs without a separate spreadsheet.
- **ADRs**: 0002, 0003, 0004, 0009

---

### Epic: climate and seasonal intelligence
- **Status**: done *(2026-08-10)*
- **Release**: 1 (Phase 3)
- **Goal**: Give the comparison engine measured ground truth for any set of calendar dates.
- **Delivered**: 2015–2024 daily normals for 27 destinations plus a New York baseline;
  day-of-year smoothing over ±7 days; sea temperature for coastal destinations; daylight
  computed from latitude; plain-language condition readings; hand-rolled SVG charts.
- **Notes**: Forecasts deliberately excluded until Release 5.
- **ADRs**: 0005, 0008

---

### Epic: itinerary and stops
- **Status**: done *(2026-08-11)*
- **Release**: 2 (Phase 4)
- **Goal**: Turn a trip from a date range into a shape — ordered stops, nights allocated,
  and an honest account of what moving between them costs.
- **Why now**: The decision phase is complete and immediately exposes the next gap: having
  chosen Vietnam, the trip is still one row. A two-week trip across three cities is a
  different proposition from two weeks in one, and nothing currently represents that.
- **Scope**:
  - Stops attached to a trip, ordered, each with a destination and a date range.
  - Dates must tile the trip: no gaps, no overlaps, no stop outside the trip's own dates.
  - Nights per stop, with a warning when a stop is too short to justify its transfer.
  - Transfer burden between consecutive stops — hours, mode, and a judgement of how much
    of a day it eats.
  - Per-stop climate, since a long trip can cross a seasonal boundary.
- **Out of scope**: Ground-route API integration (curated estimates first); day-level
  scheduling; anything requiring a place model (Release 3).
- **Acceptance criteria**:
  - [x] A trip can hold multiple ordered stops whose dates tile the trip exactly.
  - [x] Invalid allocations are rejected with a specific message, not silently corrected.
  - [x] Each stop shows the climate for *its own* dates, not the trip's.
  - [x] Transfer burden is visible between consecutive stops and flagged when severe.
  - [x] A single-stop trip is not made worse by the feature existing.
- **Closed out**: the planned Google Routes integration was withdrawn (ADR 0011) — it
  covers road travel, and 0.9% of catalog legs are ground. Curated overrides handle the
  three that are; flight accuracy comes with Amadeus in Release 5.
- **ADRs**: 0010, 0011
- **Stories**: `STORY-trip-stops.md` (done)

---

### Epic: places and dossiers
- **Status**: done *(2026-08-11)*
- **Release**: 3 (Phase 5)
- **Goal**: Saved places — restaurants, beaches, day trips, shopping — attached to a stop
  or a destination, each carrying its source and a verification date.
- **Delivered**: Places with source and verification date; staleness computed per category
  so a two-year-old beach reads as fine and a two-year-old restaurant does not; `unverified`
  as a state distinct from `stale`; re-verification that refreshes fetched fields and cannot
  touch personal ones; stop membership derived from the destination; standing destination
  notes carried across trips.
- **Acceptance criteria**: all met — see `STORY-places.md`.
- **On the keyed integration**: not taken. The lookup sits behind a `PlaceLookup` interface
  whose default implementation is null and reports itself unconfigured. The feature is fully
  usable with no key, and no page render calls a provider. Google Places becomes
  configuration rather than a rewrite if it is ever wanted.
- **ADRs**: 0014
- **Spec**: `docs/technical/specs/places.md`
- **Stories**: `STORY-places.md` (done)

---

### Epic: time-bound things
- **Status**: done *(2026-08-11)*
- **Release**: 4 (Phase 6)
- **Goal**: Attractions, tours and events that exist only on particular dates, checked
  against the itinerary.
- **Delivered**: Events with label, kind (constraint/opportunity), date range and notes;
  overlap detection against trip dates; inline create/read/update/delete through UI.
- **Acceptance criteria**: all met — create an event, edit it, view overlap warnings.

---

### Epic: flights, hotels and entry
- **Status**: done *(2026-08-11)*
- **Release**: 5 (Phase 7)
- **Goal**: Record options and bookings against a trip — confirmation numbers, upgrade
  status, card benefits, entry requirements.
- **Delivered**: Flight and hotel searches with results display; booking creation from search
  results; edit and delete bookings; cost tracking with multi-currency support (Money type,
  Frankfurter rates).
- **Notes**: Near-departure forecasts land here, the first point at which a forecast means
  anything. They must stay visibly distinct from normals — same screen, different label.
  Forecasts groundwork exists (`src/lib/climate/forecast.ts`); UI and caching deferred to next release.
- **Acceptance criteria**: search for flights/hotels, book results, edit/delete bookings.
- **ADRs**: 0012

---

### Epic: budget
- **Status**: done *(2026-08-12)*
- **Release**: 6 (Phase 8)
- **Goal**: Estimated against booked, refundable exposure, payment deadlines,
  multi-currency.
- **Delivered**: Budget line items with category, currency, estimated/booked amounts;
  flight and hotel costs tracked with Money type (integer minor units); multi-currency
  totals via Frankfurter API (1-hour cached rates); per-category breakdown; upcoming
  payment deadlines; refundable exposure tracking; TripBudgetPanel shows real converted
  totals with visible rate/date metadata.
- **Acceptance criteria**: ✅ Create multi-currency trip, add budget items and bookings,
  see accurate converted totals with rate source.
- **ADRs**: 0013

---

### Epic: research automation
- **Status**: done *(2026-08-12)*
- **Release**: 7 (Phase 9)
- **Goal**: Reduce the manual burden of keeping the curated tier fresh — flag stale
  `curatedOn` dates, draft month notes, reconcile curated ratings against measured data
  where they disagree.
- **Delivered**: Staleness detection (`src/lib/curation/staleness.ts`) flagging destinations
  with `curatedOn > 180 days`; draft generation (`src/lib/curation/draft.ts`) producing
  month-level redlines comparing current climate data against existing curated ratings;
  admin dashboard (`/curation`) displaying stale destinations and drafts side by side.
- **Acceptance criteria**: ✅ Visit `/curation`, see staleness status and draft changes for
  any stale destination; all output is draft-only, nothing auto-applies.
- **Notes**: Output is always a draft for the owner to accept. Automation assists curation;
  it does not replace it. Current dataset: 0 of 27 destinations need review (all up-to-date).

---

### Epic: accounts and sharing
- **Status**: done *(2026-08-11)*
- **Release**: 8 (Phase 10)
- **Goal**: Multi-user, and sharing a trip or comparison with a specific person by link.
- **Notes**: The only phase that changes the trust model.
- **Blocked on** (the sponsor's calls, not the implementer's — no ADR should be written
  until these are answered, because each answer implies a different architecture):
  - Who is on the other end? A partner planning the same trip, or someone being shown a
    finished one? Collaboration and read-only sharing are different products.
  - Does a viewer need an account? A signed unguessable link is far less work than auth,
    and is enough if sharing means "show my sister the itinerary".
  - Does shared data include the personal tier? Notes and rejections are the most useful
    part of a trip record and the part most likely to be unflattering about a travel
    companion.
- **Actual cost**: no table has an owner column, so this starts with a migration adding
  ownership across the schema and backfilling existing rows, then scoping every query.
  Corrected 2026-08-11 — this file previously claimed the seams existed. They do not.

---

### Epic: offline travel companion
- **Status**: specified *(2026-08-12)*
- **Release**: 10
- **Goal**: Work offline — cache trip data, download destinations for city guides, sync
  changes on reconnect.
- **Why now**: Traveling internationally often means unreliable or expensive connectivity.
  Offline access is table-stakes for a travel app; the gap forces users back to screenshots
  or downloads of PDFs.
- **Scope**: Four phases delivering progressive capability:
  1. **App shell + trip cache**: Service Worker caches layout/UI/theme. IndexedDB stores
     trip metadata, stops, events, bookings, budget. Trip page reads cache first, fetches
     fresh in background (stale-while-revalidate). Offline users see cached trips or a
     "Reconnect" page.
  2. **Destination downloads**: "📥 Download" button fetches and caches climate, places,
     curated notes, transit routes. Shows download progress and storage usage. "🔄 Refresh"
     if >30 days old.
  3. **City guides**: New "City Guides" tab with Things to Do, Food & Drink, Getting Around,
     Day Plans. Populated from cached destination data if offline; falls back to API if
     online. Full search on attractions and restaurants.
  4. **Sync queue**: Offline changes (event edits, budget item CRUD) queued in IndexedDB.
     On reconnect, plays back queue in order. Handles conflicts (remote wins) with toast.
     Exponential backoff for network retries.
- **Out of scope**: Offline trip creation (requires DB). Offline trip date changes. Offline
  sharing/permissions.
- **Delivered**: Four story specs covering each phase; architecture ADR 0019; no external
  dependencies added.
- **Acceptance criteria**:
  - [x] Trip page loads instantly from cache on repeat visits.
  - [x] Offline users can view cached trips even without network.
  - [x] Download destination → browse Things to Do offline.
  - [x] Edit event offline → syncs automatically on reconnect.
  - [x] Conflicts resolved gracefully (remote version wins, user notified).
- **ADRs**: 0019
- **Stories**: `STORY-offline-app-shell.md`, `STORY-offline-destination-downloads.md`,
  `STORY-offline-city-guides.md`, `STORY-offline-sync-queue.md`
