# ExecutePairflowPlan Draft

Status: exploratory draft
Date: 2026-04-27

## Purpose

This document is a thinking draft for a future `execute-pairflow-plan` skill.

It is intentionally **not** a PairflowSpec artifact yet. The goal here is to:

1. capture the current human-driven workflow as it actually works today,
2. identify the state that currently lives mostly in the operator's head,
3. sketch an execution model that could later become a skill,
4. make the open questions explicit before hardening anything into a stricter contract.

This draft should stay easy to revise. If some part of the current process is still fluid, that is acceptable here.

## What Problem This Skill Is Trying To Solve

Today the workflow from "approved plan" to "completed plan" is already fairly structured, but the orchestration is still manual and stateful in the operator's head.

The missing layer is not another bubble workflow. The missing layer is a **plan-level executor** that can:

1. inspect where a plan currently stands,
2. identify the next correct action,
3. call the right sub-workflow,
4. continue until blocked,
5. stop cleanly when human judgment is required.

The intended end state is something close to:

```text
executePairflowPlan <plan>
```

and the skill determines the next steps from the current plan/task/bubble state rather than from a fresh natural-language prompt every time.

## Boundaries

### In scope for this draft

1. Plan-driven execution after a plan already exists.
2. Task-by-task progression through spec review, document refinement, implementation, and closeout.
3. State detection.
4. Routing to sub-workflows.
5. Metadata needed to make routing safe and durable.
6. Operator checkpoints and stop conditions.

### Out of scope for this draft

1. Ad hoc idea exploration before a plan exists.
2. Replacing Pairflow lifecycle commands with direct implementation work.
3. Full autonomous diagnosis of non-converging bubbles in v1.
4. Building this directly into Pairflow core right now.

## Current Real Workflow

This section describes the workflow as currently used, not as a theoretical clean-room design.

### Phase 0: Upstream ideation

This phase remains intentionally ad hoc.

Typical shape:

1. An idea appears.
2. There is exploration and discussion with Codex.
3. At some point a plan is created.

This future skill does **not** try to formalize this phase yet.

### Phase 1: Plan refinement

Once a plan exists, the process becomes more structured.

Typical shape:

1. Create or refine the plan.
2. Run the `ReviewSpec` workflow in `plan-mode`.
3. If needed, revise the plan.
4. Repeat until the plan is good enough to start producing the first task.

Important operational preference:

1. Do **not** create all tasks upfront by default.
2. Create the next task only when the plan is mature enough and the next slice is ready.
3. This avoids a large synchronization burden across many task files when sequencing changes later.

### Phase 2: Next-task creation

Once the plan is good enough:

1. Create the first not-yet-created task from the plan.
2. Run the `ReviewSpec` workflow in `task-mode`.
3. Based on the result:
   - task is approved,
   - task needs refinement,
   - or route back to plan.

### Phase 3: Document refinement bubble

If the task is approved at spec level:

1. Commit the task.
2. Start a **document refinement** bubble for that task.
3. In practice this is usually started with inline `--task`, even when the task document is the source material.
4. Let Pairflow run the loop.
5. When bubble state reaches `READY_FOR_HUMAN_APPROVAL`, run an additional deep review round before deciding.
6. If deep review finds issues, prefer `rework`.
7. If the result is acceptable, approve, merge, and clean up the bubble.

### Phase 4: Implementation bubble

After the document refinement bubble is merged:

1. Start the **implementation** bubble for the same task.
2. In practice this is usually started with `--task-file`.
3. Let Pairflow run the loop.
4. When the bubble reaches `READY_FOR_HUMAN_APPROVAL`, run another deep review round.
5. Decide `approve` or `rework`.
6. If approved, merge the implementation.
7. Manual testing may happen here, but not always at the exact same point.

### Phase 5: Closeout

After implementation merge:

1. Update plan progress.
2. Update task status.
3. Archive the task.
4. Determine the next task.
5. Repeat until the plan is done.

## Stable Patterns Worth Preserving

These seem important enough to preserve in the future skill.

### 1. Task creation is incremental

The process should remain "create the next task when ready", not "generate the entire task tree upfront".

Reason:

1. sequencing often changes,
2. plan review may reveal missing prerequisites,
3. task review may route back to plan,
4. keeping many task files in sync is expensive and error-prone.

### 2. ReviewSpec is a required gate, not optional polish

The current process treats spec review as a real decision gate:

1. `plan-mode` validates sequencing and coverage,
2. `task-mode` validates scope and implementability,
3. task execution should not begin until this gate is passed.

### 3. Bubble approval includes an extra human-driven deep review

This is not incidental. It is part of the quality model.

Current practice:

1. let Pairflow reach `READY_FOR_HUMAN_APPROVAL`,
2. run another deep review,
3. if there are findings, prefer rework,
4. only approve when that extra pass is clean enough.

### 4. Document refinement and implementation are separate bubbles

The workflow intentionally separates:

1. making the task/document clearer and safer,
2. implementing the task.

That split should remain explicit in the future skill.

### 5. Remote execution is an execution target, not a different lifecycle

