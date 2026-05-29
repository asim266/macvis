---
name: Bash Scripting
description: Robust shell scripts — pipes, traps, args, error handling.
when_to_use: Writing shell scripts, CLI glue, or automating command-line workflows.
icon: 🐚
---

# Bash Scripting

## Skeleton
```bash
#!/usr/bin/env bash
set -euo pipefail          # exit on error, unset var, pipe failure
IFS=$'\n\t'
trap 'echo "error on line $LINENO" >&2' ERR
```

## Practices
- Quote everything: `"$var"`, `"${arr[@]}"`. Avoids word-splitting bugs.
- Use `[[ ]]` not `[ ]`. Use `$(...)` not backticks.
- Args: parse with a `while`/`case` getopts loop; provide `-h` usage.
- Check tools exist: `command -v jq >/dev/null || { echo "need jq"; exit 1; }`.
- Make scripts idempotent; prefer `mkdir -p`, `rm -f`.

## Safety
- Never `rm -rf` a variable path without verifying it's non-empty and expected.
- Show destructive commands to the user before running; dry-run when possible.

## Verify
- `bash -n script.sh` (syntax check) and `shellcheck script.sh` if available.
