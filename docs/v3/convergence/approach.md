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
add **one coherent capability per level**. Understanding is the primary goal: a human
can follow complexity that grows step by step far more easily than absorbing one large
whole. Each level is a small, reviewable increment.

"One capability" is a guideline, not a dogma. A level may introduce a single concept or
an **inseparable cluster** (e.g. wait condition + correlation + stale-intent genuinely
travel together) — but the cluster must be elements that truly must co-exist, not items
bundled for convenience. The test cuts both ways: guidance is *not* inseparable from the
routing core, so it gets its own level (L0b); correlation *is* inseparable from waiting,
so it does not get split.

**Concepts mature in stages.** A single primitive often arrives in graded forms across
several levels rather than all at once. Two examples that shape this roadmap:
- The **Ask** primitive: human decision (approval/rework) → agent-initiated help →
  general (addressee kinds, external-token, multi-channel). Earliest level introduces
  only the narrowest form.
- The **wait condition**: deterministic internal (a parent waiting on a specific child's
  lifecycle event, correlated by id) → general external + fuzzy (an unsolicited email
  matched against open waits).
Staging is itself a coherence signal: if a later, richer form of a primitive fits as an
extension of the earlier form, the primitive was modelled right.

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
  invariant + config + absent), growing as the ramp proceeds. Visual, because
  expressiveness helps. **Status: rebuilt to the revised ramp; L0a done, higher levels
  in progress.** `approach.md` remains the source of truth for the roadmap; the HTML
  realises it level by level.
- **`approach.md`** (this file) — the method and the level roadmap, for review.
- Later: an implementation plan, derived from the converged core. Not yet.

---

## 4. The level roadmap (proposed — feedback wanted)

Each level lists the **concepts introduced** and **why it matters**. Levels are grouped
into four blocks. The ordering and boundaries are a hypothesis: a level may split, two
may merge, or the order may change as the play-through forces it.

**This roadmap is WF-7-biased — deliberately.** The ordering optimizes the fastest
*self-validating* path (the WF-7 plan-execution workflow, which removes real pain: the
ExecutePairflowPlan prompt-orchestration and the `plan watch` polling), not an abstract
"clean" dependency ontology. A WF-1-first or WF-6-first roadmap would order things
differently. The constraint is that the WF-7 path must hold the same invariants that
later open toward WF-1/WF-4/WF-6 — so those doors do not close.

### Block A — Local core (toward the WF-7 MVP)

**L0a — Kernel skeleton.**
Concepts: `WorkflowTemplate` (id + version), `Step`, `Role` (names only — actor binding
is L0b) (definition aggregate); `WorkflowInstance` (with `template_ref { id, version }`
snapshotted so a run is pinned to an immutable definition), `Transcript`,
`LifecycleStatus` (run aggregate); `EventEnvelope` (carries `op_id` and `actor_id`
provenance); transitions. **Invariants stated here, not deferred:** idempotency — key
scope `(instance_id, op_id)`, re-applying a seen key is a no-op; **atomic transition
commit** — transcript append + state update as one logical commit under
expected_version (never append-then-CAS as separate steps); store semantics — definition
store, instance store, transcript/event log, artifact refs, *dumb store vs. kernel-owned
semantics* (the state layer is dumb; the kernel owns meaning). No agent guidance yet —
pure routing + state.
Why: the smallest mechanically-correct kernel. Two aggregate roots (definition vs. run)
seed lifecycle-vs-execution and append-only-transcript. The idempotency/store/versioning
invariants must be in the foundation because every later trigger/correlation/replay level
reaches back to them; surfacing them now prevents them looking like a later level
introduces them.

**L0b — Actor assignment + context-packet seed.**
Concepts: the `Actor` entity + role→actor binding; runtime actor/role assignment and
next-work-item dispatch; `TASK` (the initial assignment); `Step.instruction` (per-step
role guidance); a minimal **handoff / context-packet seed** (the kernel assembles what
the next actor receives).
Why: a skeleton that routes but gives the agent no idea what to do is not yet usable.
This is the minimum guidance to act — split from L0a because the context packet is a
large concept later (§11.4) and must not slip in as an L0 afterthought; it gets its own
line so its growth is visible.

