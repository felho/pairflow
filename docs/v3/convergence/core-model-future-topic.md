# Core Model Future Topics

Deferred design topics discovered while reading the research synthesis against
`core-model.html`. These are not immediate `core-model-todo.md` items unless a
later slice pulls the topic into the active model contract.

## Grouping rule

Topics are grouped by their primary `approach.md` owner: the earliest level that
would have to introduce or enforce the mechanism. If a topic is discovered while
reading an earlier level but is actually owned by a later level, keep it under
the later owner and mention the earlier origin. If no single roadmap level owns
the mechanism, put it under **Cross-level seams** and name the levels it cuts
across.

## Block A — Local core

### L0a — Durable kernel edge cases

Source: the §10 second-pass addenda. The current L0a model and
`core-model-todo.md` Parts A/B already capture the active kernel contract:
commit-based state, CAS, idempotency, and record-not-replay. The following are
future precision edges for effect boundaries and dispatch handoff design.

#### 1. Exactly-once orchestration is not exactly-once effect

Step memoization or operation-output dedup can make orchestration replay-safe,
but it does not by itself make an external side effect exactly-once.

- Claim exactly-once effect only when the side effect and its checkpoint can
  co-commit in one transactional boundary owned by the effect provider or
  datasource.
- Otherwise describe the contract as exactly-once orchestration with
  at-least-once effect issuance, protected by idempotency keys and recovery
  markers.
- Tests and specs should name which idempotency key layer they exercise:
  whole-run, step, queue/message delivery, or provider effect.
- This sharpens Part B's record-not-replay language without changing the core
  model's current hot path.

#### 2. Claim-to-dispatch must leave no orphaned work

An `available -> claimed` transition is not complete if the work can be left
claimed but undispatched with no recoverable handoff.

- A claim path should either dispatch in the same local control path before
  returning, persist a recoverable transfer/handoff record, or roll the claim
  back / mark it retryable.
- Avoid "claim many, dispatch later" shapes unless the later dispatch is itself
  durable and recoverable.
- If post-claim dispatch fails, the failure should be visible as scheduler or
  transfer state, not as a silent success.
- This complements L6 scheduler idempotency and Part A's ledger discipline: a
  claimed unit needs a durable next owner or a durable way back to readiness.

### L0b — Actor binding + context packet

Source: the §4 L0b matrix row and its later addenda (§8, §9, §10). The current
L0b model is acceptable as the minimal actor-binding baseline: it resolves the
next actor, derives a `DispatchIntent`, and gives the actor a small
`ContextPacket`. The following points should be kept as future design topics,
not folded into L0b prematurely.

#### 1. Rich context packets should be handles, not pasted history

The research repeatedly warns against treating context as a large copied prompt
blob. The future context assembly model should produce durable, mechanically
derived context artifacts or handles, then project those handles into the actor
packet.

- The packet should identify the context the actor is supposed to use, not embed
  an unbounded rendered history.
- Rich assembly should be deterministic enough to audit and cache: stable order,
  explicit artifact refs, and clear provenance.
- L0b can stay minimal for now (`handoff` as the previous payload). The richer
  assembly belongs with the later context-packet / L2b / channel-handoff work.

#### 2. The authority snapshot matures beyond `expected_version`

`expected_version` is the smallest authority snapshot: it proves which committed
state the actor acted from. Later slices will need the richer authority tuple
seen in v1-style emits.

- Universal kernel fields include `instance_id`, `op_id`, `expected_version`,
  and an issued execution/context token.
- Shape-derived fields may include `expected_role`, `expected_round`,
  `handoff_id`, and `state_fingerprint`.
- This is kernel-owned protocol, not template configuration. A template may
  describe available operations and payload shape, but it must not decide
  whether core authority guards apply.
- `core-model-todo.md` Part E already captures this as an ingress-contract
  clarification; keep this future topic as the place to revisit the full
  context/emit protocol shape.

#### 3. Distinguish blocking authority from advisory authority

Some roles or actors may provide advice, while others may block or authorize a
transition. The current L0b actor binding only answers "who acts next"; it should
not absorb the whole authority model.

- Future role/capability policy should distinguish advisory outputs from
  blocking or routing authority.
- This likely cuts across L1 capability authorization, L2 policy gates, and L3
  audited decisions rather than living purely in L0b.
- Do not rely on prompt prose to decide whether a role is blocking. If the
  distinction matters, make it a schema/configured policy fact that the kernel
  or gate pipeline enforces.

### L0c — Agent run configuration + ActorAdapter seam

Source: the §4 L0c matrix row and later adapter/memory addenda. The current L0c
model is acceptable as the baseline: `AgentConfig` is an immutable portable run
intent, deterministically resolved into the packet, and recorded as
`issued_agent_config` provenance. The future work is not to make L0c heavier,
but to define the downstream adapter/session contracts that fulfill that intent.

#### 1. ActorAdapter schema and conformance tests

`AgentConfig` should map through an adapter contract, not scattered
provider-specific branches. The adapter layer needs one generated/shared schema
for supported launch, context, model, tool, MCP, hook, and skill-routing
capabilities.

- The schema should be machine-readable and shared by runtime code, tests, UI,
  and documentation.
- Adapter implementations need golden compatibility / conformance tests,
  including event-order regressions such as session-start context injection,
  hook message shape, and skill-routing order.
- This is L0c-originated because the run intent points at it, but it also
  cross-references L10/federation-style capability schemas.

#### 2. Portable session handoff must not depend on provider-local state

The run intent may say which kind of actor should run, but resume/migration must
not be anchored to the actor provider's local disk session. If later levels need
session continuity, it should be represented as host/kernel-owned portable
session bytes or handles.

- A provider-local conversation directory is an implementation detail, not a
  durable workflow identity.
- A moved or retried run should be able to reacquire a sandbox/session authority
  without assuming the original agent process or local session still exists.
- This ties into the cross-level Identity / Sandbox / Session seam below.

#### 3. Runtime attestation stays separate from issued config

L0c records what the kernel issued, not proof that the external actor runtime
actually used it. A later executor/adapter attestation contract may prove which
model/tool/context configuration was actually applied.

- `issued_agent_config` is provenance, not a runtime receipt.
- Attestation belongs to the executor/adapter layer, not to L0c's deterministic
  resolver.
- The transcript should keep the distinction explicit so evaluation and
  debugging do not confuse intended configuration with proven runtime behavior.

### L0d — Instance lifecycle + activation

Source: the §4 L0d matrix row and later recovery addenda (§8, §10). The current
L0d model is acceptable as the baseline: two-axis lifecycle state, typed
`WAITING`, source-routed inputs, lifecycle guard, CAS commit discipline, and a
single terminal disposition. The future edge is recovery semantics after the
baseline can already say "this instance failed".

#### 1. Typed recovery reasons, not one `failed` bucket

`TERMINAL(failed)` is too coarse to drive safe recovery. Later recovery design
should store a typed reason that selects a per-operation-class policy, not a
single global retry or mark-failed rule.

- Candidate reason families include process loss, zombie worker, stale lock,
  transient upstream failure, max-turn exhaustion, intentional pause,
  success-without-disposition, and hard abort.
- Each reason may imply a different action: restart in place, retry the
  operation, fast-forward from durable evidence, pause for human review,
  terminalize, or refuse automatic recovery.
- Cooperative cancellation is not a hard abort. If the kernel needs to stop
  work definitively, it needs a durable abort path and observable completion
  state.
- This extends L0d's `failure_reason` from a diagnostic string into typed data
  that can drive policy.

#### 2. Multi-step ownership is claim + heartbeat + reclaim

If a later slice introduces a real multi-step ownership lease, model it as one
contract, not as a loose set of process-local flags.

