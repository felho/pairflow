# PairFlow v2 vs Symphony — Learnings and Comparison

Status: analysis
Date: 2026-03-12
Sources: symphony (github.com/openai/symphony), pairflow-v2-architecture-plan-joint.md

---

## Context

Symphony is an autonomous agent orchestration service (Elixir/OTP) by OpenAI that continuously polls Linear for work, creates isolated per-issue workspaces, and spawns Codex sessions to solve tasks autonomously. This document compares Symphony's operational patterns with the PairFlow v2 architecture plan to identify learnings.

---

## What PairFlow v2 Already Addresses

| Symphony feature | PairFlow v2 equivalent | Status |
|---|---|---|
| **Executor abstraction (SSH, remote)** | BC-08: `Executor` interface — local/SSH/container/cloud | Planned (Phase D) |
| **Policy as Code** | `WorkflowTemplate` YAML + `PolicyModule` interface | Planned, much richer than Symphony |
| **Channel adapter (Slack, GitHub)** | `Channel Adapters` + `Event Normalizer` → `EventEnvelope` | Planned |
| **Idempotent retry (op_id)** | BC-08 `relay(op_id)` + resume token | Planned |
| **Hot-reload workflow** | Not explicit, but `Template Registry` enables it | Partial |
| **Structured agent communication** | `EventEnvelope` protocol, not tmux-based | Planned |

**Verdict:** The v2 architecture covers all major Symphony strengths, and in most cases provides richer solutions (e.g., Capability Engine, Policy Engine, Subflows).

---

## What Is Still Missing — Learnings from Symphony

### 1. Daemon/Poll Mode — Automatic Work Intake

**Symphony:** Continuously polls Linear, automatically picks up and dispatches work. No manual `bubble create` / `bubble start`.

**PairFlow v2:** The plan defines Channel Adapters (GitHub Issues, Slack, Webhook), but exclusively for **incoming events** — not pull-based issue tracker integration. There is no **Poller** or **Scheduler** component in v2.