**L1 — Capability matrix.**
Concepts: `CapabilityProfile` (matrix `role × state → allowed actions`); the Capability
Engine as the first dispatch step.
Why: internal authorization — who may emit which protocol action in which state (the v2
enforcement backbone, Level 2). The same matrix also *advertises* available actions to
the agent (the protocol-navigation half of guidance). Not gates, not grants.

**L2 — Gate / policy.**
Concepts: `Gate, PolicyModule, GateDecision` (allow/block/defer); the convergence gate;
round logic (P0/P1 block, round gate).
Why: lift the convergence decision out of the reviewer's bare judgement into an
auditable, composable policy layer. The operational core of "the workflow is the boss".

**L3 — Human decision Ask.**
Concepts: lifecycle states `WAITING_HUMAN, READY_FOR_HUMAN_APPROVAL`; the `operator`
role; `human_gate` step type; **approve / request-rework only**. The narrowest form of
the Ask primitive.
Why: the human as decision-maker at high-stakes points — the seed of the fiduciary wedge
and of "what humans keep". Deliberately *not* a general Ask platform yet.
Absent (later levels): help ask, agent-to-agent ask, external-token ask, multi-channel
delivery, rich schema.

**L4 — Child workflow instances + internal lifecycle events.**
Concepts: `ChildWorkflowLink`; parent waits on a child lifecycle event; **kernel-emitted
lifecycle events as an internal channel**; orphaned-child recovery. This is the
deterministic-internal form of the wait condition (correlated by child id).
Why: a child is a *full first-class instance* with its own lifecycle — not the embedded
subflow of L5. This is the WF-7 unlock and it must come early, before the full
distributed stack: it needs only internal events, not external channels or correlation.
Note the coherence bonus: "internal lifecycle events as a channel" is the smallest form
of the channel abstraction, prefiguring external channels (L8).

> **MVP cut — build until local WF-7 runs:** parent plan workflow, child bubble
> workflow, internal lifecycle events, human approval/rework gates, no polling. This
> validates the most important self-value without private-mailbox federation, fuzzy
> correlation, Slack/email channels, or the dataset layer.

**L5 — Help subflow (agent-initiated Ask).**
Concepts: `Subflow` (blocking / non-blocking); `HELP_PENDING`; the agent-initiated form
of the Ask primitive (still local delivery).
Why: the agent can ask for help/a decision mid-step. Completes the local pairflow-v1
feature set; not required by the WF-7 MVP, so it sits just after the cut. (Block A ≈
full local v1 once this lands.)

### Block B — Distribution (toward the distributed, multi-person workflow)

**L6 — Triggers & scheduling (minimal).**
Concepts: `Trigger`; the trigger router's three-way decision (feed waiting / start new /
unmatched); `Scheduler`. First only manual / internal / timeout triggers — *not* the
full email/data-condition breadth.
Why: workflows stop being manually started; event-driven operation and timing become
first-class, in a minimal form before the channel stack.
Staging note: the router itself matures in stages. At L6 the "feed waiting" branch
covers only **internal/timeout waits** (the L4 child-wait and L6 timers); the
**external unsolicited correlation** form of "feed waiting" arrives with L9. So L6 does
not secretly require L9 — it uses the deterministic wait forms already present.

**L7 — Grants & credentials (minimal).**
Concepts: `Grant` (first-class entity); credential vault; on-behalf-of provenance;
argument-level predicates. **This explicitly precedes the private-mailbox gatekeeper
(L10)** — the gatekeeper's connector runtime holds credentials, so federation without
grants/vault is only conceptual. The agent-definition-version-keyed grant refinement
comes later, with the agent registry (L11).
Why: authority toward the outside world, with scoped delegation; the credential never
travels.

