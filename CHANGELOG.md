# Changelog

## 0.10.0 — 2026-08-12

Release 10: Offline travel companion. Complete four-phase offline-first implementation with Service Worker app shell, IndexedDB trip/destination caching, destination downloads, and sync queue for offline changes.

### Added

**Release 10 — Offline Travel Companion:**

**Phase 1: App Shell & Trip Data Cache (✓ Complete)**
- Service Worker (`public/service-worker.js`): Network-first for APIs, cache-first for static assets, stale-while-revalidate for HTML
- IndexedDB wrapper (`src/lib/offline/db.ts`): Abstracts three stores (trips, destinations, syncQueue) with full CRUD operations
- OfflineProvider context (`src/lib/offline/context.tsx`): Manages online/offline state, sync queue, retry logic
- OfflineBanner component: Visual indicator when offline, "🔄 Sync Now" button
- ServiceWorkerRegistry: Auto-registers Service Worker on app load
- /trips/offline page: Lists cached trips with timestamps, storage info, clear-all option
- CachedTrip interface: Trip metadata + stops, events, flightBookings, hotelBookings, budgetItems

**Phase 2: Destination Downloads (✓ Complete)**
- DestinationDownloadButton: Download/refresh/delete UI for cached destinations
- Download progress tracking with percentage (25% → 50% → 75% → 100%)
- Storage size display (e.g., "✓ Downloaded • 8.3 MB")
- Automatic staleness detection (>30 days shows "🔄 Refresh" button)
- Downloads utility (`src/lib/offline/downloads.ts`): Fetch destination data, calculate size, format bytes
- Storage quota estimation via navigator.storage.estimate()
- CachedDestination interface: Destination + climate + places + transit routes + timestamp

**Phase 3: City Guides (✓ Complete)**
- CityGuidesTab component: Four-section tab interface
- **Things to Do**: Filter attractions by name, show ratings, distance, hours, admission
- **Food & Drink**: Search restaurants by name/cuisine, display type, price range, hours, address
- **Getting Around**: Transit routes (airport→city, etc.) with duration, cost, transport modes
- **Day Plans**: Curated itineraries with stops and timing (e.g., "Museum & Café Tour, 9:00 AM → ...")
- Real-time search filtering (client-side, no API call)
- Offline fallback: "Download {destination} to browse guides offline"
- Responsive mobile layout: Tab navigation stacks on small screens

**Phase 4: Sync Queue (✓ Complete)**
- OfflineContext sync logic: Sequential queue processing with exponential backoff (1s → 2s → 4s → 8s)
- SyncQueueItem interface: Supports event:update, event:delete, budgetItem:create/update/delete
- Compound key: [tripId, action, resourceId] prevents duplicate queue entries
- Conflict handling: Remote version wins, user sees toast "Event was updated online. Your offline change was overridden."
- Automatic retry on transient errors, manual retry possible via "Sync Now" button
- Persistent queue: Survives browser restart, syncs on next online connection

**Cross-Phase Features:**
- OfflineBanner: Top-of-page indicator with queued change count
- Zero breaking changes: All existing on-network behavior preserved
- Zero new dependencies: Uses native browser APIs only (Service Worker, IndexedDB, Storage API)
- Type-safe: Full TypeScript across all offline modules
- Error resilient: No silent failures, all errors logged or shown to user

**Documentation:**
- Comprehensive implementation spec (`docs/technical/specs/offline-implementation.md`)
- Updated ADR 0019 with real implementation details
- Four story specs in `docs/pm/backlog/` with acceptance criteria
- Integration testing checklist

**Status**: All four phases implemented, tested, and deployed to production (v0.10.0).

## 0.9.0 — 2026-08-12

Release 7: Research automation, budget multi-currency, and booking creation flow. All eight releases now shipped.

### Added

**Release 7 — Research Automation:**

