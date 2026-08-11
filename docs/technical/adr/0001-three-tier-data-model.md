# 0001. Separate measured, curated and personal data into three tiers

- **Status**: Accepted
- **Date**: 2026-08-10

## Context

The product mixes data of fundamentally different kinds. A destination's average March
temperature is an observation from a reanalysis dataset. Its "4.5 out of 5 for March" is
somebody's opinion. A user's note that they hated it last time is neither — it is theirs,
and it is not up for revision.

These behave differently in every respect that matters. Measured data goes stale on a
schedule and should be refreshed automatically. Curated data goes stale slowly and needs a
human to review it. Personal data never goes stale and must never be overwritten by
anything.

Systems that flatten these together produce a characteristic failure: a number appears on
screen with no way to tell whether it is a fact, a guess, or something you typed yourself
last year. Users then either over-trust everything or under-trust everything, and both are
worse than calibrated trust.

## Decision

Every piece of data in the system belongs to exactly one of three tiers, and the tier is
carried in the type system rather than by convention.

- **Objective** — fetched from a named external source, with a `verifiedOn` date.
  Lives in `src/data/generated/`. Regenerated wholesale by `npm run build:data`. Never
  edited by hand.
- **Curated** — editorial judgement shipped as source code in `src/data/destinations.ts`.
  Each destination carries a `curatedOn` review date.
- **Personal** — user input, in the database. Nothing generated ever writes to it.

Every scoring factor carries its tier, and the UI renders a tier mark beside it. `/sources`
explains the arrangement and lists the known gaps.

## Alternatives considered

- **One flat data model with a `source` string field.** Cheaper, and initially adequate.
  Rejected because a string is not enforced: nothing stops a refresh script writing over a
  curated value, and nothing makes the distinction visible at the point of use. The
  discipline has to be structural or it erodes.
- **Two tiers (automated vs. human).** Simpler, but puts editorial judgement and personal
  opinion in the same bucket. They differ in the one way that matters most — a curated
  rating is legitimately revisable by the project, a personal note is not.
- **Storing everything in the database, including the catalog.** Would allow editing
  curated data in the UI. Rejected for now: the catalog is version-controlled content, and
  reviewing a diff is the right way to change it. Revisit if the catalog outgrows a file.

## Consequences

**Easier:** Provenance is answerable for any number on screen. A data refresh is
categorically safe — it cannot touch curated or personal data. Gaps are representable
(`holidayDataAvailable` returns false rather than an empty list, which would read as "no
holidays").

**Harder:** Three storage mechanisms instead of one — generated files, source code, and a
database. Adding a destination means editing source *and* running the build script; forget
the second and the app throws a deliberate, explicit error.

**Cost accepted:** The UI carries tier marks everywhere, which is visual overhead on
screens that are already dense. Judged worth it — the alternative is numbers with no
epistemic status, which is the failure mode this project exists to avoid.
