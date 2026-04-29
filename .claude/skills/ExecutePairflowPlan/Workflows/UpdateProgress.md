---
description: Reconcile normal post-implementation aftermath for ExecutePairflowPlan from a settled implementation-close result and refreshed authoritative plan/task metadata into canonical archive resolution and the next trustworthy owner
argument-hint: <plan-path>
allowed-tools: Read, Edit, Bash
---

# Update Progress

## Purpose

Own the normal completion aftermath layer for `ExecutePairflowPlan`.

This workflow owns only:

1. consuming the settled aftermath boundary after a successful `CloseImplementationBubble` return
2. reconciling refreshed plan summary and task-local terminal truth under the existing Task 1 authority split
3. reconciling completed-task archive aftermath onto the canonical Task 1 archive path when that is deterministic
4. reconciling completed-plan archive aftermath onto the canonical plan archive path when all tasks are settled
5. deciding whether the next trustworthy owner is a fresh `ResolvePlanState` pass, `PlanComplete`, or `HumanCheckpoint`
6. defining the lightweight workflow-local pilot proof boundary for a first trustworthy local V1 run

This workflow does not own:

1. raw Pairflow lifecycle interpretation
2. pre-aftermath supersede/archive handling for identity-changing replanning
3. new plan/task metadata field design
4. remote execution support
5. a second top-level route taxonomy or a new stable `target_workflow_surface`

## Workflow Role

`UpdateProgress` is a repo-local backing workflow, not a route surface returned by `ResolvePlanState`.

Execution boundary:

1. `ResolvePlanState` may return `implementation_bubble_close`
2. `UsePairflow` `CloseBubble` owns the lifecycle close/merge path behind `CloseImplementationBubble`
3. only after that close path returns a successful settled result may the top-level orchestrator enter `UpdateProgress`
4. this workflow consumes the close result after the fact; it never re-reads raw bubble state to decide whether close succeeded

## Inputs

Read only the minimum authoritative inputs needed for normal completion aftermath:

1. `PLAN_PATH`
   - parent plan artifact
2. refreshed `PLAN_METADATA`
   - plan frontmatter after the successful implementation close returned
3. refreshed `ACTIVE_TASK_PATH`
   - the just-completed task artifact, either at its live task path or already at its canonical archive path
4. refreshed `TASK_METADATA`
   - task frontmatter after close-side follow-up and any deterministic archive move already performed
5. `SETTLED_IMPLEMENTATION_CLOSE_RESULT`
   - proof that `CloseImplementationBubble` already returned a successful close/merge outcome for the active implementation task
6. `METADATA_AUTHORITY_CONTRACT`
   - `references/Plan-Task-Metadata-Contract.md`
7. `RESOLVE_PLAN_STATE_CONTRACT`
   - `Workflows/ResolvePlanState.md`
8. `HANDLE_NORMALIZED_REPLAN_CONTRACT`
   - `Workflows/HandleNormalizedReplan.md`, as the preserved upstream owner of pre-aftermath supersession

Input rules:

1. refreshed plan metadata remains canonical for sequencing, `active_task_id`, plan terminality, and canonical `archive_group`
2. refreshed task metadata remains canonical for task-local terminal status and persisted archive fields when present
3. `SETTLED_IMPLEMENTATION_CLOSE_RESULT` is a boundary proof only; it does not authorize reopening raw Pairflow status
4. stale pre-close assumptions, operator memory, generic "merged means done" shortcuts, and metadata-expansion wishlists are forbidden as aftermath authority
5. this workflow must not mark a task `superseded`; that ownership remains with `HandleNormalizedReplan`
6. if `created_on` is missing, do not derive it from `archive_group`; route to metadata repair first, where committed first-added history or explicit creation metadata must prove the date
7. if a candidate archive date equals the current date, verify its source before moving files; archive aftermath must not turn today's date into plan creation truth by default

### Settled-close result minimum shape

`SETTLED_IMPLEMENTATION_CLOSE_RESULT` is valid only when it supplies, at minimum:

```yaml
route_class: implementation_bubble_close
target_workflow_surface: CloseImplementationBubble
continuation_mode: auto_continue
route_scope: implementation_bubble
source_scope: not_applicable
approval_gate_state: already_satisfied
close_result: success
closed_bubble_id: <persisted implementation bubble id or null>
closed_task_id: <canonical task id>
reentry_identity_key: <closed_task_id>::<closed_bubble_id-or-null>
```

Validation rules:

1. `close_result` must prove successful close/merge return rather than merely close-ready status
2. `route_scope` must be `implementation_bubble` and `source_scope` must be `not_applicable`, matching the upstream `ResolvePlanState` close-route contract
3. `closed_task_id` must match the refreshed post-close task artifact deterministically
4. `closed_bubble_id` must match the persisted implementation linkage when that linkage exists; otherwise it must be `null`
5. `reentry_identity_key` must use the deterministic format `<closed_task_id>::<closed_bubble_id-or-null>`
6. extra diagnostics may be present, but they are not routing authority here

