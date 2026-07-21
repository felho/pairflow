#!/usr/bin/env python3
"""Report the baseline graph and per-level delta profile of the code blocks.

The HTML already stores each block's baseline BY REFERENCE (data-code-old-ref,
recorded as `baseline` in manifest.json); only the `new` snapshots are full
copies. This tool makes the layering mechanically visible:

  1. Baseline graph — who diffs against whom; verifies every ref resolves to a
     known block that appears EARLIER in document order (exit 1 otherwise).
  2. Delta profile — for each block, how much actually changed vs its
     baseline: added/removed lines, and for pseudocode blocks the top-level
     units (functions/handlers/interfaces) that were added or modified.

The delta profile is the evidence base for the unit-model refactor: it shows,
per unit, which levels touch it — i.e. the true blast radius of a change.
"""

import difflib
import json
import sys
from collections import defaultdict
from pathlib import Path

import foldlib

REPO = Path(__file__).resolve().parents[2]
SRC = REPO / "v3/model"

def norm_lines(text: str) -> list[str]:
    lines = [ln.rstrip() for ln in text.split("\n")]
    while lines and not lines[0]:
        lines.pop(0)
    while lines and not lines[-1]:
        lines.pop()
    return lines


def unit_touchers_from_deltas(manifest: dict) -> dict[str, list[str]]:
    """Precise per-unit touch lists from the unit-delta layout: a block touches
    a unit iff it stores a version of it (add = not in the baseline's order)."""
    touchers: dict[str, list[str]] = defaultdict(list)
    for section in manifest["sections"]:
        for code in section["codes"]:
            if not code.get("fold"):
                continue
            delta = foldlib._delta(code["id"])
            base = delta["baseline"]
            base_units = set(foldlib._delta(base)["order"]) if base else set()
            unit_dir = SRC / "units" / code["id"]
            for f in sorted(unit_dir.glob("*.txt")):
                unit = f.stem
                kind = "mod" if unit in base_units else "add"
                touchers[unit].append(f"{code['id']} ({kind})")
    return touchers


def main() -> None:
    manifest = json.loads((SRC / "manifest.json").read_text())
    blocks: dict[str, dict] = {}
    order: list[str] = []
    errors = 0

    print(f"{'section':22} {'block':34} {'baseline':30} {'+':>5} {'-':>5}")
    print("-" * 100)

    for section in manifest["sections"]:
        for code in section["codes"]:
            cid, base = code["id"], code["baseline"]
            new = norm_lines(foldlib.code_text(code))
            blocks[cid] = {"new": new}

            if base is None:
                base_lines: list[str] = []
                base_label = "(empty)"
            elif base not in blocks:
                print(f"{section['id']:22} {cid:34} UNRESOLVED ref: {base}")
                errors += 1
                order.append(cid)
                continue
            else:
                if order.index(base) >= len(order):  # defensive; index() raises if absent
                    pass
                base_lines = blocks[base]["new"]
                base_label = base

            diff = list(difflib.ndiff(base_lines, new))
            plus = sum(1 for d in diff if d.startswith("+ "))
            minus = sum(1 for d in diff if d.startswith("- "))
            print(f"{section['id']:22} {cid:34} {base_label:30} {plus:5} {minus:5}")

            order.append(cid)

    unit_touchers = unit_touchers_from_deltas(manifest)

    print("\n== unit blast radius (pseudocode units touched by >1 block) ==")
    multi = {u: t for u, t in sorted(unit_touchers.items()) if len(t) > 1}
    for unit, touchers in sorted(multi.items(), key=lambda kv: -len(kv[1])):
        print(f"{len(touchers):3}x  {unit:34} {', '.join(touchers)}")
    mono = [u for u, t in unit_touchers.items() if len(t) == 1]
    print(f"\n{len(mono)} unit(s) touched by exactly one block (monotone additions)")

    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
