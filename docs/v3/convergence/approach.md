# V3 Convergence — Approach and Level Roadmap

Status: draft — defines the agreed convergence method and a *proposed* level roadmap.
Date: 2026-06-13
Purpose: Capture how we run the convergence phase, and lay out the full ramp of levels
(with the concepts each introduces and why), so the plan itself can be reviewed —
including by other people or other LLMs — before we commit to it.

This document is the **method and the plan**, not the model. The model is built
incrementally in [`core-model.html`](core-model.html). The raw material being distilled
is [`../concept-braindump.md`](../concept-braindump.md) (21 sections) and the 7 fixed
scenarios in [`../test-workflows.md`](../test-workflows.md).

> This is the approach we defined and a hypothesis for the levels. It is deliberately
> not yet judged or finalized — feedback on the ordering, the level boundaries, and the
> per-level concepts is exactly what we want.

---

## 1. Goal of convergence

The braindump is intentionally bloated: ~2000 lines, many "deferred/keep-open" markers,
a few internally competing ideas. Convergence does **not** summarize it — it distils a
**coherent, buildable, prioritized core**. Three things it must produce:

1. **A spine** — the load-bearing decisions everything else depends on.
2. **Coherence** — proof the pieces actually fit, with no hidden contradiction.
3. **Priority** — what is the minimal core, and what layers on later.

The end consumer is implementation: this project's actual codebase (v1 → v2 → v3). So
the output must be something you can build from, and — because this is a hobby project,
value-for-self first — prioritization leans toward what delivers value soonest (likely
the WF-7 plan-execution workflow, which also builds on existing v1/v2 code).

---

## 2. The approach (method)

**Scenario-driven, bottom-up — not top-down taxonomy.** The tempting path is to write
"the clean v3 entity model" abstractly. That almost always yields an elegant document
that does not hold up, because the concepts were never tested against a concrete run.
Instead we grow the model from the smallest possible kernel and let concrete behaviour
force what is actually needed.

**Complexity ramp.** Start from the smallest thing that is still a workflow (L0), and
add **exactly one capability per level**. Understanding is the primary goal: a human can
follow complexity that grows step by step far more easily than absorbing one large
whole. Each level is a small, reviewable increment.

**The ramp is also a coherence test.** If each new capability sits cleanly on the
existing model (a new entity, or a new field — not a rewrite), the core is sound. If a
capability forces the structure to be torn up, that is a signal the core is wrong. This
is the architecture validator hidden inside the pedagogy.

**Three views per level**, so the model and its configuration can be followed as
complexity grows:

- **Runtime** — a concrete trace: what events arrive, what the kernel does, step by step.
- **Domain (DDD)** — the model: entities, aggregate boundaries, relationships.
- **Config** — the template/definition that declares the behaviour.
- plus **Absent** — what is deliberately not there yet, and which level introduces it.

**Greenfield kernel concepts, with reality checks against v1.** We define concepts
cleanly rather than reverse-engineering the v1 code, but periodically check them against
the real implementation (`src/v11/…`) to stay honest.

**Validation scenarios.** WF-1 (invoice) is the toughest *probe* (it bundles fuzzy
correlation + private-mailbox federation) and is used to stress the model once the
relevant levels exist; WF-7 (plan execution) is the *dogfooding* target and the likely
MVP anchor; WF-4 (external participant) is the control for "does the model survive an
actor outside the system". Most other scenarios are not expected to introduce new
primitives.

---

## 3. Output artifacts

- **`core-model.html`** — the model itself, one section per level (runtime + domain +
  config + absent), growing as the ramp proceeds. Visual, because expressiveness helps.
- **`approach.md`** (this file) — the method and the level roadmap, for review.
- Later: an implementation plan, derived from the converged core. Not yet.

---

## 4. The level roadmap (proposed — feedback wanted)

Each level lists the **concepts introduced** and **why it matters**. Levels are grouped
into four blocks. The ordering and boundaries are a hypothesis: a level may split, two
may merge, or the order may change as the play-through forces it.

### Block A — Local core (this is pairflow v1, re-expressed on the kernel)

**L0 — Local pair loop.**
Concepts: `WorkflowTemplate, Step, Role, Actor` (definition aggregate);
`WorkflowInstance, Transcript, LifecycleStatus` (run aggregate); `EventEnvelope`
(PASS/CONVERGED); transitions; plus **guidance**: `TASK` (the initial assignment),
`Step.instruction` (per-step role guidance), and a **handoff / context-packet seed**
(the kernel assembles what the next actor receives).
Why: the smallest thing that still *works* — event-sourced state, declarative routing,
and the minimum guidance an agent needs to act at all. Two aggregate roots (definition
vs. run) already seed lifecycle-vs-execution and append-only-transcript.

**L1 — Capability check.**
Concepts: `CapabilityProfile` (matrix `role × state → allowed actions`); the Capability
Engine as the first dispatch step.
Why: internal authorization — who may emit which protocol action in which state (the v2
enforcement backbone, Level 2). The same matrix also *advertises* available actions to
the agent (the protocol-navigation half of guidance). Not gates, not grants.

