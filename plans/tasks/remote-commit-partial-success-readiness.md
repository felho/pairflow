---
artifact_type: task
artifact_id: task_remote_commit_partial_success_readiness_v1
title: "Remote Commit Partial-Success Readiness"
status: implementable
phase: phase4b
target_files:
  - "src/v11/application/commit/commitCommandApi.ts"
  - "src/v11/application/commit/commitCommandApiContract.ts"
  - "src/v11/application/commit/commitCommandDefaults.ts"
  - "src/v11/application/commit/commitCommandFinalization.ts"
  - "src/v11/application/commit/commitRemotePorts.ts"
  - "src/v11/application/merge/mergeFlowContext.ts"
  - "src/v11/application/merge/runMergeFlow.ts"
  - "src/v11/application/merge/mergeCommandContract.ts"
  - "src/v11/application/merge/mergeCommandDependencyResolution.ts"
  - "src/v11/application/merge/mergeCommandDefaults.ts"
  - "src/v11/defaults/merge/mergeCommandDefaults.ts"
  - "src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts"
  - "src/v11/infrastructure/executor/ssh/sshBubbleCommitContinuityImportCommand.ts"
  - "tests/v11/application/commit/commitCommandApi.test.ts"
  - "tests/core/bubble/commitBubble.test.ts"
  - "tests/core/bubble/mergeBubble.test.ts"
  - "tests/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.test.ts"
  - "tests/v11/infrastructure/executor/ssh/sshBubbleCommitContinuityImportCommand.test.ts"
prd_ref: null
plan_ref: plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Commit Partial-Success Readiness

## L0 - Policy

### Goal

Make started-remote commit partial-success paths deterministic and retryable after the remote side has already completed the commit, while keeping the laptop/local control plane fail-closed when remote authority is missing or inconsistent.

After this task, if a remote commit reaches remote `DONE` with a valid `COMMIT_RESULT` transcript tail and matching git facts, a later laptop-side `bubble commit` retry or `bubble merge` must be able to import that same remote authority into local continuity state without invoking the remote commit producer again, creating a second git commit, appending a synthetic local completion envelope, or accepting git HEAD alone.

### Domain / Control Model Summary

1. Business invariant: a started-remote bubble is commit-complete because the remote Pairflow command completed the state transition and produced `COMMIT_RESULT`, not because the laptop has already synced local state.
2. Control model: the remote clone remains the authority for started-remote commit completion; the laptop may import that authority only when remote state, transcript tail, and git facts prove the same bubble and commit.
3. Read-path rule: repair may read the started remote pointer, remote `state.json`, remote `transcript.ndjson`, and remote git facts from the same remote clone; local stale `state.json` is only a cache to repair.
4. Forbidden fallback: do not infer success from git HEAD alone, do not synthesize a local `COMMIT_RESULT`, do not accept `DONE_PACKAGE`, and do not accept mismatched remote state/transcript/git facts.
5. Allowed resolution path: a bounded same-authority import may copy remote `DONE` state and remote transcript content into the local bubble continuity files after validating the Phase 4A `COMMIT_RESULT` contract against remote git facts.
6. Missing-data rule: missing remote pointer, unavailable remote, missing state, missing transcript, non-`DONE` state, non-`COMMIT_RESULT` tail, or mismatched facts remains fail-closed/unavailable; local crash-after-git-commit recovery is not expanded.
7. Phase boundary:
   - contract closure: narrowed here for a read-only remote continuity import port/result; no public CLI/API response-shape change is required.
   - producer closure: predecessor-owned by Phase 4A; this task must not change normal remote commit production.
   - internal execution closure: owned here for read-only remote continuity import over SSH and remote retry classification.
   - workflow/orchestration closure: owned here for commit retry and merge eligibility repair.
   - read-model closure: no status/list/UI rollout beyond command behavior needed here.
   - activation closure: active for started-remote `bubble commit` retry and `bubble merge` only.
   - cleanup/recovery closure: owned here only for partial-success continuity import; broader cleanup and docs cleanup remain successor-owned.

### Plan Linkage