## Entry Conditions

Run this workflow only when the top-level orchestrator has already consumed a successful `implementation_bubble_close` route and `CloseImplementationBubble` has returned a settled success outcome.

Required upstream route shape:

```yaml
route_class: implementation_bubble_close
target_workflow_surface: CloseImplementationBubble
continuation_mode: auto_continue
route_scope: implementation_bubble
source_scope: not_applicable
approval_gate_state: already_satisfied
reason_code: IMPL_BUBBLE_CLOSE_REQUIRED
handoff_boundary_note: Close the approved implementation bubble only; on successful return hand control to repo-local UpdateProgress for normal aftermath reconciliation.
```

Additional entry rules:

1. do not enter from raw Pairflow state
2. do not enter from a merely close-ready signal that has not yet produced a successful close result
3. do not treat a failed merge or unresolved cleanup warning as settled success; that belongs to the close workflow or a human checkpoint first
4. if refreshed plan/task artifacts are absent after close returns, fail closed instead of reconstructing the aftermath from memory
5. `SETTLED_IMPLEMENTATION_CLOSE_RESULT` and the required upstream route shape must agree on `route_class=implementation_bubble_close`, `target_workflow_surface=CloseImplementationBubble`, `continuation_mode=auto_continue`, `route_scope=implementation_bubble`, `source_scope=not_applicable`, and `approval_gate_state=already_satisfied`

## Output Contract

Return one aftermath result with this shape:

```yaml
aftermath_action: <rerun_resolve_plan_state|plan_complete|human_checkpoint>
next_owner: <ResolvePlanState|PlanComplete|HumanCheckpoint>
continuation_mode: <auto_continue|stop_at_settled_checkpoint|stop_at_human_checkpoint>
plan_status_after: <refreshed plan_status or unresolved>
active_task_id_after: <refreshed active_task_id or null or unresolved>
task_terminal_status: <done|archived|unresolved>
archive_resolution: <already_canonical|reconciled_to_canonical|checkpoint_required>
reason_code: <stable-reason-code>
handoff_boundary_note: <short note describing the next owner and what remains out of scope>
pilot_evidence_note: <required lightweight local proof note>
canonical_archive_path: <required when archive_resolution=reconciled_to_canonical; otherwise omit or echo the canonical path when already explicit>
plan_archive_resolution: <already_canonical|reconciled_to_canonical|not_applicable|checkpoint_required>
canonical_plan_archive_path: <required when plan_archive_resolution=reconciled_to_canonical; otherwise omit or echo when already explicit>
reentry_identity_key: <same deterministic identity key carried from settled close input>
```

Field rules:

1. `aftermath_action=rerun_resolve_plan_state` is the normal non-terminal continuation path after deterministic reconciliation
2. `aftermath_action=plan_complete` is valid only when refreshed authoritative state proves the plan settled boundary
3. `aftermath_action=human_checkpoint` is required whenever refreshed aftermath truth is absent, inconsistent, or not deterministic enough for safe continuation
4. `next_owner` must be:
   - `ResolvePlanState` for `rerun_resolve_plan_state`
   - `PlanComplete` for `plan_complete`
   - `HumanCheckpoint` for `human_checkpoint`