**L2 — Gate / policy.**
Concepts: `Gate, PolicyModule, GateDecision` (allow/block/defer); the convergence gate;
round logic (P0/P1 block, round gate).
Why: lift the convergence decision out of the reviewer's bare judgement into an
auditable, composable policy layer. This is the operational core of "the workflow is
the boss".

**L3 — Human gate.**
Concepts: lifecycle states `WAITING_HUMAN, READY_FOR_HUMAN_APPROVAL`; the `operator`
role; `human_gate` step type; approve / request-rework.
Why: the human as decision-maker at high-stakes points — the seed of the fiduciary
wedge and of "what humans keep".

**L4 — Help subflow / Ask.**
Concepts: `Subflow` (blocking / non-blocking); `Ask` (schema + addressee); `HELP_PENDING`.
Why: the agent can ask for help or a decision and the human answers in a structured,
schema-validated way. Establishes the Ask primitive that later generalizes to all human
(and agent) input.

*Milestone: L0–L4 ≈ full pairflow v1 running on the v3 kernel, entirely local.*

### Block B — Distribution (toward the distributed, multi-person workflow)

**L5 — Triggers & scheduling.**
Concepts: `Trigger`, the trigger router's three-way decision (feed waiting instance /
start new / unmatched); `Scheduler`; trigger kinds (event, cron, manual, data-condition).
Why: workflows stop being manually started; event-driven operation and timing become
first-class.

**L6 — Channels & task inbox.**
Concepts: `Channel` adapter; `EventNormalizer`; multi-channel delivery; the task inbox.
Why: human/agent interaction becomes channel-independent (tmux / Slack / email / web);
the kernel only ever sees EventEnvelopes.

**L7 — Wait conditions & correlation.**
Concepts: `WaitCondition` (structured predicate + NL description); the matcher;
correlation (deterministic + fuzzy); stale-intent handling.
Why: a step can wait for external data/events, and an incoming event must be correlated
to the waiting instance — the core of distributed workflows. *(WF-1 starts to bite
here.)*

**L8 — Gatekeeper & private-data federation.**
Concepts: the gatekeeper's three layers (connector runtime / matcher / owner UX);
`contribution`; trust `domain`.
Why: declared data flows in from private sources (a mailbox) without the substrate
seeing the source — the multi-person coordination mechanism.

**L9 — Grants & credentials.**
Concepts: `Grant` (first-class entity); credential vault; on-behalf-of provenance;
argument-level predicates.
Why: authority toward the outside world, with scoped delegation; the credential never
travels.

### Block C — Agent-native (the self-improving agent layer)

**L10 — Agent registry & durable identity.**
Concepts: agent definition (versioned), memory scopes (instance / agent / org), trigger
bindings, ephemeral activation.
Why: the agent as durable identity (definition + memory) with ephemeral activations —
the basis for "grow agents, don't build them".

**L11 — Definition PRs & metacognition.**
Concepts: the definition-PR channel; learning levels (instance / run / agent / system);
retro as a meta-workflow; authoring agent; gated self-expansion (schedules, datasets,
scripts).
Why: the system evolves (template/agent-definition changes) through one audited, gated
channel — and learns.

**L12 — Trust calibration & evals.**
Concepts: `TrustProfile` (keyed by gate, agent, definition version, context); the
autonomy ladder; gate-outcome + edit-distance recording; eval suites.
Why: when a gate may be skipped — driven by production signal as continuous evaluation;
accountability stays orthogonal to autonomy.

### Block D — Org-scale (governance / largely enterprise, mostly deferred)

**L13 — Org-scale capabilities.**
Concepts: rollback / compensation (reversibility class); MTP steering protocol (the
purpose lens); sticky labels (data-object metadata that travels); accountability shell;
cross-firm federation (signed provenance, codesigned liability).
Why: the governance and organizational-scale layer. Mostly deferred / keep-open; the
hobby project does not need it, but the invariants must be held so it can be added later
without retrofit.

---

## 5. What feedback we are looking for

For reviewers (human or LLM), the most useful feedback is on:

1. **Ramp ordering** — is each level genuinely the smallest next step, and does it only
   depend on earlier levels? Any level that secretly needs a later one?
2. **Level boundaries** — should any level split (too much at once) or merge (too
   thin)? L0 in particular: is the guidance/TASK addition right, or is it a separate
   level?
3. **Missing concepts** — anything in the braindump or the scenarios that no level
   introduces?
4. **Coherence risks** — places where a later level looks like it will force a rewrite
   of an earlier one (a failed coherence test waiting to happen).
5. **MVP cut** — given value-for-self priority, where is the right "stop here and build"
   line (e.g. end of Block A? a slice of Block B for WF-7)?

---

## 6. Caveats

This is a hypothesis, not a verdict. The play-through is expected to revise it:
boundaries will move, concepts will be added or dropped, and some "later" items may turn
out to be needed earlier (or vice versa). The roadmap exists to be argued with, not
followed blindly — its value is making the plan visible and reviewable before we build.
