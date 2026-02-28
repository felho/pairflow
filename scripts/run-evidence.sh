#!/usr/bin/env bash
set -uo pipefail

if [ "$#" -lt 3 ]; then
  echo "Usage: $0 <log-path> <command-label> -- <command> [args...]" >&2
  exit 2
fi

log_path="$1"
shift
command_label="$1"
shift

if [ "$1" != "--" ]; then
  echo "Expected '--' separator before command arguments." >&2
  exit 2
fi
shift

if [ "$#" -eq 0 ]; then
  echo "Missing command to execute." >&2
  exit 2
fi

mkdir -p "$(dirname "$log_path")"

timestamp_utc="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
git_sha="$(git rev-parse --verify HEAD 2>/dev/null || echo UNKNOWN)"

{
  echo "PAIRFLOW_EVIDENCE_HEADER_BEGIN"
  echo "PAIRFLOW_EVIDENCE_TIMESTAMP_UTC=$timestamp_utc"
  echo "PAIRFLOW_EVIDENCE_GIT_SHA=$git_sha"
  echo "PAIRFLOW_EVIDENCE_COMMAND=$command_label"
  echo "PAIRFLOW_EVIDENCE_HEADER_END"
} >"$log_path"

"$@" 2>&1 | tee -a "$log_path"
command_exit_code=$?

if [ "$command_exit_code" -eq 0 ]; then
  command_status="pass"
else
  command_status="failed"
fi

echo "PAIRFLOW_EVIDENCE_COMMAND_RESULT command=\"$command_label\" status=$command_status exit=$command_exit_code" | tee -a "$log_path"
echo "PAIRFLOW_EVIDENCE_EXIT=$command_exit_code" | tee -a "$log_path"

exit "$command_exit_code"
