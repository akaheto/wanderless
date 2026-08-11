# 0005. Precompute climate normals at build time; exclude forecasts until Release 5

- **Status**: Accepted
- **Date**: 2026-08-10

## Context

Comparing destinations for specific dates needs climate data for those dates. Two questions
follow: when to fetch it, and whether it should be historical or predicted.

On timing, the obvious approach is fetching per request. But a comparison scores up to 27
destinations at once, each needing daily values across a date range — that is 27 API calls
on a page load, with the page's availability tied to a third party's.

On kind: trips are typically planned months ahead, well past any forecast horizon.
Presenting a "forecast" for a date eight months out would be a fabrication regardless of
what the underlying model returns.

## Decision

**All climate data is precomputed at build time** by `scripts/build-reference-data.ts` and
imported as static JSON. Nothing is fetched during a request.

The script pulls ten years of daily observations (2015–2024) per destination from the
Open-Meteo ERA5 archive, computes day-of-year normals smoothed over a ±7-day window, and
writes them to `src/data/generated/climate/`. The smoothing means an exact-date lookup rests
on roughly 150 observations rather than 10, giving curves that vary smoothly instead of
jumping between adjacent days.

**Forecasts are excluded entirely from Releases 1–4.** They appear in Release 5, when a trip
is near enough for them to mean something, and must render as visibly distinct from normals
— separate label, separate treatment, never merged into one number.

The distinction is stated in the source (`src/lib/climate/index.ts` opens with it), on
`/sources`, and in the UI ("Normals for the exact calendar days — not a forecast").

## Alternatives considered

- **Fetch per request with a cache.** Rejected: adds a runtime dependency and a cache
  invalidation problem in exchange for freshness that historical normals do not need. A
  2015–2024 normal does not change between page loads.
- **Fetch monthly averages only.** Much smaller payload. Rejected because it cannot answer
  the actual question — a trip is a date range, not a month, and a range crossing a monsoon
  boundary averages into a meaningless middle.
- **Use a 30-year normal (1991–2020), the WMO standard.** More statistically conventional
  and better at averaging out interannual variability. Rejected because a warming signal
  makes the older decades actively misleading about what a traveller will experience — the
  question is "what will it be like", not "what is the climatological baseline". Recorded
  here because it is the most defensible objection to this decision.
- **Ship forecasts now, labelled as low-confidence.** Rejected: a label does not stop a
  number from being read as a prediction, and for dates months out there is nothing behind
  it.

## Consequences

**Easier:** Page renders never depend on a third party. No API key, no rate limit, no
runtime failure mode. Data is versioned with the code, so a ranking is reproducible from a
commit. The 366-day leap-calendar index makes exact-date lookup a constant-time array read.

**Harder:** Adding a destination requires a build step; forget it and the app throws an
explicit error pointing at `npm run build:data`. Refreshing means a deploy. The generated
corpus is ~480 KB in the repo.

**Cost accepted:** Normals cannot represent an unusual year, and the ±7-day smoothing
deliberately flattens genuine short-term features. Both are correct for the question being
asked and wrong for "what will the weather be" — which is why Release 5 exists and why the
labelling discipline matters.
