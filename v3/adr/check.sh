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

# 3. Supersede reciprocity: X "superseded by Y" requires Y "Supersedes: ... X"
for f in $files; do
  id=$(echo "$f" | grep -o '^ADR-[0-9]\{3\}')
  succ=$(grep -m1 '^Status: superseded by' "$f" | grep -o 'ADR-[0-9]\{3\}' || true)
  if [ -n "$succ" ]; then
    sf=$(ls "${succ}"-*.md 2>/dev/null | head -1 || true)
    if [ -z "$sf" ] || ! grep -qi "supersedes.*${id}" "$sf"; then
      err "$f: superseded by $succ, but $succ does not list 'supersedes $id'"
    fi
  fi
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

# 5. Index consistency: every ADR file listed in README.md, status matching
for f in $files; do
  id=$(echo "$f" | grep -o '^ADR-[0-9]\{3\}')
  row=$(grep -F "$f" README.md || true)
  if [ -z "$row" ]; then
    err "README.md index is missing $f"
    continue
  fi
  status_word=$(grep -m1 '^Status:' "$f" | sed 's/^Status: *//;s/ .*//' || true)
  echo "$row" | grep -q "$status_word" || \
    err "README.md: $id index row does not carry status '$status_word'"
done

[ "$fail" -eq 0 ] || exit 1
echo "ADR check OK: $count ADRs, references and index consistent"
