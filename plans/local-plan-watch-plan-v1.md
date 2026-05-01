---
artifact_type: plan
artifact_id: plan_local_plan_watch_v1
plan_id: local-plan-watch
created_on: "2026-05-01"
title: "Local Plan Watch Plan (V1)"
status: draft
plan_status: draft
prd_ref: null
owners:
  - "felho"
task_order:
  - 1-plan-next-read-model
  - 2-agent-runner-bridge
  - 3-watch-loop
  - 4-pilot-docs
active_task_id: 1-plan-next-read-model
archive_group: 2026-05-01-local-plan-watch
task_tracker:
  - task_id: 1-plan-next-read-model
    task_path: null
    status: not_created
  - task_id: 2-agent-runner-bridge
    task_path: null
    status: not_created
  - task_id: 3-watch-loop
    task_path: null
    status: not_created
  - task_id: 4-pilot-docs
    task_path: null
    status: not_created
---

# Plan: Local Plan Watch (V1)

## Objective

Deliver the first local-control-plane `plan watch` capability for Pairflow so a running local process can observe a plan, detect when the next trusted route becomes available, and invoke an agent-backed `ExecutePairflowPlan` continuation until the plan reaches a settled checkpoint, a human checkpoint, or a real blocker.

V1 is intentionally local-first: it may observe and operate remote bubbles only through the existing laptop/local control-plane routing, but it does not introduce remote-only bubble creation, remote-only plan execution, or a remote supervisor.

## Done Definition

1. Pairflow exposes a deterministic plan-state read model that can resolve the next route for an execution-routed plan from plan metadata, task metadata, persisted bubble linkage, and normalized bubble handler output.
2. Pairflow exposes a local agent-runner bridge that can launch a configured local agent workflow invocation for `ExecutePairflowPlan` with a compact plan-continuation input packet and capture its settled result.
3. Pairflow exposes a local `plan watch` command that polls the read model, records enough run/route ledger state to avoid repeated duplicate invocations, and autonomously invokes the agent-runner bridge when a material new route is available.
4. The watcher does not treat "print a handoff and wait for the operator to run it" as successful automation; textual handoff output is allowed only at real human checkpoints, unsupported runtime blockers, or explicitly configured dry-run mode.
5. Local watch behavior is covered by focused tests for route detection, dedupe, agent-runner invocation, checkpoint handling, and local/remote-bubble boundary behavior.
6. Documentation states the V1 boundary clearly: local control plane required; remote-only plan progression and remote-only bubble creation/start are deferred.

## Guiding Principles

1. Business invariant: the plan should keep moving when the next step is mechanically trustworthy, but it must not weaken existing review gates, Pairflow lifecycle authority, or human approval boundaries.
2. Control model: plan metadata owns sequencing, task metadata owns task-local execution truth, Pairflow owns bubble lifecycle truth, `ExecutePairflowPlan` owns orchestration decisions/delegation, and the plan watcher owns observation, dedupe, and local agent invocation.
3. Read-path rule: the watcher may read plan/task frontmatter, repo-local plan execution artifacts, persisted bubble linkage, and Pairflow status/read-model output; it must consume normalized bubble routing rather than classify raw bubble lifecycle detail itself.
4. Forbidden fallback: do not derive next action from chat history, filename order, operator memory, raw remote clone state, or an inferred "probably next" bubble lifecycle state.
5. Allowed resolution path: deterministic same-authority reconciliation is allowed when it follows the existing `ExecutePairflowPlan` metadata contract; cross-authority conflicts must fail closed to a checkpoint.
6. Missing-data rule: missing or malformed plan/task metadata routes to metadata repair or a human checkpoint; missing remote runtime availability routes to fail-closed remote status handling, not local guessing.
7. Sequencing / boundary note:
   - producer-first rule: implement the plan-state read model and agent-runner bridge before the polling watcher.
   - downstream consume families that remain separate: plan/task artifact authoring stays with `CreatePairflowSpec`; bubble lifecycle stays with `UsePairflow`; route selection stays aligned with `ExecutePairflowPlan`.
   - cleanup/recovery timing: duplicate-action suppression and watcher ledger cleanup are included now; remote-only supervisor/recovery is deferred.

