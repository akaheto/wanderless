---
name: security-scan
description: Fast first-pass security and standards check across the monorepo — hardcoded-secret patterns, backend dependency vulnerabilities (pip-audit), frontend dependency vulnerabilities (npm audit), and common unsafe patterns in both Python and TypeScript/React. Use before committing or as part of definition of done. Not a replacement for a real SAST/secret scanner.
allowed-tools: Bash, Read, Grep
argument-hint: [path]
---

Run `scripts/scan.sh` with the optional path argument (defaults to the
whole repo). It checks, in order:

1. **Secret-like patterns** — grep across Python, TypeScript/JS, env,
   and config files for common credential shapes. Heuristic first pass,
   not a real secret scanner — it will miss things a dedicated tool
   catches.
2. **`pip-audit`** (backend) and **`npm audit`** (frontend) — known
   dependency vulnerabilities.
3. **Unsafe patterns** — Python: bare `except:`, `eval`/`exec`,
   `shell=True`, string-formatted SQL. Frontend: `dangerouslySetInnerHTML`,
   `eval(`.

Report format:

- **Findings**: `file:line` plus a one-line reason, grouped by category
- **Severity**: flag secrets and `shell=True`/`eval` as high priority;
  bare `except:` and dependency CVEs at whatever severity `pip-audit`
  reports
- If clean, say so in one line

If this finds a likely real secret, stop and tell the person directly —
don't keep working past it, and don't try to remove or rewrite it
yourself without asking; they may need to rotate the credential first.

For anything beyond this fast pass — real SAST, dependency graph
analysis, container/IaC scanning — recommend a dedicated tool (e.g. Snyk,
Anthropic's bundled `security-guidance`/`claude-security` plugins) rather
than trying to extend this script into one.
