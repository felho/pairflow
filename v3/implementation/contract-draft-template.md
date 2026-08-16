# Contract-Draft — Template + Form Authority

Status: Phase-1 flip deliverable (process-v2, Amendment 1 carrier),
landed 2026-07-09.
Process context: [`README.md`](README.md) §4 (the draft phase in the
build loop) and §5.5 (ratification is a standing human checkpoint);
procedure: the `CreateTaskPacket` skill's `DraftContract` workflow.

**This file is the canonical FORM authority for contract-drafts** —
exactly as `task-packet-template.md` is for packets. The draft-lint's
form checks (`tools/v3-plan/check_packet.py`, the D1–D8 draft claims)
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

  A SCHEMA-FIRST contract (one whose structural rows are declaration
  pointers, ADR-019 D4) additionally binds the declaration file's
  bytes in the same act — "one hash line per act":

  ```json
  {"ratification": {"date": "…", "arms": ["…"], "commit": "…",
    "schema": {"path": "<repo-relative declaration file>", "sha256": "<64-hex of its bytes>"}}}
  ```

  The `schema` key is OPTIONAL (pre-schema contracts carry none) and
  its lock is checked on the LATEST block only, exactly like the
  commit-equality lock; the two-commit choreography is unchanged —
  the content commit lands rows AND schema edits, the ratifying
  commit records both locks.

- **At chapter close** (the boundary review — which also flips status
  to `realized`, in the SAME act; ANY map presence requires
  `realized`):

  ```json
  {"realized_map": {"C1": "<landing: packet § / code / test>", "C2": "…"}}
  ```

- **At supersede** (the flip commit — which also flips status to
  `superseded`, in the SAME act; ANY record presence requires
  `superseded`, and the record requires it back):

  ```json
  {"superseded": {"date": "YYYY-MM-DD", "oracle_branch": "<branch>", "oracle_tip": "<40-hex sha>", "plan": "<repo-relative path>"}}
  ```

  The record answers "where did this line's state go, and under what
  authority" and NOTHING else. It carries NO successor field on
  purpose: the successor does not exist when the flip runs, and a
  reference unverifiable at the point of writing is the measured
  defect family this process already pays for (an unrun "measured",
  a DERIVED claim with no named measurer, an unverified citation, a
  PROJECTED state labelled measured). The forward thread is the plan
  pointer; the successor surface is named where it is decided.

## 3. The machine form (what the lint enforces — the full registry)