5. `task_terminal_status=archived` is the preferred completed-state result once canonical archive placement is already true or has been deterministically reconciled
6. `task_terminal_status=done` is a fail-closed terminal-detail value for the just-closed task artifact only; it is allowed only when refreshed task metadata still proves that specific task reached terminal completion but canonical archive settlement or a wider plan-terminality gate remains unresolved and the result explains why
7. `archive_resolution=already_canonical` means the task already sits at `plans/archive/tasks/<archive_group>/<task_id>.md`
8. `archive_resolution=reconciled_to_canonical` means a non-canonical but deterministic aftermath was normalized to the canonical Task 1 target
9. `archive_resolution=checkpoint_required` means canonical archive aftermath could not be derived deterministically on the current baseline
10. `canonical_archive_path`, when present, must equal `plans/archive/tasks/<archive_group>/<task_id>.md`
11. `canonical_archive_path` is required when `archive_resolution=reconciled_to_canonical`
12. `plan_archive_resolution=not_applicable` is valid only when the plan still has remaining non-terminal work
13. `plan_archive_resolution=already_canonical` means `PLAN_PATH` already equals `plans/archive/plans/<created_on>-<live-plan-filename-stem>.md`
14. `plan_archive_resolution=reconciled_to_canonical` means the completed plan was moved from its live path to the canonical archived plan path during this aftermath step
15. `plan_archive_resolution=checkpoint_required` is valid only with `aftermath_action=human_checkpoint`
16. `canonical_plan_archive_path`, when present, must equal `plans/archive/plans/<created_on>-<live-plan-filename-stem>.md`
17. `canonical_plan_archive_path` is required when `plan_archive_resolution=reconciled_to_canonical`
18. every returned aftermath result must include `pilot_evidence_note`; it must describe lightweight local proof expectations only and must not introduce remote, telemetry, or standalone reporting requirements
19. `plan_status_after=unresolved` is valid only with `aftermath_action=human_checkpoint`
20. `active_task_id_after=unresolved` is valid only with `aftermath_action=human_checkpoint`
21. `active_task_id_after=null` is valid only with `aftermath_action=plan_complete`
22. `active_task_id_after=<refreshed active task id>` is required for `aftermath_action=rerun_resolve_plan_state`
23. `task_terminal_status=unresolved` is valid only with `aftermath_action=human_checkpoint`
24. `archive_resolution=checkpoint_required` is valid only with `aftermath_action=human_checkpoint`
25. `archive_resolution=already_canonical` is not valid with `aftermath_action=human_checkpoint`
26. `archive_resolution=reconciled_to_canonical` is not valid with `aftermath_action=human_checkpoint`
27. `task_terminal_status=archived` is not valid with `archive_resolution=checkpoint_required`
28. when `next_owner=ResolvePlanState`, the rerun must consume refreshed `PLAN_PATH`, `PLAN_METADATA`, and refreshed task artifacts only; it must not synthesize a new `NORMALIZED_BUBBLE_ROUTE` or `NORMALIZED_REPLANNING_SIGNAL` from this workflow output
29. `task_terminal_status=done` is valid only with `aftermath_action=human_checkpoint`
30. `task_terminal_status=done` is not valid with `aftermath_action=plan_complete`
31. `task_terminal_status=done` is not valid with `aftermath_action=rerun_resolve_plan_state`
32. `reentry_identity_key` must be echoed unchanged from `SETTLED_IMPLEMENTATION_CLOSE_RESULT` in every returned aftermath result
33. `reason_code=PLAN_COMPLETE_STATE_STALE` is valid only when `aftermath_action=human_checkpoint` and `plan_status_after=<done|unresolved>`
34. `reason_code=PLAN_COMPLETE_STATE_STALE` requires `task_terminal_status=done` as the local terminal detail of the just-closed task artifact, not as proof that the wider plan-completion gate succeeded
35. `reason_code=NON_DETERMINISTIC_TASK_IDENTITY` requires `task_terminal_status=unresolved`

Terminal-settlement rule:

1. `done` is task-execution terminal only
2. `archived` is the normal settled task state after successful post-close aftermath
3. `PlanComplete` and `rerun_resolve_plan_state` outputs require `task_terminal_status=archived`
4. `task_terminal_status=done` may appear only in fail-closed `human_checkpoint` output to show that implementation work finished but archive settlement did not

## Reason-Code Anchor Set

This workflow may emit only these reason codes:

1. `AUTHORITY_PRECEDENCE_APPLIED`
2. `POST_CLOSE_AFTERMATH_READY`
3. `PLAN_COMPLETE`
4. `PLAN_COMPLETE_STATE_STALE`
5. `CROSS_AUTHORITY_METADATA_CONFLICT`
6. `NON_DETERMINISTIC_TASK_IDENTITY`
7. `NO_TRUSTWORTHY_ROUTE`

Usage notes:

1. use `AUTHORITY_PRECEDENCE_APPLIED` when refreshed task-local terminal truth is trustworthy and the plan tracker summary needed deterministic reconciliation
2. use `POST_CLOSE_AFTERMATH_READY` when post-close aftermath is trustworthy and ready to rerun `ResolvePlanState` without needing a precedence correction
3. use `PLAN_COMPLETE` only when refreshed plan, task, task-archive, and plan-archive state proves the settled boundary cleanly
4. use `PLAN_COMPLETE_STATE_STALE` when the plan claims completion but refreshed authoritative state disproves it
5. use `CROSS_AUTHORITY_METADATA_CONFLICT` when plan/task disagreement crosses the approved authority split and no deterministic same-authority reconciliation closes it
6. use `NON_DETERMINISTIC_TASK_IDENTITY` when the active post-close task identity or canonical archive path cannot be derived uniquely on the current Task 1 baseline
7. use `NO_TRUSTWORTHY_ROUTE` only when no narrower fail-closed reason explains the aftermath miss

Cross-workflow disambiguation:

1. in `UpdateProgress`, `AUTHORITY_PRECEDENCE_APPLIED` means a post-close aftermath reconciliation corrected stale plan-summary interpretation while preserving the same authoritative field split
2. in `ResolvePlanState`, the same reason code is route-selection output for refreshed artifact precedence before any implementation-close aftermath layer exists
3. the shared label does not imply shared ownership: `ResolvePlanState` owns pre-close route selection, while `UpdateProgress` owns post-close aftermath reconciliation only

Action mapping:

1. `AUTHORITY_PRECEDENCE_APPLIED` -> `aftermath_action=rerun_resolve_plan_state`
2. `POST_CLOSE_AFTERMATH_READY` -> `aftermath_action=rerun_resolve_plan_state`
3. `PLAN_COMPLETE` -> `aftermath_action=plan_complete`
4. `PLAN_COMPLETE_STATE_STALE` -> `aftermath_action=human_checkpoint`
5. `CROSS_AUTHORITY_METADATA_CONFLICT` -> `aftermath_action=human_checkpoint`
6. `NON_DETERMINISTIC_TASK_IDENTITY` -> `aftermath_action=human_checkpoint`
7. `NO_TRUSTWORTHY_ROUTE` -> `aftermath_action=human_checkpoint`

## Reconciliation Rules

### 1. Authority split remains unchanged

1. plan metadata stays authoritative for sequencing, `active_task_id`, tracker summary, and terminal plan status
2. task metadata stays authoritative for task-local terminal status and persisted archive fields when present
3. the close result proves that lifecycle close succeeded, but it does not replace plan/task metadata as aftermath authority

### 2. Summary lag is reconcilable

If the refreshed task artifact proves terminal completion while the plan tracker summary still lags:

1. treat the task as authoritative for detailed terminal truth
2. treat the plan tracker as stale summary rather than as a new blocker
3. reconcile the summary under `AUTHORITY_PRECEDENCE_APPLIED`
4. continue only after the refreshed plan/task view is trustworthy again

### 3. Normal completion is not supersession

1. do not set `status=superseded` here
2. do not modify `supersedes` or `superseded_by` here
3. if post-close continuation would require identity-changing replanning, stop and hand the ambiguity back through a human checkpoint or fresh route resolution instead of absorbing Task 4 ownership

## Archive Aftermath Rules

Canonical task archive target:

```text
plans/archive/tasks/<archive_group>/<task_id>.md
```

Rules:

1. if the refreshed task already sits at the canonical path, return `archive_resolution=already_canonical`
2. if a generic close-flow side effect or close-side follow-up owned by `CloseImplementationBubble` left the task at a different but deterministic completed-task location, move the task artifact to the canonical Task 1 target, update task metadata to `status=archived`, update the plan tracker row to `status=archived` and the canonical `task_path`, then return `archive_resolution=reconciled_to_canonical`
3. if `archive_group` plus canonical `task_id` cannot determine a unique canonical archive path, return `human_checkpoint` with `NON_DETERMINISTIC_TASK_IDENTITY`
4. do not widen metadata just because a generic close flow used a mirrored path that differs from the Task 1 canonical rule
5. when refreshed task metadata already persists `archive_path`, accept it only if it equals the canonical derived path
6. never emit `PlanComplete` from a `done` task at a live task path; complete the deterministic archive reconciliation first or stop at `HumanCheckpoint`

Canonical plan archive target:

```text
plans/archive/plans/<created_on>-<live-plan-filename-stem>.md
```

Plan archive rules:

1. `created_on` is the plan creation date and must not be replaced with the date when archive aftermath runs.
2. `archive_group` must equal `<created_on>-<plan_id>`.
3. once all tasks are terminal and archive-settled, move the completed plan artifact from its live path to the canonical plan archive target when deterministic.
4. the archived plan filename must include `created_on` as the leading date prefix.
5. if the plan already sits at the canonical plan archive target, return `plan_archive_resolution=already_canonical`.
6. if the plan remains at a live `plans/*.md` path and `created_on` plus the live filename stem determine a unique archive target, move it and return `plan_archive_resolution=reconciled_to_canonical`.
7. if `created_on` is missing, ambiguous, contradicted by `archive_group`, or would produce a colliding archive path, return `human_checkpoint` with `NON_DETERMINISTIC_TASK_IDENTITY` or `PLAN_COMPLETE_STATE_STALE` as the narrower reason.
8. never emit `PlanComplete` while the completed plan artifact remains only at its live path.
9. an `archive_group` prefix may confirm a previously proven `created_on`, but it must not create or overwrite `created_on` during archive aftermath.
10. if committed first-added history proves a different date than `archive_group`, stop and repair metadata before archive moves rather than archiving under the stale group.

## Plan-Completion Gate

`PlanComplete` remains the only terminal stop surface.

Use it only when all of the following are true after refreshed aftermath reconciliation:

1. `plan_status=done`
2. every normally completed tracker row is `archived`
3. `active_task_id=null`
4. each archived tracker row points at `plans/archive/tasks/<archive_group>/<task_id>.md`
5. each readable archived task artifact has `status=archived`
6. `created_on` is trustworthy
7. `archive_group` equals `<created_on>-<plan_id>`
8. the plan artifact sits at `plans/archive/plans/<created_on>-<live-plan-filename-stem>.md`
9. superseded tasks have deterministic lineage and archive aftermath already settled
10. no other trusted input contradicts the complete settled boundary

Fail-closed rule:

1. if the plan claims `done` but refreshed tracker or task truth is still non-terminal, do not emit `PlanComplete`
2. if the plan claims `done` but completed tasks remain `done` at live paths, do not emit `PlanComplete`; perform deterministic archive reconciliation first or return `human_checkpoint` with `NO_TRUSTWORTHY_ROUTE`
3. if the plan claims `done` but the plan artifact remains at a live path, do not emit `PlanComplete`; perform deterministic plan archive reconciliation first or return `human_checkpoint`
4. return `human_checkpoint` with `PLAN_COMPLETE_STATE_STALE` unless a deterministic non-terminal reroute is already proven by refreshed artifacts; this fail-closed outcome may still report `task_terminal_status=done` when the just-closed task itself is terminal and the stale condition comes from tracker, active-task, archive settlement, or broader plan-boundary contradiction elsewhere

## Pilot Evidence Contract

Local pilot proof must stay lightweight and workflow-local.

Operational scope:

1. `pilot_evidence_note` is return metadata owned by this workflow output only
2. it may be echoed in orchestrator commentary or handoff summary, but it is not a separate persisted artifact requirement
3. it must not create a new reporting sink, progress file, or read-model consumer

Allowed proof shapes:

1. a short aftermath summary note that records whether plan, task, task-archive, and plan-archive truth reconciled cleanly
2. an explicit note that the canonical task archive target was already correct or deterministically recoverable
3. an explicit note that the canonical plan archive target was already correct or deterministically recoverable before `PlanComplete`
4. an explicit note that refreshed plan/task state either safely reroutes to `ResolvePlanState` or safely stops at `PlanComplete`

Forbidden proof shapes:

1. remote execution requirements
2. new telemetry or reporting infrastructure
3. a standalone progress read-model surface
4. new metadata prerequisites that are not backed by a demonstrated blocker

## Decision Order

Apply the first matching rule in this order.

Interpretation note:

1. Rules 1, 2, 6, and 7 are final outcome branches
2. Rules 3, 4, and 5 are intermediate archive-state classification branches that feed the final owner decision in Rule 6 or Rule 7 within the same aftermath evaluation
3. this does not create a second local state machine; it only separates task archive settlement, plan archive settlement, and final next-owner selection
4. repeated invocation over the same `reentry_identity_key` must re-enter this same decision order deterministically; if refreshed artifacts now disagree for that key, Rule 1 or Rule 2 must fail closed rather than inventing a new aftermath path

### 1. Validate the settled aftermath authority set

Fail closed when any required aftermath input is absent, partial, or inconsistent:

1. `SETTLED_IMPLEMENTATION_CLOSE_RESULT` does not prove successful close return
2. refreshed `PLAN_METADATA` or refreshed `TASK_METADATA` is absent
3. the just-closed task identity cannot be matched deterministically to the refreshed task artifact
4. refreshed artifacts would require raw bubble-state reconstruction to continue

Output:

```yaml
aftermath_action: human_checkpoint
next_owner: HumanCheckpoint
continuation_mode: stop_at_human_checkpoint
plan_status_after: unresolved
active_task_id_after: unresolved
task_terminal_status: unresolved
archive_resolution: checkpoint_required
plan_archive_resolution: checkpoint_required
reason_code: NO_TRUSTWORTHY_ROUTE
handoff_boundary_note: Stop because the post-close authority set is incomplete or inconsistent; do not reconstruct aftermath truth from raw bubble state or operator memory.
pilot_evidence_note: Local pilot proof remains fail-closed here too: missing or inconsistent aftermath authority is surfaced directly instead of being patched over heuristically.
reentry_identity_key: <same deterministic identity key carried from settled close input>
```

### 2. Validate metadata determinism

Fail closed when refreshed authoritative metadata does not support deterministic aftermath:

1. plan/task disagreement crosses the approved authority split
2. canonical `task_id` or `archive_group` is ambiguous
3. `created_on` is missing, ambiguous, or contradicted by `archive_group`
4. the canonical task or plan archive path cannot be derived from the current Task 1 baseline
5. plan completion would require guessing around stale or contradictory refreshed artifacts
6. the only evidence for `created_on` is the existing `archive_group` prefix or the current archive-run date

Reason-code selection:

1. use `CROSS_AUTHORITY_METADATA_CONFLICT` for cross-authority disagreement
2. use `NON_DETERMINISTIC_TASK_IDENTITY` for archive or identity ambiguity
3. use `PLAN_COMPLETE_STATE_STALE` when terminal completion is contradicted by refreshed authoritative truth, including a completed plan that cannot be archived deterministically

Output:

```yaml
aftermath_action: human_checkpoint
next_owner: HumanCheckpoint
continuation_mode: stop_at_human_checkpoint
plan_status_after: <done|unresolved when PLAN_COMPLETE_STATE_STALE; otherwise refreshed plan_status or unresolved>
active_task_id_after: unresolved
task_terminal_status: <done for PLAN_COMPLETE_STATE_STALE, unresolved for NON_DETERMINISTIC_TASK_IDENTITY, otherwise done|unresolved>
archive_resolution: checkpoint_required
plan_archive_resolution: checkpoint_required
reason_code: <CROSS_AUTHORITY_METADATA_CONFLICT|NON_DETERMINISTIC_TASK_IDENTITY|PLAN_COMPLETE_STATE_STALE>
handoff_boundary_note: Stop because deterministic post-close reconciliation failed across the approved authority split, archive mapping, or terminality gate; do not guess the next owner.
pilot_evidence_note: Local pilot proof remains fail-closed here: the aftermath contract exposed exactly which authoritative field set stopped deterministic continuation.
reentry_identity_key: <same deterministic identity key carried from settled close input>
```

