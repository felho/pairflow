#!/usr/bin/env python3
"""V3 packet-lint + draft-lint (process-v2-design.md §5 Phase 0, item 1).

Mechanizes the fresh-eyes sweep class the ch7-P1/P2 pre-approval rounds
spent LLM rounds on: id-registry uniqueness, lane-range/scalar
consistency, provenance-mark bookkeeping, machine-block syntax, and the
contract-draft artifact contract (D2). Stdlib only (the check_coverage.py
culture).

Packet source: docs/v3/implementation/packets/*.md (README.md excluded).
A packet is V2 iff it carries a fenced ```json block whose top-level key
is "mutation_boundary" — pre-v2 packets are GRANDFATHERED (reported,
skipped): the v2 obligations bind from the ch7-P3 pilot onward, never
retroactively.

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
    (e.g. O1, R3) are unique AND each lane row carries a [P:*] mark (the
    mechanically detectable canonical-row set v0 = lane-id table rows;
    type-matrix rows remain the panel's duty); textual refs resolve, and
    ranges (O4–O10) resolve over EVERY member, not just endpoints; family
    "P" is excluded (packet names collide). Fenced blocks are excluded
    from the ref scan.
  - packet_metrics block (when present): schema keys + stops[].type
    tokens against the canonical STOP member-token registry.
  - --post-build <commit>: the commit's changed files must be a subset
    of the declared mutation boundary plus the packet file itself (the
    one packet-lint check that cannot run at fold time).

Draft source: docs/v3/implementation/contracts/*.md (README.md
excluded; a missing directory means zero drafts, which is fine).

Draft checks (the D2 artifact contract):
  - {"contract_draft": {"chapter", "surface", "status"}} meta block;
    filename equals ch<N>-<surface>-contract.md; status in
    draft|ratified|realized, and MONOTONIC against the last committed
    version (git show HEAD: — a status downgrade fails; a reopen is a
    new ratification block, never a step back).
  - C-row registry: table rows whose first cell is C<n>; unique ids;
    ratified-or-later requires at least one row.
  - canonical row payload hash: sha256 over the raw C-row lines
    (rstripped, joined with "\\n", UTF-8) — the rows only, never the
    status field, the ratification blocks, or the realized map (no
    self-reference; prose is non-normative by declaration). Status
    ratified-or-later requires at least one
    {"ratification": {"date", "arms", "sha256"}} block, and the LATEST
    block's sha256 must match the computed payload hash.
  - realized additionally requires a {"realized_map": {...}} covering
    exactly the C-row id set.

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


def head_status(path: Path) -> str | None:
    """The draft's status in the last committed version (HEAD), or None
    for new/untracked/out-of-repo files."""
    try:
        rel = path.resolve().relative_to(REPO_ROOT)
    except ValueError:
        return None
    out = subprocess.run(
        ["git", "-C", str(REPO_ROOT), "show", f"HEAD:{rel}"],
        capture_output=True,
        text=True,
    )
    if out.returncode != 0:
        return None
    silent = Checker()
    metas = block_by_key(json_blocks(out.stdout, path.name, silent), "contract_draft")
    if len(metas) == 1 and isinstance(metas[0], dict):
        status = metas[0].get("status")
        return status if status in DRAFT_STATUSES else None
    return None


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
    check_status_monotonic(path.name, head_status(path), status, checker)
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
    if status in RATIFIED_OR_LATER:
        if not rows:
            checker.error(f"{path.name}: status {status} but no C-rows")
        if not ratifications:
            checker.error(f"{path.name}: status {status} requires a ratification block")
        else:
            latest = ratifications[-1]
            declared = latest.get("sha256", "") if isinstance(latest, dict) else ""
            if not isinstance(latest, dict) or not {"date", "arms", "sha256"} <= latest.keys():
                checker.error(f"{path.name}: ratification block missing date/arms/sha256")
            actual = draft_payload_hash(text)
            if declared != actual:
                checker.error(
                    f"{path.name}: canonical row payload hash mismatch — "
                    f"ratified {declared[:12]}…, actual {actual[:12]}… "
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
    blocks = json_blocks(text, path.name, checker)

    boundaries = block_by_key(blocks, "mutation_boundary")
    if not boundaries:
        return False  # pre-v2: grandfathered
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
            # D1: every canonical row carries a provenance class. The
            # mechanically detectable canonical-row set v0 = lane-id
            # table rows; type-matrix rows remain the panel's duty.
            if not PROV_MARK_RE.search(line):
                checker.error(
                    f"{path.name}: canonical row {fam}{num} carries no [P:*] provenance mark"
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
    for metrics in block_by_key(blocks, "packet_metrics"):
        check_packet_metrics(path.name, metrics, checker)
    return True


def _is_int(value: object) -> bool:
    return type(value) is int  # bool is an int subclass; excluded on purpose


def check_packet_metrics(name: str, metrics: object, checker: Checker) -> None:
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
            if not PREDICTION_KEYS <= set(prediction.keys()):
                type_err("prediction", f"an object with keys {sorted(PREDICTION_KEYS)}")
            for key in PREDICTION_KEYS & set(prediction.keys()):
                if not isinstance(prediction[key], str):
                    type_err(f"prediction.{key}", "a string")

    provenance = metrics.get("provenance")
    if "provenance" in metrics:
        if not isinstance(provenance, dict) or set(provenance.keys()) != PROVENANCE_KEYS:
            type_err("provenance", f"an object with exactly keys {sorted(PROVENANCE_KEYS)}")
        else:
            for key, value in provenance.items():
                if not _is_int(value):
                    type_err(f"provenance.{key}", "an integer")

    rounds = metrics.get("rounds")
    if "rounds" in metrics:
        if not isinstance(rounds, dict) or set(rounds.keys()) != ROUNDS_KEYS:
            type_err("rounds", f"an object with exactly keys {sorted(ROUNDS_KEYS)}")
        else:
            for key, value in rounds.items():
                if not _is_int(value):
                    type_err(f"rounds.{key}", "an integer")

    stops = metrics.get("stops")
    if "stops" in metrics:
        if not isinstance(stops, list):
            type_err("stops", "a list")
        else:
            for stop in stops:
                if not isinstance(stop, dict) or not {"type", "what", "resolution"} <= set(stop.keys()):
                    type_err("stops[]", "objects with type/what/resolution")
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
                if not isinstance(miss, dict) or not {"found_at", "what", "why_missed"} <= set(miss.keys()):
                    type_err("detector_misses[]", "objects with found_at/what/why_missed")
                    continue
                for key in ("found_at", "what", "why_missed"):
                    if not isinstance(miss[key], str):
                        type_err(f"detector_misses[].{key}", "a string")


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
    print(f"selftest: 19 red dims exercised, green fixture pass, {len(failures)} failure(s)")
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
