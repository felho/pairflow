# Pairflow v2 — Joint Architecture Plan

Status: draft
Date: 2026-03-07
Sources: claude/pairflow-v2-architecture-plan.md, codex/pairflow-v2-architecture-plan.md, session discussion

---

## 1. Design Philosophy

1. **The workflow is the boss.** Agents execute steps within a workflow — they do not control the workflow. The kernel owns all state transitions.
2. **Declare, don't hardcode.** Workflow behavior is defined in templates, not baked into the engine. v1 is just one preset.
3. **Enforce at the boundary.** The kernel owns policy and capability decisions; CLI, hooks, and channel adapters are enforcement adapters that relay decisions. No agent can bypass the rules because the kernel sits between the agent and every action.
4. **Auditability by design.** Every event, decision, and artifact is traceable via provenance fields and append-only transcript.
5. **Evolvability.** Session store, intelligence layer, and team features can be added later without migration breaks.

---

## 2. System Overview

```
 +---------------------------------------------------------+
 |                    CHANNEL ADAPTERS                      |
 |   CLI  .  tmux  .  Slack  .  GitHub Issues  .  Webhook  |
 +------------------------+--------------------------------+
                          | raw input
                          v
                +-------------------+
                |  Event Normalizer |
                |  -> EventEnvelope |
                +--------+----------+
                         | normalized event
                         v
 +-----------------------------------------------------------+
 |                    WORKFLOW KERNEL                         |
 |                                                           |
 |  +-------------+  +-------------+  +------------------+  |
 |  |  Template   |  |  Instance   |  |  Capability      |  |
 |  |  Registry   |  |  Manager    |  |  Engine          |  |
 |  |             |  |             |  |  (Role x State)  |  |
 |  +-------------+  +------+------+  +--------+---------+  |
 |                          |                   |            |
 |                   +------v-------------------v---------+  |
 |                   |       Transition Engine             |  |
 |                   |  step routing . subflow spawn       |  |
 |                   |  loop control . event dispatch      |  |
 |                   +--------------+---------------------+  |
 |                                  |                        |
 |              +-------------------v------------------+     |
 |              |          Policy Engine               |     |
 |              |  +------+ +------+ +------+          |     |
 |              |  | P0P1 | | Test | | Role |  ...     |     |
 |              |  | Block| | Pass | | Alt. |          |     |
 |              |  +--+---+ +--+---+ +--+---+          |     |
 |              |     +--------+--------+              |     |
 |              |              v                        |     |
 |              |        GateDecision                  |     |
 |              |     allow / block / defer            |     |
 |              +--------------------------------------+     |
 |                                                           |
 +----------+----------------------+-------------------------+
            |                      |
            v                      v
 +----------------+    +---------------------+
 |  State Layer   |    |  Executor Layer     |
 |  (unified API) |    |  Local . SSH . Cloud|
 +----------------+    +---------------------+
```

---

## 3. Entity Model

### 3.1 Entity Map

```
WorkflowTemplate --defines--> Step[] + Gate[] + PolicyModule[]
       |
       | instantiates
       v
WorkflowInstance (bubble) --tracks--> current Step, round, artifacts
       |
       | assigns per step
       v
Role <--filled by--> Actor
  |                     |
  |                     +-- AgentConfig (persona, skills, mode, approach)
  |
  +-- governed by --> CapabilityProfile (Role x State -> allowed actions)

Step --guarded by--> Gate --evaluates--> PolicyModule[]
                                              |
                                              v
                                        GateDecision (allow / block / defer)

Channel --normalizes to--> EventEnvelope --consumed by--> Kernel

Step --can spawn--> Subflow (help, escalation, delegation)

WorkflowInstance --runs on--> Executor (local, SSH, container, cloud)
```

### 3.2 Entity Definitions