Constraint note:

1. when `reason_code=PLAN_COMPLETE_STATE_STALE`, keep `plan_status_after=done` unless the refreshed plan artifact itself is unavailable or non-trustworthy, in which case `plan_status_after=unresolved` is allowed
2. when `reason_code=NON_DETERMINISTIC_TASK_IDENTITY`, `task_terminal_status` must stay `unresolved`; do not combine identity ambiguity with a `done` terminal claim
3. when `reason_code=PLAN_COMPLETE_STATE_STALE`, `task_terminal_status` must stay `done` only as the local terminal detail of the just-closed task artifact; the contradiction is specifically that claimed plan completion still fails against refreshed non-terminal boundary truth elsewhere

### 3. Accept already-canonical archive aftermath

Choose this branch when:

1. refreshed task metadata is terminal
2. the task already sits at `plans/archive/tasks/<archive_group>/<task_id>.md`
3. refreshed plan/task state is otherwise trustworthy

Output rules:

1. `archive_resolution=already_canonical`
2. `task_terminal_status=archived`
3. continue into Rule 5 or Rule 6 based on refreshed plan terminality

Intermediate branch state (not returned workflow output):

```yaml
branch_task_terminal_status: archived
branch_archive_resolution: already_canonical
branch_handoff_boundary_note: Canonical archive aftermath is already settled; this intermediate branch passes control to Rule 5 or Rule 6 for final owner selection.
branch_pilot_evidence_note: Local pilot proof stays lightweight here because canonical archive settlement is already visible in refreshed authoritative artifacts.
```

### 4. Reconcile deterministic non-canonical archive aftermath

Choose this branch when:

1. refreshed task metadata proves normal completion
2. the task is not yet at the canonical Task 1 archive path
3. `archive_group` plus `task_id` still determine a unique canonical archive target
4. no new metadata is required to normalize the aftermath
5. the archive move and metadata updates can be performed as the normal aftermath step without crossing ownership boundaries

Output rules:

1. `archive_resolution=reconciled_to_canonical`
2. `canonical_archive_path` must equal the Task 1 derived target
3. set `task_terminal_status=archived` once the deterministic reconciliation is complete
4. keep the explanation explicit that this is normal completion aftermath, not Task 4 supersession logic
5. continue into Rule 5 or Rule 6 based on refreshed plan terminality after the deterministic reconciliation outcome is written and re-read

Intermediate branch state (not returned workflow output):

```yaml
branch_task_terminal_status: archived
branch_archive_resolution: reconciled_to_canonical
branch_handoff_boundary_note: Deterministic canonical archive reconciliation is complete; this intermediate branch passes control to Rule 5 or Rule 6 for final owner selection.
branch_pilot_evidence_note: Local pilot proof remains lightweight here because the workflow can point to a deterministic canonical archive target without widening the metadata contract.
branch_canonical_archive_path: plans/archive/tasks/<archive_group>/<task_id>.md
```

### 5. Reconcile completed-plan archive aftermath

Choose this branch only after task archive aftermath is settled by Rule 3 or Rule 4 and the refreshed plan has no remaining non-terminal work.

Choose `plan_archive_resolution=already_canonical` when:

1. refreshed plan metadata proves `plan_status=done`
2. `active_task_id=null`
3. all task tracker rows and readable task artifacts are archive-settled
4. the plan already sits at `plans/archive/plans/<created_on>-<live-plan-filename-stem>.md`

Choose `plan_archive_resolution=reconciled_to_canonical` when:

1. refreshed plan metadata proves `plan_status=done`
2. `active_task_id=null`
3. all task tracker rows and readable task artifacts are archive-settled
4. `created_on` and the live plan filename stem determine a unique canonical plan archive target
5. moving the plan artifact and updating deterministic internal references can be performed without crossing ownership boundaries

Choose `human_checkpoint` when:

1. `created_on` is absent or ambiguous
2. `archive_group` does not equal `<created_on>-<plan_id>`
3. the canonical plan archive path would collide
4. the plan artifact path cannot be classified as live or canonical archived path
5. `created_on` was inferred from `archive_group` instead of explicit creation metadata or committed first-added history

Intermediate branch state (not returned workflow output):

```yaml
branch_plan_archive_resolution: <already_canonical|reconciled_to_canonical>
branch_canonical_plan_archive_path: plans/archive/plans/<created_on>-<live-plan-filename-stem>.md
branch_handoff_boundary_note: Completed-plan archive reconciliation is settled; this intermediate branch passes control to Rule 6 for final PlanComplete output.
branch_pilot_evidence_note: Local pilot proof remains lightweight here because plan completion includes the plan artifact itself at its canonical archive path.
```

