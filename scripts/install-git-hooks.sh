#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

required_hooks=(".githooks/pre-push" ".githooks/commit-msg")

for hook in "${required_hooks[@]}"; do
  if [[ ! -f "$hook" ]]; then
    echo "Missing required git hook: $hook" >&2
    exit 1
  fi
  if [[ ! -r "$hook" ]]; then
    echo "Required git hook is not readable: $hook" >&2
    exit 1
  fi
done

git config core.hooksPath .githooks
chmod +x "${required_hooks[@]}"

echo "Installed git hooks path: .githooks"
echo "pre-push hook is now active: runs 'pnpm ci:local'"
echo "commit-msg hook is now active: runs 'pnpm commit-policy:validate-message'"