| Entity | What it is | Key fields |
|---|---|---|
| **WorkflowTemplate** | Declarative workflow definition | `id`, `version`, `steps[]`, `gates[]`, `policies[]`, `capability_profiles`, `defaults` |
| **WorkflowInstance** | A running bubble | `id`, `template_id`, `state`, `current_step`, `round`, `artifacts`, `transcript` |
| **Step** | A unit of work in the template | `id`, `type`, `role`, `actor`, `agent_config`, `transitions`, `subflows` |
| **Role** | A position in the workflow | One of: `implementer`, `reviewer`, `operator`, `human` (extensible) |
| **Actor** | A concrete executor | One of: `claude`, `codex`, `user`, `bot` (extensible) |
| **AgentConfig** | Decorator on an Actor | `persona`, `skills[]`, `mode`, `approach`, `custom_keys{}` |
| **CapabilityProfile** | Permission matrix | Maps `(Role, State) -> allowed_actions[]` |
| **EventEnvelope** | Normalized input event | `event_id`, `ts`, `flow_id`, `source_channel`, `event_type`, `actor_id`, `actor_role`, `payload`, `correlation_id`, `causation_id` |
| **Channel** | I/O adapter | `id`, `type` (cli/tmux/slack/github/webhook), `config` |
| **Gate** | Decision point between steps | `id`, `gate_type` (hard/human/llm-judge/composite), `policies[]` |
| **PolicyModule** | A single composable rule | `id`, `evaluate(context) -> allow/block/defer` |
| **GateDecision** | Aggregated policy result | `outcome` (allow/block/defer), `reasons[]`, `blocking_policies[]` |
| **Subflow** | Embedded mini-workflow | `id`, `trigger`, `type` (blocking/non-blocking), `steps[]`, `return_to` |
| **Executor** | Runtime environment | `type` (local/ssh/container/cloud), `provision()`, `start()`, `stop()`, `sync()`, `health()` |
| **Findings** | Validate->fix artifact | `id`, `step_id`, `schema_version`, `items[]` (severity, description, status) |
| **Artifact** | Typed work product | `artifact_id`, `flow_id`, `step_id`, `artifact_type`, `schema_version`, `created_by`, `content_ref` |
| **Trust Profile** | Auto-resolve thresholds (future) | `gate_id`, `threshold`, `history[]`, `override_rate` |
| **Transcript** | Append-only event log | NDJSON with provenance: `run_id`, `step_id`, `agent_config`, `model_id` |

---

## 4. Boundary Contracts

Each boundary contract defines: provider, consumer, input/output, invariants, and error handling.

### 4.1 BC-01: WorkflowTemplate -> Kernel

```
BOUNDARY: Template Loader -> Workflow Kernel

Template Loader owns:
  - Parsing template files (YAML)
  - Schema validation (steps, transitions, gates, capabilities)
  - Structural verification

Template Loader guarantees:
  - Every transition references an existing step
  - No unreachable steps from the start state
  - Gate references only registered gate types
  - Capability profiles reference only defined roles and states

Output:
  - TemplateLoadResult { accepted: true, template } OR
  - TemplateLoadResult { accepted: false, errors[] }

Error codes:
  - template_invalid_format: parse error
  - template_rejected: validation failed (with specific errors)
```

### 4.2 BC-02: Channel -> Event Normalizer

```
BOUNDARY: Channel Adapter -> Event Normalizer -> Kernel

Channel Adapter owns:
  - Protocol-specific I/O (Slack API, GitHub webhooks, tmux send-keys, stdin)
  - Authentication / authorization with external service
  - Retry logic for external delivery

Event Normalizer owns:
  - Translating channel-native input -> EventEnvelope
  - Validating envelope schema
  - Assigning event_id (unique)
  - Attaching source_channel metadata

Event Normalizer guarantees:
  - Every event the kernel receives is a valid EventEnvelope
  - The kernel never sees channel-specific data structures
  - event_id is globally unique

Channel Adapter must NEVER:
  - Modify workflow state
  - Make policy decisions
  - Route events to specific steps (that is the kernel's job)
```

**Example — same user action, three channels:**

```
Slack message: "@pairflow approve b_legal_01"
  -> EventEnvelope {
       event_id: "evt_01a",
       flow_id: "b_legal_01",
       event_type: "APPROVAL_DECISION",
       source_channel: "slack",
       actor_role: "human",
       actor_id: "felho",
       payload: { decision: "approve" },
       correlation_id: "corr_771",
       causation_id: null
     }

CLI: pairflow bubble approve --id b_legal_01
  -> EventEnvelope { ...same structure, source_channel: "cli"... }

GitHub comment: "/approve" on issue #42
  -> EventEnvelope { ...same structure, source_channel: "github"... }
```

The kernel processes all three identically.

### 4.3 BC-03: Event Normalizer -> Kernel (Command Dispatch)

```
BOUNDARY: Event Normalizer -> Kernel

Kernel guarantees:
  - Only normalized EventEnvelopes are processed
  - Idempotent: same event_id re-sent does not cause duplicate transitions
  - Every dispatch is traced via correlation_id in the transcript

Error codes:
  - flow_not_found: unknown flow_id
  - flow_not_active: flow is in terminal state (DONE/FAILED/CANCELLED)
  - event_duplicate: event_id already processed (safe to ignore)
  - transition_denied: event not valid in current state
```

### 4.4 BC-04: Kernel -> Capability Engine

