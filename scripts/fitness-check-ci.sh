#!/usr/bin/env bash

set -euo pipefail

# CI milestone input precedence:
# 1) PAIRFLOW_CI_MILESTONE (pipeline param)
# 2) PAIRFLOW_FITNESS_CURRENT_MILESTONE
# 3) policy defaults.current_milestone (no explicit override)
CURRENT_MILESTONE="${PAIRFLOW_CI_MILESTONE:-${PAIRFLOW_FITNESS_CURRENT_MILESTONE:-}}"
POLICY_PATH="${PAIRFLOW_FITNESS_POLICY_PATH:-tools/fitness/policy.json}"
OUT_PATH="${PAIRFLOW_FITNESS_REPORT_PATH:-.pairflow/evidence/fitness-report.json}"

echo "fitness:check:ci using milestone=${CURRENT_MILESTONE:-policy-default} policy=${POLICY_PATH} out=${OUT_PATH}"

args=(
  --policy "${POLICY_PATH}"
  --out "${OUT_PATH}"
)

if [[ -n "${CURRENT_MILESTONE}" ]]; then
  args+=(--current-milestone "${CURRENT_MILESTONE}")
fi

pnpm exec tsx ./tools/fitness/run-check.ts "${args[@]}"
