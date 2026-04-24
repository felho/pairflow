---
artifact_type: task
artifact_id: task_local_commit_done_package_removal_v1
title: "Local Commit Done-Package Removal"
status: implementable
phase: phase2
target_files:
  - "src/cli/index.ts"
  - "src/v11/application/commit/commitCommandApi.ts"
  - "src/v11/application/commit/commitCommandApiContract.ts"
  - "src/v11/application/commit/commitCommandContract.ts"
  - "src/v11/application/commit/commitCommandFinalization.ts"
  - "src/v11/application/commit/commitCommandGitStep.ts"
  - "src/v11/application/commit/commitDonePackage.ts"
  - "src/v11/shared/ports/uiRouter.ts"
  - "src/v11/shared/commit/commitCommandFinalizationMutation.ts"
  - "tests/core/bubble/commitBubble.test.ts"
  - "tests/v11/application/commit/commitCommandApi.test.ts"
prd_ref: null
plan_ref: plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Local Commit Done-Package Removal

## Revision Log

4. `2026-04-25` (fresh-context ReviewSpec refinement 2): added the v11 commit API test target, classified shared result removal as explicit `shared_contract` closure, and clarified the `src/cli/index.ts` boundary: Phase 2 updates direct result projection labels to `COMMIT_RESULT`; Phase 3 keeps `--auto` help/parser/request activation.
3. `2026-04-25` (fresh-context ReviewSpec refinement): aligned task to parent-plan routing. Phase 2 owns shared result contraction and direct CLI/UI-router compile consumers; Phase 3 owns public request/input activation and wording.
2. `2026-04-25` (ReviewSpec refinement): clarified engineering sequencing decision after task-mode ReviewSpec. Phase 2 owns removal of local `donePackagePath` from the shared application result contract and local `bubble_committed` lifecycle metadata, with only minimal compile/runtime adaptation for remote route. Public CLI/API/UI request rename and remote transport hard cutover remain successors.
1. `2026-04-25` (initial task): created after Phase 1 `commit-result-protocol-contract` was completed and archived. This task owns Phase 2 from [plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md](/Users/felho/dev/pairflow/plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md): local commit producer cutover from `DONE_PACKAGE` / `done-package.md` to `COMMIT_RESULT`.

## L0 - Policy

### Goal

Make local `bubble commit` stop reading, requiring, generating, referencing, or emitting `artifacts/done-package.md` as local commit completion authority. A successful local commit must append a `COMMIT_RESULT` transcript envelope with technical commit facts and still transition the bubble to `DONE`.

This is a local producer cutover slice with the necessary local application-result and local lifecycle-metadata cleanup attached. It does not own the full operator-facing `--auto` to `--stage-all` cutover, remote SSH commit transport alignment, UI/router request migration, or live docs cleanup.

### Domain / Control Model Summary

1. Business invariant: A bubble commit is complete because Pairflow has a valid git commit and finalizes state, not because a prose done-package exists.
2. Control model: Local commit runtime owns local commit finalization. The local producer must emit `COMMIT_RESULT` after a valid newly created or deterministically reused commit SHA is available.
3. Read-path rule: This task changes local transcript completion truth from `DONE_PACKAGE` to `COMMIT_RESULT`; downstream first-party read-model cleanup remains successor scope.
4. Forbidden fallback: Do not read, require, generate, or summarize `done-package.md` for local commit completion. Do not preserve `DONE_PACKAGE` as a local finalization fallback.
5. Allowed resolution path: Preserve existing deterministic local commit creation, clone retry, and source-branch sync behavior; when those paths finalize a valid commit SHA, append `COMMIT_RESULT` instead of `DONE_PACKAGE`.
6. Missing-data rule: Missing `done-package.md` is ignored by local commit. Missing `COMMIT_RESULT` after a crash is not automatically recovered in this task.
7. Phase boundary:
   - contract closure: predecessor-owned by `commit-result-protocol-contract`.
   - producer closure: owned here for local commit producer paths only.
   - internal execution closure: owned here only where local producer code must preserve current git/source-sync ordering.
   - workflow/orchestration closure: owned here for state transition continuation after local `COMMIT_RESULT` append and local lifecycle event metadata cleanup.
   - read-model closure: successor except for direct application result typing/projections required to remove `donePackagePath` from the shared commit authority surface.
   - activation closure: successor `commit-cli-stage-all-cutover`.
   - cleanup/recovery closure: explicitly not expanded.

### Plan Linkage

