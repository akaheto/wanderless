# Spec: Destination Data Contract & Unified Research Pipeline

**Status:** planned
**Size:** L
**Supersedes:** `city-research-process.md`, `research-pipeline-v2.md`
**Author:** drafted 2026-08-15

---

## 1. Problem

Three pipelines currently produce destination records, and they disagree:

| Path | Entry point | Sources | State |
|---|---|---|---|
| Chat / CLI | `scripts/destination-data-pipeline.ts` | manual JSON + Open-Meteo + Kiwi | works, manual-heavy |
| Site v1 | `src/lib/research/city-research.ts` | Tavily + Claude extraction | fail-closed, fragile JSON parse |
| Site v2 | `src/lib/research/city-research-v2.ts` | none — hardcoded stubs | broken, emits fabricated constants |

A city added through the site and the same city added through chat produce different records.

### 1.1 Root cause

The root cause is **not** prompt quality or extraction reliability. It is that the `Destination`
schema mixes three fundamentally different kinds of fact under one flat type, with no structural
enforcement of where each value came from:

- ~60% of fields **can** be sourced from an API (coordinates, timezone, climate normals, flight
  hours and connections, holidays, sea temperature).
- ~40% are **irreducibly editorial**: the seven `experience` sub-scores, the five `practicality`
  sub-scores, `archetype`, `tourismTier`. **No API publishes `nightlife: 4.5`.**

Every pipeline built so far has been asked to emit those editorial numbers anyway. An LLM asked
for a number always returns one. The result is plausible-looking 0–5 scores that feed the ranking
engine with nothing visibly wrong — a **silent** failure mode, and strictly more dangerous than
the visible Nice, France incident, which at least announced itself.

### 1.2 Secondary cause

Data sources are inconsistently implemented. Some are real API clients (`yelp.ts`, `kiwi.ts`,
`hotels/index.ts`); others are partial hardcoded lookup tables that silently return nothing for
any city not on the list. `integrations/travel-warnings.ts` hardcodes **7 countries** — a city in
Argentina renders no advisory section at all. This is why sections are not identical across cities.

### 1.3 What already works

The domain model is sound and should be kept. `Provenance` (`source` / `url` / `verifiedOn` /
`tier` / `note`) with the three-tier objective / curated / personal split is exactly the right
abstraction. `scripts/build-reference-data.ts` already applies it correctly for climate (Open-Meteo
ERA5), sea temperature (Open-Meteo Marine) and holidays (Nager.Date). **That file is the template.**
This spec extends its discipline to the rest of the schema; it does not replace it.

---

## 2. The Destination Data Contract

Every field is declared with a tier, a named source, and an explicit failure behaviour. This table
is the normative contract — the completeness gate (§4) is generated from it.

Tiers: **O** = objective (API, carries `Provenance`) · **D** = derived (pure function of O)
· **E** = editorial (LLM-drafted, human-confirmed) · **H** = human-entered

| Field | Tier | Source | If unavailable |
|---|---|---|---|
| `id` | D | slug of `name` | — |
| `name`, `country` | O | Nominatim | **block** |
| `lat`, `lon` | O | Nominatim | **block** |
| `timezone` | D | lat/lon → tz lookup | **block** |
| `region` | D | country → region table | **block** |
| `coastal` | D | Open-Meteo Marine availability | **block** |
| `area` | E | LLM + confirm | flag |
| `archetype` | E | LLM + confirm | flag |
| `tourismTier` | E | LLM + confirm | flag |
| `summary` | E | LLM prose, grounded | flag |
| `travel.nonstop` | O | Kiwi Tequila | **block** |
| `travel.typicalTotalHours` | O | Kiwi Tequila | **block** |
| `travel.typicalConnections` | O | Kiwi Tequila | **block** |
| `travel.arrivalEase` | E | LLM + confirm (evidence: ground transit) | flag |
| `travel.notes` | E | LLM prose, grounded | flag |
| `lodging.*` | mode-dependent | see §3.5 — pluggable provider | mode-dependent |
| `experience.*` (7) | E | LLM + confirm | flag |
| `practicality.*` (5) | E | LLM + confirm (evidence: §3.3) | flag |
| `seasons[12]` | D | climate + holidays + visitor pattern | **block** |
| `suitability[12]` | D | scoring fn over climate/seasons/risks | **block** |
| `monthNotes` | E | LLM prose, grounded in climate | flag |
| `risks[]` | D+E | climate-derived + advisory-derived | flag |
| `curatedOn` | D | timestamp at publish | — |

**block** = record is `incomplete`, cannot publish, pipeline surfaces the reason.
**flag** = record publishes only after the admin confirms that specific field.

### 2.1 The two invariants

1. **An LLM may never originate a number or a proper noun.** It may only write prose *about*
   values handed to it, or propose an editorial score that a human must confirm before publish.