- Durable ownership and live reachability are different facts: a worker can own
  a claim while temporarily unreachable, or be alive without still owning the
  right to mutate.
- The lease shape should include a durable claim token, a heartbeat/reachability
  signal, a reclaim policy, and a renewal token that proves the worker still
  owns the claim.
- Any fence/ownership check that protects a state mutation must be composed
  inline into the mutating write predicate, not run as a separate preflight
  "am I still owner?" check.
- Reject file locks, PID checks, process-local running sets, and fail-open locks
  as correctness mechanisms. They can be diagnostics, not authority.
- This is the conditional version of `core-model-todo.md` B2: the current model
  avoids takeover of in-flight claims; this is the contract if a future level
  adds takeover.

### L0e — Runtime context provider

Source: the §4 L0e matrix row and later sandbox/provider addenda (§8, §9, §10).
The current L0e model is acceptable as the baseline: optional
`RuntimeContextRequirement`, a named provider contract, opaque provider-owned
refs, and actor-facing projection. The future work is in provider internals and
provider-family design, not in the kernel's core L0e contract.

#### 1. Prove the provider abstraction with at least two real backends

Avoid a single-implementation "generic" provider interface that only looks
pluggable. The abstraction should be pressure-tested against at least two real
substrates.

- `pairflow.worktree` is the MVP backend.
- A second backend should be materially different: remote sandbox, container,
  clone workspace, or hybrid BYOC runtime.
- Provider tests should assert the shared contract, while provider internals
  remain free to use different mechanics.

#### 2. Separate substrate, transport, and observation

Do not collapse runtime substrate, I/O transport, and observation into one
session abstraction. The tmux/screen-scraping shape is useful as a cautionary
reference because it mixes these concerns and makes correctness depend on a
low-fidelity observation channel.

- **Substrate**: where work runs, such as worktree, clone, container, local
  workspace, remote workspace, or cloud sandbox.
- **Transport**: how commands/interactions reach the substrate, such as shell,
  API, PTY, browser/computer-use, or screen-scrape.
- **Observation**: how the kernel/runtime sees outputs, logs, traces,
  screenshots, filesystem changes, and lifecycle signals.
- The runtime-context provider may own the substrate; adapter/runner layers may
  own transport; observe-seams should make observations explicit and typed.

#### 3. Provisioning should be idempotent `ensure`, not blind create

Provider provisioning should converge on the requested runtime context when
called again with the same durable identity and spec, rather than creating a
second resource blindly.

- Re-provisioning after a crash should find or repair the intended context where
  possible.
- A provider may return the existing ref, repair the resource, or fail with a
  typed reason; it should not silently create an unrelated sandbox for the same
  identity.
- This is provider-side idempotency, complementary to the kernel's request-id
  correlation.

#### 4. Cleanup needs orphan reconciliation and TTL expiry

Provider cleanup is more than "delete this path". The system needs a two-level
reconciliation story for durable records and physical resources.

- DB says no live context, disk/runtime still has one: orphan cleanup or
  quarantine.
- DB says context exists, disk/runtime is missing: typed recovery / repair /
  failure classification.
- TTL expiry can clean intentionally retained resources, but should not be the
  only release mechanism.
- This complements the already-modeled release contract; it is background
  reconciliation, not a replacement for declared release boundaries.

#### 5. Remote sandbox and hibernate need stable identity

Remote/hybrid sandbox providers should treat the sandbox filesystem as cache,
not the source of truth. Durable state stays host/kernel-owned; wake-up
reconstructs or re-pushes the required projection.

- A stable sandbox id should key hibernate/resume, not a transient process or
  screen session.
- Wake-up should rehydrate from durable records, artifacts, and refs; it should
  not assume the remote filesystem is authoritative.
- This is the remote-sandbox version of "work durable, actor/session
  ephemeral".

#### 6. Sandbox mode must fail closed, never silently downgrade

If the definition asks for a remote, hardened, or otherwise isolated sandbox and
the provider cannot supply it, the run should reject or fail explicitly.

- Do not silently fall back from remote sandbox to local bare-host execution.
- Local bare-host execution can be a deliberate dev/MVP mode, but it must be
  declared as such and must not inherit the trust assumptions of an isolated
  sandbox.
- The failure should be observable enough for policy/gates to decide whether an
  operator may retry with a different provider.

#### 7. Provider execution is one primitive across run reasons

Setup, cleanup, dev scripts, action runners, and actor processes should not grow
separate ad hoc execution paths. They are all provider-managed execution
processes over a runtime context; what differs is the typed run reason and the
policy attached to that reason.

- A future provider execution contract should cover command/script launch,
  working directory / sandbox binding, environment projection, output capture,
  cancellation, timeout, and result classification.
- Run reasons should be explicit, such as `setup`, `cleanup`, `dev`, `action`,
  `gate`, or `actor`, so policy can decide which authority, evidence, retry, and
  release rules apply.
- Lifecycle scripts are not special hidden hooks. If setup or cleanup is
  load-bearing, it should produce typed results and evidence like any other
  execution process.
- Keep this below the L0e provider boundary: the kernel should depend on the
  common execution contract, not on provider-specific shell/script mechanics.
- This complements the ③ action-runner model. Actions route workflow state;
  L0e provider execution supplies the lower-level process primitive those
  actions, scripts, and actor runs can share.

### L2 / L2a — Gate library and verification governance

Source: the §4 L2 matrix row and later verification / policy addenda (§8-§11).
The current L2/L2a model is acceptable as the mechanism: ordered
`allow | warn | block` gate pipelines, inline process gates, read-only/stateless
evaluation, and durable `evidence_refs`. `core-model-todo.md` Part F already
captures the semantic verify discipline. The future work is to mature the gate
catalog and the governance around evidence-producing evaluators.

#### 1. Packaged gate library and workflow templates

L2 should stay a generic mechanism. Concrete gates such as a product-premise
front gate, an OWASP/STRIDE security gate, or workflow-family gates for WF-1..WF-7
belong in a packaged gate library and template set, not as kernel primitives.

- A workflow should bind named packaged gates with explicit config; the kernel
  should only see the standard `GateEvaluator` / `GateDecision` contract.
- The gate library should become an acceptance surface for common workflow
  patterns: product premise check before code, security review before release,
  docs-only evidence gates, and command/test gates.
- New gates should prove whether they are policy gates, verify gates, or both;
  do not infer the semantic family from the implementation type.

#### 2. Verify evaluator governance and freshness beyond one run

A verify gate is stronger than actor self-report, but the evaluator itself is
still a component that can be stale, misconfigured, or too weak for the claim it
certifies.

- Evidence should record the evaluator / harness / grader identity and version,
  not just the checked artifact. A green result from an obsolete grader is
  different from a green result from the current one.
- Changing a gate, policy, harness, or grader should invalidate or retrigger the
  affected evidence where the old result no longer certifies the transition.
- High-value transitions may need multiple independent oracles, not a single
  verifier verdict.
- Gate metadata should include cost and latency expectations so workflow
  authors can choose where expensive verification is justified.
- This extends Part F's "no stale-green" rule from run state to evaluator state;
  L13 may later own the broader trust/eval governance model.

#### 3. Policy config is a reviewable artifact, not UI click-state

Gate and policy behavior should be diffable, reviewable, and reproducible. A
security-critical approval or gate rule should not live only as mutable UI state.

- Policy config should be stored as a versioned definition artifact or an
  equivalent auditable record, not hidden behind click-only admin state.
- Runs should record the policy/gate config identity they evaluated against, so
  later audit can explain why a transition was allowed, warned, or blocked.
- UI editing can exist, but it should produce the same durable config change
  record as a file or definition update.
- This is primarily L2 because gates consume the config, and it cross-references
  L13 because organization-level approval and policy-change governance come
  later.