1. Parent plan gap closed: Phase 4B, `remote-commit-partial-success-readiness`.
2. Depends on: Phase 4A `remote-commit-result-transport-cutover`, archived at `plans/archive/tasks/remote-commit-result-transport-cutover.md`.
3. Unlocks / impacts successors: enables Phase 5 done-package live-reference cleanup to assume both local and remote producers plus partial-success repair operate on `COMMIT_RESULT`.
4. Task-list impact: refines the parent plan's open successor task `remote-commit-partial-success-readiness` into an implementable task file.
5. Inherited validation / exit expectation: remote partial-success retry/repair must import refreshed remote state/transcript authority, remain idempotent, and let merge eligibility proceed when remote `DONE` is proven.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md`: Phase 4B control model and exit criteria.
   - `plans/archive/tasks/remote-commit-result-transport-cutover.md`: Phase 4A target remote `COMMIT_RESULT` transport contract.
   - `src/v11/application/commit/commitRemotePorts.ts`: remote commit result contract.
   - `src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts`: Phase 4A remote state/transcript/git fact parser and validation behavior.
   - `src/v11/application/commit/commitCommandFinalization.ts`: local continuity sync-back helper for state/transcript.
   - `src/v11/application/merge/mergeFlowContext.ts`: current local `DONE` eligibility gate.
2. Canonical elements:
   - remote `state.json` with matching `bubble_id` and `state === "DONE"`.
   - remote transcript tail with matching `bubble_id` and `type === "COMMIT_RESULT"`.
   - `metadata.commit_sha`, `metadata.commit_message`, and `metadata.staged_files`.
   - remote git facts from the same remote clone.
3. Guard elements:
   - git HEAD SHA/message/file list are consistency guards against the transcript tail.
   - SSH marker framing is transport framing, not completion authority by itself.
4. Compat-only elements:
   - local stale `state.json` and local stale transcript are repair targets only.
   - local remote pointer is routing authority, not completion proof.
5. Forbidden reinterpretations:
   - do not promote git HEAD to completion authority.
   - do not reinterpret remote status summary alone as enough to write local continuity.
   - do not make `DONE_PACKAGE` valid again.
   - do not turn this into general local crash-after-git-commit recovery.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `commitCommandApi.ts`: remote route currently calls remote commit, syncs state/transcript on success, and fails with `REMOTE_COMMIT_SYNC_BACK_FAILED` when local sync-back breaks.
   - `commitRemotePorts.ts`: remote commit port currently returns validated state/transcript/git facts only from a normal command success.
   - `commitCommandFinalization.ts`: sync-back already writes state/transcript with rollback semantics.
   - `mergeFlowContext.ts`: merge currently checks local `state.json` for `DONE` before started-remote dispatch, so stale local state blocks remote merge before the remote can prove completion.
   - `runMergeFlow.ts`: started-remote merge dispatch/import occurs after the local eligibility context is initialized.
   - `mergeCommandDependencyResolution.ts`: resolved merge dependencies must include any new remote continuity import dependency before production merge can use it.
   - `defaults/merge/mergeCommandDefaults.ts`: production merge defaults live here; the application `mergeCommandDefaults.ts` file is only the lazy wrapper around those defaults.
   - `sshBubbleCommitCommand.ts`: Phase 4A parser already validates remote `DONE` + `COMMIT_RESULT` + git facts after running remote commit.
   - `tests/v11/application/commit/commitCommandApi.test.ts`, `tests/core/bubble/commitBubble.test.ts`, and `tests/core/bubble/mergeBubble.test.ts`: existing remote route and merge tests provide fixture patterns.
2. Actual touched scope: fail-closed hardening with a bounded read-only continuity import path and workflow/orchestration alignment for commit retry and merge eligibility.
3. Mutation entrypoints in scope:
   - local continuity write of `state.json` and `transcript.ndjson` after validated remote proof.
   - started-remote commit retry result mapping after remote completion is imported.
   - started-remote merge eligibility refresh before local stale-state rejection.
4. Hidden scope ruled out:
   - normal remote commit production remains Phase 4A behavior.
   - local commit producer ordering remains unchanged.
   - UI/router/read-model behavior is not activated here.
   - docs and protocol `DONE_PACKAGE` live-reference removal remains Phase 5.
5. Branch inventory note:
   - normal remote commit success with sync-back success.
   - remote commit success with local sync-back failure.
   - retry after remote already `DONE`.
   - immediate merge with stale local non-`DONE` state but remote `DONE` proven.
   - remote unavailable/missing state/missing transcript/non-`DONE`/legacy `DONE_PACKAGE`/metadata mismatch/git-only success.
6. Why the declared task shape matches reality: the producer and shared `COMMIT_RESULT` contract already exist; this task only repairs stale local continuity by importing the same remote authority under strict fail-closed validation.

### Authority Boundary Map

1. Authority producer: remote `pairflow bubble commit` running in the started remote clone; predecessor Phase 4A owns the producer contract.
2. Stored authority: remote `.pairflow/bubbles/<id>/state.json`, remote `.pairflow/bubbles/<id>/transcript.ndjson`, and remote git commit facts.
3. In-scope consumers:
   - started-remote `bubble commit` retry path.
   - started-remote `bubble merge` eligibility path.
   - local continuity sync-back state/transcript writer.
4. Explicit out-of-scope consumers:
   - status/list/UI projection repair.
   - protocol type-family removal.
   - docs/prompt cleanup.
   - local clone retry/source-branch sync behavior.
5. Export surfaces closed in this phase: command behavior closes for commit retry and merge eligibility; public result shape should remain the existing `CommitBubbleResult` / `MergeBubbleResult`.

### Baseline Preservation

1. Must-preserve behaviors:
   - normal remote commit success path still runs exactly one remote commit command and syncs returned state/transcript.
   - remote commit requires a `started` remote pointer from the laptop control plane.
   - inner remote execution refuses source-repo remote artifacts.
   - local commit route and clone retry behavior are unchanged.
   - sync-back failure remains fail-closed unless a later same-authority import proves remote completion.
   - merge local clean-worktree and branch eligibility checks remain intact.
2. Allowed resolution paths:
   - read-only remote continuity import from the same started remote clone after remote commit may have completed.
   - merge preflight refresh of remote `DONE` authority before local stale `MERGE_STATE_DONE_REQUIRED` rejection.
   - retry of remote commit route that returns the existing remote commit facts without creating a second git commit or appending a second completion envelope.
   - an already-proven remote completion must be imported through the read-only continuity import path before any remote commit producer command is invoked.
3. Forbidden regression interpretations:
   - do not remove fail-closed mismatch behavior to make stale-state tests pass.
   - do not relax remote state/transcript/git-fact agreement.
   - do not bypass local clean-worktree or base-branch checks for merge.
   - do not treat remote status `state: DONE` alone as enough to write local continuity.
4. Replacement proof required if removed:
   - any moved eligibility check must prove that remote proof is imported before local stale-state rejection and that all other merge preconditions still execute.
   - any new import helper must prove parity with Phase 4A parser rules or reuse the same validation logic.

### Success / Completion Proof Boundary

1. Current canonical success proof source: normal remote command success returns validated state/transcript/git facts; local continuity sync-back must succeed before laptop-side command returns success.
2. Target canonical success proof source: normal command success remains unchanged; partial-success retry/repair may import the same remote `DONE` + `COMMIT_RESULT` + matching git facts after the original command reached the remote completion point.
3. Current canonical completion proof source: local state `DONE` and transcript content after successful sync-back.
4. Target canonical completion proof source: local state/transcript after successful same-authority remote import; remote authority remains the proof source for repair.
5. Reused proof contract: Phase 4A remote `COMMIT_RESULT` metadata validation against remote state and git facts.
6. Proof-parity rule: `inherit_full_parity`.
7. Final truth surfaces affected:
   - `CommitBubbleResult` may be returned from imported remote facts on retry.
   - merge eligibility may update local state/transcript before started-remote merge dispatch.
   - no new lifecycle event should be synthesized during import unless explicitly justified by existing commit event semantics.
8. Mixed-truth surfaces allowed: none; local cache may be stale before repair, but after repair state/transcript must be copied from the validated remote authority.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `fail_closed_hardening`.
2. Secondary shape (if any): `workflow_orchestration_consumers`, limited to commit retry and merge eligibility sequencing.
3. Preconditions that must pass before side effects:
   - local bubble resolves and executor is started-remote.
   - remote pointer kind is `started` and host matches configured remote target.
   - remote state content parses and has matching `bubble_id` and `state === "DONE"`.
   - remote transcript content parses and tail is matching `COMMIT_RESULT`.
   - remote git facts are present and match transcript metadata.
4. Side effects forbidden before preconditions pass:
   - no local `state.json` write.
   - no local `transcript.ndjson` write.
   - no local lifecycle event append.
   - no merge dispatch/import.
   - no second remote commit producer invocation when remote completion has already been proven by the read-only import path.
5. Commit route branch-discriminator rule:
   - after resolving a started remote pointer and configured remote target, read local state as route-discrimination input before invoking the remote commit producer.
   - run a read-only remote continuity import/probe before producer invocation.
   - if the probe validates remote `DONE` + `COMMIT_RESULT` + matching git facts, import continuity and return imported facts without invoking the producer.
   - if the probe finds no remote completion evidence and local state is still commit-eligible (`APPROVED_FOR_COMMIT`), use the normal first-commit producer path.
   - if the probe finds no remote completion evidence and local state is not commit-eligible, fail closed with the existing local state/commit eligibility error; do not invoke the producer as recovery.
   - if the probe sees a remote `DONE` state or `COMMIT_RESULT`-like tail but validation fails, fail closed as invalid remote authority and do not invoke the producer.
   - if the probe cannot reach the remote, surface remote unavailable/transport failure and do not fall back to git-only or local stale success.
6. Invalid/precondition-failure behavior: fail closed with the existing command error family where possible; do not silently downgrade to local stale state success.
7. Coordination primitives in scope: idempotent read-only import behavior only; no lock/lease/mutex or broad retry scheduler is introduced.

### In Scope

1. Add a read-only remote commit continuity import path that collects remote state, transcript, and git facts from the started remote clone without running another commit.
2. Reuse or factor Phase 4A validation so imported remote proof must satisfy the same `DONE` + `COMMIT_RESULT` + git-fact agreement as normal remote commit success.
3. Allow remote commit retry after proven remote completion to sync local state/transcript and return the same technical commit facts.
4. Allow started-remote merge eligibility to refresh/import proven remote `DONE` state before rejecting solely because local `state.json` is stale.
5. Preserve fail-closed behavior for remote unavailable, non-`DONE`, legacy `DONE_PACKAGE`, missing transcript/state, and mismatch cases.
6. Add focused regression tests for stale local state after remote completion, commit retry idempotency, merge eligibility refresh, and mismatch rejection.

### Out of Scope

1. General local crash-after-git-commit recovery.
2. Reworking local commit producer ordering.
3. Retrying remote commit creation after an unproven transport failure.
4. Synthesizing local `COMMIT_RESULT` from git facts.
5. Status/list/UI repair or visibility changes.
6. Removing `DONE_PACKAGE` from active protocol validation.
7. Live README/docs/prompt cleanup.
8. New remote cleanup/delete semantics.

### Safety Defaults

1. If remote proof is unavailable or inconsistent, fail closed and leave local continuity untouched.
2. If local continuity sync-back fails during repair, keep existing rollback semantics and surface a sync/import failure.
3. If remote state is `DONE` but transcript tail is not `COMMIT_RESULT`, reject it.
4. If transcript metadata and git facts disagree, reject it.
5. If only git HEAD indicates a commit, reject it.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - remote commit internal port: may add a read-only continuity import port/result, but must keep public `CommitBubbleResult` unchanged.
   - merge workflow orchestration: started-remote merge may refresh local continuity before local stale-state rejection.
   - event/protocol contract: no new protocol event shape; no synthetic event emission.
3. `plan_ref` is mandatory and present.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `2`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `10`
8. `single-task allowed`: `yes, because producer and shared contract closure are predecessor-owned; this task is a bounded fail-closed repair over two adjacent workflow consumers of the same remote authority.`
9. Identity/join note:
   - canonical identity path: requested `bubbleId`, remote `state.bubble_id`, remote transcript tail `bubble_id`, remote pointer clone path, and returned/imported result `bubbleId`.
   - competing identifiers or fallback identities: git HEAD SHA is a guard only and cannot identify Pairflow completion without state/transcript.
10. Authority/source-of-truth note:
   - canonical source: remote state/transcript plus matching git facts from the same started remote clone.
   - forbidden secondary sources: local stale state, remote status summary alone, git-only evidence, done-package artifacts.
11. Closure-budget triage:
   - closure buckets touched: `internal_execution_consumers`, `workflow_orchestration_consumers`, `cleanup_recovery_consumers`.
   - intentionally collapsed closures: commit retry and merge eligibility both consume the same read-only remote continuity import and write the same local continuity files.
   - explicitly deferred closures: producer contract, protocol cleanup, docs cleanup, UI/status read-model rollout, broad recovery scheduler.
12. Bounded-task-shape decision:
   - primary shape: `fail_closed_hardening`.
   - secondary shape: `workflow_orchestration_consumers`.
   - why this bounded mix is safe: no new producer authority is introduced; orchestration changes are limited to when the existing remote authority may be imported before stale local rejection.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Remote commit completion is proven by remote lifecycle completion, not by local cache freshness. | Remote `DONE` + `COMMIT_RESULT` can repair stale local continuity. | P1 | required-now |
| Control model | Remote clone controls started-remote commit completion. | Laptop repair must import remote authority, not invent local authority. | P1 | required-now |
| Read-path rule | Repair reads remote state, transcript, and git facts from the same remote clone. | Add or reuse a read-only SSH import path. | P1 | required-now |
| Forbidden fallback | Git HEAD alone, remote status summary alone, `DONE_PACKAGE`, and local stale state are not success proof. | Mismatch and missing-data cases remain fail-closed. | P1 | required-now |
| Allowed resolution path | Deterministic same-authority import is allowed after remote completion is proven. | Copy remote state/transcript into local continuity only after validation. | P1 | required-now |
| Missing-data rule | Missing or unavailable remote authority fails closed. | No local writes or merge dispatch before proof. | P1 | required-now |
| Phase boundary | Own partial-success import and merge eligibility repair only. | Do not pull in Phase 5 docs/protocol cleanup or local crash recovery. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `COMMIT_RESULT` metadata | `commitCommandFinalizationMutation.ts`, Phase 4A task | Canonical technical commit facts. | Preserve; validate against git facts. | P1 | required-now |
| remote `state.json` | `types/bubble.ts`, Phase 4A task | Canonical remote lifecycle state. | Preserve; require matching `bubble_id` and `DONE`. | P1 | required-now |
| remote git facts | `sshBubbleCommitCommand.ts` | Guard against transcript metadata mismatch. | Preserve as guard, not standalone proof. | P1 | required-now |
| local stale state | `mergeFlowContext.ts` | Cache/repair target for started remote. | May be replaced only after remote proof. | P1 | required-now |
| `DONE_PACKAGE` | parent plan | Removed target-state completion model. | Reject; do not restore compatibility. | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Commit remote route, merge context initialization, SSH remote commit parser, sync-back helper, and relevant tests define scope. | Review must compare implementation against these concrete files. | P1 | required-now |
| Actual touched scope | Fail-closed hardening plus workflow consumer sequencing. | Do not reclassify as producer or UI/read-model task. | P1 | required-now |
| Mutation entrypoints in scope | Local state/transcript sync-back and merge dispatch gating. | All writes require validated remote proof first. | P1 | required-now |
| Hidden scope ruled out | Normal producer, local commit, protocol cleanup, docs cleanup, status/UI rollout. | Avoid expanding task during implementation. | P1 | required-now |
| Branch inventory note | Success, sync-back fail, retry, merge stale-state refresh, mismatch/unavailable. | Tests must cover each required-now branch family. | P1 | required-now |
| Shape proof | Same authority, same local continuity targets, no new producer. | Single task is acceptable despite two workflow consumers. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Phase 4B partial-success readiness. | Must satisfy parent exit criteria 1-5 for Phase 4B. | P1 | required-now |
| Depends on | Phase 4A remote commit transport cutover. | Implementation may rely on remote `COMMIT_RESULT` target contract. | P1 | required-now |
| Unlocks / impacts successors | Phase 5 live-reference cleanup. | Successor can assume remote partial-success does not depend on done-package. | P2 | required-now |
| Task-list impact | Refines `remote-commit-partial-success-readiness`. | Parent plan should be updated when completed. | P2 | required-now |
| Inherited validation / exit expectation | Idempotent retry/import and merge readiness. | Required tests must prove no second remote commit producer invocation, git commit, or envelope and no stale local merge rejection. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `ExecuteRemoteBubbleCommitCommandResult` | commit remote route, tests | N/A or additive only | Preserve normal success shape. | N/A |
| new read-only remote continuity import port | commit retry, merge eligibility | additive | Add internal port/result if needed. | N/A |
| `CommitBubbleResult` | CLI/API/UI callers | N/A | Preserve public shape. | N/A |
| `MergeBubbleResult` | CLI/API/UI callers | N/A | Preserve public shape. | N/A |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| normal remote commit success syncs state/transcript | Preserve | Existing success tests still pass. | P1 | required-now |
| sync-back failure reports `REMOTE_COMMIT_SYNC_BACK_FAILED` | Preserve with bounded retry/import successor behavior | Failure still fails closed when repair not explicitly invoked or import fails. | P1 | required-now |
| merge requires `DONE` | Replace only for started-remote stale local cache before rejection | Test proves remote `DONE` import happens before stale `MERGE_STATE_DONE_REQUIRED`. | P1 | required-now |
| local commit producer retry semantics | Preserve | Local commit tests unchanged. | P1 | required-now |
| git-only completion | Forbid | Mismatch/git-only tests reject. | P1 | required-now |

### 0f) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Canonical / Compat / Guard | Mixed-Truth Allowed? | Priority | Timing |
|---|---|---|---|---|---|---|
| remote commit retry result | normal remote command success only | imported remote `DONE` + `COMMIT_RESULT` + git facts | canonical remote authority | no | P1 | required-now |
| local continuity files | local sync-back success | copied remote state/transcript after validation | canonical cache repair | no | P1 | required-now |
| merge eligibility | local `state.json === DONE` | local `DONE`, or started-remote import then local `DONE` | canonical after import | no | P1 | required-now |
| git facts | remote git commands | same | guard | no | P1 | required-now |

### 0g) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| commit retry import | started remote pointer, host target, remote `DONE`, `COMMIT_RESULT`, matching git facts | local state/transcript write; lifecycle event append | fail closed, leave local files unchanged | P1 | required-now |
| merge stale-state refresh | started remote pointer and remote proof | merge dispatch, import ref fetch, cleanup | fail closed or original merge error without local mutation | P1 | required-now |
| remote unavailable | transport/config availability | any local continuity write | unavailable/fail-closed | P1 | required-now |
| mismatch/git-only | state/transcript/git agreement | any local continuity write | payload invalid/fail-closed | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/commit/commitRemotePorts.ts` | remote continuity import port | `(input: { bubbleId; remoteClonePath; remoteTarget }) -> Promise<ExecuteRemoteBubbleCommitCommandResult-like>` | Additive internal port or exported type | Represents read-only import of remote state/transcript/git facts. | P1 | required-now | typecheck + unit tests |
| CS2 | `src/v11/infrastructure/executor/ssh/sshBubbleCommitContinuityImportCommand.ts` | `executeRemoteBubbleCommitContinuityImportCommand` | read-only SSH input -> validated remote commit facts | New file or factored from `sshBubbleCommitCommand.ts` | Reads remote artifacts without running `bubble commit`; validates with Phase 4A rules. | P1 | required-now | parser tests |
| CS3 | `src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts` | shared parser/validator | existing exported or factored helpers | Factor validation carefully | Normal commit and import paths use equivalent validation. | P1 | required-now | existing + new tests |
| CS4 | `src/v11/application/commit/commitCommandApi.ts` | `commitRemoteExecutionRoute` | existing | Before remote producer invocation, after started remote pointer/target resolution and local state read | Classify route as imported completion, normal first commit, invalid remote authority, or unavailable remote; retry after proven remote completion imports continuity and returns same facts without a second remote commit producer invocation, second git commit, or synthetic envelope. | P1 | required-now | commit API tests |
| CS5 | `src/v11/application/commit/commitCommandDefaults.ts` | dependency defaults | existing object | Add lazy import for new port if introduced | Production path can execute read-only import. | P1 | required-now | typecheck |
| CS6 | `src/v11/application/merge/mergeCommandContract.ts` | `MergeBubbleDependencies` | existing dependency bag | Add optional/required remote continuity import dependency as needed | Merge workflow can request the same validated remote authority as commit retry. | P1 | required-now | typecheck |
| CS7 | `src/v11/application/merge/mergeCommandDependencyResolution.ts` | dependency resolution | existing resolver | Resolve the new merge import dependency into `ResolvedMergeCommandDependencies` | Production and tests use the same dependency surface. | P1 | required-now | typecheck |
| CS8 | `src/v11/defaults/merge/mergeCommandDefaults.ts` | production defaults | existing defaults object | Add production lazy/default implementation for the merge import dependency | Production merge path can execute read-only import; application wrapper remains a loader only. | P1 | required-now | typecheck |
| CS9 | `src/v11/application/merge/mergeFlowContext.ts` | `initializeMergeFlowExecutionContext` | existing | Before `assertMergeStateEligibility` rejects stale local non-`DONE` for started-remote bubbles | Started-remote stale local state can import remote proof before final state eligibility. | P1 | required-now | merge tests |
| CS10 | `src/v11/application/merge/runMergeFlow.ts` | started-remote route | existing | After context initialization | Merge proceeds only after local continuity is repaired and all existing remote handoff checks remain. | P1 | required-now | merge tests |
| CS11 | tests | targeted regression tests | N/A | Add focused tests | Cover stale local state, retry idempotency, mismatch, unavailable. | P1 | required-now | test run |

