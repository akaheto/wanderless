# 0007. Build as a single Next.js app, not the prescribed Python monorepo

- **Status**: Accepted
- **Date**: 2026-08-10

## Context

The root `CLAUDE.md` describes a monorepo layout with a Python backend and a separate
frontend, and ships rules for both (`.claude/rules/python.md`,
`.claude/rules/frontend.md`). It is a general-purpose project convention, not written for
this project specifically.

This project's actual shape: server-rendered pages over a small relational schema, with all
heavy computation (climate normals) already done at build time. The runtime work is reading
static data, running deterministic arithmetic, and reading and writing a handful of tables.

A separate backend would exist to serve JSON to a frontend in the same repository, deployed
to the same host, called by nobody else.

**This decision deviates from a stated project convention, which is why it is recorded
rather than simply done.**

## Decision

One Next.js application. Server Components read data directly; Server Actions handle
mutations. No HTTP API layer, because there is no second consumer.

The `docs/` structure, definition-of-done checklist, and documentation discipline from
`CLAUDE.md` are followed as written — the deviation is confined to the runtime topology,
not the working practice.

## Alternatives considered

- **Follow the convention: FastAPI backend + Next.js frontend.** Rejected as pure overhead
  at this size — a second language, a second deploy target, a second dependency tree, and
  serialisation boundaries between components that would otherwise call each other
  directly. It would buy independent scaling and language choice, neither of which is
  needed.
- **Next.js with Route Handlers as an internal API.** A middle path, keeping one language
  while preserving an HTTP seam. Rejected: it is the cost of an API without the benefit —
  still one deployable, but now with hand-written fetch calls and duplicated types where a
  direct function call would do.
- **Python for the data pipeline, TypeScript for the app.** Genuinely tempting; pandas
  would suit the normals computation well. Rejected to keep one language and one set of
  types across the pipeline and the app — the generated files are consumed by typed
  TypeScript, and a mismatch would surface at runtime instead of at build.

## Consequences

**Easier:** One language, one test runner, one deploy. Types flow from the schema through
the engine to the components without a serialisation boundary. Comparison pages render
server-side with no client JavaScript.

**Harder:** The Python rules in `.claude/rules/` do not apply and may mislead a future
reader; `.claude/rules/frontend.md` still does. If a genuine second consumer appears — a
mobile client, a public API in Release 8 — an HTTP layer has to be introduced then, against
code that assumes direct calls.

**Reversibility:** Moderate. Business logic is already isolated in `src/lib/` with no
framework dependency; `scoring/`, `climate/` and `dates.ts` are pure and would port to a
service unchanged. The coupling is in the page components, which would need rewriting.
