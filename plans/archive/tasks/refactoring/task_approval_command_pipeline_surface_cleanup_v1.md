---
artifact_type: task
artifact_id: task_approval_command_pipeline_surface_cleanup_v1
title: "Approval Command Pipeline Surface Cleanup"
status: archived
phase: phase1
target_files:
  - src/v11/application/approval/approvalCommandApi.ts
  - src/v11/application/approval/approvalCommandContract.ts
  - src/v11/application/approval/approvalCommandDependencyResolution.ts
  - src/v11/application/approval/approvalCommandError.ts
  - src/v11/application/approval/approvalCommandErrorNormalization.ts
  - src/v11/application/approval/approvalCommandInputNormalization.ts
  - src/v11/application/approval/approvalCommandOrchestration.ts
  - src/v11/application/approval/approvalRemoteExecutionContract.ts
  - src/v11/application/approval/approvalResultMapping.ts
  - src/v11/application/approval/approvalRoutingEligibility.ts
  - src/v11/application/approval/remoteApprovalExecutionContext.ts
  - src/v11/application/approval/requestReworkRemoteCloneSupport.ts
  - src/v11/application/approval/reworkIntentQueue.ts
  - src/v11/application/approval/runApprovalDecisionEffects.ts
  - src/v11/application/approval/runApprovalDecisionFlowHandler.ts
  - src/v11/application/approval/runApprovalDeferredRework.ts
  - src/v11/application/approval/runApprovalFlow.ts
  - src/v11/application/approval/runApprovalFlowContext.ts
  - src/v11/application/approval/runApprovalFlowContract.ts
  - src/v11/application/approval/runApprovalFlowHandlers.ts
  - src/v11/application/approval/internal/pipeline/**
  - src/v11/application/approval/internal/**
  - src/index.ts
  - src/cli/commands/bubble/approve.ts
  - src/cli/commands/bubble/requestRework.ts
  - src/v11/defaults/ui/routerDefaults.ts
  - tests/v11/application/approval/**
  - tests/contracts/v11/approval.contract.test.ts
  - tests/contracts/v11/commit.contract.test.ts
  - tests/contracts/v11/approval.contract.runner.ts
  - tests/contracts/v11/commit.contract.runner.ts
  - tests/core/human/approval.test.ts
  - tests/core/bubble/commitBubble.test.ts
  - tests/core/bubble/watchdogBubble.test.ts
  - tests/core/ui/router.test.ts
  - tests/cli/requestReworkDeliveryWarning.test.ts
  - tools/fitness/checks/internal-module-boundary.ts
  - tests/tools/fitness/internalModuleBoundary.test.ts
  - tests/tools/fitness/criticalSideEffect.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/architecture/v11-placement-and-extraction-governance.md
normative_refs:
  - docs/architecture/v11-architecture-overview.md
  - docs/architecture/v11-placement-and-extraction-governance.md
  - docs/architecture/v11-internal-module-boundaries.md
  - plans/archive/tasks/refactoring/merge-command-local-remote-execution-pipeline.md
  - plans/archive/tasks/refactoring/list-remote-projection-pipeline.md
owners:
  - "felho"
archive_group: refactoring
---

# Task: Approval Command Pipeline Surface Cleanup

## Current Codebase Check (2026-05-10)

1. `src/v11/application/approval/**` currently has an explicit internal layout,
   but much of the top-level approval lane is still pass-through public surface:
   `approvalCommandApi.ts`, command contract/error/dependency files, result
   mapping, remote execution helpers, rework helpers, and flow helpers mostly
   re-export `./internal/**`.
2. The current `internal_module_boundary` fitness report identifies 20
   report-only internal re-export camouflage candidates under
   `src/v11/application/approval`.
3. The public command consumers currently import the approval API through
   `src/v11/application/approval/approvalCommandApi.ts`:
   - root exports in `src/index.ts`,
   - CLI approve/request-rework commands,
   - UI router defaults,
   - approval and commit contract runners,
   - core approval/commit/watchdog/router tests.
4. Application-level tests still import lower-level top-level wrappers such as
   `runApprovalFlow.ts`, `reworkIntentQueue.ts`,
   `remoteApprovalExecutionContext.ts`, `approvalRoutingEligibility.ts`, and
   result/error/normalization helpers. Those imports preserve the old broad
   helper surface even though the implementation now lives under `internal/**`.
5. `internal/flow/runApprovalFlow.ts` remains the route-entry owner for approval
   decision and request-rework flows:
   - initialize local or remote execution context,
   - choose remote routed approval command versus local flow,
   - process immediate human approval/rework,
   - queue deferred rework while `WAITING_HUMAN`,
   - preserve remote-clone local request-rework fallback rules.
6. The current behavior is meaningful and covered by tests, but the module is
   shallow: callers and tests still need to know too many internal helper names,
   flow-entry names, route-specific helpers, and remote/rework support exports.
7. No public behavior change is authorized. The task should preserve approval
   CLI/API behavior, remote approval command routing, request-rework queueing,
   approval decision envelopes, delivery notifications, lifecycle events,
   state transition semantics, and UI/router contract meanings.
8. No transitional compatibility surface is authorized. First-principles cleanup
   is required: any approval helper, wrapper, alias, export, import path, test
   seam, or vocabulary that is not needed in the intended final architecture
   must be deleted rather than preserved for convenience.

## Recommendation

This is a good next command-local pipeline/surface cleanup task.

It is similar in shape to the archived merge pipeline refactor, but the safest
first slice is public surface cleanup plus a command-local pipeline vocabulary,
not a broad behavioral rewrite. The approval lane already has useful internal
submodules; the main problem is that the old public file names expose almost
every internal helper as a compatibility surface.

This task must not optimize for a gradual migration path. It should define the
desired end-state and cut directly to it inside the bounded approval lane. If a
top-level file exists only because an old import path still points at it, update
the import and delete the file.

The refactor should reduce caller knowledge by making the public approval
module answer only these questions:

1. How does a caller emit approve / approval decision / request-rework?
2. Which input, result, and dependency contracts are stable public language?
3. Which errors cross the command boundary?

Callers should not need to know whether the implementation uses
`runApprovalFlow`, `runApprovalDecisionFlowHandler`,
`requestReworkRemoteCloneSupport`, `reworkIntentQueue`, or result mapping
helpers.

## Complexity-Risk Triage

1. `risk_score`: 6.
2. `identity_join_risk`: 2.
   - Approval joins bubble id, repo path/cwd, local or remote pointer authority,
     state fingerprint, approval transcript request, remote target identity,
     workspace authority for remote-clone local request-rework, and optional
     deferred rework intent identity.
3. `surface_spread`: 2.
   - Production code is one application lane plus public exports, CLI/UI
     consumers, contract runners, and focused approval tests.
4. `activation_coupling`: 1.
   - Existing `bubble approve` and `bubble request-rework` activation paths stay
     unchanged.
5. `prerequisite_risk`: 1.
   - Correctness depends on preserving approval state eligibility, remote
     routing, local remote-clone fallback, transcript append, state transition,
     and deferred rework queueing.
6. `split_decision`: single task accepted if limited to approval lane surface
   cleanup and pipeline vocabulary. Do not include unrelated reviewer/gates
   shared surface cleanup in the same task.
7. `authority_source_of_truth_note`: approval decision authority remains the
   emitted approval decision envelope plus state transition or queued rework
   intent. This task moves ownership and public surface only.

## ReviewSpec Task-Mode Readiness Check (2026-05-10)

1. `review_result`: `approve_task_after_local_refinement`.
2. `execution_metadata_gate`: not applicable for this standalone architecture
   task because `plan_ref: null` and no parent plan tracker is claiming
   sequencing authority.
3. `target_file_reality_check`: matches the current codebase.
   - Every current top-level approval file is a one-line re-export from
     `src/v11/application/approval/internal/**`.
   - External production consumers use `approvalCommandApi.ts` and
     `approvalCommandContract.ts`.
   - Existing approval application tests still import old top-level wrappers
     such as `runApprovalFlow.ts`, `reworkIntentQueue.ts`,
     `remoteApprovalExecutionContext.ts`, `approvalRoutingEligibility.ts`,
     normalization, error, and result helpers.
   - The current route owner is `internal/flow/runApprovalFlow.ts`; it is the
     intended pipeline-vocabulary replacement target.
4. `control_model_readiness`: ready. The task names local approval authority,
   started-remote approval routing, verified remote-clone local request-rework
   fallback, deferred rework intent authority, forbidden local fallback, and
   fail-closed missing-data behavior.
5. `closed_contract_drift`: no semantic drift authorized. Approval input/result
   contracts, approval decision envelope shape, remote approval transport,
   request-rework queue semantics, state-machine transitions, and UI/router
   meanings remain fixed.
6. `authority_fan_out`: acceptable for one bounded approval-lane refactor
   because public API, command dependency/error boundary, local route, remote
   route, request-rework queueing, and pipeline tests remain within
   `application/approval`.
7. `closure_budget`: acceptable. The task owns one existing command family
   (`approve` / approval decision / `request-rework`) and does not introduce a
   new CLI/API behavior.
8. `bounded_task_shape`: acceptable. This is a surface cleanup plus
   command-local pipeline ownership task; reviewer/gates shared cleanup and UI
   contract validation remain out of scope.
9. `contract_dense_gate`: satisfied by the Canonical Contract Matrix plus
   Mirrored Surface Checklist. The matrix is the source of truth for preserving
   route/effect/error semantics.
10. `capability_closure`: `end_to_end` for the existing approval command family
    only. This task adds no new capability; it preserves activation while
    reducing caller knowledge.

## Closure and Shape Triage

1. `primary_shape`: `consumer_family_alignment`.
   - The bounded slice aligns approval command consumers behind one deliberate
     public command interface and one command-local pipeline interface.
2. `secondary_shape`: `cleanup_recovery_consumers`.
   - Request-rework queueing and remote-clone fallback remain in scope because
     they are part of the existing request-rework success boundary.
3. `closure_buckets_touched`:
   - `internal_execution_consumers`: approval decision and request-rework flow.
   - `workflow_orchestration_consumers`: public command orchestration delegates
     to the internal pipeline.
   - `cleanup_recovery_consumers`: deferred rework intent persistence and
     delivery/lifecycle events remain required.
4. `collapsed_closures`: approval decision and request-rework are kept together
   because they share public command dependencies, remote approval routing, and
   approval-state eligibility.
5. `deferred_closures`:
   - shared reviewer guidance cleanup,
   - shared gates cleanup,
   - UI contract response validation,
   - approval payload schema redesign,
   - remote approval transport redesign.

## L0 - Policy

### Goal

Deepen the approval command module by replacing the old broad top-level helper
surface with one deliberate public approval command interface and one
command-local pipeline boundary for local/remote approval decision and
request-rework execution.

The business question this task should make explicit is:

> Given a human approval action and the current local or remote bubble
> authority, what approval command result is durable, and which route is allowed
> to produce it?

Callers should not orchestrate approval route selection, remote command routing,
approval-state eligibility, transcript append, state mutation, deferred rework
queueing, notification delivery, lifecycle event emission, and result mapping as
separate helper decisions.

### Context

Approval is a state-changing command family. It currently supports:

1. `approve` and general approval decision while in the canonical human
   approval state.
2. `request-rework` as immediate rework while in the human approval state.
3. `request-rework` as deferred intent while `WAITING_HUMAN`.
4. Started-remote approval command routing through retained remote pointer
   authority.
5. A bounded remote-clone local request-rework fallback when workspace authority
   is proven and retained clone-local remote pointer artifacts are absent.

The current internal implementation already contains focused pieces, but the
public module surface still exposes almost every piece through top-level
re-export wrappers. This task should remove the old compatibility surface and
make the retained public surface explicit.

### Chosen Architecture Direction

1. Keep approval workflow policy in `src/v11/application/approval`.
2. Introduce or rename the internal flow entry to command-local pipeline
   vocabulary, for example `runApprovalCommandPipeline(...)`.
3. Preserve `approvalCommandApi.ts` as the narrow public command interface only
   if it remains the deliberate final entrypoint used by root/CLI/UI/contract
   consumers. Do not keep it, or any sibling top-level file, as a forwarding
   facade whose main purpose is old-path continuity.
4. Keep public contracts that are genuinely consumed outside approval:
   approval command inputs/results/dependencies and stable error types. Each
   retained top-level contract/error/dependency file must have a named current
   external consumer and a final-state reason to exist at that layer.
5. Move tests that currently import old top-level helper wrappers to either the
   public command API or the exact internal pipeline owner.
6. Do not move approval-specific workflow policy into `shared`.
7. Do not introduce transitional barrels, deprecated wrappers, compatibility
   aliases, or old-name forwarding files. Keep only the final intended
   interface.

### In Scope

1. Create a command-local approval pipeline under a deliberate internal owner,
   tentatively `src/v11/application/approval/internal/pipeline/**`.
2. Replace the old public/test-facing `runApprovalFlow` vocabulary with
   pipeline vocabulary such as `runApprovalCommandPipeline`. Private
   implementation names may remain only when they are hidden behind the
   pipeline boundary and are not exported as a public compatibility surface or
   used as broad test seams.
3. Keep public command calls stable:
   - `emitApprove(...)`,
   - `emitApprovalDecision(...)`,
   - `emitRequestRework(...)`.
4. Preserve approval decision behavior:
   - input normalization,
   - approval state eligibility,
   - approval override handling,
   - transcript approval decision append,
   - state transition,
   - delivery notification,
   - lifecycle event emission,
   - result mapping.
5. Preserve request-rework behavior:
   - immediate rework in human approval state,
   - queued deferred rework while `WAITING_HUMAN`,
   - deferred intent persistence,
   - deferred intent lifecycle events,
   - remote routed request-rework,
   - verified remote-clone local request-rework fallback.
6. Delete top-level approval files that only re-export `internal/**`.
   Retain a top-level file only when it is part of the final intended public
   API/contract surface and has a current non-internal consumer that should keep
   that abstraction. Old import-path preservation, compatibility with existing
   application tests, or convenience for incremental migration is not a valid
   retention reason.
7. Update direct consumers in root exports, CLI commands, UI defaults, contract
   runners, and tests to import from the retained public API or explicit
   internal test seam.
8. Update or add focused tests for the new pipeline Interface.
9. Run final evidence scans proving the old broad helper surface is gone.
10. Re-evaluate approval-lane architecture fitness drift, especially the
    internal-module-boundary rule that currently reports approval re-export
    camouflage. If no approval-lane fitness rule update is needed, record why
    in the implementation summary or commit message. Do not use this task for
    unrelated fitness cleanup.

### Out of Scope

1. Changing approval CLI flags, command names, or user-facing output.
2. Changing public approval input/result semantics.
3. Changing approval decision envelope shape.
4. Changing state-machine transition rules.
5. Changing remote approval transport payloads or SSH executor behavior.
6. Changing remote pointer format or remote status target resolution.
7. Changing request-rework queue semantics or intent schema.
8. Changing reviewer/gates shared guidance modules.
9. Changing UI response validation or UI action DTO contracts.
10. Retaining old import paths, deprecated aliases, temporary wrappers, or
    transitional compatibility barrels.
11. Broad cleanup of unrelated approval consumers outside import rewiring and
    test seam changes.

### Control Model

1. `business_invariant`: approval commands must produce exactly one durable
   approval result or fail before claiming success.
2. `control_model`: approval result authority is either a local approval state
   transition / deferred rework intent write, or a started-remote approval
   command result returned through the retained remote route.
3. `read_path_rule`: local approval may read local bubble state and transcript;
   remote approval may read retained remote pointer and remote target authority;
   remote-clone local request-rework may use workspace authority only after the
   existing proof checks pass.
4. `forbidden_fallback`: once retained started-remote approval routing is the
   selected route, do not silently fall back to local approval when remote
   pointer, remote target, remote command execution, workspace identity, or
   retained pointer artifact checks fail.
5. `allowed_resolution_path`: the verified remote-clone local request-rework
   fallback is a separate pre-route classification, not recovery from a failed
   started-remote route. It may use the existing local fallback only when
   workspace identity matches the resolved bubble/repo and retained clone-local
   remote pointer artifacts are absent before local mutation starts.
6. `missing_data_rule`: missing approval state, missing transcript approval
   request, invalid remote pointer, unresolved remote target, ineligible state,
   invalid workspace authority, or failed persistence must fail closed through
   existing approval command error semantics.
7. `phase_boundary`: this task owns approval command internal execution surface
   cleanup. It does not own new approval behavior, shared reviewer/gates module
   cleanup, or UI contract hardening.

## Module Depth Check

1. Deletion test:
   - Deleting the retained public approval API should force CLI/root/UI/contract
     consumers to reimplement command normalization and dependency/error
     boundaries. That means the public API earns its keep.
   - Deleting top-level files that only re-export internal helpers should not
     remove behavior; it should only remove pass-through ceremony. Those files
     are shallow and should be deleted or reduced to deliberate public contracts.
2. Caller knowledge removed:
   - Callers and most tests should no longer know `runApprovalFlow`,
     `runApprovalDecisionFlowHandler`, `runApprovalFlowContext`,
     `reworkIntentQueue`, or remote-clone helper names.
3. Public interface stability:
   - Public approval command API remains stable for root/CLI/UI/contract
     consumers.
   - Internal pipeline becomes the focused test seam for route/effect ordering.
4. Hidden policy:
   - route selection,
   - approval state eligibility,
   - remote routing,
   - deferred rework queueing,
   - local remote-clone fallback proof,
   - transcript/state/event ordering.
5. Test shape:
   - Public behavior tests should use the public command API.
   - Pipeline tests may import the internal pipeline directly.
   - Low-level helper tests remain only for independent pure policy or explicit
     contract normalization.

## L1 - Change Contract

### Call-Site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Evidence |
|---|---|---|---|---|---|
| CS1 | `approvalCommandApi.ts` | public command API | Remain the deliberate public approval command interface for root/CLI/UI/contract consumers | P1 | T1,T8,T10 |
| CS2 | `approvalCommandOrchestration.ts` | old top-level wrapper | Delete; no pass-through re-export wrapper or old-path compatibility surface | P1 | T1,T10 |
| CS3 | `internal/pipeline/**` | approval command pipeline | Own local/remote route selection, execution ordering, typed boundary, and result construction | P1 | T2-T7,T11,T12,T13 |
| CS4 | `internal/flow/**` | existing flow helpers | Move, rename, or keep only as private pipeline implementation; no old public top-level wrapper surface | P1 | T1,T10 |
| CS5 | `src/index.ts` | root exports | Continue exporting stable public approval command API/types only | P1 | T8 |
| CS6 | CLI approve/request-rework | command activation | Preserve current CLI behavior and import from public API | P1 | T8 |
| CS7 | `routerDefaults.ts` | UI command dependency | Preserve UI action behavior and import stable public contract/API | P1 | T8 |
| CS8 | approval tests | proof surface | Move broad helper tests to pipeline seam or narrower independent helper seams | P1 | T2-T12 |
| CS9 | fitness tests | expected paths | Update only if the cleanup changes intentional architecture fixtures | P2 | T10 |

### Canonical Contract Matrix

| Condition | Required Owner | Required Result | Forbidden Behavior | Required Evidence |
|---|---|---|---|---|
| public approve command | public approval API -> internal pipeline | same `EmitApprovalDecisionResult` as today | exposing flow helper imports to callers | T2,T8 |
| public approval decision command | public approval API -> internal pipeline | same decision/override semantics | changing envelope/result shape | T2,T8 |
| local request-rework in human approval state | internal pipeline | immediate rework result through approval decision path | queueing instead of immediate result | T3 |
| local request-rework while `WAITING_HUMAN` | internal pipeline | queued deferred rework intent result | mutating lifecycle state away from `WAITING_HUMAN` | T4 |
| started-remote approval route | internal pipeline | remote approval command result mapping | silent local fallback when retained remote route fails | T5 |
| remote-clone local request-rework fallback eligible | internal pipeline/context proof | local request-rework with diagnostic as current behavior | rejecting eligible verified fallback | T6 |
| remote-clone fallback proof fails | internal pipeline/context proof | existing approval command error | local mutation without authority proof | T6 |
| public approval error boundary | public approval API/contract -> error normalization boundary | same stable approval error types and normalized command errors as today | leaking internal error helpers or changing public error semantics | T7,T8 |
| transcript/state/event ordering | internal pipeline | transcript append, state mutation, delivery notification, and lifecycle event emission preserve current relative ordering | reordering side effects while claiming behavior-only surface cleanup | T2,T3,T4,T8,T11,T12 |
| public root/CLI/UI/contract consumers | retained public API/contract | compile/runtime behavior unchanged | direct imports into internal implementation | T8,T10 |
| old top-level helper wrappers | implementation cleanup | deleted unless explicitly retained as final public API/contract with a current external consumer | pass-through `export * from "./internal/**"` camouflage | T10 |

### Interface and Data Contract

The stable public API remains the approval command API:

```ts
emitApprove(input, dependencies)
emitApprovalDecision(input, dependencies)
emitRequestRework(input, dependencies)
```

The internal pipeline must expose one explicit typed entrypoint from the
pipeline owner:

```ts
runApprovalCommandPipeline(
  input: ApprovalCommandPipelineInput,
  dependencies: ApprovalCommandPipelineDependencies
): Promise<ApprovalCommandPipelineResult>
```

The final implementation may split approval-decision and request-rework pipeline
inputs internally, but route selection and effect ordering must be owned by the
pipeline boundary rather than by top-level public helper wrappers.

`ApprovalCommandPipelineInput` must cover the existing approval decision and
request-rework command intents without changing public command input semantics.
`ApprovalCommandPipelineDependencies` must carry the command dependency boundary
needed for local state/transcript/event effects and retained remote routing
without leaking caller orchestration details. `ApprovalCommandPipelineResult`
must preserve the existing public approval result semantics and error boundary.
These contract names may live in a dedicated pipeline contract file, but they
must be explicitly exported from the internal pipeline seam and tested directly
or through the retained public API.

### Ownership and Deferred Semantics

1. This task owns approval command public surface cleanup and internal pipeline
   ownership.
2. This task does not own approval domain semantics or protocol payload changes.
3. This task does not own reviewer/gates shared-module cleanup.
4. This task does not own UI action DTO validation; it only preserves existing
   UI command behavior.
5. Any retained top-level file must be justified as deliberate final-state
   public API, stable contract, or error/dependency boundary with an actual
   current external consumer. Otherwise it should be removed and call sites
   should move.
6. Backward-compatible old paths are not a valid ownership reason. A path either
   belongs to the final interface or it is deleted in this task.
7. Tests are not external consumers for top-level wrapper retention. A test that
   imports a legacy wrapper must move to the public API, the internal pipeline
   seam, or a narrow independent helper seam that belongs to the final
   architecture.
8. The implementation summary must include two explicit top-level approval
   surface records:
   - a retained-surface inventory for every surviving top-level file under
   `src/v11/application/approval/*.ts`: file path, final-state owner category
   (`public API`, `public contract`, `dependency boundary`, `error boundary`,
   or `public boundary/delegate`), named non-test external consumers, and
   non-forwarding proof
   - a deleted top-level approval file list for old wrappers removed by this
   task
   A retained file whose body is only a forwarding facade to `internal/**` fails
   this task.

### Mirrored Surface Checklist

When any row in the Canonical Contract Matrix changes, update:

1. L0 `In Scope`.
2. L0 `Control Model`.
3. L1 `Call-Site Matrix`.
4. L1 `Interface and Data Contract`.
5. L1 `Ownership and Deferred Semantics`.
6. L2 test/evidence list.
7. Acceptance criteria.

## L2 - Implementation and Verification Contract

### Implementation Steps

1. Inventory current approval imports:
   - `rg -n "application/approval/|runApprovalFlow|RunApproval|runApprovalDecisionFlow|runRequestReworkFlow|reworkIntentQueue|remoteApprovalExecutionContext|requestReworkRemoteCloneSupport" src tests`
2. Create or rename to a deliberate internal approval pipeline owner under
   `src/v11/application/approval/internal/pipeline/**`.
3. Make the retained public approval API delegate to the pipeline through the
   existing normalization/dependency/error boundary.
4. Delete top-level pass-through wrapper files. Do not replace them with
   deprecated wrappers or forwarding aliases.
5. Move tests from old top-level helper imports to:
   - the public command API for public behavior,
   - the internal pipeline for route/effect ordering,
   - narrow internal helpers only where independent policy is being tested.
6. Preserve root, CLI, UI router, and contract runner imports through stable
   public API/contract paths.
7. Run final evidence scans for old wrappers, forwarding-only files, old public
   helper import paths, and retained top-level delegate review:
   - `rg -n -U "export\\s+(type\\s+)?\\*\\s+(as\\s+\\w+\\s+)?from\\s+[\"']\\./internal|export\\s+(type\\s+)?\\{[\\s\\S]*?\\}\\s+from\\s+[\"']\\./internal" src/v11/application/approval`
   - `rg -n "from [\"']\\./internal" src/v11/application/approval/*.ts`
   - `rg -n "application/approval/(runApprovalFlow|runApprovalDecisionFlow|runRequestReworkFlow|runApprovalDecisionFlowHandler|runApprovalFlowContext|runApprovalFlowContract|runApprovalFlowHandlers|runApprovalDecisionEffects|runApprovalDeferredRework|reworkIntentQueue|remoteApprovalExecutionContext|requestReworkRemoteCloneSupport|approvalRemoteExecutionContract|approvalRoutingEligibility|approvalResultMapping|approvalCommandOrchestration|approvalCommandDependencyResolution|approvalCommandErrorNormalization|approvalCommandInputNormalization)" src tests`
   - `rg -n --glob '!src/v11/application/approval/internal/**' --glob '!tests/**/approval/internal/**' "from [\"']\\.\\.?/[^\"']*(runApprovalFlow|runApprovalDecisionFlow|runRequestReworkFlow|runApprovalDecisionFlowHandler|runApprovalFlowContext|runApprovalFlowContract|runApprovalFlowHandlers|runApprovalDecisionEffects|runApprovalDeferredRework|reworkIntentQueue|remoteApprovalExecutionContext|requestReworkRemoteCloneSupport|approvalRemoteExecutionContract|approvalRoutingEligibility|approvalResultMapping|approvalCommandOrchestration|approvalCommandDependencyResolution|approvalCommandErrorNormalization|approvalCommandInputNormalization)(\\.[jt]s)?[\"']" src tests`
   - `rg -n "application/approval/internal/" src/index.ts src/cli/commands src/v11/defaults/ui tests/contracts/v11`
   The `from "./internal"` scan is an inspection input for the retained-surface
   inventory, not a zero-result gate. Any match must be classified in the
   inventory as either a legitimate non-forwarding public boundary/delegate or
   a forbidden forwarding facade that must be deleted.
8. Record the pipeline typed-boundary evidence in the implementation summary or
   commit message: file path(s) for `ApprovalCommandPipelineInput`,
   `ApprovalCommandPipelineDependencies`, `ApprovalCommandPipelineResult`, and
   `runApprovalCommandPipeline(...)`; the tests or typecheck coverage that prove
   the contracts are explicit; and confirmation that callers no longer
   reconstruct the pipeline contract from old helper call sites.
9. Record the retained top-level approval surface inventory and the deleted
   top-level approval wrapper list in the implementation summary or commit
   message. The retained inventory must name the final-state public
   API/contract/error/dependency/boundary-delegate category and non-test
   external consumers for each retained file. Any top-level approval file that
   still imports from `./internal/**` must be explicitly classified as a
   non-forwarding public boundary/delegate; import-then-export same-symbol
   compatibility wrappers fail this task.
10. Re-evaluate fitness drift.

### Required Tests and Evidence

| ID | Evidence | Purpose |
|---|---|---|
| T1 | Before/after import inventory | Prove broad helper consumers moved |
| T2 | Approval decision pipeline tests | Preserve approve/rework decision behavior |
| T3 | Immediate request-rework test | Preserve human approval state route |
| T4 | Deferred request-rework queue test | Preserve `WAITING_HUMAN` queue semantics |
| T5 | Started-remote approval route test | Preserve remote command routing |
| T6 | Remote-clone local request-rework fallback tests | Preserve authority proof and fail-closed behavior |
| T7 | Error normalization tests | Preserve public error boundary |
| T8 | CLI/root/UI/contract consumer tests | Preserve public behavior |
| T9 | Focused typecheck/lint | Prove import cleanup is complete |
| T10 | Final source scan | Prove no old pass-through public helper surface, type-only forwarding facade, absolute or relative compatibility forwarding import path, or direct approval-internal import from public root/CLI/UI/contract consumers remains |
| T11 | Retained surface inventory and ordering evidence | Prove retained top-level files are final-state boundaries and exact transcript/state/event ordering assertions or file references stayed covered |
| T12 | Delivery notification assertions | Prove approval decision and request-rework delivery notification behavior remains covered |
| T13 | Pipeline typed-boundary evidence | Prove `ApprovalCommandPipelineInput`, `ApprovalCommandPipelineDependencies`, `ApprovalCommandPipelineResult`, and `runApprovalCommandPipeline(...)` are explicit internal pipeline contracts |

### Default Verification Commands

Run focused checks first:

1. `pnpm exec vitest run tests/v11/application/approval`
2. `pnpm exec vitest run tests/contracts/v11/approval.contract.test.ts tests/contracts/v11/commit.contract.test.ts`
3. `pnpm exec vitest run tests/cli/requestReworkDeliveryWarning.test.ts tests/core/human/approval.test.ts tests/core/bubble/commitBubble.test.ts tests/core/bubble/watchdogBubble.test.ts tests/core/ui/router.test.ts`
4. `pnpm exec vitest run tests/tools/fitness/internalModuleBoundary.test.ts tests/tools/fitness/criticalSideEffect.test.ts`

Before declaring direct source changes complete, run the repository default
verification order from `AGENTS.md` unless the work is performed and validated
by a Pairflow bubble workflow that owns implementation validation:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. focused tests above
5. broader affected test suite when one exists
6. `pnpm test`
7. `pnpm build`

If any step is skipped, explain why in the final implementation summary.

### Acceptance Criteria

1. A command-local approval pipeline exists under a deliberate internal owner.
2. Public root/CLI/UI/contract consumers use the retained approval public API and
   do not import approval internals.
3. The old broad top-level helper wrapper surface is deleted. Any retained
   top-level file is justified as final intended public API/contract surface,
   not as backward compatibility.
4. The old `runApprovalFlow` vocabulary is not preserved as a public
   compatibility surface.
5. Approval decision, immediate rework, deferred rework, started-remote routing,
   verified remote-clone local request-rework behavior, delivery notification
   behavior, public error semantics, and transcript/state/event ordering remain
   unchanged.
6. Tests exercise the public API and the new pipeline seam rather than old
   wrapper files.
7. Final scans show no approval-lane internal re-export camouflage candidates
   for deleted old helper wrappers, including value and type-only forwarding
   facades from top-level approval files into `internal/**`.
8. Fitness drift is handled: either a relevant `tools/fitness/**` rule/test is
   updated, or the implementation summary explains why no new rule is needed.
9. Final scans show no deprecated approval compatibility aliases, old-path
   wrappers, or public forwarding files retained solely for migration comfort.
10. Every retained top-level approval file has a documented final-state owner:
    public command API, public contract, dependency boundary, error boundary, or
    public boundary/delegate. Deleted old wrapper files are listed separately.
    No retained file is justified by test convenience, migration comfort, or
    old import-path compatibility.
11. The implementation summary includes the retained top-level approval surface
    inventory and exact ordering evidence required by T11, including test names
    or file references for transcript append, state mutation, delivery
    notification, and lifecycle event emission relative ordering.
12. Delivery notification preservation has explicit evidence from focused
    approval/request-rework tests or an implementation-summary reference to the
    exact existing assertions that still cover it.
13. The internal pipeline has an explicit typed boundary with named input,
    dependency, and result contracts; implementation evidence identifies where
    those contracts live and which tests or typecheck coverage prove callers do
    not reconstruct the pipeline contract from old helper call sites.

## Hardening Backlog

1. Evaluate whether `shared/reviewer/**` and `shared/gates/**` should receive
   separate public-surface cleanup tasks after this approval lane task lands.
2. Consider moving any retained top-level approval contract file into an
   explicit `index.ts` or narrower public barrel only after root/CLI/UI import
   stability is proven.

## Parallelization Notes

1. This task may run in parallel with create-lane or list/merge follow-up work
   only if file scopes remain disjoint.
2. Do not run this task in parallel with work that changes:
   - `src/v11/shared/reviewer/**`,
   - `src/v11/shared/gates/**`,
   - approval decision protocol payloads,
   - UI action response contracts,
   - remote approval transport contracts.
3. If implementation discovers that public approval input/result contracts must
   change, stop and route to plan/task refinement before continuing.