## Canonical Contract Anchors

1. Source-of-truth anchors:
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleDocumentBubble.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleImplementationBubble.md`
   - `.claude/skills/UsePairflow/SKILL.md`
   - `docs/remote-bubble-execution.md`
2. Closed canonical elements / terms:
   - `Plan = sequencing authority`
   - `Task = detailed local execution authority`
   - `Pairflow = bubble lifecycle authority`
   - `target_workflow_surface` names stay aligned with `ExecutePairflowPlan`
   - started remote bubbles are still controlled through the local/laptop control plane in V1
3. Explicitly authorized reinterpretation: none. This plan packages the existing skill route model into a local CLI/watch surface; it does not rename route surfaces or widen remote execution authority.
4. Downstream task impact: every task in this plan must preserve the local-control-plane V1 boundary and must not silently implement remote-only plan execution.

## Current Status

### Completed Work

1. `ExecutePairflowPlan` V1 exists as a repo-local skill with plan/task metadata, route taxonomy, bubble handler delegation, normalized replanning, and post-implementation aftermath contracts.
2. Pairflow already has local bubble lifecycle commands and remote bubble execution support where the local repo remains the control plane.
3. The remote execution documentation explicitly separates remote runtime execution from local control-plane authority.

### Open Work

1. There is no Pairflow CLI read model for "what should this plan do next?".
2. There is no local agent-runner bridge that can invoke `ExecutePairflowPlan` as a supervised continuation rather than asking the operator to run it manually.
3. There is no local watcher that notices plan/bubble route changes, records dedupe state, and triggers that continuation autonomously.
4. There is no pilot proving that the local watcher can progress a plan without constant operator polling while still stopping at real human checkpoints.

### Deferred / Future Work

1. Remote-only bubble creation/start authority.
2. Remote control-plane or remote supervisor mode for laptop-independent plan progression.
3. Event-driven lifecycle hooks replacing or supplementing polling.
4. Full agent/skill execution embedded inside Pairflow CLI.
5. UI integration for plan-watch status and checkpoint inboxes.

## Progress / Phase Summary

1. Phase 1: plan-state read model and CLI `plan next` foundation.
2. Phase 2: local agent-runner bridge for supervised `ExecutePairflowPlan` continuation.
3. Phase 3: local polling watcher with persisted route ledger, dedupe, and autonomous agent invocation.
4. Phase 4: pilot hardening, documentation, and validation.

## Open Task List

| Task ID | Task Path | Purpose | Depends On | Closes Gap | Status |
|---|---|---|---|---|---|
| `1-plan-next-read-model` | `null` | Add a deterministic `plan next` read model/CLI surface that reports the next normalized route without mutating artifacts. | `N/A` | Missing machine-readable plan route resolution. | not_created |
| `2-agent-runner-bridge` | `null` | Add a local supervised agent-runner bridge that invokes `ExecutePairflowPlan` with compact continuation input, captures the result, and distinguishes settled checkpoints from blockers. | `1-plan-next-read-model` | Missing executable bridge between route detection and the existing orchestration skill. | not_created |
| `3-watch-loop` | `null` | Add local `plan watch` polling, persisted watcher ledger, dedupe, and autonomous runner invocation around the read model and agent bridge. | `2-agent-runner-bridge` | Missing local trigger process and duplicate-invocation guard. | not_created |
| `4-pilot-docs` | `null` | Validate the local watcher on a representative plan, document V1 boundaries, and record deferred remote-control-plane follow-up. | `3-watch-loop` | Missing pilot evidence and operator-facing guidance. | not_created |

## Coverage Map

| Plan Gap | Closed By | Notes |
|---|---|---|
| Missing machine-readable next-route resolution | `1-plan-next-read-model` | Must preserve `ExecutePairflowPlan` route names and fail-closed metadata behavior. |
| Missing executable bridge to existing orchestration | `2-agent-runner-bridge` | Must invoke `ExecutePairflowPlan` rather than replace downstream skill workflows with CLI approximations. |
| Missing always-running local trigger | `3-watch-loop` | Polling is acceptable in V1; event hooks are deferred. |
| Risk of watcher repeating the same action | `3-watch-loop` | Requires persisted ledger keyed by plan, active task, route, bubble id/state evidence, runner invocation id, and result. |
| Risk of degrading back to manual notification | `3-watch-loop` | Watch mode must invoke the runner by default; handoff-only output is dry-run/checkpoint/blocker behavior, not the success path. |
| Ambiguous remote story | `4-pilot-docs` | Documentation must say remote bubbles can be observed/routed only through local control plane; remote-only creation/start is out of scope. |
| Missing confidence that V1 helps locally | `4-pilot-docs` | Pilot should use a real or fixture plan and include transcript/command evidence. |

## Dependencies and Order

1. `plan next` must land before the runner bridge and watcher, because both should consume a stable read model rather than embed route-resolution logic.
2. The agent-runner bridge must land before `plan watch`, because the watcher only creates real value if it can execute the existing `ExecutePairflowPlan` continuation without manual operator polling.
3. The watcher ledger must land with the watch loop before repeated runner invocation is enabled, because duplicate continuation attempts against the same route would create state inconsistency.
4. The runner bridge must preserve delegated workflow ownership: it may launch an `ExecutePairflowPlan` continuation, but it must not inline or approximate `CreatePairflowSpec` or `UsePairflow` decisions in CLI code.
5. Remote bubble support in this plan is observation and lifecycle routing through existing local routed commands only. New remote-only control-plane authority must be handled by a separate future plan.
6. The pilot/docs task must run after the code path exists so the documented boundary reflects tested behavior, not intended behavior.

## Risks and Assumptions

1. Assumption: V1 can deliver practical value as a local process even though it does not progress plans while the laptop/control-plane is unavailable.
2. Assumption: a local supervised agent invocation is feasible using configured local agent commands or an equivalent local runner contract; if no runnable local agent bridge can be provided, the plan is blocked rather than downgraded to notification-only watch.
3. Risk: route taxonomy may drift between CLI code and `ExecutePairflowPlan` skill docs. Mitigation: tasks must anchor route names and output fields to the existing skill contract and add tests around stable labels.
4. Risk: polling may trigger duplicate runner invocations if state evidence is too coarse. Mitigation: persist route/action ledger entries and require material new evidence before repeat execution.
5. Risk: remote bubble status may be stale or unavailable. Mitigation: use existing remote routed status behavior and fail closed instead of treating stale cache as lifecycle authority for mutation.
6. Risk: "watch" may sound fully autonomous. Mitigation: command output and docs must distinguish observe/checkpoint/handoff from supported automatic action execution.

## Validation Strategy

1. Unit-test `plan next` fixtures for metadata bootstrap, task creation, task review, document bubble creation, implementation bubble creation, human checkpoint, and plan complete routes.
2. Unit-test the agent-runner bridge contract: compact input construction, invocation id recording, settled checkpoint detection, blocker detection, and result capture.
3. Unit-test watcher dedupe so the same route evidence cannot repeatedly invoke the runner without a material state change.
4. Integration-test local watcher behavior against a fixture repo/plan where the watcher invokes a stub or real local `ExecutePairflowPlan` continuation and stops at a human checkpoint.
5. Test remote-bubble boundary behavior with mocked or fixture remote status output: watcher may report/route through local control-plane status, but must not create/start remote-only bubbles.
6. Run the repo's relevant lint/typecheck/test commands for changed CLI/read-model code, and run `pnpm build` before any Pairflow lifecycle command after source changes.
7. Record pilot evidence in the final task showing command output, runner invocation/result capture, route ledger behavior, and the explicit deferred remote-control-plane limitation.
