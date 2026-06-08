#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CODEX_SHIM_DIR=""

cleanup_ci_path() {
  if [[ -n "$CODEX_SHIM_DIR" ]]; then
    rm -rf "$CODEX_SHIM_DIR"
  fi
}

trap cleanup_ci_path EXIT

path_entry_contains_codex() {
  local path_entry="$1"
  local codex_candidate="$path_entry/codex"
  [[ -x "$codex_candidate" ]]
}

append_filtered_path_entry() {
  local path_entry="$1"
  if [[ -z "$FILTERED_PATH" ]]; then
    FILTERED_PATH="$path_entry"
  else
    FILTERED_PATH="$FILTERED_PATH:$path_entry"
  fi
}

if [[ "${PAIRFLOW_CI_ALLOW_CODEX:-0}" == "1" ]]; then
  echo "ci:local PATH mode: local PATH preserved (PAIRFLOW_CI_ALLOW_CODEX=1)"
else
  CODEX_SHIM_DIR="$(mktemp -d "${TMPDIR:-/tmp}/pairflow-ci-local-path.XXXXXX")"
  FILTERED_PATH=""
  SHIM_PATH_APPENDED="0"
  IFS=":" read -r -a PATH_ENTRIES <<< "$PATH"
  for path_entry in "${PATH_ENTRIES[@]}"; do
    if [[ -z "$path_entry" ]]; then
      continue
    fi
    if path_entry_contains_codex "$path_entry"; then
      for executable_path in "$path_entry"/*; do
        if [[ ! -x "$executable_path" ]]; then
          continue
        fi
        executable_name="$(basename "$executable_path")"
        if [[ "$executable_name" == "codex" ]]; then
          continue
        fi
        if [[ ! -e "$CODEX_SHIM_DIR/$executable_name" ]]; then
          ln -s "$executable_path" "$CODEX_SHIM_DIR/$executable_name"
        fi
      done
      if [[ "$SHIM_PATH_APPENDED" != "1" ]]; then
        append_filtered_path_entry "$CODEX_SHIM_DIR"
        SHIM_PATH_APPENDED="1"
      fi
      continue
    fi
    append_filtered_path_entry "$path_entry"
  done
  PATH="$FILTERED_PATH"
  export PATH
  echo "ci:local PATH mode: codex hidden (set PAIRFLOW_CI_ALLOW_CODEX=1 to preserve local PATH)"
fi
if command -v codex >/dev/null 2>&1; then
  echo "ci:local codex visibility: visible ($(command -v codex))"
else
  echo "ci:local codex visibility: hidden"
fi
echo

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

extract_root_cause_line() {
  local log_file="$1"
  local extracted
  extracted="$(extract_error_lines "$log_file")"
  if [[ -z "$extracted" ]]; then
    return 1
  fi

  local filtered
  filtered="$(printf '%s\n' "$extracted" | awk '
    {
      line=$0
      if (line ~ /ELIFECYCLE/) next
      if (line ~ /PAIRFLOW_EVIDENCE_EXIT=/) next
      if (line ~ /PAIRFLOW_EVIDENCE_COMMAND_RESULT/) next
      print line
      exit
    }'
  )"
  if [[ -n "$filtered" ]]; then
    printf '%s\n' "$filtered"
    return 0
  fi

  printf '%s\n' "$extracted" | head -n 1
}

extract_fitness_report_path() {
  local log_file="$1"
  local out_token
  out_token="$(
    grep -Eo 'out=[^[:space:]]+' "$log_file" | tail -n 1 || true
  )"
  if [[ -z "$out_token" ]]; then
    return 1
  fi
  printf '%s\n' "${out_token#out=}"
}

print_fitness_failure_summary() {
  local log_file="$1"
  local report_path
  report_path="$(extract_fitness_report_path "$log_file" || true)"
  if [[ -z "$report_path" ]]; then
    return 1
  fi
  if [[ ! -f "$report_path" ]]; then
    return 1
  fi

  local summary_output
  summary_output="$(
    node - "$report_path" <<'NODE'
const fs = require("node:fs");
const reportPath = process.argv[2];
const reportRaw = fs.readFileSync(reportPath, "utf8");
const report = JSON.parse(reportRaw);
const checks = Array.isArray(report?.checks) ? report.checks : [];
const failing = checks.find((check) => check?.status === "fail")
  ?? checks.find((check) => check?.status === "warn");
if (!failing) {
  process.exit(0);
}
const details = Array.isArray(failing.details) ? failing.details : [];
const topDetail = details[0];
process.stdout.write(`  fitness_check: ${String(failing.id ?? "unknown")}\n`);
process.stdout.write(`  fitness_status: ${String(failing.status ?? "unknown")}\n`);
process.stdout.write(`  fitness_summary: ${String(failing.summary ?? "n/a")}\n`);
if (topDetail !== undefined && topDetail !== null && String(topDetail).length > 0) {
  process.stdout.write(`  fitness_top_detail: ${String(topDetail)}\n`);
}
NODE
  )"
  if [[ -z "$summary_output" ]]; then
    return 1
  fi

  printf '%s\n' "$summary_output"
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
  echo "  failure summary:"
  if [[ "$step_id" == "fitness" ]]; then
    if ! print_fitness_failure_summary "$log_file"; then
      local root_line
      root_line="$(extract_root_cause_line "$log_file" || true)"
      if [[ -n "$root_line" ]]; then
        echo "  root_cause: $root_line"
      fi
    fi
  else
    local root_line
    root_line="$(extract_root_cause_line "$log_file" || true)"
    if [[ -n "$root_line" ]]; then
      echo "  root_cause: $root_line"
    fi
  fi
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

echo "ci:local start"
echo "ci:local run logs: $RUN_DIR"
if [[ "$CI_VERBOSE" != "1" ]]; then
  echo "ci:local mode: compact (set PAIRFLOW_CI_VERBOSE=1 for live command output)"
fi
echo

COMMIT_RANGE_FROM="${PAIRFLOW_COMMIT_RANGE_FROM:-}"
COMMIT_RANGE_TO="${PAIRFLOW_COMMIT_RANGE_TO:-}"
COMMIT_RANGE_REQUIRED="${PAIRFLOW_COMMIT_RANGE_REQUIRED:-0}"

if [[ -n "$COMMIT_RANGE_FROM" && -n "$COMMIT_RANGE_TO" ]]; then
  run_step "commit-range" "commit message range validation" pnpm commit-policy:validate-range -- --from "$COMMIT_RANGE_FROM" --to "$COMMIT_RANGE_TO"
elif [[ -n "$COMMIT_RANGE_FROM" || -n "$COMMIT_RANGE_TO" ]]; then
  echo "ci:local commit range not validated: incomplete safe range provided"
  echo "ci:local requires both PAIRFLOW_COMMIT_RANGE_FROM and PAIRFLOW_COMMIT_RANGE_TO before install/build/test steps"
  exit 1
elif [[ "$COMMIT_RANGE_REQUIRED" == "1" ]]; then
  echo "ci:local commit range not validated: no safe range provided"
  echo "ci:local requires PAIRFLOW_COMMIT_RANGE_FROM and PAIRFLOW_COMMIT_RANGE_TO before install/build/test steps"
  exit 1
else
  echo "ci:local commit range not validated: no safe range provided"
  echo
fi

run_step "install" "dependency lock validation" pnpm install --frozen-lockfile
run_step "check" "quality suite (pnpm check)" pnpm check

run_step "fitness" "fitness gate" pnpm fitness:check:ci
run_step "smoke" "almost-e2e smoke suite" pnpm test:smoke

echo "ci:local passed"
