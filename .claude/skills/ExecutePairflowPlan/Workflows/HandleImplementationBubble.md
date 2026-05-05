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
12. `DERIVED_IMPL_BUBBLE_ID`
   - canonical implementation bubble id derived mechanically as `<task_id>-impl` when `IMPL_BUBBLE_ID` is absent
13. `DERIVED_IMPL_BUBBLE_STATUS`
   - `pairflow bubble status --id <task_id>-impl --repo <repo-path> --json` before any create attempt
14. `PUBLISH_PRE_KICKOFF_ADMIN_RESULT`
   - structured result returned by `PublishPreKickoffAdmin` for the same derived implementation bubble before kickoff
15. `PUBLISH_PRE_KICKOFF_ADMIN_RECOVERY_CONTEXT`
   - retained recovery context from an authoritative route ledger entry or a
     prior handler-local boundary report for the same implementation route;
     transcript prose, operator memory, or inferred state is not valid input.
     The context is usable only to rerun `PublishPreKickoffAdmin` through its
     idempotent recovery path for either an already-published admin commit or a
     retained unpublished `ADMIN_COMMIT_CANDIDATE`; it never directly
     authorizes kickoff.
   - required fields: `bubble_id`, `admin_commit`, `published_main_ref` when
     already published, admin commit state
     `<published|unpublished_candidate|not_applicable>`, selected admin paths,
     authorization record reference, named postconditions, retained
     `PublishPreKickoffAdmin` checkpoint reason code when one exists, and
     retained checkpoint/postcondition evidence
16. `REFRESHED_MAIN_TASK_METADATA`
   - active task metadata re-read from clean `main` after publish and before kickoff
17. `REFRESHED_IDEATION_HOLD_STATUS`
   - Pairflow status re-read after publish and before kickoff for the same derived implementation bubble

Input rules:

1. task metadata stores linkage only; it is not lifecycle authority
2. Pairflow remains the canonical lifecycle authority for the linked implementation bubble
3. `TOP_LEVEL_ROUTE_CONTEXT` narrows this workflow to the implementation-bubble branch only; it does not authorize plan/task routing here
4. implementation-bubble creation requires `status=implementable`; `doc_bubble_id` and raw document-bubble lifecycle detail are not completion proof
5. this workflow may use `OPERATOR_HINT` only to choose among already-authorized troubleshooting or replanning branches; it must not invent new lifecycle meaning
6. create/start recovery identity for new implementation bubbles is only the canonical `DERIVED_IMPL_BUBBLE_ID`; do not add a separate recovery key, fallback id, or Pairflow query surface
7. kickoff decisions in the create branch may consume only
   `PUBLISH_PRE_KICKOFF_ADMIN_RESULT`, `REFRESHED_MAIN_TASK_METADATA`, and
   `REFRESHED_IDEATION_HOLD_STATUS`
8. `PUBLISH_PRE_KICKOFF_ADMIN_RECOVERY_CONTEXT` is not kickoff proof; it can
   only be passed back into `PublishPreKickoffAdmin`, which must revalidate the
   `admin_commit` or `ADMIN_COMMIT_CANDIDATE`, selected paths, refreshed `main`
   ref, named postconditions, and same-bubble hold before returning a fresh
   structured success result

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

1. fresh create entry: task metadata has `status=implementable` and
   `impl_bubble_id=null`
2. linked implementation lifecycle entry: a persisted `impl_bubble_id` exists
   for review, close, active-bubble hold, troubleshooting, or bubble-origin
   replanning review. This remains valid after create when task metadata is
   usually `status=in_progress`; lifecycle classification must come from
   Pairflow status, not from requiring `status=implementable` again.
3. pre-kickoff resume entry: task metadata has `status=in_progress`,
   `impl_bubble_id` equals the canonical derived id `<task_id>-impl`, and the
   route is checking whether a published pre-kickoff admin hold can be resumed
4. an explicit operator hint refers to an already-linked implementation bubble that needs troubleshooting or bubble-origin replanning review

If none of the fresh create, linked implementation lifecycle, pre-kickoff
resume, or explicit linked troubleshooting entries applies, do not start
implementation-bubble handling here. `status=implementable` is required for a
new create attempt, but an already-linked implementation bubble must be read
through Pairflow lifecycle truth even when the task status has advanced to
`in_progress`.

Status model:

1. `impl_bubble_id` is linkage only and, for fresh implementation create, must
   be published to `main` through the pre-kickoff admin path before kickoff.
2. `impl_bubble_id` never proves implementation completion.
3. `status=implementable` means the task is eligible for implementation-bubble
   routing.
4. `status=in_progress` is written only as bounded pre-kickoff admin for the
   same implementation route and must be refreshed from `main` before kickoff.

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
reason_code: <IMPL_BUBBLE_CREATE_REQUIRED|OPERATOR_TROUBLESHOOT_HINT|PAIRFLOW_STATUS_UNAVAILABLE|IMPL_BUBBLE_CANONICAL_ID_UNSAFE|IMPL_BUBBLE_PRE_KICKOFF_HOLD_MISSING|IMPL_BUBBLE_ADMIN_POSTCONDITION_MISSING|IMPL_BUBBLE_PUBLISH_PROOF_INVALID|IMPL_BUBBLE_KICKOFF_FAILED>
publish_checkpoint_reason_code: <imported-PublishPreKickoffAdmin-checkpoint-code|not_applicable>
delegated_use_pairflow_surface: <CreateBubble|InterveneBubble|TroubleshootBubble|none>
delegated_use_pairflow_actions:
  - <bubble_create_start|bubble_reuse|troubleshoot|not_applicable>
  - <bubble_kickoff|not_applicable>
