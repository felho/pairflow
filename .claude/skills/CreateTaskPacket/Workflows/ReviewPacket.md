# ReviewPacket Workflow — the panel engine

ONE review engine (process-v2 D4): a five-lens, fresh-context panel
with a Gate Coverage Matrix and a single verdict set. The pre-v2
dual-mode split (`self_review` / `pre_approval`) is retired — the loop
invokes this same panel every round, and a standalone "review pls"
invocation runs the same engine. There is ONE review DEFINITION —
re-run SCOPING (§5 below, adopted at the ch7-P3 pilot evaluation)
narrows WHICH lenses re-run after a fold, never WHAT a lens checks:
a lens that runs, runs its full duty list. *(History:
v2's `split` / `refine` / `approve` adapts v1 ReviewSpec's
`approve_task` / `refine_task` / `route_back_to_plan` /
`block_not_ready`; the pre-v2 "ready for pre-approval" state name
retired with the modes.)*

Process authority: `docs/v3/implementation/README.md` §5.5 (the
autonomy envelope, the STOP registry, the finding policy — this file
is the procedure mirror; if they disagree, the README wins). Form
authorities: `task-packet-template.md` (packets),
`contract-draft-template.md` (drafts).

## Input

- `TARGET_PATH`: a packet under `docs/v3/implementation/packets/` or a
  contract-draft under `docs/v3/implementation/contracts/`.
- Target kind is derived from the path. For DRAFTS the panel is scoped:
  the substrate lens FULLY applies (probes are tree-independent);
  embedding-class checks are `n/a (draft)` in the matrix — a resolved
  state, never `missing`; the draft loop's verdict set has no `split`
  (a draft split is STOP `2:draft-split`).

## Workflow

### 0) Tier-0 gates (by target kind)

- **Packets — the APPROVE-TIME column** (the inventory with gate
  points lives in README §5.5): `pnpm v3:packet-lint` **with
  `--forbid-reopened`** (the zero-reopened gate), `python3
  tools/v3-plan/check_coverage.py --fold-time` (coverage validation;
  the owned==realized lock is BUILD-CLOSE — an approved-but-unbuilt
  packet's units are necessarily pending), the drift tests,
  `pnpm v3:adr-check`, and any substrate-probe scripts the target
  names. Every approve-time gate green is an approve PRECONDITION;
  the P8 post-build audit is a build-close gate, not an approve gate.
- **Drafts — tier 0 = the draft-lint only** (`pnpm v3:packet-lint`
  covers the contracts dir; the form registry is
  contract-draft-template §3), WITHOUT `--forbid-reopened`: a
  `reopened` draft under its own re-ratification review is the
  legitimate transient state — the zero-reopened gate binds at packet
  approve / chapter close / process flips, never at the draft's own
  review. The coverage/drift/ADR gates are packet-side (n/a here).

### 1) The five lenses — fresh-context sub-agents, on the final bytes

Each lens runs as a FRESH-CONTEXT sub-agent (single model family is
fine — model diversity is phase 2's job): the author's context NEVER
scores its own bytes clean. Every lens report cites the target's
packet-basis hash; a lens that did not run is `missing` in the matrix
and blocks approve — silence is never coverage. In a TARGETED round
(§5) a deliberately skipped lens is `skipped (proven unaffected:
<reason>)` — a RESOLVED state, never `missing`; a lens with no
recorded state at all remains `missing` and blocks. A `skipped`
state is resolved for its ROUND; at the approve, §4's close verifies
the deltas since each lens last ran. The LearnedRules
registry (`references/LearnedRules.md`) is CONSUMED at the lens named
per rule below. **The duty lists below are a FLOOR, never the
review's definition** (the ch7-P1 twin-session lesson: a checklist
executed as the review's definition found exactly the checklist's
rows and nothing outside them) — each lens ALSO derives checks from
the target's OWN claims beyond its enumerated duties.

**Lens 1 — substrate / contract reality** *(owns: Substrate Reality
Probe + contested-probe corollary; the strong-word inventories)*

1. Collect every STRONG contract word in the target: *never, always,
   only, any, all, exactly once, fail-open, non-blocking, single
   owner, source of truth, by construction*. For each: is it PROVABLE
   on the actual substrate and by the named downstream proof? **Proof
   means SOURCE-SIDE INVENTORY, not a plausibility judgment.** Judge
   each seam against its OWN contract character (a fail-open
   best-effort channel vs an authoritative fail-loud store) —
   structural parity with a neighboring seam is NOT a frame (the
   ch7-P4 close-contract miss: ten same-family lenses cleared an
   unguarded release by main-store parity).
2. **Code-path inventory** for *any/all/never/only* lanes: walk the
   seam's ACTUAL code paths (throw sites, branches) INCLUDING the
   transitive call graph — helpers carry their own throw sites — AND
   the awaited PORT/boundary calls: every `await` on an injected
   dependency is a throw source with ZERO visible `throw` statements
   in repo code (a rejecting port is a distinct lane from its null
   return). Example lists are not proof.
3. **Free-text boundary inventory**: wherever a *never / redaction /
   secret / payload-never* claim coexists with ANY free-text-capable
   field (`message`, `details`, `reason`, paths, env values), an
   explicit classification is REQUIRED: sanitized-by-contract OR
   untrusted diagnostic free text with a stated confinement boundary
   and the negative bound to the right surface.
4. **Substrate Reality Probe**: any lane/matrix cell whose truth
   depends on SUBSTRATE behavior (driver/OS/filesystem: journal modes,
   readonly semantics, internal tables, DDL write points,
   open-sequence ordering) is admissible ONLY with an in-session probe
   (a scratchpad script against the real driver — the ch7-P2
   `walcheck.mjs` pattern) or a concrete cited source; plausibility is
   NOT admissible. Corollary — CONTESTED probes: when two probes
   disagree, NO claim may stand on the contested premise — remove the
   premise (re-design the lane/fixture) or drive both environments.
5. **Measurement re-run for completeness claims** (adopted at the ch8
   boundary — the ch8-P2 arm-gate-1 catch) [R-UNTRUNCATED-SWEEP]: a
   "full set / all N / nothing else" claim over the TREE is verified
   by RE-RUNNING its defining measurement, untruncated — never by
   reading the target's transcription of it. A truncation-SATURATED
   transcript (hit count == the cut limit) is an automatic finding
   until re-measured: the saturated cut is itself the overflow
   signal. Scope: the canonical rows' completeness claims (cheap
   greps), not every measurement.

