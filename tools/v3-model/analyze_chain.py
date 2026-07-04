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
import re
import sys
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SRC = REPO / "docs/v3/convergence/model-src"

# a top-level unit starts at column 0: `name(...)`, `NAME ... → ...`, or INTERFACE
UNIT_RE = re.compile(r"^(?:INTERFACE\s+)?([A-Za-z_][A-Za-z0-9_]*)")


def norm_lines(text: str) -> list[str]:
    lines = [ln.rstrip() for ln in text.split("\n")]
    while lines and not lines[0]:
        lines.pop(0)
    while lines and not lines[-1]:
        lines.pop()
    return lines


def split_units(lines: list[str]) -> dict[str, list[str]]:
    """Split a pseudocode snapshot into top-level units by column-0 headers."""
    units: dict[str, list[str]] = {}
    current = None
    for ln in lines:
        if ln and not ln[0].isspace() and not ln.startswith("#"):
            m = UNIT_RE.match(ln)
            if m:
                current = m.group(1)
                units.setdefault(current, [])
        if current is not None:
            units[current].append(ln)
    return units


def main() -> None:
    manifest = json.loads((SRC / "manifest.json").read_text())
    blocks: dict[str, dict] = {}
    order: list[str] = []
    errors = 0

    print(f"{'section':22} {'block':34} {'baseline':30} {'+':>5} {'-':>5}")
    print("-" * 100)

    unit_touchers: dict[str, list[str]] = defaultdict(list)  # unit -> [block ids]

    for section in manifest["sections"]:
        for code in section["codes"]:
            cid, base = code["id"], code["baseline"]
            new = norm_lines((SRC / code["new"]).read_text())
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

            # unit-level attribution for pseudocode blocks
            if "pseudocode" in cid:
                base_units = split_units(base_lines)
                new_units = split_units(new)
                for name, body in new_units.items():
                    if name not in base_units:
                        unit_touchers[name].append(f"{cid} (add)")
                    elif base_units[name] != body:
                        unit_touchers[name].append(f"{cid} (mod)")

            order.append(cid)

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