1. Parent plan gap closed: Phase 2, `local-commit-done-package-removal`.
2. Depends on: merged Phase 1 `COMMIT_RESULT` protocol validation.
3. Unlocks / impacts successors:
   - `commit-cli-stage-all-cutover`: can rename first-party request/input surfaces from `auto` to `stageAll` after local producer no longer uses `auto` for done-package generation.
   - `remote-commit-result-alignment`: must align remote transport and sync-back with the same `COMMIT_RESULT` event model.
   - `done-package-live-reference-cleanup`: can remove runtime prompt/docs references after producers and public surfaces are aligned.
4. This task remains an integration slice. It must not claim that the overall hard cutover is complete while remote transport, public CLI/API/UI/router activation, and live docs still contain done-package behavior or language.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/types/protocol.ts`: `COMMIT_RESULT` and temporary `DONE_PACKAGE` protocol type family.
   - `src/v11/shared/protocol/protocolPayloadValidationHelpers.ts`: closed `COMMIT_RESULT` metadata contract.
   - `src/v11/application/commit/commitCommandApi.ts`: local vs remote commit route selection and local producer orchestration.
   - `src/v11/application/commit/commitCommandGitStep.ts`: git commit / clone retry / source-branch sync behavior.
   - `src/v11/shared/commit/commitCommandFinalizationMutation.ts`: transcript append and state finalization mutation boundary.
2. Canonical elements:
   - `COMMIT_RESULT` payload metadata fields: `commit_sha`, `commit_message`, `staged_files`.
   - Local finalization ordering: state precondition -> staged-files handling -> git commit or deterministic clone-head reuse -> source-branch sync when applicable -> append transcript envelope -> `COMMITTED` -> `DONE`.
3. Guard elements:
   - `DONE_PACKAGE` remains temporarily valid at protocol validation level only because downstream producers/remote surfaces have not fully cut over yet.
   - `auto` may remain as a temporary local input spelling in this task only as "stage all before commit"; it must no longer mean "generate done-package".
4. Compat elements:
   - Remote SSH commit transport may remain on existing done-package continuity until `remote-commit-result-alignment`.
   - CLI help text and first-party UI/router request rename may remain successor scope unless they must change for compilation or direct local producer result correctness.
5. Forbidden reinterpretations:
   - Do not make `COMMIT_RESULT` contain a prose `summary`.
   - Do not move done-package path/content into `COMMIT_RESULT` metadata.
   - Do not treat `done-package.md` absence as a local commit error.
   - Do not replace deterministic clone retry/source-sync with a new recovery heuristic.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `commitBubble(input, dependencies): Promise<CommitBubbleResult>` in `src/v11/application/commit/commitCommandApi.ts`.
   - `prepareCommitExecutionContext(...)` currently resolves and reads/generates `done-package.md` before local git commit.
   - `runCommitGitStep(...)` currently treats `auto` as stage-all and retains clone retry/source-sync behavior.
   - `appendDonePackageEnvelope(...)` and `appendDonePackageEnvelopeMutation(...)` currently write `DONE_PACKAGE`.
   - `persistCommittedThenDoneStateMutation(...)` currently names `DONE_PACKAGE` in post-`COMMITTED` failure text.
   - `tests/core/bubble/commitBubble.test.ts` currently asserts done-package requirements, `DONE_PACKAGE` envelopes, auto-generation, clone retry, source-sync, and remote continuity.
   - `tests/v11/application/commit/commitCommandApi.test.ts` currently asserts local `DONE_PACKAGE`, `donePackagePath`, auto-generation, inner-remote, and remote-continuity behaviors that share the application result contract.
2. Actual touched scope: local commit authority producer plus the same bounded local finalization mutation family.
3. Mutation entrypoints in scope:
   - transcript append for local commit finalization,
   - state transition from `APPROVED_FOR_COMMIT` to `COMMITTED` to `DONE`,
   - git commit and existing clone source-branch sync.
4. Hidden scope ruled out:
   - remote SSH marker/output parsing,
   - remote sync-back removal of done-package content,
   - operator CLI rename from `--auto` to `--stage-all`,
   - UI/router request-field migration,
   - live docs/prompt cleanup,
   - automatic crash recovery after git commit.
5. Branch inventory note:
   - fresh local worktree commit with staged files,
   - local stage-all path through existing `auto` spelling,
   - no staged files without stage-all remains a clear error,
   - clone source sync failure after local commit remains fail-closed before transcript/state finalization,
   - clone retry finalizes a retained local HEAD by appending `COMMIT_RESULT`,
   - post-source-sync append failure remains retryable through the existing retained clone HEAD path,
   - remote route may receive only minimal compile/runtime adaptation to the removed shared result field; remote transport and sync-back remain successor-owned and must not be silently reinterpreted as complete target-state support.
6. Why the declared task shape matches reality: the real local producer owns both the event append and state finalization boundary; these are adjacent in the same local commit path and can be safely closed together if clone retry/source-sync behavior is explicitly preserved.

### Authority Boundary Map

1. `authority_producer`: owned here for local `bubble commit`; it produces the local final transcript completion event.
2. `persisted_authority`: transcript tail changes from local `DONE_PACKAGE` to local `COMMIT_RESULT`; state still reaches `DONE`.
3. `internal_execution_consumers`: local commit execution and clone source-sync paths must preserve current behavior.
4. `workflow_orchestration_consumers`: state machine transition continuation is in scope only after the local event append.
5. `read_model_consumers`: direct local application result shape and local lifecycle metadata cleanup are owned here; broader CLI/API/UI/status/docs read-model cleanup is deferred.
6. `cleanup_recovery_consumers`: no new cleanup/recovery behavior; preserve current fail-closed and retry baseline.

### Baseline Preservation

1. Must-preserve behaviors:
   - `bubble commit` still requires state `APPROVED_FOR_COMMIT`.
   - Without stage-all/`auto`, no staged files remains a clear `COMMIT_STAGED_FILES_EMPTY` failure.
   - Default commit message remains `bubble(<bubbleId>): finalize`.
   - `--message` / `message` override still controls git commit message.
   - Clone source-branch sync still fails closed when source branch is missing, diverged, unsafe, or the clone is on the wrong branch.
   - Clone retry after source sync but before finalization still reuses the retained valid local HEAD instead of creating an extra commit.
2. Intentionally replaced behaviors:
   - local done-package read/require/generate before git commit,
   - local `DONE_PACKAGE` transcript append,
   - application `CommitBubbleResult` dependence on `donePackagePath`,
   - local `bubble_committed` lifecycle metadata dependence on `done_package_path`.
3. Forbidden regression interpretations:
   - Do not remove or weaken source-branch sync safety checks.
   - Do not make missing `COMMIT_RESULT` auto-recoverable after a crash.
   - Do not leave local `auto` generating done-package content.
4. Replacement proof required:
   - every local path that currently finalizes with `DONE_PACKAGE` must finalize with `COMMIT_RESULT` using the same commit SHA that git creation/reuse/source-sync proved.

### Success / Completion Proof Boundary

1. Current local success proof source: git commit/reused clone HEAD + `DONE_PACKAGE` transcript envelope + `DONE` state.
2. Target local success proof source: git commit/reused clone HEAD + `COMMIT_RESULT` transcript envelope + `DONE` state.
3. Reused proof contract: git commit SHA, commit message, and staged file list remain the technical facts.
4. Proof-parity rule: when an existing clone retry/source-sync path finalizes a valid commit SHA, the emitted `COMMIT_RESULT` metadata must match that finalized commit SHA/message/staged-file set.
5. Final truth surfaces affected in this task:
   - local transcript event type and metadata,
   - local `CommitBubbleResult` facts needed by local tests/callers,
   - local `bubble_committed` lifecycle metadata,
   - state transition error text if it names the old event type.
6. Mixed-truth surfaces allowed:
   - temporary remote and CLI/docs done-package references may remain only because successor tasks own them; the task must not describe that mixed state as final hard-cutover completion.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `authority_producer`.
2. Secondary shape: `workflow_orchestration_consumers`, limited to the same local finalization mutation that appends the event and moves state to `DONE`.
3. Preconditions that must pass before side effects:
   - resolve bubble and identity,
   - state must be `APPROVED_FOR_COMMIT`,
   - staged files must exist after optional stage-all behavior, or deterministic clone-head reuse must apply.
4. Side effects forbidden before preconditions pass:
   - no transcript append,
   - no state write,
   - no done-package artifact read/write requirement,
   - no done-package artifact generation.
5. Side effects after git commit:
   - append `COMMIT_RESULT`,
   - write `COMMITTED`,
   - write `DONE`.
6. Failure behavior:
   - source-sync failure after git commit still fails before transcript/state finalization as current baseline does.
   - append/state failure after a valid commit remains fail-closed and manually diagnosable; no automatic recovery is added.

### In Scope

1. Remove local use of `readOrCreateDonePackage` from commit preparation.
2. Retire `commitDonePackage.ts` from the active local commit path; delete it only if no live in-scope import remains.
3. Replace local `appendDonePackageEnvelope` / `appendDonePackageEnvelopeMutation` with `appendCommitResultEnvelope` / `appendCommitResultEnvelopeMutation`.
4. Emit `COMMIT_RESULT` with only:
   - `payload.metadata.commit_sha`,
   - `payload.metadata.commit_message`,
   - `payload.metadata.staged_files`.
5. Ensure local finalization does not add done-package refs to the envelope.
6. Stop generating `artifacts/done-package.md` for local stage-all/`auto` commits.
7. Make missing `artifacts/done-package.md` irrelevant for local commit success.
8. Remove `donePackagePath` from local commit result shape where the local application result is produced.
9. Remove `donePackagePath` / done-package-derived `refs_count` from local `bubble_committed` lifecycle metadata.
10. Update shared `CommitBubbleResult` type to expose technical commit facts without `donePackagePath`; adapt remote route only enough to compile and preserve current remote behavior until Phase 4.
11. Preserve existing local and clone retry/source-sync behavior.
12. Update local commit and v11 application commit API tests to assert `COMMIT_RESULT`, no done-package generation, removed local result field, removed local lifecycle done-package metadata, direct CLI success label projection, and preserved failure/retry behavior.

### Out of Scope

1. Remote SSH commit output parsing and marker protocol.
2. Remote sync-back removal of done-package content.
3. CLI public rename from `--auto` to `--stage-all`.
4. UI/router request field rename from `auto` to `stageAll`.
5. Removing `DONE_PACKAGE` from protocol validation.
6. Full CLI/API/UI/router public wording cleanup beyond the direct `COMMIT_RESULT` success envelope label and the minimum compile/runtime changes required by the removed shared `donePackagePath` result field.
7. Remote lifecycle/transport hard cutover; remote may remain mixed until Phase 4.
8. Live docs, README, and runtime-generated prompt/context cleanup.
9. New crash recovery or retry semantics after git commit.
10. Archived historical task/doc rewriting.

### Safety Defaults

1. If local commit cannot prove a valid commit SHA, do not append `COMMIT_RESULT`.
2. If state is not `APPROVED_FOR_COMMIT`, do not stage, commit, append, or write state.
3. If clone source sync fails, do not append `COMMIT_RESULT` and do not move state.
4. If `COMMIT_RESULT` append succeeds but final `DONE` write fails, error text must identify `COMMIT_RESULT` as the transcript recovery anchor.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`.
2. Impacted contracts:
   - local commit finalization transcript event,
   - local application command result facts,
   - local commit lifecycle event metadata,
   - local commit tests.
