#!/usr/bin/env bash
# ADR integrity check (PI-10): status values, dangling ADR references,
# supersede reciprocity + cycles, index<->file consistency.
# Plain script over markdown — no graph database (playbook §8).
set -euo pipefail
cd "$(dirname "$0")"

fail=0
err() { echo "ADR-CHECK FAIL: $*" >&2; fail=1; }

files=$(ls ADR-[0-9][0-9][0-9]-*.md 2>/dev/null || true)
if [ -z "$files" ]; then
  err "no ADR files found"
  exit 1
fi

# 1. Status values
for f in $files; do
  status=$(grep -m1 '^Status:' "$f" | sed 's/^Status: *//' || true)
  case "$status" in
    proposed|accepted|deprecated) ;;
    "superseded by ADR-"[0-9][0-9][0-9]) ;;
    *) err "$f: invalid Status '$status'" ;;
  esac
done

# 2. Dangling numeric ADR references (ADR-NNN mentioned anywhere must exist)
for f in $files README.md; do
  for ref in $(grep -o 'ADR-[0-9]\{3\}' "$f" | sort -u); do
    ls "${ref}"-*.md >/dev/null 2>&1 || err "$f: dangling reference $ref"
  done
done

# 3. Supersede reciprocity, both directions.
# The supersedes field is parsed from the Links line only ("Links: supersedes
# ... ·"), so body prose mentioning supersession cannot satisfy the check.
links_supersedes() { grep -m1 '^Links:' "$1" | sed 's/.*supersedes//;s/·.*//' || true; }

# 3a. X "Status: superseded by Y" requires Y to list "supersedes ... X"
for f in $files; do
  id=$(echo "$f" | grep -o '^ADR-[0-9]\{3\}')
  succ=$(grep -m1 '^Status: superseded by' "$f" | grep -o 'ADR-[0-9]\{3\}' || true)
  if [ -n "$succ" ]; then
    sf=$(ls "${succ}"-*.md 2>/dev/null | head -1 || true)
    if [ -z "$sf" ] || ! links_supersedes "$sf" | grep -q "$id"; then
      err "$f: superseded by $succ, but $succ does not list 'supersedes $id'"
    fi
  fi
done

# 3b. Y "supersedes X" requires X "Status: superseded by Y" — a new ADR must
# not claim supersession while the target still reads accepted.
for f in $files; do
  id=$(echo "$f" | grep -o '^ADR-[0-9]\{3\}')
  for target in $(links_supersedes "$f" | grep -o 'ADR-[0-9]\{3\}' || true); do
    tf=$(ls "${target}"-*.md 2>/dev/null | head -1 || true)
    [ -z "$tf" ] && continue # dangling ref already reported by check 2
    tstatus=$(grep -m1 '^Status:' "$tf" | sed 's/^Status: *//' || true)
    [ "$tstatus" = "superseded by $id" ] || \
      err "$f: supersedes $target, but $target Status is '$tstatus' (expected 'superseded by $id')"
  done
done

# 4. Supersede cycles: following the superseded-by chain must terminate
count=$(echo "$files" | wc -w | tr -d ' ')
for f in $files; do
  cur="$f"
  hops=0
  while :; do
    succ=$(grep -m1 '^Status: superseded by' "$cur" | grep -o 'ADR-[0-9]\{3\}' || true)
    [ -z "$succ" ] && break
    cur=$(ls "${succ}"-*.md 2>/dev/null | head -1 || true)
    [ -z "$cur" ] && break
    hops=$((hops + 1))
    if [ "$hops" -gt "$count" ]; then
      err "supersede cycle involving $f"
      break
    fi
  done
done

# 5. Index consistency: every ADR file listed in README.md, and the row
# carries the FULL status string (e.g. "superseded by ADR-005", not just
# "superseded").
for f in $files; do
  id=$(echo "$f" | grep -o '^ADR-[0-9]\{3\}')
  row=$(grep -F "$f" README.md || true)
  if [ -z "$row" ]; then
    err "README.md index is missing $f"
    continue
  fi
  status=$(grep -m1 '^Status:' "$f" | sed 's/^Status: *//' || true)
  echo "$row" | grep -qF "$status" || \
    err "README.md: $id index row does not carry status '$status'"
done

[ "$fail" -eq 0 ] || exit 1
echo "ADR check OK: $count ADRs, references and index consistent"