2. **There is no default value anywhere.** A provider returns `{ value, provenance }` or
   `{ unavailable, reason }`. It never returns a plausible fallback. This is the rule the current
   `city-research-v2.ts` violates most severely — it returns `75°F/55°F` and `11 hours` for every
   city on earth, labelled `"(verified)"`.

---

## 3. API inventory

Budget posture: **free tiers only.**

### 3.1 Already integrated, free, no key

| Need | Provider | Status |
|---|---|---|
| Climate normals | Open-Meteo Archive (ERA5) | working |
| Sea surface temp | Open-Meteo Marine | working |
| Public holidays | Nager.Date | working |
| Geocoding | Nominatim (OSM) | working |
| FX rates | Frankfurter | working |

### 3.2 Already integrated, free tier with limits

| Need | Provider | Limit | Gap |
|---|---|---|---|
| Flights | Kiwi Tequila | free tier | needs `KIWI_API_KEY` set |
| Places / spots | Yelp Fusion | 500/day | wired, not used by research |
| Events | Ticketmaster | free | wired, not used by research |
| Hotel rates | Booking via RapidAPI | small free quota | see §3.5 |

### 3.3 Must be added — all free

| Need | Source | Form | Serves |
|---|---|---|---|
| Visa requirements | `passport-index-dataset` | bundled versioned dataset | `practicality.entryEase` evidence |
| Travel advisories | travel.state.gov RSS | live fetch | `practicality.safetyEase` evidence, `risks[]` |
| Health notices | CDC Travelers' Health RSS | live fetch | `risks[]` |
| Timezone from coords | tz boundary lookup | local package | `timezone` |
| ~~English proficiency~~ | ~~EF EPI~~ | — | **withdrawn — see §3.6.3** |

#### Travel advisories — verified 2026-08-15

`https://travel.state.gov/_res/rss/TAsTWs.xml` — HTTP 200, ~1 MB, **214 items, one per country**,
no key, no rate limit. Item titles are machine-parseable with a fixed grammar:

```
<title>Mongolia - Level 1: Exercise Normal Precautions</title>
<title>Kenya - Level 2: Exercise Increased Caution</title>
```

`Level 1–4` maps directly onto `practicality.safetyEase` evidence and onto `RiskWindow.severity`.
Country name → destination is joined on the ISO code resolved at stage 1.

Supplementary: `https://wwwnc.cdc.gov/travel/rss/notices.xml` — HTTP 200, CDC health notices
(e.g. `Level 2 - Zika in Indonesia`), same parse shape, feeds `risks[]`.

Replacing the 7-country hardcoded `TRAVEL_ADVISORIES` table in `integrations/travel-warnings.ts`
with this feed takes country coverage from **7 → 214** and is the single highest-value fix in this
table — it is the direct cause of missing sections on non-European cities.

#### Visa data — verified 2026-08-15

`passport-index-dataset` (`passport-index-tidy-iso2.csv`) — HTTP 200, **199 rows for the US
passport**, tidy `Passport,Destination,Requirement` format where the requirement is either a
visa-free day count or a categorical string:

```
US,AL,360            # 360 days visa-free
US,DZ,visa required
US,AD,90
```

Bundled and version-pinned rather than fetched live, since it changes rarely and a build-time
dataset cannot fail at request time.

### 3.4 Deliberately dropped

**Tavily.** Web-search-plus-LLM-extraction is the mechanism behind every fabrication incident so
far. Once each field has a structured provider, free-text search has no remaining job in the
pipeline. Removing it eliminates the fragile JSON-parse failure path entirely.

### 3.5 Lodging as a pluggable provider

No free API returns trustworthy 4★/5★ nightly rates. Rather than approximate them — and rather
than hard-wiring today's constraint into the schema — `lodging` is defined as a **swappable
provider with three modes**, selected by one config value. Switching modes must require no change
to the pipeline, the scoring engine, or the contract.

```ts
type LodgingMode = "manual" | "api" | "disabled";
```

| Mode | Source | Tier | Gate |
|---|---|---|---|
| `manual` *(initial)* | admin reads the generated Booking.com URL, enters the rate | H | block |
| `api` *(future, paid)* | Amadeus / Booking-RapidAPI sampled inventory | O | block |
| `disabled` | section omitted entirely from record and UI | — | skipped |

**`manual`** — the pipeline generates a pre-filled Booking.com search URL for the correct
shoulder-season dates (the schema already carries `lodging.bookingSearchUrl`); the admin reads the
actual result and enters the number, stamped `verifiedOn`. Where RapidAPI free quota is available
it may pre-fill a *suggestion*, rendered visibly unconfirmed and never persisted unless accepted.
Slower than an API call, and the correct trade: a human-verified number beats a fabricated one.

