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

**Multiple lenses per level**, so the model, rules, and configuration can be followed as
complexity grows:

- **Runtime trace** — one concrete execution: what events arrive, what the kernel does,
  step by step.
- **Protocol pseudocode** — the general rule behind the trace, including branches the
  trace does not exercise (duplicate, stale, invalid, rejected, no-op). This evolves
  level by level: if a new capability can be inserted as a small guard/branch, the core
  abstraction is holding; if the pseudocode has to be torn apart, the prior level hid a
  missing concept.
- **Domain (DDD)** — the model: entities, aggregate boundaries, relationships, and term
  corrections.
- **Invariants** — the rules that must remain true across transitions.
- **Config** — the template/definition that declares the behaviour.
- **Absent** — what is deliberately not there yet, and which level introduces it.

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

- **`core-model.html`** — the model itself, one section per level (runtime trace +
  protocol pseudocode + domain + invariants + config + absent), growing as the ramp
  proceeds. Visual, because expressiveness helps. **Status: rebuilt to the revised ramp;
  L0a done, higher levels in progress.** `approach.md` remains the source of truth for
  the roadmap; the HTML realises it level by level.
- **`approach.md`** (this file) — the method and the level roadmap, for review.
- **`design-method-playbook.md`** — how to use DDD, protocol pseudocode, ADRs, level
  contracts, and evidence gates while designing v3. It is a method guide, not a source
  of v3 product content.
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
an early run-status seed — the first-class `kernel_status` lifecycle axis +
`terminal_disposition` arrive at **L0d** (run aggregate); `EventEnvelope` (carries `op_id` and `actor_id`
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
the next actor receives) — its `TASK`, the actor-visible `instance.version`, and the
**protocol outputs this step exposes** (the step's transition keys, e.g. pass/converged —
*navigation* guidance, NOT L1 authorization); and `EventEnvelope.expected_version` as the
actor-supplied stale-intent check.
Why: a skeleton that routes but gives the agent no idea what to do is not yet usable.
L0b also **closes the loop the reactive L0a kernel leaves open** — L0a handles envelopes
but never wakes an actor; L0b's dispatch hands the next work item to the next actor.
This is the minimum guidance to act — split from L0a because the context packet is a
large concept later (§11.4) and must not slip in as an L0 afterthought; it gets its own
line so its growth is visible.
Out of scope (not L0b — stays a usable skeleton, not a mini orchestration platform):
capability check / authorization (L1), gate / policy / round logic (L2), and general
context assembly / retrieval (later). The detailed in/out scope is the L0b small-spec's
job; this line only fixes the conceptual boundary so L0b cannot absorb L1/L2.
Boundary resolved from L0a: the actor-supplied stale-intent question surfaced by the L0a
pseudocode resolves here — once the context packet hands the actor the instance version,
an envelope can carry an actor-supplied `expected_version`, and the kernel can return a
true `Stale` (distinct from L0a's purely internal CAS).
Reality check (v2): the role→actor binding and a template-level `default_actor` are
explicit v2 design (Role ←filled-by← Actor; `WorkflowTemplate.defaults`;
`roles.implementer.default_actor: codex`) — L0b adopts that pattern: template
`default_actor` → instance snapshot of the effective `actor_binding`, overridable at
start. Dispatch produces a `DispatchIntent` / context packet for a local/manual driver,
NOT durable delivery (channels / task inbox are L8). `Step.agent_config` (v2) is carried
as a reserved/pass-through field here, interpreted only at L0c.
Reality check (v11): `expected_version` is the **minimal actor-authority-snapshot seed** —
the actor's emit authority, not just a version. v11's richer snapshot (handoff_id,
execution_id, role, round, state fingerprint) comes later; it matures in stages
(role ≈ L1, round ≈ L2). Kept narrow now so it grows without over-design.

**L0c — Agent run configuration.**
Concepts: `AgentConfig` — inline run intent (mode, approach, persona/profile,
`execution_hints`) plus declared references (`model_ref` / `model_hint`,
`prompt_profile_refs` / `prompt_concern_refs`, `skill_refs`, `tool_refs`,
`tool_policy_ref` — e.g. MCP policy); effective-config resolution by cascade
(role default → step override →
start/run override), computed at dispatch and recomputed at commit for provenance —
never persisted as instance state; the context packet carries the
`effective_agent_config`; the transcript records which config the kernel issued
(provenance — issued, not proven runtime).
Why: this answers "*how* should the actor be run", distinct from L0b's "*who* acts and
what packet". It is context engineering — which kind of agent (e.g. an engineer/developer
sub-agent with specific skills/tools) performs the work. In v1 this is implicit in
instructions and merely assumed (e.g. "use sub-agent X" without guaranteeing X is
available); L0c makes it explicit and recorded. The resolution cascade is the same
pattern as ActorBinding and as model selection (§14.2) — model routing itself stays
deferred. Coherence: L0b runs L0c-free with vanilla actors (the loop still closes); L0c
is a clean layer on top — which is why it is its own level, not an L0b appendix.
Scope brake: in L0c, all `*_refs` are *declared configuration references / run intent
only* — not provisioned capabilities, not credentials, and not proof of availability.
`model_ref` means "start this run with this model", not kernel model-routing (§14.2).
Two named later layers resolve these refs: **ActorAdapter** translates run intent into
actor-runtime-specific launch / tool / model / MCP config; **ContextAssembly** (first
slice at L2b) resolves `prompt_concern_refs` (together with policy / gate / role / step /
runtime sources) into the packet's context blocks — distinct from L0b's `instruction`,
which is the step's direct task. The v3 shift here: in v1 prompt concerns are code-owned
(a new gate bakes in its prompt fragment); in v3, definitions live in a store, so
prompt/context must be definition-driven — L0c only opens the slot (the ref); it is
resolved first at L2b, not here.
Out of scope (later): tool installation / provisioning, prompt/context assembly (→ L2b),
skill-doc retrieval, memory assembly, model-routing optimization (§14.2),
credential / grant enforcement (L7).