```
BOUNDARY: Kernel -> Capability Engine -> accept/reject

Kernel asks:
  canPerform(role, state, action) -> { decision: allow | deny, reason_code }

Capability Engine owns:
  - The Role x State -> allowed_actions matrix
  - Loading capability profiles from workflow template
  - Logging permission denials

Capability Engine guarantees:
  - Every action is checked before execution
  - Denied actions produce a structured rejection (not silent ignore)
  - Every denial is logged to transcript

Capability Engine must NEVER:
  - Execute actions (it only says yes/no)
  - Modify state
  - Know about specific policy logic (that is the Policy Engine's job)

Error codes:
  - capability_denied: action not in allowed list for this role+state
  - role_mismatch: actor's role does not match required role for step
  - state_mismatch: flow not in expected state
```

**Example — CapabilityProfile matrix:**

```
                  | RUNNING              | WAITING_HUMAN  | HELP_PENDING   | READY_FOR_APPROVAL |
------------------+----------------------+----------------+----------------+--------------------+
implementer       | pass                 | -              | -              | -                  |
                  | request-help         |                |                |                    |
                  | request-decision     |                |                |                    |
------------------+----------------------+----------------+----------------+--------------------+
reviewer          | pass                 | -              | -              | -                  |
                  | request-help         |                |                |                    |
                  | request-decision     |                |                |                    |
                  | converged            |                |                |                    |
------------------+----------------+----------------+----------------+--------------------+
operator (human)  | reply          | reply          | reply          | approve            |
                  | stop           | stop           | stop           | request-rework     |
                  | resume         | resume         |                | stop               |
------------------+----------------+----------------+----------------+--------------------+
```

HELP_PENDING is distinct from WAITING_HUMAN:
- WAITING_HUMAN = blocked on a human gate or policy defer (kernel-initiated)
- HELP_PENDING = agent explicitly asked for help via subflow (agent-initiated)

### 4.5 BC-05: Kernel -> Policy Engine

```
BOUNDARY: Kernel -> Policy Engine -> GateDecision

Kernel asks:
  evaluateGate(gate_id, instance_state, artifacts) -> GateDecision

Policy Engine owns:
  - Loading and running PolicyModules for the gate
  - Aggregating individual module results into a GateDecision
  - Supporting gate types: hard, human, llm-judge, composite

Policy Engine guarantees:
  - Each PolicyModule runs independently (no cross-module dependencies)
  - GateDecision has one of three outcomes: allow, block, defer
  - Block includes reasons and which modules blocked
  - Defer means "uncertain — escalate to human"

Policy Engine must NEVER:
  - Execute state transitions (it only advises)
  - Interact with channels (the kernel routes the decision)
  - Depend on channel-specific context

Invariants:
  - block always includes a non-empty findings list with reasons
  - defer is only valid for gates that allow human escalation
```

**Example — convergence gate evaluation:**

```
Gate: converge_gate
  PolicyModules: [p0p1-block, p2-round-gate, test-pass, role-alternation]

Evaluation:
  p0p1-block:       allow  (no P0/P1 in latest review)
  p2-round-gate:    block  (round 2, P2 findings present)
  test-pass:        allow  (tests green)
  role-alternation: allow  (reviewer alternated)

Aggregation:
  Any block -> GateDecision = BLOCK
  Reasons: ["p2-round-gate: P2 findings in round 2 block convergence"]
  Blocking policies: ["p2-round-gate"]

  -> Kernel keeps instance in review loop
```

**Example — defer outcome:**

```
Gate: approval_gate (type: llm-judge)
  PolicyModules: [change-risk-assessment]

Evaluation:
  change-risk-assessment:
    confidence: 0.45  (touches auth + billing code)
    -> DEFER: "Low confidence on change risk. Recommend human review."

  -> Kernel transitions to WAITING_HUMAN with the defer reason
  -> Channel adapter notifies human
```

### 4.6 BC-06: Kernel -> State Layer

```
BOUNDARY: Kernel -> State Layer -> persisted state

State Layer owns:
  - Reading and writing instance state (current step, round, role, etc.)
  - Appending to transcript (NDJSON)
  - Managing artifacts (findings, review docs, done packages)
  - Locking (preventing concurrent state mutations)

State Layer exposes:
  - getState(instance_id) -> { state: InstanceState, version: uint64 }
  - setState(instance_id, expected_version, new_state) -> { ok: true, new_version } | { ok: false, current_version }
  - appendTranscript(instance_id, entry) -> void
  - writeArtifact(instance_id, artifact) -> artifact_ref
  - readArtifact(artifact_ref) -> artifact
  - acquireLock(instance_id) -> lock_handle
  - releaseLock(lock_handle) -> void

State Layer guarantees:
  - Atomic reads and writes (no partial state visible)
  - Compare-and-swap: transition only succeeds if current state matches expected
  - Append-only transcript (nothing is deleted or modified)
  - Artifact immutability (once written, a version is permanent)
  - Every state change gets a monotonic timestamp

State Layer must NEVER:
  - Make policy decisions based on state content
  - Trigger transitions
  - Know about workflow semantics (it is a dumb store)
```

