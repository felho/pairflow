#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CURRENT_MILESTONE="${PAIRFLOW_CI_MILESTONE:-${PAIRFLOW_LOCAL_CI_MILESTONE:-}}"

echo "ci:local start (milestone=${CURRENT_MILESTONE:-policy-default})"
echo "ci:local step: dependency lock validation"
pnpm install --frozen-lockfile

echo "ci:local step: quality suite (pnpm check)"
pnpm check

echo "ci:local step: fitness gate"
if [[ -n "${CURRENT_MILESTONE}" ]]; then
  PAIRFLOW_CI_MILESTONE="${CURRENT_MILESTONE}" pnpm fitness:check:ci
else
  pnpm fitness:check:ci
fi

echo "ci:local passed"
