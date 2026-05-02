---
artifact_type: plan
artifact_id: plan_local_plan_watch_v1
plan_id: local-plan-watch
created_on: "2026-05-01"
title: "Local Plan Watch Plan (V1)"
status: approved
plan_status: approved
prd_ref: null
owners:
  - "felho"
task_order:
  - 1-agent-runner-bridge
  - 2-bubble-trigger-index
  - 3-watch-loop
  - 4-pilot-docs
  - 5-plan-watch-codex-runner
active_task_id: 5-plan-watch-codex-runner
archive_group: 2026-05-01-local-plan-watch
task_tracker:
  - task_id: 1-agent-runner-bridge
    task_path: plans/archive/tasks/2026-05-01-local-plan-watch/1-agent-runner-bridge.md
    status: archived
  - task_id: 2-bubble-trigger-index
    task_path: plans/archive/tasks/2026-05-01-local-plan-watch/2-bubble-trigger-index.md
    status: archived
  - task_id: 3-watch-loop
    task_path: plans/archive/tasks/2026-05-01-local-plan-watch/3-watch-loop.md
    status: archived
  - task_id: 4-pilot-docs
    task_path: plans/archive/tasks/2026-05-01-local-plan-watch/4-pilot-docs.md
    status: archived
  - task_id: 5-plan-watch-codex-runner
    task_path: plans/tasks/5-plan-watch-codex-runner.md
    status: in_progress
    notes: "Retrofit the missing Pairflow-provided built-in Codex runner so plan watch can invoke ExecutePairflowPlan end-to-end without an undocumented placeholder command or per-repo script."
---

# Plan: Local Plan Watch (V1)

## Objective

Deliver the first local-control-plane `plan watch` capability for Pairflow so a running local process can notice the few events that make plan continuation useful, invoke an agent-backed `ExecutePairflowPlan` continuation, and then let that skill drive the plan until it reaches a settled checkpoint, a human checkpoint, or a real blocker.

V1 is intentionally local-first: it may observe and operate remote bubbles only through the existing laptop/local control-plane routing, but it does not introduce remote-only bubble creation, remote-only plan execution, or a remote supervisor.

## Done Definition

1. Pairflow exposes a local agent-runner bridge that can launch a configured local agent workflow invocation for `ExecutePairflowPlan` with a compact plan-continuation input packet and capture its settled result.
2. Pairflow can discover the bubbles linked to a watched plan from existing plan/task metadata and Pairflow linkage fields without resolving the full next workflow route itself.
3. Pairflow exposes a local `plan watch` command that runs as a foreground long-running polling process and triggers the runner when a linked bubble transitions into the canonical `READY_FOR_HUMAN_APPROVAL` state.
4. The watcher records enough trigger evidence and runner result state to avoid repeated duplicate invocations for the same bubble/state evidence.
5. The watcher supports a configurable polling interval with a default of 60 seconds.
6. The watcher does not treat "print a handoff and wait for the operator to run it" as successful automation; textual handoff output is allowed only at real human checkpoints, unsupported runtime blockers, or explicitly configured dry-run mode.
7. Local watch behavior is covered by focused tests for agent-runner invocation, linked-bubble trigger detection, dedupe, interval handling, checkpoint handling, and local/remote-bubble boundary behavior.
8. Documentation states the V1 boundary clearly: local control plane required; remote-only plan progression and remote-only bubble creation/start are deferred.

## Guiding Principles

