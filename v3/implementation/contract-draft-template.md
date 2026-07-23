# Contract-Draft — Template + Form Authority

Status: Phase-1 flip deliverable (process-v2, Amendment 1 carrier),
landed 2026-07-09.
Process context: [`README.md`](README.md) §4 (the draft phase in the
build loop) and §5.5 (ratification is a standing human checkpoint);
procedure: the `CreateTaskPacket` skill's `DraftContract` workflow.

**This file is the canonical FORM authority for contract-drafts** —
exactly as `task-packet-template.md` is for packets. The draft-lint's
form checks (`tools/v3-plan/check_packet.py`, the D1–D7 draft claims)
are this template's mechanical mirror: on any mismatch **the TEMPLATE
wins and the lint is the bug** — scoped to the draft-artifact FORM
checks over declared data. The lint's non-form checks (the
`--forbid-reopened` gate form, the post-build audit) sit OUTSIDE this
mirror; their homes are README §5.5 and `task-packet-template.md` §1a.

## 1. What a contract-draft is

One chapter's **memo-born surface**, decided ONCE and ratified by the
human, so every packet of the chapter can PROJECT from it instead of
re-deriving decisions inside review rounds. Content bar =
**tree-independence**: the draft carries what is decidable WITHOUT the
live `v3/src` tree. Litmus: *"if `v3/src` were deleted and rewritten
from the packets, would this row still be true and decidable?"*

- **In:** type matrices with FULL field lists; contract matrices with
  every lane; token lists as declared claims; presence/enum rules;
  proof boundaries; inventory SKELETONS (lanes/rules/keysets);
  substrate-probe results (platform facts are tree-independent —
  probes ARE draft-time work).
- **Out (packet-time):** embedding gates, mutation boundaries,
  inventory source-site columns, fixtures, acceptance counts.

**Decision-home triage at row authoring (README §6; adopted
2026-07-23):** every NEW-DECISION row on an off-model surface answers
the K0→K4 question sequence — K0 model-shaped (→ the fix-FIRST
model-wave path, user-gated; never a draft-local decision), K1–K4
ADR-shaped (→ the row births its ADR under the packet-flow ADR
lanes), else the row itself is the decision's home — and the outcome
is recorded with the row's DECIDED-HERE marker (an ADR-born row
names its ADR).

A chapter may have MORE than one draft (one per memo-born surface);
the chapter's draft set = the drafts its plan Packets-and-flow-mode
table references.

## 2. The template

`v3/implementation/contracts/ch<N>-<surface>-contract.md` — the
filename's chapter/surface MUST match the meta block. The file NEVER
moves and row IDs NEVER change (anchors stay resolvable forever;
archival is a status transition, not a relocation)
(the contracts HOME was re-pinned once, `docs/v3/implementation/contracts` → `v3/implementation/contracts`, by ADR-015 — a relocation of the home as a whole, not of a file within it; filenames and row IDs unchanged, anchors unaffected).

````markdown
# ch<N> — <surface> contract

```json
{"contract_draft": {"chapter": "ch<N>", "surface": "<surface>", "status": "draft"}}
```

## Context (non-normative by declaration)

<The Control-Model answers as round-0 context: business invariant,
control model, read-path, forbidden fallback, allowed resolution,
missing-data. Prose here CANNOT carry rules — an iff-clause found in
prose is a review finding, never a legal edit path.>

## Contract rows (every normative statement is a C-row)

| ID | Rule |
|---|---|
| C1 | <one normative statement per row> |
| C2 | … |

## Ratification history (empty at `draft` — blocks are appended by the lifecycle acts)

## Realized map (empty until chapter close)
````

The skeleton above IS the legal `draft` state: status `draft` carries
NO ratification block and NO map (§3 state consistency) — a copyable
one-document form showing every stage at once would be red under its
own rules. The lifecycle acts APPEND:

- **At ratification** (the ratifying commit — which also flips status
  to `ratified`):

  ```json
  {"ratification": {"date": "YYYY-MM-DD", "arms": ["<arm>", "…"], "commit": "<content-commit sha>"}}
  ```

- **At chapter close** (the boundary review — which also flips status
  to `realized`, in the SAME act; ANY map presence requires
  `realized`):

  ```json
  {"realized_map": {"C1": "<landing: packet § / code / test>", "C2": "…"}}
  ```

## 3. The machine form (what the lint enforces — the full registry)

- **Meta block:** exactly ONE `contract_draft` block; exact keyset
  `{chapter, surface, status}`; `status` ∈ `draft | ratified |
  reopened | realized`; filename `ch<N>-<surface>-contract.md` matches
  chapter/surface.
- **C-rows:** DISCOVERED as table rows whose FIRST cell is `C<n>`,
  fenced code excluded; ids unique, NO leading zeros (`C01` is red —
  ids are exact strings, `C01` is never `C1`); ratified-or-later
  requires ≥1 row. Finer elements (token-list members) travel with
  their host row.
