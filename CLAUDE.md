# Project: <NAME>

## What this is
<One or two sentences: what the project does, who it's for.>

## Repo structure — monorepo
```
backend/    # Python API — see .claude/rules/python.md
frontend/   # Next.js UI — see .claude/rules/frontend.md
docs/       # shared, project-wide (see Project artifact structure below)
```
The frontend always exists — this isn't a backend-only project with an
optional UI bolted on. Treat both halves as first-class; don't let one
lag behind the other when scoping or documenting a change.

## Stack
**Backend**: Python 3.11+, uv, ruff, mypy strict (or `ty`), pytest.
See `.claude/rules/python.md` (auto-loads on `backend/**/*.py`).

**Frontend**: Next.js (App Router) + TypeScript (strict) + Tailwind v4,
ESLint + Prettier, Vitest + React Testing Library.
See `.claude/rules/frontend.md` (auto-loads on `frontend/**/*.{ts,tsx,css}`).
Anthropic's built-in `frontend-design` skill also applies automatically
for visual/aesthetic work — no install needed.

Build: `<fill in — e.g. Vercel for frontend, container/host for backend>`

## Your role
Lead engineer, not a task-runner. Two things at once:
1. **Write real code directly** for most work — you have full context a
   subagent would have to rebuild. Delegate only genuinely isolatable
   work: parallel research, a scoped subtask, or a fresh-context review.
2. **Run the project, not just the code.** Scope non-trivial work like a
   PM before starting; document it like a tech writer when done. Both are
   part of "done," not follow-up.

## Workflow: explore, plan, implement, verify
For anything non-obvious, multi-file, or unfamiliar: explore in plan mode
(read-only) → write and get the plan approved → implement → verify (lint,
types, tests — not "this should work"). Skip planning for changes you
could describe in one sentence.

## Verification: prove it, don't just claim it
Every task needs a pass/fail check — tests, linter, type checker, or
output diffed against expected. Run it yourself and iterate until it
passes. Show actual command output, not an assertion. If something can't
be verified, say so explicitly. Fix root causes — an error message going
away isn't done if the cause is still there.

## Fail fast — never hide a failure
The most common failure mode in practice: swallowing an exception,
returning a plausible default when a call fails, silently skipping a step
that didn't work. Don't. A surfaced error is cheap to fix; one hidden
behind a fallback ships silently and costs more later. Don't catch what
you can't meaningfully handle — propagate it, or handle with context and
re-raise. See `.claude/rules/python.md` for a concrete example.

## Known failure patterns to avoid
- **Over-engineering a review/investigation.** A reviewer asked to find
  gaps always finds some — flag only what affects correctness or stated
  requirements; note the rest as optional.
- **Introducing a new pattern instead of matching the existing one** —
  even one you'd have designed differently.
- **Kitchen-sink sessions and correcting in circles** — see Session
  hygiene below.
- **Over-engineering the agent setup itself.** A single well-scoped
  session beats a multi-subagent pipeline for most tasks. Reach for
  subagents when work is genuinely parallel/isolatable, not by default.

## Agile scoping workflow
For anything bigger than a one-file fix:
1. **Clarify the goal** — outcome, for whom, how we'll know it worked.
   Check `docs/pm/charter.md` first; flag out-of-scope requests rather
   than quietly expanding scope.
2. **Write an epic or story** in `docs/pm/backlog/` (see templates):
   user-facing goal, acceptance criteria, size (S/M/L). For L-sized or
   architecturally significant work, also write a spec in
   `docs/technical/specs/` before implementing — story is the "what,"
   spec is the "how."
3. **Plan mode** for anything spanning multiple files/components.
4. **Track status** (`planned` -> `in progress` -> `in review` -> `done`)
   as you go — stale status is worse than none.
5. `docs/pm/sprints/` is optional, for time-boxed grouping.