The state layer is intentionally dumb — a persistence API. Swappable: file-based for v2.0, SQLite later, cloud-backed later.

### 4.7 BC-07: Kernel -> Artifact Store

```
BOUNDARY: Kernel -> Artifact Store

Artifact contract minimum:
  artifact_id: art_...
  flow_id: flow_...
  step_id: review
  artifact_type: finding | review_pack | done_package | diff | message
  schema_version: 1
  created_by: reviewer
  content_ref: path or inline ref

Invariants:
  - Artifact type is bound to a schema (validated on write)
  - Only artifacts belonging to the flow can be referenced within that flow
  - Artifacts are immutable once written; new versions create new artifact_ids
```

### 4.8 BC-08: Kernel -> Executor

```
BOUNDARY: Kernel -> Executor -> agent process management

Executor owns:
  - Provisioning workspaces (git worktree, clone, container, cloud sandbox)
  - Starting and stopping agent processes
  - Syncing artifacts between host and sandbox
  - Health monitoring and liveness checks

Executor exposes:

  Runtime plane (agent process lifecycle):
  - provision(workspace_spec) -> sandbox_handle
  - start(sandbox_handle, agent_actor, agent_config) -> process_handle
  - stop(process_handle) -> void
  - sync(sandbox_handle, direction: push | pull) -> void
  - health(sandbox_handle) -> { status: ok | timeout | infra_error, last_active }

  Control plane relay (agent -> host kernel communication):
  - relay(sandbox_handle, event_envelope, op_id) -> relay_result
  - resume(resume_token) -> resume_result

  Note: relay() is the channel through which agent CLI commands (pairflow pass,
  pairflow converged, etc.) reach the host kernel. The executor does not interpret
  these commands — it forwards EventEnvelopes to the kernel and returns the result.
  This is distinct from runtime operations (start/stop/sync) which the executor
  owns directly.

Executor guarantees:
  - Agent identity survives process restarts (session-independent binding)
  - Artifacts are synced before agent starts and after agent stops
  - Health check returns status even if agent process is unresponsive
  - Every relay() call has a unique op_id; replaying the same op_id is a no-op (idempotent)
  - resume() restores executor state from the last acknowledged op_id

Executor must NEVER:
  - Interpret agent output as state transitions (that goes through EventEnvelope)
  - Make policy decisions
  - Modify workflow state directly

Remote executor model (Resume Token):
  - Every pairflow CLI command in the sandbox is relayed to the host kernel via relay(op_id)
  - The host kernel is the single source of truth for state
  - op_id guarantees idempotency: if the same op_id is sent twice, the host skips it
  - On disconnect, the agent blocks until the host is reachable again
  - On reconnect, the executor calls resume(resume_token) to restore position
  - The host responds with the last processed op_id; the client retries unacknowledged ops

Future extension (WAL — write-ahead log):
  - A client-side WAL can be added in front of relay() calls later
  - WAL would let the agent continue working offline, queuing relay() calls locally
  - On reconnect, the WAL replays queued calls as normal relay(op_id) calls
  - The host kernel stays unchanged — it just sees relay() calls with op_ids
  - This is a backwards-compatible addition that does not require kernel changes

  WAL replay invariants (required for safe offline operation):
  - revalidate_on_replay: every replayed op must pass capability and policy checks
    at replay time, not just at queue time (policies may have changed while offline)
  - op_id idempotency: replaying a previously acknowledged op_id is a no-op
  - stale-intent rejection: if the workflow has moved to a different step or state
    since the op was queued, the replay must fail with stale_intent error
    (e.g., agent queued a "pass" for step implement, but workflow already moved to approval)
  - side-effect idempotency: operations triggered by relay() (artifact writes,
    transcript appends) must be safe to re-execute with the same op_id
```

### 4.9 BC-09: Kernel -> Channel (Outbound)

```
BOUNDARY: Kernel -> Channel Adapter (outbound delivery)

Kernel requests:
  send(message, recipient, correlation_id) -> delivery_id

Channel Adapter returns:
  delivery_status(delivery_id) -> delivered | pending | failed

Invariants:
  - Channel failure must NOT break kernel state integrity
  - Failed delivery goes to a retry queue
  - Delivery status is observable for debugging
```

### 4.10 BC-10: Kernel -> Subflow Engine