### 1a) Commit Retry Branch Order

| Case | Required Branch Order | Remote Commit Producer Invocation Allowed? | Local Continuity Write Allowed? | Result / Error Contract | Priority | Timing |
|---|---|---|---|---|---|---|
| Normal started-remote commit, no remote completion evidence, local state commit-eligible | Resolve started pointer/target, read local state, run read-only import/probe; if probe returns `no_remote_completion_evidence` and local state is `APPROVED_FOR_COMMIT`, run existing remote commit command, then sync returned validated state/transcript. | yes, exactly existing producer path | yes, after existing Phase 4A validation | existing `CommitBubbleResult`; existing sync-back failure behavior | P1 | required-now |
| Retry after prior sync-back failure or local stale cache, remote import proof valid | Resolve started pointer/target, read local state, run read-only import/probe; if probe validates remote `DONE`, write local continuity and return imported facts. | no | yes, after import validation | existing `CommitBubbleResult` from imported facts | P1 | required-now |
| Remote completion-like evidence exists but is invalid | If remote state is `DONE`, transcript tail is `COMMIT_RESULT`/legacy completion-like, or git facts indicate a candidate completion, but state/transcript/git validation fails, stop before producer invocation. | no | no | remote payload/import invalid error | P1 | required-now |
| No remote completion evidence and local state is not commit-eligible | After import/probe returns `no_remote_completion_evidence`, enforce the existing local commit eligibility gate. | no | no | existing local commit state/eligibility error | P1 | required-now |
| Remote unavailable during preflight import/probe | Surface unavailable/transport failure; do not infer success from local stale state or git-only evidence. | no | no | remote transport/config or import unavailable error | P1 | required-now |
| Fresh remote command failure before completion can be proven | Existing producer failure behavior remains after the normal first-commit branch has legitimately invoked the producer; optional post-failure import may be attempted only as read-only proof gathering. | already attempted by the normal path | only if import later validates full remote proof | existing remote command error, or imported result if full proof validates | P1 | required-now |
| Remote proof already imported locally | Treat as idempotent completion; do not append a synthetic local envelope. | no | no additional write unless needed to restore identical missing continuity content | existing `CommitBubbleResult` facts must match the imported remote transcript/git facts | P1 | required-now |

