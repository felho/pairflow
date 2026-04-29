---
description: Route implementation-bubble lifecycle for ExecutePairflowPlan from task linkage and Pairflow truth into UsePairflow delegation and normalized bubble outputs
argument-hint: <task-path>
allowed-tools: Read, Bash
---

# Handle Implementation Bubble

## Purpose

Own the implementation-bubble routing layer for `ExecutePairflowPlan`.

This workflow owns only:

1. proving whether the active task is ready to enter or continue the implementation-bubble phase
2. reading implementation-bubble linkage from task metadata
3. reading raw Pairflow lifecycle truth for the linked implementation bubble when one exists
4. delegating implementation-bubble create, review, close, or troubleshooting work through `UsePairflow`
5. emitting normalized implementation-bubble outputs that `ResolvePlanState` can consume later without reinterpretation

This workflow does not own:

1. document-bubble completion inference from prose-only context
2. plan sequencing or task-review ownership
3. plan/task follow-through after normalized replanning
4. progress/archive aftermath
5. remote execution support
6. metadata-contract expansion beyond the merged Task 1 / Task 2 baseline

## Route-Surface Role

This repo-local workflow is the backing owner behind the stable route surfaces:

1. `CreateImplementationBubble`
2. `ReviewImplementationBubble`
3. `CloseImplementationBubble`
4. implementation-scope `TroubleshootBubble`
5. bubble-origin `normalized_replanning` with `source_scope=implementation_bubble`

The surface names above stay stable for the top-level orchestrator. This workflow owns the raw Pairflow read-path and the delegation into `UsePairflow`.

## Inputs

Read only the minimum authoritative inputs needed for the implementation-bubble decision:

1. `REPO_PATH`
   - canonical repo root used for `pairflow bubble status --repo <repo-path> --json`
2. `TASK_PATH`
   - active task artifact
3. `TASK_METADATA`
   - task frontmatter from `TASK_PATH`
4. `TASK_STATUS`
   - task-local status from `TASK_METADATA`; `implementable` is the durable proof that the document-refinement phase is complete for this task
5. `IMPL_BUBBLE_ID`
   - `task_metadata.impl_bubble_id`
6. `TOP_LEVEL_ROUTE_CONTEXT`
   - the current orchestrator route family for this pass, limited here to the implementation-bubble branch
7. `OPERATOR_HINT`
   - optional explicit hint such as "bubble stuck", "too broad", or "route back to plan"
8. `USE_PAIRFLOW_CONTRACT`
   - `.claude/skills/UsePairflow/SKILL.md`
9. `RESOLVE_PLAN_STATE_CONTRACT`
   - `Workflows/ResolvePlanState.md`
10. `METADATA_AUTHORITY_CONTRACT`
   - `references/Plan-Task-Metadata-Contract.md`
11. `PAIRFLOW_STATUS`
   - `pairflow bubble status --id <impl_bubble_id> --repo <repo-path> --json` when `IMPL_BUBBLE_ID` is present

Input rules:

1. task metadata stores linkage only; it is not lifecycle authority
2. Pairflow remains the canonical lifecycle authority for the linked implementation bubble
3. `TOP_LEVEL_ROUTE_CONTEXT` narrows this workflow to the implementation-bubble branch only; it does not authorize plan/task routing here
4. implementation-bubble creation requires `status=implementable`; `doc_bubble_id` and raw document-bubble lifecycle detail are not completion proof
5. this workflow may use `OPERATOR_HINT` only to choose among already-authorized troubleshooting or replanning branches; it must not invent new lifecycle meaning

Document-completion proof for this slice:

```yaml
proof_kind: task_status_implementable
source_owner: task_metadata
task_status: implementable
```

Proof rules:

1. `proof_kind=task_status_implementable` means `CloseDocumentBubble` already consumed the approved document-bubble close path and persisted `status=implementable`
2. bubble absence, prose-only memory, raw lifecycle state alone, a normalized close route that has not yet been executed, or `doc_bubble_id` alone are never valid proof artifacts

