# 0011. Defer external routing; curate the ground legs instead

- **Status**: Accepted
- **Date**: 2026-08-11

## Context

The roadmap listed Google Routes as the remaining item in Release 2, to replace the
distance-based transfer estimate with real routing. Before integrating it, two things were
checked.

**What Routes actually covers.** The Routes API computes `DRIVE`, `BICYCLE`, `WALK`,
`TWO_WHEELER` and `TRANSIT`. `TRANSIT` means local public transport. It does not return
commercial flight timings.

**What the catalog is made of.** Every pair of the 27 destinations, classified by the
current model:

| Mode | Pairs | Share |
|---|---:|---:|
| long-flight | 226 | 64.4% |
| flight | 92 | 26.2% |
| short-flight | 30 | 8.5% |
| **ground** | **3** | **0.9%** |

The three ground pairs are Phuket–Krabi (61 km), South Bali–Ubud (19 km), and
Krabi–Koh Samui (200 km).

So the planned integration would improve under 1% of legs, and would leave untouched the
99% whose burden numbers actually drive the warnings. It would also introduce the project's
first API key and its first billing account, against a charter constraint of "no paid APIs
while the product is private" and ADR 0005's "nothing is fetched during a request."

Of the three pairs, one is wrong in a way routing would not fix: Krabi to Koh Samui crosses
the Malay peninsula from the Andaman coast to the Gulf, and is realistically a bus-and-ferry
combination, not a drive.

## Decision

**Do not integrate Google Routes.** Release 2's routing item is withdrawn rather than
deferred — it was scoped against an assumption about coverage that does not hold.

Two things take its place:

1. **A curated override table** for specific pairs where the heuristic is known to be wrong,
   carrying hours, mode and a note. Three entries today. This is the same mechanism the
   project already uses for every other editorial fact (ADR 0003), and it costs nothing to
   maintain at this size.
2. **Real flight timings arrive with Amadeus in Release 5**, which is where the 99% case is
   actually addressed, and where a key and a billing relationship are being introduced
   anyway for flights and hotels.

The distance heuristic remains the default for uncurated pairs and remains labelled as an
estimate.

## Alternatives considered

- **Integrate Routes as planned.** Rejected on the numbers above: a key, a billing account
  and a request-time dependency, to improve three legs.
- **A free routing provider (OSRM, OpenRouteService).** Removes the billing objection but
  not the coverage one — they are also road-only. Same 0.9%.
- **Precompute a full 27×27 matrix at build time.** Architecturally the neatest fit with
  ADR 0005, and the approach to reach for if routing is ever genuinely needed. Rejected now
  because it is 351 lookups to improve three of them.
- **Curate all 351 pairs by hand.** Consistent with ADR 0003, but roughly two orders of
  magnitude more editorial work than the problem justifies, and it would go stale.

## Consequences

**Easier:** No key, no billing, no request-time dependency — the "no secrets to manage"
property survives another release. The three known-wrong legs get fixed today rather than
after an integration. Transfer accuracy improves again in Release 5 as a by-product of work
already planned.

**Harder:** Flight-leg estimates stay heuristic until Release 5, so a transfer marked
"5h, half a day" may be materially off for a specific route with a bad connection. The UI
already labels these as estimates; that labelling is now load-bearing for longer than
originally intended.

**Cost accepted:** The curated override table is a manual list that can drift from reality.
It is small enough to review, and each entry carries a note explaining why it exists.

**Roadmap effect:** Release 2 is complete on acceptance of this decision. The transfer-
accuracy concern moves into Release 5 rather than remaining open.
