#!/usr/bin/env python3
"""V3 coverage accounting (PI-11's mechanical half; plan ch3 §3.6, ch1 §1.4).

Asserts over the plan: the union of declared task-packet ledger slices
against the in-scope inventory. Stdlib only (the report_ledger.py culture).

Inventory sources (the ledger's machine face):
  - v3/model/units/<section>/<UnitName>.txt -> unit ids "<section>/<UnitName>"
  - ledger.md par.2                          -> invariant ids "<section>/<slug>"
  - ledger.md par.3                          -> rejection names
  - the unit sections                        -> chapter-trace inventory

Packet source: v3/implementation/packets/*.md (README.md excluded) —
each packet carries exactly ONE "ledger_slice" block AMONG its machine
blocks (a v2 packet also carries mutation_boundary, packet_rows, and at
close packet_metrics — task-packet-template.md par.1). Prose is not
parsed.

Modes:
  - default: VALIDATION (always-on CI gate) + coverage report. Parse
    errors, unknown ids, bad enum tokens, undeclared double owners, and
    unit-map lock violations are hard failures even with zero packets.
    This is the BUILD-CLOSE gate point (process-v2 Amendment 1).
  - --fold-time: the APPROVE-TIME gate point (flip-claims FC-F1, the
    tier-0 inventory's coverage entry): identical validation EXCEPT the
    unit-map lock's owned-but-pending direction is skipped — an
    approved-but-unbuilt packet's owned units are NECESSARILY pending
    (the ch5 boundary precedent, "working-as-designed"), so requiring
    realized at fold time would make a strict approve unreachable.
    Disposition drift on already-realized entries and
    realized-without-owner still fail in this mode.
  - --assert-closed: additionally require closure — the plan-is-concrete-
    enough-for-chaining criterion (README par.5.4).
  - --selftest: prove each unit-map cross-check dimension fails red on
    throwaway fixtures (packet ch5-P1; the v3:coverage bridge chains
    selftest + validation).

Three-way lock (packet ch5-P1): v3/src/drift/unitMap.json is the code-end
manifest, REQUIRED and dual-read (the vitest drift test + this script).
Validation asserts: manifest key set == units tree; packet-owned units
are realized with the SAME disposition; realized rows have packet owners.
--unit-map overrides the manifest path (negative-test seam).

Disposition lock (packet ch5-P2): v3/implementation/
invariant-disposition-map.md is REQUIRED — one machine block classing
ALL 116 invariants (checker/type-schema/test/review). One-way lock by
design: packets declare only their slices and may not contradict the
map. --disposition-map overrides the path (negative-test seam).

Closure axes (the par.1.4 scope rules, mechanized):
  - units: 159/159 owned, exactly one owner unless shared ownership is
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
MODEL_SRC = REPO_ROOT / "v3/model"
UNITS_DIR = MODEL_SRC / "units"
LEDGER = MODEL_SRC / "ledger.md"
DEFAULT_PACKETS_DIR = REPO_ROOT / "v3/implementation/packets"
DEFAULT_UNIT_MAP = REPO_ROOT / "v3/src/drift/unitMap.json"
DEFAULT_DISPOSITION_MAP = REPO_ROOT / "v3/implementation/invariant-disposition-map.md"
CODE_REF = re.compile(r"^[^#]+#[^#]+$")

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
    packet: str,
    sl: dict,
    inventory: dict[str, set[str]],
    checker: Checker,
    unit_dispositions: dict[str, dict[str, str]],
    invariant_dispositions: dict[str, dict[str, str]],
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
        else:
            unit_dispositions.setdefault(entry["id"], {})[packet] = entry["disposition"]
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
        else:
            invariant_dispositions.setdefault(entry["id"], {})[packet] = entry["disposition"]
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
            elif item not in declared_by.get(co_owner, set()):
                checker.error(
                    f"{packet}: shared_ownership co_owner '{co_owner}' does not itself "
                    f"declare '{item}' — a share needs an owner on both ends"
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


def load_unit_map(
    path: Path, inventory: dict[str, set[str]], checker: Checker
) -> dict[str, dict]:
    """The drift manifest (v3/src/drift/unitMap.json) — the code end of the
    ledger <-> manifest <-> packet three-way lock (packet ch5-P1). REQUIRED:
    missing or unparseable is a hard failure (fail-closed). Schema and the
    key-set equality against the units tree are validated here; the vitest
    drift test guards the same file from the code side (dual-read)."""
    if not path.is_file():
        checker.error(f"unit map missing: {path} (drift manifest required from ch5-P1 on)")
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        checker.error(f"unit map unparseable: {path} ({exc})")
        return {}
    if not isinstance(data, dict):
        checker.error("unit map: top level must be an object keyed by unit id")
        return {}
    for unit_id, entry in sorted(data.items()):
        if not isinstance(entry, dict):
            checker.error(f"unit map: '{unit_id}' entry must be an object")
            continue
        status = entry.get("status")
        if status == "pending":
            if entry.keys() != {"status"}:
                checker.error(f"unit map: pending '{unit_id}' must be exactly {{status}}")
        elif status == "realized":
            if entry.keys() != {"status", "disposition", "codeRef"}:
                checker.error(
                    f"unit map: realized '{unit_id}' must be exactly "
                    "{status, disposition, codeRef}"
                )
                continue
            if entry["disposition"] not in UNIT_DISPOSITIONS:
                checker.error(
                    f"unit map: '{unit_id}' has invalid disposition "
                    f"'{entry['disposition']}' (exact tokens: {sorted(UNIT_DISPOSITIONS)})"
                )
            if not isinstance(entry["codeRef"], str) or not CODE_REF.match(entry["codeRef"]):
                checker.error(f"unit map: '{unit_id}' codeRef must be '<path>#<symbol>'")
        else:
            checker.error(f"unit map: '{unit_id}' status must be 'pending' or 'realized'")
    for unit_id in sorted(inventory["units"] - data.keys()):
        checker.error(f"unit map: missing unit id '{unit_id}' (key set == units tree)")
    for unit_id in sorted(data.keys() - inventory["units"]):
        checker.error(f"unit map: unknown unit id '{unit_id}' (key set == units tree)")
    return data


def load_disposition_map(
    path: Path, inventory: dict[str, set[str]], checker: Checker
) -> dict[str, str]:
    """The invariant disposition map (v3/implementation/
    invariant-disposition-map.md) — REQUIRED from packet ch5-P2 on
    (fail-closed). Exactly ONE fenced json block with the top-level key
    'invariant_disposition_map'; key set == ledger par.2; values are the
    exact INVARIANT_DISPOSITIONS tokens."""
    if not path.is_file():
        checker.error(
            f"disposition map missing: {path} (invariant map required from ch5-P2 on)"
        )
        return {}
    text = path.read_text(encoding="utf-8")
    blocks = []
    for match in JSON_FENCE.finditer(text):
        try:
            data = json.loads(match.group(1))
        except json.JSONDecodeError as exc:
            checker.error(f"disposition map: unparseable json block ({exc})")
            return {}
        if isinstance(data, dict) and "invariant_disposition_map" in data:
            blocks.append(data["invariant_disposition_map"])
    if len(blocks) != 1:
        checker.error(
            f"disposition map: exactly one invariant_disposition_map block required, "
            f"found {len(blocks)}"
        )
        return {}
    mapping = blocks[0]
    if not isinstance(mapping, dict):
        checker.error("disposition map: invariant_disposition_map must be an object")
        return {}
    for invariant_id, disposition in sorted(mapping.items()):
        if disposition not in INVARIANT_DISPOSITIONS:
            checker.error(
                f"disposition map: '{invariant_id}' has invalid disposition "
                f"'{disposition}' (exact tokens: {sorted(INVARIANT_DISPOSITIONS)})"
            )
    for invariant_id in sorted(inventory["invariants"] - mapping.keys()):
        checker.error(f"disposition map: missing invariant id '{invariant_id}'")
    for invariant_id in sorted(mapping.keys() - inventory["invariants"]):
        checker.error(f"disposition map: unknown invariant id '{invariant_id}'")
    return mapping


def check_disposition_lock(
    disposition_map: dict[str, str],
    invariant_dispositions: dict[str, dict[str, str]],
    checker: Checker,
) -> None:
    """One-way by design (packet ch5-P2): the map classes ALL 116;
    packets declare only their slices — and may not contradict the map."""
    for invariant_id, by_packet in sorted(invariant_dispositions.items()):
        mapped = disposition_map.get(invariant_id)
        if mapped is None:
            continue  # the key-set check already reported it
        for packet, disposition in sorted(by_packet.items()):
            if disposition != mapped:
                checker.error(
                    f"disposition lock: '{invariant_id}' — {packet} declares "
                    f"'{disposition}', the map says '{mapped}'"
                )


def check_unit_map_lock(
    unit_map: dict[str, dict],
    unit_dispositions: dict[str, dict[str, str]],
    checker: Checker,
    fold_time: bool = False,
) -> None:
    """The three-way lock, both directions (packet ch5-P1): every
    packet-owned unit is realized in the manifest with the SAME disposition
    token; every realized manifest row has a packet owner. In --fold-time
    mode the owned-but-pending direction is skipped (an approved-but-unbuilt
    packet's units are necessarily pending); drift on realized entries and
    realized-without-owner still fire."""
    for unit_id, by_packet in sorted(unit_dispositions.items()):
        entry = unit_map.get(unit_id)
        if entry is None:
            continue  # the key-set check already reported it
        if entry.get("status") != "realized":
            if not fold_time:
                checker.error(
                    f"unit map lock: '{unit_id}' is packet-owned "
                    f"({', '.join(sorted(by_packet))}) but the manifest says pending"
                )
            continue
        for packet, disposition in sorted(by_packet.items()):
            if disposition != entry.get("disposition"):
                checker.error(
                    f"unit map lock: '{unit_id}' disposition drift — {packet} declares "
                    f"'{disposition}', the manifest says '{entry.get('disposition')}'"
                )
    for unit_id, entry in sorted(unit_map.items()):
        if entry.get("status") == "realized" and unit_id not in unit_dispositions:
            checker.error(
                f"unit map lock: '{unit_id}' is realized in the manifest "
                "but no packet owns it"
            )


def run_validation(
    packets_dir: Path,
    unit_map_path: Path,
    disposition_map_path: Path,
    fold_time: bool = False,
) -> tuple[Checker, dict[str, set[str]], dict[str, dict[str, list[str]]], list[Path]]:
    checker = Checker()
    inventory = load_inventory()
    expected = {"units": 159, "invariants": 116, "rejections": 54, "traces": 20}
    for axis, count in expected.items():
        if len(inventory[axis]) != count:
            checker.error(
                f"inventory drift: {axis} counts {len(inventory[axis])}, plan par.1.4 says {count}"
            )

    unit_map = load_unit_map(unit_map_path, inventory, checker)
    disposition_map = load_disposition_map(disposition_map_path, inventory, checker)

    packet_files = (
        sorted(p for p in packets_dir.glob("*.md") if p.name != "README.md")
        if packets_dir.is_dir()
        else []
    )
    owners: dict[str, dict[str, list[str]]] = {"units": {}, "invariants": {}, "traces": {}}
    shares: dict[str, set[tuple[str, str]]] = {}
    declared_by: dict[str, set[str]] = {}
    unit_dispositions: dict[str, dict[str, str]] = {}
    invariant_dispositions: dict[str, dict[str, str]] = {}
    for path in packet_files:
        sl = extract_slice(path, checker)
        if sl is None:
            continue
        declared = validate_slice(
            path.name, sl, inventory, checker, unit_dispositions, invariant_dispositions
        )
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
    check_unit_map_lock(unit_map, unit_dispositions, checker, fold_time=fold_time)
    check_disposition_lock(disposition_map, invariant_dispositions, checker)
    return checker, inventory, owners, packet_files


def run_selftest() -> int:
    """--selftest (packet ch5-P1; chapter rule 2 — a prescribed check is
    EXECUTED, not logged): throwaway fixtures prove each cross-check
    dimension actually fails red, plus one green control proving the
    failures are not ambient. Real inventory; synthetic packets + map."""
    import tempfile

    inventory = load_inventory()
    base_map: dict[str, dict] = {
        unit_id: {"status": "pending"} for unit_id in sorted(inventory["units"])
    }
    owned_id = "l0b-pseudocode/HANDLE"
    owned_invariant = "l0a/op-id-idempotency"
    realized = {
        "status": "realized",
        "disposition": "implement",
        "codeRef": "v3/src/kernel/kernel.ts#createKernel",
    }
    base_dispo: dict[str, str] = {
        invariant_id: "review" for invariant_id in sorted(inventory["invariants"])
    }
    base_dispo[owned_invariant] = "test"
    packet_md = (
        "# selftest packet\n\n```json\n"
        + json.dumps(
            {
                "ledger_slice": {
                    "units": [{"id": owned_id, "disposition": "implement"}],
                    "rejections": [],
                    "invariants": [{"id": owned_invariant, "disposition": "test"}],
                    "traces": [],
                    "shared_ownership": [],
                }
            }
        )
        + "\n```\n"
    )

    failures: list[str] = []

    def run_fixture(
        unit_map: dict | None,
        with_packet: bool,
        dispo_map: dict | None = None,
        dispo_blocks: int = 1,
        fold_time: bool = False,
    ) -> Checker:
        if dispo_map is None:
            dispo_map = base_dispo
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            packets = tmp_path / "packets"
            packets.mkdir()
            if with_packet:
                (packets / "selftest-packet.md").write_text(packet_md, encoding="utf-8")
            map_path = tmp_path / "unitMap.json"
            if unit_map is not None:
                map_path.write_text(json.dumps(unit_map), encoding="utf-8")
            dispo_path = tmp_path / "invariant-disposition-map.md"
            if dispo_blocks > 0:
                block = (
                    "```json\n"
                    + json.dumps({"invariant_disposition_map": dispo_map})
                    + "\n```\n"
                )
                dispo_path.write_text("# selftest map\n\n" + block * dispo_blocks, encoding="utf-8")
            checker, _, _, _ = run_validation(packets, map_path, dispo_path, fold_time=fold_time)
            return checker

    def expect_red(
        name: str,
        unit_map: dict | None,
        expect: str,
        with_packet: bool = True,
        dispo_map: dict | None = None,
        dispo_blocks: int = 1,
    ) -> None:
        checker = run_fixture(unit_map, with_packet, dispo_map, dispo_blocks)
        if any(expect in message for message in checker.errors):
            print(f"selftest OK: {name}")
        else:
            failures.append(name)
            print(
                f"selftest FAIL: {name} — expected an error containing {expect!r}, "
                f"got {checker.errors!r}",
                file=sys.stderr,
            )

    expect_red("missing manifest fails closed", None, "unit map missing")
    variant = dict(base_map)
    del variant[owned_id]
    expect_red("key set: missing unit id", variant, "missing unit id")
    variant = dict(base_map)
    variant["not-a-section/NotAUnit"] = {"status": "pending"}
    expect_red("key set: unknown unit id", variant, "unknown unit id")
    expect_red("owned unit left pending", dict(base_map), "manifest says pending")
    variant = dict(base_map)
    variant[owned_id] = {**realized, "disposition": "test-only"}
    expect_red("disposition drift", variant, "disposition drift")
    variant = dict(base_map)
    variant[owned_id] = realized
    expect_red("realized without a packet owner", variant, "no packet owns it", with_packet=False)
    variant = dict(base_map)
    variant[owned_id] = {**realized, "disposition": "bogus"}
    expect_red("schema: invalid disposition token", variant, "invalid disposition")
    variant = dict(base_map)
    variant[owned_id] = {**realized, "extra": 1}
    expect_red("schema: extra key", variant, "must be exactly")
    variant = dict(base_map)
    variant[owned_id] = {**realized, "codeRef": "no-symbol-separator"}
    expect_red("schema: malformed codeRef", variant, "codeRef must be")

    good_units = dict(base_map)
    good_units[owned_id] = realized
    expect_red(
        "disposition map: missing file fails closed",
        good_units,
        "disposition map missing",
        dispo_blocks=0,
    )
    dispo_variant = dict(base_dispo)
    del dispo_variant[owned_invariant]
    expect_red(
        "disposition map: missing invariant id",
        good_units,
        "missing invariant id",
        dispo_map=dispo_variant,
    )
    dispo_variant = dict(base_dispo)
    dispo_variant["not-a-section/not-an-invariant"] = "review"
    expect_red(
        "disposition map: unknown invariant id",
        good_units,
        "unknown invariant id",
        dispo_map=dispo_variant,
    )
    dispo_variant = dict(base_dispo)
    dispo_variant[owned_invariant] = "vibes"
    expect_red(
        "disposition map: invalid disposition token",
        good_units,
        "invalid disposition",
        dispo_map=dispo_variant,
    )
    dispo_variant = dict(base_dispo)
    dispo_variant[owned_invariant] = "checker"
    expect_red(
        "disposition lock: packet contradicts the map",
        good_units,
        "disposition lock",
        dispo_map=dispo_variant,
    )
    expect_red(
        "disposition map: two machine blocks",
        good_units,
        "exactly one invariant_disposition_map block",
        dispo_blocks=2,
    )

    # --fold-time (the approve-time gate point, Phase 0.2): the
    # owned-but-pending direction is SKIPPED — the exact fixture that is
    # red in default mode must be green here…
    fold = run_fixture(dict(base_map), with_packet=True, fold_time=True)
    if fold.errors:
        failures.append("fold-time: owned-but-pending green")
        print(
            f"selftest FAIL: fold-time owned-but-pending expected green, got {fold.errors!r}",
            file=sys.stderr,
        )
    else:
        print("selftest OK: fold-time mode passes the owned-but-pending state")
    # …while everything else still fires in fold-time mode: an unknown
    # unit id, and the realized-without-owner direction of the SAME lock
    variant = dict(base_map)
    variant["not-a-section/NotAUnit"] = {"status": "pending"}
    fold = run_fixture(variant, with_packet=True, fold_time=True)
    if any("unknown unit id" in message for message in fold.errors):
        print("selftest OK: fold-time mode still fails on unknown unit id")
    else:
        failures.append("fold-time: unknown unit id still red")
        print(
            f"selftest FAIL: fold-time expected 'unknown unit id', got {fold.errors!r}",
            file=sys.stderr,
        )
    variant = dict(base_map)
    variant[owned_id] = realized
    fold = run_fixture(variant, with_packet=False, fold_time=True)
    if any("no packet owns it" in message for message in fold.errors):
        print("selftest OK: fold-time mode still fails on realized-without-owner")
    else:
        failures.append("fold-time: realized-without-owner still red")
        print(
            f"selftest FAIL: fold-time expected 'no packet owns it', got {fold.errors!r}",
            file=sys.stderr,
        )

    green = run_fixture(good_units, with_packet=True)
    if green.errors:
        failures.append("green control")
        print(f"selftest FAIL: green control errored: {green.errors!r}", file=sys.stderr)
    else:
        print("selftest OK: green control (consistent fixture passes)")

    if failures:
        print(f"selftest: {len(failures)} FAILED", file=sys.stderr)
        return 1
    print("selftest OK (all cross-check dimensions fail red; green control passes)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assert-closed", action="store_true", help="require full closure")
    parser.add_argument(
        "--fold-time",
        action="store_true",
        help="the approve-time gate point: skip the unit-map lock's "
        "owned-but-pending direction (an approved-but-unbuilt packet's "
        "units are necessarily pending)",
    )
    parser.add_argument("--packets-dir", type=Path, default=DEFAULT_PACKETS_DIR)
    parser.add_argument("--unit-map", type=Path, default=DEFAULT_UNIT_MAP)
    parser.add_argument("--disposition-map", type=Path, default=DEFAULT_DISPOSITION_MAP)
    parser.add_argument(
        "--selftest",
        action="store_true",
        help="run the cross-check selftest against throwaway fixtures, then exit",
    )
    args = parser.parse_args()

    if args.selftest:
        return run_selftest()

    checker, inventory, owners, packet_files = run_validation(
        args.packets_dir, args.unit_map, args.disposition_map, fold_time=args.fold_time
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
    mode = " (closed)" if args.assert_closed else (" (fold-time)" if args.fold_time else " (validation)")
    print("coverage check OK" + mode)
    return 0


if __name__ == "__main__":
    sys.exit(main())