create_start_mode: <created_new_carrier|reused_existing_carrier|not_applicable>
metadata_postcondition: <impl_bubble_id_persisted_and_status_in_progress|not_applicable>
publish_postcondition: <admin_publish_succeeded|not_applicable>
kickoff_postcondition: <same_bubble_kicked_off|not_applicable>
publish_proof:
  workflow: <PublishPreKickoffAdmin|not_applicable>
  publish_result: <success|not_applicable>
  bubble_id: <<task_id>-impl or not_applicable>
  admin_commit: <admin-commit-id|not_applicable>
  published_main_ref: <refreshed-main-ref|not_applicable>
  selected_admin_paths:
    - <selected-admin-path>
  postcondition_evidence:
    impl_bubble_id: <<task_id>-impl or not_applicable>
    task_status: <in_progress|not_applicable>
  refreshed_hold_evidence: <post-publish-round-0-hold-summary|not_applicable>
publish_recovery_context:
  bubble_id: <<task_id>-impl|not_applicable>
  admin_commit: <admin-commit-id|not_applicable>
  admin_commit_state: <published|unpublished_candidate|not_applicable>
  published_main_ref: <refreshed-main-ref|not_applicable>
  selected_admin_paths:
    - <selected-admin-path>
  authorization_record_ref: <authorization-record-ref|not_applicable>
  named_postconditions:
    - <named-postcondition>
  publish_checkpoint_reason_code: <imported-PublishPreKickoffAdmin-checkpoint-code|not_applicable>
  checkpoint_or_postcondition_evidence: <retained-evidence-summary|not_applicable>
kickoff_result:
  delegated_use_pairflow_surface: <InterveneBubble|not_applicable>
  lifecycle_command: <pairflow bubble kickoff|not_applicable>
  bubble_id: <<task_id>-impl|linked-impl-bubble-id|not_applicable>
  task_payload_source: <task-path|not_applicable>
  result: <success|not_applicable>
handoff_boundary_note: <short note describing why the handler stops here>
```

Normalization note:

1. `ResolvePlanState` consumes only normalized continuation or replanning outputs from this workflow
2. create/start and troubleshooting results are terminal execution boundaries for the current pass and must remain handler-local action results rather than normalized continuation routes
3. create/start may return a settled boundary only after `metadata_postcondition=impl_bubble_id_persisted_and_status_in_progress`, `publish_postcondition=admin_publish_succeeded`, `publish_proof.publish_result=success`, `kickoff_postcondition=same_bubble_kicked_off`, and `kickoff_result.result=success`
4. when both create/start and kickoff occur in this create route, `delegated_use_pairflow_surface` remains the primary route owner for backward compatibility and `delegated_use_pairflow_actions` records the full audited lifecycle sequence
5. when only resume/kickoff occurs after admin was already published,
   `delegated_use_pairflow_surface=InterveneBubble` because no create/start
   action runs in that pass
6. `create_start_mode` must distinguish an actual `CreateBubble` create/start
   from safe reuse of an already-existing carrier; reuse must use
   `delegated_use_pairflow_actions[0]=bubble_reuse` and must not imply that a
   new create/start command ran in that pass
7. `publish_recovery_context` is required on handler-local human checkpoints
   that happen after an admin authorization or publish attempt has enough
   structured data to support idempotent recovery; it is `not_applicable`
   before authorization or before any recoverable publish context exists,
   including `ADMIN_AUTHORIZATION_MISSING`
8. `delegated_use_pairflow_surface=none` is valid only for fail-closed
   handler-local results reached before any `UsePairflow` lifecycle delegation
   can truthfully run, such as invalid derived id, unsafe existing id, or
   Pairflow status read failure before create/start

### Structured Local Boundary Report

When this workflow stops without emitting a normalized continuation route back into `ResolvePlanState`, it must still emit a structured local boundary report with this shape:

```yaml
boundary_status: <active_bubble_hold|human_checkpoint>
continuation_mode: <stop_at_settled_checkpoint|stop_at_human_checkpoint>
source_owner: bubble_routing_layer
scope: implementation
boundary_reason: <bubble_still_running|preconditions_not_met|normalization_unsafe|admin_publish_failed|admin_postcondition_missing|kickoff_failed>
escalation_reason_code: <optional-anchored-human-checkpoint-code>
publish_recovery_context:
  bubble_id: <<task_id>-impl|not_applicable>
  admin_commit: <admin-commit-id|not_applicable>
  admin_commit_state: <published|unpublished_candidate|not_applicable>
  published_main_ref: <refreshed-main-ref|not_applicable>
  selected_admin_paths:
    - <selected-admin-path>
  authorization_record_ref: <authorization-record-ref|not_applicable>
  named_postconditions:
    - <named-postcondition>
  publish_checkpoint_reason_code: <imported-PublishPreKickoffAdmin-checkpoint-code|not_applicable>
  checkpoint_or_postcondition_evidence: <retained-evidence-summary|not_applicable>
