---
paths:
  - "backend/**/*.py"
  - "backend/pyproject.toml"
---

# Python standards

## Toolchain (2026 default stack)
- **uv** — environments, dependency install/lock, running scripts/commands.
  Don't use bare `pip install`; use `uv add` / `uv sync` so the lockfile
  stays authoritative.
- **ruff** — linting and formatting (`ruff check`, `ruff format`).
  Replaces black/isort/flake8; don't add those separately.
- **mypy** (or **ty** if the project has adopted it) — type checking.
  Run in strict mode; don't add `# type: ignore` without a comment
  explaining why.
- **pytest** — testing, with fixtures and `@pytest.mark.parametrize`
  rather than copy-pasted test variants.
- **pip-audit** — dependency vulnerability scanning before release.
- **pyproject.toml** is the single source of truth for dependencies,
  build config, ruff config, and mypy config. Don't reintroduce
  `requirements.txt`, `setup.py`, or scattered ini files alongside it.

Before considering any Python task done (run from `backend/`, or use
the `/code-audit` skill which does this for the whole monorepo):
```
uv run ruff check --fix .
uv run ruff format .
uv run mypy .        # or: uv run ty check
uv run pytest
```

## Code style
- **Type hints on every function signature** — parameters and return
  type. Use built-in generics (`list[str]`, `dict[str, int]`) and `|` for
  unions (`str | None`), not `typing.List`/`typing.Optional` — this
  project targets Python 3.11+.
- **Small, focused functions.** If a function needs a comment to explain
  what its middle section does, that section is probably a function.
- **Explicit over clever.** Prefer a readable three-line loop over a dense
  one-liner if the one-liner needs a re-read to parse.
- **Docstrings** on public functions/classes: what it does, args,
  returns, and any raised exceptions worth calling out. Skip boilerplate
  restating the type hints.
- **No bare `except:`.** Catch specific exceptions; if you must catch
  broadly, log with context and re-raise or handle deliberately.
- **Fail fast — never hide a failure.** Don't swallow an exception to
  return a "safe" default; don't skip a failed step silently. A surfaced
  error is cheap to fix now; a hidden one costs more later.
  ```python
  # Bad — hides the failure, returns a guess
  def get_user(user_id: str) -> User | None:
      try:
          return db.fetch_user(user_id)
      except Exception:
          return None

  # Good — fails loudly with context
  def get_user(user_id: str) -> User:
      try:
          return db.fetch_user(user_id)
      except DatabaseError as e:
          raise UserLookupError(f"Could not fetch user {user_id}") from e
  ```
- **Validate external input with Pydantic v2 models**, not manual
  dict-poking, for anything crossing a boundary (API request bodies,
  config files, external API responses).
- **Structured logging** (`logging` with extra fields, or a structured
  logger if the project has one) instead of bare `print` for anything
  beyond a throwaway script.

## Project layout
```
backend/
├── pyproject.toml
├── src/<package_name>/  # src/ layout — avoids accidental imports of
│   ├── __init__.py      # uninstalled local code shadowing the package
│   └── ...
└── tests/
    ├── unit/
    └── integration/
```
This lives under `backend/` in the monorepo — see the root `CLAUDE.md`
for how it relates to `frontend/`.

## Testing
- Every new function with non-trivial logic gets a test.
- Unit tests (`tests/unit/`) should run fast and not touch the network,
  filesystem, or a real database — mock those boundaries.
- Integration tests (`tests/integration/`) can be slower and exercise
  real boundaries; keep them separately runnable
  (`pytest tests/unit` vs `pytest tests/integration`).
- Track coverage; a coverage drop on a PR is worth flagging, not
  necessarily blocking — use judgment.

## Security
- Never commit secrets; read from environment variables or a secrets
  manager.
- Run `uv run pip-audit` before release or when adding a new dependency.
- Validate and sanitize any input that reaches a shell command, SQL
  query, or file path.
