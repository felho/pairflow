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
4. accepting already-published task-admin carrier handoff state from
   `HandleTaskAdminBubble` after the same `<task_id>-doc` carrier was kicked
   off for document refinement
5. emitting normalized document-bubble outputs that `ResolvePlanState` can consume later without reinterpretation
6. stopping at the correct settled checkpoint or human checkpoint for the delegated action

This workflow does not own:

1. plan sequencing or active-task selection
2. task creation/review/splitting admin that belongs to `HandleTaskAdminBubble`
   and `CreatePairflowSpec`
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
11. `DERIVED_DOC_BUBBLE_ID`
   - canonical document bubble id derived mechanically as `<task_id>-doc` when `DOC_BUBBLE_ID` is absent
12. `DERIVED_DOC_BUBBLE_STATUS`
   - `pairflow bubble status --id <task_id>-doc --repo <repo-path> --json` before any create attempt
13. `PUBLISH_PRE_KICKOFF_ADMIN_RESULT`
   - structured result returned by `PublishPreKickoffAdmin` for the same derived document bubble before kickoff
14. `REFRESHED_MAIN_TASK_METADATA`
   - active task metadata re-read from clean `main` after publish and before kickoff
15. `REFRESHED_IDEATION_HOLD_STATUS`
   - Pairflow status re-read after publish and before kickoff for the same derived document bubble

Input rules:

1. task metadata stores linkage only; it is not lifecycle authority
2. Pairflow remains the canonical lifecycle authority for the linked document bubble
3. `TOP_LEVEL_ROUTE_CONTEXT` narrows this workflow to the document-bubble branch only; it does not authorize plan/task routing here
4. this workflow may use `OPERATOR_HINT` only to choose among already-authorized troubleshooting or replanning branches; it must not invent new lifecycle meaning
5. this workflow must preserve the merged Task 1 / Task 2 baseline as sufficient unless a concrete blocker proves otherwise
6. create/start recovery identity for new document bubbles is only the canonical `DERIVED_DOC_BUBBLE_ID`; do not add a separate recovery key, fallback id, or Pairflow query surface
7. kickoff decisions in the create branch may consume only `PUBLISH_PRE_KICKOFF_ADMIN_RESULT`, `REFRESHED_MAIN_TASK_METADATA`, and `REFRESHED_IDEATION_HOLD_STATUS`

## Entry Conditions

Run this workflow only when the active task has entered the document-bubble route family:

1. the task is approved and no document bubble linkage exists yet
2. a persisted `doc_bubble_id` exists
3. an explicit operator hint refers to an already-linked document bubble that needs troubleshooting or bubble-origin replanning review
4. `HandleTaskAdminBubble` has already published `doc_bubble_id=<task_id>-doc`
   and kicked off the same carrier, and this workflow is reading the linked
   document-bubble lifecycle on a later pass

If the task is not approved and there is no persisted `doc_bubble_id`, do not start document-bubble handling here. Route back to top-level task planning/review instead.

Status model:

1. `doc_bubble_id` is linkage only and, for fresh document create, must be
   published to `main` through the pre-kickoff admin path before kickoff.
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
reason_code: <DOC_BUBBLE_CREATE_REQUIRED|OPERATOR_TROUBLESHOOT_HINT|PAIRFLOW_STATUS_UNAVAILABLE|PRE_KICKOFF_HOLD_NOT_PROVEN|DOC_BUBBLE_ADMIN_POSTCONDITION_MISSING|DOC_BUBBLE_KICKOFF_FAILED>
publish_checkpoint_reason_code: <imported-PublishPreKickoffAdmin-checkpoint-code|not_applicable>
delegated_use_pairflow_surface: <CreateBubble|TroubleshootBubble>
delegated_use_pairflow_actions:
  - <bubble_create_start|troubleshoot>
  - <bubble_kickoff|not_applicable>
metadata_postcondition: <doc_bubble_id_persisted|not_applicable>
publish_postcondition: <admin_publish_succeeded|not_applicable>
kickoff_postcondition: <same_bubble_kicked_off|not_applicable>
kickoff_result:
  delegated_use_pairflow_surface: <InterveneBubble|not_applicable>
  lifecycle_command: <pairflow bubble kickoff|not_applicable>
  bubble_id: <task_id>-doc
  task_payload_source: <task-path>
  result: <success|not_applicable>
