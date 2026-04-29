---
description: ResolvePlanState route selection for ExecutePairflowPlan from plan metadata, task metadata, bubble linkage, and normalized bubble-routing signals without performing downstream mutations
argument-hint: <plan-path>
allowed-tools: Read
---

# ResolvePlanState

## Purpose

Select the next normalized workflow route for `ExecutePairflowPlan`.

This workflow owns only:

1. state assessment inputs
2. normalized route taxonomy
3. normalized route output shape
4. next-workflow selection rules
5. auto-continue vs checkpoint rules
6. fail-closed exits for unresolved ambiguity

This workflow does not own:

1. downstream plan/task workflow body text
2. raw Pairflow lifecycle interpretation
3. task supersede/archive execution
4. progress/archive aftermath behavior
5. remote execution policy

Invocation note:

1. `argument-hint: <plan-path>` is an ergonomic caller hint only
2. it is not an authority source and does not widen the routing contract

Tooling note:

1. raw Pairflow lifecycle refresh belongs to `HandleDocumentBubble` or `HandleImplementationBubble`, not to this workflow
2. lifecycle mutation commands remain out of scope because this workflow selects the route only

## Inputs

Read only the minimum authoritative inputs needed for routing:

1. `PLAN_PATH`
   - parent plan artifact
2. `PLAN_METADATA`
   - required frontmatter from `references/Plan-Task-Metadata-Contract.md`
3. `ACTIVE_TASK_PATH`
   - task path from the active tracker row when a task artifact exists
4. `TASK_METADATA`
   - active task frontmatter when the task exists
5. `PERSISTED_BUBBLE_LINKAGE`
   - `doc_bubble_id` / `impl_bubble_id` from task metadata
6. `NORMALIZED_BUBBLE_ROUTE`
   - optional normalized continuation signal already produced by `HandleDocumentBubble` or `HandleImplementationBubble`
7. `NORMALIZED_REPLANNING_SIGNAL`
   - optional plan/task-level signal that says the next step is replanning rather than generic failure
8. `OPERATOR_HINT`
   - optional explicit hint such as "bubble stuck" or "too broad"
9. `METADATA_AUTHORITY_CONTRACT`
   - `references/Plan-Task-Metadata-Contract.md`, which defines the deterministic precedence rules behind `AUTHORITY_PRECEDENCE_APPLIED`

Input rules:

1. plan metadata decides sequencing and active task order
2. task metadata decides detailed local execution state
3. Pairflow remains the lifecycle authority for linked bubbles
4. repo-local bubble handlers read that raw lifecycle truth and emit normalized outputs or explicit stop boundaries
5. `ResolvePlanState` may consume only the normalized outputs, and it must not derive them from raw bubble detail
6. chat history, filename order, or operator memory are forbidden fallback routing sources

### Normalized bubble-input acceptance contract

`NORMALIZED_BUBBLE_ROUTE` must be treated as valid only when it comes from repo-local `HandleDocumentBubble` or `HandleImplementationBubble` and supplies, at minimum:

```yaml
route_class: <document_bubble_review|document_bubble_close|implementation_bubble_review|implementation_bubble_close|normalized_replanning>
target_workflow_surface: <stable surface name>
reason_code: <stable reason code>
source_owner: <bubble_routing_layer>
scope: <document|implementation|replanning>
source_scope: <document_bubble|implementation_bubble|not_applicable>
approval_gate_state: <not_applicable|review_required|already_satisfied>
```

Acceptance rules:

1. the route must already be normalized by the repo-local bubble routing layer
2. `route_class` and `target_workflow_surface` must agree with the taxonomy below
3. close routes are acceptable only when the normalized input explicitly says the relevant bubble is close-ready and that the separate review/approval path is already satisfied; for those routes `approval_gate_state` must be `already_satisfied`, and `ResolvePlanState` must not infer either condition from raw Pairflow state
4. review routes are acceptable only when `approval_gate_state=review_required`
5. `route_class=normalized_replanning` is acceptable only when the input explicitly signals replanning as the normalized outcome rather than a bubble review/close continuation; for bubble-origin replanning, `source_scope` must preserve whether the signal came from `document_bubble` or `implementation_bubble`
6. for `route_class` values other than `normalized_replanning`, `source_scope` must be `not_applicable`
7. create/start and troubleshooting outputs remain terminal execution boundaries in the bubble-handler layer and are not reinterpreted here as continuation input
8. extra handler-local fields such as `delegated_use_pairflow_surface`, `boundary_status`, or other non-taxonomy reporting fields may be present and must be ignored for route selection
9. in this Task 3 slice, bubble-origin replanning must travel through `NORMALIZED_BUBBLE_ROUTE`, not through `NORMALIZED_REPLANNING_SIGNAL`
10. if the normalized bubble input is absent, partial, or inconsistent, this workflow must not classify raw bubble detail on its own

### Normalized replanning-input acceptance contract

`NORMALIZED_REPLANNING_SIGNAL` must be treated as valid only when it supplies, at minimum:

```yaml
route_class: normalized_replanning
target_workflow_surface: HandleNormalizedReplan
reason_code: <stable reason code>
source_owner: task_routing_layer
source_scope: task
approval_gate_state: not_applicable
```

Acceptance rules:

1. task-origin replanning must use `source_scope=task`
2. bubble-origin replanning belongs in `NORMALIZED_BUBBLE_ROUTE` during this Task 3 slice and must not be duplicated here
3. the signal must tell `ResolvePlanState` that replanning supersedes same-source continuation for this routing decision
4. the signal authorizes routing only; it does not authorize supersede/archive execution here
5. if the normalized replanning signal is absent, partial, or inconsistent, this workflow must not treat replanning as selected

## Normalized Route Output

Return one route decision with this shape:

```yaml
route_class: <normalized-route-class>
target_workflow_surface: <stable-workflow-surface-name>
continuation_mode: <auto_continue|stop_at_settled_checkpoint|stop_at_human_checkpoint>
route_scope: <plan|task|document_bubble|implementation_bubble|bubble_runtime|orchestration>
source_scope: <task|document_bubble|implementation_bubble|not_applicable>
approval_gate_state: <not_applicable|review_required|already_satisfied>
reason_code: <stable-reason-code>
handoff_boundary_note: <short note describing what this workflow hands off and what it must not do>
```

Field rules:

1. `route_class` identifies the normalized orchestration route, not raw lifecycle detail
2. `target_workflow_surface` must match a stable surface named in `../SKILL.md`
3. `continuation_mode` tells the orchestrator whether it may keep going automatically after the delegated workflow returns
4. `route_scope` identifies which authority surface produced or now owns the route family
5. `source_scope` preserves the narrower origin when the route is `normalized_replanning`; for all other route classes it must be `not_applicable`
6. input-to-output mapping is explicit:
   - normalized bubble input `scope=document` maps to output `route_scope=document_bubble`
   - normalized bubble input `scope=implementation` maps to output `route_scope=implementation_bubble`
   - normalized bubble input `scope=replanning` keeps `route_scope=document_bubble` or `route_scope=implementation_bubble` according to `source_scope`
   - normalized replanning input from task review maps to `route_scope=task` and `source_scope=task`
7. `approval_gate_state` must be `already_satisfied` for close routes, `review_required` for review routes, and `not_applicable` otherwise
8. `reason_code` must explain why this route won
9. `handoff_boundary_note` must say which downstream owner receives control and what remains out of scope here
10. naming convention is deliberate:
   - `route_class` uses snake_case
   - `target_workflow_surface` uses PascalCase

## Normalized Route Taxonomy