**L0d — Instance lifecycle + activation.**
Concepts: `kernel_status` (CREATED | ACTIVE | WAITING | TERMINAL) as a second stored axis
beside `current_step`; `terminal_disposition` (done | failed | cancelled); typed
`wait { kind, requested_by, resume_events }` (only `kickoff_pending` here);
`ActivationMode` (immediate | deferred_kickoff); three input **source classes** (actor
envelope / operator intent / kernel event) behind a `RECEIVE` router; the
`runtime_context` state (none | requested | ready) and a **lifecycle guard** (actor
emits only when `ACTIVE`).
Why: v1's flat lifecycle enum conflates several concerns; v3 keeps `kernel_status`
universal and **derives** workflow phase from `current_step`/`wait` (never a second stored
truth). The v1 ideation bubble normalizes to `WAITING(kickoff_pending)` released by an
operator `KICKOFF`; `START_INSTANCE` splits into `CREATE_INSTANCE` + an activation path,
so the first dispatch leaves `activate`. L0d sits **before/under L1**: its lifecycle guard
runs ahead of L1's role/action checks, and the document is ordered to match — L0d's
pseudocode diffs against L0c, and L1 (placed last) diffs against the full L0e kernel.
Scope brake: L0d owns the generic terminal disposition paths and the lifecycle guard;
operator authority (who may START/KICKOFF/CANCEL) stays dormant (→ L7/L10); the success
finalization tail (commit/merge) is later (→ L2/L3); only `kickoff_pending` waits exist
(human → L3, child → L4, timeout → L9).

