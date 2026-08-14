#!/usr/bin/env bash
# arm_run.sh — the ReviewPacket §6 arm invocation boilerplate as one call.
# WRAPPER over §6 items 1/2/5/6: availability preflight, byte-guard
# before/after (untracked CONTENT hashes, NUL-safe), pinned FOREGROUND
# launch with a mode timeout, guard re-take, header-pin validation.
# The PROMPT shape (item 7) and verdict processing stay the caller's.
# Arm-fold provenance: ARM-01 (guard strictness), ARM-02 (preflight +
# timeout + rc-first classification).
# Usage: arm_run.sh <promptfile> <outfile> (--target <file> | --no-target)
#                   [--timeout <secs>, default 2700 — the 45-min fallback cap (ch13 boundary; the 20-min cap killed four working runs)]
# Exit: 0 ok · 2 usage/preflight · 3 pin-mismatch · 4 guard-trip · 5 codex-error · 6 guard-infra
set -uo pipefail
PROMPT=""; OUT=""; TARGET=""; NO_TARGET=0; TIMEOUT=2700; REQUIRE_CLEAN=0
while [ $# -gt 0 ]; do case "$1" in
  --target) [ -n "${2:-}" ] || { echo "arm_run: --target needs a value"; exit 2; }; TARGET="$2"; shift 2;;
  --no-target) NO_TARGET=1; shift;;
  --timeout) [ -n "${2:-}" ] || { echo "arm_run: --timeout needs a value"; exit 2; }; TIMEOUT="$2"; shift 2;;
  --require-clean) REQUIRE_CLEAN=1; shift;;
  *) if [ -z "$PROMPT" ]; then PROMPT="$1"; elif [ -z "$OUT" ]; then OUT="$1"; else echo "usage"; exit 2; fi; shift;;
esac; done
case "$TIMEOUT" in (*[!0-9]*|"") echo "arm_run: --timeout must be a positive integer"; exit 2;; esac
[ "$TIMEOUT" -gt 0 ] || { echo "arm_run: --timeout must be > 0"; exit 2; }
[ -f "${PROMPT}" ] && [ -n "${OUT}" ] || { echo "usage: arm_run.sh <promptfile> <outfile> (--target f | --no-target) [--timeout s]"; exit 2; }
{ [ -n "$TARGET" ] && [ -f "$TARGET" ]; } || [ "$NO_TARGET" = 1 ] || { echo "arm_run: --target <file> or an EXPLICIT --no-target is required (ARM-01)"; exit 2; }
command -v codex >/dev/null || { echo "arm_run: PREFLIGHT FAIL — codex not on PATH (§6 availability)"; exit 2; }
ROOT="$(git rev-parse --show-toplevel)" || { echo "arm_run: not in a repo"; exit 2; }
cd "$ROOT" || exit 2
PIN_ROW="$(grep -E '^\| ' v3/implementation/arm-pin.md | tail -1)" || { echo "arm_run: pin read failed"; exit 2; }
MODEL="$(echo "$PIN_ROW" | awk -F'|' '{gsub(/^ +| +$/,"",$3); print $3}')"
EFFORT="$(echo "$PIN_ROW" | awk -F'|' '{gsub(/^ +| +$/,"",$4); print $4}')"
[ -n "$MODEL" ] && [ -n "$EFFORT" ] || { echo "arm_run: pin parse failed: $PIN_ROW"; exit 2; }

guard() {  # any sub-measurement failure => infra (ARM-01), caller sees exit 6
  local g=""
  g+="$(git rev-parse HEAD)"$'\n' || return 1
  g+="$(git status --porcelain=v1 -z | shasum)"$'\n' || return 1
  g+="$(git diff --binary HEAD | shasum)"$'\n' || return 1
  while IFS= read -r -d '' f; do
    g+="$(shasum -a 256 "$f")"$'\n' || return 1
  done < <(git ls-files --others --exclude-standard -z)
  if [ -n "$TARGET" ]; then g+="$(shasum -a 256 "$TARGET")"$'\n' || return 1; fi
  printf '%s' "$g"
}
if [ "$REQUIRE_CLEAN" = 1 ]; then
  git diff HEAD --exit-code >/dev/null 2>&1 && [ -z "$(git status --porcelain=v1)" ]     || { echo "arm_run: --require-clean: tree is not clean"; exit 6; }
fi
G_BEFORE="$(guard)" || { echo "arm_run: GUARD MEASUREMENT FAILED (before)"; exit 6; }

