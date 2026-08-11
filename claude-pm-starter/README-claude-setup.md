# Claude Code starter kit — strong coder + PM + docs + best practices

Drop this into your new repo root, then fill in the `<placeholders>`.
Monorepo: Python backend + Next.js/TypeScript/Tailwind frontend. Built
from [Anthropic's Claude Code best practices](https://code.claude.com/docs/en/best-practices)
plus an agile scoping, documentation, and quality-gate layer on top.

## Files

```
CLAUDE.md                       # Root instructions: coder + PM + docs + workflow discipline
CHANGELOG.md                    # One line per user-observable change

backend/                        # Python API
├── pyproject.toml              # uv + ruff + mypy(strict) + pytest config
├── src/                        # src/ layout
└── tests/
    ├── unit/
    └── integration/

frontend/                        # Next.js UI
├── package.json                 # Next.js + TS + Tailwind v4 + Vitest, ready to fill in
├── tsconfig.json                # strict mode
├── next.config.ts
├── eslint.config.mjs
├── .prettierrc.json
├── src/
│   ├── app/globals.css           # Tailwind v4 CSS-first config entrypoint
│   ├── components/
│   └── lib/
└── tests/

.claude/
├── settings.json               # Permissions + auto-format hooks (ruff + prettier) + reminder
├── agents/
│   ├── planner.md              # Scopes work into epics/stories/specs, interviews for big features
│   ├── researcher.md           # Read-only exploration
│   ├── implementer.md          # Scoped code changes, evidence-based reporting
│   ├── reviewer.md             # Fresh-context adversarial review, backend + frontend checklists
│   ├── tester.md               # Writes/runs tests, reports evidence
│   └── docs-writer.md          # Updates user/support/technical docs
├── skills/
│   ├── new-feature/SKILL.md         # /new-feature — interview-first spec workflow
│   ├── definition-of-done/SKILL.md  # /definition-of-done — verification checklist
│   ├── code-audit/                  # /code-audit — backend+frontend lint/format/types/tests
│   │   ├── SKILL.md
│   │   └── scripts/audit.sh
│   └── security-scan/               # /security-scan — secrets + backend+frontend deps + unsafe patterns
│       ├── SKILL.md
│       └── scripts/scan.sh
└── rules/
    ├── testing.md                 # Path-scoped rule for test files
    ├── python.md                  # Path-scoped: loads on backend/**/*.py
    └── frontend.md                 # Path-scoped: loads on frontend/**/*.{ts,tsx,css}

docs/                             # Shared, project-wide — not duplicated per app
├── README.md                   # Single source of truth: index + naming conventions
├── pm/
│   ├── charter.md               # AUTHORITATIVE: scope, objectives, decision rights
│   ├── vision.md                # Problem, solution, success criteria
│   ├── roadmap.md                # Now / Next / Later
│   ├── backlog/
│   │   ├── epics.md              # Epic index + template
│   │   └── STORY_TEMPLATE.md     # Copy per story
│   └── sprints/
│       └── SPRINT_TEMPLATE.md    # Optional time-boxed grouping
├── technical/
│   ├── architecture.md           # Current system overview — frontend + backend
│   ├── specs/
│   │   └── SPEC_TEMPLATE.md      # Design-level: how a feature/component works
│   └── adr/
│       ├── README.md              # ADR conventions
│       └── 0000-adr-template.md   # Context/Decision/Consequences
├── support/
│   ├── troubleshooting.md        # Symptom -> cause -> fix
│   └── faq.md
└── user/
    └── user-guide.md             # Task-oriented, plain language
```

## Why a monorepo, and how the two halves relate
`docs/` is shared and project-wide — one story, one spec, one changelog
entry for a feature that touches both frontend and backend, not
duplicated docs per app. `CLAUDE.md` treats both as first-class: the
Stack section covers both, `/code-audit` and `/security-scan` check both
in one pass, and `reviewer` has a separate checklist for each.

## Frontend stack: Next.js + TypeScript + Tailwind v4
`.claude/rules/frontend.md` is path-scoped — loads only when Claude
touches `frontend/**/*.{ts,tsx,css}`, so it costs nothing on backend-only
work. It covers:
- **Tooling**: ESLint (`next/core-web-vitals` + `next/typescript`),
  Prettier with `prettier-plugin-tailwindcss` (auto-sorts classes),
  TypeScript strict mode, Vitest + React Testing Library.
- **No `any`**, no boolean-prop proliferation (use composition/explicit
  variants instead — a common design-system anti-pattern), Server
  Components by default, semantic HTML before ARIA patches.
- **Tailwind v4 uses CSS-first config** (`@theme` in `globals.css`), not
  `tailwind.config.js` — this trips people up coming from v3.
- **Accessibility as a non-negotiable baseline**, not a checklist run
  once at the end: contrast ratios, keyboard nav, labeled inputs, alt
  text, `prefers-reduced-motion`.
- **Performance**: avoid request waterfalls, `next/image`/`next/dynamic`,
  no barrel-file imports, measure before reaching for `useMemo`.

Anthropic's built-in `frontend-design` skill also applies automatically
for anything visual/aesthetic (distinctive design over generic AI
defaults) — already available in this environment, no install needed.
For deeper coverage — a dedicated accessibility auditor, a broader React
performance rule set, or component composition patterns as a formal
skill rather than a rules file — Vercel's `agent-skills` collection and
AccessLint are well-regarded, actively maintained options. Vet them per
the guidance below before adding (particularly anything requesting
`Bash`).

## Backend stack: Python
`.claude/rules/python.md` is path-scoped to `backend/**/*.py`. Encodes
the 2026 default stack: **uv** for environments/deps, **ruff** for
lint+format, **mypy strict** (or `ty`) for types, **pytest** with
fixtures/parametrize, **pip-audit** for dependency scanning. Type hints
on every signature, Pydantic v2 for boundary validation, no bare
`except:`, `src/` layout with unit/integration tests kept separately
runnable.

## Quality gates: `/code-audit` and `/security-scan`
Both run across the whole monorepo in one call:
- **`/code-audit`** — backend (`ruff check`, `ruff format --check`,
  `mypy`, `pytest`) and frontend (`eslint`, `prettier --check`,
  `tsc --noEmit`, `vitest`), stopping at the first failing stage.
- **`/security-scan`** — hardcoded-secret patterns across both stacks,
  `pip-audit` + `npm audit`, and unsafe-pattern checks (bare `except:`,
  `eval`/`exec`, `shell=True`, string-built SQL for Python;
  `dangerouslySetInnerHTML`, `eval(` for frontend). Explicitly documented
  as a fast first pass, not a substitute for a real SAST/secret scanner.

Both are in the Definition of Done and used by
`implementer`/`reviewer`/`tester`. `.claude/settings.json` auto-runs
`ruff format` on Python saves and `prettier --write` on TS/TSX/CSS saves
via hooks, plus pre-approves the relevant `uv`/`npm` commands so you're
not confirming every check.

## Skills vs. subagents vs. rules vs. MCP
These get confused, and the confusion costs you context budget and
reliability. Quick disambiguation:

- **CLAUDE.md / `.claude/rules/`** — always-on persistent context, loaded
  every session whether you need it or not. Use for things Claude must
  always know (stack, conventions).
- **Skills** (`.claude/skills/`) — on-demand capabilities. Only the
  `name` and `description` load at session start (~100 tokens each);
  the full instructions and any bundled scripts load only when the skill
  actually triggers. This is why `/code-audit` and `/security-scan` are
  skills, not more CLAUDE.md prose — they cost nothing until invoked.
- **Subagents** (`.claude/agents/`) — a separate context window that
  does work and reports a summary back. Use for isolatable work, not
  quick checks.
- **MCP servers** — running processes exposing external tools/data
  (APIs, databases, services). Nothing in this kit uses MCP; add a
  server if you need Claude to call an external system.

`/code-audit` and `/security-scan` follow the same pattern as
quality-gate skills in the wider ecosystem (e.g. Vercel's
web-design-guidelines skill for UI code): read a checklist, check files
against it, report terse `file:line` findings — a linter for things a
linter can't check on its own.

## Vetting third-party skills before you add any
This kit's skills are all first-party — written for this repo, nothing
fetched from an external source. If you add skills from elsewhere later
(a marketplace, a GitHub repo, a colleague's `.claude/skills/`), treat
them like any third-party code you'd run: a skill can bundle scripts
that execute, and published research on the skills ecosystem has found
real supply-chain risk — a meaningful share of publicly available skills
tested carried prompt injection or attempted credential exfiltration.
Before installing one:
1. Read the full `SKILL.md` and every bundled script — they're plain
   markdown/shell/Python, not compiled, so you can read every line.
2. Check the `allowed-tools` frontmatter field — a skill that wants
   `Bash` warrants more scrutiny than one that only wants `Read`/`Grep`.
3. Prefer skills from Anthropic or well-known maintainers over anonymous
   community sources for anything with `Bash` access.
4. If you have a code scanner available (Snyk or similar), scan bundled
   scripts the same way you'd scan any other code before running it.

## Reliability layer: what most subagent setups get wrong
Current guidance across Anthropic's docs and practitioner writeups
converges on a few things that matter more than the setup's
sophistication:

- **Context management is the #1 failure mode**, not model capability.
  Session hygiene bakes in the two concrete fixes: `/clear` between
  unrelated tasks, and `/clear`-and-restart after two failed corrections
  — patching in a polluted context makes things worse, not better.
- **Fail fast, never hide a failure.** Silently swallowed exceptions and
  fallback defaults that mask a real error are the most common source of
  code that "looks done" but isn't. `CLAUDE.md` and `python.md` both call
  this out with a concrete before/after example, not just a rule name.
- **Simplicity beats a bigger agent pipeline.** "Known failure patterns"
  in `CLAUDE.md` explicitly warns against reaching for subagents by
  default — a single well-scoped session is easier to debug than a
  multi-agent one. Delegate only when work is genuinely isolatable.
- **Match existing patterns over introducing new ones**, and **don't
  over-engineer what a reviewer flags** — chasing every finding a
  reviewer produces is how simple changes grow defensive layers nobody
  asked for.
- **Least-privilege subagents.** Each agent in `.claude/agents/` already
  declares only the tools it needs (`researcher` is read-only, for
  example).
- **Secret hygiene** is an explicit guardrail in `CLAUDE.md`, backed by
  `.env*` deny rules in `.claude/settings.json` for both apps.

## What's from the official best-practices guide

- **Explore → plan → implement → verify.** `CLAUDE.md`'s default
  workflow for anything non-trivial, with an explicit exception: skip
  planning if you could describe the diff in one sentence.
- **Verification over assertion.** Nothing counts as done without a
  pass/fail check, and the report has to show actual output — not a
  claim that it works. Baked into the Definition of Done and
  `implementer`/`tester`.
- **Adversarial review in a fresh context.** `reviewer` runs blind to
  the reasoning behind a change and is explicitly told to flag only
  correctness/requirement gaps — chasing every finding leads to
  over-engineering.
- **Interview before building, for big features.** `/new-feature` runs
  an interview and writes a self-contained spec before any code gets
  written.
- **CLAUDE.md itself follows the guide's own advice**: concise,
  human-readable, commands and conventions rather than things Claude can
  infer from the code. Prune it if you notice Claude ignoring parts.

## What's from the PM/docs layer (on top of the base guide)

- **Agile scoping** — non-trivial work becomes a story in
  `docs/pm/backlog/` with acceptance criteria and status tracking, via
  `planner` or `/new-feature`.
- **Docs by audience** — ADRs (engineers), user guide (end users),
  troubleshooting/FAQ (support, symptom-first), changelog (everyone).
  See `docs/README.md` for the reasoning. `docs-writer` keeps these
  current; `/definition-of-done` checks them before you call something
  finished.

## Going further: an unattended verification gate
The strongest form of "give Claude a way to verify its work" is a **Stop
hook** — a script that blocks the turn from ending until your check
passes, so an unattended run can't finish incorrectly. Not included by
default, but to add one, tell Claude:

> "Write a Stop hook that runs `/code-audit` and blocks with exit code 2
> if it fails."

Useful once you start running longer autonomous sessions (`auto`
permission mode, `claude -p` in CI, or fan-out across files).

## First steps in your repo
1. Copy this structure into your project root.
2. Fill in the `<placeholders>` in `CLAUDE.md`, `backend/pyproject.toml`,
   `frontend/package.json`, and `docs/pm/vision.md`.
3. `cd backend && uv sync` and `cd frontend && npm install`.
4. Run `claude` in the project root, then `/context` to confirm
   CLAUDE.md, agents, and skills loaded.
5. Try it: `/new-feature` to interview and scope your first feature,
   implement it, then run `/code-audit`, `/security-scan`, and
   `/definition-of-done` before calling it finished.

## Going further still
If the project grows enough parallel, independent work to justify the
overhead, Claude Code's experimental **agent teams**
(`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) let a lead session spawn
teammates that talk to each other and self-claim tasks from a shared
list — worth revisiting later rather than starting with.