**`api`** — drops in behind the same `Fetched<LodgingProfile>` interface as every other provider.
`peakMultiplier` / `lowMultiplier` become genuinely derived from monthly rate sampling instead of
inferred from `seasons`. This is the only mode change that alters field tiers (H → O), so the
backfill in Phase 6 should be re-runnable to upgrade existing entries in place.

**`disabled`** — removes lodging from the product, not just from the pipeline.

#### 3.5.1 What `disabled` actually requires

`lodging` is load-bearing: it is referenced in 11 files and carries **weight 2 of 16** in the
ranking engine. Removing it is not a display toggle. Two pieces of existing design make it
tractable, and both should be used rather than worked around:

1. **The engine already renormalizes.** `scoreDestination` sums the active weights into
   `totalWeight` and divides by it (`engine.ts:579–584`). Setting `weights.lodging = 0` therefore
   redistributes across the remaining six categories correctly, with **no change to the scoring
   math**. Overall scores shift — that is correct behaviour, not a regression — but they stay
   internally consistent and comparable across destinations.
2. **An `unavailable` pattern already exists.** `holidaysDuring` returns `{ holidays, unavailable }`
   rather than a zero or a throw. `scoreLodging` should follow that precedent exactly.

Work required for the mode to be real:

- `Destination.lodging` becomes optional (`lodging?: LodgingProfile`).
- `scoreLodging` returns an unavailable `CategoryScore` when absent; `weights.lodging` is forced
  to 0 so the category cannot contribute.
- The gate skips all `lodging.*` rows.
- The 11 consuming files render nothing rather than an empty section — notably
  `FactorCard.tsx`, `TripBudgetPanel.tsx`, `destinations/[id]/page.tsx`, `share/[token]/page.tsx`.
- `money/budget.ts` falls back to user-entered amounts; `scoring/narrative.ts` drops the
  "Best hotel value" line.

Because `disabled` must remain reachable, **no other field may be derived from `lodging`**. This
is a standing constraint on the contract, not a one-time cleanup.

### 3.6 Where each source's data actually comes from, and how it refreshes

"Free and available" is not the same as "authoritative and current." Each source is recorded below
with its **true publisher**, whether it is primary or a secondary aggregation, and its real refresh
mechanism. Verified 2026-08-15.

| Source | Actually published by | Kind | Refresh mechanism | Real cadence |
|---|---|---|---|---|
| Open-Meteo Archive | ECMWF **ERA5 reanalysis** | primary | re-run `build-reference-data.ts` | ERA5 lags ~5 days; 10-yr normals stable for years |
| Open-Meteo Marine | Copernicus / ECMWF | primary | same | same |
| travel.state.gov RSS | **US Dept of State** | primary, authoritative | live fetch per request | continuous, per country as reviewed |
| CDC notices RSS | **US CDC** | primary, authoritative | live fetch | continuous |
| Frankfurter | **ECB** reference rates | primary | live fetch | daily, weekdays ~16:00 CET |
| Nager.Date | open-source community project | secondary | re-fetch per calendar year | annual; next year lands late in prior year |
| Nominatim | OpenStreetMap contributors | crowdsourced | live | continuous |
| Kiwi Tequila | Kiwi.com's own inventory | primary to them | live | continuous |
| Yelp Fusion | Yelp's own review corpus | primary to them | live | continuous |
| `passport-index` | scrape of **Arton Capital's Passport Index**, a commercial CBI advisory | **secondary, commercial** | re-download CSV from GitHub | **see §3.6.2 — currently 19 months stale** |
| EF EPI | **EF Education First**, a language-training company | **secondary, marketing artifact** | annual PDF, manual extraction | annual — **recommend dropping, §3.6.3** |

#### 3.6.1 The `verifiedOn` rule

> **`verifiedOn` records the date the *source* last updated its data — never the date we downloaded it.**

Downloading a stale file today does not make its contents current. Stamping `verifiedOn` with the
fetch date would launder 19-month-old visa data as fresh-as-of-today, which is a subtler version of
the same failure this whole spec exists to prevent. Every provider must report the source's own
publication or last-modified date, and fail the record if it cannot determine one.

#### 3.6.2 `passport-index` is stale, and this is the honest handling

Repository metadata, checked 2026-08-15:

```
license : MIT
commits : 2026-02-18  Update readme        ← docs only
          2025-01-12  Update 12 January 2025   ← last actual DATA update
```

The dataset self-describes as covering **2019–2025**. Its last real data commit is **2025-01-12,
19 months ago**, and it is a scrape of a commercial product (Arton Capital), not a government
primary source. Visa requirements change.

Handling:

- Stamp `verifiedOn: "2025-01-12"` — the source's date, per §3.6.1.
- Give it a 365-day staleness threshold, which it **already breaches**, so it surfaces as stale
  from the day it lands. That is the correct and honest outcome, not a bug to suppress.