handoff_boundary_note: <short note describing why the handler stops here>
```

Normalization note:

1. `ResolvePlanState` consumes only normalized continuation or replanning outputs from this workflow
2. create/start and troubleshooting results are terminal execution boundaries for the current pass and must remain handler-local action results rather than normalized continuation routes
3. create/start may return a settled boundary only after `metadata_postcondition=doc_bubble_id_persisted`, `publish_postcondition=admin_publish_succeeded`, `kickoff_postcondition=same_bubble_kicked_off`, and `kickoff_result.result=success`
4. when both create/start and kickoff occur in this create route, `delegated_use_pairflow_surface` remains the primary route owner for backward compatibility and `delegated_use_pairflow_actions` records the full audited lifecycle sequence

### Structured Local Boundary Report

When this workflow stops without emitting a normalized continuation route back into `ResolvePlanState`, it must still emit a structured local boundary report with this shape:

```yaml
boundary_status: <active_bubble_hold|human_checkpoint>
continuation_mode: <stop_at_settled_checkpoint|stop_at_human_checkpoint>
source_owner: bubble_routing_layer
scope: document
boundary_reason: <bubble_still_running|preconditions_not_met|normalization_unsafe|admin_publish_failed|admin_postcondition_missing|kickoff_failed>
escalation_reason_code: <optional-anchored-human-checkpoint-code>
handoff_boundary_note: <short note describing why the pass stops here>
```

Boundary rules:

1. use `boundary_status=active_bubble_hold` when the linked document bubble is still running and no higher boundary has been reached yet
2. use `boundary_status=human_checkpoint` when the branch fails closed and trustworthy automatic routing is unavailable
3. this report is for local pass reporting only; it is not a normalized continuation route for `ResolvePlanState`
4. `boundary_status=human_checkpoint` must hand control back upward as a top-level `HumanCheckpoint` stop rather than as a synthetic bubble route
5. `escalation_reason_code` is optional and should be present only when the handler is handing an already-anchored human-checkpoint reason back upward
6. allowed `escalation_reason_code` values in this workflow are exactly `BUBBLE_ROUTE_NORMALIZATION_REQUIRED`, `NO_TRUSTWORTHY_ROUTE`, `PRE_KICKOFF_HOLD_NOT_PROVEN`, `DOC_BUBBLE_ADMIN_POSTCONDITION_MISSING`, `DOC_BUBBLE_KICKOFF_FAILED`, or one of the imported `PublishPreKickoffAdmin` checkpoint reason codes listed in the reason-code anchor set
7. use `boundary_reason=admin_publish_failed` when `PublishPreKickoffAdmin` returns a checkpoint or malformed success before kickoff
8. use `boundary_reason=admin_postcondition_missing` when publish succeeded but refreshed handler-side `main` metadata is missing or mismatched
9. use `boundary_reason=preconditions_not_met` when the post-publish Pairflow hold recheck fails before kickoff
10. use `boundary_reason=kickoff_failed` when all publish and refreshed postconditions passed but same-bubble kickoff failed

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
10. `PRE_KICKOFF_HOLD_NOT_PROVEN`
11. `DOC_BUBBLE_ADMIN_POSTCONDITION_MISSING`
12. `DOC_BUBBLE_KICKOFF_FAILED`

Imported `PublishPreKickoffAdmin` checkpoint codes must be retained in
`publish_checkpoint_reason_code` on the handler-local action result and in
`escalation_reason_code` on the structured local boundary report when this
workflow is reporting that workflow's checkpoint without reinterpretation.
Do not copy imported publish checkpoint codes into the primary `reason_code`;
use `reason_code=DOC_BUBBLE_CREATE_REQUIRED` for the create branch plus
`boundary_reason=admin_publish_failed`.

1. `MAIN_NOT_CLEAN`
2. `MAIN_BASE_REF_CHANGED`
3. `ADMIN_AUTHORIZATION_MISSING`
4. `ADMIN_SCOPE_INVALID`
5. `OUT_OF_SCOPE_BUBBLE_CHANGES`
6. `ADMIN_COMMIT_FAILED`
7. `ADMIN_PUBLISH_FAILED`
8. `ADMIN_POSTCONDITION_MISSING`
9. `PRE_KICKOFF_HOLD_NOT_PROVEN`

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
publish_checkpoint_reason_code: not_applicable
delegated_use_pairflow_surface: TroubleshootBubble
delegated_use_pairflow_actions:
  - troubleshoot
  - not_applicable
metadata_postcondition: not_applicable
publish_postcondition: not_applicable
kickoff_postcondition: not_applicable
kickoff_result:
  delegated_use_pairflow_surface: not_applicable
  lifecycle_command: not_applicable
  bubble_id: not_applicable
  task_payload_source: not_applicable
  result: not_applicable
handoff_boundary_note: Troubleshoot the linked document bubble only; do not continue normal orchestration from the same raw lifecycle read.
```