1. Business invariant: the plan should keep moving when the next step is mechanically trustworthy, but it must not weaken existing review gates, Pairflow lifecycle authority, or human approval boundaries.
2. Control model: plan metadata owns sequencing, task metadata owns task-local execution truth, Pairflow owns bubble lifecycle truth, `ExecutePairflowPlan` owns orchestration decisions/delegation, and the plan watcher owns only trigger detection, dedupe, and local agent invocation.
3. Read-path rule: the watcher may read the watched plan path, task tracker/linkage metadata needed to find linked bubbles, Pairflow bubble status for those linked bubbles, and its own watch ledger; it must not compute the full `ExecutePairflowPlan` route.
4. Forbidden fallback: do not derive next action from chat history, filename order, operator memory, raw remote clone state, or an inferred "probably next" route. Do not reimplement `ResolvePlanState` in the watcher.
5. Allowed resolution path: deterministic same-authority lookup is allowed only for trigger discovery, such as finding task paths from the plan tracker and reading `doc_bubble_id` / `impl_bubble_id`; orchestration conflicts are delegated to `ExecutePairflowPlan`.
6. Missing-data rule: if linked-bubble discovery cannot be performed safely, the watcher must not invent trigger evidence from incomplete metadata; missing remote runtime availability routes to fail-closed remote status handling, not local guessing.
7. Sequencing / boundary note:
   - producer-first rule: implement the agent-runner bridge before the linked-bubble trigger index and watch loop.
   - downstream consume families that remain separate: plan/task artifact authoring stays with `CreatePairflowSpec`; bubble lifecycle stays with `UsePairflow`; route selection and route ledger authority stay with `ExecutePairflowPlan`.
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
3. Explicitly authorized reinterpretation: none. This plan packages a trigger/supervisor around the existing skill route model; it does not rename route surfaces, compute the full next route in CLI code, or widen remote execution authority.
4. Downstream task impact: every task in this plan must preserve the local-control-plane V1 boundary and must not silently implement remote-only plan execution.

## Current Status

### Completed Work

1. `ExecutePairflowPlan` V1 exists as a repo-local skill with plan/task metadata, route taxonomy, bubble handler delegation, normalized replanning, and post-implementation aftermath contracts.
2. Pairflow already has local bubble lifecycle commands and remote bubble execution support where the local repo remains the control plane.
3. The remote execution documentation explicitly separates remote runtime execution from local control-plane authority.
4. The agent-runner bridge, linked-bubble trigger index, watch loop, dedupe ledger, and pilot documentation have landed.

### Open Work

1. The runner bridge can invoke a configured command, but Pairflow does not yet provide a built-in Codex runner for `ExecutePairflowPlan`.
2. The documented `pairflow-plan-runner` name is currently a placeholder; it must be replaced by config-driven built-in Codex runner behavior and non-dry-run proof.
3. The live pilot still needs a non-dry-run built-in Codex runner invocation plus duplicate-suppression evidence on a disposable approval-ready plan/bubble.

### Deferred / Future Work

1. Remote-only bubble creation/start authority.
2. Remote control-plane or remote supervisor mode for laptop-independent plan progression.
3. Event-driven lifecycle hooks replacing or supplementing polling.
4. Full native reimplementation of `ExecutePairflowPlan` route resolution inside Pairflow CLI.
5. Manual nudge / one-shot continue surfaces such as `--run-now`, `plan nudge`, or `plan continue`.
6. Initial-run automation when starting a watcher before any linked bubble exists.
7. UI integration for plan-watch status and checkpoint inboxes.

## Progress / Phase Summary

1. Phase 1: local agent-runner bridge for supervised `ExecutePairflowPlan` continuation.
2. Phase 2: linked-bubble trigger index for watched plans.
3. Phase 3: local polling watcher with configurable interval, approval-ready bubble triggers, dedupe, and autonomous agent invocation.
4. Phase 4: pilot hardening, documentation, and validation.

Progress update (2026-05-01): document bubble `2-bubble-trigger-index-doc` closed and merged after satisfying the configured multi-clean-meta-review gate; implementation bubble `2-bubble-trigger-index-impl` also closed and merged after satisfying the configured multi-clean-meta-review gate. Task `2-bubble-trigger-index` is archived and the active task advanced to `3-watch-loop`.

Progress update (2026-05-01): implementation bubble `3-watch-loop-impl` closed and merged after satisfying the configured multi-clean-meta-review gate. Task `3-watch-loop` is archived and the active task advanced to `4-pilot-docs`.

Progress update (2026-05-02): implementation bubble `4-pilot-docs-impl` closed and merged after satisfying the configured multi-clean-meta-review gate. Task `4-pilot-docs` is archived.

Progress update (2026-05-02): plan reopened with retrofit task `5-plan-watch-codex-runner` after the pilot exposed that `pairflow-plan-runner` was documented as a placeholder rather than a Pairflow-provided built-in runner. The plan is not complete until a config-driven Codex runner path is implemented and proven.

Progress update (2026-05-02): document bubble `5-plan-watch-codex-runner-doc` refined the approved task handoff, aligned the task list status to `approved`, linked the document bubble in task metadata, clarified that the later implementation bubble must replace placeholder runner guidance with the built-in Codex path, and tightened validation expectations. Later review rounds broadened the normative scope to require argv-array/no-shell Codex invocation, non-primary `--runner-command` legacy framing, disposable approval-ready duplicate-suppression proof, and complete pilot ledger evidence fields.