- Use it strictly as *evidence for `practicality.entryEase`*. **Never render it to a traveller as
  entry advice.** A wrong visa answer causes a denied boarding.
- Free primary alternative worth costing in Phase 1: travel.state.gov publishes per-country
  "Entry, Exit and Visa Requirements" pages — US-government authoritative, and precisely scoped to
  US passport holders, which is this product's audience. HTML rather than a feed, so it needs
  parsing, but it is primary where passport-index is not.
- Paid upgrade path if entry data ever becomes traveller-facing: IATA **Timatic** (what airlines
  actually check at the gate) or Sherpa.

#### 3.6.3 Recommend dropping EF EPI

I proposed EF EPI for `languageEase` in the first draft. On inspection it does not meet this
project's bar and I'd rather withdraw it than defend it: it is published by a company that sells
English courses, and it is scored from **self-selected volunteers who chose to take a free online
English test** — not a random population sample. It measures who opts into EF's funnel, not how far
English gets a tourist. There is no API; it ships as an annual PDF.

Recommendation: **drop it**, and leave `languageEase` fully editorial with no proxy. A human
judgement call that is labelled as one is more honest than a number with a bad denominator.

#### 3.6.4 Per-source staleness

`curation/staleness.ts` is sound but tracks only `curatedOn` per destination. It cannot express
"this destination was curated yesterday from a dataset last updated 19 months ago." Extend the
same pattern to sources, with per-source thresholds — a climate normal is fine for years, a travel
advisory stale by 30 days is not:

| Source | Max acceptable age | On breach |
|---|---|---|
| travel.state.gov, CDC | 30 days | refetch automatically |
| Frankfurter FX | 7 days | refetch automatically |
| Kiwi, Yelp | 90 days | refetch on next publish |
| Nager.Date | 365 days | surface for review |
| `passport-index` | 365 days | surface for review *(breached on arrival)* |
| Open-Meteo normals | 1825 days (5 yr) | surface for review |

Reuse `StaleReason` and `filterStale` rather than inventing a parallel mechanism, and surface
source staleness in the same admin view that already shows destination staleness.

### 3.7 Audit of the datasets already shipping

The same provenance-and-refresh test, applied to every stored dataset currently in the repo.
Measured 2026-08-15.

| Stored dataset | Size | Provenance | Claimed date | Real age | Verdict |
|---|---|---|---|---|---|
| `generated/climate/*.json` (54 files) | 816 KB | full `Provenance`: ERA5, URL, tier, smoothing note | `verifiedOn 2026-08-11` | ~4 days | ✅ **gold standard** |
| `generated/holidays.json` | 44 KB | Nager.Date, named in manifest | `generatedOn 2026-08-14` | 1 day | ✅ good |
| `generated/manifest.json` | 260 B | names all 3 sources + `climatePeriod 2015-2024` | 2026-08-14 | 1 day | ✅ good |
| `data/destinations.ts` (46 entries) | 1868 ln | **one global `CURATED_ON`** | `2026-08-13` ×46 | unknowable | ❌ **§3.7.1** |
| `integrations/travel-warnings.ts` | 10 countries | hand-written table | `lastUpdated 2024-08-10` | **2 years** | ❌❌ **§3.7.2** |
| `data/routes.ts` | 262 ln | global `ROUTES_CURATED_ON` | — | acknowledged placeholder | ⚠️ §3.7.3 |

The climate pipeline is not just adequate, it is the model: every other dataset should be judged
against what `build-reference-data.ts` already produces.

#### 3.7.1 A global `curatedOn` constant makes the staleness system inert

```
destinations using `curatedOn: CURATED_ON` : 46
destinations with their own literal date   : 0
```

All 46 destinations share `const CURATED_ON = "2026-08-13"`. `curation/staleness.ts` is
well-written — it distinguishes `overdue` / `never-curated` / `invalid-date`, handles future dates
and `-0` correctly, and sorts by urgency. **And it can never fire.** Editing the file for any
reason invites bumping the constant, which silently re-certifies all 46 destinations as freshly
reviewed, including any that have not been looked at since they were written.

This is the same class of defect as the rest of this spec — a freshness claim that is not backed by
the event it claims to represent — and it defeats precisely the mechanism designed to catch it.

Fix: `curatedOn` becomes **per destination**, written by stage 7 at publish, recording the date a
human actually confirmed that record. The global constant is deleted. Phase 6's backfill sets each
one honestly, and destinations never genuinely reviewed should be stamped `never-curated` rather
than given a flattering date.

#### 3.7.2 The hardcoded advisories are two years stale — highest-consequence item in the audit

```
countries covered : 10   (of 214 published)
lastUpdated       : '2024-08-10'   → 2 years old
```