Reason-code selection:

1. use `OPERATOR_TROUBLESHOOT_HINT` when the operator explicitly asked for troubleshooting
2. use `PAIRFLOW_STATUS_UNAVAILABLE` when the runtime/lifecycle issue is confirmed by the failed status read

### 3. Create the document bubble

Choose create when:

1. the active task is approved
2. `doc_bubble_id=null`

Document-route pre-kickoff admin contract:

1. `CreateDocumentBubble` uses the pre-kickoff admin pattern for the legacy
   approved-task-without-linkage route. New task-create/task-review admin uses
   `HandleTaskAdminBubble` first and reaches this workflow only after the same
   `<task_id>-doc` carrier was published and kicked off.
2. create or reuse only the canonical derived bubble id `<task_id>-doc`
3. create/start must produce an ideation carrier that remains in `RUNNING`
   round `0` with `ideation.task_pending=true` before any admin publish or
   kickoff decision
4. kickoff must wait until bounded admin scope, commit identity,
   publish-to-`main`, refreshed task metadata, and refreshed hold evidence are
   proven by `PublishPreKickoffAdmin` success
5. failed, partial, malformed, or ambiguous admin publish must stop before
   kickoff rather than falling back to unmerged worktree state, transcript
   prose, stale task metadata, or operator memory
6. admin scope remains limited to plan/task/progress metadata and directly
   related docs/admin notes; repo-local `ExecutePairflowPlan` skill/workflow
   documentation is allowed only when the selected admin task itself changes
   that orchestration contract; product/source implementation and `UsePairflow`
   edits remain forbidden

Delegation:

1. derive the intended document bubble id mechanically as `<task_id>-doc` from
   the current task metadata contract; do not invent an alternate id and do not
   add a separate recovery-key abstraction
2. before create, read `pairflow bubble status --id <task_id>-doc`; if an
   existing bubble with that id is in the expected document create carrier
   state, reuse that bubble instead of creating a second one
3. if no bubble exists with the derived id, delegate create/start through
   `UsePairflow` `CreateBubble` using exactly that derived id, `--ideation`,
   and document review artifact type
4. if create fails because the derived id already exists, re-read status for the
   same id; reuse only when the state is the expected document create carrier
   state, otherwise stop at a human checkpoint
5. if a bubble exists with the derived id but is not in a safe reusable state,
   stop at a human checkpoint; never create the same task's document bubble under
   a different id
6. before editing the task artifact in the bubble worktree, invoke
   `PublishPreKickoffAdmin` as the backing manual workflow through its
   pre-side-effect authorization gate, with selected admin paths that include
   the active task artifact and any directly required document-route workflow
   metadata
7. only after that authorization record exists, persist the derived/created
   bubble id into task metadata as `doc_bubble_id` in the bubble worktree admin
   change set, preserving `status=approved`
8. continue the same `PublishPreKickoffAdmin` workflow to stage, commit, publish,
   and verify the selected admin paths
