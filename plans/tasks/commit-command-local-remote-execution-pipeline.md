---
artifact_type: task
artifact_id: task_commit_command_local_remote_execution_pipeline_v1
title: "Commit Command Local/Remote Execution Pipeline"
status: approved
phase: phase1
target_files:
  - src/v11/application/commit/commitCommandApi.ts
  - src/v11/application/commit/commitCommandApiContract.ts
  - src/v11/application/commit/commitCommandContract.ts
  - src/v11/application/commit/commitCommandFinalization.ts
  - src/v11/application/commit/commitCommandFinalizationMutation.ts
  - src/v11/application/commit/commitCommandGitStep.ts
  - src/v11/application/commit/commitCommandRuntime.ts
  - src/v11/application/commit/remoteCommitExecutionContext.ts
  - src/v11/application/commit/internal/pipeline/**
  - tests/v11/application/commit/**
  - tests/contracts/v11/commit.contract.runner.ts
  - tests/contracts/v11/commit.contract.test.ts
  - tests/contracts/v11/cases/commit/**
prd_ref: null
plan_ref: null
system_context_ref: docs/architecture/v11-placement-and-extraction-governance.md
normative_refs:
  - docs/architecture/v11-architecture-overview.md
  - docs/architecture/v11-placement-and-extraction-governance.md
  - docs/architecture/v11-internal-module-boundaries.md
  - docs/actor-runtime-interface/execution-authority-contract-note-v1.md
owners:
  - "felho"
---

# Task: Commit Command Local/Remote Execution Pipeline

## Current Codebase Check (2026-05-09)

1. `src/v11/application/commit/commitCommandApi.ts` currently owns the visible production orchestration for `commitBubble(...)`:
   - normalize `now`, `stageAll`, `force`, and `refs`,
   - resolve bubble identity and executor context,
   - choose local vs remote commit route,
   - guard `APPROVED_FOR_COMMIT`,
   - import remote commit continuity,
   - run remote commit execution,
   - sync remote continuity artifacts back to the source repo,
   - run the local git commit step,
   - append `COMMIT_RESULT`,
   - persist `COMMITTED` then `DONE`,
   - emit the commit lifecycle event.
2. The current implementation is functionally meaningful, but `commitBubble(...)` and its same-file private helpers expose route choice, continuity import, side-effect order, and local finalization as caller-level API-file orchestration.
3. The existing lower-level pieces already have useful identities:
   - `commitCommandGitStep.ts`
   - `commitCommandFinalization.ts`
   - `commitCommandFinalizationMutation.ts`
   - `remoteCommitExecutionContext.ts`
   - `commitCommandRuntime.ts`
4. The architecture docs require important `v11` extracts to use explicit typed boundaries and the narrowest correct scope. This task should deepen an application-local commit pipeline, not promote commit workflow policy into `shared`.
5. No blocking product question is currently known. The implementation should preserve existing commit semantics and produce a clean final module shape, not a transitional wrapper over the old API-file helper layout.

## ReviewSpec Task-Mode Readiness Check (2026-05-09)

1. `review_result`: `approve_task`
2. `execution_metadata_gate`: not applicable for this legacy standalone task because `plan_ref: null`, the filename predates the ExecutePairflowPlan V1 derived-task-id convention, and no parent plan tracker is claiming sequencing authority for this task.
3. `target_file_reality_check`: matches the task boundary.
   - `commitCommandApi.ts` currently contains `prepareCommitExecutionContext`, `commitRemoteExecutionRoute`, `commitLocalExecutionRoute`, `importRemoteCommitContinuityForCommit`, `syncRemoteCommitContinuity`, and `buildCommitLifecycleContext`.
   - `commitCommandApiContract.ts` currently exports `CommitExecutionContext`, `CommitRuntimeContext`, and `RemoteCommitRuntimeContext`; `commitCommandGitStep.ts` and `commitCommandFinalization.ts` currently depend on `CommitRuntimeContext`.
   - `src/v11/application/commit/internal/pipeline/**` does not currently exist and is the intended new command-local placement.
4. `control_model_readiness`: ready. The task names the commit result authority, missing-data fail-closed behavior, forbidden remote-to-local fallback, and allowed imported-continuity resolution path.
5. `closed_contract_drift`: no semantic drift authorized. Existing public API/result/protocol/state/remote transport contracts are explicitly preserved, and any discovered need to change them routes back to task refinement or Plan -> Task work.
6. `authority_fan_out`: acceptable for one bounded command-local refactor because public API, workflow pipeline, git side effect, finalization, remote context, and remote transport authorities are named separately.
7. `closure_budget`: acceptable. The task owns one end-to-end command workflow activation path, not a new CLI surface or cross-command abstraction.
8. `bounded_task_shape`: acceptable. The task is intentionally narrow to the commit command pipeline and its tests; unrelated lifecycle commands, shared remote transport changes, and UI/runtime config changes remain out of scope.
9. `contract_dense_gate`: satisfied by the Canonical Contract Matrix plus mirrored-surface checklist. The matrix is the source of truth for route/effect/error semantics; mirrored L0/L1/L2 prose must be kept subordinate to it.
10. `capability_closure`: `end_to_end` for the existing `bubble commit` runtime path only. This task does not claim a new user capability; it preserves the existing activation path while moving orchestration behind the internal pipeline boundary.

## L0 - Policy

### Goal

Deepen the commit command by introducing one command-local execution pipeline that hides local/remote route selection and side-effect ordering behind a narrow application-local Interface.

The business question this task should make explicit is:

> Given an approved bubble and the configured execution authority, what is the single durable commit result, and which local or remote continuity path is authoritative for it?

Callers should not manually orchestrate remote pointer checks, remote continuity import, remote command execution, local git commit, transcript append, state persistence, sync-back, and lifecycle event emission as separate workflow decisions.

### Context

`bubble commit` is a state-changing lifecycle command. Its correctness depends on a strict ordering of authority checks and side effects. Local and remote execution share the same public result contract, but they do not share the same evidence path:

1. Local execution derives authority from local bubble state plus the local git commit result.
2. Remote execution derives authority from a started remote pointer, imported or executed remote commit continuity, and successful sync-back into the source repository.

The current code has the right policy pieces, but the route and effect order are concentrated in `commitCommandApi.ts`. This task should turn that file back into the public API boundary and move production orchestration under `src/v11/application/commit/internal/pipeline/**`.

### Chosen Architecture Direction

1. Create a command-local pipeline module under `src/v11/application/commit/internal/pipeline/**`.
2. Keep public API exports in `src/v11/application/commit/commitCommandApi.ts`.
3. Keep route orchestration in `application/commit`; do not move commit workflow policy into `shared`.
4. Keep remote transport contracts in `shared/remote/commitRemoteExecution.ts` only as transport vocabulary and ports, not as commit command policy owner.
5. Preserve the public `CommitBubbleInput`, `CommitBubbleResult`, `CommitBubbleDependencies`, error normalization, protocol payloads, and CLI-visible behavior.
6. Do not introduce a public dry-run, preview, or diagnostics API in this task.

### In Scope

1. Introduce one narrow command-local pipeline function named `runCommitCommandPipeline(...)`.
2. Make `commitBubble(...)` delegate to that pipeline and keep only public error normalization at the API boundary.
3. Preserve local route ordering:
   - resolve bubble and bubble identity,
   - require `APPROVED_FOR_COMMIT`,
   - run the git commit step,
   - append `COMMIT_RESULT`,
   - persist `COMMITTED` then `DONE`,
   - emit the commit lifecycle event,
   - return the canonical `CommitBubbleResult`.
4. Preserve remote route ordering:
   - resolve bubble and bubble identity,
   - require a valid started remote pointer unless executing inside the matching remote clone,
   - refuse remote-inner continuation while source-repo remote artifacts are still present,
   - resolve the remote target,
   - read local state before continuity import,
   - import remote commit continuity,
   - if remote completion was already imported, sync continuity and emit the lifecycle event only when the local state was not already `DONE`,
   - if remote completion was not imported, require local `APPROVED_FOR_COMMIT`,
   - execute the remote commit command,
   - sync remote continuity artifacts back,
   - emit the commit lifecycle event,
   - return the canonical `CommitBubbleResult`.
5. Move route-specific helpers out of `commitCommandApi.ts` into the new pipeline module or delete/replace them.
6. Do not leave `prepareCommitExecutionContext`, `commitRemoteExecutionRoute`, `commitLocalExecutionRoute`, `importRemoteCommitContinuityForCommit`, `syncRemoteCommitContinuity`, or `buildCommitLifecycleContext` as private orchestration helpers in `commitCommandApi.ts`.
7. Keep lower-level modules such as `commitCommandGitStep.ts`, `commitCommandFinalization.ts`, and `commitCommandFinalizationMutation.ts` when they remain focused side-effect/effect helpers.
8. Move or add orchestration-level tests under `tests/v11/application/commit/**` for the new pipeline Interface. Existing CLI/contract tests remain as public behavior coverage.
9. Add final evidence scans proving `commitCommandApi.ts` no longer owns route sequencing and the new application-local pipeline owns the route/effect contract.

### Out of Scope

1. Changing `CommitBubbleInput`, `CommitBubbleResult`, or `CommitBubbleDependencies` public meaning.
2. Changing `stageAll` / temporary internal `auto` compatibility semantics.
3. Changing CLI flags or user-facing command names.
4. Changing protocol envelope type names, including `COMMIT_RESULT`.
5. Changing state-machine semantics for `APPROVED_FOR_COMMIT`, `COMMITTED`, or `DONE`.
6. Changing remote pointer file format or remote transport protocol.
7. Changing SSH executor implementation except where tests need to preserve the existing commit contract.
8. Broad cleanup of unrelated bubble lifecycle commands.

### Control Model

1. `business_invariant`: `bubble commit` must produce exactly one durable `CommitBubbleResult` or fail before claiming commit success.
2. `control_model`: the authoritative commit result is either the local git commit plus local state/transcript persistence, or imported/executed remote continuity after successful source-repo sync-back.
3. `read_path_rule`: local execution may read local state and transcript through existing ports; remote execution may read the remote pointer and imported remote continuity through existing remote ports.
4. `forbidden_fallback`: do not silently fall back from remote execution to local execution when the configured executor requires remote commit and remote continuity import/execution fails.
5. `allowed_resolution_path`: imported remote completion may satisfy the command when it carries valid synced state/transcript/commit result artifacts.
6. `missing_data_rule`: missing remote pointer, invalid remote continuity, unresolved remote target, and non-approved local state must fail closed through existing `BubbleCommitError` semantics.
7. `phase_boundary`: this task owns internal execution orchestration closure for commit. It does not own new payload production, UI consumption, or external activation.

### Closed-Contract Drift Check

1. `source_anchors`:
   - `src/v11/application/commit/commitCommandApi.ts`
   - `src/v11/application/commit/commitCommandApiContract.ts`
   - `src/v11/application/commit/commitCommandContract.ts`
   - `src/v11/application/commit/commitCommandFinalization.ts`
   - `src/v11/application/commit/commitCommandFinalizationMutation.ts`
   - `src/v11/application/commit/commitCommandGitStep.ts`
   - `src/v11/application/commit/remoteCommitExecutionContext.ts`
   - `src/v11/shared/remote/commitRemoteExecution.ts`
   - `tests/contracts/v11/cases/commit/**`
2. `canonical_elements`:
   - bubble identity,
   - loaded bubble state,
   - remote pointer when executor is SSH,
   - remote target,
   - imported or executed remote continuity,
   - local git commit result,
   - `COMMIT_RESULT` envelope,
   - final `DONE` state,
   - `CommitBubbleResult`.
3. `guard_elements`:
   - `APPROVED_FOR_COMMIT` precondition,
   - remote started pointer requirement,
   - remote-inner source artifact refusal,
   - remote continuity import error mapping,
   - sync-back failure mapping,
   - no local fallback for remote execution failures.
4. `compat_elements`:
   - temporary internal `auto` fallback to `stageAll`,
   - existing `BubbleCommitError` reason codes,
   - existing remote commit transport result contract.
5. `closed_terms`: `commit`, `remote commit continuity`, `sync-back`, `COMMIT_RESULT`, `APPROVED_FOR_COMMIT`, `COMMITTED`, `DONE`, `stageAll`, `auto`.
6. `forbidden_reinterpretations`:
   - do not treat remote continuity as advisory after a remote commit succeeds,
   - do not treat missing remote pointer as permission to commit locally,
   - do not emit a commit lifecycle event before the authoritative commit result is durable,
   - do not change `auto` into a public CLI contract.
7. `drift_status`: intended `clarified_without_semantic_change`.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Rationale: this is an internal application orchestration refactor. Public CLI/API inputs, protocol payloads, state names, result shapes, and remote transport contracts must remain unchanged.
3. If implementation discovers that changing public commit inputs/results, protocol envelope payloads, remote pointer format, or state-machine semantics is necessary, stop and route back to task refinement or a Plan -> Task chain.

## L1 - Change Contract

### 1) Call-Site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/commit/commitCommandApi.ts` | `commitBubble` | Delegate to one command-local pipeline and keep public error normalization only; remove the in-file helpers listed in L0 In Scope #6 and AC #3 | P1 | required-now | T1,T2,T10,AC1 |
| CS2 | `src/v11/application/commit/internal/pipeline/**` | `runCommitCommandPipeline` | Own normalization, context preparation, route selection, and route execution | P1 | required-now | T1-T9 |
| CS3 | `src/v11/application/commit/internal/pipeline/**` | context preparation step | Resolve bubble identity, executor context, remote pointer, remote target, and local approved state with existing guards. Route/context implementation types move under `internal/pipeline/**` unless an exported type is still required by a non-internal lower-level helper boundary and documented as non-caller contract. | P1 | required-now | T2,T3,T5 |
| CS4 | `src/v11/application/commit/internal/pipeline/**` | local route step | Preserve local git -> append -> state -> event -> result ordering | P1 | required-now | T4,T8 |
| CS5 | `src/v11/application/commit/internal/pipeline/**` | remote route step | Preserve remote continuity import/execution/sync/event/result ordering | P1 | required-now | T5,T6,T7 |
| CS6 | `src/v11/application/commit/commitCommandGitStep.ts` | `runCommitGitStep` | Remain lower-level local git side-effect helper; no route selection authority | P1 | required-now | T4 |
| CS7 | `src/v11/application/commit/commitCommandFinalization.ts` | append/persist/event helpers | Remain lower-level finalization effects; no route selection authority | P1 | required-now | T4,T8 |
| CS8 | `src/v11/application/commit/remoteCommitExecutionContext.ts` | remote environment helpers | Remain remote execution-context parsing/canonicalization only; no command pipeline owner | P2 | required-now | T3,T5 |
| CS9 | `tests/v11/application/commit/**` | application-level commit tests | Cover route-order and branch behavior through the new pipeline or public `commitBubble` delegating to it | P1 | required-now | T1-T8 |
| CS10 | `tests/contracts/v11/commit.contract.*` and `tests/contracts/v11/cases/commit/**` | public contract tests | Prove the public commit contract remains stable | P1 | required-now | T9 |

### 2) Canonical Contract Matrix

| Condition | Required Owner | Required Route/Effect | Forbidden Behavior | Required Evidence |
|---|---|---|---|---|
| local executor and state is `APPROVED_FOR_COMMIT` | local route step | run git, append `COMMIT_RESULT`, persist `COMMITTED` then `DONE`, emit lifecycle event, return result | event before durable result or state write | T4,T8 |
| local executor and state is not `APPROVED_FOR_COMMIT` | context preparation step | throw existing commit precondition error before git/transcript/state side effects | running git or appending transcript from a non-approved state | T2,T4 |
| SSH executor and remote pointer missing/not started in source repo | remote context step | throw `COMMIT_REMOTE_START_REQUIRED` | local fallback commit | T3,T5 |
| SSH executor inside matching remote clone while source remote artifacts remain | remote context step | throw `COMMIT_REMOTE_START_REQUIRED` with remote-inner refusal context | continuing a remote-inner commit from stale source artifacts | T3,T5 |
| remote continuity import fails due transport | remote continuity step | map to `REMOTE_COMMIT_CONTINUITY_IMPORT_UNAVAILABLE` | local fallback or raw transport error leak | T6 |
| remote continuity import fails due invalid continuity | remote continuity step | map to `REMOTE_COMMIT_CONTINUITY_IMPORT_INVALID` | local fallback or accepting invalid continuity | T6 |
| imported remote completion exists | remote route step | sync continuity; emit lifecycle event only when local state before import was not `DONE`; return imported result | re-running remote command after completed continuity | T6,T7 |
| no imported remote completion and local state before import is not `APPROVED_FOR_COMMIT` | remote route step | throw existing commit precondition error before remote execution | executing remote commit from invalid local lifecycle state | T5,T6 |
| remote command succeeds | remote route step | sync continuity, emit lifecycle event, return remote result | returning success before sync-back | T7 |
| sync-back fails after remote success | remote continuity step | throw `REMOTE_COMMIT_SYNC_BACK_FAILED` with source state/transcript paths | returning success with unsynced local continuity | T7 |
| no staged files or git commit failure | local git step | preserve existing git-step error semantics | inventing a synthetic successful commit result | T4,T9 |

### 3) Interface and Data Contract

#### External Interface

The public runtime-facing API remains unchanged:

```ts
commitBubble(
  input: CommitBubbleInput,
  dependencies: CommitBubbleDependencies
): Promise<CommitBubbleResult>
```

`commitBubble(...)` should keep public error normalization with `throwAsBubbleCommitError(...)`, but it should not own route selection or side-effect ordering after this task.

#### Internal Pipeline Interface

Required command-local entry:

```ts
runCommitCommandPipeline(
  input: CommitBubbleInput,
  dependencies: CommitBubbleDependencies
): Promise<CommitBubbleResult>
```

The pipeline may use internal normalized input/context types, but those types are not public API. The caller receives only `CommitBubbleResult`.

#### Internal Implementation Sub-Contracts

The implementation may split the pipeline into private sub-contracts such as:

1. normalized command input,
2. resolved local/remote execution context,
3. local route execution result,
4. remote continuity import result,
5. remote route execution result,
6. lifecycle event context.

These are implementation details under `internal/pipeline/**`. They must not be exported from `commitCommandApi.ts` as caller-visible contracts.

Existing route/context types such as `CommitExecutionContext`, `CommitRuntimeContext`, and `RemoteCommitRuntimeContext` should move out of `commitCommandApiContract.ts` when they are only pipeline implementation details. If any exported route/context type remains in `commitCommandApiContract.ts`, the implementation must document why a non-internal lower-level helper boundary still requires it and must keep it free of caller-visible route orchestration policy.

### 4) Side-Effect Contract

1. The local route must preserve the existing side-effect order:
   - git commit,
   - protocol append,
   - state write,
   - lifecycle event.
2. The remote imported-completion route must preserve the existing side-effect order:
   - read local state before import,
   - import remote continuity,
   - sync state/transcript artifacts,
   - conditionally emit lifecycle event,
   - return imported result.
3. The remote execution route must preserve the existing side-effect order:
   - read local state before import,
   - import continuity,
   - require local approved state if completion is not imported,
   - execute remote command,
   - sync state/transcript artifacts,
   - emit lifecycle event,
   - return remote result.
4. No lifecycle event may be emitted before the authoritative commit result is durable in the relevant continuity path.
5. No state/transcript success may be synthesized after a failed git commit, failed remote command, failed continuity import, or failed sync-back.

### 5) Error and Fallback Contract

1. Existing `BubbleCommitError` reason codes and messages should be preserved unless tests already assert only reason-code-level semantics.
2. `throwAsBubbleCommitError(...)` remains the public normalization boundary.
3. Remote route failures must not silently fall back to local execution.
4. Local route precondition failures must occur before git side effects.
5. Remote execution precondition failures must occur before remote command execution.
6. Sync-back failure after remote success must remain explicit as `REMOTE_COMMIT_SYNC_BACK_FAILED`.

### 6) Dependency and Placement Constraints

1. New files belong under `src/v11/application/commit/internal/pipeline/**`.
2. Do not place the pipeline in `src/v11/shared/**`.
3. Do not create a generic lifecycle orchestration helper shared with unrelated commands.
4. Do not add dependencies from `shared` back into `application`.
5. Keep ports supplied through `CommitBubbleDependencies`; do not import concrete filesystem/git implementations into the pipeline.
6. Preserve TypeScript-first typed boundaries for internal route contexts.
7. `src/v11/shared/remote/commitRemoteExecution.ts` is a read-only source anchor for this task. Changes to that file require route-back because this task must not change the remote transport contract.

### 7) Test Matrix

| ID | Test Focus | Required Coverage | Preferred Location |
|---|---|---|---|
| T1 | API boundary behavior | `commitBubble(...)` preserves public input/output/error behavior while route behavior is covered through T2-T8. Do not require structural mock assertions against the internal pipeline reference. | `tests/v11/application/commit/commitCommandApi.test.ts` |
| T2 | local precondition | non-`APPROVED_FOR_COMMIT` local state fails before git/transcript/state writes | `tests/v11/application/commit/**` |
| T3 | remote pointer/context guards | missing/not-started pointer and remote-inner source artifact guard preserve existing reason codes | `tests/v11/application/commit/**` |
| T4 | local route success | git -> append -> state -> event -> result order preserved | `tests/v11/application/commit/**` |
| T5 | remote no-completion precondition | remote command is not executed unless local state before import is `APPROVED_FOR_COMMIT` | `tests/v11/application/commit/**` |
| T6 | remote import classification | transport failure maps unavailable; invalid continuity maps invalid | `tests/v11/application/commit/**` |
| T7 | remote completion/execution | imported completion syncs and conditionally emits; remote command success syncs before event/result | `tests/v11/application/commit/**` |
| T8 | finalization mutation | `COMMITTED` then `DONE` semantics unchanged | `tests/v11/application/commit/commitCommandFinalizationMutation.test.ts` |
| T9 | public contract | contract cases remain unchanged | `tests/contracts/v11/commit.contract.test.ts` |
| T10 | cleanup evidence | API file no longer contains route helper implementations | final evidence scan |

### 8) Mirrored Surfaces Checklist

Keep these surfaces synchronized when route taxonomy, remote continuity semantics, or commit result shape is referenced:

1. L0 In Scope local/remote route ordering.
2. L0 Closed-Contract Drift Check canonical/guard elements.
3. L1 Call-Site Matrix.
4. L1 Canonical Contract Matrix.
5. L1 Interface and Data Contract.
6. L1 Side-Effect Contract.
7. L1 Error and Fallback Contract.
8. L1 Test Matrix.
9. Acceptance Criteria.
10. L2 Verification and Evidence Commands.

### 9) Authority Fan-Out

1. `commitCommandApi.ts` is the public API authority only.
2. `internal/pipeline/**` is the command workflow authority.
3. `commitCommandGitStep.ts` is the local git side-effect authority.
4. `commitCommandFinalization*.ts` are transcript/state finalization authorities.
5. `remoteCommitExecutionContext.ts` is remote execution-context parsing/canonicalization authority.
6. `shared/remote/commitRemoteExecution.ts` is remote transport vocabulary/port authority.

### 10) Complexity Risk Triage

1. `authority_count`: 6
2. `surface_spread`: 5
3. `identity_join_count`: 2
4. `activation_paths`: 2
5. `precondition_count`: 5
6. `acceptance_multiplicity`: 5
7. `risk_score`: 5
8. `split_decision`: keep as one bounded task because the public contract is unchanged, all work is one command-local pipeline, and splitting local vs remote would leave a transitional orchestration layer that this task explicitly removes.
9. `required_mitigation`: route tests must pin local precondition, local success order, remote pointer guards, remote import classification, remote sync-back failure, and imported-completion idempotence.

### 11) Baseline Preservation Contract

1. Before changing behavior, run or inspect the existing commit tests enough to identify the current expected contract.
2. Preserve all existing contract cases under `tests/contracts/v11/cases/commit/**`.
3. If a test expectation changes, the implementation must document which public contract changed and route the task back for refinement unless it is a pure test-location/name update.
4. Keep the temporary internal `auto` compatibility behavior until a separate cleanup task removes it.

### 12) Precondition and Side-Effect Boundary

1. Precondition checks are allowed to read state, remote pointers, remote targets, and continuity.
2. Side effects begin at git commit, remote command execution, transcript append, state write, sync-back write, or lifecycle event emission.
3. Once a side effect begins, the route must continue through the existing durable result/error semantics. Do not introduce partial success reporting.
4. Any helper that both chooses a route and performs side effects must remain internal to the pipeline and be tested through the pipeline/public command behavior.

## L2 - Acceptance Criteria

1. `commitBubble(...)` no longer contains local/remote route sequencing; it delegates to `runCommitCommandPipeline(...)` and normalizes errors.
2. `runCommitCommandPipeline(...)` exists under `src/v11/application/commit/internal/pipeline/**` and is the only command-local workflow entry for commit execution.
3. The old API-file helper implementations are removed from `commitCommandApi.ts`:
   - `prepareCommitExecutionContext`
   - `commitRemoteExecutionRoute`
   - `commitLocalExecutionRoute`
   - `importRemoteCommitContinuityForCommit`
   - `syncRemoteCommitContinuity`
   - `buildCommitLifecycleContext`
4. Local route success preserves current git/transcript/state/event/result behavior.
5. Local route precondition failures happen before git/transcript/state side effects.
6. Remote route pointer/context guards preserve current `COMMIT_REMOTE_START_REQUIRED` behavior.
7. Remote continuity import preserves unavailable/invalid reason-code mapping.
8. Imported remote completion syncs continuity and does not re-run the remote command.
9. Remote command success syncs continuity before lifecycle event emission and result return.
10. Remote sync-back failure remains `REMOTE_COMMIT_SYNC_BACK_FAILED`.
11. Public contract tests for commit remain green without changing commit case payload meaning.
12. No commit workflow policy is promoted into `shared`.
13. Commit route/context implementation types are not left in `commitCommandApiContract.ts` unless they are still required by a non-internal lower-level helper boundary and documented as non-caller contract.

## L2 - Required Verification

Run the narrowest relevant checks first, then broader affected checks:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. `pnpm vitest run tests/v11/application/commit`
5. `pnpm vitest run tests/core/bubble/commitBubble.test.ts`
6. `pnpm vitest run tests/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.test.ts`
7. `pnpm vitest run tests/contracts/v11/commit.contract.test.ts`
8. `pnpm test`
9. `pnpm build`

If any step is skipped, record the reason in the bubble progress/final summary.

## L2 - Final Evidence Scans

Run these scans before requesting review:

```bash
! rg "prepareCommitExecutionContext|commitRemoteExecutionRoute|commitLocalExecutionRoute|importRemoteCommitContinuityForCommit|syncRemoteCommitContinuity|buildCommitLifecycleContext" src/v11/application/commit/commitCommandApi.ts -n
find src/v11/application/commit/internal/pipeline -maxdepth 3 -type f | sort
rg "runCommitCommandPipeline|COMMIT_RESULT|APPROVED_FOR_COMMIT|COMMITTED|DONE|REMOTE_COMMIT|COMMIT_REMOTE" src/v11/application/commit tests/v11/application/commit tests/contracts/v11 -n
```

Expected:

1. The first scan returns no old helper implementations from `commitCommandApi.ts`.
2. The second scan shows the new pipeline module files.
3. The third scan shows the route/result vocabulary mirrored in implementation and tests.

## Open Questions

None blocking.

Non-blocking implementation choice: the exact internal file split under `internal/pipeline/**` may vary, but the final shape must remove the old API-file orchestration helpers instead of leaving wrappers behind.

## Hardening Backlog

These are intentionally out of scope for this task:

1. Remove temporary internal `auto` compatibility after first-party callers are migrated to `stageAll`.
2. Add a repository-level bubble bootstrap configuration so individual bubble starts no longer need command-line bootstrap injection.
3. Revisit whether commit lifecycle event emission needs a dedicated fitness rule if future work changes event/state ordering.