| Route Class | Target Workflow Surface | Owner Layer | Continuation Mode | Route Scope | Source Scope | Approval Gate State | Trigger Summary | Handoff Boundary Note |
|---|---|---|---|---|---|---|---|---|
| `metadata_bootstrap` | `FixPlanMetadata` | repo-local workflow | `auto_continue` | `plan` | `not_applicable` | `not_applicable` | required plan metadata missing or non-trustworthy | repair metadata only, then return to normal resolution |
| `plan_review` | `ReviewPlan` | `CreatePairflowSpec` | `auto_continue` | `plan` | `not_applicable` | `not_applicable` | plan exists but is not execution-ready for task progression | delegate plan review/refinement only; do not create or mutate task execution state here |
| `task_create` | `CreateTask` | `CreatePairflowSpec` | `auto_continue` | `task` | `not_applicable` | `not_applicable` | next canonical task is planned but no task artifact exists yet | create the next task only; do not start bubble work here |
| `task_review` | `ReviewTask` | `CreatePairflowSpec` | `auto_continue` | `task` | `not_applicable` | `not_applicable` | active task exists but is not yet ready for bubble routing | review/refine task only; do not invent plan/bubble mutations here |
| `document_bubble_create` | `CreateDocumentBubble` | `UsePairflow` | `stop_at_settled_checkpoint` | `document_bubble` | `not_applicable` | `not_applicable` | approved task has no document bubble linkage yet | create/start the doc bubble; raw lifecycle follow-up stays with successor bubble routing |
| `document_bubble_review` | `ReviewDocumentBubble` | `UsePairflow` | `stop_at_human_checkpoint` | `document_bubble` | `not_applicable` | `review_required` | normalized bubble signal says the doc bubble reached its review gate | produce deep-review output for human approval/rework; do not close the bubble here |
| `document_bubble_close` | `CloseDocumentBubble` | `UsePairflow` | `auto_continue` | `document_bubble` | `not_applicable` | `already_satisfied` | normalized bubble signal says doc bubble is approved and ready to close after the separate review/approval path has already been satisfied | close/merge cleanup only; on successful return the same-run owner goes back to top-level `ResolvePlanState` for fresh route selection |
| `implementation_bubble_create` | `CreateImplementationBubble` | `UsePairflow` | `stop_at_settled_checkpoint` | `implementation_bubble` | `not_applicable` | `not_applicable` | trusted upstream input proves document refinement is complete and no impl bubble linkage exists yet | create/start the impl bubble; raw lifecycle follow-up stays with successor bubble routing |
| `implementation_bubble_review` | `ReviewImplementationBubble` | `UsePairflow` | `stop_at_human_checkpoint` | `implementation_bubble` | `not_applicable` | `review_required` | normalized bubble signal says the impl bubble reached its review gate | produce deep-review output for human approval/rework; do not close the bubble here |
| `implementation_bubble_close` | `CloseImplementationBubble` | `UsePairflow` | `auto_continue` | `implementation_bubble` | `not_applicable` | `already_satisfied` | normalized bubble signal says impl bubble is approved and ready to close after the separate review/approval path has already been satisfied | close/merge cleanup only; on successful return the top-level auto-continue handoff goes to repo-local `UpdateProgress` |
| `normalized_replanning` | `HandleNormalizedReplan` | repo-local `Workflows/HandleNormalizedReplan.md` | `auto_continue` | `task`, `document_bubble`, or `implementation_bubble` according to normalized source authority | `task` or bubble-origin `document_bubble` / `implementation_bubble` | `not_applicable` | task review or bubble layer produced a normalized replanning signal | consume the normalized signal only; repo-local follow-through may delegate `CreatePairflowSpec` work and prepare supersede/archive handoff, but raw bubble detail and normal aftermath remain out of scope here |
| `troubleshoot_bubble` | `TroubleshootBubble` | repo-local bubble handler -> `UsePairflow` troubleshooting surface | `stop_at_human_checkpoint` | `bubble_runtime` | `not_applicable` | `not_applicable` | explicit operator hint requires lifecycle troubleshooting | troubleshoot the bubble path only; do not silently resume normal orchestration here |
| `human_checkpoint` | `HumanCheckpoint` | human decision boundary | `stop_at_human_checkpoint` | `orchestration` | `not_applicable` | `not_applicable` | ambiguity, contract refinement need, or cross-authority conflict remains unresolved | stop and explain why no trustworthy automatic route exists |
| `plan_complete` | `PlanComplete` | top-level stop boundary | `stop_at_settled_checkpoint` | `plan` | `not_applicable` | `not_applicable` | all tasks are terminal and archive-settled, and the plan is complete | stop cleanly; no further route is selected in this run |

