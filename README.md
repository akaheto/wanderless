# Travel Intelligence Hub

A private, single-user trip-planning workspace. It answers the first two questions of the
product vision:

1. **Where should I go?**
2. **How do several destinations compare for my dates?**

Questions 3 and 4 — how to structure the trip, and what to do once you decide — are later
releases. The data model for them already exists (see `src/lib/db/schema.ts`), the screens
do not.

Full documentation is in [`docs/`](docs/README.md) — [charter](docs/pm/charter.md),
[vision](docs/pm/vision.md), [roadmap](docs/pm/roadmap.md),
[architecture](docs/technical/architecture.md), [decisions](docs/technical/adr/README.md),
[user guide](docs/user/user-guide.md).

## What is built

| Phase | Scope | Status |
|---|---|---|
| 0 | Product foundation — records, principles, app shell | Done |
| 1 | Trip and destination workspace | Done |
| 2 | Destination comparison engine | Done |
| 3 | Climate and seasonal intelligence | Done (normals; forecasts deliberately excluded) |
| 4–10 | Itinerary, places, restaurants, flights, budget, research, sharing | Not started |

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

The database is created on first use at `./data/tih.db` and migrates itself.

```bash
npm test             # 62 tests
npm run lint
npm run type-check
npm run build
npm run build:data   # refetch climate + holidays (see below)
```

## The three tiers

The central design commitment. Every number in the app belongs to exactly one tier, and
they never blur together:

- **Measured** (`src/data/generated/`) — fetched from a named source with a date.
  Regenerated wholesale by `npm run build:data`; never edited by hand.
- **Curated** (`src/data/destinations.ts`) — editorial judgement shipped with the app.
  Seasonal ratings, cost bands, how long the flight really takes. Each destination carries
  a `curatedOn` review date.
- **Personal** (the database) — trips, notes, shortlists, rejections, weightings. A data
  refresh cannot touch it. Nothing generated overwrites it.

The UI marks each factor with its tier, and `/sources` explains the whole arrangement
along with the known gaps.

## The comparison engine

`src/lib/scoring/engine.ts`. Deterministic — no model in the loop, so a ranking can be
argued with rather than merely trusted. Seven categories, each decomposing into named
factors that carry their own value, sub-score and weight. Nothing contributes to a total
without being shown.

Two rules exist specifically to prevent the failure mode that motivated the product:

- **Seasonal viability gate.** A destination the catalog rates a poor time to visit has
  its score multiplied down, and the multiplier is shown. Without it, a bad month ranks
  well *because* it is cheap, quiet and easy to book — which is how a January ranking
  surfaces a city with six hours of daylight.
- **Travel time is a constraint, not a hint.** Anything beyond your stated maximum is
  still scored and explained, but never ranked above something that fits.

Both are covered by regression tests in `tests/engine.test.ts`.

## Refreshing the data

```bash
npm run build:data           # skips anything already built
npm run build:data -- --force # refetch everything
```

Fetches ten years of daily observations per destination from Open-Meteo, computes
day-of-year normals smoothed over a ±7-day window, and writes them to
`src/data/generated/`. Also fetches public holidays. The run is resumable and backs off
when rate-limited. It fails loudly rather than shipping a gap.

Nothing is fetched at request time, so a page render never depends on a third party.

## Sources in use

All free, all keyless — the app has no secrets to manage.

- Open-Meteo ERA5 archive — temperature, rainfall, humidity, sunshine (2015–2024)
- Open-Meteo marine archive — sea surface temperature
- Nager.Date — national public holidays

Planned keyed integrations (maps, places, flights, hotels, events) are listed on
`/sources` against the release that needs them. None are called today.

## Deploying

Set `DATABASE_URL` to a Turso URL and `DATABASE_AUTH_TOKEN` to its token. Vercel's
filesystem is read-only, so the default local SQLite file will not work there. No other
configuration is required.

## Layout

```
scripts/build-reference-data.ts   regenerates the measured tier
src/data/destinations.ts          the curated catalog — the only places ever ranked
src/data/generated/               measured data + a static import index
src/lib/domain/types.ts           shared types, and the tier definitions
src/lib/climate/                  normals, date-window aggregation, solar geometry
src/lib/scoring/                  the engine, the narrative generator, URL state
src/lib/db/                       schema, migrations, trip queries
src/components/charts.tsx         hand-rolled SVG, no charting dependency
tests/                            62 tests, including the design-rule regressions
```