#### 4. Gate ablation and recalibration

Every gate encodes an assumption about a model, actor, workflow, or runtime
weakness. That assumption can become stale as models, prompts, tools, or
workflow definitions improve.

- Treat each non-trivial gate as carrying a load-bearing hypothesis: what
  failure mode it prevents, what evidence would show that it still matters, and
  what evidence would justify relaxing or replacing it.
- Store enough gate outcome, override, reviewer-correction, latency, and cost
  signal to evaluate whether the gate is still worth its friction.
- Run controlled ablation or shadow-mode checks before removing a gate: compare
  what would have happened without it against actual outcomes.
- Recalibration can tighten as well as loosen. A gate that misses real defects
  should be revised, not merely kept because it exists.
- This is the gate-side counterpart to L13 trust calibration: L13 asks how much
  autonomy an agent/version has earned; L2 asks whether each gate remains the
  right control for the risk it claims to cover.

#### 5. Scan after expansion, not only before

Input/security scans should cover the actual material the actor or tool will
consume, not just the raw user request.

- Run injection/security/policy scans after skill expansion, dynamic recall,
  context assembly, and channel payload normalization where those steps can add
  executable or instruction-like content.
- Preserve the distinction between transport authentication and content
  security: a trusted channel can still carry hostile or stale instructions.
- Gate evidence should identify the assembled context or artifact fingerprint
  it scanned, so a later expanded packet cannot reuse a green result from a
  smaller pre-expansion surface.
- This connects L2 scanning to L5 skills, L8 channels, and Part F's evidence
  currency rule.

### L3 — Human decision ergonomics and payload shape

Source: the §9 survey hook taxonomy, the §8/gstack human-gate bypass warning,
and the §11 OneCLI approval flow. The current L3 model already owns the durable
human decision record and validate-before-mutate contract. The future work is
the shape and ergonomics of human waits once more approval patterns appear.

#### 1. Human gates need explicit design dimensions

Human approval should not be just a boolean prompt. Later human-gate definitions
should declare what the human is validating, how much context the human sees,
and whether the decision recurs.

- **Validation scope**: what exact action, resource, payload, or transition the
  human is authorizing.
- **Alert richness**: the minimum context/evidence shown to make the decision
  meaningful without flooding the reviewer.
- **Recurrence**: whether the decision is one-shot, allow-once, allow-for-this
  run, allow-for-this actor, or allow-until-policy-change.
- Rich, rare decisions are safer than frequent thin prompts that train users to
  click through.

#### 2. Approval requests need durable payload and timeout disposition

OneCLI's credential approval flow is useful as a payload reference, but its
held-open socket transport is the anti-pattern.

- A pending approval should be a durable row/record with requested action,
  target resource, requester, approver-resolution policy, expiry, and the
  evidence/context needed to decide.
- Timeout should produce a real disposition such as `deny`, `expired`, or
  `escalated`, not an ambiguous missing callback.
- Do not keep a live HTTP/socket request open while waiting for a human. Park
  the workflow durably and resume through ordinary kernel ingress.
- The approver-resolution policy should be auditable and versioned like other
  gate/policy config, not hidden in click-only admin state.

### L4 — Child workflow fan-out and parent/child policy

Source: the §4 L4 matrix row and the §3.3 fan-in synthesis. The current L4 model
is acceptable as the single-child primitive: a full child instance, a durable
`ChildWorkflowLink`, correlated spawn write-back, and terminal
`CHILD_LIFECYCLE` delivery. `core-model-todo.md` Part D captures the active
contract for identity-preserving fan-in. These topics are later extensions once
the primitive grows beyond one sequential child.

#### 1. Child cost and token roll-up

Parent workflows need a durable way to account for child execution cost, token
usage, and other resource totals without treating the child as an in-memory
subtask.

- Child instances should record their own cost/resource facts in their own run
  records.
- The parent should be able to roll up those facts through the child link, with
  per-child attribution preserved.
- Roll-up should be derived from durable child records or committed child
  summaries, not from the parent's memory of what it spawned.

#### 2. Parent-close policy for live children

If a parent reaches `done`, `failed`, or `cancelled` while children are still
live, the system needs an explicit policy rather than accidental orphaning.

- Possible policies include cancel children, wait for children, detach children,
  or keep them running under an explicit ownership transfer.
- The policy must respect each child's own runtime-context release obligations
  and terminal audit record.
- Parent close must not erase the link state needed to observe or recover child
  outcomes later.

#### 3. Intermediate lifecycle subscriptions

The L4 MVP subscribes to terminal child lifecycle events. Later workflows may
need parent waits on named intermediate checkpoints such as
`ready_for_human_approval`, `review_ready`, or `artifact_published`.

- Intermediate subscriptions should reuse the same parent/child link and
  correlation discipline as terminal events.
- The subscribed transition must be a committed child lifecycle/checkpoint fact,
  not a prompt convention or a child-local UI state.
- Delivery durability and replay behavior must be specified before intermediate
  events become load-bearing.

#### 4. N-child fan-out execution controls

The current L4 model is intentionally sequential. Real fan-out needs quantitative
controls and explicit join semantics on top of the identity-preserving link
model.

- Fan-out should declare concurrency caps and generation/round scoping, so a
  re-entered parent step does not count a prior generation's children.
- Join predicates should cover wait-all, wait-any, quorum, and terminal-set
  forms over committed child-link rows.
- Per-generation barrier reset should be explicit; do not rely on an in-memory
  channel `consume()` or anonymous reducer.
- This is the execution-control counterpart to Part D's fan-in contract.

#### 5. Internal kernel events need durability levels

Part D names the `CHILD_LIFECYCLE` delivery edge. The broader future topic is
one internal event model with explicit durability and trigger semantics, not a
collection of ad hoc wake-up paths.

- Internal events should carry a correlation identity such as run/instance/link
  id, event id, causation id, and delivery class.
- Load-bearing internal events need at-least-once delivery, retry, and a
  deliverability timeout or reconciliation path.
- Cheap invalidation nudges can stay ephemeral, but the definition should say
  which events are ephemeral and which are durable transfers.
- The event model should explain trigger semantics: whether an event routes a
  waiting instance, schedules future work, updates a projection, or only informs
  observers.
- This cuts across L4, L6, L8, and the observe seam; keep it unified before
  adding more special event paths.

#### 6. Reducer and merge laws must be explicit

Leaderless fan-in must not depend on accidental arrival order. If N children or
parallel branches merge into one parent state, the merge contract needs teeth.

- A reducer used for unordered fan-in should declare and test associativity,
  commutativity, and idempotency where those properties are required.
- Non-commutative or order-sensitive merges should route into an explicit
  conflict state or require an ordered join, not silently pick the observed
  arrival order.
- A "single writer" reference system does not prove the reducer is safe for a
  leaderless kernel.
- This extends Part D's "anonymous reduction only where identity does not
  matter" rule with a second condition: even anonymous reduction needs valid
  merge laws.

### L5 — Skill surface and portable capability packaging

Source: the §4 L5 matrix row and later tooling addenda (§8-§10). The
`approach.md` L5 baseline is the agent-initiated help / Ask subflow. The research
adds a different, adjacent concern: how actor-facing skills and tool capabilities
are packaged, selected, and made portable across agent runtimes.

#### 1. Adopt a standard skill package format

Prefer an `agentskills.io`-style package shape over a Pairflow-specific skill
format: a directory with frontmatter Markdown and machine-readable metadata.

- Keep the skill body portable and readable by agents.
- Keep metadata machine-readable enough for indexing, validation, and UI.
- Avoid inventing a custom one-off format until the standard shape is proven
  insufficient.

#### 2. Skill discovery and cached prompt index

