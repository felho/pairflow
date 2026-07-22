#!/usr/bin/env python3
"""V3 packet-lint + draft-lint — the Amendment-1 carrier
(process-v2-design.md §7; supersedes §5 Phase 0 item 1's check list).

The machine data lives in DECLARED blocks, never in prose: the lint
validates data structures, resolves references, and compares bytes at
recorded commits — it extracts no semantics from free text (the §7.4
tier-0 scoping principle). Stdlib only (the check_coverage.py culture).

Claims — the selftest derives from THIS list; each claim proves itself
red on a fixture before it may gate (chapter rule):

Cross-cutting: fenced ```json machine blocks parse with duplicate-key
REJECTION — json.loads' silent last-wins is a reinterpretation of
declared data (the reader and the tool could disagree on which value
holds), so a duplicated key anywhere in a machine block is red.
Fences are scanned LINE-ORIENTED with the CommonMark closing rule (a
fence closes only on a line of the opener's character with at least
the opener's length; openers and closers may be indented 0-3 spaces):
a ````markdown outer fence QUOTES inner ```json / ```text blocks as
material — quoted machine blocks are never declarations, and quoted
rows/marks never reach the prose scans.

Packets (v3/implementation/packets/*.md, README.md excluded):
  P1. A packet is v2 iff it carries the mutation_boundary machine
      block. Grandfathering is the CLOSED 16-file set below:
      whitelisted pre-v2 packets are SKIPPED (parse noise included);
      any OTHER packet without the marker is red. A packet NAMING
      mutation_boundary in raw text stays v2 even when that fence is
      malformed (no silent demotion).
  P2. mutation_boundary = {"files": [...]}: exact keyset; nonempty,
      unique, repo-relative paths; exactly one block.
  P3. packet_rows (exactly one per v2 packet) =
      {"rows": [{id, class, refs}]}: exact keysets at both levels; ids
      unique, lane-grammar shaped ([A-Z]{1,2} + integer, no leading
      zeros), never in a reserved family, and compared as EXACT
      strings everywhere (O01 is never O1); class in
      anchored|derived|new-decision; anchored/derived carry >=1 ref,
      new-decision carries none.
  P4. Every ref parses EXACTLY as a strict form —
      contract:ch<N>-<surface>#C<n> (resolves to a row of a
      ratified-or-later draft; reopened does NOT qualify) or ADR-NNN
      (file exists under v3/adr/) — or carries the prose: prefix with
      a nonempty remainder (unverified, human-facing provenance).
      Anything else is red: no silent pass-through, a near-miss is
      loud, never reinterpreted.
  P5. Bidirectional lane-id completeness: every manifest id is defined
      as the FIRST cell of a table row (fenced code excluded — the
      backtick AND tilde fence forms both hide code), and every
      table-defined lane id (reserved families excluded) is in the
      manifest. The table scan is intentionally narrow — it checks id
      existence in both directions and reads NOTHING else.
  P6. The withdrawn carrier may not REAPPEAR: an inline [P:*]
      provenance mark (outside fences) or a standalone
      {"provenance": ...} block in a v2 packet is red. The convention
      was withdrawn at DESIGN TIME (Amendment 1) — it never went
      live; the threat is generation drift reproducing it from
      historical texts, and a reappearing mark would be a second,
      dead provenance home a reader might trust (the drift class).
  P7. packet_metrics (at most one; DEEP schema when present): exact
      keysets at every level, D7 enums (prediction classes, found_at
      values, stops[].type against the canonical STOP registry),
      nonnegative integer counters, baseline_note the only optional
      key; its provenance counts equal the manifest tally.
  P8. --post-build <commit>: the audited ref must be a PINNED commit
      sha (hex shape + cat-file -t == commit — HEAD/branch/tag names
      move, and a tag object is not the build commit); the commit's
      changed files must be a subset of the boundary read from the
      PACKET'S BYTES AT THAT COMMIT plus the packet file itself
      (audit reruns are pinned);
      the boundary must satisfy the FULL P2 shape rules on this path
      too (a subset check over a malformed boundary proves nothing).
      The vacuous-audit family is closed at the SINK: merge commits
      are rejected outright, root commits are diffed against the
      empty tree, and an EMPTY change list is red regardless of cause
      (--allow-empty, wrong sha). The one-commit rule is enforced
      POSITIVELY too: the audited commit must change the packet file
      itself — a code-only or follow-up commit is the wrong audit
      target.
  P9. Fold-time prose-tally cross-lock (the ch8-opening deferred fix;
      AL-20 applied to the packet's own header): every UNFENCED prose
      occurrence of the tally form `<n> anchored / <m> derived /
      <k> new-decision` must equal the packet_rows machine tally. The
      close-time packet_metrics lock binds too late — the ch7-P3
      round-1 header wrote its tally from memory and was wrong; this
      binds at EVERY lint run. The scan VERIFIES a stated numeric
      claim against the declared block; the prose numbers never
      become machine data (they gate nothing downstream), so the
      no-semantics-from-free-text principle stands.

Drafts (v3/implementation/contracts/*.md, README.md excluded):
  D1. contract_draft = {chapter, surface, status}: exact keyset;
      status in draft|ratified|reopened|realized; filename
      ch<N>-<surface>-contract.md matches chapter/surface.
  D2. C-row registry: table rows whose first cell is C<n> (fenced code
      excluded); unique ids, no leading zeros (ids are exact strings —
      C01 is never C1); ratified-or-later requires >=1 row.
  D3. ratification = {date, arms, commit}: exact keyset; YYYY-MM-DD
      string date; nonempty string-list arms; 7-40 lowercase-hex
      commit. Dates non-decreasing in document order; "latest block" =
      the LAST block in document order.
  D4. State consistency (decidable from the current bytes alone):
      ratification block(s) present <=> status in {ratified, reopened,
      realized}; status draft => no blocks.
  D5. Recorded-commit equality (status ratified|realized): the C-row
      lines in the working tree equal the C-row lines at the latest
      block's recorded commit (git show). The recorded sha must
      resolve to a COMMIT object (git cat-file -t): a tree/blob/tag
      would satisfy git show while being no auditable ratification
      point. An out-of-repo draft or an unresolvable recorded commit
      is a LOUD error, never a skip.
      Suspended ONLY at reopened — the two-commit reopen choreography
      (content+status commit, then record commit) stays green at every
      step.
  D6. reopened is a transient STOP-artifact: the summary lists
      reopened drafts BY NAME, and --forbid-reopened turns any into
      an error (the zero-reopened gate at packet approve / chapter
      close / flip).
  D7. Realized map: ANY realized_map block present <=> status realized
      AND exactly one map covering exactly the C-row id set, every
      landing site a nonempty string (a partial map, on any status, is
      red).

History-audit continuity (ADR-015): D5 and P8 audit HISTORY against
the CURRENT repo-relative path via `git show <commit>:<rel>`. Commits
recorded before the ADR-015 plane consolidation store the
implementation tree under its pre-migration home
(docs/v3/implementation/...), so when the read fails, the rel starts
with v3/implementation/, AND the audited commit is an ancestor of (or
equal to) MIGRATION_PARENT (the migration commit's first parent), the
read retries the legacy home. Whichever rel succeeds becomes the
WHOLE audit frame (arm finding F1r): P8's change-list membership
test, `allowed` set seed, and `outside` computation all run in that
coordinate system, so a pre-migration build commit is audited
entirely in its own (old-path) coordinates. Ancestry is exactly the
pre-migration property — false for EVERY future commit regardless of
tree content, unforgeable without rewriting published history — so a
future tree that deletes the new path and reintroduces an old-path
file can never false-green (arm finding F2-deep). MIGRATION_PARENT =
None disables the alias entirely.

Missing-directory guard (ADR-015, arm finding F1-deep2): a
nonexistent packets or contracts directory is a LOUD error, never an
empty exit-0 pass — after a path migration, a checker still pointed
at a retired home would otherwise pass while checking nothing.

The canonical STOP member-token registry is mirrored here from
v3/implementation/README.md §5.5 (the canonical home since the
Phase-1 flip; this constant is the mechanical mirror and changes only
with it). The reserved lane families are mirrored from
task-packet-template.md §1.

Modes: default lints everything; --selftest proves the claims red on
throwaway fixtures and a green fixture pair passes; --packets-dir /
--contracts-dir / --adr-dir are the negative-test seams;
--forbid-reopened is the gate form; --post-build <commit> --packet
<path> runs the pinned boundary audit.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PACKETS_DIR = REPO_ROOT / "v3" / "implementation" / "packets"
CONTRACTS_DIR = REPO_ROOT / "v3" / "implementation" / "contracts"
ADR_DIR = REPO_ROOT / "v3" / "adr"

# ADR-015 legacy-path alias (see the History-audit continuity section
# of the docstring). None = alias fully disabled; the ADR-015
# migration commit pins this to its own parent's sha.
MIGRATION_PARENT: str | None = "3446e48e1b130834e7122cac2335b371bafa8d7f"
LEGACY_HOME_NEW = "v3/implementation/"
LEGACY_HOME_OLD = "docs/v3/implementation/"  # the pre-ADR-015 home

# Selftest seam: pass an explicit cutoff (or None) instead of the
# module-level pin.
_PINNED = object()

STOP_TOKEN_REGISTRY = {
    "1:late-b-signal",
    "1:divergence",
    "1:open-choice",
    "2:meaning-changing-alignment",
    "2:scope-changing-split",
    "2:contested-ratified-vs-reality",
    "2:draft-split",
    "3:watchdog",
    "3:plateau",
    "4:flagged-approve",
}

DRAFT_STATUSES = ("draft", "ratified", "reopened", "realized")
RATIFIED_OR_LATER = ("ratified", "realized")  # reopened deliberately NOT
CONTRACT_DRAFT_KEYS = {"chapter", "surface", "status"}
MUTATION_BOUNDARY_KEYS = {"files"}
PACKET_ROWS_KEYS = {"rows"}
ROW_KEYS = {"id", "class", "refs"}

# P10 (ch12 boundary): the prose↔manifest ref-drift class. A contract
# token cited inside a row's "(anchored: …)" / "(derived: …)" prose
# closure must appear in the packet_rows manifest refs; an anchored
# closure's token must additionally appear in the header's
# "`contract:<surface>` rows C…/C…" union when that surface declares
# one. Matched in fence-stripped prose only.
CLOSURE_RE = re.compile(r"\((anchored|derived):\s*([^()]*)\)")
CONTRACT_TOKEN_RE = re.compile(r"contract:([a-z][a-z0-9-]*)#(C[1-9]\d*)")
# The row list may be LINE-WRAPPED (the live ch11-p2a header wraps
# mid-list — the R-INSTRUMENT-PROBE wrapped-form class, caught by this
# check's own first live run): separators admit whitespace/newlines.
HEADER_UNION_RE = re.compile(
    r"`contract:([a-z][a-z0-9-]*)`\s+rows\s+(C[1-9]\d*(?:\s*/\s*C[1-9]\d*)*)"
)
HEADER_UNION_ROW_RE = re.compile(r"C[1-9]\d*")
ROW_CLASSES = ("anchored", "derived", "new-decision")
RATIFICATION_KEYS = {"date", "arms", "commit"}
PROSE_PREFIX = "prose:"

# Line-oriented fence scanning (round 7): a fence opens with >=3
# backticks or tildes and closes ONLY on a line of the SAME character
# with AT LEAST the opener's length (the CommonMark rule) — so a
# ````markdown outer fence QUOTES an inner ```json or ```text block as
# material (the template itself quotes this way). The old
# pair-matching regexes leaked quoted content into the prose scans and
# could read a quoted json block as a machine block.
# Openers and closers may be indented 0-3 spaces (CommonMark); 4+ is
# an indented code block, out of the FENCED-code claim's scope.
FENCE_OPEN_RE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
LANE_DEF_RE = re.compile(r"^\|\s*([A-Z]{1,2})(\d+)\s*\|")
# No leading zeros, and ids compare as EXACT strings everywhere —
# int() normalization made O01 == O1, a silent reinterpretation of
# declared data (P5 says "manifest id == table first-cell id").
MANIFEST_ID_RE = re.compile(r"^([A-Z]{1,2})([1-9]\d*)$")
CONTRACT_REF_RE = re.compile(r"^contract:(ch\d+-[a-z0-9-]+)#(C\d+)$")
ADR_STRICT_RE = re.compile(r"^ADR-(\d{3})$")
# The WHOLE [P: family is withdrawn (P6) — not just the three known
# kinds: [P:typo] outside a fence is as much a reappearing carrier as
# [P:anchored …]. "Withdrawn at design time", deliberately not
# "retired": the convention never went live (zero packets used it);
# what this guards against is generation drift re-emitting it from
# the repo's historical texts.
WITHDRAWN_MARK_RE = re.compile(r"\[P:")
# P9: the header tally form the live packets state (template §1's
# Classification line) — matched in fence-stripped prose only.
PROSE_TALLY_RE = re.compile(r"(\d+)\s+anchored\s*/\s*(\d+)\s+derived\s*/\s*(\d+)\s+new-decision")
C_ROW_RE = re.compile(r"^\|\s*(C\d+)\s*\|")
DRAFT_NAME_RE = re.compile(r"^(ch\d+)-([a-z0-9-]+)-contract\.md$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
COMMIT_RE = re.compile(r"^[0-9a-f]{7,40}$")

# Family "P" collides with packet names (ch7-P2); never a lane family.
# Mirrored from task-packet-template.md §1.
EXCLUDED_LANE_FAMILIES = {"P"}

# The 16 packets that existed BEFORE the v2 flip. The v2 obligations
# bind from the ch7-P3 pilot onward (task-packet-template.md §1a), so
# this is a CLOSED historical set — it is NEVER extended; every later
# packet must carry the mutation_boundary machine block or go red.
GRANDFATHERED_PACKETS = frozenset(
    {
        "ch4-p1-domain-and-ports.md",
        "ch4-p2-sqlite-store.md",
        "ch4-p3-kernel-handle-ingress.md",
        "ch4-p4-bootstrap-floor-trace.md",
        "ch5-p1-drift-suite.md",
        "ch5-p2-invariant-disposition-map.md",
        "ch5-p3-trace-harness.md",
        "ch5-p4-digest-slice.md",
        "ch5-p5-contract-tests.md",
        "ch6-p1-timeline-read.md",
        "ch6-p2-tail-seed.md",
        "ch6-p3-debug-bundle.md",
        "ch6-p4a-operator-cli.md",
        "ch6-p4b-dev-cli.md",
        "ch7-p1-diag-channel-core.md",
        "ch7-p2-diag-store.md",
    }
)

PACKET_METRICS_KEYS = {
    "class",
    "prediction",
    "provenance",
    "rounds",
    "stops",
    "detector_misses",
    "learned",
}
PACKET_METRICS_OPTIONAL = {"baseline_note", "main_thread_model"}
ROUNDS_KEYS = {"review", "doc_refinement", "implementation"}
PREDICTION_KEYS = {"predicted", "reasoning", "discovered"}
PREDICTION_CLASSES = {"projection", "invention"}
# arm-approve / arm-build-close: the mandatory external-arm gates'
# own lanes (ch8 boundary, 2026-07-11 — gate-resolved so the boundary
# review's arm-yield query is mechanical; pre-ch8 entries keep their
# nearest-member values as dated records).
FOUND_AT_VALUES = {
    "approve",
    "code-review",
    "architecture-review",
    "refinement",
    "implementation",
    "arm-approve",
    "arm-build-close",
}
PROVENANCE_KEYS = {"anchored", "derived", "new_decision"}


class Checker:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.notes: list[str] = []

    def error(self, msg: str) -> None:
        self.errors.append(msg)

    def note(self, msg: str) -> None:
        self.notes.append(msg)


def _reject_duplicate_keys(pairs: list[tuple[str, object]]) -> dict:
    """json.loads silently keeps the LAST duplicate key — in declared
    machine data that is a silent reinterpretation (the reader and the
    tool may disagree on which value holds), so it is a parse error."""
    seen: dict = {}
    for key, value in pairs:
        if key in seen:
            raise ValueError(f"duplicate key '{key}'")
        seen[key] = value
    return seen


def _scan_fences(text: str) -> tuple[str, list[str]]:
    """One line-oriented pass over the document. Returns (the prose
    with ALL fenced content removed, the raw contents of TOP-LEVEL
    ```json fences). Fence marker lines belong to neither side. An
    unclosed fence consumes to EOF (conservative: quoted material never
    leaks into the prose scans; a swallowed machine block is caught
    loudly by the exactly-one / no-parseable checks)."""
    prose: list[str] = []
    jsons: list[str] = []
    in_fence = False
    char = ""
    length = 0
    is_json = False
    buf: list[str] = []
    for line in text.splitlines():
        if in_fence:
            if re.fullmatch(rf" {{0,3}}{re.escape(char)}{{{length},}}\s*", line):
                if is_json:
                    jsons.append("\n".join(buf))
                in_fence = False
                buf = []
                continue
            if is_json:
                buf.append(line)
            continue
        m = FENCE_OPEN_RE.match(line)
        if m:
            in_fence = True
            char = m.group(1)[0]
            length = len(m.group(1))
            is_json = char == "`" and m.group(2).strip() == "json"
            continue
        prose.append(line)
    return "\n".join(prose), jsons


def json_blocks(text: str, path_name: str, checker: Checker) -> list[dict]:
    blocks: list[dict] = []
    for raw in _scan_fences(text)[1]:
        try:
            data = json.loads(raw, object_pairs_hook=_reject_duplicate_keys)
        except (json.JSONDecodeError, ValueError) as exc:
            checker.error(f"{path_name}: unparseable json block ({exc})")
            continue
        if isinstance(data, dict):
            blocks.append(data)
    return blocks


def block_by_key(blocks: list[dict], key: str) -> list[dict]:
    return [b[key] for b in blocks if key in b]


def strip_fences(text: str) -> str:
    return _scan_fences(text)[0]


def git_root_and_rel(path: Path) -> tuple[Path, str] | None:
    top = subprocess.run(
        ["git", "-C", str(path.parent), "rev-parse", "--show-toplevel"],
        capture_output=True,
        text=True,
    )
    if top.returncode != 0:
        return None
    root = Path(top.stdout.strip())
    try:
        return root, path.resolve().relative_to(root).as_posix()
    except ValueError:
        return None


def _legacy_alias_permitted(root: Path, commit: str, migration_parent: str | None) -> bool:
    """The ADR-015 ancestry bound: the legacy retry fires ONLY when the
    audited commit is an ancestor of (or equal to) the recorded
    migration parent — true for every commit the history audits can
    legitimately reach, false for every future commit."""
    if migration_parent is None:
        return False
    return (
        subprocess.run(
            ["git", "-C", str(root), "merge-base", "--is-ancestor", commit, migration_parent],
            capture_output=True,
        ).returncode
        == 0
    )


def show_at_commit(
    root: Path, commit: str, rel: str, migration_parent: str | None
) -> tuple[str, str] | None:
    """`git show <commit>:<rel>` with the ADR-015 legacy-path alias.
    Returns (frame_rel, text) — frame_rel is whichever rel succeeded
    and becomes the audit frame's coordinate system — or None when
    every permitted path fails."""
    out = subprocess.run(
        ["git", "-C", str(root), "show", f"{commit}:{rel}"],
        capture_output=True,
        text=True,
    )
    if out.returncode == 0:
        return rel, out.stdout
    if rel.startswith(LEGACY_HOME_NEW) and _legacy_alias_permitted(root, commit, migration_parent):
        legacy = LEGACY_HOME_OLD + rel[len(LEGACY_HOME_NEW):]
        out = subprocess.run(
            ["git", "-C", str(root), "show", f"{commit}:{legacy}"],
            capture_output=True,
            text=True,
        )
        if out.returncode == 0:
            return legacy, out.stdout
    return None


# ---------------------------------------------------------------- drafts


def c_row_lines(text: str) -> list[str]:
    """The canonical C-row byte surface: fence-stripped table rows whose
    first cell is C<n>, rstripped, in document order."""
    return [line.rstrip() for line in strip_fences(text).splitlines() if C_ROW_RE.match(line)]


def check_ratification_shape(name: str, index: int, block: object, checker: Checker) -> None:
    """D3: strict shape for EVERY ratification block."""
    label = f"{name}: ratification[{index}]"
    if not isinstance(block, dict) or set(block.keys()) != RATIFICATION_KEYS:
        checker.error(f"{label} must be an object with exactly keys {sorted(RATIFICATION_KEYS)}")
        return
    if not isinstance(block["date"], str) or not DATE_RE.match(block["date"]):
        checker.error(f"{label}.date must be a YYYY-MM-DD string")
    arms = block["arms"]
    if not isinstance(arms, list) or not arms or not all(isinstance(a, str) and a.strip() for a in arms):
        checker.error(f"{label}.arms must be a nonempty list of nonempty strings")
    if not isinstance(block["commit"], str) or not COMMIT_RE.match(block["commit"]):
        checker.error(f"{label}.commit must be a 7-40 lowercase-hex commit sha")


def check_recorded_equality(
    path: Path,
    commit: str,
    current_rows: list[str],
    checker: Checker,
    migration_parent: str | None | object = _PINNED,
) -> None:
    """D5: the working tree's C-rows equal the C-rows at the recorded
    commit. Failures are LOUD — an unverifiable ratification record is
    a broken record, never a skip. Reads through the ADR-015
    legacy-path alias for pre-migration recorded commits."""
    if migration_parent is _PINNED:
        migration_parent = MIGRATION_PARENT
    located = git_root_and_rel(path)
    if located is None:
        checker.error(
            f"{path.name}: not inside a git repository — the recorded-commit "
            f"equality check cannot run on a ratified-or-later draft"
        )
        return
    root, rel = located
    # D3/D5 say COMMIT sha — `git show <sha>:<path>` happily resolves a
    # TREE sha too, but a tree is not an auditable ratification point
    # (no date, author, or history position).
    typ = subprocess.run(
        ["git", "-C", str(root), "cat-file", "-t", commit],
        capture_output=True,
        text=True,
    )
    obj_type = typ.stdout.strip() if typ.returncode == 0 else "unresolvable"
    if obj_type != "commit":
        checker.error(
            f"{path.name}: recorded sha '{commit}' does not resolve to a COMMIT "
            f"(got '{obj_type}') — the ratification record is broken: only a "
            f"commit is an auditable ratification point"
        )
        return
    shown = show_at_commit(root, commit, rel, migration_parent)
    if shown is None:
        checker.error(
            f"{path.name}: recorded commit '{commit}' does not yield a readable "
            f"draft (git show failed) — the ratification record is broken"
        )
        return
    if c_row_lines(shown[1]) != current_rows:
        checker.error(
            f"{path.name}: C-rows differ from the latest ratification's recorded "
            f"commit {commit[:12]} — a post-ratification row edit needs "
            f"re-ratification (the reopen choreography)"
        )


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
    if set(meta.keys()) != CONTRACT_DRAFT_KEYS:
        checker.error(
            f"{path.name}: contract_draft must be an object with exactly keys "
            f"{sorted(CONTRACT_DRAFT_KEYS)}"
        )
    status = meta.get("status")
    chapter = meta.get("chapter")
    surface = meta.get("surface")
    if status not in DRAFT_STATUSES:
        checker.error(f"{path.name}: contract_draft.status '{status}' not in {DRAFT_STATUSES}")
        return None

    name_match = DRAFT_NAME_RE.match(path.name)
    if not name_match:
        checker.error(f"{path.name}: filename must be ch<N>-<surface>-contract.md")
    elif chapter != name_match.group(1) or surface != name_match.group(2):
        checker.error(
            f"{path.name}: contract_draft chapter/surface ({chapter}/{surface}) "
            f"does not match filename"
        )

    rows_list = [C_ROW_RE.match(line).group(1) for line in c_row_lines(text)]  # type: ignore[union-attr]
    dupes = {r for r in rows_list if rows_list.count(r) > 1}
    if dupes:
        checker.error(f"{path.name}: duplicate C-row ids {sorted(dupes)}")
    # The lane-id no-leading-zeros rule's sibling surface (the round-5
    # family, swept): detection stays broad (a demoted C01 row would
    # silently escape the equality guard), validation is explicit.
    zero_ids = sorted({r for r in rows_list if r.startswith("C0")})
    if zero_ids:
        checker.error(
            f"{path.name}: leading-zero C-row ids {zero_ids} — ids are exact "
            f"strings (C01 is never C1), so leading-zero forms are forbidden"
        )
    rows = set(rows_list)

    ratifications = block_by_key(blocks, "ratification")
    for index, block in enumerate(ratifications):
        check_ratification_shape(path.name, index, block, checker)
    dates = [b["date"] for b in ratifications if isinstance(b, dict) and isinstance(b.get("date"), str)]
    for prev, cur in zip(dates, dates[1:]):
        if DATE_RE.match(prev) and DATE_RE.match(cur) and cur < prev:
            checker.error(
                f"{path.name}: ratification dates decrease in document order "
                f"('{prev}' then '{cur}') — the latest block is the LAST block, "
                f"and dates must be non-decreasing"
            )
            break

    # D4 state consistency — decidable from the current bytes alone.
    if status == "draft" and ratifications:
        checker.error(
            f"{path.name}: status draft with {len(ratifications)} ratification "
            f"block(s) — draft implies no blocks (blocks <=> ratified-or-later "
            f"incl. reopened)"
        )
    if status != "draft" and not ratifications:
        checker.error(f"{path.name}: status {status} requires a ratification block")
    if status in RATIFIED_OR_LATER and not rows:
        checker.error(f"{path.name}: status {status} but no C-rows")

    # D5 recorded-commit equality — bound at ratified/realized,
    # suspended ONLY at reopened.
    if status in RATIFIED_OR_LATER and ratifications:
        latest = ratifications[-1]
        commit = latest.get("commit") if isinstance(latest, dict) else None
        if isinstance(commit, str) and COMMIT_RE.match(commit):
            check_recorded_equality(path, commit, c_row_lines(text), checker)

    # D7 realized map — ANY map block present <=> realized + complete.
    maps = block_by_key(blocks, "realized_map")
    if maps and status != "realized":
        checker.error(
            f"{path.name}: realized_map present on status '{status}' — the "
            f"boundary review fills the map and flips the status in ONE act"
        )
    if status == "realized":
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


def check_boundary_files(name: str, boundary: object, checker: Checker) -> list[str] | None:
    """P2's full shape rules — ONE implementation shared by the
    fold-time check and the --post-build audit (the audit reads the
    commit's bytes, so it must enforce the same schema itself; a
    subset check over a malformed boundary proves nothing). Returns
    the files list only when fully valid."""
    if not isinstance(boundary, dict) or set(boundary.keys()) != MUTATION_BOUNDARY_KEYS:
        checker.error(
            f"{name}: mutation_boundary must be an object with exactly keys "
            f"{sorted(MUTATION_BOUNDARY_KEYS)}"
        )
        return None
    files = boundary.get("files")
    if not isinstance(files, list) or not files or not all(
        isinstance(f, str) and f and not f.startswith("/") and ".." not in f for f in files
    ):
        checker.error(
            f"{name}: mutation_boundary.files must be a nonempty list of "
            f"repo-relative paths"
        )
        return None
    if len(set(files)) != len(files):
        checker.error(f"{name}: mutation_boundary.files has duplicates")
        return None
    return files


def check_ref(name: str, row_id: str, ref: object, drafts: dict[str, dict], adr_dir: Path, checker: Checker) -> None:
    """P4: strict-or-prose-prefixed; anything else is loud."""
    label = f"{name}: rows['{row_id}'] ref"
    if not isinstance(ref, str) or not ref:
        checker.error(f"{label} must be a nonempty string")
        return
    if ref.startswith(PROSE_PREFIX):
        if not ref[len(PROSE_PREFIX):].strip():
            checker.error(f"{label} '{ref}' — prose: prefix with an empty remainder")
        return
    m = CONTRACT_REF_RE.match(ref)
    if m:
        slug, row = m.group(1), m.group(2)
        draft = drafts.get(slug)
        if draft is None:
            checker.error(f"{label} '{ref}' — no such contract-draft")
        elif draft["status"] not in RATIFIED_OR_LATER:
            checker.error(
                f"{label} '{ref}' — draft status is '{draft['status']}', anchors "
                f"need ratified-or-later"
                + (" (the contract is contested during a reopen)" if draft["status"] == "reopened" else "")
            )
        elif row not in draft["rows"]:
            checker.error(f"{label} '{ref}' — row {row} not in draft")
        return
    m = ADR_STRICT_RE.match(ref)
    if m:
        if not list(adr_dir.glob(f"ADR-{m.group(1)}-*.md")):
            checker.error(f"{label} '{ref}' — no such file in {adr_dir.name}/")
        return
    checker.error(
        f"{label} '{ref}' is neither a strict form "
        f"(contract:ch<N>-<surface>#C<n>, ADR-NNN) nor prose:-prefixed — "
        f"in declared machine data a near-miss is loud, never reinterpreted"
    )


def check_packet_rows(
    name: str,
    blocks: list[dict],
    prose: str,
    drafts: dict[str, dict],
    adr_dir: Path,
    checker: Checker,
) -> dict[str, int] | None:
    """P3-P5. Returns the provenance tally (underscore keys) or None."""
    rows_blocks = block_by_key(blocks, "packet_rows")
    if len(rows_blocks) != 1:
        checker.error(f"{name}: v2 packet requires exactly one packet_rows block, found {len(rows_blocks)}")
        return None
    manifest = rows_blocks[0]
    if not isinstance(manifest, dict) or set(manifest.keys()) != PACKET_ROWS_KEYS:
        checker.error(f"{name}: packet_rows must be an object with exactly keys {sorted(PACKET_ROWS_KEYS)}")
        return None
    rows = manifest["rows"]
    if not isinstance(rows, list):
        checker.error(f"{name}: packet_rows.rows must be a list")
        return None

    tally = {"anchored": 0, "derived": 0, "new_decision": 0}
    manifest_ids: list[str] = []
    for row in rows:
        if not isinstance(row, dict) or set(row.keys()) != ROW_KEYS:
            checker.error(f"{name}: every packet_rows row must be an object with exactly keys {sorted(ROW_KEYS)}")
            continue
        row_id = row["id"]
        m = MANIFEST_ID_RE.match(row_id) if isinstance(row_id, str) else None
        if m is None:
            checker.error(
                f"{name}: row id '{row_id}' is not lane-grammar shaped "
                f"([A-Z]{{1,2}} + integer, no leading zeros)"
            )
            continue
        if m.group(1) in EXCLUDED_LANE_FAMILIES:
            checker.error(
                f"{name}: row id '{row_id}' uses reserved lane family "
                f"'{m.group(1)}' (mirrored from task-packet-template.md §1)"
            )
            continue
        normalized = row_id  # exact string — no numeric normalization
        manifest_ids.append(normalized)
        cls = row["class"]
        refs = row["refs"]
        if cls not in ROW_CLASSES:
            checker.error(f"{name}: row {normalized} class '{cls}' not in {ROW_CLASSES}")
            continue
        if not isinstance(refs, list):
            checker.error(f"{name}: row {normalized} refs must be a list")
            continue
        if cls == "new-decision" and refs:
            checker.error(
                f"{name}: row {normalized} is new-decision but carries refs — "
                f"the class is ref-less by definition (nothing prior determines it)"
            )
        if cls in ("anchored", "derived") and not refs:
            checker.error(f"{name}: row {normalized} is {cls} but carries no ref")
        for ref in refs:
            check_ref(name, normalized, ref, drafts, adr_dir, checker)
        tally[cls.replace("-", "_")] += 1

    dupes = {i for i in manifest_ids if manifest_ids.count(i) > 1}
    if dupes:
        checker.error(f"{name}: duplicate packet_rows ids {sorted(dupes)}")

    # P5 bidirectional completeness — the ONLY document scan, and it
    # reads nothing but first-cell lane ids outside fences.
    doc_id_list: list[str] = []
    for line in prose.splitlines():
        m = LANE_DEF_RE.match(line)
        if m and m.group(1) not in EXCLUDED_LANE_FAMILIES:
            doc_id_list.append(f"{m.group(1)}{m.group(2)}")  # exact string — O01 is never O1
    doc_dupes = sorted({i for i in doc_id_list if doc_id_list.count(i) > 1})
    if doc_dupes:
        checker.error(
            f"{name}: table-defined lane ids {doc_dupes} appear more than once — "
            f"canonical row ids are unique, and a duplicate makes every ref to "
            f"them ambiguous"
        )
    doc_ids = set(doc_id_list)
    manifest_set = set(manifest_ids)
    for missing in sorted(manifest_set - doc_ids):
        checker.error(
            f"{name}: manifest row {missing} is not defined as a table row in the "
            f"document (fenced code does not count)"
        )
    for missing in sorted(doc_ids - manifest_set):
        checker.error(
            f"{name}: table-defined lane id {missing} is missing from the "
            f"packet_rows manifest — the manifest is the authoritative registry"
        )
    return tally


def check_ref_closure(name: str, blocks: list[dict], prose: str, checker: Checker) -> None:
    """P10 (ch12 boundary — the P1b ref-drift class): prose closures vs
    the machine face. Skips silently when the manifest is malformed —
    P3's errors already own that."""
    rows_blocks = block_by_key(blocks, "packet_rows")
    if len(rows_blocks) != 1 or not isinstance(rows_blocks[0], dict):
        return
    rows = rows_blocks[0].get("rows")
    if not isinstance(rows, list):
        return
    manifest_refs: set[str] = set()
    for row in rows:
        if isinstance(row, dict) and isinstance(row.get("refs"), list):
            manifest_refs.update(r for r in row["refs"] if isinstance(r, str))
    header_union: dict[str, set[str]] = {}
    for m in HEADER_UNION_RE.finditer(prose):
        header_union.setdefault(m.group(1), set()).update(
            HEADER_UNION_ROW_RE.findall(m.group(2))
        )
    for closure in CLOSURE_RE.finditer(prose):
        kind = closure.group(1)
        for tok in CONTRACT_TOKEN_RE.finditer(closure.group(2)):
            full = f"contract:{tok.group(1)}#{tok.group(2)}"
            if full not in manifest_refs:
                checker.error(
                    f"{name}: '{full}' cited in a ({kind}: …) closure but missing "
                    f"from the packet_rows manifest refs — the prose↔manifest "
                    f"ref-drift class (ch12 boundary)"
                )
            if kind == "anchored":
                surface, row_c = tok.group(1), tok.group(2)
                if surface in header_union and row_c not in header_union[surface]:
                    checker.error(
                        f"{name}: anchored ref '{full}' missing from the header "
                        f"`contract:{surface}` rows union — the header-union "
                        f"drift class (ch12 boundary)"
                    )


def check_packet(
    path: Path,
    drafts: dict[str, dict],
    adr_dir: Path,
    checker: Checker,
) -> bool:
    """Returns True iff the packet is v2 (and was linted)."""
    text = path.read_text(encoding="utf-8")
    # Grandfathering must be decided BEFORE any error is reported: a
    # WHITELISTED pre-v2 packet with an unrelated malformed fence is
    # SKIPPED, not failed. The reverse hole is closed textually — a
    # packet whose mutation_boundary fence itself is malformed still
    # counts as v2 (the raw text names the marker), so it cannot
    # silently demote itself to grandfathered. And grandfathering is a
    # CLOSED set: an unmarked packet OUTSIDE the whitelist is red, not
    # skipped — a future packet cannot dodge its v2 obligations.
    probe = Checker()
    blocks = json_blocks(text, path.name, probe)
    boundaries = block_by_key(blocks, "mutation_boundary")
    if not boundaries and "mutation_boundary" not in text:
        if path.name in GRANDFATHERED_PACKETS:
            return False  # pre-v2: grandfathered, parse noise suppressed
        checker.error(
            f"{path.name}: post-v2 packet without the mutation_boundary "
            f"machine block — v2 obligations bind from ch7-P3 onward; "
            f"grandfathering is closed"
        )
        return True
    checker.errors.extend(probe.errors)
    if not boundaries:
        checker.error(
            f"{path.name}: names mutation_boundary but no parseable "
            f"mutation_boundary block found"
        )
        return True
    if len(boundaries) > 1:
        checker.error(f"{path.name}: {len(boundaries)} mutation_boundary blocks; exactly one allowed")

    check_boundary_files(path.name, boundaries[0], checker)

    prose = strip_fences(text)

    # P6: the withdrawn carrier may not reappear.
    withdrawn_mark = WITHDRAWN_MARK_RE.search(prose)
    if withdrawn_mark:
        checker.error(
            f"{path.name}: inline provenance mark '{withdrawn_mark.group(0)}…' — "
            f"withdrawn at design time (Amendment 1, never live); the "
            f"packet_rows manifest is the single home"
        )
    if block_by_key(blocks, "provenance"):
        checker.error(
            f"{path.name}: standalone provenance block — withdrawn at design time "
            f"(Amendment 1, never live); close-time counts live in packet_metrics, "
            f"declaration in packet_rows"
        )

    tally = check_packet_rows(path.name, blocks, prose, drafts, adr_dir, checker)
    check_ref_closure(path.name, blocks, prose, checker)

    # P9: fold-time prose-tally cross-lock — every prose statement of
    # the tally must equal the machine count (AL-20 on the packet's own
    # header; the close-time packet_metrics lock binds too late — the
    # ch7-P3 round-1 header wrote its tally from memory). Skipped when
    # the manifest itself is malformed: P3's errors already own that.
    if tally is not None:
        expected = (tally["anchored"], tally["derived"], tally["new_decision"])
        for m in PROSE_TALLY_RE.finditer(prose):
            stated = tuple(int(g) for g in m.groups())
            if stated != expected:
                checker.error(
                    f"{path.name}: prose tally '{m.group(0)}' contradicts the "
                    f"packet_rows manifest ({expected[0]} anchored / "
                    f"{expected[1]} derived / {expected[2]} new-decision) — "
                    f"compute tallies from the block, never recall"
                )

    # packet_metrics (optional block, AT MOST ONE — D7: one compact
    # machine block per packet, written once at close; DEEP schema when
    # present). Its provenance counts are cross-locked to the manifest.
    metrics_blocks = block_by_key(blocks, "packet_metrics")
    if len(metrics_blocks) > 1:
        checker.error(
            f"{path.name}: {len(metrics_blocks)} packet_metrics blocks; at most one (D7)"
        )
    for metrics in metrics_blocks:
        check_packet_metrics(path.name, metrics, checker, declared_counts=tally)
    return True


def _is_int(value: object) -> bool:
    return type(value) is int  # bool is an int subclass; excluded on purpose


def check_packet_metrics(
    name: str, metrics: object, checker: Checker, declared_counts: dict[str, int] | None = None
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
    if "main_thread_model" in metrics and not isinstance(metrics["main_thread_model"], str):
        type_err("main_thread_model", "a string")

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
                elif declared_counts is not None and value != declared_counts[key]:
                    checker.error(
                        f"{name}: packet_metrics.provenance.{key} = {value} but the "
                        f"packet_rows manifest tallies {declared_counts[key]}"
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
                if not isinstance(stop["type"], str):
                    # membership in a SET hashes — a list here must be a
                    # red lint error, never a Python crash
                    type_err("stops[].type", "a string")
                elif stop["type"] not in STOP_TOKEN_REGISTRY:
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


def check_post_build(
    packet_path: Path,
    commit: str,
    checker: Checker,
    migration_parent: str | None | object = _PINNED,
) -> None:
    """P8: the boundary is read from the PACKET'S BYTES AT THE COMMIT,
    never the working tree — an audit rerun must be stable: a later
    boundary edit may not change an older commit's verdict. The
    ADR-015 legacy-path alias governs the WHOLE audit frame: whichever
    rel resolves (current or pre-migration) is the frame's rel for the
    change-list membership test, the allowed-set seed, and the outside
    computation, so a pre-migration build commit is audited entirely
    in its own coordinate system."""
    if migration_parent is _PINNED:
        migration_parent = MIGRATION_PARENT
    located = git_root_and_rel(packet_path)
    if located is None:
        checker.error(f"--post-build: {packet_path} is not inside a git repository")
        return
    root, rel = located
    # The draft-side round-5 guard, mirrored: the audit is PINNED, so
    # commit-ish refs are red — HEAD/branch/tag names move (the same
    # invocation could change verdicts later), and an annotated tag
    # OBJECT is not the build commit.
    if not COMMIT_RE.match(commit):
        checker.error(
            f"--post-build: '{commit}' is not a pinned commit sha — HEAD, branch, "
            f"and tag names move; pass the build commit's sha"
        )
        return
    typ = subprocess.run(
        ["git", "-C", str(root), "cat-file", "-t", commit],
        capture_output=True,
        text=True,
    )
    obj_type = typ.stdout.strip() if typ.returncode == 0 else "unresolvable"
    if obj_type != "commit":
        checker.error(
            f"--post-build: '{commit}' does not resolve to a COMMIT "
            f"(got '{obj_type}') — a tag object is not the build commit"
        )
        return
    shown = show_at_commit(root, commit, rel, migration_parent)
    if shown is None:
        checker.error(f"--post-build: packet '{rel}' not found in commit '{commit}'")
        return
    frame_rel, text = shown
    blocks = json_blocks(text, packet_path.name, checker)
    boundaries = block_by_key(blocks, "mutation_boundary")
    if len(boundaries) != 1:
        checker.error(
            f"{packet_path.name}: --post-build needs exactly one mutation_boundary "
            f"block, found {len(boundaries)}"
        )
        return
    files = check_boundary_files(packet_path.name, boundaries[0], checker)
    if files is None:
        return
    allowed = set(files)
    allowed.add(frame_rel)
    # Merge commits yield an EMPTY diff-tree change list — a false-green
    # audit; reject them outright (build commits are single-parent by
    # the one-commit rule).
    parents = subprocess.run(
        ["git", "-C", str(root), "rev-list", "--parents", "-n", "1", commit],
        capture_output=True,
        text=True,
    )
    if parents.returncode == 0 and len(parents.stdout.split()) > 2:
        checker.error(
            f"--post-build: '{commit}' is a merge commit — audit the packet's "
            f"own single-parent build commit (one-commit rule)"
        )
        return
    # --root: a ROOT commit otherwise yields an EMPTY change list — the
    # same vacuous-audit class as the merge-commit hole above; with
    # --root it diffs against the empty tree and lists every file.
    out = subprocess.run(
        ["git", "-C", str(root), "diff-tree", "--root", "--no-commit-id", "--name-only", "-r", commit],
        capture_output=True,
        text=True,
    )
    if out.returncode != 0:
        checker.error(f"--post-build: git diff-tree failed for '{commit}': {out.stderr.strip()}")
        return
    changed = {line.strip() for line in out.stdout.splitlines() if line.strip()}
    # The vacuous-audit family, closed at the SINK: whatever produced an
    # empty change list (--allow-empty, a wrong sha, a git surprise),
    # a packet build commit lands at least the packet file itself
    # (one-commit rule), so an empty audit proves nothing.
    if not changed:
        checker.error(
            f"--post-build: commit {commit} has an EMPTY change list — a packet "
            f"build commit lands at least the packet file itself, so this audit "
            f"proves nothing (wrong sha or empty commit)"
        )
        return
    # …and the same invariant POSITIVELY: the empty-check rationale
    # already stated it, but only checking emptiness let a code-only or
    # follow-up commit green-light the audit (round 9, reproduced).
    if frame_rel not in changed:
        checker.error(
            f"--post-build: commit {commit} does not change the packet file "
            f"'{frame_rel}' — the build commit lands the packet WITH the build "
            f"(one-commit rule), so this is the wrong commit to audit"
        )
        return
    outside = sorted(changed - allowed)
    if outside:
        checker.error(
            f"{packet_path.name}: commit {commit} touches files OUTSIDE the declared "
            f"mutation boundary: {outside}"
        )


# ---------------------------------------------------------------- runner


def collect_drafts(contracts_dir: Path, checker: Checker) -> tuple[dict[str, dict], list[str]]:
    drafts: dict[str, dict] = {}
    reopened: list[str] = []
    if not contracts_dir.is_dir():
        return drafts, reopened
    for path in sorted(contracts_dir.glob("*.md")):
        if path.name == "README.md":
            continue
        info = check_draft(path, checker)
        if info is not None:
            if info["status"] == "reopened":
                reopened.append(path.name)
            m = DRAFT_NAME_RE.match(path.name)
            if m:
                drafts[f"{m.group(1)}-{m.group(2)}"] = info
    return drafts, reopened


def lint(
    packets_dir: Path,
    contracts_dir: Path,
    adr_dir: Path,
    forbid_reopened: bool = False,
) -> tuple[list[str], dict[str, int]]:
    """The full lint pass as data — the selftest asserts on the error
    LIST (per-dim message substrings), run_lint wraps it for the CLI."""
    checker = Checker()
    # ADR-015 missing-directory guard: a nonexistent directory would
    # lint EMPTY with exit 0 — green while checking nothing (exactly
    # the false-green shape of a checker pointed at a retired home).
    if not packets_dir.is_dir():
        checker.error(
            f"packets directory missing: {packets_dir} — an empty lint proves "
            f"nothing; a nonexistent directory is an error, never a pass"
        )
    if not contracts_dir.is_dir():
        checker.error(
            f"contracts directory missing: {contracts_dir} — an empty lint "
            f"proves nothing; a nonexistent directory is an error, never a pass"
        )
    drafts, reopened = collect_drafts(contracts_dir, checker)
    if forbid_reopened and reopened:
        checker.error(
            f"--forbid-reopened: reopened draft(s) present: {reopened} — the "
            f"zero-reopened gate (approve / chapter close / flip) requires none"
        )
    v2 = grandfathered = 0
    for path in sorted(packets_dir.glob("*.md")):
        if path.name == "README.md":
            continue
        if check_packet(path, drafts, adr_dir, checker):
            v2 += 1
        else:
            grandfathered += 1
    stats = {
        "v2": v2,
        "grandfathered": grandfathered,
        "drafts": len(drafts),
        "reopened": reopened,  # the NAMES — D6 says the summary lists them
    }
    return checker.errors, stats


def run_lint(
    packets_dir: Path,
    contracts_dir: Path,
    adr_dir: Path,
    forbid_reopened: bool = False,
) -> int:
    errors, stats = lint(packets_dir, contracts_dir, adr_dir, forbid_reopened=forbid_reopened)
    for msg in errors:
        print(f"packet-lint FAIL: {msg}", file=sys.stderr)
    reopened = stats["reopened"]
    reopened_note = f"{len(reopened)} reopened" + (f": {', '.join(reopened)}" if reopened else "")
    print(
        f"packet-lint: {stats['v2']} v2 packet(s) linted, "
        f"{stats['grandfathered']} pre-v2 grandfathered, "
        f"{stats['drafts']} draft(s) linted ({reopened_note}), "
        f"{len(errors)} error(s)"
    )
    return 1 if errors else 0


# ---------------------------------------------------------------- selftest

DRAFT_V1 = """# draft fixture

```json
{"contract_draft": {"chapter": "ch9", "surface": "test-surface", "status": "draft"}}
```

| ID | Rule |
|---|---|
| C1 | the row |
| C2 | the other row |
"""

RATIFICATION_TMPL = """
```json
{"ratification": {"date": "%DATE%", "arms": ["a", "b"], "commit": "%COMMIT%"}}
```
"""

GREEN_PACKET = """# packet fixture

Classification: projection — manifest tally: 1 anchored / 1 derived / 1 new-decision

```json
{"mutation_boundary": {"files": ["v3/src/x.ts", "v3/src/x.test.ts"]}}
```

```json
{"packet_rows": {"rows": [
  {"id": "O1", "class": "anchored", "refs": ["contract:ch9-test-surface#C1"]},
  {"id": "O2", "class": "derived", "refs": ["contract:ch9-test-surface#C2", "prose:plan §7.2"]},
  {"id": "O3", "class": "new-decision", "refs": []}
]}}
```

| Lane | Emit |
|---|---|
| O1 | a |
| O2 | b |
| O3 | c |

```json
{"packet_metrics": {"class": "t", "prediction": {"predicted": "projection", "reasoning": "r", "discovered": "projection"}, "provenance": {"anchored": 1, "derived": 1, "new_decision": 1}, "rounds": {"review": 1, "doc_refinement": 0, "implementation": 0}, "stops": [{"type": "3:watchdog", "what": "w", "resolution": "r"}], "detector_misses": [], "learned": "l"}}
```
"""

GIT_BASE = ["git", "-c", "user.email=lint@selftest", "-c", "user.name=lint-selftest"]


def _git_ok(root: Path, *argv: str) -> bool:
    return subprocess.run(GIT_BASE + list(argv), cwd=root, capture_output=True).returncode == 0


def _git_out(root: Path, *argv: str) -> str:
    return subprocess.run(
        GIT_BASE + list(argv), cwd=root, capture_output=True, text=True
    ).stdout.strip()


def build_green_fixture() -> tuple[tempfile.TemporaryDirectory, Path, Path, Path, str] | None:
    """A git-initialized fixture enacting the ratification choreography:
    commit the draft content (status draft, no blocks), then record that
    commit in a ratification block + flip to ratified. Returns
    (tmpdir, root, draft_path, packet_path, ratified_draft_text)."""
    tmp = tempfile.TemporaryDirectory()
    root = Path(tmp.name)
    (root / "packets").mkdir()
    cdir = root / "contracts"
    cdir.mkdir()
    draft = cdir / "ch9-test-surface-contract.md"
    draft.write_text(DRAFT_V1, encoding="utf-8")
    if not (_git_ok(root, "init", "-q") and _git_ok(root, "add", "-A") and _git_ok(root, "commit", "-q", "-m", "content")):
        tmp.cleanup()
        return None
    sha = _git_out(root, "rev-parse", "HEAD")
    ratified = DRAFT_V1.replace('"status": "draft"', '"status": "ratified"') + RATIFICATION_TMPL.replace(
        "%DATE%", "2026-07-09"
    ).replace("%COMMIT%", sha)
    draft.write_text(ratified, encoding="utf-8")
    if not (_git_ok(root, "add", "-A") and _git_ok(root, "commit", "-q", "-m", "record")):
        tmp.cleanup()
        return None
    packet = root / "packets" / "ch9-p1-test.md"
    packet.write_text(GREEN_PACKET, encoding="utf-8")
    return tmp, root, draft, packet, ratified


def run_selftest() -> int:
    failures: list[str] = []
    red_dims: list[str] = []

    shared = build_green_fixture()
    if shared is None:
        print("selftest FAIL: git fixture setup failed", file=sys.stderr)
        return 1
    shared_tmp, shared_root, shared_draft, shared_packet, green_draft = shared

    def assert_red(name: str, errors: list[str], substr: str) -> None:
        """A dim is red for ITS OWN claim, or it proves nothing — the
        exit code alone let an unrelated error (e.g. a broken fixture
        sha) mask a dead check."""
        red_dims.append(name)
        if not any(substr in e for e in errors):
            failures.append(f"selftest dim NOT red for its claim: {name} (no error containing '{substr}')")

    def expect_red_packet(name: str, packet_text: str, substr: str) -> None:
        shared_packet.write_text(packet_text, encoding="utf-8")
        errors, _ = lint(shared_root / "packets", shared_root / "contracts", ADR_DIR)
        assert_red(name, errors, substr)
        shared_packet.write_text(GREEN_PACKET, encoding="utf-8")

    def expect_red_draft(name: str, mutate, substr: str, commit: bool = False) -> None:
        """Fresh fixture per dim; the mutation applies to THIS fixture's
        OWN green text — its recorded commit sha stays valid, so the
        red can only come from the mutated aspect (and the substring
        assertion pins it)."""
        fixture = build_green_fixture()
        if fixture is None:
            failures.append(f"selftest fixture setup failed: {name}")
            return
        tmp, root, draft, _packet, green = fixture
        draft.write_text(mutate(green), encoding="utf-8")
        if commit:
            _git_ok(root, "add", "-A")
            _git_ok(root, "commit", "-q", "-m", name)
        errors, _ = lint(root / "packets", root / "contracts", ADR_DIR)
        assert_red(name, errors, substr)
        tmp.cleanup()

    def expect_green(name: str, errors: list[str]) -> None:
        if errors:
            failures.append(f"selftest green NOT green: {name} ({errors[0]})")

    # ---- P1 marker + grandfathering (no drafts needed)
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "packets").mkdir()
        (root / "contracts").mkdir()
        (root / "packets" / "ch9-p9-future.md").write_text("# unmarked future packet\n", encoding="utf-8")
        errors, _ = lint(root / "packets", root / "contracts", ADR_DIR)
        assert_red("post-v2-unmarked-packet", errors, "grandfathering is closed")
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "packets").mkdir()
        (root / "contracts").mkdir()
        (root / "packets" / "ch4-p1-domain-and-ports.md").write_text("# old unmarked packet\n", encoding="utf-8")
        errors, _ = lint(root / "packets", root / "contracts", ADR_DIR)
        expect_green("whitelisted unmarked packet", errors)
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "packets").mkdir()
        (root / "contracts").mkdir()
        (root / "packets" / "ch4-p2-sqlite-store.md").write_text(
            "# old packet\n\n```json\n{broken\n```\n", encoding="utf-8"
        )
        errors, _ = lint(root / "packets", root / "contracts", ADR_DIR)
        expect_green("pre-v2 packet with bad fence", errors)
    expect_red_packet(
        "malformed-boundary-fence",
        '# p\n\n```json\n{"mutation_boundary": {broken\n```\n',
        "no parseable",
    )
    expect_red_packet(
        "malformed-boundary-fence-unquoted",
        "# p\n\n```json\n{mutation_boundary: {broken\n```\n",
        "no parseable",
    )

    # ---- P2 mutation_boundary shape
    expect_red_packet(
        "boundary-malformed",
        GREEN_PACKET.replace('"files": ["v3/src/x.ts", "v3/src/x.test.ts"]', '"files": "x"'),
        "nonempty list of",
    )
    expect_red_packet(
        "boundary-extra-key",
        GREEN_PACKET.replace(
            '{"mutation_boundary": {"files": ["v3/src/x.ts", "v3/src/x.test.ts"]}}',
            '{"mutation_boundary": {"files": ["v3/src/x.ts", "v3/src/x.test.ts"], "extra": 1}}',
        ),
        "mutation_boundary must be an object with exactly keys",
    )
    expect_red_packet(
        "json-duplicate-key",
        GREEN_PACKET.replace(
            '{"mutation_boundary": {"files": ["v3/src/x.ts", "v3/src/x.test.ts"]}}',
            '{"mutation_boundary": {"files": ["v3/src/x.ts"], "files": ["v3/src/x.ts", "v3/src/x.test.ts"]}}',
        ),
        "duplicate key",
    )

    # ---- P3 manifest shape
    expect_red_packet(
        "manifest-missing",
        GREEN_PACKET.replace('{"packet_rows": {"rows": [', '{"packet_rows_gone": {"rows": [').replace(
            "| O1 | a |\n| O2 | b |\n| O3 | c |\n", ""
        ),
        "exactly one packet_rows block",
    )
    expect_red_packet(
        "manifest-extra-key",
        GREEN_PACKET.replace('{"packet_rows": {"rows": [', '{"packet_rows": {"extra": 1, "rows": ['),
        "packet_rows must be an object with exactly keys",
    )
    expect_red_packet(
        "row-extra-key",
        GREEN_PACKET.replace(
            '{"id": "O3", "class": "new-decision", "refs": []}',
            '{"id": "O3", "class": "new-decision", "refs": [], "note": "x"}',
        ),
        "every packet_rows row must be an object",
    )
    expect_red_packet(
        "row-duplicate-id",
        GREEN_PACKET.replace(
            '{"id": "O3", "class": "new-decision", "refs": []}',
            '{"id": "O3", "class": "new-decision", "refs": []},\n  {"id": "O3", "class": "new-decision", "refs": []}',
        ),
        "duplicate packet_rows ids",
    )
    expect_red_packet(
        "row-class-invalid",
        GREEN_PACKET.replace('"class": "new-decision"', '"class": "vibes"'),
        "class 'vibes' not in",
    )
    expect_red_packet(
        "prose-tally-contradicts-manifest",
        GREEN_PACKET.replace(
            "manifest tally: 1 anchored / 1 derived / 1 new-decision",
            "manifest tally: 2 anchored / 1 derived / 0 new-decision",
        ),
        "prose tally",
    )
    expect_red_packet(
        "prose-tally-second-statement-contradicts",
        GREEN_PACKET
        + "\nThe summary restates the tally: 3 anchored / 0 derived / 0 new-decision.\n",
        "prose tally",
    )
    # …and a QUOTED wrong tally is material, never a stated claim
    shared_packet.write_text(
        GREEN_PACKET + "\n```text\nround-1 header said: 9 anchored / 9 derived / 9 new-decision\n```\n",
        encoding="utf-8",
    )
    errors, _ = lint(shared_root / "packets", shared_root / "contracts", ADR_DIR)
    expect_green("fenced wrong tally stays green (P9 reads prose only)", errors)
    shared_packet.write_text(GREEN_PACKET, encoding="utf-8")
    expect_red_packet(
        "row-reserved-family",
        GREEN_PACKET.replace('{"id": "O3"', '{"id": "P3"'),
        "reserved lane family",
    )
    expect_red_packet(
        "manifest-id-leading-zero",
        GREEN_PACKET.replace('{"id": "O3"', '{"id": "O03"'),
        "no leading zeros",
    )
    expect_red_packet(
        "table-id-leading-zero",
        GREEN_PACKET.replace("| O3 | c |", "| O03 | c |"),
        "lane id O03 is missing",
    )
    expect_red_packet(
        "anchored-without-ref",
        GREEN_PACKET.replace('"refs": ["contract:ch9-test-surface#C1"]', '"refs": []'),
        "carries no ref",
    )
    expect_red_packet(
        "new-decision-with-ref",
        GREEN_PACKET.replace(
            '{"id": "O3", "class": "new-decision", "refs": []}',
            '{"id": "O3", "class": "new-decision", "refs": ["prose:oops"]}',
        ),
        "ref-less by definition",
    )

    # ---- P4 ref strictness
    expect_red_packet(
        "ref-unprefixed-passthrough",
        GREEN_PACKET.replace('"prose:plan §7.2"', '"plan §7.2"'),
        "never reinterpreted",
    )
    expect_red_packet(
        "ref-near-miss-adr",
        GREEN_PACKET.replace('"prose:plan §7.2"', '"ADR006"'),
        "never reinterpreted",
    )
    expect_red_packet(
        "ref-prose-empty",
        GREEN_PACKET.replace('"prose:plan §7.2"', '"prose:"'),
        "empty remainder",
    )
    expect_red_packet(
        "ref-adr-unresolved",
        GREEN_PACKET.replace('"prose:plan §7.2"', '"ADR-999"'),
        "no such file in",
    )
    expect_red_packet(
        "ref-row-missing",
        GREEN_PACKET.replace("contract:ch9-test-surface#C2", "contract:ch9-test-surface#C7"),
        "not in draft",
    )
    # contract ref with NO draft file at all: fresh empty-contracts fixture
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "packets").mkdir()
        (root / "contracts").mkdir()
        (root / "packets" / "ch9-p1-test.md").write_text(GREEN_PACKET, encoding="utf-8")
        errors, _ = lint(root / "packets", root / "contracts", ADR_DIR)
        assert_red("ref-draft-missing", errors, "no such contract-draft")
    expect_red_draft(
        "ref-target-draft-status",
        lambda g: DRAFT_V1,  # status draft, no blocks — draft consistent, packet ref red
        "anchors need ratified-or-later",
    )

    # ---- P5 bidirectional lane ids
    expect_red_packet(
        "manifest-id-not-in-tables",
        GREEN_PACKET.replace("| O3 | c |\n", ""),
        "not defined as a table row",
    )
    expect_red_packet(
        "table-id-not-in-manifest",
        GREEN_PACKET.replace("| O3 | c |", "| O3 | c |\n| O4 | d |"),
        "missing from the",
    )
    expect_red_packet(
        "table-duplicate-lane-id",
        GREEN_PACKET.replace("| O3 | c |", "| O3 | c |\n| O3 | again |"),
        "appear more than once",
    )
    expect_red_packet(
        "fenced-only-definition",
        GREEN_PACKET.replace("| O3 | c |", "| O3x | c |")  # the real O3 row goes away
        + "\n```\n| O3 | only inside a fence |\n```\n",
        "not defined as a table row",
    )
    expect_red_packet(
        "tilde-fenced-only-definition",
        GREEN_PACKET.replace("| O3 | c |", "| O3x | c |")
        + "\n~~~\n| O3 | only inside a tilde fence |\n~~~\n",
        "not defined as a table row",
    )
    # fenced noise must stay green: unresolvable refs/marks inside
    # fences of EITHER form, and QUOTED fences (the ````markdown
    # pattern the template itself uses) — including a quoted duplicate
    # machine block, which is material, never a declaration
    shared_packet.write_text(
        GREEN_PACKET
        + "\n```\nADR-999 and contract:ch9-test-surface#C9 and [P:new-decision]\n```\n"
        + "\n~~~\nADR-999 and contract:ch9-test-surface#C9 and [P:new-decision]\n~~~\n"
        + "\n````markdown\n```text\n| O9 | quoted row | [P:typo]\n```\n"
        + '```json\n{"packet_rows": {"rows": []}}\n```\n````\n'
        + "\n   ```\n| O8 | indented-fence quoted | [P:typo]\n   ```\n"
        + "\n  ~~~\n| O7 | indented tilde quoted | [P:typo]\n  ~~~\n",
        encoding="utf-8",
    )
    errors, _ = lint(shared_root / "packets", shared_root / "contracts", ADR_DIR)
    expect_green("fenced noise (backtick + tilde + quoted + indented fences)", errors)
    shared_packet.write_text(GREEN_PACKET, encoding="utf-8")
    # an INDENTED (0-3 spaces, CommonMark-valid) ```json fence is a
    # real declaration — proven by tripping the exactly-one rule
    expect_red_packet(
        "indented-json-block-parsed",
        GREEN_PACKET + '\n  ```json\n  {"packet_rows": {"rows": []}}\n  ```\n',
        "exactly one packet_rows block",
    )
    # …and a machine block that exists ONLY inside a quoted fence does
    # NOT satisfy the exactly-one requirement
    expect_red_packet(
        "quoted-json-not-a-declaration",
        GREEN_PACKET.replace('{"packet_rows": {"rows": [', '{"packet_rows_gone": {"rows": [')
        .replace("| O1 | a |\n| O2 | b |\n| O3 | c |\n", "")
        + '\n````markdown\n```json\n{"packet_rows": {"rows": []}}\n```\n````\n',
        "exactly one packet_rows block",
    )

    # ---- P6 withdrawn carrier
    expect_red_packet(
        "withdrawn-inline-mark",
        GREEN_PACKET.replace("| O3 | c |", "| O3 | c [P:new-decision] |"),
        "withdrawn at design time",
    )
    expect_red_packet(
        "withdrawn-provenance-block",
        GREEN_PACKET + '\n```json\n{"provenance": {"anchored": 1, "derived": 1, "new_decision": 1}}\n```\n',
        "standalone provenance block",
    )
    expect_red_packet(
        "withdrawn-mark-unknown-kind",
        GREEN_PACKET.replace("| O3 | c |", "| O3 | c [P:typo] |"),
        "withdrawn at design time",
    )

    # ---- P10 ref closure (ch12 boundary)
    expect_red_packet(
        "closure-ref-missing-from-manifest",
        GREEN_PACKET + "\nThe lane rides (anchored: contract:ch9-test-surface#C3).\n",
        "missing from the packet_rows manifest refs",
    )
    expect_red_packet(
        "closure-derived-ref-missing-from-manifest",
        GREEN_PACKET + "\nDerived from (derived: contract:ch9-test-surface#C9).\n",
        "missing from the packet_rows manifest refs",
    )
    expect_red_packet(
        "closure-anchored-ref-missing-from-header-union",
        GREEN_PACKET
        + "\nAnchors: `contract:ch9-test-surface` rows C1\n"
        + "\nThe other lane rides (anchored: contract:ch9-test-surface#C2).\n",
        "missing from the header `contract:ch9-test-surface` rows union",
    )
    shared_packet.write_text(
        GREEN_PACKET
        + "\nAnchors: `contract:ch9-test-surface` rows C1/C2\n"
        + "\nThe lane rides (anchored: contract:ch9-test-surface#C1) and "
        + "(derived: contract:ch9-test-surface#C2).\n",
        encoding="utf-8",
    )
    errors, _ = lint(shared_root / "packets", shared_root / "contracts", ADR_DIR)
    expect_green("closure-consistent-refs", errors)
    shared_packet.write_text(
        GREEN_PACKET
        + "\nAnchors: `contract:ch9-test-surface` rows C1/\nC2\n"
        + "\nThe lane rides (anchored: contract:ch9-test-surface#C2).\n",
        encoding="utf-8",
    )
    errors, _ = lint(shared_root / "packets", shared_root / "contracts", ADR_DIR)
    expect_green("closure-header-union-line-wrapped", errors)
    shared_packet.write_text(GREEN_PACKET, encoding="utf-8")

    # ---- P7 metrics
    expect_red_packet(
        "metrics-missing-key",
        GREEN_PACKET.replace(', "learned": "l"', ""),
        "packet_metrics missing keys",
    )
    expect_red_packet(
        "metrics-main-thread-model-not-string",
        GREEN_PACKET.replace('"learned": "l"', '"learned": "l", "main_thread_model": 1'),
        "packet_metrics.main_thread_model must be a string",
    )
    shared_packet.write_text(
        GREEN_PACKET.replace(
            '"learned": "l"', '"learned": "l", "main_thread_model": "claude-fable-5"'
        ),
        encoding="utf-8",
    )
    errors, _ = lint(shared_root / "packets", shared_root / "contracts", ADR_DIR)
    expect_green("metrics-main-thread-model-string", errors)
    shared_packet.write_text(GREEN_PACKET, encoding="utf-8")
    expect_red_packet(
        "metrics-nested-wrong-type",
        GREEN_PACKET.replace(
            '"prediction": {"predicted": "projection", "reasoning": "r", "discovered": "projection"}',
            '"prediction": "projection"',
        ),
        "packet_metrics.prediction must be an object",
    )
    expect_red_packet(
        "metrics-nested-extra-key",
        GREEN_PACKET.replace('"discovered": "projection"}', '"discovered": "projection", "extra": 1}'),
        "prediction must be an object with exactly keys",
    )
    expect_red_packet(
        "metrics-bad-stop-token",
        GREEN_PACKET.replace("3:watchdog", "9:made-up"),
        "not in the canonical",
    )
    shared_packet.write_text(
        GREEN_PACKET.replace("3:watchdog", "3:plateau"), encoding="utf-8"
    )
    errors, _ = lint(shared_root / "packets", shared_root / "contracts", ADR_DIR)
    expect_green("metrics-plateau-stop-token", errors)
    shared_packet.write_text(GREEN_PACKET, encoding="utf-8")
    expect_red_packet(
        "metrics-stop-type-not-string",
        GREEN_PACKET.replace('"type": "3:watchdog"', '"type": []'),
        "stops[].type must be a string",
    )
    expect_red_packet(
        "metrics-prediction-enum",
        GREEN_PACKET.replace('"predicted": "projection"', '"predicted": "vibes"'),
        "prediction.predicted must be one of",
    )
    expect_red_packet(
        "metrics-found-at-enum",
        GREEN_PACKET.replace(
            '"detector_misses": []',
            '"detector_misses": [{"found_at": "someday", "what": "w", "why_missed": "y"}]',
        ),
        "found_at must be one of",
    )
    expect_red_packet(
        "metrics-rounds-negative",
        GREEN_PACKET.replace('"review": 1', '"review": -1'),
        "these are counters",
    )
    expect_red_packet(
        "metrics-provenance-vs-manifest",
        GREEN_PACKET.replace(
            '"provenance": {"anchored": 1, "derived": 1, "new_decision": 1}',
            '"provenance": {"anchored": 999, "derived": 1, "new_decision": 1}',
        ),
        "manifest tallies",
    )
    metrics_block = GREEN_PACKET[GREEN_PACKET.index('```json\n{"packet_metrics"'):]
    expect_red_packet(
        "metrics-multiple-blocks",
        GREEN_PACKET + "\n" + metrics_block,
        "at most one (D7)",
    )

    # ---- D1 draft meta
    expect_red_draft(
        "draft-meta-extra-key",
        lambda g: g.replace('"status": "ratified"}', '"status": "ratified", "extra": 1}'),
        "contract_draft must be an object with exactly keys",
    )
    expect_red_draft(
        "draft-status-invalid",
        lambda g: g.replace('"status": "ratified"', '"status": "shipped"'),
        "contract_draft.status",
    )

    # ---- D2 C-rows
    expect_red_draft(
        "draft-duplicate-c-id",
        lambda g: g.replace("| C2 | the other row |", "| C2 | the other row |\n| C2 | dup |"),
        "duplicate C-row ids",
    )
    expect_red_draft(
        "draft-c-row-leading-zero",
        lambda g: g.replace("| C2 | the other row |", "| C2 | the other row |\n| C03 | zero |"),
        "leading-zero C-row ids",
    )

    # ---- D3 ratification shape + dates
    expect_red_draft(
        "ratification-bad-date",
        lambda g: g.replace('"date": "2026-07-09"', '"date": 20260709'),
        "YYYY-MM-DD",
    )
    expect_red_draft(
        "ratification-bad-commit",
        lambda g: g.replace('"commit": "', '"commit": "ZZZ-not-hex-'),
        "lowercase-hex commit sha",
    )
    expect_red_draft(
        "ratification-empty-arms",
        lambda g: g.replace('"arms": ["a", "b"]', '"arms": []'),
        "nonempty list of nonempty strings",
    )

    def _dates_decreasing_fixture() -> None:
        fixture = build_green_fixture()
        if fixture is None:
            failures.append("selftest fixture setup failed: ratification-dates-decreasing")
            return
        tmp, root, draft, _packet, green = fixture
        sha = _git_out(root, "rev-parse", "HEAD")
        second = RATIFICATION_TMPL.replace("%DATE%", "2026-07-01").replace("%COMMIT%", sha)
        # rows unchanged, so equality vs the SECOND block's commit holds;
        # only the decreasing date must trip
        draft.write_text(green + second, encoding="utf-8")
        _git_ok(root, "add", "-A")
        _git_ok(root, "commit", "-q", "-m", "second-block")
        errors, _ = lint(root / "packets", root / "contracts", ADR_DIR)
        assert_red("ratification-dates-decreasing", errors, "dates decrease in document order")
        tmp.cleanup()

    _dates_decreasing_fixture()

    def _tree_sha_fixture() -> None:
        # a TREE sha satisfies `git show <sha>:<path>` but is not an
        # auditable ratification point — must be red, not green
        fixture = build_green_fixture()
        if fixture is None:
            failures.append("selftest fixture setup failed: ratification-tree-sha")
            return
        tmp, root, draft, _packet, green = fixture
        tree = _git_out(root, "rev-parse", "HEAD~1^{tree}")
        draft.write_text(
            re.sub(r'"commit": "[0-9a-f]+"', f'"commit": "{tree}"', green), encoding="utf-8"
        )
        errors, _ = lint(root / "packets", root / "contracts", ADR_DIR)
        assert_red("ratification-tree-sha", errors, "does not resolve to a COMMIT")
        tmp.cleanup()

    _tree_sha_fixture()

    # ---- D4 state consistency
    expect_red_draft(
        "draft-status-with-block",
        lambda g: g.replace('"status": "ratified"', '"status": "draft"'),
        "draft implies no blocks",
    )
    expect_red_draft(
        "ratified-without-block",
        lambda g: DRAFT_V1.replace('"status": "draft"', '"status": "ratified"'),
        "requires a ratification block",
    )
    expect_red_draft(
        "reopened-without-block",
        lambda g: DRAFT_V1.replace('"status": "draft"', '"status": "reopened"'),
        "requires a ratification block",
    )
    expect_red_draft(
        "ratified-without-rows",
        lambda g: g.replace("| C1 | the row |\n", "").replace("| C2 | the other row |\n", ""),
        "but no C-rows",
    )

    # ---- D5 recorded-commit equality
    expect_red_draft(
        "row-edited-after-ratification",
        lambda g: g.replace("| C1 | the row |", "| C1 | the row, silently edited |"),
        "needs re-ratification",
    )
    expect_red_draft(
        "row-edited-and-committed",
        lambda g: g.replace("| C1 | the row |", "| C1 | the row, silently edited |"),
        "needs re-ratification",
        commit=True,
    )
    expect_red_draft(
        "recorded-commit-unresolvable",
        lambda g: re.sub(
            r'"commit": "[0-9a-f]+"', '"commit": "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef"', g
        ),
        "ratification record is broken",
    )
    # out-of-repo ratified draft: the equality check must be a LOUD
    # error, never a skip (any syntactically valid recorded sha will do
    # — the error precedes resolution)
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "packets").mkdir()
        (root / "contracts").mkdir()
        (root / "contracts" / "ch9-test-surface-contract.md").write_text(green_draft, encoding="utf-8")
        errors, _ = lint(root / "packets", root / "contracts", ADR_DIR)
        assert_red("ratified-draft-outside-git", errors, "not inside a git repository")
    # the reopen choreography must be GREEN at every step, and the
    # re-ratification must be GREEN afterwards
    fixture = build_green_fixture()
    if fixture is None:
        failures.append("selftest fixture setup failed: reopen-choreography")
    else:
        tmp, root, draft, packet2, green = fixture
        reopened_text = green.replace('"status": "ratified"', '"status": "reopened"').replace(
            "| C1 | the row |", "| C1 | the row, reopened edit |"
        )
        draft.write_text(reopened_text, encoding="utf-8")
        _git_ok(root, "add", "-A")
        _git_ok(root, "commit", "-q", "-m", "reopen-content")
        # a packet anchored to a REOPENED draft is red — the loud window
        errors, _ = lint(root / "packets", root / "contracts", ADR_DIR)
        assert_red("ref-target-reopened-draft", errors, "contested during a reopen")
        # …but the DRAFT itself is green at every choreography step
        packet2.unlink()
        errors, stats = lint(root / "packets", root / "contracts", ADR_DIR)
        expect_green("reopened intermediate state", errors)
        # D6: the summary carries the reopened drafts BY NAME
        if stats["reopened"] != ["ch9-test-surface-contract.md"]:
            failures.append("selftest claim NOT held: reopened drafts not listed by name")
        # D6: the gate form turns the same state red
        errors, _ = lint(root / "packets", root / "contracts", ADR_DIR, forbid_reopened=True)
        assert_red("forbid-reopened-gate", errors, "zero-reopened gate")
        new_sha = _git_out(root, "rev-parse", "HEAD")
        reratified = reopened_text.replace('"status": "reopened"', '"status": "ratified"') + RATIFICATION_TMPL.replace(
            "%DATE%", "2026-07-10"
        ).replace("%COMMIT%", new_sha)
        draft.write_text(reratified, encoding="utf-8")
        packet2.write_text(GREEN_PACKET, encoding="utf-8")
        errors, _ = lint(root / "packets", root / "contracts", ADR_DIR)
        expect_green("re-ratification", errors)
        tmp.cleanup()

    # ---- D7 realized map
    expect_red_draft(
        "realized-incomplete-map",
        lambda g: g.replace('"status": "ratified"', '"status": "realized"')
        + '\n```json\n{"realized_map": {"C1": "landed"}}\n```\n',
        "does not cover the C-row set",
    )
    expect_red_draft(
        "realized-map-bad-value",
        lambda g: g.replace('"status": "ratified"', '"status": "realized"')
        + '\n```json\n{"realized_map": {"C1": "landed", "C2": 7}}\n```\n',
        "landing-site string",
    )
    expect_red_draft(
        "map-on-ratified-status",
        lambda g: g + '\n```json\n{"realized_map": {"C1": "landed", "C2": "landed"}}\n```\n',
        "in ONE act",
    )
    expect_red_draft(
        "realized-without-map",
        lambda g: g.replace('"status": "ratified"', '"status": "realized"'),
        "exactly one realized_map block",
    )

    # ---- P8 post-build (pinned bytes + merge rejection)
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        pdir = root / "packets"
        pdir.mkdir()
        packet = pdir / "ch9-p1-test.md"
        packet.write_text(
            '# p\n\n```json\n{"mutation_boundary": {"files": ["x.txt"]}}\n```\n',
            encoding="utf-8",
        )
        (root / "x.txt").write_text("x", encoding="utf-8")
        if not (_git_ok(root, "init", "-q") and _git_ok(root, "add", "-A") and _git_ok(root, "commit", "-q", "-m", "base")):
            failures.append("selftest git fixture setup failed (post-build)")
        else:
            # the reproduced round-9 hole: a code-only commit (packet
            # file untouched) green-lit the audit — the wrong commit
            (root / "x.txt").write_text("x1b", encoding="utf-8")
            _git_ok(root, "add", "-A")
            _git_ok(root, "commit", "-q", "-m", "code-only")
            checker = Checker()
            check_post_build(packet, _git_out(root, "rev-parse", "HEAD"), checker)
            assert_red("post-build-wrong-commit", checker.errors, "wrong commit to audit")
            # P8 pinned audit: a symbolic ref moves — HEAD itself is red
            checker = Checker()
            check_post_build(packet, "HEAD", checker)
            assert_red("post-build-symbolic-ref", checker.errors, "not a pinned commit sha")
            # …and an annotated TAG OBJECT is not the build commit
            _git_ok(root, "tag", "-a", "-m", "t", "vtest")
            checker = Checker()
            check_post_build(packet, _git_out(root, "rev-parse", "vtest"), checker)
            assert_red("post-build-tag-object", checker.errors, "does not resolve to a COMMIT")
            # a VALID build-shaped audit is GREEN — without this, a
            # false-red regression on a correct commit would slip
            # through a red-only dim set
            (root / "x.txt").write_text("x-valid", encoding="utf-8")
            packet.write_text(
                packet.read_text(encoding="utf-8") + "\nvalid build\n", encoding="utf-8"
            )
            _git_ok(root, "add", "-A")
            _git_ok(root, "commit", "-q", "-m", "valid-build")
            checker = Checker()
            check_post_build(packet, _git_out(root, "rev-parse", "HEAD"), checker)
            if checker.errors:
                failures.append(
                    f"selftest green NOT green: valid post-build audit ({checker.errors[0]})"
                )
            # a build-shaped commit (packet included) with an
            # out-of-boundary file
            (root / "x.txt").write_text("x2", encoding="utf-8")
            (root / "y.txt").write_text("y", encoding="utf-8")
            packet.write_text(
                packet.read_text(encoding="utf-8") + "\nbuild note\n", encoding="utf-8"
            )
            _git_ok(root, "add", "-A")
            _git_ok(root, "commit", "-q", "-m", "outside")
            outside_sha = _git_out(root, "rev-parse", "HEAD")
            checker = Checker()
            check_post_build(packet, outside_sha, checker)
            assert_red("post-build-outside-boundary", checker.errors, "OUTSIDE")
            # widen the WORKING-TREE boundary; the old commit must stay red
            packet.write_text(
                packet.read_text(encoding="utf-8").replace('["x.txt"]', '["x.txt", "y.txt"]'),
                encoding="utf-8",
            )
            checker = Checker()
            check_post_build(packet, outside_sha, checker)
            assert_red("post-build-not-pinned", checker.errors, "OUTSIDE")
            branch = _git_out(root, "rev-parse", "--abbrev-ref", "HEAD")
            ok = _git_ok(root, "checkout", "-q", "--", ".")
            ok = ok and _git_ok(root, "checkout", "-q", "-b", "side", "HEAD~1")
            (root / "z.txt").write_text("z", encoding="utf-8")
            ok = (
                ok
                and _git_ok(root, "add", "-A")
                and _git_ok(root, "commit", "-q", "-m", "side-outside")
                and _git_ok(root, "checkout", "-q", branch)
                and _git_ok(root, "merge", "-q", "--no-ff", "-m", "merge", "side")
            )
            if not ok:
                failures.append("selftest git fixture setup failed (merge)")
            else:
                checker = Checker()
                check_post_build(packet, _git_out(root, "rev-parse", "HEAD"), checker)
                assert_red("post-build-merge-commit", checker.errors, "merge commit")

    # a MALFORMED boundary at the audited commit is a red error, never
    # a Python crash or a silent pass — the FULL P2 shape rules hold on
    # the audit path too
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        pdir = root / "packets"
        pdir.mkdir()
        packet = pdir / "ch9-p1-test.md"
        packet.write_text('# p\n\n```json\n{"mutation_boundary": "x"}\n```\n', encoding="utf-8")
        if not (_git_ok(root, "init", "-q") and _git_ok(root, "add", "-A") and _git_ok(root, "commit", "-q", "-m", "base")):
            failures.append("selftest git fixture setup failed (post-build-malformed)")
        else:
            checker = Checker()
            check_post_build(packet, _git_out(root, "rev-parse", "HEAD"), checker)
            assert_red(
                "post-build-malformed-boundary",
                checker.errors,
                "mutation_boundary must be an object with exactly keys",
            )
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        pdir = root / "packets"
        pdir.mkdir()
        packet = pdir / "ch9-p1-test.md"
        # the reproduced hole: an absolute path and a non-string element
        # rode through while the changed file happened to be listed
        packet.write_text(
            '# p\n\n```json\n{"mutation_boundary": {"files": ["/abs", 7, "x.txt"]}}\n```\n',
            encoding="utf-8",
        )
        (root / "x.txt").write_text("x", encoding="utf-8")
        if not (_git_ok(root, "init", "-q") and _git_ok(root, "add", "-A") and _git_ok(root, "commit", "-q", "-m", "base")):
            failures.append("selftest git fixture setup failed (post-build-shape)")
        else:
            checker = Checker()
            check_post_build(packet, _git_out(root, "rev-parse", "HEAD"), checker)
            assert_red(
                "post-build-boundary-shape-rules",
                checker.errors,
                "nonempty list of repo-relative paths",
            )
    # a ROOT commit's diff-tree list is empty without --root — the
    # reproduced vacuous-audit hole: out-of-boundary files rode in on
    # the repo's first commit
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        pdir = root / "packets"
        pdir.mkdir()
        packet = pdir / "ch9-p1-test.md"
        packet.write_text(
            '# p\n\n```json\n{"mutation_boundary": {"files": ["x.txt"]}}\n```\n',
            encoding="utf-8",
        )
        (root / "x.txt").write_text("x", encoding="utf-8")
        (root / "y.txt").write_text("y", encoding="utf-8")
        if not (_git_ok(root, "init", "-q") and _git_ok(root, "add", "-A") and _git_ok(root, "commit", "-q", "-m", "root")):
            failures.append("selftest git fixture setup failed (post-build-root)")
        else:
            checker = Checker()
            check_post_build(packet, _git_out(root, "rev-parse", "HEAD"), checker)
            assert_red("post-build-root-commit", checker.errors, "OUTSIDE")
            # the family's third member: an --allow-empty commit's
            # change list is empty — red at the sink, not enumerated
            if not _git_ok(root, "commit", "-q", "--allow-empty", "-m", "empty"):
                failures.append("selftest git fixture setup failed (post-build-empty)")
            else:
                checker = Checker()
                check_post_build(packet, _git_out(root, "rev-parse", "HEAD"), checker)
                assert_red("post-build-empty-commit", checker.errors, "EMPTY change list")

    # ---- ADR-015 missing-directory loud guard
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "contracts").mkdir()
        errors, _ = lint(root / "packets", root / "contracts", ADR_DIR)
        assert_red("missing-packets-dir", errors, "packets directory missing")
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "packets").mkdir()
        errors, _ = lint(root / "packets", root / "contracts", ADR_DIR)
        assert_red("missing-contracts-dir", errors, "contracts directory missing")

    # ---- ADR-015 legacy-path alias: all three cutoff polarities on a
    # synthetic repo enacting the migration — a packet BUILT at the old
    # home, RELOCATED to the new home, then a FUTURE commit that
    # deletes the new path and reintroduces an old-path file (the
    # F2-deep false-green shape the ancestry bound exists to kill).
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        old_pdir = root / "docs" / "v3" / "implementation" / "packets"
        old_pdir.mkdir(parents=True)
        alias_packet_text = '# p\n\n```json\n{"mutation_boundary": {"files": ["x.txt"]}}\n```\n'
        (old_pdir / "ch9-p1-test.md").write_text(alias_packet_text, encoding="utf-8")
        (root / "x.txt").write_text("x", encoding="utf-8")
        new_pdir = root / "v3" / "implementation" / "packets"
        new_pdir.mkdir(parents=True)
        new_packet = new_pdir / "ch9-p1-test.md"
        ok = _git_ok(root, "init", "-q") and _git_ok(root, "add", "-A") and _git_ok(root, "commit", "-q", "-m", "build")
        build_sha = _git_out(root, "rev-parse", "HEAD")
        ok = (
            ok
            and _git_ok(root, "mv", "docs/v3/implementation/packets/ch9-p1-test.md", "v3/implementation/packets/ch9-p1-test.md")
            and _git_ok(root, "commit", "-q", "-m", "migrate")
        )
        # the future false-green shape: new path gone, old path back
        old_pdir.mkdir(parents=True, exist_ok=True)
        ok = (
            ok
            and _git_ok(root, "mv", "v3/implementation/packets/ch9-p1-test.md", "docs/v3/implementation/packets/ch9-p1-test.md")
            and _git_ok(root, "commit", "-q", "-m", "future-reintroduces-old-path")
        )
        future_sha = _git_out(root, "rev-parse", "HEAD")
        new_pdir.mkdir(parents=True, exist_ok=True)  # frame anchor for git_root_and_rel
        if not ok:
            failures.append("selftest git fixture setup failed (adr-015 alias)")
        else:
            # polarity 1 — unset: MIGRATION_PARENT None, alias never fires
            checker = Checker()
            check_post_build(new_packet, build_sha, checker, migration_parent=None)
            assert_red("alias-unset-never-fires", checker.errors, "not found in commit")
            # polarity 2 — ancestor: the audited build commit IS the
            # migration parent; the alias fires and the WHOLE audit
            # frame (membership, allowed seed, outside) runs in old-path
            # coordinates — the audit is green end-to-end
            checker = Checker()
            check_post_build(new_packet, build_sha, checker, migration_parent=build_sha)
            if checker.errors:
                failures.append(
                    f"selftest green NOT green: alias-ancestor-audit ({checker.errors[0]})"
                )
            # polarity 3 — non-ancestor (injected cutoff): the future
            # commit reintroduced the old path, but it is not an
            # ancestor of the cutoff, so the alias may not fire — the
            # missing new path stays the LOUD error it is today
            checker = Checker()
            check_post_build(new_packet, future_sha, checker, migration_parent=build_sha)
            assert_red("alias-non-ancestor-loud", checker.errors, "not found in commit")

    # ---- ADR-015 alias on the D5 side: a draft ratified at the old
    # home, then relocated — the recorded-commit read goes THROUGH the
    # alias when permitted, stays loud when the alias is unset
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        old_cdir = root / "docs" / "v3" / "implementation" / "contracts"
        old_cdir.mkdir(parents=True)
        old_draft = old_cdir / "ch9-test-surface-contract.md"
        old_draft.write_text(DRAFT_V1, encoding="utf-8")
        ok = _git_ok(root, "init", "-q") and _git_ok(root, "add", "-A") and _git_ok(root, "commit", "-q", "-m", "content")
        content_sha = _git_out(root, "rev-parse", "HEAD")
        ratified = DRAFT_V1.replace('"status": "draft"', '"status": "ratified"') + RATIFICATION_TMPL.replace(
            "%DATE%", "2026-07-09"
        ).replace("%COMMIT%", content_sha)
        old_draft.write_text(ratified, encoding="utf-8")
        ok = ok and _git_ok(root, "add", "-A") and _git_ok(root, "commit", "-q", "-m", "record")
        record_sha = _git_out(root, "rev-parse", "HEAD")
        new_cdir = root / "v3" / "implementation" / "contracts"
        new_cdir.mkdir(parents=True)
        ok = (
            ok
            and _git_ok(root, "mv", "docs/v3/implementation/contracts/ch9-test-surface-contract.md", "v3/implementation/contracts/ch9-test-surface-contract.md")
            and _git_ok(root, "commit", "-q", "-m", "migrate")
        )
        if not ok:
            failures.append("selftest git fixture setup failed (adr-015 alias d5)")
        else:
            new_draft = new_cdir / "ch9-test-surface-contract.md"
            rows = c_row_lines(ratified)
            checker = Checker()
            check_recorded_equality(new_draft, content_sha, rows, checker, migration_parent=record_sha)
            if checker.errors:
                failures.append(
                    f"selftest green NOT green: alias-d5-ancestor ({checker.errors[0]})"
                )
            checker = Checker()
            check_recorded_equality(new_draft, content_sha, rows, checker, migration_parent=None)
            assert_red("alias-d5-unset-loud", checker.errors, "ratification record is broken")

    # ---- the green pair must pass
    errors, _ = lint(shared_root / "packets", shared_root / "contracts", ADR_DIR)
    expect_green("GREEN fixture pair", errors)
    shared_tmp.cleanup()

    for f in failures:
        print(f"selftest FAIL: {f}", file=sys.stderr)
    print(
        f"selftest: {len(red_dims)} red dims exercised, green fixture + reopen "
        f"choreography + fenced-noise greens pass, {len(failures)} failure(s)"
    )
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--selftest", action="store_true")
    parser.add_argument("--packets-dir", type=Path, default=PACKETS_DIR)
    parser.add_argument("--contracts-dir", type=Path, default=CONTRACTS_DIR)
    parser.add_argument("--adr-dir", type=Path, default=ADR_DIR)
    parser.add_argument("--forbid-reopened", action="store_true")
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
    return run_lint(
        args.packets_dir, args.contracts_dir, args.adr_dir, forbid_reopened=args.forbid_reopened
    )


if __name__ == "__main__":
    sys.exit(main())
