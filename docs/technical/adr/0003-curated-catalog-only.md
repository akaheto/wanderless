# 0003. Rank only a curated catalog, never arbitrary coordinates

- **Status**: Accepted
- **Date**: 2026-08-10

## Context

The engine needs a set of candidates to rank. Climate data is available for any latitude
and longitude on earth, so the system could in principle score anywhere — "find me the
warmest place within twelve hours in February" over a global grid.

That capability is what makes existing tools useless. A grid search returns points that
satisfy the numeric constraint and fail every unstated one: places with no tourism
infrastructure, no way in, an active security problem, or nothing to do. The numbers are
correct; the answers are not places anyone should go.

The unstated constraints are exactly the ones no API provides. Whether a town is worth ten
days, whether its museums shut in winter, whether the beach is swimmable in April, whether
the flight connection is punishing — these are editorial facts.

## Decision

Only destinations present in `src/data/destinations.ts` can be scored or ranked. There is
no path — API, URL parameter, or otherwise — by which a coordinate becomes a ranked result.

A destination enters the catalog only with a complete curated profile: twelve months of
suitability ratings and season labels, experience and practicality ratings, cost bands,
honest travel times, and dated risk notes. A partial entry is not admissible.

The catalog currently holds 27 destinations plus a New York reference point used only as a
comparison baseline, never ranked.

## Alternatives considered

- **Global grid search with post-filters** (population, airport proximity, safety index).
  Rejected: the filters are proxies for the editorial judgement, and poor ones. A city can
  have a major airport and still be a bad idea in February.
- **Curated catalog with an "advanced: score any coordinate" escape hatch.** Rejected
  because the escape hatch would become the feature, and would produce exactly the
  confidently-wrong output the product exists to avoid. Better to not have the capability
  than to have it behind a warning.
- **Third-party destination database** (Wikivoyage, GeoNames, a tourism-board feed).
  Broader coverage, no maintenance. Rejected: none carry month-by-month suitability, which
  is the field the engine most depends on. Reconciling their editorial stance with ours
  would cost more than writing 27 profiles.

## Consequences

**Easier:** Every result is a real place someone decided was worth visiting. The seasonal
gate has a `suitability` array to work from. Scores are comparable, because every
destination was rated on the same scale by the same hand.

**Harder:** Coverage grows only by manual work — roughly an hour per destination to
research and write a defensible profile. "Anywhere warm in February" cannot be answered
beyond the catalog. Catalog bias is real and invisible from inside: it reflects one
person's travel interests, and a destination that was never added is indistinguishable from
one that was considered and rejected.

**Mitigation:** `/sources` states the catalog size and its curation date, so its boundedness
is visible rather than implied. Release 7 may assist profile drafting, but acceptance stays
manual — otherwise this decision unwinds itself.
