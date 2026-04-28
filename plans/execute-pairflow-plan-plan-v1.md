---
artifact_type: plan
artifact_id: plan_execute_pairflow_plan_v1
title: "ExecutePairflowPlan Skill Plan (V1)"
status: in_progress
prd_ref: null
owners:
  - "felho"
---

# Plan: ExecutePairflowPlan Skill (V1)

## Objective

1. Define and implement a first trustworthy version of an `ExecutePairflowPlan` orchestration skill that can drive plan execution from approved plan through the next correct local orchestration steps until a settled checkpoint is reached, using existing specialized skills.
2. Make the execution model explicit enough that the orchestration state no longer lives mainly in the operator's head.
3. Keep V1 intentionally local-only, metadata-minimal, and orchestrator-first so the workflow becomes reliable before remote execution or deeper automation is added.

## Done Definition

1. A repo-local `ExecutePairflowPlan` skill source exists with a lean top-level contract and dedicated workflow files for the critical orchestration steps.
2. The skill treats the plan as sequencing authority, the task as detailed execution artifact, and Pairflow as bubble lifecycle authority.
3. The skill can bootstrap or repair missing legacy plan metadata before attempting normal execution.
4. The skill can resolve plan state, identify the next task, create/refine/review tasks through `CreatePairflowSpec`, and prepare the next correct bubble through `UsePairflow`.
5. The skill operates as an orchestrator:
   - downstream plan/task/bubble workflows run in fresh-context sub-agent executions,
   - the top-level skill keeps moving forward until a settled checkpoint or real blocker is reached,
   - and it emits final output only at a real run boundary.
6. Document refinement and implementation bubble creation/review/close remain delegated to `UsePairflow`, not reimplemented in the new skill.
7. The plan and task metadata contract is explicit enough that task selection, supersession, bubble linkage, and archive routing are trustworthy.
8. The plan/task/archive conventions for V1 are documented and consistent with the orchestrator logic.
9. V1 explicitly excludes remote execution support.

## Guiding Principles

1. Business invariant: the orchestration skill should reduce operator coordination burden without weakening existing review gates, lifecycle contracts, or human approval points.
2. Control model: `ExecutePairflowPlan` is the orchestrator only. It decides what happens next, but delegates plan/task authoring to `CreatePairflowSpec` and bubble lifecycle handling to `UsePairflow`.
3. Read-path rule: sequencing and next-task decisions read from canonical plan metadata; detailed task execution state reads from task metadata; running/closed bubble lifecycle state reads from Pairflow status rather than mirrored plan/task state.
4. Forbidden fallback: do not reconstruct sequencing primarily from conversation history, raw filenames, or inferred operator intent when plan/task metadata can or should be repaired first. Do not let the orchestrator silently absorb downstream workflow responsibilities into one overloaded context window. Do not silently "pick one side" when plan metadata and task metadata disagree across authority boundaries unless a deterministic precedence rule already covers that exact conflict.
5. Allowed resolution path: when state is incomplete but mechanically recoverable, the orchestrator may first repair plan metadata, then continue normal execution. When task review routes back to plan, the orchestrator may apply mechanical plan-level corrections and continue without treating that outcome as failure. When bubble-side outcomes require replanning, the bubble layer may classify the exit and hand a normalized replanning signal back to the plan/task layer, which then owns supersede/archive/recreate work.
6. Missing-data rule: if required plan metadata is missing, run metadata repair/bootstrap first. If plan metadata and task metadata disagree, resolve deterministically only when the conflict stays within an already-declared authority split:
   - plan stays authoritative for sequencing / next task,
   - task stays authoritative for detailed local execution state,
   - Pairflow stays authoritative for bubble lifecycle state when a bubble exists.
   If the disagreement crosses those authority boundaries and no explicit precedence rule closes it safely, fail closed to a human checkpoint instead of guessing. If a real product or architecture decision is required and cannot be resolved confidently, stop and ask for human direction.
7. Sequencing / boundary note:
   - producer-first rule: establish plan metadata contract and orchestration state-resolution logic before broadening into many downstream workflow behaviors.
   - downstream consume families that remain separate: plan/task artifact workflows (`CreatePairflowSpec`) and bubble lifecycle workflows (`UsePairflow`).
   - cleanup/recovery timing: V1 includes archive and supersession routing needed for normal progress, but deeper remote/runtime recovery support is deferred.

## Canonical Contract Anchors (Optional)

