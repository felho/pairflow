#!/usr/bin/env bash

set -euo pipefail

POLICY_PATH="${PAIRFLOW_FITNESS_POLICY_PATH:-tools/fitness/policy.json}"
OUT_PATH="${PAIRFLOW_FITNESS_REPORT_PATH:-.pairflow/evidence/fitness-report.json}"

echo "fitness:check:ci using policy=${POLICY_PATH} out=${OUT_PATH}"

args=(
  --policy "${POLICY_PATH}"
  --out "${OUT_PATH}"
)

pnpm exec tsx ./tools/fitness/run-check.ts "${args[@]}"
