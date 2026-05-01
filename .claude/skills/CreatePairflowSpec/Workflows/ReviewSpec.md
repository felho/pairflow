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
8. repo-local source-anchor comparison when a refined artifact touches a closed authority/shared contract

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
4. repo-local source-of-truth anchors when canonical contract meaning may have been refined
5. `../ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md` when
   the artifact is plan-linked or intended for `ExecutePairflowPlan`
6. only the minimum extra references needed to judge boundary correctness

Additional mode-specific load:
1. In `plan-mode`, load only the minimum downstream task refs needed to judge coverage, dependency, and remaining-task viability.
2. In `task-mode`, inspect the declared `target_files` when they exist, and inspect adjacent call-sites/entrypoints when needed to verify the real bounded slice.

For `task` review, parent plan context is mandatory when `plan_ref` exists.

### 1a) Execution metadata gate

Apply this gate before content-level approval when the artifact is plan-linked or
intended for `ExecutePairflowPlan`.

For plans, verify:

1. required plan frontmatter exists:
   `plan_id`, `created_on`, `plan_status`, `task_order`, `task_tracker`,
   `active_task_id`, and `archive_group`
2. `archive_group` equals `<created_on>-<plan_id>`
3. every tracker `task_id` appears exactly once in `task_order`
4. planned-but-not-created tracker rows use `task_path: null` and
   `status: not_created`
5. no future task identity is prose-only or filename-only

For tasks, verify:

1. required task frontmatter exists:
   `task_family_id`, `sequence_key`, `task_id`, `doc_bubble_id`,
   `impl_bubble_id`, `supersedes`, and `superseded_by`
2. `sequence_key` is a short ordering key such as `1`, `1a`, or `2`, not a
   display label such as `task-01`
3. `task_id` equals `<sequence_key>-<task_family_id>`
4. the task filename equals `<task_id>.md`
5. the task identity satisfies the derived bubble-id length budget:
   - `sequence_key` is 1-5 characters, allowing future split keys such as
     `100`, `100a`, and `100a1`
   - fresh `task_family_id` is at most 29 characters
   - `task_id` is at most 35 characters
   - derived `<task_id>-doc` and `<task_id>-impl` are each at most 40 characters
6. parent plan `task_order` / `task_tracker` agrees with the task identity and
   path when `plan_ref` exists
7. lineage fields are present and consistent
8. bubble ids are linkage-only values and do not encode lifecycle state
9. task review may approve a task for document-bubble routing, but it must not
   set `status: implementable`; that status is owned by ExecutePairflowPlan
   document-bubble close after approval/merge

Outcome:

1. If the execution metadata is missing, malformed, or non-deterministic, return
   `refine_plan` / `refine_task` unless the artifact cannot safely be repaired
   locally.
2. If repairing the task identity would require changing the parent plan's
   canonical task order/tracker, return `route_back_to_plan`.
3. Do not return `approve_plan` or `approve_task` while this gate fails.

### 2) Apply Review Gates by Mode

For `plan-mode`, apply:
1. Execution metadata gate when applicable
2. `Control-Model Readiness Gate`
3. `Closed-Contract Drift Check` when applicable
4. `Remaining-Task Viability Check`

For `task-mode`, apply:
1. Execution metadata gate when applicable
2. `Target-File Reality Check`
3. `Control-Model Readiness Gate`
4. `Closed-Contract Drift Check` when applicable
5. `Authority Fan-out Scan`
6. `Closure-Budget Gate`
7. `Bounded-Task-Shape Gate`
8. `Complexity-Risk Gate`
9. `Contract-Dense Task Gate` when applicable
10. `Remaining-Task Viability Check`