handoff_boundary_note: <short note describing why the pass stops here>
```

Boundary rules:

1. use `boundary_status=active_bubble_hold` when the linked implementation bubble is still running and no higher boundary has been reached yet
2. use `boundary_status=human_checkpoint` when the branch fails closed and trustworthy automatic routing is unavailable
3. this report is for local pass reporting only; it is not a normalized continuation route for `ResolvePlanState`
4. `boundary_status=human_checkpoint` must hand control back upward as a top-level `HumanCheckpoint` stop rather than as a synthetic bubble route
5. `escalation_reason_code` is optional and should be present only when the handler is handing an already-anchored human-checkpoint reason back upward
6. allowed `escalation_reason_code` values in this workflow are exactly
   `BUBBLE_ROUTE_NORMALIZATION_REQUIRED`, `NO_TRUSTWORTHY_ROUTE`,
   `IMPL_BUBBLE_CANONICAL_ID_UNSAFE`,
   `IMPL_BUBBLE_PRE_KICKOFF_HOLD_MISSING`,
   `IMPL_BUBBLE_ADMIN_POSTCONDITION_MISSING`,
   `IMPL_BUBBLE_PUBLISH_PROOF_INVALID`, `IMPL_BUBBLE_KICKOFF_FAILED`, or one of
   the imported `PublishPreKickoffAdmin` checkpoint reason codes listed in the
   reason-code anchor set
7. use `boundary_reason=admin_publish_failed` when `PublishPreKickoffAdmin`
   returns a checkpoint or when handler-side validation finds a malformed,
   missing, or mismatched publish proof before kickoff
8. use `boundary_reason=admin_postcondition_missing` when publish succeeded but refreshed handler-side `main` metadata is missing or mismatched
9. use `boundary_reason=preconditions_not_met` when the post-publish Pairflow hold recheck fails before kickoff
10. use `boundary_reason=kickoff_failed` when all publish and refreshed postconditions passed but same-bubble kickoff failed
11. when `boundary_reason` is `admin_publish_failed`,
    `admin_postcondition_missing`, `preconditions_not_met`, or
    `kickoff_failed` after a publish authorization or publish attempt,
    preserve every available recovery-context field from the authorization
    record and `PublishPreKickoffAdmin` result/checkpoint so a later resume can
    rerun the publish workflow idempotently; never replace this structured
    context with transcript prose
12. when the checkpoint happens before authorization exists, such as
    `ADMIN_AUTHORIZATION_MISSING`, set `publish_recovery_context` fields to
    `not_applicable`; do not fabricate an authorization record or recovery
    context that cannot exist yet

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
field is absent, malformed, or below threshold, route to
`implementation_bubble_review` instead of auto-approving.

The actual lifecycle approval must still be delegated through `UsePairflow`
`CloseBubble`, which runs `pairflow bubble approve` before commit/merge. The
handler emits only the normalized close route; it must not inline approval.

### Reason-Code Anchor Set

This workflow may emit only the already-anchored implementation-scope reason codes:

1. `IMPL_BUBBLE_CREATE_REQUIRED`
2. `IMPL_BUBBLE_REVIEW_REQUIRED`
3. `IMPL_BUBBLE_CLOSE_REQUIRED`
4. `IMPL_BUBBLE_AUTO_APPROVAL_CLOSE_REQUIRED`
5. `BUBBLE_NORMALIZED_REPLAN_REQUIRED`
6. `BUBBLE_ROUTE_NORMALIZATION_REQUIRED`
7. `PAIRFLOW_STATUS_UNAVAILABLE`
8. `OPERATOR_TROUBLESHOOT_HINT`
9. `NO_TRUSTWORTHY_ROUTE`
10. `IMPL_BUBBLE_PRE_KICKOFF_HOLD_MISSING`
11. `IMPL_BUBBLE_ADMIN_POSTCONDITION_MISSING`
12. `IMPL_BUBBLE_CANONICAL_ID_UNSAFE`
13. `IMPL_BUBBLE_PUBLISH_PROOF_INVALID`
14. `IMPL_BUBBLE_KICKOFF_FAILED`

Imported `PublishPreKickoffAdmin` checkpoint codes must be retained in
`publish_checkpoint_reason_code` on the handler-local action result and in
`escalation_reason_code` on the structured local boundary report only when this
workflow is reporting that workflow's actual checkpoint without
reinterpretation. Handler-side malformed, missing, wrong-bubble, wrong-commit,
or missing-`kickoff_allowed=true` publish proof uses the native
`IMPL_BUBBLE_PUBLISH_PROOF_INVALID` reason, with
`publish_checkpoint_reason_code=not_applicable` and
`boundary_reason=admin_publish_failed`. Do not copy imported publish checkpoint
codes into the primary `reason_code`. When an actual
`PublishPreKickoffAdmin` checkpoint occurs in the create route, keep the
primary handler `reason_code=IMPL_BUBBLE_CREATE_REQUIRED` and carry the imported
checkpoint only in `publish_checkpoint_reason_code` and `escalation_reason_code`.

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

### 1. Baseline and document-completion guards

Fail closed before reading implementation lifecycle truth when any of the
following is true and neither an explicit troubleshooting route nor a linked
implementation lifecycle entry applies:

1. the task lacks trustworthy metadata required by the merged Task 1 contract
2. fresh create would be required but document-phase completion is not proven by
   task metadata `status=implementable`
3. implementation-bubble routing would require inventing new metadata fields or hidden lifecycle state

Proof rule:

1. implementation-bubble creation relies on `status=implementable` as the
   durable persisted result of document-bubble close
2. fresh create must not rely on `doc_bubble_id`, bubble absence, filename
   guesses, raw Pairflow lifecycle state, or prose-only operator memory
3. if task metadata already has an `impl_bubble_id`, this guard must not require
   `status=implementable` before the handler reads Pairflow status for normal
   linked implementation lifecycle handling such as active hold, review, close,
   troubleshooting, or bubble-origin replanning
4. if task metadata has `status=in_progress` with
   `impl_bubble_id=<task_id>-impl`, this guard must also allow Rule 4a's
   pre-kickoff resume path to test structured publish proof and same-bubble
   round-0 hold before kickoff

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
publish_checkpoint_reason_code: not_applicable
delegated_use_pairflow_surface: TroubleshootBubble
delegated_use_pairflow_actions:
  - troubleshoot
  - not_applicable
create_start_mode: not_applicable
metadata_postcondition: not_applicable
publish_postcondition: not_applicable
kickoff_postcondition: not_applicable
publish_proof:
  workflow: not_applicable
  publish_result: not_applicable
  bubble_id: not_applicable
  admin_commit: not_applicable
  published_main_ref: not_applicable
  selected_admin_paths: []
  postcondition_evidence:
    impl_bubble_id: not_applicable
    task_status: not_applicable
  refreshed_hold_evidence: not_applicable
publish_recovery_context:
  bubble_id: not_applicable
  admin_commit: not_applicable
  admin_commit_state: not_applicable
  published_main_ref: not_applicable
  selected_admin_paths: []
  authorization_record_ref: not_applicable
  named_postconditions: []
  publish_checkpoint_reason_code: not_applicable
  checkpoint_or_postcondition_evidence: not_applicable
kickoff_result:
  delegated_use_pairflow_surface: not_applicable
  lifecycle_command: not_applicable
  bubble_id: <linked-impl-bubble-id|not_applicable>
  task_payload_source: not_applicable
  result: not_applicable
handoff_boundary_note: Troubleshoot the linked implementation bubble only; do not continue normal orchestration from the same raw lifecycle read.
```

