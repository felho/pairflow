# V3 Implementation — Process

Status: ratified 2026-07-07
Purpose: Define the exact process for turning the settled Block A model into
code — how the plan is written, how each step is built, and how Pairflow v1
is used as the execution vehicle.

This directory is the **implementation plane**. The model plane
(`../model/`, `../design/`) stays untouched by anything that happens
here; the routing rule (three rows): model decisions → corpus + memos
(playbook §8); implementation decisions → ADRs; implementation-plane
contract SHAPE → the chapter's contract-draft (§5.5 — decision and
rationale go to the ADR, the shape stays in the draft; they
cross-reference).

## 1. What lives here

- `README.md` — this process definition.
- `plan.md` — the implementation plan (Phase 1 output; chapter by chapter).
- `adr/` — the ADR convention: playbook §8 ADR-activation addendum +
  `implementation-contract.md` PI-10. The implementation ADRs' HOME is
  `v3/adr/` (the code-side home confirmed by the architecture chapter;
  the checks resolve against it).
- `packets/` — the task packets; their form authority is
  `task-packet-template.md` (template §1, projection checklist §2,
  `REV-*` registry §3).
- `contracts/` — the chapter contract-drafts (the memo-born surfaces'
  decision home); their form authority is `contract-draft-template.md`.
- `arm-pin.md` — the external arm's chapter-pinned model/effort pair
  (the ReviewPacket §6 pin's source of truth; revised at chapter
  boundaries only).

## 2. Binding inputs

The implementation consumes exactly these surfaces; everything else is
reachable through their pointers:

1. **The model** — `../model/core-model.html`, authored via
   `../model/` (playbook §6). Its machine face is
   `../model/ledger.md`: 159 pseudocode units, 54 named rejections, the
   invariant catalog, the domain registry (51 aggregates / 122 entities), and
   140 named Absents (counts at the ch11 model alignment; the plan §1.4
   inventory and the coverage checker's guard are the drift-checked
   authority). The ledger is the model↔code contract surface.
2. **The implementation contract** — `../design/implementation-contract.md`:
   binding `IC-*` constraints (each must map to a test, a check, or an ADR)
   and the `PI-*` plan-intake checklist (each must have a home in the plan).
3. **Scope** — the "V1 operability scope" paragraph and Block A boundary in
   `../design/approach.md`.

**Sequencing note (resolved):** the emit-contract slice landed WITH its
landing review absorbed (`4b79830d` + the review fixes `c468031d`,
`f0e82d4e`; memo: `../design/topics/_closed-emit-contract.md`). There is no pending
model-side dependency — the plan starts from the current corpus.

## 3. Phase 1 — writing the plan

The plan is written the way the model was: **chapter by chapter, each chapter
proposed → ratified → committed.** No monolithic draft.

1. **Chapter 1 (mandatory, per the IC process rule): the intake tables.**
   Every `IC-*` item mapped to its named test / check / ADR; every `PI-*`
   item mapped to its chapter or named deliverable. An unmapped item is a
   planning gap by definition — the chapter is not done until both tables
   close.
2. **Chapter 2: the architecture skeleton.** Repo layout, module boundaries,
   language/tooling picks, storage substrate (PI-7). These produce the first
   ADRs (the playbook §8 seed list).
3. **Further chapters = the PI items** (test kit, visibility floor + CLI,
   ledger→test transfer, diagnostics, template format, bootstrap, runner MVP,
   operator recourse card, ADR setup, execution-model intake), each with its
   own scope / deliverables / acceptance triple.
4. **Ordering principle: walking skeleton first (PI-6).** The first code
   slice exercises the visibility floor, the test kit, the injected clock,
   and bootstrap in one thin slice; every later chapter builds on it. The
   deeper reason is in §5.3: the early slices are *constraint sinks* — they
   convert prompt-borne rules into environment enforcement for every task
   after them.

## 4. Phase 2 — the build loop

Every plan step runs the same cycle. **Draft phase (before packet
authoring, when the chapter carries a memo-born surface):** if ANY
contract-draft the chapter's plan Packets-and-flow-mode table
references is not yet
ratified-or-later, the DraftContract round runs FIRST — the chapter's
undecided row-level contracts are decided once and ratified by the
human (§5.5), and packets then anchor to the ratified rows
(`contract:chN-<surface>#Cn`). Then:

0. **Author the packet** — the `CreateTaskPacket` skill's AuthorPacket
   loop: projection with the `packet_rows` provenance manifest, the
   panel review rounds, and the human decision points per the §5.5
   verdict-action matrix. No build before an approve; on an AUTONOMOUS
   flag-free approve (§5.5) the loop proceeds to build directly.
1. **Read the spec** — the plan step plus its ledger slice (units, rejection
   names, invariants, traces). The ledger is the *what*; it is not
   re-interpreted at build time.
2. **TDD** — contract tests first, from the IC enforcement lines and the
   chapter traces (golden tests). For a gate/check deliverable the same
   discipline applies with a twist: its negative test derives from the
   check's DECLARED claim, never from the list of implemented rules — a
   blocklist passing an unlisted violation is the recurring failure class
   (process log, 2026-07-07, twice). The same rule covers **canonical
   contract matrices** (exit codes, parse rules, config resolution): the
   matrix IS a declared claim — every lane it declares is DRIVEN by a
   test, never merely documented (adopted at the ch-6 boundary; the P4a
   aftermath is the precedent).
3. **Implement.**
4. **Drift tests green** — the three unconditional name-space tests (85
   rejection names / domain registry / unit→code mapping; PI-3).
5. **ADR if a trigger fires** (IC-A2, IC-A3, IC-B, IC-N, tooling picks) —
   born `proposed`; acceptance follows the packet flow's THREE ADR
   lanes (canonical statement, others defer): draft-ratified content →
   `accepted` WITH the draft ratification (the ratification IS the
   human acceptance act); plan-ratified content whose ADR is authored
   during packet work → acceptance rides with the packet approve; a
   genuinely new ADR-class decision mid-loop → STOP `1:open-choice`,
   its ADR follows whichever ratification act resolves it. (A
   chapter-ratification-born ADR sits outside the packet flow and is
   accepted by that ratification act itself.)
6. **Review** — code review plus the ADR compliance review (the third QA
   axis; playbook §8).
