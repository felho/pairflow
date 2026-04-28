---
description: Route normalized replanning follow-through for ExecutePairflowPlan from trusted task or bubble-origin normalized inputs into CreatePairflowSpec delegation and deterministic pre-aftermath supersede/archive handoff
argument-hint: <plan-path>
allowed-tools: Read
---

# Handle Normalized Replan

## Purpose

Own the normalized-replanning follow-through layer for `ExecutePairflowPlan`.

This workflow owns only:

1. consuming already-normalized replanning input from `ResolvePlanState`
2. preserving `source_scope=task|document_bubble|implementation_bubble`
3. deciding whether the next delegated artifact workflow is `ReviewPlan`, `CreateTask`, `ReviewTask`, or `HumanCheckpoint`
4. deciding whether replanning preserves the current executable identity or requires replacement
5. defining the pre-aftermath supersede/archive handoff when executable identity changes
6. returning a follow-through result that the top-level orchestrator can use before rerunning `ResolvePlanState`

This workflow does not own:

1. raw Pairflow lifecycle interpretation
2. new plan/task metadata field design
3. normal post-implementation progress or archive aftermath
4. remote execution support
5. a second replanning taxonomy outside `ResolvePlanState`

## Route-Surface Role

This repo-local workflow is the owner behind the stable route surface:

1. `HandleNormalizedReplan`

Its role is to consume the normalized replanning route selected by `ResolvePlanState` and convert it into the next correct plan/task follow-through action.

Delegation boundaries:

1. plan correction or review routes through `CreatePairflowSpec` `ReviewSpec` in `plan-mode`
2. replacement task creation routes through `CreatePairflowSpec` `CreateTask`
3. same-identity task refinement routes through `CreatePairflowSpec` `ReviewSpec` in `task-mode`
4. this workflow never reads raw Pairflow status and never delegates directly back into `UsePairflow`

## Inputs

Read only the minimum authoritative inputs needed for normalized replanning follow-through:

1. `PLAN_PATH`
   - parent plan artifact
2. `PLAN_METADATA`
   - plan frontmatter under the Task 1 metadata contract
3. `ACTIVE_TASK_PATH`
   - active task artifact when one exists
4. `TASK_METADATA`
   - active task frontmatter when the task exists
5. `RESOLVED_NORMALIZED_REPLAN_ROUTE`
   - the route decision already emitted by `ResolvePlanState`
6. `UPSTREAM_NORMALIZED_REPLANNING_CARRIER`
   - the trusted upstream normalized carrier that `ResolvePlanState` consumed:
     - `NORMALIZED_REPLANNING_SIGNAL` for task-origin replanning with `source_scope=task`
     - `NORMALIZED_BUBBLE_ROUTE` for bubble-origin replanning with `source_scope=document_bubble|implementation_bubble`
7. `CREATE_PAIRFLOW_SPEC_CONTRACT`
   - `.claude/skills/CreatePairflowSpec/SKILL.md`
8. `METADATA_AUTHORITY_CONTRACT`
   - `references/Plan-Task-Metadata-Contract.md`
9. `RESOLVE_PLAN_STATE_CONTRACT`
   - `Workflows/ResolvePlanState.md`

Input rules:

1. `RESOLVED_NORMALIZED_REPLAN_ROUTE` is the execution entrypoint; `UPSTREAM_NORMALIZED_REPLANNING_CARRIER` is provenance only
2. task-origin replanning must reach this workflow through `NORMALIZED_REPLANNING_SIGNAL`, not through `NORMALIZED_BUBBLE_ROUTE`
3. bubble-origin replanning must reach this workflow through `NORMALIZED_BUBBLE_ROUTE`, not through a duplicated `NORMALIZED_REPLANNING_SIGNAL`
4. bubble-origin replanning must arrive here already normalized, with `source_scope=document_bubble` or `source_scope=implementation_bubble`
5. task-origin replanning must preserve `source_scope=task`
6. plan metadata remains canonical for sequencing, `active_task_id`, and `archive_group`
7. task metadata remains canonical for current `task_id`, status, lineage fields, and persisted bubble linkage
8. body prose, chat history, operator memory, or raw bubble impressions are forbidden as identity or archive authorities
9. if the normalized route or required metadata is absent, partial, or inconsistent, fail closed instead of guessing