Reason-code selection:

1. use `OPERATOR_TROUBLESHOOT_HINT` when the operator explicitly asked for troubleshooting
2. use `PAIRFLOW_STATUS_UNAVAILABLE` when the runtime/lifecycle issue is confirmed by the failed status read

### 3. Create the implementation bubble

Choose create when:

1. task metadata has `status=implementable`
2. `impl_bubble_id=null`

Implementation-route pre-kickoff admin contract:

1. `CreateImplementationBubble` uses the pre-kickoff admin pattern now; this
   adoption is limited to the implementation create/start route.
2. The route starts or reuses an ideation round-0 carrier with the canonical
   derived id `<task_id>-impl`.
3. The route applies only bounded admin in the bubble worktree:
   `impl_bubble_id=<task_id>-impl`, `status=in_progress`, and any directly
   required plan/progress tracker summary for the same task.
4. Kickoff must wait until bounded admin scope, commit identity,
   publish-to-`main`, refreshed `impl_bubble_id`, refreshed
   `status=in_progress`, and refreshed same-bubble ideation hold are proven by
   `PublishPreKickoffAdmin` success plus handler-side rereads.
5. Failed, partial, or ambiguous admin publish must stop before kickoff rather
   than falling back to unmerged worktree state, transcript prose, stale task
   metadata, or operator memory.
6. Admin scope remains limited to plan/task/progress metadata and directly
   related docs/admin notes; repo-local `ExecutePairflowPlan` skill/workflow
   documentation is allowed only when the selected admin task itself changes
   that orchestration contract; product/source implementation and `UsePairflow`
   edits remain forbidden.

Delegation:

1. derive the intended implementation bubble id mechanically as `<task_id>-impl`
   from the current task metadata contract; do not invent an alternate id and do
   not add a separate recovery-key abstraction
2. before create, read `pairflow bubble status --id <task_id>-impl`; if an
   existing bubble with that id is in the expected implementation create carrier
   state, proves implementation code artifact type, proves the same task
   identity, and remains in round-0 ideation hold, reuse that bubble instead of
   creating a second one
3. if no bubble exists with the derived id, delegate create/start through
   `UsePairflow` `CreateBubble` using exactly that derived id, `--ideation`,
   and `--review-artifact-type code`
4. if create fails because the derived id already exists, re-read status for the
   same id; reuse only when the state is the expected implementation create
   carrier state, otherwise stop at a human checkpoint
