#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

git config core.hooksPath .githooks
chmod +x .githooks/pre-push

echo "Installed git hooks path: .githooks"
echo "pre-push hook is now active: runs 'pnpm ci:local'"
