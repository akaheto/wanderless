# Architecture Decision Records

One file per significant, hard-to-reverse decision. Numbered sequentially, never
renumbered or reused.

## Index

| # | Decision | Status |
|---|---|---|
| [0001](0001-three-tier-data-model.md) | Separate measured, curated and personal data into three tiers | Accepted |
| [0002](0002-deterministic-scoring-engine.md) | Rank with deterministic arithmetic, not a language model | Accepted |
| [0003](0003-curated-catalog-only.md) | Rank only a curated catalog, never arbitrary coordinates | Accepted |
| [0004](0004-seasonal-viability-gate.md) | Gate overall scores on seasonal viability | Accepted |
| [0005](0005-precomputed-climate-normals.md) | Precompute climate normals; exclude forecasts until Release 5 | Accepted |
| [0006](0006-libsql-for-persistence.md) | Use libSQL (SQLite/Turso) for personal data | Accepted |
| [0007](0007-single-nextjs-app.md) | Build as a single Next.js app, not the prescribed Python monorepo | Accepted |
| [0008](0008-hand-rolled-svg-charts.md) | Hand-roll SVG charts instead of using a charting library | Accepted |
| [0009](0009-travel-time-as-constraint.md) | Treat maximum travel time as a constraint, not a scoring input | Accepted |
| [0010](0010-nights-as-itinerary-source-of-truth.md) | Derive stop dates from nights, rather than storing both | Accepted |
| [0011](0011-defer-external-routing.md) | Defer external routing; curate the ground legs instead | Accepted |
| [0012](0012-forecasts-are-a-separate-kind.md) | Forecasts are a separate kind of claim, never merged with normals | Accepted |
| [0013](0013-money-as-integer-minor-units.md) | Money is integer minor units with an explicit currency and a dated rate | Accepted |
| [0014](0014-places-fetch-once-api-optional.md) | Places are fetched once and persisted; the API is optional enrichment | Accepted |
| [0015](0015-routes-per-origin-and-alliance.md) | Model routes per departure airport, with airline and alliance filtering | Accepted |
| [0016](0016-live-flight-data-never-ranks.md) | Live flight data belongs to a chosen trip, never to a ranking | Accepted |

**0003, 0004, 0009, 0012 and 0016 are load-bearing.** They are the rules that stop the engine
producing confidently wrong answers, and each is enforced by a named regression test. Read
them before changing anything in `src/lib/scoring/`, `src/lib/climate/` or
`src/lib/flights/`. 0012 and 0016 are the same rule applied twice: nothing whose value
depends on when you asked may enter a ranking, because a ranking has to reproduce from its
URL.

**0013 is load-bearing for a different reason:** money bugs are silent. Read it before
touching anything under `src/lib/money/`.

## When to write one

For decisions that are costly to reverse, affect multiple components, or that a future
reader would reasonably ask "why did we do it this way?" about.

Skip it for decisions that are small, easily reversible, single-file, or already explained
by an existing convention.

## Rules

- **One decision per ADR.**
- **Don't edit the reasoning of an accepted ADR.** If a decision changes, write a new one
  that supersedes it, and mark the old one `Superseded by NNNN`.
- **Concise.** Context, decision, alternatives, consequences — not a tutorial.
- **State the costs honestly.** An ADR listing only benefits is not a decision record.

See `0000-adr-template.md` for the format.