Skill selection should use an explicit discovery surface and a cached prompt
index, not ad hoc filesystem scanning or a pasted full catalog.

- Provide list/view/manage style operations for available skills.
- Build an actor-facing index that can be deterministically refreshed and
  audited.
- Context assembly should reference the selected skills; it should not dump an
  unbounded skill library into every packet.

#### 3. Action-indirection portability

A skill should name capabilities, not host-specific tool calls. The host or
adapter maps those capability names to concrete tools.

- One skill source should run on multiple agent hosts when their capability maps
  satisfy the same declared requirements.
- The mapping belongs at the host/adapter boundary, not inside prose
  instructions.
- Missing capability bindings should fail closed or make the skill unavailable,
  not silently degrade to a weaker behavior.

#### 4. Trigger-only descriptions

The skill `description` should be used only for selection: when should this
skill be loaded or shown?

- Do not turn the description into a workflow summary.
- The executable guidance belongs in the skill body.
- This avoids the failure mode where an agent reads the summary, skips the body,
  and misses the actual procedure.

#### 5. Skill selection is separate from tool selection

Choosing the right skill is its own retrieval/pruning problem. It should not be
collapsed into "give the actor all tools".

- Keep per-step actor surfaces small: fewer, relevant skills and tools.
- Treat skill retrieval / ranking as distinct from concrete tool authorization.
- Use the L1 capability and L2b context predicates to decide which skill
  guidance is even eligible for the current step.

#### 6. Skill lifecycle and trust governance

External or generated skills need lifecycle and trust metadata, not first-seen
wins behavior.

- Names should be origin-scoped to avoid flat namespace collisions.
- Skill manifests should declare dependencies and capability requirements in a
  machine-checkable form.
- Track lifecycle states such as installed, enabled, disabled, quarantined, and
  deprecated.
- Do not auto-delete skills without a durable record, and do not allow
  autonomous skill creation without governance.
- Run trust-tiered security scans for external skills before exposing them to an
  actor.

#### 7. Bootstrap as an active entry gate

The skill surface should be checked at entry, not treated as a passive catalog.

- Before dispatch, verify that required skills and their capability bindings are
  present, compatible, and trusted.
- A missing required skill should be a clear configuration/runtime error, not a
  prompt-time surprise.
- Optional skills can degrade explicitly, but the degradation should be visible
  in the issued context/config.

#### 8. Typed host capability schema / codegen seam

The gstack `HostConfig` / codegen pattern is a useful alternative to purely
runtime action-indirection, but the shared lesson is the same: host capabilities
need a typed, machine-readable schema.

- A host capability schema should describe tools, MCP endpoints, hooks, skill
  routing, and launch/context constraints.
- Runtime mapping and ahead-of-time codegen are both implementation strategies;
  the contract is the schema.
- Cross-reference L0c: this is the skill/tool side of the ActorAdapter schema
  and conformance-test future topic.

## Block B — Distribution

### L6 — Triggers and scheduling

Source: the §4 L6 matrix row and later scheduler addenda (§8, §10). The
`approach.md` L6 baseline names the trigger router and scheduler, scoped first
to manual, internal, and timeout triggers. The future work is the scheduler's
durability and dispatch contract, not a broader external-channel model.

#### 1. Durable look-ahead timer model

Timers should be represented as durable next wake-ups, not polling tickers or
process-local sleeps.

- A long sleep should become a stored timer/deadline row, not repeated wake-up
  polling.
- For a family of conceptual waits, store the waiting intent in state and emit
  only the earliest next wake-up needed to drive progress.
- Timer state should dedupe equivalent pending wake-ups with explicit status
  bits, so recovery can tell "not fired yet" from "claimed", "completed", or
  "obsolete".

#### 2. Idempotent timer and retry firing with CAS claim

Timer firing and retry execution should be exactly-once by idempotent
re-execution, not by assuming exactly-once delivery.

- A fired timer should reload the live instance/work item and discard itself if
  the state is stale, already advanced, or no longer waiting for that deadline.
- Retries should be materialized as durable timer rows, not in-memory retry
  loops.
- Multi-replica schedulers need a store-backed claim, such as a
  `claim_job_for_fire` CAS, so only one runner owns a fire attempt.
- Completion should be delete-or-advance after the work outcome is known; an
  ack failure must remain recoverable as scheduler state, not disappear as a
  silent success.

#### 3. Scheduler dispatch governor and separate scheduling state

The scheduler should govern dispatch from system capacity and health, not only
from queue depth.

- Dispatch should be bounded by a rule like `min(capacity, batch, ready)`, with
  capacity informed by system health and circuit breakers.
- The governor/policy decision should be separated from the callback that
  performs the actual dispatch, so different work types can share the same
  scheduling contract.
- Scheduling bookkeeping should live in scheduler-owned state, not mutate the
  work item as an incidental lock or progress marker.
- If post-dispatch success handling fails, count it as a dispatch failure unless
  the system can prove the work item reached a durable, recoverable state.

### L7 — Grants and credentials

Source: the §4 L7 matrix row and later survey / OneCLI addenda (§9, §11), plus
the roadmap's L7 rule that credentials never travel. L0c may carry
credential-related references as run intent, but credential resolution,
capability execution, and credential audit are owned by L7.

#### 1. Secret refs resolve only at the runtime boundary

Persisted run intent should carry secret references, never raw credentials. The
runtime boundary resolves those references into concrete credentials only for the
adapter/provider that is allowed to use them.

- `AgentConfig` and transcript provenance should remain safe to store and audit.
- Credential injection should be scoped by grant, actor/provider, operation, and
  argument-level predicate where relevant.
- Missing or unavailable credentials must be explicit and fail-closed, not a
  silent adapter fallback.

#### 2. CapabilityIntent is the credential-side produce-not-perform port

Actors should name the privileged capability they want to use, not receive the
secret value needed to perform it. The boundary/provider executes the privileged
act on the actor's behalf.

- Model this as a first-class `CapabilityIntent`, symmetric with `ActionIntent`
  and `SpawnIntent`: the actor produces a durable intent; the privileged boundary
  performs it after grant and policy checks.
- The intent should reference a capability/grant and structured arguments, never
  the raw credential.
- Capability execution should record on-behalf-of provenance and the grant /
  policy identity used to authorize it.
- If a capability seam cannot be established, reject or fail closed. Do not
  fall back to open egress or raw credential injection.

#### 3. Credential freshness across durable waits

Long-running workflows cannot assume a credential that was valid at park time is
still valid at resume time. Tokens may expire, rotate, or be revoked while an
instance or child workflow is waiting.

- Resume should re-check capability availability and freshness outside the actor
  context, at the boundary that owns the credential.
- Refresh or re-consent must not put the renewed credential into the model
  prompt, transcript payload, or actor filesystem.
- A parked parent or child that wakes against a missing/revoked credential should
  get a typed L7 outcome: refresh required, re-approval required, denied,
  unavailable, or terminal policy failure.
- Evidence of freshness should be tied to the capability/grant identity and the
  operation, not to a stale actor self-report.

#### 4. Allowlist broker and secret hygiene

Credential control should be allowlist / grant based, not blocklist based. The
system should assume an LLM-driven shell, plugin, or skill can inspect anything
placed in its process environment.

- Avoid process-global `os.environ` secrets for actor runtimes; every tool,
  shell command, and plugin in that process can inherit them.
- A broker may substitute secrets at call time by host/path/capability match, or
  provide inert placeholder files for tools that require a local path.
- Placeholder files must be safe if read by the actor, e.g. a `0600` managed
  stub rather than the actual secret.
- Secret CLI helper behavior, if used, should verify installation/source,
  control cache permissions, and make resolution failures explicit.