## Entry Conditions

Run this workflow only when the active task has entered the implementation-bubble route family:

1. task metadata has `status=implementable` and `impl_bubble_id=null`
2. a persisted `impl_bubble_id` exists
3. an explicit operator hint refers to an already-linked implementation bubble that needs troubleshooting or bubble-origin replanning review

If document-phase completion is not proven by `status=implementable`, do not start implementation-bubble handling here.

## Output Contracts

Return one primary result shape from sections `A` or `B` below.

When the handler stops without emitting a normalized continuation route, it may additionally emit the structured local boundary report defined later in this workflow.

### A. Normalized continuation or replanning route

Use this shape only when the handler is emitting a value that `ResolvePlanState` may later consume as `NORMALIZED_BUBBLE_ROUTE`:

```yaml
route_class: <implementation_bubble_review|implementation_bubble_close|normalized_replanning>
target_workflow_surface: <ReviewImplementationBubble|CloseImplementationBubble|HandleNormalizedReplan>
continuation_mode: <auto_continue|stop_at_human_checkpoint>
source_owner: bubble_routing_layer
scope: <implementation|replanning>
source_scope: <not_applicable|implementation_bubble>
approval_gate_state: <not_applicable|review_required|already_satisfied>
reason_code: <stable-reason-code>
delegated_use_pairflow_surface: <ReviewBubble|CloseBubble|none>
handoff_boundary_note: <short note describing the next owner and what remains out of scope>
```

Field rules:

1. `scope=implementation` for review and close outputs
2. `scope=replanning` only for `route_class=normalized_replanning`
3. `source_scope=implementation_bubble` only for bubble-origin replanning
4. `source_scope=not_applicable` for review and close outputs
5. `approval_gate_state=review_required` only for `implementation_bubble_review`
6. `approval_gate_state=already_satisfied` only for `implementation_bubble_close`
7. `approval_gate_state=not_applicable` for normalized replanning
8. `delegated_use_pairflow_surface=none` is valid only for normalized replanning
9. `continuation_mode` must mirror the stable route policy already owned by `ResolvePlanState`; this workflow reports the value for the delegated result, but does not redefine the policy
10. additional handler-local fields may appear, but `ResolvePlanState` must ignore them unless they belong to the accepted normalized taxonomy

### B. Handler-local action result

Use this shape for create/start and troubleshooting actions that stop within the handler layer and are not fed back into `ResolvePlanState` as `NORMALIZED_BUBBLE_ROUTE`:

```yaml
action_surface: <CreateImplementationBubble|TroubleshootBubble>
continuation_mode: <stop_at_settled_checkpoint|stop_at_human_checkpoint>
source_owner: bubble_routing_layer
scope: implementation
reason_code: <IMPL_BUBBLE_CREATE_REQUIRED|OPERATOR_TROUBLESHOOT_HINT|PAIRFLOW_STATUS_UNAVAILABLE>
delegated_use_pairflow_surface: <CreateBubble|TroubleshootBubble>
metadata_postcondition: <impl_bubble_id_persisted_and_status_in_progress|not_applicable>
handoff_boundary_note: <short note describing why the handler stops here>
```

Normalization note:

1. `ResolvePlanState` consumes only normalized continuation or replanning outputs from this workflow
2. create/start and troubleshooting results are terminal execution boundaries for the current pass and must remain handler-local action results rather than normalized continuation routes
3. create/start may return a settled boundary only after `metadata_postcondition=impl_bubble_id_persisted_and_status_in_progress`

### Structured Local Boundary Report

When this workflow stops without emitting a normalized continuation route back into `ResolvePlanState`, it must still emit a structured local boundary report with this shape:

```yaml
boundary_status: <active_bubble_hold|human_checkpoint>
continuation_mode: <stop_at_settled_checkpoint|stop_at_human_checkpoint>
source_owner: bubble_routing_layer
scope: implementation
boundary_reason: <bubble_still_running|preconditions_not_met|normalization_unsafe>
escalation_reason_code: <optional-anchored-human-checkpoint-code>
handoff_boundary_note: <short note describing why the pass stops here>
```