### 6. Stop cleanly at plan complete

Choose `PlanComplete` only when the refreshed authoritative state satisfies the full `Plan-Completion Gate` above after aftermath reconciliation. Rule 2 fail-closed handling still wins first if terminality is stale or contradictory.

Output:

```yaml
aftermath_action: plan_complete
next_owner: PlanComplete
continuation_mode: stop_at_settled_checkpoint
plan_status_after: done
active_task_id_after: null
task_terminal_status: archived
archive_resolution: <already_canonical|reconciled_to_canonical>
plan_archive_resolution: <already_canonical|reconciled_to_canonical>
reason_code: PLAN_COMPLETE
handoff_boundary_note: Stop cleanly because post-close plan, task, task-archive, and plan-archive truth now prove the plan settled boundary without reopening lifecycle or metadata scope.
pilot_evidence_note: Local pilot proof remains lightweight here because the same refreshed artifact set satisfies the full Plan-Completion Gate without hidden lifecycle reads.
canonical_archive_path: <required canonical path when archive_resolution=reconciled_to_canonical; otherwise omit or echo only when already explicit>
canonical_plan_archive_path: <required canonical path when plan_archive_resolution=reconciled_to_canonical; otherwise omit or echo only when already explicit>
reentry_identity_key: <same deterministic identity key carried from settled close input>
```

Gate-proof note:

1. this final output is valid only when the refreshed artifact set already proves all `Plan-Completion Gate` conditions; those conditions are gating predicates, not extra returned fields

### 7. Rerun the top-level route selector

Choose `ResolvePlanState` when:

1. refreshed task aftermath is trustworthy
2. the completed task is terminal and archive aftermath is settled or deterministically reconciled
3. the plan still has non-terminal remaining work

Output rules:

1. `aftermath_action=rerun_resolve_plan_state`
2. `next_owner=ResolvePlanState`
3. `continuation_mode=auto_continue`
4. use `AUTHORITY_PRECEDENCE_APPLIED` when the main change was stale-summary reconciliation; otherwise use `POST_CLOSE_AFTERMATH_READY`
5. explicitly say that the next route must be selected from refreshed artifacts, not chained from stale pre-close assumptions

Handoff mapping:

1. rerun `ResolvePlanState` with refreshed artifact reads only
2. do not pass `SETTLED_IMPLEMENTATION_CLOSE_RESULT` forward as a new route carrier
3. do not synthesize `NORMALIZED_BUBBLE_ROUTE=document_bubble_close|implementation_bubble_close` or `NORMALIZED_REPLANNING_SIGNAL` from this aftermath result

Output:

```yaml
aftermath_action: rerun_resolve_plan_state
next_owner: ResolvePlanState
continuation_mode: auto_continue
plan_status_after: <refreshed non-terminal plan_status>
active_task_id_after: <refreshed active task id>
task_terminal_status: archived
archive_resolution: <already_canonical|reconciled_to_canonical>
plan_archive_resolution: not_applicable
reason_code: <POST_CLOSE_AFTERMATH_READY|AUTHORITY_PRECEDENCE_APPLIED>
handoff_boundary_note: Rerun ResolvePlanState from refreshed plan/task artifacts only; this aftermath result must not be reused as a new route carrier.
pilot_evidence_note: Local pilot proof remains lightweight here because the same refreshed artifact set both closes aftermath reconciliation and names the next routing owner.
canonical_archive_path: <required canonical path when archive_resolution=reconciled_to_canonical; otherwise omit or echo only when already explicit>
reentry_identity_key: <same deterministic identity key carried from settled close input>
```

## Examples

### Example 0: Settled-close authority set is incomplete

```yaml
aftermath_action: human_checkpoint
next_owner: HumanCheckpoint
continuation_mode: stop_at_human_checkpoint
plan_status_after: unresolved
active_task_id_after: unresolved
task_terminal_status: unresolved
archive_resolution: checkpoint_required
reason_code: NO_TRUSTWORTHY_ROUTE
handoff_boundary_note: Stop because the post-close authority set is incomplete or inconsistent; do not reconstruct aftermath truth from raw bubble state or operator memory.
pilot_evidence_note: Local pilot proof remains fail-closed here too: missing or inconsistent aftermath authority is surfaced directly instead of being patched over heuristically.
reentry_identity_key: <closed_task_id>::<closed_bubble_id-or-null>
```

### Example 1: Implementation close succeeds and more work remains

```yaml
aftermath_action: rerun_resolve_plan_state
next_owner: ResolvePlanState
continuation_mode: auto_continue
plan_status_after: in_progress
active_task_id_after: <next canonical task id>
task_terminal_status: archived
archive_resolution: already_canonical
plan_archive_resolution: not_applicable
reason_code: POST_CLOSE_AFTERMATH_READY
handoff_boundary_note: The completed implementation task is now settled; rerun ResolvePlanState from refreshed authoritative artifacts to choose the next route.
pilot_evidence_note: Local aftermath proof is sufficient when refreshed plan, task, task-archive, and non-terminal routing truth is internally consistent and the next route is derived from those refreshed artifacts.
reentry_identity_key: <closed_task_id>::<closed_bubble_id-or-null>
```

