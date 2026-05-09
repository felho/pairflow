---
artifact_type: task
artifact_id: task_merge_command_local_remote_execution_pipeline_v1
title: "Merge Command Local/Remote Execution Pipeline"
status: draft
phase: phase1
target_files:
  - src/v11/application/merge/mergeCommandOrchestration.ts
  - src/v11/application/merge/mergeCommandContract.ts
  - src/v11/application/merge/mergeCommandDependencyResolution.ts
  - src/v11/application/merge/mergeCommandErrorClassification.ts
  - src/v11/application/merge/mergeCommandErrorNormalization.ts
  - src/v11/application/merge/mergeCommandErrorRuntime.ts
  - src/v11/application/merge/mergeCommandInputNormalization.ts
  - src/v11/application/merge/mergeFlowContext.ts
  - src/v11/application/merge/mergeFlowFinalization.ts
  - src/v11/application/merge/mergeResultMapping.ts
  - src/v11/application/merge/mergeRoutingEligibility.ts
  - src/v11/application/merge/remoteMergeExecutionContext.ts
  - src/v11/application/merge/runMergeFlow.ts
  - src/v11/application/merge/internal/pipeline/**
  - tests/v11/application/merge/**
  - tests/contracts/v11/merge.contract.runner.ts
  - tests/contracts/v11/merge.contract.test.ts
  - tests/contracts/v11/cases/merge/**
  - tests/cli/bubbleMergeCommand.test.ts
  - tests/core/bubble/mergeBubble.test.ts
  - tests/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/architecture/v11-placement-and-extraction-governance.md
normative_refs:
  - docs/architecture/v11-architecture-overview.md
  - docs/architecture/v11-placement-and-extraction-governance.md
  - docs/architecture/v11-internal-module-boundaries.md
  - plans/archive/tasks/refactoring/commit-command-local-remote-execution-pipeline.md
owners:
  - "felho"
archive_group: refactoring
archive_path: plans/archive/tasks/refactoring/merge-command-local-remote-execution-pipeline.md
---

# Task: Merge Command Local/Remote Execution Pipeline

## Current Codebase Check (2026-05-09)

1. `src/v11/application/merge/mergeCommandOrchestration.ts` is already a thin public command boundary:
   - normalize input,
   - resolve dependencies,
   - call `runMergeFlow(...)`,
   - normalize public merge errors.
2. `src/v11/application/merge/runMergeFlow.ts` currently owns the visible production orchestration for `bubble merge`:
   - initialize the merge execution context,
   - choose local vs started-remote route,
   - enforce started-remote post-cleanup flag restrictions,
   - execute remote merge command,
   - validate and import the remote merge handoff ref,
   - merge the selected revision into the base branch,
   - push the base branch and/or delete the remote bubble branch for local merge,
   - finalize local or remote cleanup,
   - build the public `MergeBubbleResult`.
3. `src/v11/application/merge/mergeFlowContext.ts` already owns significant context preparation:
   - resolve bubble identity,
   - read local state,
   - canonicalize execution path,
   - decide whether SSH executor uses started-remote merge,
   - refuse remote-inner merge while source-repo remote artifacts remain,
   - import remote commit continuity for merge before state eligibility checks,
   - assert local and remote merge prerequisites.
4. `src/v11/application/merge/mergeFlowFinalization.ts` already owns cleanup/finalization effects:
   - local tmux/runtime/worktree cleanup,
   - local state timestamp persistence,
   - remote source-state reconcile,
   - remote cleanup command execution,
   - remote cleanup proof validation,
   - lifecycle event emission.
5. The lower-level pieces have useful identities, but `runMergeFlow.ts` remains a shallow orchestration module: route policy, remote handoff import policy, local git merge, publication steps, finalization invocation, and result mapping all remain visible in one file.
6. The architecture docs require important `v11` extracts to use explicit typed boundaries and the narrowest correct scope. This task should deepen a command-local merge pipeline, not promote merge workflow policy into `shared`.
7. No public behavior change is currently authorized. The implementation should preserve existing merge semantics and fully eliminate the old `runMergeFlow.ts` orchestration shape rather than leaving a transitional wrapper, compatibility alias, or facade.

## Task-Mode Readiness Self-Check (2026-05-09)

1. `execution_metadata_gate`: not applicable for this standalone architecture task because `plan_ref: null` and no parent plan tracker is claiming sequencing authority.
2. `target_file_reality_check`: matches the current codebase.
   - `mergeCommandOrchestration.ts` is already a public command boundary.
   - `runMergeFlow.ts` currently owns route selection and route-effect ordering.
   - `mergeFlowContext.ts`, `mergeFlowFinalization.ts`, `mergeRoutingEligibility.ts`, and `remoteMergeExecutionContext.ts` already contain focused pieces that should be retained or moved under the new internal pipeline according to ownership.
   - `src/v11/application/merge/internal/pipeline/**` does not currently exist and is the intended new command-local placement.
3. `control_model_readiness`: ready. The task names the merge result authority, remote handoff authority, cleanup proof authority, missing-data fail-closed behavior, forbidden local fallback, and allowed remote continuity import resolution path.
4. `closed_contract_drift`: no semantic drift authorized. Existing public input/result contracts, CLI behavior, remote merge transport contracts, state preconditions, git side-effect semantics, and cleanup proof rules remain fixed.
5. `authority_fan_out`: acceptable for one bounded command-local refactor because public API, context preparation, local route, remote route, git side effects, publication, handoff import, and finalization are named separately and remain within `application/merge`.
6. `closure_budget`: acceptable. The task owns one existing command workflow activation path (`bubble merge`) and does not introduce a new CLI surface or cross-command abstraction.
7. `bounded_task_shape`: acceptable. The task is intentionally narrow to the merge command pipeline and its tests; unrelated lifecycle commands, shared remote transport changes, UI runtime config changes, list read-model projection, and watchdog escalation remain out of scope.
8. `contract_dense_gate`: satisfied by the Canonical Contract Matrix plus mirrored-surface checklist. The matrix is the source of truth for route/effect/error semantics; mirrored L0/L1/L2 prose must stay subordinate to it.
9. `capability_closure`: `end_to_end` for the existing `bubble merge` runtime path only. This task adds no new user capability; it preserves the existing activation path while moving orchestration behind an internal pipeline boundary.

## Complexity-Risk Triage

1. `risk_score`: 6.
2. `identity_join_risk`: 2.
   - The started-remote route joins bubble id, remote pointer, remote target, base branch, bubble branch, handoff import ref, and imported commit SHA.
3. `surface_spread`: 2.
   - The task touches one command-local application lane plus focused CLI/core/contract tests.
4. `activation_coupling`: 1.
   - The existing `bubble merge` activation path remains unchanged; this task changes internal route ownership only.
5. `prerequisite_risk`: 1.
   - Correctness depends on preserving `DONE` state, clean repo, branch eligibility, started remote pointer, handoff import, and cleanup proof prerequisites.
6. `split_decision`: single task accepted.
   - Rationale: public/shared contracts do not change, no new persisted authority is introduced, and the refactor closes one command-local route/effect ownership problem.
7. `authority_source_of_truth_note`: the authoritative merge result remains the existing `MergeBubbleResult` derived from local merge success plus route-specific finalization proof. The task moves orchestration ownership only; it does not change what proves merge success.

## Closure and Shape Triage

1. `primary_shape`: `consumer_family_alignment`.
   - The bounded slice aligns the merge command's internal execution consumers behind one command-local pipeline Interface.
2. `secondary_shape`: `cleanup_recovery_consumers`.
   - Cleanup/reconcile proof stays in scope because local and started-remote cleanup are part of the existing merge success boundary.
3. `closure_buckets_touched`:
   - `internal_execution_consumers`: merge route execution and side-effect ordering.
   - `workflow_orchestration_consumers`: public command orchestration delegates to the pipeline.
   - `cleanup_recovery_consumers`: local cleanup and remote cleanup proof remain required before success.
4. `collapsed_closures`: internal route execution and cleanup proof are intentionally collapsed because both are owned by the same `bubble merge` command success boundary and share the same public result contract.
5. `deferred_closures`:
   - list/status projection,
   - watchdog escalation,
   - shared remote transport redesign,
   - new public merge activation or CLI behavior.
6. `precondition_side_effect_boundary`: all state, dirty-repo, branch, remote pointer, remote-inner, flag, handoff, and cleanup-proof preconditions named in the Canonical Contract Matrix must pass before the side effects listed in that row may claim success.

## L0 - Policy

### Goal

Deepen the merge command by introducing one command-local execution pipeline that hides local/remote route selection, remote handoff import, git side-effect ordering, publication, cleanup, and result construction behind a narrow application-local Interface.

The business question this task should make explicit is:

> Given a completed bubble and the configured execution authority, what is the single durable merge result, and which local or started-remote handoff path is authoritative for it?

Callers should not manually orchestrate remote pointer checks, remote merge execution, handoff import, local git merge, optional publication, local/remote cleanup, state reconciliation, lifecycle event emission, and result mapping as separate workflow decisions.

### Context

`bubble merge` is a state-changing lifecycle command. Its correctness depends on strict ordering across authority checks and irreversible side effects:

1. Local execution derives authority from local bubble `DONE` state, local branch eligibility, local git merge result, optional origin operations, and local cleanup.
2. Started-remote execution derives authority from a started remote pointer, imported remote commit continuity when needed, remote merge handoff payload, successful import of the remote handoff ref, local merge of the imported revision, local state reconcile, remote cleanup proof, and lifecycle event emission.

The current code has the right policy pieces, but `runMergeFlow.ts` remains the visible route/effect owner. This task should make the top-level command orchestration remain a public API boundary and move production orchestration under `src/v11/application/merge/internal/pipeline/**`.

### Chosen Architecture Direction

1. Create a command-local pipeline module under `src/v11/application/merge/internal/pipeline/**`.
2. Keep public command exports in `src/v11/application/merge/mergeCommandOrchestration.ts`.
3. Keep merge workflow policy in `application/merge`; do not move merge route policy into `shared`.
4. Keep remote merge transport contracts in `shared/remote/remoteMergeContract.ts` only as transport vocabulary and ports, not as the merge command policy owner.
5. Preserve the public `MergeBubbleInput`, `MergeBubbleResult`, `MergeBubbleDependencies`, error normalization, CLI output, remote transport payload contracts, and lifecycle behavior.
6. Do not introduce a public dry-run, preview, diagnostics API, or new merge mode in this task.

### In Scope

1. Introduce one narrow command-local pipeline function named `runMergeCommandPipeline(...)`.
2. Make `mergeBubbleCommandOrchestration(...)` delegate to that pipeline through the existing public normalization/dependency/error boundary.
3. Delete the old top-level `runMergeFlow.ts` route orchestrator.
   - Move the route orchestration into `internal/pipeline/**`.
   - Do not keep a thin facade, compatibility alias, deprecated wrapper, or transitional export for `runMergeFlow(...)`.
   - Migrate every production and test import to either the public command boundary or the exact new internal owner.
4. Preserve local route ordering:
   - resolve bubble and bubble identity,
   - read state,
   - require `DONE`,
   - require clean repo working tree,
   - require valid base and bubble branches,
   - checkout base branch,
   - merge bubble branch with `--no-ff --no-edit`,
   - abort failed git merge before throwing the merge conflict error,
   - resolve merge commit SHA,
   - optionally push base branch to origin,
   - optionally delete remote bubble branch,
   - finalize local cleanup and state timestamp,
   - emit the merge lifecycle event,
   - return the canonical `MergeBubbleResult`.
5. Preserve started-remote route ordering:
   - resolve bubble and bubble identity,
   - require a valid started remote pointer unless executing inside the matching remote clone,
   - refuse remote-inner continuation while source-repo remote artifacts are still present,
   - resolve the remote target,
   - require clean local repo and valid base branch,
   - import remote commit continuity when local state is not already `DONE`,
   - require `DONE` after continuity import,
   - reject `--push` and `--delete-remote` for started-remote merge pre-cleanup handoff mode,
   - execute the remote merge command,
   - validate the remote handoff payload,
   - fetch the handoff ref from the remote clone into the local import ref,
   - resolve and verify the imported commit SHA,
   - merge the imported revision into the local base branch,
   - persist local state timestamp/reconcile,
   - execute remote cleanup,
   - validate remote cleanup identity and proof,
   - emit the merge lifecycle event,
   - return the canonical `MergeBubbleResult` with `presentationRoute: "started_remote"`.
6. Move route-specific helpers out of `runMergeFlow.ts` into the new pipeline module or delete/replace them:
   - `mergeRevisionIntoBase`,
   - `runMergeRemoteOperations`,
   - `buildRemoteCloneGitUrl`,
   - `isRemoteMergeImportSource`,
   - `assertRemoteMergeHandoffMatches`,
   - `fetchRemoteMergeImportRef`,
   - `resolveImportedMergeCommitSha`,
   - `importRemoteMergeHandoff`.
7. Keep lower-level modules when they remain focused:
   - `mergeRoutingEligibility.ts` for eligibility checks,
   - `remoteMergeExecutionContext.ts` for remote-inner environment parsing/canonicalization,
   - `mergeFlowFinalization.ts` or a renamed internal finalization owner for cleanup/reconcile/event effects,
   - `mergeResultMapping.ts` for result construction.
   - These lower-level modules are not the forbidden old route helper surface when they remain focused and explicitly typed.
8. Add or move application-level tests under `tests/v11/application/merge/**` for the new pipeline Interface. Existing CLI/core/contract tests remain public behavior coverage.
9. Add final evidence scans proving the deleted `runMergeFlow.ts` module and its former route-orchestration helpers no longer exist as a top-level import surface, and the new application-local pipeline owns the route/effect contract.

### Out of Scope

1. Changing `MergeBubbleInput`, `MergeBubbleResult`, or `MergeBubbleDependencies` public meaning.
2. Changing CLI flags, command names, default values, or user-facing text except unavoidable internal stack traces/import paths in tests.
3. Changing remote merge transport payload names, remote handoff payload shape, remote cleanup payload shape, or SSH executor implementation.
4. Changing merge state precondition semantics: `bubble merge` still requires `DONE`.
5. Changing git merge strategy or command arguments.
6. Changing remote pointer file format.
7. Adding support for started-remote `--push` or `--delete-remote`.
8. Changing local cleanup semantics or remote cleanup proof requirements.
9. Broad cleanup of unrelated lifecycle commands, list read-model projection, watchdog escalation, or shared remote transport contracts.
10. Retaining backwards-compatible import paths for the old merge flow helper surface.

### Control Model

1. `business_invariant`: `bubble merge` must produce exactly one durable `MergeBubbleResult` or fail before claiming merge success.
2. `control_model`: the authoritative merge result is either the local git merge plus local finalization/cleanup result, or a started-remote handoff imported into the source repo and then merged/finalized locally with proven remote cleanup.
3. `read_path_rule`: local execution may read local state, local branches, and origin remote status through existing ports; started-remote execution may read the remote pointer, remote target, imported remote continuity, remote merge handoff, and remote cleanup proof through existing remote ports.
4. `forbidden_fallback`: do not silently fall back from started-remote merge to local bubble-branch merge when the configured executor requires remote merge and remote pointer, continuity import, remote command execution, handoff import, or cleanup fails.
5. `allowed_resolution_path`: remote commit continuity import may satisfy the local `DONE` state prerequisite when it imports valid authoritative remote continuity for the same bubble before merge route execution.
6. `missing_data_rule`: missing remote pointer, invalid remote handoff, handoff mismatch, handoff import failure, unresolved remote target, non-`DONE` state after continuity import, dirty repo, missing branch, and missing cleanup proof must fail closed through existing `BubbleMergeError` semantics.
7. `phase_boundary`: this task owns internal execution orchestration closure for merge. It does not own new payload production, UI consumption, external activation, or cross-command remote transport redesign.

### Closed-Contract Drift Check

1. `source_anchors`:
   - `src/v11/application/merge/mergeCommandOrchestration.ts`
   - `src/v11/application/merge/mergeCommandContract.ts`
   - `src/v11/application/merge/mergeFlowContext.ts`
   - `src/v11/application/merge/mergeFlowFinalization.ts`
   - `src/v11/application/merge/mergeRoutingEligibility.ts`
   - `src/v11/application/merge/remoteMergeExecutionContext.ts`
   - `src/v11/shared/remote/remoteMergeContract.ts`
   - `src/v11/shared/remote/commitRemoteExecution.ts`
   - `tests/contracts/v11/cases/merge/**`
2. `canonical_elements`:
   - bubble identity,
   - loaded bubble state,
   - `DONE` precondition,
   - base branch,
   - bubble branch,
   - remote pointer when executor is SSH,
   - remote target,
   - imported remote commit continuity for merge,
   - remote merge handoff import source,
   - local merge commit SHA,
   - final cleanup outcome,
   - `MergeBubbleResult`.
3. `guard_elements`:
   - clean repo working tree,
   - branch existence and non-identical branch guard,
   - origin remote guard for local push/delete-remote,
   - remote started pointer requirement,
   - remote-inner source artifact refusal,
   - remote handoff identity/branch/ref/commit checks,
   - remote cleanup identity and proof checks,
   - no local fallback for started-remote failures.
4. `compat_elements`:
   - none. This task must not preserve old merge flow import paths or introduce compatibility shims.
   - Existing public result spelling, reason codes, and reused ports are preserved as canonical/guard elements above, not as compatibility surfaces.
5. `closed_terms`: `merge`, `started_remote`, `remote merge handoff`, `remote commit continuity`, `remote cleanup proof`, `DONE`, `baseBranch`, `bubbleBranch`, `mergeCommitSha`, `presentationRoute`.
6. `forbidden_reinterpretations`:
   - do not treat remote handoff import as advisory after remote merge succeeds,
   - do not treat missing remote pointer as permission to merge the local bubble branch,
   - do not return success before the imported revision has been merged locally,
   - do not return success before remote cleanup proof is validated for started-remote merge,
   - do not reinterpret cleanup failures as warnings,
   - do not widen `shared/remote/**` into merge command workflow ownership.
7. `drift_status`: intended `clarified_without_semantic_change`.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Rationale: this is an internal application orchestration refactor. Public CLI/API inputs, protocol payloads, state names, result shapes, reason-code semantics, and remote transport contracts must remain unchanged.
3. If implementation discovers that changing public merge inputs/results, remote merge transport payloads, remote pointer format, cleanup proof semantics, or state-machine semantics is necessary, stop and route back to task refinement or a Plan -> Task chain.

## L1 - Change Contract

### 1) Call-Site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/merge/mergeCommandOrchestration.ts` | `mergeBubbleCommandOrchestration` | Keep public input normalization, dependency resolution, and error normalization; delegate execution to one command-local pipeline | P1 | required-now | T1,T2,T10,AC1 |
| CS2 | `src/v11/application/merge/internal/pipeline/**` | `runMergeCommandPipeline` | Own context preparation, route selection, route execution, finalization invocation, and result construction | P1 | required-now | T1-T9 |
| CS3 | `src/v11/application/merge/internal/pipeline/**` | context preparation step | Resolve bubble identity, local state, executor context, remote pointer, remote target, local branch prerequisites, and remote continuity import with existing guards | P1 | required-now | T2,T3,T5 |
| CS4 | `src/v11/application/merge/internal/pipeline/**` | local route step | Preserve local git merge -> optional origin ops -> finalization -> result ordering | P1 | required-now | T4,T8 |
| CS5 | `src/v11/application/merge/internal/pipeline/**` | started-remote route step | Preserve remote command -> handoff import -> local merge -> local reconcile -> remote cleanup -> result ordering | P1 | required-now | T5,T6,T7,T8 |
| CS6 | `src/v11/application/merge/runMergeFlow.ts` | old top-level flow entry | Delete this file; no top-level route helper, facade, or compatibility wrapper may remain | P1 | required-now | T1,T10,AC2 |
| CS7 | `src/v11/application/merge/mergeFlowContext.ts` | execution context preparation | Either move under `internal/pipeline/**` or remain focused on typed context preparation; no route execution or result authority | P1 | required-now | T2,T3,T5 |
| CS8 | `src/v11/application/merge/mergeFlowFinalization.ts` | finalization effects | Remain lower-level cleanup/reconcile/event helper or move under internal pipeline; no route selection or remote handoff import authority | P1 | required-now | T7,T8 |
| CS9 | `src/v11/application/merge/mergeRoutingEligibility.ts` | eligibility helpers | Remain pure/port-backed guard helpers; no pipeline orchestration or result authority | P2 | required-now | T3,T4 |
| CS10 | `tests/v11/application/merge/**` | application-level merge tests | Cover route order and branch behavior through the new pipeline or public command boundary | P1 | required-now | T1-T8 |
| CS11 | `tests/contracts/v11/merge.contract.*` and `tests/contracts/v11/cases/merge/**` | public contract tests | Prove the public merge contract remains stable | P1 | required-now | T9 |

### 2) Canonical Contract Matrix

| Condition | Required Owner | Required Route/Effect | Forbidden Behavior | Required Evidence |
|---|---|---|---|---|
| local executor and state is `DONE` with clean repo and valid branches | local route step | checkout base, merge bubble branch, resolve merge SHA, run optional origin ops, finalize local cleanup, emit lifecycle event, return local result | lifecycle event or success result before merge SHA and cleanup outcome are known | T4,T8 |
| local executor and state is not `DONE` | context preparation step | throw existing merge precondition error before git/cleanup side effects | running git merge from a non-`DONE` state | T2,T4 |
| local executor and repo has blocking uncommitted changes | context preparation step | throw `MERGE_REPO_DIRTY` before checkout/merge | partial checkout/merge before dirty repo guard | T3,T4 |
| local executor and base/bubble branch is missing or identical | context preparation step | throw existing branch eligibility error before merge | attempting merge with unresolved branch truth | T3,T4 |
| local executor with `push` or `deleteRemote` | publication step | require origin remote; push base and/or delete remote bubble branch after merge commit exists | publishing before local merge success; silently ignoring origin failures | T4,T8 |
| local git merge conflict or merge command failure | git merge step | run `git merge --abort` best-effort, then throw existing manual-resolution error | returning synthetic merge success or leaving failure unclassified | T4,T9 |
| SSH executor and remote pointer missing/not started in source repo | remote context step | throw `MERGE_REMOTE_START_REQUIRED` | local fallback merge | T3,T5 |
| SSH executor inside matching remote clone while source remote artifacts remain | remote context step | throw `MERGE_REMOTE_START_REQUIRED` with remote-inner refusal context | continuing remote-inner merge from stale source artifacts | T3,T5 |
| started-remote merge with `push` or `deleteRemote` | remote route guard | throw `MERGE_REMOTE_POST_CLEANUP_FLAGS_UNSUPPORTED` before remote command | attempting mixed remote handoff plus local publication cleanup | T5 |
| remote continuity import yields `DONE` state | remote context step | accept imported local state as same-authority resolution path and continue remote merge | treating imported continuity as advisory or bypassing state check | T5,T6 |
| remote continuity import does not produce `DONE` state | remote context step | throw existing merge precondition error before remote command | executing remote merge from invalid local lifecycle state | T5,T6 |
| remote command succeeds | remote route step | validate handoff payload, import handoff ref, verify commit SHA, merge imported revision locally | returning success before local merge of imported revision | T6,T7 |
| remote handoff payload invalid or mismatched | remote handoff import step | throw `MERGE_REMOTE_HANDOFF_INVALID` | accepting mismatched branch/ref/commit truth | T6,T9 |
| handoff ref fetch or commit resolution fails | remote handoff import step | throw `MERGE_REMOTE_IMPORT_FAILED` | local fallback or raw git error leak | T6,T9 |
| local merge of imported remote revision succeeds | remote route step | persist local state timestamp/reconcile, execute remote cleanup, validate cleanup proof, emit lifecycle event, return started-remote result | returning success before local reconcile and remote cleanup proof | T7,T8 |
| local reconcile after remote merge fails | finalization step | throw `MERGE_REMOTE_RECONCILE_FAILED` | claiming success with unsynchronized local state timestamp | T7 |
| remote cleanup command fails or proof is missing | finalization step | throw existing remote cleanup error/proof reason code | downgrading cleanup failure to warning or partial success | T7,T9 |

### 3) Interface and Data Contract

#### External Interface

The public runtime-facing API remains unchanged:

```ts
mergeBubbleCommandOrchestration(
  input: MergeBubbleInput,
  dependencies?: MergeBubbleDependencies
): Promise<MergeBubbleResult>
```

`mergeBubbleCommandOrchestration(...)` should keep public normalization and `throwAsBubbleMergeError(...)`, but it should not own route selection or side-effect ordering.

#### Internal Pipeline Interface

Required command-local entry:

```ts
runMergeCommandPipeline(
  input: RunMergeFlowInput,
  dependencies: ResolvedMergeCommandDependencies
): Promise<MergeBubbleResult>
```

Allowed implementation variants:

1. Keep `RunMergeFlowInput` as the pipeline input if it remains the existing normalized internal command contract.
2. Rename the internal input type only if every consumer is updated and the public external contract remains unchanged.
3. Keep or move `MergeFlowExecutionContext` types according to the narrowest correct owner:
   - if only the pipeline uses them, move them under `internal/pipeline/**`;
   - if finalization or tests need them, export explicit types from an internal contract file.

#### Structured Contract Rules

1. `MergeBubbleResult.presentationRoute` remains exactly `"local" | "started_remote"`.
2. `MergeBubbleResult.mergeCommitSha` remains the local base-branch merge commit SHA, including the remote route after the imported remote revision is merged locally.
3. Started-remote handoff import source must remain:
   - `kind: "git_ref"`,
   - non-empty `ref`,
   - non-empty `commitSha`.
4. Started-remote handoff validation must retain:
   - `baseBranch` equality,
   - `bubbleBranch` equality,
   - `cleanupPending === true`,
   - import ref equality with `buildMergeImportRef(bubbleId)`,
   - imported commit SHA equality.
5. Remote cleanup result validation must retain:
   - bubble id equality,
   - base branch equality,
   - bubble branch equality,
   - remote clone path equality,
   - proof that any existing tmux/runtime/worktree/branch artifact was cleaned.
6. Unknown fields in remote transport payloads remain governed by existing remote transport parsing/contract tests. This task must not add new acceptance or rejection behavior.

### 4) Ownership and Deferred Semantics

1. This task owns the merge command-local pipeline boundary and the route/effect ordering inside `application/merge`.
2. This task records and consumes remote merge handoff payloads but does not redefine the shared remote merge transport contract.
3. This task consumes remote commit continuity as a same-authority resolution path for the merge `DONE` precondition, but does not redefine commit continuity production.
4. This task records lifecycle event metadata through the existing event port but does not change event schema or downstream analytics semantics.
5. This task does not own list/status projection of remote merge state, watchdog escalation, or UI behavior.
6. Forbidden inference: do not infer public API support from any new internal pipeline file; the only public command surface remains the existing command orchestration and exported public types.
7. Forbidden compatibility path: do not preserve `runMergeFlow.ts`, `runMergeFlow(...)`, or any old top-level merge flow import as a wrapper around the new pipeline.

### 5) Mirrored Surface Checklist

When any row in the Canonical Contract Matrix changes, keep these surfaces aligned:

1. L0 `In Scope` route ordering.
2. L0 `Control Model`.
3. L0 `Closed-Contract Drift Check`.
4. L1 `Call-Site Matrix`.
5. L1 `Interface and Data Contract`.
6. L1 `Structured Contract Rules`.
7. L2 test/evidence list.
8. Acceptance criteria.

The Canonical Contract Matrix is the source of truth. Other sections may summarize it but must not introduce an independent route/error contract.

## L2 - Implementation and Verification Contract

### Implementation Steps

1. Inventory current imports of merge application files:
   - `rg -n "application/merge|../merge|./merge" src tests`
   - classify imports of `runMergeFlow`, `mergeFlowContext`, `mergeFlowFinalization`, and helper modules as public command use, internal implementation use, defaults composition use, or test-only use.
2. Create `src/v11/application/merge/internal/pipeline/**` with an explicit typed boundary.
3. Move route orchestration from `runMergeFlow.ts` into `runMergeCommandPipeline(...)`.
4. Split route-specific implementation into narrow internal modules when it improves locality:
   - context preparation,
   - local route execution,
   - started-remote route execution,
   - remote handoff import,
   - local git merge step,
   - local publication step,
   - result construction bridge.
5. Make `mergeBubbleCommandOrchestration(...)` call the new pipeline.
6. Delete `runMergeFlow.ts` after imports are migrated. Do not shrink it into a facade.
7. Move or keep `mergeFlowContext.ts` and `mergeFlowFinalization.ts` according to narrowest correct ownership; if retained top-level, ensure they remain focused and explicitly typed.
8. Update tests to target the new pipeline boundary where route/effect sequencing is the subject, and the public command boundary where CLI/API behavior is the subject.
9. Run import/evidence scans to prove no deleted helper path remains in production code.
10. Re-evaluate architecture fitness drift:
    - This task changes lifecycle command orchestration boundaries and remote execution-context handling.
    - Check whether `tools/fitness/**` needs a new or updated rule.
    - If no fitness change is needed, record why in the progress/commit note.

### Required Tests and Evidence

| ID | Evidence | Purpose |
|---|---|---|
| T1 | Focused import inventory before and after implementation | Prove public/internal merge surfaces are intentional |
| T2 | Unit tests for pipeline delegation from public command boundary | Prove public orchestration delegates without route helper leakage |
| T3 | Context/precondition tests for state, dirty repo, branch, remote pointer, and remote-inner guards | Prove side effects do not run before preconditions |
| T4 | Local route tests covering git merge success, conflict abort, optional push, optional delete-remote, and result mapping | Prove local route ordering |
| T5 | Started-remote route guard tests covering missing pointer, source artifact refusal, flag rejection, and post-continuity `DONE` requirement | Prove remote route fail-closed behavior |
| T6 | Remote handoff import tests covering invalid payload, mismatched base/bubble/ref/commit, fetch failure, and commit resolution failure | Prove handoff authority remains closed |
| T7 | Remote finalization tests covering local reconcile failure, cleanup command failure, invalid cleanup identity, and missing cleanup proof | Prove remote success is not claimed too early |
| T8 | Lifecycle event/final result tests for local and started-remote routes | Prove observable result semantics remain stable |
| T9 | Existing merge contract tests | Prove public contract stability |
| T10 | Final source scan for `runMergeFlow`, `src/v11/application/merge/runMergeFlow.ts`, and former same-file route-orchestration helpers | Prove the old route-orchestration surface is fully removed without treating retained lower-level modules as violations |

### Default Verification Commands

Run the narrowest relevant checks first:

1. `pnpm exec vitest run tests/v11/application/merge`
2. `pnpm exec vitest run tests/contracts/v11/merge.contract.test.ts tests/contracts/v11/merge.contract.runner.ts`
3. `pnpm exec vitest run tests/cli/bubbleMergeCommand.test.ts tests/core/bubble/mergeBubble.test.ts tests/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.test.ts`

Before declaring direct source changes complete, run the repo default verification order from `AGENTS.md` unless the work is performed and validated by a Pairflow bubble workflow that owns implementation validation:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. relevant focused tests above
5. broader affected test suite when one exists
6. `pnpm test`
7. `pnpm build`

If any step is skipped, explain why in the final implementation summary.

### Acceptance Criteria

1. `mergeBubbleCommandOrchestration(...)` remains the public command boundary and preserves public error normalization.
2. A command-local `runMergeCommandPipeline(...)` exists under `src/v11/application/merge/internal/pipeline/**`.
3. `runMergeFlow.ts` is deleted. No facade, compatibility alias, deprecated wrapper, or transitional export remains for the old merge flow surface.
4. Local route ordering matches the Canonical Contract Matrix.
5. Started-remote route ordering matches the Canonical Contract Matrix.
6. Remote handoff validation and cleanup proof semantics remain unchanged.
7. Public `MergeBubbleInput`, `MergeBubbleResult`, `MergeBubbleDependencies`, reason-code behavior, CLI behavior, and remote transport contracts remain unchanged.
8. Tests cover pipeline route/effect behavior at the new Interface and public behavior through existing CLI/core/contract surfaces.
9. Evidence scans show no production or test code imports the deleted `runMergeFlow` module or its former same-file route-orchestration helpers. Retained focused modules such as `mergeFlowContext.ts`, `mergeFlowFinalization.ts`, `mergeRoutingEligibility.ts`, `remoteMergeExecutionContext.ts`, and `mergeResultMapping.ts` are allowed when their final ownership is explicit and they do not own route sequencing.
10. Fitness drift is handled: either a relevant `tools/fitness/**` rule is updated, or the progress/commit note explains why no new rule is needed.

## Hardening Backlog

1. N/A for current draft. No later-hardening items are intentionally carried outside the required route/effect refactor.

### Parallelization Notes

1. This task may run in parallel with a list read-model projection refactor only if file scopes remain disjoint:
   - this task owns `src/v11/application/merge/**` and merge tests;
   - the list task owns `src/v11/application/list/**` and list tests.
2. This task should not run in parallel with another task that changes:
   - `src/v11/shared/remote/remoteMergeContract.ts`,
   - `src/v11/shared/remote/commitRemoteExecution.ts`,
   - state-machine semantics,
   - execution-context ownership,
   - lifecycle command close ordering.
3. If a parallel task needs shared remote contract changes, stop and route to plan/task refinement before implementation.