Boundary rules:

1. use `boundary_status=active_bubble_hold` when the linked implementation bubble is still running and no higher boundary has been reached yet
2. use `boundary_status=human_checkpoint` when the branch fails closed and trustworthy automatic routing is unavailable
3. this report is for local pass reporting only; it is not a normalized continuation route for `ResolvePlanState`
4. `boundary_status=human_checkpoint` must hand control back upward as a top-level `HumanCheckpoint` stop rather than as a synthetic bubble route
5. `escalation_reason_code` is optional and should be present only when the handler is handing an already-anchored human-checkpoint reason back upward
6. allowed `escalation_reason_code` values in this workflow are exactly `BUBBLE_ROUTE_NORMALIZATION_REQUIRED` or `NO_TRUSTWORTHY_ROUTE`

### Reason-Code Anchor Set

This workflow may emit only the already-anchored implementation-scope reason codes:

1. `IMPL_BUBBLE_CREATE_REQUIRED`
2. `IMPL_BUBBLE_REVIEW_REQUIRED`
3. `IMPL_BUBBLE_CLOSE_REQUIRED`
4. `BUBBLE_NORMALIZED_REPLAN_REQUIRED`
5. `BUBBLE_ROUTE_NORMALIZATION_REQUIRED`
6. `PAIRFLOW_STATUS_UNAVAILABLE`
7. `OPERATOR_TROUBLESHOOT_HINT`
8. `NO_TRUSTWORTHY_ROUTE`

## Decision Order

Apply the first matching rule in this order.

### 1. Baseline and document-completion guards

Fail closed before reading implementation lifecycle truth when any of the following is true and Rule 2 does not already match for an already-linked implementation bubble:

1. the task lacks trustworthy metadata required by the merged Task 1 contract
2. document-phase completion is not proven by task metadata `status=implementable`
3. implementation-bubble routing would require inventing new metadata fields or hidden lifecycle state

Proof rule:

1. implementation-bubble creation relies on `status=implementable` as the durable persisted result of document-bubble close
2. it must not rely on `doc_bubble_id`, bubble absence, filename guesses, raw Pairflow lifecycle state, or prose-only operator memory

Boundary report:

```yaml
boundary_status: human_checkpoint
continuation_mode: stop_at_human_checkpoint
source_owner: bubble_routing_layer
scope: implementation
boundary_reason: preconditions_not_met
escalation_reason_code: <BUBBLE_ROUTE_NORMALIZATION_REQUIRED-or-NO_TRUSTWORTHY_ROUTE>
handoff_boundary_note: Stop and return control upward as a top-level human checkpoint because the implementation-bubble handler was entered without enough trustworthy preconditions.
```

Escalation selection:

1. use `BUBBLE_ROUTE_NORMALIZATION_REQUIRED` when a linked implementation bubble exists but continuation would require missing bubble-side normalization before safe route selection
2. use `NO_TRUSTWORTHY_ROUTE` when the handler was entered without enough trustworthy prerequisites and no narrower bubble-normalization reason applies

### 2. Explicit troubleshooting path

Choose troubleshooting when:

1. `OPERATOR_HINT` explicitly asks for implementation-bubble troubleshooting such as "bubble stuck"
2. or `PAIRFLOW_STATUS` cannot be read cleanly and the situation is explicitly a runtime/lifecycle problem rather than a routing ambiguity

Delegation:

1. delegate to `UsePairflow` troubleshooting surface

Output:

```yaml
action_surface: TroubleshootBubble
continuation_mode: stop_at_human_checkpoint
source_owner: bubble_routing_layer
scope: implementation
reason_code: <OPERATOR_TROUBLESHOOT_HINT-or-PAIRFLOW_STATUS_UNAVAILABLE>
delegated_use_pairflow_surface: TroubleshootBubble
handoff_boundary_note: Troubleshoot the linked implementation bubble only; do not continue normal orchestration from the same raw lifecycle read.
```

