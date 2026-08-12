---
name: code-audit
description: Runs the full quality gate for the monorepo — backend (ruff, mypy, pytest) and frontend (eslint, prettier, tsc, vitest) — via one bundled script, reporting terse pass/fail with file:line detail. Use before marking any coding task done.
allowed-tools: Bash, Read
argument-hint: [backend|frontend]
---

Run `scripts/audit.sh` with an optional scope argument (`backend` or
`frontend`; defaults to both). For backend it runs, in order:
`ruff check`, `ruff format --check`, `mypy`, `pytest`. For frontend:
`eslint`, `prettier --check`, `tsc --noEmit`, `vitest`. Stops and reports
at the first failing stage — fix and re-run narrower first rather than
letting every stage fail in sequence.

Report format:

- **Stage**: which of the four failed (or "all clean")
- **Findings**: terse `file:line` list, not full command output pasted
  wholesale — summarize, don't dump
- **Next step**: what to fix, in priority order if more than one issue

If everything passes, say so in one line — don't pad a clean result with
narrative.