Policy:
1. Review whether the artifact still fits the planning shape it claims.
2. Do not approve a task just because it is internally coherent if it no longer fits the parent plan.
3. Do not approve a plan just because its current phase text reads well if downstream listed tasks are no longer viable under it.
4. In `task-mode`, if the target-file reality check disagrees with the task label, trust the reality check.
5. Do not hide a widened scope behind the phrase "implementation review is forbidden." Scope-reality validation is mandatory in `task-mode`.
6. Do not approve a refined artifact just because the wording reads cleaner if it silently reinterprets a closed contract.
7. Do not approve a contract-dense task just because each section is locally
   plausible; review the canonical matrix first, then verify all mirrored
   surfaces remain subordinate to it.

### 2a) Closed-Contract Drift Check (`plan-mode|task-mode` when applicable)

Use `references/Closed-Contract-Drift-Check.md`.

Run this when:
1. the reviewed artifact refines an existing authority/shared-contract/read-model artifact,
2. canonical terminology or field roles may have shifted,
3. a docs-only refinement still changes implementation-significant wording.

Required checks:
1. identify repo-local source anchors,
2. identify canonical vs guard vs compat elements when relevant,
3. identify closed terms that must not be silently reinterpreted,
4. classify drift status.

Outcome:
1. If the result is `ambiguous_drift`, require refinement or route back to plan.
2. If the result is `unauthorized_reinterpretation`, do not approve.
3. A locally coherent artifact that contradicts repo-local source anchors is not approvable.

### 2b) Target-File Reality Check (`task-mode`)

When `target_files` are known and the files exist, inspect them and, when needed, their adjacent entrypoints.

Minimum checks:
1. Is any target file a mutation entrypoint (`route.ts`, write path, command handler, mutation service)?
2. Does the touched scope include producer behavior, fail-closed behavior, or coordination/concurrency behavior?
3. Does the touched scope change precondition-before-side-effect ordering?
4. Are rollback/retry/cleanup/shared-state preservation branches present?
5. Does the touched scope change where success/completion is proven?
6. Do any final result/status/event surfaces become mixed-truth across phases?
7. Does the actual scope still match the task's claimed bounded-task shape?

Outcome:
1. Record whether the task is still correctly classified.
2. If not, require `refine_task` or `route_back_to_plan`.

### 2c) Contract-Dense Task Gate (`task-mode` when applicable)

Use `references/Contract-Dense-Task-Gate.md`.

Run this when two or more of these are true in the reviewed task:
1. API/interface/result shape change,
2. status/result taxonomy change,
3. structured input/output parsing or schema acceptance change,
4. error/fallback/timeout/cancellation/precedence/reason-code behavior change,
5. split ownership between current task and downstream interpretation/lifecycle
   consumers,
6. multiple downstream consumers or successor tasks inherit the contract,
7. one contract appears in multiple mirrored task sections.

Required checks:
1. The task has one `Canonical Contract Matrix` for the dense contract.
2. L0 prose, branch inventory, data/interface rows, fallback/status rows, and
   test matrix rows do not create independent conflicting sources of truth.
3. Ownership/deferred semantics prevent successor-owned behavior from becoming
   current-task acceptance criteria.
4. Structured input/output rules use explicit schema/allowlist, unknown-field,
   malformed/partial/duplicate/multi-candidate, and retention/drop behavior when
   those cases are implementation-significant.
5. A `Mirrored Surface Checklist` names every section that must be updated when
   a canonical matrix row changes.

Outcome:
1. If the canonical matrix is missing or ambiguous, require `refine_task`.
2. If ownership is actually split wrong across plan tasks, return
   `route_back_to_plan`.
3. If only a mirrored surface is stale while the matrix is clear, require local
   `refine_task` and cite the stale surface.

### 3) Review in `plan-mode`

When reviewing a `plan`, check:
1. whether the objective and done definition are explicit enough
2. whether the open task list still covers every required plan-level gap
3. whether dependency/order is explicit where correctness depends on it
4. whether the plan-level control model is explicit enough for downstream tasks
5. whether any lightweight sequencing note is sufficient where multi-consumer authority ordering matters
6. whether the plan silently reinterprets any already-closed canonical contract
7. whether downstream open tasks remain viable if this plan is accepted as written