**Threat model (user-ratified 2026-08-04):** every check in this
registry defends against ACCIDENT and SLOPPINESS — a wrong edit, a
malformed block, a stale reference, a careless anchor. None of it
defends against a commit-holder's DELIBERATE concealment (rows hidden
in rendering constructs, hand-crafted evasions): that class is owned
by human diff review and the fresh-context arm, exactly as older
ratification blocks already are ("verified by diff review, not
tier 0"). A finding outside this sentence is recorded as
carried-scope, never built against.

- **Meta block:** exactly ONE `contract_draft` block; exact keyset
  `{chapter, surface, status}`; `status` ∈ `draft | ratified |
  reopened | realized | superseded`; filename
  `ch<N>-<surface>-contract.md` matches chapter/surface.
- **C-rows:** DISCOVERED as table rows whose FIRST cell is `C<n>`,
  fenced code excluded; ids unique, NO leading zeros (`C01` is red —
  ids are exact strings, `C01` is never `C1`); ratified-or-later
  requires ≥1 row. Finer elements (token-list members) travel with
  their host row.
- **Ratification blocks:** exact keyset `{date, arms, commit}`;
  `date` a `YYYY-MM-DD` string naming a REAL CALENDAR DAY (the shape
  alone admits `2026-13-40` and a non-leap `2026-02-29`; a mistyped
  month is the ordinary accident, and a day that cannot be reached on
  a calendar is unusable as the audit stamp it claims to be),
  non-decreasing in document order;
  `arms` a nonempty list of nonempty strings (naming the transitional
  cross-model arms that reviewed — README §5.5). **Amended 2026-08-09:
  the field also admits a value NAMING THE ACT, in the one case where
  no arm reviewed because none could — a transition that moves no
  C-row has nothing for a review arm to read, and the schema re-lock
  (§4) is the first such transition. This decides the field's admitted
  VALUES and nothing else: it does not make any review optional, does
  not change which transitions require one, and leaves every C-row-
  moving transition's arm duty exactly as it stands.** `commit` 7–40
  LOWERCASE-hex — shape-checked on EVERY block, while the
  COMMIT-object resolution (`git cat-file -t == commit`; a tree/blob/
  tag is not an auditable ratification point) and the equality check
  run on the LATEST block only (= the last block in document order),
  in `ratified`, `realized` and `superseded`. An unresolvable recorded
  commit or an out-of-repo draft is a LOUD error, never a skip.
- **The equality check:** the working tree's C-row lines equal the
  C-row lines at the latest block's recorded commit
  (`git show <commit>:<path>`). The recorded sha binds CONTENT, not
  the record — the block lands in a follow-up commit. Older blocks
  are human-readable history verified by diff review, not tier 0
  (the stated threat model, README §5.5).
- **The schema lock (schema-first contracts, ADR-019 D4):** a
  ratification block MAY carry `schema` with exact keyset
  `{path, sha256}` — `path` a repo-relative existing file, `sha256`
  64 LOWERCASE hex. Shape-checked on EVERY block that carries it; the
  BYTE check runs on the LATEST block only, in `ratified`, `realized`
  and `superseded` (suspended ONLY at `reopened`, with the equality
  check and for the same reason): the working tree file's sha256
  equals the recorded value, else LOUD red — an edit of the
  declaration file after ratification is an unratified schema change
  until a new act records the new bytes. Threat model (user-ratified
  2026-08-08, the §3 header's sentence applied): ACCIDENT and
  SLOPPINESS — an unratified schema edit, a stale or mistyped hash, a
  wrong path; deliberate concealment stays with human diff review and
  the arm. Multiple contracts locking ONE file each red on any edit
  of it — designed (a schema edit is an act), revisited as a boundary
  topic when a second locking contract exists.
- **State consistency (decidable from the current bytes alone):**
  ratification block(s) present ⇔ status ∈ {ratified, reopened,
  realized, superseded}; status `draft` ⇒ no blocks; the equality
  check binds `ratified`/`realized`/`superseded` and is suspended
  ONLY at `reopened`.
- **`realized_map`:** exactly one block with this exact top-level
  key — and that key is the block's ONLY top-level key (a sibling key
  in the same fence is red: it would ride along unread, the ordinary
  accident being a copy-paste that merges two blocks); keys exactly
  the C-row id set; every landing site a nonempty
  string; ANY map presence ⇔ status `realized` (the boundary review
  fills the map and flips the status in ONE act — a partial map, on
  any status, is red).
- **`superseded` record:** exactly one block with this exact
  top-level key — and that key is the block's ONLY top-level key, on
  the `realized_map` rule above and for the same reason; exact keyset
  `{date, oracle_branch, oracle_tip,
  plan}`; ANY record presence ⇔ status `superseded` (both
  directions), and `superseded` additionally requires ≥1
  ratification block — a draft that was never ratified has no state
  to preserve. `date` a `YYYY-MM-DD` string naming a real calendar
  day (the ratification-block rule above); `oracle_branch` a
  resolvable branch (the local ref, else its `origin/` tracking
  form); `oracle_tip` 40-hex LOWERCASE, resolving to a COMMIT object
  that is CONTAINED in `oracle_branch` (`merge-base --is-ancestor`,
  so later preservation commits on the oracle never break the
  record); `plan` an existing repo-relative path. Every one of these
  is a checkable claim about the world, checked where it is written
  — the record is the machine lock, so a record whose pointers do
  not resolve is a broken lock, LOUD, never a skip.
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
                            ┌──(schema re-lock)──┐
                            │   two commits      │
                            └───────▶────────────┘
                                     │
draft ──(human ratification)──▶ ratified ──(chapter close)──▶ realized
              ▲                    │ │                            │
              └──── reopened ◀─────┴─┼────────────────────────────┘
        (from ratified; from realized only as a resolved STOP; transient)
                                     │
                                     └──(supersede)──▶ superseded
                                            (terminal — no exits)
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
- **Reopen-vs-aggregate-note criterion (promoted at the ch13
  boundary, 2026-08-13; first applied and derived at the ch13 draft —
  the superseded `ch13-context-block` draft's Context is the
  historical first-application record):** when a NEW chapter's
  surface touches an EARLIER ratified row, the row is **REOPENED**
  when its operative text is a HARD PROMISE about this surface (a
  closed keyset; "explicitly not a key"; a present-tense comparative
  that the arrival falsifies) — and merely **AGGREGATE-NOTED** (a
  dated note that the row described the pre-arrival state; no row
  edit, no ceremony) when the row's OWN text pre-authorizes or
  forward-scopes the arrival (a delegation clause naming the arriving
  chapter; an aggregate-note chain; a "later surface" clause that
  resolves to it). Tie-break: a row carrying BOTH follows the
  DELEGATION — the promise is self-scoped to the pre-arrival state by
  the row's own delegating clause. A SELF-SCOPING text (parametric on
  another row's set — "the containers this surface introduces") stays
  true through the arrival and needs neither. The call is the new
  draft's authoring duty, recorded in its Context; the panel checks
  it.
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
- **Schema re-lock (TWO commits, `ratified` → `ratified`; added
  2026-08-09):** a schema-first draft pins a declaration file's
  `sha256` in its ratification block, so a later edit to that file
  turns the lock RED until an act records the new bytes. No C-row
  moves, so nothing is suspended and no reopen occurs. Commit 1 is
  the realizing act's own commit — it lands the declaration edit and
  leaves the lock check red, a transient of the same kind as a
  `reopened` draft and the reason a chapter's green gate is taken
  after commit 2 and never at commit 1. Commit 2 appends a
  ratification block recording the NEW `sha256` and naming COMMIT 1
  as its `commit` value; its `arms` may name the act (§3), since a
  transition that moves no C-row has nothing for a review arm to
  read. THE DISCRIMINATOR against supersede, which is the other
  row-free transition and takes ONE commit: a re-lock's second commit
  must record bytes that CANNOT EXIST before the first, so the two
  commits are forced by the ordering and not by convention. This
  transition does NOT count toward §5's reopening metric.
  **COEXISTENCE — more than one draft binding ONE declaration file
  (added 2026-08-16, admitted by the act that first exercises it:
  ch14-P1's re-lock, where `ch14-human-decision` and
  `ch13-context-block-v2` both pin `templateFormat.ts`).** An edit to
  that file turns EVERY bound lock red, so commit 2 appends ONE BLOCK
  PER BOUND CONTRACT, each recording the same new `sha256` and naming
  the same commit 1. A bound draft already at `realized` receives its
  block THERE — `realized` → `realized`, no status change, no C-row
  motion, no `realized_map` movement — which is the state pair this
  clause admits; the tree's earlier instance of such an append came
  from the citation-closure bullet's own narrow scope and did not
  authorize it for a standalone re-lock. The cost is per bound
  contract on every future edit of that file, and it is accepted here
  rather than weakening any lock. PLACEMENT, stated because the one
  comparable earlier act went the other way: ch13-p1a carried its own
  form-authority amendment in COMMIT ONE (a pure-docs commit before
  the build), while this amendment rides commit 2 — deliberately, so
  the build commit's bytes stay clean for the post-build boundary
  audit, a constraint that pure-docs commit never faced.
- **Supersede (ONE commit, from `ratified` only):** when a line is
  re-derived rather than repaired, the draft is archived IN PLACE —
  the file never moves (§2) — by a single commit that flips status
  `ratified` → `superseded` and appends the §2 record. That commit
  touches the meta block and the record and NOTHING else: the C-rows
  are frozen and the equality check keeps binding, forever, against
  the latest ratification's recorded commit. This is deliberately
  NOT the reopen's two-commit choreography — a reopen suspends
  equality because the rows are being edited; a supersede edits no
  row, so nothing needs suspending, and a second commit would only
  create a window in which the state is half-declared.
  `superseded` is TERMINAL: no transition leaves it, so the
  re-derived successor is a NEW surface with its own name, never a
  return to this file. Reachability from `realized` is NOT
  legislated (n=1: the first exercise is the ch13 context-block
  contract, superseded from `ratified` under the re-derivation plan
  — the act's date is read off that file's own record, never
  restated here: a status this template asserts about a live file is
  a claim that goes stale the moment the file moves) — a
  post-close supersede is a new act to be decided when one exists.
  The successor's identity is not recorded here; see §2's record
  form for why.
- **`superseded` and the zero-reopened gate:** a superseded draft is
  a PERMANENT resting state, so it does NOT join
  `--forbid-reopened`; gating on it would red every future approve.
  Its enforcement lives entirely at anchor resolution (§6) and in
  the summary line, which names superseded drafts the way it names
  reopened ones.
- **`reopened` is a transient STOP-artifact, never a resting state:**
  packet refs into a reopened draft go loud-red for the window;
  packet approve, chapter close, and process flips require ZERO
  reopened drafts (`check_packet.py --forbid-reopened`).
- **Chapter close:** the boundary review fills the `realized_map` and
  flips status to `realized` in ONE act. Nothing lives only in the
  draft afterwards — decisions persist in ADRs, shapes persist in
  packets/code/tests; the draft is never a third permanent authority.
- **Citation closure AT the chapter close (added 2026-08-13; NARROW —
  this act and nothing else):** where a schema-first draft carries
  FORWARD-SCOPED EXEMPTIONS (ADR-019 D4) whose named closing act IS
  this chapter close, the close act ALSO closes them, in the same two
  commits. What it may touch is exhaustively: (i) CITATION-ONLY C-row
  growth — declaration tags added, no normative sentence moved, added,
  or removed; (ii) the exemption notes deleted from the declaration
  beside their nodes; (iii) the `realized_map` and the `realized`
  flip, as above. Commit 1 carries all three and is transiently RED on
  BOTH the recorded-commit equality (a C-row line moved) and the
  schema lock (the declaration's bytes moved) — the same designed
  transient as the re-lock's commit 1, and the same consequence: the
  chapter's green gate is taken after commit 2, never at commit 1.
  Commit 2 appends ONE ratification block in the ordinary form,
  recording commit 1 and the NEW declaration `sha256`, which closes
  both — the re-lock RIDES this act rather than being a separate
  transition. A semantic edit is NOT admitted here: anything beyond a
  citation is a reopen, unchanged. This transition does NOT count
  toward §5's reopening metric — no row moved in meaning and the draft
  never entered `reopened`. The rule is admitted BY the act that first
  exercises it (the amendment-rides-the-act carrier — the ch11-C38 /
  ch12-C27 pattern), and it is scoped to the close: no other act may
  edit a ratified C-row without a reopen.

## 5. Draft metrics (one line each, at ratification and at close)

Recorded in the draft's Context section tail (panel-owned, not
lint-visible): rounds to ratify; new-decision row count;
post-ratification reopenings. The D2 "expected 2–3 rounds" prediction
is testable only if measured.

**Amended 2026-08-09 — what the reopening number COUNTS.** It read
"= ratification blocks beyond the first", which counts the wrong
thing: a block is appended by every transition that ratifies
anything, and FOUR of those are not reopens — a non-reopening
AMENDMENT to a ratified draft, the SCHEMA RE-LOCK (§4), the
CITATION CLOSURE at the chapter close (§4, added 2026-08-13; its
block records a moved C-row line, and it still is not a reopen: the
move is a citation, and the draft never entered `reopened`), and the
COEXISTENCE BLOCK a re-lock appends to a SECOND draft bound to the
same declaration file (§4, added 2026-08-16 — `realized` →
`realized`, recording bytes and nothing else). Under the
old wording a draft that had never reopened could be required to
record a nonzero reopen count, which is a false number carrying a
true-sounding name. The metric now counts **the number of times the
draft entered `reopened` after its first ratification** — the
transitions, not the blocks. Three consequences, stated because a
metric redefinition that moves recorded history is worse than the
defect it fixes: (i) EVERY count already recorded in every draft
stays exactly where it stands — measured tree-wide at this act, not
argued; (ii) `ch9-runner-contract.md`'s recorded 0, carried against
two blocks with a parenthetical explaining the second, becomes
CONFORMANT rather than tolerated, and its parenthetical becomes
explanatory rather than load-bearing; (iii) the DATED-INCREMENT form
stays legal — a draft may record the number as a dated snapshot with
later `**Dated update (<date>, <act>)**` increments beside it rather
than as a single live figure, which two drafts do today. The act
that changes this wording re-runs the tree-wide sweep against the new
text as its own check.

## 6. Anchoring (how packets consume a draft)

Packets anchor rows as `contract:ch<N>-<surface>#C<n>` in their
`packet_rows` manifest (task-packet-template §1). Anchors resolve
ONLY to a **ratified-or-later** draft — neither `reopened` nor
`superseded` qualifies, for opposite reasons: a reopened draft is
contested (a transient red window that closes at re-ratification),
a superseded one is retired (a permanent red — the anchor must move
to the successor surface, and the draft's own `superseded` record
names the oracle branch and the plan that authorized the move).

**The channel this binds on (user-ratified 2026-08-04, with the P1
round-1 arm evidence):** status resolution lives on the **manifest**
— the `packet_rows` refs are the only surface where an anchor exists
in the machine's sense, so that is where the lock is checked, for
every status. A contract token may also APPEAR in a row's
`(anchored: …)` / `(derived: …)` prose closure, which is bound
one-way to the manifest by the ref-drift check (a cited token missing
from the manifest is red) — status therefore rides the manifest entry
rather than being resolved a second time in prose. The two remaining
citation surfaces are NAMED carried-scope, not gaps this template
legislates: pre-v2 packets are skipped wholesale by the grandfathering
policy (revisiting that is a boundary act, and it owns the question),
and the header union is a reader-convenience MIRROR of manifest data —
this template mandates no such line and `task-packet-template.md`
requires none, so it carries no independent anchor. Full record with
owners: `ch13-rederivation-arm/p1/carried-scope.md`.

A packet row anchored to
a draft row must preserve its MEANING, not just resolve the reference
— the panel's lens-2 draft→packet semantic-drift check owns that
surface.
