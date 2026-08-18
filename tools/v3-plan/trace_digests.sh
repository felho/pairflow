#!/usr/bin/env bash
# K17(b) — the replay-digest equality check, made RUNNABLE.
#
# Replays the golden traces that pass through the shared harness seam
# with the digest sink armed, then compares the result to the pinned
# baseline. A moved digest is a behaviour change; the (a) text half is
# what catches a re-pin, and this is what catches a silent behavioural
# drift the traces' own assertions did not cover.
#
# WHAT IT REACHES, named rather than implied: only the traces that go
# through `replayTrace`. The other golden traces drive a kernel directly
# and have no shared measurement point; they are covered by the (a) text
# half and by their own assertions.
set -euo pipefail
repo="$(cd "$(dirname "$0")/../.." && pwd)"
baseline="$repo/v3/src/drift/traceDigestBaseline.json"
actual="$(mktemp -t trace-digests)"
trap 'rm -f "$actual"' EXIT

( cd "$repo/v3" && V3_TRACE_DIGESTS="$actual" pnpm exec vitest run --no-file-parallelism \
    src/l0bTrace.test.ts src/l0cTrace.test.ts src/l0eTrace.test.ts src/l2bTrace.test.ts >/dev/null )

if [ ! -s "$actual" ]; then
  echo "trace-digests: NO digest was recorded — the sink did not fire (a silent zero proves nothing)" >&2
  exit 1
fi
if diff -u "$baseline" "$actual"; then
  echo "trace-digests: replay digests match the pinned baseline"
else
  echo "trace-digests: the replay digest MOVED — behaviour changed" >&2
  exit 1
fi
