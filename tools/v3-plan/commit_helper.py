#!/usr/bin/env python3
"""v3:commit — the pre-commit checklist's MECHANICAL half as one call.

WRAPPER, never a replacement. Judgment items stay the CALLER's (they
must appear in the calling reply — this tool cannot answer them); the
tool runs the mechanical gates fail-closed and commits. The
commit-policy validator runs via the repo's own hook, untouched.

Arm-fold provenance (the ch9 speedup ad-hoc arm review):
  COMMIT-01: no skip flag exists — the doc composite ALWAYS runs.
  COMMIT-02: at least one --scope is REQUIRED; staged list read
             NUL-safe; the full checked file list is printed.
  COMMIT-03: a file staged AND carrying unstaged edits is REFUSED
             (fail-closed — gates would judge different bytes than
             the commit ships).
  DIAG-01:   a failed git commit prints the hook's FULL output.

Usage:
  python3 tools/v3-plan/commit_helper.py --scope v3/ [--scope ...] \
      -m MSG_FILE [--dry-run]
"""
from __future__ import annotations
import argparse, os, subprocess, sys

TRAILER = "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"


def sh(args: list[str], cwd: str) -> tuple[int, str]:
    p = subprocess.run(args, capture_output=True, text=True, cwd=cwd)
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def purity_violations(porcelain_entries: list[str]) -> list[str]:
    """Fail-closed purity (COMMIT-03 + the re-check's NEW-COMMIT-04):
    a staged file with unstaged edits, AND a staged DELETE whose path
    reappears untracked, both mean the gates judge different bytes
    than the commit ships."""
    staged_mixed, staged_deleted, untracked = [], set(), set()
    for e in porcelain_entries:
        if len(e) < 4:
            continue
        x, y, path = e[0], e[1], e[3:]
        if x == "?" or y == "?":
            if x == "?" and y == "?":
                untracked.add(path)
            continue
        if x != " " and y != " ":
            staged_mixed.append(path)
        if x == "D":
            staged_deleted.add(path)
    reappeared = sorted(staged_deleted & untracked)
    return staged_mixed + [f"{p} (staged-delete reappears untracked)"
                           for p in reappeared]


def check_scope(files: list[str], scopes: list[str]) -> list[str]:
    return [f for f in files if not any(f.startswith(s) for s in scopes)]


def repo_root() -> str:
    here = os.path.dirname(os.path.abspath(__file__))
    cand = os.path.abspath(os.path.join(here, "..", ".."))
    if os.path.exists(os.path.join(cand, "package.json")) and \
       os.path.exists(os.path.join(cand, "v3")):
        return cand
    rc, out = sh(["git", "rev-parse", "--show-toplevel"], os.getcwd())
    if rc == 0:
        return out.strip()
    sys.exit("v3:commit: repo root not found")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--scope", action="append", default=[])
    ap.add_argument("-m", dest="msg_file")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    if a.selftest:
        # REAL refuse-lane fixtures (the re-check's NEW-TEST-01)
        assert check_scope(["v3/a", "x/b"], ["v3/"]) == ["x/b"]
        assert check_scope(["v3/a"], ["v3/"]) == []
        assert purity_violations(["MM v3/a"]) == ["v3/a"]
        assert purity_violations(["AM v3/a"]) == ["v3/a"]
        assert purity_violations(["M  v3/a", " M v3/b"]) == []
        assert purity_violations(["D  v3/a", "?? v3/a"]) ==             ["v3/a (staged-delete reappears untracked)"]
        assert purity_violations(["D  v3/a", "?? v3/other"]) == []
        print("v3:commit selftest: 7 case(s) exercised, 0 failure(s)")
        return 0
    root = repo_root()
    if not a.scope:
        sys.exit("v3:commit: at least one --scope is REQUIRED (COMMIT-02)")
    if not a.msg_file or not os.path.exists(a.msg_file):
        ap.error("-m MSG_FILE required (a real file)")
    # gate 1: staged list (NUL-safe) + scope + staged-vs-worktree purity
    rc, raw = sh(["git", "diff", "--cached", "--name-only", "-z"], root)
    files = [f for f in raw.split("\0") if f]
    if not files:
        sys.exit("v3:commit: nothing staged")
    outside = check_scope(files, a.scope)
    if outside:
        sys.exit(f"v3:commit: staged OUTSIDE scope {a.scope}: {outside}")
    rc, porc = sh(["git", "status", "--porcelain=v1", "-z"], root)
    violations = purity_violations([e for e in porc.split("\0") if e])
    if violations:
        sys.exit("v3:commit: staged-vs-worktree purity violation "
                 f"(gates would judge different bytes than the commit ships — COMMIT-03/-04): {violations}")
    # gate 2: the doc composite — ALWAYS (COMMIT-01)
    rc, out = sh([sys.executable,
                  os.path.join(os.path.dirname(os.path.abspath(__file__)),
                               "check_docs.py")], root)
    docs_line = out.strip().split("\n")[-1]
    if rc != 0:
        print(out)
        sys.exit("v3:commit: check-docs RED — fix before committing")
    # message + trailer
    msg = open(a.msg_file).read().rstrip("\n")
    if TRAILER not in msg:
        msg += "\n\n" + TRAILER
    print("Pre-commit checklist — mechanical half (v3:commit); the judgment "
          "lines MUST be answered in the calling reply, this tool cannot "
          "answer them:")
    print(f"- [x] Staged scope — {len(files)} file(s) within {a.scope}:")
    for f in files:
        print(f"        {f}")
    print(f"- [x] Doc gates — {docs_line}")
    print("- [x] Staged-vs-worktree purity — no staged file carries unstaged edits")
    print("- [ ] One logical change — CALLER-ANSWERED in the reply")
    print("- [ ] Docs sync (which docs reference this behavior?) — CALLER-ANSWERED")
    print("- [ ] Reflection triggers — CALLER-ANSWERED")
    if a.dry_run:
        print("v3:commit: dry-run — no commit")
        return 0
    rc, out = sh(["git", "commit", "-m", msg], root)
    if rc != 0:
        print(out)  # the hook's FULL output (DIAG-01)
        return rc
    print(out.strip().split("\n")[-1] if out else "")
    return 0


if __name__ == "__main__":
    sys.exit(main())