I flagged coverage (7–10 countries) earlier as the cause of missing sections. The audit shows the
larger problem is **age**: this is *safety* information, two years old, rendered to travellers.
Staleness in climate normals is harmless; staleness in a security advisory is not. Of everything in
this spec, replacing this table with the live State Dept feed (§3.3) has the highest
consequence-per-hour and should lead Phase 1 rather than sit in the middle of it.

#### 3.7.3 `routes.ts` is acknowledged placeholder data

`routes.ts` carries an honest in-file note — *"`verifiedOn` is not decorative. Real schedules
arrive with Amadeus in Release 5"* — and uses the same global-constant pattern as
`destinations.ts`. It feeds `travel.*` scoring via `selectRoute`. It is correctly labelled as
provisional, so it is a lower priority than §3.7.1–2, but it inherits the same per-record
`verifiedOn` fix and should be listed as a known-provisional source in the admin staleness view
rather than presenting as verified.

#### 3.7.4 Catalog drift — 22 failing tests, diagnosed 2026-08-15

**This blocks Phase 2.** The suite has 22 failures across 7 files. They were assumed to be
scoring-engine bugs; they are not. The engine is sound. Every failure traces to the catalog
having drifted away from the reference data and tests that depend on it — the same class of
problem this spec exists to close, showing up as red tests.

**A. A destination was deleted, and the tests still reference it.**

`cape-town` is gone from the catalog. Tests still call `getDestination("cape-town")!`, and the
non-null assertion silences the compiler, so instead of failing to build it fails at runtime as
`Cannot read properties of undefined (reading 'id')` deep inside `dateWindowClimate` and
`selectRoute`. Accounts for the `climate`, `routes` and `engine` failures.

The `!` is the real defect. A lookup that can miss should be handled, not asserted away — this
is `CLAUDE.md`'s fail-fast rule inverted, since the assertion converts a clear compile-time
error into an obscure runtime one.

**B. 26 of 46 destinations have no route table entry.**

```
paris, london, barcelona, amsterdam, madrid, istanbul, prague, vienna,
berlin, florence, venice, athens, budapest, copenhagen, milan, dublin,
edinburgh, munich, brussels, porto, krakow, dubrovnik, nice, naples,
salzburg, reykjavik
```

Every European destination. `selectRoute` falls back to the destination's legacy `travel`
figures, so the app does not crash — but `travel.*` then scores from hand-written numbers rather
than the route table, silently, for **57% of the catalog**. The test asserting full coverage
correctly fails.

This is §3.7.3 worse than described: `routes.ts` is not merely provisional, it is mostly absent.
Fixing it is Phase 1b work — a real flight provider — not a data patch.

**C. `CURATED_ON` is dated in the future.**

```
distinct curatedOn across all 46 : 2026-08-13
curation test pins ASOF          : 2026-08-12
checkStaleness verdict           : invalid-date
```

The global constant was bumped to a date after the test's pinned clock, so every destination now
reports as curated *tomorrow* and `checkStaleness` classifies all 46 as `invalid-date`.

This is §3.7.1 demonstrating itself. A per-destination `curatedOn` written at publish could not
drift this way; a single hand-edited constant can, and did. Note the fix is not to edit the
constant to a plausible past date — that would restore green tests by inventing a review date
nobody performed.

**Prerequisite for Phase 2.** A and C are small. B needs a real provider. Phase 2 derives
`seasons`, `suitability` and `risks`, all of which the engine consumes, so it must not be built
while 57% of the catalog is silently scoring off fallback data.

#### 3.7.5 One open question on the climate stamp

`climate/*.json` carries `verifiedOn: "2026-08-11"` while `manifest.generatedOn` is `"2026-08-14"`.
Under §3.6.1 the stamp should be **ERA5's data cutoff**, not the fetch date. A 3-day gap is
consistent with ERA5's ~5-day publication lag, so this may already be correct — but it is
undocumented which of the two it means. Phase 1 should make the provider state it explicitly.

---

## 4. Pipeline architecture

One core module, `src/lib/research/pipeline/`. Both entry points call the same stages 1–5 and
produce byte-identical records; they differ only in how stage 6 collects confirmation.

```
                    ┌──────────────────────────────────────┐
  site: /destinations/suggest ──┐                          │
                                ├──▶ 1 RESOLVE   Nominatim → lat/lon, country, tz, coastal
  chat: scripts/add-destination ┘    │             fail closed
                                     ▼
                                   2 COLLECT   parallel providers, each returns
                                     │           {value, provenance} | {unavailable, reason}
                                     ▼
                                   3 DERIVE    pure functions only — no LLM
                                     │           seasons[], suitability[], risks[],
                                     │           multipliers, region, bookingSearchUrl
                                     ▼
                                   4 DRAFT     LLM proposes editorial fields against a
                                     │           written rubric; each carries
                                     │           {assumed: true, evidence, confidence}
                                     ▼
                                   5 GATE      completeness check against §2 contract
                                     │           any blocking field missing → `incomplete`
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
                  6a REVIEW (web)               6b REVIEW (CLI)
                  admin/research/[id]           interactive diff
                     └───────────────┬───────────────┘
                                     ▼
                                   7 PUBLISH   full provenance + curatedOn
```