Progress update (2026-05-02): document bubble `5-plan-watch-codex-runner-doc` closed and merged after satisfying the configured multi-clean-meta-review gate. Task `5-plan-watch-codex-runner` is now implementable and ready for the implementation bubble.

Progress update (2026-05-02): implementation bubble `5-plan-watch-codex-runner-impl` was created and started with the required bootstrap command. Task `5-plan-watch-codex-runner` is now in progress.

## Open Task List

| Task ID                  | Task Path | Purpose                                                                                                                                                                                  | Depends On               | Closes Gap                                                                                                    | Status      |
| ------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------- |
| `1-agent-runner-bridge`  | `plans/archive/tasks/2026-05-01-local-plan-watch/1-agent-runner-bridge.md` | Add a local supervised agent-runner bridge that invokes `ExecutePairflowPlan` with compact continuation input, captures the result, and distinguishes settled checkpoints from blockers. | `N/A`                    | Missing executable bridge between trigger detection and the existing orchestration skill.                     | archived |
| `2-bubble-trigger-index` | `plans/archive/tasks/2026-05-01-local-plan-watch/2-bubble-trigger-index.md`    | Add lightweight plan-linked bubble discovery and trigger evidence collection for approval-ready bubble states without resolving full plan routes.                                        | `1-agent-runner-bridge`  | Missing trustworthy trigger source for automatic continuation after a bubble reaches the human approval gate. | archived |
| `3-watch-loop`           | `plans/archive/tasks/2026-05-01-local-plan-watch/3-watch-loop.md`    | Add local foreground `plan watch` polling with configurable interval, persisted watcher ledger, approval-ready trigger handling, dedupe, and autonomous runner invocation.               | `2-bubble-trigger-index` | Missing local trigger process and duplicate-invocation guard.                                                 | archived |
| `4-pilot-docs`           | `plans/archive/tasks/2026-05-01-local-plan-watch/4-pilot-docs.md`    | Validate the local watcher on a representative plan, document V1 boundaries, and record deferred remote-control-plane follow-up.                                                         | `3-watch-loop`           | Missing pilot evidence and operator-facing guidance.                                                          | archived |
| `5-plan-watch-codex-runner` | `plans/tasks/5-plan-watch-codex-runner.md` | Add a Pairflow-provided built-in Codex runner that turns watch payloads into `ExecutePairflowPlan` invocations and returns bridge-compatible structured output. | `4-pilot-docs` | Missing last-mile executable proof for autonomous plan watch continuation. | in_progress |

## Coverage Map

| Plan Gap                                               | Closed By                | Notes                                                                                                                                      |
| ------------------------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Missing executable bridge to existing orchestration    | `1-agent-runner-bridge`  | Must invoke `ExecutePairflowPlan` rather than replace downstream skill workflows with CLI approximations.                                  |
| Missing trigger evidence after bubble completion gates | `2-bubble-trigger-index` | Must discover linked bubbles and approval-ready transitions without becoming a full route resolver.                                        |
| Missing always-running local trigger                   | `3-watch-loop`           | Polling is acceptable in V1; event hooks are deferred.                                                                                     |
| Need to avoid over-polling long-running bubbles        | `3-watch-loop`           | Default polling interval is 60 seconds and must be configurable.                                                                           |
| Risk of watcher repeating the same action              | `3-watch-loop`           | Requires persisted ledger keyed by plan, trigger kind, bubble id/state evidence where applicable, runner invocation id, and result.        |
| Risk of degrading back to manual notification          | `3-watch-loop`           | Watch mode must invoke the runner by default; handoff-only output is dry-run/checkpoint/blocker behavior, not the success path.            |
| Ambiguous remote story                                 | `4-pilot-docs`           | Documentation must say remote bubbles can be observed/routed only through local control plane; remote-only creation/start is out of scope. |
| Missing confidence that V1 helps locally               | `4-pilot-docs`           | Pilot should use a real or fixture plan and include transcript/command evidence.                                                           |
| Missing concrete runner executable                     | `5-plan-watch-codex-runner` | Replace placeholder `pairflow-plan-runner` guidance with config-driven built-in Codex runner behavior and non-dry-run pilot evidence.      |

## Dependencies and Order

