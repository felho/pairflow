---
description: Route document-bubble lifecycle for ExecutePairflowPlan from task linkage and Pairflow truth into UsePairflow delegation and normalized bubble outputs
argument-hint: <task-path>
allowed-tools: Read, Bash
---

# Handle Document Bubble

## Purpose

Own the document-bubble routing layer for `ExecutePairflowPlan`.

This workflow owns only:

1. reading document-bubble linkage from task metadata
2. reading raw Pairflow lifecycle truth for the linked document bubble when one exists
3. delegating document-bubble create, review, close, or troubleshooting work through `UsePairflow`
4. emitting normalized document-bubble outputs that `ResolvePlanState` can consume later without reinterpretation
5. stopping at the correct settled checkpoint or human checkpoint for the delegated action

This workflow does not own:

1. plan sequencing or active-task selection
2. plan/task artifact refinement that belongs to `CreatePairflowSpec`
3. plan/task follow-through after normalized replanning
4. progress/archive aftermath
5. remote execution support
6. metadata-contract expansion beyond the merged Task 1 / Task 2 baseline

## Route-Surface Role

This repo-local workflow is the backing owner behind the stable route surfaces:

1. `CreateDocumentBubble`
2. `ReviewDocumentBubble`
3. `CloseDocumentBubble`
4. document-scope `TroubleshootBubble`
5. bubble-origin `normalized_replanning` with `source_scope=document_bubble`

The surface names above stay stable for the top-level orchestrator. This workflow owns the raw Pairflow read-path and the delegation into `UsePairflow`.

## Inputs

Read only the minimum authoritative inputs needed for the document-bubble decision:

1. `REPO_PATH`
   - canonical repo root used for `pairflow bubble status --repo <repo-path> --json`
2. `TASK_PATH`
   - active task artifact
3. `TASK_METADATA`
   - task frontmatter from `TASK_PATH`
4. `DOC_BUBBLE_ID`
   - `task_metadata.doc_bubble_id`
5. `TOP_LEVEL_ROUTE_CONTEXT`
   - the current orchestrator route family for this pass, limited here to the document-bubble branch
6. `OPERATOR_HINT`
   - optional explicit hint such as "bubble stuck", "too broad", or "route back to plan"
7. `USE_PAIRFLOW_CONTRACT`
   - `.claude/skills/UsePairflow/SKILL.md`
8. `RESOLVE_PLAN_STATE_CONTRACT`
   - `Workflows/ResolvePlanState.md`
9. `METADATA_AUTHORITY_CONTRACT`
   - `references/Plan-Task-Metadata-Contract.md`
10. `PAIRFLOW_STATUS`
   - `pairflow bubble status --id <doc_bubble_id> --repo <repo-path> --json` when `DOC_BUBBLE_ID` is present

Input rules:

1. task metadata stores linkage only; it is not lifecycle authority
2. Pairflow remains the canonical lifecycle authority for the linked document bubble
3. `TOP_LEVEL_ROUTE_CONTEXT` narrows this workflow to the document-bubble branch only; it does not authorize plan/task routing here
4. this workflow may use `OPERATOR_HINT` only to choose among already-authorized troubleshooting or replanning branches; it must not invent new lifecycle meaning
5. this workflow must preserve the merged Task 1 / Task 2 baseline as sufficient unless a concrete blocker proves otherwise

## Entry Conditions

Run this workflow only when the active task has entered the document-bubble route family:

1. the task is approved and no document bubble linkage exists yet
2. a persisted `doc_bubble_id` exists
3. an explicit operator hint refers to an already-linked document bubble that needs troubleshooting or bubble-origin replanning review

If the task is not approved and there is no persisted `doc_bubble_id`, do not start document-bubble handling here. Route back to top-level task planning/review instead.

Status model:

1. `doc_bubble_id` is linkage only and must be persisted as soon as create/start succeeds.
2. `doc_bubble_id` never proves document-refinement completion.
3. `status=approved` means the task is eligible for document-bubble routing.
4. `status=implementable` is the durable task-local proof that document refinement was approved, closed, and merged; it is written only by the document close path.

## Output Contracts

Return one primary result shape from sections `A` or `B` below.

When the handler stops without emitting a normalized continuation route, it may additionally emit the structured local boundary report defined later in this workflow.

### A. Normalized continuation or replanning route

Use this shape only when the handler is emitting a value that `ResolvePlanState` may later consume as `NORMALIZED_BUBBLE_ROUTE`:

