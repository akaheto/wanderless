# 0002. Rank destinations with deterministic arithmetic, not a language model

- **Status**: Accepted
- **Date**: 2026-08-10

## Context

The core feature ranks destinations against a set of dates and preferences. An obvious
implementation is to hand the catalog, the dates and the preferences to a language model
and ask for a ranked list with explanations. It would be a fraction of the code, would
handle nuance no formula captures, and would produce better prose.

The question is what happens when the user disagrees with the answer.

With a model, there is nothing to disagree *with*. The output is a paragraph. You cannot
locate the step that was wrong, you cannot change a weighting and see what moves, and you
cannot tell whether a factor was considered and outweighed or simply missed. Two identical
questions may produce different orders. The explanation is generated alongside the ranking
rather than derived from it, so it can be persuasive and unfaithful at once.

## Decision

The ranking is deterministic arithmetic in `src/lib/scoring/engine.ts`. No model is in the
loop at ranking time.

Seven categories, each decomposing into named factors that carry their own value, sub-score
and weight. Nothing contributes to a total without appearing in the UI. The same brief
always produces the same order, and this is enforced by test.

Narrative output (`narrative.ts`) is templated prose assembled *from the computed scores* —
it can only restate numbers the engine produced and the UI already shows. It cannot
introduce a consideration that is not in the arithmetic.

## Alternatives considered

- **LLM ranking with a structured-output schema.** Better nuance, better prose, and the
  schema would force some structure. Rejected: structured output constrains the shape of
  the answer, not its stability or faithfulness. Determinism and auditability are the
  point.
- **Hybrid — deterministic scores, model-written explanations.** Tempting, and nearly
  adopted. Rejected because a fluent explanation that drifts from the arithmetic is worse
  than a plain one that cannot: the whole value of showing the working is that the words
  and the numbers are the same claim.
- **Learned weights from user behaviour.** No training data, one user, and it would make
  the system less inspectable in exchange for personalisation the preference sliders
  already provide explicitly.

## Consequences

**Easier:** Every ranking is reproducible, testable and arguable. Regression tests can
assert real behaviour (Hoi An beats Hanoi in March and loses in November) rather than
smoke-testing an API. No inference cost, no latency, no key. Comparisons render server-side
with no client JavaScript.

**Harder:** The engine only knows what has been encoded. Nuance a model would catch for
free — a festival, a construction project, a currency collapse — has to enter through the
curated tier or not at all. Prose is templated and will read as such next to a model's.

**Cost accepted:** More code, and every new consideration means a schema change rather than
a prompt edit. This is the deliberate trade: the system is less clever and more accountable.

**Note:** This constrains the *ranking*, not the product. Release 7 (research automation)
may well use a model to draft curated content — but its output is a draft for the owner to
accept into the curated tier, which keeps the ranking deterministic.