Remote bubbles are still "the same bubble" from the workflow perspective.

Remote matters because:

1. heavier compute should not burden the laptop,
2. bubbles should be able to continue while the laptop is closed,
3. trust in the remote path is still being built, but the lifecycle model should stay aligned with local.

This suggests that `local` vs `remote` should be a bubble execution attribute, not a separate plan executor mode.

## Proposed Skill Direction

The future skill should likely be an orchestration skill named something like:

1. `execute-pairflow-plan`
2. or `executePlan`

Working assumption for now: `execute-pairflow-plan`.

Its role is not "do everything magically". Its role is:

1. inspect current state,
2. route to the right sub-workflow,
3. execute until blocked,
4. report what happened,
5. leave clear next steps when it stops.

## First-Cut Mental Model

The skill is best understood as a **state-aware router over existing sub-workflows**.

It should not start as one monolithic prompt with all possible behavior embedded into one instruction block.

Better shape:

1. one top-level orchestration skill,
2. several explicit sub-workflows,
3. a deterministic state-resolution step before every meaningful action.

## Likely Sub-Workflows

These are not final names, just working buckets.

1. `ResolvePlanExecutionState`
2. `ReviewPlan`
3. `CreateNextTask`
4. `ReviewTaskSpec`
5. `StartDocumentRefinementBubble`
6. `ReviewDocumentRefinementBubble`
7. `CloseDocumentRefinementBubble`
8. `StartImplementationBubble`
9. `ReviewImplementationBubble`
10. `CloseImplementationBubble`
11. `UpdateProgressAndArchive`
12. `RescopeTaskFromPlan`
13. `HandleBubbleTroubleHint`

Some of these may later map directly onto existing skills:

1. `CreatePairflowSpec`
2. `UsePairflow`

The point is not to replace those skills. The point is to orchestrate when each one should be used.

## Proposed Execution Style

Initial recommendation:

### `drive-until-blocked`

One invocation should continue until one of these happens:

1. a required human decision point is reached,
2. a route-back-to-plan event occurs,
3. a merge conflict or lifecycle problem requires operator intervention,
4. required metadata is missing,
5. the operator explicitly asked for a narrower action.

This is probably more useful than a "one step only" executor.

## State Model Sketch

The skill likely needs three different but connected state layers.

### 1. Plan execution state

Candidate values:

1. `draft`
2. `under_plan_review`
3. `approved_for_task_generation`
4. `executing`
5. `blocked_on_plan_refinement`
6. `blocked_on_task_refinement`
7. `blocked_on_bubble_review`
8. `done`

### 2. Task execution state

Candidate values:

1. `not_created`
2. `drafting`
3. `under_task_review`
4. `needs_task_refinement`
5. `route_back_to_plan`
6. `approved_for_doc_bubble`
7. `doc_bubble_running`
8. `doc_bubble_ready_for_review`
9. `doc_bubble_rework`
10. `approved_for_impl_bubble`
11. `impl_bubble_running`
12. `impl_bubble_ready_for_review`
13. `impl_bubble_rework`
14. `done`
15. `superseded`
16. `archived`

### 3. Bubble lifecycle state

This should come primarily from Pairflow, not from duplicate manual metadata.

Important extra dimension:

1. `bubble_purpose = document_refinement | implementation`
2. `execution_target = local | remote`

## Core Routing Logic

This is the current best approximation of the future executor logic.

### If plan is not ready

1. Run or continue plan review flow.
2. Do not create the next task yet.

### If no current task exists

1. Create the next task from the plan.
2. Mark it as the active task candidate.

### If current task exists but is not task-approved

1. Run task review flow.
2. If task needs refinement, refine it and review again.
3. If review says route back to plan, stop task progression and switch to plan-level re-sequencing.

### If task is approved and no document bubble exists yet

1. Commit task if required by workflow.
2. Start the document refinement bubble.

### If document refinement bubble is active

1. Let Pairflow continue.
2. When it reaches `READY_FOR_HUMAN_APPROVAL`, run deep review.
3. If findings remain, prefer rework.
4. If approved and merged, continue to implementation.

### If implementation bubble does not exist yet

1. Start the implementation bubble for the same task.

### If implementation bubble is active

1. Let Pairflow continue.
2. When it reaches `READY_FOR_HUMAN_APPROVAL`, run deep review.
3. If findings remain, prefer rework.
4. If approved and merged, continue to closeout.

### If implementation is merged

1. Update plan progress.
2. Update task status.
3. Archive task.
4. Select next task.
5. Continue if more work remains.

## Important Replanning Case 1: Route Back To Plan

This is one of the most important branches in the future design.

Observed pattern:

1. a task is created,
2. `ReviewSpec task-mode` reveals that the slice is wrong,
3. the correct action is not just local task polishing,
4. sequencing or decomposition must change at the plan level.

Important preference from current practice:

If the task turns out to be too large or wrongly shaped, do **not** try to preserve the original task as "split part 1" unless there is a very strong reason.

Preferred approach:

