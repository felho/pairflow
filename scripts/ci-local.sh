#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CURRENT_MILESTONE="${PAIRFLOW_CI_MILESTONE:-${PAIRFLOW_LOCAL_CI_MILESTONE:-M0}}"

echo "ci:local start (milestone=${CURRENT_MILESTONE})"
echo "ci:local step: dependency lock validation"
pnpm install --frozen-lockfile

echo "ci:local step: quality suite (pnpm check)"
pnpm check

echo "ci:local step: fitness gate"
PAIRFLOW_CI_MILESTONE="${CURRENT_MILESTONE}" pnpm fitness:check:ci

echo "ci:local passed"