**L8 — Channels & task inbox + general Ask.**
Concepts: `Channel` adapter; `EventNormalizer`; multi-channel delivery; the task inbox;
the **general Ask** (addressee kinds — help/agent/external-token; multi-channel
rendering; rich schema) — the broadest form the L3/L5 primitive matures into.
Why: human/agent interaction becomes channel-independent (tmux / Slack / email / web);
the kernel only ever sees EventEnvelopes.

**L9 — Wait conditions & external/fuzzy correlation.**
Concepts: `WaitCondition` (structured predicate + NL description); the matcher; external
+ fuzzy correlation; stale-intent handling. The general form of the wait condition whose
internal/deterministic form arrived at L4.
Why: a step can wait for external data/events, and an unsolicited event must be
correlated to the waiting instance — the core of distributed workflows. *(WF-1 bites
here.)*

**L10 — Gatekeeper & private-data federation.**
Concepts: the gatekeeper's three layers (connector runtime / matcher / owner UX);
`contribution`; trust `domain`. Builds on grants/vault (L7).
Why: declared data flows in from private sources (a mailbox) without the substrate
seeing the source — the multi-person coordination mechanism.

### Block C — Agent-native (the self-improving agent layer)

**L11 — Agent registry & durable identity.**
Concepts: agent definition (versioned), memory scopes (instance / agent / org), trigger
bindings, ephemeral activation; the agent-definition-version-keyed grant refinement.
Why: the agent as durable identity (definition + memory) with ephemeral activations —
the basis for "grow agents, don't build them".

**L12 — Definition PRs & metacognition.**
Concepts: the definition-PR channel; learning levels (instance / run / agent / system);
retro as a meta-workflow; authoring agent; gated self-expansion (schedules, datasets,
scripts).
Why: the system evolves (template/agent-definition changes) through one audited, gated
channel — and learns.

**L13 — Trust calibration & evals.**
Concepts: `TrustProfile` (keyed by gate, agent, definition version, context); the
autonomy ladder; gate-outcome + edit-distance recording; eval suites.
Why: when a gate may be skipped — driven by production signal as continuous evaluation;
accountability stays orthogonal to autonomy.

### Post-MVP scenario primitives (deferred, not enterprise)

These exist in the braindump but the WF-7-biased ramp gives them no level yet — **not
because they are enterprise/governance** (they are not L14 material), but because the
WF-7 MVP does not need them. Placed *before* Block D deliberately: they sit between the
agent-native layer and org-scale governance, not as an enterprise appendix. A
WF-6-first roadmap would bring them early. Each with the scenario that drives it:

- **Dataset + change-feed** (braindump §7) — WF-5 (data-condition trigger, org-memory
  write), WF-6 (bronze layer, downstream subscription).
- **Cross-instance read model** (§6) — WF-3 (weekly digest aggregating many instances),
  WF-6 (digest).
- **Dynamic fan-out over data-driven items** (§7) — WF-6 (newsletter → N article links).
- **Cancellation / compensation / forward recovery** (reversibility class; §18.1) —
  WF-2 (candidate withdrawal: access revoke, laptop cancel), WF-5 (let-lapse timed
  obligation). The *operational* form is scenario-driven and small-company, not
  enterprise; L14 keeps only the governance vignette (board-level approval rollback).
- **Participant registry + substitution + recurring-instance overlap policy** (§6) —
  WF-3 (sales-on-vacation fallback contributor; overlapping weekly instances:
  kill/queue/coexist). Related to but distinct from the L11 agent registry — human
  participant/substitution is not agent durable identity.
- **Cost / budget ledger** (§14) — partly value-for-self already (local-inference
  routing, §14.2); any LLM-heavy workflow.
- **Fleet / observability surface** (§6) — partial gap, not enterprise; any
  multi-instance world.

When the ramp turns toward WF-2/WF-3/WF-5/WF-6 (after the WF-7 MVP), these become named
levels — likely extensions of Block B/C rather than Block D.