1. Source-of-truth anchors:
   - `docs/execute-pairflow-plan-draft.md`
   - `.claude/skills/CreatePairflowSpec/SKILL.md`
   - `.claude/skills/CreatePairflowSpec/Workflows/CreatePlan.md`
   - `.claude/skills/CreatePairflowSpec/Workflows/CreateTask.md`
   - `.claude/skills/CreatePairflowSpec/Workflows/ReviewSpec.md`
   - `.claude/skills/UsePairflow/SKILL.md`
   - `.claude/skills/UsePairflow/Workflows/CreateBubble.md`
   - `.claude/skills/UsePairflow/Workflows/ReviewBubble.md`
   - `.claude/skills/UsePairflow/Workflows/CloseBubble.md`
2. Closed canonical elements / terms:
   - `ExecutePairflowPlan` is an orchestrator, not a replacement for `CreatePairflowSpec` or `UsePairflow`.
   - plan sequencing authority stays in the plan, not in task-local detail.
   - V1 scope is local-only.
3. Explicitly authorized reinterpretation (if any): `route back to plan` is treated as a task-review outcome that often requires plan-level correction, not as automatic failure.
4. Downstream task impact: all implementation tasks for this plan must preserve the authority split, orchestrator model, metadata-minimal design, and local-only V1 boundary.

## Current Status

### Completed Work

1. A substantial exploratory design draft already exists in `docs/execute-pairflow-plan-draft.md`.
2. Core orchestration decisions were clarified:
   - plan is sequencing authority,
   - task is detailed execution artifact,
   - Pairflow is bubble lifecycle authority.
