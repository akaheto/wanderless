---
name: new-feature
description: Interview the user about a new feature before writing any code, then turn the answers into a scoped story. Use for larger or ambiguous features where the approach isn't obvious.
---
Interview the user in detail about the feature they want, using the
AskUserQuestion tool. Cover technical implementation, UI/UX, edge cases,
concerns, and tradeoffs. Don't ask obvious questions — dig into the parts
they might not have considered (error states, empty states, concurrent
access, what happens when an external dependency is unavailable).

Keep interviewing until the shape of the feature is clear, then:

1. Write a complete spec to `docs/pm/backlog/` as a story (or epic +
   stories if it's large), following `STORY_TEMPLATE.md`. The spec should
   be self-contained: name the files and interfaces involved, state what
   is explicitly out of scope, and end with an end-to-end verification
   step that proves the feature works when implemented.
2. Report the story file(s) created and ask whether to proceed with
   implementation now or start a fresh session against the written spec.
   A fresh session focused purely on implementation, with a written spec
   to reference, tends to produce cleaner results than continuing in the
   same context that did the interviewing.
