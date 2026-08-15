# Epic: Destination intake — one path in, whoever asks

**Status:** planned
**Size:** L
**Depends on:** Phase 0 (data contract), Phase 1c (route generation) — both landed
**Spec:** `docs/technical/specs/destination-data-contract.md`

---

## The problem

A destination can enter the catalog three ways, and they agree about almost nothing.

| Path | Entry point | What it collects | What it enforces |
|---|---|---|---|
| Site | `/destinations/suggest` | a city and country string | nothing |
| Chat | this conversation, editing `destinations.ts` | whatever gets typed | the compiler |
| CLI | `scripts/add-destination.ts` | a manual JSON blob | partial |

The site path is the weakest and the most used. Someone types "Lisbon" into a box; what
arrives is a row in `city_suggestions` with a name and a country, from which a full
`Destination` — 29 contract fields, a climate record, a route entry, an advisory join —
has to be conjured. Every previous attempt to close that gap did it by asking a model to
fill in the blanks, which is how the catalog acquired hotel prices nobody sourced.

**The request is not missing data. It is missing the questions.**

## What changed, and why this is now tractable

Three things landed that did not exist when the current intake was written:

- **The contract** (`src/lib/domain/contract.ts`) declares every field's tier and source.
  Intake no longer has to guess what a complete destination looks like — it can read it.
- **`arrivalAirport` is required** and compiler-enforced. It is also the one field that
  cannot be derived (nearest-airport scored 14/20) and that everything downstream joins
  on. A suggestion without it can never become a destination.
- **Routes generate from three airport tables**, so a new destination costs no new
  requests. Climate and advisories were already keyed automatically.

So the expensive part of onboarding a city is now a small, fixed set of human judgements.
Intake should collect exactly those and derive the rest.

## The goal

One intake path, used by the site, the CLI and this chat alike, that collects the
irreducible human input and refuses to invent the rest.

**Not:** a form that asks for 29 fields. Most are derived or sourced.
**Not:** a model that fills gaps. That is the failure this project exists to prevent.

## What intake must actually ask for

Derived from the contract rather than chosen by hand. Everything else follows.

| Asked | Why it cannot be derived |
|---|---|
| City and country | the request itself |
| **Arrival airport** | measured at 14/20 by derivation; the gateway is a judgement |
| 4★ / 5★ nightly rate | no free API returns trustworthy rates |
| 12 experience/practicality scores | no source publishes `nightlife: 4.5` |
| archetype, tourismTier | editorial |
| summary, month notes | prose |

Everything else — coordinates, timezone, region, coastal, climate, holidays, advisory,
routes, bands, `curatedOn` — is sourced or derived and must never be typed.

## Acceptance criteria

1. Submitting a city from the site produces the same record as adding it via CLI, field for field.
2. Intake asks only for contract fields tiered `editorial` or `human`; the count is read from the contract, not hardcoded.
3. A submission cannot reach the catalog while any blocking field is absent — `checkCompleteness` is the gate, not a second implementation of it.
4. Every editorial field is marked unverified until a person confirms it, and the provenance overlay shows that.
5. Reference data is regenerated as part of intake, not as a follow-up — a destination cannot exist without its climate, route and advisory rows.
6. `catalog-integrity` passes with no new quarantine entries. Intake may never add to a ratchet.
7. Airport selection offers ranked candidates with distances and asks for confirmation; it never auto-selects.

## Stories

- **S1 — Intake schema from the contract.** Derive the question set from `DESTINATION_CONTRACT` so it cannot drift from what a destination needs.
- **S2 — Airport confirmation step.** Show nearby candidates with distance and which New York airports serve them; require an explicit choice. This is where Paris-as-Le Bourget gets caught.
- **S3 — Auto-collect on submit.** Geocode, timezone, coastal, climate, holidays, advisory, routes. Fail loudly and specifically per source.
- **S4 — Review queue.** Admin sees auto-collected data read-only and editorial fields editable, each marked unverified, with `checkCompleteness` blocking publish.
- **S5 — Guided rate entry.** Generate the Booking.com search for the right shoulder-season dates; the admin reads the result and enters it. Slower than an API and honest.
- **S6 — Retire the other paths.** `add-destination.ts` and `destination-data-pipeline.ts` become thin wrappers over the same core, or go.

## Open questions

- **Who can suggest?** Currently any authenticated user. If intake becomes expensive to service, that may want a limit.
- **What does a submitter see afterwards?** Today a suggestion vanishes into a table. A visible status — collected, awaiting review, published, declined — is probably the point of the feature.
- **Does the requester supply any editorial input?** Someone asking for a city often knows it. Their scores would be a *draft* for admin confirmation, never published directly — the same rule as a model's.

## Out of scope

Auto-publishing without review (`REQUIRE_ADMIN_APPROVAL` stays true until the pipeline has a track record); paid data sources; the influencer/social-spots feature.
