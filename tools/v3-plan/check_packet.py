#!/usr/bin/env python3
"""V3 packet-lint + draft-lint (process-v2-design.md §5 Phase 0, item 1).

Mechanizes the fresh-eyes sweep class the ch7-P1/P2 pre-approval rounds
spent LLM rounds on: id-registry uniqueness, lane-range/scalar
consistency, provenance-mark bookkeeping, machine-block syntax, and the
contract-draft artifact contract (D2). Stdlib only (the check_coverage.py
culture).

Packet source: docs/v3/implementation/packets/*.md (README.md excluded).
A packet is V2 iff it carries a fenced ```json block whose top-level key
is "mutation_boundary" — pre-v2 packets are GRANDFATHERED (reported and
SKIPPED entirely, parse noise included); a packet that NAMES
mutation_boundary in its raw text stays v2 even when that fence is
malformed (no silent demotion). The v2 obligations bind from the ch7-P3
pilot onward, never retroactively.

V2 packet checks:
  - mutation_boundary block: {"mutation_boundary": {"files": [...]}} —
    nonempty, unique, repo-relative paths.
  - provenance bookkeeping: inline marks `[P:anchored <ref>]`,
    `[P:derived <refs>]`, `[P:new-decision]` counted against the
    {"provenance": {...}} machine block (D1's classification is the
    autonomy boundary's detector — the counts must not drift from the
    marks).
  - strict cross-refs: `draft:ch<N>-<slug>#C<n>` refs resolve to an
    existing contract-draft row in ratified-or-later status;
    `ADR-\\d{3}` refs resolve to a file under v3/adr/. Other ref forms
    (plan §, ledger §, packet §) are pass-through in v0.
  - lane id registry + range/scalar consistency: table-defined lane ids
    (e.g. O1, R3) are unique AND each lane row carries EXACTLY ONE [P:*]
    mark (the
    mechanically detectable canonical-row set v0 = lane-id table rows;
    type-matrix rows remain the panel's duty); textual refs resolve, and
    ranges (O4–O10) resolve over EVERY member, not just endpoints; family
    "P" is excluded (packet names collide). Fenced blocks are excluded
    from the ref scan.
  - packet_metrics block (when present): DEEP schema (types per field,
    D7 enums: prediction classes, found_at values, stops[].type against
    the canonical STOP member-token registry), and its provenance counts
    cross-checked against the SAME inline marks as the provenance block.
  - --post-build <commit>: the commit's changed files must be a subset
    of the declared mutation boundary plus the packet file itself (the
    one packet-lint check that cannot run at fold time).

Draft source: docs/v3/implementation/contracts/*.md (README.md
excluded; a missing directory means zero drafts, which is fine).

Draft checks (the D2 artifact contract):
  - {"contract_draft": {"chapter", "surface", "status"}} meta block;
    filename equals ch<N>-<surface>-contract.md; status in
    draft|ratified|realized, and MONOTONIC across the FULL committed
    history plus the working tree (a ratified -> draft -> ratified
    history is red even though its final edge is clean; a reopen is a
    new ratification block, never a step back).
  - C-row registry: table rows whose first cell is C<n>; unique ids;
    ratified-or-later requires at least one row.
  - canonical row payload hash: sha256 over the raw C-row lines
    (rstripped, joined with "\\n", UTF-8) — the rows only, never the
    status field, the ratification blocks, or the realized map (no
    self-reference; prose is non-normative by declaration). Status
    ratified-or-later requires at least one
    {"ratification": {"date", "arms", "sha256"}} block — every block
    strictly shaped (YYYY-MM-DD string date, nonempty string-list arms,
    64-hex sha256; exact keyset) — and the LATEST block's sha256 must
    match the computed payload hash.
  - realized additionally requires a {"realized_map": {...}} covering
    exactly the C-row id set, every landing site a nonempty string.

Modes:
  - default: lint all packets + drafts; hard failure on any violation.
  - --selftest: prove each check dimension fails red on throwaway
    fixtures, and that a green fixture pair passes (chapter rule: a
    prescribed check proves itself red before it may gate).
  - --packets-dir / --contracts-dir / --adr-dir override the sources
    (the script's own negative-test seams).

The canonical STOP member-token registry is mirrored here from
process-v2-design.md D3 (authority moves to README at the Phase-1 flip;
this constant is the mechanical mirror and changes only with it).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PACKETS_DIR = REPO_ROOT / "docs" / "v3" / "implementation" / "packets"
CONTRACTS_DIR = REPO_ROOT / "docs" / "v3" / "implementation" / "contracts"
ADR_DIR = REPO_ROOT / "v3" / "adr"

STOP_TOKEN_REGISTRY = {
    "1:late-b-signal",
    "1:divergence",
    "1:open-choice",
    "2:meaning-changing-alignment",
    "2:scope-changing-split",
    "2:contested-ratified-vs-reality",
    "2:draft-split",
    "3:watchdog",
    "4:flagged-approve",
}

DRAFT_STATUSES = ("draft", "ratified", "realized")
RATIFIED_OR_LATER = ("ratified", "realized")
STATUS_ORDER = {"draft": 0, "ratified": 1, "realized": 2}

FENCED_JSON_RE = re.compile(r"```json\s*\n(.*?)```", re.DOTALL)
FENCED_ANY_RE = re.compile(r"```.*?```", re.DOTALL)
PROV_MARK_RE = re.compile(r"\[P:(anchored|derived|new-decision)((?:\s+[^\]]+)?)\]")
DRAFT_REF_RE = re.compile(r"draft:(ch\d+-[a-z0-9-]+)#(C\d+)")
ADR_REF_RE = re.compile(r"\bADR-(\d{3})\b")
LANE_DEF_RE = re.compile(r"^\|\s*([A-Z]{1,2})(\d+)\s*\|")
LANE_RANGE_RE = re.compile(r"(?<![-\w])([A-Z]{1,2})(\d+)[–-]\1(\d+)(?![-\w])")
LANE_REF_RE = re.compile(r"(?<![-\w])([A-Z]{1,2})(\d+)(?![-\w])")
C_ROW_RE = re.compile(r"^\|\s*(C\d+)\s*\|")
DRAFT_NAME_RE = re.compile(r"^(ch\d+)-([a-z0-9-]+)-contract\.md$")

# Family "P" collides with packet names (ch7-P2); never a lane family.
EXCLUDED_LANE_FAMILIES = {"P"}

PACKET_METRICS_KEYS = {
    "class",
    "prediction",
    "provenance",
    "rounds",
    "stops",
    "detector_misses",
    "learned",
}
PACKET_METRICS_OPTIONAL = {"baseline_note"}
ROUNDS_KEYS = {"review", "doc_refinement", "implementation"}
PREDICTION_KEYS = {"predicted", "reasoning", "discovered"}
PREDICTION_CLASSES = {"projection", "invention"}
FOUND_AT_VALUES = {"approve", "code-review", "architecture-review", "refinement", "implementation"}
PROVENANCE_KEYS = {"anchored", "derived", "new_decision"}


class Checker:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.notes: list[str] = []

    def error(self, msg: str) -> None:
        self.errors.append(msg)

    def note(self, msg: str) -> None:
        self.notes.append(msg)


def json_blocks(text: str, path_name: str, checker: Checker) -> list[dict]:
    blocks: list[dict] = []
    for match in FENCED_JSON_RE.finditer(text):
        try:
            data = json.loads(match.group(1))
        except json.JSONDecodeError as exc:
            checker.error(f"{path_name}: unparseable json block ({exc})")
            continue
        if isinstance(data, dict):
            blocks.append(data)
    return blocks


def block_by_key(blocks: list[dict], key: str) -> list[dict]:
    return [b[key] for b in blocks if key in b]


def strip_fences(text: str) -> str:
    return FENCED_ANY_RE.sub("", text)


# ---------------------------------------------------------------- drafts


def draft_row_lines(text: str) -> list[str]:
    return [line.rstrip() for line in text.splitlines() if C_ROW_RE.match(line)]


def draft_payload_hash(text: str) -> str:
    payload = "\n".join(draft_row_lines(text)).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def check_status_monotonic(name: str, prev: str | None, current: str, checker: Checker) -> None:
    """Monotonic status: draft -> ratified -> realized, never backwards.
    Selftested directly; the live lint feeds `prev` from git HEAD."""
    if prev in STATUS_ORDER and current in STATUS_ORDER and STATUS_ORDER[current] < STATUS_ORDER[prev]:
        checker.error(
            f"{name}: status downgrade '{prev}' -> '{current}' — the status "
            f"machine is monotonic (a reopen is a new ratification block, "
            f"never a status step back)"
        )


def _parse_status(text: str, name: str) -> str | None:
    silent = Checker()
    metas = block_by_key(json_blocks(text, name, silent), "contract_draft")
    if len(metas) == 1 and isinstance(metas[0], dict):
        status = metas[0].get("status")
        return status if status in DRAFT_STATUSES else None
    return None


def draft_status_history(path: Path) -> list[str]:
    """Every parseable status value of the draft across its FULL git
    history (oldest -> newest). Empty for untracked/out-of-repo files.

    The full chain matters: checking only the latest edge was a false
    gate — a committed ratified -> draft -> ratified history has a clean
    final edge while the status machine stepped back in between. The
    repo root derives from the file's own directory so the git
    integration stays selftestable in a throwaway repo."""
    top = subprocess.run(
        ["git", "-C", str(path.parent), "rev-parse", "--show-toplevel"],
        capture_output=True,
        text=True,
    )
    if top.returncode != 0:
        return []
    root = Path(top.stdout.strip())
    try:
        rel = path.resolve().relative_to(root).as_posix()
    except ValueError:
        return []
    rl = subprocess.run(
        ["git", "-C", str(root), "rev-list", "--reverse", "HEAD", "--", rel],
        capture_output=True,
        text=True,
    )
    if rl.returncode != 0:
        return []
    statuses: list[str] = []
    for commit in (line.strip() for line in rl.stdout.splitlines() if line.strip()):
        out = subprocess.run(
            ["git", "-C", str(root), "show", f"{commit}:{rel}"],
            capture_output=True,
            text=True,
        )
        if out.returncode != 0:
            continue
        status = _parse_status(out.stdout, path.name)
        if status is not None:
            statuses.append(status)
    return statuses


RATIFICATION_KEYS = {"date", "arms", "sha256"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


def check_ratification_shape(name: str, index: int, block: object, checker: Checker) -> None:
    """Strict shape for EVERY ratification block — presence-of-keys
    alone let `date: 20260709` and `arms: "not-a-list"` ride through."""
    label = f"{name}: ratification[{index}]"
    if not isinstance(block, dict) or set(block.keys()) != RATIFICATION_KEYS:
        checker.error(f"{label} must be an object with exactly keys {sorted(RATIFICATION_KEYS)}")
        return
    if not isinstance(block["date"], str) or not DATE_RE.match(block["date"]):
        checker.error(f"{label}.date must be a YYYY-MM-DD string")
    arms = block["arms"]
    if not isinstance(arms, list) or not arms or not all(isinstance(a, str) and a.strip() for a in arms):
        checker.error(f"{label}.arms must be a nonempty list of nonempty strings")
    if not isinstance(block["sha256"], str) or not SHA256_RE.match(block["sha256"]):
        checker.error(f"{label}.sha256 must be a 64-hex string")


def check_draft(path: Path, checker: Checker) -> dict | None:
    """Returns {"status": str, "rows": set[str]} for cross-ref use, or None."""
    text = path.read_text(encoding="utf-8")
    blocks = json_blocks(text, path.name, checker)

    metas = block_by_key(blocks, "contract_draft")
    if len(metas) != 1:
        checker.error(f"{path.name}: expected exactly one contract_draft block, found {len(metas)}")
        return None
    meta = metas[0]
    if not isinstance(meta, dict):
        checker.error(f"{path.name}: contract_draft is not an object")
        return None
    status = meta.get("status")
    chapter = meta.get("chapter")
    surface = meta.get("surface")
    if status not in DRAFT_STATUSES:
        checker.error(f"{path.name}: contract_draft.status '{status}' not in {DRAFT_STATUSES}")
        return None
    chain = draft_status_history(path)
    chain.append(status)  # adjacent equals pass — a duplicate tail is harmless
    for prev, current in zip(chain, chain[1:]):
        check_status_monotonic(path.name, prev, current, checker)
    name_match = DRAFT_NAME_RE.match(path.name)
    if not name_match:
        checker.error(f"{path.name}: filename must be ch<N>-<surface>-contract.md")
    elif chapter != name_match.group(1) or surface != name_match.group(2):
        checker.error(
            f"{path.name}: contract_draft chapter/surface ({chapter}/{surface}) "
            f"does not match filename"
        )

    row_ids: list[str] = []
    for line in text.splitlines():
        m = C_ROW_RE.match(line)
        if m:
            row_ids.append(m.group(1))
    dupes = {r for r in row_ids if row_ids.count(r) > 1}
    if dupes:
        checker.error(f"{path.name}: duplicate C-row ids {sorted(dupes)}")
    rows = set(row_ids)

    ratifications = block_by_key(blocks, "ratification")
    for index, block in enumerate(ratifications):
        check_ratification_shape(path.name, index, block, checker)
    if status in RATIFIED_OR_LATER:
        if not rows:
            checker.error(f"{path.name}: status {status} but no C-rows")
        if not ratifications:
            checker.error(f"{path.name}: status {status} requires a ratification block")
        else:
            latest = ratifications[-1]
            declared = latest.get("sha256") if isinstance(latest, dict) else None
            actual = draft_payload_hash(text)
            if declared != actual:
                shown = declared[:12] if isinstance(declared, str) else declared
                checker.error(
                    f"{path.name}: canonical row payload hash mismatch — "
                    f"ratified {shown}…, actual {actual[:12]}… "
                    f"(a post-ratification row edit needs re-ratification)"
                )

    if status == "realized":
        maps = block_by_key(blocks, "realized_map")
        if len(maps) != 1 or not isinstance(maps[0], dict):
            checker.error(f"{path.name}: status realized requires exactly one realized_map block")
        else:
            mapped = set(maps[0].keys())
            if mapped != rows:
                missing = sorted(rows - mapped)
                extra = sorted(mapped - rows)
                checker.error(
                    f"{path.name}: realized_map does not cover the C-row set "
                    f"(missing {missing}, unknown {extra})"
                )
            for row_id, landing in maps[0].items():
                if not isinstance(landing, str) or not landing.strip():
                    checker.error(
                        f"{path.name}: realized_map['{row_id}'] must be a nonempty "
                        f"landing-site string"
                    )

    return {"status": status, "rows": rows}


# ---------------------------------------------------------------- packets


def check_packet(
    path: Path,
    drafts: dict[str, dict],
    adr_dir: Path,
    checker: Checker,
) -> bool:
    """Returns True iff the packet is v2 (and was linted)."""
    text = path.read_text(encoding="utf-8")
    # Grandfathering must be decided BEFORE any error is reported: a
    # pre-v2 packet with an unrelated malformed fence is SKIPPED, not
    # failed. The reverse hole is closed textually — a packet whose
    # mutation_boundary fence itself is malformed still counts as v2
    # (the raw text names the marker), so it cannot silently demote
    # itself to grandfathered.
    probe = Checker()
    blocks = json_blocks(text, path.name, probe)
    boundaries = block_by_key(blocks, "mutation_boundary")
    if not boundaries and '"mutation_boundary"' not in text:
        return False  # pre-v2: grandfathered, parse noise suppressed
    checker.errors.extend(probe.errors)
    if not boundaries:
        checker.error(
            f"{path.name}: names mutation_boundary but no parseable "
            f"mutation_boundary block found"
        )
        return True
    if len(boundaries) > 1:
        checker.error(f"{path.name}: {len(boundaries)} mutation_boundary blocks; exactly one allowed")

    boundary = boundaries[0]
    files = boundary.get("files") if isinstance(boundary, dict) else None
    if not isinstance(files, list) or not files or not all(
        isinstance(f, str) and f and not f.startswith("/") and ".." not in f for f in files
    ):
        checker.error(
            f"{path.name}: mutation_boundary.files must be a nonempty list of "
            f"repo-relative paths"
        )
    elif len(set(files)) != len(files):
        checker.error(f"{path.name}: mutation_boundary.files has duplicates")

    # Provenance bookkeeping: marks vs machine block.
    marks = {"anchored": 0, "derived": 0, "new_decision": 0}
    for m in PROV_MARK_RE.finditer(text):
        kind = m.group(1).replace("-", "_")
        ref = m.group(2).strip()
        marks[kind] += 1
        if kind in ("anchored", "derived") and not ref:
            checker.error(f"{path.name}: [P:{m.group(1)}] mark without a ref")
    prov_blocks = block_by_key(blocks, "provenance")
    if len(prov_blocks) != 1 or not isinstance(prov_blocks[0], dict):
        checker.error(f"{path.name}: v2 packet requires exactly one provenance block")
    else:
        declared = prov_blocks[0]
        if set(declared.keys()) != PROVENANCE_KEYS:
            checker.error(f"{path.name}: provenance block keys must be {sorted(PROVENANCE_KEYS)}")
        else:
            for key in PROVENANCE_KEYS:
                if declared[key] != marks[key]:
                    checker.error(
                        f"{path.name}: provenance.{key} = {declared[key]} but "
                        f"{marks[key]} inline marks counted"
                    )

    # Strict cross-refs: draft rows + ADR files.
    for m in DRAFT_REF_RE.finditer(text):
        slug, row = m.group(1), m.group(2)
        draft = drafts.get(slug)
        if draft is None:
            checker.error(f"{path.name}: draft ref '{m.group(0)}' — no such contract-draft")
        elif draft["status"] not in RATIFIED_OR_LATER:
            checker.error(
                f"{path.name}: draft ref '{m.group(0)}' — draft status is "
                f"'{draft['status']}', anchors need ratified-or-later"
            )
        elif row not in draft["rows"]:
            checker.error(f"{path.name}: draft ref '{m.group(0)}' — row {row} not in draft")
    for m in ADR_REF_RE.finditer(text):
        if not list(adr_dir.glob(f"ADR-{m.group(1)}-*.md")):
            checker.error(f"{path.name}: ADR ref 'ADR-{m.group(1)}' — no such file in {adr_dir.name}/")

    # Lane id registry + range/scalar consistency.
    defined: dict[str, set[int]] = {}
    seen_ids: list[str] = []
    for line in text.splitlines():
        m = LANE_DEF_RE.match(line)
        if m and m.group(1) not in EXCLUDED_LANE_FAMILIES:
            fam, num = m.group(1), int(m.group(2))
            defined.setdefault(fam, set()).add(num)
            seen_ids.append(f"{fam}{num}")
            # D1: every canonical row carries EXACTLY ONE provenance
            # class. The mechanically detectable canonical-row set v0 =
            # lane-id table rows; type-matrix rows remain the panel's
            # duty.
            row_marks = PROV_MARK_RE.findall(line)
            if not row_marks:
                checker.error(
                    f"{path.name}: canonical row {fam}{num} carries no [P:*] provenance mark"
                )
            elif len(row_marks) > 1:
                checker.error(
                    f"{path.name}: canonical row {fam}{num} carries {len(row_marks)} "
                    f"provenance marks — one row, one class (D1)"
                )
    dupes = {i for i in seen_ids if seen_ids.count(i) > 1}
    if dupes:
        checker.error(f"{path.name}: duplicate lane id definitions {sorted(dupes)}")
    prose = strip_fences(text)
    for m in LANE_RANGE_RE.finditer(prose):
        fam, a, b = m.group(1), int(m.group(2)), int(m.group(3))
        if fam in EXCLUDED_LANE_FAMILIES or fam not in defined:
            continue
        if a > b:
            checker.error(f"{path.name}: lane range '{m.group(0)}' is descending")
        # FULL range resolution — every member, not just the endpoints
        # (an O1–O3 with O2 undefined is a false claim about O2).
        for member in range(a, b + 1):
            if member not in defined[fam]:
                checker.error(
                    f"{path.name}: lane range '{m.group(0)}' member {fam}{member} undefined"
                )
    for m in LANE_REF_RE.finditer(prose):
        fam, num = m.group(1), int(m.group(2))
        if fam in EXCLUDED_LANE_FAMILIES or fam not in defined:
            continue
        if num not in defined[fam]:
            checker.error(f"{path.name}: lane ref '{fam}{num}' undefined in this packet")

    # packet_metrics (optional block; DEEP schema check when present —
    # a shallow "if it happens to be a dict" check is a false gate).
    # The metrics' provenance counts are cross-checked against the SAME
    # inline marks the provenance block is locked to.
    for metrics in block_by_key(blocks, "packet_metrics"):
        check_packet_metrics(path.name, metrics, checker, marks=marks)
    return True


def _is_int(value: object) -> bool:
    return type(value) is int  # bool is an int subclass; excluded on purpose


def check_packet_metrics(
    name: str, metrics: object, checker: Checker, marks: dict[str, int] | None = None
) -> None:
    if not isinstance(metrics, dict):
        checker.error(f"{name}: packet_metrics is not an object")
        return
    keys = set(metrics.keys())
    missing = PACKET_METRICS_KEYS - keys
    unknown = keys - PACKET_METRICS_KEYS - PACKET_METRICS_OPTIONAL
    if missing:
        checker.error(f"{name}: packet_metrics missing keys {sorted(missing)}")
    if unknown:
        checker.error(f"{name}: packet_metrics unknown keys {sorted(unknown)}")

    def type_err(field: str, expected: str) -> None:
        checker.error(f"{name}: packet_metrics.{field} must be {expected}")

    if "class" in metrics and not isinstance(metrics["class"], str):
        type_err("class", "a string")
    if "learned" in metrics and not isinstance(metrics["learned"], str):
        type_err("learned", "a string")
    if "baseline_note" in metrics and not isinstance(metrics["baseline_note"], str):
        type_err("baseline_note", "a string")

    prediction = metrics.get("prediction")
    if "prediction" in metrics:
        if not isinstance(prediction, dict):
            type_err("prediction", "an object")
        else:
            if set(prediction.keys()) != PREDICTION_KEYS:
                type_err("prediction", f"an object with exactly keys {sorted(PREDICTION_KEYS)}")
            for key in PREDICTION_KEYS & set(prediction.keys()):
                if not isinstance(prediction[key], str):
                    type_err(f"prediction.{key}", "a string")
            for key in ("predicted", "discovered"):
                value = prediction.get(key)
                if isinstance(value, str) and value not in PREDICTION_CLASSES:
                    type_err(f"prediction.{key}", f"one of {sorted(PREDICTION_CLASSES)}")

    provenance = metrics.get("provenance")
    if "provenance" in metrics:
        if not isinstance(provenance, dict) or set(provenance.keys()) != PROVENANCE_KEYS:
            type_err("provenance", f"an object with exactly keys {sorted(PROVENANCE_KEYS)}")
        else:
            for key, value in provenance.items():
                if not _is_int(value) or value < 0:
                    type_err(f"provenance.{key}", "a nonnegative integer")
                elif marks is not None and value != marks[key]:
                    checker.error(
                        f"{name}: packet_metrics.provenance.{key} = {value} but "
                        f"{marks[key]} inline marks counted"
                    )

    rounds = metrics.get("rounds")
    if "rounds" in metrics:
        if not isinstance(rounds, dict) or set(rounds.keys()) != ROUNDS_KEYS:
            type_err("rounds", f"an object with exactly keys {sorted(ROUNDS_KEYS)}")
        else:
            for key, value in rounds.items():
                if not _is_int(value) or value < 0:
                    type_err(f"rounds.{key}", "a nonnegative integer — these are counters")

    stops = metrics.get("stops")
    if "stops" in metrics:
        if not isinstance(stops, list):
            type_err("stops", "a list")
        else:
            for stop in stops:
                if not isinstance(stop, dict) or set(stop.keys()) != {"type", "what", "resolution"}:
                    type_err("stops[]", "objects with exactly type/what/resolution")
                    continue
                if stop["type"] not in STOP_TOKEN_REGISTRY:
                    checker.error(
                        f"{name}: stops[].type '{stop['type']}' not in the canonical "
                        f"STOP member-token registry"
                    )
                for key in ("what", "resolution"):
                    if not isinstance(stop[key], str):
                        type_err(f"stops[].{key}", "a string")

    misses = metrics.get("detector_misses")
    if "detector_misses" in metrics:
        if not isinstance(misses, list):
            type_err("detector_misses", "a list")
        else:
            for miss in misses:
                if not isinstance(miss, dict) or set(miss.keys()) != {"found_at", "what", "why_missed"}:
                    type_err("detector_misses[]", "objects with exactly found_at/what/why_missed")
                    continue
                for key in ("found_at", "what", "why_missed"):
                    if not isinstance(miss[key], str):
                        type_err(f"detector_misses[].{key}", "a string")
                if isinstance(miss["found_at"], str) and miss["found_at"] not in FOUND_AT_VALUES:
                    type_err("detector_misses[].found_at", f"one of {sorted(FOUND_AT_VALUES)}")


def check_post_build(packet_path: Path, commit: str, checker: Checker) -> None:
    text = packet_path.read_text(encoding="utf-8")
    blocks = json_blocks(text, packet_path.name, checker)
    boundaries = block_by_key(blocks, "mutation_boundary")
    if len(boundaries) != 1 or not isinstance(boundaries[0].get("files"), list):
        checker.error(f"{packet_path.name}: --post-build needs exactly one valid mutation_boundary block")
        return
    allowed = set(boundaries[0]["files"])
    allowed.add(str(packet_path.resolve().relative_to(REPO_ROOT)))
    out = subprocess.run(
        ["git", "-C", str(REPO_ROOT), "diff-tree", "--no-commit-id", "--name-only", "-r", commit],
        capture_output=True,
        text=True,
    )
    if out.returncode != 0:
        checker.error(f"--post-build: git diff-tree failed for '{commit}': {out.stderr.strip()}")
        return
    changed = {line.strip() for line in out.stdout.splitlines() if line.strip()}
    outside = sorted(changed - allowed)
    if outside:
        checker.error(
            f"{packet_path.name}: commit {commit} touches files OUTSIDE the declared "
            f"mutation boundary: {outside}"
        )


# ---------------------------------------------------------------- runner


def collect_drafts(contracts_dir: Path, checker: Checker) -> dict[str, dict]:
    drafts: dict[str, dict] = {}
    if not contracts_dir.is_dir():
        return drafts
    for path in sorted(contracts_dir.glob("*.md")):
        if path.name == "README.md":
            continue
        info = check_draft(path, checker)
        if info is not None:
            m = DRAFT_NAME_RE.match(path.name)
            if m:
                drafts[f"{m.group(1)}-{m.group(2)}"] = info
    return drafts


def run_lint(packets_dir: Path, contracts_dir: Path, adr_dir: Path) -> int:
    checker = Checker()
    drafts = collect_drafts(contracts_dir, checker)
    v2 = grandfathered = 0
    for path in sorted(packets_dir.glob("*.md")):
        if path.name == "README.md":
            continue
        if check_packet(path, drafts, adr_dir, checker):
            v2 += 1
        else:
            grandfathered += 1
    for msg in checker.errors:
        print(f"packet-lint FAIL: {msg}", file=sys.stderr)
    print(
        f"packet-lint: {v2} v2 packet(s) linted, {grandfathered} pre-v2 grandfathered, "
        f"{len(drafts)} draft(s) linted, {len(checker.errors)} error(s)"
    )
    return 1 if checker.errors else 0


# ---------------------------------------------------------------- selftest

GREEN_DRAFT = """# draft fixture