```yaml
route_class: <document_bubble_review|document_bubble_close|normalized_replanning>
target_workflow_surface: <ReviewDocumentBubble|CloseDocumentBubble|HandleNormalizedReplan>
continuation_mode: <auto_continue|stop_at_human_checkpoint>
source_owner: bubble_routing_layer
scope: <document|replanning>
source_scope: <not_applicable|document_bubble>
approval_gate_state: <not_applicable|review_required|already_satisfied>
reason_code: <stable-reason-code>
delegated_use_pairflow_surface: <ReviewBubble|CloseBubble|none>
handoff_boundary_note: <short note describing the next owner and what remains out of scope>
```

Field rules:

1. `scope=document` for review and close outputs
2. `scope=replanning` only for `route_class=normalized_replanning`
3. `source_scope=document_bubble` only for bubble-origin replanning
4. `source_scope=not_applicable` for review and close outputs
5. `approval_gate_state=review_required` only for `document_bubble_review`
6. `approval_gate_state=already_satisfied` only for `document_bubble_close`
7. `approval_gate_state=not_applicable` for normalized replanning
8. `delegated_use_pairflow_surface=none` is valid only for normalized replanning, because replanning is an emitted handoff rather than a direct `UsePairflow` lifecycle action
9. `continuation_mode` must mirror the stable route policy already owned by `ResolvePlanState`; this workflow reports the value for the delegated result, but does not redefine the policy
10. additional handler-local fields may appear, but `ResolvePlanState` must ignore them unless they belong to the accepted normalized taxonomy

### B. Handler-local action result

Use this shape for create/start and troubleshooting actions that stop within the handler layer and are not fed back into `ResolvePlanState` as `NORMALIZED_BUBBLE_ROUTE`:

```yaml
action_surface: <CreateDocumentBubble|TroubleshootBubble>
continuation_mode: <stop_at_settled_checkpoint|stop_at_human_checkpoint>
source_owner: bubble_routing_layer
scope: document
reason_code: <DOC_BUBBLE_CREATE_REQUIRED|OPERATOR_TROUBLESHOOT_HINT|PAIRFLOW_STATUS_UNAVAILABLE>
delegated_use_pairflow_surface: <CreateBubble|TroubleshootBubble>
metadata_postcondition: <doc_bubble_id_persisted|not_applicable>
handoff_boundary_note: <short note describing why the handler stops here>
```

Normalization note:

1. `ResolvePlanState` consumes only normalized continuation or replanning outputs from this workflow
2. create/start and troubleshooting results are terminal execution boundaries for the current pass and must remain handler-local action results rather than normalized continuation routes
3. create/start may return a settled boundary only after `metadata_postcondition=doc_bubble_id_persisted`

### Structured Local Boundary Report

When this workflow stops without emitting a normalized continuation route back into `ResolvePlanState`, it must still emit a structured local boundary report with this shape:

```yaml
boundary_status: <active_bubble_hold|human_checkpoint>
continuation_mode: <stop_at_settled_checkpoint|stop_at_human_checkpoint>
source_owner: bubble_routing_layer
scope: document
boundary_reason: <bubble_still_running|preconditions_not_met|normalization_unsafe>
escalation_reason_code: <optional-anchored-human-checkpoint-code>
handoff_boundary_note: <short note describing why the pass stops here>
```

Boundary rules:

1. use `boundary_status=active_bubble_hold` when the linked document bubble is still running and no higher boundary has been reached yet
2. use `boundary_status=human_checkpoint` when the branch fails closed and trustworthy automatic routing is unavailable
3. this report is for local pass reporting only; it is not a normalized continuation route for `ResolvePlanState`
4. `boundary_status=human_checkpoint` must hand control back upward as a top-level `HumanCheckpoint` stop rather than as a synthetic bubble route
5. `escalation_reason_code` is optional and should be present only when the handler is handing an already-anchored human-checkpoint reason back upward
6. allowed `escalation_reason_code` values in this workflow are exactly `BUBBLE_ROUTE_NORMALIZATION_REQUIRED` or `NO_TRUSTWORTHY_ROUTE`

### Auto-approval Gate Proof

When `PAIRFLOW_STATUS.state` is `READY_FOR_HUMAN_APPROVAL` or legacy
`READY_FOR_APPROVAL`, the handler may treat the separate approval/review path as
already satisfied only when Pairflow status proves all of the following:

1. `reviewPolicy.meta_review_consecutive_clean_runs_required > 1`
2. `metaReview.consecutiveCleanRuns >= reviewPolicy.meta_review_consecutive_clean_runs_required`
3. no `failing_gates` are present
4. the status still has an approval request at the human gate rather than an
   active reviewer/implementer handoff

