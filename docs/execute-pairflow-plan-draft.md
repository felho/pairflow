# ExecutePairflowPlan Draft

Status: superseded exploratory draft
Date: 2026-04-27

Current authority: repo-local `ExecutePairflowPlan` skill source under
`.claude/skills/ExecutePairflowPlan/**`, plus the archived implementation plan
and tasks for the 2026-04-28 ExecutePairflowPlan work. This draft is retained
for early design rationale only.

## Purpose

This document was a thinking draft for a future `ExecutePairflowPlan` skill.

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
ExecutePairflowPlan <plan>
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
   - This should use the `CreatePairflowSpec` skill's `CreateTask` workflow, not ad hoc task-file authoring.
2. Run the `ReviewSpec` workflow in `task-mode`.
3. Based on the result:
   - task is approved,
   - task needs refinement,
   - or route back to plan.

### Phase 3: Document refinement bubble

If the task is approved at spec level:

1. Commit the task.
2. Start a **document refinement** bubble for that task.
   - This should use the `UsePairflow` skill's `CreateBubble` workflow.
3. In practice this is usually started with inline `--task`, even when the task document is the source material.
4. Let Pairflow run the loop.
5. When bubble state reaches `READY_FOR_HUMAN_APPROVAL`, run an additional deep review round before deciding.
   - This should use the `UsePairflow` skill's `ReviewBubble` workflow.
6. If deep review finds issues, prefer `rework`.
7. If the result is acceptable, approve, merge, and clean up the bubble.
   - This should use the `UsePairflow` skill's `CloseBubble` workflow.

### Phase 4: Implementation bubble

After the document refinement bubble is merged:

1. Start the **implementation** bubble for the same task.
   - This should use the `UsePairflow` skill's `CreateBubble` workflow.
2. In practice this is usually started with `--task-file`.
3. Let Pairflow run the loop.
4. When the bubble reaches `READY_FOR_HUMAN_APPROVAL`, run another deep review round.
   - This should use the `UsePairflow` skill's `ReviewBubble` workflow.
5. Decide `approve` or `rework`.
6. If approved, merge the implementation.
   - This should use the `UsePairflow` skill's `CloseBubble` workflow.
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

For the initial version of this future skill, the default and expected execution target should be `local`.

Reason:

1. the local path should become trustworthy first,
2. the orchestration logic should stabilize before adding remote-execution complexity,
3. remote support can be added later as an explicit extension once the local executor behavior is reliable.

Remote matters because:

1. heavier compute should not burden the laptop,
2. bubbles should be able to continue while the laptop is closed,
3. trust in the remote path is still being built, but the lifecycle model should stay aligned with local.

This suggests that `local` vs `remote` should be a bubble execution attribute, not a separate plan executor mode.

## Proposed Skill Direction

The future skill should be named:

1. `ExecutePairflowPlan`

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

### Orchestrator mode

The top-level `ExecutePairflowPlan` skill should act as an orchestrator, not as a direct participant in every downstream workflow.

Working rule:

1. the top-level skill decides what should happen next,
2. it delegates the actual plan/task/bubble workflow execution to the corresponding specialized workflow,
3. it then evaluates the result and decides the next step.

This matters because the top-level skill should not accumulate so much mixed execution context that it starts biasing review or refinement decisions downstream.

### Fresh-context sub-workflow execution

When `ExecutePairflowPlan` invokes a downstream workflow, that downstream workflow should generally run in a fresh context window as a sub-agent execution.

This is especially important for review-oriented workflows such as:

1. `CreatePairflowSpec` `ReviewSpec` in `plan-mode`
2. `CreatePairflowSpec` `ReviewSpec` in `task-mode`
3. `UsePairflow` `ReviewBubble`

Reason:

1. these workflows should judge the current artifact or bubble on its own terms,
2. they should not be overly biased by a long orchestration history,
3. repeated refinement loops are normal, and each review pass should remain as clean as possible from prior context pollution.

Practical implication:

1. `ExecutePairflowPlan` should usually keep only orchestration state in its own context,
2. specialized workflows should receive the minimum correct input context they need,
3. but they should still run in a fresh execution window whenever feasible.

## Likely Workflows

These should follow the same style as `CreatePairflowSpec`:

