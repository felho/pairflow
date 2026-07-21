# V3 Convergence — Approach and Level Roadmap

Status: draft — defines the agreed convergence method and a *proposed* level roadmap.
Date: 2026-06-13
Purpose: Capture how we run the convergence phase, and lay out the full ramp of levels
(with the concepts each introduces and why), so the plan itself can be reviewed —
including by other people or other LLMs — before we commit to it.

This document is the **method and the plan**, not the model. The model is built
incrementally in [`../model/core-model.html`](../model/core-model.html). The raw material being distilled
is [`concept-braindump.md`](concept-braindump.md) (21 sections) and the 7 fixed
scenarios in [`test-workflows.md`](test-workflows.md).

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
operator authority (who may START/KICKOFF/CANCEL) stays dormant (→ L7/L10); the post-approval resume
*actions/mechanics* — running git commit and the MERGE action (v1's `APPROVED_FOR_COMMIT → COMMITTED →
DONE`, commit before `DONE`, with the merge a *separate* post-`DONE` command) — are later, and
teardown/storage/archive are covered by the runtime-context lifecycle-close block (after L3), while the
minimal COMMIT resume *contract* lands at L3 (`RESUME_WAIT`); not a
privileged finalization phase; only `kickoff_pending` waits exist
(human → L3, child → L4, timeout → L9). `KICKOFF` is the first *specialized* WAITING resume (activation);
the generic bare-wait resume contract (`RESUME_WAIT`: resume any WAITING from a matching event → `apply_target_entry_effects`)
appears at L3, when `commit_pending` introduces the first non-activation bare wait.

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

**Run-scoped mode / variants — an L0f-family resolution extension. Realized in core-model.html as a separate `L0g`
section after LC4 (a delta on the LC3b / L0f baselines, not folded in).**
A single workflow that runs in two modes — v1's `review_artifact_type` (create-time, immutable, run-scoped;
default `code`). The v3 cut: a **start-fixed run-scoped `mode`** (values `code | doc`) that the **L0f resolution
normalizes into a pinned, mode-specific `ResolvedDefinition`** — the kernel then runs a **mode-agnostic** template.
No runtime mode-conditional, no expression DSL, no overlay/patch, no step-graph rewrite, no agent_config override.
Mechanism: a uniform `modes: [...]` membership tag on **two carriers**, resolved at start, **fail-closed** (an
unknown start mode, a tag on an unsupported surface, or a tag naming an undeclared mode is rejected, like slots).
Breadth is fenced by the *mechanism* (a membership tag), not by adding surfaces. Two surfaces (v1 reality-checked):
- **gate binding** — `gates[].modes`. A transition point may declare a `[code]` binding **and** a `[doc]` binding
  (same `uses` / different `config`, or a different `uses`); resolution keeps the mode’s. This covers both gate
  *presence* (v1: the runtime validation gate runs only in `code` — `passValidationGate.ts:407`) and mode-specific
  *policy config* (v1: doc-contract reviewer gate `docContractGates.ts`; finding-priority demotion
  `docContractReviewerGatePolicy.ts`; meta-review approve docs-only-null `metaReviewApproveValidationPolicy.ts`).
  The surviving gate’s evaluator is the consumer; the kernel passes it **no mode** — mode-specific behavior is
  already in the surviving binding’s `config` (one source of truth, no runtime mode check inside the policy).
- **context contribution** — the `modes:` tag rides a `*_refs` entry (a `prompt_concern_refs` on a role/step, a
  `context_block_refs` on a gate), **not** the catalog `context_blocks` entry (tagging the shared catalog block
  would dangle the other mode’s refs). v1: the docs-only edit guard (`documentBubbleSourceEditGuard.ts`,
  `rolePromptImplementerScope.ts`), reviewer doc-scope guidance, "runtime checks not required" (`roleActionGuidance.ts`).
**The one not-a-transition-gate piece** (why an earlier `mode_profiles` surface was dropped): v1’s doc default test
directive — `skip_full_rerun: true`, `verification_status: trusted`, "docs-only scope, runtime checks not required"
(`reviewerTestDirectiveResolver.ts:80`), plus the skip-claim-vs-runtime-refs conflict guard
(`docsOnlyRuntimeSkipGuard.ts`) — is evidence **production**, not a boolean check. It is modeled as a
`docs_only_runtime_evidence` **gate** (`[doc]`, same `implement.PASS` point as the `[code]` validation gate) whose
`allow` result produces that as **durable evidence** and records its **ref** (`GateDecision.evidence_refs` — L2/L2a; LC1 INV-3, no inline blob).
So "docs-only is an explicit gate, not gate-absence" is preserved, with a **visible consumer** — unlike a
free-floating `mode_profiles` policy-ref map, which had none (in this kernel a policy is only ever applied at a
gate). v1 does **not** condition the step graph, the model / `agent_config`, or the reviewer loop topology — the
cut excludes mode-on-steps / mode-on-agent_config (a tag there is `mode_tag_on_unsupported_surface`). Placement:
an **L0f-family resolution-layer extension**, not an L2 runtime conditional; **L2 (gates) / L2b (context)** are the
pure **consumers**. Parallel to the lifecycle-close and L4 work; does not block them. Realized in core-model.html
as a separate **`L0g`** section after LC4: the Pseudocode lens diffs against `l0f-pseudocode`, the Config lens
against `auto-action-template-config` (LC3b, the latest template), both leaving the baselines untouched, with a
forward pointer in L0f. **Invariant preserved:** docs-only evidence/review behavior is an *explicit gate/policy
binding, not inferred from gate absence*; and the kernel never passes `mode` to a gate evaluator (mode selects the
binding, behavior rides its `config`).

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
commit-derived, transcript-reconstructable; starts at 0 — a fixed convention — activation = 1,
then each advancing arrival +1). Round advancement is **declared transition semantics** in the
normalized/pinned template: the authoring sugar `round.advance_on_arrival_at` is desugared by the
loader into explicit per-transition `advances_round` flags (for committed transitions only — activation
has no incoming edge, so it is not desugared as a transition; the activate handler sets the 0 → 1), and
the kernel **never infers** it (from role names, graph shape, or target). The policy-facing
`gate_projection` read model.
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
Render contract (canonicalized as a matrix in core-model): bodies live only in the catalog; refs
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
authored prose semantically matches the gate config** (e.g. a `value: 2 → 3` gate change
with stale "before round 2" prose is not caught; templated bodies come later).
Note: placed *after* L2 (and L2a) by the "concrete use case first" rule — the API is designed
against real `GateBinding`/`GateEvaluator`/`GateDecision` objects, not abstractly. Anchor use
case: "no `CONVERGED` before round 2" (the realized L2 converge gate is `round ≥ 2`).
**Realized in core-model.html.**

**L3 — Human decision Ask (approval gate).**
Scope: the narrowest Ask — the system parks on a human *decision-maker* whose verdict chooses
a workflow route. A `human_gate` step parks the instance in `WAITING(human_decision)` (a new
`wait.kind` on the L0d WAITING axis, not a new lifecycle enum) and, as one visible transition,
records a `DECISION_REQUEST` for the bound `operator` (the declared decision keys + the decision
context + the automated `recommendation` with its `recommendation_source`). The operator's decision
is recorded as a `DECISION_MADE`. The gate's `decisions` map **IS its transition map**, keyed by
decision key — `approve | request_rework` are just this anchor's keys; the kernel knows no decision
names. **A decision carries no lifecycle meaning** — it routes via `decisions[key].target` to a
target, and one shared `apply_target_entry_effects(...)` (used by both HANDLE and
SUBMIT_DECISION, so the two entry paths never drift) decides by the *target's type*: an agent step
⇒ ACTIVE + dispatch, a `type: human_gate` ⇒ park `WAITING(human_decision)` (a decision wait), a
generic `type: wait` step ⇒ park `WAITING(step.wait.kind)` (a bare wait), a terminal step ⇒ the
existing COMPLETE rule. There is **no privileged "finalization" phase** — after approval the workflow
just has more steps. So the v1-faithful anchor is `approve → commit_pending` (a `type: wait` step:
approval waits for the operator's `COMMIT`, which does not fire on its own), but `approve` could just
as well target another gate, an agent step (even a newly-added LLM step), or `done` — the kernel never
bakes in "approve = finalize".
Foundational vs not: the *mechanism* — park `WAITING(human_decision)`, record a request, an
operator-intent resume (correlated + authorized), route by a declared decision key, append to the
transcript, enter via `apply_target_entry_effects`, and the generic override rule (chosen ≠
recommendation ⇒ `override` required) — is kernel. The *vocabulary* (`approve`, `request_rework`) and
the payload requirements (the instruction rule) are template data; the old approve-specific override
*framing* is replaced by that generic kernel rule. So the
transcript entries are decision-agnostic (`DECISION_REQUEST` / `DECISION_MADE`), reusable by an
escalation / accept-risk / choose-strategy gate. Definition-load `validate_decision_gates` keeps the
generic map honest, fail-closed at every level: `decisions` is a non-empty map, each decision entry is
a closed map `{ target, payload? }` (an unknown key — e.g. a `paylod` typo — is rejected, not silently
dropped), every `target` resolves, each `payload` is a map whose field specs are closed (`{ required:
bool }`), and `recommends` only on an edge into a gate, naming a real decision key of that gate. These
detailed shape checks are loader-owned definition validation; the kernel consumes the normalized pinned
contract and does not re-check shape at runtime.
Scope note (bare wait + its resume): L3 introduces the minimal `type: wait` shape for the post-approval
anchor (`commit_pending`) *and* the minimal resume that closes it — otherwise `commit_pending` dead-ends.
Arrival parks `WAITING(step.wait.kind)` (no actor output); `RESUME_WAIT(event)` moves forward on an event
in `wait.resume_events` via the step's `on_resume` route → `apply_target_entry_effects(target)`, guarded by idempotency +
version (like HANDLE), with an `no_resume_transition` reject. This is the **bare-wait dual** of the
`human_gate` decision wait — the missing other half of the WAITING axis. `KICKOFF` is the first
*specialized* resume (activation), `SUBMIT_DECISION` the decision resume; `RESUME_WAIT` the bare one. What
remains later: result payloads, the resume *action* (e.g. actually running git commit), child-event resume
sources (L4), and timeouts / external-or-fuzzy correlation (L9). It is *not* a special seam: enough
WAITING-kind shapes already exist that a one-off bare wait/resume would just reprise the finalization
mistake.
Required payload fields are declared **per decision** in the gate's `decisions` map: the anchor's
`request_rework` requires a non-empty `instruction` (+ optional `refs`) — the v1 `--message`,
recorded in `DECISION_MADE` and delivered to the implementer as its `handoff` (what to fix), not
loose UI text; a missing one is the generic `missing_required_field` (no hardcoded rework rule).
The stale-context cleanup is keyed on round advancement (`advances_round` — a loop-back like
rework → implement), not on a verdict name.
Input model: a human decision is *not* an actor envelope through HANDLE's ACTIVE path; it is an
operator-intent on a WAITING(human_decision) state — a sibling of KICKOFF. Guard: `wait.kind` +
request correlation + operator authority + op_id idempotency + CAS. Operator authority is
checked on this operator-intent path; the full operator authority model is later if needed (the
L1 actor gate is a different input class).
Override (the fiduciary invariant): override is meaningful **only** against a recorded
recommendation. The recommendation is the firing incoming edge's `recommends` (a build-time
*possibility* declared per edge, runtime-*selected* by which edge fired) — not a property of the
gate. The single rule: a decision **≠** the recommendation requires an explicit, recorded `override`
(`override_required`); with no recommendation, or agreeing with it, an `override` is
`override_not_applicable`. A human may decide against the machine, but it is on the record. (In the
anchor `review.CONVERGED` recommends `approve`, so the off-recommendation choice is `request_rework`;
a warn-sensitive *dynamic* recommendation is deferred.)
Boundary: no externally valid half-entered gate — the wait state and the request commit as one
visible transition, or rollback / recovery semantics are explicit.
Why: the human as decision-maker at high-stakes points — the seed of the fiduciary wedge and of
"what humans keep". Deliberately *not* a general human-interaction platform.
v1 reality check — "human" is ≥3 contracts; L3 takes only the approval gate. Absent (→ L5):
agent-initiated **ask-human / help reply** (WAITING for a human REPLY, the active agent asks,
same-context resume) and **deferred request-rework** (a rework intent arriving while parked on a
help-ask, stashed and applied by a watchdog). Absent (later): agent-to-agent ask (→ L8),
external-token ask (→ L7), multi-channel delivery (→ L8), a *dynamic* recommendation (a smarter
upstream step emitting its own) plus any open predicate language for override/routing beyond the
single *chosen ≠ recommended* rule, a timeout on a human wait (→ L9), and the post-approval resume *actions* — approve routes to ordinary later steps, not
a privileged "finalization" phase. The minimal COMMIT resume *contract* is realized at L3 (`RESUME_WAIT`:
`commit_pending` `on_resume: { COMMIT: done }`); the resume *actions/mechanics* — running git commit and
the `MERGE` resume — plus resource teardown / storage / archive concerns are later slices (`merge_pending`
is another operator `type: wait`, a perf-test a process wait). v1 order (reality-checked): `APPROVED_FOR_COMMIT → COMMITTED → DONE`, with the git
commit *before* `DONE` and the **merge a separate command *after* `DONE`**; runtime teardown + storage
scope are their own milestone block (below, after L3 / before L4): the canonical record is born durable
during the run, teardown only releases runtime resources, and archive is optional — not a preservation
step. "Finalization" stays an informal name, not a kernel step type.
Anchor: the converged result routes to a `human_approval` human_gate; `decisions: { approve: { target:
commit_pending }, request_rework: { target: implement, payload: { instruction: { required: true }, refs: {
required: false } } } }`, with `recommends: approve` on the `review.CONVERGED` edge, where `commit_pending`
is a generic `type: wait` step
(`wait: { kind: commit_pending, resume_events: [COMMIT] }`, `on_resume: { COMMIT: done }`) resumed by
`RESUME_WAIT`. **Realized in core-model.html** via a
matrix-first **Human Decision Contract** (input · wait.kind · correlation · authority ·
transcript entry · routing target · round effect · context cleanup · override · rejects), plus the
bare-wait `RESUME_WAIT` resume that closes the `commit_pending` anchor.

**Runtime-context lifecycle close — durable record + teardown.**
*Build order: after L3, before L4 — L4's child instances must already inherit a durable record and a
release-not-preservation teardown, or parent/child storage and resource release collide. Conceptually this
**completes L0e's runtime-context lifecycle** (`provision` ↔ `release`); realized here at the forcing
point, per the `RESUME_WAIT` precedent — we do **not** renumber L0e. The v1 "archive" is a placement
symptom, not a primitive — the same bias-removal as the finalization seam.*
Core invariant (the whole topic in one line): **canonical run history is written during the run, into
durable storage; teardown only releases runtime resources — teardown must never be the step that
preserves history.** Operationally and checkably: **no canonical-record ref points into a resource
being released.** Storage Scope (LC1) guarantees this by construction; Teardown (LC2) only asserts it,
fail-closed. **All four strands are now realized in core-model.html** across the two axes below: LC1 storage scope,
LC2 runtime teardown, LC3 workflow actions (LC3a operator commit/merge, LC3b auto `perf_test`), and LC4 archive/export/purge
(storage-lifecycle ops). The lifecycle-close topic is complete; what follows is the per-strand record:

**Two axes, so "cleanup" never re-conflates the strands.** Each strand is one combination of *who owns
the thing* (kernel/engine · runtime provider · workflow/author) × *the nature of the operation* (resource
teardown · workflow action · storage/archive/purge). The word "cleanup" spanned both axes and caused
drift, so it is retired as a category name. The v1 commands each span strands rather than mapping to one:
**`bubble delete` = LC2 (runtime teardown: worktree/branch/tmux/session) + LC4 (archive snapshot + per-bubble
record purge)**; **`bubble merge` = LC3a (the merge *action*) + LC2 (the same provider teardown)**
(verified — both v1 commands run identical runtime teardown; only `delete` purges the record and archives).
So `delete` is **not** LC3, and the runtime teardown both commands share is **LC2**, not "workflow cleanup".

**LC1 Durable Run Record / Storage Scope** *(cross-cutting invariant, not a step — first-class milestone).*
**Realized in core-model.html** (section `LC1`, after L3) — matrix-first, the **Canonical Home Table** as
the central artifact, plus five invariants INV-1..INV-5 and three checkable predicates
(`evidence_ref_ok` / `projection_authoritative` / `release_safe`). Two review refinements baked in: the
v1 grounding does **not** overclaim (the v1 bubble dir is workspace-separated but still delete-sensitive,
*not* a born-durable T1 authority — which is why archive currently preserves history), and
snapshot-authority is narrowed to a **sealed projection snapshot anchored to its T1 source
range/version** (never a rival truth). The lone new runtime-affecting rule is the evidence-ref discipline
(INV-3); `release_safe` (INV-5) is the handle LC2 asserts.
Capability: one canonical run record — the append-only history/event log — is authored to durable
storage during the run (instance/template/project refs, lifecycle events, transcript/envelopes,
decisions, gate outcomes, timings, actor/role metadata, terminal disposition, evidence **refs**). The
current-state projection **may** be materialized for cheap reads, but is authoritative only when
reconstructable/consistent from the record or under an explicit snapshot-authority rule — the runtime
workspace is never the *only* truth. Evidence: the outcome/metadata is inline in the record; large
blobs (test log, diff snapshot, report) live in a durable evidence store referenced by a durable ref —
never the workspace's implicit contents.
Why first: it is the boundary that keeps teardown and archive from re-entangling; LC2 can only assert an
invariant LC1 establishes. Depends: L0a (transcript = the canonical log), L2 (gate evidence), L0e (where
it runs vs where truth lives). Not in scope: release mechanics (LC2), optional archive/export (LC4).
Note: v3 already treats transcript/instance as durable abstract stores, so this is mostly *making the
boundary explicit* + the evidence-ref rule — not a rewrite.

**LC2 Runtime Resource Teardown / Provider Close** *(capability slice — L0e's `release` mirror).*
**Realized in core-model.html** (section `LC2`, after `LC1`) — matrix-first, the **Runtime Resource Lifecycle
Contract** as the central artifact (provision recap + release initiate / complete / failed / initiation-failed /
context-free rows), diffed against L3. Review refinements baked in: (1) under `release.policy: required` the
obligation is **tracked through failure until discharged, and never dropped silently** — *not* "eventually
released" (auto-retry/timeout/watchdog is L9); `retained` / `external` carry **no** obligation (explicit
ownership); (2) a failed release lands in a new **`release_failed(ref)`** state — a retriable release handle,
*not* a usable runtime (partial release lands here, not back in `ready`); (3) the durable in-flight marker
**`releasing(req, ref)`** (carrying the ref) is written **before** dispatch, and **every** `initiate_release`
state write is a **CAS single-winner** (`COMMIT atomically at expected_version`, `REQUIRE ready(ref)`) — the
marker *and* the two pre-dispatch failure transitions alike — so concurrent boundary hooks on the same
`ready(ref)` race, exactly one wins, the rest no-op; a dispatch error is a follow-up versioned commit guarded by
`REQUIRE releasing(req, ref)`; (4) release initiation is a **post-commit** boundary hook (never inside another transition's
commit); (5) the boundary is **not** a kernel default — the template declares a **release policy**
(`release: { policy: required, boundaries: [...] }`); a **teardown-managed** provider (worktree) MUST declare it
(`validate_release_policy` → `Rejected(release_policy_undeclared)` / `release_boundaries_empty` /
`release_boundaries_not_allowed` for non-empty boundaries under retained/external), keyed on the
provider, *not* on `runtime_context: required` (preserving the retained / external space). The terminal transition
only **emits** a `terminal` event; `release.boundaries` decides if it is a boundary. The anchor declares
`release: { policy: required, boundaries: [terminal] }` (the earlier "zero new author config / terminal default"
claim was itself the bias, now retracted). `Committed` stays a kernel-outcome term (a namespace note disambiguates
it from the workflow `COMMIT` event and a later git-commit LC3a action — no rename). Release is orthogonal to
lifecycle.
Capability: under `release.policy: required` the kernel tracks a release obligation for a `ready`
runtime_context, discharged at a **declared release boundary** (`release.boundaries`) — terminal is **not** a
kernel default, only a boundary if the template lists it; it is deferred past any workflow-owned post-completion
action that still needs the resource (v1: the worktree/branch survive `DONE` for the separate post-`DONE` merge
command, and are released *there*).
Reached by either flow — verified: both v1 `merge` and `delete` run the **identical** runtime teardown,
so release is reached by either path — a `merge_completed` declared boundary or a `delete` LC4 `force_release` (delete is **not** a declared boundary). On release — whichever path reaches it — the provider releases what
it provisioned (worktree, temporary branch, tmux/runtime session, remote clone) plus engine support data
(runtime-session registry entry, watchdog markers, locks), with explicit result/evidence/failure policy.
This is the resource-teardown axis owned by the runtime provider — **not** "workflow cleanup" (LC3 is a
different axis): worktree/branch/tmux are the runtime_context the provider provisioned, so releasing them
is its `release` mirror, not an author-chosen step. The kernel guarantees the obligation is
**tracked through failure until discharged, and never dropped silently** (eventual liveness — auto-retry/timeout/
watchdog — is the L9 slice); it does not hardcode terminal as the release instant. Precondition (the teeth):
durable-record closure complete — no canonical ref points into the resource being released (guaranteed
by LC1, asserted here fail-closed); **not** "everything archived". Ordering: LC2 release of a resource
follows any LC3a post-completion action that consumes it (e.g. release the worktree *after* the merge that
needs it). Why (LC1 then LC2): closes the current dangling provision — the model provisions a worktree
(L0d/e) and never releases it. Depends: LC1 (so release is pure), L3 terminal lifecycle (the earliest
boundary), L0e (provision). Not in scope: workflow actions (LC3), archive/purge (LC4). L4-orthogonal: a
child is just another runtime_context the same contract releases; L4 multiplies the count, not the
contract.

**LC3 Workflow Actions** *(author-owned axis — `type: action` steps the workflow chooses; split by maturity.
Renamed from "Workflow Post-Actions": "post" was first-anchor bias — an action can run anywhere in the graph,
not only at the end.)*
Capability (the axis): a `type: action` step is the **automated sibling of `human_gate`** — a declared
operation runs (via a runner), produces a structured **outcome**, and the outcome **selects a route** from an
`outcomes` map. Same de-vocabularized keyed routing map as a `human_gate`'s `decisions` (kernel knows no key
meanings), same `apply_target_entry_effects`; only the *selector* differs — a human picks (`SUBMIT_DECISION`)
vs a runner's result picks (`RUN_ACTION`). **Action vs gate:** a gate (L2) *filters* an already-chosen
transition (`allow|warn|block`); an action *produces* the key that *selects* the transition. Distinct from LC2's
provider resource teardown and LC4's storage/archive/purge.

> **LC3a Workflow Actions — commit / merge (operator-triggered).** **Realized in core-model.html** (section
> `LC3a`, after LC2, diffed against LC2). The first cut: `trigger: operator_intent`, anchored on COMMIT + MERGE.
> A `type: action` step parks `WAITING(action_pending)` with an `ActionRequest` (the decision-less
> `HumanDecisionRequest` analog); the operator's `RUN_ACTION` (trigger `{ instance_id, op_id, expected_version,
> action_key, payload, by }`) is version-checked (`Stale`) + op_id-idempotent (`Duplicate`), validates the
> **payload** only (commit message policy — `missing_required_field`, the `human_gate` analog), then — **marker-first,
> single-winner, like LC2 release** — CAS-claims `action_pending → action_running` before running the runner (so two
> concurrent triggers never both reach the git-mutating runner), and the classified `outcome_key` routes via
> `outcomes` (a self-target = re-park + retry; `infra_error` / undeclared = re-park + audit, never a post-side-effect reject).
> Workspace reality (nothing staged, merge conflict) is an **action business_failure** outcome, not a trigger
> reject; a crashed runner is `infra_error`. An outcome may `emits:` a release boundary — `merged ⇒
> merge_completed` → LC2 releases the worktree (the LC2 deferral, now realized; the anchor's `release.boundaries`
> moves `[terminal] → [merge_completed]`). Evidence: `ACTION_RESULT` (sha/exit/hash inline T1, logs T3 — LC1
> INV-3). v1 grounding: commit/merge commands RUN git in the workspace, conflict → abort + retry, distinct
> business-vs-infra reason codes. **v3 semantic shift (stated):** the anchor puts workflow-`done` *after*
> merge (merge is a normal pre-terminal action step); v1's `DONE` was commit-complete with merge a separate
> post-`DONE` command — accepted to avoid a post-terminal action shape.

> **LC3b Auto Workflow Actions.** **Realized in core-model.html** (section `LC3b`, after LC3a, diffed against LC3a).
> The `auto` trigger: an action runs **on arrival** (no operator), still **marker-first** — the arrival commit
> claims `WAITING(action_running)` + `ACTION_RUNNING`, then an `ActionIntent` (produce-not-perform, the
> `DispatchIntent` analog) is delivered **post-commit**, the runner runs, and the result returns as an
> `ACTION_RESULT` **kernel-event** (correlated by `request_id`, the `RUNTIME_CONTEXT_READY` sibling; inline ⇒
> immediate, deferred ⇒ later — same contract). Outcome-routing: `pass → human_approval` (the L3 `recommends`
> moves onto `perf_test.pass`, the edge that now enters the gate), `regression → implement` + instruction (the
> automated `request_rework`). **Bounded retry**, opt-in per outcome that declares `retry { max_attempts,
> on_exhausted }`: re-claims within an **episode** (attempt = transcript `ACTION_RUNNING` count for the
> `episode_ref`, reconstructable — a fresh arrival opens a new episode), exhausted ⇒ escalate. Anchor: a
> `perf_test` between converge and the human gate (an action can be anywhere, not a "post" phase). v1 grounding:
> auto-run-and-route exists inline (`passValidationGate` *filters*, `auto_rework` *routes* + bounded
> `auto_rework_count/limit`); async delivery is the greenfield generalization. **Out** (thin / later): the
> deferred async driver + timeout (L9), unbounded retry / watchdog (L9), **pure computed-routing** (verdict +
> counter with no runner — v1 `auto_rework`'s process-less half, a routing-policy concern), a rich
> outcome-predicate DSL, a packaged action library (publish/notify are examples).

Depends: L3 (the de-vocabularized routing + `apply_target_entry_effects`, the wait machinery), L2a (the
process-runner family), LC2 (the release boundary an action outcome emits).

**LC4 Archive / Export / Purge** *(storage-lifecycle ops — not correctness).*
**Realized in core-model.html** (section `LC4`, after LC3b) — matrix-first (operation · operator intent · allowed
state · lifecycle · release interaction · storage effect · surviving audit · idempotency · rejects · v1 map),
a **standalone ops contract** like LC1. Three independent axes: **delete-intent · release (LC2) · storage**.
The v3 home of the *other* half of v1 `bubble delete` (the archive + per-bubble **record purge**; the
runtime-teardown half is LC2). Settled with two review refinements:
- **The destructive precondition is on the purge commit, not the delete intent.** `DELETE_REQUESTED` (a
  `CANCEL`-sibling operator intent, **not** a workflow action) is accepted on a live run (with `force`) and
  drives **cancel → LC2 release → purge**; the irreversible `hard_purge` runs **only** when **terminal &&
  release discharged** (else deferred). The delete chain releases via `force_release` — LC2's machinery minus the
  declared-boundary gate (`release_safe` still holds), not a declared boundary.
- **Purge is closure-scoped and crash-safe.** It removes the full T1 run record + the run's closure-owned T3
  blobs (MVP: run-owned), write-ahead the `run_index` tombstone (carrying the closure manifest) first — the surviving **T1-family** idempotency
  authority and re-drive source (`purged` is not an instance axis). Per-operation / per-state / ordering authority lives in the
  core-model LC4 tables (Operation Contract · State Authority · Hard-Purge Ordering).
Under LC1 the purge is *safe by construction* — durable + ref-disciplined evidence (INV-3) ⇒ complete with **no
dangling refs** (the v1 evidence-loss bug is impossible). **Not** the preservation path: audit / metrics / eval
compute from the durable record (or the surviving **global metrics stream**); archive/export is an optional cold
copy (read-only w.r.t. the run record/runtime, writes a `run_index` catalog entry), never read back. No author config (operator/ops commands). Out (later/ops): retention / auto-purge / TTL / GC, an
archive query CLI, restore/re-hydration, a shared/dedup blob store, export formats, federation purge (L11+).
Ops/tooling, ~L8 area. Depends: LC1 (makes archive optional + purge safe), LC2 (release before purge), L3 (CANCEL
sibling). **This closes the lifecycle-close topic (LC1–LC4).**

Cross-ref: the **wait/resume contract** these build on is already realized at L3 (`RESUME_WAIT`); later
resource/action slices reuse it.

**L4 — Child workflow instances + internal lifecycle events. Realized in core-model.html (L4 section after L0g).**
Concepts: `ChildWorkflowLink`; parent waits on a child lifecycle event; **kernel-emitted
lifecycle events as an internal channel**; orphaned-child recovery. This is the
deterministic-internal form of the wait condition (correlated by child id).
Why: a child is a *full first-class instance* with its own lifecycle — not the embedded
subflow of L5. This is the WF-7 unlock and it must come early, before the full
distributed stack: it needs only internal events, not external channels or correlation.
Note the coherence bonus: "internal lifecycle events as a channel" is the smallest form
of the channel abstraction, prefiguring external channels (L8).
Realized as five kernel primitives (the rest is parent-template authoring): a `type: child_workflow`
step; the canonical `ChildWorkflowLink` (parent record) + a `parent_ref` back-link on the child;
`WAITING(child_event)`; the `CHILD_LIFECYCLE` internal kernel event (a child's subscribable lifecycle
transition commit, delivered to the parent — the `RUNTIME_CONTEXT_RELEASED` / `ACTION_RESULT` sibling);
and a load-bearing `child_key` for idempotent spawn (≤1 active link per parent+step+child_key). Spawn is
produce-not-perform (`SpawnIntent`), with the child's id written back into the link by a correlated, CAS'd `CHILD_SPAWNED` event (the `RUNTIME_CONTEXT_READY` analog); resume reuses `arrive()`. The mechanism is transition-based but the
MVP anchor subscribes only **terminal** lifecycles (`done | failed | cancelled`); `wait_for` keys are
`lifecycle → route config`, and `validate_child_steps` requires a route for **every** terminal disposition
(fail-closed, so no terminal is ever unhandled). A spawn that cannot start (a child `CREATE_INSTANCE` rejected
past load — a static / typo'd `template_ref` is caught at load) is delivered as `CHILD_SPAWN_FAILED` (the LC2
initiation-failure analog) and routes through the required `failed` path; a transient spawn-dispatch crash leaves
the link durably `spawning` → L9. Round is instance-local. Config anchor = a new `plan-exec-v0` parent template
(the task list is the plan **document**, not kernel state). Absent (→ later / L9 / L8): fan-out / fan-in,
intermediate-lifecycle subscription (`ready_for_human_approval`), lost-event reconciliation, and the
durable / external channel. v1 reality check (Explore): `plan watch` is external polling (read each child's
`state.json` ~60s) with no event / join / reverse link; L4 replaces it with a first-class link + channel.

> **MVP cut — build until local WF-7 runs:** parent plan workflow, child bubble
> workflow, internal lifecycle events, human approval/rework gates, no polling. This
> validates the most important self-value without private-mailbox federation, fuzzy
> correlation, Slack/email channels, or the dataset layer.

**Kernel-primitives rebaseline (P1–P5) — a pass over Block A, not a new level. COMPLETE
(waves 1–5, all ratified); the named debt — the dedicated F-W1-2 ingress/idempotency
hardening touch (operator op_id + the F-W4-1 guards + the RUN_ACTION reject-name
decision) — landed 2026-07-06, discharging the strand fully.**
Source: [`topics/_open-kernel-primitives.md`](topics/_open-kernel-primitives.md)
(decided + ratified; the L5 paper test passed — L5-core reduces to six declarations).
Two independent re-reads of the finished L0a–L4 kernel converged on the same finding:
the pseudocode repeats five shapes under different names. The rebaseline names them as
contracts and re-expresses the kernel on them — **in place, at the level where each
primitive's second instance historically appeared**, so the ramp itself demonstrates the
dissolution and earlier levels stay untouched (the `arrive()` precedent from L3, applied
four more times).
Concepts: **Errand** (P1 — claim → post-commit directive → correlated completion; four
declared forms); **ChoicePoint** (P2 — the guarded keyed selection behind all five
routing maps); **Admission** (P3 — the one ordered guard ladder; steps are *rungs*);
**Warrant** (P4 — the inbound act-from bundle: operation identity · context authority ·
errand correlation); **Directive** (P5 — the outbound ask family; the existing
`*Intent` nouns become members).
Waves (each = its own small-spec + review round + commit; flips recorded here):
- [x] Wave 1 — L0d: **Admission** born (the second entry path arrives there); the entry
  guard heads re-expressed; downstream `HANDLE`-family versions follow. *(Realized:
  `admit_loaded` + the canonical rung order at L0d; heads re-expressed at
  L0d/L0e/L1/L2/L2a/L3/LC2; the L3-born operator ops deliberately wait for wave 4;
  findings F-W1-1/2 in the memo §9.)*
- [x] Wave 2 — L1: **Warrant** born (`expected_role` joins `expected_version`). *(Realized:
  the `Warrant` contract (three field classes, ramp-neutral correlation naming) + the ladder
  re-printed with its authority rung at L1; the role rungs fold into the expect bundle at the
  four HANDLE heads (L1/L2/L2a/L3, ten rendered blocks via inheritance); the `step` lookup
  hoisted as an infallible positional read; finding F-W2-1 in the memo §9.)*
- [x] Wave 3 — LC2: **Errand** born (release joins provision); LC3a/b, LC4, L4
  re-expressed as errand instances. *(Realized: the `errand` declaration at LC2 — a named
  contract + phase labels, no mechanical reorganization; the claim phase opens at the marker
  commit (guards are pre-open); LC3a labeled as the two chained instances, LC3b as full-form,
  LC4 as the force-opened release (hard_purge deliberately NOT an errand), L4 as spawn (full)
  + child await (open-door); the routing phase stays unlabeled until P2's birth (wave 4);
  finding F-W3-1 in the memo §9.)*
- [x] Wave 4 — L3: **ChoicePoint + Directive** born (`decisions` joins `transitions`;
  `HumanDecisionRequest` joins `DispatchIntent`); the entry handlers become instances.
  *(Realized: `choice_point` + `directive` + `admit_input` declared at L3; the two operator
  heads fold into `admit_input` (RESUME_WAIT without an authority rung); the map lookups and
  directive builders labeled corpus-wide; the wave-3 routing retro-touch done; RUN_ACTION /
  DELETE_REQUESTED kept conservative (F-W4-1); the one deliberate behavior delta — the
  operator paths' `missing_version` canonicalization — is F-W4-2; both in the memo §9.)*
- [x] Wave 5 — closing sweep: LC3a→L4 fully instance-form; the memo's §3
  reclassification realized; the §8 findings folded in (the P1 opener dimension, the
  P2 stay route, marker-home carrying blocking/non-blocking); the F-W4-3 one-line fix
  (pre-declared +1 multiset delta). NOT in scope (ratified F-W4-1 decision): the missing
  ingress guards — they go to the dedicated F-W1-2 ingress-idempotency touch. *(Realized:
  the two override-chain gaps patched (apply_target_entry_effects / post_commit_output
  tags); F1 booked as realized-in-finer-grain at wave 3; the stay route drew its boundary
  against the live self-target; F3 folded with the permits-non-blocking precision; the
  memo's §6.4 gate chain closed and §3 marked REALIZED; the memo §9 wave-5 record.)*
Safety rails: **behavior does not change** — templates, traces, and the
rejection/invariant sets are invariants of the pass (the derived registries are diffed
as semantic checksums at every wave; rung-order divergences against todo A1/C2/E2 + the
handlers' code order are findings, never silent fixes); the source↔render golden check
stays green throughout. Forward rule: a future primitive is named at its own second
instance.

**Implementation contract.** [`implementation-contract.md`](implementation-contract.md)
holds the binding constraints the Block A implementation must satisfy (extracted from the
`core-model-todo.md` review, 2026-07-06): idempotency enforcement, egress/confirmed-effect
rules, the op_id edge contract, leaderless mechanics, decision-audit mechanics, and the
kernel-shape non-goals. Process rule: it is the implementation plan's MANDATORY first
chapter — every `IC-*` item maps to an acceptance test, a schema/lint/CI check, or an ADR.

**Implementation process.** [`../implementation/README.md`](../implementation/README.md)
(ratified 2026-07-07) defines HOW the implementation plane runs: the plan written chapter
by chapter (chapter 1 = the IC/PI intake tables), the per-step build loop, and the
execution model on Pairflow v1 (two-layer task packets over ledger projection, the
constraint-transformation discipline, coverage accounting, the autonomy ramp, and the
model↔code divergence stop). Implementation ADRs live there too (playbook §8 activation).

**V1 operability scope.** [`topics/_closed-v1-operability.md`](topics/_closed-v1-operability.md)
(settled 2026-07-07) binds four scope/contract decisions the implementation plan inherits:
the CLI-first read-only visibility floor (incl. live tail) ships WITH Block A; a test-kit
chapter (scripted actor, fake egress, fixtures) as a peer of the IC chapter; the injected
time source as an IC-style contract line; and the ledger as the model↔code contract surface
(three drift-tested name-spaces, chapter traces as golden tests, invariant post-condition
suite). Its ratified external-review addendum adds the debug bundle (one-run structured
diagnostic export) and the operator CLI's command+dev verbs to the same milestone;
its Addendum 2 (third review, ratified) landed the Q2/Q3 lines as binding IC-D/IC-E,
resolved `getTimeline` to committed-rows-only with a named non-authoritative diagnostic
channel, and realized the domain-registry lift (ledger §4, todo T1). It also reserves the
implementation plan's practical chapters (template file format, bootstrap, storage pick +
migration stance, runner MVP scope, operator recourse card, kernel diagnostics &
structured logging). The full plan-facing payload is mirrored as the `PI-*` plan-intake
checklist at the end of [`implementation-contract.md`](implementation-contract.md), so
the plan's mandatory first chapter cannot miss it.

**L5 — Help subflow (agent-initiated Ask).**
Concepts: `Subflow` (blocking / non-blocking); `HELP_PENDING`; the agent-initiated form
of the Ask primitive (still local delivery). The primitives rebaseline (above) precedes
it: L5 is then a handful of declarations over the contracts (the memo's §8 paper test).
Why: the agent can ask for help/a decision mid-step. Completes the local pairflow-v1
feature set; not required by the WF-7 MVP, so it sits just after the cut. (Block A ≈
full local v1 once this lands.)
**Realized (2026-07-06):** landed as the §8 paper test's six declarations, exactly —
`step.help` (opt-in, validated at create), `help_pending` + the durable `HELP_REQUEST`
fact, the `HelpRequest` Directive member, the `HELP_REPLY` completion on the hardened
ingress, the stay route's first live instance, and the blocking variant (non-blocking
declared + Absent). Checksum growth exactly as pre-declared (absent +6, invariants +6,
rejections +3); the mirror check clean. Findings F-L5-1 (help emits not gated — scope
choice) and F-L5-2 (§8's "P2 key" cell vs the landed op-family branch) in the memo §9.
Block A = the full local pairflow-v1 feature set is now modeled.

**EC — Emit contract + verify gates (todo Parts E/F + the A1 digest).**
Concepts: per-op `EmitContract` (payload schemas on transition edges + op-family
declarations, ONE lookup for the validator, the digest, and the packet projection); the
versioned `vocabularies:` catalog; the gate `family: policy | verify` dimension with a
mandatory verify `currency_binding` (no stale-green); `payload_digest` + the idempotency
rung's digest branch (`op_id_collision`); `offerable_ops` (the offer CALLS `capability` —
the L5-named seam closed). Why: the last v1-parity gap — v1 machine-validates emit payloads
(`pass.ts`/`converged.ts`) and runs verify gates; the model now carries that contract
machine, de-vocabularized.
**Realized (2026-07-07):** landed as the emit-contract memo's 11 paper-test declarations
with both review rounds folded (the help branch under the generic validator; the
same-function offer; four precisely-scoped new rejection names — registry 81→85; the
digest's ordering-necessity definition). Inventories grew exactly as pre-declared (absent
134→140, invariants 110→116); the mirror check clean. Two ratified behavior deltas: the
digest delta (actor-emit path) and the offer delta. E6 (claim model) + E1's extended fields
stay open as named Absents. Findings log: the emit-contract memo §4.

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
Scope note: the load-bearing requirement is the private-data contribution boundary,
not full kernel federation. Personal<->org kernel federation remains a keep-open
topology for separate authority domains; the near-term L10 shape may be a central
org kernel plus gatekeeper boundary. See
[`topics/_open-private-data-boundary-vs-federation.md`](topics/_open-private-data-boundary-vs-federation.md).

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
  *Promoted evidence (2026-07-06): now a named future-topic item
  ([`../model/core-model-future-topic.md`](../model/core-model-future-topic.md) L4 #12), with the BitSafe
  workflow simulation's GAP-3 (meeting → N action items; queue → N workers) as its
  real-world witness.*
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

1. **L8 seams — RESOLVED (2026-07-06).** The seam set is confirmed and recorded in
   [`../model/core-model-future-topic.md`](../model/core-model-future-topic.md) L8 §6 (channel
   normalization; task inbox / outbound delivery; general Ask schema/addressee model;
   external-token Ask split toward L7/L10), refined by the nanoclaw study and
   stress-tested by the BitSafe workflow simulation (whose event-driven workloads
   leaned on L8 §§1–4 and found them well-aimed as written).
2. **Misplaced under L14** — beyond compensation (now moved), which other L14 concepts
   are really scenario-driven and should be promoted above Block D? Candidates: sticky
   labels (the Acme case is small-company too, §18.3), MTP steering (the personal-domain
   "constitution" is non-enterprise, §18.2).
3. **Deferred-primitive leveling** — once the ramp turns past the WF-7 MVP, which
   post-MVP scenario primitives become named levels (as Block B/C extensions), in what
   order? *(Progress note, 2026-07-06: the BitSafe workflow simulation effectively
   prioritized inside Block B — the load-bearing set for a real fleet is L6 + L8 + L9
   plus the creation-identity decision; L7/L10 were almost never load-bearing. And the
   "dynamic fan-out" deferred primitive below got promoted evidence: it is now
   future-topic L4 #12, with GAP-3 of the simulation as its concrete witness.)*
4. **Orphaned-child recovery** — its minimal behaviour at L4 needs pinning down during
   the core-model build (what happens to a parent whose child is deleted out-of-band):
   a modelling task, not a roadmap gap.
5. **core-model.html realignment — DONE.** The HTML was rebuilt to the revised ramp and
   has since carried Block A to completion (L0a–L5 + LC1–4 + L0g + the primitives
   rebaseline), with the source/render split and golden checks guarding it.

---

## 6. Caveats

This is a hypothesis, not a verdict. The play-through is expected to revise it:
boundaries will move, concepts will be added or dropped, and some "later" items may turn
out to be needed earlier (or vice versa). The roadmap exists to be argued with, not
followed blindly — its value is making the plan visible and reviewable before we build.
