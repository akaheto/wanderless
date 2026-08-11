# Architecture

Current state of the system. Kept accurate rather than historical — for *why* a decision
was made, see `adr/`.

- **Last reviewed**: 2026-08-10

## Shape

A single Next.js 16 application (App Router, React 19, Tailwind 4). Server Components read
data directly; Server Actions handle mutations. There is no HTTP API layer — see ADR 0007.

```
Build time                        Request time
──────────                        ────────────
build-reference-data.ts           Server Component
  ↓ Open-Meteo, Nager.Date          ↓ imports static climate JSON
src/data/generated/  ────────────→  ↓ reads curated catalog (source)
  (bundled)                         ↓ queries libSQL for personal data
                                    ↓ runs scoring engine (pure)
                                  HTML
```

Nothing is fetched from a third party during a request. The only runtime I/O is the
database.

## The three tiers

The organising principle (ADR 0001). Each tier has a different lifecycle and a different
storage mechanism:

| Tier | Lives in | Written by | Refresh |
|---|---|---|---|
| **Objective** | `src/data/generated/` | `npm run build:data` | Wholesale, on demand |
| **Curated** | `src/data/destinations.ts` | Hand, in source control | Reviewed via `curatedOn` |
| **Personal** | libSQL | Server Actions | Never overwritten |

A scoring factor carries its tier, and the UI renders a mark beside it.

## Modules

**`src/lib/domain/types.ts`** — shared types and the tier definitions. Everything else
depends on this; it depends on nothing.

**`src/lib/dates.ts`** — plain `YYYY-MM-DD` strings throughout, parsed at UTC midnight so a
calendar day never shifts with server timezone. The leap-day index (366 fixed slots,
1 Jan = 0, 29 Feb = 59, 31 Dec = 365) is the contract between the build script and the app:
if it changes, every exact-date lookup silently reads the wrong day.

**`src/lib/climate/`** — reads generated normals and aggregates them over a date range.
`solar.ts` computes sunrise, sunset and daylight from latitude via the NOAA algorithm,
handling polar day and night. Daylight is computed, never fetched.

**`src/lib/scoring/`** — the engine. Pure functions, no I/O, no framework dependency.
`engine.ts` scores; `narrative.ts` turns scores into prose using only values the engine
produced; `params.ts` serialises preferences to and from the URL.

**`src/lib/itinerary/`** — assembles a trip's stops into dated legs. Nights are stored;
dates are derived (ADR 0010), so gaps and overlaps cannot occur. `transfers.ts` estimates
what moving between stops costs: great-circle distance is objective, everything derived from
it is a curated heuristic and is labelled as one. Real routing replaces `estimateTransfer`
alone — the `Transfer` shape is the seam.

**`src/lib/db/`** — `schema.ts` holds ordered idempotent migrations applied on first client
use; `trips.ts` and `stops.ts` are the repositories. Tables for unbuilt phases exist so
later migrations stay additive. Stop `position` is always a dense 0-based sequence, because
every mutation renumbers.

**`src/components/`** — `ui.tsx` is the kit; `charts.tsx` is hand-written SVG (ADR 0008).
Only `ThemeToggle` is a Client Component.

## The scoring engine

Seven categories — weather, seasonal, travel, lodging, experience, practicality, personal
fit. Each produces a 0–100 score from named factors carrying their own value, sub-score and
weight. Factor weights within a category sum to 1 (asserted by test).

```
rawOverall = Σ (categoryScore × categoryWeight) / Σ categoryWeight
gate       = 0.6 + 0.4 × clamp(meanSuitability / 2.5, 0, 1)
overall    = round(rawOverall × gate)
```

Two rules do the product's real work:

- **Seasonal gate** (ADR 0004) scales the total down for a poorly-rated month. It can only
  reduce, never improve — asserted across the catalog.
- **Travel limit** (ADR 0009) partitions the sort: over-limit destinations rank below every
  compliant one regardless of score, while still being scored and explained.

The engine is deterministic. Same brief, same order, every time.

## State

Comparison state lives entirely in the URL — dates, destination selection, every preference
and weight. A ranking is therefore a bookmarkable, shareable link, and the comparison pages
need no client state. Forms are plain `GET` forms; the only React state is a slider's live
readout.

Trip state lives in the database and mutates through Server Actions, which validate with
zod and revalidate affected paths.

## Data pipeline

`scripts/build-reference-data.ts` fetches ten years of daily observations per destination
(Open-Meteo ERA5 archive; marine archive for sea temperature), computes day-of-year normals
smoothed over ±7 days, and writes per-destination JSON plus a static import index. Also
fetches public holidays from Nager.Date.

Resumable — skips destinations already built unless `--force`. Backs off and retries on rate
limiting. Fails loudly rather than writing a partial corpus.

## Testing

62 tests (`npm test`, vitest). Three files:

- `dates.test.ts` — the leap-calendar contract, DST-safe night counting, date validation.
- `climate.test.ts` — invariants across the whole generated corpus (lows never exceed
  highs, rain probabilities stay probabilities, coastal destinations have sea temperature
  and inland ones do not), plus solar geometry against known values.
- `engine.test.ts` — score integrity, determinism, and the design-rule regressions: the
  Vietnam March/November inversion, the Thai coasts on opposite monsoons, Stockholm kept
  out of the top half in January, and the travel-limit partition.

The regression tests are the point. They assert behaviour the product exists to guarantee,
and each names the failure it prevents.

## Deployment

Vercel. `DATABASE_URL` and `DATABASE_AUTH_TOKEN` point at Turso; without them the client
falls back to a local file, which will not work on a read-only filesystem. No other
configuration — there are no API keys.