5. if a bubble exists with the derived id but is not in a safe reusable state,
   stop at a human checkpoint; never create the same task's implementation
   bubble under a different id
6. before editing the task artifact in the bubble worktree, invoke
   `PublishPreKickoffAdmin` as the backing manual workflow through its
   pre-side-effect authorization gate, with selected admin paths that include
   the active task artifact and any directly required implementation-route
   workflow metadata
7. only after that authorization record exists, write the selected admin changes
   in the ideation bubble worktree: `impl_bubble_id=<task_id>-impl` and
   `status=in_progress`
8. continue the same `PublishPreKickoffAdmin` workflow to stage, commit,
   publish, and verify the selected admin paths, with named postconditions
   proving refreshed `main` metadata contains `impl_bubble_id=<task_id>-impl`
   and `status=in_progress`
9. require `PublishPreKickoffAdmin` to return `publish_result=success`,
   `bubble_id=<task_id>-impl`, `kickoff_allowed=true`, `admin_commit`,
   `published_main_ref`, selected admin paths, authorization evidence,
   refreshed postcondition evidence, and refreshed hold evidence
10. after `PublishPreKickoffAdmin` returns success, re-read `main` task metadata
   locally and reject missing or mismatched `impl_bubble_id` or
   `status=in_progress`
11. re-read Pairflow status and require the same derived id to still be a
   round-0 ideation hold with `ideation.task_pending=true`
12. delegate kickoff for the same derived id through `UsePairflow`
    `InterveneBubble` using the task payload source
13. capture the kickoff result in `kickoff_result` with the delegated surface,
    bubble id, task payload source, and success status
14. capture whether the carrier came from a new create/start or safe same-id
    reuse in `create_start_mode`; a reused carrier must report
    `delegated_use_pairflow_actions[0]=bubble_reuse`
15. preserve the implementation-bubble quality model and stop after the
    kicked-off boundary

Safe reusable state:

1. the status bubble id must equal the derived id exactly
2. Pairflow/status metadata must prove the bubble is an implementation/code
   artifact carrier, such as `review_artifact_type=code` or the equivalent
   code artifact-type field exposed by the current status schema
3. Pairflow/status metadata must prove the task identity or task payload
   association matches the current task path/id; if the status schema does not
   expose artifact type or task identity fields, reusable state is not proven
   and the route must stop at a human checkpoint rather than reuse the bubble
4. the observed state must be route-compatible with the implementation create
   branch being executed
5. for the implementation create route, the reusable state is a same-id
   ideation round-0 hold with `ideation.task_pending=true`
6. a completed, cancelled, approval-ready, wrong-artifact-type, wrong-task, or
   otherwise ambiguous bubble with the derived id is not reusable and must stop
   the route instead of triggering alternate id creation

Output:

```yaml
action_surface: CreateImplementationBubble
continuation_mode: stop_at_settled_checkpoint
source_owner: bubble_routing_layer
scope: implementation
reason_code: IMPL_BUBBLE_CREATE_REQUIRED
publish_checkpoint_reason_code: not_applicable
delegated_use_pairflow_surface: <CreateBubble|InterveneBubble>
delegated_use_pairflow_actions:
  - <bubble_create_start|bubble_reuse>
  - bubble_kickoff
create_start_mode: <created_new_carrier|reused_existing_carrier>
metadata_postcondition: impl_bubble_id_persisted_and_status_in_progress
publish_postcondition: admin_publish_succeeded
kickoff_postcondition: same_bubble_kicked_off
publish_proof:
  workflow: PublishPreKickoffAdmin
  publish_result: success
  bubble_id: <task_id>-impl
  admin_commit: <admin-commit-id>
  published_main_ref: <refreshed-main-ref>
  selected_admin_paths:
    - <selected-admin-path>
  postcondition_evidence:
    impl_bubble_id: <task_id>-impl
    task_status: in_progress
  refreshed_hold_evidence: <post-publish-round-0-hold-summary>
publish_recovery_context:
  bubble_id: <task_id>-impl
  admin_commit: <admin-commit-id>
  admin_commit_state: published
  published_main_ref: <refreshed-main-ref>
  selected_admin_paths:
    - <selected-admin-path>
  authorization_record_ref: <authorization-record-ref>
  named_postconditions:
    - <named-postcondition>
  publish_checkpoint_reason_code: not_applicable
  checkpoint_or_postcondition_evidence: <postcondition-evidence-summary>
kickoff_result:
  delegated_use_pairflow_surface: InterveneBubble
  lifecycle_command: pairflow bubble kickoff
  bubble_id: <task_id>-impl
  task_payload_source: <task-path>
  result: success
handoff_boundary_note: Start or safely reuse the ideation implementation bubble, publish bounded admin to main through PublishPreKickoffAdmin, kickoff the same bubble only after refreshed proof, and stop at the settled kicked-off boundary.
```

Create/reuse output rule:

1. when this pass actually delegates create/start to `UsePairflow`
   `CreateBubble`, set `delegated_use_pairflow_surface=CreateBubble`,
   `delegated_use_pairflow_actions[0]=bubble_create_start`, and
   `create_start_mode=created_new_carrier`
