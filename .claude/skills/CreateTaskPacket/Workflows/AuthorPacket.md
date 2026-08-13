# AuthorPacket Workflow

Compile one task packet from a ratified plan-chapter step. Spec-writing is
**projection, not invention** (README §5.2): the packet selects and compiles
material the model corpus already resolved; it never re-derives semantics.

## Input

- `PACKET_ID`: `ch<N>-p<M>[a-z]?-<slug>` — the split suffix is optional
  (precedent: `ch6-p4a-*` / `ch6-p4b-*` from the ratified P4 split);
  matches the file name under `v3/implementation/packets/`.
  OPTIONAL: when the ask is just "the plan's next step", DERIVE it —
  see step 0a.
- `PLAN_SECTION`: the plan.md section this packet realizes (e.g. `§7.2`)
- `PRIOR_FINDINGS`: optional — findings from an earlier refine round to fold

### 0a) Next-step derivation (when no PACKET_ID is given)

Deterministic, from repo surfaces ONLY — no session memory:

1. **The open chapter** = the plan intake map's (plan.md §1.3) first
   row whose Status is not `realized` AND whose chapter section exists
   (the header's "Chapters present" range). No such row → the next
   step is proposing the NEXT chapter's ratification (a user verdict
   gates it) — STOP after presenting the proposal.
