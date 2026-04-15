# Remaining-Task Viability Check

Use this check during plan or task review when the artifact sits inside a larger phase/task sequence.

The purpose is to prevent a local approval from silently breaking the rest of the plan.

## Core Question

If the current artifact is accepted unchanged, do the remaining open tasks still remain correct and implementable as written?

If the answer is "not clearly yes", the review must say so explicitly.

## What counts as a remaining open task

Use the best available source in this order:
1. tasks explicitly listed in the parent plan
2. task refs explicitly named in the reviewed artifact
3. sibling tasks clearly implied by the current phase structure

Prefer explicit artifact refs over guessed discovery.

## Per-task status values

For each downstream task, classify:
1. `valid_as_is`
2. `needs_refinement`
3. `must_split`
4. `obsolete`
5. `phase_order_invalid`

Meanings:
1. `valid_as_is`: still fits the accepted plan/task boundary without modification
2. `needs_refinement`: intent still stands, but the task text or scope must be updated
3. `must_split`: the task is now too wide or contains mixed closures under the accepted artifact
4. `obsolete`: the task is no longer needed because the accepted artifact absorbed or eliminated its purpose
5. `phase_order_invalid`: the task may still be needed, but not in the current sequence

## Artifact-level impact values

Summarize overall downstream impact as one of:
1. `unchanged`
2. `needs_task_refinement`
3. `needs_plan_refinement`
4. `split_new_task_required`
5. `obsolete_task_detected`
6. `phase_order_invalidated`

## Required checks

Review at least these:
1. Do downstream tasks still assume the same control model?
2. Do downstream tasks still assume the same phase ordering?
3. Do downstream tasks still fit the same bounded-task shape?
4. Has the current artifact absorbed fail-closed or coordination work that makes a later task obsolete or malformed?
5. Has the current artifact changed precondition-before-side-effect assumptions that downstream tasks relied on?

## Decision rule

Do not issue a clean approval when:
1. one or more remaining tasks are no longer viable as written
2. a downstream task must split because of the accepted artifact
3. the parent phase ordering is no longer valid
4. the correct next action is plan refinement rather than local task refinement

In those cases, surface the route explicitly:
1. `refine_plan`
2. `route_back_to_plan`
3. `split_plan`
4. `needs_task_refinement`
