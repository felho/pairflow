# V3 Implementation — Process

Status: ratified 2026-07-07
Purpose: Define the exact process for turning the settled Block A model into
code — how the plan is written, how each step is built, and how Pairflow v1
is used as the execution vehicle.

This directory is the **implementation plane**. The model plane
(`../convergence/`, `../topics/`) stays untouched by anything that happens
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

## 2. Binding inputs

The implementation consumes exactly these surfaces; everything else is
reachable through their pointers:

1. **The model** — `../convergence/core-model.html`, authored via
   `model-src/` (playbook §6). Its machine face is
   `model-src/ledger.md`: 158 pseudocode units, 85 named rejections, the
   invariant catalog, the domain registry (51 aggregates / 121 entities), and
   140 named Absents. The ledger is the model↔code contract surface.
2. **The implementation contract** — `../convergence/implementation-contract.md`:
   binding `IC-*` constraints (each must map to a test, a check, or an ADR)
   and the `PI-*` plan-intake checklist (each must have a home in the plan).
3. **Scope** — the "V1 operability scope" paragraph and Block A boundary in
   `../convergence/approach.md`.

**Sequencing note (resolved):** the emit-contract slice landed WITH its
landing review absorbed (`4b79830d` + the review fixes `c468031d`,
`f0e82d4e`; memo: `../topics/_closed-emit-contract.md`). There is no pending
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
contract-draft the chapter's plan §N.7 table references is not yet
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
  many review rounds); the 158 units are its residue. Passing prose rules
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
3. **Watchdog exhaustion** — `3:watchdog`: 8 rounds without approve →
   STOP with a diagnosis (churn composition → split vs draft
   proposal). Auto-split-remedy is delegable LATER — a deferred,
   evidence-based step, not a live delegation.
4. **Flag-bearing approve** — `4:flagged-approve`: the approve's
   substantive content is ratifying the flags.

**Verdict-action matrix:**

| Loop event | Action |
|---|---|
| `refine` (any fold-now finding) | autonomous: fold + re-run panel |
| `split`, within chapter (coverage union preserved) | autonomous, visible report |
| `split` changing chapter scope/sequencing/dependencies | STOP 2 |
| `approve`, flag-free (zero new-decision manifest rows, zero approve-ratified routes, every approve-time tier-0 gate green, one full clean panel round) | AUTONOMOUS from ch8 on — the loop proceeds to build (§4); the ch7 pilot packets (P3/P4) stay human-approved (first-of-a-kind), the last per-packet manual rounds |
| `approve`, flag-bearing | human (STOP 4), at every trust stage |
| STOP 1–3 events | human, always |

**Flag-bearing, defined:** new-decision manifest rows present, OR any
routed flags entry whose ratification point IS the approve —
`declined` always, and parked proposals batch-ratified at approve.
Watchpoint STATUS alone does not flag-bear; the ROUTE decides. The
manifest class ENTAILS the flags entry: a new-decision manifest row
with no corresponding pre-approval flag is a packet defect (the rows
RIDE as pre-approval flags).

**Finding policy (fix-all):** every panel finding is fixed by default
— Bayes (a fresh-context re-review re-finds unaddressed issues) and
ambiguity transfer (the fresh reviewer is a proxy for the build-time
implementer). Fix-all binds CONTENT findings and routes EFFORT, never
truth: per-finding dispositions (folded / narrowed / declined, with
reasons), conflicting feedback sources reconciled explicitly,
genuinely open choices escalate as STOPs. TOOLING findings get a
mandatory threat-model judgment; `declined: out of threat model` is a
live route. Routes exist ONLY for ownership misfit:

| Route | Home | Revisit |
|---|---|---|
| `boundary-review` | process-log line | the chapter DoD's mandatory log review |
| `later-chapter` | proposed plan-map row | ratified by the human at approve/boundary |
| `declined` | packet flag, `declined — <reason>` | none BY DESIGN — a human-ratified standing decision |

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

**Standing human checkpoints (never automated away, never inferred —
restated identically on AGENTS.md and the skill):** plan-chapter
ratification; the model↔code divergence stop (§6); contract-draft
ratification and RE-ratification (the intent-injection point — never
delegated at any trust level, and never inferred from an intent
statement: the act is explicit, on named bytes). The **first-of-a-kind
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
these reviewers.

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
aggregation tooling is built until packet count justifies it.

## 6. Cross-cutting protocols

- **Model↔code divergence (mandatory stop).** If implementation reveals a
  model bug or gap, it is NEVER silently patched in code. It goes back to the
  model plane (model-src edit + `check.sh` + ratification) and returns to
  code through the regenerated ledger. The drift tests stay truthful; the two
  planes cannot shear.
- **Chapter definition of done:** contract tests green + drift tests green +
  the chapter-1 intake tables updated (status flipped) + any born ADRs in
  `accepted` state + the process-log review (§7) held + **the full local
  CI gate (`pnpm ci:local`) green** — the ROOT suite included, not just
  the v3 bridges (adopted at the ch-5 boundary, effective from chapter
  6: v3-only bridge runs let a stale root-side CI test sleep until the
  next push) — **plus the three draft-close conditions:** ZERO
  reopened drafts (`check_packet.py --forbid-reopened`; unconditional
  — naturally vacuous when no draft exists); EVERY chapter-referenced
  contract-draft flipped `realized` (map filled + status flipped in
  ONE act, per `contract-draft-template.md` §4); and the draft-metrics
  close line recorded — both scoped to the chapter's drafts IF ANY.
  A chapter without these is not done regardless of code state.

## 7. Process reflection

The process itself is new (sample size: one), so it carries its own feedback
loop — pre-defined **capture**, deferred **structure**:

- **Friction log** — [`process-log.md`](process-log.md), append-only, one
  line per observation, written **the moment the friction happens** (a
  session summary will not preserve it later). Anything qualifies: a packet
  that needed out-of-packet fishing, a gate that fired late, a rule that
  read ambiguous, a step that felt ceremonial.
- **Capture, don't fix.** No process edits mid-chapter unless the issue
  blocks; the log is the pressure valve that keeps work from drifting into
  process-polishing.
- **Reflection point = the chapter boundary** (already a ratification
  checkpoint, now part of the chapter DoD): review the new log lines; each
  becomes a gate, a checkpoint rule, a README edit, or an acknowledged
  non-issue. This extends §5.5's measurement stage (hand-catches become
  gates) from the build loop to the process itself.
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