### Example 2: Implementation close succeeds and the plan becomes terminal

```yaml
aftermath_action: plan_complete
next_owner: PlanComplete
continuation_mode: stop_at_settled_checkpoint
plan_status_after: done
active_task_id_after: null
task_terminal_status: archived
archive_resolution: reconciled_to_canonical
plan_archive_resolution: reconciled_to_canonical
reason_code: PLAN_COMPLETE
handoff_boundary_note: The successful close result plus refreshed authoritative aftermath now prove plan completion; task artifacts and the plan artifact are both canonically archived.
pilot_evidence_note: Local pilot proof remains lightweight: the terminal stop is trustworthy because refreshed plan, task, task-archive, and plan-archive truth agree.
canonical_archive_path: plans/archive/tasks/<archive_group>/<task_id>.md
canonical_plan_archive_path: plans/archive/plans/<created_on>-<live-plan-filename-stem>.md
reentry_identity_key: <closed_task_id>::<closed_bubble_id-or-null>
```

### Example 3: Plan tracker summary lags task-local completion

```yaml
aftermath_action: rerun_resolve_plan_state
next_owner: ResolvePlanState
continuation_mode: auto_continue
plan_status_after: in_progress
active_task_id_after: <next canonical task id>
task_terminal_status: archived
archive_resolution: already_canonical
plan_archive_resolution: not_applicable
reason_code: AUTHORITY_PRECEDENCE_APPLIED
handoff_boundary_note: Task-local terminal truth won over stale summary fields under the approved authority split; rerun the route selector from refreshed artifacts only.
pilot_evidence_note: Local aftermath proof remains lightweight here: the refreshed task detail cleanly overrode stale summary fields without widening the authority contract.
reentry_identity_key: <closed_task_id>::<closed_bubble_id-or-null>
```

### Example 4: Claimed plan completion is stale

```yaml
aftermath_action: human_checkpoint
next_owner: HumanCheckpoint
continuation_mode: stop_at_human_checkpoint
plan_status_after: done
active_task_id_after: unresolved
task_terminal_status: done
archive_resolution: checkpoint_required
plan_archive_resolution: checkpoint_required
reason_code: PLAN_COMPLETE_STATE_STALE
handoff_boundary_note: Do not emit PlanComplete because refreshed tracker, task, task-archive, or plan-archive truth still contradicts terminal completion.
pilot_evidence_note: Local pilot proof remains lightweight here too: the workflow proves trust by failing closed when refreshed terminal state disagrees.
reentry_identity_key: <closed_task_id>::<closed_bubble_id-or-null>
```

### Example 5: Deterministic non-canonical archive aftermath before final owner selection

```yaml
branch_task_terminal_status: archived
branch_archive_resolution: reconciled_to_canonical
branch_handoff_boundary_note: Deterministic canonical task archive reconciliation is complete; this intermediate branch passes control to plan archive settlement before final owner selection.
branch_pilot_evidence_note: Local pilot proof remains lightweight here because the workflow can point to a deterministic canonical archive target without widening the metadata contract.
branch_canonical_archive_path: plans/archive/tasks/<archive_group>/<task_id>.md
```

### Example 6: Completed plan archive aftermath before PlanComplete

```yaml
branch_plan_archive_resolution: reconciled_to_canonical
branch_canonical_plan_archive_path: plans/archive/plans/<created_on>-<live-plan-filename-stem>.md
branch_handoff_boundary_note: The completed plan artifact is now at its canonical archive path; the final PlanComplete output may be emitted if the full gate still holds.
branch_pilot_evidence_note: Local pilot proof remains lightweight because the archived plan filename carries the plan creation date and the archive group uses the same date.
```

## Guardrails

1. Keep this workflow aftermath-oriented; detailed plan/task authoring still belongs to `CreatePairflowSpec`, and lifecycle close mechanics still belong to `UsePairflow`.
2. Prefer explicit canonical task and plan archive reconciliation over vague "whatever CloseBubble already did" reasoning when the Task 1 contract is more precise.
3. If newer metadata ideas seem helpful but the current baseline still closes the aftermath deterministically, continue on the merged baseline and record the idea as deferred.
4. If a true blocker against the current metadata baseline appears, stop and expose the blocker instead of silently widening the contract inside Task 5.
5. Re-running `UpdateProgress` over the same settled successful close result must be idempotent: if task archive aftermath, plan archive aftermath, and plan/task reconciliation are already settled, return the same trustworthy next owner for the same `reentry_identity_key` rather than inventing duplicate aftermath work.
6. Re-entry must stay fail-closed: if repeated invocation sees conflicting refreshed artifacts for the same `reentry_identity_key`, stop at `HumanCheckpoint` instead of treating the close result as a new execution event.