#### 5. Boundary-owned audit and channel trust

The privileged boundary should own the audit trail for credential use. The agent
can request a capability, but it should not be the source of truth for what
privileged operation actually happened.

- Audit records should be written by the broker/provider that performs the
  credentialed operation, not reconstructed from actor prose.
- The audit should include actor/run identity, grant identity, operation
  arguments or safe digests, policy decision, outcome, and timing.
- The channel into the broker needs an authenticated trust story, such as
  pairing plus signed requests, so a local caller cannot impersonate an
  authorized actor by convention alone.
- Human approval at this boundary should use durable request / decision records.
  Avoid transports that keep an HTTP socket open until a human clicks; a stalled
  callback must not stall every credentialed call until timeout.

### L8 — Channels, task inbox, and EventNormalizer

Source: the §4 L8 matrix row and later channel addenda (§8, §9). The
`approach.md` L8 baseline names `Channel`, `EventNormalizer`, multi-channel
delivery, task inbox, and the general Ask. The future work is to split L8 into
clear channel seams instead of designing one monolithic "delivery" layer.

#### 1. Two channel classes with different correlation oracles

L8 should distinguish message-source channels from transport-access channels.
They both produce kernel-facing envelopes, but they do not correlate or
authenticate in the same way.

- **Message-source channels** normalize heterogeneous platform content into a
  common envelope: Slack message, email, webhook payload, or inbox item.
- **Transport-access channels** tunnel access to an opaque external API or
  transport and correlate by exact transport identity, not fuzzy message
  content.
- Channel authentication belongs in the channel contract. Do not assume a
  caller is trusted because it arrived through a local adapter.
- L9 owns fuzzy/external wait matching; L8 should preserve enough identity for
  L9 to decide, not perform fuzzy correlation by accident.

#### 2. Envelope split: content plus identity

Channel envelopes should separate the message content from the external identity
and routing facts that make the message safe to correlate and reply to.

- `content` carries the normalized body, attachments, structured payload, or
  rendered Ask answer.
- `identity` carries platform, channel, thread, sender, recipient, transport id,
  connector id, and other stable correlation handles.
- Use local artifact/file refs for large or sensitive payloads rather than
  platform URLs that may expire, leak authority, or be inaccessible to the
  runtime.
- The split should make replay/audit possible without giving the actor raw
  transport authority.

#### 3. One normalizer / relay contract, not many hand-written paths

Platform-specific adapters should plug into one declared connector contract,
not duplicate normalization logic in every workflow or plugin.

- A connector should map its platform into the common channel wire contract.
- Capability flags should advertise which channel features are available, with
  explicit graceful degradation or default stubs where a feature is absent.
- Avoid a built-in checklist of hardcoded platform branches. New platforms
  should enter through the connector/relay contract.
- Normalization behavior should be testable with golden fixtures so platform
  edge cases do not become hidden prompt conventions.

#### 4. Task inbox and outbound delivery idempotency

L8 is also the outbound delivery layer. Ask messages, actor dispatches, and
channel notifications need a durable delivery ledger so crash recovery does not
duplicate or lose sends.

- Outbound messages should carry a stable delivery id / idempotency key.
- Retry should resend or reconcile against the same delivery record, not create
  a new independent notification by default.
- Delivery state should distinguish queued, sent, acknowledged, failed,
  expired, and superseded outcomes.
- Multi-recipient fan-out should be represented as per-recipient delivery state,
  not N uncontrolled copies with no shared parent record.

#### 5. Ephemeral nudge versus durable addressed message

Not every signal deserves durable mail. L8 should distinguish cheap local nudges
from messages that must survive process death.

- Ephemeral nudges can be turn-boundary hints and may be cleared when the actor
  turn ends.
- Durable messages are addressed records with delivery state and audit; use them
  when the signal must survive crash, restart, or cross-process delivery.
- Do not treat mail as a permanent commit log by default; commit the underlying
  workflow fact separately, then send a durable message only when delivery
  matters.
- Do not rely on ephemeral filesystem nudges for load-bearing workflow progress.

#### 6. Expected implementation seams

L8 will probably split during implementation planning. Keep these seams
separate unless a later design proves they can safely share one contract.

- Channel normalization.
- Task inbox and outbound delivery.
- General Ask schema and addressee model.
- External-token Ask, likely crossing L7/L10 because security and identity are
  materially different from internal human/agent Ask.

### L9 — Wait conditions, liveness, and recovery