2. when this pass reuses a status-proven safe same-id carrier, set
   `delegated_use_pairflow_surface=InterveneBubble`,
   `delegated_use_pairflow_actions[0]=bubble_reuse`, and
   `create_start_mode=reused_existing_carrier`; do not report a create/start
   command that did not run

Fail-closed rule:

1. if create/start succeeds but task metadata cannot be published to `main` with
   `impl_bubble_id` and `status=in_progress`, the handler must not report a
   settled create boundary
2. if the derived id is over-budget, invalid, already bound to an unsafe state,
   or cannot be checked with Pairflow status, return a human checkpoint rather
   than creating an alternate id; use
   `reason_code=IMPL_BUBBLE_CANONICAL_ID_UNSAFE`,
   `escalation_reason_code=IMPL_BUBBLE_CANONICAL_ID_UNSAFE`,
   report `delegated_use_pairflow_surface=none`
   and `delegated_use_pairflow_actions=[not_applicable, not_applicable]` when
   no lifecycle delegation ran
3. if `PublishPreKickoffAdmin` returns an actual checkpoint, return a human
   checkpoint with `reason_code=IMPL_BUBBLE_CREATE_REQUIRED`,
   `boundary_reason=admin_publish_failed`,
   `publish_checkpoint_reason_code=<imported-PublishPreKickoffAdmin-checkpoint-code>`,
   the matching imported checkpoint as `escalation_reason_code`, and a
   `publish_recovery_context` that retains the authorization record, selected
   paths, named postconditions, and checkpoint evidence available from that
   workflow; for `ADMIN_AUTHORIZATION_MISSING`, the recovery context remains
   `not_applicable` because no authorization record exists yet; do not run
   kickoff
4. if the handler receives malformed publish success, wrong bubble id, wrong
   admin commit proof, missing `kickoff_allowed=true`, or otherwise missing
   required publish proof, return a human checkpoint with
   `boundary_reason=admin_publish_failed`,
   `publish_checkpoint_reason_code=not_applicable`,
   `escalation_reason_code=IMPL_BUBBLE_PUBLISH_PROOF_INVALID`, and
   `reason_code=IMPL_BUBBLE_PUBLISH_PROOF_INVALID`; retain
   `publish_recovery_context` when authorization or partial publish evidence is
   available, and do not run kickoff
5. if refreshed `main` task metadata does not prove
   `impl_bubble_id=<task_id>-impl` and `status=in_progress`, return a human
   checkpoint with `boundary_reason=admin_postcondition_missing`,
   `escalation_reason_code=IMPL_BUBBLE_ADMIN_POSTCONDITION_MISSING`, and
   `reason_code=IMPL_BUBBLE_ADMIN_POSTCONDITION_MISSING`; retain
   `publish_recovery_context` from the successful publish result and handler
   postcondition evidence, and do not run kickoff
6. if refreshed Pairflow status does not prove the same derived id is still in
   round-0 ideation hold with `ideation.task_pending=true`, return a human
   checkpoint with `boundary_reason=preconditions_not_met`,
   `escalation_reason_code=IMPL_BUBBLE_PRE_KICKOFF_HOLD_MISSING`, and
   `reason_code=IMPL_BUBBLE_PRE_KICKOFF_HOLD_MISSING`; retain
   `publish_recovery_context` from the successful publish result and hold
   reread evidence, and do not run kickoff
7. if same-bubble kickoff fails after publish and refreshed proof, return a
   human checkpoint with `boundary_reason=kickoff_failed`,
   `escalation_reason_code=IMPL_BUBBLE_KICKOFF_FAILED`, and
   `reason_code=IMPL_BUBBLE_KICKOFF_FAILED`; retain
   `publish_recovery_context` from the successful publish result and kickoff
   failure evidence, and do not invent a settled create boundary
8. return a human checkpoint or troubleshooting result that names the missing implementation linkage/status persistence, unsafe canonical-id state, publish checkpoint or invalid proof, refreshed postcondition mismatch, hold mismatch, or kickoff failure as the blocker

### 4. Read the linked bubble and classify only implementation-owned routes

When `impl_bubble_id` exists:

1. read `PAIRFLOW_STATUS`
2. use Pairflow lifecycle truth only for implementation-bubble review, close, troubleshooting, or fail-closed classification
3. do not reopen document-phase completion, plan sequencing, or archive ownership here

### 4a. Resume published pre-kickoff admin hold

Choose this branch when all of the following are true:

1. task metadata has `status=in_progress`
2. `impl_bubble_id` equals the canonical derived id `<task_id>-impl`
3. `PAIRFLOW_STATUS` for that same id proves `RUNNING` round `0` with
   `ideation.task_pending=true`

This branch is selected for the canonical in-progress round-0 implementation
hold before the generic active-bubble hold. After selection, it must prove
authoritative publish success before kickoff by consuming
`PUBLISH_PRE_KICKOFF_ADMIN_RESULT` for the same bubble id, either as:

1. the prior `PublishPreKickoffAdmin` success packet for the same bubble id and
   admin commit