- **Staleness detection** (`src/lib/curation/staleness.ts`): Flags destinations where `curatedOn` exceeds 180 days. Computes `daysSinceCuration` for sorting.
- **Draft generation** (`src/lib/curation/draft.ts`): Compares current climate data against curated suitability ratings. Produces month-by-month redlines with suggested rating changes and updated notes.
- **Curation dashboard** (`/curation`): Admin page displaying stale destinations and side-by-side draft redlines. Nothing auto-applies; all output is for manual review and acceptance.
- **Status**: 0 of 27 destinations currently need review (all up-to-date). Automation reduces burden; does not replace editorial judgment.

**Release 6 — Complete Budget Multi-Currency:**

- **Money type** (`src/lib/money/`): Replaces float USD with integer minor units + explicit currency. Prevents silent rounding errors (ADR 0013).
- **Frankfurter API** (`src/lib/money/rates.ts`): Fetches exchange rates with 1-hour caching. On failure returns empty array; `summariseBudget` reports missing rates openly.
- **Multi-currency totals**: Estimated/booked/variance computed in trip currency. Per-category breakdown. Payment deadlines. Refundable exposure tracking.
- **TripBudgetPanel rewrite**: Now presentational, receives computed totals from server. Displays rate source and fetch date for full transparency.
- **BudgetItemForm**: New component for budget line item CRUD (create/edit/delete). Supports category, currency, estimated/booked amounts, refund tracking.

**Release 5 — Complete Booking Creation:**

- **Booking creation actions** (`createFlightBookingAction`, `createHotelBookingAction`): Insert new bookings (was: only update existed).
- **Search→book flow**: FlightSearchesPanel and HotelSearchesPanel now have "Book" buttons that pre-fill cost/details from search results.
- **Complete CRUD**: Flight and hotel bookings now support create, read, update, delete through UI.
- **Money type for costs**: All bookings use Money (integer minor units) instead of float USD.

### Architecture

- All Releases 1–8 complete and shipped. No remaining planned integrations in backlog.
- Currency: Frankfurter replaces unimplemented `src/lib/currency.ts`. No shared secrets; API is free and keyless.
- Curation: Draft-only; no auto-apply. Reuses scoring algorithm from destination-data-pipeline; shares suitability logic.

### Documentation

- Updated `docs/pm/charter.md` milestone status: Releases 2–8 done.
- Updated `docs/pm/backlog/epics.md`: All epics marked done with delivery notes.
- Updated `docs/technical/architecture.md`: Added modules for Places, Events, Bookings, Budget, Money, Curation.
- Updated `src/app/sources/page.tsx`: Removed "Planned integrations" table. Added "Live keyed integrations" (Places optional, Kiwi.com, Frankfurter). Marked Google Routes and Places-required withdrawn (ADRs 0011, 0014).
- Removed `NotYetBuilt()` component from trip page (nothing left to list).
- Updated `docs/pm/roadmap.md`: Consolidated duplicate sections. Release 7 marked done.

### Removed

- `src/lib/currency.ts`: Replaced by `src/lib/money/rates.ts` (Frankfurter client).
- `NotYetBuilt` component: Trip page no longer shows placeholder sections.

### Testing

- All 263 tests pass (11 test files). New tests cover Money arithmetic, curation staleness and draft generation.

## 0.8.0 — 2026-08-11

Release 8: Multi-user collaboration and anonymous sharing. Enables teams to plan trips together and share curated plans without leaking personal notes.

### Added

**Release 8 — Accounts & Sharing:**

- **Users table** (migration 0009): Email-based user identity. System user "0" owns initial data.
- **Trip ownership** (`owner_id`): Every trip has an owner. Backfilled with system user.
- **Trip collaborators**: Owner can add editors/viewers. Editors can modify trip, viewers can only read.
- **Anonymous share links**: Generate URLs that show only curated data (destination, itinerary, bookings, places). Hide personal notes, priorities, rejected options, comparison weights.
- **Shared trip view** (`/share/[token]`): Read-only curated trip page accessible without login. Includes explanation of what's visible vs hidden.
- **SharingPanel** component: Create/revoke share links with optional notes ("Share with travel buddies", etc).
- Permission checks: `canUserAccessTrip`, `canUserEditTrip` enforce ownership.

### Architecture

**Collaboration model (Decision 1: Option A)**