```
BOUNDARY: Kernel -> Subflow Engine

Kernel requests:
  spawnSubflow(parent_flow_id, parent_step_id, subflow_def, trigger_context)

Subflow Engine guarantees (all types):
  - Parent flow_id and subflow_id are linked
  - Subflow lifecycle is tracked in transcript

Blocking subflow guarantees:
  - Parent step is paused until subflow completes or times out
  - Subflow returns via help_resolved event with validated answer payload
  - No automatic "success" return without an actual answer
  - On timeout: on_failure handler runs (typically escalate to human)

Non-blocking subflow guarantees:
  - Message is dispatched; parent continues immediately
  - No return value — parent does not wait
  - Delivery failure is logged but does not block parent

Subflow types:
  - blocking: parent step paused until subflow returns
  - non-blocking (notify): message sent, parent continues immediately
```

---

## 5. Enforcement Model

Enforcement is layered. Not all agents support hooks, so the architecture does not depend on them.

```
+---------------------------------+
|  Level 1: PROMPT INJECTION      |  <- universal, advisory
|  System prompt rules for agent  |
+---------------------------------+
               |
+---------------------------------+
|  Level 2: CLI VALIDATION        |  <- universal, hard enforcement
|  pairflow CLI checks with       |     (backbone of the system)
|  kernel CapabilityProfile       |
+---------------------------------+
               |
+---------------------------------+
|  Level 3: HOOKS (optional)      |  <- agent-specific, strongest
|  Claude Code PreToolUse etc.    |     where available
+---------------------------------+
               |
+---------------------------------+
|  Level 4: SANDBOX ISOLATION     |  <- agent-agnostic, hard
|  Container/VM file scope        |     (Executor layer)
+---------------------------------+
```

| Level | What it enforces | Works with any agent? | Strength |
|---|---|---|---|
| Prompt injection | Role rules in system prompt | Yes | Advisory (agent can ignore) |
| **CLI validation** | pairflow commands checked against CapabilityProfile | **Yes** | **Hard (command rejected)** |
| Hooks | File scope, pre-action blocking, context injection | Only agents with hook API (Claude Code) | Hard + context injection |
| Sandbox isolation | File system, network, process isolation | Yes (Executor level) | Hard (physical boundary) |

**The default and backbone is Level 2 (CLI validation).** Every `pairflow` command goes through the kernel's Capability Engine. This is agent-agnostic — any agent that calls the CLI gets checked.

Hooks are a **bonus layer** for agents that support them. They add:
- File scope enforcement (block edits outside worktree)
- Context injection (inject review feedback at prompt start)
- Pre-action check (deny before the agent even runs the command — faster feedback)

```
KEY PRINCIPLE:
  Hooks ENFORCE decisions made by the kernel.
  Hooks do NOT make policy decisions themselves.
  All decision logic lives in PolicyModules inside the kernel.
```

---

## 6. Step Types

### 6.1 Type: action

A single execution unit. Agent does work, produces output, transitions.

```yaml
- id: implement
  type: action
  role: implementer
  actor: codex
  transitions:
    on_complete: review
```

```
+----------+   complete   +----------+
|implement |------------->|  review  |
| (action) |              |          |
+----------+              +----------+
```

### 6.2 Type: loop

Repeats between steps until a gate passes or max_rounds is hit.

```yaml
- id: review-loop
  type: loop
  max_rounds: 8
  steps:
    - id: implement
      role: implementer
    - id: review
      role: reviewer
  gate: converge_gate
  transitions:
    on_gate_pass: approval
    on_max_rounds: human_tiebreak
```

```
         +-------------------------+
         |      review-loop        |
         |                         |
         |  +---------+  +------+  |   gate    +----------+
         |  |implement|->|review|--+--pass---->| approval |
         |  +----^----+  +--+---+  |           +----------+
         |       |          |      |
         |       +--block---+      |   max      +----------+
         |                         +--rounds-->| tiebreak |
         +-------------------------+           +----------+
```

### 6.3 Type: gate

A pure decision point — no agent execution. Evaluates policies and routes.

```yaml
- id: converge_gate
  type: gate
  gate_type: composite
  policies: [p0p1-block, p2-round-gate, test-pass, role-alternation]
  transitions:
    on_allow: approval
    on_block: review-loop
    on_defer: human_review
```

### 6.4 Type: human_gate

A gate that always requires human input.

```yaml
- id: approval
  type: human_gate
  require: [done_package, diff_summary]
  transitions:
    on_approve: commit
    on_rework: review-loop
    on_reject: cancelled
```

### 6.5 Type: parallel-human-queue (reserved, not in v2.0)

Multiple items processed in parallel, each requiring a human decision. Useful for PRD review findings where the human decides on many items concurrently instead of sequentially.

```yaml
# Reserved — not implemented in v2.0, planned for v2.1
- id: process-findings
  type: parallel-human-queue
  items_from: generate-findings.output
  per_item:
    enrich: recommendation-agent
    human_decision:
      ui: decision-card
    apply: updater-agent
```

### 6.6 Subflows

Embedded mini-workflows. Two variants:

**Blocking subflow** — parent step paused until answer arrives:

```yaml
subflows:
  - id: help
    trigger: request-help
    type: blocking
    steps:
      - id: route-question
        channel_priority: [slack, github, tmux]
        timeout: 30m
        fallback: human_inbox
      - id: inject-answer
        action: inject_into_parent
    return_to: trigger_step
    on_timeout: escalate_to_human
```

**Non-blocking notification** — parent continues immediately:

```yaml
subflows:
  - id: notify-operator
    trigger: notify
    type: non-blocking
    steps:
      - id: send
        channel_priority: [slack, tmux]
    # No return_to — parent does not pause
```

---

## 7. State Machine

```
  [*] --> CREATED
  CREATED --> RUNNING : start
  RUNNING --> WAITING_HUMAN : human gate / policy defer
  WAITING_HUMAN --> RUNNING : decision received
  RUNNING --> HELP_PENDING : help subflow spawned
  HELP_PENDING --> RUNNING : help resolved
  RUNNING --> READY_FOR_APPROVAL : all gates passed
  READY_FOR_APPROVAL --> RUNNING : rework requested
  READY_FOR_APPROVAL --> APPROVED : approve
  APPROVED --> COMMITTING : commit action
  COMMITTING --> DONE : success
  RUNNING --> FAILED : unrecoverable error
  WAITING_HUMAN --> CANCELLED : user cancel
  HELP_PENDING --> CANCELLED : user cancel
  RUNNING --> CANCELLED : user cancel
```

WAITING_HUMAN vs HELP_PENDING:
- **WAITING_HUMAN**: the kernel paused the flow because a human gate or policy defer requires a decision. The agent is not active.
- **HELP_PENDING**: the agent asked for help via a subflow. The parent step is paused, but the subflow is actively routing the question through channels. Once answered, the agent resumes exactly where it left off.

---

## 8. Policy Module Interface

```typescript
interface PolicyModule {
  id: string;
  description: string;
  evaluate(context: PolicyContext): PolicyResult;
}

interface PolicyContext {
  instance: WorkflowInstance;
  gate: Gate;
  artifacts: ArtifactStore;     // read-only access
  transcript: TranscriptReader; // read-only access
}

interface PolicyResult {
  outcome: "allow" | "block" | "defer";
  reason: string;
  details?: Record<string, unknown>;
}
```

**Example — p2-round-gate:**

```typescript
const p2RoundGate: PolicyModule = {
  id: "p2-round-gate",
  description: "Block convergence on P2 findings in early rounds (2-3)",

  evaluate(ctx) {
    const round = ctx.instance.round;
    const latestReview = ctx.artifacts.latest("review-pass");
    const hasP2 = latestReview?.findings.some(f => f.severity === "P2");

    if (!hasP2) {
      return { outcome: "allow", reason: "No P2 findings" };
    }
    if (round >= 2 && round <= 3) {
      return {
        outcome: "block",
        reason: `P2 findings in round ${round} block convergence (rounds 2-3)`,
        details: { p2_count: latestReview.findings.filter(f => f.severity === "P2").length }
      };
    }
    return { outcome: "allow", reason: `P2 in round ${round} - allowed (round 4+)` };
  }
};
```

**Composability verified.** Independent plugins handle complex cross-round rules because each plugin has full read access to history (artifacts, transcript). No cross-plugin dependencies needed. Tested scenarios:
- P1 followup requiring verified-fix flag in next round
- Consecutive clean pass counter that resets on new P1
- Round-dependent P2 thresholds
- Role alternation across rounds

All expressible as independent PolicyModules with `artifacts.atRound()` and `instance.round_role_history` access.

---

## 9. The v1 Preset

The entire v1 pairflow behavior as a v2 workflow template:

```yaml
template:
  id: pairflow-v1
  version: 0.1.0
  description: "Classic two-agent implement/review loop with human approval"

  roles:
    implementer: { default_actor: codex }
    reviewer: { default_actor: claude }

  capability_profile:
    implementer:
      RUNNING: [pass, request-help, request-decision]
    reviewer:
      RUNNING: [pass, request-help, request-decision, converged]
    operator:
      RUNNING: [reply, stop, resume]
      WAITING_HUMAN: [reply, stop, resume]
      HELP_PENDING: [reply, stop]
      READY_FOR_APPROVAL: [approve, request-rework, stop]

  steps:
    - id: review-loop
      type: loop
      max_rounds: 8
      steps:
        - id: implement
          role: implementer
          agent_config:
            mode: builder
            approach: systematic
        - id: review
          role: reviewer
          agent_config:
            mode: critic
            approach: thorough
      gate: converge_gate
      transitions:
        on_gate_pass: approval
        on_max_rounds: human_tiebreak

    - id: human_tiebreak
      type: human_gate
      transitions:
        on_approve: approval
        on_rework: review-loop

    - id: approval
      type: human_gate
      require: [done_package]
      transitions:
        on_approve: commit
        on_rework: review-loop

    - id: commit
      type: action
      action: git-commit-merge

  gates:
    - id: converge_gate
      gate_type: composite
      policies:
        - p0p1-block
        - p2-round-gate: { block_rounds: [2, 3] }
        - test-pass
        - role-alternation

  subflows:
    - id: help
      trigger: request-help
      type: blocking
      steps:
        - id: route-question
          channel_priority: [tmux]
        - id: wait-reply
          timeout: ${watchdog_timeout_minutes}m
        - id: inject-answer
          action: inject_into_parent

    - id: decision
      trigger: request-decision
      type: blocking
      steps:
        - id: route-decision
          channel_priority: [tmux, slack]
          payload: { type: yes_no, question: "${payload.question}" }
        - id: wait-reply
          timeout: ${watchdog_timeout_minutes}m
        - id: inject-answer
          action: inject_into_parent

  executor:
    type: local
    workspace: worktree
```