2. or a fresh success packet produced by rerunning `PublishPreKickoffAdmin`
   through its idempotent recovery path from retained
   `PUBLISH_PRE_KICKOFF_ADMIN_RECOVERY_CONTEXT`, including either an
   already-published `admin_commit` or a retained unpublished
   `ADMIN_COMMIT_CANDIDATE` whose parent still equals the current
   `MAIN_BASE_REF`

If that proof is absent, malformed, or not recoverable, this branch fails closed
with `IMPL_BUBBLE_PUBLISH_PROOF_INVALID`; it must not fall through to the
generic active-bubble hold.

This is the recovery path for a previous create attempt that already published
`impl_bubble_id=<task_id>-impl` and `status=in_progress` to `main` but stopped
before same-bubble kickoff because the hold reread or kickoff failed.

Delegation:

1. re-read `main` task metadata and prove `impl_bubble_id=<task_id>-impl` and
   `status=in_progress`
2. consume `PUBLISH_PRE_KICKOFF_ADMIN_RESULT`; retained recovery context may
   only be used as input to rerun `PublishPreKickoffAdmin` and recover a fresh
   structured success packet, and must never directly authorize kickoff
3. re-read Pairflow status immediately before kickoff and prove the same derived
   id is still a round-0 ideation hold with `ideation.task_pending=true`
4. delegate kickoff for the same derived id through `UsePairflow`
   `InterveneBubble`
5. stop at the same settled kicked-off boundary as the fresh create path

Output:

```yaml
action_surface: CreateImplementationBubble
continuation_mode: stop_at_settled_checkpoint
source_owner: bubble_routing_layer
scope: implementation
reason_code: IMPL_BUBBLE_CREATE_REQUIRED
publish_checkpoint_reason_code: not_applicable
delegated_use_pairflow_surface: InterveneBubble
delegated_use_pairflow_actions:
  - not_applicable
  - bubble_kickoff
create_start_mode: not_applicable
metadata_postcondition: impl_bubble_id_persisted_and_status_in_progress
publish_postcondition: admin_publish_succeeded
kickoff_postcondition: same_bubble_kicked_off
publish_proof:
  workflow: PublishPreKickoffAdmin
  publish_result: success
  bubble_id: <task_id>-impl
  admin_commit: <admin-commit-id>
  published_main_ref: <refreshed-main-ref>
  selected_admin_paths:
    - <selected-admin-path>
  postcondition_evidence:
    impl_bubble_id: <task_id>-impl
    task_status: in_progress
  refreshed_hold_evidence: <post-publish-round-0-hold-summary>
publish_recovery_context:
  bubble_id: <task_id>-impl
  admin_commit: <admin-commit-id>
  admin_commit_state: published
  published_main_ref: <refreshed-main-ref>
  selected_admin_paths:
    - <selected-admin-path>
  authorization_record_ref: <authorization-record-ref>
  named_postconditions:
    - <named-postcondition>
  publish_checkpoint_reason_code: not_applicable
  checkpoint_or_postcondition_evidence: <postcondition-evidence-summary>
kickoff_result:
  delegated_use_pairflow_surface: InterveneBubble
  lifecycle_command: pairflow bubble kickoff
  bubble_id: <task_id>-impl
  task_payload_source: <task-path>
  result: success
handoff_boundary_note: Resume the recoverable implementation pre-kickoff admin hold, re-prove publish success, refreshed main metadata, and same-bubble ideation hold, kickoff the same bubble, and stop at the settled kicked-off boundary.
```

Fail-closed rule:

1. if task metadata has `status=in_progress` and the same derived
   `impl_bubble_id`, but no structured `PublishPreKickoffAdmin` success can be
   consumed or recovered, return a human checkpoint with
   `boundary_reason=admin_publish_failed`,
   `publish_checkpoint_reason_code=not_applicable`,
   `escalation_reason_code=IMPL_BUBBLE_PUBLISH_PROOF_INVALID`,
   `reason_code=IMPL_BUBBLE_PUBLISH_PROOF_INVALID`, retain any available
   `publish_recovery_context`, and do not run kickoff
2. if refreshed main metadata no longer proves `impl_bubble_id=<task_id>-impl`
   and `status=in_progress`, return a human checkpoint with
   `boundary_reason=admin_postcondition_missing`,
   `escalation_reason_code=IMPL_BUBBLE_ADMIN_POSTCONDITION_MISSING`, and
   `reason_code=IMPL_BUBBLE_ADMIN_POSTCONDITION_MISSING`; retain
   `publish_recovery_context`, and do not run kickoff
3. if refreshed Pairflow status no longer proves the same id is an ideation
   round-0 hold, return a human checkpoint with
   `boundary_reason=preconditions_not_met`,
   `escalation_reason_code=IMPL_BUBBLE_PRE_KICKOFF_HOLD_MISSING`, and
   `reason_code=IMPL_BUBBLE_PRE_KICKOFF_HOLD_MISSING`; retain
   `publish_recovery_context`, and do not run kickoff
4. if same-bubble kickoff fails after recovered/persisted publish proof,
   refreshed main metadata, and refreshed hold proof, return a human checkpoint
   with `boundary_reason=kickoff_failed`,
   `escalation_reason_code=IMPL_BUBBLE_KICKOFF_FAILED`, and
   `reason_code=IMPL_BUBBLE_KICKOFF_FAILED`; retain
   `publish_recovery_context`, and do not invent a settled resume boundary