### 4.1 Stage contracts

**1 Resolve.** City string → canonical place. Ambiguity (two Springfields) is an error, not a
guess. Blocks everything downstream.

**2 Collect.** Every provider implements one interface:
```ts
type Fetched<T> =
  | { ok: true;  value: T; provenance: Provenance }
  | { ok: false; reason: string };
```
No provider may return a fallback. Failures are collected and reported, never swallowed — this is
the `fail fast` rule from `CLAUDE.md` applied to data acquisition.

**3 Derive.** Pure, deterministic, unit-testable. `suitability[12]` is a *scoring output*, not raw
data — computing it rather than asking an LLM for it removes twelve fabrication opportunities per
city at a stroke. No network, no LLM.

**4 Draft.** The LLM sees only values already fetched in stages 2–3, plus the rubric. It returns,
per editorial field: a proposed value, the evidence it used, and a confidence. All flagged
`assumed: true`. It is structurally unable to set an objective field.

*Note on the free proxies:* visa data (§3.6.2) and State Dept advisory level are fetched in stage 2
and passed to stage 4 as **evidence inputs** for `entryEase` and `safetyEase`. They inform the
draft; they do **not** auto-set the score, and the human confirm step still applies to every
editorial field. Flag if you'd prefer these two auto-derived instead. `languageEase` has no proxy
and stays fully editorial (§3.6.3).

**5 Gate.** Generated from the §2 table. Returns `complete` or `incomplete` with the exact list of
missing fields and why. A record that cannot pass cannot reach the catalog.

**6 Review.** Objective and derived fields render read-only with their source and fetch date.
Editorial fields render editable, pre-filled with the draft and its evidence. Nothing publishes
until every `assumed: true` flag is cleared.

**7 Publish.** Writes with full provenance and a per-destination `curatedOn` recording the date a
human actually confirmed *this* record (§3.7.1).

---

## 4.2 Build-time provenance overlay *(temporary)*

While the revamp is being built and tested, **every destination card section must state whether it
is backed by real data, and how old that data is at source.** This is a development and review
affordance, not a permanent product surface — it is designed to be switched off in one place.

It is *not* a safety mechanism. The gate (§4, stage 5) is what prevents bad data shipping. The
overlay exists so a human scanning a card can see at a glance which parts to distrust.

### 4.2.1 What already exists

`components/ui.tsx` already has the right primitives, and they should be extended rather than
replaced:

| Primitive | Current state |
|---|---|
| `TierMark({ tier })` | Renders `measured` / `curated` / `yours` with explanatory `title`. **Used in only 2 files — `sources/page.tsx` and `ComparisonView.tsx` — neither a destination card.** |
| `Warnings({ warnings })` | Severity dot + `sr-only` prefix so severity is never colour-alone. Used in 5 components. |
| `ConfidenceBadge` | Maps high/medium/low onto `Badge` tones. |
| `Badge({ tone })` | Themed, token-based. |

Two ad-hoc date renderings exist on the detail page — `Curated ${d.curatedOn}` and
`${HOLIDAY_SOURCE.source}, fetched ${verifiedOn}`. Note that "fetched" is the wrong semantic under
§3.6.1; it should read as the source's own date.

### 4.2.2 Requirement A — mark anything not backed by real data

`Tier` (`objective | curated | personal`) is a domain concept and should not be overloaded. Add a
separate build-time status that describes a *field instance*, not a category of knowledge:

```ts
type FieldStatus =
  | "sourced"      // objective or derived, provenance present        → no mark
  | "confirmed"    // editorial, a human cleared assumed:true         → "curated"
  | "unconfirmed"  // editorial, still assumed:true — LLM draft       → LOUD
  | "placeholder"  // acknowledged provisional source, e.g. routes.ts → LOUD
  | "missing";     // contract field absent entirely                  → LOUD
```

Rendering rules:

- `sourced` — no mark. The absence of a mark is the quiet default, so marks mean something.
- `confirmed` — existing `TierMark tier="curated"`.
- `unconfirmed` / `placeholder` / `missing` — a visually loud mark **plus** the reason, routed
  through `Warnings` at `warning` severity so it inherits the existing `sr-only` treatment.
  Severity must never be carried by colour alone — match what `Warnings` already does.