---

## 10. Example: Alternative Workflow — 3-Agent Doc Review

Demonstrates template flexibility — completely different workflow, same engine:

```yaml
template:
  id: doc-review-3agent
  version: 0.1.0
  description: "Three reviewers for high-stakes documents"

  roles:
    author: { default_actor: claude }
    reviewer_a: { default_actor: codex }
    reviewer_b: { default_actor: claude }
    reviewer_c: { default_actor: claude }

  steps:
    - id: draft
      type: action
      role: author
      agent_config:
        mode: builder
        approach: thorough
        skills: [technical-writing]
      transitions:
        on_complete: parallel-review

    - id: parallel-review
      type: loop
      max_rounds: 4
      steps:
        - id: review-a
          role: reviewer_a
          agent_config: { mode: critic, approach: adversarial }
        - id: review-b
          role: reviewer_b
          agent_config: { mode: critic, approach: systematic }
        - id: review-c
          role: reviewer_c
          agent_config: { mode: critic, approach: exploratory }
        - id: consolidate
          role: author
          action: merge-findings
        - id: revise
          role: author
      gate: doc-converge
      transitions:
        on_gate_pass: human-review
        on_max_rounds: human-review

    - id: human-review
      type: human_gate
      require: [doc-summary, all-findings, revision-log]
      transitions:
        on_approve: done
        on_rework: parallel-review

    - id: done
      type: action
      action: finalize-and-commit

  gates:
    - id: doc-converge
      gate_type: composite
      policies:
        - p0p1-block
        - doc-completeness
        - unanimous-pass: { require_all: [reviewer_a, reviewer_b, reviewer_c] }
```

---

## 11. End-to-End Data Flow

**Scenario:** Agent runs `pairflow pass --summary "Auth module done" --ref auth.diff`

```
AGENT (in tmux)
  |
  | pairflow pass --summary "..." --ref auth.diff
  v
CLI Adapter (Channel)
  | raw: { cmd: "pass", summary: "...", ref: "auth.diff" }
  v
Event Normalizer
  | EventEnvelope {
  |   event_id: "evt_42",
  |   flow_id: "b_legal_01",
  |   event_type: "PASS",
  |   source_channel: "cli",
  |   actor_role: "implementer",
  |   actor_id: "codex",
  |   payload: { summary: "Auth module done", refs: ["auth.diff"] },
  |   correlation_id: "corr_42"
  | }
  v
WORKFLOW KERNEL
  |
  | 1. Capability: canPerform("implementer", "RUNNING", "pass") -> ALLOWED
  | 2. Transition: implement -> review, round stays at 2, role: impl -> rev
  | 3. State: write artifact, append transcript (with provenance), update state
  | 4. Dispatch: notify reviewer actor via executor
  v
Executor (local)
  | tmux send-keys to reviewer pane
  v
REVIEWER starts review
```

**Denied action example:**

```
Agent (implementer) runs: pairflow converged

Kernel: canPerform("implementer", "RUNNING", "converged")
  -> DENIED (reason_code: capability_denied)
  -> CLI returns: "Error: 'converged' not allowed for implementer in RUNNING"
  -> Transcript: { type: "CAPABILITY_DENIED", action: "converged", role: "implementer" }
```

---

## 12. Validate -> Fix Flow

```
Kernel -> Validator: run validate
  Validator -> Kernel: findings [P1: "SQL injection", P2: "Missing log"]
    Kernel -> Artifact Store: write finding artifact
    Kernel -> Gate Engine: evaluate
      Gate Engine -> Kernel: BLOCK (P1 open)
        Kernel -> Fixer: run fix (findings_ref)
          Fixer -> Kernel: patch applied
            Kernel -> Validator: re-run validate
              Validator -> Kernel: findings [P2: "Missing log"]
                Kernel -> Gate Engine: evaluate
                  Gate Engine -> Kernel: depends on round (P2 gate)
```

