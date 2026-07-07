# V3 Implementation — Process

Status: ratified 2026-07-07
Purpose: Define the exact process for turning the settled Block A model into
code — how the plan is written, how each step is built, and how Pairflow v1
is used as the execution vehicle.

This directory is the **implementation plane**. The model plane
(`../convergence/`, `../topics/`) stays untouched by anything that happens
here; the boundary rule is in the design-method playbook §8 (model decisions →
corpus + memos; implementation decisions → ADRs).

## 1. What lives here

- `README.md` — this process definition.
- `plan.md` — the implementation plan (Phase 1 output; chapter by chapter).
- `adr/` — implementation ADRs (default home; the plan's architecture chapter
  confirms or moves it when the code home exists). Convention: playbook §8
  ADR-activation addendum + `implementation-contract.md` PI-10.
- Task packets and the task-packet template, once Phase 2 starts.

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

Every plan step runs the same cycle:

1. **Read the spec** — the plan step plus its ledger slice (units, rejection
   names, invariants, traces). The ledger is the *what*; it is not
   re-interpreted at build time.
2. **TDD** — contract tests first, from the IC enforcement lines and the
   chapter traces (golden tests).
3. **Implement.**
4. **Drift tests green** — the three unconditional name-space tests (85
   rejection names / domain registry / unit→code mapping; PI-3).
5. **ADR if a trigger fires** (IC-A2, IC-A3, IC-B, IC-N, tooling picks) —
   born `proposed`, ratified to `accepted` at a human checkpoint.
6. **Review** — code review plus the ADR compliance review (the third QA
   axis; playbook §8).
7. **Commit** — one step, one commit; plan status updated.

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

The review rubric splits the same way: its content half checks
ledger-consistency (declared slice coherent, rejection branches covered,
drift-test surface named); its ergonomic half (size, density, embedding)
stays the v1 rubric.

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

### 5.5 The autonomy ramp and human checkpoints

Hands-off vs. supervised is not decided upfront; it is a per-task property
derived from contract density, ramped in three stages:

1. **Calibration** — the first chapters (intake, skeleton, test kit) run
   task-by-task with manual approve; the packets are built by checklist (see
   §8). Partly necessity: the mechanical gates are themselves being built
   here.
2. **Measurement** — anything the operator's hand catches that no gate did
   becomes either a new gate or a new checkpoint rule.
3. **Chaining** — a task class whose gates are fully mechanical and whose
   coverage accounting closes may be chained through `ExecutePairflowPlan`.

Standing human checkpoints (never automated away): plan-chapter ratification,
ADR `proposed → accepted`, the model↔code divergence stop (§6), and
refine/split verdicts when a mechanical gate fails. This is v3's own design
thesis applied to building v3: attention placed by design where the wait must
survive the performer, not spread uniformly or removed uniformly.

## 6. Cross-cutting protocols

- **Model↔code divergence (mandatory stop).** If implementation reveals a
  model bug or gap, it is NEVER silently patched in code. It goes back to the
  model plane (model-src edit + `check.sh` + ratification) and returns to
  code through the regenerated ledger. The drift tests stay truthful; the two
  planes cannot shear.
- **Chapter definition of done:** contract tests green + drift tests green +
  the chapter-1 intake tables updated (status flipped) + any born ADRs in
  `accepted` state + the process-log review (§8) held. A chapter without
  these is not done regardless of code state.

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

## 8. Deferred: skill-ification

The v3-mode task-packet flow starts as a **template + projection checklist**
in this directory (a named deliverable of plan chapter 1), executed manually
during the calibration stage. Only after 2–3 real tasks validate the shape
does it become a repo-local skill (`.claude/skills/` in this repo — NOT the
global skill set; the corpus pattern has a sample size of one, so nothing is
generalized yet). The global `CreatePairflowSpec` stays untouched; its
ergonomics layer is inherited as rubric content, not by forking the skill.