## Entry Conditions

Run this workflow only when `ResolvePlanState` has already returned:

```yaml
route_class: normalized_replanning
target_workflow_surface: HandleNormalizedReplan
continuation_mode: auto_continue
route_scope: <task|document_bubble|implementation_bubble>
source_scope: <task|document_bubble|implementation_bubble>
approval_gate_state: not_applicable
reason_code: <TASK_REVIEW_ROUTE_BACK_TO_PLAN|BUBBLE_NORMALIZED_REPLAN_REQUIRED>
handoff_boundary_note: <resolved-route note proving this workflow is the next owner and that raw bubble detail stays out of scope>
```

Additional entry rules:

1. do not enter directly from raw Pairflow status
2. `route_scope=task` is valid only with `source_scope=task`
3. `route_scope=document_bubble` or `route_scope=implementation_bubble` is valid only when the preserved `source_scope` matches the bubble-origin carrier
4. do not enter from a generic "task feels too broad" hint unless that hint has already been converted into a trusted normalized replanning carrier
5. do not treat bubble-origin replanning as permission to reopen bubble lifecycle interpretation

## Output Contract

Return one follow-through result with this shape:

```yaml
followthrough_action: <review_plan|create_task|review_task|human_checkpoint>
target_workflow_surface: <ReviewPlan|CreateTask|ReviewTask|HumanCheckpoint>
delegated_create_pairflow_spec_surface: <ReviewSpec(plan-mode)|CreateTask|ReviewSpec(task-mode)|none>
continuation_mode: <auto_continue|stop_at_human_checkpoint>
source_owner: plan_task_followthrough_layer
source_scope: <task|document_bubble|implementation_bubble>
identity_effect: <preserve_current_task|replace_current_task|unresolved>
reason_code: <stable-reason-code>
lineage_handoff: <none|prepare_supersede_archive_handoff>
superseded_task_id: <optional canonical task id>
replacement_task_id: <optional canonical task id>
canonical_archive_group: <optional canonical archive group>
canonical_archive_path: <optional canonical archive path>
handoff_boundary_note: <short note describing the next owner and what remains out of scope>
```

Field rules:

1. `followthrough_action=review_plan` delegates plan-level correction only
2. `followthrough_action=create_task` is the replacement-task path and is valid only when the replacement canonical identity is already present in plan authority
3. `followthrough_action=review_task` is valid only when the current `task_id` remains the canonical executable identity
4. `followthrough_action=human_checkpoint` is required when trustworthy automatic follow-through is unavailable
5. `delegated_create_pairflow_spec_surface` must be:
   - `ReviewSpec(plan-mode)` for `ReviewPlan`
   - `CreateTask` for `CreateTask`
   - `ReviewSpec(task-mode)` for `ReviewTask`
   - `none` for `HumanCheckpoint`
6. `source_scope` must be preserved exactly from the resolved normalized route
7. `identity_effect=preserve_current_task` means the current `task_id` remains canonical and must not be marked `superseded`
8. `identity_effect=replace_current_task` means the current executable identity has changed enough that the existing task must eventually become `superseded`
9. `identity_effect=unresolved` is allowed only for `review_plan` or `human_checkpoint`
10. `lineage_handoff=prepare_supersede_archive_handoff` is valid only with `identity_effect=replace_current_task`
11. `canonical_archive_group` must come from plan authority
12. `canonical_archive_path`, when present, must equal `plans/archive/tasks/<archive_group>/<superseded_task_id>.md`
13. this result may prepare the supersede/archive handoff, but normal completion-after-success aftermath remains Task 5 scope

Post-delegation reroute rule:

