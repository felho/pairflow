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

## Block B — Distribution

### L7 — Grants and credentials

Source: the §4 L0c row's two-level secret-ref pattern, plus the roadmap's L7
rule that credentials never travel. L0c may carry credential-related references
as run intent, but credential resolution itself is owned by L7.

#### 1. Secret refs resolve only at the runtime boundary

Persisted run intent should carry secret references, never raw credentials. The
runtime boundary resolves those references into concrete credentials only for the
adapter/provider that is allowed to use them.

- `AgentConfig` and transcript provenance should remain safe to store and audit.
- Credential injection should be scoped by grant, actor/provider, operation, and
  argument-level predicate where relevant.
- Missing or unavailable credentials must be explicit and fail-closed, not a
  silent adapter fallback.

### L9 — Wait conditions, liveness, and recovery

Source: the L0d anti-pattern ("do not mark failed as the only recovery") plus
the later gastown/watchdog addenda. This is not part of the L0d baseline
lifecycle; it becomes relevant when the runtime needs to distinguish a dead
executor from a merely stuck workflow and recover without losing durable work.

#### 1. Watchdog and dead-executor recovery

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

## Block C — Agent-native

### L11 — Memory and durable agent identity

Source: later synthesis addenda that sharpen L0c with provider-specific memory
failure cases. This is not part of L0c's run-intent resolver; it belongs with the
agent-native layer where agent identity, memory scopes, and activations become
first-class.

#### 1. Memory must be an adapter-independent kernel port

Memory triggers and retrieval should not be hidden inside a specific actor
adapter hook. If memory depends on a provider-specific CLI hook, changing actor
provider can silently turn memory off.

- Memory should be resolved through an explicit kernel-owned port or observe
  seam, independent of Codex / Claude Code / OpenCode adapter details.
- "Memory unavailable" should be an explicit observable state, not a silent
  no-op.
- Adapter-specific memory stores may exist, but the workflow contract should
  name the memory scope and failure mode outside the adapter.

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

This belongs to the broader identity/durability decomposition topic, alongside
timeline / attempt / commit / recorded-effect / memory identity.
