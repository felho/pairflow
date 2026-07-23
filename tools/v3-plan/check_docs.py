#!/usr/bin/env python3
"""v3:check-docs — ONE call for the doc-surface tier-0 family.

WRAPPER, never a replacement (the ch9 speedup batch's rule), and an
ADDITIVE BASELINE, never a gate-point substitute (the arm's GATE-01):
each MODE runs its gate-point's exact canonical doc-family commands
and PRINTS what it does NOT cover — the gate-point's own inventory
(README §5.5) stays canonical.

Modes:
  quick (default)  packet-lint, adr-check, realized-map, deferred —
                   the between-edits baseline
  packet-approve   packet-lint --forbid-reopened, coverage --fold-time,
                   adr-check, realized-map  (NOT covered here: drift
                   tests, substrate probes — run per the §5.5 column)
  chapter-close    quick + deferred --closed <ch> + coverage
                   (NOT covered: full ci:local)
Any gate red => exit 1 with a bounded failure excerpt (last 30 lines).

Usage: python3 tools/v3-plan/check_docs.py [--mode M] [--chapter chN] [--selftest]
"""
from __future__ import annotations
import argparse, os, subprocess, sys


def repo_root() -> str:
    """Resolve the repo root so the wrapper is cwd-independent (the
    first draft ran the bridges from an arbitrary cwd and every gate
    went silently RED — pnpm found no scripts). Order: the tool's own
    location (landed home = <root>/tools/v3-plan/), then git from cwd."""
    here = os.path.dirname(os.path.abspath(__file__))
    cand = os.path.abspath(os.path.join(here, "..", ".."))
    if os.path.exists(os.path.join(cand, "package.json")) and        os.path.exists(os.path.join(cand, "v3")):
        return cand
    p = subprocess.run(["git", "rev-parse", "--show-toplevel"],
                       capture_output=True, text=True)
    if p.returncode == 0:
        return p.stdout.strip()
    sys.exit("check-docs: repo root not found (run from the repo or land the tool in tools/v3-plan/)")

GATE_TIMEOUT_S = 600

def gates_for(mode: str, chapter: str | None) -> tuple[list, str]:
    quick = [
        ("packet-lint", ["pnpm", "-s", "v3:packet-lint"]),
        ("adr-check", ["pnpm", "-s", "v3:adr-check"]),
        ("realized-map", ["pnpm", "-s", "v3:realized-map"]),
        ("deferred", ["pnpm", "-s", "v3:deferred"]),
    ]
    if mode == "quick":
        return quick, "baseline only — no gate-point is satisfied by this run"
    if mode == "packet-approve":
        return [
            ("packet-lint+forbid-reopened",
             ["python3", "tools/v3-plan/check_packet.py", "--forbid-reopened"]),
            ("coverage--fold-time",
             ["python3", "tools/v3-plan/check_coverage.py", "--fold-time"]),
            quick[1], quick[2],
        ], "NOT covered here: drift tests, substrate-probe scripts (§5.5 approve column stays canonical)"
    if mode == "chapter-close":
        if not chapter:
            sys.exit("check-docs: chapter-close needs --chapter chN")
        return quick + [
            ("deferred--closed",
             ["python3", "tools/v3-plan/check_deferred.py", "--closed", chapter]),
            ("coverage", ["pnpm", "-s", "v3:coverage"]),
        ], "NOT covered here: full ci:local (the chapter DoD stays canonical)"
    sys.exit(f"check-docs: unknown mode {mode!r}")


def run_gate(name: str, cmd: list[str], cwd: str | None = None) -> tuple[bool, str, str]:
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd,
                           timeout=GATE_TIMEOUT_S)
    except subprocess.TimeoutExpired:
        return False, f"TIMEOUT after {GATE_TIMEOUT_S}s", ""
    out = (p.stdout + p.stderr).strip().split("\n")
    tail = out[-1] if out else ""
    excerpt = "\n".join(out[-30:])
    return p.returncode == 0, tail, excerpt


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", default="quick",
                    choices=["quick", "packet-approve", "chapter-close"])
    ap.add_argument("--chapter")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()
    if args.selftest:
        ok, tail, _ = run_gate("t", [sys.executable, "-c", "print('fine')"])
        assert ok and tail == "fine", (ok, tail)
        ok, tail, ex = run_gate("t", [sys.executable, "-c", "import sys; print('l1'); print('boom'); sys.exit(2)"])
        assert not ok and tail == "boom" and "l1" in ex, (ok, tail, ex)
        ok, tail, _ = run_gate("t", [sys.executable, "-c", "import time; time.sleep(2)"])
        assert ok, "under-timeout run must pass"
        print("check-docs selftest: 3 case(s) exercised, 0 failure(s)")
        return 0
    root = repo_root()
    gates, coverage_note = gates_for(args.mode, args.chapter)
    reds = []
    for name, cmd in gates:
        ok, tail, excerpt = run_gate(name, cmd, cwd=root)
        print(f"  {'OK ' if ok else 'RED'} {name:28s} {tail}")
        if not ok:
            reds.append(name)
            print("  ---- failure excerpt (last 30 lines) ----")
            print(excerpt)
    print(f"  note: {coverage_note}")
    if reds:
        print(f"check-docs[{args.mode}]: RED ({', '.join(reds)})")
        return 1
    print(f"check-docs[{args.mode}]: green ({len(gates)} gate(s))")
    return 0


if __name__ == "__main__":
    sys.exit(main())