- Multiple editors per trip
- Changes synchronized across collaborators
- Owner can manage permissions

**Anonymous sharing (Decision 2: Option B)**

- No login required to view shared trips
- Excludes: notes, priorities, rejected destinations, weights
- Includes: destination choice, itinerary, confirmed bookings, saved places

**Curated visibility (Decision 3: Option B)**

- Shared view shows only: destination, itinerary, bookings, places
- Hidden: personal notes, comparison weights, rejected options, search history

## 0.7.0 — 2026-08-11

Complete Release 5 (bookings foundation) and Release 4 (events) plus Release 6 (budget). No API keys added. All Opus work done.

### Added

**Release 5 — Flights & Hotels Booking Layer:**

- **Flight and hotel search storage** (migration 0007, `src/lib/db/searches.ts`). Both stored with retrieval timestamp. Supports any provider via JSON payload. Staleness: fares ≥3d, schedules ≥30d.
- **Flight and hotel booking storage** (migration 0003, `src/lib/db/bookings.ts`). Full CRUD for recording bookings with status (option/tentative/confirmed/cancelled), confirmation numbers, and costs.
- **FlightSearchesPanel** & **HotelSearchesPanel** components. Display stored searches with staleness badges, expandable details, delete capability.
- **SearchComparisonPanel** component. Shows searched itineraries vs curated estimates. Flags material contradictions (≥3h difference or nonstop mismatch) as staleness signals.

**Release 4 — Events Framework:**

- **Trip events** (migration 0008, `src/lib/db/events.ts`). Date-constrained events at trip level (visa deadlines, festivals, school holidays), tagged constraint/opportunity. Full CRUD with validation.
- **EventsPanel** component. Display, add form (ready), delete capability.

**Release 6 — Budget Tracking:**

- **TripBudgetPanel** component. Shows flight costs (booked), hotel costs (booked vs estimated), total trip cost. Compares booked against estimated nightly rate with savings indicator.

### Changed

- Migrations 0007, 0008 now live in schema. Migration 0003 already existed and is now properly utilized.
- Trip page now displays budget, searches, comparisons, and events end-to-end.

### Architecture

All ADRs (0012, 0016) enforced. All critical limits fixed. Null providers (flights, places) work fully. 226 tests, zero lint errors on types/logic.

## 0.6.0 — 2026-08-11

The architectural decisions Release 5 rests on, plus the forecast half of it working
end to end. No API key required, and none added.

### Added

- **Forecasts, live, on a trip inside 16 days.** Shown against the normal in two labelled
  columns and never merged — the normal is what ranked the destination, the forecast is what
  is currently predicted. Outside the window the panel explains _why_ there is no forecast
  rather than rendering empty, and a failed fetch says so instead of quietly showing the
  normal in a forecast's clothing.
- **A flight-search layer** (`src/lib/flights/`) behind an interface with a null
  implementation as the default. Searched itineraries can be compared against the curated
  estimate that ranked the destination, with a material disagreement flagged as a signal the
  route table is stale rather than papered over. Fares carry the moment they were seen.
- **A single `HOME` record** (`src/data/home.ts`). Airports, climate reference, coordinates
  and timezone were three separate New-York assumptions in three files; they are now one
  parameter with one value. The cost of a second home base — a route table per metro — is
  now visible rather than discovered.
- 16 new tests (226 total), including static assertions that neither forecasts nor flight
  data can reach the scoring path.

### Decisions

- **ADR 0016** — live flight data belongs to a chosen trip and **never enters a ranking**.
  Same reasoning as ADR 0012 for forecasts: a comparison that changed depending on when it
  ran would stop being reproducible from its URL, invisibly. It would also bill a search per
  destination per slider move. Rankings stay on the curated route table; searched itineraries
  are what you would book.

### Changed

- "Compared with New York" now reads from the `HOME` record, as does the chart's "at home"
  label and the airport names and notes in both preference forms.

## 0.5.1 — 2026-08-11

The three problems the hard-limits review turned up, all of which were silent.

### Fixed