Source: the §4 L9 matrix row, the L0d anti-pattern ("do not mark failed as the
only recovery"), and the later gastown/watchdog addenda. L9 owns two related but
distinct problems: wait/correlation for events that arrive later or externally,
and liveness/recovery when expected progress does not happen. Exact correlation
has useful references; fuzzy external correlation is explicitly greenfield in
the synthesis.

#### 1. Exact correlation oracle contract

When an incoming event carries enough identity to correlate deterministically,
the correlation oracle should be a pure, testable contract rather than a pile of
platform-specific exceptions.

- A wait definition should declare the discriminator set used to build its
  correlation key.
- The oracle should be referentially transparent: same normalized channel
  identity and discriminator values produce the same key.
- Exact correlation should remain separate from fuzzy matching. Do not add
  "helpful" platform-routing exceptions to the exact path.
- Golden fixtures should prove that each channel/connector maps raw platform
  identity into the declared correlation key without hidden prompt logic.

#### 2. WaitCondition as a durable checkpoint

External waits should be durable state, not prompt convention or actor memory.
The instance should record what it is waiting for, how matching works, and when
the wait expires or becomes stale.

- A `WaitCondition` should include exact/fuzzy mode, expected event classes,
  correlation discriminators, deadline/escalation policy, and stale-intent
  rules.
- Matching should read the current committed instance state before resuming; a
  stale event can be related to the workflow and still no longer be allowed to
  advance it.
- Wait state should survive crash and make timeout / escalation auditable.
- Internal deterministic waits (child lifecycle, timers) are the simpler forms;
  L9 generalizes them to external and potentially fuzzy arrivals.

#### 3. Fuzzy matcher proposes, it does not mutate directly

Fuzzy external correlation has no strong reference in the research corpus. Treat
it as an advisory matching layer unless a later design proves a narrower
automatic path is safe.

- The matcher should produce a `MatchProposal`: candidate instance/wait,
  confidence, evidence, rationale, and alternative candidates.
- A proposal should not directly resume a workflow when ambiguity or impact is
  meaningful. Route through policy, verify, or human review as appropriate.
- The proposal and final decision should be recorded separately so audits can
  distinguish "the matcher suggested" from "the system accepted".
- Low-confidence or multi-candidate matches should become inbox/review work, not
  silent drops or arbitrary first-match behavior.

#### 4. Stale-intent handling for late external events

An event can match the right conversation but the wrong moment. L9 needs a first
class stale-intent model for external events, not just a version mismatch error.

- A matched event should be evaluated against the wait's expected version,
  state fingerprint, deadline, and allowed intent window.
- Late replies may be recorded as related evidence/history without resuming the
  workflow.
- Superseded waits should reject or reclassify late events explicitly, so the
  system does not apply an old answer to a new question.
- The response path should be configurable: ignore, attach as note, ask for
  confirmation, reopen a decision, or escalate to an operator.

#### 5. Watchdog and dead-executor recovery

A watchdog should only kill or restart what it can prove is dead. "Stuck" is
not just a timer condition: it may require judgment, evidence, or human/operator
review.

- Prefer restart-first / work-durable / actor-ephemeral recovery: preserve the
  worktree, branch, ledger, transcript, and durable context, then respawn the
  ephemeral actor/runtime when death is proven.
- A merely slow or suspiciously inactive worker should route to a judgment tier
  rather than being auto-killed.
- The recovery contract should preserve completion invariants: if work is
  pinned, the sandbox persists, and a replacement can be spawned, the system
  should converge to completion or an explicit recoverable failure.
- A global stop/estop path should stop execution while preserving durable state,
  so operators can recover the work instead of losing it.

#### 6. Unacknowledged human waits can become liveness escalations

A human wait timeout is not always a simple reject or retry. In approval-heavy
flows, "nobody acknowledged this" can be a liveness signal that should route to
a higher judgment tier.

- Wait conditions should distinguish no acknowledgement, explicit denial,
  expiry, and operator-unreachable cases.
- A timeout policy may promote the item to another approver, an operations
  inbox, or a watchdog/judgment queue instead of killing the work.
- The escalation decision should be durable and auditable, not inferred from a
  missing UI callback.
- This is the L9 side of the L3 human-gate payload: L3 records the approval
  wait; L9 owns timeout, unacknowledged, and stale-response handling.

### L10 — Gatekeeper and private-data federation

Source: the §4 L10 matrix row and later federation / capability-schema addenda
(§8, §10). L10 builds on L7 grants and L8 channels: it is not just credential
handling, but the boundary where private-source data becomes an approved,
auditable workflow contribution.

#### 1. Gatekeeper three-layer contract

The gatekeeper should separate private-source access from matching and owner
approval. A workflow should see only the approved contribution, not the private
source itself.

- The connector runtime owns access to the private source, such as a mailbox,
  private dataset, or organization system.
- The matcher proposes relevant items or slices, with evidence and scope.
- The owner UX decides what may cross the boundary, with explicit allow/deny,
  redaction, recurrence, and expiry where applicable.
- The workflow/substrate receives a contribution envelope, not raw source
  authority.

#### 2. Contribution envelope

Private-data federation needs a durable object for what crossed the boundary.
That object should be small enough to audit and rich enough to support later
trust/governance layers.

- A contribution should record source kind, source identity or safe digest,
  selected content/artifact refs, scope, redactions, owner decision, policy
  identity, and trust domain.
- The envelope should distinguish provenance from authorization: where the data
  came from is not the same as why it was allowed into this workflow.
- Contributions should be replayable/auditable without reopening the private
  source.
- Do not treat a connector's raw event as the contribution. The contribution is
  the approved, policy-shaped artifact.

#### 3. Capability-gated federation boundary

Federated/private-data operations should go through a capability-gated boundary,
not ad hoc connector calls.

- Each operation should declare the capability it requires and the predicates on
  allowed arguments/resources.
- Capability knowledge should come from a shared/generated schema, not drift
  across registries, UI maps, environment flags, and plugin-local config.
- Adapters/connectors need conformance tests, including event-order and
  message-shape regressions.
- Missing or unsupported capability should fail closed or produce an explicit
  unavailable contribution path, not silently degrade to broad access.

#### 4. Claim arbitration for federated work

The research gives a cautionary first federation reference: "claim is intent"
is not enough when multiple parties or forks can act on shared data. L10 needs a
real arbitration story where shared claims matter.

- A claim that grants exclusive or authoritative action should be backed by a
  lease/CAS or equivalent shared-substrate contract.
- Intent-only claims may be useful as proposals, but they must not be treated as
  locks.
- Cross-org/fork synchronization should preserve which party claimed what,
  under which authority, and whether the claim was accepted, expired, or
  contested.
- This should align with L9 exact correlation and L13/L14 governance, but the
  first correctness boundary is L10's claim arbitration.

#### 5. Trust domain and provenance seam

L10 should capture enough trust/provenance structure for later reputation,
fraud-detection, and org-scale governance without implementing those layers
inside L10.

- Contributions should carry a trust domain and signed/hashable provenance where
  the source and policy justify it.
- Multiple validators, reputation stamps, and fraud-detection are later
  L13/L14 concerns, but L10 must not flatten the data in a way that prevents
  them.
- Audit records should identify the boundary component that admitted the data,
  not rely on the actor's description of what it received.
- Private-source minimization is part of the trust story: pass only the
  approved slice, not a raw mailbox/dataset dump.

## Block C — Agent-native

### L11 — Memory and durable agent identity

Source: the §4 L11 matrix row and later memory addenda (§8, §12). This is not
part of L0c's run-intent resolver; it belongs with the agent-native layer where
agent identity, memory scopes, and activations become first-class. The key
future design problem is to combine Honcho's perspective model with mnemon's
deterministic write protocol.

#### 1. Perspective-aware directed memory edges

Memory should not be a single global profile. Model durable memory as directed
edges keyed by who observes and who/what is observed.

- Use an `(observer, observed)` shape so self-memory (`observer == observed`)
  and theory-of-mind style memory use the same primitive.
- Preserve the broader address shape from the research:
  `(workspace, observer, observed, session | null, level)`.
- Keep perspective and episode orthogonal. Session-scoped memory may later be
  promoted to a broader scope, but promotion should be an explicit operation.
- Do not store identity summaries as anonymous JSONB blobs when the identity or
  perspective is load-bearing; give them first-class tables/records.

#### 2. Memory edges carry type and provenance

The memory graph should distinguish why a memory edge exists, not only that it
exists.

- Candidate edge kinds include temporal, entity, causal, and semantic.
- Causal edges are especially important for decision provenance: "A caused B"
  is not the same as "A was mentioned near B".
- Keep provenance trees (`source_ids`) and reinforcement counters, so durable
  memory can explain where a claim came from and how often it was confirmed.
- Avoid treating vector similarity as the whole memory model. Retrieval may use
  embeddings, but the stored memory needs typed structure.

#### 3. Memory write is produce-not-perform

Actors should not mutate the durable memory store directly. They should produce
memory intents that a deterministic, kernel-owned provider validates and
executes.

- Treat `RememberIntent` / `LinkIntent` as the memory analogs of
  `ActionIntent`, `SpawnIntent`, and `CapabilityIntent`.
- The non-deterministic actor proposes what should be remembered; the provider
  performs durable writes, deduplication, and link creation.
- The provider should return structured, signal-bearing results, not raw table
  rows or prose.
- Memory writes should be idempotent and auditable; retries must not create
  duplicate or contradictory memories silently.

#### 4. Retrieval has deterministic and synthesis layers

Separate the durable representation from the actor-facing synthesis of that
representation.

- A static retrieval layer should return typed records, refs, scores, and
  provenance.
- An agent/LLM synthesis layer may summarize or prioritize retrieved memories,
  but its output should be derived, not the source of truth.
- The context packet should make the difference visible: retrieved facts,
  synthesized interpretation, and missing-memory state are different things.
- This split lets workflows run with deterministic memory only, synthesized
  memory, or no memory, without silently changing the contract.

#### 5. Memory must be an adapter-independent kernel port

Memory triggers and retrieval should not be hidden inside a specific actor
adapter hook. If memory depends on a provider-specific CLI hook, changing actor
provider can silently turn memory off.

- Memory should be resolved through an explicit kernel-owned port or observe
  seam, independent of Codex / Claude Code / OpenCode adapter details.
- "Memory unavailable" should be an explicit observable state, not a silent
  no-op.
- Adapter-specific memory stores may exist, but the workflow contract should
  name the memory scope and failure mode outside the adapter.

#### 6. Continuity fallbacks are not the memory model

Raw session forks and compact checkpoints are useful continuity tools, but they
should not replace first-class memory.

- A read-only fork of a predecessor session is a raw continuity fallback, not a
  structured memory scope.
- A distilled checkpoint plus decisions ledger is useful when a new activation
  needs settled context, but it should be labeled as checkpoint state.
- "Settled unless explicitly superseded" decisions should live in a durable
  ledger, not only in Markdown prose.
- These fallbacks can help activation/recovery, but the cross-run memory model
  should remain perspective-aware and typed.

### L12 — Definition PRs and metacognition

Source: the §4 L12 matrix row and later memory/learning addenda (§8, §12). The
`approach.md` L12 baseline already names the definition-PR channel and learning
levels. The future work is the discipline that turns observations and memory
into audited definition changes without self-reinforcing noise.

#### 1. Two-speed learning loop

Learning should not rewrite durable definitions on the hot path. Capture cheap,
explicit signals during work; consolidate them later under a controlled trigger.

- The hot path records observations, decisions, evidence refs, memory intents,
  and candidate lessons with source linkage.
- A delayed consolidation pass can run on idle, threshold, or pre-compaction
  triggers.
- The delayed pass should be replayable and auditable; it should not depend on
  transient actor memory.
- Keep anti-feedback discipline: a consolidation output must not immediately
  become its own unverified input.

#### 2. Structural reconciliation, not LLM rewrite

Metacognition should reconcile typed structures, not ask an LLM to rewrite a
bag of memories or procedures.

- Deduplicate by stable identity, source refs, and semantic/typed keys where
  possible.
- Preserve source linkage and reinforcement counters when merging claims.
- Type inferred claims, and require evidence/source linkage for any claim that
  may later influence behavior.
- LLM synthesis can propose a merge or interpretation, but the durable result
  should be a structured record with provenance.

#### 3. Memory-to-definition promotion channel

The hard L12 boundary is deciding when an observation or memory becomes a
durable rule, skill, policy, schedule, dataset, or agent-definition change.

- Promotion should produce a proposal, not mutate the definition directly.
- The proposal should travel through the definition-PR channel with author,
  rationale, source memories/evidence, and affected scope.
- Acceptance should run the relevant gates/evals before the definition becomes
  active.
- The system should distinguish "remembered", "candidate lesson", "proposed
  definition change", and "accepted definition".

#### 4. Independent curator / forked reviewer

High-impact learning proposals should not be validated only by the actor that
created them.

- Use a fresh-context or forked reviewer for non-trivial definition changes.
- The reviewer should have an explicit tool/capability whitelist appropriate to
  the learning task.
- Record the reviewer decision and evidence separately from the author's
  proposal.
- For low-risk local memories, lightweight review may be enough; for agent/org
  definitions, independent review should be the default.

#### 5. Behavioral regression and eval discipline

Learned procedures need tests or evals proportional to their risk and blast
radius.

- A promoted skill, gate, or policy should carry a way to verify the behavior it
  claims to improve.
- Regression tests can be examples, command/evidence checks, golden fixtures,
  or behavioral evals depending on the artifact.
- Do not impose hand-written TDD on every small memory; match the verification
  form to the failure mode and impact.
- Store eval outcomes with the proposal/definition identity so later changes can
  retrigger or invalidate them.

#### 6. Pre-compaction is a first-class learning trigger

Before an actor context is compressed or discarded, the system may need to write
back structured state that should survive the compaction.

- Pre-compaction should trigger a controlled memory/lesson extraction path, not
  rely on the actor remembering to summarize itself.
- The trigger should emit memory intents or definition-change proposals through
  the same produce-not-perform paths as other learning writes.
- Missing or unavailable memory writeback should be observable, not a silent
  loss hidden by compaction.
- This trigger joins idle and threshold triggers as a learning boundary, not as
  an ordinary actor prompt instruction.

#### 7. Learning guardrails

Keep the learning layer conservative until it has evidence.

- Reject "autonomous self-improvement" claims that are just fixed counters or
  repeated self-feedback.
- Avoid research-theater mechanisms such as surprisal/spatial trees or
  graph-over-vector dogma unless they prove operational value.
- Do not let actor prose decide what becomes a rule; use the proposal/gate/eval
  channel.
- Do not feed unverified learned output back into the same learner as authority.

### L13 — Trust calibration and evals

Source: the §4 L13 matrix row. The `approach.md` baseline already names
`TrustProfile`, the autonomy ladder, gate-outcome / edit-distance recording, and
eval suites. The matrix adds two concrete pressure tests: a Superpowers-style
conformance harness over emitted event streams, and a Temporal `BAD_BINARY`-like
way to quarantine bad agent/prompt/build versions. This is not a change to the
current L2/L2a gate mechanism; it is the later layer that decides how much
autonomy a specific agent/version/context has earned.

#### 1. TrustProfile as production signal, not a static label

Trust should be computed from observed behavior, not assigned once by operator
intuition.

- Key trust profiles by the dimensions that affect behavior: gate, agent,
  definition version, prompt/model/build version, workflow family, and context
  class.
- Record gate outcomes, reviewer corrections, edit distance, override rates,
  post-run defects, and eval outcomes as inputs to the profile.
- Keep accountability orthogonal to autonomy: a highly trusted agent may skip a
  gate under policy, but its actions still remain attributed and auditable.
- Treat low sample size and context drift as first-class states; absence of
  failures is not yet earned trust.

#### 2. Autonomy ladder driven by evidence

The future autonomy ladder should say which controls may be relaxed, and why.

- Define explicit rungs such as "always require review", "warn-only for this
  gate", "skip full rerun when trusted evidence exists", or "auto-apply within
  bounded scope".
- Tie every rung transition to recorded eval / production evidence, not to
  actor self-report or one successful run.
- Make downshifts as important as promotions: a regression, failed eval, or
  suspicious override pattern should reduce autonomy automatically or require
  re-approval.
- Keep the ladder scoped; trust earned for one workflow family or gate should
  not silently generalize to unrelated work.

#### 3. Conformance harness over emitted event streams

The useful Superpowers pattern is behavioral regression testing, not hand-TDD
for every skill.

- A harness should run a known procedure against a fresh agent activation and
  assert over the emitted operation/event stream, transcript records, evidence
  refs, and final state.
- Assertions should focus on protocol behavior: correct op kinds, required
  evidence, no forbidden emits, stable idempotency behavior, correct decision
  shape, and expected gate interactions.
- Store harness results with the tested agent / prompt / definition version so
  later trust decisions can cite the exact conformance evidence.
- Use the harness as an acceptance surface for model upgrades, prompt changes,
  skill changes, and definition PRs.

#### 4. BAD_BINARY-style quarantine for agent/prompt/build versions

Temporal's `BAD_BINARY` idea maps well to agent-native systems: sometimes a
version is known bad and should stop receiving work.

- Keep a durable blocklist / quarantine record for agent definition versions,
  prompt versions, model versions, adapter builds, or packaged evaluator builds
  that are known to produce unsafe or incompatible behavior.
- Pin running and historical instances to the versions they actually used, so
  audit can explain behavior and recovery can avoid accidental upgrades.
- A quarantine should be scoped and explainable: affected workflow families,
  gates, failure evidence, replacement version, and whether already-running
  instances may continue.
- Recovery should prefer explicit migration or re-evaluation over silently
  replaying old work under a different agent/prompt version.

#### 5. Eval lineage and invalidation

Eval outcomes are useful only if their scope and freshness are clear.

- Record the eval suite identity, version, fixtures, grader/evaluator identity,
  and checked artifact/version.
- Changing a definition, prompt, model, gate, evaluator, or fixture should make
  it clear which trust profiles need recomputation or revalidation.
- This extends L2/L2a evaluator freshness and L12 behavioral regression: L13
  aggregates those facts into trust and autonomy decisions.
- Do not use a green eval from one version or context as a blanket proof for a
  different version or context.

## Cross-level seams

These topics do not have a single `approach.md` owner yet. They should stay here
until the ramp gives them a precise level, or until an implementation slice
forces a narrower home.

### Identity / Sandbox / Session decomposition

Source: L0b addenda (§8, §10) plus the L0c session-portability reading. This
cuts across L0b actor binding, L0c actor execution intent, L0e runtime context,
and later L8/L11 delivery and activation concerns.

Use three separate concepts:

- **Identity**: durable workflow / run / actor record.
- **Sandbox**: reusable execution substrate such as a worktree, clone,
  container, or remote workspace.
- **Session**: ephemeral actor runtime context, pane, process, conversation, or
  provider-local session.

Do not collapse these into one `run state`. Forks and retries should copy
replayable history and portable context, but must not copy live ownership facts
such as `workspace`, `git_branch`, `external_session_id`, or a process-local
session. A fresh attempt should reacquire its own sandbox/session authority.

This belongs to the broader identity/durability decomposition topic:

- **Timeline identity**: the durable history line or thread being continued.
- **Attempt identity**: one execution attempt, retry, fork, or run over that
  timeline.
- **Commit identity**: one atomic state transition in the transcript.
- **Recorded-effect identity**: a memoized actor output, activity result,
  action result, child lifecycle, or external effect checkpoint.
- **Memory identity**: durable long-horizon facts and edges that outlive one
  attempt or timeline.

If reruns/forks exist, keep the current-run pointer separate from the durable
instance/history row. Moving "current" should update a pointer; it should not
rewrite the durable line of history it points at.

### Observe seam — external run observation and control

Source: the §4 cross-cutting Observe-seam matrix row. This cuts across L0a's
durable transcript, L8 channels/streams, L10/L7 authority boundaries, and the
later fleet/observability surface. The useful pattern is a typed external API
for observing and controlling a run; it must not become a bypass around the
kernel ingress path.

#### 1. Atomic history-plus-tail subscription

An observer should be able to join a run without missing the event that occurs
between "read history" and "subscribe live".

- Provide a `history_plus_stream()`-style primitive that atomically snapshots
  the durable history and subscribes to the live tail.
- The returned stream should make the snapshot boundary explicit: source
  instance/run, starting offset/version, last replayed offset, and then live
  events.
- Persistence, dashboards, CLIs, and external orchestrators should consume the
  same replay-then-tail contract rather than each inventing a local polling
  loop.
- Reconnect should resume from a durable offset or explicitly request a fresh
  replay; do not rely on best-effort "latest state" reads for continuity.

#### 2. Live push, durable replay, and forensic audit are separate media

The observe seam should not pretend that one event store can serve every
consumer with the same semantics.

- **Live push** is for low-latency UI/CLI updates and may use bounded buffers,
  reconnect hints, and lag markers.
- **Durable replay** is the authoritative stream a consumer can resume from by
  offset after disconnect or restart.
- **Forensic audit** is an append-only diagnostic/compliance record that may
  retain lower-level facts than the user-visible stream.
- Do not use live cursor ids as durable replay cursors. If the live stream drops
  data, it must force replay or emit a typed gap marker.
- Durable observable events should carry enough structure for reconstruction:
  `run_id`, `event_id`, optional `parent_event_id`, session/source identity,
  timestamp, event type, visibility, and payload schema/version.

#### 3. Typed observable event envelope

The stream contract should be typed and versioned, not an unstructured UI feed.

- Each event should carry kind, schema/version, source run/instance, offset or
  transcript version, timestamp, causation/correlation ids where available, and
  payload.
- Use self-describing envelope metadata so live and historical consumers can
  decode the same record shape.
- Avoid `payload: any` streaming APIs where the UI or adapter must reverse
  engineer event meaning.
- If the boundary spans TypeScript/Rust or another language pair, keep generated
  contract types and CI drift checks in place.

#### 4. Addressed streams and offsets

Observation should be addressable at the unit the consumer actually needs.

- Support stream addresses such as run, instance, child link, channel, or task
  inbox rather than forcing consumers to filter one global log.
- Store offsets per addressed stream, with enough identity to distinguish replay
  from live delivery.
- A materialized projection may subscribe like any other consumer; persistence
  should not require a special hidden path.
- Cross-run/fleet observation can build on this later without changing the
  per-run contract.

#### 5. Backpressure, lag, and terminal markers

A stream is an operational contract, so slow consumers and closure must be
explicit.

- Define what happens when a consumer lags: bounded buffering, durable replay,
  lag-drop marker, or forced reconnect from offset.
- Terminal states should be sent in-band, such as done, failed, cancelled,
  purged, or closed, so consumers do not infer completion from timeout.
- A terminal marker should name whether more historical replay remains possible,
  especially after purge or archive/export operations.
- Consumers should be able to tell "temporarily disconnected" from "the run is
  closed".

#### 6. External typed protocol adapter

External control surfaces should speak a declared protocol, not scrape internal
state.

- Implement an ACP-style or equivalent typed third-party protocol so IDEs,
  external orchestrators, and dashboards can observe/control v3 through a
  stable contract.
- The protocol should expose stream subscription, read-model queries, and
  command submission without leaking internal storage layout.
- Protocol adapters should advertise capabilities and version compatibility,
  rather than assuming every client understands every event/control shape.
- Keep protocol conformance tests with golden streams and command examples.

#### 7. Control commands re-enter through normal kernel ingress

Observation can be external; authority must remain internal.

- A control command from an external protocol should become an ordinary kernel
  operation with `op_id`, authority checks, capability/grant checks, CAS, and
  idempotency.
- Do not let an observer mutate workflow state by writing directly to a
  projection, stream store, or adapter-local state.
- The protocol may help a client construct the command, but the kernel remains
  the source of truth for whether it applies.
- This keeps observe/control compatible with Part A idempotency, L1/L7
  authorization, and L10 federation boundaries.

### Operational observability, cost, and trace outputs

Source: the §7 open-list addendum that promotes Observability to a first-class
concern and calls out cost tracking as an output. This is adjacent to the
Observe seam, but not the same thing: Observe defines how external consumers
see a run; operational observability defines what the system records as durable
facts about cost, latency, traces, and resource use.

#### 1. Observability facts are operational outputs

Cost, trace, latency, and resource usage should not be only dashboard side
effects.

- Record run/step/actor/gate/resource metrics as durable facts with source,
  timestamp, version, and aggregation scope.
- Preserve the difference between canonical workflow facts and operational
  telemetry. Telemetry can guide trust, cost, and governance decisions, but it
  must not masquerade as the authoritative workflow transcript.
- Keep attribution: metrics should identify the actor, definition version,
  model/prompt/build version, runtime provider, gate/evaluator, and child link
  where relevant.
- Make missing telemetry explicit for high-value runs; silent metric gaps make
  later trust and cost decisions misleading.

#### 2. Cost ledger and roll-ups

Cost tracking needs a stable home before it becomes an autonomy or governance
input.

- Track token spend, model/API cost, runtime/sandbox cost, connector/credential
  cost, and human-review cost where those are available.
- Roll up costs across child workflows, retries, gates, and external
  providers while preserving per-source attribution.
- Keep cost records tied to the version/config that produced them, so later
  comparisons between model/prompt/gate choices are meaningful.
- Cost data should feed L13 trust/autonomy and future L14 governance, but it
  should be collected below those layers as operational evidence.

#### 3. Trace lineage for diagnosis and eval

Traces should help explain why a run behaved as it did without becoming a
second source of truth.

- A trace should link operations, gate invocations, process executions,
  external calls, child lifecycle events, and evidence refs by causation and
  correlation ids.
- Traces should be reconstructable from durable records where possible, or
  clearly marked as sampled/partial operational telemetry where not.
- Eval and conformance harnesses should be able to consume traces for
  diagnostics while treating transcript/evidence records as the deeper
  authority.
- Retention/purge rules should specify what happens to operational metrics and
  traces when the canonical run record is archived or purged.
