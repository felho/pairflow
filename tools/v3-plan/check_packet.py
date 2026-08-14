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
      ratified-or-later draft; neither reopened nor superseded
      qualifies — contested vs retired, see D8) or ADR-NNN
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
      The build-close METRICS GATE rides this path (ch13 boundary —
      the p1b missing-block breach): the packet's bytes AT THE
      AUDITED COMMIT must carry EXACTLY ONE packet_metrics block —
      zero blocks is the loud "packet_metrics missing at build close
      — the block is written once at build close" error (the §5.5
      convention) — and a ch13+ packet (the filename's ch<N>- number)
      must carry main_thread_model in that block. POST-BUILD ONLY:
      P7 keeps the block itself optional on the plain lint path, and
      main_thread_model stays optional there and for pre-ch13
      chapters.
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
 P11. mirror_map (ch13 boundary — the mirror-drift class): the
      pointer-only register, opt-in BY DECLARATION (the P1
      grandfathering pattern at the block grain — a packet without
      the block is untouched, stray pointer tokens included; naming
      the block with a malformed fence is red, never a silent
      un-gate). Shape: {"form": "pointer-only", "rules": [{id,
      canonical, signature, allow}]} — exact keysets; kebab rule ids,
      unique; signature a NONEMPTY list of nonempty strings (an empty
      signature would leave the rule unguarded); allow a possibly-
      empty list of nonempty strings. canonical is a table-defined
      lane id (the P5 scan's set) or a <slug>#<Token> anchor whose
      Token occurs outside fences. Every →[id] pointer outside fences
      resolves to a declared rule, and any LOOKALIKE arrow-bracket
      token is red (a reader-visible pointer the lint would otherwise
      ignore — the lookalike class is the Unicode arrow BLOCKS, not a
      hand-picked list). Anchors validate BOTH halves: the slug must
      name exactly ONE real heading (kebab-prefix at a hyphen
      boundary; disjoint multiple matches are an ambiguity red, a
      child heading nested in a matched parent is the same home)
      whose level-aware section holds the token. SIGNATURE CONFINEMENT: a rule's signature string may
      occur outside fences only on the canonical lane's own table
      row, inside the anchor token's PARAGRAPH (contiguous non-blank
      block — but a TABLE ROW is its own paragraph, so a token in one
      row never legalizes the table), or on a line matching an allow
      entry at a non-alphanumeric boundary — a POINTER-BEARING line
      is deliberately NOT exempt (a restatement beside its own
      pointer is the loophole that exemption would open). Each
      signature must additionally OCCUR at its canonical home — a
      typo'd, wrapped, or obsolete literal guards nothing and is red,
      never silently unguarded. The opt-in guard reads MACHINE-BLOCK
      raws only: a prose mention or markdown-quoted example of the
      identifier neither opts a packet in nor reds it. The scan verifies declared literals
      against bytes; free text is never interpreted (P9's principle).
      The semantic tail — a PARAPHRASED restatement carrying none of
      the declared literals — is named as the review-side duty, not
      claimed here.

Drafts (v3/implementation/contracts/*.md, README.md excluded):
  D1. contract_draft = {chapter, surface, status}: exact keyset;
      status in draft|ratified|reopened|realized|superseded; filename
      ch<N>-<surface>-contract.md matches chapter/surface.
  D2. C-row registry: table rows whose first cell is C<n> (fenced code
      excluded); unique ids, no leading zeros (ids are exact strings —
      C01 is never C1); ratified-or-later requires >=1 row.
  D3. ratification = {date, arms, commit}: exact keyset; YYYY-MM-DD
      string date naming a REAL CALENDAR DAY (the shape alone admits
      2026-13-40 and a non-leap 2026-02-29 — a mistyped month is the
      ordinary accident); nonempty string-list arms; 7-40 lowercase-hex
      commit. Dates non-decreasing in document order; "latest block" =
      the LAST block in document order. A block MAY additionally carry
      schema = {path, sha256} (the ADR-019 D4 byte lock for
      schema-first contracts): exact inner keyset; path a nonempty
      repo-relative string; sha256 64 lowercase hex — shape-checked on
      every block that carries it.
  D5b. The SCHEMA LOCK (template §3; user-ratified 2026-08-08): when
      the LATEST block carries schema, the working tree file at its
      path must EXIST and its bytes must hash to the recorded sha256 —
      bound at ratified|realized|superseded, suspended ONLY at
      reopened (with D5 and for the same reason). A missing file or a
      differing hash is a LOUD error, never a skip: an edit of the
      declaration file after ratification is an unratified schema
      change until a new act records the new bytes. Threat model:
      accident and sloppiness (an unratified schema edit, a stale or
      mistyped hash, a wrong path) — deliberate concealment stays with
      human diff review and the arm.
  D4. State consistency (decidable from the current bytes alone):
      ratification block(s) present <=> status in {ratified, reopened,
      realized, superseded}; status draft => no blocks.
  D5. Recorded-commit equality (status ratified|realized|superseded):
      the C-row
      lines in the working tree equal the C-row lines at the latest
      block's recorded commit (git show). The recorded sha must
      resolve to a COMMIT object (git cat-file -t): a tree/blob/tag
      would satisfy git show while being no auditable ratification
      point. An out-of-repo draft or an unresolvable recorded commit
      is a LOUD error, never a skip.
      Suspended ONLY at reopened — the two-commit reopen choreography
      (content+status commit, then record commit) stays green at every
      step. At superseded it binds FOREVER: the flip edits no C-row,
      so equality against the latest ratification's commit is the
      archival lock itself.
  D6. reopened is a transient STOP-artifact: the summary lists
      reopened drafts BY NAME, and --forbid-reopened turns any into
      an error (the zero-reopened gate at packet approve / chapter
      close / flip).
  D7. Realized map: ANY realized_map block present <=> status realized
      AND exactly one map covering exactly the C-row id set, every
      landing site a nonempty string (a partial map, on any status, is
      red). The key is the block's SOLE top-level key — a sibling key
      in the same fence rides along unread (the merged-block accident);
      the rule is shared with D8.3's record.
  D8. The superseded TERMINAL status (ch13 re-derivation P1) — a line
      that is RE-DERIVED rather than repaired is archived IN PLACE
      (the file never moves) by ONE commit flipping ratified ->
      superseded and appending the record. Nine claims, each with its
      own red fixture:
      D8.1 a superseded draft carrying a valid record is GREEN (the
           status value itself is red without this claim).
      D8.2 status/record consistency, BOTH directions red: superseded
           without the record; the record on any other status. Plus:
           superseded with ZERO ratification blocks is red — a draft
           that was never ratified has no state to preserve.
      D8.3 record keyset EXACTLY {date, oracle_branch, oracle_tip,
           plan} (an extra or missing key is red — notably NO
           successor field: it cannot exist at flip time, and an
           unverifiable-at-writing reference is the measured defect
           family this process pays for); date a YYYY-MM-DD string
           naming a real calendar day (D3's rule); and `superseded` is
           the block's SOLE top-level key (D7's rule).
      D8.4 oracle_branch resolves (local ref, else its origin/
           tracking form) and oracle_tip is 40-hex lowercase,
           resolves to a COMMIT object, and is CONTAINED in that
           branch (merge-base --is-ancestor — so later preservation
           commits on the oracle never break the record).
      D8.5 plan is an existing repo-relative path (no absolute, no
           ..): the forward thread must resolve where it is written.
      D8.6 equality still binds (D5): a C-row edited after the flip
           is red — the archival lock.
      D8.7 a packet ref into a superseded draft is red with a
           DEDICATED message naming the state and pointing at the
           record. Opposite reason to reopened: contested (transient)
           vs retired (permanent). CHANNEL, stated because the claim
           is only as wide as the surface it checks (user-ratified
           2026-08-04): the lock binds on the MANIFEST — packet_rows
           refs are the only surface carrying an anchor in the
           machine's sense, and that holds for every status, not just
           this one. Prose closures are bound one-way to the manifest
           by P10's ref-drift check, so status rides the manifest
           entry; pre-v2 packets are skipped by the grandfathering
           policy (P1's rule, which owns that question); the header
           union is a reader-convenience mirror no template mandates.
           Those three are NAMED carried-scope, recorded with owners
           in ch13-rederivation-arm/p1/carried-scope.md — not silent
           holes, and not this claim's territory.
      D8.8 realized_map on status superseded is red (D7's map <=>
           realized rule, pinned against the new status).
      D8.9 the summary names superseded drafts, the D6 listing analog.
      superseded does NOT join --forbid-reopened: it is permanent, so
      gating on it would red every future approve. Terminality is a
      FORM rule, not a lint claim — no transition out of superseded
      exists to be checked from a single document's bytes.
  D9. The superseded-target token scan (ch13 boundary — the ch11
      pointer case), REPORT-ONLY: packet manifest refs refuse a
      superseded target (P4/D8.7), but cross-contract
      contract:<surface>#Cn tokens in CONTRACT files were scanned by
      nothing. Every ratified-or-later draft's C-row TABLE LINES and
      realized_map string values are scanned with the P10 token
      regex; a token targeting a superseded draft emits a NOTE on the
      note: channel — NEVER an error (the LEAVE-WITH-RECORD state is
      legitimate; the scan makes it visible). Context/prose sections
      are deliberately not scanned — history lives there.

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
import datetime
import hashlib
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

DRAFT_STATUSES = ("draft", "ratified", "reopened", "realized", "superseded")
# The ANCHOR-QUALIFYING set (P4/D8.7): reopened and superseded are both
# deliberately OUT, for opposite reasons — contested vs retired.
RATIFIED_OR_LATER = ("ratified", "realized")
# The FROZEN set (D5/D8.6): statuses whose C-rows are locked against the
# latest ratification's recorded commit. reopened is the ONLY post-draft
# status where equality is suspended (its rows are mid-edit by design);
# superseded freezes forever — the flip edits no row, so the equality
# check IS the archival lock. Also the "requires >=1 C-row" set: every
# member has been ratified at least once, and a ratified draft has rows.
EQUALITY_BOUND = ("ratified", "realized", "superseded")
CONTRACT_DRAFT_KEYS = {"chapter", "surface", "status"}
SUPERSEDED_KEYS = {"date", "oracle_branch", "oracle_tip", "plan"}
SCHEMA_LOCK_KEYS = {"path", "sha256"}
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

# P11 (ch13 boundary — the mirror-drift class): the pointer-only
# register. Opt-in BY DECLARATION (the P1 grandfathering pattern at
# the block grain): only a packet carrying the mirror_map block is
# gated; every earlier packet is untouched, stray pointer tokens
# included. The scan verifies DECLARED literals (signature strings,
# pointer ids, anchors) against bytes — free text is never
# interpreted (the P9 precedent).
MIRROR_MAP_KEYS = {"form", "rules"}
MIRROR_RULE_KEYS = {"id", "canonical", "signature", "allow"}
# Strict kebab: no doubled or trailing hyphens (arm finding 8).
MIRROR_RULE_ID_RE = re.compile(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$")
# canonical is a table-defined lane id (the P5 scan's set, reserved
# families excluded) or a section anchor <slug>#<Token>: the slug must
# name a real heading (kebab-prefix match at a hyphen boundary) whose
# section contains the token (arm finding 2), both halves strict-kebab.
MIRROR_ANCHOR_RE = re.compile(
    r"^([a-z][a-z0-9]*(?:-[a-z0-9]+)*)#([A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*)$"
)
POINTER_TOKEN_RE = re.compile(r"→\[([^\[\]\s]+)\]")
# Any visually arrow-like pointer form is scanned; only U+2192 is the
# canonical arrow — a lookalike would be a reader-visible pointer the
# dimension silently ignores (arm finding 9). The lookalike class is
# the Unicode ARROW BLOCKS, not a hand-picked list (arm re-run
# finding 2: a finite set missed U+279D): Arrows, Supplemental
# Arrows-A/-B/-C, Miscellaneous Symbols and Arrows, and the dingbat
# arrow range.
POINTER_ARROWISH_RE = re.compile(
    r"([←-⇿➔-➾⟰-⟿⤀-⥿"
    r"⬀-⯿\U0001f800-\U0001f8ff])\[([^\[\]\s]+)\]"
)
MIRROR_HEADING_RE = re.compile(r"^(#{2,6})\s+(.*)$")


def _mirror_kebab(s: str) -> str:
    out = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return re.sub(r"-{2,}", "-", out)
C_ROW_RE = re.compile(r"^\|\s*(C\d+)\s*\|")
DRAFT_NAME_RE = re.compile(r"^(ch\d+)-([a-z0-9-]+)-contract\.md$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def is_calendar_date(value: object) -> bool:
    """D3/D8.3: a declared date is a REAL day, not merely a
    YYYY-MM-DD-SHAPED string. The regex alone admits 2026-13-40 and
    2026-02-29 — a mistyped month or a copy-pasted leap day is the
    accident this rule exists for, and a date that cannot be reached
    on a calendar is unusable as the audit stamp it claims to be."""
    if not isinstance(value, str) or not DATE_RE.match(value):
        return False
    try:
        datetime.date.fromisoformat(value)
    except ValueError:
        return False
    return True
COMMIT_RE = re.compile(r"^[0-9a-f]{7,40}$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
# D8.4: the oracle tip is pinned FULL — an abbreviated sha is a
# prefix claim that a future object can collide with, and the record
# is meant to outlive every session that could re-derive it.
FULL_SHA_RE = re.compile(r"^[0-9a-f]{40}$")

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


# D7/D8.3: the template legislates these two as "exactly one block with
# this exact TOP-LEVEL key". Without the rule a sibling key rides along
# unread — the ordinary accident being a copy-paste that merges two
# blocks, or an editor collapsing two fences into one. Class-width by
# construction: the set IS the template's own list, so a third record
# form joins here rather than growing a parallel check.
SOLE_TOP_LEVEL_KEY_BLOCKS = ("superseded", "realized_map")


def check_sole_top_level_key(path_name: str, blocks: list[dict], checker: Checker) -> None:
    for key in SOLE_TOP_LEVEL_KEY_BLOCKS:
        for block in blocks:
            if key in block and len(block) != 1:
                siblings = sorted(k for k in block if k != key)
                checker.error(
                    f"{path_name}: the '{key}' block carries sibling top-level "
                    f"key(s) {siblings} — the record must be the block's ONLY "
                    f"top-level key, or the siblings ride along unread"
                )


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
    """D3: strict shape for EVERY ratification block. The OPTIONAL
    schema key (the ADR-019 D4 byte lock) is shape-checked here on
    every block that carries it; its BYTE check (D5b) runs on the
    latest block only, beside the D5 equality check."""
    label = f"{name}: ratification[{index}]"
    if not isinstance(block, dict) or set(block.keys()) - {"schema"} != RATIFICATION_KEYS:
        checker.error(
            f"{label} must be an object with exactly keys {sorted(RATIFICATION_KEYS)}"
            f" (plus the optional schema lock)"
        )
        return
    if "schema" in block:
        schema = block["schema"]
        if not isinstance(schema, dict) or set(schema.keys()) != SCHEMA_LOCK_KEYS:
            checker.error(
                f"{label}.schema must be an object with exactly keys {sorted(SCHEMA_LOCK_KEYS)}"
            )
        else:
            lock_path = schema["path"]
            if (
                not isinstance(lock_path, str)
                or not lock_path.strip()
                or lock_path.startswith("/")
                # a PARENT SEGMENT, not a substring — "schema..fixture.ts"
                # is a legal filename (round-1 F1's false positive)
                or ".." in lock_path.split("/")
            ):
                checker.error(f"{label}.schema.path must be a nonempty repo-relative path")
            if not isinstance(schema["sha256"], str) or not SHA256_RE.match(schema["sha256"]):
                checker.error(f"{label}.schema.sha256 must be a 64-character lowercase-hex sha256")
    if not is_calendar_date(block["date"]):
        checker.error(f"{label}.date must be a YYYY-MM-DD string naming a real calendar day")
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


def check_schema_lock(path: Path, schema: object, checker: Checker) -> None:
    """D5b: the working tree's declaration file hashes to the recorded
    sha256. A broken lock is LOUD, never a skip — a missing file or a
    differing hash means the declaration's bytes are not the ratified
    ones. Runs only when the shape (D3) already holds; a malformed
    schema block was reported there and proves nothing here."""
    name = path.name
    if not isinstance(schema, dict) or set(schema.keys()) != SCHEMA_LOCK_KEYS:
        return  # shape already reported by D3
    lock_path, recorded = schema["path"], schema["sha256"]
    if not isinstance(lock_path, str) or not isinstance(recorded, str) or not SHA256_RE.match(recorded):
        return  # shape already reported by D3
    located = git_root_and_rel(path)
    if located is None:
        checker.error(
            f"{name}: not inside a git repository — the schema lock cannot be verified"
        )
        return
    root, _rel = located
    target = root / lock_path
    # round-1 F2: a symlink inside the root pointing OUTSIDE it must never
    # satisfy the lock — the ratified bytes are the draft's own working
    # tree's, so the RESOLVED target must stay under the resolved root.
    if not target.resolve().is_relative_to(root.resolve()):
        checker.error(
            f"{name}: schema lock path '{lock_path}' resolves outside the draft's "
            f"repository — the lock binds the draft's own working tree bytes"
        )
        return
    if not target.is_file():
        checker.error(
            f"{name}: schema lock path '{lock_path}' does not exist in the working "
            f"tree — the ratified declaration file is missing (a broken lock is "
            f"LOUD, never a skip)"
        )
        return
    actual = hashlib.sha256(target.read_bytes()).hexdigest()
    if actual != recorded:
        checker.error(
            f"{name}: schema file '{lock_path}' bytes differ from the recorded "
            f"sha256 ({recorded[:12]}… recorded, {actual[:12]}… in the working "
            f"tree) — an edit of the declaration after ratification is an "
            f"unratified schema change until a new act records the new bytes"
        )


def _resolve_branch(root: Path, branch: str) -> str | None:
    """D8.4: the oracle branch as a REF — the local head first, else its
    origin/ tracking form (a fresh clone that fetched the preserved line
    must lint identically). Deliberately not a bare rev-parse: that
    would accept a tag or a raw sha as a 'branch'."""
    for ref in (f"refs/heads/{branch}", f"refs/remotes/origin/{branch}"):
        out = subprocess.run(
            ["git", "-C", str(root), "rev-parse", "--verify", "--quiet", ref],
            capture_output=True,
            text=True,
        )
        if out.returncode == 0 and out.stdout.strip():
            return out.stdout.strip()
    return None


def check_superseded_record(path: Path, block: object, checker: Checker) -> None:
    """D8.3–D8.5: the archival record's shape AND its pointers. Every
    field is a checkable claim about the world, checked here — the
    record is the machine lock, and a lock whose pointers do not
    resolve is broken, LOUD, never a skip."""
    name = path.name
    if not isinstance(block, dict) or set(block.keys()) != SUPERSEDED_KEYS:
        checker.error(
            f"{name}: superseded record must be an object with exactly keys "
            f"{sorted(SUPERSEDED_KEYS)} — no successor field: the successor "
            f"does not exist at flip time and an unverifiable reference is "
            f"the defect family this record exists to avoid"
        )
        return
    if not is_calendar_date(block["date"]):
        checker.error(
            f"{name}: superseded.date must be a YYYY-MM-DD string naming a real calendar day"
        )

    located = git_root_and_rel(path)
    if located is None:
        checker.error(
            f"{name}: not inside a git repository — the superseded record's "
            f"oracle pointers cannot be verified"
        )
        return
    root, _rel = located

    # D8.5: the forward thread must resolve where it is written — the
    # citation rule (an unverified citation is the citation-shaped form
    # of an unrun "measured") applied to the record's own pointer.
    plan = block["plan"]
    if not isinstance(plan, str) or not plan.strip() or plan.startswith("/") or ".." in plan:
        checker.error(
            f"{name}: superseded.plan must be a nonempty repo-relative path "
            f"(no absolute paths, no '..')"
        )
    elif not (root / plan).is_file():
        checker.error(
            f"{name}: superseded.plan path '{plan}' does not exist — the "
            f"record's forward thread must resolve at the point of writing"
        )

    branch = block["oracle_branch"]
    branch_sha = None
    if not isinstance(branch, str) or not branch.strip():
        checker.error(f"{name}: superseded.oracle_branch must be a nonempty string")
    else:
        branch_sha = _resolve_branch(root, branch)
        if branch_sha is None:
            checker.error(
                f"{name}: superseded.oracle_branch '{branch}' does not resolve to "
                f"a branch (neither refs/heads nor refs/remotes/origin) — the "
                f"preserved line is unreachable and the archival record is broken"
            )

    tip = block["oracle_tip"]
    if not isinstance(tip, str) or not FULL_SHA_RE.match(tip):
        checker.error(
            f"{name}: superseded.oracle_tip must be a 40-hex lowercase commit sha "
            f"(pinned FULL — an abbreviation is a prefix claim)"
        )
        return
    typ = subprocess.run(
        ["git", "-C", str(root), "cat-file", "-t", tip],
        capture_output=True,
        text=True,
    )
    obj_type = typ.stdout.strip() if typ.returncode == 0 else "unresolvable"
    if obj_type != "commit":
        checker.error(
            f"{name}: superseded.oracle_tip '{tip[:12]}' does not resolve to a "
            f"COMMIT (got '{obj_type}') — the archival record is broken"
        )
    elif branch_sha is not None:
        contained = subprocess.run(
            ["git", "-C", str(root), "merge-base", "--is-ancestor", tip, branch_sha],
            capture_output=True,
        )
        if contained.returncode != 0:
            checker.error(
                f"{name}: superseded.oracle_tip '{tip[:12]}' is NOT contained in "
                f"branch '{branch}' — the record names a tip the preserved line "
                f"does not carry"
            )


def check_draft(path: Path, checker: Checker) -> dict | None:
    """Returns {"status": str, "rows": set[str]} for cross-ref use, or None."""
    text = path.read_text(encoding="utf-8")
    blocks = json_blocks(text, path.name, checker)
    check_sole_top_level_key(path.name, blocks, checker)

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

    row_lines = c_row_lines(text)
    rows_list = [C_ROW_RE.match(line).group(1) for line in row_lines]  # type: ignore[union-attr]
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
    if status in EQUALITY_BOUND and not rows:
        checker.error(f"{path.name}: status {status} but no C-rows")

    # D8 the superseded record — ANY record present <=> status
    # superseded, both directions; the pointers verified where written.
    supersedes = block_by_key(blocks, "superseded")
    if supersedes and status != "superseded":
        checker.error(
            f"{path.name}: superseded record present on status '{status}' — the "
            f"record and the status flip land in ONE commit"
        )
    if status == "superseded":
        if len(supersedes) != 1:
            checker.error(
                f"{path.name}: status superseded requires exactly one superseded "
                f"record block, found {len(supersedes)}"
            )
        else:
            check_superseded_record(path, supersedes[0], checker)

    # D5 recorded-commit equality — bound at ratified/realized/
    # superseded, suspended ONLY at reopened.
    if status in EQUALITY_BOUND and ratifications:
        latest = ratifications[-1]
        commit = latest.get("commit") if isinstance(latest, dict) else None
        if isinstance(commit, str) and COMMIT_RE.match(commit):
            check_recorded_equality(path, commit, c_row_lines(text), checker)
        # D5b the schema lock — the LATEST block only, same statuses,
        # suspended only at reopened with D5 and for the same reason.
        if isinstance(latest, dict) and "schema" in latest:
            check_schema_lock(path, latest["schema"], checker)

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

    # The superseded-target token scan's inputs (ch13 boundary — the
    # ch11 pointer case): the C-row TABLE LINES and the realized_map
    # values are the two machine surfaces cross-contract tokens live
    # on; Context/prose sections deliberately stay out (history lives
    # there). Resolution needs the FULL drafts dict, so the scan
    # itself runs after collect_drafts — see scan_superseded_targets.
    map_obj = maps[0] if len(maps) == 1 and isinstance(maps[0], dict) else {}
    return {
        "status": status,
        "rows": rows,
        "name": path.name,
        "c_lines": row_lines,
        "map": map_obj,
    }


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
            # Two out-states, opposite reasons: reopened is CONTESTED
            # (a transient window, closed at re-ratification), superseded
            # is RETIRED (permanent — the anchor must move to the
            # successor surface, and the draft's own superseded record
            # names the oracle branch and the authorizing plan).
            why = ""
            if draft["status"] == "reopened":
                why = " (the contract is contested during a reopen)"
            elif draft["status"] == "superseded":
                why = (
                    " — the draft is superseded (terminal): this anchor must move "
                    "to the successor surface; the draft's superseded record names "
                    "the oracle branch and the plan that authorized the supersede"
                )
            checker.error(
                f"{label} '{ref}' — draft status is '{draft['status']}', anchors "
                f"need ratified-or-later" + why
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


def check_mirror_map(
    name: str,
    text: str,
    blocks: list[dict],
    prose: str,
    checker: Checker,
) -> None:
    """P11: the pointer-only register. Gates ONLY declaring packets —
    a packet without the mirror_map block is untouched (declaration
    grandfathering); the silent-demotion hole is closed textually like
    P1 (naming the block with a malformed fence is red, not a skip).
    Every check compares declared literals against bytes: register
    shape, canonical existence, pointer resolution, and signature
    confinement (a signature string may occur only on its canonical
    line, an anchor-bearing line, or an allow-listed line — pointer-
    bearing lines are deliberately NOT exempt: a restatement beside
    its own pointer is the loophole that exemption would open)."""
    maps = block_by_key(blocks, "mirror_map")
    if not maps:
        # The anti-demotion guard reads MACHINE-BLOCK raws only (arm
        # finding 10): a prose mention or a markdown-quoted example of
        # the identifier must not opt a packet in, while a malformed
        # declaration fence still must not silently un-gate.
        if any('"mirror_map"' in raw for raw in _scan_fences(text)[1]):
            checker.error(
                f"{name}: names mirror_map but no parseable mirror_map "
                f"block found — a malformed register must not silently "
                f"un-gate the pointer dimension"
            )
        return
    if len(maps) > 1:
        checker.error(f"{name}: {len(maps)} mirror_map blocks; exactly one allowed")
    mirror = maps[0]
    if not isinstance(mirror, dict) or set(mirror.keys()) != MIRROR_MAP_KEYS:
        checker.error(
            f"{name}: mirror_map must be an object with exactly keys "
            f"{sorted(MIRROR_MAP_KEYS)}"
        )
        return
    if mirror["form"] != "pointer-only":
        checker.error(
            f"{name}: mirror_map.form '{mirror['form']}' — the one "
            f"declared form is 'pointer-only' (future forms arrive by "
            f"extending this check, never by silent acceptance)"
        )
        return
    rules = mirror["rules"]
    if not isinstance(rules, list) or not rules:
        checker.error(f"{name}: mirror_map.rules must be a nonempty list")
        return

    # The P5 scan's table-defined lane ids — canonical targets.
    # Reserved lane families are excluded exactly as P5 excludes them
    # (arm finding 4): a packet-title-style P-row is never a canonical.
    doc_ids: set[str] = set()
    for line in prose.splitlines():
        m = LANE_DEF_RE.match(line)
        if m and m.group(1) not in EXCLUDED_LANE_FAMILIES:
            doc_ids.add(f"{m.group(1)}{m.group(2)}")

    prose_lines = prose.splitlines()

    # Headings + their section ranges, for anchor-slug validation
    # (arm finding 2): a slug must name a real heading whose section
    # holds the token, or the canonical points readers nowhere. A
    # section runs to the next heading of the SAME OR HIGHER level —
    # child subsections belong to their parent (arm re-run finding 3).
    headings: list[tuple[int, int, str]] = []
    for i, ln in enumerate(prose_lines):
        hm = MIRROR_HEADING_RE.match(ln)
        if hm:
            headings.append((i, len(hm.group(1)), _mirror_kebab(hm.group(2))))

    def slug_sections(slug: str) -> list[tuple[int, int]]:
        spans: list[tuple[int, int]] = []
        for idx, (start, level, kebab) in enumerate(headings):
            if kebab == slug or kebab.startswith(slug + "-"):
                end = len(prose_lines)
                for nstart, nlevel, _nk in headings[idx + 1 :]:
                    if nlevel <= level:
                        end = nstart
                        break
                spans.append((start, end))
        # A matched CHILD heading nested inside a matched parent's span
        # is the same home, not an ambiguity — keep outermost spans
        # only; the ambiguity error is for DISJOINT matches.
        return [
            s
            for s in spans
            if not any(o != s and o[0] <= s[0] and s[1] <= o[1] for o in spans)
        ]
    rule_ids: list[str] = []
    checked_rules: list[dict] = []
    for rule in rules:
        if not isinstance(rule, dict) or set(rule.keys()) != MIRROR_RULE_KEYS:
            checker.error(
                f"{name}: every mirror_map rule must be an object with "
                f"exactly keys {sorted(MIRROR_RULE_KEYS)}"
            )
            continue
        rid = rule["id"]
        if not isinstance(rid, str) or not MIRROR_RULE_ID_RE.match(rid):
            checker.error(
                f"{name}: mirror_map rule id '{rid}' is not kebab-grammar "
                f"shaped (^[a-z][a-z0-9-]*$)"
            )
            continue
        rule_ids.append(rid)
        sig = rule["signature"]
        if (
            not isinstance(sig, list)
            or not sig
            or not all(isinstance(s, str) and s for s in sig)
        ):
            checker.error(
                f"{name}: mirror_map rule '{rid}' signature must be a "
                f"NONEMPTY list of nonempty strings — an empty signature "
                f"leaves the rule unguarded (the confinement check would "
                f"hold vacuously)"
            )
            continue
        allow = rule["allow"]
        if not isinstance(allow, list) or not all(isinstance(a, str) and a for a in allow):
            checker.error(
                f"{name}: mirror_map rule '{rid}' allow must be a list of "
                f"nonempty strings (empty list = no exemptions)"
            )
            continue
        canonical = rule["canonical"]
        anchor_token: str | None = None
        if not isinstance(canonical, str):
            checker.error(f"{name}: mirror_map rule '{rid}' canonical must be a string")
            continue
        if MANIFEST_ID_RE.match(canonical):
            if canonical not in doc_ids:
                checker.error(
                    f"{name}: mirror_map rule '{rid}' canonical '{canonical}' "
                    f"is not a table-defined lane id in this packet"
                )
                continue
        else:
            am = MIRROR_ANCHOR_RE.match(canonical)
            if am is None:
                checker.error(
                    f"{name}: mirror_map rule '{rid}' canonical '{canonical}' "
                    f"is neither a table-defined lane id nor a strict-kebab "
                    f"<slug>#<Token> section anchor"
                )
                continue
            slug, anchor_token = am.group(1), am.group(2)
            spans = slug_sections(slug)
            if not spans:
                checker.error(
                    f"{name}: mirror_map rule '{rid}' anchor slug '{slug}' "
                    f"names no heading of this packet — the canonical must "
                    f"point at a real section"
                )
                continue
            if len(spans) > 1:
                checker.error(
                    f"{name}: mirror_map rule '{rid}' anchor slug '{slug}' "
                    f"matches {len(spans)} headings — an ambiguous canonical "
                    f"identifies no home; lengthen the slug until it names "
                    f"exactly one section (arm re-run finding 1)"
                )
                continue
            token_re = re.compile(rf"\b{re.escape(anchor_token)}\b")
            in_section = any(
                token_re.search(prose_lines[i])
                for lo, hi in spans
                for i in range(lo, hi)
            )
            if not in_section:
                checker.error(
                    f"{name}: mirror_map rule '{rid}' anchor token "
                    f"'{anchor_token}' does not occur inside the "
                    f"'{slug}' section — the canonical home must exist "
                    f"where its anchor says it does"
                )
                continue
            anchor_spans = spans
        checked_rules.append(
            {"id": rid, "canonical": canonical, "anchor": anchor_token,
             "spans": anchor_spans if anchor_token else [],
             "signature": sig, "allow": allow}
        )

    dupes = sorted({r for r in rule_ids if rule_ids.count(r) > 1})
    if dupes:
        checker.error(f"{name}: duplicate mirror_map rule ids {dupes}")

    # Pointer resolution: every arrow-bracket token outside fences is
    # scanned; only the canonical U+2192 arrow resolves — a lookalike
    # arrow is a reader-visible pointer the dimension would otherwise
    # silently ignore (arm finding 9).
    declared = set(rule_ids)
    for m in POINTER_ARROWISH_RE.finditer(prose):
        arrow, target = m.group(1), m.group(2)
        if arrow != "→":
            checker.error(
                f"{name}: pointer-like token '{arrow}[{target}]' uses a "
                f"non-canonical arrow — pointers are written with U+2192 "
                f"'→' only, or a reader sees a pointer the lint does not"
            )
        elif target not in declared:
            checker.error(
                f"{name}: pointer token '→[{target}]' resolves to no "
                f"mirror_map rule — a dangling pointer is a broken mirror"
            )

    # Signature confinement. Legal lines for a rule's signature string:
    # the canonical lane's own table row, the anchor token's PARAGRAPH
    # (a canonical statement wraps across lines; the paragraph — the
    # token line's contiguous non-blank block — is the mechanical
    # widest form that still reads no semantics), or a line matching
    # an allow substring at a non-alphanumeric boundary. NOTHING else —
    # in particular a pointer-bearing line is not exempt. TWO arm-fed
    # tightenings: a TABLE ROW is its own paragraph (a token in one
    # row must not legalize the whole table — finding 3), and each
    # signature must actually OCCUR at its canonical home (a typo'd or
    # obsolete literal guards nothing — finding 1).
    blank = [not ln.strip() for ln in prose_lines]
    table_row = [bool(re.match(r"^ {0,3}\|", ln)) for ln in prose_lines]

    def paragraph_indices(idx: int) -> set[int]:
        if table_row[idx]:
            return {idx}
        lo = idx
        while lo > 0 and not blank[lo - 1] and not table_row[lo - 1]:
            lo -= 1
        hi = idx
        while hi + 1 < len(prose_lines) and not blank[hi + 1] and not table_row[hi + 1]:
            hi += 1
        return set(range(lo, hi + 1))

    def allow_hits(line: str, allow: list[str]) -> bool:
        for a in allow:
            if re.search(
                rf"(?<![A-Za-z0-9]){re.escape(a)}(?![A-Za-z0-9])", line
            ):
                return True
        return False

    for rule in checked_rules:
        anchor_legal: set[int] = set()
        if rule["anchor"]:
            anchor_re = re.compile(rf"\b{re.escape(rule['anchor'])}\b")
            for lo, hi in rule["spans"]:
                for i in range(lo, hi):
                    if anchor_re.search(prose_lines[i]):
                        anchor_legal |= paragraph_indices(i)
        for sig in rule["signature"]:
            at_home = False
            for i, line in enumerate(prose_lines):
                if sig not in line:
                    continue
                lane = LANE_DEF_RE.match(line)
                if lane and f"{lane.group(1)}{lane.group(2)}" == rule["canonical"]:
                    at_home = True
                    continue
                if i in anchor_legal:
                    at_home = True
                    continue
                if allow_hits(line, rule["allow"]):
                    continue
                snippet = line.strip()[:60]
                checker.error(
                    f"{name}: mirror_map rule '{rule['id']}' signature "
                    f"'{sig}' restated outside its canonical home "
                    f"('{snippet}…') — mirrors are pointers, never prose; "
                    f"add an explicit allow entry only for an audited "
                    f"exemption"
                )
            if not at_home:
                checker.error(
                    f"{name}: mirror_map rule '{rule['id']}' signature "
                    f"'{sig}' does not occur at its canonical home — a "
                    f"typo'd or obsolete literal guards nothing, so the "
                    f"rule would be silently unguarded"
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
    check_mirror_map(path.name, text, blocks, prose, checker)

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
    # The build-close METRICS GATE (ch13 boundary — the p1b
    # missing-block breach): P7 leaves a MISSING packet_metrics block
    # silently green on the plain lint path (the block is optional
    # there by design — it does not exist until close), so the
    # build-close audit is the one place the §5.5 convention can bind:
    # the packet's bytes AT THE AUDITED COMMIT carry exactly one
    # block, and a ch13+ packet's block carries main_thread_model.
    metrics_blocks = block_by_key(blocks, "packet_metrics")
    if len(metrics_blocks) == 0:
        checker.error(
            f"{packet_path.name}: packet_metrics missing at build close — the "
            f"block is written once at build close (the §5.5 convention); the "
            f"audited commit's packet bytes must carry exactly one "
            f"packet_metrics block (ch13 boundary — the p1b missing-block "
            f"breach)"
        )
    elif len(metrics_blocks) > 1:
        checker.error(
            f"{packet_path.name}: {len(metrics_blocks)} packet_metrics blocks "
            f"at the audited commit; exactly one — the block is written once "
            f"at build close (the §5.5 convention)"
        )
    elif not isinstance(metrics_blocks[0], dict):
        # Arm fold (2026-08-14 review, finding 1): a non-object value —
        # {"packet_metrics": "not-an-object"} — satisfied the exactly-one
        # count while the required field could not even exist. The gate
        # refuses the shape here; the DEEP schema stays P7's job.
        checker.error(
            f"{packet_path.name}: packet_metrics at the audited commit is "
            f"not an object — the block's value must be an object (the "
            f"exactly-one gate is not satisfiable by a non-object value)"
        )
    else:
        chapter_m = re.match(r"ch(\d+)-", packet_path.name)
        if (
            chapter_m is not None
            and int(chapter_m.group(1)) >= 13
            and "main_thread_model" not in metrics_blocks[0]
        ):
            checker.error(
                f"{packet_path.name}: packet_metrics at the audited commit "
                f"lacks main_thread_model — required at build close for ch13+ "
                f"(ch13 boundary — the p1b missing-block breach); the key "
                f"stays optional on the plain lint path and for pre-ch13 "
                f"chapters"
            )
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


def collect_drafts(
    contracts_dir: Path, checker: Checker
) -> tuple[dict[str, dict], list[str], list[str]]:
    """(drafts by slug, reopened names, superseded names) — D6 and D8.9
    both want the NAMES in the summary."""
    drafts: dict[str, dict] = {}
    reopened: list[str] = []
    superseded: list[str] = []
    if not contracts_dir.is_dir():
        return drafts, reopened, superseded
    for path in sorted(contracts_dir.glob("*.md")):
        if path.name == "README.md":
            continue
        info = check_draft(path, checker)
        if info is not None:
            if info["status"] == "reopened":
                reopened.append(path.name)
            elif info["status"] == "superseded":
                superseded.append(path.name)
            m = DRAFT_NAME_RE.match(path.name)
            if m:
                drafts[f"{m.group(1)}-{m.group(2)}"] = info
    return drafts, reopened, superseded


def scan_superseded_targets(drafts: dict[str, dict], checker: Checker) -> None:
    """The superseded-target token scan (ch13 boundary — the ch11
    pointer case), REPORT-ONLY: packet manifest refs REFUSE a
    superseded target (P4/D8.7), but cross-contract contract:<surface>#Cn
    tokens in CONTRACT files' C-row lines and realized_map values were
    scanned by nothing — the LEAVE-WITH-RECORD items stayed invisible.
    Every ratified-or-later draft's two machine surfaces (C-row TABLE
    LINES, realized_map string values) are scanned with the P10 token
    regex; a token whose target draft is superseded emits a NOTE on the
    note: channel — NEVER an error: leaving a recorded pointer in place
    is a legitimate, deliberate state (the target's own record names
    what happened), and this scan exists to keep it VISIBLE, not to
    forbid it. Context/prose sections are not scanned — history
    deliberately lives there."""

    def resolve(surface: str) -> dict | None:
        if surface in drafts:
            return drafts[surface]
        # A token written without the ch<N>- prefix resolves to the
        # unique ch*-<surface> draft; ambiguity or no match stays
        # silent — the scan is report-only, never a near-miss oracle.
        matches = [k for k in drafts if re.fullmatch(rf"ch\d+-{re.escape(surface)}", k)]
        return drafts[matches[0]] if len(matches) == 1 else None

    def bounded(text: str, m: "re.Match[str]") -> bool:
        # Arm fold (2026-08-14 review, finding 4): CONTRACT_TOKEN_RE has
        # no trailing boundary, so `contract:x#C1oops` prefix-matched as
        # a valid token. A match immediately followed by an alphanumeric
        # is a lookalike, not a token — skipped, report-only either way.
        end = m.end()
        return end >= len(text) or not text[end].isalnum()

    def emit(name: str, where: str, token: str) -> None:
        checker.note(
            f"{name} {where}: token {token} targets a SUPERSEDED draft "
            f"(recorded successor may exist — see the target's record)"
        )

    seen: set[tuple[str, str, str]] = set()
    for _slug, info in sorted(drafts.items()):
        if info["status"] == "draft":
            continue
        name = info["name"]
        for line in info["c_lines"]:
            row_id = C_ROW_RE.match(line).group(1)  # type: ignore[union-attr]
            for m in CONTRACT_TOKEN_RE.finditer(line):
                if not bounded(line, m):
                    continue
                target = resolve(m.group(1))
                if target is not None and target["status"] == "superseded":
                    key = (name, f"row {row_id}", m.group(0))
                    if key not in seen:
                        seen.add(key)
                        emit(*key)
        for map_key in sorted(info["map"]):
            value = info["map"][map_key]
            if not isinstance(value, str):
                continue
            for m in CONTRACT_TOKEN_RE.finditer(value):
                if not bounded(value, m):
                    continue
                target = resolve(m.group(1))
                if target is not None and target["status"] == "superseded":
                    key = (name, f"realized_map['{map_key}']", m.group(0))
                    if key not in seen:
                        seen.add(key)
                        emit(*key)


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
    drafts, reopened, superseded = collect_drafts(contracts_dir, checker)
    scan_superseded_targets(drafts, checker)
    # D8: superseded deliberately does NOT join this gate — it is a
    # PERMANENT resting state, so gating on it would red every future
    # approve, close and flip. Its enforcement is anchor-side.
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
        "superseded": superseded,  # …and D8.9 says the same for these
        "notes": checker.notes,  # report-only channel (superseded-target scan)
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
    for msg in stats["notes"]:
        print(f"packet-lint note: {msg}")
    reopened = stats["reopened"]
    reopened_note = f"{len(reopened)} reopened" + (f": {', '.join(reopened)}" if reopened else "")
    superseded = stats["superseded"]
    superseded_note = f"{len(superseded)} superseded" + (
        f": {', '.join(superseded)}" if superseded else ""
    )
    print(
        f"packet-lint: {stats['v2']} v2 packet(s) linted, "
        f"{stats['grandfathered']} pre-v2 grandfathered, "
        f"{stats['drafts']} draft(s) linted "
        f"({reopened_note}, {superseded_note}), "
        f"{len(errors)} error(s), {len(stats['notes'])} note(s)"
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

SUPERSEDED_TMPL = """
```json
{"superseded": {"date": "2026-08-03", "oracle_branch": "%BRANCH%", "oracle_tip": "%TIP%", "plan": "%PLAN%"}}
```
"""

# The fixture's preserved line and authorizing plan (D8.4/D8.5).
ORACLE_BRANCH = "oracle-line-fixture"
ORACLE_PLAN = "plan-fixture.md"

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


def build_superseded_fixture() -> tuple[tempfile.TemporaryDirectory, Path, Path, Path, str, str] | None:
    """The supersede act enacted on the green fixture: a preserved line
    (a branch whose tip carries the plan), then ONE commit flipping
    ratified -> superseded and appending the record — C-rows untouched,
    so the equality lock holds across the flip. Returns (tmpdir, root,
    draft_path, packet_path, superseded_text, off_branch_sha); the last
    is the flip commit itself, which is by construction NOT contained in
    the oracle branch (D8.4's containment negative)."""
    fixture = build_green_fixture()
    if fixture is None:
        return None
    tmp, root, draft, packet, green = fixture
    (root / ORACLE_PLAN).write_text("the authorizing re-derivation plan\n", encoding="utf-8")
    if not (
        _git_ok(root, "add", "-A")
        and _git_ok(root, "commit", "-q", "-m", "plan")
        and _git_ok(root, "branch", ORACLE_BRANCH)
    ):
        tmp.cleanup()
        return None
    tip = _git_out(root, "rev-parse", ORACLE_BRANCH)
    text = green.replace('"status": "ratified"', '"status": "superseded"') + (
        SUPERSEDED_TMPL.replace("%BRANCH%", ORACLE_BRANCH)
        .replace("%TIP%", tip)
        .replace("%PLAN%", ORACLE_PLAN)
    )
    draft.write_text(text, encoding="utf-8")
    if not (_git_ok(root, "add", "-A") and _git_ok(root, "commit", "-q", "-m", "supersede")):
        tmp.cleanup()
        return None
    return tmp, root, draft, packet, text, _git_out(root, "rev-parse", "HEAD")


# The pinned size of the red-fixture register (see the check at the end
# of run_selftest for why a printed number was not enough).
EXPECTED_RED_DIMS = 143


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

    # ---- P11 mirror_map pointer register (ch13 boundary)
    PTR_RULES = (
        '{"id": "demo-rule", "canonical": "O1",\n'
        '   "signature": ["SIGTOKEN alpha"], "allow": []},\n'
        '  {"id": "anchor-rule", "canonical": "probe-record#CBX",\n'
        '   "signature": ["ANCHTOKEN beta"], "allow": ["allowed-line-marker"]}'
    )

    def ptr_packet(rules: str, extra: str = "") -> str:
        return (
            GREEN_PACKET.replace("| O1 | a |", "| O1 | a — SIGTOKEN alpha |")
            + "\nPointer form: →[demo-rule] · →[anchor-rule]\n"
            + "\n## Probe record\n"
            + "\nprobe record CBX: ANCHTOKEN beta, measured.\n"
            + "\nallowed-line-marker: ANCHTOKEN beta echoes by exemption.\n"
            + extra
            + '\n```json\n{"mirror_map": {"form": "pointer-only", "rules": [\n  '
            + rules
            + "\n]}}\n```\n"
        )

    GREEN_PTR_PACKET = ptr_packet(PTR_RULES)
    shared_packet.write_text(GREEN_PTR_PACKET, encoding="utf-8")
    errors, _ = lint(shared_root / "packets", shared_root / "contracts", ADR_DIR)
    expect_green("pointer-register-green", errors)
    shared_packet.write_text(GREEN_PACKET, encoding="utf-8")
    # Declaration scoping (the grandfathering direction): a packet
    # WITHOUT the block is untouched — stray pointer tokens and
    # would-be signature text included.
    shared_packet.write_text(
        GREEN_PACKET + "\nStray →[whatever] beside SIGTOKEN alpha prose.\n",
        encoding="utf-8",
    )
    errors, _ = lint(shared_root / "packets", shared_root / "contracts", ADR_DIR)
    expect_green("pointer-register-not-declaring-untouched", errors)
    shared_packet.write_text(GREEN_PACKET, encoding="utf-8")
    expect_red_packet(
        "ptr-map-malformed-fence",
        GREEN_PACKET + '\n```json\n{"mirror_map": {broken\n```\n',
        "names mirror_map but no parseable",
    )
    expect_red_packet(
        "ptr-map-extra-key",
        GREEN_PTR_PACKET.replace(
            '"form": "pointer-only", "rules"',
            '"form": "pointer-only", "extra": 1, "rules"',
        ),
        "mirror_map must be an object with exactly keys",
    )
    expect_red_packet(
        "ptr-map-bad-form",
        GREEN_PTR_PACKET.replace('"form": "pointer-only"', '"form": "loose"'),
        "the one declared form is 'pointer-only'",
    )
    expect_red_packet(
        "ptr-map-duplicate-rule-id",
        GREEN_PTR_PACKET.replace('"id": "anchor-rule"', '"id": "demo-rule"'),
        "duplicate mirror_map rule ids",
    )
    expect_red_packet(
        "ptr-map-empty-signature",
        GREEN_PTR_PACKET.replace('"signature": ["SIGTOKEN alpha"]', '"signature": []'),
        "leaves the rule unguarded",
    )
    expect_red_packet(
        "ptr-map-canonical-unknown-lane",
        GREEN_PTR_PACKET.replace('"canonical": "O1"', '"canonical": "Z9"'),
        "not a table-defined lane id",
    )
    expect_red_packet(
        "ptr-map-anchor-token-missing",
        GREEN_PTR_PACKET.replace("probe-record#CBX", "probe-record#NOPE"),
        "anchor token 'NOPE' does not occur inside the 'probe-record' section",
    )
    expect_red_packet(
        "ptr-map-anchor-fake-slug",
        GREEN_PTR_PACKET.replace("probe-record#CBX", "nonexistent-section#CBX"),
        "names no heading of this packet",
    )
    expect_red_packet(
        "ptr-map-duplicate-blocks",
        GREEN_PTR_PACKET
        + '\n```json\n{"mirror_map": {"form": "pointer-only", "rules": [\n  '
        + PTR_RULES
        + "\n]}}\n```\n",
        "mirror_map blocks; exactly one",
    )
    expect_red_packet(
        "ptr-map-bad-rule-id-grammar",
        GREEN_PTR_PACKET.replace('"id": "demo-rule"', '"id": "demo--rule-"'),
        "not kebab-grammar shaped",
    )
    expect_red_packet(
        "ptr-map-empty-rules",
        ptr_packet(PTR_RULES).replace(
            '"rules": [\n  ' + PTR_RULES + "\n]", '"rules": []'
        ),
        "nonempty list",
    )
    expect_red_packet(
        "ptr-map-rule-extra-key",
        GREEN_PTR_PACKET.replace(
            '"signature": ["SIGTOKEN alpha"], "allow": []',
            '"signature": ["SIGTOKEN alpha"], "allow": [], "extra": 1',
        ),
        "exactly keys",
    )
    expect_red_packet(
        "ptr-map-empty-signature-member",
        GREEN_PTR_PACKET.replace(
            '"signature": ["SIGTOKEN alpha"]', '"signature": ["SIGTOKEN alpha", ""]'
        ),
        "NONEMPTY list of nonempty strings",
    )
    expect_red_packet(
        "ptr-map-allow-not-list",
        GREEN_PTR_PACKET.replace(
            '"signature": ["SIGTOKEN alpha"], "allow": []',
            '"signature": ["SIGTOKEN alpha"], "allow": "x"',
        ),
        "allow must be a list",
    )
    expect_red_packet(
        "ptr-map-canonical-not-string",
        GREEN_PTR_PACKET.replace('"canonical": "O1"', '"canonical": 1'),
        "canonical must be a string",
    )
    expect_red_packet(
        "ptr-map-reserved-family-canonical",
        GREEN_PTR_PACKET.replace("| O1 | a — SIGTOKEN alpha |", "| O1 | a |\n| P1 | SIGTOKEN alpha |")
        .replace('"canonical": "O1"', '"canonical": "P1"'),
        "not a table-defined lane id",
    )
    expect_red_packet(
        "ptr-map-signature-absent-at-home",
        GREEN_PTR_PACKET.replace(
            '"signature": ["SIGTOKEN alpha"]', '"signature": ["SIGTOKEN vanished"]'
        ),
        "does not occur at its canonical home",
    )
    expect_red_packet(
        "ptr-map-table-paragraph-leak",
        ptr_packet(
            PTR_RULES
            + ',\n  {"id": "table-rule", "canonical": "probe-record#CBT",\n'
            '   "signature": ["LEAKSIG body"], "allow": []}',
            extra="\n| r1 | CBT anchor LEAKSIG body |\n| r2 | LEAKSIG body |\n",
        ),
        "mirror_map rule 'table-rule' signature 'LEAKSIG body' restated",
    )
    expect_red_packet(
        "ptr-map-allow-boundary-overmatch",
        ptr_packet(
            PTR_RULES.replace(
                '"signature": ["SIGTOKEN alpha"], "allow": []',
                '"signature": ["SIGTOKEN alpha"], "allow": ["AUDITED"]',
            ),
            extra="\nUNAUDITED mirror: SIGTOKEN alpha here.\n",
        ),
        "restated outside its canonical home",
    )
    expect_red_packet(
        "ptr-map-noncanonical-arrow",
        GREEN_PTR_PACKET + "\nSee ⇒[demo-rule] for details.\n",
        "non-canonical arrow",
    )
    expect_red_packet(
        "ptr-map-arrow-block-lookalike",
        GREEN_PTR_PACKET + "\nSee ➝[not-declared] for details.\n",
        "non-canonical arrow",
    )
    # The round-3 escapees: the Misc Symbols and Arrows block runs to
    # U+2BFF, not U+2B4F — each once-escaping witness is pinned red.
    for arrow in ("⭢", "⮕", "⯮"):
        expect_red_packet(
            f"ptr-map-arrow-2bxx-{ord(arrow):x}",
            GREEN_PTR_PACKET + f"\nSee {arrow}[not-declared] for details.\n",
            "non-canonical arrow",
        )
    expect_red_packet(
        "ptr-map-ambiguous-anchor-slug",
        ptr_packet(
            PTR_RULES.replace("probe-record#CBX", "probe#CBX"),
            extra="\n## Probe extras\n\nmore prose here.\n",
        ),
        "matches 2 headings",
    )
    # Level-aware sections: a token in a CHILD subsection satisfies the
    # PARENT slug (arm re-run finding 3's false red, fixed).
    shared_packet.write_text(
        ptr_packet(PTR_RULES).replace(
            "\nprobe record CBX: ANCHTOKEN beta, measured.\n",
            "\n### Probe record child\n\nprobe record CBX: ANCHTOKEN beta, measured.\n",
        ),
        encoding="utf-8",
    )
    errors, _ = lint(shared_root / "packets", shared_root / "contracts", ADR_DIR)
    expect_green("ptr-map-nested-subsection-token", errors)
    shared_packet.write_text(GREEN_PACKET, encoding="utf-8")
    # Finding-10 greens: a prose mention or a markdown-QUOTED example
    # of the identifier neither opts a packet in nor reds it.
    shared_packet.write_text(
        GREEN_PACKET + "\nThe mirror_map convention is described elsewhere.\n",
        encoding="utf-8",
    )
    errors, _ = lint(shared_root / "packets", shared_root / "contracts", ADR_DIR)
    expect_green("ptr-map-prose-mention-untouched", errors)
    shared_packet.write_text(
        GREEN_PACKET
        + '\n````markdown\n```json\n{"mirror_map": {broken\n```\n````\n',
        encoding="utf-8",
    )
    errors, _ = lint(shared_root / "packets", shared_root / "contracts", ADR_DIR)
    expect_green("ptr-map-quoted-example-untouched", errors)
    shared_packet.write_text(GREEN_PACKET, encoding="utf-8")
    expect_red_packet(
        "ptr-map-dangling-pointer",
        GREEN_PTR_PACKET + "\nSee →[nope] for details.\n",
        "resolves to no mirror_map rule",
    )
    expect_red_packet(
        "ptr-map-signature-restated",
        GREEN_PTR_PACKET + "\nBut SIGTOKEN alpha stated again in prose.\n",
        "restated outside its canonical home",
    )
    # The closed loophole: a restatement sharing a line with its own
    # pointer is still red — pointer-bearing lines carry no exemption.
    expect_red_packet(
        "ptr-map-signature-on-pointer-line",
        GREEN_PTR_PACKET + "\nSIGTOKEN alpha →[demo-rule]\n",
        "restated outside its canonical home",
    )
    # Anchor legality is PARAGRAPH-scoped (a canonical statement wraps
    # across lines) — but a restatement in a DIFFERENT paragraph is
    # still red.
    expect_red_packet(
        "ptr-map-anchor-signature-other-paragraph",
        GREEN_PTR_PACKET + "\nANCHTOKEN beta restated far away in prose.\n",
        "restated outside its canonical home",
    )

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
        "ratification-impossible-calendar-date",
        lambda g: g.replace('"date": "2026-07-09"', '"date": "2026-13-40"'),
        "real calendar day",
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

    # ---- D3/D5b the schema lock (user-ratified 2026-08-08)
    def _schema_lock_fixture(name: str, schema_json, write_file: bool, substr: str | None) -> None:
        """A green draft whose latest block carries a schema lock over a
        fixture declaration file; `schema_json` is a callable taking the
        file's true sha256 and returning the block's schema object text."""
        fixture = build_green_fixture()
        if fixture is None:
            failures.append(f"selftest fixture setup failed: {name}")
            return
        tmp, root, draft, _packet, green = fixture
        decl = root / "schema-fixture.ts"
        if write_file:
            decl.write_text("export const declaration = { frozen: true };\n", encoding="utf-8")
        true_sha = hashlib.sha256(decl.read_bytes()).hexdigest() if write_file else "0" * 64
        locked = green.replace(
            '"arms": ["a", "b"], "commit"',
            f'"arms": ["a", "b"], "schema": {schema_json(true_sha)}, "commit"',
        )
        draft.write_text(locked, encoding="utf-8")
        errors, _ = lint(root / "packets", root / "contracts", ADR_DIR)
        if substr is None:
            expect_green(name, errors)
        else:
            assert_red(name, errors, substr)
        tmp.cleanup()

    _schema_lock_fixture(
        "schema-lock-bad-keyset",
        lambda sha: '{"path": "schema-fixture.ts"}',
        True,
        "schema must be an object with exactly keys",
    )
    _schema_lock_fixture(
        "schema-lock-bad-sha-shape",
        lambda sha: '{"path": "schema-fixture.ts", "sha256": "xyz"}',
        True,
        "64-character lowercase-hex sha256",
    )
    _schema_lock_fixture(
        "schema-lock-path-missing",
        lambda sha: f'{{"path": "no-such-file.ts", "sha256": "{sha}"}}',
        True,
        "does not exist in the working tree",
    )
    _schema_lock_fixture(
        "schema-lock-hash-mismatch",
        lambda sha: f'{{"path": "schema-fixture.ts", "sha256": "{"f" * 64}"}}',
        True,
        "bytes differ from the recorded sha256",
    )
    _schema_lock_fixture(
        "schema-lock-green",
        lambda sha: f'{{"path": "schema-fixture.ts", "sha256": "{sha}"}}',
        True,
        None,
    )

    def _schema_lock_symlink_escape() -> None:
        # round-1 F2: a symlink inside the root pointing OUTSIDE it must
        # never satisfy the lock, even with the outside bytes' true hash.
        fixture = build_green_fixture()
        if fixture is None:
            failures.append("selftest fixture setup failed: schema-lock-symlink-escape")
            return
        tmp, root, draft, _packet, green = fixture
        outside = root.parent / (root.name + "-outside.ts")
        outside.write_text("outside declaration\n", encoding="utf-8")
        (root / "schema-link.ts").symlink_to(outside)
        true_sha = hashlib.sha256(outside.read_bytes()).hexdigest()
        locked = green.replace(
            '"arms": ["a", "b"], "commit"',
            f'"arms": ["a", "b"], "schema": {{"path": "schema-link.ts", "sha256": "{true_sha}"}}, "commit"',
        )
        draft.write_text(locked, encoding="utf-8")
        errors, _ = lint(root / "packets", root / "contracts", ADR_DIR)
        assert_red("schema-lock-symlink-escape", errors, "resolves outside the draft's repository")
        outside.unlink()
        tmp.cleanup()

    _schema_lock_symlink_escape()

    def _schema_lock_dotted_filename_green() -> None:
        # round-1 F1: ".." INSIDE a filename is not a parent segment — a
        # regular file named schema..fixture.ts with its true hash is green.
        fixture = build_green_fixture()
        if fixture is None:
            failures.append("selftest fixture setup failed: schema-lock-dotted-filename")
            return
        tmp, root, draft, _packet, green = fixture
        decl = root / "schema..fixture.ts"
        decl.write_text("export const declaration = { frozen: true };\n", encoding="utf-8")
        true_sha = hashlib.sha256(decl.read_bytes()).hexdigest()
        locked = green.replace(
            '"arms": ["a", "b"], "commit"',
            f'"arms": ["a", "b"], "schema": {{"path": "schema..fixture.ts", "sha256": "{true_sha}"}}, "commit"',
        )
        draft.write_text(locked, encoding="utf-8")
        errors, _ = lint(root / "packets", root / "contracts", ADR_DIR)
        expect_green("schema-lock-dotted-filename-green", errors)
        tmp.cleanup()

    _schema_lock_dotted_filename_green()

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
    expect_red_draft(
        "realized-map-block-with-sibling-key",
        lambda g: g.replace('"status": "ratified"', '"status": "realized"')
        + '\n```json\n{"note": "landed everywhere", "realized_map": {"C1": "landed", "C2": "landed"}}\n```\n',
        "sibling top-level key(s) ['note']",
    )

    # ---- D8 the superseded terminal status (ch13 re-derivation P1)
    def expect_red_superseded(name: str, mutate, substr: str, commit: bool = False) -> None:
        """Fresh superseded fixture per dim, PACKET REMOVED — the
        anchor dim owns that redness, so a draft-side claim proves
        itself against an otherwise-green tree."""
        fixture = build_superseded_fixture()
        if fixture is None:
            failures.append(f"selftest fixture setup failed: {name}")
            return
        tmp, root, draft, packet, text, off_sha = fixture
        packet.unlink()
        draft.write_text(mutate(text, off_sha), encoding="utf-8")
        if commit:
            _git_ok(root, "add", "-A")
            _git_ok(root, "commit", "-q", "-m", name)
        errors, _ = lint(root / "packets", root / "contracts", ADR_DIR)
        assert_red(name, errors, substr)
        tmp.cleanup()

    RECORD_HEAD = '\n```json\n{"superseded"'

    # D8.1 green + D8.7 anchor + D8.9 summary + the not-a-gate decision
    fixture = build_superseded_fixture()
    if fixture is None:
        failures.append("selftest fixture setup failed: supersede-choreography")
    else:
        tmp, root, draft, packet3, _text, _off = fixture
        # D8.7: an anchor into a superseded draft is red, with the
        # DEDICATED message (asserted on its content, not just redness)
        errors, _ = lint(root / "packets", root / "contracts", ADR_DIR)
        assert_red(
            "ref-target-superseded-draft", errors, "the draft is superseded (terminal)"
        )
        # D8.1: the draft ITSELF is green in the terminal state
        packet3.unlink()
        errors, stats = lint(root / "packets", root / "contracts", ADR_DIR)
        expect_green("superseded terminal state", errors)
        # D8.9: the summary carries the superseded drafts BY NAME
        if stats["superseded"] != ["ch9-test-surface-contract.md"]:
            failures.append("selftest claim NOT held: superseded drafts not listed by name")
        # …and the zero-reopened gate is NOT tripped by a permanent
        # state — a false red here would red every future approve
        errors, _ = lint(root / "packets", root / "contracts", ADR_DIR, forbid_reopened=True)
        expect_green("superseded passes the zero-reopened gate", errors)
        tmp.cleanup()

    # D8.2 status/record consistency, both directions + the block floor
    expect_red_superseded(
        "superseded-without-record",
        lambda t, off: t.split(RECORD_HEAD)[0] + "\n",
        "requires exactly one superseded record block",
    )
    expect_red_superseded(
        "superseded-record-on-ratified-status",
        lambda t, off: t.replace('"status": "superseded"', '"status": "ratified"'),
        "superseded record present on status 'ratified'",
    )
    expect_red_superseded(
        "superseded-without-ratification-block",
        lambda t, off: DRAFT_V1.replace('"status": "draft"', '"status": "superseded"')
        + RECORD_HEAD
        + t.split(RECORD_HEAD, 1)[1],
        "status superseded requires a ratification block",
    )
    # D8.3 record shape
    expect_red_superseded(
        "superseded-record-extra-key",
        lambda t, off: t.replace(
            '{"superseded": {"date"', '{"superseded": {"successor": "ch13-v2", "date"'
        ),
        "must be an object with exactly keys",
    )
    expect_red_superseded(
        "superseded-record-missing-key",
        lambda t, off: re.sub(r', "plan": "[^"]*"', "", t),
        "must be an object with exactly keys",
    )
    expect_red_superseded(
        "superseded-record-bad-date",
        lambda t, off: t.replace('"date": "2026-08-03"', '"date": "2026-8-3"'),
        "superseded.date must be a YYYY-MM-DD string",
    )
    expect_red_superseded(
        "superseded-record-impossible-calendar-date",
        lambda t, off: t.replace('"date": "2026-08-03"', '"date": "2026-02-29"'),
        "real calendar day",
    )
    expect_red_superseded(
        "superseded-record-block-with-sibling-key",
        lambda t, off: t.replace(
            '{"superseded": {"date"', '{"note": "archived", "superseded": {"date"'
        ),
        "sibling top-level key(s) ['note']",
    )
    # D8.4 the oracle pointers
    expect_red_superseded(
        "superseded-oracle-branch-missing",
        lambda t, off: t.replace(f'"oracle_branch": "{ORACLE_BRANCH}"', '"oracle_branch": "no-such-line"'),
        "does not resolve to a branch",
    )
    expect_red_superseded(
        "superseded-oracle-tip-abbreviated",
        lambda t, off: re.sub(r'"oracle_tip": "([0-9a-f]{12})[0-9a-f]{28}"', r'"oracle_tip": "\1"', t),
        "must be a 40-hex lowercase commit sha",
    )
    expect_red_superseded(
        "superseded-oracle-tip-unresolvable",
        lambda t, off: re.sub(
            r'"oracle_tip": "[0-9a-f]{40}"', '"oracle_tip": "' + "deadbeef" * 5 + '"', t
        ),
        "superseded.oracle_tip 'deadbeefdead' does not resolve to a COMMIT",
    )
    expect_red_superseded(
        "superseded-oracle-tip-off-branch",
        lambda t, off: re.sub(r'"oracle_tip": "[0-9a-f]{40}"', f'"oracle_tip": "{off}"', t),
        "is NOT contained in branch",
    )
    # D8.5 the forward thread
    expect_red_superseded(
        "superseded-plan-path-absent",
        lambda t, off: t.replace(f'"plan": "{ORACLE_PLAN}"', '"plan": "v3/no-such-plan.md"'),
        "forward thread must resolve at the point of writing",
    )
    expect_red_superseded(
        "superseded-plan-path-escaping",
        lambda t, off: t.replace(f'"plan": "{ORACLE_PLAN}"', '"plan": "../outside.md"'),
        "must be a nonempty repo-relative path",
    )
    # D8.6 the archival lock: equality still binds after the flip
    expect_red_superseded(
        "superseded-row-edited-after-flip",
        lambda t, off: t.replace("| C1 | the row |", "| C1 | the row, edited after supersede |"),
        "needs re-ratification",
        commit=True,
    )
    # D8.8 D7's map rule pinned against the new status
    expect_red_superseded(
        "map-on-superseded-status",
        lambda t, off: t + '\n```json\n{"realized_map": {"C1": "landed", "C2": "landed"}}\n```\n',
        "realized_map present on status 'superseded'",
    )

    # ---- D9 superseded-target token scan (report-only — the ch11
    # pointer case): a realized draft citing the superseded draft in a
    # C-row line AND a realized_map value gets a NOTE on both machine
    # surfaces, and NO error — the LEAVE-WITH-RECORD state is
    # legitimate; the scan makes it visible.
    CITING_V1 = """# citing draft fixture

```json
{"contract_draft": {"chapter": "ch9", "surface": "other-surface", "status": "draft"}}
```

| ID | Rule |
|---|---|
| C1 | delegates to contract:ch9-test-surface#C1 |
| C2 | lookalike contract:ch9-test-surface#C1oops is not a token |
"""
    fixture = build_superseded_fixture()
    if fixture is None:
        failures.append("selftest fixture setup failed: superseded-target-scan")
    else:
        tmp, root, _draft, packet4, _text, _off = fixture
        packet4.unlink()  # the anchor dim owns packet-side redness
        citing = root / "contracts" / "ch9-other-surface-contract.md"
        citing.write_text(CITING_V1, encoding="utf-8")
        _git_ok(root, "add", "-A")
        _git_ok(root, "commit", "-q", "-m", "citing-content")
        citing_sha = _git_out(root, "rev-parse", "HEAD")
        realized = (
            CITING_V1.replace('"status": "draft"', '"status": "realized"')
            + RATIFICATION_TMPL.replace("%DATE%", "2026-08-06").replace("%COMMIT%", citing_sha)
            + '\n```json\n{"realized_map": {"C1": "landed beside contract:ch9-test-surface#C1", "C2": "lookalike contract:ch9-test-surface#C1oops only"}}\n```\n'
        )
        citing.write_text(realized, encoding="utf-8")
        errors, stats = lint(root / "packets", root / "contracts", ADR_DIR)
        expect_green("superseded-target scan stays error-free", errors)
        notes = stats["notes"]
        row_note = (
            "ch9-other-surface-contract.md row C1: token "
            "contract:ch9-test-surface#C1 targets a SUPERSEDED draft"
        )
        if not any(row_note in n for n in notes):
            failures.append(
                f"selftest claim NOT held: superseded-target C-row note missing ({notes})"
            )
        if not any(
            "realized_map['C1']" in n and "targets a SUPERSEDED draft" in n for n in notes
        ):
            failures.append(
                f"selftest claim NOT held: superseded-target realized_map note missing ({notes})"
            )
        # Arm fold (2026-08-14 review, finding 4): the lookalike
        # `...#C1oops` (row C2 and map key C2) must yield NO note —
        # the bounded-token check refuses the prefix match.
        if any("row C2" in n or "realized_map['C2']" in n for n in notes):
            failures.append(
                f"selftest claim NOT held: lookalike token wrongly noted ({notes})"
            )
        tmp.cleanup()

    # ---- P8 post-build (pinned bytes + merge rejection)
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        pdir = root / "packets"
        pdir.mkdir()
        packet = pdir / "ch9-p1-test.md"
        # carries the build-close metrics block: these lanes prove the
        # BOUNDARY rules, so the metrics gate must not be what reds them
        packet.write_text(
            '# p\n\n```json\n{"mutation_boundary": {"files": ["x.txt"]}}\n```\n'
            '\n```json\n{"packet_metrics": {"class": "t"}}\n```\n',
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

    # ---- P8 build-close metrics gate (ch13 boundary — the p1b
    # missing-block breach): zero metrics blocks at the audited commit
    # is red on the post-build path (P7 keeps the block optional at
    # plain lint), and a ch13+ packet's block must carry
    # main_thread_model — a ch12 packet without it stays green.
    def _expect_metrics_gate(
        name: str, packet_name: str, metrics_json: str | None, substr: str | None
    ) -> None:
        """A minimal valid build-shaped repo — ONE root commit landing
        the packet with its boundary file, green on every other P8
        rule, so a red can only come from the metrics gate."""
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            pdir = root / "packets"
            pdir.mkdir()
            gate_packet = pdir / packet_name
            text = '# p\n\n```json\n{"mutation_boundary": {"files": ["x.txt"]}}\n```\n'
            if metrics_json is not None:
                text += f"\n```json\n{metrics_json}\n```\n"
            gate_packet.write_text(text, encoding="utf-8")
            (root / "x.txt").write_text("x", encoding="utf-8")
            if not (_git_ok(root, "init", "-q") and _git_ok(root, "add", "-A") and _git_ok(root, "commit", "-q", "-m", "build")):
                failures.append(f"selftest git fixture setup failed ({name})")
                return
            checker = Checker()
            check_post_build(gate_packet, _git_out(root, "rev-parse", "HEAD"), checker)
            if substr is None:
                if checker.errors:
                    failures.append(f"selftest green NOT green: {name} ({checker.errors[0]})")
            else:
                assert_red(name, checker.errors, substr)

    _expect_metrics_gate(
        "post-build-metrics-missing",
        "ch9-p1-test.md",
        None,
        "packet_metrics missing at build close",
    )
    _expect_metrics_gate(
        "post-build-ch13-missing-main-thread-model",
        "ch13-p9-test.md",
        '{"packet_metrics": {"class": "t"}}',
        "required at build close for ch13+",
    )
    _expect_metrics_gate(
        "post-build-ch12-no-main-thread-model-green",
        "ch12-p9-test.md",
        '{"packet_metrics": {"class": "t"}}',
        None,
    )
    # Arm fold (2026-08-14 review, finding 1): a NON-OBJECT value
    # satisfied the exactly-one count while the required field could
    # not even exist — refused on the post-build path.
    _expect_metrics_gate(
        "post-build-metrics-not-an-object",
        "ch13-p9-test.md",
        '{"packet_metrics": "not-an-object"}',
        "is not an object",
    )

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
        # the metrics block rides along: polarity 2 must stay a clean
        # green through the build-close metrics gate
        alias_packet_text = (
            '# p\n\n```json\n{"mutation_boundary": {"files": ["x.txt"]}}\n```\n'
            '\n```json\n{"packet_metrics": {"class": "t"}}\n```\n'
        )
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

    # The count is PINNED, not merely printed: a deleted assert_red call
    # used to shrink the reported number while the run still exited 0,
    # so an accidentally dropped fixture read as a pass. Raise this
    # constant in the SAME commit that adds a dim — never to make a red
    # selftest green. Deliberately one level: a red fixture per claim, a
    # name list, and this count. Nothing checks THIS check.
    if len(red_dims) != EXPECTED_RED_DIMS:
        failures.append(
            f"selftest register count {len(red_dims)} != pinned {EXPECTED_RED_DIMS} "
            f"— a dim was added or lost; if intended, update EXPECTED_RED_DIMS "
            f"in the same commit"
        )

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