- **`Trip.departureAirport` fed nothing.** After ADR 0015 the trip page still showed
  "Departs from JFK" while scoring used a separate preference list, so the two could
  disagree. Migration 0006 replaces the column with `origins`, an ordered list that feeds
  scoring. Existing trips are backfilled with their stated airport first and the other two
  behind it.
- **A zero-night stop consumed a calendar day.** `Math.max(nights, 1)` made the derived
  dates disagree with the night count for a stop the UI already flags as a problem, and
  pushed every later stop a day out. A zero-night stop now has `arrive === depart`.
- **An unknown currency silently got two decimals.** Right for most currencies, and a
  factor-of-100 error for a zero-decimal one — ₫450,000 becoming ₫4,500 looks entirely
  plausible. `minorUnitExponent` now enumerates 115 currencies and throws for anything else,
  naming the file to edit. `isKnownCurrency` checks without throwing.

### Changed

- The trip form's free-text airport box is now airport checkboxes, matching the comparison
  form. A code with no route data behind it was the original cause of the ADR 0015 bug.
- 3 new tests (210 total).

## 0.5.0 — 2026-08-11

Departure airports and airlines. The travel figures now respond to where you actually fly
from, which they did not before.

### Fixed

- **The departure airport changed the label and nothing else.** Every journey time in the
  catalog was a JFK figure documented as "the reference departure airport". Setting a trip
  to LaGuardia produced "Nonstop from LGA, about 14h" about routes LaGuardia cannot fly, and
  tested a JFK number against your travel-time ceiling. Journey figures now come from a
  per-airport route table (ADR 0015).
- `compareWithHome` computed the New York wet-day count but did not expose it, so the
  destination page back-derived it from the delta. Now returned directly.

### Added

- **Per-airport routes** for JFK, LaGuardia and Newark across all 27 destinations. Two
  findings the single-airport model hid: **LaGuardia cannot reach anything in the catalog
  nonstop** — every route connects — and **Newark beats JFK for Cape Town and Marrakech**,
  both of which have Newark nonstops and no JFK nonstop. Cape Town is 15.5h from EWR against
  20h via JFK, which is enough to change whether it passes a 17-hour ceiling.
- **Airline and alliance filtering.** Star Alliance, SkyTeam and Oneworld, plus unaligned
  carriers as first-class options — Emirates is the only Dubai nonstop, and JetBlue carries
  much of the Caribbean. Filter by alliance or by named airline.
- **A filter that removes every option says so**, with a serious warning, while still
  producing full numbers so the destination stays comparable. Same principle as the
  travel-time constraint.
- Seasonal nonstops are flagged, so a Marrakech routing that only runs part of the year
  says as much.
- Airports are now a fixed set of checkboxes in preference order, replacing a free-text box
  that invited codes the route table has no data for.
- 31 new tests (207 total).

### Documentation

- **`docs/technical/hard-limits.md`** — a full inventory of every fixed threshold, closed
  set and baked-in assumption in the system, graded by whether being wrong for you would be
  visible or silent. Written because the departure-airport bug was a hard limit nobody had
  written down.

## 0.4.0 — 2026-08-11

Release 3. A trip can now hold the recommendations you have collected, with enough
provenance to know which ones still hold.

### Added

- **Saved places** against a destination and optionally a trip — restaurants, beaches,
  markets, day trips — each with the source that recommended it and the date it was last
  checked.
- **Staleness graded per category.** A restaurant goes stale in eighteen months; a beach
  takes five years, because a beach does not close. A place never checked shows as
  _never verified_, which is a distinct state from stale and a worse one.
- **Re-verification** that refreshes the fetched fields and the date and **cannot touch
  your notes or priority** — enforced by there being no write path that does both.
- Places on a trip **grouped under the stop they fall in**, derived from the destination
  rather than stored, so they survive stops being reordered or removed.
- **Standing destination notes** — a place saved with no trip persists and is offered on
  the next trip there, which is how the catalog improves with use.
- Places surface on the destination page too, across every trip.
- Warnings that escalate as departure approaches: a stale place is a note six months out
  and a problem three weeks out.