**L0e — Runtime context spec / provider contract.**
Concepts: `Template.runtime_context` = `RuntimeContextRequirement` = `none | required(spec)`
(runtime context is **optional** — a context-free planning/decision workflow declares
`none`); `RuntimeContextSpec` `{ kind, provider, config }`; the `RuntimeContextProvider`
contract (`provision(instance, request_id, spec)` → eventually fires `RUNTIME_CONTEXT_READY`);
`RuntimeContextRef` (opaque `{ kind, locator }`, provider-defined per kind); the actor-facing
**projection** of the ref into the packet's `runtime_context` (or `none` for a context-free
run). MVP concrete provider: `pairflow.worktree` (worktree + branch).
Why: the v1 worktree/branch setup is the actor's working precondition — MVP-core, *not* L8
delivery. This is the **third instance of the L0c pattern**: portable intent
(`RuntimeContextSpec`) → named fulfiller (`RuntimeContextProvider`) → packet
projection, alongside `AgentConfig`→ActorAdapter and `prompt_concern_refs`→ContextAssembly.
The kernel owns the spec + provider *contract*; provider internals are
implementation-specific; durable delivery remains L8. L0e fills in the opaque
`request_runtime_context` L0d left, exactly as L2b fills L0c's prompt refs.
Scope brake: no durable delivery (L8), no actor process launch, no credential/grant (L7),
no provider-internal mechanics modelled, provider-availability validation deferred.
Sits before L1, which builds on the full L0 kernel. **Realized in core-model.html.**

**L0f — Project/repository configuration and definition resolution.**
Concepts: a project/repository **resolution layer** (local binding only — central
registry/store governance is L11+) with two responsibilities. (1) **Definition
resolution** — select and load the workflow template(s) available in this repo
(default workflow + sources: local `.pairflow/`, later a central store). (2)
**Slot/value resolution** — supply repo-scope values for *typed, template-declared
slots* through a cascade: `template default → project global → project workflow →
target → CLI/start override`. The key addition is on the **template side**: the notion of
**typed slots/holes** — a minimal declaration (`type` + `default` + `required`), not
yet a full schema system — so repo-specific values are typed bindings, not floating
strings:

    # template side: typed slot declarations
    slots:
      validation.test_command:      { type: command, default: "pnpm test" }
      runtime.worktree.base_branch: { type: branch,  default: main }
      runtime.worktree.bootstrap:   { type: command, required: false }

    # project config: repo-local fills
    defaults:
      validation.test_command:    "pnpm test -- --runInBand"
      runtime.worktree.bootstrap: "pnpm install --frozen-lockfile && pnpm build"

(The example shows a flat global `defaults` for brevity; the full layout — global `defaults`
plus per-workflow `workflows[id].defaults` and `targets[t].defaults`, matching the
`project workflow → target` cascade tiers — is realized in core-model.html.)

The `runtime.worktree.*` slots may feed the L0e provider config: L0e defines the
runtime-context requirement and provider contract; L0f defines how repo-specific values
for that requirement can be supplied through typed slots and cascade resolution. Fields
with meaningful universal defaults may remain template defaults; repo-local values come
from the project resolution scope.
Why: v1 already has this layer (`pairflow.toml` `[validation.commands]` —
`bootstrap`/`test`/`typecheck`/`lint`, plus `--bootstrap-command`/`--test-command`
overrides). For "the v1 workflow as a v3 config" to work, the repo needs a clean home
for the parts only it knows (toolchain commands, paths, branch patterns, actor/model
defaults), kept separate from the **portable** workflow definition. This preserves the
portable-definition vs repo-local-deployment split **without** forcing every
`runtime_context` value out of the template.
Scope brake: L0f adds **no kernel behavior** — it is a binding/resolution layer that
prepares the resolved inputs `CREATE_INSTANCE` / `START` / provider provisioning
consume. No central registry/store governance (L11+), no definition PRs (L12), no
trust (L13). Typed slots stay minimal (type + default + required), not a full
schema/validation system.
Conceptually L0-family (pre-kernel project binding/resolution). **Realized in
core-model.html.**