```json
{"contract_draft": {"chapter": "ch9", "surface": "test-surface", "status": "ratified"}}
```

| ID | Rule |
|---|---|
| C1 | the row |
| C2 | the other row |

```json
{"ratification": {"date": "2026-07-09", "arms": ["a", "b"], "sha256": "%HASH%"}}
```
"""

GREEN_PACKET = """# packet fixture

```json
{"mutation_boundary": {"files": ["v3/src/x.ts", "v3/src/x.test.ts"]}}
```

| Lane | Emit |
|---|---|
| O1 | a [P:anchored draft:ch9-test-surface#C1] |
| O2 | b [P:derived draft:ch9-test-surface#C2] |
| O3 | c [P:new-decision] |

Ranges O1–O3 hold; O2 alone too.

```json
{"provenance": {"anchored": 1, "derived": 1, "new_decision": 1}}
```

```json
{"packet_metrics": {"class": "t", "prediction": {"predicted": "projection", "reasoning": "r", "discovered": "projection"}, "provenance": {"anchored": 1, "derived": 1, "new_decision": 1}, "rounds": {"review": 1, "doc_refinement": 0, "implementation": 0}, "stops": [{"type": "3:watchdog", "what": "w", "resolution": "r"}], "detector_misses": [], "learned": "l"}}
```
"""


def git_downgrade_selftest(green_draft: str, failures: list[str]) -> None:
    git_base = ["git", "-c", "user.email=lint@selftest", "-c", "user.name=lint-selftest"]
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        cdir = root / "contracts"
        cdir.mkdir()
        path = cdir / "ch9-test-surface-contract.md"
        path.write_text(green_draft, encoding="utf-8")
        for cmd in (["git", "init", "-q"], git_base + ["add", "-A"], git_base + ["commit", "-q", "-m", "ratified"]):
            if subprocess.run(cmd, cwd=root, capture_output=True).returncode != 0:
                failures.append("selftest git fixture setup failed")
                return
        downgraded = green_draft.replace('"status": "ratified"', '"status": "draft"')
        # uncommitted downgrade
        path.write_text(downgraded, encoding="utf-8")
        checker = Checker()
        check_draft(path, checker)
        if not any("downgrade" in e for e in checker.errors):
            failures.append("selftest dim NOT red: git-uncommitted-downgrade")
        # committed downgrade (a clean checkout: working tree == HEAD)
        for cmd in (git_base + ["add", "-A"], git_base + ["commit", "-q", "-m", "downgrade"]):
            subprocess.run(cmd, cwd=root, capture_output=True)
        checker = Checker()
        check_draft(path, checker)
        if not any("downgrade" in e for e in checker.errors):
            failures.append("selftest dim NOT red: git-committed-downgrade")
        # 25: MULTI-STEP history — ratified -> draft -> ratified has a clean
        # final edge; the FULL-chain scan must still go red.
        path.write_text(green_draft, encoding="utf-8")
        for cmd in (git_base + ["add", "-A"], git_base + ["commit", "-q", "-m", "re-ratify"]):
            subprocess.run(cmd, cwd=root, capture_output=True)
        checker = Checker()
        check_draft(path, checker)
        if not any("downgrade" in e for e in checker.errors):
            failures.append("selftest dim NOT red: git-history-multistep-downgrade")


def run_selftest() -> int:
    failures: list[str] = []

    def expect_red(name: str, packet_text: str | None, draft_text: str | None) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            pdir = root / "packets"
            cdir = root / "contracts"
            pdir.mkdir()
            cdir.mkdir()
            if draft_text is not None:
                (cdir / "ch9-test-surface-contract.md").write_text(draft_text, encoding="utf-8")
            if packet_text is not None:
                (pdir / "ch9-p1-test.md").write_text(packet_text, encoding="utf-8")
            if run_lint(pdir, cdir, ADR_DIR) == 0:
                failures.append(f"selftest dim NOT red: {name}")

    def green_pair() -> tuple[str, str]:
        draft = GREEN_DRAFT.replace("%HASH%", "0" * 64)
        with tempfile.TemporaryDirectory() as tmp:
            probe = Path(tmp) / "d.md"
            probe.write_text(draft, encoding="utf-8")
            real = draft_payload_hash(draft)
        return GREEN_DRAFT.replace("%HASH%", real), GREEN_PACKET

    green_draft, green_packet = green_pair()

    # 1 boundary malformed
    expect_red("boundary-malformed", green_packet.replace('"files": ["v3/src/x.ts", "v3/src/x.test.ts"]', '"files": "x"'), green_draft)
    # 2 provenance count mismatch
    expect_red("provenance-mismatch", green_packet.replace('"anchored": 1, "derived": 1', '"anchored": 2, "derived": 1', 1), green_draft)
    # 3 draft ref unresolved (no draft file at all)
    expect_red("draft-ref-unresolved", green_packet, None)
    # 4 draft not ratified
    expect_red("draft-not-ratified", green_packet, green_draft.replace('"status": "ratified"', '"status": "draft"'))
    # 5 range endpoint undefined
    expect_red("range-endpoint-undefined", green_packet.replace("Ranges O1–O3 hold", "Ranges O1–O9 hold"), green_draft)
    # 6 duplicate lane id
    expect_red("duplicate-lane-id", green_packet.replace("| O3 | c [P:new-decision] |", "| O3 | c [P:new-decision] |\n| O3 | dup |"), green_draft)
    # 7 bad stops token
    expect_red("bad-stop-token", green_packet.replace("3:watchdog", "9:made-up"), green_draft)
    # 8 ratified draft without ratification block
    expect_red(
        "draft-missing-ratification",
        green_packet,
        re.sub(r"```json\n\{\"ratification\".*?```\n", "", green_draft, flags=re.DOTALL),
    )
    # 9 draft hash mismatch (row edited after ratification)
    expect_red("draft-hash-mismatch", green_packet, green_draft.replace("| C1 | the row |", "| C1 | the row, edited |"))
    # 10 realized with incomplete map
    expect_red(
        "realized-incomplete-map",
        green_packet,
        green_draft.replace('"status": "ratified"', '"status": "realized"')
        + '\n```json\n{"realized_map": {"C1": "landed"}}\n```\n',
    )
    # 11 undefined single lane ref
    expect_red("single-ref-undefined", green_packet.replace("O2 alone too", "O7 alone too"), green_draft)
    # 12 ADR ref unresolved
    expect_red("adr-ref-unresolved", green_packet.replace("O2 alone too", "per ADR-999 too"), green_draft)
    # 13 draft ref to a missing ROW (file exists, row does not)
    expect_red("draft-row-missing", green_packet.replace("draft:ch9-test-surface#C2", "draft:ch9-test-surface#C7"), green_draft)
    # 14 anchored mark without a ref
    expect_red("mark-without-ref", green_packet.replace("[P:anchored draft:ch9-test-surface#C1]", "[P:anchored]").replace("draft:ch9-test-surface#C2", "draft:ch9-test-surface#C1"), green_draft)
    # 15 packet_metrics missing a required key
    expect_red("metrics-missing-key", green_packet.replace(', "learned": "l"', ""), green_draft)
    # 16 packet_metrics nested field with a wrong TYPE (the shallow-gate class)
    expect_red(
        "metrics-nested-wrong-type",
        green_packet.replace(
            '"prediction": {"predicted": "projection", "reasoning": "r", "discovered": "projection"}',
            '"prediction": "projection"',
        ),
        green_draft,
    )
    # 17 range INTERIOR member undefined (O1–O3 with O2 missing)
    expect_red(
        "range-interior-undefined",
        green_packet.replace(
            "| O2 | b [P:derived draft:ch9-test-surface#C2] |",
            "| O4 | b [P:derived draft:ch9-test-surface#C2] |",
        ).replace("O2 alone too", "O4 alone too"),
        green_draft,
    )
    # 18 canonical lane row WITHOUT a provenance mark
    expect_red(
        "lane-row-unmarked",
        green_packet.replace(
            "| O3 | c [P:new-decision] |",
            "| O3 | c [P:new-decision] |\n| O5 | unmarked row |",
        ),
        green_draft,
    )
    # 19 draft status downgrade (the monotonicity comparison, tested directly)
    mono = Checker()
    check_status_monotonic("fixture.md", "ratified", "draft", mono)
    if not mono.errors:
        failures.append("selftest dim NOT red: status-downgrade")
    mono_ok = Checker()
    check_status_monotonic("fixture.md", "ratified", "realized", mono_ok)
    if mono_ok.errors:
        failures.append("selftest green NOT green: status-upgrade flagged")
    # 20 prediction.predicted outside the D7 enum
    expect_red(
        "prediction-enum-invalid",
        green_packet.replace('"predicted": "projection"', '"predicted": "vibes"'),
        green_draft,
    )
    # 21 detector_misses[].found_at outside the D7 enum
    expect_red(
        "found-at-enum-invalid",
        green_packet.replace(
            '"detector_misses": []',
            '"detector_misses": [{"found_at": "someday", "what": "w", "why_missed": "y"}]',
        ),
        green_draft,
    )
    # 22 packet_metrics.provenance disagrees with the counted inline marks
    expect_red(
        "metrics-provenance-mismatch",
        green_packet.replace(
            '"provenance": {"anchored": 1, "derived": 1, "new_decision": 1}, "rounds"',
            '"provenance": {"anchored": 999, "derived": 1, "new_decision": 1}, "rounds"',
        ),
        green_draft,
    )
    # 26 rounds counter negative
    expect_red(
        "rounds-negative",
        green_packet.replace('"review": 1', '"review": -1'),
        green_draft,
    )
    # 27 nested extra key (the DEEP-schema claim covers keysets, not just types)
    expect_red(
        "nested-extra-key",
        green_packet.replace('"discovered": "projection"}', '"discovered": "projection", "extra": 1}'),
        green_draft,
    )
    # 28 a canonical row with TWO provenance marks (one row, one class)
    expect_red(
        "row-multiple-marks",
        green_packet.replace(
            "| O1 | a [P:anchored draft:ch9-test-surface#C1] |",
            "| O1 | a [P:anchored draft:ch9-test-surface#C1] [P:new-decision] |",
        ).replace('"anchored": 1, "derived": 1, "new_decision": 1', '"anchored": 1, "derived": 1, "new_decision": 2'),
        green_draft,
    )
    # 29 ratification block shape (date as a number rides through a
    # presence-only check)
    expect_red("ratification-bad-shape", green_packet, green_draft.replace('"date": "2026-07-09"', '"date": 20260709')),
    # 30 realized_map landing-site value not a string
    expect_red(
        "realized-map-bad-value",
        green_packet,
        green_draft.replace('"status": "ratified"', '"status": "realized"')
        + '\n```json\n{"realized_map": {"C1": "landed", "C2": 7}}\n```\n',
    )
    # 31 pre-v2 packet with an unrelated malformed fence must PASS
    # (grandfathered means SKIPPED, not failed)
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "packets").mkdir()
        (root / "contracts").mkdir()
        (root / "packets" / "ch4-p1-old.md").write_text(
            "# old packet\n\n```json\n{broken\n```\n", encoding="utf-8"
        )
        if run_lint(root / "packets", root / "contracts", ADR_DIR) != 0:
            failures.append("selftest green NOT green: pre-v2 packet with bad fence failed")
    # 32 a packet NAMING mutation_boundary inside a malformed fence must
    # stay v2 and go red (no silent demotion to grandfathered)
    expect_red(
        "malformed-boundary-fence",
        '# packet\n\n```json\n{"mutation_boundary": {broken\n```\n',
        green_draft,
    )
    # 23-25 git integration: an UNCOMMITTED, a COMMITTED, and a MULTI-STEP
    # (ratified -> draft -> ratified) downgrade must all go red (the
    # HEAD-only form passed the committed case; the latest-edge form
    # passed the multi-step history).
    git_downgrade_selftest(green_draft, failures)

    # green must pass
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "packets").mkdir()
        (root / "contracts").mkdir()
        (root / "contracts" / "ch9-test-surface-contract.md").write_text(green_draft, encoding="utf-8")
        (root / "packets" / "ch9-p1-test.md").write_text(green_packet, encoding="utf-8")
        if run_lint(root / "packets", root / "contracts", ADR_DIR) != 0:
            failures.append("selftest GREEN fixture failed")

    for f in failures:
        print(f"selftest FAIL: {f}", file=sys.stderr)
    print(f"selftest: 32 red dims exercised, green fixture pass, {len(failures)} failure(s)")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--selftest", action="store_true")
    parser.add_argument("--packets-dir", type=Path, default=PACKETS_DIR)
    parser.add_argument("--contracts-dir", type=Path, default=CONTRACTS_DIR)
    parser.add_argument("--adr-dir", type=Path, default=ADR_DIR)
    parser.add_argument("--post-build", metavar="COMMIT")
    parser.add_argument("--packet", type=Path)
    args = parser.parse_args()

    if args.selftest:
        return run_selftest()
    if args.post_build:
        if not args.packet:
            print("--post-build requires --packet <path>", file=sys.stderr)
            return 2
        checker = Checker()
        check_post_build(args.packet, args.post_build, checker)
        for msg in checker.errors:
            print(f"packet-lint FAIL: {msg}", file=sys.stderr)
        print(f"post-build boundary check: {len(checker.errors)} error(s)")
        return 1 if checker.errors else 0
    return run_lint(args.packets_dir, args.contracts_dir, args.adr_dir)


if __name__ == "__main__":
    sys.exit(main())
