# 0012. Forecasts are a separate kind of claim, never merged with normals

- **Status**: Accepted
- **Date**: 2026-08-11

## Context

Release 5 introduces forecasts, for trips close enough that a prediction means something.
Until now the app has shown only normals — what a date has historically looked like — and
ADR 0005 excluded forecasts entirely rather than showing something unfounded.

The obvious implementation is to use the forecast when one is available and the normal
otherwise, exposing one temperature per date. It is what most weather features do, it keeps
the UI unchanged, and every consumer keeps working.

It is also the single most damaging thing this project could do to itself.

Normals and forecasts answer different questions. A normal says *this is what late March
is like in Hoi An* — a distribution, stable, knowable a year out, and the right input to a
ranking. A forecast says *this specific Tuesday will be wet* — a prediction, decaying in
accuracy by the day, and meaningless past about two weeks. Silently substituting one for
the other produces a number whose meaning depends on today's date, which is exactly the
kind of unlabelled epistemic mixing the three-tier model exists to prevent (ADR 0001).

The concrete failure: a comparison run 9 days before departure would rank differently from
the same comparison run 20 days before, for reasons no visible input explains. The ranking
would stop being reproducible from its own URL — breaking the property that makes it
arguable.

## Decision

**Forecasts are an additional, separately-typed reading. They never replace a normal and
never enter the scoring engine.**

- `ClimateNormal` and `Forecast` are distinct types. There is no function returning "the
  temperature" that could be either, so a caller cannot accidentally treat one as the other.
- A `Forecast` carries `issuedAt`, the model that produced it, and a `confidence` that
  decays with lead time. A normal carries its 2015–2024 period. Neither can be constructed
  without its provenance.
- Forecasts are fetched only within the horizon (16 days) and only for a trip's own
  destination and dates. Outside it, the app returns `null` — not a fallback to the normal.
- **The scoring engine never sees a forecast.** Rankings stay deterministic and reproducible
  from their URL (ADR 0002), whether run today or in six months.
- The UI shows a forecast alongside the normal with both labelled, and shows the difference
  between them where it is material. Two claims, side by side, is the product.

## Alternatives considered

- **Forecast when available, normal otherwise.** Rejected above: one number with two
  meanings, and a ranking that changes for invisible reasons.
- **Blend them, weighted by lead time.** Superficially sophisticated and worse than either:
  the result is a number that is neither a measurement nor a prediction, and no honest label
  exists for it.
- **Feed forecasts into scoring for near trips only.** Rejected — it makes the engine's
  output depend on when it ran, which destroys reproducibility for the case where the stakes
  are highest.
- **Keep excluding forecasts.** The status quo, and defensible. Rejected because once a trip
  is a week out, the normal is genuinely the less useful number for packing and planning,
  and refusing to show a forecast is its own kind of unhelpfulness.

## Consequences

**Easier:** The distinction is enforced by the type system rather than by discipline. The
engine stays deterministic and its URLs stay reproducible. A user can see both readings and
notice when the year is unusual — which is information the normal alone cannot carry.

**Harder:** Two representations of "the weather" in the codebase and on screen, which is
more to build and more to explain. Fetching at request time breaks ADR 0005's "nothing is
fetched during a request" — deliberately and narrowly, because a cached forecast is a stale
forecast. This needs its own cache policy, short TTL, and an explicit failure path.

**Cost accepted:** A forecast fetch can fail, and when it does the app shows the normal
alone and says the forecast is unavailable. It does not silently present the normal as
though it were current.
