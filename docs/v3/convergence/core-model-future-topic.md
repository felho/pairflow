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
