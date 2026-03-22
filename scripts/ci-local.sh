#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CURRENT_MILESTONE="${PAIRFLOW_CI_MILESTONE:-${PAIRFLOW_LOCAL_CI_MILESTONE:-}}"
CI_VERBOSE="${PAIRFLOW_CI_VERBOSE:-0}"
EVIDENCE_ROOT="${PAIRFLOW_CI_EVIDENCE_DIR:-.pairflow/evidence/ci-local}"
RUN_ID="$(date -u +"%Y%m%dT%H%M%SZ")"
RUN_DIR="$EVIDENCE_ROOT/$RUN_ID"
mkdir -p "$RUN_DIR"

extract_error_lines() {
  local log_file="$1"
  local pattern='ELIFECYCLE|ERR_PNPM|(^|[[:space:]])error([[:space:]:]|$)|(^|[[:space:]])fail(ed|ure)?([[:space:]:]|$)|(^|[[:space:]])FAIL([[:space:]:]|$)'

  if command -v rg >/dev/null 2>&1; then
    rg -n -i "$pattern" "$log_file" | tail -n 40 || true
    return
  fi

  grep -Ein "$pattern" "$log_file" | tail -n 40 || true
}

print_failure_summary() {
  local step_id="$1"
  local step_label="$2"
  local log_file="$3"
  local exit_code="$4"
  local command_text="$5"

  echo
  echo "ci:local FAILED"
  echo "  step: $step_label ($step_id)"
  echo "  exit: $exit_code"
  echo "  command: $command_text"
  echo "  full log: $log_file"
  echo "  run logs: $RUN_DIR"
  echo
  echo "ci:local matched error lines (last 40):"
  extract_error_lines "$log_file"
  echo
  echo "ci:local log tail (last 80 lines):"
  tail -n 80 "$log_file" || true
}

run_step() {
  local step_id="$1"
  local step_label="$2"
  shift 2
  local log_file="$RUN_DIR/${step_id}.log"
  local command_text="$*"
  local started_at
  local finished_at
  local duration_s

  echo "ci:local step: $step_label"
  echo "ci:local log: $log_file"
  started_at="$(date +%s)"

  if [[ "$CI_VERBOSE" == "1" ]]; then
    if "$@" 2>&1 | tee "$log_file"; then
      :
    else
      local exit_code=$?
      print_failure_summary "$step_id" "$step_label" "$log_file" "$exit_code" "$command_text"
      exit "$exit_code"
    fi
  else
    if "$@" >"$log_file" 2>&1; then
      :
    else
      local exit_code=$?
      print_failure_summary "$step_id" "$step_label" "$log_file" "$exit_code" "$command_text"
      exit "$exit_code"
    fi
  fi

  finished_at="$(date +%s)"
  duration_s=$((finished_at - started_at))
  echo "ci:local step passed: $step_label (${duration_s}s)"
  echo
}

echo "ci:local start (milestone=${CURRENT_MILESTONE:-policy-default})"
echo "ci:local run logs: $RUN_DIR"
if [[ "$CI_VERBOSE" != "1" ]]; then
  echo "ci:local mode: compact (set PAIRFLOW_CI_VERBOSE=1 for live command output)"
fi
echo

run_step "install" "dependency lock validation" pnpm install --frozen-lockfile
run_step "check" "quality suite (pnpm check)" pnpm check

if [[ -n "${CURRENT_MILESTONE}" ]]; then
  run_step "fitness" "fitness gate" env PAIRFLOW_CI_MILESTONE="${CURRENT_MILESTONE}" pnpm fitness:check:ci
else
  run_step "fitness" "fitness gate" pnpm fitness:check:ci
fi

echo "ci:local passed"