**Lens 2 — projection / delegation closure** *(owns: the content
floor; the derived-row entailment attack; draft→packet semantic
drift)*

1. Content floor (kernel-semantic targets): the `ledger_slice` block
   parses with the template §1 machine tokens; an operability packet
   declares `[]` on every axis EXPLICITLY [R-EMPTY-SLICE]; every unit
   id resolves to a file under `model-src/units/` (spot-check by `ls`,
   never memory); rejection strings match ledger §3 EXACTLY (grep);
   operative material is verbatim (spot-check one unit); contract/type
   rows carry registry **field lists**, not entity names
   [R-FIELD-LISTS]; the trace is an executable expectation; rejection
   branches covered or explicitly deferred, drift-test surface named.
2. **Projection/Delegation Closure**: every claim that DELEGATES its
   definition (*"P1-declared"*, *"per ledger §X"*, *"canonical body"*)
   — pull the delegated source's FULL rule set (field lists AND
   presence conditions/iffs AND enum domains), derive
   invalid-but-conforming-at-first-glance counterexamples, check each
   against the driven lanes. Key/type-level validation alone proves
   less than the wording (the ch7-P2 round-8 lesson).
3. **Derived-row entailment attack**: for each `derived` manifest row,
   attempt an ALTERNATIVE row equally consistent with the cited
   anchors (the row's in-row derivation note is the input) — if one
   exists, the row was a decision: reclassify `new-decision`
   (`anchored` is machine-checkable, `new-decision` stops — `derived`
   is the soft spot).
4. **Draft→packet semantic drift**: a packet row anchored
   `contract:chN-<surface>#Cn` must preserve the draft row's MEANING,
   not just resolve the reference — the mechanized drift tests cover
   model↔code, not this surface.

**Lens 3 — claim negatives / matrix symmetry** *(owns: every lane
driven; wide-claim coverage; the prose-obligation pair; the text
sweep)*

1. The Claim is WIDE and its dimensions enumerated BEFORE derived test
   rows [R-WIDE-CLAIM, R-DIMENSIONS]; negatives derive from the
   claim/matrix, never the implemented rule list [R-CLAIM-NEGATIVES].
2. **Every canonical matrix lane is DRIVEN** by a named test
   obligation [R-MATRIX-LANES]. A lane declared "cannot occur" either
   leaves the matrix for an explicitly-marked non-lane note (with the
   prior-contract proof cited) or gets driven. **Sensitivity probe
   (adopted at the ch8 boundary — the ch8-P2 arm-gate-2 catch)
   [R-LANE-SENSITIVITY]: driven means ABLE TO FAIL.** Per driven
   lane, name a plausible violation of the row's MEANING and check
   the named test would CATCH it; a lane whose test cannot fail on
   its row's violation is NOT driven — a finding. The ch8-P2 blind
   classes to probe for: a keyset-only assert passing wrong CONTENT;
   a single-form fixture blind to a split/ordering regression (the
   one-`@` refs); a rule's stated-but-undriven half (missing vs
   empty); a projected-field equality passing a full-row divergence.
   **Spec-vs-build altitude (adopted 2026-07-17 — README §5.5):**
   the packet drives lanes as DISCIPLINE + FAMILY INVENTORY
   (parameterized membership, owner named); this lens verifies every
   declared family carries BOTH and that the membership rule is
   falsifiable — it does NOT demand fixture-level enumeration: a
   finding demanding it at spec time is `deferred-to-build` BY RULE
   (the build-close arm gate's sensitivity pass owns the
   member-by-member check against the BUILT test bodies).