2. **The next packet** = the first row of the open chapter's
   Packets-and-flow-mode table (resolve it BY HEADING in the plan —
   the chapter section whose heading STARTS WITH `Packets`; the
   NUMBER wanders by chapter (4.8/5.8/6.7/7.7), legacy headings
   vary, and ch8+ headings are exactly `Packets and flow mode` per
   the plan's convention paragraph) with NO packet file under
   `v3/implementation/packets/` — a packet file lands in git only
   WITH its build commit (the one-commit rule), so absence = not
   built. EDGE: an UNCOMMITTED packet file in a dirty worktree is a
   packet IN FLIGHT (pre-approval) — resume it, do not skip it.
2b. **Draft-phase branch:** if ANY contract-draft the open chapter's
   Packets-and-flow-mode table references is not yet
   ratified-or-later (file absent,
   status `draft`, or `reopened`), the next step is the
   **DraftContract** round for THAT draft, not packet authoring —
   packets anchor only to ratified rows (README §4). The late-B STOP
   (below) remains the entry for the unpredicted case.
3. **All packet files present** → the next step is the chapter CLOSE
   (README §6 DoD: full `ci:local`, map-row + PI flip, boundary
   review), not a new packet.
4. **Announce the derivation IMMEDIATELY** — one visible status line
   the moment it is derived ("derived: <chapter> open, <built list>
   built → <PACKET_ID>; drafting now"), BEFORE the source-loading and
   drafting work begins, and repeat it in the pre-approval summary.
   The first fresh-session run derived in ~60s but stayed silent for
   18 minutes — from the outside, silent derivation is
   indistinguishable from a lost agent.

## Workflow

### 0) Preconditions (STOP gates)

1. The owning chapter is **ratified** in `plan.md` (its section exists and
   the chapter header carries an autonomy stage). If not → STOP: packets are
   authored only from ratified chapters.
2. If `PRIOR_FINDINGS` is set, this is a refine pass: read the existing
   packet file first and fold the findings exactly as given — findings are
   folded, not reinterpreted.

### 1) Load the binding sources

Read, in this order (current state, never from memory):

1. `v3/implementation/task-packet-template.md` — template §1,
   projection checklist §2, `REV-*` registry §3. The checklist §2 is the
   authoritative step list; this workflow operationalizes it, it does not
   replace it.
2. The `PLAN_SECTION` in `v3/implementation/plan.md`, including any
   chapter rules and packet watchpoints recorded at ratification.
3. `references/LearnedRules.md` — the failure-class registry applied at the
   steps marked below.
4. The most recent packet of the same class under
   `v3/implementation/packets/` — conventions are inherited from the
   latest precedent, not reinvented.

### 2) Classify the packet

1. **Kernel-semantic** (realizes ledger material) → the slice is non-empty;
   pull it in step 3.
2. **Operability** (CLI / floor / tooling — adds ZERO kernel semantics) →
   declare the **empty** ledger slice explicitly [R-EMPTY-SLICE]; the
   packet's claim surface is its canonical contract matrices instead.
3. **First-of-a-kind?** If this packet class has no precedent → the
   approve is the human's regardless of trust stage [README §5.5 first-of-a-kind;
   canonical statement: README §5.5]. Otherwise inherit the chapter's
   declared stage.
4. **Predicted class + sizing (BEFORE drafting):** read the chapter's
   predicted class for this packet (plan §1.3 convention, from ch8
   ratifications on; the authoring-time DISCOVERY below is always the
   authority — a mismatch routes to a friction-log line). Run the
   sizing heuristics: substrate novelty, claim families, matrix
   families, dimension count, sibling-packet fanout (the adopted
   Closure-Budget bucket-coincidence trigger is subsumed by these
   axes) — PLUS the v1-inherited SIX risk axes as split triggers
   (authority movement, surface spread, identity/join fragility,
   foundation+activation coupling, prerequisite coupling, acceptance
   multiplicity; the hard-stop combinations are split-REQUIRED and
   the packet MATERIALIZES the assessment as its `## Sizing/risk`
   record — canonical statement: template §2 step 0). Their outcome feeds the split decision: an IN-CHAPTER split
   executes autonomously per the README §5.5 verdict-action matrix —
   split parts inherit mode, predicted class, and watchpoints; each
   part gets a fresh watchdog budget; autonomous split depth is 1
   (deeper → STOP).
5. **Provenance classification (the D1 detector — discovered during
   authoring, declared as written):** every canonical row enters the
   `packet_rows` manifest with its class — `anchored` (strict ref:
   `contract:chN-<surface>#Cn` or `ADR-NNN`; other provenance is
   `prose:`-prefixed), `derived` (its one-line DERIVATION NOTE lives
   in the row's own table text — review material for the entailment
   attack, never manifest data), or `new-decision`. **Case B fires**
   on new-decision mass over the permissive threshold OR
   ANY new-decision row touching authority / separation /
   availability-class semantics (tightening the threshold is a config
   change, not a redesign): STOP authoring BEFORE drafting continues
   and route to **DraftContract** — the new-decision row set is the
   draft's seed content. The case verdict (projection/invention),
   computed from the manifest tally plus the semantic trigger, goes
   in the packet header with a one-line derivation (template §1).

### 3) Project the slice (checklist §2 steps 1–4)

For kernel-semantic packets:

1. Select the slice along **constraint cohesion**, from the plan step.
2. Pull the unit pseudocode **verbatim** from
   `v3/model/units/` — no paraphrase.
3. For every contract/type row: pull the registry **field lists** from the
   model source, never entity names alone [R-DELEGATION-CLOSURE].
4. Pull the **exact rejection strings** (ledger §3) for the slice.
5. Carry the trace as an **executable expectation** (the committed-row
   sequence tests must reproduce), never narrated behavior.
6. **Divergence stop:** if projection exposes a model bug or gap, STOP
   (README §6). It goes back to the model plane; it is never patched in
   the packet.

### 4) State the claim, then enumerate its dimensions

1. Write the packet **Claim** first, stated WIDE — what the surface
   guarantees, not what the implementation happens to do [R-CLAIM-NEGATIVES].
2. Enumerate the claim's **dimensions** BEFORE deriving any test rows
   [R-DIMENSIONS]. For any validator over a numeric domain the ladder is
   mandatory: value → descriptor → prototype → numeric identity (`-0` via
   `Object.is`) [R-DIMENSIONS].
3. Where the packet declares a surface contract (exit codes, parse rules,
   config resolution, error-doc schemas), write it as a **canonical
   contract matrix** — and remember every lane must be DRIVEN by a test at
   build time [README §4 step 2]. Negative tests derive from the claim/matrix,
   never from the implemented rule list [R-CLAIM-NEGATIVES]. Two
   exhaustiveness disciplines at WRITE time (cheaper than at review):
   - a collapsed lane ("any throw", "all failures") enumerates its
     members FROM THE CODE — the seam's actual throw/branch sites
     INCLUDING its transitive call graph (helpers carry their own
     throw sites; a file-scoped grep is not an inventory) AND its
     awaited port/boundary calls (every `await` on an injected
     dependency can reject with zero visible `throw` sites; a port's
     failure lane is distinct from its null/empty return lane) — each
     named and driven, or explicitly ruled out; enumerate as a LIST,
     never a count ("all three" goes stale the day a fourth appears);
     record per member (a list, not a count — this schema itself may
     grow): `source_site`, `phase` (pre-state | pre-commit |
     post-commit | post-create), `event_keyset` (exact per-entrypoint
     shape), `field_provenance` (per optional/derived field: presence
     condition + value source — already-in-hand vs newly computed;
     the observer path does NO new fallible work), `test_obligation`
     or `ruled_out_reason`;
   - **Prose-contract extraction** (the v1 Contract-Dense gate's
     DETECTION half, Policy #1): scan every prose surface of the draft
     — claim text, in-context notes, flag entries, matrix CELL prose —
     for sentences carrying a DETERMINISTIC obligation (presence
     conditions / iff-clauses, orderings, counts, error mappings,
     ownership, retention). Each hit MOVES into a canonical
     matrix/table row (a small dedicated table is fine — e.g. a
     per-lane presence matrix), leaving a reference behind. The test:
     "would an implementer need this sentence to write a test?" → it
     is contract, not prose. What legitimately STAYS prose is the §5.3
     in-context budget: intent notes, embedding knowledge, non-lintable
     idiom — never a testable rule.
   - **Mirrored Surface Map** (the same v1 gate's Required Output #4 —
     the README §5.2 ergonomics inheritance, realized): when a rule or
     contract appears in MORE than one place (type matrix, matrix
     rows, in-context notes, dimensions, the plan's aligned blocks —
     cross-artifact mirrors count), the packet states it ONCE in its
     canonical row and NAMES the mirrors in a small map; every other
     mention summarizes/defers, never restates independently. Fold
     policy: a change to a canonical row updates EVERY named mirror
     before handing back; a mirror discovered during review is ADDED
     to the map, never re-discovered next round.
   - every free-text-capable field (`message`, `details`, `reason`,
     paths) is CLASSIFIED against the packet's payload/redaction
     claims: sanitized-by-contract or untrusted-confined, stated in
     the field's own row.
4. If any validation contract splits malformed-input from
   semantic-failure handling, draw the structure-vs-semantics line in ONE
   place in the packet (one-place discipline — lens duty, own carrier).
5. **Delegation closure at WRITE time:** a claim that delegates its
   definition to another artifact (*"P1-declared"*, *"per ledger §X"*,
   *"the ch-N culture"*) is expanded HERE — pull the delegated
   source's FULL rule set (field lists, presence conditions/iffs, enum
   domains) into the packet's canonical rows (the R-DELEGATION-CLOSURE
   discipline extended to cross-artifact references), and state the
   PROOF BOUNDARY for any pulled rule the packet's own surface cannot
   decide. A delegating claim left as a pointer is a self-containment
   defect the review finds LATE (the ch7-P2 round-8 class: the
   presence iffs behind "P1-declared projection" stayed unexpanded
   for six rounds).

