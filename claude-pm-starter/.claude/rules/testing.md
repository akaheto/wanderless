---
paths:
  - "**/*.test.*"
  - "**/tests/**/*"
---

# Testing conventions

- Test files mirror the source file path (e.g. `src/foo.ts` → `src/foo.test.ts`).
- One assertion focus per test; use descriptive test names, not "test1".
- Mock external services; never hit real network/DB in unit tests.