Every section of the destination card carries one, including sections that are currently
unmarked. A card with no marks anywhere is the goal state, and should be visibly achievable.

### 4.2.3 Requirement B — show the age of the data at source

A `<DataAge>` primitive rendering the source name, the source's own date (**never the fetch date**,
§3.6.1), and a relative age, toned against that source's threshold from §3.6.4:

```
ERA5 · 2015–2024 normals · 4d          neutral
State Dept · 3d                        neutral
Kiwi · 12d                             neutral
passport-index · 19mo                  warning  — breaches 365d threshold
routes.ts · provisional                serious  — no real source yet
```

Reuse `curation/staleness.ts` for the age arithmetic rather than duplicating date maths — it
already handles invalid and future dates and normalises `-0`. Extend it per §3.6.4 with
per-source thresholds; do not write a parallel mechanism.

### 4.2.4 How it gets switched off

One environment variable, read once and threaded down as a prop:

```
NEXT_PUBLIC_DATA_PROVENANCE_OVERLAY = 1   # dev + preview, during the revamp
                                     = 0   # production, once §4.2.5 is met
```

Environment-driven rather than a code constant so dev and preview can differ from production
without a deploy, and so switching it off is a config change rather than a diff across the card
components. It follows the existing `research-config.ts` flag pattern.

Because these components take theme tokens (`text-ink-3`, `border-line`, `--warning`), they must
not use raw Tailwind palette classes — the surrounding rebrand work is already removing those.

### 4.2.5 When the overlay comes out

The `unconfirmed` / `placeholder` / `missing` marks are removable when acceptance criteria 7 and 9
hold — every destination passes the gate or is explicitly incomplete, and no stale-beyond-threshold
source is being served. **`DataAge` is worth keeping permanently** in a quieter form: it is the
visible half of the provenance guarantee, and the thing that makes a stale source self-announcing
rather than silent. Decide that at the point of removal, not now.

---

## 5. Phased plan

| Phase | Deliverable | Size | Depends on |
|---|---|---|---|
| **1a** | **Live State Dept + CDC advisory feeds** replacing the 2-year-old 10-country table (§3.7.2) | S | — |
| **0** | Contract module: §2 as executable TS, gate generated from it, unit tests | S | — |
| **0b** | **Provenance overlay** (§4.2): `FieldStatus`, `DataAge`, `TierMark` on every card section, behind `NEXT_PUBLIC_DATA_PROVENANCE_OVERLAY` | M | 0 |
| **1b** | Provider layer: uniform `Fetched<T>`, port existing clients, add visa + tz, per-source `verifiedOn` (§3.6.1) | M | 0 |
| **1c** | **Catalog drift repair** (§3.7.4): remove the `cape-town` references and the `!` assertions hiding them, restore route coverage, resolve the future-dated `CURATED_ON` | M | 1b |
| **2** | Derivation: `seasons`, `suitability`, `risks`, multipliers as pure tested functions | M | 0, **1c** |
| **3** | Editorial drafting: rubric, `assumed`/`evidence`/`confidence`, LLM confined to stage 4 | M | 0,1b,2 |
| **4** | Gate + `incomplete` status end-to-end; per-source staleness (§3.6.4) | S | 0–3 |
| **5** | Both entry points on the shared core; site UI and CLI produce identical records | M | 0–4 |
| **5b** | Lodging mode switch: `manual` / `api` / `disabled` wired end-to-end (§3.5.1) | M | 5 |
| **6** | Per-destination `curatedOn` (§3.7.1); audit + backfill all 46; diff report of every mismatch | L | 0–5 |
| **7** | Delete dead paths: `city-research-v2.ts`, `city-research.ts`, Tavily, hardcoded advisory table, global `CURATED_ON` | S | 6 |

**Phase 1a is deliberately sequenced first and has no dependencies.** It is small, it is the only
item touching safety-critical data, and the 2-year-old advisories are live in production today. It
should not wait behind the contract work.

**Phase 0b lands early on purpose.** The overlay is what makes every later phase testable — once
it is on, the effect of each provider landing is directly visible on the cards, and any field still
running on drafted or placeholder data announces itself instead of having to be hunted for. Built
late it would be documentation; built early it is the instrument for the rest of the work.

Phases 1b and 2 are independent and can run in parallel after 0.

### 5.1 Phase 6 detail — auditing the existing 46

The backfill re-derives every objective and derived field for all 46 destinations and diffs against
what is currently committed. Expected outcomes per field: **match** (confirms the existing value),
**mismatch** (existing value was wrong — correct it), **unsourceable** (no provider covers it —
promote to editorial and confirm).

This is the phase that answers the question underneath this whole revamp: *which of the numbers
already in the catalog were guesses?* It should be run as a report first, reviewed, then applied —
not applied blind.

---

## 5.2 Adding a destination must stay a one-step operation