3. The intended skill structure, workflow naming style, archive direction, task identity model, and orchestrator-mode behavior were discussed and refined.
4. A legacy-plan metadata bootstrap need was identified.
5. Task 1 landed on `main` and created the first repo-local `ExecutePairflowPlan` artifacts:
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/FixPlanMetadata.md`
6. The minimum metadata contract, legacy bootstrap path, task identity derivation, and fail-closed disagreement rules are now encoded in repo-local skill source.

### Open Work

1. No top-level `ExecutePairflowPlan` `SKILL.md` exists yet.
2. No `ResolvePlanState` workflow exists yet, so the normalized route taxonomy and next-workflow decision contract are still implicit.
3. Downstream workflow delegation for plan/task review loops and bubble routing is not yet encoded into repo-local skill source.
4. Progress/archive/pilot follow-through remains unimplemented.
5. V1 validation and piloting strategy is not yet formalized in executable orchestration behavior.

### Deferred / Future Work

1. Remote execution support for `ExecutePairflowPlan`.
2. Automatic non-convergence detection without explicit operator hint.
3. Deeper automation that re-invokes the executor based on long-running bubble completion rather than human-triggered runs.

## Progress / Phase Summary

1. Phase 1: metadata and execution-model foundation.
2. Phase 2: orchestrator workflow skeleton and state resolution.
3. Phase 3: document refinement and implementation bubble routing, including normalized bubble-exit mapping back into orchestrator route classes.
4. Phase 4: plan/task follow-through, progress/archive handling, validation, and pilot hardening.

Boundary note:

1. Phase 3 owns how the orchestrator reaches and handles the correct bubble lifecycle path.
2. Review-triggered pre-bubble supersession/archive/recreate handling belongs to the plan/task routing side, not to the post-implementation closeout side.
3. `ResolvePlanState` owns the normalized route taxonomy used by the orchestrator, including which route classes can continue automatically and which must stop at a human checkpoint.
4. Bubble-originated non-convergence or operator-hint exits must first be mapped from raw bubble detail into that normalized route taxonomy on the bubble side, then handed back to the plan/task side as a normalized replanning signal.
5. The plan/task layer consumes normalized replanning signals; it does not classify raw bubble lifecycle detail itself.
6. Phase 4 owns what happens after bubble-routing works: post-implementation progress reporting, archive/update behavior, and local pilot proof that the orchestration path is trustworthy.

## Open Task List

| Task | Purpose | Depends On | Closes Gap | Status |
|---|---|---|---|---|
| `plans/tasks/execute-pairflow-plan/1-executeplan-metadata-foundation.md` | Define the minimum plan/task metadata contract, legacy plan metadata bootstrap path, task identity model, and archive linkage rules required for trustworthy state resolution. This task also defines the minimum metadata needed to support supersession and archive linkage for review-loop outcomes before any bubble phase begins, plus the precedence/fail-closed rule for plan/task metadata disagreement. | `N/A` | Missing authoritative metadata contract, disagreement handling, and repair/bootstrap flow. | completed |
| `plans/tasks/execute-pairflow-plan/2-executeplan-orchestrator-skeleton.md` | Create the repo-local `ExecutePairflowPlan` skill skeleton, top-level routing contract, workflow inventory, and `ResolvePlanState` behavior including next-workflow selection. This task owns the normalized route taxonomy used by the orchestrator in V1, including which route classes are auto-routed vs human-checkpointed, and keeps automatic non-convergence detection out of scope. It does not own bubble-detail classification. | `plans/tasks/execute-pairflow-plan/1-executeplan-metadata-foundation.md` | Missing top-level orchestrator skill structure and state-routing logic. | draft |
| `plans/tasks/execute-pairflow-plan/3-executeplan-bubble-routing.md` | Implement document refinement and implementation bubble routing that delegates to `UsePairflow` for bubble create/review/close while preserving orchestrator-only control in the parent skill. This task owns bubble-side lifecycle interpretation and the mapping from raw bubble detail into the normalized continuation, checkpoint, or replanning route classes defined by Task 2. It ends when bubble-oriented settled checkpoints and normalized lifecycle handoff behavior are correctly routed. | `plans/tasks/execute-pairflow-plan/2-executeplan-orchestrator-skeleton.md` | Missing bubble lifecycle delegation, exit classification, and settled-checkpoint stop behavior. | open |
| `plans/tasks/execute-pairflow-plan/4-executeplan-plan-and-task-routing.md` | Implement the plan/task orchestration flow that delegates to `CreatePairflowSpec` for plan review, task creation, task review, and plan-level correction loops. This task owns the review-triggered supersede/archive/recreate handoff when task review routes back to plan before any bubble is started, and it consumes normalized replanning signals after the bubble layer has already mapped raw bubble detail into the orchestrator route taxonomy. It does not interpret raw bubble lifecycle detail itself. | `plans/tasks/execute-pairflow-plan/2-executeplan-orchestrator-skeleton.md`, `plans/tasks/execute-pairflow-plan/3-executeplan-bubble-routing.md` | Missing document-artifact workflow delegation and gradual-consistency refinement loop handling. | open |
| `plans/tasks/execute-pairflow-plan/5-executeplan-progress-archive-and-pilot.md` | Implement progress reporting, post-implementation archive/update behavior, and a pilot validation path for local-only V1 execution. This task starts after bubble-routing behavior and the downstream plan/task follow-through contract are in place and owns orchestration aftermath, reporting, archive proof for normal bubble-completion paths, and pilot trust-building rather than pre-bubble supersession/archive handling or bubble lifecycle routing itself. | `plans/tasks/execute-pairflow-plan/4-executeplan-plan-and-task-routing.md` | Missing end-to-end closeout, archive contract proof, and trusted local V1 pilot readiness. | open |

## Coverage Map

| Plan Gap | Closed By | Notes |
|---|---|---|
| Missing minimum metadata contract for plans/tasks | `1-executeplan-metadata-foundation.md` | Must cover task identity, plan tracker, supersession, archive linkage, bubble refs, legacy metadata repair, and plan/task disagreement handling. |
| Missing top-level orchestrator skill shape and explicit route taxonomy | `2-executeplan-orchestrator-skeleton.md` | Must keep the main skill lean, decide next workflow via `ResolvePlanState`, and define the V1 normalized route classes plus checkpoint routing explicitly. |
| Missing document/implementation bubble delegation and bubble-detail to route mapping contract | `3-executeplan-bubble-routing.md` | Must route through `UsePairflow` rather than inline Pairflow lifecycle logic, and must map raw bubble-side exits into the normalized route taxonomy before handing them back. |
| Missing plan/task workflow delegation contract and normalized replanning consumption | `4-executeplan-plan-and-task-routing.md` | Must route through `CreatePairflowSpec` rather than free-form edits, and must own plan/task follow-through only after a normalized replanning signal reaches this layer. |
| Missing progress reporting and post-implementation archive completion contract | `5-executeplan-progress-archive-and-pilot.md` | Must prove settled-checkpoint reporting and plan-grouped archive behavior for normal completion paths. |
| Missing V1 local-only pilot validation | `5-executeplan-progress-archive-and-pilot.md` | Must explicitly exclude remote support in the first version. |

## Dependencies and Order

1. Metadata and task identity foundation must land first, because the orchestrator cannot reliably resolve state or create deterministic bubble IDs without it.
2. The orchestrator skeleton and `ResolvePlanState` behavior must land before deeper plan/task or bubble routing, because next-workflow selection, checkpoint routing, and the normalized route taxonomy belong there.
3. Bubble routing depends on that taxonomy so it can map raw bubble-side detail into normalized route classes without redefining top-level routing semantics.
4. Plan/task routing should be implemented after the normalized route taxonomy exists and after bubble routing closes the bubble-detail mapping contract, so pre-bubble review loops and post-bubble normalized replanning consumption both have clean boundaries.
5. Progress/archive/pilot work should follow bubble routing, because settled-checkpoint reporting depends on real bubble handoff behavior.
6. Bubble routing must normalize bubble-side non-convergence / stuck / hinted replanning exits before the plan/task layer tries to supersede or recreate anything, otherwise the plan/task layer would need to reason about raw bubble lifecycle detail.
7. Progress/archive/pilot work must not absorb bubble lifecycle routing details or pre-bubble supersession/archive logic back into itself; it consumes the routing contract proven upstream rather than redefining it.
8. Validation and pilot hardening should come last in the same workstream once the core orchestrator flow is stable enough to exercise end-to-end locally.

## Risks and Assumptions

1. Assumption: V1 runs are human-triggered between long-running bubble phases rather than continuously self-reinvoked.
2. Assumption: new tasks created by the workflow system can be relied on more than legacy plans for metadata correctness.
3. Risk: duplicating too much execution state across plan and task artifacts will create drift. Mitigation: keep plan progress minimal and task detail local.
4. Risk: the top-level skill could become bloated if detailed downstream workflow logic is not moved into separate workflow files. Mitigation: treat workflow length/detail itself as a trigger for extraction.
5. Risk: review/refinement results may become biased if the orchestrator and downstream review workflows share too much context. Mitigation: fresh-context sub-agent execution for specialized workflows.
6. Risk: `route back to plan` could be treated too eagerly as blocker rather than as normal gradual-consistency refinement. Mitigation: continue automatically for mechanical corrections and stop only on real product/architecture uncertainty.
7. Risk: ownership drift between route taxonomy, bubble-detail mapping, and normalized replanning consumption could make later tasks overlap or execute out of order. Mitigation: keep Task 2 on normalized route taxonomy, Task 3 on bubble-detail mapping, and Task 4 on normalized replanning consumption only.
8. Risk: ownership drift between pre-bubble supersession/archive handling and post-implementation closeout could make archive behavior inconsistent. Mitigation: keep review-triggered supersede/archive/recreate in Task 4 and reserve Task 5 for normal post-implementation aftermath.
9. Risk: bubble creation details might drift if the orchestrator tries to own them directly. Mitigation: keep bubble lifecycle delegation inside `UsePairflow`.
10. Risk: remote execution complexity could destabilize the first version. Mitigation: explicitly keep V1 local-only.

## Validation Strategy

1. Validate that the final skill structure keeps the main `ExecutePairflowPlan` file lean and moves detailed operational procedures into dedicated workflow files.
2. Validate that `ResolvePlanState` can identify:
   - plan metadata bootstrap requirement,
   - artifact disagreement that can be resolved deterministically,
   - artifact disagreement that must fail closed to a human checkpoint,
   - next task selection,
   - task-review follow-up,
   - explicit operator-hint / non-convergence route,
   - the normalized route class for the next orchestration action,
   - and next workflow route.
3. Validate that plan/task artifact work is delegated through `CreatePairflowSpec` workflows with fresh-context execution.
4. Validate that document/implementation bubble handling is delegated through `UsePairflow` workflows with fresh-context execution.
5. Validate that the orchestrator commentary model reports:
   - why a workflow was started,
   - what result came back,
   - and what next action the orchestrator plans to take.
6. Validate that final output is emitted only at settled run boundaries such as:
   - bubble started,
   - plan complete,
   - real human checkpoint,
   - real blocker.
7. Validate the archive contract and superseded-task handling against the agreed plan-grouped archive shape, including the distinction between pre-bubble supersession/archive and post-implementation archive/update behavior.
8. Validate that bubble-side non-convergence / hinted replanning exits are mapped into the normalized route taxonomy before the plan/task layer consumes them, so Task 2, Task 3, and Task 4 do not overlap on route ownership.
9. Run a local pilot using one suitable plan to prove the V1 orchestration path before any remote expansion is considered.

## Assumptions

1. No PRD is required for this work; `Plan -> Task` is sufficient.
2. The current draft document remains valid as supporting design context, but the plan becomes the operative artifact for creating implementation tasks.
3. Existing `CreatePairflowSpec` and `UsePairflow` skills remain the primary domain workflows; `ExecutePairflowPlan` only orchestrates them.
