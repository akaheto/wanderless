---
name: definition-of-done
description: Run before marking any story or task complete. Checks verification evidence, backlog status, and documentation against the project's definition of done.
---

Check the current work against the definition of done in the root
`CLAUDE.md`. For each item, don't just assert it's satisfied — show the
evidence:

1. **Verification**: what check was run (test/build/lint/screenshot), and
   what was its actual output? If none was run, run one now before
   continuing. If nothing can verify this task, say so explicitly.
2. **Backlog**: is there a story in `docs/pm/backlog/` for this work? Is
   its status field accurate right now?
3. **ADR**: did this involve a significant, hard-to-reverse technical
   decision? If yes and no ADR exists yet, flag it — don't write one
   silently without confirming it's warranted.
4. **User guide**: does this change anything a user would notice? If yes,
   is `docs/user/user-guide.md` updated?
5. **Support docs**: could this plausibly generate a support question or
   confusion? If yes, is it reflected in `docs/support/troubleshooting.md`
   or `faq.md`?
6. **Changelog**: is there a line in `CHANGELOG.md` under Unreleased?

Report back a short pass/fail list, not a wall of prose. For anything
that fails, either fix it now or state clearly why it doesn't apply to
this task — don't mark something done by silently skipping it.