Reason-code selection:

1. use `OPERATOR_TROUBLESHOOT_HINT` when the operator explicitly asked for troubleshooting
2. use `PAIRFLOW_STATUS_UNAVAILABLE` when the runtime/lifecycle issue is confirmed by the failed status read

### 3. Create the implementation bubble

Choose create when:

1. task metadata has `status=implementable`
2. `impl_bubble_id=null`

Delegation:

1. delegate create/start through `UsePairflow` `CreateBubble`
2. persist the created bubble id into task metadata as `impl_bubble_id`
3. move task metadata to `status=in_progress`
4. preserve the implementation-bubble quality model and stop after the bubble-started boundary

Output:

```yaml
action_surface: CreateImplementationBubble
continuation_mode: stop_at_settled_checkpoint
source_owner: bubble_routing_layer
scope: implementation
reason_code: IMPL_BUBBLE_CREATE_REQUIRED
delegated_use_pairflow_surface: CreateBubble
metadata_postcondition: impl_bubble_id_persisted_and_status_in_progress
handoff_boundary_note: Start the implementation bubble through UsePairflow, persist impl_bubble_id, set status=in_progress, and stop at the settled bubble-started boundary.
```

Fail-closed rule:

1. if create/start succeeds but task metadata cannot be updated with `impl_bubble_id` and `status=in_progress`, the handler must not report a settled create boundary
2. return a human checkpoint or troubleshooting result that names the missing implementation linkage/status persistence as the blocker

### 4. Read the linked bubble and classify only implementation-owned routes

When `impl_bubble_id` exists:

1. read `PAIRFLOW_STATUS`
2. use Pairflow lifecycle truth only for implementation-bubble review, close, troubleshooting, or fail-closed classification
3. do not reopen document-phase completion, plan sequencing, or archive ownership here

### 5. Review-gate path

Choose review when Pairflow truth shows the linked implementation bubble reached its explicit approval-review gate.

Authoritative trigger anchors:

1. `READY_FOR_HUMAN_APPROVAL`
2. legacy-compatible `READY_FOR_APPROVAL`

Delegation:

1. delegate deep review through `UsePairflow` `ReviewBubble`

Output:

```yaml
route_class: implementation_bubble_review
target_workflow_surface: ReviewImplementationBubble
continuation_mode: stop_at_human_checkpoint
source_owner: bubble_routing_layer
scope: implementation
source_scope: not_applicable
approval_gate_state: review_required
reason_code: IMPL_BUBBLE_REVIEW_REQUIRED
delegated_use_pairflow_surface: ReviewBubble
handoff_boundary_note: Run deep review at the implementation-bubble approval gate and stop for human approve/rework judgment.
```

### 6. Close path

Choose close only when the bubble-side route contract proves both of the following:

1. the linked implementation bubble is close-ready
2. the separate approval/review path is already satisfied

Authoritative trigger anchors:

1. Pairflow state is `APPROVED_FOR_COMMIT`
2. or the linked bubble is at `DONE` and the current context already carries a trusted structured approval-proof producer such as a clean `UsePairflow` `ReviewBubble` result followed by an explicit human approval outcome recorded in authoritative workflow context rather than prose-only notes

Delegation:

1. delegate close/merge/cleanup through `UsePairflow` `CloseBubble`
2. require the returned close result to prove finalized bubble artifact deletion, or to provide an explicit retained-bubble reason that prevents reporting a settled close

Output:

```yaml
route_class: implementation_bubble_close
target_workflow_surface: CloseImplementationBubble
continuation_mode: auto_continue
source_owner: bubble_routing_layer
scope: implementation
source_scope: not_applicable
approval_gate_state: already_satisfied
reason_code: IMPL_BUBBLE_CLOSE_REQUIRED
delegated_use_pairflow_surface: CloseBubble
cleanup_postcondition: <bubble_deleted|retained_with_reason>
handoff_boundary_note: Close the approved implementation bubble only; the caller may continue orchestration after authoritative close state returns.
```

