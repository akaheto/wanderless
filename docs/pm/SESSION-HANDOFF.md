# Handoff — 2026-08-15

Where things stand, and what to do next. Read this first in a new session.

---

## State

**Branch:** `fix/provider-unconfigured-audit` (PR #2 merged; later commits pushed on top)
**Tests:** 378 passing, 12 skipped, 0 failing — from 260 passing with 22 failing at session start
**Deployed:** yes, production, mid-session. Later commits are **not** deployed.

Run `npm run check:providers` first in any new session — it reports which external
sources are live, dormant or broken in about five seconds, and it is how the fabricating
hotel provider would have been caught months earlier.

---

## The one thing to understand

Most of a destination is **not measured**. The contract now says so out loud:

- **sourced/derived** — coordinates, timezone, climate (ERA5), holidays, advisories, routes, bands
- **editorial** — the seven `experience` scores, five `practicality` scores, `archetype`,
  `tourismTier`, `seasons`, `suitability`, `risks`, all prose
- **human** — the two hotel rates

Five of nine sections on a destination page are unconfirmed editorial judgement, and until
this session the app rendered them identically to ERA5 climate normals. That is how a
fabricated hotel price survives review: it looks exactly like a measured one.

Set `NEXT_PUBLIC_DATA_PROVENANCE_OVERLAY=1` to see it.

---

## Shipped this session

| | |
|---|---|
| Travel advisories | hand-written table of 10 countries, 2 years stale → **live feed, 212 countries** |
| Hotel search | **served invented hotels in production** → declines honestly when unconfigured |
| Route table | 26 destinations with no entry → **all 46**, generated from airport tables |
| `arrivalAirport` | did not exist → required, compiler-enforced, 45 of 46 confirmed against real NYC networks |
| Journey length | a fabricated precise figure → **bands**, validated 40/40 |
| Data contract | a markdown table → **executable**; a field without provenance fails CI |
| Provider contract | private to one client → shared, with per-source staleness |
| Temperatures | weather panel in **°C** beside everything else in °F → all °F, with four guards |
| Influencer spots | `{name, type, description}` → **citations required** |
| Test suite | 22 failing → 0 |

---

## Pick up here

### 1. Deploy what is unshipped
Several commits landed after the mid-session deploy. Vercel git integration was connected
but **has not yet been exercised by a push** — verify it auto-deploys rather than assuming.
If not, `npx vercel --prod`.

### 2. Phase 6 — audit the catalog's own numbers ← *the real work*
This is the original problem and everything else was scaffolding for it. The hotel prices
and twelve 0–5 scores per destination came from a bulk "expand to 49 cities" commit and
have never been verified.

The method is proven — it is what the route generator did:

1. Re-derive every objective field for all 46 from its provider
2. Diff against what is committed
3. **Report first, apply after review.** Never overwrite a human-verified value with a
   parser's miss; the route builder logs disagreements and keeps the curated value
4. Whatever cannot be sourced gets promoted to editorial and marked unverified

Expect it to find real errors. That is the point.

### 3. Influencer spots pipeline
The gate is in (`src/lib/domain/spots.ts`); nothing fills it yet. **Deliberate** — build
the pipeline in fresh context.

Sources, verified today:
- **Closed or paid:** Instagram (public location search removed ~2020), TikTok (Research
  API is academic-only), Google Places and Yelp (paid — Yelp is a 30-day trial, not free)
- **Free and accessible:** YouTube Data API v3, Reddit, Wikivoyage (keyless, same
  MediaWiki API used for airports), TripAdvisor Content API

Start with one destination and one source end to end — Wikivoyage for Stockholm, since it
is keyless and confirmed responding. Note that large cities split listings across district
sub-articles. Then add YouTube and Reddit; ranking emerges from corroboration count.

### 4. Smaller, well-defined
- **Delete `city-research-v2.ts`** — pure stubs that return hardcoded values labelled
  `"open-meteo.com (verified)"` for data they invent. Still imported by
  `/api/admin/research/[id]/draft`. Phase 7.
- **Airlines for the 26 new route entries** — not extracted; attribution needs the table's
  row structure, which interleaved citations make fragile. Empty lists match what the old
  fallback gave them, so nothing regressed, but alliance filtering is thin there.
- **`CURATED_ON` is one global constant** across all 46, so staleness detection cannot
  fire. Fixing it means per-destination dates written at publish — part of Phase 6.
- **5 pre-existing lint errors** in `hotels.test.ts` and `offline.test.ts`, untouched all
  session.

---

## Rules this session established, the hard way

**Verify before recommending.** Three APIs closed underneath us in one day — Kiwi went
invitation-only, Amadeus decommissioned self-service on July 17, Yelp is paid. I
recommended Amadeus confidently from stale docs and was corrected. Check first.

**Validate a derivation against known-good data before trusting it.** Nearest-airport
scored 14/20 and was rejected. The same method at band resolution scored 40/40 and was
adopted. The 20 hand-curated route entries were the test set both times — without them,
both would have shipped.

**A health check must make the same call the app makes.** The first provider probe
reported three broken sources; all three were the probe's own fault — a missing
`User-Agent`, a wrong field name, a self-inflicted rate limit.

**Match a small known set precisely, never a large unknown one loosely.** Bulk-joining
airport links resolved 137 of 342. Looking up our own 46 by several name forms hit 40/40.
The same lesson produced the advisory country aliases.

**Name matching fails in both directions.** Bare city names sent LaGuardia to London,
Ontario and Naples, Florida. Last-distinctive-word lost Rome every nonstop it has, because
OurAirports says "Leonardo da Vinci" where Wikipedia says "Fiumicino". What works is a
subset match refused for any word naming a city in more than one country — computed from
the data, not listed by hand.

**A generated value must never overwrite a human-verified one.** Report the disagreement
and keep the curated value. A parser's miss is weaker evidence than something a person
checked.

**`verifiedOn` is the source's date, never ours.** Downloading a stale file today does not
make it current. State Department advisories legitimately run years old; that is their
current position, not our staleness.

**A citation is not metadata — it is the data.** Applies to influencer spots and to
everything else. If a claim cannot be pointed at, it cannot be distinguished from an
invented one.

---

## Documents

- `docs/technical/specs/destination-data-contract.md` — the spec; §2 is now executable in
  `src/lib/domain/contract.ts`
- `docs/pm/backlog/EPIC-destination-intake.md` — one intake path for site, chat and CLI
- `src/lib/providers/contract.ts` — provider contract + source registry with staleness
- `src/lib/domain/spots.ts` — the citation gate

## Commands added

```
npm run check:providers     # what is live, dormant, throttled, broken
npm run build:routes        # regenerate the route table from airport tables
npm run build:advisories    # regenerate the advisory baseline
npm run verify:advisories    # catalog ↔ advisory join, exits non-zero on a gap
```