1. CamelCase
2. VerbNoun form
3. short names that describe the operator-facing action clearly

First-cut workflow inventory:

1. `FixPlanMetadata`
   - bootstrap/repair workflow for legacy or incomplete plan metadata before normal execution starts
2. `ResolvePlanState`
   - resolves current plan/task execution state and decides the next workflow route
3. `ReviewPlan`
   - implemented via `CreatePairflowSpec` `ReviewSpec` in `plan-mode`
4. `CreateTask`
   - implemented via `CreatePairflowSpec` `CreateTask`
5. `ReviewTask`
   - implemented via `CreatePairflowSpec` `ReviewSpec` in `task-mode`
6. `CreateDocumentBubble`
   - implemented via `UsePairflow` `CreateBubble`
7. `ReviewDocumentBubble`
   - implemented via `UsePairflow` `ReviewBubble`
8. `CloseDocumentBubble`
   - implemented via `UsePairflow` `CloseBubble`
9. `CreateImplementationBubble`
   - implemented via `UsePairflow` `CreateBubble`
10. `ReviewImplementationBubble`
   - implemented via `UsePairflow` `ReviewBubble`
11. `CloseImplementationBubble`
   - implemented via `UsePairflow` `CloseBubble`
12. `UpdateProgress`
13. `RefinePlan`
14. `TroubleshootBubble`

Some of these may later map directly onto existing skills:

1. `CreatePairflowSpec`
2. `UsePairflow`

The point is not to replace those skills. The point is to orchestrate when each one should be used.

Working allocation:

1. document artifact work should route through `CreatePairflowSpec`,
2. bubble lifecycle work should route through `UsePairflow`.

Execution expectation:

1. `ExecutePairflowPlan` remains the orchestrator layer,
2. `CreatePairflowSpec` and `UsePairflow` workflow invocations should usually run as fresh-context sub-agent executions,
3. the orchestrator should not try to "become" the downstream workflow in the same overloaded context window.

## Proposed Execution Style

Initial recommendation:

### `drive-until-blocked`

One invocation should continue until one of these happens:

1. a required human decision point is reached,
2. a merge conflict or lifecycle problem requires operator intervention,
   - typically via `UsePairflow` `InterveneBubble` or `TroubleshootBubble`,
3. required metadata is missing and cannot be repaired mechanically,
4. the operator explicitly asked for a narrower action,
5. a route-back-to-plan outcome requires a real product or architecture decision rather than a mechanical feedback-driven correction.

This is probably more useful than an executor that performs only one small action per invocation and then stops.

In other words, the preferred behavior is:

1. inspect state,
2. perform the next correct workflow step,
3. keep going through subsequent obvious steps,
4. stop only when a real blocker or human checkpoint is reached.

### Gradual Consistency

One important design principle behind Pairflow more generally is what can be called **Gradual Consistency**.

Meaning:

1. in many cases an LLM can do a very good job,
2. but not always in one pass,
3. acceptable output quality is often reached gradually through repeated review and refinement loops.

This is one reason why loops are valuable in the first place.

For example:

1. a plan is reviewed,
2. feedback is applied,
3. the plan is reviewed again,
4. more issues are found,
5. the artifact improves again,
6. and after a few loops it reaches an acceptable state.

So repeated refinement should not be treated as an exceptional failure mode by default.

In many cases it is simply the normal way to move an artifact toward a trustworthy state.

## State Model Sketch

The skill likely needs three different but connected state layers.

Important design caution:

The same detailed task execution state should probably **not** be stored as authority in both the plan and the task artifact.

Reason:

1. duplicated state is hard to keep in sync,
2. in practice it usually drifts,
3. the plan and the task likely need different granularity anyway.

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

Recommended interpretation:

1. the plan should carry a lightweight orchestration view,
2. it should answer "what is the next task and what is the overall progress?",
3. it should not mirror every detailed state transition of every task.

### 2. Task execution state

This should exist only once the task artifact itself exists.

So `not_created` is probably **not** a task-level state. It is a plan-level tracker state.

Candidate values:

1. `drafting`
2. `under_task_review`
3. `needs_task_refinement`
4. `route_back_to_plan`
5. `approved_for_doc_bubble`
6. `doc_bubble_running`
7. `doc_bubble_ready_for_review`
8. `doc_bubble_rework`
9. `approved_for_impl_bubble`
10. `impl_bubble_running`
11. `impl_bubble_ready_for_review`
12. `impl_bubble_rework`
13. `done`
14. `superseded`
15. `archived`

