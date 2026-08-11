# Documentation map — single source of truth

This folder is the project's single source of truth for scope,
architecture, and status. If information about the project exists, it
lives here — not in chat history, not in a comment buried in code, not
duplicated across two files. When two docs would say the same thing,
link instead of repeating.

Claude (via `docs-writer` and `planner`) keeps these current as part of
its definition of done — see the root `CLAUDE.md`. Docs update tied to
the task workflow, not as a separate cleanup pass, is the whole point:
a story isn't `done` until the docs it affects are current.

| Path | Audience | Contains |
|---|---|---|
| `pm/charter.md` | Everyone, esp. stakeholders | **Authoritative** scope, objectives, decision rights, constraints |
| `pm/vision.md` | Everyone, esp. stakeholders | Problem framing — why this exists, in narrative form |
| `pm/roadmap.md` | Everyone | Now / Next / Later, milestones over time |
| `pm/backlog/` | You + Claude, day to day | Epics and stories: scope, acceptance criteria, status |
| `pm/sprints/` | You + Claude, optional | Time-boxed groupings of backlog items |
| `technical/architecture.md` | Engineers, future contributors | Current system overview — kept accurate, not historical |
| `technical/specs/` | Engineers | Design-level: how a feature/component works, before or during implementation |
| `technical/adr/` | Engineers, future contributors | One file per significant decision: context, decision, consequences |
| `technical/hard-limits.md` | Engineers, and the owner | Every fixed threshold and closed set, with what it costs to change |
| `support/troubleshooting.md` | Support agents, self-serve users | Symptom -> cause -> fix |
| `support/faq.md` | Support agents, self-serve users | Common questions, short answers |
| `user/user-guide.md` | End users | Task-oriented, plain language, no jargon |
| `../CHANGELOG.md` | Everyone | One line per user-observable change |

## Charter vs. vision vs. spec vs. ADR
These four get confused most often — they answer different questions:
- **Charter** — *what are we authorized to build, and who decides?*
  Formal, changes rarely, wins in a conflict.
- **Vision** — *why does this matter, in plain language?* Narrative,
  used to onboard and align, not a decision record.
- **Spec** — *how does this specific feature/component work?*
  Design-level detail for one piece of the system, written before or
  during implementation.
- **ADR** — *why did we choose X over Y, for one specific decision?*
  A single, immutable record — not a design doc, not a how-to.

## Naming conventions
- **ADRs**: `technical/adr/NNNN-short-kebab-title.md`, numbered
  sequentially, never renumbered or reused.
- **Specs**: `technical/specs/short-kebab-title.md`, named after the
  feature/component, not the story that spawned it.
- **Stories**: `pm/backlog/STORY-short-kebab-title.md`, copied from
  `STORY_TEMPLATE.md`.
- **Epics**: tracked in `pm/backlog/epics.md`; split into
  `pm/backlog/epics/short-kebab-title.md` only if the index file gets
  unwieldy.
- **Sprints**: `pm/sprints/sprint-N.md`, sequential.
- General rule: lowercase kebab-case filenames, no spaces, no dates in
  filenames (status/dates go inside the doc, not the name) — a file's
  name shouldn't need to change just because its status did.

## Principles this structure follows
- **Single source of truth.** The charter is authoritative on scope; the
  backlog is authoritative on status. Don't let a chat message or a
  Slack thread become the real record of a decision — write it down here.
- **Audience separation.** A technical decision and a user-facing
  instruction are different documents, written in different voices, for
  different readers. Don't merge them for convenience.
- **Symptom-first for support docs.** Users search by what they're
  experiencing, not by which module is broken.
- **Decisions are immutable once made.** Don't edit an old ADR's
  reasoning — if a decision changes, write a new ADR that supersedes it
  and says so.
- **Continuous updates tied to the workflow, not a separate pass.** See
  the Definition of Done checklist in the root `CLAUDE.md` — docs are
  part of finishing a task, not follow-up.