This proof means Pairflow has already run the configured extra clean
meta-review rounds that replaced the manual extra review pass. If any required
field is absent, malformed, or below threshold, route to `document_bubble_review`
instead of auto-approving.

The actual lifecycle approval must still be delegated through `UsePairflow`
`CloseBubble`, which runs `pairflow bubble approve` before commit/merge. The
handler emits only the normalized close route; it must not inline approval.

### Reason-Code Anchor Set

This workflow may emit only the already-anchored document-scope reason codes:

1. `DOC_BUBBLE_CREATE_REQUIRED`
2. `DOC_BUBBLE_REVIEW_REQUIRED`
3. `DOC_BUBBLE_CLOSE_REQUIRED`
4. `DOC_BUBBLE_AUTO_APPROVAL_CLOSE_REQUIRED`
5. `BUBBLE_NORMALIZED_REPLAN_REQUIRED`
6. `BUBBLE_ROUTE_NORMALIZATION_REQUIRED`
7. `PAIRFLOW_STATUS_UNAVAILABLE`
8. `OPERATOR_TROUBLESHOOT_HINT`
9. `NO_TRUSTWORTHY_ROUTE`

## Decision Order

Apply the first matching rule in this order.

### 1. Baseline and linkage guards

Fail closed before reading lifecycle truth when any of the following is true and Rule 2 does not already match for a linked document bubble:

1. the task lacks trustworthy metadata required by the merged Task 1 contract
2. the task is not approved and `doc_bubble_id=null`
3. document-bubble routing would require inventing new metadata fields or hidden lifecycle state

Result:

1. stop and hand back a human checkpoint through the caller instead of widening the bubble contract locally

Boundary report:

```yaml
boundary_status: human_checkpoint
continuation_mode: stop_at_human_checkpoint
source_owner: bubble_routing_layer
scope: document
boundary_reason: preconditions_not_met
escalation_reason_code: <BUBBLE_ROUTE_NORMALIZATION_REQUIRED-or-NO_TRUSTWORTHY_ROUTE>
handoff_boundary_note: Stop and return control upward as a top-level human checkpoint because the document-bubble handler was entered without enough trustworthy preconditions.
```

Escalation selection:

1. use `BUBBLE_ROUTE_NORMALIZATION_REQUIRED` when a linked document bubble exists but continuation would require missing bubble-side normalization before safe route selection
2. use `NO_TRUSTWORTHY_ROUTE` when the handler was entered without enough trustworthy prerequisites and no narrower bubble-normalization reason applies

### 2. Explicit troubleshooting path

Choose troubleshooting when:

1. `OPERATOR_HINT` explicitly asks for document-bubble troubleshooting such as "bubble stuck"
2. or `PAIRFLOW_STATUS` cannot be read cleanly and the situation is explicitly a runtime/lifecycle problem rather than a routing ambiguity

Delegation:

1. delegate to `UsePairflow` troubleshooting surface

Output:

```yaml
action_surface: TroubleshootBubble
continuation_mode: stop_at_human_checkpoint
source_owner: bubble_routing_layer
scope: document
reason_code: <OPERATOR_TROUBLESHOOT_HINT-or-PAIRFLOW_STATUS_UNAVAILABLE>
delegated_use_pairflow_surface: TroubleshootBubble
handoff_boundary_note: Troubleshoot the linked document bubble only; do not continue normal orchestration from the same raw lifecycle read.
```

Reason-code selection:

1. use `OPERATOR_TROUBLESHOOT_HINT` when the operator explicitly asked for troubleshooting
2. use `PAIRFLOW_STATUS_UNAVAILABLE` when the runtime/lifecycle issue is confirmed by the failed status read

### 3. Create the document bubble

Choose create when:

1. the active task is approved
2. `doc_bubble_id=null`

Future pre-kickoff admin note:

1. the current create route remains valid after this task and does not require
   pre-kickoff admin publish
2. a successor `ExecutePairflowPlan` route-integration task may choose to back
   this document-bubble create route with the optional ideation round-0 admin
   container pattern and the manual `PublishPreKickoffAdmin` proof workflow
3. when that future route is adopted, kickoff must wait until bounded admin
   scope, commit identity, publish-to-`main`, and refreshed metadata or selected
   artifact-content postconditions are proven
4. failed, partial, or ambiguous admin publish must stop before kickoff rather
   than falling back to unmerged worktree state, transcript prose, or operator
   memory
5. admin scope remains limited to plan/task/progress metadata and directly
   related docs/admin notes; repo-local `ExecutePairflowPlan` skill/workflow
   documentation is allowed only when the selected admin task itself changes
   that orchestration contract; product/source implementation and `UsePairflow`
   edits remain forbidden