3. Deferred contracts:
   - public CLI/API/UI request field contract,
   - remote commit transport/result contract,
   - active protocol hard removal of `DONE_PACKAGE`.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `9`
8. `single-task allowed`: `yes, with Plan -> Task chain and strict boundary`
9. Required split: this task stays single because it owns the local producer, same-path local finalization mutation, shared application result field removal, and local lifecycle metadata cleanup. Remote transport, CLI/API/UI activation, and live docs are explicitly deferred.
10. Identity/join note:
    - canonical identity path: finalized git commit SHA from `runCommitGitStep`.
    - competing identifiers: done-package path/content must not identify local commit completion.
11. Authority/source-of-truth note:
    - canonical source: local git commit facts plus transcript `COMMIT_RESULT`.
    - forbidden secondary source: done-package artifact existence or prose content.
12. Closure-budget triage:
    - closure buckets touched: `authority_producer`, `persisted_authority`, explicit `shared_contract`, limited `workflow_orchestration_consumers`, narrow `read_model_consumers`.
    - intentionally collapsed closures: local transcript append, local state finalization, local lifecycle metadata cleanup, and shared result field removal remain together because keeping `donePackagePath` in the local commit result would preserve the removed authority surface.
    - explicitly deferred closures: remote transport, public activation/read-model, docs/runtime prompt cleanup, protocol hard removal of `DONE_PACKAGE`.
