#!/usr/bin/env python3
"""V3 coverage accounting (PI-11's mechanical half; plan ch3 §3.6, ch1 §1.4).

Asserts over the plan: the union of declared task-packet ledger slices
against the in-scope inventory. Stdlib only (the report_ledger.py culture).

Inventory sources (the ledger's machine face):
  - model-src/units/<section>/<UnitName>.txt -> unit ids "<section>/<UnitName>"
  - ledger.md par.2                          -> invariant ids "<section>/<slug>"
  - ledger.md par.3                          -> rejection names
  - the unit sections                        -> chapter-trace inventory

Packet source: docs/v3/implementation/packets/*.md (README.md excluded) —
each packet carries exactly ONE fenced ```json block whose top-level key is
"ledger_slice" (task-packet-template.md par.1). Prose is not parsed.

Modes:
  - default: VALIDATION (always-on CI gate) + coverage report. Parse
    errors, unknown ids, bad enum tokens, and undeclared double owners are
    hard failures even with zero packets.
  - --assert-closed: additionally require closure — the plan-is-concrete-
    enough-for-chaining criterion (README par.5.4).

Closure axes (the par.1.4 scope rules, mechanized):
  - units: 158/158 owned, exactly one owner unless shared ownership is
    declared by EVERY co-owner;
  - invariants: 116/116 dispositioned (the ch-5 disposition map), same
    single-owner rule;
  - traces: 20/20 chapter traces owned (golden tests), same rule;
  - rejections: reported, NOT a closure axis — name-level coverage is the
    PI-3 drift test's job; a packet's rejection list declares what it
    realizes or exercises, and several packets may exercise one name.

--packets-dir overrides the packet source; it exists as the script's own
negative-test seam.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
MODEL_SRC = REPO_ROOT / "docs/v3/convergence/model-src"
UNITS_DIR = MODEL_SRC / "units"
LEDGER = MODEL_SRC / "ledger.md"
DEFAULT_PACKETS_DIR = REPO_ROOT / "docs/v3/implementation/packets"

UNIT_DISPOSITIONS = {
    "implement",
    "type/schema",
    "test-only",
    "generated/mapped",
    "alias/inherited",
    "review-only",
}
INVARIANT_DISPOSITIONS = {"checker", "type/schema", "test", "review"}
SLICE_KEYS = {"units", "rejections", "invariants", "traces", "shared_ownership"}

JSON_FENCE = re.compile(r"^```json\s*$(.*?)^```\s*$", re.MULTILINE | re.DOTALL)
INVARIANT_LINE = re.compile(r"^- `([^`]+)` · \*\*([^*]+)\*\*")
REJECTION_LINE = re.compile(r"^- `([^`]+)` —")


def load_inventory() -> dict[str, set[str]]:
    units: set[str] = set()
    sections: set[str] = set()
    for section_dir in sorted(UNITS_DIR.iterdir()):
        if not section_dir.is_dir():
            continue
        sections.add(section_dir.name)
        for unit_file in sorted(section_dir.glob("*.txt")):
            units.add(f"{section_dir.name}/{unit_file.stem}")

    ledger_text = LEDGER.read_text(encoding="utf-8")
    parts = re.split(r"^## ", ledger_text, flags=re.MULTILINE)
    invariants: set[str] = set()
    rejections: set[str] = set()
    for part in parts:
        if part.startswith("2 ·"):
            for line in part.splitlines():
                match = INVARIANT_LINE.match(line)
                if match:
                    invariants.add(f"{match.group(1)}/{match.group(2)}")
        elif part.startswith("3 ·"):
            for line in part.splitlines():
                match = REJECTION_LINE.match(line)
                if match:
                    rejections.add(match.group(1))

    return {
        "units": units,
        "invariants": invariants,
        "rejections": rejections,
        "traces": sections,
    }


class Checker:
    def __init__(self) -> None:
        self.errors: list[str] = []

    def error(self, message: str) -> None:
        self.errors.append(message)


def extract_slice(path: Path, checker: Checker) -> dict | None:
    text = path.read_text(encoding="utf-8")
    slices = []
    for match in JSON_FENCE.finditer(text):
        try:
            data = json.loads(match.group(1))
        except json.JSONDecodeError as exc:
            checker.error(f"{path.name}: unparseable json block ({exc})")
            return None
        if isinstance(data, dict) and "ledger_slice" in data:
            slices.append(data["ledger_slice"])
    if not slices:
        checker.error(f"{path.name}: no machine ledger_slice block (template par.1)")
        return None
    if len(slices) > 1:
        checker.error(f"{path.name}: {len(slices)} ledger_slice blocks; exactly one allowed")
        return None
    return slices[0]


def validate_slice(
    packet: str, sl: dict, inventory: dict[str, set[str]], checker: Checker
) -> dict[str, set[str]]:
    declared: dict[str, set[str]] = {"units": set(), "invariants": set(), "traces": set()}
    if not isinstance(sl, dict):
        checker.error(f"{packet}: ledger_slice is not an object")
        return declared
    missing = SLICE_KEYS - sl.keys()
    unknown = sl.keys() - SLICE_KEYS
    if missing:
        checker.error(f"{packet}: ledger_slice missing keys {sorted(missing)}")
    if unknown:
        checker.error(f"{packet}: ledger_slice unknown keys {sorted(unknown)}")

    for entry in sl.get("units", []):
        if not isinstance(entry, dict) or entry.keys() != {"id", "disposition"}:
            checker.error(f"{packet}: unit entry must be {{id, disposition}}: {entry!r}")
            continue
        if entry["id"] not in inventory["units"]:
            checker.error(f"{packet}: unknown unit id '{entry['id']}'")
        if entry["disposition"] not in UNIT_DISPOSITIONS:
            checker.error(
                f"{packet}: unit '{entry['id']}' has invalid disposition "
                f"'{entry['disposition']}' (exact tokens: {sorted(UNIT_DISPOSITIONS)})"
            )
        declared["units"].add(entry["id"])

    for name in sl.get("rejections", []):
        if not isinstance(name, str) or name not in inventory["rejections"]:
            checker.error(f"{packet}: unknown rejection name {name!r}")

    for entry in sl.get("invariants", []):
        if not isinstance(entry, dict) or entry.keys() != {"id", "disposition"}:
            checker.error(f"{packet}: invariant entry must be {{id, disposition}}: {entry!r}")
            continue
        if entry["id"] not in inventory["invariants"]:
            checker.error(f"{packet}: unknown invariant id '{entry['id']}'")
        if entry["disposition"] not in INVARIANT_DISPOSITIONS:
            checker.error(
                f"{packet}: invariant '{entry['id']}' has invalid disposition "
                f"'{entry['disposition']}' (exact tokens: {sorted(INVARIANT_DISPOSITIONS)})"
            )
        declared["invariants"].add(entry["id"])

    for trace in sl.get("traces", []):
        if not isinstance(trace, str) or trace not in inventory["traces"]:
            checker.error(f"{packet}: unknown trace {trace!r} (unit-section names)")
        else:
            declared["traces"].add(trace)

    for entry in sl.get("shared_ownership", []):
        if not isinstance(entry, dict) or entry.keys() != {"item", "co_owner"}:
            checker.error(f"{packet}: shared_ownership entry must be {{item, co_owner}}: {entry!r}")

    return declared


def check_share_references(
    shares: dict[str, set[tuple[str, str]]],
    declared_by: dict[str, set[str]],
    packet_names: set[str],
    inventory: dict[str, set[str]],
    checker: Checker,
) -> None:
    """shared_ownership entries are references, not free text: the item must
    be a real ownership-axis id (unit/invariant/trace) the declaring packet
    itself declares, and the co_owner must be another existing packet."""
    ownable = inventory["units"] | inventory["invariants"] | inventory["traces"]
    for packet, entries in sorted(shares.items()):
        for item, co_owner in sorted(entries):
            if item not in ownable:
                checker.error(
                    f"{packet}: shared_ownership item '{item}' is not a known "
                    "unit/invariant/trace id"
                )
            elif item not in declared_by.get(packet, set()):
                checker.error(
                    f"{packet}: shared_ownership declares '{item}' which the packet's "
                    "own slice does not declare"
                )
            if co_owner == packet:
                checker.error(f"{packet}: shared_ownership co_owner is the packet itself")
            elif co_owner not in packet_names:
                checker.error(
                    f"{packet}: shared_ownership co_owner '{co_owner}' is not an "
                    "existing packet"
                )


def check_owners(
    owners: dict[str, dict[str, list[str]]],
    shares: dict[str, set[tuple[str, str]]],
    checker: Checker,
) -> None:
    """Single owner unless EVERY co-owner declares the share explicitly."""
    for axis, items in owners.items():
        for item, packet_names in sorted(items.items()):
            if len(packet_names) <= 1:
                continue
            for packet in packet_names:
                partners = {co for (it, co) in shares.get(packet, set()) if it == item}
                if not partners & (set(packet_names) - {packet}):
                    checker.error(
                        f"undeclared double owner: {axis} '{item}' owned by "
                        f"{sorted(packet_names)}; '{packet}' declares no shared_ownership for it"
                    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assert-closed", action="store_true", help="require full closure")
    parser.add_argument("--packets-dir", type=Path, default=DEFAULT_PACKETS_DIR)
    args = parser.parse_args()

    checker = Checker()
    inventory = load_inventory()
    expected = {"units": 158, "invariants": 116, "rejections": 85, "traces": 20}
    for axis, count in expected.items():
        if len(inventory[axis]) != count:
            checker.error(
                f"inventory drift: {axis} counts {len(inventory[axis])}, plan par.1.4 says {count}"
            )

    packet_files = (
        sorted(p for p in args.packets_dir.glob("*.md") if p.name != "README.md")
        if args.packets_dir.is_dir()
        else []
    )
    owners: dict[str, dict[str, list[str]]] = {"units": {}, "invariants": {}, "traces": {}}
    shares: dict[str, set[tuple[str, str]]] = {}
    declared_by: dict[str, set[str]] = {}
    for path in packet_files:
        sl = extract_slice(path, checker)
        if sl is None:
            continue
        declared = validate_slice(path.name, sl, inventory, checker)
        declared_by[path.name] = declared["units"] | declared["invariants"] | declared["traces"]
        for axis in owners:
            for item in declared[axis]:
                owners[axis].setdefault(item, []).append(path.name)
        if isinstance(sl, dict):
            shares[path.name] = {
                (entry["item"], entry["co_owner"])
                for entry in sl.get("shared_ownership", [])
                if isinstance(entry, dict) and entry.keys() == {"item", "co_owner"}
            }

    check_owners(owners, shares, checker)
    check_share_references(
        shares, declared_by, {p.name for p in packet_files}, inventory, checker
    )

    if checker.errors:
        for message in checker.errors:
            print(f"COVERAGE FAIL: {message}", file=sys.stderr)
        return 1

    print(f"coverage: {len(packet_files)} packets in {args.packets_dir}")
    orphaned = False
    for axis in ("units", "invariants", "traces"):
        covered = len(owners[axis])
        total = len(inventory[axis])
        print(f"  {axis}: {covered}/{total} owned")
        if covered < total:
            orphaned = True
    print(f"  rejections: {len(inventory['rejections'])} names (PI-3 drift-test axis, reported only)")

    if args.assert_closed and orphaned:
        print("COVERAGE FAIL: closure asserted but orphans remain (README par.5.4)", file=sys.stderr)
        return 1
    print("coverage check OK" + (" (closed)" if args.assert_closed else " (validation)"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