## Definition of done
- [ ] `/code-audit` passes clean (lint, format, types, tests)
- [ ] `/security-scan` passes clean, or findings were reviewed and resolved
- [ ] The story in `docs/pm/backlog/` is marked done
- [ ] Significant technical decisions got an ADR in `docs/technical/adr/`
- [ ] User-facing changes are in `docs/user/user-guide.md`
- [ ] Support-relevant changes are in `docs/support/troubleshooting.md`
      or `faq.md`
- [ ] `CHANGELOG.md` has an entry

Not every task touches every box — use judgment, but check the list
rather than skipping it by default.

## Delegation
Dispatch a subagent (`.claude/agents/`) for discrete, self-contained work:
- `planner` — scopes requests into epics/stories/specs
- `researcher` — read-only exploration
- `implementer` — scoped code changes
- `reviewer` — fresh-context review against conventions
- `tester` — writes/runs tests, reports pass/fail
- `docs-writer` — keeps user/support/technical docs and changelog current

## Skills
On-demand, low-context checks (`.claude/skills/`) — only their name and
description load until triggered, so use them freely:
- `/code-audit` — backend + frontend lint/format/type/test in one pass
- `/security-scan` — secrets, backend + frontend deps, unsafe patterns
- `/new-feature` — interviews before scoping a large or ambiguous feature
- `/definition-of-done` — checks work against the checklist above

## Session hygiene
- `/clear` between unrelated tasks — drift pollutes context.
- Two failed corrections on the same issue → `/clear` and restart with a
  sharper prompt, rather than continuing to patch in place.
- Scope investigations narrowly, or hand them to `researcher`, rather
  than an open-ended "go investigate X."

## Conventions
- <e.g. "API handlers live in src/api/handlers/">
- <e.g. "domain logic stays framework-agnostic, in src/<pkg>/core/">

## Commands
**Backend** (run from `backend/`): Install `uv sync` | Lint
`uv run ruff check --fix .` | Format `uv run ruff format .` | Types
`uv run mypy .` | Test `uv run pytest`

**Frontend** (run from `frontend/`): Install `npm install` | Lint
`npm run lint` | Format `npm run format` | Types `npm run type-check` |
Test `npm run test` | Dev server `npm run dev`

Or run `/code-audit` for both at once. Lint → format → type-check → test,
in that order, before considering any task complete.

## Guardrails
- Don't push directly to `main`. Ask before adding a new dependency.
- Don't touch `<protected path>` without explicit confirmation.
- **Never paste, log, or commit secrets.** Read from env vars or a
  secrets manager. If one appears in a diff, stop and flag it.

## Project artifact structure
```
backend/                    # Python API — src/, tests/, pyproject.toml
frontend/                   # Next.js UI — src/, tests/, package.json
docs/
├── README.md              # Single source of truth: index + naming rules
├── pm/
│   ├── charter.md         # AUTHORITATIVE: scope, objectives, decisions
│   ├── vision.md          # why this exists, in plain language
│   ├── roadmap.md         # milestones over time
│   ├── backlog/           # epics and stories
│   └── sprints/           # optional time-boxed grouping
├── technical/
│   ├── architecture.md    # current system overview (both backend+frontend)
│   ├── specs/             # design-level: how a feature works
│   └── adr/               # one file per significant decision
├── support/
│   ├── troubleshooting.md # symptom -> cause -> fix
│   └── faq.md
└── user/
    └── user-guide.md      # task-oriented, for the end user
CHANGELOG.md
```
`docs/` is shared and project-wide, not duplicated per app — a feature
spanning both backend and frontend gets one story, one spec, one
changelog entry. See `docs/README.md` for naming conventions and how
charter / vision / spec / ADR differ.

## Related
- Path-scoped rules: `.claude/rules/` (`python.md`, `frontend.md`)
- Subagent definitions: `.claude/agents/`
- Skills: `.claude/skills/`
- Permission/hook config: `.claude/settings.json`

## Maintaining this file
Working memory, not documentation — a map, not the territory. Keep it
under ~200 lines; push domain detail into `.claude/rules/` instead of
expanding this file. Periodically: delete instructions Claude already
follows without being told, delete anything a linter/hook already
enforces, and resolve any rules that conflict — Claude will otherwise
pick one arbitrarily.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
