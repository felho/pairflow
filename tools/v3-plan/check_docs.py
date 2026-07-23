#!/usr/bin/env python3
"""v3:check-docs — ONE call for the doc-surface tier-0 family.

WRAPPER, never a replacement (the ch9 speedup batch's rule), and an
ADDITIVE BASELINE, never a gate-point substitute (the arm's GATE-01):
each MODE runs its gate-point's canonical doc-family commands and
PRINTS what it does NOT cover — the gate-point's own inventory
(README §5.5) stays canonical.

Modes:
  quick (default)  packet-lint, adr-check, realized-map, deferred —
                   the between-edits baseline
  packet-approve   packet-lint --forbid-reopened, coverage --fold-time,
                   adr-check, realized-map  (NOT covered: drift tests,
                   substrate probes — the §5.5 approve column stays
                   canonical)
  chapter-close    packet-lint --forbid-reopened, adr-check,
                   realized-map, deferred --closed <ch>, coverage
                   (NOT covered: full ci:local, the drift suite, the
                   realized_map DETACHED arm layer)
Any gate red => exit 1 with a bounded failure excerpt (last 30 lines).
Timeouts kill the gate's WHOLE process group (600 s per gate).

Usage: python3 tools/v3-plan/check_docs.py [--mode M] [--chapter chN] [--selftest]
"""
from __future__ import annotations
import argparse
import os
import signal
import subprocess
import sys

GATE_TIMEOUT_S = 600


def gates_for(mode: str, chapter: str | None) -> tuple[list, str]:
    quick = [
        ("packet-lint", ["pnpm", "-s", "v3:packet-lint"]),
        ("adr-check", ["pnpm", "-s", "v3:adr-check"]),
        ("realized-map", ["pnpm", "-s", "v3:realized-map"]),
        ("deferred", ["pnpm", "-s", "v3:deferred"]),
    ]
    forbid = ("packet-lint+forbid-reopened",
              ["python3", "tools/v3-plan/check_packet.py", "--forbid-reopened"])
    if mode == "quick":
        return quick, "baseline only — no gate-point is satisfied by this run"
    if mode == "packet-approve":
        return [
            forbid,
            ("coverage--fold-time",
             ["python3", "tools/v3-plan/check_coverage.py", "--fold-time"]),
            quick[1], quick[2],
        ], ("NOT covered here: drift tests, substrate-probe scripts "
            "(the §5.5 approve column stays canonical)")
    if mode == "chapter-close":
        if not chapter:
            sys.exit("check-docs: chapter-close needs --chapter chN")
        return [
            forbid, quick[1], quick[2],
            ("deferred--closed",
             ["python3", "tools/v3-plan/check_deferred.py", "--closed", chapter]),
            ("coverage", ["pnpm", "-s", "v3:coverage"]),
        ], ("NOT covered here: full ci:local, the drift suite, and the "
            "realized_map DETACHED arm layer (the chapter DoD stays canonical)")
    sys.exit(f"check-docs: unknown mode {mode!r}")


def run_gate(name: str, cmd: list[str], cwd: str | None = None,
             timeout: int = GATE_TIMEOUT_S) -> tuple[bool, str, str]:
    """start_new_session => the whole process GROUP dies on a timeout
    (a bare subprocess timeout kills only the direct child — the
    re-check's descendant-survival repro)."""
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, text=True, cwd=cwd,
                            start_new_session=True)
    try:
        out_s, _ = proc.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        pgid = None
        try:
            pgid = os.getpgid(proc.pid)
            os.killpg(pgid, signal.SIGTERM)
            proc.wait(timeout=5)
        except Exception:
            pass
        # the KILL is UNCONDITIONAL after the grace (the final arm
        # round's NEW-FOLD-01: a direct child exiting while a
        # descendant ignores TERM must not skip the group KILL)
        if pgid is not None:
            try:
                os.killpg(pgid, signal.SIGKILL)
            except (ProcessLookupError, PermissionError):
                pass
        try:
            proc.wait(timeout=5)
        except Exception:
            pass
        return False, f"TIMEOUT after {timeout}s (process group killed)", ""
    out = (out_s or "").strip().split("\n")
    tail = out[-1] if out else ""
    excerpt = "\n".join(out[-30:])
    return proc.returncode == 0, tail, excerpt


def repo_root() -> str:
    """cwd-independent root: the tool's landed home first, then git."""
    here = os.path.dirname(os.path.abspath(__file__))
    cand = os.path.abspath(os.path.join(here, "..", ".."))
    if os.path.exists(os.path.join(cand, "package.json")) and \
       os.path.exists(os.path.join(cand, "v3")):
        return cand
    p = subprocess.run(["git", "rev-parse", "--show-toplevel"],
                       capture_output=True, text=True)
    if p.returncode == 0:
        return p.stdout.strip()
    sys.exit("check-docs: repo root not found (run from the repo or land the tool in tools/v3-plan/)")


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
        ok, tail, ex = run_gate(
            "t", [sys.executable, "-c",
                  "import sys; print('l1'); print('boom'); sys.exit(2)"])
        assert not ok and tail == "boom" and "l1" in ex, (ok, tail, ex)
        ok, tail, _ = run_gate(
            "t", [sys.executable, "-c", "import time; time.sleep(2)"])
        assert ok, "under-timeout run must pass"
        ok, tail, _ = run_gate(
            "t", [sys.executable, "-c", "import time; time.sleep(30)"],
            timeout=1)
        assert not ok and "TIMEOUT" in tail, (ok, tail)
        print("check-docs selftest: 4 case(s) exercised, 0 failure(s)")
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
