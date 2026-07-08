# ReviewPacket Workflow

Review a task packet in one of TWO modes — they are different jobs, and
conflating them narrows the review (the ch7-P1 twin-session lesson: a
checklist executed as the review's DEFINITION found exactly the
checklist's rows and nothing outside them).

## Input

- `PACKET_PATH`: the packet file under `docs/v3/implementation/packets/`
- `REVIEW_MODE`: `self_review` | `pre_approval` — resolve from the ask:
  - "self-review", "pre-approval prep", AuthorPacket's final step →
    `self_review` (authoring-side: catch what a checklist can catch, so
    the human round spends its findings on judgment, not mechanics)
  - "review pls", "verdikt", approve/refine/split preparation, any
    review of someone ELSE's packet → `pre_approval` (challenge review:
    the checklist is the FLOOR, not the definition)

## Workflow

### 1) Content half — ledger consistency (both modes)

1. The `ledger_slice` machine block parses and uses only the template §1
   machine tokens (dispositions, id syntax). An operability packet declares
   `[]` on every axis EXPLICITLY [R-EMPTY-SLICE].
2. Every declared unit id resolves to a file under
   `docs/v3/convergence/model-src/units/` (spot-check by `ls`, not memory).
3. Rejection strings match ledger §3 EXACTLY (grep the ledger).
4. Operative material is verbatim (spot-check one unit against its source);
   contract/type rows carry registry **field lists**, not entity names
   [R-FIELD-LISTS].
5. The trace is an executable expectation, not narrated behavior.
6. Rejection branches of the slice are covered or explicitly deferred; the
   drift-test surface is named in acceptance.

### 2) Claim half — the learned failure classes (both modes)

1. The Claim is stated WIDE and its dimensions are enumerated BEFORE any
   derived test rows [R-WIDE-CLAIM, R-DIMENSIONS].
2. Every canonical matrix lane maps to a named test obligation — a lane
   with no driving test is a finding NOW, not at aftermath [R-MATRIX-LANES,
   R-CLAIM-NEGATIVES]. A lane declared "cannot occur" is not exempt: it
   either leaves the matrix for an explicitly-marked non-lane note (with
   the prior-contract proof cited), or it gets driven.
3. **Matrix Symmetry Gate:** if a matrix pulls an entrypoint in on any
   error/failure lane, its SUCCESS lane must appear as an explicit
   no-emit / no-effect negative — or carry a stated out-of-scope
   decision. A matrix that enumerates only the lanes the author thought
   of proves less than its claim.
4. Any new validator over a numeric domain states the full ladder,
   including `-0` via `Object.is` [R-NUMERIC-LADDER].
5. Structure-vs-semantics: if the packet splits malformed input from
   semantic failure, the line is drawn in exactly ONE place
   [R-STRUCTURE-SEMANTICS].
6. **Watchpoint, not a blocking check** (R-RAW-FIXTURES is WATCH): hostile
   fixture values staged through provably preserving channels (raw text,
   not `JSON.stringify`). A stringify-built hostile fixture is FLAGGED in
   the report — a second occurrence is the promotion trigger at the
   chapter boundary, per the log's own verdict.
7. Test obligations are phrased as EXECUTION, not intention — "driven by
   test X", never "should be tested" [R-EXECUTION].

### 3) Ergonomics half — the v1-inherited rubric (both modes)

1. **Self-containment:** the operative set is in full text; nothing the
   task needs is a pointer ("see file X for the rules" = finding). Every
   flag, narrowing, or decision point the pre-approval summary will raise
   EXISTS as a packet section — a summary-only flag is a finding (the
   dangling-"flagged below" class).
2. **Density:** every in-context note line has failed both the
   "environment?" and "data?" tests; an overflowing budget means the cut is
   wrong → recommend split along constraint cohesion.
3. **Embedding gates current:** target files/entrypoints verified against
   the live tree (`ls`/`grep`), type-ripple targets (fakes, stubs, test
   files) included; the mutation boundary is exact.
4. **Plan consistency:** no packet decision silently contradicts ratified
   plan text — any contradiction has its prepared same-commit plan edit
   [R-ALIGNED-UP].

### 4) Contract Reality Gate (`pre_approval` mode; in `self_review` it
downgrades to a flag, never silent acceptance)

The checklist above is a FLOOR. Now derive checks from the packet's OWN
claims [R-CLAIM-NEGATIVES applied to the review itself]:

1. Collect every STRONG contract word in the packet: *never, always,
   only, exactly once, fail-open, non-blocking, single owner, source of
   truth, by construction*.
2. For each: is it PROVABLE on the actual substrate and by the named
   downstream proof — sync vs async driver reality, lock/ownership
   boundaries, read/write failure behavior, projection/redaction
   surfaces? **Plan-consistency is not a defense:** a claim the ratified
   plan also states can still be unprovable — that is a
   `plan_contract_challenge` finding routed to the user, never silently
   accepted (and never silently "fixed" — the divergence/alignment
   machinery owns the resolution).

### 5) Verdict + taxonomy

Classify EVERY issue considered — nothing is dropped silently:

- `packet_defect` — the packet itself is wrong/incomplete
- `packet_plan_drift` — packet contradicts ratified plan text [R-ALIGNED-UP]
- `plan_contract_challenge` — packet and plan agree, but the claim is
  challenged against reality (user's call)
- `watchpoint` — flagged, non-blocking (e.g. R-RAW-FIXTURES lanes)
- `considered_not_finding` — examined and cleared, with one line why

Verdict:
- **ready-for-pre-approval** (self_review) / **approve** (pre_approval)
- **refine** — findings listed, fold and re-run this workflow
- **split** — the density/size gates fired; propose the cut along
  constraint cohesion (split packets re-declare slices; the coverage union
  must still close).

## Report

```
Self-review / Review: <PACKET_PATH>
Scope of this review: self_review | pre_approval
Content half:    <pass | findings…>
Claim half:      <pass | findings…>
Ergonomics half: <pass | findings…>
Contract reality: <pass | findings…>          (pre_approval; flags in self_review)
Findings by type: <taxonomy-tagged list, considered_not_finding included>
Verdict: ready-for-pre-approval | approve | refine | split
```