- 25 new tests (176 total).

### Decisions

- **ADR 0014** — places are fetched once and persisted, never looked up on a page render,
  and **the API is optional**. There is no key, the null lookup is the supported default,
  and every field is manually enterable. The best recommendations come from people, not
  from a places API.

### Changed

- The destination page is now explicitly dynamic: it reads saved places, so it must not
  prerender. `generateStaticParams` removed, since a database-reading page cannot be
  statically generated.

## 0.3.0 — 2026-08-11

Release 2 closed out, and the load-bearing halves of Releases 5 and 6 built ahead of their
UI. Nothing user-visible changed beyond the transfer correction — this is groundwork with
tests.

### Added

- **Curated transfer overrides** for legs the distance model gets wrong. Krabi to Koh Samui
  now reads 8h rather than 3h: it crosses the peninsula from the Andaman coast to the Gulf,
  which is a bus and a ferry, not a drive.
- **Forecast layer** (`src/lib/climate/forecast.ts`), for Release 5. Separately typed from
  normals and never merged with them: a 16-day horizon that explains itself when a trip is
  outside it, confidence decaying with lead time, and a comparison against the normal that
  keeps both readings whole. A static test asserts the scoring path never imports it, so
  rankings stay reproducible from their URL.
- **Money model** (`src/lib/money/`), for Release 6. Integer minor units with an explicit
  currency, exact allocation that never loses a cent, and conversion that carries its rate
  and the date the rate was taken. Zero-decimal currencies (VND, JPY) handled properly.
- **Budget arithmetic** (`src/lib/money/budget.ts`) answering the two questions a trip
  budget actually has: how much can I still get back, and what do I owe and when. Tracks
  refundable exposure, notices when free cancellation lapses, and flags overdue payments.
- 62 new tests (148 total).

### Changed

- `daysUntil` accepts an optional reference date, so anything date-dependent can be tested
  without the test being a function of the day it runs on.

### Decisions

- **ADR 0011** — the planned Google Routes integration is **withdrawn, not deferred**.
  Routes covers drive/transit/walk, not commercial flights, and only 3 of the catalog's 351
  destination pairs (0.9%) are ground legs. It would have introduced the project's first API
  key and a request-time dependency to improve under 1% of transfers. **Release 2 is
  complete.**
- **ADR 0012** — forecasts are a separate kind of claim and never replace a normal, never
  blend with one, and never reach the scoring engine.
- **ADR 0013** — money is integer minor units with an explicit currency and a dated rate.

### Fixed

- Docs claimed the schema already carried the seams for multi-user. It does not — no table
  has an owner column. Release 8 is re-costed as a migration across every table plus an auth
  decision, and the epic now lists the requirements it is blocked on.

## 0.2.0 — 2026-08-10

Release 2, first half: a trip is no longer a single date range.

### Added

**Itinerary and stops (Phase 4)**

- Trips hold an ordered list of stops, each a catalog destination with a number of nights.
  Stops can be added, removed and reordered.
- Stop dates are derived from the trip's start plus the nights before them, so an itinerary
  always tiles the trip — gaps and overlaps are unrepresentable rather than merely invalid.
  Moving the trip's start date shifts everything for free.
- Night allocation is checked against the trip's own length and reported precisely
  ("3 nights unallocated", "6 nights over") rather than silently corrected.
- **Transfer burden between consecutive stops** — distance, mode, door-to-door hours and a
  plain-language judgement. Modelled so that fixed airport overhead dominates short hops,
  because that is how it actually feels: a 630 km flight costs half a day.
- A stop is flagged when reaching it costs more than 30% of the waking hours it buys — the
  one-night stop after a five-hour flight.
- A trip is flagged when transfers exceed a sixth of its waking hours.
- Each stop shows the climate for **its own** dates. A Vietnam trip now shows Hanoi at 77°F
  and Ho Chi Minh City at 95°F in the same fortnight.
- One-click start from the destination already chosen, for the common single-stop case.

### Changed

- Data warnings gained an optional detail line and a `serious` severity, so a problem can
  say what to do about it rather than only naming itself.
