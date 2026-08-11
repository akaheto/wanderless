# 0004. Gate overall scores on seasonal viability

- **Status**: Accepted
- **Date**: 2026-08-10

## Context

The first working version of the engine ranked Stockholm 13th of 27 for a January city
break — above several destinations that are genuinely good in January.

Nothing was broken. Stockholm in January scores well on lodging (rates collapse), on crowds
(nobody is there), on practicality (transport works, English is universal), and on travel
(direct flights, plenty of availability). Its weather score was low, but weather was one
category among seven, and the others were all pointing the same way.

This is a structural problem, not a tuning problem. **A destination in its worst season
looks good on most measurable dimensions** — precisely because it is out of season. Cheap,
quiet, available. Every easily-measured signal improves. The one signal that should
dominate — this is a bad time to go — is a single category being outvoted by six.

Re-weighting does not fix it. Weighting weather high enough to sink Stockholm in January
also breaks every other comparison, and it misrepresents the problem: the issue is not that
weather matters more than lodging, it is that below a threshold of seasonal viability,
nothing else should be able to compensate.

## Decision

Compute the mean curated suitability across the trip's months, and scale the overall score
by a multiplier derived from it:

```
gate    = 0.6 + 0.4 × clamp(meanSuitability / 2.5, 0, 1)
overall = round(rawOverall × gate)
```

A destination rated 2.5/5 or better for its months is ungated (`gate = 1`). Below that, the
multiplier falls linearly to a floor of 0.6.

Both numbers survive into the UI. `rawOverall` and the multiplier are shown wherever the
gate applies (`×0.76 seasonal gate, was 76`), and a warning is attached to the score. The
gate can only ever reduce a score — asserted by test across the whole catalog.

## Alternatives considered

- **Re-weight the categories so weather dominates.** Breaks every in-season comparison, and
  misdiagnoses the problem as one of relative importance.
- **Hard-exclude destinations below a suitability threshold.** Simple and defensible, and
  the first thing tried. Rejected: it hides the reasoning. Seeing Stockholm ranked low
  *with an explanation* is more useful than not seeing it, particularly when a user has a
  non-negotiable reason to consider it.
- **Fold suitability into the weather category.** Conflates a measurement with a judgement,
  violating ADR 0001, and still leaves the category outvoted six-to-one.
- **A steeper curve or a lower floor.** The 0.6 floor and 2.5 threshold are calibrated so a
  strong destination in a poor month lands mid-table rather than last — visible but not
  competitive. Values are arbitrary but tested; changing them changes documented behaviour.

## Consequences

**Easier:** The product's core failure mode is structurally prevented rather than tuned
against. The mechanism is one line of arithmetic, fully visible, and covered by a named
regression test.

**Harder:** The gate is only as good as the curated `suitability` array. A wrong rating
produces a wrong gate with the same confidence as a right one — this concentrates
editorial risk into a single field per month.

**Cost accepted:** Overall scores are not linearly comparable across destinations with
different gates, since one has been scaled and another has not. This is why both numbers
are always shown; a gated 58 and an ungated 58 are different claims and the UI says so.