9. require `PublishPreKickoffAdmin` to return `publish_result=success`,
   `bubble_id=<task_id>-doc`, `kickoff_allowed=true`, `admin_commit`,
   `published_main_ref`, selected admin paths, authorization evidence,
   refreshed postcondition evidence, and refreshed hold evidence
10. after publish success, re-read the active task metadata from `main` and prove
   `doc_bubble_id=<task_id>-doc` while `status=approved` remains unchanged
11. re-read Pairflow status for the same derived id and prove the ideation
   round-0 hold still exists before kickoff
12. delegate kickoff of the same bubble through `UsePairflow` `InterveneBubble`,
   which owns `pairflow bubble kickoff` for `RUNNING` round-0 ideation holds,
   and pass a document-refinement payload only after the publish and refreshed
   postcondition proof is present
   - the payload must explicitly say `review_artifact_type=document`
   - allowed edits are the active task/spec/plan/progress/docs artifacts needed
     to refine the document contract
   - product/runtime/source implementation edits are forbidden, even when the
     task body contains L2 implementation notes, target source files, or test
     commands for a later implementation bubble
   - if the document agent concludes the requested outcome cannot be completed
     without code changes, it must emit a blocker or normalized replanning
     request instead of editing source
13. capture the kickoff result in `kickoff_result` with the delegated surface,
   bubble id, task payload source, and success status
14. preserve the document-bubble quality model and stop after the same-bubble
   kickoff boundary

Safe reusable state:

1. the status bubble id must equal the derived id exactly
2. the observed state must be route-compatible with the document create branch
   being executed
3. when the pre-kickoff admin pattern is adopted for this document route, the
   reusable state is specifically `RUNNING` round `0` with
   `ideation.task_pending=true`
4. a completed, cancelled, approval-ready, wrong-artifact-type, wrong-task, or
   otherwise ambiguous bubble with the derived id is not reusable and must stop
   the route instead of triggering alternate id creation

Output:

```yaml
action_surface: CreateDocumentBubble
continuation_mode: stop_at_settled_checkpoint
source_owner: bubble_routing_layer
scope: document
reason_code: DOC_BUBBLE_CREATE_REQUIRED
publish_checkpoint_reason_code: not_applicable
delegated_use_pairflow_surface: CreateBubble
delegated_use_pairflow_actions:
  - bubble_create_start
  - bubble_kickoff
metadata_postcondition: doc_bubble_id_persisted
publish_postcondition: admin_publish_succeeded
kickoff_postcondition: same_bubble_kicked_off
publish_proof:
  workflow: PublishPreKickoffAdmin
  publish_result: success
  bubble_id: <task_id>-doc
  admin_commit: <admin-commit-id>
  published_main_ref: <refreshed-main-ref>
  selected_admin_paths:
    - <selected-admin-path>
  postcondition_evidence:
    doc_bubble_id: <task_id>-doc
    task_status: approved
  refreshed_hold_evidence: <post-publish-round-0-hold-summary>
kickoff_result:
  delegated_use_pairflow_surface: InterveneBubble
  lifecycle_command: pairflow bubble kickoff
  bubble_id: <task_id>-doc
  task_payload_source: <task-path>
  result: success
handoff_boundary_note: Start or reuse the ideation document bubble through UsePairflow, publish bounded admin to main through PublishPreKickoffAdmin, kickoff the same bubble only after refreshed proof, and stop at the settled kicked-off boundary.
```

Fail-closed rule:

1. if create/start succeeds but task metadata cannot be updated with `doc_bubble_id`, the handler must not report a settled create boundary
2. if the derived id is over-budget, invalid, already bound to an unsafe state,
   or cannot be checked with Pairflow status, return a human checkpoint rather
   than creating an alternate id
3. if the created or reused bubble cannot be proven to be `RUNNING` round `0`
   with `ideation.task_pending=true`, return a human checkpoint with
   `PRE_KICKOFF_HOLD_NOT_PROVEN` before publish or kickoff
4. if `PublishPreKickoffAdmin` returns any checkpoint, malformed success, wrong
   bubble id, missing publish proof, or `kickoff_allowed=false`, return a human
   checkpoint before kickoff with `boundary_reason=admin_publish_failed` and
   retain its reason code in `publish_checkpoint_reason_code` plus
   `escalation_reason_code`; do not copy the imported publish code into the
   primary `reason_code`