1. after any delegated `auto_continue` action returns, rerun `ResolvePlanState` from fresh plan/task artifacts
2. do not chain the next plan/task step from stale local assumptions inside this workflow
3. the delegated workflow result advances authoritative artifact state; `ResolvePlanState` remains the only top-level route selector

## Reason-Code Anchor Set

This workflow may emit only the already-anchored reason codes for Task 4:

1. `TASK_REVIEW_ROUTE_BACK_TO_PLAN`
2. `BUBBLE_NORMALIZED_REPLAN_REQUIRED`
3. `AUTHORITY_PRECEDENCE_APPLIED`
4. `CROSS_AUTHORITY_METADATA_CONFLICT`
5. `NON_DETERMINISTIC_TASK_IDENTITY`
6. `PLAN_TASK_ID_REQUIRED_FOR_NOT_CREATED`
7. `NO_TRUSTWORTHY_ROUTE`
8. `BLOCKED_STATE_REQUIRES_CONTRACT_REFINEMENT`

## Identity and Lineage Rules

### Identity-preserving refinement

Use the current task in place when all of the following remain true:

1. the current `task_id` is still the canonical executable identity under plan sequencing
2. the required correction is task-local refinement rather than a new canonical task
3. no new `sequence_key` or `task_family_id` is required

Consequences:

1. keep the same `task_id`
2. do not set `status=superseded`
3. do not set `superseded_by`
4. route through `ReviewTask`

### Identity-changing replacement

Replacement is required when all of the following are true:

1. normalized replanning proves the current executable identity is no longer the correct canonical task
2. a replacement canonical `task_id` can be derived or is already declared by plan authority
3. lineage and canonical archive mapping remain deterministic under the Task 1 contract

Consequences:

1. route through plan correction first when sequencing or replacement identity still needs plan-level canonicalization
2. once the replacement canonical `task_id` is trustworthy, delegate `CreateTask`
3. the replacement task must record `supersedes=[<old_task_id>]`
4. the original task must record `superseded_by=<new_task_id>`
5. the superseded task archive handoff uses canonical `archive_group` plus the old `task_id`
6. do not preserve the old task as a default "split part 1" unless plan authority explicitly keeps that identity canonical

### Human-checkpoint boundary

Stop at `HumanCheckpoint` when any of the following is true:

1. normalized replanning input is partial, inconsistent, or provenance is unclear
2. plan/task disagreement crosses the approved authority split
3. task identity or archive mapping cannot be derived deterministically
4. replacement would require hidden metadata expansion or a second replanning taxonomy
5. real product or architecture judgment is required beyond mechanical follow-through

## Decision Order

Apply the first matching rule in this order.

### 1. Validate normalized replanning input

Fail closed when either normalized input layer is not trustworthy:

1. `RESOLVED_NORMALIZED_REPLAN_ROUTE` is missing required Task 2 fields
2. `UPSTREAM_NORMALIZED_REPLANNING_CARRIER` is absent or inconsistent with the resolved route
3. `source_scope` was not preserved exactly
4. bubble-origin replanning would require raw lifecycle reinterpretation here

Output:

```yaml
followthrough_action: human_checkpoint
target_workflow_surface: HumanCheckpoint
delegated_create_pairflow_spec_surface: none
continuation_mode: stop_at_human_checkpoint
source_owner: plan_task_followthrough_layer
source_scope: <preserved-source-scope>
identity_effect: unresolved
reason_code: NO_TRUSTWORTHY_ROUTE
lineage_handoff: none
handoff_boundary_note: Stop because normalized replanning provenance is incomplete or inconsistent; do not guess or reopen raw bubble interpretation.
```

### 2. Validate metadata determinism

Fail closed when authoritative metadata does not support deterministic follow-through:

1. the plan and task disagree across authority boundaries
2. the current or replacement `task_id` is ambiguous
3. the replacement path would need a canonical `task_id` that the plan does not provide
4. archive mapping cannot be derived from `archive_group` plus canonical `task_id`
5. blocked-state semantics outside the approved V1 contract would be required

Reason-code selection:

1. use `CROSS_AUTHORITY_METADATA_CONFLICT` for cross-authority disagreement
2. use `NON_DETERMINISTIC_TASK_IDENTITY` for identity or archive ambiguity
3. use `PLAN_TASK_ID_REQUIRED_FOR_NOT_CREATED` when the replacement task is planned but has no canonical `task_id`
4. use `BLOCKED_STATE_REQUIRES_CONTRACT_REFINEMENT` when the contract would need widening

### 3. Route to plan correction first when plan authority must change

Choose `ReviewPlan` when replanning requires plan-level correction before a trustworthy task action exists.

Examples:

1. task review explicitly routed back to plan
2. replacement identity is directionally clear, but the plan still needs canonical sequencing or tracker updates
3. task split, merge, or ordering change must be recorded in plan authority before task creation or task review is trustworthy

Output rules:

1. `followthrough_action=review_plan`
2. `target_workflow_surface=ReviewPlan`
3. `delegated_create_pairflow_spec_surface=ReviewSpec(plan-mode)`
4. `continuation_mode=auto_continue`
5. `identity_effect=unresolved` unless the replacement identity is already canonical
6. `reason_code` remains the triggering replanning code:
   - `TASK_REVIEW_ROUTE_BACK_TO_PLAN` for task-origin route-back
   - `BUBBLE_NORMALIZED_REPLAN_REQUIRED` for bubble-origin replanning

### 4. Create a replacement task when identity changed and plan authority is ready

Choose `CreateTask` when all of the following are true:

1. executable identity has changed
2. plan authority already names the replacement canonical `task_id`
3. replacement lineage is deterministic under the Task 1 contract
4. the next trustworthy action is task creation rather than more plan review

Output rules:

1. `followthrough_action=create_task`
2. `target_workflow_surface=CreateTask`
3. `delegated_create_pairflow_spec_surface=CreateTask`
4. `continuation_mode=auto_continue`
5. `identity_effect=replace_current_task`
6. `lineage_handoff=prepare_supersede_archive_handoff`
7. `superseded_task_id` must be the current canonical task id
8. `replacement_task_id` must be the canonical replacement task id from plan authority
9. `canonical_archive_group` must be the canonical plan archive group
10. `canonical_archive_path` may be present only when it equals the canonical derived archive path for the superseded task

Handoff note requirement:

1. explicitly say that replacement task creation must preserve `supersedes` / `superseded_by`
2. explicitly say that Task 5 normal completion aftermath is still out of scope

### 5. Review the current task when identity is preserved

Choose `ReviewTask` when all of the following are true:

1. normalized replanning says the current task still owns the executable slice
2. plan sequencing remains valid without plan-level correction
3. the required next step is task-local refinement before bubble routing resumes

Output rules:

1. `followthrough_action=review_task`
2. `target_workflow_surface=ReviewTask`
3. `delegated_create_pairflow_spec_surface=ReviewSpec(task-mode)`
4. `continuation_mode=auto_continue`
5. `identity_effect=preserve_current_task`
6. `lineage_handoff=none`
7. `reason_code` stays on the triggering replanning family rather than inventing a second task-review code family

### 6. Stop at human checkpoint for real uncertainty

If none of the trusted mechanical branches above close safely, return `HumanCheckpoint`.

Required note:

1. say exactly which authority boundary or identity decision remains unresolved
2. do not describe the stop as generic failure when the real issue is missing canonical authority

## Follow-through Guardrails

1. `HandleNormalizedReplan` consumes normalized replanning only; it must not reinterpret raw Pairflow detail from document or implementation bubbles.
2. Do not silently broaden the metadata contract because lineage or archive routing feels awkward.
3. Prefer plan correction plus replacement task creation over mutating the old task into a vague split sibling when executable identity clearly changed.
4. Keep normal progress/archive aftermath separate; this workflow closes only the pre-aftermath supersede/archive handoff boundary.
5. After every delegated action, return to the top-level route selector rather than building a private local state machine here.
