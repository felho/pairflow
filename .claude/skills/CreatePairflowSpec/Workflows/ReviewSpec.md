# ReviewSpec Workflow

Review a spec artifact for planning correctness, not implementation quality.

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

Planning/spec review only.

Allowed:
1. plan/task boundary review
2. phase/task shape review
3. parent-plan fit review
4. remaining-task viability review
5. route-back-to-plan decisions

Forbidden:
1. implementation/code review
2. bubble/process review
3. runtime validation demands that are unrelated to the spec boundary itself

## Workflow

### 0) Resolve artifact type

1. Detect whether the target artifact is a `plan` or `task`.
2. If ambiguous, infer from frontmatter or ask one focused blocker question.
3. If `task`, load `plan_ref` when present.
4. If `plan`, load referenced task files when they are explicitly listed and available.

### 1) Context-first load

Read, in this order:
1. target artifact
2. referenced parent artifact(s)
3. directly referenced sibling/downstream task artifacts when needed for viability review
4. only the minimum extra references needed to judge boundary correctness

For `task` review, parent plan context is mandatory when `plan_ref` exists.

### 2) Run planning gates against the artifact

Apply the relevant planning gates:
1. `Control-Model Readiness Gate`
2. `Authority Fan-out Scan`
3. `Closure-Budget Gate`
4. `Bounded-Task-Shape Gate`
5. `Complexity-Risk Gate`
6. `Remaining-Task Viability Check`

Policy:
1. Review whether the artifact still fits the planning shape it claims.
2. Do not approve a task just because it is internally coherent if it no longer fits the parent plan.
3. Do not approve a plan just because its current phase text reads well if downstream listed tasks are no longer viable under it.

### 3) Review a plan

When reviewing a `plan`, check:
1. whether each phase has one clear primary task shape
2. whether producer, fail-closed hardening, and coordination work are separated when needed
3. whether the `Phase Ownership Grid` and split rationale are still valid
4. whether the task list still matches the phase structure
5. whether downstream open tasks remain viable if this plan is accepted as written

Decision outcomes:
1. `approve_plan`
2. `refine_plan`
3. `split_plan`
4. `block_not_ready`

### 4) Review a task

When reviewing a `task`, check:
1. whether the bounded task shape is explicit and still true
2. whether producer work has absorbed fail-closed or coordination scope
3. whether precondition-before-side-effect rules are explicit when needed
4. whether the task still fits its parent phase and parent plan boundary
5. whether downstream open tasks remain viable if this task is accepted as written

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

### 6) Build the review result

Always include:
1. artifact reviewed
2. artifact type
3. parent-plan context used or not used
4. planning gates applied
5. findings
6. decision
7. remaining-task impact summary
8. downstream task statuses when applicable

### 7) Output rules

Findings should be planning-language, not code-review shorthand.

For each material finding, explain:
1. what boundary or assumption is wrong
2. why that matters for later implementation
3. whether the fix is local artifact refinement or plan-level re-sequencing

## Output

Produce:
1. a review summary
2. a decision:
   - `approve_plan|refine_plan|split_plan|approve_task|refine_task|route_back_to_plan|block_not_ready`
3. a `Remaining Task Impact` section
4. when applicable, a downstream task table:
   - `Task | Status | Why | Required Action`