3. **Matrix Symmetry Gate**: an entrypoint pulled in on any
   error/failure lane needs its SUCCESS lane as an explicit
   no-emit/no-effect negative — or a stated out-of-scope decision. A
   collapsed lane ("any throw") enumerates its members FROM THE CODE;
   the per-member record: `source_site`, `phase` (pre-state |
   pre-commit | post-commit | post-create), `event_keyset`,
   `field_provenance` (presence condition + value source —
   already-in-hand vs newly computed; the observer path does NO new
   fallible work), and `test_obligation` OR `ruled_out_reason`.
4. **Prose-obligation pair** (both withdrawn from tier 0 to review —
   lens material, not machine data): the **prose-contract scan** —
   prose carrying a deterministic obligation (presence
   conditions/iffs, orderings, counts, error mappings, ownership,
   retention) outside a canonical row is a finding ("would an
   implementer need this sentence to write a test?" → contract; the
   §5.3 in-context budget is the stated exception); and **prose
   range/scalar consistency** — lane ranges and counts stated in prose
   verified against the actual lane set.
5. Numeric-domain validators state the full ladder incl. `-0` via
   `Object.is` [R-NUMERIC-LADDER]; structure-vs-semantics drawn in ONE
   place [R-STRUCTURE-SEMANTICS]; test obligations phrased as
   EXECUTION [R-EXECUTION]; hostile fixtures staged through preserving
   channels — a stringify-built hostile fixture is a WATCHPOINT
   [R-RAW-FIXTURES, watch status].
6. **Final text sweep** (after any fold): every count/quantifier
   (*one, both, all, exactly, zero, any, every, never, only*) verified
   against the CURRENT lists it summarizes — prefer converting counts
   to lists; the same sweep covers conditional presence clauses (*iff
   / only when / present when*): a rule change sweeps every statement
   of the rule.
7. **Claim grammar [R-CLAIM-GRAMMAR] (adopted 2026-07-17 — template
   §2):** every completeness/universality claim takes ONE of three
   closed forms — MEASURED (a current-tree set riding its
   untruncated receipt, R-UNTRUNCATED-SWEEP), PARAMETERIZED ("every
   member of the declared <set> satisfies X" — parameter marked,
   membership owner named), or SCOPED (explicit named exclusions
   with their deferral home). Bare wholesale rhetoric (*all, only,
   exact, complete*) with none of the three closures is a finding —
   the fix is a FORM choice, never content invention; a completeness
   finding against a CONFORMING claim must name which closure fails
   (stale measurement / wrong membership rule / wrong exclusion).

**Lens 4 — mirror / propagation** *(owns: the post-lint semantic
remainder; the fresh-eyes function)*

1. The **Mirrored Surface Map** is checked mirror by mirror — a
   contract-dense target states each rule ONCE in its canonical row
   and NAMES the mirrors; an independent restatement with no named
   canonical source is a finding; a mirror discovered here is ADDED to
   the map, never re-discovered next round.
2. After any fold: the delta list + mutation-boundary files + the map
   go to THIS lens with no fold history; its sole task is finding
   every statement inconsistent with the deltas (old conditions,
   un-updated mirrors, contradicted scalars/keysets) — the machine
   lint catches the declared-data mirrors; this lens owns the SEMANTIC
   remainder.
