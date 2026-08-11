# 0006. Use libSQL (SQLite/Turso) for personal data

- **Status**: Accepted
- **Date**: 2026-08-10

## Context

The personal tier — trips, candidates, notes, preferences — needs durable storage with real
writes. The measured and curated tiers are static files (ADR 0001, 0005), so the database
carries only user input: one user, low volume, low write frequency.

The deployment target is Vercel, whose filesystem is read-only and ephemeral. Anything
written at runtime must live outside the deployment.

## Decision

libSQL via `@libsql/client`, with schema migrations applied automatically on first client
use (`src/lib/db/schema.ts`).

The same client speaks to both backends: a local file at `./data/tih.db` in development,
and a remote Turso database in production when `DATABASE_URL` and `DATABASE_AUTH_TOKEN` are
set. No code differs between the two.

Migrations are written as an ordered list of idempotent statements and cover all phases'
tables — including `trip_stops`, `places`, `sources`, `flights`, `hotels` and
`budget_items`, which nothing reads yet. Defining them now keeps later migrations additive.

## Alternatives considered

- **Postgres (Neon, Supabase).** More capable, and the default choice for a web app.
  Rejected as disproportionate: no concurrency, no scale requirement, and it introduces a
  connection-pooling concern that serverless makes genuinely annoying. Revisit if Release 8
  brings multiple users.
- **Plain `better-sqlite3`.** Excellent locally, unusable on Vercel — synchronous, native,
  and dependent on a writable filesystem.
- **JSON files on disk.** Zero dependencies, and adequate for one user. Rejected for the
  same read-only-filesystem reason, and because trips and candidates are genuinely
  relational.
- **An ORM (Prisma, Drizzle).** Rejected for now: the schema is small and hand-written SQL
  is clearer at this size than a migration DSL. Drizzle is the likely choice if the schema
  grows past comfortable.

## Consequences

**Easier:** Development needs no running service — clone, `npm install`, `npm run dev`, and
the database creates itself. Production is a URL and a token, no pooling. Migrations apply
themselves, so there is no separate deploy step to forget.

**Harder:** No migration rollback; forward-only. Hand-written SQL means no type-safe query
layer, so a column rename is a manual grep. Turso's free tier has limits that a single user
will not reach but that a Release 8 multi-user version would need to reconsider.

**Cost accepted:** Defining tables for unbuilt phases risks getting them wrong. Judged
cheaper than the alternative — an unreferenced table costs nothing, while retrofitting a
foreign key onto live data costs a careful migration.