Delegation:

1. delegate create/start through `UsePairflow` `CreateBubble`
2. persist the created bubble id into task metadata as `doc_bubble_id`
3. preserve `status=approved`; the created id is linkage only and does not prove refinement completion
4. preserve the document-bubble quality model and stop after the bubble-started boundary

Output:

```yaml
action_surface: CreateDocumentBubble
continuation_mode: stop_at_settled_checkpoint
source_owner: bubble_routing_layer
scope: document
reason_code: DOC_BUBBLE_CREATE_REQUIRED
delegated_use_pairflow_surface: CreateBubble
metadata_postcondition: doc_bubble_id_persisted
handoff_boundary_note: Start the document-refinement bubble through UsePairflow, persist doc_bubble_id, and stop at the settled bubble-started boundary.
```

Fail-closed rule:

1. if create/start succeeds but task metadata cannot be updated with `doc_bubble_id`, the handler must not report a settled create boundary
2. return a human checkpoint or troubleshooting result that names the missing linkage persistence as the blocker

### 4. Read the linked bubble and classify only document-owned routes

When `doc_bubble_id` exists:

1. read `PAIRFLOW_STATUS`
2. use Pairflow lifecycle truth only for document-bubble review, close, troubleshooting, or fail-closed classification
3. do not turn this workflow into a generic plan/task router

### 5. Auto-approval close path

Choose close when Pairflow truth shows the linked document bubble reached the
explicit approval gate and the auto-approval gate proof above is satisfied.

Authoritative trigger anchors:

1. `READY_FOR_HUMAN_APPROVAL`
2. legacy-compatible `READY_FOR_APPROVAL`

Required proof:

1. `reviewPolicy.meta_review_consecutive_clean_runs_required > 1`
2. `metaReview.consecutiveCleanRuns >= reviewPolicy.meta_review_consecutive_clean_runs_required`
3. `failing_gates` is absent or empty
4. there is no active handoff in `executionContext`

Delegation:

1. delegate approve/commit/merge/cleanup through `UsePairflow` `CloseBubble`
2. require the returned close result to prove finalized bubble artifact deletion,
   or to provide an explicit retained-bubble reason that prevents reporting a
   settled close
3. after successful close/merge cleanup, update task metadata to
   `status=implementable`
4. preserve the existing `doc_bubble_id` as historical linkage; do not clear it

Output:

```yaml
route_class: document_bubble_close
target_workflow_surface: CloseDocumentBubble
continuation_mode: auto_continue
source_owner: bubble_routing_layer
scope: document
source_scope: not_applicable
approval_gate_state: already_satisfied
reason_code: DOC_BUBBLE_AUTO_APPROVAL_CLOSE_REQUIRED
delegated_use_pairflow_surface: CloseBubble
metadata_postcondition: task_status_implementable
cleanup_postcondition: <bubble_deleted|retained_with_reason>
auto_approval_proof:
  required_clean_runs: <reviewPolicy.meta_review_consecutive_clean_runs_required>
  observed_clean_runs: <metaReview.consecutiveCleanRuns>
handoff_boundary_note: Auto-approve through UsePairflow CloseBubble because Pairflow already satisfied the configured multi-clean-meta-review gate; persist status=implementable and then allow fresh route selection.
```

### 6. Review-gate path

Choose review when Pairflow truth shows the linked document bubble reached its explicit approval-review gate.

Authoritative trigger anchors:

1. `READY_FOR_HUMAN_APPROVAL`
2. legacy-compatible `READY_FOR_APPROVAL`

Delegation:

1. delegate deep review through `UsePairflow` `ReviewBubble`

Output:

```yaml
route_class: document_bubble_review
target_workflow_surface: ReviewDocumentBubble
continuation_mode: stop_at_human_checkpoint
source_owner: bubble_routing_layer
scope: document
source_scope: not_applicable
approval_gate_state: review_required
reason_code: DOC_BUBBLE_REVIEW_REQUIRED
delegated_use_pairflow_surface: ReviewBubble
handoff_boundary_note: Run deep review at the document-bubble approval gate and stop for human approve/rework judgment.
```

### 7. Close path

Choose close only when the bubble-side route contract proves both of the following:

1. the linked document bubble is close-ready
2. the separate approval/review path is already satisfied

Authoritative trigger anchors:

1. Pairflow state is `APPROVED_FOR_COMMIT`
2. or the linked bubble is at `DONE` and the current context already carries a trusted structured approval-proof producer such as a clean `UsePairflow` `ReviewBubble` result followed by an explicit human approval outcome recorded in authoritative workflow context rather than prose-only notes
3. or Rule 5 produced a trusted multi-clean-meta-review auto-approval proof while the linked bubble was at `READY_FOR_HUMAN_APPROVAL` or legacy `READY_FOR_APPROVAL`