# BYTE-GUARD SELF-TRIP FIX (process-log 2026-08-07): codex output is
# written to a mktemp file OUTSIDE the repo — a repo-pathed $OUT used
# to appear as a new/changed untracked file between the two guard
# takes, tripping the guard (exit 4) on every repo-pathed run before
# pin validation. The tmp file moves to the requested $OUT only AFTER
# the post-run guard comparison, so the guard never sees it. (A
# repo-pathed PROMPT file is fine as-is: it exists before AND after,
# so the untracked hash set is identical.)
OUT_TMP="$(mktemp)" || { echo "arm_run: mktemp failed"; exit 6; }
# Arm fold (2026-08-14 review, finding 3): the publish itself is
# CHECKED — a failed mv used to fall through and misclassify as
# pin-mismatch (empty header fields), an exit-lane substitution; and
# the tmp file leaked. publish() reports failure loudly and the trap
# clears any unpublished tmp on every exit.
trap '[ -f "$OUT_TMP" ] && rm -f "$OUT_TMP"' EXIT
publish() {  # $1 = the lane's message context; returns 0 iff $OUT is written
  if mv -f "$OUT_TMP" "$OUT" 2>/dev/null; then return 0; fi
  echo "arm_run: OUTPUT PUBLISH FAILED ($1) — verdict preserved at $OUT_TMP (not deleted)"
  trap - EXIT  # keep the tmp file for manual recovery
  return 1
}

set -m  # own process group for the codex job => killable as a group
codex exec --sandbox danger-full-access -m "$MODEL" \
  -c "model_reasoning_effort=$EFFORT" -c approval_policy=never \
  - < "$PROMPT" > "$OUT_TMP" 2>&1 &
CPID=$!
TIMED_OUT=0
SECS=0
while kill -0 "$CPID" 2>/dev/null; do
  sleep 5; SECS=$((SECS+5))
  if [ "$SECS" -ge "$TIMEOUT" ]; then
    kill -TERM -- "-$CPID" 2>/dev/null || kill "$CPID" 2>/dev/null
    sleep 3
    kill -KILL -- "-$CPID" 2>/dev/null || kill -9 "$CPID" 2>/dev/null
    TIMED_OUT=1
    break
  fi
done
wait "$CPID" 2>/dev/null; CODEX_RC=$?
if [ "$TIMED_OUT" = 1 ]; then
  # the POST-guard is mandatory on EVERY exit lane (NEW-ARM-03: a
  # timed-out reviewer's repo writes must surface as a guard trip,
  # which OUTRANKS the timeout classification)
  G_AFTER="$(guard)" || { publish "after-timeout guard-infra lane" || true; echo "arm_run: GUARD MEASUREMENT FAILED (after timeout)"; exit 6; }
  if [ "$G_BEFORE" != "$G_AFTER" ]; then
    publish "timed-out guard-trip lane" || true
    echo "arm_run: BYTE GUARD TRIP during a TIMED-OUT run — verdict INVALID, tree touched"
    diff <(printf '%s' "$G_BEFORE") <(printf '%s' "$G_AFTER") || true
    exit 4
  fi
  publish "timeout lane" || true
  echo "arm_run: TIMEOUT after ${TIMEOUT}s, process group killed, guards clean (infra lane, §6 item 8)"
  exit 5
fi

G_AFTER="$(guard)" || { publish "guard-infra lane" || true; echo "arm_run: GUARD MEASUREMENT FAILED (after)"; exit 6; }
if [ "$G_BEFORE" != "$G_AFTER" ]; then
  publish "guard-trip lane" || true
  echo "arm_run: BYTE GUARD TRIP — verdict INVALID"
  diff <(printf '%s' "$G_BEFORE") <(printf '%s' "$G_AFTER") || true
  exit 4
fi
# the guard comparison is done — the verdict may now land at its
# requested (possibly repo-pathed) home; every later step reads $OUT.
# A failed publish here is an INFRA failure (exit 5, the codex-error
# lane's class): the header checks below read $OUT and would otherwise
# misclassify an unwritten file as a pin mismatch.
publish "normal lane" || exit 5
# rc FIRST (ARM-02: a dead codex must classify as codex-error, never pin-mismatch)
[ "$CODEX_RC" -eq 0 ] || { echo "arm_run: codex exit $CODEX_RC (infra lane)"; exit 5; }
HDR_MODEL="$(grep -m1 '^model:' "$OUT" | awk '{print $2}')"
HDR_EFFORT="$(grep -m1 'reasoning effort:' "$OUT" | awk -F': ' '{print $2}')"
HDR_APPROVAL="$(grep -m1 '^approval:' "$OUT" | awk '{print $2}')"
if [ "$HDR_MODEL" != "$MODEL" ] || [ "$HDR_EFFORT" != "$EFFORT" ] || [ "$HDR_APPROVAL" != "never" ]; then
  echo "arm_run: PIN MISMATCH (header: ${HDR_MODEL:-?}/${HDR_EFFORT:-?}/${HDR_APPROVAL:-?} vs pin: $MODEL/$EFFORT/never) — INVALID"; exit 3
fi
echo "arm_run: OK (pin $MODEL/$EFFORT, guards clean, ${SECS}s) — verdict tail:"
tail -3 "$OUT"