Fail-closed rule:

1. if close/merge succeeds but the finalized bubble artifact remains present without an explicit retained-bubble reason, do not emit an auto-continuable close result
2. return a human checkpoint or cleanup blocker instead; `UpdateProgress` must not run from a close result that still leaves the closed implementation bubble as an ordinary `DONE` artifact

### 7. Normalized replanning path

Choose normalized replanning only when the bubble-side route contract proves that continuation should hand back upward instead of continuing the current implementation-bubble path.

Acceptable proof:

1. deep review or bubble-side findings explicitly show the implementation slice should route back to task/plan-level follow-through
2. the proof is already normalized at the bubble layer rather than left as raw Pairflow detail or generic unease

Forbidden proof:

1. implementation bubble absence
2. raw Pairflow state by itself
3. generic runtime trouble that belongs to troubleshooting instead

Output:

```yaml
route_class: normalized_replanning
target_workflow_surface: HandleNormalizedReplan
continuation_mode: auto_continue
source_owner: bubble_routing_layer
scope: replanning
source_scope: implementation_bubble
approval_gate_state: not_applicable
reason_code: BUBBLE_NORMALIZED_REPLAN_REQUIRED
delegated_use_pairflow_surface: none
handoff_boundary_note: Hand a normalized implementation-bubble replanning signal back upward; plan/task follow-through remains out of scope here.
```

Conduit rule:

1. bubble-origin normalized replanning from this workflow must be emitted through the `NORMALIZED_BUBBLE_ROUTE` slot
2. this workflow must not also populate `NORMALIZED_REPLANNING_SIGNAL` for the same routing decision

### 8. Active bubble with no higher boundary yet

If the linked implementation bubble is still actively running and none of the review, close, replanning, or troubleshooting conditions apply:

1. stop at the current settled checkpoint
2. do not mint a second normalized continuation route
3. do not infer completion, approval, or replanning from a merely active lifecycle state

Boundary report:

```yaml
boundary_status: active_bubble_hold
continuation_mode: stop_at_settled_checkpoint
source_owner: bubble_routing_layer
scope: implementation
boundary_reason: bubble_still_running
handoff_boundary_note: Hold at the active implementation-bubble checkpoint until a later review, close, troubleshooting, or normalized replanning boundary is reached; do not escalate this settled hold into ResolvePlanState.
```

### 9. Final fail-closed exit

If raw Pairflow detail exists but cannot be normalized safely into one of the routes above:

1. stop and fail closed
2. prefer exact checkpoint codes already anchored by Task 2

Recommended reason codes:

1. `BUBBLE_ROUTE_NORMALIZATION_REQUIRED`
2. `NO_TRUSTWORTHY_ROUTE`

Boundary report:

```yaml
boundary_status: human_checkpoint
continuation_mode: stop_at_human_checkpoint
source_owner: bubble_routing_layer
scope: implementation
boundary_reason: normalization_unsafe
escalation_reason_code: <BUBBLE_ROUTE_NORMALIZATION_REQUIRED-or-NO_TRUSTWORTHY_ROUTE>
handoff_boundary_note: Stop because raw implementation-bubble lifecycle detail could not be normalized safely into a trusted continuation path.
```

Reason-code selection:

1. use `BUBBLE_ROUTE_NORMALIZATION_REQUIRED` when a linked implementation bubble exists but safe normalization still requires missing intermediate interpretation
2. use `NO_TRUSTWORTHY_ROUTE` when no narrower anchored code explains the fail-closed stop

## Guardrails

1. Do not infer lifecycle truth from task metadata alone.
2. Do not infer document completion from implementation-bubble absence.
3. Do not delegate close unless the approval path is already satisfied explicitly.
4. Do not emit normalized replanning merely because additional metadata would be nice; prove the blocker first.
5. Do not let plan/task follow-through leak into this workflow. After `normalized_replanning`, Task 4 owns the next step.