### 5. Auto-approval close path

Choose close when Pairflow truth shows the linked implementation bubble reached
the explicit approval gate and the auto-approval gate proof above is satisfied.

Authoritative trigger anchors:

1. `READY_FOR_HUMAN_APPROVAL`
2. legacy-compatible `READY_FOR_APPROVAL`

Required proof:

1. `reviewPolicy.meta_review_consecutive_clean_runs_required > 1`
2. `metaReview.consecutiveCleanRuns >= reviewPolicy.meta_review_consecutive_clean_runs_required`
3. `failing_gates` is absent or empty
4. there is no active handoff in `executionContext`

Delegation:

1. delegate approve/pre-commit admin/commit/merge/cleanup through `UsePairflow`
   `CloseBubble`
2. require the returned close result to prove implementation task/progress/archive
   admin was applied in the bubble worktree before lifecycle commit when task
   source metadata is available
3. require the returned close result to prove finalized bubble artifact deletion,
   or to provide an explicit retained-bubble reason that prevents reporting a
   settled close

Output:

```yaml
route_class: implementation_bubble_close
target_workflow_surface: CloseImplementationBubble
continuation_mode: auto_continue
source_owner: bubble_routing_layer
scope: implementation
source_scope: not_applicable
approval_gate_state: already_satisfied
reason_code: IMPL_BUBBLE_AUTO_APPROVAL_CLOSE_REQUIRED
delegated_use_pairflow_surface: CloseBubble
cleanup_postcondition: <bubble_deleted|retained_with_reason>
implementation_admin_postcondition: <task_archived_in_bubble_commit|not_applicable>
auto_approval_proof:
  required_clean_runs: <reviewPolicy.meta_review_consecutive_clean_runs_required>
  observed_clean_runs: <metaReview.consecutiveCleanRuns>
handoff_boundary_note: Auto-approve through UsePairflow CloseBubble because Pairflow already satisfied the configured multi-clean-meta-review gate; CloseBubble must apply required implementation task/progress/archive admin before lifecycle commit, and the caller may continue orchestration after authoritative close state returns.
```

### 6. Review-gate path

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

### 7. Close path

Choose close only when the bubble-side route contract proves both of the following:

1. the linked implementation bubble is close-ready
2. the separate approval/review path is already satisfied

Authoritative trigger anchors:

1. Pairflow state is `APPROVED_FOR_COMMIT`
2. or the linked bubble is at `DONE` and the current context already carries a trusted structured approval-proof producer such as a clean `UsePairflow` `ReviewBubble` result followed by an explicit human approval outcome recorded in authoritative workflow context rather than prose-only notes
3. or Rule 5 produced a trusted multi-clean-meta-review auto-approval proof while the linked bubble was at `READY_FOR_HUMAN_APPROVAL` or legacy `READY_FOR_APPROVAL`

Delegation:

1. delegate close/pre-commit admin/merge/cleanup through `UsePairflow`
   `CloseBubble`
2. require the returned close result to prove implementation task/progress/archive
   admin was applied in the bubble worktree before lifecycle commit when task
   source metadata is available
3. require the returned close result to prove finalized bubble artifact deletion, or to provide an explicit retained-bubble reason that prevents reporting a settled close

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
implementation_admin_postcondition: <task_archived_in_bubble_commit|not_applicable>
handoff_boundary_note: Close the approved implementation bubble only; required implementation task/progress/archive admin must be in the bubble commit before merge, and the caller may continue orchestration after authoritative close state returns.
```

Fail-closed rule:

1. if close/merge succeeds but the finalized bubble artifact remains present without an explicit retained-bubble reason, do not emit an auto-continuable close result
2. if close/merge succeeds but required implementation task/progress/archive admin was not applied in the bubble commit, do not emit an auto-continuable close result and do not repair it with a direct `main` aftermath commit
3. return a human checkpoint or cleanup blocker instead; `UpdateProgress` must not run from a close result that still leaves the closed implementation bubble as an ordinary `DONE` artifact or lacks required implementation admin proof

### 8. Normalized replanning path

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

If the linked implementation bubble is still actively running and none of the pre-kickoff resume, pre-kickoff proof-missing fail-closed, review, close, replanning, or troubleshooting conditions apply:

1. stop at the current settled checkpoint
2. do not mint a second normalized continuation route
3. do not infer completion, approval, or replanning from a merely active lifecycle state
4. do not report create/start, reuse, publish, or kickoff delegation for this
   boundary; it is a linked active-hold classification from Pairflow lifecycle
   truth

Boundary report:

```yaml
boundary_status: active_bubble_hold
continuation_mode: stop_at_settled_checkpoint
source_owner: bubble_routing_layer
scope: implementation
boundary_reason: bubble_still_running
publish_recovery_context:
  bubble_id: not_applicable
  admin_commit: not_applicable
  admin_commit_state: not_applicable
  published_main_ref: not_applicable
  selected_admin_paths: []
  authorization_record_ref: not_applicable
  named_postconditions: []
  publish_checkpoint_reason_code: not_applicable
  checkpoint_or_postcondition_evidence: not_applicable
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
