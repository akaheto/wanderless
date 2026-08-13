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

---

### Epic: Destination discovery & curation
- **Status**: planned
- **Release**: TBD (post-7)
- **Goal**: Expand the destination catalog beyond 47 cities and enable community contributions for catalog growth.
- **Why now**: Catalog is underrepresenting Africa, South Asia, and Southeast Asia; community suggestions can accelerate regional expansion.
- **Scope**:
  - Curated expansion to 100+ destinations (Phase 1: manual curation of underrepresented regions)
  - User-facing "Suggest a destination" form in the catalog page
  - Admin moderation dashboard for pending suggestions
  - Auto-validation: duplicate checks, geocoding, basic feasibility checks
  - Integration with research automation (ADR 0013) for data pipeline
  - Community voting on suggestions (future phase)
- **Out of scope**: Crowdsourced content (tips, photos) — Phase 2 work.
- **Acceptance criteria**:
  - [ ] Catalog grows to 100+ cities with balanced regional coverage
  - [ ] Users can submit destination suggestions from the app
  - [ ] Suggestions are validated and require admin approval before curation
  - [ ] Approved suggestions trigger automatic climate/rating data fetch
  - [ ] Users notified when their suggestion is approved
- **ADRs**: 0013 (curation workflow)
- **Stories**: `STORY-destination-catalog-expansion.md`

---

### Epic: Authentication, authorization & compliance
- **Status**: planned
- **Release**: TBD (post-7)
- **Goal**: Enforce authentication, implement role-based access control, and maintain audit logs for compliance and security.
- **Why now**: App is currently accessible without login; admin features needed for account management; audit logs required for compliance and debugging.
- **Scope**:
  - Enforce authentication on all routes (no unauthenticated access)
  - Email verification and new-account notifications
  - Three-tier role system (user / admin / owner) with permissions
  - Complete audit logging of user and admin actions
  - Admin dashboard for monitoring and compliance
- **Out of scope**: Multi-factor authentication (future), IP whitelisting (future), advanced threat detection (future).
- **Acceptance criteria**:
  - [ ] All protected routes require authentication
  - [ ] Unauthenticated users redirected to login
  - [ ] Email notifications work for verification and new accounts
  - [ ] Admin can view audit logs and user list
  - [ ] Role-based access control enforced on API and frontend
  - [ ] Audit logs retained for 90+ days
  - [ ] Admin dashboard accessible only to admin+ users
- **ADRs**: 0006 (auth tier separation)
- **Stories**: `STORY-authentication-enforcement.md`, `STORY-email-notifications.md`, `STORY-access-levels.md`, `STORY-audit-logs.md`, `STORY-admin-dashboard.md`, `STORY-email-resend.md`, `STORY-compliance.md`

---

### Epic: Admin Features and Compliance

- **Status**: planned
- **Release**: TBD (post-14)
- **Goal**: Build admin dashboard for user management and compliance reporting; implement data export, account deletion, and email resending for GDPR/SOC 2 compliance
- **Why now**: These are non-negotiable for enterprise usage, legal compliance, and trust with users
- **Scope**:
  - Admin dashboard with user list, audit logs, system health, analytics
  - Resend verification emails with rate limiting
  - Account deletion with 7-day grace period
  - User data export (ZIP format with all personal data)
  - Compliance reports for auditors
  - Data anonymization for deleted users
- **Acceptance criteria**:
  - [ ] Admin dashboard built and tested
  - [ ] Verification email resending works with rate limiting
  - [ ] Account deletion with grace period implemented
  - [ ] Data export generates valid, portable JSON/ZIP
  - [ ] Compliance reports exportable to PDF
  - [ ] GDPR Article 17 (Right to Erasure) satisfied
- **ADRs**: (none yet)
- **Stories**: `STORY-admin-dashboard.md`, `STORY-email-resend.md`, `STORY-compliance.md`

---

### Epic: Visual Identity Redesign & Rebranding

- **Status**: planned
- **Release**: TBD (post-Compliance)
- **Goal**: Transform from sterile "Travel Intelligence Hub" to a memorable, visually engaging brand with travel-themed aesthetic and distinctive personality
- **Why now**: Current branding doesn't reflect the product's power or appeal. A cohesive visual identity increases memorability, user engagement, and positions app as premium travel planning tool
- **Scope**:
  - **Phase 1**: Brand naming strategy (20+ candidates → 1 winner)
  - **Phase 2**: Visual design system (colors, typography, illustrations, imagery)
  - **Phase 3**: Implementation rollout across all pages
  - **Phase 4**: Polish, refinement, brand guidelines
- **Key decisions**:
  - New name: TBD (recommendation: Wanderwise)
  - Color palette: Warm adventure theme (sunset orange, deep teal, cream)
  - Imagery: Curated travel photography + custom illustrations
  - Patterns: Subtle travel-themed watermarks (maps, passports, compasses)
- **Acceptance criteria**:
  - [ ] Brand name finalized with domain registered
  - [ ] Logo designed and approved (3+ concepts)
  - [ ] Design system in Figma with components
  - [ ] 50+ travel images sourced/created
  - [ ] All pages updated with new branding
  - [ ] Dark mode variants tested and approved
  - [ ] Brand guidelines documented
  - [ ] User feedback positive (engagement metrics improved)
- **ADRs**: (design system decisions TBD)
- **Stories**: `STORY-brand-naming.md`, `STORY-visual-design.md`, `STORY-branding-implementation.md`
- **Non-Goals**: Logo animation, mascot, marketing site redesign (Phase 2 work)