### 5) Constraint transformation + in-context budget (checklist §2 steps 5–7)

For each candidate rule: environment? → backlog for a constraint sink, not
packet prose; data? → include verbatim; neither → it consumes the in-context
budget. If the budget overflows, the cut is wrong — split along constraint
cohesion and re-declare slices (the coverage union must still close).

### 6) Embedding gates (checklist §2 step 8)

Target files, entrypoints, mutation boundary — verified against the
**current codebase** (run `ls`/`grep`; the corpus describes target
semantics, not the growing tree). Include type-ripple targets: fakes,
stubs, and test files that structurally break when a port changes.

**Substrate claims are PROBED, not presumed:** any matrix/lane cell
resting on driver/OS/filesystem behavior (journal modes, readonly
semantics, internal tables, DDL write points, open-sequence ordering)
carries an in-session probe result (a scratchpad script against the
real driver — the ch7-P2 `walcheck.mjs` pattern) or a concrete cited
source AT AUTHORING TIME; a contested probe (two environments
disagree) removes the premise from the claim — re-design the
lane/fixture so no claim stands on it (ch7-P2 rounds 2–4).

### 7) Plan alignment

If any packet decision contradicts ratified plan text, prepare the plan
edit NOW, marked `aligned at <PACKET_ID> pre-approval`, to land in the SAME
commit as the packet [R-ALIGNED-UP]. Never a silent divergence, never a
deferred edit.

