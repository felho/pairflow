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
   decision. And a collapsed lane ("any throw", "any failure")
   enumerates its members FROM THE CODE (grep the actual throw/branch
   sites of the seam) — each member driven or explicitly ruled out; a
   collapsed lane whose driven examples came from the author's memory
   proves less than its claim (the ch7-P1 crossover lesson: `start.ts`
   had a third throw site the examples missed). The inventory records
   FIVE fields per member — a lane's existence is not its contract:
   `source_site` (file/call), `phase` (pre-state | pre-commit |
   post-commit | post-create — a post-success failure is NOT the same
   lane class as a never-committed one), `event_keyset` (exact
   per-entrypoint shape — attribution must not silently vanish),
   `test_obligation` (the driving test) OR `ruled_out_reason` (the
   explicit prior-contract proof).
4. **Prose-contract scan (the v1 Contract-Dense gate's detection
   half):** prose that carries a deterministic obligation — presence
   conditions / iff-clauses, orderings, counts, error mappings,
   ownership, retention — outside a canonical matrix/table row is a
   finding: contracts live in rows, prose summarizes ("would an
   implementer need this sentence to write a test?" → it is a
   contract). The §5.3 in-context budget (intent, embedding, idiom) is
   the stated exception — a note that smuggles a testable rule is not
   an intent note (the ch7-P1 presence rule drifted precisely because
   it part-lived in cell prose and a note).
5. Any new validator over a numeric domain states the full ladder,
   including `-0` via `Object.is` [R-NUMERIC-LADDER].
6. Structure-vs-semantics: if the packet splits malformed input from
   semantic failure, the line is drawn in exactly ONE place
   [R-STRUCTURE-SEMANTICS].
7. **Watchpoint, not a blocking check** (R-RAW-FIXTURES is WATCH): hostile
   fixture values staged through provably preserving channels (raw text,
   not `JSON.stringify`). A stringify-built hostile fixture is FLAGGED in
   the report — a second occurrence is the promotion trigger at the
   chapter boundary, per the log's own verdict.
8. Test obligations are phrased as EXECUTION, not intention — "driven by
   test X", never "should be tested" [R-EXECUTION].

### 3) Ergonomics half — the v1-inherited rubric (both modes)

1. **Self-containment:** the operative set is in full text; nothing the
   task needs is a pointer ("see file X for the rules" = finding). Every
   flag, narrowing, or decision point the pre-approval summary will raise
   EXISTS as a packet section — a summary-only flag is a finding (the
   dangling-"flagged below" class).
1b. **Mirror discipline (the v1 Contract-Dense gate, inherited):** a
   contract-dense packet (a rule mirrored in ≥2 places, plan aligned
   blocks included) carries a Mirrored Surface Map naming its
   canonical row and every mirror; a rule RESTATED independently in
   two places with no named canonical source is a finding — each
   restatement is a future drift site (the ch7-P1 rounds 6–7 class).
   The step-5 sweep indexes off this map.
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
   only, any, all, exactly once, fail-open, non-blocking, single owner,
   source of truth, by construction*.
2. For each: is it PROVABLE on the actual substrate and by the named
   downstream proof — sync vs async driver reality, lock/ownership
   boundaries, read/write failure behavior, projection/redaction
   surfaces? **Proof means SOURCE-SIDE INVENTORY, not a plausibility
   judgment** (the ch7-P1 crossover lesson, both arms). Two mandatory
   inventories:
   - **Code-path inventory** for *any/all/never/only* lanes: walk the
     seam's ACTUAL code paths (throw sites, branches) INCLUDING the
     transitive call graph — helpers the entry point calls carry their
     own throw sites (the ch7-P1 second-round lesson: a file-scoped
     inventory missed the shared `deriveDispatchIntent` throws) — AND
     the awaited PORT/boundary calls: every `await` on an injected
     dependency is a throw source with ZERO visible `throw` statements
     in repo code (third-round lesson: a rejecting `definitions.load`
     is a distinct lane from its null return); the Matrix Symmetry
     Gate's enumeration mechanic (claim half, step 3) is the tool;
     example lists are not proof.
   - **Free-text boundary inventory**: wherever a *never / redaction /
     secret / payload-never* claim coexists with ANY free-text-capable
     field (`message`, `details`, `reason`, paths, env values), an
     explicit classification is REQUIRED: sanitized-by-contract OR
     untrusted diagnostic free text with a stated confinement boundary
     and the negative bound to the right surface. An unclassified
     free-text field beside a "never" claim is a finding.
   **Plan-consistency is not a defense:** a claim the ratified
   plan also states can still be unprovable — that is a
   `plan_contract_challenge` finding routed to the user, never silently
   accepted (and never silently "fixed" — the divergence/alignment
   machinery owns the resolution).

### 5) Final text sweep (both modes — after any fold)

**Scalar/quantifier sweep:** collect every count and quantifier in the
packet text (*one, both, two/three/four…, all, exactly, zero, any,
every, never, only*) and verify each against the CURRENT lists and
lanes it summarizes — stale scalars are the recurring low-weight drift
class ("three aligned edits" after a fourth landed; "exactly one" vs
the committed-zero lane; "ALL THREE" the day a fourth appears). Prefer
converting counts to lists; a surviving count must be re-derived at
read time. The same sweep covers **conditional presence clauses**
(*iff / only when / present when*): when a presence RULE changes,
every row stating the OLD condition is stale text — a rule change
sweeps every statement of the rule, exactly like a status flip sweeps
every file stating the old status (ch7-P1 round 7: two keysets kept
"iff the envelope carries a payload" after the rule went phase-based).

### 6) Verdict + taxonomy

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
Skill source: installed registry | repo-local file read @ <path, commit, dirty?>
Content half:    <pass | findings…>
Claim half:      <pass | findings…>
Ergonomics half: <pass | findings…>
Contract reality: <pass | findings…>          (pre_approval; flags in self_review)
Text sweep:      <pass | stale scalars…>
Findings by type: <taxonomy-tagged list, considered_not_finding included>
Verdict: ready-for-pre-approval | approve | refine | split
```

The `Skill source` line exists because activation path and text
freshness are separable: a runner may read this file from the repo
without the registry's (possibly stale, restart-gated) trigger layer —
the report must make visible WHICH version of this workflow actually
acted, or a discovery bug hides behind a manual file read.
