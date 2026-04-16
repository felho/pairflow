# ReviewSpec Workflow

Review a spec artifact for planning correctness.

This workflow has two distinct modes:
1. `plan-mode`: coverage, dependency, sequencing, and remaining-task viability review
2. `task-mode`: task-boundary review using the task artifact plus target-file scope reality checks

This workflow exists to catch:
- over-wide plans before task creation,
- over-wide tasks before implementation,
- plan/task drift after refinement,
- and cases where the remaining open tasks are no longer viable if the current artifact is accepted unchanged.

## Input

- `USER_REQUEST`
- `TARGET_PATH` or explicit artifact ref
- optional `ARTIFACT_TYPE` (`plan|task`)
- optional context refs

## Scope

Planning/spec review only, but not artifact-only.

Allowed:
1. plan/task boundary review
2. phase/task shape review
3. parent-plan fit review
4. remaining-task viability review
5. route-back-to-plan decisions
6. task target-file reality checks that verify bounded-slice claims
7. minimal code-path/entrypoint inspection needed to decide actual scope ownership

Forbidden:
1. implementation/code review for bugs, correctness defects, or quality grading
2. bubble/process review
3. runtime validation demands that are unrelated to the spec boundary itself

Clarification:
1. `task-mode` may inspect target files and adjacent entrypoints to verify whether the task's claimed scope is true.
2. That is not the same as implementation review. The purpose is boundary validation, not bug-finding.

## Workflow

### 0) Resolve artifact type

1. Detect whether the target artifact is a `plan` or `task`.
2. If ambiguous, infer from frontmatter or ask one focused blocker question.
3. Set review mode explicitly:
   - `plan-mode` for `plan`
   - `task-mode` for `task`
4. If `task`, load `plan_ref` when present.
5. If `plan`, load referenced task files when they are explicitly listed and available.

### 1) Context-first load

Read, in this order:
1. target artifact
2. referenced parent artifact(s)
3. directly referenced sibling/downstream task artifacts when needed for viability review
4. only the minimum extra references needed to judge boundary correctness

Additional mode-specific load:
1. In `plan-mode`, load only the minimum downstream task refs needed to judge coverage, dependency, and remaining-task viability.
2. In `task-mode`, inspect the declared `target_files` when they exist, and inspect adjacent call-sites/entrypoints when needed to verify the real bounded slice.

For `task` review, parent plan context is mandatory when `plan_ref` exists.

### 2) Apply Review Gates by Mode

For `plan-mode`, apply:
1. `Control-Model Readiness Gate`
2. `Remaining-Task Viability Check`

For `task-mode`, apply:
1. `Target-File Reality Check`
2. `Control-Model Readiness Gate`
3. `Authority Fan-out Scan`
4. `Closure-Budget Gate`
5. `Bounded-Task-Shape Gate`
6. `Complexity-Risk Gate`
7. `Remaining-Task Viability Check`

Policy:
1. Review whether the artifact still fits the planning shape it claims.
2. Do not approve a task just because it is internally coherent if it no longer fits the parent plan.
3. Do not approve a plan just because its current phase text reads well if downstream listed tasks are no longer viable under it.
4. In `task-mode`, if the target-file reality check disagrees with the task label, trust the reality check.
5. Do not hide a widened scope behind the phrase "implementation review is forbidden." Scope-reality validation is mandatory in `task-mode`.

### 2a) Target-File Reality Check (`task-mode`)

When `target_files` are known and the files exist, inspect them and, when needed, their adjacent entrypoints.

Minimum checks:
1. Is any target file a mutation entrypoint (`route.ts`, write path, command handler, mutation service)?
2. Does the touched scope include producer behavior, fail-closed behavior, or coordination/concurrency behavior?
3. Does the touched scope change precondition-before-side-effect ordering?
4. Are rollback/retry/cleanup/shared-state preservation branches present?
5. Does the actual scope still match the task's claimed bounded-task shape?

Outcome:
1. Record whether the task is still correctly classified.
2. If not, require `refine_task` or `route_back_to_plan`.

### 3) Review in `plan-mode`

When reviewing a `plan`, check:
1. whether the objective and done definition are explicit enough
2. whether the open task list still covers every required plan-level gap
3. whether dependency/order is explicit where correctness depends on it
4. whether the plan-level control model is explicit enough for downstream tasks
5. whether any lightweight sequencing note is sufficient where multi-consumer authority ordering matters
6. whether downstream open tasks remain viable if this plan is accepted as written

Decision outcomes:
1. `approve_plan`
2. `refine_plan`
3. `split_plan`
4. `block_not_ready`

### 4) Review in `task-mode`

When reviewing a `task`, check:
1. whether the target-file reality check supports the claimed bounded slice
2. whether the bounded task shape is explicit and still true
3. whether producer work has absorbed fail-closed or coordination scope
4. whether precondition-before-side-effect rules are explicit when needed
5. whether the task still fits its parent gap and parent plan boundary
6. whether downstream open tasks remain viable if this task is accepted as written

Decision outcomes:
1. `approve_task`
2. `refine_task`
3. `route_back_to_plan`
4. `block_not_ready`

### 5) Run the Remaining-Task Viability Check

Use `references/Remaining-Task-Viability-Check.md`.

For the remaining open tasks, decide whether each is:
1. `valid_as_is`
2. `needs_refinement`
3. `must_split`
4. `obsolete`
5. `phase_order_invalid`

Artifact-level impact must be summarized as one of:
1. `unchanged`
2. `needs_task_refinement`
3. `needs_plan_refinement`
4. `split_new_task_required`
5. `obsolete_task_detected`
6. `phase_order_invalidated`

Policy:
1. A local artifact approval is not enough when downstream tasks are no longer viable.
2. If the current artifact invalidates downstream task assumptions, the review must say so explicitly.
3. If a task review discovers a parent-plan mismatch, prefer `route_back_to_plan` over pretending the task can be patched locally.
4. If a task review discovers that the actual touched scope is wider than the artifact claims, prefer `refine_task` for local bounded-slice fixes and `route_back_to_plan` when the sequence itself is now wrong.

### 6) Build the review result

Always include:
1. artifact reviewed
2. artifact type
3. review mode used (`plan-mode|task-mode`)
4. parent-plan context used or not used
5. planning gates applied
6. whether target-file reality check was used
7. findings
8. decision
9. remaining-task impact summary
10. downstream task statuses when applicable

### 7) Output rules

Findings should be planning-language, not code-review shorthand.

For each material finding, explain:
1. what boundary or assumption is wrong
2. why that matters for later implementation
3. whether the fix is local artifact refinement or plan-level re-sequencing

Additional task-mode rule:
1. If the task label and target-file reality disagree, say that explicitly.
2. Phrase the issue as bounded-slice drift, hidden scope, or parent-plan mismatch, not as a code bug.

## Output

Produce:
1. a review summary
2. a decision:
   - `approve_plan|refine_plan|split_plan|approve_task|refine_task|route_back_to_plan|block_not_ready`
3. a `Remaining Task Impact` section
4. when applicable, a downstream task table:
   - `Task | Status | Why | Required Action`