Delegation:

1. delegate close/merge/cleanup through `UsePairflow` `CloseBubble`
2. require the returned close result to prove finalized bubble artifact deletion, or to provide an explicit retained-bubble reason that prevents reporting a settled close
3. after successful close/merge cleanup, update task metadata to `status=implementable`
3. preserve the existing `doc_bubble_id` as historical linkage; do not clear it

Output:

```yaml
route_class: document_bubble_close
target_workflow_surface: CloseDocumentBubble
continuation_mode: auto_continue
source_owner: bubble_routing_layer
scope: document
source_scope: not_applicable
approval_gate_state: already_satisfied
reason_code: DOC_BUBBLE_CLOSE_REQUIRED
delegated_use_pairflow_surface: CloseBubble
metadata_postcondition: task_status_implementable
cleanup_postcondition: <bubble_deleted|retained_with_reason>
handoff_boundary_note: Close the approved document bubble, persist status=implementable, and then allow fresh route selection.
```

Fail-closed rule:

1. if close/merge succeeds but task metadata cannot be updated to `status=implementable`, the handler must not emit an auto-continuable close result
2. if close/merge succeeds but the finalized bubble artifact remains present without an explicit retained-bubble reason, the handler must not emit an auto-continuable close result
3. later implementation-bubble routing must never infer document completion from `doc_bubble_id`, deleted bubble artifacts, or prose-only memory

### 8. Normalized replanning path

Choose normalized replanning only when the bubble-side route contract proves that continuation should hand back upward instead of continuing the current document-bubble path.

Acceptable proof:

1. deep review or bubble-side findings explicitly show the task/document slice is too broad, structurally wrong, or otherwise requires plan/task-level follow-through
2. the proof is already normalized at the bubble layer rather than left as raw Pairflow detail or generic unease

Forbidden proof:

1. bubble absence
2. raw Pairflow state by itself
3. generic runtime trouble that belongs to troubleshooting instead

Output:

```yaml
route_class: normalized_replanning
target_workflow_surface: HandleNormalizedReplan
continuation_mode: auto_continue
source_owner: bubble_routing_layer
scope: replanning
source_scope: document_bubble
approval_gate_state: not_applicable
reason_code: BUBBLE_NORMALIZED_REPLAN_REQUIRED
delegated_use_pairflow_surface: none
handoff_boundary_note: Hand a normalized document-bubble replanning signal back upward; plan/task follow-through remains out of scope here.
```

Conduit rule:

1. bubble-origin normalized replanning from this workflow must be emitted through the `NORMALIZED_BUBBLE_ROUTE` slot
2. this workflow must not also populate `NORMALIZED_REPLANNING_SIGNAL` for the same routing decision

### 8. Active bubble with no higher boundary yet

If the linked document bubble is still actively running and none of the review, close, replanning, or troubleshooting conditions apply:

1. stop at the current settled checkpoint
2. do not mint a second normalized continuation route
3. do not infer completion, approval, or replanning from a merely active lifecycle state

Boundary report:

```yaml
boundary_status: active_bubble_hold
continuation_mode: stop_at_settled_checkpoint
source_owner: bubble_routing_layer
scope: document
boundary_reason: bubble_still_running
handoff_boundary_note: Hold at the active document-bubble checkpoint until a later review, close, troubleshooting, or normalized replanning boundary is reached; do not escalate this settled hold into ResolvePlanState.
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
scope: document
boundary_reason: normalization_unsafe
escalation_reason_code: <BUBBLE_ROUTE_NORMALIZATION_REQUIRED-or-NO_TRUSTWORTHY_ROUTE>
handoff_boundary_note: Stop because raw document-bubble lifecycle detail could not be normalized safely into a trusted continuation path.
```

Reason-code selection:

1. use `BUBBLE_ROUTE_NORMALIZATION_REQUIRED` when a linked document bubble exists but safe normalization still requires missing intermediate interpretation
2. use `NO_TRUSTWORTHY_ROUTE` when no narrower anchored code explains the fail-closed stop

## Guardrails

1. Do not infer lifecycle truth from task metadata alone.
2. Do not infer document completion from bubble absence.
3. Do not delegate close unless the approval path is already satisfied explicitly.
4. Do not emit normalized replanning merely because additional metadata would be nice; prove the blocker first.
5. Do not let plan/task follow-through leak into this workflow. After `normalized_replanning`, Task 4 owns the next step.