13. Bounded-task-shape decision:
    - primary shape: `authority_producer`.
    - secondary shape: limited `workflow_orchestration_consumers` plus narrow `activation_or_read_model` for local application result/lifecycle event output.
    - why this bounded mix is safe: the same local finalization code appends the event, transitions state, emits lifecycle metadata, and returns the application result; remote/public activation remains deferred.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Commit completion is technical git/state/transcript truth, not prose package truth. | Local commit must not depend on `done-package.md`. | P1 | required-now |
| Control model | Local commit runtime produces the local completion event. | Emit `COMMIT_RESULT` after valid commit facts exist. | P1 | required-now |
| Read-path rule | Local transcript tail becomes `COMMIT_RESULT`. | Tests must assert local transcript tail type and metadata. | P1 | required-now |
| Forbidden fallback | Done-package is not local completion fallback. | Remove local read/generate/require path. | P1 | required-now |
| Allowed resolution path | Deterministic clone commit reuse/source-sync remains valid. | Reused HEAD finalizes with `COMMIT_RESULT`. | P1 | required-now |
| Missing-data rule | Missing done-package is ignored; missing post-crash `COMMIT_RESULT` is not auto-recovered. | No done-package missing error; no new recovery loop. | P1 | required-now |
| Phase boundary | Local producer only. | Keep remote/CLI/UI/docs cutover out of scope. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `COMMIT_RESULT` | `src/types/protocol.ts`, protocol validator helpers | Target local commit finalization event. | Produce it locally. | P1 | required-now |
| `DONE_PACKAGE` | current commit producer and protocol type | Legacy event; no longer local producer output. | Stop local emission; do not remove protocol type yet. | P1 | required-now |
| Commit facts | `runCommitGitStep` result | Technical source for event metadata. | Feed directly into `COMMIT_RESULT`. | P1 | required-now |
| Clone retry/source-sync | `commitCommandGitStep.ts` | Preserved same-authority deterministic path. | Keep behavior and update final event type only. | P1 | required-now |
| State finalization | `persistCommittedThenDoneStateMutation` | Existing transition sequence remains. | Preserve, but update event wording. | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Local preparation | Must not read/generate done-package. | Remove `readOrCreateDonePackage` from local route. | P1 | required-now |
| Local producer | Must emit `COMMIT_RESULT`. | Replace append helper/mutation and tests. | P1 | required-now |
| Local state transition | Must still reach `DONE`. | Preserve `COMMITTED` then `DONE` writes. | P1 | required-now |
| Clone retry | Must remain deterministic. | Reuse retained clone HEAD and emit matching `COMMIT_RESULT`. | P1 | required-now |
| Remote route | Not owned here. | Do not rewrite SSH marker/parser/sync-back. | P1 | required-now |
| CLI rename | Not owned here. | `auto` can remain temporary stage-all input spelling; no done-package generation. | P2 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Phase 2 local producer cutover. | Local commit no longer depends on done-package. | P1 | required-now |
| Depends on | Phase 1 protocol contract. | Do not redefine `COMMIT_RESULT` payload shape. | P1 | required-now |
| Unlocks Phase 3 | CLI/API/UI cutover. | Shared result no longer exposes `donePackagePath`; Phase 3 owns public `--stage-all` request rename and user-facing text cleanup. | P2 | successor |
| Unlocks Phase 4 | Remote alignment. | Remote route may adapt to the shared result field removal, but remote transport remains explicitly not target-complete. | P2 | successor |
| Overall hard cutover | Not complete after this task. | Summary must say integration slice only. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| local transcript finalization event | commit tests, transcript readers, future read-models | breaking for local producer behavior | local producer emits `COMMIT_RESULT` | read-model/docs cleanup later |
| `CommitBubbleResult.donePackagePath` | CLI/root output, tests, remote route, UI/router ports | breaking shared application result change | remove from shared app result type now; update direct CLI/UI-router compile consumers minimally; public request migration remains successor scope | public wording polish in Phase 3 |
| `bubble_committed` lifecycle metadata `done_package_path` | metrics/event consumers, tests | breaking local lifecycle metadata cleanup | remove for local commit events now; remote event/transport cleanup remains Phase 4/5 as applicable | broad live reference cleanup in Phase 5 |
| `CommitBubbleInput.auto` | CLI parser, app API, remote port | compatibility-tightening | keep spelling if needed, but make it stage-all only locally | rename to `stageAll` in Phase 3 |
| remote commit port done-package content | SSH remote route and sync-back | unchanged here | preserve or only minimally adapt for compile | remove in Phase 4 |