**L1 — Capability matrix.**
Concepts: `CapabilityProfile` (matrix `role × current_step → allowed actions`); the Capability
Engine as the **role/state authorization layer** — an early check inside `HandleEnvelope`,
before the transition commits (not L0b's outbound `DispatchIntent`).
Why: internal authorization — who may emit which protocol action in which state (the v2
enforcement backbone, Level 2). L1 does **not** introduce navigation — L0b already
exposes the step's transition affordances (`available_ops`); L1 *filters/enforces* them
by role/state authorization, and can annotate a denied action with a reason. In short:
**L0b = which transitions exist from this step; L1 = which of those this actor/role may
actually use.** Not gates, not grants.

**L2 — Gate / policy.**
Concepts: `GateBinding` (a policy bound to a `(step, event_type)` transition), `GatePipeline`
(ordered gates at one point), a common `GateEvaluator` interface, and `GateDecision`
(`allow | warn | block` — warn continues but retains diagnostics/evidence, block rejects
before commit); the convergence gate; `instance.round` (kernel-maintained,
commit-derived, transcript-reconstructable); the policy-facing `gate_projection` read model.
A gate is a **fourth filter** after L1: transition exists (L0b) → role/action authorized
(L1) → **policy allows now (L2)** → commit. On `block` there is no commit, so the round is
not burned. Two **orthogonal** axes organize the space: `implementation = declarative |
packaged | process` and `execution = inline | deferred` — externality alone does not imply
async (a process gate may be a git-hook-style inline check). L2 core realizes only the
**inline** pipeline with declarative and packaged evaluators; the realized anchor is two
inline gates at one point (`declarative.threshold` over `instance.round`, then a packaged
`pairflow.previous_reviewer_verdict`). `PolicyModule` is no longer the shared name — it is
just one kind of packaged gate; `route` is known vocabulary but lands in a later routing
slice (it pulls in meta-review / human-wait lifecycle).
Why: lift the convergence decision out of the reviewer's bare judgement into an
auditable, composable policy layer. The operational core of "the workflow is the boss".
Acceptance evidence is **"the v1 gate families are representable"** (convergence policy,
reviewer-PASS policy, command gates, meta-review/human routing, doc/evidence gates), not
"min_round works". **Realized (L2 core only) in core-model.html.**

**L2a — External / process gate execution.**
Concepts: the **process gate execution model** behind `external.*` gates — a structured
`GateInvocation → GateDecision` contract over a process call, with a strict contract: bounded
timeout, structured JSON input on stdin; the output is **either** exit-code mapped (`output.mode:
exit_code`, the default) **or** a structured `GateDecision` JSON (`output.mode: gate_decision_json`,
opt-in — never an implicit "JSON wins"; the structured-output schema allowlists only `allow | warn | block`,
so a `route` or otherwise unrealized verdict is invalid until the routing slice); the exit-code path maps an
`on_exit` bucket → `allow | warn |
block` (the same
runner is a hard gate or a warning gate by config alone), and a runner-error / timeout / malformed-output
outcome mapped to `block_transition` with a **distinct audited reason**, kept separate from a business
block. Evidence (log + artifact: exit_code, duration, head_sha, git_status_hash) is persisted on every run
and its refs ride to the commit entry (or the rejection). The MVP **runs inline**: a process gate executes
in the L2 pipeline, in the `runtime_context` workspace, under the bounded timeout (the git-hook shape) —
the v1-faithful synchronous command gate (v1's runner is itself synchronous, with no timeout — the bound is
a v3 addition). The process receives a **compact inline projection** inside the GateInvocation.
Why: external/process gates are MVP-critical — v1's `validation.required` on PASS,
`meta_review_approve_required`, command exit-code gates, and repo-specific custom gates cannot
be honestly represented without them. They are split out of L2 core because the process contract is
heavier than the inline declarative/packaged pipeline; until L2a, L2 core rejects process implementations
(`gate_execution_not_supported`). Static gate-config invariants are checked at **definition load**
(the `validate_gate_config` hook, fail-at-create): a process gate on a context-free workflow
(`runtime_context_required_for_process_gate`) and a `fail_instance` disposition (`gate_config_not_supported`)
are both rejected before any run. The exact field-by-field contract (required / default / valid values /
invalid result) is canonicalized in the **Canonical Process Gate Contract** table in core-model.html — the
single source of truth the pseudocode, config, and this block all defer to. **Realized (inline only) in
core-model.html.**
Out of scope (later): **deferred process gates** (`WAITING(gate_pending)` + a `GATE_RESULT` kernel_event,
reusing the L0e provider pattern for long-running / non-blocking / evidence-producing checks) — a later
lifecycle slice, **named but not numbered**, since it touches L0d lifecycle, the process gate, and L9-ish
correlation / timeout / retry at once; the `fail_instance` runner-error disposition (reserved until terminal
failure ownership + operator recovery are modeled — currently rejected by `validate_gate_config`, as above);
the `projection_ref` + scoped-query SDK seam (replacing
the compact inline projection); actor-facing trust / skip-rerun communication (→ L2b); and dynamic module
loading (the external process interface is the extension seam, not an in-process plugin loader).

**L2b — Policy/gate context contribution (first ContextAssembly slice).**
Concepts: a template-level `context_blocks` catalog (`id → { body }`) is the single body
source; two ref sources point into it — role/step `prompt_concern_refs` (declared at L0c)
and gate/policy `context_block_refs`. The kernel resolves the issued refs and renders the
bodies into `ContextPacket.context_blocks` for the dispatched actor — **one render
mechanism, two sources**, so no L0c slot stays dangling.
The L2 / L2b boundary is **enforcement vs communication**, and it is the point of this
level. **L2 enforces** the rule: on an early `CONVERGED` the kernel/gate rejects, so the
system stays correct even if the actor ignores its context. **L2b communicates** the
rule: the reviewer sees in the packet, before acting, that it must not emit `CONVERGED`
before the allowed round, so it does not burn a round on an emit that would be rejected.
Both are needed for the MVP — enforcement makes it correct, communication makes the v1
behaviour reproducible *from configuration*: v1 baked these operating rules into prompt
prose; v3 derives them from policy/gate config and decorates the instruction the actor sees.
Render contract (canonical matrix in core-model): bodies live only in the catalog; refs
are id lists. Order is role refs → step refs → gate/policy refs, declaration order within
each — render-order, *not* precedence/override. A gate ref renders only for a transition
that passes both filters the kernel already defines: present in the step's `available_ops`
(transition existence) *and* authorized by the L1 role × `current_step` capability check
(authority). Until capability-filtered packet ops land, `available_ops` still lists all
transitions, so L2b computes the authority half from the template + `CapabilityProfile`,
not from `available_ops` alone — no blind step membership, no fresh "may legally emit"
check. A block id reached from several sources renders once, but `provenance.sources[]`
retains every emitter (role / step / gate-binding). Unresolved refs are rejected at
definition load (`validate_context_refs`, fail-at-create — the static analog of binding
coverage and `validate_gate_config`).
In scope: catalog + ref vocabulary, deterministic resolution and ordered render into
`ContextPacket.context_blocks`, the render predicate (`available_ops` ∩ L1 capability),
dedup with multi-source provenance, definition-load ref validation.
Out of scope (→ §11.4 rich context assembly): semantic retrieval, memory, skill-doc
expansion, model-specific prompt shaping, adapter-specific prompt conversion; and
computed/templated bodies — **L2b validates that referenced blocks exist, it does not prove
authored prose semantically matches the gate config** (e.g. a `value: 3 → 4` gate change
with stale "before round 3" prose is not caught; templated bodies come later).
Note: placed *after* L2 (and L2a) by the "concrete use case first" rule — the API is designed
against real `GateBinding`/`GateEvaluator`/`GateDecision` objects, not abstractly. Anchor use
case: "no `CONVERGED` before round 3". Not yet realized in core-model.html — its own
core-model view is built next from this L2/L2a-grounded contract.

**L3 — Human decision Ask.**
Concepts: a new `wait.kind = human_decision` on the L0d `WAITING` axis (not a new kernel
lifecycle enum); the `operator` role; `human_gate` step type; human **approve /
request-rework** outcomes (the approval/rework phase is a *derived* view, routing back to
`ACTIVE`). The narrowest form of the Ask primitive.
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