- **Ratification blocks:** exact keyset `{date, arms, commit}`;
  `date` a `YYYY-MM-DD` string, non-decreasing in document order;
  `arms` a nonempty list of nonempty strings (naming the transitional
  cross-model arms that reviewed — README §5.5); `commit` 7–40
  LOWERCASE-hex — shape-checked on EVERY block, while the
  COMMIT-object resolution (`git cat-file -t == commit`; a tree/blob/
  tag is not an auditable ratification point) and the equality check
  run on the LATEST block only (= the last block in document order),
  in `ratified` and `realized`. An unresolvable recorded commit or an
  out-of-repo draft is a LOUD error, never a skip.
- **The equality check:** the working tree's C-row lines equal the
  C-row lines at the latest block's recorded commit
  (`git show <commit>:<path>`). The recorded sha binds CONTENT, not
  the record — the block lands in a follow-up commit. Older blocks
  are human-readable history verified by diff review, not tier 0
  (the stated threat model, README §5.5).
- **State consistency (decidable from the current bytes alone):**
  ratification block(s) present ⇔ status ∈ {ratified, reopened,
  realized}; status `draft` ⇒ no blocks; the equality check binds
  `ratified`/`realized` and is suspended ONLY at `reopened`.
- **`realized_map`:** exactly one block with this exact top-level
  key; keys exactly the C-row id set; every landing site a nonempty
  string; ANY map presence ⇔ status `realized` (the boundary review
  fills the map and flips the status in ONE act — a partial map, on
  any status, is red).
- **Cross-cutting machine-block rules** (canonical statement:
  `task-packet-template.md` §1a; this template defers): duplicate
  JSON keys are parse errors; fences follow the line-oriented
  CommonMark scanner — quoted fences are material.

Anything in this template the lint cannot see is marked
**panel-owned** — currently: the tree-independence bar (§1), the
Context section's non-normativity, and the "every normative statement
is a C-row" rule (the review-side prose-contract scan detects
violations; the lint guards only the C-row byte surface).

## 4. Lifecycle

```
draft ──(human ratification)──▶ ratified ──(chapter close)──▶ realized
              ▲                     │                             │
              └──── reopened ◀──────┴─────────────────────────────┘
        (from ratified; from realized only as a resolved STOP; transient)
```

- **First ratification (two commits):** the content commit lands the
  final rows (status `draft`, no blocks — green); the ratifying
  commit appends the block recording that content commit AND flips
  status to `ratified` in one act (no C-row changes → equality holds
  — green).
- **Reopen (from `ratified` directly; from `realized` ONLY as a
  human-resolved STOP — the post-close escape hatch below):** from
  `ratified`: commit 1 edits the C-rows and flips status to
  `reopened` (equality suspended — green); commit 2 appends the new
  block recording commit 1 and flips back to `ratified`.
  Re-ratification is permanently human, exactly like ratification.
  The `realized` path follows the post-close bullet's mechanics
  EXCLUSIVELY — its commit 2 returns to `realized`, never `ratified`.
- **Post-close (realized) reopen:** a post-close change remains a
  STOP; when the human resolves it by ordering a reopen (first
  exercise: the ch12 ratification's mandated reopen set — ch11
  C18/C19/C21/C30 + ch8-C14), the draft passes
  realized → reopened → realized — commit 1 removes the
  `realized_map` with the row edits and the `reopened` flip, commit 2
  restores the updated map with the new block and the `realized`
  flip; a reopened-to-pointer row's map entry records the historical
  landing plus the delegation, realizing VACUOUSLY (the successor
  surface owns the new semantics' realization at its own close);
  every commit green on the draft-form rules, the packet-anchor
  surface loud-red for the window (this section's own rule — the
  designed signal, closed at commit 2); the resolution is never
  inferred.
- **`reopened` is a transient STOP-artifact, never a resting state:**
  packet refs into a reopened draft go loud-red for the window;
  packet approve, chapter close, and process flips require ZERO
  reopened drafts (`check_packet.py --forbid-reopened`).
- **Chapter close:** the boundary review fills the `realized_map` and
  flips status to `realized` in ONE act. Nothing lives only in the
  draft afterwards — decisions persist in ADRs, shapes persist in
  packets/code/tests; the draft is never a third permanent authority.

## 5. Draft metrics (one line each, at ratification and at close)

Recorded in the draft's Context section tail (panel-owned, not
lint-visible): rounds to ratify; new-decision row count;
post-ratification reopenings (= ratification blocks beyond the
first). The D2 "expected 2–3 rounds" prediction is testable only if
measured.

## 6. Anchoring (how packets consume a draft)

Packets anchor rows as `contract:ch<N>-<surface>#C<n>` in their
`packet_rows` manifest (task-packet-template §1). Anchors resolve
ONLY to a **ratified-or-later** draft (`reopened` does NOT qualify —
the contract is contested during a reopen). A packet row anchored to
a draft row must preserve its MEANING, not just resolve the reference
— the panel's lens-2 draft→packet semantic-drift check owns that
surface.