1. route back to plan,
2. revise sequencing,
3. create new task files,
4. mark the original task as superseded,
5. avoid carrying stale assumptions from the old task into the new split.

Why this matters:

Trying to mutate the original task into one half of a split often leaves behind irrelevant or contradictory scope fragments.

## Important Replanning Case 2: Bubble Non-Convergence

This is different from `route_back_to_plan`.

Observed pattern:

1. the task was review-approved,
2. the bubble still fails to converge after many rounds,
3. repeated P1/P2 findings suggest structural over-scope or missing decomposition,
4. the operator currently handles this manually by deleting or abandoning the bubble and rethinking the task split.

### V1 recommendation

Do **not** require the skill to infer this automatically yet.

Instead, support an operator hint such as:

```text
execute-pairflow-plan <plan> --hint "this bubble looks too broad / not converging"
```

or an equivalent natural-language trigger.

Then the skill can:

1. inspect the current state,
2. switch into task re-scoping mode,
3. help supersede the current task,
4. re-enter the plan/task review flow.

## Metadata That Is Probably Missing Today

This is likely the most important design section in the whole draft.

If `execute-pairflow-plan` should work reliably, more state must live in durable artifacts and less state can live only in the operator's head.

### Plan-level candidate metadata

Possible additions:

1. `plan_id`
2. `plan_status`
3. `active_task_id`
4. `task_order`
5. `completed_task_ids`
6. `superseded_task_ids`
7. `last_completed_task_id`
8. `next_action_hint`
9. `archive_group`
10. `execution_notes`

Open question:

How much of this should live in frontmatter versus in body sections?

### Task-level candidate metadata

Possible additions:

1. `artifact_id`
2. `status`
3. `plan_ref`
4. `sequence_index`
5. `execution_stage`
6. `doc_bubble_id`
7. `impl_bubble_id`
8. `supersedes`
9. `superseded_by`
10. `closed_at`
11. `archive_group`
12. `archive_path`

This would let the executor answer questions like:

1. What is the current active task?
2. Did a document bubble already run for this task?
3. Was this task superseded?
4. Which implementation bubble belongs to this task?
5. Is this task ready for archive or already archived?

## Archive Direction

Current archive behavior is not yet fully clear.

Working idea:

Create one archive directory per plan using a date-prefixed name:

```text
plans/archive/tasks/YYYY-MM-DD-<plan-slug>/
```

Benefits:

1. easier discovery,
2. better grouping by execution wave,
3. less ambiguity than a flat archive layout.

Open question:

Should the date represent:

1. the plan creation date,
2. the first execution date,
3. or the archive group creation date?

Initial guess:

Use the archive group creation date, because it is operationally the cleanest.

## Human Checkpoints That Should Remain Explicit

Even in a strong v1, some checkpoints should remain intentionally human-facing.

### Likely mandatory checkpoints

1. plan review approval,
2. task review approval,
3. document bubble approval decision after deep review,
4. implementation bubble approval decision after deep review,
5. merge-conflict resolution,
6. ambiguous re-scoping decisions,
7. any case where artifacts disagree about the current state.

The future skill can still automate everything around these points, but should not hide them.

## Early Non-Goals For V1

To avoid building too much too early, v1 should probably **not** try to do these:

1. auto-detect broad-task non-convergence without an operator hint,
2. rewrite plans and tasks freely without clear state transitions,
3. infer intent from incomplete artifacts when a safe stop would be better,
4. collapse document refinement and implementation into one bubble,
5. replace the deep review checkpoint with blind lifecycle automation.

## Practical Design Principle

This future skill should probably be designed as:

1. **state-aware**,
2. **sub-workflow-driven**,
3. **metadata-backed**,
4. **continue-until-blocked**,
5. **human-checkpoint-preserving**.

If those five traits hold, the resulting system should be easier to trust and easier to later port into Pairflow core behavior.

## Open Questions

These questions should be resolved before hardening this into a PairflowSpec-shaped artifact.

1. What is the canonical source of truth for "which task is next"?
2. Should plan progress be stored only in the plan file, or also mirrored into task files?
3. Which execution states deserve explicit metadata, and which should be derived dynamically?
4. How much "task refinement" is allowed before the skill must formally mark the task as superseded?
5. Should document refinement bubbles always use inline `--task`, or should that remain a preference rather than a rule?
6. How should remote execution preference be expressed: plan-level default, task-level override, or bubble-level choice only?
7. What exact archive contract should be adopted?
8. How should the executor report partial progress when it stops at a checkpoint?
9. What is the smallest metadata set that makes state resolution trustworthy?
10. Which parts should become dedicated sub-workflows first, and which parts can remain inline in the main skill for v1?

## Suggested Next Step

After this draft is refined, the next artifact should probably be a more structured design note that answers:

1. exact state model,
2. exact metadata contract,
3. sub-workflow inventory,
4. entry command shapes,
5. stop conditions,
6. operator hint model,
7. archive policy.

Only after that should this become:

1. a repo-local skill source,
2. and later, if it proves trustworthy, a candidate for Pairflow productization.