Recommended interpretation:

1. the task should be the detailed local execution artifact,
2. detailed bubble-related and execution-related states should live here,
3. the plan should not try to duplicate all of them.

### 3. Bubble lifecycle state

This should come primarily from Pairflow, not from duplicate manual metadata.

Important extra dimension:

1. `bubble_purpose = document_refinement | implementation`
2. `execution_target = local | remote`

### Recommended authority split

Working direction:

1. `Plan = lightweight progress tracker + sequencing/orchestration view`
2. `Task = detailed execution artifact`
3. `Pairflow bubble = lifecycle authority for running/closed bubble state`

This would keep each artifact responsible for a different level of truth.

## Core Routing Logic

This is the current best approximation of the future executor logic.

### If plan metadata is missing or invalid

1. Do not stop by default.
2. Run `FixPlanMetadata` first.
3. Continue into normal state resolution only after the plan has the minimum required metadata shape.

Working assumption:

1. plan metadata may be incomplete on legacy plans,
2. task metadata is more trustworthy once tasks are created by this workflow system,
3. so metadata repair is primarily a plan-entry bootstrap concern.

### If plan is not ready

1. Run or continue plan review flow.
   - This should route through `CreatePairflowSpec` plan-level workflows rather than free-form plan editing.
2. Do not create the next task yet.

### If no current task exists

1. Create the next task from the plan.
   - Use `CreatePairflowSpec` `CreateTask`.
2. Mark it as the active task candidate.

### If current task exists but is not task-approved

1. Run task review flow.
2. If task needs refinement, refine it and review again.
3. If review says route back to plan, do not treat that as an automatic stop condition.
4. Apply the feedback-driven plan correction and continue.
   - Any required plan correction here should use `CreatePairflowSpec` `CreatePlan`.
5. Stop only if the feedback exposes a genuine product or architecture decision that the skill cannot resolve confidently.

### If task is approved and no document bubble exists yet

1. Commit task if required by workflow.
2. Start the document refinement bubble.
   - Use `UsePairflow` `CreateBubble`.

### If document refinement bubble is active

1. Let Pairflow continue.
2. When it reaches `READY_FOR_HUMAN_APPROVAL`, run deep review.
   - Use `UsePairflow` `ReviewBubble`.
3. If findings remain, prefer rework.
4. If approved and merged, continue to implementation.
   - Use `UsePairflow` `CloseBubble`.

### If implementation bubble does not exist yet

1. Start the implementation bubble for the same task.
   - Use `UsePairflow` `CreateBubble`.

### If implementation bubble is active

1. Let Pairflow continue.
2. When it reaches `READY_FOR_HUMAN_APPROVAL`, run deep review.
   - Use `UsePairflow` `ReviewBubble`.
3. If findings remain, prefer rework.
4. If approved and merged, continue to closeout.
   - Use `UsePairflow` `CloseBubble`.

### If implementation is merged

1. Update plan progress.
2. Update task status.
3. Archive task.
4. Select next task.
5. Continue if more work remains.

## Important Replanning Case 1: Task Review Routes Back To Plan

This is one of the most important branches in the future design.

It starts as a task review outcome, but the required correction happens at the plan level.

`route back to plan` should not be interpreted as failure by itself.

In many cases it is just a signal that the next correct step is a mostly mechanical plan-level correction based on review feedback.

This also fits the broader `Gradual Consistency` model:

1. the first review pass may surface one class of issues,
2. the second pass may surface another,
3. and the artifact may need multiple improvement loops before it becomes acceptable.

So a route-back outcome often means "continue the refinement loop at the plan level", not "the process failed".

Observed pattern:

1. a task is created,
2. `ReviewSpec task-mode` reveals that the slice is wrong,
3. the correct action is not just local task polishing,
4. sequencing or decomposition must change at the plan level.

Common cases:

1. the plan is missing some details,
2. the sequencing needs adjustment,
3. the task should be reshaped,
4. the task is fine but the upstream plan wording is incomplete.

Important workflow implication:

1. task creation should happen through `CreatePairflowSpec` `CreateTask`,
2. any plan correction triggered by task review should happen through `CreatePairflowSpec` `CreatePlan`,
3. the future executor should treat those as distinct workflow routes, not as generic "edit whichever doc seems needed" behavior.

Default expectation:

1. if the feedback is mechanical and the correct fix is clear, the skill should apply it and continue,
2. if the feedback reveals a real product or architecture choice, the skill should stop and ask for human direction.

Important preference from current practice:

If the task turns out to be too large or wrongly shaped, do **not** try to preserve the original task as "split part 1" unless there is a very strong reason.

Preferred approach:

1. route back to plan,
2. revise sequencing,
3. create new task files,
4. mark the original task as superseded,
5. archive the original task,
6. avoid carrying stale assumptions from the old task into the new split.

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
ExecutePairflowPlan <plan> --hint "this bubble looks too broad / not converging"
```

or an equivalent natural-language trigger.

Then the skill can:

1. inspect the current state,
2. switch into task re-scoping mode,
3. help supersede the current task,
4. re-enter the plan/task review flow.

## Metadata That Is Probably Missing Today

This is likely the most important design section in the whole draft.

If `ExecutePairflowPlan` should work reliably, more state must live in durable artifacts and less state can live only in the operator's head.

Another practical issue:

1. not every existing plan currently has the metadata this future executor would need,
2. while newly created tasks can increasingly be assumed to follow the required metadata contract if they are produced by the workflow,
3. so plan metadata repair/bootstrap likely needs to be an explicit part of the design.

### Plan-level candidate metadata

Possible additions:

1. `plan_id`
2. `plan_status`
3. `active_task_id`
4. `task_order`
5. `task_tracker`
6. `last_completed_task_id`
7. `next_action_hint`
8. `archive_group`
9. `execution_notes`

The key point here is that `task_tracker` should probably stay minimal.

This also suggests a likely rollout pattern:

1. legacy plans may first need a metadata bootstrap pass,
2. after that, normal plan execution can rely on the repaired metadata,
3. tasks created by the new workflow can then be expected to follow the contract from the start.

For example, each tracked task entry might need only:

1. `task_id`
2. `task_path` or `null`
3. high-level `status`
4. short `notes` when needed

Candidate high-level plan-tracker statuses:

1. `not_created`
2. `draft`
3. `under_review`
4. `approved`
5. `in_progress`
6. `done`
7. `superseded`
8. `archived`

Open question:

How much of this should live in frontmatter versus in body sections?

### Task-level candidate metadata

Possible additions:

1. `artifact_id`
2. `task_family_id`
3. `sequence_key`
4. `task_id`
5. `status`
6. `plan_ref`
7. `execution_stage`
8. `doc_bubble_id`
9. `impl_bubble_id`
10. `supersedes`
11. `superseded_by`
12. `closed_at`
13. `archive_group`
14. `archive_path`

### Task ID vs sequencing

It is probably useful to distinguish:

1. a logical task family,
2. a sequencing label,
3. and the concrete executable task identity.

Working direction:

1. `task_family_id` should identify the logical slice or family,
2. `sequence_key` should identify the concrete ordering/split branch,
3. `task_id` should be the canonical executable task ID derived from those two.

Reason:

1. labels like `phase one`, `phase one A`, `phase one B` are readable,
2. but they are not stable if tasks are inserted, split, or resequenced,
3. a purely family-level ID is not enough if later two related tasks become independently executable in parallel,
4. the executor likely needs a stable concrete ID for task tracking, supersession, bubble linkage, and archive mapping.

So the likely pattern is:

1. `task_family_id` = canonical family slug,
2. `sequence_key` = short ordering/split label such as `1`, `1a`, `1b`, `2`,
3. `task_id` = canonical executable ID, likely derived as `<sequence_key>-<task_family_id>`.

This would allow:

1. stable machine references for the actual executable task,
2. shared family identity across split siblings,
3. human-friendly ordering,
4. room for future parallel execution of sibling tasks without identity collision.

### Task filename direction

The task filename should likely be derived directly from the canonical executable task ID:

1. `<task_id>.md`

This keeps:

1. the filename stable,
2. the artifact lookup simple,
3. the plan/task/bubble references aligned around the same concrete task identity.

Example shape:

1. `task_family_id = billing-webhook`
2. `sequence_key = 1a`
3. `task_id = 1a-billing-webhook`
4. filename = `1a-billing-webhook.md`

### Bubble naming direction

If this model is adopted, bubble IDs can likely be derived from the canonical `task_id`:

1. `doc_bubble_id = <task_id>-doc`
2. `impl_bubble_id = <task_id>-impl`

This keeps task identity and bubble identity aligned, while still letting the task metadata persist the concrete bubble IDs after creation.

This would let the executor answer questions like:

1. What is the current active task?
2. Did a document bubble already run for this task?
3. Was this task superseded?
4. Which implementation bubble belongs to this task?
5. Is this task ready for archive or already archived?

Working rule:

1. high-level progress visibility can live in the plan,
2. detailed execution state should live in the task,
3. the plan should summarize task state, not duplicate it field-for-field.

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
6. ambiguous re-scoping, product, or architecture decisions,
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

## Recommended Decisions

The following decisions are the current recommended baseline for the first version of `ExecutePairflowPlan`.

### 1. Canonical source of truth for "which task is next"

Recommendation:

1. the **plan** is the canonical authority for task sequencing,
2. the task artifact is not the authority for deciding what comes next.

Working rule:

1. `Plan = sequencing authority`
2. `Task = local execution authority`

### 2. Plan progress vs task progress

Recommendation:

1. do not mirror the same detailed execution state in both the plan and the task,
2. let the plan keep a minimal aggregated progress view,
3. let the task keep the detailed execution state.

### 3. Explicit metadata vs derived state

Recommendation:

1. persist only the minimum identity, linkage, and sequencing metadata,
2. derive transient execution decisions dynamically whenever possible,
3. keep bubble lifecycle authority in Pairflow rather than duplicating it in plan/task metadata.

### 4. When a task becomes superseded

Recommendation:

1. do not use refinement count as the trigger,
2. mark a task as superseded only when its executable identity changes.

Working rule:

1. identity drift triggers supersession,
2. repeated refinement alone does not.

### 5. Bubble creation responsibility

Recommendation:

1. `ExecutePairflowPlan` should not own the low-level bubble create/start choice,
2. bubble management should be delegated to `UsePairflow`.

Working implication:

1. the orchestrator should express intent such as "start a document refinement bubble for this task",
2. `UsePairflow` should decide the concrete Pairflow create/start route from its own workflow contract.

### 6. Remote execution scope for v1

Recommendation:

1. v1 should be strictly local-only,
2. remote execution should be explicitly out of scope for the first version.

Reason:

1. local orchestration should become trustworthy first,
2. remote support can be designed later as a separate extension once the local path is stable.

### 7. Archive contract

Recommendation:

1. archive tasks per plan group,
2. use a date-prefixed archive directory,
3. keep the filename as `task_id.md`,
4. archive both completed and superseded tasks.

Working shape:

```text
plans/archive/tasks/YYYY-MM-DD-<plan-slug>/<task_id>.md
```

### 8. Executor progress reporting

Recommendation:

1. the executor should provide orchestrator commentary during the run,
2. it should not emit a final answer for intermediate orchestration steps,
3. it should emit a final answer only when the run has reached a settled checkpoint.

Typical settled checkpoints:

1. the next bubble has been started,
2. the plan is complete,
3. a real human checkpoint has been reached,
4. a real blocker has been reached.

### 9. Minimum trustworthy metadata set

Recommendation:

1. use the smallest metadata set that still supports trustworthy state resolution,
2. avoid introducing broader metadata surface until a concrete need appears.

Current minimum direction:

1. plan metadata should cover sequencing and task tracking,
2. task metadata should cover identity, linkage, lineage, and bubble references.

### 10. Sub-workflows vs inline orchestration in v1

Recommendation:

1. review-critical and bubble-critical operations should become dedicated sub-workflows first,
2. `ResolvePlanState` should own both state assessment and next-workflow decision,
3. simple orchestration glue can remain in the main skill for v1.

Additional design rule:

1. if a sub-workflow description becomes long or operationally detailed, that alone is a good trigger to move it into a dedicated workflow file,
2. the main skill file should remain lean and primarily hold routing rules, execution principles, and high-level contracts.

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