Taxonomy guardrails:

1. route classes stay at route/ownership level only
2. route classes may name bubble review/close surfaces, but they must not redefine how raw Pairflow states map to them
3. `normalized_replanning` is not a synonym for generic failure
4. `human_checkpoint` is required whenever trustworthy routing would otherwise need hidden authority or contract widening

## Selection Rules

Apply the first matching rule in this order.

### 1. Metadata readiness gate

Select `metadata_bootstrap` when any required plan metadata field is missing, malformed, duplicated, prose-only, or otherwise non-trustworthy.

Reason code:

1. `PLAN_METADATA_BOOTSTRAP_REQUIRED`

### 2. Immediate fail-closed contract gaps

Select `human_checkpoint` when any of the following is true and Rule 3's explicit troubleshooting preconditions do not already match:

1. blocked-state semantics are required outside the approved V1 domains
2. route ownership would become ambiguous between this shell and successor tasks
3. multiple plausible active task identities remain after applying the Task 1 metadata contract
4. the plan and task disagree across authority boundaries with no declared precedence rule
5. a planned-but-not-created task lacks an explicit canonical `task_id`
6. `plan_status=done` while any tracker row is still non-terminal or any active task artifact still reports a non-terminal task-local status
7. `plan_status=done` while any normally completed task remains `done` at its live task path and no deterministic archive-aftermath owner or evidence is available
8. `plan_status=done` while the plan artifact remains at a live path and no deterministic plan-archive aftermath owner or evidence is available

Reason codes:

1. `BLOCKED_STATE_REQUIRES_CONTRACT_REFINEMENT`
2. `ROUTE_OWNERSHIP_AMBIGUOUS`
3. `NON_DETERMINISTIC_TASK_IDENTITY`
4. `CROSS_AUTHORITY_METADATA_CONFLICT`
5. `PLAN_TASK_ID_REQUIRED_FOR_NOT_CREATED`
6. `PLAN_COMPLETE_STATE_STALE`
7. `ARCHIVE_AFTERMATH_REQUIRED`

### 3. Explicit troubleshooting path

Select `troubleshoot_bubble` only when a troubleshooting route is justified explicitly:

1. `OPERATOR_HINT` contains an explicit troubleshooting request such as "bubble stuck"
2. no normalized replanning signal is already present for the same routing decision and source scope

Reason codes:

1. `OPERATOR_TROUBLESHOOT_HINT`

Lifecycle-read failures discovered while interpreting a linked bubble belong to the repo-local bubble handlers. If the uncertainty reaches this workflow without a normalized bubble output, fail closed to `human_checkpoint` instead of guessing.

### 4. Normalized replanning input

Select `normalized_replanning` when a trusted normalized replanning signal is already present for this routing decision.

Source-scope rule:

1. task-review replanning must preserve `source_scope=task`
2. bubble-origin replanning that reaches this rule must already have arrived through `NORMALIZED_BUBBLE_ROUTE` with `source_scope=document_bubble` or `source_scope=implementation_bubble`
3. when present, normalized replanning supersedes same-source review/close continuation for this decision, but repo-local `HandleNormalizedReplan` still decides any supersede/archive follow-through

Reason codes:

1. `TASK_REVIEW_ROUTE_BACK_TO_PLAN`
2. `BUBBLE_NORMALIZED_REPLAN_REQUIRED`

### 5. Plan completion

Select `plan_complete` when:

1. `plan_status=done`
2. every tracker entry is terminal for execution
3. `active_task_id=null`
4. no active task artifact exists with non-terminal task-local status
5. every normally completed task is archive-settled:
   - tracker `status=archived`
   - tracker `task_path` points to `plans/archive/tasks/<archive_group>/<task_id>.md`
   - task metadata, when read at that path, has `status=archived`
6. the plan artifact is archive-settled:
   - `created_on` is present and trustworthy
   - `archive_group` equals `<created_on>-<plan_id>`
   - `PLAN_PATH` points to `plans/archive/plans/<created_on>-<live-plan-filename-stem>.md`
7. superseded tasks have deterministic lineage and archive aftermath already settled
8. no other trusted input contradicts the complete settled boundary

Reason code:

1. `PLAN_COMPLETE`

Archive-settlement note:

1. `done` is terminal for task execution but not settled for `PlanComplete`
2. if completed tasks remain `done`, route through the normal archive aftermath owner when that owner has valid settled-close provenance; otherwise stop at `HumanCheckpoint` with `ARCHIVE_AFTERMATH_REQUIRED`
3. do not silently promote `done` to `archived` without moving the task artifact to the canonical archive path and updating the tracker path
4. do not emit `PlanComplete` while the plan artifact remains at a live `plans/*.md` path; deterministic plan archival belongs to the normal archive aftermath path

### 6. Plan-level readiness

Select `plan_review` when the plan artifact still requires plan review or correction before task progression, but metadata repair is not the issue.

Examples:

1. `plan_status=draft`
2. `plan_status=under_review`
3. repaired metadata exists, but sequencing/readiness still says plan review must run first

Reason code:

1. `PLAN_REVIEW_REQUIRED`

### 7. Task creation path

Select `task_create` when:

1. the next canonical task is identified by plan sequencing
2. its tracker row is `not_created`
3. no task artifact exists yet
4. the planned task already has an explicit canonical `task_id`

Reason code:

1. `TASK_CREATION_REQUIRED`

If Rule 7 would otherwise match but the planned task lacks an explicit canonical `task_id`, select `human_checkpoint` instead with `PLAN_TASK_ID_REQUIRED_FOR_NOT_CREATED`.

### 8. Task review path

Select `task_review` when an active task artifact exists but is not yet bubble-ready.

Examples:

1. task `status=draft`
2. task `status=under_review`
3. plan tracker lags behind the task, but the task remains the detailed authority and still is not approved

Reason codes:

1. `TASK_REVIEW_REQUIRED`
2. `AUTHORITY_PRECEDENCE_APPLIED`

Precedence source note:

1. `AUTHORITY_PRECEDENCE_APPLIED` is valid only when the resolution follows the deterministic precedence rules already defined in `METADATA_AUTHORITY_CONTRACT`

### 9. Document-bubble creation path

Select `document_bubble_create` when:

1. the active task is approved
2. no document bubble linkage exists yet

Execution note:

1. `CreateDocumentBubble` remains the stable route surface, but the actual create/start delegation is owned by repo-local `HandleDocumentBubble`, which then calls `UsePairflow`

Reason code:

1. `DOC_BUBBLE_CREATE_REQUIRED`

### 10. Normalized document-bubble continuation

Consume only normalized bubble-route input here, already emitted by `HandleDocumentBubble`.

Select:

1. `document_bubble_review` for a normalized doc review gate
2. `document_bubble_close` for a normalized doc close/merge gate, but only when the normalized input explicitly proves both close-ready state and already-satisfied approval-path state
3. `normalized_replanning` when the normalized bubble input explicitly routes away from document-bubble continuation and into replanning

Reason codes:

1. `DOC_BUBBLE_REVIEW_REQUIRED`
2. `DOC_BUBBLE_CLOSE_REQUIRED`
3. `BUBBLE_NORMALIZED_REPLAN_REQUIRED`

If only raw Pairflow state exists and no normalized mapping has been produced yet, do not classify it here.

### 11. Implementation-bubble creation path

Select `implementation_bubble_create` when:

1. document refinement is complete for the active task under a trusted upstream authority surface
2. that completion proof comes from:
   - a normalized close-ready or close-completed document-bubble continuation returned by the successor-owned bubble routing layer in the current orchestration pass, or
   - a trustworthy persisted result of an already-completed document-bubble close path that remains within the same declared authority split
3. no implementation bubble linkage exists yet
4. completion is not inferred from bubble absence, filename guesses, or raw Pairflow lifecycle detail alone

Execution note:

1. `CreateImplementationBubble` remains the stable route surface, but the actual create/start delegation is owned by repo-local `HandleImplementationBubble`, which then calls `UsePairflow`

Reason code:

1. `IMPL_BUBBLE_CREATE_REQUIRED`

### 12. Normalized implementation-bubble continuation

Consume only normalized bubble-route input here, already emitted by `HandleImplementationBubble`.

Select:

1. `implementation_bubble_review` for a normalized implementation review gate
2. `implementation_bubble_close` for a normalized implementation close/merge gate, but only when the normalized input explicitly proves both close-ready state and already-satisfied approval-path state
3. `normalized_replanning` when the normalized bubble input explicitly routes away from implementation continuation and into replanning

Reason codes:

1. `IMPL_BUBBLE_REVIEW_REQUIRED`
2. `IMPL_BUBBLE_CLOSE_REQUIRED`
3. `BUBBLE_NORMALIZED_REPLAN_REQUIRED`

If only raw Pairflow state exists and no normalized mapping has been produced yet, do not classify it here.

### 13. Bubble normalization required checkpoint

Select `human_checkpoint` when one or more persisted bubble linkages exist, but choosing the next route would require a normalized bubble continuation signal that is absent.

Examples:

1. both document and implementation bubble linkages are populated, but no normalized continuation or replanning signal is available
2. a linked bubble clearly exists, but only raw lifecycle truth is present and bubble-side normalization has not yet been produced

Reason code:

1. `BUBBLE_ROUTE_NORMALIZATION_REQUIRED`

### 14. Final safety net

If no trustworthy route matches, select `human_checkpoint`.

Reason code:

1. `NO_TRUSTWORTHY_ROUTE`

## Auto-Continue vs Checkpoint Rules

### Auto-continue routes

These routes may continue automatically after the delegated workflow returns a trustworthy result:

1. `metadata_bootstrap`
2. `plan_review`
3. `task_create`
4. `task_review`
5. `document_bubble_close`
6. `implementation_bubble_close`
7. `normalized_replanning`

Why:

1. these routes can feed the next orchestration decision without crossing an explicit human approval boundary
2. they may auto-continue only while each step produces a trustworthy state advance; repeated no-op routing must fail closed instead of looping

### Settled-checkpoint routes

These routes should stop after a stable execution boundary even when no human decision is required immediately:

1. `document_bubble_create`
2. `implementation_bubble_create`
3. `plan_complete`

### Human-checkpoint routes

These routes must stop for explicit human judgment or because trustworthy automatic routing is unavailable:

1. `document_bubble_review`
2. `implementation_bubble_review`
3. `troubleshoot_bubble`
4. `human_checkpoint`

Why:

1. bubble review routes end at the human approval/rework gate by policy
2. troubleshoot and human-checkpoint routes stop because the route contract is no longer safely self-advancing

## Worked Examples

### Example 1: Missing plan metadata

Input shape:

1. plan lacks `task_order`
2. task file may or may not exist

Output:

```yaml
route_class: metadata_bootstrap
target_workflow_surface: FixPlanMetadata
continuation_mode: auto_continue
route_scope: plan
source_scope: not_applicable
approval_gate_state: not_applicable
reason_code: PLAN_METADATA_BOOTSTRAP_REQUIRED
handoff_boundary_note: Repair plan metadata only, then return to ResolvePlanState.
```

### Example 2: Next task not created yet

Input shape:

1. plan metadata is trustworthy
2. `active_task_id=<next-canonical-task-id>`
3. matching tracker row is `not_created`
4. no task artifact exists yet