The findings artifact is the contract between validate and fix. The pattern is universal: same structure for code review findings, doc review findings, and step validation findings.

---

## 13. Non-Goals (Explicit)

| Deferred | Why | When |
|---|---|---|
| Session management / backup | Not core workflow | After v2 stable |
| Full SDLC orchestration (Bob scope) | Too broad | Separate initiative |
| Parallel-human-queue step type | Reserved in step type taxonomy, not implemented yet | v2.1 |
| Parallel-step-loop with dependency graph | Complex scheduling | v2.1 |
| Intelligence layer (calibration, antipatterns) | Needs data first | v2.2+ |
| Team / multi-user | Single user tool for now | v3 |
| Cloud sync | Local-first principle | v3 |
| Web UI | CLI-first, tmux sufficient | v2 Phase 3 |
| LLM-judge gates | Schema-supported in v2.0 (gate_type: llm-judge is valid), runtime-enabled from v2.1. Needs stable policy engine first. | v2.1 |

---

## 14. Migration Path: v1 -> v2

### Phase A: Contract Freeze

1. Freeze `workflow-template-v0.1` format
2. Freeze `event-envelope-v0.1` minimum fields (including provenance)
3. Freeze `capability-matrix-v0.1`

### Phase B: Kernel Extraction

1. Centralize CLI command paths into kernel command dispatch
2. Unify capability and policy calls through single engine
3. Make state transitions atomic (compare-and-swap)
4. v1 commands become thin wrappers creating EventEnvelopes

### Phase C: Stage and Gate Expansion

1. Introduce loop as explicit step type (extracting hardcoded review loop)
2. Standardize findings artifact for validate-fix cycles
3. Help subflow with channel routing

### Phase D: Runtime Adapter Expansion

1. Stabilize LocalExecutor behind the Executor interface
2. SSH/remote executor prototype with resume token + op_id idempotency
3. Optional WAL layer for offline agent productivity (future, backwards-compatible)

**Principle:** No big bang rewrite. The kernel is new; everything else is adapted incrementally. v1 CLI surface stays identical throughout.

---

## 15. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Premature complexity — building too much before validating | Phase-based rollout; contract freeze before feature expansion |
| Policy spaghetti — rules scattered across hooks/scripts | Every new rule must be a PolicyModule; hooks only enforce, never decide |
| Channel-specific logic leaking into core | Adapter boundary mandatory; kernel only sees EventEnvelope |
| Remote executor inconsistency | Resume token + op_id idempotency; kernel is single source of truth; agent blocks on disconnect (no split brain) |
| Template validation gaps | BC-01 structural verification: unreachable steps, dangling transitions, unknown gate types all caught at load time |

---

## 16. Decision Summary

1. **v2 core:** Workflow Kernel + Boundary Contracts
2. **First delivery target:** v1 preset runnable on v2 template engine
3. **Enforcement backbone:** CLI validation (agent-agnostic); hooks are optional bonus
4. **Quality bar:** Every boundary has explicit input/output, invariants, and error codes documented
5. **State ownership:** Kernel is the single source of truth; remote executors use resume token + op_id for consistency; state layer is a dumb store
6. **Remote sync:** Resume token (agent blocks on disconnect) first; WAL (agent works offline) is a future backwards-compatible extension with mandatory replay invariants (revalidation, stale-intent rejection, side-effect idempotency)

---

## Note: V2 Policy Internal API Opportunity

As seen in v1 repeat-clean auto-converge hardening, policy behavior currently requires touching multiple low-level layers (trigger evaluation, transition execution, CLI guidance, metrics, compatibility fields). For v2, we should consider a dedicated internal Policy API to reduce cross-cutting complexity:

1. **PolicyContext Builder**
- Centralize state/transcript/config/artifact reads into one canonical policy input object.

2. **PolicyEngine**
- Pure decision layer: `context -> decision`.
- Output should be declarative (`normal_pass | auto_converge | reject`) with reason codes and metadata, independent from IO side effects.

3. **TransitionExecutor**
- Execute the selected decision (append envelopes, write state, dispatch notifications) without re-deciding policy in execution code paths.

4. **ObservabilityAdapter**
- Emit lifecycle metrics, operator guidance, and warnings from one mapping layer to keep policy-to-observability semantics consistent.

5. **CompatibilityAdapter**
- Isolate legacy/new field dual-write and dual-read behavior (append-only schema compatibility) from core policy logic.

Expected benefit:
- Smaller blast radius for policy changes,
- clearer test boundaries (policy unit tests vs transition integration tests),
- less policy drift between protocol behavior, CLI messaging, and metrics.