**Proposal:** A `SchedulerAdapter` or `IssueTrackerPoller` channel type that:
- Periodically queries Linear/GitHub Issues
- Filters candidate issues (label, state, priority)
- Automatically creates `WorkflowInstance` (bubble create + start)
- Manages concurrency limits (like Symphony's `max_concurrent_agents`)

This fits naturally into the v2 framework — the Poller would be another Channel Adapter, sending standard EventEnvelopes to the kernel through the EventNormalizer.

### 2. Bounded Concurrency Management

**Symphony:** Explicit concurrency control:
- `max_concurrent_agents` (global)
- `max_concurrent_agents_by_state` (per-state limit, e.g., max 3 "In Progress")
- `max_concurrent_agents_per_host` (per-SSH-host)
- Dispatch eligibility check: claimed map + running map + retry queue

**PairFlow v2:** No concurrency management in the plan. The `Executor` interface has `provision()`, `start()`, `stop()`, but there is no global dispatcher that limits parallel instances.

**Proposal:** A `DispatchEngine` in the kernel:
```
Kernel
  └── DispatchEngine
        ├── concurrency_limits: { global: 5, per_executor: 2 }
        ├── claimed_instances: Map<flow_id, claim_metadata>
        └── canDispatch(executor, template) -> boolean
```
This becomes essential when the Poller automatically creates instances.

### 3. Multi-Turn Session Continuity

**Symphony:** A single Codex session runs across multiple turns. When a turn completes, Symphony checks the issue state, and if still active, **continues** — preserving prior thread history (but omitting the original task prompt). This allows the agent to self-iterate within a single step.

**PairFlow v2:** The `loop` step type defines rounds, but these always assume **implementer → reviewer** alternation. There is no "agent self-iterates within a step" concept.

**Proposal:** A `max_turns_per_step` config for `action` step types:
```yaml
- id: implement
  type: action
  role: implementer
  max_turns: 5  # Agent can self-iterate up to 5 turns before passing
```
This is useful when the implementer wants to do multiple iterations (e.g., run tests, fix, re-run) before passing.

### 4. Exponential Backoff Retry at the Executor Level

**Symphony:** When an agent process crashes:
- Normal exit → 1 sec retry (continuation check)
- Abnormal exit → exponential backoff (10s → 20s → 40s → ... → max 5min)
- Retry queue: `retry_attempts` map with timer handles

**PairFlow v2:** The `Executor.health()` provides liveness checks, and there is a resume token, but there is no explicit **retry policy** when an agent process dies.

**Proposal:** Add a retry policy to the Executor interface:
```typescript
interface ExecutorRetryPolicy {
  max_retries: number;
  initial_backoff_ms: number;
  max_backoff_ms: number;
  backoff_multiplier: number;
}
```
The kernel would trigger auto-retry based on `health()` → `timeout | infra_error`.

### 5. Stall Detection + Auto-Recovery

**Symphony:** `stall_timeout_ms` config per session. If the agent produces no output for N time, Symphony:
1. Kills the worker process
2. Schedules a retry with exponential backoff
3. If the issue is still active, restarts

**PairFlow v1:** Has watchdog timeout, but transitions to WAITING_HUMAN → requires human intervention.
**PairFlow v2:** No explicit stall detection in the plan.

**Proposal:** Extend the v2 Executor `health()`:
```
health(sandbox_handle) -> {
  status: ok | timeout | infra_error | stalled,
  last_active: timestamp,
  last_output_at: timestamp  // <-- Symphony-inspired
}
```
The kernel could handle this as policy: stall → auto-restart OR stall → human escalation (configurable).

### 6. Issue State Reconciliation

**Symphony:** On every poll tick, **reconciliation** runs:
- Queries the current state of active issues from Linear
- If an issue moved to "Done"/"Cancelled" (someone manually changed it), **automatically stops** the running agent
- This avoids wasted work

**PairFlow v2:** No such concept. When a bubble is running, there is no external "state check" — the bubble always works from its internal state.

**Proposal:** If an Issue Tracker Poller is added, reconciliation is a natural complement. But even without it, this is useful: a `reconcile` step type or periodic kernel check that:
- Queries external state (GitHub Issue state, PR state)
- If divergence is detected (e.g., PR merged, issue closed) → automatically transitions

### 7. Liquid Template-Based Prompt Rendering

**Symphony:** `PromptBuilder` uses a Liquid template engine with `{{ issue.* }}` variables. The prompt lives in the WORKFLOW.md body, fully templated.

**PairFlow v2:** The plan defines `AgentConfig` with `persona`, `skills`, `mode`, `approach` fields, but does not mention an explicit **prompt template engine**.

**Proposal:** Add template support to v2 `Step` definitions:
```yaml
- id: implement
  type: action
  role: implementer
  prompt_template: |
    You are working on: {{ instance.task }}
    Round: {{ instance.round }}
    Previous findings: {{ artifacts.latest("review-pass").findings | json }}
```
This would allow the workflow template to fully control the agent prompt — not just through config fields.

### 8. Terminal Status Dashboard (Built-in Observability)

**Symphony:** `StatusDashboard` — ANSI terminal UI:
- Running agents list with token counts
- Throughput graph
- Retry queue visualization
- Optional Phoenix LiveView web dashboard

**PairFlow v2:** "Web UI" is an explicit non-goal ("CLI-first, tmux sufficient"). The tmux status pane exists, but there is no aggregate dashboard.

**Proposal:** Not necessarily v2 scope, but for the v2.1 web UI the Symphony approach is a good model — a minimal Express endpoint providing JSON API + a simple dashboard. It doesn't need to be over-engineered.

---

## Where PairFlow v2 Is Far Ahead

| Area | PairFlow v2 | Symphony |
|---|---|---|
| **Workflow template system** | Full YAML-based template engine, step types (action, loop, gate, human_gate, subflow), composable gates | Single YAML frontmatter, no template variation |
| **Capability Engine** | Role × State → allowed_actions matrix, enforced at CLI boundary | None — the agent can do anything |
| **Policy Engine** | Composable PolicyModules, block/allow/defer, gate aggregation | None — policy is in the prompt |
| **Subflow system** | Blocking + non-blocking subflows, channel routing, timeout + fallback | None |
| **Boundary Contracts** | 10 explicit BCs, each with input/output/invariants/error codes | No formal boundaries |
| **Multi-channel** | CLI + tmux + Slack + GitHub + Webhook, unified EventEnvelope | Only Linear (input) + terminal (output) |
| **Enforcement model** | 4-level (prompt → CLI → hooks → sandbox) | 1-level (prompt + Codex sandbox policy) |
| **Dual-agent review** | Built-in, the core feature | None — single agent |
| **Findings ontology** | P0-P3, timing, layer, evidence binding | None |
| **WAL / offline agent** | Planned, invariants defined | None |

---

## Summary: Priority-Ranked Learnings

| Priority | Learning | Integration into v2 |
|---|---|---|
| **High** | Issue Tracker Poller (daemon mode) | New Channel Adapter type |
| **High** | Bounded concurrency (global + per-executor limit) | Kernel DispatchEngine |
| **Medium** | Exponential backoff retry policy | Executor interface extension |
| **Medium** | Stall detection + auto-recovery | Executor health() extension + kernel policy |
| **Medium** | External state reconciliation | Periodic kernel check or dedicated step type |
| **Low** | Liquid-style prompt template | Step config extension |
| **Low** | Multi-turn per step (agent self-iteration) | `max_turns_per_step` config |
| **Low** | Aggregate terminal dashboard | v2.1 UI scope |

---

## Conclusion

The v2 architecture is **significantly more sophisticated and well-designed** than Symphony — but Symphony's **operational robustness** (daemon mode, retry, reconciliation, concurrency management) represents a domain where concrete, implementable ideas can be adopted. The best combination: PairFlow v2 architecture + Symphony operational patterns.
