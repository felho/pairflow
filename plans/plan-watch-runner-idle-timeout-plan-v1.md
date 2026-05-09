---
artifact_type: plan
artifact_id: plan_plan_watch_runner_idle_timeout_v1
plan_id: plan-watch-runner-idle-timeout-plan-v1
created_on: "2026-05-09"
title: "Plan Watch Runner Idle Timeout Plan"
status: approved
plan_status: approved
prd_ref: null
owners:
  - "felho"
task_order:
  - 1-planwatch-runner-idle-timeout
active_task_id: 1-planwatch-runner-idle-timeout
last_completed_task_id: null
archive_group: 2026-05-09-plan-watch-runner-idle-timeout-plan-v1
task_tracker:
  - task_id: 1-planwatch-runner-idle-timeout
    task_path: plans/tasks/1-planwatch-runner-idle-timeout.md
    status: approved
    notes: "Replace fixed plan-watch runner lifetime timeout with activity-reset idle timeout."
---

# Plan: Plan Watch Runner Idle Timeout

## Objective

Make `pairflow plan watch` robust for long-running active Codex runner sessions
by replacing the current fixed runner lifetime timeout with an activity-reset
idle timeout.

This plan exists because the required change expands the repo config contract
under `[plan_watch.runner]` and changes runner timeout/failure taxonomy
semantics. Those contract-boundary changes require a Plan -> Task chain rather
than a task-only artifact.

## Done Definition

1. Plan-watch-managed runner processes are not automatically killed solely
   because total process runtime exceeds a fixed duration while output activity
   continues.
2. Automatic termination happens after a configured idle window with no observed
   child stdout or stderr activity.
3. Idle expiry is reported with a distinct runner reason code while preserving
   explicit user abort classification.
4. `[plan_watch.runner].idle_timeout_seconds` is accepted, validated, and mapped
   to runner invocation policy, with a default of 15 minutes.
5. Existing non-timeout runner failure surfaces remain behaviorally unchanged.
6. Focused tests prove idle reset, idle expiry, explicit abort preservation,
   config validation, command wiring, and normal/watch run-now parity.

## Capability Closure

| Capability Claim | Closure Classification | Activation Path | Repo-Provided Boundary | External Prerequisites | Last-Mile Proof |
|---|---|---|---|---|---|
| Operators can run `pairflow plan watch` without Pairflow automatically killing an active runner because of fixed wall-clock lifetime. | end_to_end | `pairflow plan watch ... --follow-runner` starts a plan-watch runner using repo config and runner defaults. | Pairflow CLI, repo config parser, plan-watch loop/run-now wiring, runner process wrapper, and runner result classification. | Codex or configured runner must emit stdout/stderr activity while doing useful work. Ctrl-C remains an operator abort. | The implementation task owns focused unit/CLI tests plus `pnpm build`; manual reproduction can be added if output buffering behavior is uncertain. |
| Operators can configure the automatic idle window. | end_to_end | Add `idle_timeout_seconds` under `[plan_watch.runner]` in `pairflow.toml`. | Repo config schema and plan-watch runner config mapping. | Operator supplies a positive integer when overriding the default. | The implementation task owns repo config and CLI wiring tests proving default and override behavior. |

## Guiding Principles

1. Business invariant: active runner output is evidence that the runner is still
   doing useful work, so automatic timeout policy must be idle-based rather than
   total-runtime-based.
2. Control model: Pairflow owns automatic runner lifetime policy for
   plan-watch-managed child processes. Operator interrupts remain user intent
   and must remain distinct from automatic idle timeout.
3. Read-path rule: runner activity is observed only from the child process
   stdout/stderr pipes owned by the runner process wrapper.
4. Forbidden fallback: do not use `codex resume` or persisted Codex `thread_id`
   as the primary recovery path for a timeout that should not have fired.
5. Allowed resolution path: implement an activity-reset idle timer in the
   process wrapper and propagate a distinct idle-timeout classification through
   existing runner result surfaces.
6. Missing-data rule: if no stdout or stderr activity is observed for the
   configured idle window, Pairflow may terminate the child and report idle
   timeout.
7. Sequencing note: there is one bounded task because producer observation,
   config acceptance, reason-code classification, and CLI wiring must ship
   together to avoid mixed timeout semantics.

## Contract Anchors

1. Source anchors:
   - `src/v11/defaults/planWatch/agentRunnerBridgeDefaults.ts`
   - `src/v11/application/planWatch/internal/runner/agentRunnerBridge.ts`
   - `src/v11/application/planWatch/internal/runner/agentRunnerBridgeContract.ts`
   - `src/v11/application/planWatch/internal/runner/codexAgentRunnerBridgeResult.ts`
   - `src/config/repoConfig.ts`
   - `src/cli/commands/plan/watch.ts`
   - `pairflow.toml`
2. Closed baseline terms:
   - `AGENT_RUNNER_ABORTED` remains explicit stop-signal/operator abort.
   - Non-zero exit, output failure, file I/O failure, and spawn failure remain
     separate runner result surfaces.
   - Plan/task/bubble metadata remains routing authority; runner artifacts are
     diagnostic evidence, not route authority.
3. Authorized reinterpretation:
   - The runner timeout policy for plan-watch-managed agents changes from fixed
     total lifetime to idle timeout.
   - New config field `idle_timeout_seconds` is the operator-facing contract for
     that automatic idle window.
4. Drift status: planned and explicit. No existing route authority or bubble
   lifecycle authority is reinterpreted.

## Current Status

### Completed Work

1. The incident analysis identified that active Codex output was present before
   the session interruption, while current runner timeout handling does not
   reset on child output.
2. A task artifact exists for the bounded implementation slice.
3. ReviewSpec identified the need for this parent plan because the task changes
   runtime config contract semantics.

### Open Work

| Task | Status | Purpose |
|---|---|---|
| `1-planwatch-runner-idle-timeout` | draft | Implement idle timeout semantics, config support, reason-code classification, CLI wiring, and tests. |

### Deferred Work

1. Automatic `codex resume <thread_id>` handling.
2. Detaching the child runner on Ctrl-C.
3. Bubble watchdog timeout behavior changes.
4. A separate hard maximum wall-clock cap. If added later, it must be a distinct
   config field and distinct result classification.

## Coverage Map

| Done Definition Item | Covered By |
|---|---|
| Active output prevents automatic kill | `1-planwatch-runner-idle-timeout` |
| Idle expiry after no stdout/stderr activity | `1-planwatch-runner-idle-timeout` |
| Distinct idle reason and preserved abort | `1-planwatch-runner-idle-timeout` |
| `idle_timeout_seconds` config and 15 minute default | `1-planwatch-runner-idle-timeout` |
| Existing runner failures preserved | `1-planwatch-runner-idle-timeout` |
| Focused and broad verification | `1-planwatch-runner-idle-timeout` |

## Validation Strategy

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. Focused tests for:
   - runner bridge idle reset/expiry/abort behavior,
   - Codex runner result classification,
   - repo config validation,
   - CLI plan-watch runner config wiring,
   - normal watch and `--run-now` parity.
5. `pnpm test`
6. `pnpm build`

## Assumptions

1. Codex JSON mode emits stdout activity during useful work often enough for a
   15 minute idle window to distinguish active work from a stuck runner.
2. Stderr output is also runner activity for this plan's idle policy.
3. The current plan-watch runner backend remains `codex`; this plan does not
   add a new backend.