3. **Edit-scar check (the present-tense rule, adopted 2026-07-17 —
   template §2):** any operative-path sentence that only makes sense
   relative to a prior revision or a review round (fold provenance,
   round references, review residue) is a finding —
   bookkeeping-class; provenance lives in the machine blocks, the
   flags section (dated decision records), the process log, and git.
   Present-tense intent notes (README §5.3's in-context budget) are
   NOT scars. Litmus: would the sentence survive had the packet been
   authored this way on day one?

**Lens 5 — downstream viability** *(owns: sibling impact; plan
consistency; the ergonomics floor)*

1. Sibling-packet impact + PLAN CONSISTENCY: no target decision
   silently contradicts ratified plan text — a contradiction has its
   prepared same-commit plan edit [R-ALIGNED-UP] or routes per the
   taxonomy below.
2. Ergonomics floor: **self-containment** (the operative set in full
   text; a pointer-shaped constraint dump or a summary-only flag is a
   finding — flags live IN the target's flags section); **density**
   (every in-context note line failed both the "environment?" and
   "data?" tests; overflow ⇒ recommend split along constraint
   cohesion); **embedding freshness** (target files/entrypoints
   verified against the live tree, type-ripple targets included, the
   mutation boundary exact — n/a for drafts).

### 2a) The Gate Coverage Matrix

One row per lens duty, one column per target surface it applies to;
every cell is `pass | finding | n/a (reason) | skipped (proven
unaffected — targeted rounds only, §5) | missing | unknown`.
`missing` blocks approve; `skipped` is resolved for the ROUND — at
approve, matrix cells carry from the last round that ran their lens,
§4's close verifying the deltas since. An `unknown` (a discovery state) blocks
approve until INSPECTED — inspection converts it to a known
present/absent-with-evidence state, which may THEN be routed per the
D5 routes or split away; an uninspected `unknown` is NEVER routable
(routing an unknown launders ignorance into a decision).

### 2b) Mandatory Output Audit (before any approve — the v1 ReviewSpec
§2a rhythm)

Audit that every TRIGGERED mandatory output is MATERIALIZED in the
target — separate from whether the prose reads coherent. The list is
per TARGET KIND:

- **Packets:** the machine blocks (template §1); the header
  classification line; the `## Sizing/risk` record whenever
  authority / runtime / read-surface / shared-contract work is in
  scope (template §2 step 0's gate — its axes, scan, and
  single-packet decision with proof or split shape, PLUS that gate's
  conditional annexes when their material is present); the
  collapsed-lane member inventories; the **site × shape × phase
  coverage grid** whenever the packet declares failure lanes over a
  seam with PHASES (template §2's write-time discipline — trigger:
  phased execution; otherwise a one-line N/A with evidence, the
  Sizing/risk pattern); the Mirrored Surface Map when
  contract-dense.
- **Drafts:** the form registry is tier-0-enforced
  (contract-draft-template §3) — this audit owns the SEMANTIC
  remainder: the Control-Model checklist answered in Context; a
  probe result or cited source on EVERY substrate-resting row
  (DraftContract §1.2 — a row resting on driver/OS/filesystem
  behavior);
  seed-row disposition (each `SEED_ROWS` item landed as a C-row or
  carries a recorded reason). The packet-side outputs above are
  NEVER demanded of drafts.

Detail budget: not-triggered → one-line `N/A` WITH
evidence; triggered low-risk → a compact decision record; triggered
split-or-contract-risk → the full fields/tables. A missing, generic,
or prose-implied output is a `refine` finding that ADDS the record —
the first round MATERIALIZES, the next round ASSESSES; adjacent prose
may not substitute unless it carries the exact decision fields,
auditable without inference. Do not turn template availability into a
detail demand: escalating from compact to full names the concrete
risk trigger.

### 3) Findings — taxonomy, fix-by-default triage, routes

Classify EVERY issue considered — nothing is dropped silently:

- `packet_defect` — the target itself is wrong/incomplete → FOLD NOW
- `packet_plan_drift` — contradicts ratified plan text; BIFURCATES:
  propagation-class resolution → autonomous plan edit (visible,
  same-commit); meaning-changing → STOP `2:meaning-changing-alignment`
- `plan_contract_challenge` — target and plan agree but the claim is
  challenged against reality → STOP `2:contested-ratified-vs-reality`;
  never silently accepted, never silently "fixed"
- `watchpoint` — flagged, non-blocking as a STATUS; its ROUTE decides
  flag-bearing (a watchpoint routed `declined` flag-bears)
- `considered_not_finding` — examined and cleared, one line why

**Fix-by-default, triaged (revised 2026-07-17 — README §5.5 is
canonical):** fixing stays the default — Bayes (a fresh-context
re-review will re-find an unaddressed issue, deferral saves nothing)
and **ambiguity transfer** (the fresh-context reviewer is a proxy for
the build-time implementer: what was ambiguous to one LLM in a clean
context will be ambiguous to the next). The triage is an EXPLICIT act
per finding: a RECORDED disposition — `folded` / `narrowed` /
`declined` / `deferred-to-build` / an ownership route — with a
one-line why and a severity (`P0`–`P3` per
`docs/reviewer-severity-ontology.md`; its evidence rules bind). The
report carries the disposition tally; a round folding ~everything is
a triage-inspection signal, never a quality sign. A fold that ADDS a
mechanism states its one-line proportionality record (defect class
guarded / plausibility / spec-weight cost); `declined: out of threat
model` is a ROUTINE route for content-mechanism findings too.
TOOLING findings keep the mandatory threat-model judgment.
Conflicting feedback sources are reconciled explicitly; genuinely
open choices escalate as STOPs.

Three routes exist for ownership misfit (README §5.5 carries the
canonical table): `boundary-review` (process-log line; revisit = the
chapter DoD's log review), `later-chapter` (proposed plan-map row;
revisit = human ratification at approve/boundary), `declined` (NO
revisit BY DESIGN — a human-ratified standing decision whose home is
the target's flags section: `declined — <reason>`). A fourth label,
`approve-ratified`, is a decision-record MARKER, not an ownership
route: it names a decision whose ratification point IS the approve
act — a resolved STOP verdict OR a below-Case-B new-decision riding
to a human approve (revisit: none — the approve ratified it;
generalized at the ch7 boundary). Findings, flags,
and routes stay EXPRESSIBLE in the severity ontology's language — the
phase-2 obligation (README §5.5).

### 4) Verdict

- **`refine`** — any fold-now finding: fold + re-run per the
  fold-class scoping (§5) — targeted by default after a content
  fold, one reconciliation pass after a bookkeeping fold
  (autonomous).
- **`split`** — packets only, within the chapter: apply the
  Packets-and-flow-mode repartition with a visible report (inheritance: mode, predicted
  class, watchpoints; fresh watchdog per part; depth 1 — deeper is a
  STOP). A scope/sequencing-changing split is STOP
  `2:scope-changing-split`. **Split is NOT advisory:** when a
  risk-gate hard-stop combination is present (template §2 step 0),
  the DEFAULT verdict is `split` — a single packet may continue only
  with the implementation-closure proof; "somewhat ambitious but it
  will be fine" is not a legal assessment (the v1 bias this rule
  exists for).
- **`approve`** — requires ALL of (the creation-phase amendment,
  user-ratified 2026-07-10: the v1 close shape restored, the
  closing-full-fan-out floor retired — README §5.5 is canonical):
  every APPROVAL-TIME tier-0 gate green (step 0); the FIRST round
  FULL (all five lenses, fresh-context, reports citing the
  packet-basis hash); and a clean TOP-LEVEL RECONCILIATION CLOSE
  over the FINAL CONTENT BYTES — one fresh-context pass fed the
  final bytes, the accumulated delta history, and the recorded lens
  outputs, returning ZERO fold-now CONTENT findings and ZERO
  STOP-class findings (non-STOP routed and watchpoint items ride as
  flags/routes; bookkeeping items batch per §5); a full fan-out at
  close ONLY when an escalation trigger fired on the last fold; the
  coverage matrix complete with no `missing` and no unresolved
  `unknown` — cells carry from the last round that ran their lens,
  the close verifying the deltas since. *Temporal:* a clean close
  binds to its hash — any later CONTENT fold voids it;
  approve-readiness is never assembled from verdicts on different
  revisions; a BOOKKEEPING fold does not void PROVIDED it carries a
  clean reconciliation pass (the two-hash model: the close binds its
  CONTENT hash, a subsequent bookkeeping fold produces the FINAL
  RECONCILED hash — the report records both). *Hostile:* the close
  is a FRESH-CONTEXT pass — the author's context never closes its
  own bytes; and the close never replaces the first full round.
  *External-arm folds* are ORDINARY folds: the finder-lane rerun is
  the arm's own re-check citing the NEW hash, plus the mandatory
  delta-scoped reconciliation; escalation triggers unchanged. The approve's OWNER follows the
  README §5.5 matrix: a flag-free approve (zero new-decision manifest
  rows, zero approve-ratified routes, every approve-time tier-0 gate
  green, a clean close) is AUTONOMOUS from ch8 on and proceeds
  to build THROUGH the two mandatory transitional arm gates (§6;
  README §5.5's autonomous-path rule); a flag-bearing approve is the human's ALWAYS (STOP
  `4:flagged-approve`; "flag-bearing" per the README §5.5
  definition); the ch7 pilot and first-of-a-kind packets are
  human-approved.
- **STOP-reporting** — the panel never RESOLVES a STOP: it detects,
  classifies with a member token from the README §5.5 registry, and
  reports; resolution is the human's.
- **Watchdog: 8 panel rounds** — a safety cap, not a tuning lever;
  exhaustion → STOP `3:watchdog` with a diagnosis (churn composition →
  split proposal vs draft proposal), never silent continuation. Full
  and targeted rounds both count; reconciliation passes do not —
  but THREE consecutive non-clean reconciliation passes escalate to
  a targeted round (which counts): the cap covers silent
  reconciliation churn too.
- **Plateau: `3:plateau` (adopted 2026-07-17 — README §5.5 is
  canonical)** — two consecutive review rounds (panel, external-arm,
  and user rounds all count) each with ≤2 accepted CONTENT findings
  (FIRST-OCCURRENCE counted: duplicates and re-litigated `declined`
  items get one carrier and never re-count), zero accepted
  blocker-grade (`P0`/`P1`) findings, and no mandatory escalation
  trigger fired → STOP with the yield curve and a severity-bucketed
  residual report; the human MAY close on judgment (a one-line
  acknowledged close — residual items get dispositions, never
  folds, so the bytes stabilize and the close binds a clean hash).
  Any accepted `P0`/`P1` or fired escalation trigger RESETS the
  counter. Optional close evidence: a prediction-test round with a
  pre-registered count + class forecast. Thresholds v0 (README
  §5.5); the watchdog stays the hard cap.

### 5) Fold classes and re-run scoping

Adopted 2026-07-10 at the ch7-P3 pilot evaluation; the v1
`targeted_lane_review` discipline ported from ExecutePairflowPlan
`references/Delegation-Gates.md`, ReviewSpec Hard Stop points 8–11.
Canonical statement: README §5.5 (this section is its procedure
mirror). The scoping governs COST, never the review definition.

- **First pass on a new target: FULL panel** — all five lenses.
- **Fold classes, decided per fold from the delta list:**
  - **CONTENT fold** — a canonical row's semantics, a lane set, a
    claim/dimension statement, or a manifest class changes. VOIDS
    all prior clean rounds.
  - **BOOKKEEPING fold** — mirror-list maintenance, measurement
    transcription, cross-reference pointers, wording sync; ZERO
    canonical-content change. Does NOT void a clean round.
- **After a CONTENT fold the default is a TARGETED re-run:** (i) the
  lenses that returned findings in the previous round, (ii) the
  lenses whose covered surfaces the fold's delta touched, and (iii)
  ALWAYS lens 4 as the final reconciliation, fed the delta list (the
  fresh-eyes function — it also owns catching the author's own
  fold-propagation misses; this IS AuthorPacket step 9.3's pass, one
  mechanism). **Mandatory escalation to FULL** (the burden of proof
  is on skipping): a manifest-class change (a new-decision row
  minted or reclassified), a scope/split change, a claim- or
  matrix-STRUCTURE change (a new lane family or dimension), a
  STOP-resolution fold, or a skipped lens that cannot be PROVEN
  unaffected by the delta.
- **After a BOOKKEEPING fold:** ONE lens-4 reconciliation pass over
  the delta list. A CONTENT hit reclassifies the fold (the void
  applies). Bookkeeping findings from any round BATCH into one fold
  and one reconciliation pass — they never restart the loop one at
  a time.
- **Model policy (the Agent-launch discipline — never inherit the
  session default silently; amended 2026-07-10):** EVERY panel pass
  — full, targeted, reconciliation, and the close — runs on an
  OPUS-class model; the full⇒Opus / targeted⇒Sonnet tiering is
  RETIRED (model-effectiveness experiments are a later, explicit
  act); FABLE-class models stay reserved for exceptional one-off
  planning at the user's explicit call — never business-as-usual
  packet review.
- **The report records the mode** (see the Report block): full |
  targeted | reconciliation-only, the lenses run, the skipped
  lenses WITH their proven-unaffected reasons, and any escalation
  trigger fired.

### 6) The external arm — OPTIONAL invocation leg (recorded 2026-07-10)

A fresh third-party model session reviewing the target from the repo
root — the same arm the user runs manually by pasting the
STOP/pre-approval message into a fresh Codex session; both paths have
IDENTICAL standing. The loop MAY invoke it anywhere; on the
AUTONOMOUS flag-free path it is MANDATORY at two gates — the approve
bytes before build and the implementation at build close (README
§5.5's transitional autonomous-path rule, user-ratified 2026-07-11;
unavailable arm = BLOCKER → STOP; a waive is the human's explicit
act, per gate). The build-close gate carries a MANDATORY SENSITIVITY
PASS (README §5.5, promoted 2026-07-17): the arm's prompt instructs
it to verify every packet-declared discipline and inventory member
DRIVEN and ABLE TO FAIL in the built test bodies —
R-LANE-SENSITIVITY's build-close half. Elsewhere it stays an option:

- **When:** at a pre-ratification/pre-approval STOP as an extra
  adversarial pass, or as the FINDER-LANE RERUN after an
  external-arm fold (README §5.5).
- **How (amended at the ch8 boundary, 2026-07-11 — the P2 runs'
  lessons + the user's external-feedback round; supersedes the
  "user defaults govern, run in background" form):**
  1. **Byte guard BEFORE:** record HEAD; the target file's sha256;
     the porcelain hash (`git status --porcelain=v1 -z | shasum`);
     the FULL tracked-diff hash vs HEAD, STAGED INCLUDED
     (`git diff --binary HEAD | shasum` — a plain `git diff` misses
     the index); and EVERY untracked file's path + content sha256 —
     canonical enumeration: `git ls-files --others
     --exclude-standard -z`, each entry hashed in stable
     null-delimited order (porcelain output may COLLAPSE untracked
     directories; a path list alone is blind to an untracked file's
     content change — the gate-1 target itself is untracked).
  2. **Launch FOREGROUND** from the repo root with an explicit
     10-minute tool timeout — NEVER `run_in_background` (both P2
     kills were the background-task manager's, not the arm's; at a
     mandatory gate, blocking is correct — nothing may proceed
     without the verdict, and the main loop must not touch the
     reviewed tree while the arm runs):
     `codex exec --sandbox danger-full-access -m <pinned model>
     -c model_reasoning_effort=<pinned effort>
     -c approval_policy=never - < <promptfile>
     > <outfile> 2>&1`
     (the concrete tool config: Bash `timeout: 600000`,
     `run_in_background` omitted/false). `<promptfile>` and
     `<outfile>` live OUTSIDE the repository (the session
     scratchpad) — an in-repo output file would let the arm's own
     transcript trip the byte guard, turning a successful review
     into a false STOP; the retry writes a SEPARATE outfile.
  3. **The sandbox relaxation is a CONSCIOUS trust decision**, paired
     with the prompt's mandatory READ-ONLY block ("do not edit,
     format, install, generate, or commit repository files; tests may
     write only their normal temporary runtime artifacts; missing
     dependencies are an evidence gap — never install") and the byte
     guard. Stated precisely: the byte guard verifies REPOSITORY
     integrity only — it neither restricts nor detects reads or
     writes OUTSIDE the repository; that residual exposure is the
     trust decision. Whether `danger-full-access` actually clears the
     tsx-IPC subprocess limit is MEASURED at its first use — never
     assumed; until measured, the evidence-gap rule (item 9) carries.
  4. **Model pinning (chapter-pinned policy — the user's 2026-07-11
     decision):** the invocation pins model + reasoning effort
     EXPLICITLY; the machine's current `~/.codex/config.toml` default
     is never trusted (an operator's config-in-flux must not silently
     swap the reviewer). The pin's SOURCE OF TRUTH is
     `docs/v3/implementation/arm-pin.md` (current row; revised at
     chapter boundaries only) — this workflow never hardcodes it.
     PIN-MISMATCH RULE: an output header whose model/effort disagrees
     with the current pin, OR whose approval policy is not `never`
     (also pinned explicitly — `-c approval_policy=never`, never the
     user config's) → the verdict is INVALID and the run counts
     as an INFRA failure (item 8's retry ladder). Yield comparisons
     are valid within one pin, never across.
  5. **Byte guard AFTER:** re-take EVERY before-measurement — HEAD,
     target sha256, porcelain hash, `git diff --binary HEAD` hash,
     untracked path+content hashes — all unchanged; a clean-tree gate
     additionally `git diff HEAD --exit-code` (index-aware) AND an
     empty porcelain. ANY divergence → the verdict is INVALID + STOP.
     The FIRST guard trip is the worktree-isolation hardening trigger
     (isolation deferred by the user's decision, 2026-07-11).
  6. **Record** the exit code and the exact model + reasoning effort
     + approval policy FROM THE OUTPUT HEADER (transcript-verified)
     in the gate record.
  7. **Prompt shape — falsification-first:** the basis hash, the
     contract surface, the READ-ONLY block, and the verdict schema
     (hash-citing); NEVER the prior clean/approve narrative (an
     anchoring risk) beyond the minimal hash chronicle the citation
     requirement needs. A re-check prompt lists the folded findings +
     the NEW basis hash and requires the verdict to cite it.
  8. **Infra failure** (kill, transport, timeout, pin mismatch — not
     a content verdict): ONE retry in a NEW session with a SEPARATE
     output file (evidence preserved); BEFORE the retry, verify the
     prior codex process has TERMINATED (two reviewers must never run
     on the same tree); a second consecutive infra failure =
     unavailable arm → STOP.
  9. **Evidence gap:** a test the arm's environment cannot run is
     named — test, command, exact error — and the arm may cite a
     same-basis receipt ONLY if it carries the minimum fields: exact
     commit/target hash, exact command, exit code, test count/result,
     timestamp, runner provenance. The VERDICT declares the
     non-self-reproduced evidence explicitly. Route precision: an
     evidence gap is NOT a content finding — there is nothing to
     fold; a receipt-less gap on a CRITICAL acceptance lane keeps
     the GATE OPEN (no clean approve) until an adequate same-basis
     receipt exists, and if the evidence cannot be obtained, that is
     UNAVAILABLE VERIFICATION → STOP. Only an actual
     product/packet/test defect folds. CRITICAL, bound (never
     reviewer interpretation): a test the packet's acceptance/matrix
     prescribes BY NAME, or a mandatory check of the README
     chapter/packet DoD; an exploratory/adversarial probe is NOT
     critical unless it reproduces a finding. The prompt never
     pre-declares substitute evidence "fully acceptable".
  10. **Yield accounting:** findings counted by GROUP with class
     labels — product / packet-docs / test-evidence — the boundary
     review's arm-yield metric.
- **Rules:** the arm's verdict is admissible ONLY citing the basis
  hash (a verdict on stale bytes is no verdict); its findings fold
  as ORDINARY folds per README §5.5; the run and verdict enter the
  packet/draft record (the ratification `arms` list names it,
  user-run vs agent-invoked distinguished).
- **Observed behavior (first proven run, ch8 draft):** the fresh
  session discovers the repo's own review machinery and uses it;
  ~5–10 min, ~70–130k tokens per run.

### 7) The fresh-implementer lens — EXPERIMENT (adopted 2026-07-17)

A COMPREHENSION lens, not a falsifier: the five lenses and the arm
all subtract; this lens measures whether the packet TEACHES — can a
fresh build agent execute it without misreading? Explicitly an
EXPERIMENT: the first 2–3 packets under the revised process run it,
the chapter boundary evaluates its yield against the falsifier
lenses' (did it catch anything they missed?), then the lens is
scaled, iterated, or retired on evidence; each use logs its yield as
a process-log line.

- **Blindness:** a fresh-context agent fed ONLY the packet bytes —
  no review history, no ledger, no model corpus, no plan. Deliberate
  and double-edged: README §5.3 claims the packet is self-contained
  for its operative set, and this lens TESTS that claim — a
  restatement that needed outside knowledge is itself a finding.
- **Task shape — restatement, not review:** "state what you would
  build; restate every obligation in your own words; sketch the test
  families; list what remains undecided for you." A comparison pass
  diffs the restatement against the intended semantics; divergences
  are COMPREHENSION findings against the packet (the
  ambiguity-transfer class made measurable BEFORE build), triaged
  per §3 — never folded mechanically.
- **Cadence — once per packet:** after the plateau / before the
  close, on the approve-candidate bytes (the text is stable; the
  remaining question is whether the meaning crosses the
  packet→build bridge). Re-run only if a later CONTENT fold changes
  canonical semantics. Never per-round — the diminishing-returns
  lesson is inherited.
- **Pin:** model + reasoning effort recorded at first use in the
  report and the process-log line (the arm-pin.md pattern). An
  internal Opus-class agent is fine — this lens is not the
  cross-model arm; comprehension, not decorrelation, is its job.

## Report

```
Panel review: <TARGET_PATH>   (packet | draft)
Skill source: installed registry | repo-local file read @ <path, commit, dirty?>
Packet basis: sha256(<target file>) = <hash> @ HEAD <commit>, worktree: clean | dirty (<what>)
Reconciled basis: <none | hash after reconciliation-verified bookkeeping folds — the two-hash model>
Tier 0 (approve-time): <green | failures>
Re-run mode: full | targeted (<lenses run>; skipped: <lens — proven-unaffected reason>) | reconciliation-only | close (top-level reconciliation over the final hash) · escalation: <none | trigger fired> · models: <the ACTUAL model id per pass, TRANSCRIPT-VERIFIED (the agent transcript's `model` field) — measured, never the launch parameter echoed (ch7 boundary: the launch call is not evidence)>
Gate Coverage Matrix: <complete | missing/unknown cells listed>
Lens reports: 1 substrate | 2 projection | 3 negatives | 4 mirror | 5 downstream — each: pass | findings | skipped(<reason>)
Findings by type: <taxonomy-tagged list, considered_not_finding included, dispositions + routes>
Dispositions: folded <n> / narrowed <n> / declined <n> / deferred-to-build <n> / routed <n> · severity: P0/P1 <n> · P2 <n> · P3 <n>
Yield: <accepted CONTENT findings this round, first-occurrence counted> · plateau counter: <k>/2
Size: <md KB> (Δ <±%> since the first full round; v0 thresholds 48 KB / +50% — breach flagged, advisory)
Verdict: approve | refine | split | STOP <member token>
```

The `Skill source` line exists because activation path and text
freshness are separable — the report must make visible WHICH version
of this workflow acted. The `Packet basis` line exists because a
target under refine rounds is a MOVING target: a verdict binds ONLY
the exact bytes the hash names; any later CONTENT edit voids it. A
BOOKKEEPING fold (§5) does not void, but MUST be recorded as a
`Reconciled basis` hash beside the bound full-round hash, each fold
carrying its clean reconciliation pass — an unrecorded byte change
of ANY class voids.

**Report validity gate:** the report is INVALID without its
`Skill source`, `Packet basis`, `Re-run mode` (with skipped-lens
reasons and the ACTUAL models used), `Gate Coverage Matrix`,
`Yield` and `Size` (EVERY round — the size check is mandatory per
round and a zero-yield round is exactly what drives the plateau
counter), `Dispositions` (any round that considered findings), and
verdict lines — each filled or carrying an explicit one-line reason.
A verdict delivered in commentary without the report block is a
workflow defect to fix BEFORE handing back.