7. **Commit** — one step, one commit; plan status updated.
8. **Post-build audit (build-close tier-0):** after the build commit
   lands, run `check_packet.py --post-build <commit-sha> --packet
   <path>` with that commit's sha (no CI surface runs this mode — CI
   runs the plain lint) and `check_coverage.py` in its DEFAULT
   (build-close) mode. The audit's green is part of the build being
   DONE: a red audit is a defect fixed before any further packet work,
   never advisory.

**Build execution context (adopted at the ch12 boundary):** the
DEFAULT is a FRESH-CONTEXT DELEGATED build — a subagent fed the
self-contained packet (plus any explicit build-guidance notes)
executes steps 1–3, while the MAIN context retains orchestration,
the full verification chain (typecheck / lint / tests / drift /
post-build audit), both §5.5 arm gates, and the
one-packet-one-commit boundary. Four grounds: the packet is
self-contained BY DESIGN (§5.3 — a clean fresh build is a live test
of that claim); decorrelation (the author/gate context does not
build its own bytes); a heavy gate leg degrades the main context
exactly before the most code-dense step; and it rehearses the
chaining-stage architecture (a doc-bubble IS a fresh execution
context). The Build record NAMES the execution context used and any
guidance notes handed over — the choice is never silent.
**Delegation-prompt rule (adopted at the ch12 boundary — the P1b
delegation-altitude gap, a severity exception to the WATCH-first
admission bias: the class rides the now-DEFAULT delegated path and
its Build-record claim is self-report-invisible):** when the packet
declares a discipline STRONGER than the existing suite embodies, the
delegation prompt QUOTES the discipline lines verbatim and instructs
"raise the existing tests to the declared level" —
preserve-don't-weaken is insufficient exactly when the packet's
point is stronger proof (the agents faithfully preserved the old
assert strength while the record claimed the declared level; gate-2
caught it as the chapter's largest aftermath batch).

**Pointer-comment convention (adopted at the ch12 boundary — the
reference-economy verdict):** a temporary in-code deferral marker
takes the CANONICAL form `DEFERRED(chN[-pM]): <note>`; the boundary
tooling enumerates the markers, and a chapter's close goes RED while
markers addressed to that chapter remain. Free-text deferral prose
("until P4", "deferred to P4") is retired to this form as code is
touched. This flips pointer retirement from fragile free-text greps
(the R-INSTRUMENT-PROBE weakness class) to a machine count; the
broader default is R-PRESENT-TENSE's reference economy — promote a
reference to a machine-checked class where its value justifies it,
otherwise DROP it rather than maintain a rotting pointer. The split
is by ACCOUNTABILITY, not authorship: the builder owns the
realization + test bodies (fail-first receipts per
R-DERIVED-PROBES); the orchestrator owns verification, the gates,
reconciliation DECISIONS, and the commit boundary. WHO authors an
aftermath fix is deliberately NOT ruled (n=1 evidence only, owner
challenge 2026-07-22): the default follows the same delegation
logic (packaged finding-context to a fresh agent), the orchestrator
MAY author small folds, and the Build-record Aftermath RECORDS the
author of each fix — a later boundary reads that data and decides
whether a rule is warranted at all. Under the STANDING chapter
entry mode (AGENTS.md V3) this generalizes to the CONDUCTOR
architecture: every heavy step — authoring, build, arm runs —
delegates to fresh-context subagents; the main context holds
process state and just-enough summaries.

**Aftermath handling (adopted at the ch7 boundary — the P3/P4
practice made rule):** post-close findings fold into the packet's
claim surface and Build-record Aftermath, and **an aftermath fold IS
a fold** — it gets the same lens-4 delta-reconciliation pass as a
panel fold (the ch7-P4 round-1 skip reproduced exactly the
propagation class the pass exists to catch). Commit choreography:
process-log lines land in their OWN docs commits around the build
(the log is outside every packet boundary); an aftermath `fix(v3)`
commit carries packet + code + tests together and MAY extend the
`mutation_boundary` aftermath-scoped — the build commit's audit
stays pinned to its own bytes, and the aftermath commit is audited
against the extended boundary at its own sha.

## 5. Execution model — running the loop on Pairflow v1

The build loop executes through the working v1 machinery
(`CreatePairflowSpec` artifacts, `ExecutePairflowPlan` routing, bubbles).
This section records what changes and what carries over, and the principle
that governs both.

### 5.1 The autonomy principle

**A task's autonomy budget is proportional to its contract density.** A task
may run hands-off exactly when its acceptance is machine-checkable.

The v1 lesson behind this: when plans were executed task-by-task, the
operator's per-task attention silently completed an under-determined plan —
catching small errors at the moment they were cheap. `ExecutePairflowPlan`
removed the operator without replacing that function, so ambiguity turned
into drift discovered only at plan completion. The fix is not more prose in
the plan; it is a **contract layer between plan and task** — which is exactly
what the model corpus + ledger now provide. The plan orders and scopes; the
task packet projects; the gates verify.

### 5.2 The task packet — two layers

A task packet (the v3-mode task spec) separates two concerns:

- **Content layer** (new — this is what the corpus changes): spec-writing
  becomes *projection, not invention*. The packet declares its ledger slice
  (the units, rejection names, invariants, and traces this task realizes) and
  carries the operative material in full text. The concreteness that v1 plans
  lacked exists already; the packet's job is selecting and compiling it.
- **LLM-ergonomics layer** (inherited from the `CreatePairflowSpec`
  experience, unchanged in kind): the size/split thresholds, the
  constraint-density gate, the embedding gates (target files, entrypoints,
  mutation boundaries — the corpus describes target semantics, NOT the
  current state of the growing codebase, so these gates lose nothing of
  their weight), and the approve/refine/split review verdicts. These
  problems stem from how LLMs behave, not from where the content comes
  from; they carry over.

The review runs as the five-lens PANEL (the `ReviewPacket` engine —
fresh-context sub-agents, Gate Coverage Matrix, one verdict set:
`split` / `refine` / `approve` + STOP reporting; §5.5 carries the
envelope). The old content-half/ergonomic-half rubric is retired: its
content checks live in lens 2 (projection floor), its ergonomics in
lenses 4–5.

### 5.3 Constraint handling — the in-context budget

What matters at generation time is the constraint set **in the model's
context**, not what file it sits in. A pointer to 50 constraints either loads
them (same density problem) or ignores them (worse: gate failures and extra
loops). The packet must therefore be **self-contained for its operative set**
— include in full what the task needs, exclude entirely what it does not, no
pointer-shaped constraint dumps.

The real lever is transforming constraints downward in this table:

| Form | Enforced by | Cost paid | Failure feedback |
|---|---|---|---|
| **Environment** | types / schema / lint / fixtures | once, upfront (early tasks) | immediate, local |
| **Data** | the finished artifact (unit, name, trace) | at design time (the corpus) + tokens per task | the golden test shows it |
| **In-context rule** | the LLM's attention | every task, every review round | delayed, global ← flapping lives here |

- **Rule → environment** (the strongest move): a constraint the environment
  enforces costs zero context. IC-D's "never read the clock" becomes a lint
  ban plus a `TimeSource` parameter in every time-dependent signature; IC-A1
  becomes the schema's uniqueness constraint; IC-E means kernel code receives
  adapters as interfaces and has no concrete type to branch on. Feedback is
  immediate and local (a compile/lint/test error at the line) — the opposite
  of the delayed, global review feedback that drives flapping. The cost:
  the environment must be built first, which is why the test kit, the type
  layer, and the walking skeleton are constraint sinks and go early.
- **Rule → data**: hand over the resolved answer instead of the rule. A rule
  narrows a search space the model must navigate while juggling every other
  rule (rule interaction is the flapping engine: fix A, break B, oscillate).
  Data does not interact — it is one already-consistent artifact. The
  constraint-satisfaction work was done ONCE on the model plane (e.g. L2a's
  many review rounds); the 159 units are its residue. Passing prose rules
  instead would make every implementation task redo that work, with error
  odds. Concretely: the packet carries its units verbatim, the exact
  rejection strings for its slice (not "name things consistently"), and the
  chapter trace as an executable expectation ("make this committed-row
  sequence pass"), not as narrated behavior. Data still costs tokens —
  selectivity stays mandatory — but per token it is far cheaper than a rule,
  because it needs no continuous am-I-violating-it check during generation.
- **What remains in-context**: genuinely task-local semantics no type or
  artifact can carry — intent notes ("the transcript pre-check is an
  optimization; correctness comes from the store constraint — do not
  reorder"), embedding knowledge ("extend this module, do not build a
  parallel one; the mutation boundary is these two files"), non-lintable
  idiom/tradeoff calls. **This is the scarce budget the density gate
  guards.** Discipline per candidate rule: can it become environment? can it
  become data? Only if neither does it consume budget. If the budget still
  overflows, the task is cut wrong — split along **constraint cohesion**
  (the ledger shows which rules cling to the same block; those stay
  together, independent ones may separate), not just size.

### 5.4 Coverage accounting

Every task packet declares its ledger slice. A script (check.sh culture)
asserts over the plan:

- the union of all declared slices covers the ledger inventory in scope,
- no orphan units/rejections/invariants,
- no double owners (shared ownership only if declared explicitly).

**"In scope" is a plan decision, not a default of "everything".** Plan
chapter 1 must define the round-1 inventory explicitly — e.g. chapter traces
are mandatory core while rejection-branch traces are the scoped extension
(PI-3's own split), and the 140 named Absents are *not* implemented but
realized as explicit rejections. Without this definition the accounting
degrades into an unbounded cover-everything-now demand.

**This is the mechanical answer to "when is the plan concrete enough for
`ExecutePairflowPlan`": when the accounting closes.** Splits stay honest under
it — split tasks re-declare their slices and the union must still close.

### 5.5 The autonomy envelope and human checkpoints (process-v2)

**Principle: the loop stops exactly where a NEW SEMANTIC DECISION is
needed** — a functionality/behavior/performance choice not derivable
from ratified sources. Everything else is mechanical. The detector is
the D1 provenance machinery: every canonical packet row is classed
`anchored` / `derived` / `new-decision` in the `packet_rows` manifest;
one mechanism drives classification, draft routing, and this boundary.

**Autonomous (no human):** in-chapter `split` — sizing, not scope
(the sizing/split triggers: substrate novelty, claim/matrix families,
dimension count, sibling fanout, plus the v1-inherited SIX RISK AXES —
authority movement, surface spread, identity/join fragility,
foundation+activation coupling, prerequisite coupling, acceptance
multiplicity; canonical statement + the hard-stop combinations +
the materialized `## Sizing/risk` record: template §2 step 0; coverage union guarded
mechanically; parts inherit mode, predicted class, watchpoints; fresh
watchdog per part; depth 1 — deeper → STOP);
propagation-class plan edits (terminology/consistency sweeps of
already-decided semantics, applied with a visible report); ADR
recording of already-ratified decisions; parking proposals onto the
finding routes (batch-ratified at approve); probes, panel
orchestration, all tier-0 scripts, prepared edits.

**STOP (human), four cases — the canonical member-token registry
(tokens minted HERE, never ad hoc; `packet_metrics.stops[].type`
records them):**

1. **Undecided semantics surfaces** — `1:late-b-signal` (new-decision
   rows exceed the threshold mid-loop) · `1:divergence` (model-plane
   bug — §6) · `1:open-choice` (a fold needs a genuinely open
   behavioral/performance choice; contested-probe resolutions minting
   new-decision rows arrive here).
2. **Plan-boundary conflict** — `2:meaning-changing-alignment` (an
   alignment that would ALTER ratified semantics, not propagate) ·
   `2:scope-changing-split` (chapter scope/sequencing/dependencies) ·
   `2:contested-ratified-vs-reality` (a ratified surface — plan text
   OR a ratified draft row — and live behavior disagree AND more than
   one resolution direction exists) · `2:draft-split` (a draft that
   wants splitting is a chapter-structure question).
3. **Loop economics** — `3:watchdog`: 8 rounds without approve →
   STOP with a diagnosis (churn composition → split vs draft
   proposal); auto-split-remedy is delegable LATER — a deferred,
   evidence-based step, not a live delegation. · `3:plateau`
   (adopted 2026-07-17 — the ch11-P3a process reset): two
   consecutive review rounds — panel, external-arm, and user rounds
   all count — each with ≤2 accepted CONTENT findings
   (FIRST-OCCURRENCE counted: a duplicate or a re-litigated
   `declined` gets ONE carrier and never re-counts) AND zero
   accepted blocker-grade (`P0`/`P1`) findings AND no mandatory
   escalation trigger fired → STOP with the yield curve and a
   severity-bucketed residual report; the human MAY close on
   judgment, recorded as a one-line acknowledged close — the residual
   items get DISPOSITIONS (declined / deferred), never folds, so the
   bytes stabilize and the close still binds a clean final hash (the
   clean-close mechanics are untouched). Any accepted
   `P0`/`P1` finding or fired escalation trigger RESETS the plateau
   counter regardless of count. Optional close evidence: a
   prediction test — one more round with a pre-registered count +
   class forecast. Thresholds are v0, recalibrated at the boundary
   after the first 2–3 packets under this rule. The watchdog stays
   the hard cap; the plateau is the earlier, softer signal.
4. **Flag-bearing approve** — `4:flagged-approve`: the approve's
   substantive content is ratifying the flags.

**Verdict-action matrix:**

| Loop event | Action |
|---|---|
| `refine` (any fold-now finding) | autonomous: fold + re-run panel |
| `split`, within chapter (coverage union preserved) | autonomous, visible report |
| `split` changing chapter scope/sequencing/dependencies | STOP 2 |
| `approve`, flag-free (zero new-decision manifest rows, zero approve-ratified routes, every approve-time tier-0 gate green, a clean CLOSE per the re-run scoping below) | AUTONOMOUS from ch8 on — the loop passes the MANDATORY transitional external-arm gates (the autonomous-path paragraph below), then proceeds to build (§4); the ch7 pilot packets (P3/P4) stay human-approved (first-of-a-kind), the last per-packet manual rounds |
| `approve`, flag-bearing | human (STOP 4), at every trust stage |
| STOP 1–3 events | human, always |

**Flag-bearing, defined:** new-decision manifest rows present, OR any
routed flags entry whose ratification point IS the approve —
`declined` always, and parked proposals batch-ratified at approve.
Watchpoint STATUS alone does not flag-bear; the ROUTE decides. The
manifest class ENTAILS the flags entry: a new-decision manifest row
with no corresponding pre-approval flag is a packet defect (the rows
RIDE as pre-approval flags).

**Finding policy (fix-by-default, triaged — revised 2026-07-17, the
ch11-P3a process reset):** every panel finding is fixed by default
— Bayes (a fresh-context re-review re-finds unaddressed issues) and
ambiguity transfer (the fresh reviewer is a proxy for the build-time
implementer). The default binds CONTENT findings and routes EFFORT,
never truth — and the triage is an EXPLICIT act per finding: every
finding (panel, external-arm, and user rounds alike) gets a RECORDED
disposition — `folded` / `narrowed` / `declined` /
`deferred-to-build` / an ownership route below — with a one-line why
and its severity (`P0`–`P3` per `docs/reviewer-severity-ontology.md`;
the ontology's evidence rules bind: blocker grades require concrete
evidence, else downgrade). Conflicting feedback sources are
reconciled explicitly; genuinely open choices escalate as STOPs. The
round report carries the DISPOSITION TALLY, and a round that folds
~everything is a triage-inspection signal, never a quality sign.
**The spec-vs-build altitude line (binding from round 1):** the
packet states test obligations as DISCIPLINE plus FAMILY INVENTORY
(parameterized membership, owner named — template §2), never
fixture-level enumeration; a finding demanding fixture-level
enumeration at spec time is `deferred-to-build` BY RULE — the
build-close arm gate's sensitivity pass verifies every inventory
member against the BUILT test bodies (R-LANE-SENSITIVITY binds twice;
the ch11-P2b/P2c evidence: correct packet lane texts still built weak
asserts — the guarantee is only purchasable at the built bodies).
Spec-time findings remain: a missing family, a missing discipline, a
wrong membership rule, an intra-packet contradiction, a ratified-row
conflict. **The proportionality gate:** a fold that ADDS a mechanism
(a new validator, freeze, probe, or guard class) states a one-line
proportionality record — the defect class guarded, its plausibility,
the spec-weight cost; `declined: out of threat model` is a live,
ROUTINE route for content-mechanism findings, extended from the
TOOLING class (which keeps its mandatory threat-model judgment).
A completeness or sweep claim ("all N occurrences", "the
only element not carried") is admissible only WITH its measurement —
the defined scope and the command output that proves it; enumeration
from memory is not a measurement, and a TRUNCATED measurement is not
a measurement either: the output rides untruncated (or with the exact
count of what the cut hides), and a truncation-SATURATED output — the
hit count equals the cut limit, e.g. a `head -20` pipe returning
exactly 20 lines — is itself the overflow signal that forces a re-run
before any "full set" claim (adopted at the ch8 boundary, 2026-07-11;
the ch8-P2 arm-gate-1 catch). Three routes exist for ownership
misfit, plus `approve-ratified` — a decision-record MARKER (it
routes nothing; it names WHERE a decision was ratified by the
approve act — a resolved STOP verdict OR a below-Case-B new-decision
riding to a human approve; generalized at the ch7 boundary from the
ch7-P3 minting, first applied at ch7-P4 F2):

| Route | Home | Revisit |
|---|---|---|
| `boundary-review` | process-log line | the chapter DoD's mandatory log review |
| `later-chapter` | proposed plan-map row | ratified by the human at approve/boundary |
| `declined` | packet flag, `declined — <reason>` | none BY DESIGN — a human-ratified standing decision |
| `approve-ratified` | packet flag — the dated decision record (a resolved STOP verdict or a below-Case-B new-decision) | none — the approve act ratified it (the marker class named in the intro above; minted at the ch7-P3 pilot, generalized at the ch7 boundary) |

**Panel re-run scoping (adopted 2026-07-10 — the ch7-P3 pilot
evaluation, ratified in-session as a blocking sustainability fix;
the v1 `targeted_lane_review` discipline ported from
ExecutePairflowPlan's Delegation Gates, ReviewSpec Hard Stop 8–11):**
the panel has ONE review definition and SCOPED re-runs. First pass on
a new target: FULL (all five lenses). After a **CONTENT fold**
(canonical-row semantics, a lane set, a claim/dimension statement,
or a manifest class changed) the default re-run is **TARGETED** —
the lenses that found last round, the lenses whose surfaces the
delta touched, plus lens 4 as reconciliation over the delta list —
with MANDATORY escalation to full on: a manifest-class change, a
scope/split change, a claim/matrix-STRUCTURE change, a
STOP-resolution fold, or a skipped lens not PROVEN unaffected. A
**BOOKKEEPING fold** (mirror lists, measurement transcription,
cross-references, wording sync — zero canonical-content change)
never voids a clean round and is verified by ONE reconciliation
pass (a content hit reclassifies it; three consecutive non-clean
reconciliation passes escalate to a targeted round, which counts
toward the watchdog); bookkeeping findings batch
into one fold, never restarting the loop one at a time. **Clean** =
zero CONTENT fold-now findings AND zero STOP-class findings.
**The close (the creation-phase amendment, user-ratified 2026-07-10
— the v1 shape restored, the D4 closing-full-round floor RETIRED;
provenance: the process-log entry of the same date):** the approve
requires the FIRST round FULL plus a clean TOP-LEVEL RECONCILIATION
CLOSE over the FINAL content hash — one fresh-context pass fed the
final bytes, the accumulated delta history, and the recorded lens
outputs; a full fan-out at close ONLY when an escalation trigger
fired on the last fold. Rationale: the creation phase sits inside a
LAYERED defense (doc refinement follows; the user's external
adversarial arms follow) — maximal in-phase assurance was the
retired strengthening, and the run that retired it measured two
zero-yield closing full rounds. A clean close binds to its hash:
any later CONTENT fold voids it (approve-readiness is never
assembled across revisions); after a clean close only
reconciliation-verified bookkeeping folds may touch the bytes.
**External-arm folds** (user-relayed third-party review findings)
are ORDINARY folds — the fold classes apply; the finder-lane rerun
is the ARM'S OWN RE-CHECK on the folded bytes, its verdict citing
the NEW content hash (a verdict on stale bytes is no verdict), plus
the mandatory delta-scoped reconciliation pass; the escalation
triggers are unchanged. The arm may be run by the user manually OR
invoked by the loop non-interactively — and on the autonomous path
(the arm-gates paragraph below) AGENT-INVOCATION IS THE DEFAULT: the
user-manual arm is the FALLBACK when the ReviewPacket §6 availability
preflight fails, and which form runs is decided BY that preflight,
never offered as a user choice (emphasis reversed at the ch12
boundary — the earlier "an OPTION, not a mandate" framing licensed an
ask-the-human default and survives only OUTSIDE the two mandatory
gates; agent invocation proven 2026-07-10, the ch8 draft's rounds 5).
The mechanics live in the `CreateTaskPacket` skill's ReviewPacket
workflow. Its standing-leg question was resolved by the two mandatory
autonomous-path gates (2026-07-11) and re-affirmed at the ch12
boundary (yield FLAT — the arm is load-bearing).
**Model policy (amended 2026-07-10):** EVERY panel pass — full,
targeted, reconciliation, the close — runs on an Opus-class model;
the full⇒Opus / targeted⇒Sonnet tiering is retired
(model-effectiveness experiments are a later, explicit act);
Fable-class models stay reserved for exceptional one-off planning at
the user's explicit call — never business-as-usual packet review.
The panel report records the re-run mode, skipped lenses with their
proven-unaffected reasons, and any escalation trigger fired.

**Size triggers (mandatory check, advisory outcome — adopted
2026-07-17):** every round report states the packet's md size and its
growth since the FIRST FULL round; v0 thresholds — 48 KB absolute,
+50% growth-under-review — a breach is a WARNING that puts split /
demote (detail pulled back to discipline + inventory) /
accept-with-note on the next human touchpoint's agenda, never an
authoritative decision. The write-time risk gate (template §2 step 0)
stays the only hard sizing rail. Ground: the measured drift — ch4–ch6
packets ran 4–15 KB, the ch8/ch11 generation 53–84 KB, the growth
fold-borne review armor, not operative content. Thresholds
recalibrate after the first 2–3 packets under the revised process.

**The fresh-implementer lens (EXPERIMENT — adopted 2026-07-17):**
once per packet — after the plateau / before the close, on the
approve-candidate bytes — a fresh-context agent fed ONLY the packet
restates what it would build; divergences from the intended semantics
are COMPREHENSION findings (triaged per the finding policy). It
directly tests §5.3's self-containment claim: a restatement that
needed outside knowledge is itself a finding. Evaluated at the
chapter boundary after 2–3 uses — scaled, iterated, or retired on
evidence; mechanics in the `CreateTaskPacket` ReviewPacket workflow
§7.

**Phase-2 obligation:** findings, flags, and routes stay EXPRESSIBLE
in the severity ontology's language
(`docs/reviewer-severity-ontology.md`: timing/layer) for when packets
flow through pairflow doc-bubbles.

**Threat model, stated once:** one operator plus review-gated agents
on a single repo. The machine gates defend against agent drift and
sloppiness (silent edit of ratified text, unresolved reference,
boundary escape) — never against adversarial history forgery; git
history plus the operator's diff review own that layer.

**Tier-0 scoping principle:** tier 0 checks hard deterministic facts
over DECLARED data — schema shape, existence, reference resolution,
equality-at-commit, subset-of-boundary; it never extracts semantics
from prose (prose obligations are tier-1 lens duties). Corollary:
selftest armor scales with the declared surface — shrinking the
surface shrinks the armor without shrinking confidence. This
principle decides every future "should the lint check this?" dispute.

**Verification-surface tooling review (adopted 2026-07-23, the
speedup-batch lesson — owner decision on the batch's own evidence):**
any internal tool that PARTICIPATES IN THE VERIFICATION SURFACE — a
tier-0 gate, a wrapper/composite over ratified gates, a choreography
executor over ratified text (the reopen-runner class), or arm
infrastructure (guard / pin / invocation) — receives an EXTERNAL-ARM
review BEFORE its first load-bearing use, in addition to the standing
floors (claim-derived negative tests, §4 step 2; the selftest armor
above). Rationale, from the adopting batch's three arm rounds
(11 → 7 → 1 findings): every P1 was a WRAPPER-BOUNDARY breach —
silent gate-weakening or gate-substitution — exactly the class the
tool's own author is structurally blind to (the author's premise IS
"the wrapper does the same thing", so its violations are invisible
from inside; the false-green chapter-close lane is the canonical
example). Ordinary convenience scripts (report generators, one-off
analysis) stay at the selftest floor — the trigger is verification
PARTICIPATION, not tool-ness; a disputed classification defaults to
the arm (fail-closed).

**One-off model-sync exception (user-ratified 2026-07-11, extended by
the ratified Lane-4 addendum; EXPIRES at ch11-P0 build-close or P0
abandonment — the boundary review decides promotion-or-expiry):** the
approve-precondition carve-out recorded in `ch11-model-sync-delta.md`
(the original @ de33d245; the Lane-4 addendum's ratifying act names its
commit) binds ch11-P0 ONLY: the three NAMED drift lanes
(rejectionNames / unitMap / domainRegistry tests) may be red at ITS
approve, each lane's divergence EXACTLY the evidence file's enumerated
delta, AND the `check_coverage.py --fold-time` gate may be red by
EXACTLY the addendum's 9 enumerated items — any deviation beyond
BLOCKS; every other approve-time gate green; the file also fixes P0's
closed mutation boundary (incl. `tools/v3-plan/check_coverage.py`, the
addendum's extension). This is a ratified, temporary precondition amendment — a red
mandatory gate is otherwise NEVER approvable, and a flag never
overrides a precondition.

**Tier-0 gate inventory, with a gate point per member:**

- **Approve-time:** `pnpm v3:packet-lint` (fold-time packet + draft
  form checks) with `--forbid-reopened` (the zero-reopened gate:
  packet approve, chapter close, and process flips require ZERO
  reopened drafts); `check_coverage.py --fold-time` (validation; the
  owned==realized lock is excluded — necessarily red on an
  approved-but-unbuilt packet); the drift tests; `v3:adr-check`;
  substrate-probe scripts.
- **Build-close:** the `--post-build` audit (§4 step 8) and coverage's
  DEFAULT mode (the owned==realized three-way lock).
- **Chapter-close:** `pnpm v3:deferred --closed chN` (zero open
  markers) and `pnpm v3:realized-map` (the map cites every
  manifest-reffed co-realizing lane; adopted 2026-07-23 from the
  arm-audit sweep). The map additionally gets a DETACHED external-arm
  audit pass after the close — non-blocking, parallel to the next
  chapter's build, settled before the NEXT chapter's close
  (DraftContract §5 carries the full two-layer rule + fold policy).
- **Composite runner (the ch9 speedup batch, 2026-07-23):**
  `pnpm v3:check-docs` = a composite RUNNER for the doc-family gates
  (one call, same gates, any red = red; per-mode canonical
  arguments: quick / packet-approve / chapter-close) — a wrapper,
  never a new gate and never a gate-point substitute: each column
  above stays canonical, and the tool prints per mode what it does
  NOT cover (drift tests, probes, ci:local). `pnpm v3:commit` runs
  the pre-commit checklist's MECHANICAL half (staged scope, doc
  gates, staged-vs-worktree purity) fail-closed; the judgment items
  stay the caller's, answered in the calling reply.

**Standing human checkpoints (never automated away, never inferred —
restated identically on AGENTS.md and the skill):** plan-chapter
ratification; the model↔code divergence stop (§6); contract-draft
ratification and RE-ratification (the intent-injection point — never
delegated at any trust level, and never inferred from an intent
statement: the act is explicit, on named bytes; the act's DEPTH is
the human's risk call on the evidence chain — for a dense draft,
deep coherence is build-equivalent to verify, so the act legitimately
is a contradiction-hunting read + evidence-chain acceptance + GO,
with the residual carried to the build's own stops; the ratifier's
digest aims the read at the decision-dense rows — adopted at the ch8
boundary, mechanics in DraftContract §4). The **first-of-a-kind
rule**: the first packet of a new task class is human-approved
regardless of trust stage. The **measurement rule**: "did a human catch
new-decision content the detector did not flag?" is asked at the ch7
pilot's approves and, from ch8 on, POST-HOC at the chapter boundary —
the boundary review AUDITS the autonomously-approved packets
(manifests, flags, `detector_misses`), and the build/aftermath stream
feeds `detector_misses`; a miss is a DETECTOR bug: fix the rule, do
not add process. **Entry mode is the trust dial:** the user chooses
per work item — prompt-by-prompt or delegating a packet/chapter.

**The trajectory (realigned 2026-07-10 —
[`autonomy-realignment.md`](autonomy-realignment.md)):** packet-level
autonomy opens at ch8 (the matrix's flag-free row; the ch7 pilot
validates the machinery with the LAST per-packet manual rounds), and
the full v1 risk gate is ADOPTED as the write-time sizing/split gate
(template §2 step 0, self-contained). The stage names keep their
meaning for the plan's ramp-marking convention (§1.3) and the packet
header field: **calibration** = through the ch7 pilot (closed with
it); **measurement** = ch8 on — autonomous flag-free packets with the
post-hoc boundary audit; **chaining** = the CHAINING STAGE:
chapter-level delivery through `ExecutePairflowPlan`, pairflow
doc-bubbles carrying refinement and implementation. Chapter headers
from ch8 declare `measurement`.

**The transitional cross-model arms:** until pairflow doc-bubbles
arrive, the USER's manual cross-model arms play phase 2 (the
adversarial, cross-model review) — explicitly a TRANSITIONAL
skill-validation scaffold with no formal stop criterion; it retires as
skill trust builds. The ratification blocks' `arms` lists name exactly
these reviewers. **External-arm checkpoint (adopted at the ch7
boundary):** on a FLAGGED approve, the build starts only after the
external arm has run on the approved bytes OR the user explicitly
waives it — the approve act and the build never share one turn (the
ch7-P4 miss: the arm's window vanished and its seven findings arrived
post-build). **The autonomous-path arm gates (user-ratified
2026-07-11 — TRANSITIONAL until pairflow doc-refinement carries
phase 2, or an earlier boundary-review retirement):** on the
AUTONOMOUS flag-free path the agent-invoked external arm (the
`CreateTaskPacket` ReviewPacket §6 mechanics) is MANDATORY at TWO
gates. (1) APPROVE gate: after the clean close, the arm reviews the
approve-ready bytes; the build starts only on an arm verdict citing
the final hash with ZERO fold-now findings — arm findings fold as
ordinary folds, and an arm-minted flag-bearing item DEMOTES the
approve to the human path (the matrix's flag-bearing row). (2)
BUILD-CLOSE gate: after the build commit and its audit, the arm
reviews the IMPLEMENTATION against the packet contract, and its
MANDATORY SENSITIVITY PASS (promoted 2026-07-17 from the ch11-P2b/P2c
second occurrence) verifies every packet-declared discipline and
inventory member DRIVEN and ABLE TO FAIL in the built test bodies —
R-LANE-SENSITIVITY's build-close half; the packet is
DONE only on a clean, sha-citing verdict — substance findings fold
per the §4 aftermath rules. Discipline: the diminishing-returns
cutoff binds (find → fold → ONE hash-citing re-check per fold; a
round yielding only bookkeeping-class items ends the leg); an arm is
UNAVAILABLE only after the ReviewPacket §6 availability preflight
FAILS (`which codex` + arm-pin match + the attempted invocation) —
the agent runs the check and the attempt FIRST, and a STOP must CITE
the failed check (assume-then-STOP is the named anti-pattern, ch12
boundary); an UNAVAILABLE arm is a BLOCKER → STOP to the human, never
a silent skip; a waive is the human's explicit act, per gate.
Human-touchpoint distinction (ch12 boundary): on a CLEAN gate the
flag-free path PROCEEDS — a discretionary stop is the named
anti-pattern (the ch12-P3 pre-approval incident); but an arm FINDINGS
verdict whose fold REWRITES A CANONICAL ROW against the author's
documented rationale on a ratified-contract-faithfulness question is
a legitimate recommendation-first human touchpoint — it surfaces the
author-vs-arm dispute, it does not re-decide autonomy. The boundary
review evaluates the gates' yield from the `detector_misses` stream.
Ground: the ch8-P1 measurement — four real catches, two per gate
class, that the internal Opus panel missed.

**Metrics convention:** one `packet_metrics` machine block per packet,
written once at build close (schema FORM: template §1). `stops[].type`
uses the registry above; `rounds.review` counts panel rounds, while
`rounds.doc_refinement` and `rounds.implementation` count the pairflow
runs' rounds (until pairflow carries implementation, `implementation`
≈ build + post-build fix rounds); `prediction.reasoning` and
`detector_misses[].why_missed` are the pattern-mining surfaces (why we
mispredict; which lens/rule is weak); `prediction` is pre-registered
at chapter ratification (plan §1.3 convention) and never retro-filled;
late discoveries add a process-log line AND increment the block;
`baseline_note` is the only home for unit/regime qualifiers. The block answers three questions — is the
packet good (downstream rounds)? is the detector reliable (misses)?
where is the bottleneck (round/lens distribution)? — and NO
aggregation tooling is built until packet count justifies it. The
2026-07-17 revision's disposition tally, yield curve, and close-time
size live in the round reports and the Build record PROSE for now —
promoting them into the `packet_metrics` machine schema is a
boundary-review decision (the lint's deep schema moves with it;
invariants-vs-tooling).

## 6. Cross-cutting protocols

- **Model↔code divergence (mandatory stop).** If implementation reveals a
  model bug or gap, it is NEVER silently patched in code. It goes back to the
  model plane (`../model` edit + `check.sh` + ratification) and returns to
  code through the regenerated ledger. The drift tests stay truthful; the two
  planes cannot shear.
- **Decision-home triage (the four-home rule; adopted at the ch9
  opening, 2026-07-23 — born from the ch11-C31 audit case plus the
  owner's model-rigidity reframing).** Every durable decision has
  exactly ONE home, chosen by CONTENT NATURE, never by subsystem:
  (1) **the model** — system semantics: a behavioral contract every
  implementation must honor, expressible in the model's forms
  (units / invariants / traces / registries). The model is a
  SEMANTICS plane, not a kernel plane — standing non-kernel
  precedents: `storage-scope`, the config cascade (l0c /
  l0f-mode), the L0e provider seam. Admission test **K0**: *"would
  a second, independent implementation of this surface have to
  behave exactly this way — and can it be written as a
  unit/invariant/trace?"* A K0-yes is NEVER a direct edit: it
  routes through the fix-FIRST model-wave path (model edit +
  `check.sh` + ratification — the divergence-stop road),
  user-gated; the model's cost is its protection, deliberately
  kept. (2) **an ADR** — an architecture-SHAPE decision, lifted
  when ANY of **K1–K4** holds: K1 binds beyond its chapter; K2
  rationale not recoverable from the code; K3 violable by an
  innocent-looking diff; K4 safety/irreversibility class (host
  effects, confinement, authority boundaries). (3) **a
  contract-draft C-row** — chapter-scoped decisions (frozen at
  realize; a reopenable anchor — the ch11-C31 audit precedent).
  AUTHORITY when a row is ADR-lifted: the ADR owns the durable
  decision, the C-row is its chapter REALIZATION (a projection with
  the verification surface) — on divergence the ADR wins and the
  row's contract reopens; the two never compete as peers.
  (4) **code + tests** — everything else; the realized freeze is
  the record. **Reflection rule:** every model-touching act
  appends a one-line K0-gate reflection to the process-log ("did
  the admission rule route this case correctly?"); the boundary
  review disposes the accumulated lines (rule adjustment OR
  acknowledged non-issue) — the gate learns at boundaries, never
  mid-chapter.
- **Chapter definition of done:** contract tests green + drift tests green +
  the chapter-1 intake tables updated (status flipped) + any born ADRs in
  `accepted` state + the process-log review (§7) held + **the full local
  CI gate (`pnpm ci:local`) green** — the ROOT suite included, not just
  the v3 bridges (adopted at the ch-5 boundary, effective from chapter
  6: v3-only bridge runs let a stale root-side CI test sleep until the
  next push) — **plus the DOGFOODING checkpoint** (adopted at the ch8
  boundary, 2026-07-11; effective from the ch8 close): the operator
  surface driven BY HAND or script at least once before the close —
  the "reality isn't what we assumed" class that test lanes
  structurally miss; findings land as process-log lines. Once the
  ch9 runner lives, the checkpoint includes a real-LLM basic-workflow
  run (the tier-2 lane — CI journeys stay deterministic, template §2).
  WAIVABLE per close by the USER's explicit act, recorded with the
  close — never silently skipped — **plus the three draft-close
  conditions:** ZERO
  reopened drafts (`check_packet.py --forbid-reopened`; unconditional
  — naturally vacuous when no draft exists); EVERY chapter-referenced
  contract-draft flipped `realized` (map filled + status flipped in
  ONE act, per `contract-draft-template.md` §4); and the draft-metrics
  close line recorded — both scoped to the chapter's drafts IF ANY.
  A chapter without these is not done regardless of code state.
- **Human-gate presentation discipline (adopted 2026-07-18 at the
  ch11 close — the user's experience verdict; the stepwise ch11-close
  cadence is the template, the dense single-block first form its
  anti-pattern).** Whenever a decision reaches the human — a STOP, a
  flag-bearing approve, a ratification, a boundary verdict, a close
  act — the presentation follows eight rules: (1) ONE decision per
  message, independent decisions never bundled; (2) SELF-CONTAINED
  context — every referenced artifact explained inline in plain
  language, the reader assumed to hold NONE of the process state in
  their head ("what is a realized map" is the calibration bar);
  codenames, row ids, and hashes appear only WITH their meaning;
  (3) the ROLE statement — explicitly: what the human must judge,
  what the machines/agents already verified, and what the approval
  MEANS; (4) the RISK statement — what happens if the decision is
  wrong and how reversible it is; (5) a RECOMMENDATION with its
  reasoning, always — the human adjudicates a proposal, never
  composes from a blank page; (6) a CLOSED decision vocabulary
  stated up front where one exists (gate / rule / non-issue / watch;
  approve / rework); (7) a ROADMAP once at the start of a multi-step
  act — where we are, what comes, at which steps the human is needed
  — then step-by-step with a talk-point after each; (8) a ONE-WORD
  answer must suffice — a question whose answer needs an essay is a
  presentation defect, not a hard decision.

## 7. Process reflection

The process itself is new (sample size: one), so it carries its own feedback
loop — pre-defined **capture**, deferred **structure**:

- **Friction log** — [`process-log.md`](process-log.md), append-only, one
  line per observation, written **the moment the friction happens** (a
  session summary will not preserve it later). Anything qualifies: a packet
  that needed out-of-packet fishing, a gate that fired late, a rule that
  read ambiguous, a step that felt ceremonial. **Cross-session findings
  (adopted at the ch7 boundary):** findings born OUTSIDE a packet session
  (user-side external reviews included) are captured as dated log entries
  AT CAPTURE TIME — never announced without a written home; when folded
  immediately, the packet's Aftermath is the durable record (the ch7-P2
  set-aside loss is the counter-evidence this rule exists for).
- **Capture, don't fix.** No process edits mid-chapter unless the issue
  blocks; the log is the pressure valve that keeps work from drifting into
  process-polishing.
- **Reflection point = the chapter boundary** (already a ratification
  checkpoint, now part of the chapter DoD): review the new log lines; each
  becomes a gate, a checkpoint rule, a README edit, a WATCH, or an
  acknowledged non-issue — and **every verdict routed `later-chapter`
  lands its plan-map row IN THE SAME boundary act** (the route's own
  defined action, §5.5's table): a forward obligation captured only
  in boundary prose is a defect — the next session's derivation
  reads the plan map, never the log (adopted at the ch9 close,
  user-ratified 2026-07-25 — the EPIPE carried-item miss).
  **Admission bias (adopted at the ch12
  boundary):** a single-occurrence candidate defaults to WATCH (promoted
  on recurrence; severity-weighted exceptions only); when a rule IS
  warranted, the preference order is mechanize (lint/test/checker) →
  extend an existing lens duty → new prose rule, because a prose rule
  costs per-read attention while a mechanical check runs free — the cap
  that matters is the PROSE registry's size, not the rule count. This
  extends §5.5's measurement stage (hand-catches become gates) from the
  build loop to the process itself.
- **Rule retirement is a first-class boundary verdict (adopted at the
  ch12 boundary), with the same standing as addition.** Each boundary
  review sweeps the standing registries (the LearnedRules `R-*` registry,
  the template §3 `REV-*` rules, the §4 build-loop rules) asking, per
  rule: did it catch nothing this chapter? has a mechanical check
  absorbed it? does it duplicate a lens duty or persistently co-fire with
  another rule? A retired rule's row is DELETED from its registry (the
  operative surface speaks present — R-PRESENT-TENSE); the retirement
  verdict and its reasons live in the boundary's process-log entry and
  git history. The sweep is fed by a per-rule catch TALLY the boundary
  entry carries for the chapter (hand-tallied from packet metrics /
  detector-miss records; a catch matching several rules credits EACH of
  them, and a persistent multi-rule overlap is itself a boundary signal —
  a duplication candidate, same standing as a zero-catch rule).
- **No pre-defined metrics or retro template** — what is worth measuring is
  itself an empirical question; let the first chapters' log answer it.

## 8. Skill-ification (executed 2026-07-08)

The v3-mode task-packet flow starts as a **template + projection checklist**
in this directory (a named deliverable of plan chapter 1), executed manually
during the calibration stage. Only after 2–3 real tasks validate the shape
does it become a repo-local skill (`.claude/skills/` in this repo — NOT the
global skill set; the corpus pattern has a sample size of one, so nothing is
generalized yet). The global `CreatePairflowSpec` stays untouched; its
ergonomics layer is inherited as rubric content, not by forking the skill.

**Executed 2026-07-08, at the ch6→ch7 boundary.** The criterion was
satisfied several times over: 14 live packets across chapters 4–6, the last
10 on a structurally unchanged template. The flow is now the repo-local
**`CreateTaskPacket`** skill (`.claude/skills/CreateTaskPacket/` —
`AuthorPacket` + `ReviewPacket` + `DraftContract` workflows + the
learned-rules registry).
Boundary of authority: the template, the projection checklist, the
`REV-*` registry, and the contract-draft template
(`contract-draft-template.md`) stay canonical in THIS directory; the
skill carries procedure plus the failure-class registry distilled from
the process log, and is amended at chapter boundaries only (§7's
rhythm). The human checkpoints (§5.5) are untouched — the authoring
loop stops at every STOP and at every human-gated approve; an
autonomous flag-free approve proceeds to build (the §5.5 matrix).