Decision outcomes:
1. `approve_plan`
2. `refine_plan`
3. `split_plan`
4. `block_not_ready`

Refinement loop rule:

1. If this workflow returns `refine_plan` and the plan artifact is modified, the caller must run `ReviewSpec` again in `plan-mode` from a fresh context over the refreshed plan artifact.
2. The plan is not approved merely because the requested refinement was applied; approval requires a later `approve_plan` result from the repeated review pass.
3. If fresh sub-agent context is unavailable, the caller must still create a distinct review step that rereads the refreshed artifact and returns a new explicit decision.

### 4) Review in `task-mode`

When reviewing a `task`, check:
1. whether the target-file reality check supports the claimed bounded slice
2. whether the bounded task shape is explicit and still true
3. whether producer work has absorbed fail-closed or coordination scope
4. whether precondition-before-side-effect rules are explicit when needed
5. whether the task still fits its parent gap and parent plan boundary
6. whether the task silently reinterprets any already-closed canonical contract
7. whether the task changes success/completion proof boundary and, if so, whether that cutover is isolated cleanly enough
8. whether reused cleanup/delete/reconcile proof contracts retain validation parity or prove an explicit narrowed contract
9. whether downstream open tasks remain viable if this task is accepted as written
10. whether contract-dense tasks have one canonical matrix and a complete
    mirrored-surface checklist

Decision outcomes:
1. `approve_task`
2. `refine_task`
3. `route_back_to_plan`
4. `block_not_ready`

Refinement loop rule:

1. If this workflow returns `refine_task` and the task artifact is modified, the caller must run `ReviewSpec` again in `task-mode` from a fresh context over the refreshed task artifact and parent plan.
2. The task is not approved merely because the requested refinement was applied; approval requires a later `approve_task` result from the repeated review pass.
3. If the repeated pass finds another issue and modifies the artifact again, repeat the same fresh-context review loop until the result is `approve_task`, `route_back_to_plan`, `block_not_ready`, or a real blocker.
4. If fresh sub-agent context is unavailable, the caller must still create a distinct review step that rereads the refreshed task and parent plan and returns a new explicit decision.

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
11. execution metadata gate result when applicable
12. when the decision is `refine_plan` or `refine_task`, whether a repeated fresh-context ReviewSpec pass is required before approval or downstream execution
13. when the Contract-Dense Task Gate applies, the canonical matrix status and
    mirrored-surface checklist status

### 7) Output rules

Findings should be planning-language, not code-review shorthand.

For each material finding, explain:
1. what boundary or assumption is wrong
2. why that matters for later implementation
3. whether the fix is local artifact refinement or plan-level re-sequencing

Additional task-mode rule:
1. If the task label and target-file reality disagree, say that explicitly.
2. Phrase the issue as bounded-slice drift, hidden scope, or parent-plan mismatch, not as a code bug.
3. If the issue is contract-meaning drift, phrase it as unauthorized reinterpretation, ambiguous drift, or source-anchor mismatch rather than as a style nit.
4. If the issue is a success/completion proof cutover mixed with cleanup or final truth-surface alignment, phrase it as a split-trigger or sequencing problem, not as an implementation detail.
5. If the issue is execution metadata drift, phrase it as non-deterministic
   plan/task identity or parent-plan mismatch, not as a naming nit.
6. If the issue is contract-dense drift, phrase it as missing canonical matrix,
   stale mirrored surface, or leaked successor-owned semantics, not as generic
   wording polish.

## Output

Produce:
1. a review summary
2. a decision:
   - `approve_plan|refine_plan|split_plan|approve_task|refine_task|route_back_to_plan|block_not_ready`
3. a `Remaining Task Impact` section
4. when applicable, a downstream task table:
   - `Task | Status | Why | Required Action`