### 1) Call-Site Matrix

| ID | File | Function / Entry | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/commit/commitCommandApi.ts` | `prepareCommitExecutionContext(...)` | local route preparation | no local `donePackagePath` requirement and no `readOrCreateDonePackage`; state precondition remains before git side effects | P1 | required-now | unit tests |
| CS2 | `src/v11/application/commit/commitCommandApi.ts` | `commitLocalExecutionRoute(...)` | after `runCommitGitStep` | append `COMMIT_RESULT`, persist `DONE`, return technical result facts | P1 | required-now | unit tests |
| CS3 | `src/v11/application/commit/commitCommandFinalization.ts` | append helper | replace `appendDonePackageEnvelope` | wrapper passes commit facts into `appendCommitResultEnvelopeMutation` | P1 | required-now | unit tests |
| CS4 | `src/v11/shared/commit/commitCommandFinalizationMutation.ts` | append mutation | transcript append boundary | write `type: "COMMIT_RESULT"` with closed metadata and no summary/done-package refs | P1 | required-now | transcript assertions |
| CS5 | `src/v11/shared/commit/commitCommandFinalizationMutation.ts` | `persistCommittedThenDoneStateMutation(...)` | failure message | post-`COMMITTED` failure text names `COMMIT_RESULT` as recovery anchor | P2 | required-now | targeted assertion or code review |
| CS6 | `src/v11/application/commit/commitCommandGitStep.ts` | `runCommitGitStep(...)` | staged-files path | `auto` remains temporary stage-all only; no done-package semantics in error context | P2 | required-now | no-staged-files tests |
| CS7 | `src/v11/application/commit/commitCommandContract.ts` | `CommitBubbleResult` | result contract | shared application result exposes technical facts and removes `donePackagePath`; direct consumers compile against the new shape | P1 | required-now | typecheck/tests |
| CS8 | `src/v11/application/commit/commitCommandApiContract.ts` | `CommitRuntimeContext` | local context type | remove local `donePackageContent` and done-package path dependence from local context | P1 | required-now | typecheck |
| CS9 | `tests/core/bubble/commitBubble.test.ts` | local commit suite | local producer tests | update done-package assertions to `COMMIT_RESULT` and no artifact generation | P1 | required-now | focused test |
| CS10 | `src/v11/application/commit/commitCommandFinalization.ts` | `emitCommitLifecycleEvent(...)` | local lifecycle metadata | local `bubble_committed` event contains commit facts and staged file count, but no `done_package_path` and no done-package-derived refs count | P1 | required-now | unit test or event-port assertion |
| CS11 | `src/cli/index.ts` | commit output projection | result field fallout | remove direct reliance on `result.donePackagePath` if any and change the commit success envelope label from `DONE_PACKAGE` to `COMMIT_RESULT`; do not rename `--auto` help/parser/request behavior here | P2 | required-now | typecheck |
| CS12 | `src/v11/shared/ports/uiRouter.ts` | `UiCommitBubbleResult` | result port typing | remove `donePackagePath` from UI-router result typing so direct adapters compile against the shared result contraction; do not rename request `auto` to `stageAll` here | P2 | required-now | typecheck |
| CS13 | `tests/v11/application/commit/commitCommandApi.test.ts` | application commit API tests | local and remote contract assertions | update local `DONE_PACKAGE`/`donePackagePath` assertions to `COMMIT_RESULT` and no result field; keep remote continuity assertions only as explicit Phase 4 successor behavior if still needed for compile/runtime parity | P1 | required-now | focused test/typecheck |

### 2) Data and Interface Contract

| Contract | Current | Target In This Task | Required Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|
| local final transcript event | `DONE_PACKAGE` with summary and done-package metadata | `COMMIT_RESULT` with closed technical metadata | `commit_sha`, `commit_message`, `staged_files` | breaking local producer change | P1 | required-now |
| local done-package artifact | required or auto-generated | ignored / not generated | N/A | behavior removal | P1 | required-now |
| local stage-all input spelling | `auto` means stage all + generate done-package | temporary `auto` means stage all only | boolean | temporary compat until Phase 3 | P2 | required-now |
| application commit result facts | includes `donePackagePath` | technical facts only | bubble id, sequence, envelope, state, commit SHA/message/staged files | shared result cleanup now; public wording/activation later | P1 | required-now |
| local lifecycle metadata | includes `done_package_path` and done-package-inflated `refs_count` | technical commit facts only | commit SHA/message/staged count | local cleanup now; broader live refs later | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Git | stage all when requested, commit staged files, sync clone source branch | new recovery after commit | preserve current ordering | P1 | required-now |
| Transcript | append `COMMIT_RESULT` | append local `DONE_PACKAGE` | no summary, no done-package fields | P1 | required-now |
| State | write `COMMITTED`, then `DONE` | write state before valid commit facts | same transition semantics | P1 | required-now |
| Lifecycle event | emit local `bubble_committed` with commit facts | emit local `done_package_path` metadata | keeps metrics event but removes local done-package authority surface | P1 | required-now |
| Filesystem | normal transcript/state writes | creating or requiring `artifacts/done-package.md` locally | remote sync-back is successor scope | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency | Behavior | Fallback Value / Action | Reason Code / Message Rule | Priority | Timing |
|---|---|---|---|---|---|---|
| state not `APPROVED_FOR_COMMIT` | state snapshot | throw | no git/transcript/state mutation | existing state error preserved | P1 | required-now |
| missing done-package | N/A | no error | continue if commit facts can be produced | no `COMMIT_DONE_PACKAGE_MISSING` local path | P1 | required-now |
| empty done-package | N/A | no error | continue if commit facts can be produced | no `COMMIT_DONE_PACKAGE_EMPTY` local path | P1 | required-now |
| no staged files without stage-all and no clone reuse | git status | throw | no transcript/state mutation | `COMMIT_STAGED_FILES_EMPTY` preserved; message should not recommend done-package | P1 | required-now |
| clone source-sync failure after git commit | git push/branch checks | throw | no transcript/state finalization | `COMMIT_CLONE_SOURCE_BRANCH_SYNC_FAILED` preserved | P1 | required-now |
| append failure after source sync | transcript append | throw | no state transition; retry via existing retained HEAD path | no new recovery | P1 | required-now |
| `DONE` transition failure after `COMMITTED` | state write | throw | transcript remains canonical | message names `COMMIT_RESULT` | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Existing `runCommitGitStep` commit/reuse/source-sync fact producer. | P1 | required-now |
| must-use | Existing transcript append port and state snapshot ports. | P1 | required-now |
| must-use | Phase 1 `COMMIT_RESULT` protocol validator contract. | P1 | required-now |
| must-not-use | `readOrCreateDonePackage` in local route. | P1 | required-now |
| must-not-use | done-package artifact content/path as local commit authority. | P1 | required-now |
| must-not-use | remote SSH marker/parser rewrites. | P1 | required-now |
| must-not-use | new crash recovery mechanism after git commit. | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Setup | Expected Result | Priority | Timing |
|---|---|---|---|---|---|
| T1 | Local staged commit succeeds without done-package file. | Approved local bubble, staged file, no `done-package.md`. | State `DONE`, transcript tail `COMMIT_RESULT`, metadata matches commit facts, no done-package file created. | P1 | required-now |
| T2 | Local commit does not require done-package. | Approved local bubble, staged file, missing artifact. | No missing done-package error. | P1 | required-now |
| T3 | Temporary `auto` stage-all no longer generates done-package. | Approved local bubble, unstaged file, `auto: true`. | File is staged/committed, `COMMIT_RESULT` emitted, no `done-package.md`. | P1 | required-now |
| T4 | No staged files without stage-all still fails. | Approved local bubble, no staged changes, no clone reuse. | `COMMIT_STAGED_FILES_EMPTY`; no transcript finalization. | P1 | required-now |
| T5 | Clone source sync failure remains fail-closed. | Existing diverged source-branch setup. | Error preserved, state remains `APPROVED_FOR_COMMIT`, no `COMMIT_RESULT`. | P1 | required-now |
| T6 | Fresh clone change finalizes with `COMMIT_RESULT`. | Existing clone happy path. | Source branch points at commit SHA; transcript tail `COMMIT_RESULT`. | P1 | required-now |
| T7 | Clone retry reuses retained local HEAD. | Existing retained HEAD setup. | No new commit; `COMMIT_RESULT` metadata uses retained SHA/message/files. | P1 | required-now |
| T8 | Append failure after source sync remains retryable. | Existing simulated append failure. | First call fails before state transition; retry finalizes same retained SHA with `COMMIT_RESULT`. | P1 | required-now |
| T9 | Application result field removed. | Local commit result returned to caller. | `donePackagePath` is absent; commit facts remain present. | P1 | required-now |
| T10 | Local lifecycle metadata has no done-package reference. | Capture local `bubble_committed` event or inspect test double. | Metadata includes commit facts/staged count and excludes `done_package_path`. | P1 | required-now |
| T11 | Remote route remains explicitly successor-owned. | Existing remote continuity test adjusted only if type/compile requires. | No claim that remote hard cutover is complete; remote transport may still sync legacy continuity until Phase 4. | P2 | required-now |
| T12 | CLI success output names the new envelope. | Commit CLI output projection receives a result with `COMMIT_RESULT` envelope. | Output no longer reports `DONE_PACKAGE`; `--auto` help/parser behavior is unchanged until Phase 3. | P2 | required-now |

### 7) Shared Contract Compatibility

| Shared Contract | Current Consumers | Additive vs Breaking | Required Alignment | Out-of-Scope Consumers |
|---|---|---|---|---|
| local transcript event type | transcript readers, tests, future status/read models | breaking local producer change | local tests and local producer | remote/read-model/docs |
| commit result object | CLI output, tests, API/router callers | breaking shared result change | remove `donePackagePath` now and adapt direct consumers | public wording/request alignment |
| lifecycle event metadata | metrics/event consumers | breaking local metadata cleanup | remove local `done_package_path` now | broad live reference cleanup |
| `auto` input | CLI/app/remote | compatibility-tightening | local semantics only: stage-all without done-package generation | public rename to `stageAll` |

### 8) Baseline Preservation

| Current Behavior | Preserve / Replace / Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| state precondition | preserve | existing require-state test | P1 | required-now |
| git commit default message | preserve | log assertion | P1 | required-now |
| message override | preserve | existing/custom assertion | P1 | required-now |
| no staged files failure | preserve | test | P1 | required-now |
| local done-package requirement | replace | missing artifact local commit succeeds | P1 | required-now |
| local done-package auto-generation | forbid | `auto` test proves no artifact | P1 | required-now |
| app result `donePackagePath` | replace | result field absent and callers compile | P1 | required-now |
| local lifecycle `done_package_path` | replace | local event metadata excludes it | P1 | required-now |
| clone retry/source-sync | preserve | existing clone tests updated to `COMMIT_RESULT` | P1 | required-now |
| remote done-package transport | preserve until successor | no remote hard-cutover changes here | P2 | required-now |

### 9) Closure-Budget Summary

| Item | Value |
|---|---|
| Closure buckets touched | `authority_producer`, `persisted_authority`, explicit `shared_contract`, limited `workflow_orchestration_consumers`, narrow `read_model_consumers` |
| Intentionally collapsed closures | local event append, local state finalization, shared app result field removal, local lifecycle metadata cleanup |
| Explicitly deferred closures | remote transport, CLI/API/UI activation, broad read-model cleanup, docs/prompt cleanup, protocol hard removal |
| Safe bounded proof | local commit producer already owns git facts, transcript append, state transition, lifecycle metadata, and returned application result in one path; direct CLI/UI-router/test fallout is limited to the removed shared result field and event label |

### 10) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Required Rule | Priority | Timing |
|---|---|---|---|---|
| Local transcript | `DONE_PACKAGE` | `COMMIT_RESULT` | metadata must match git facts | P1 | required-now |
| Local state | `DONE` after append | `DONE` after `COMMIT_RESULT` append | transition ordering unchanged | P1 | required-now |
| Application result | done-package path + commit facts | commit facts + envelope | no `donePackagePath` field | P1 | required-now |
| Local lifecycle event | commit facts + done-package path | commit facts only | no `done_package_path` metadata | P1 | required-now |
| Overall product state | mixed current model | still mixed integration slice | do not claim hard cutover complete | P1 | required-now |

## L2 - Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Extract a reusable commit-result metadata builder if remote alignment duplicates local event construction. | L2 | P3 | later-hardening | task drafting | Defer until Phase 4 shows real duplication. |
| HB2 | Rename internal `auto` plumbing to `stageAll` before public CLI cutover. | L2 | P2 | successor | parent plan Phase 3 | Own in `commit-cli-stage-all-cutover` unless Phase 2 implementation needs a tiny internal alias for clarity. |
| HB3 | Remove `commitDonePackage.ts` entirely after live docs/remote cleanup prove no active imports remain. | L2 | P3 | successor | source inspection | Delete in the earliest successor where no active runtime import remains. |

## Assumptions

1. Phase 1 `COMMIT_RESULT` validation remains merged and authoritative.
2. Local-first sequencing is allowed by the parent plan's implementation window assumption.
3. Remote bubbles do not need active compatibility during this local producer slice, but target-state remote support remains mandatory in Phase 4.
4. Temporary `auto` input spelling may remain in this task only to avoid prematurely opening Phase 3 public API/CLI migration.
5. Removing local done-package authority is more important than preserving old local tests; tests must be rewritten around `COMMIT_RESULT`.

## Spec Lock

Task state is `IMPLEMENTABLE` because:

1. The parent plan already defines the control model and Phase 2 boundary.
2. The local target files and mutation entrypoints have been inspected.
3. The task is bounded to local producer/finalization behavior and explicitly defers remote, public activation, read-model, and docs cleanup.
4. Baseline clone retry/source-sync behavior is explicitly preserved.
5. Required acceptance branches are enumerated in the call-site matrix and test matrix.

This task must be downgraded to `draft` or rerouted to plan refinement if implementation discovers that removing `donePackagePath` from the shared result cannot compile without public request/input activation or remote transport hard cutover.

## Open Questions

No blocking open questions.