5. if refreshed `main` task metadata does not prove `doc_bubble_id=<task_id>-doc`
   and `status=approved`, return a human checkpoint with
   `DOC_BUBBLE_ADMIN_POSTCONDITION_MISSING` and
   `boundary_reason=admin_postcondition_missing` before kickoff
6. if refreshed Pairflow status after publish no longer proves the same
   round-0 ideation hold, return a human checkpoint with
   `PRE_KICKOFF_HOLD_NOT_PROVEN` and
   `boundary_reason=preconditions_not_met` before kickoff; do not classify
   lifecycle hold failure as an admin postcondition mismatch
7. if kickoff fails or targets any bubble other than `<task_id>-doc`, return a
   human checkpoint with `DOC_BUBBLE_KICKOFF_FAILED` and
   `boundary_reason=kickoff_failed`; do not report a settled create boundary
8. return a human checkpoint or troubleshooting result that names the missing linkage persistence, unsafe canonical-id state, publish failure, missing refreshed postcondition, or failed kickoff as the blocker

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

1. delegate approve, document-close pre-commit admin, commit, merge, and cleanup
   through `UsePairflow` `CloseBubble`
2. require `UsePairflow` `CloseBubble` to apply the required
   `status=implementable` task/plan metadata postcondition in the bubble
   worktree after approval but before `pairflow bubble commit --stage-all`
3. require the returned close result to prove finalized bubble artifact deletion,
   or to provide an explicit retained-bubble reason that prevents reporting a
   settled close
4. after successful close/merge cleanup, re-read refreshed `main` metadata and
   prove `status=implementable`; do not create a direct post-merge `main` admin
   commit to repair missing close metadata
5. preserve the existing `doc_bubble_id` as historical linkage; do not clear it

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
metadata_commit_timing: pre_lifecycle_commit_in_bubble_worktree
cleanup_postcondition: <bubble_deleted|retained_with_reason>
auto_approval_proof:
  required_clean_runs: <reviewPolicy.meta_review_consecutive_clean_runs_required>
  observed_clean_runs: <metaReview.consecutiveCleanRuns>
handoff_boundary_note: Auto-approve through UsePairflow CloseBubble because Pairflow already satisfied the configured multi-clean-meta-review gate; persist status=implementable inside the bubble before lifecycle commit, verify it on main after merge, and then allow fresh route selection.
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

1. delegate document-close pre-commit admin, commit, merge, and cleanup through
   `UsePairflow` `CloseBubble`
2. require `UsePairflow` `CloseBubble` to apply the required
   `status=implementable` task/plan metadata postcondition in the bubble
   worktree before `pairflow bubble commit --stage-all`
3. require the returned close result to prove finalized bubble artifact deletion, or to provide an explicit retained-bubble reason that prevents reporting a settled close
4. after successful close/merge cleanup, re-read refreshed `main` metadata and
   prove `status=implementable`; do not create a direct post-merge `main` admin
   commit to repair missing close metadata
5. preserve the existing `doc_bubble_id` as historical linkage; do not clear it

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
metadata_commit_timing: pre_lifecycle_commit_in_bubble_worktree
cleanup_postcondition: <bubble_deleted|retained_with_reason>
handoff_boundary_note: Close the approved document bubble, persist status=implementable inside the bubble before lifecycle commit, verify it on main after merge, and then allow fresh route selection.
```

Fail-closed rule:

1. if `UsePairflow` `CloseBubble` cannot persist `status=implementable` in the
   bubble worktree before lifecycle commit, the handler must stop before merge
   rather than relying on a direct `main` repair commit
2. if close/merge succeeds but refreshed `main` task metadata does not prove
   `status=implementable`, the handler must not emit an auto-continuable close
   result
3. if close/merge succeeds but the finalized bubble artifact remains present without an explicit retained-bubble reason, the handler must not emit an auto-continuable close result
4. later implementation-bubble routing must never infer document completion from `doc_bubble_id`, deleted bubble artifacts, or prose-only memory

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
