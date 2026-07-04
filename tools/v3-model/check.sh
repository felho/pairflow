#!/usr/bin/env bash
# Golden test for the core-model source/render split:
# build the HTML from model-src/ and require it to be byte-identical to the
# canonical docs/v3/convergence/core-model.html. Fails if either side was
# edited without the other (edit sources -> run build.py; edit HTML -> re-run
# extract.py, or better, port the edit into the sources).
set -euo pipefail
cd "$(dirname "$0")/../.."

tmp="$(mktemp -t core-model-check.XXXXXX.html)"
trap 'rm -f "$tmp"' EXIT

python3 tools/v3-model/build.py --out "$tmp" >/dev/null

if cmp -s docs/v3/convergence/core-model.html "$tmp"; then
  echo "check: OK — model-src/ builds byte-identical core-model.html"
else
  echo "check: FAIL — built HTML differs from docs/v3/convergence/core-model.html" >&2
  cmp docs/v3/convergence/core-model.html "$tmp" | head -5 >&2 || true
  exit 1
fi

ledger_tmp="$(mktemp -t core-model-ledger.XXXXXX.md)"
trap 'rm -f "$tmp" "$ledger_tmp"' EXIT
python3 tools/v3-model/report_ledger.py --stdout > "$ledger_tmp"
if cmp -s docs/v3/convergence/model-src/ledger.md "$ledger_tmp"; then
  echo "check: OK — ledger.md is fresh"
else
  echo "check: FAIL — ledger.md is stale; run tools/v3-model/report_ledger.py" >&2
  exit 1
fi