### 8) Write the packet file

`v3/implementation/packets/<PACKET_ID>.md`, following template §1
exactly: header (plan step + autonomy stage + the classification line:
case verdict with its one-line derivation), the THREE authoring-time
machine blocks — `ledger_slice` (empty or full — always present),
`mutation_boundary`, `packet_rows` (the manifest; form rules in
template §1) — plus the flags section's labeled Route lines (prose
fields, not a machine block; a `declined` route is
`declined — <reason>`); `packet_metrics` is the CLOSE-time machine
block, filled at build close. Then Claim + dimensions, operative
material, canonical matrices, in-context notes, embedding gates,
acceptance (CT-*/CHK-*/REV-* ids). English only. Fixture **watchpoint**
(a standing authoring discipline; its registry row retired at the
ch9 boundary — absorbed by the template's own paragraph + the
build-close sensitivity pass): prefer staging hostile
values (e.g. `-0`) through channels that provably preserve them — raw
text, not `JSON.stringify`; a stringify-built hostile fixture is flagged
in the pre-approval summary, not a blocker.

**Pre-approval flags live IN the packet:** if the summary will raise ANY
flag, narrowing, or decision point, the packet gets a `## Pre-approval
flags` section carrying them in full — the summary may only REFERENCE
it. A flag that exists only in chat is a self-containment defect (the
ch7-P1 dangling-"flagged below" lesson).

### 9) The panel loop, then the human decision points

1. Run the **ReviewPacket** panel on the draft — the SINGLE engine
   (one review DEFINITION; ReviewPacket §5's fold-class scoping
   decides which lenses re-run after a fold: targeted by default
   after a CONTENT fold, one reconciliation pass after a BOOKKEEPING
   fold, with mandatory full-escalation triggers — and ReviewPacket
   §5's fold-EXECUTION discipline binds here too: a fold-batch's
   edits go out as ONE response, verified by one
   `pnpm v3:check-docs` call; the approve gate =
   the v1-shape CLOSE — a top-level reconciliation decision over the
   final hash, per ReviewPacket §4; model policy per the same
   section — EVERY pass Opus-class, amended 2026-07-10). The loop is AUTONOMOUS:
   `refine` verdicts fold and re-run per that scoping; in-chapter
   `split` verdicts apply the Packets-and-flow-mode repartition per
   step 2's inheritance and
   depth-1 rules; watchdog 8 per target. Contract-reality issues
   become pre-approval flags, never silent acceptance.
2. **Flag write-back loop:** if the self-review yields ANY flag,
   watchpoint, or contract-reality issue not already carried in the
   packet's `## Pre-approval flags` section, write it INTO the section
   (amend the packet) and RERUN the self-review — repeat until a pass
   adds nothing new. A flag born in the review and living only in chat
   is exactly the dangling-flag class this rule exists for. And when a
   fold DEEPENS an inventory rule (a new throw-source class, a new
   dimension), RE-DERIVE the ENTIRE inventory under the deepened rule
   — applying it only to the member the finding named is the "fix
   scoped to the finding just caught" loop (the ch7-P1 rounds 5→6
   lesson: the port-boundary rule was applied to `definitions.load`
   only, and the next round found `loadInstance`/`findOp`/
   `commitTransition` still collapsed).