- The trip page's "not built yet" list no longer includes itinerary and stops.

### Fixed

- `parseDate` rejected malformed dates but accepted impossible ones — `2027-13-01` silently
  became January 2028, because `Date.UTC` rolls overflow forward. Now round-trip validated.

### Known limitations

- Transfer times are estimates from great-circle distance plus typical airport overhead, not
  searched routes. Labelled as such wherever they appear. Real routing (Google Routes)
  completes Release 2.
- Deliberate gaps in an itinerary cannot be expressed — a night in transit belonging to no
  stop needs an explicit transit stop type. See ADR 0010.

## 0.1.0 — 2026-08-10

First working version. Covers the MVP: Phase 0 foundation, Phase 1 trip workspace,
Phase 2 comparison engine, and the Phase 3 climate layer the comparison depends on.

### Added

**Foundation (Phase 0)**

- Next.js App Router application shell with navigation, light/dark theming, and a
  provenance page at `/sources`.
- Database schema and self-applying migrations covering the core records — trips,
  candidates, stops, places, sources, flights, hotels, budget items. The MVP reads and
  writes the trip tables; the rest are defined so later migrations stay additive.
- The three-tier separation of measured, curated and personal data, surfaced in the UI
  as a tier mark on every scoring factor.

**Trip workspace (Phase 1)**

- Create, edit, duplicate, archive and delete trips.
- Dates with a flexibility setting, purpose, priorities, notes, traveller count, and a
  configurable departure airport defaulting to JFK.
- Destination shortlists with considering / shortlisted / selected / rejected states.
  Rejections are kept deliberately — knowing what you ruled out is worth as much as
  knowing what survived.
- Trip overview showing dates, nights, destination, estimated hotel cost, planning
  status and next actions, plus explicit placeholders for the parts not yet built.
- Choosing a destination advances the planning status automatically.

**Comparison engine (Phase 2)**

- Deterministic scoring across seven categories — weather, seasonal, travel, lodging,
  experience, practicality and personal fit — each decomposing into named factors with
  their own value, sub-score and weight.
- Side-by-side table, per-destination working, generated pros, cons, verdict, "best for"
  labels assigned within the compared set, confidence rating and data warnings.
- Preferences (dates, ideal temperature, rain tolerance, beach importance, city versus
  resort, activity level, crowd tolerance, hotel budget, travel-time ceiling, category
  weights) held in the URL, so any comparison is a bookmarkable link.
- **Seasonal viability gate** — a destination the catalog rates a poor time to visit has
  its score scaled down, with the multiplier shown. This is the explicit fix for the
  January European-city problem: without it, a bad month scores well precisely because it
  is cheap, quiet and easy to book.
- **Travel time treated as a constraint** — destinations beyond the stated maximum are
  still scored and explained, but never ranked above one that fits.

**Climate (Phase 3)**

- 2015–2024 daily normals for 27 destinations plus a New York baseline, smoothed over a
  ±7-day window so an exact-date lookup rests on roughly 150 observations.
- Exact-date aggregation, monthly profiles, sea surface temperature for coastal
  destinations, and daylight computed from latitude rather than fetched.
- Plain-language readings of what the conditions mean for sightseeing, beaches, outdoor
  dining and daylight, labelled as interpretation rather than measurement.
- Hand-rolled SVG charts: annual temperature and rainfall on a shared x-axis, month-by-
  month suitability, a day-by-day profile for the exact dates, and a diverging comparison
  against New York. No charting dependency.
- Forecasts deliberately excluded until a trip is close enough for them to mean anything.

**Data pipeline**

- `npm run build:data` regenerates the measured tier from Open-Meteo and Nager.Date.
  Resumable, backs off when rate-limited, and fails loudly rather than shipping a gap.

### Known gaps

Stated on `/sources` rather than papered over: Nager.Date has no holiday data for
Thailand, the UAE or the Maldives and omits Tết from its Vietnam list; ERA5 reanalysis
runs wet over small islands; hotel costs are curated estimates, not quotes; flight times
are typical journeys, not searched availability.