### 1b) Remote Continuity Import/Probe Classification

| Classification | Evidence | Commit Route Behavior | Merge Route Behavior | Priority | Timing |
|---|---|---|---|---|---|
| `imported_remote_completion` | Remote state `DONE`, transcript tail `COMMIT_RESULT`, bubble identity matches, and git facts match metadata. | Sync local continuity and return imported `CommitBubbleResult` facts without producer invocation. | Sync local continuity before merge eligibility and continue existing merge preconditions. | P1 | required-now |
| `no_remote_completion_evidence` | Remote state/transcript are absent or not yet complete in a way that does not present `DONE` or completion-like evidence. | Producer may run only if local state is `APPROVED_FOR_COMMIT`; otherwise fail with existing local eligibility error. | Do not repair; continue to existing local `MERGE_STATE_DONE_REQUIRED`/eligibility failure. | P1 | required-now |
| `invalid_remote_completion_evidence` | Remote state is `DONE`, transcript tail is `COMMIT_RESULT`/legacy completion-like, or git facts indicate candidate completion, but required state/transcript/git agreement fails. | Fail closed; no producer invocation and no local write. | Fail closed; no merge dispatch and no local write. | P1 | required-now |
| `remote_unavailable` | Remote target cannot be reached or required remote reads cannot be executed. | Fail with remote transport/config or import unavailable error; no producer fallback. | Fail with remote transport/config or import unavailable error; no merge dispatch. | P1 | required-now |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| remote continuity import input | N/A | read-only remote proof input | `bubbleId`, `remoteClonePath`, `remoteTarget` | none | additive internal | P1 | required-now |
| remote continuity import/probe result | normal remote command result only | classified read-only proof result usable by commit retry and merge eligibility | on `imported_remote_completion`: `bubbleId`, `sequence`, `envelope`, `state`, `stateContent`, `transcriptContent`, `commitSha`, `commitMessage`, `stagedFiles`; on non-import classifications: classification and reason | none | additive/reuse | P1 | required-now |
| public commit result | technical facts | unchanged | existing fields | none | non-breaking | P1 | required-now |
| public merge result | merge facts/cleanup | unchanged | existing fields | none | non-breaking | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Remote SSH | Read state, transcript, git facts; optionally detect already-DONE remote completion. | Invoking the remote commit producer, running another git commit, or appending another completion envelope after completion is proven. | Import command must be read-only. | P1 | required-now |
| Local FS | Write/rollback local `state.json` and `transcript.ndjson` after validation. | Writing before full proof; writing done-package. | Reuse sync helper where possible. | P1 | required-now |
| Git | Existing merge fetch/import after eligibility. | Git-only success inference; local commit producer changes. | Merge git behavior remains existing route. | P1 | required-now |
| Protocol/events | No synthetic completion envelope. | Appending a fake local `COMMIT_RESULT`. | Remote transcript is copied, not recreated. | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| remote unavailable | SSH/status/import | throw | leave local continuity unchanged | reuse existing remote transport/config reason when thrown by underlying dependency; otherwise use `REMOTE_COMMIT_CONTINUITY_IMPORT_UNAVAILABLE` for commit route and `MERGE_REMOTE_COMMIT_CONTINUITY_IMPORT_UNAVAILABLE` for merge route | warn | P1 | required-now |
| no remote completion evidence | remote import/probe | result classification | commit route may run producer only when local state is `APPROVED_FOR_COMMIT`; merge route continues to existing local eligibility failure | `no_remote_completion_evidence` classification, not an import-invalid reason by itself | info | P1 | required-now |
| completion-like evidence with missing/non-`COMMIT_RESULT` transcript | remote import/probe | throw | leave local continuity unchanged | `REMOTE_COMMIT_CONTINUITY_IMPORT_INVALID` for commit route; `MERGE_REMOTE_COMMIT_CONTINUITY_IMPORT_INVALID` for merge route | warn | P1 | required-now |
| metadata/git mismatch | remote import/probe | throw | leave local continuity unchanged | `REMOTE_COMMIT_CONTINUITY_IMPORT_INVALID` for commit route; `MERGE_REMOTE_COMMIT_CONTINUITY_IMPORT_INVALID` for merge route | warn | P1 | required-now |
| local sync-back fails during repair | FS rename/write | throw | rollback via existing helper | `REMOTE_COMMIT_SYNC_BACK_FAILED` for commit route; `MERGE_REMOTE_COMMIT_CONTINUITY_SYNC_BACK_FAILED` for merge route | warn | P1 | required-now |
| local stale state but no started remote pointer | artifact | throw | existing `MERGE_STATE_DONE_REQUIRED`/start-required behavior | existing | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Phase 4A validation semantics; `syncRemoteCommitContinuityArtifacts`; `readRemotePointer`; configured remote target host matching | P1 | required-now |
| must-not-use | git-only inference; `DONE_PACKAGE`; local synthetic transcript append; broad retry loops; local crash recovery | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Setup | Expected Result | Priority | Timing |
|---|---|---|---|---|---|
| T1 | Commit retry imports remote DONE after previous sync-back failure. | Local state stale/non-`DONE`; started remote pointer; remote state `DONE`; transcript tail `COMMIT_RESULT`; git facts match. | `commitBubble` returns technical commit facts, writes local state/transcript, and does not invoke the remote commit producer. | P1 | required-now |
| T2 | Commit retry is idempotent. | Remote already has `COMMIT_RESULT`; retry path invoked more than once. | Same commit SHA/message/files returned; no duplicate remote commit producer invocation, git commit, or synthetic envelope. | P1 | required-now |
| T3 | Fresh started-remote commit still runs producer when no remote completion evidence exists. | Local state `APPROVED_FOR_COMMIT`; started remote pointer; import/probe returns `no_remote_completion_evidence`. | Existing remote commit producer is invoked once; normal Phase 4A validation and sync-back still apply. | P1 | required-now |
| T4 | No remote completion evidence plus non-commit-eligible local state does not invoke producer. | Local state is not `APPROVED_FOR_COMMIT`; started remote pointer; import/probe returns `no_remote_completion_evidence`. | Existing local eligibility error; no remote producer invocation and no local write. | P1 | required-now |
| T5 | Merge eligibility refreshes stale local state. | Local `state.json` is stale/non-`DONE`; started remote pointer; remote proof valid. | `mergeBubble` imports state/transcript before local stale-state rejection and proceeds to remote merge dispatch. | P1 | required-now |
| T6 | Merge does not bypass other prerequisites. | Remote proof valid but repo dirty or base branch missing. | Existing merge errors still occur; no remote merge dispatch when later preconditions fail. | P1 | required-now |
| T7 | Git-only success rejected as repair proof. | Remote git HEAD exists, but local state is not commit-eligible and remote state/transcript do not provide valid `DONE` + `COMMIT_RESULT` proof. | No local write; no producer invocation; command fails closed instead of importing or succeeding from git facts alone. | P1 | required-now |
| T8 | Mismatch rejected. | Remote state/transcript/git facts disagree. | No local write; command fails closed. | P1 | required-now |
| T9 | Legacy `DONE_PACKAGE` rejected. | Remote transcript tail `DONE_PACKAGE`. | No local write; command fails closed. | P1 | required-now |
| T10 | Normal Phase 4A remote commit still works. | Existing normal remote commit success fixture. | Existing tests pass unchanged except dependency injection additions. | P1 | required-now |

### 7) Validation Commands

1. `pnpm build`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm vitest run tests/v11/application/commit/commitCommandApi.test.ts tests/core/bubble/commitBubble.test.ts tests/core/bubble/mergeBubble.test.ts tests/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.test.ts tests/v11/infrastructure/executor/ssh/sshBubbleCommitContinuityImportCommand.test.ts`
5. `pnpm test`

## L2 - Hardening Backlog

1. Add a later operator-facing diagnostic that explicitly reports when local continuity was repaired from remote authority.
   - Timing: later-hardening.
   - Reason: useful for observability, not required for correctness.
2. Consider factoring a shared remote state/transcript/git-fact parser module if Phase 5 or later remote repair paths need the same validation.
   - Timing: later-hardening unless duplication becomes unsafe during implementation.
3. Add live documentation for partial-success repair only after Phase 5 live-reference cleanup decides final operator wording.
   - Timing: successor-owned.
