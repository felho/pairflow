# DraftContract Workflow

Author, review, and carry to ratification ONE chapter's contract-draft
— the missing middle altitude for memo-born surfaces (process-v2 D2):
the chapter's undecided row-level contracts are decided ONCE here and
ratified by the human, so every packet of the chapter PROJECTS from
ratified rows instead of re-deriving decisions inside review rounds.

Form authority: `v3/implementation/contract-draft-template.md`
(docs win — this workflow carries procedure only). Process authority:
README §4 (the draft phase) and §5.5 (ratification is a standing human
checkpoint, never delegated, never inferred).

## Input

- `CHAPTER` + `SURFACE`: the draft names one memo-born surface —
  `v3/implementation/contracts/ch<N>-<surface>-contract.md`. A
  chapter may carry several drafts (one per surface); the chapter's
  draft set is what its plan Packets-and-flow-mode table references.
- `SEED_ROWS`: the new-decision row set handed over by AuthorPacket's
  B-case STOP (when the draft is born from a packet-routing verdict),
  or the chapter memo's decision list (when planned at ratification).
- `PRIOR_FINDINGS`: optional — findings from an earlier refine round.

## Workflow

### 1) Scope + round-0 skeleton

1. The content bar is **tree-independence** (template §1): the draft
   carries what is decidable WITHOUT `v3/src` — litmus: "if `v3/src`
   were deleted and rewritten from the packets, would this row still
   be true and decidable?" In/Out lists per the template.
2. **Substrate probes ARE draft-time work:** any row resting on
   driver/OS/filesystem behavior carries an in-session probe result or
   a concrete cited source NOW (the packet-side probe discipline,
   pulled forward); a contested probe removes the premise from the row.
3. Answer the **Control-Model checklist** as the round-0 skeleton
   (business invariant / control model / read-path / forbidden
   fallback / allowed resolution / missing-data) — these answers live
   in the Context section, which is NON-normative by declaration.

### 2) Write the rows

**Every normative statement is a C-row** — the packet-side
prose-contract extraction applies at draft time ("would an implementer
need this sentence to write a test?" → it is a row); an iff-clause
discovered in prose is a REVIEW FINDING, never a legal edit path. Row
ids `C1…Cn`, unique, no leading zeros, never renumbered.

### 3) The review loop (autonomous, watchdog 8)

The draft loop is the packet loop **minus `split`** — a draft that
wants splitting is a chapter-structure question: STOP `2:draft-split`,
never an autonomous act.

1. Tier 0 = draft-lint (`pnpm v3:packet-lint` covers the contracts
   dir; the template §3 registry is what it enforces).
2. Tier 1 = the ReviewPacket panel, scoped for drafts: the substrate
   lens FULLY applies (probes are tree-independent); embedding-class
   checks are n/a — the Gate Coverage Matrix marks them `n/a (draft)`,
   which is a resolved state, not `missing`.
3. Verdicts: `refine` (fold + re-run, autonomous) / `approve` — and
   STOPs per the README §5.5 registry. Watchdog: 8 rounds; exhaustion
   → STOP `3:watchdog` with a diagnosis (churn composition → undecided
   semantics vs a wrong surface cut).

### 4) Ratification (permanently human — never delegated, never inferred)

1. Present the rows WITH the **ratifier's digest** (adopted at the ch8
   boundary, 2026-07-11 — the first live ratification's lesson): a
   short list surfacing exactly the spots where HUMAN judgment carries
   the most weight — the in-row DECIDED-HERE markers, deviations from
   precedent, the deliberate non-rows (packet-time watchpoints), and
   the panel's most-contested topics. Rationale (the user's own
   articulation, honest-record class): for a dense draft, deep
   coherence is not human-certifiable by reading — verification is
   build-equivalent; the act's content is a contradiction-hunting
   read + acceptance of the evidence chain + the GO, with the
   residual coherence risk consciously carried to the build (where
   the divergence stop and the aftermath channels own it). The digest
   aims the human read at the decision-dense rows, where reading DOES
   leverage judgment — never at coherence-checking, where it cannot.
   The human's explicit act ratifies THE BYTES of a
   named content commit.
2. **Two-commit choreography** (template §4): the content commit lands
   the final rows (status `draft`); the ratifying commit appends
   `{date, arms, commit: <content sha>}` and flips status to
   `ratified` in one act. The recorded sha binds content, not the
   record. The `arms` list names the transitional cross-model arms
   that reviewed (README §5.5 — the user's manual arms playing
   phase 2).
3. **Reopen** (from `ratified` only; trigger arrives on the STOP-2
   family — a ratified row vs reality conflict): commit 1 = row edits
   + status `reopened` (transient, loud — packet refs into the draft
   go red for the window); commit 2 = new block + back to `ratified`.
   Re-ratification is the same human act. Zero reopened drafts at
   packet approve / chapter close / process flips
   (`--forbid-reopened`).
4. Record the draft metrics line (template §5): rounds to ratify;
   new-decision row count; reopenings.

### 5) Chapter close (owned by the boundary review, not this workflow)

The realized map is filled and the status flips to `realized` in ONE
act; the file never moves; row ids never change
(the contracts HOME was re-pinned once, `docs/v3/implementation/contracts` → `v3/implementation/contracts`, by ADR-015 — a relocation of the home as a whole, not of a file within it; filenames and row IDs unchanged, anchors unaffected). Decision-class rows'
ADRs land `accepted` WITH the draft ratification (the packet-flow ADR
lanes, README §4).

**The realized_map audit (adopted 2026-07-23 — the sweep that found
50+ attribution defects across three subagent-built close maps; the
occurrence bar for graduation from WATCH was met at n=3):**

1. **Machine layer, INSIDE the close act (blocking, seconds):**
   `pnpm v3:realized-map` must be GREEN before the close commit — it
   catches the dominant defect class (a manifest lane refs a C-row
   the map's entry does not cite). Citations use the canonical
   `chN-PM <lanes>` tag form (bare `P2`/`P1b` tags are invisible to
   the scanner — the ch12-C25 lesson). EXTRA citations are
   report-only by design (deliberate context mentions and
   new-decision rows — empty manifest refs, lane-text anchor — are
   legitimate).
2. **Arm layer, DETACHED from the close (non-blocking):** an
   external-arm audit pass over the map (ReviewPacket §6 mechanics;
   the map-audit prompt variant) runs AFTER the close, explicitly
   allowed in parallel with the next chapter's build — the map is a
   record, the fold policy guarantees no surface the next chapter
   reads changes. DEADLINE anchor: settled before the NEXT chapter's
   close. Fold policy: the map block ONLY, never ratified row texts;
   manifest/grep-confirmed folds only; a substantive find (code vs
   ratified text) becomes an OPEN item for the owner — the audit can
   surface real under-realizations (the ch11-C31 precedent), which
   route as work items, never as silent map edits. Convergence: a
   fresh independent full-scope arm run returns CLEAN (or
   clean-modulo-declared-gaps); round budget 3, owner-extendable.
   Neither layer subsumes the other (the sweep's independence tally:
   arm-only 12 / machine-only 7 / both ~27).

## Report

```
Draft: v3/implementation/contracts/ch<N>-<surface>-contract.md
Draft basis: sha256(<file>) = <hash> @ HEAD <commit>, worktree: clean | dirty
Rows: <n> (new-decision seed: <n>)   Probes: <run/cited list | none needed>
Tier 0: <pass | errors>   Panel: <verdict + Gate Coverage Matrix state>
→ awaiting the human ratification act (permanently human)
```
