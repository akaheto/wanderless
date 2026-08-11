# 0008. Hand-roll SVG charts instead of using a charting library

- **Status**: Accepted
- **Date**: 2026-08-10

## Context

The product needs five chart forms: annual temperature ranges, monthly rainfall, a
day-by-day comfort profile, a twelve-month ordinal suitability strip, and a diverging
comparison against a home baseline.

All five are small, fixed forms over data whose shape never varies — twelve months, or 366
days, always. None needs zooming, panning, brushing, or a dynamic series count.

Most charting libraries are built for the opposite case: arbitrary data, arbitrary
interactions, runtime layout. That machinery arrives as client JavaScript, and it wants to
run in the browser — which conflicts with pages that otherwise render entirely on the
server.

## Decision

Hand-written SVG in `src/components/charts.tsx`, rendered on the server. No charting
dependency.

Every colour comes from a CSS custom property, so charts follow the light/dark theme
without JavaScript. Hover detail rides on native `<title>` elements, which work with
JavaScript disabled. Wide charts scroll inside their own `overflow-x` container so the page
body never scrolls sideways.

The monthly chart deliberately **avoids a climograph** — temperature and rainfall are
different measures on different scales, and putting them on one pair of axes makes the
relationship between the curves an artefact of the scaling. They get separate panels
sharing an x-axis.

## Alternatives considered

- **Recharts / Victory / Nivo.** React-native APIs, good defaults. Rejected: all require
  client rendering, adding 50–150 KB of JavaScript to pages that need none, and all fight
  attempts at server-only rendering.
- **Observable Plot or D3.** Plot in particular is excellent and would handle these forms
  in a few lines each. Rejected primarily for the same client-side reason, and because D3's
  power is in exploratory interaction the product does not need.
- **A server-rendered chart image.** Would work, but loses text selection, accessibility
  semantics, and theme adaptation — a raster image cannot follow a dark-mode toggle.

## Consequences

**Easier:** Comparison and destination pages ship zero client JavaScript for charts. Theme
switching is free. Every mark is inspectable in the DOM and styleable from tokens. Exact
control over the details that matter in dense layouts — direct labels on extremes only,
2 px gaps between adjacent fills, highlighted month bands.

**Harder:** Each new chart form is real work rather than a component import. Axis ticks,
label collision and scale selection are hand-managed; there is no automatic layout to fall
back on. Interactivity beyond `<title>` tooltips would need building from scratch.

**Cost accepted:** Roughly 400 lines of chart code that a library would have supplied. Worth
it for five fixed forms; would not be worth it for twenty varying ones. If Release 6
(budget) needs genuinely interactive charts, revisit rather than extend this.
