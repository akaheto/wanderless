#!/usr/bin/env bash
# Fast first-pass security/standards check across the monorepo. Not a
# replacement for a real SAST or secret scanner. Usage: scan.sh [path]
set -uo pipefail

TARGET="${1:-.}"
FOUND=0

echo "== Secret-like patterns =="
if grep -rnE \
  -e '(api[_-]?key|secret|password|token)\s*[=:]\s*["'"'"'][A-Za-z0-9_\-]{12,}["'"'"']' \
  -e 'AKIA[0-9A-Z]{16}' \
  -e '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----' \
  --include='*.py' --include='*.ts' --include='*.tsx' --include='*.js' \
  --include='*.env*' --include='*.toml' --include='*.yaml' --include='*.yml' \
  --include='*.json' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.venv \
  -I "$TARGET" 2>/dev/null; then
  echo "^ review the above — possible hardcoded secret"
  FOUND=1
else
  echo "none found"
fi

echo
if [ -d "$TARGET/backend" ] || [ -f "$TARGET/pyproject.toml" ]; then
  echo "== pip-audit (backend) =="
  (cd "${TARGET}/backend" 2>/dev/null || cd "$TARGET"; uv run pip-audit) || FOUND=1
  echo
fi

if [ -d "$TARGET/frontend" ]; then
  echo "== npm audit (frontend) =="
  (cd "$TARGET/frontend" && npm audit --audit-level=high) || FOUND=1
  echo
fi

echo "== Unsafe Python patterns =="
grep -rn --exclude-dir=node_modules --exclude-dir=.venv --include='*.py' -E 'except\s*:' "$TARGET" 2>/dev/null && FOUND=1
grep -rn --exclude-dir=node_modules --exclude-dir=.venv --include='*.py' -E '\b(eval|exec)\(' "$TARGET" 2>/dev/null && FOUND=1
grep -rn --exclude-dir=node_modules --exclude-dir=.venv --include='*.py' -E 'shell\s*=\s*True' "$TARGET" 2>/dev/null && FOUND=1
grep -rn --exclude-dir=node_modules --exclude-dir=.venv --include='*.py' -E 'f["'"'"'](SELECT|INSERT|UPDATE|DELETE)\b.*\{' "$TARGET" 2>/dev/null && FOUND=1

echo
echo "== Unsafe frontend patterns =="
grep -rn --exclude-dir=node_modules --exclude-dir=.next --include='*.tsx' --include='*.ts' -E 'dangerouslySetInnerHTML' "$TARGET" 2>/dev/null && FOUND=1
grep -rn --exclude-dir=node_modules --exclude-dir=.next --include='*.tsx' --include='*.ts' -E '\beval\(' "$TARGET" 2>/dev/null && FOUND=1

if [ "$FOUND" -eq 0 ]; then
  echo "CLEAN"
else
  echo
  echo "Review findings above before committing."
fi