Output:

```yaml
route_class: task_create
target_workflow_surface: CreateTask
continuation_mode: auto_continue
route_scope: task
source_scope: not_applicable
approval_gate_state: not_applicable
reason_code: TASK_CREATION_REQUIRED
handoff_boundary_note: Delegate task creation to CreatePairflowSpec; do not start bubble work here.
```

### Example 3: Existing task still needs review

Input shape:

1. plan metadata is trustworthy
2. active task artifact exists
3. task `status=under_review`

Output:

```yaml
route_class: task_review
target_workflow_surface: ReviewTask
continuation_mode: auto_continue
route_scope: task
source_scope: not_applicable
approval_gate_state: not_applicable
reason_code: TASK_REVIEW_REQUIRED
handoff_boundary_note: Delegate task review/refinement only; route-back-to-plan, if produced later, returns as normalized replanning.
```

### Example 4: Approved task with no document bubble

Input shape:

1. task `status=approved`
2. `doc_bubble_id=null`
3. no normalized bubble route is present

Output:

```yaml
route_class: document_bubble_create
target_workflow_surface: CreateDocumentBubble
continuation_mode: stop_at_settled_checkpoint
route_scope: document_bubble
source_scope: not_applicable
approval_gate_state: not_applicable
reason_code: DOC_BUBBLE_CREATE_REQUIRED
handoff_boundary_note: Start the doc bubble through UsePairflow and stop at the bubble-started boundary.
```

### Example 5: Bubble layer already normalized a review gate

Input shape:

1. task has a persisted document bubble id
2. `HandleDocumentBubble` supplies `NORMALIZED_BUBBLE_ROUTE=document_bubble_review`

Output:

```yaml
route_class: document_bubble_review
target_workflow_surface: ReviewDocumentBubble
continuation_mode: stop_at_human_checkpoint
route_scope: document_bubble
source_scope: not_applicable
approval_gate_state: review_required
reason_code: DOC_BUBBLE_REVIEW_REQUIRED
handoff_boundary_note: Run deep review and hand the result to a human approval/rework decision.
```

### Example 6: Plan tracker lag resolved by authority precedence

Input shape:

1. active task artifact exists
2. task `status=under_review`
3. plan tracker still says `draft`
4. no sequencing conflict exists, so the disagreement stays inside the declared authority split

Output:

```yaml
route_class: task_review
target_workflow_surface: ReviewTask
continuation_mode: auto_continue
route_scope: task
source_scope: not_applicable
approval_gate_state: not_applicable
reason_code: AUTHORITY_PRECEDENCE_APPLIED
handoff_boundary_note: Treat task-local status as the detailed authority and continue through task review; reconcile the stale plan summary later.
```

### Example 7: Normalized replanning after task review

Input shape:

1. task review already produced a normalized route-back-to-plan signal
2. no raw bubble interpretation is needed

Output:

```yaml
route_class: normalized_replanning
target_workflow_surface: HandleNormalizedReplan
continuation_mode: auto_continue
route_scope: task
source_scope: task
approval_gate_state: not_applicable
reason_code: TASK_REVIEW_ROUTE_BACK_TO_PLAN
handoff_boundary_note: Hand control to repo-local HandleNormalizedReplan; that workflow may delegate CreatePairflowSpec follow-through and prepare supersede/archive handoff, but this workflow does not execute it here.
```

### Example 8: Document bubble close already approved

Input shape:

1. task has a persisted document bubble id
2. `HandleDocumentBubble` supplies `NORMALIZED_BUBBLE_ROUTE=document_bubble_close`
3. normalized input explicitly proves `approval_gate_state=already_satisfied`

Output:

```yaml
route_class: document_bubble_close
target_workflow_surface: CloseDocumentBubble
continuation_mode: auto_continue
route_scope: document_bubble
source_scope: not_applicable
approval_gate_state: already_satisfied
reason_code: DOC_BUBBLE_CLOSE_REQUIRED
handoff_boundary_note: Close the approved document bubble only; on successful return hand control back to top-level ResolvePlanState for fresh route selection.
```