A `Destination` is not self-contained. It is the hub of several separately-generated
reference datasets, and adding one means adding a row to every dataset that keys off it:

| Dataset | Keyed by | Populated by | On miss today |
|---|---|---|---|
| Climate (`climate/*.json`) | `destination.id` | `npm run build:data` | **throws**, with instructions |
| Routes (`routes.ts`) | `destination.id` | hand-maintained | silent fallback to `travel.*` |
| Advisories (`advisories.json`) | `destination.country` | `npm run build:advisories` | "unavailable" card |
| Holidays (`holidays.json`) | country code | `npm run build:data` | — |

Nothing enforced this, which is why the catalog drifted (§3.7.4). Note the inconsistency in
the last column: `climateFor` throws with a fix instruction, while `routesFor` returns
`undefined` and lets `selectRoute` quietly substitute hand-written figures. **Loud is
correct**; the silent one is how 57% of the catalog came to score off fallback data
unnoticed.

`tests/catalog-integrity.test.ts` holds every dataset to the loud standard regardless of how
its own lookup behaves, so drift fails in CI rather than surfacing later as a stack trace in
an unrelated module. It asserts: unique slug-shaped ids, climate present, routes present,
country resolves to an advisory, no orphaned reference data, and no future-dated `curatedOn`.

### 5.2.1 The quarantine ratchet

The invariants are introduced against a catalog that already violates them — 26 destinations
without routes, one country without an advisory. Rather than defer the guard until the
backlog clears, the known gaps are enumerated in the test under two rules:

1. **It may only shrink.** A newly added destination must never be listed. That is the point:
   existing debt is capped, new debt is impossible.
2. **It is self-cleaning.** An entry that no longer needs quarantine *fails the suite*, so
   fixing a gap forces its removal instead of leaving the list to rot.

Verified by injecting a synthetic destination with no reference data: the guard produced
three failures naming the missing dataset and the command that populates it.

Regenerating reference data is therefore part of adding a destination, not a follow-up —
and Phase 5's shared pipeline should run these same assertions as its stage-5 gate, so the
site and CLI paths inherit the guarantee rather than reimplementing it.

---

## 6. Acceptance criteria

1. The same city added via the site and via CLI produces byte-identical records apart from `curatedOn`.
2. Every published field carries a `Provenance` naming a real source, with `verifiedOn` set to the
   **source's** last-update date, not the fetch date (§3.6.1).
3. No code path can emit a numeric or proper-noun value originated by an LLM.
4. No provider returns a default on failure; every failure is surfaced with a reason.
5. A record missing any blocking field cannot be published, from either entry point.
6. Every editorial field is `assumed: true` until a human clears it.
7. All 46 existing destinations either pass the gate or are explicitly marked incomplete.
8. `curatedOn` is per-destination and written only when a human confirms that record; the global
   `CURATED_ON` constant no longer exists (§3.7.1).
9. Travel advisories resolve for **all 214 published countries**, not a hardcoded subset, and no
   advisory older than 30 days is served (§3.6.4).
10. Every stored dataset declares its true publisher and whether it is primary or secondary, and
    breaching its staleness threshold surfaces it for review rather than failing silently.
11. Setting lodging mode to `disabled` removes the section from record, scoring and UI with no
    residual references and no broken layout (§3.5.1).
12. With the overlay on, **every** destination card section renders a `FieldStatus`, and any
    section that is `unconfirmed`, `placeholder` or `missing` is visibly marked with its reason —
    never by colour alone (§4.2.2).
13. Every card section renders a `DataAge` showing the **source's own** date and relative age,
    toned against that source's staleness threshold (§4.2.3).
14. Setting `NEXT_PUBLIC_DATA_PROVENANCE_OVERLAY=0` removes the overlay completely, with no layout
    shift and no residual marks (§4.2.4).
15. `npm run type-check`, `npm run lint`, `npm run test` pass; derivation functions have unit tests.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Kiwi free tier insufficient for 46-city backfill | Batch over days; cache aggressively; results are static per route |
| Yelp 500/day cap during backfill | Same — throttle, cache, backfill is one-time |
| Hotel rates stay manual → adding a city is slow | Accepted trade-off under free-tier. Guided URL workflow keeps it to two lookups per city |
| passport-index / EF EPI datasets go stale | Bundle versioned with `verifiedOn`; staleness surfaced by existing `curation/staleness.ts` |
| Phase 6 reveals many bad existing values | That is the point. Report-first, apply-after-review |

---

## 8. Out of scope

Paid data sources (Amadeus, Numbeo, Google Distance Matrix); the influencer/social-spots feature
(depends on the Yelp/Places provider landing in Phase 1, then specced separately); catalog code
generation from approved records (`AUTO_ADD_TO_CATALOG` stays false).
