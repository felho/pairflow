# Pairflow v2 — Architecture Plan

Status: draft
Date: 2026-03-07
Inputs: first-idea.md, hivemind-learnings.md, bob-learnings.md, comparison-with-codex.md

---

## 1. Design Philosophy

Three principles guide v2:

1. **The workflow is the boss.** Agents execute steps within a workflow — they do not control the workflow. The kernel owns all state transitions.
2. **Declare, don't hardcode.** Workflow behavior is defined in templates, not baked into the engine. v1 is just a preset.
3. **Enforce at the boundary.** The kernel decides policy; hooks and CLI enforce it. No agent can bypass the rules because the system sits between the agent and every action.

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
 +----------+----------------------+-----------------------  +
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

Step --can spawn--> Subflow (help, escalation)

WorkflowInstance --runs on--> Executor (local, SSH, container, cloud)
```

### 3.2 Entity Definitions

| Entity | What it is | Key fields |
|---|---|---|
| **WorkflowTemplate** | Declarative definition of a workflow | `id`, `steps[]`, `gates[]`, `policies[]`, `defaults` |
| **WorkflowInstance** | A running bubble | `id`, `template_id`, `state`, `current_step`, `round`, `artifacts`, `transcript` |
| **Step** | A unit of work in the template | `id`, `type`, `role`, `actor`, `agent_config`, `transitions`, `subflows` |
| **Role** | A position in the workflow | One of: `implementer`, `reviewer`, `operator`, `human` |
| **Actor** | A concrete executor | One of: `claude`, `codex`, `user`, `bot` (extensible) |
| **AgentConfig** | Decorator on an Actor | `persona`, `skills[]`, `mode`, `approach`, `custom_keys{}` |
| **CapabilityProfile** | Permission matrix | Maps `(Role, State) -> allowed_actions[]` |
| **EventEnvelope** | Normalized input event | `id`, `ts`, `source_channel`, `type`, `sender`, `payload` |
| **Channel** | I/O adapter | `id`, `type` (cli/tmux/slack/github/webhook), `config` |
| **Gate** | Decision point between steps | `id`, `gate_type`, `policies[]` |
| **PolicyModule** | A single rule | `id`, `evaluate(state, artifacts) -> allow/block/defer` |
| **GateDecision** | Aggregated policy result | `outcome` (allow/block/defer), `reasons[]`, `blocking_policies[]` |
| **Subflow** | Embedded mini-workflow | `id`, `trigger`, `steps[]`, `return_to` |
| **Executor** | Runtime environment | `type` (local/ssh/container/cloud), `provision()`, `exec()`, `sync()` |
| **Findings** | Validate->fix artifact | `id`, `step_id`, `items[]` (severity, description, status) |
| **Trust Profile** | Auto-resolve thresholds | `gate_id`, `threshold`, `history[]`, `override_rate` |
| **Transcript** | Append-only event log | NDJSON with provenance: `run_id`, `step_id`, `agent_config`, `model_id` |

---

## 4. Boundary Contracts

This is the core of the architecture — what each component owns, what it exposes, and what it must never do.

### 4.1 Channel <-> Event Normalizer

```
BOUNDARY: Channel Adapter -> Event Normalizer -> Kernel

Channel Adapter owns:
  - Protocol-specific I/O (Slack API, GitHub webhooks, tmux send-keys, stdin)
  - Authentication / authorization with external service
  - Retry logic for external delivery

Channel Adapter produces:
  - Raw input in channel-native format

Event Normalizer owns:
  - Translating channel-native input -> EventEnvelope
  - Validating envelope schema
  - Attaching source_channel metadata

Event Normalizer guarantees:
  - Every event the kernel receives is a valid EventEnvelope
  - The kernel never sees channel-specific data structures