### Example 9: Implementation bubble close already approved

Input shape:

1. task has a persisted implementation bubble id
2. `HandleImplementationBubble` supplies `NORMALIZED_BUBBLE_ROUTE=implementation_bubble_close`
3. normalized input explicitly proves `approval_gate_state=already_satisfied`

Output:

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

### Example 10: Blocked-state refinement need

Input shape:

1. plan or task material requires explicit blocked-state semantics
2. the approved V1 metadata contract does not define that state

Output:

```yaml
route_class: human_checkpoint
target_workflow_surface: HumanCheckpoint
continuation_mode: stop_at_human_checkpoint
route_scope: orchestration
source_scope: not_applicable
approval_gate_state: not_applicable
reason_code: BLOCKED_STATE_REQUIRES_CONTRACT_REFINEMENT
handoff_boundary_note: Stop and request contract refinement instead of widening the status domain locally.
```

### Example 11: Plan complete with consistent cross-field state

Input shape:

1. `plan_status=done`
2. every normally completed tracker row is `archived`
3. `active_task_id=null`
4. each archived tracker row points at `plans/archive/tasks/<archive_group>/<task_id>.md`
5. `created_on` is trustworthy and `archive_group=<created_on>-<plan_id>`
6. `PLAN_PATH` points at `plans/archive/plans/<created_on>-<live-plan-filename-stem>.md`
7. no active task artifact contradicts completion

Output:

```yaml
route_class: plan_complete
target_workflow_surface: PlanComplete
continuation_mode: stop_at_settled_checkpoint
route_scope: plan
source_scope: not_applicable
approval_gate_state: not_applicable
reason_code: PLAN_COMPLETE
handoff_boundary_note: Stop cleanly because the plan has reached a consistent settled boundary: execution is terminal, completed task artifacts are canonically archived, and the plan artifact itself is canonically archived.
```

### Example 12: Explicit troubleshooting hint

Input shape:

1. operator hint says the active bubble is stuck
2. the request is explicitly about troubleshooting rather than silent rerouting

Output:

```yaml
route_class: troubleshoot_bubble
target_workflow_surface: TroubleshootBubble
continuation_mode: stop_at_human_checkpoint
route_scope: bubble_runtime
source_scope: not_applicable
approval_gate_state: not_applicable
reason_code: OPERATOR_TROUBLESHOOT_HINT
handoff_boundary_note: Delegate lifecycle troubleshooting only; do not resume normal routing until the issue is clarified.
```

## Fail-Closed Exit

Return `human_checkpoint` instead of inventing a route when any of the following remains true:

1. the next active task cannot be identified deterministically -> `NON_DETERMINISTIC_TASK_IDENTITY`
2. plan/task/bubble authorities disagree across boundaries without a closed precedence rule -> `CROSS_AUTHORITY_METADATA_CONFLICT`
3. blocked-state semantics or another contract expansion would be required -> `BLOCKED_STATE_REQUIRES_CONTRACT_REFINEMENT`
4. only raw bubble detail is available, but selecting the next route would require bubble-side classification -> `BUBBLE_ROUTE_NORMALIZATION_REQUIRED`
5. downstream ownership is unclear -> `ROUTE_OWNERSHIP_AMBIGUOUS`
6. a planned-but-not-created task lacks an explicit canonical `task_id` -> `PLAN_TASK_ID_REQUIRED_FOR_NOT_CREATED`
7. `plan_status=done` while any tracker row or active task artifact remains non-terminal -> `PLAN_COMPLETE_STATE_STALE`
8. `plan_status=done` while completed tasks remain `done` at live paths and archive aftermath is not settled or not deterministically owned -> `ARCHIVE_AFTERMATH_REQUIRED`
9. no narrower fail-closed condition explains the miss -> `NO_TRUSTWORTHY_ROUTE`

Do not continue into downstream execution from this workflow. It selects the route only.
