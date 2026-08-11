# 0009. Treat maximum travel time as a constraint, not a scoring input

- **Status**: Accepted
- **Date**: 2026-08-10

## Context

Users state a maximum acceptable journey length. The natural implementation is a scoring
factor: longer journeys score worse, and the weighted total handles the rest.

That produces a specific bad outcome. A destination 26 hours away, against a stated 24-hour
limit, can still top the ranking if it is strong enough elsewhere — the travel penalty is
one input among many and is straightforwardly outvoted.

This misreads what the user said. "No more than 24 hours" is not a preference to be traded
off; it is a boundary. A ranking that puts an inadmissible option first has answered a
question nobody asked.

The related risk is over-correcting: silently dropping over-limit destinations hides
information. A user who set 24 hours may well want to know that relaxing to 26 opens up
something excellent.

## Decision

Travel time acts as a **sort partition**, not a score adjustment.

Destinations exceeding the stated maximum are still fully scored, explained and displayed —
with the same working as anything else — but are sorted below every destination that fits,
regardless of score. An `exceedsTravelLimit` flag drives the partition, an "over travel
limit" badge marks the row, and a note below the table states how many were demoted and
why.

Journey length *also* remains an ordinary factor inside the travel category, so a 6-hour
flight still scores better than an 11-hour one among options that both fit. The constraint
governs order; the factor governs degree.

## Alternatives considered

- **A heavy scoring penalty.** Simpler, but it is a soft constraint pretending to be a hard
  one — the threshold at which it stops working depends on the other categories, so it
  fails unpredictably.
- **Filter over-limit destinations out entirely.** Honest about the boundary but destroys
  the "you are one hour away from a much better option" case, which is genuinely useful.
- **A separate "stretch options" section below the ranking.** Nearly adopted, and close to
  what shipped — the partition achieves the same separation within one table, without
  splitting the comparison into two tables that cannot be scanned together.

## Consequences

**Easier:** A stated limit is honoured exactly. The user still sees what they are missing,
with the reason attached. The rule is one comparison in the sort and is covered by a
regression test asserting that no compliant destination ever ranks below a violating one.

**Harder:** Overall score no longer determines row order, which is mildly surprising on
first read — a 72 can sit below a 67. This is why the badge and the explanatory note are
not optional.

**Cost accepted:** Whether the flag applies is binary, so 24.5 hours and 40 hours are
treated identically for ordering. Both are over the line the user drew; the score and the
displayed journey time still distinguish them.