3. **Fresh-eyes propagation check (after every fold round — this IS
   ReviewPacket §5's reconciliation pass, one mechanism):** the
   author's post-fold context carries "I already fixed it" bias — a
   single LLM pass rarely lands ALL consequences of a logical change.
   Before presenting: (a) state each fold as a one-line DELTA ("the
   presence rule is now phase-based", "the lane set gained X"); (b)
   hand ONLY the delta list + the mutation-boundary files + the
   Mirrored Surface Map to a FRESH-context sub-agent/reviewer pass
   with no fold history; its sole task: find every statement
   inconsistent with the deltas (old conditions, un-updated mirrors,
   contradicted scalars/keysets); (c) fold its hits and repeat until
   it returns clean — with one EXIT: a CONTENT hit (canonical-row
   semantics, a lane set, a claim statement, a manifest class)
   reclassifies the fold per ReviewPacket §5 (the void applies and
   the re-run is scoped there); only propagation/bookkeeping hits
   iterate in this loop, and THREE consecutive non-clean passes
   escalate to a targeted round. This is the self-healing half of the pair: the
   mirror map SHRINKS the propagation surface, the fresh pass VERIFIES
   the remainder (ch7-P1 rounds 4/6b/7 are the driving evidence —
   each was a propagation miss a fresh reader caught one round later).
4. Present the summary in the session's chat language, per README
   §6's HUMAN-GATE PRESENTATION DISCIPLINE (one decision per message ·
   self-contained context · role + risk statements · a recommendation
   always · closed vocabulary · roadmap-then-steps · one-word answers
   suffice): the derivation
   announcement (0a), the slice (or its declared emptiness), the
   classification verdict + manifest tally, the claim + dimensions,
   the matrices, the embedding gates, open risks — flags REFERENCED
   from the packet section, never introduced summary-only.
5. **The loop stops exactly at the human decision points (the README
   §5.5 verdict-action matrix):** at every STOP, always; at every
   FLAG-BEARING approve (STOP `4:flagged-approve`, the human's at
   every stage); and at the ch7 pilot / first-of-a-kind approves.
   From ch8 on, a FLAG-FREE approve (zero new-decision manifest rows,
   zero approve-ratified routes, every approve-time tier-0 gate
   green, a clean close per ReviewPacket §4) is AUTONOMOUS: the loop
   passes the two MANDATORY transitional external-arm gates (README
   §5.5, user-ratified 2026-07-11; mechanics: ReviewPacket §6) —
   (a) the agent-invoked arm on the approve-ready bytes BEFORE build:
   a clean, final-hash-citing verdict is the build precondition, arm
   findings fold as ordinary folds, and an arm-minted flag-bearing
   item DEMOTES the approve to the human path; (b) the arm's
   implementation review at BUILD CLOSE (after the commit + audit):
   the packet is DONE only on a clean, sha-citing verdict, substance
   findings folding per the README §4 aftermath rules — then proceeds
   to build (README §4 — one packet, one commit, post-build audit at
   close). The diminishing-returns cutoff binds per gate; an
   unavailable arm is a BLOCKER → STOP, never a silent skip.
   **Entry mode is the trust dial:** the user chooses per work item —
   prompt-by-prompt in the loop, or delegating a whole
   packet/chapter; no formal mechanism needed. On the HUMAN-GATED
   paths this workflow never proceeds to build and never marks a
   packet approved.

## Report

```
Packet drafted: v3/implementation/packets/<PACKET_ID>.md
Class: kernel-semantic | operability   First-of-a-kind: yes/no
Classification: projection | invention (manifest tally: a/d/n) — B-case: routed to DraftContract?
Slice: <n units / n rejections / n invariants / n traces | EMPTY (declared)>
Panel: <rounds run, last verdict + Gate Coverage Matrix state>
Propagation: <lens-4 pass result: clean | hits folded (list)>
Plan alignment: <none | prepared edit for §X, same-commit>
→ autonomous flag-free approve — arm gate 1 (approve bytes): <verdict + hash> → build → arm gate 2 (implementation): <verdict + sha> | at a human decision point: approve | STOP <member token>
```
