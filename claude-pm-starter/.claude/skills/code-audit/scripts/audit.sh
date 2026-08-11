#!/usr/bin/env bash
# Runs the full monorepo quality gate, stopping at the first failure.
# Usage: audit.sh [backend|frontend]   (default: both)
set -uo pipefail

SCOPE="${1:-all}"
REPO_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"

run_stage() {
  local name="$1"; shift
  echo "== ${name} =="
  if ! "$@"; then
    echo "FAIL: ${name}"
    exit 1
  fi
}

run_backend() {
  if [ ! -d "$REPO_ROOT/backend" ]; then return 0; fi
  cd "$REPO_ROOT/backend"
  run_stage "backend: ruff check"          uv run ruff check .
  run_stage "backend: ruff format --check" uv run ruff format --check .
  run_stage "backend: mypy"                uv run mypy .
  run_stage "backend: pytest"              uv run pytest
}

run_frontend() {
  if [ ! -d "$REPO_ROOT/frontend" ]; then return 0; fi
  cd "$REPO_ROOT/frontend"
  run_stage "frontend: eslint"          npm run lint
  run_stage "frontend: prettier check"  npm run format:check
  run_stage "frontend: tsc"             npm run type-check
  run_stage "frontend: vitest"          npm run test
}

case "$SCOPE" in
  backend)  run_backend ;;
  frontend) run_frontend ;;
  all)      run_backend && run_frontend ;;
  *) echo "usage: audit.sh [backend|frontend]"; exit 2 ;;
esac

echo "ALL CLEAN"
