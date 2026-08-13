# Project Charter

The single source of truth for scope, objectives, and constraints. When in doubt about
what's in scope or who decides what, this document wins — other docs elaborate on it but
don't override it.

- **Status**: active
- **Last reviewed**: 2026-08-12

## Objective

Replace the scattered apparatus of trip planning — spreadsheets, browser tabs, saved
links, half-remembered advice — with one structured record per trip that survives being
put down for a month and picked back up.

The outcome is a **decision you can defend to yourself later**: not just where to go, but
the reasoning that got you there, still legible when the trip is over and you are deciding
where to go next.

## Scope

**In scope:**

- Deciding where to go for specific dates, against a curated catalog of real destinations.
- Comparing candidate destinations on evidence, with the working shown.
- Holding the full record of a trip — dates, candidates, decisions, rejections, notes,
  itinerary, places, bookings, budget — in one place.
- Measured reference data (climate, holidays) refreshed by script and dated.
- Personal judgement captured as first-class data, never overwritten by a refresh.

**Explicitly out of scope:**

- **Becoming a booking engine.** The product informs decisions and records what was
  booked. It never transacts, holds payment details, or acts as agent of record.
- **Recommending destinations outside the curated catalog.** See ADR 0003.
- **Predicting weather.** Historical normals only, until a trip is near enough that a
  forecast means something. See ADR 0005.
- **Social features** — reviews, feeds, follower counts. Sharing (Phase 10) means giving
  a specific person a link, not building a network.
- **Real-time price tracking or fare alerts.** Prices are recorded when observed, with the
  date observed. The product does not poll.
- **Multi-user collaboration** in the current phase. The data model must not preclude it
  (Phase 10), but no work is done for it now.

## Success criteria

1. **The spreadsheet is gone.** A destination decision can be made end to end in the app,
   with nothing kept on the side. *(Met for Release 1.)*
2. **A ranking can be argued with.** Every score decomposes into named factors with visible
   weights, so disagreement lands on a specific factor rather than on the tool. *(Met.)*
3. **No plausible-but-wrong answers.** A destination that is a bad idea for the dates never
   ranks well because it is cheap and quiet. *(Met — see ADR 0004.)*
4. **The record survives the gap.** A trip picked up after two months explains itself
   without recall — including what was rejected and why. *(Met for the decision phase;
   extends through Phases 4–8.)*
5. **You can always tell where a number came from.** Measured, curated and personal data
   are visibly distinct at the point of use, not just in a footnote. *(Met.)*

## Stakeholders & decision rights

| Role | Who | Decides |
|---|---|---|
| Sponsor | Ben | Scope changes, phase order, what ships |
| Owner | Ben | Day-to-day priority, editorial content of the curated catalog |
| Contributors | Claude | Implementation approach, technical decisions (recorded as ADRs) |

Single-user project: sponsor and owner are the same person. The distinction is kept
because Phase 10 introduces other readers, and because it clarifies that **curated
editorial judgement is the owner's call, not the implementer's** — Claude may draft
seasonal ratings and cost bands, but they are the owner's to accept.

## Constraints

- **No paid APIs while the product is private.** Every integration in Releases 1–2 must be
  free and keyless. Keyed services are deferred to the release that genuinely needs them,
  and are listed on `/sources` before they are used.
- **No secrets to manage.** A consequence of the above, and worth preserving as long as
  possible: the app currently has no API keys, so there is no rotation, leakage or
  local-setup burden.
- **Single user, single writer.** No concurrency handling beyond what SQLite gives free.
- **Deployment target is Vercel**, whose filesystem is read-only — so anything written at
  runtime goes to Turso, and anything derived goes into the bundle at build time.
- **Reference data is regenerated wholesale, never patched.** A partial refresh that leaves
  the corpus internally inconsistent is worse than a stale one.

## Milestones

| Milestone | Phases | Target | Status |
|---|---|---|---|
| **Release 1** — decide where to go | 0, 1, 2, 3 | 2026-08-10 | **Done** |
| **Release 2** — structure the trip | 4 | 2026-08-11 | **Done** |
| **Release 3** — places worth going | 5 | 2026-08-11 | **Done** |
| **Release 4** — time-bound things | 6 | 2026-08-11 | **Done** |
| **Release 5** — getting there and staying | 7 | 2026-08-11 | **Done** |
| **Release 6** — what it costs | 8 | 2026-08-11 | **Done** |
| **Release 7** — research automation | 9 | 2026-08-12 | **Done** |
| **Release 8** — accounts and sharing | 10 | 2026-08-11 | **Done** |

Dates are deliberately absent past Release 1. This is a personal project with no external
commitment; sequencing is fixed, timing is not.

## Related

- Problem framing: `docs/pm/vision.md`
- Day-to-day priorities: `docs/pm/roadmap.md`
- Work breakdown: `docs/pm/backlog/epics.md`
- Decisions: `docs/technical/adr/`