Channel Adapter must NEVER:
  - Modify workflow state
  - Make policy decisions
  - Route events to specific steps (that is the kernel's job)
```

**Example — same user action, three channels:**

```
Slack message: "@pairflow approve b_legal_01"
  -> EventEnvelope {
       type: "APPROVAL_DECISION",
       source_channel: "slack",
       sender: { role: "human", id: "felho" },
       payload: { instance_id: "b_legal_01", decision: "approve" }
     }

CLI command: pairflow bubble approve --id b_legal_01
  -> EventEnvelope {
       type: "APPROVAL_DECISION",
       source_channel: "cli",
       sender: { role: "human", id: "felho" },
       payload: { instance_id: "b_legal_01", decision: "approve" }
     }

GitHub comment: "/approve" on issue #42
  -> EventEnvelope {
       type: "APPROVAL_DECISION",
       source_channel: "github",
       sender: { role: "human", id: "felho" },
       payload: { instance_id: "b_legal_01", decision: "approve" }
     }
```

The kernel processes all three identically.

### 4.2 Kernel <-> Capability Engine

```
BOUNDARY: Kernel -> Capability Engine -> accept/reject

Kernel asks:
  "Can this sender perform this action in this state?"
  -> canPerform(role, state, action) -> boolean

Capability Engine owns:
  - The Role x State -> allowed_actions matrix
  - Loading capability profiles from workflow template
  - Logging permission denials

Capability Engine guarantees:
  - Every action is checked before execution
  - Denied actions produce a structured rejection (not silent ignore)

Capability Engine must NEVER:
  - Execute actions (it only says yes/no)
  - Modify state
  - Know about specific policy logic (that is the Policy Engine's job)
```

**Example — CapabilityProfile matrix:**

```
                  | RUNNING        | WAITING_HUMAN  | READY_FOR_APPROVAL |
------------------+----------------+----------------+--------------------+
implementer       | pass           | -              | -                  |
                  | ask-human      |                |                    |
------------------+----------------+----------------+--------------------+
reviewer          | pass           | -              | -                  |
                  | ask-human      |                |                    |
                  | converged      |                |                    |
------------------+----------------+----------------+--------------------+
operator (human)  | reply          | reply          | approve            |
                  | stop           | stop           | request-rework     |
                  | resume         | resume         | stop               |
------------------+----------------+----------------+--------------------+
```

When an implementer tries to run `converged`:
```
Kernel -> canPerform("implementer", "RUNNING", "converged")
Capability Engine -> DENIED: "converged is not allowed for role implementer in state RUNNING"
Kernel -> rejects event, logs denial, notifies sender
```

### 4.3 Kernel <-> Policy Engine

```
BOUNDARY: Kernel -> Policy Engine -> GateDecision

Kernel asks:
  "Should this gate allow transition?"
  -> evaluateGate(gate_id, instance_state, artifacts) -> GateDecision

Policy Engine owns:
  - Loading and running PolicyModules for the gate
  - Aggregating individual module results into a GateDecision
  - Supporting gate types: hard, human, llm-judge, composite

Policy Engine guarantees:
  - Each PolicyModule runs independently (no cross-module dependencies)
  - GateDecision always has one of three outcomes: allow, block, defer
  - Block includes reasons and which modules blocked
  - Defer means "uncertain - escalate to human"

Policy Engine must NEVER:
  - Execute state transitions (it only advises)
  - Interact with channels (the kernel routes the decision)
  - Depend on channel-specific context
```

**Example — convergence gate evaluation:**

```
Gate: converge_gate
  PolicyModules: [p0p1-block, p2-round-gate, test-pass, role-alternation]

Evaluation:
  p0p1-block:       allow  (no P0/P1 findings in latest review)
  p2-round-gate:    block  (round 2, P2 findings present)
  test-pass:        allow  (tests green)
  role-alternation: allow  (reviewer alternated)

Aggregation:
  Any block -> GateDecision = BLOCK
  Reasons: ["p2-round-gate: P2 findings in round 2 block convergence (rounds 2-3)"]
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
  -> Channel adapter notifies human: "Low-confidence approval - please review"
```

### 4.4 Kernel <-> Transition Engine

```
BOUNDARY: validated event -> Transition Engine -> new state + side effects

Transition Engine owns:
  - Step routing: which step is next based on the current step's transition rules
  - Loop control: incrementing round counters, checking max_rounds
  - Subflow spawning: creating and returning from help/escalation subflows
  - Event dispatch: writing to transcript, notifying the next actor

Transition Engine guarantees:
  - All state changes are atomic (state is never partially updated)
  - Every transition is logged in the transcript with provenance fields
  - Subflows return to the exact point they were spawned from

Transition Engine must NEVER:
  - Evaluate policy (it asks the Policy Engine)
  - Check permissions (it asks the Capability Engine)
  - Communicate with channels directly (it routes through the kernel)
```

**Example — step routing for a review pass with findings:**

```
Current: Step "review", round 3
Event: PASS with findings [P2: "Missing edge case test"]

Transition Engine:
  1. Check: any P0/P1? -> No
  2. Route: review.on_pass -> "implement" (rework loop)
  3. Increment round: 3 -> 4
  4. Update active_role: reviewer -> implementer
  5. Write transcript entry with provenance
  6. Dispatch: notify implementer actor with findings artifact
```

### 4.5 Kernel <-> State Layer

```
BOUNDARY: Kernel -> State Layer -> persisted state

State Layer owns:
  - Reading and writing instance state (current step, round, role, etc.)
  - Appending to transcript (NDJSON)
  - Managing artifacts (findings, review docs, done packages)
  - Locking (preventing concurrent state mutations)

State Layer guarantees:
  - Atomic reads and writes (no partial state visible)
  - Append-only transcript (nothing is deleted or modified)
  - Artifact immutability (once written, an artifact version is permanent)

State Layer exposes:
  - getState(instance_id) -> InstanceState
  - setState(instance_id, new_state) -> void (atomic)
  - appendTranscript(instance_id, entry) -> void
  - writeArtifact(instance_id, artifact) -> artifact_ref
  - readArtifact(artifact_ref) -> artifact
  - acquireLock(instance_id) -> lock_handle
  - releaseLock(lock_handle) -> void

State Layer must NEVER:
  - Make policy decisions based on state content
  - Trigger transitions
  - Know about workflow semantics (it is a dumb store)
```

The state layer is intentionally dumb — it is a persistence API. This makes it swappable: file-based for v2.0, SQLite later, cloud-backed later. The kernel never knows which backend is active.

### 4.6 Kernel <-> Executor

```
BOUNDARY: Kernel -> Executor -> agent process management

Executor owns:
  - Provisioning workspaces (git worktree, clone, container, cloud sandbox)
  - Starting and stopping agent processes
  - Syncing artifacts between host and sandbox
  - Health monitoring and liveness checks

Executor exposes:
  - provision(workspace_spec) -> sandbox_handle
  - start(sandbox_handle, agent_actor, agent_config) -> process_handle
  - stop(process_handle) -> void
  - sync(sandbox_handle, direction: push | pull) -> void
  - health(sandbox_handle) -> { status, last_active }

Executor guarantees:
  - Agent identity survives process restarts (session-independent binding)
  - Artifacts are synced before agent starts and after agent stops
  - Health check returns status even if agent process is unresponsive

Executor must NEVER:
  - Interpret agent output as state transitions (that goes through EventEnvelope)
  - Make policy decisions
  - Modify workflow state directly
```

### 4.7 Hook Integration <-> Kernel

```
BOUNDARY: Claude Code Hooks -> Kernel (via capability + policy check)

Hooks are the enforcement layer — they sit between the agent and any tool use.

PreToolUse hook:
  1. Agent attempts an action (e.g., edit file, run command)
  2. Hook intercepts
  3. Hook asks kernel: canPerform(agent_role, current_state, action)?
  4. If denied -> hook blocks the action, returns explanation to agent
  5. If allowed -> hook permits, optionally injects context

PostToolUse hook:
  1. Agent completed an action
  2. Hook notifies kernel (changelog, artifact tracking)
  3. Kernel updates state if needed

UserPromptSubmit hook:
  1. Before agent processes user input
  2. Hook injects pending messages, reminders, subflow responses

KEY PRINCIPLE:
  Hooks ENFORCE decisions made by the kernel.
  Hooks do NOT make policy decisions themselves.
  All decision logic lives in PolicyModules inside the kernel.
```

---

## 5. Step Types

Steps are the building blocks of a workflow. Each has a `type` that determines its behavior.

### 5.1 Type: action

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

### 5.2 Type: loop

Repeats between steps until a gate passes or max_rounds is hit.

```yaml
- id: review-loop
  type: loop
  max_rounds: 8
  steps:
    - id: implement
      role: implementer
      actor: codex
    - id: review
      role: reviewer
      actor: claude
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

This is how v1's implement-review cycle would be expressed. The loop is explicit, not baked into the engine.

### 5.3 Type: gate

A pure decision point with no agent execution. Evaluates policies and routes.

```yaml
- id: converge_gate
  type: gate
  gate_type: composite
  policies: [p0p1-block, p2-round-gate, test-pass, role-alternation]
  transitions:
    on_allow: approval
    on_block: review-loop  # back to loop
    on_defer: human_review
```

### 5.4 Type: human_gate

A gate that always requires human input. Used for approval checkpoints.

```yaml
- id: approval
  type: human_gate
  require: [done_package, diff_summary]
  transitions:
    on_approve: commit
    on_rework: review-loop
    on_reject: cancelled
```

### 5.5 Type: subflow

An embedded mini-workflow that can be triggered from any step and returns to the trigger point.

```yaml
subflows:
  - id: help
    trigger: agent_signals_stuck
    steps:
      - id: ask
        channel_priority: [slack, github, tmux]
        timeout: 30m
        fallback: human_inbox
      - id: inject
        action: inject_answer_into_parent_step
    return_to: trigger_step  # resume exactly where we left off
```

```
Any step --- agent stuck ---> +-----------+
                              |   help    |
                              | subflow   |
                              |           |
                              | ask human |
                              | (Slack -> |
                              |  GH ->    |
                              |  tmux)    |
                              |           |
                              |  inject   |
                              |  answer   |
                              +-----+-----+
                                    |
                             return to step
```

---

## 6. The v1 Preset

The entire v1 pairflow behavior expressed as a v2 workflow template:

```yaml
template:
  id: pairflow-v1
  description: "Classic two-agent implement/review loop with human approval"

  roles:
    implementer: { default_actor: codex }
    reviewer: { default_actor: claude }

  capability_profile:
    implementer:
      RUNNING: [pass, ask-human]
    reviewer:
      RUNNING: [pass, ask-human, converged]
    operator:
      RUNNING: [reply, stop, resume]
      WAITING_HUMAN: [reply, stop, resume]
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
        - p2-round-gate:
            block_rounds: [2, 3]
        - test-pass
        - role-alternation

  subflows:
    - id: help
      trigger: ask-human
      steps:
        - id: route-question
          channel_priority: [tmux]
        - id: wait-reply
          timeout: ${watchdog_timeout_minutes}m
        - id: inject-answer
          action: inject_into_parent

  executor:
    type: local
    workspace: worktree
```

This template produces exactly the same behavior as v1's hardcoded state machine, but now every aspect is configurable.

---

## 7. Example: Alternative Workflow — 3-Agent Doc Review

To show the template system's flexibility, here is a completely different workflow:

```yaml
template:
  id: doc-review-3agent
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
          agent_config: { mode: builder }
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
        - unanimous-pass:
            require_all: [reviewer_a, reviewer_b, reviewer_c]
```

Same engine, completely different workflow. No code changes needed.

---

## 8. Data Flow: End-to-End Example

Walking through a complete interaction to show how all boundaries work together.

**Scenario:** Agent is in the `implement` step and runs `pairflow pass --summary "Auth module done" --ref auth.diff`

```
                                 AGENT (in tmux)
                                      |
                                      | pairflow pass --summary "..." --ref auth.diff
                                      v
                              +---------------+
                              |  CLI Adapter  |
                              |  (Channel)    |
                              +-------+-------+
                                      | raw: { cmd: "pass", summary: "...", ref: "auth.diff" }
                                      v
                              +---------------+
                              |    Event      |
                              |  Normalizer   |
                              +-------+-------+
                                      | EventEnvelope {
                                      |   type: "PASS",
                                      |   source_channel: "cli",
                                      |   sender: { role: "implementer", actor: "codex" },
                                      |   payload: { summary: "...", refs: ["auth.diff"] }
                                      | }
                                      v
                         +------------------------+
                         |    WORKFLOW KERNEL      |
                         |                        |
                         |  1. Capability check   |
                         |     canPerform(        |
                         |       "implementer",   |
                         |       "RUNNING",       |
                         |       "pass"           |
                         |     ) -> ALLOWED       |
                         |                        |
                         |  2. Transition Engine  |
                         |     current: implement |
                         |     event: PASS        |
                         |     route: -> review   |
                         |     round: 2 -> 2      |
                         |     role: impl -> rev  |
                         |                        |
                         |  3. State Layer        |
                         |     write artifact     |
                         |     append transcript  |
                         |     update state       |
                         |                        |
                         |  4. Dispatch           |
                         |     notify reviewer    |
                         |     via executor       |
                         +------------+-----------+
                                      |
                              +-------v-------+
                              |   Executor    |
                              |   (local)     |
                              |               |
                              | tmux send-keys|
                              | to reviewer   |
                              | pane          |
                              +---------------+
```

**What if the agent tried `pairflow converged` instead?**

```
Step 1 (Capability check):
  canPerform("implementer", "RUNNING", "converged") -> DENIED

  -> Kernel rejects immediately
  -> CLI returns: "Error: 'converged' is not allowed for role 'implementer'
                   in state 'RUNNING'. Only the reviewer can call converged."
  -> Transcript logs: { type: "CAPABILITY_DENIED", action: "converged",
                         role: "implementer" }

  Agent gets a clear, actionable error.
```

---

## 9. Subflow Example: Help Request

**Scenario:** The implementer is stuck on how the auth module works. It calls `pairflow ask-human --question "How does the OAuth refresh work in this codebase?"`.

```
  +------------------------------------------------------+
  |              implement step (RUNNING)                 |
  |                                                      |
  |  Agent: "stuck on OAuth refresh"                     |
  |  -> pairflow ask-human --question "..."              |
  |                                                      |
  |  Kernel:                                             |
  |    1. Capability check: ask-human allowed            |
  |    2. Save parent step context (implement, round 3)  |
  |    3. Spawn help subflow                             |
  |    4. Transition: RUNNING -> WAITING_HUMAN           |
  |                                                      |
  +----------------------+-------------------------------+
                         |
                         v
  +------------------------------------------------------+
  |               help subflow                           |
  |                                                      |
  |  Step 1: route-question                              |
  |    channel_priority: [slack, github, tmux]           |
  |                                                      |
  |    Try Slack:                                        |
  |      -> DM @felho: "Quick Q from bubble b_legal_01: |
  |         How does the OAuth refresh work in this      |
  |         codebase?"                                   |
  |      -> Waiting for reply...                         |
  |                                                      |
  |  Step 2: wait-reply                                  |
  |    Slack reply arrives:                              |
  |      "Check src/auth/refresh.ts - it uses a          |
  |       sliding window with 15min expiry"              |
  |                                                      |
  |  Step 3: inject-answer                               |
  |    -> Answer packaged as EventEnvelope               |
  |    -> Injected into implement step context           |
  |                                                      |
  +----------------------+-------------------------------+
                         |
                         v
  +------------------------------------------------------+
  |              implement step (RUNNING again)           |
  |                                                      |
  |  Context now includes:                               |
  |    "Human answered: Check src/auth/refresh.ts -      |
  |     it uses a sliding window with 15min expiry"      |
  |                                                      |
  |  Agent continues implementation with new context     |
  |                                                      |
  +------------------------------------------------------+
```

The subflow is self-contained. The kernel manages the parent step pause/resume. The channel adapter handles the Slack-specific protocol. If Slack times out, it falls through to GitHub, then tmux.

---

## 10. Policy Module Interface

```typescript
interface PolicyModule {
  id: string;
  description: string;

  /** Evaluate this policy against the current state and artifacts. */
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
  details?: Record<string, unknown>; // policy-specific data
}
```

**Example — p2-round-gate policy:**

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
        details: {
          p2_count: latestReview.findings.filter(
            f => f.severity === "P2"
          ).length
        }
      };
    }

    // Round 4+: P2 alone does not block
    return {
      outcome: "allow",
      reason: `P2 findings in round ${round} - allowed (round 4+)`
    };
  }
};
```

**Example — llm-judge gate for auto-approval:**

```typescript
const changeRiskAssessment: PolicyModule = {
  id: "change-risk-assessment",
  description: "LLM-based risk assessment for auto-approval",

  async evaluate(ctx) {
    const diff = ctx.artifacts.latest("diff");
    const confidence = await llmJudge.assessRisk(diff, ctx.instance);

    if (confidence >= ctx.gate.trust_profile.threshold) {
      return {
        outcome: "allow",
        reason: `Risk confidence ${confidence} >= threshold`
      };
    }

    if (confidence >= 0.3) {
      return {
        outcome: "defer",
        reason: `Risk confidence ${confidence} - uncertain, recommend human review`,
        details: { confidence, risk_areas: llmJudge.lastRiskAreas }
      };
    }

    return {
      outcome: "block",
      reason: `High risk detected (confidence ${confidence})`
    };
  }
};
```

---

## 11. What v2 Does NOT Include (Explicit Non-Goals)

To keep scope manageable, these are deferred:

| Deferred | Why | When |
|---|---|---|
| Session management / backup | Not core workflow | After v2 stable |
| Full SDLC orchestration (Bob scope) | Too broad for one release | Separate initiative |
| Parallel-step-loop with dependency graph | Complex scheduling | v2.1 |
| Intelligence layer (calibration, antipatterns) | Needs data first | v2.2+ |
| Team / multi-user | Single user tool for now | v3 |
| Cloud sync | Local-first principle | v3 |
| Web UI | CLI-first, tmux sufficient | Phase 3 carry-over |

---

## 12. Migration Path: v1 -> v2

v2 does not break v1. The migration is:

1. **v2.0-alpha:** New kernel runs alongside v1. The `pairflow-v1` template is auto-generated from current hardcoded logic. Both can run, user chooses.

2. **v2.0:** v1 commands are thin wrappers that create EventEnvelopes and pass them to the v2 kernel. CLI surface stays identical. Users notice nothing — but the engine underneath is v2.

3. **v2.1+:** New features (custom templates, new channels, LLM-judge gates) are only available through v2 APIs. v1 preset continues to work.

No big bang rewrite. The kernel is new; everything else is adapted incrementally.

---

## 13. Summary: What Changed vs First Idea

| First idea | Architecture plan | What changed |
|---|---|---|
| "Step Graph" (DAG-like) | Step types: action, loop, gate, human_gate, subflow | Explicit type taxonomy instead of implicit graph |
| "Plugin evaluate -> pass/block" | PolicyModule -> allow/block/**defer** | Three outcomes, not two |
| "Role Scope" (per-step allowlist) | CapabilityProfile (Role x State matrix) | Richer permission model |
| No event normalization | EventEnvelope between channel and kernel | Clean boundary |
| "Channel interface" (sketch) | Channel Adapter -> Event Normalizer -> Kernel | Two-stage pipeline with normalization |
| "Executor interface" (sketch) | Full boundary contract with provision/start/stop/sync/health | Concrete API |
| No hook integration model | Hooks enforce, kernel decides | Clear responsibility split |
| Flat entity list | Entity map with relationships | Structural clarity |
