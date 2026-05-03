#!/usr/bin/env bash

set -euo pipefail

POLICY_PATH="${PAIRFLOW_FITNESS_POLICY_PATH:-tools/fitness/policy.json}"
if [[ -n "${PAIRFLOW_FITNESS_REPORT_PATH:-}" ]]; then
  OUT_PATH="${PAIRFLOW_FITNESS_REPORT_PATH}"
elif [[ -n "${PAIRFLOW_FITNESS_REPO_ROOT:-}" ]]; then
  OUT_PATH="${PAIRFLOW_FITNESS_REPO_ROOT}/.pairflow/evidence/fitness-report.json"
else
  OUT_PATH=".pairflow/evidence/fitness-report.json"
fi

echo "fitness:check:ci using policy=${POLICY_PATH} out=${OUT_PATH}"

args=(
  --policy "${POLICY_PATH}"
  --out "${OUT_PATH}"
)

pnpm exec tsx ./tools/fitness/run-check.ts "${args[@]}"
