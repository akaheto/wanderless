# Architecture Decision Records

One file per significant, hard-to-reverse decision. Numbered sequentially:
`0001-use-postgres.md`, `0002-api-versioning-strategy.md`, etc.

## When to write one
Write an ADR for decisions that are costly to reverse, affect multiple
components, or a future contributor would reasonably ask "why did we do
it this way?" about.

Skip it for decisions that are small, easily reversible, single-file, or
already fully explained by an existing standard/convention.

## Rules
- **One decision per ADR.**
- **Don't edit the reasoning of an old ADR after acceptance.** If a
  decision changes, write a new ADR that supersedes the old one, and mark
  the old one's status as `Superseded by NNNN`.
- **Concise.** Context, decision, consequences — not an implementation
  tutorial.

See `0000-adr-template.md` for the format.
