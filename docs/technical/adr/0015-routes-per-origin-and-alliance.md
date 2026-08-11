# 0015. Model routes per departure airport, with airline and alliance filtering

- **Status**: Accepted
- **Date**: 2026-08-11

## Context

The catalog's `TravelProfile` carried one journey time per destination, documented as "from
the reference departure airport". Every value was written for JFK.

Meanwhile the trip record had a free-text `departureAirport` field defaulting to JFK, and
the comparison preferences carried it through into the UI. Setting a trip's airport to LGA
changed the label on the screen and **not one number**. The engine still scored the JFK
journey, the narrative still said "Nonstop from LGA, about 14h" about a route LaGuardia
cannot fly, and the travel-time constraint (ADR 0009) still tested a JFK figure against the
traveller's ceiling.

This is the failure mode the product exists to prevent, appearing inside the product: a
plausible-looking number, correct in its original context, presented under a label that
makes it false.

Two structural facts make per-airport modelling worth the effort rather than a rounding
detail:

- **LaGuardia has a 1,500-mile perimeter rule and no long-haul international service.** Not
  one of the 27 destinations is reachable nonstop from LGA. Every route connects.
- **Newark reaches places JFK does not.** Cape Town and Marrakech both have Newark nonstops
  and no JFK nonstop. Cape Town from EWR is 15.5h against 20h via JFK — a difference the
  single-airport model hid completely.

## Decision

**Journey figures move out of the catalog and into a per-origin route table**
(`src/data/routes.ts`), keyed by destination and airport. `TravelProfile` keeps arrival ease
and prose; the numbers that feed scoring come from the route table.

`departureAirport: string` is replaced on `ComparisonPreferences` by:

- `origins: Origin[]` — a fixed set of `JFK | LGA | EWR`, **in preference order**, so a tie
  between two equally good routings resolves to the preferred airport.
- `alliances: Alliance[]` and `airlines: string[]` — empty means no restriction.

`selectRoute()` picks the best permitted routing: fewest hours, with a half-hour tolerance
so a nonstop beats a marginally faster connection, then seasonality, then origin preference.

**An airline reference table** (`src/data/airlines.ts`) covers Star Alliance, SkyTeam and
Oneworld, **plus unaligned carriers**, restricted to airlines with a New York presence.
Unaligned carriers are first-class, not an afterthought: Emirates is the only nonstop to
Dubai, and JetBlue carries much of the Caribbean and Latin America. An alliance-only model
would hide them.

**A filter that removes every option says so.** `selectRoute` returns
`noRouteMatches: true`, the destination still gets full numbers from the best available
routing, and a `serious` warning explains that the traveller's airlines do not cover it.
Same principle as ADR 0009 — a constraint that eliminates everything is information, not an
empty result. A filter that merely costs a better routing raises a lesser warning.

The airport is a **fixed set of three**, not free text. A text box invites codes the route
table has no data for, and the honest behaviour then is either an error or a silent JFK
fallback — which is the bug this ADR exists to fix.

## Alternatives considered

- **Keep one journey figure and apply a per-airport offset.** Cheap, and wrong in exactly
  the interesting cases: it cannot express that Newark has a Cape Town nonstop JFK lacks.
  An offset model would make Newark uniformly slightly worse than JFK.
- **Free-text airport with a lookup.** Rejected — see above. The catalog is a curated set
  (ADR 0003) and origins are the same kind of bounded editorial decision.
- **Fetch live routes from an API now.** The right long-term answer and the plan for
  Release 5 (Amadeus). Rejected for now: it needs a key and a billing relationship, and the
  structural facts above are stable enough to curate. The route table is shaped so an API
  fills it rather than replacing the model.
- **Model alliances only, not individual airlines.** Simpler filtering, but it cannot
  express "I have JetBlue status" or "I will fly Emirates but not Etihad", and it would
  drop unaligned carriers.

## Consequences

**Easier:** Choosing an airport changes the answer, including whether a destination passes
the travel-time constraint. Cape Town at a 17h ceiling is excluded from JFK and admitted
from Newark — correctly, and for the first time. Alliance filtering is a genuine planning
tool for anyone with status or a companion fare.

**Harder:** Route data is now the most volatile curated data in the app. Airline networks
change every season, and a stale route table produces confident, specific, wrong answers.
`verifiedOn` is carried per destination and surfaced, but nothing enforces freshness yet —
Release 7's staleness sweep should cover it.

**Cost accepted:** 27 destinations × 3 origins of hand-curated route data, some of it
seasonal and some of it uncertain at the carrier level. Marked curated with a date, and the
UI says so. Specific carrier-per-route claims are the least certain part; the airport-level
facts (LGA connects to everything, EWR beats JFK for Cape Town and Marrakech) are the
robust part and are what the scoring actually turns on.

**Migration:** `Trip.departureAirport` remains in the schema and still shows on the trip
page, but no longer feeds scoring. It should either become an ordered origin list or be
dropped — recorded here as a known loose end rather than left implicit.
