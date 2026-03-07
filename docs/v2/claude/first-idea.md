# Pairflow v2 — High-Level Architecture Brainstorm

Status: early ideation
Date: 2026-03-07
Context: [pairflow-architecture-v2-note.md](../../pairflow-architecture-v2-note.md)

## The v1 problem in one sentence

v1 is a **hardcoded pipeline**: implementer -> reviewer -> converge -> approve -> commit. All policy, gate, and routing logic is baked into this single pipe. Any change (extra step, different review mode, external interaction) means drilling into the pipe.

## Proposed v2 metaphor: Workflow as a Graph

The bubble is not a fixed pipeline but a **running workflow instance**, where:

| v1 concept | v2 concept | Description |
|---|---|---|
| Bubble | **Flow Instance** | A concrete running unit of work ("bubble" name can stay, but internal model is a flow) |
| Hardcoded state machine | **Step Graph** | DAG-like steps, each declaring: what it does, trigger, output |
| Convergence policy | **Gate** (plugin) | A step type that blocks until conditions are met |
| `pairflow pass` | **Transition** | Moving from one step to the next — the graph edge |
| — | **Channel** | Communication channel (tmux, Slack, GitHub comment, etc.) |
| — | **Role Scope** | An agent's permission boundary within a given step |

## Main entities

```
+---------------------------------------------------+
|  Workflow Definition (YAML/TOML)                  |
|  +------+    +------+    +------+    +------+     |
|  | Step |--->| Step |--->| Gate |--->| Step |     |
|  |implmt|    |review|    |convg.|    |commit|     |
|  +------+    +------+    +------+    +------+     |
|       |           |                               |
|       v           v                               |
|  +------------------------+                       |
|  |  Help Subflow          |  (from any step)      |
|  |  Slack/GH/Human        |                       |
|  +------------------------+                       |
+---------------------------------------------------+

Flow Instance = Workflow Def + Bubble State + Artifacts
```

## 5 key design ideas

### 1. Workflow Definition = declarative config

v1 behavior would be a "preset":

```yaml
workflow: pairflow-v1
steps:
  - id: implement
    role: implementer
    agent: codex
    on_complete: review

  - id: review
    role: reviewer
    agent: claude
    on_pass: implement  # rework loop
    on_clean: converge_gate

  - id: converge_gate
    type: gate
    plugins: [p0p1-check, p2-round-gate, test-pass, role-alternation]
    on_pass: approval

  - id: approval
    type: human_gate
    on_approve: commit
    on_rework: implement

  - id: commit
    type: action
    action: git-commit-merge
```

This allows someone to write a completely different workflow (e.g. "3-agent review", "doc-only with human comprehension gate", etc.) without modifying the core.

### 2. Help Subflow — reachable from any step

In any step, the agent can signal: "I'm stuck". This is not `WAITING_HUMAN` but a **subflow spawn**:

```
implement step -> agent: "stuck on auth logic"
  +-> Help Subflow spawns
       +- Channel: Slack DM -> @felho "Quick Q: how does auth work here?"
       +- Channel: GitHub comment (if started from issue)
       +- Timeout: 30min -> fallback to tmux human inbox
  answer arrives -> inject back into implement step context
```

The key: the help subflow is **channel-agnostic** — the flow definition specifies which channels to try and in what order.

### 3. Channels as abstraction

```
Channel interface:
  - send(message, recipient) -> delivery_id
  - poll() -> messages[]
  - supports: [text, file_ref, structured_data]

Implementations:
  - TmuxChannel (v1 default)
  - SlackChannel
  - GitHubIssueChannel
  - WebhookChannel
```

This is the key to starting a bubble from a GitHub issue and having interaction flow back and forth. The running flow instance tracks which channel has which active conversation.

### 4. Role Scope — agent permission boundary

Each step declares what the agent is allowed to do:

```yaml
- id: implement
  role: implementer
  allowed_commands: [pass, ask-human]
  denied_commands: [bubble-delete, bubble-approve, converged]
  file_scope: "bubble-worktree-only"
```

No need for paranoid security — a **command allowlist per step** is sufficient. The CLI checks: "you are in the `implement` step, `converged` is not allowed from here." This prevents the "implementer accidentally deletes bubble" scenario from the v2 note.

### 5. Policy plugins — composable gates

Instead of a monolithic convergence policy:

```
Gate = Plugin[]

Plugin interface:
  - id: string
  - evaluate(flow_state, artifacts) -> pass | block(reason)

Built-in plugins:
  - p0p1-block         # P0/P1 finding blocks
  - p2-round-gate      # P2 blocks early, allows late
  - test-pass           # test command must succeed
  - role-alternation    # reviewer role must alternate
  - doc-completeness    # PRD section checker
  - review-verification # accuracy-critical schema check
```

A gate passes when **all plugins return pass**. Adding a new rule = new plugin, not modifying existing logic.

## Sandbox / remote execution

This is an **executor** layer concern:

```
Executor interface:
  - provision(workspace_spec) -> sandbox_handle
  - exec(sandbox_handle, command) -> result
  - sync_artifacts(sandbox_handle, direction) -> void
  - health() -> status

Implementations:
  - LocalExecutor (v1: git worktree + tmux)
  - SSHExecutor (Mac Mini)
  - ContainerExecutor (Docker/Firecracker)
  - CloudSandboxExecutor (E2B, Daytona, etc.)
```

The flow instance doesn't know where it runs — the executor abstracts that. Artifact sync is needed for disconnection handling (eventual consistency between sandbox and host).

## v2 entity model summary

| Entity | Responsibility |
|---|---|
| **Workflow Definition** | Declarative step graph + presets |
| **Flow Instance** (bubble) | Running state, artifacts, transcript |
| **Step** | A unit of work (implement, review, action) |
| **Gate** | Blocking condition, composed of plugins |
| **Plugin** | A single policy rule, composable |
| **Channel** | Communication channel abstraction |
| **Subflow** | Embedded mini-workflow (help, escalation) |
| **Role Scope** | Agent permission boundary per step |
| **Executor** | Sandbox/environment abstraction |

## What can stay from v1

- The "bubble" concept and name (flow instance = bubble)
- Git worktree isolation (one executor implementation)
- NDJSON transcript (append-only audit log)
- Artifact-based communication
- CLI-first interface
- Human approval gate

v2 would not throw away v1 — v1 behavior would be the **default workflow preset**.