### Block D — Org-scale (governance / largely enterprise, mostly deferred)

**L14 — Org-scale capabilities.**
Concepts: high-stakes approval rollback (the *governance* vignette only — operational
compensation is a scenario primitive above); MTP steering protocol (the purpose lens);
sticky labels (data-object metadata that travels); accountability shell; cross-firm
federation (signed provenance, codesigned liability).
Why: the governance and organizational-scale layer. Mostly deferred / keep-open; the
hobby project does not need it, but the invariants must be held so it can be added later
without retrofit. (Note: some L14 concepts — sticky labels, MTP — are partly
scenario-driven too; see the open question in §5 about what else may belong above.)

---

## 5. What feedback we are looking for

**Round 1 (incorporated).** A first review reordered the roadmap around real
dependencies: L0 split into L0a (kernel skeleton, now carrying the CAS/idempotency and
store-semantics invariants) and L0b (actor assignment + context-packet seed); a new
early level for child-workflow instances + internal lifecycle events as the WF-7 unlock;
grants/credentials moved before the private-mailbox gatekeeper; the wait condition and
the Ask primitive recognized as maturing in stages; "one capability per level" softened
to "one coherent capability or inseparable cluster"; and the MVP cut moved to "local
WF-7 runs" rather than "end of Block A". All of the above is now reflected in §2 and §4.

**Round 2 (incorporated).** A second review found no blocker and refined: the L6
trigger-router "feed waiting" branch is scoped to internal/timeout waits (external/fuzzy
correlation stays at L9, so L6 has no hidden L9 dependency); the non-enterprise deferred
primitives (dataset/change-feed, cross-instance read model, dynamic fan-out, cost
ledger, fleet observability) are now named in their own block rather than absorbed into
L14; L5 confirmed as not-required-now for WF-7 (the spec-deviation decision is covered
by the L3 human decision gate); and the core-model.html drift is flagged (§3). Reflected
in §3 and §4.

**Round 3 (incorporated).** A third review (no blocker) improved placement and
completeness: the deferred-primitives block moved *before* Block D and renamed
"Post-MVP scenario primitives" so it no longer reads as an enterprise appendix; two
primitives added — cancellation/compensation/forward-recovery (WF-2/WF-5, operational
form scenario-driven, governance vignette left in L14) and participant
registry/substitution/overlap policy (WF-3, distinct from the L11 agent registry).
Reflected in §4.

**Still open — most useful feedback now:**

1. **L8 seams** — L8 almost certainly splits during implementation planning. Expected
   seams: channel normalization; task inbox / outbound delivery; general Ask
   schema/addressee model. The **external-token Ask** likely splits out separately —
   security/identity-wise it is a different animal from an internal human/agent Ask
   (§15.4). Confirm the seam set.
2. **Misplaced under L14** — beyond compensation (now moved), which other L14 concepts
   are really scenario-driven and should be promoted above Block D? Candidates: sticky
   labels (the Acme case is small-company too, §18.3), MTP steering (the personal-domain
   "constitution" is non-enterprise, §18.2).
3. **Deferred-primitive leveling** — once the ramp turns past the WF-7 MVP, which
   post-MVP scenario primitives become named levels (as Block B/C extensions), in what
   order?
4. **Orphaned-child recovery** — its minimal behaviour at L4 needs pinning down during
   the core-model build (what happens to a parent whose child is deleted out-of-band):
   a modelling task, not a roadmap gap.
5. **core-model.html realignment** — rebuild the HTML to the new ramp before further
   model work (consensus yes; the next concrete step).

---

## 6. Caveats

This is a hypothesis, not a verdict. The play-through is expected to revise it:
boundaries will move, concepts will be added or dropped, and some "later" items may turn
out to be needed earlier (or vice versa). The roadmap exists to be argued with, not
followed blindly — its value is making the plan visible and reviewable before we build.