1. The agent-runner bridge must land first, because a watcher that cannot execute `ExecutePairflowPlan` would fall back to notification-only behavior.
2. Linked-bubble trigger discovery must land before the watch loop, because V1 trigger value comes mainly from noticing when an existing doc or implementation bubble reaches the human approval gate.
3. The watcher ledger must land with the watch loop before repeated runner invocation is enabled, because duplicate continuation attempts against the same trigger evidence would create state inconsistency.
4. The runner bridge must preserve delegated workflow ownership: it may launch an `ExecutePairflowPlan` continuation, but it must not inline or approximate `CreatePairflowSpec`, `UsePairflow`, or `ResolvePlanState` decisions in CLI code.
5. The first minimal watcher does not need a manual nudge or initial-run trigger. The operator may start the first `ExecutePairflowPlan` run separately; after that, the watcher owns approval-ready bubble triggers.
6. Manual nudge, one-shot continue, and initial-run automation are deferred unless a later task proves they are required for the first pilot.
7. Remote bubble support in this plan is observation and lifecycle routing through existing local routed commands only. New remote-only control-plane authority must be handled by a separate future plan.
8. The pilot/docs task must run after the code path exists so the documented boundary reflects tested behavior, not intended behavior.
9. The retrofit runner task must run after the pilot because it closes a last-mile activation gap discovered by attempting to use `plan watch` against a new plan.

## Risks and Assumptions

1. Assumption: V1 can deliver practical value as a local process even though it does not progress plans while the laptop/control-plane is unavailable.
2. Assumption: a local supervised agent invocation is feasible using configured local agent commands or an equivalent local runner contract; if no runnable local agent bridge can be provided, the plan is blocked rather than downgraded to notification-only watch.
3. Risk: the trigger index could grow into a second route resolver. Mitigation: V1 trigger logic is limited to linked bubble approval-ready transitions; `ExecutePairflowPlan` remains the only full orchestration decision owner.
4. Risk: polling may trigger duplicate runner invocations if state evidence is too coarse. Mitigation: persist trigger/action ledger entries and require material new evidence before repeat execution.
5. Risk: remote bubble status may be stale or unavailable. Mitigation: use existing remote routed status behavior and fail closed instead of treating stale cache as lifecycle authority for mutation.
6. Risk: "watch" may sound fully autonomous. Mitigation: command output and docs must distinguish observe/checkpoint/handoff from supported automatic action execution.
7. Risk: an undocumented runner command makes the watcher hook-only while the plan claims automation. Mitigation: ship config-driven built-in Codex runner behavior and require a non-dry-run proof command.
8. Risk: the built-in Codex runner uses full local-control-plane authority via `--dangerously-bypass-approvals-and-sandbox`. Mitigation: treat `plan watch` automation as trusted local operator execution, keep route authority in `ExecutePairflowPlan`, and fail closed on invalid payloads, missing Codex, non-zero exits, timeouts, or unparseable structured output.

## Validation Strategy

1. Unit-test the agent-runner bridge contract: compact input construction, invocation id recording, settled checkpoint detection, blocker detection, and result capture.
2. Unit-test linked-bubble trigger discovery from plan/task metadata and Pairflow status, including no-linked-bubble, unreadable bubble, local bubble, and remote-routed status cases.
3. Unit-test watcher dedupe so the same bubble-state evidence cannot repeatedly invoke the runner without a material state change.
4. Unit-test interval behavior, including the 60-second default and a configured shorter interval for tests.
5. Integration-test local watcher behavior against a fixture repo/plan where a linked bubble `READY_FOR_HUMAN_APPROVAL` state triggers a stub or real local `ExecutePairflowPlan` continuation.
6. Test that the watcher does not compute or emit full route decisions such as `CreateTask`, `CreateDocumentBubble`, or `CloseImplementationBubble`; those remain runner/skill output only.
7. Test remote-bubble boundary behavior with mocked or fixture remote status output: watcher may observe approval-ready status through local control-plane routing, but must not create/start remote-only bubbles.
8. Run the repo's relevant lint/typecheck/test commands for changed CLI/watch code, and run `pnpm build` before any Pairflow lifecycle command after source changes.
9. Record pilot evidence in the final task showing command output, runner invocation/result capture, trigger ledger behavior, interval behavior, and the explicit deferred remote-control-plane limitation.
10. Retrofit validation must include a non-dry-run `pairflow plan watch <plan-path>` invocation using the configured built-in Codex runner against a disposable approval-ready plan/bubble, plus duplicate-suppression evidence for the same trigger.
