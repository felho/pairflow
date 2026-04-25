---
artifact_type: task
artifact_id: task_remote_commit_result_transport_cutover_v1
title: "Remote Commit Result Transport Cutover"
status: implementable
phase: phase4a
target_files:
  - "src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts"
  - "src/v11/application/commit/commitRemotePorts.ts"
  - "src/v11/application/commit/commitCommandApi.ts"
  - "src/v11/application/commit/commitCommandFinalization.ts"
  - "src/v11/application/commit/commitCommandApiContract.ts"
  - "src/v11/application/commit/commitCommandDefaults.ts"
  - "tests/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.test.ts"
  - "tests/v11/application/commit/commitCommandApi.test.ts"
  - "tests/v11/application/commit/commitCommandErrorNormalization.test.ts"
prd_ref: null
plan_ref: plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Commit Result Transport Cutover

## L0 - Policy

### Goal

Move the normal successful started-remote `bubble commit` path from done-package transport to the same `COMMIT_RESULT` technical contract used by local commit.

After this task, a successful remote commit must return and sync local continuity from remote `DONE` state, remote transcript tail `COMMIT_RESULT`, and matching git commit facts. It must not require, read, write, emit, or transport `artifacts/done-package.md`.

### Domain / Control Model Summary

1. Business invariant: a remote bubble commit is complete because the remote Pairflow command created or finalized a git commit and transitioned the remote bubble state to `DONE`, not because a prose done-package artifact exists.
2. Control model: the remote commit runtime controls commit completion; laptop-side code accepts completion only from the remote state, transcript tail, and returned git commit facts.
3. Read-path rule: first-party remote commit consumers read state from synced `state.json`, completion event from synced `transcript.ndjson`, and technical facts from the remote command result.
4. Forbidden fallback: do not accept `DONE_PACKAGE`, `done-package.md`, `donePackageContent`, `donePackagePath`, or git HEAD alone as the normal successful remote completion proof.
5. Allowed resolution path: the SSH script may collect remote `state.json`, `transcript.ndjson`, `git rev-parse HEAD`, `git log -1 --pretty=%s HEAD`, and `git diff-tree --no-commit-id --name-only -r HEAD`; the parser must prove they agree with the transcript tail `COMMIT_RESULT`.
6. Missing-data rule: missing state, missing transcript, non-`DONE` state, non-`COMMIT_RESULT` tail, missing commit facts, or mismatched transcript/git facts is `REMOTE_COMMIT_PAYLOAD_INVALID`.
7. Phase boundary:
   - contract closure: remote commit port/result contract only.
   - producer closure: remote command invocation of already-cut-over commit producer only; do not reopen local commit producer authority.
   - internal execution closure: SSH remote command construction, marker parsing, and application remote route.
   - workflow/orchestration closure: normal successful remote commit result mapping and local continuity sync-back.
   - read-model closure: root/API returned `CommitBubbleResult` parity for remote commit.
   - activation closure: remote command uses `--stage-all`, not `--auto`.
   - cleanup/recovery closure: only remove done-package sync-back from the normal success path; partial-success refresh/import and merge-readiness repair remain Phase 4B.

### Plan Linkage

1. Parent plan gap closed: Phase 4A, `remote-commit-result-transport-cutover`.
2. Depends on:
   - Phase 1 `commit-result-protocol-contract`: `COMMIT_RESULT` exists and validates as a closed technical payload.
   - Phase 2 `local-commit-done-package-removal`: local commit emits `COMMIT_RESULT` and `CommitBubbleResult` excludes `donePackagePath`.
   - Phase 3A `commit-cli-stage-all-cutover`: application/CLI staging input uses `stageAll`.
   - Phase 3B `commit-ui-stage-all-alignment`: first-party UI/router request producers no longer need application-level public `auto`.
3. Unlocks / impacts successors:
   - Phase 4B `remote-commit-partial-success-readiness` can reason about target-state remote artifacts.
   - Phase 5 `done-package-live-reference-cleanup` can remove active `DONE_PACKAGE` validation only after local and remote producers both emit `COMMIT_RESULT`.
4. Task-list impact: refines the parent plan's open task `remote-commit-result-transport-cutover` into an implementable task file.
5. Inherited validation / exit expectation: remote normal success path must leave local state `DONE`, transcript tail `COMMIT_RESULT`, and immediate follow-up local merge eligibility unblocked when the commit command itself returns success.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md`: Phase 4A target contract.
   - `src/v11/application/commit/commitCommandContract.ts`: shared `CommitBubbleInput` and `CommitBubbleResult`.
   - `src/v11/shared/commit/commitCommandFinalizationMutation.ts`: local `COMMIT_RESULT` envelope payload shape.
   - `src/v11/application/commit/commitCommandFinalization.ts`: lifecycle event and sync-back helper.
   - `src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts`: current remote transport markers and parser.
2. Canonical elements:
   - `COMMIT_RESULT` transcript tail.
   - `metadata.commit_sha`, `metadata.commit_message`, `metadata.staged_files`.
   - remote state must be `DONE`.
   - remote command flag spelling is `--stage-all`.
3. Guard elements:
   - returned remote HEAD SHA, HEAD message, and changed-file list are consistency guards against the transcript tail.
   - SSH marker presence is a transport framing guard, not an independent completion authority.
4. Compat-only elements:
   - application-level `CommitBubbleInput.auto`, if still present, is temporary internal compatibility and must not reach remote SSH command construction.
5. Forbidden reinterpretations:
   - do not treat `DONE_PACKAGE` as a valid target-state remote completion event.
   - do not preserve done-package content as a hidden sync-back artifact.
   - do not make git HEAD alone sufficient for commit completion.
   - do not broaden this task into Phase 4B stale-local-state repair after a failed import.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `sshBubbleCommitCommand.ts`: builds remote `pairflow bubble commit`, exports commit mode env vars, reads state/transcript/done-package/head facts, parses transcript tail as `DONE_PACKAGE`, returns `donePackageContent`.
   - `commitRemotePorts.ts`: remote commit port still carries `auto` and `donePackageContent`.
   - `commitCommandApi.ts`: remote route still computes `donePackagePath`, passes `auto: input.stageAll`, syncs `donePackageContent`, and emits lifecycle metadata with `done_package_path`.
   - `commitCommandFinalization.ts`: `syncRemoteCommitContinuityArtifacts` writes done-package, transcript, and state; lifecycle event can include `done_package_path`.
   - `commitCommandApi.test.ts` and `sshBubbleCommitCommand.test.ts`: remote tests still expect `DONE_PACKAGE`, done-package markers, `donePackageContent`, `--auto`, and done-package sync-back.
2. Actual touched scope: mixed but bounded remote transport/remote-route contract cutover for the normal successful path.
3. Mutation entrypoints in scope:
   - remote command invocation over SSH.
   - local sync-back writes for `state.json` and `transcript.ndjson`.
   - best-effort lifecycle event emission after successful sync-back.
4. Hidden scope ruled out:
   - local commit producer side-effect ordering is already Phase 2 and must not be reopened except compile fallout.
   - UI-router/frontend request producers are Phase 3B and out of scope.
   - stale-local-state repair after failed import is Phase 4B and out of scope.
   - live docs/prompt cleanup and active protocol `DONE_PACKAGE` removal are Phase 5 and out of scope.
5. Branch inventory note:
   - success path with `COMMIT_RESULT`, `DONE` state, and matching git facts.
   - failure path for transport non-zero/throw.
   - failure path for missing markers or missing commit facts.
   - failure path for non-`DONE` state.
   - failure path for non-`COMMIT_RESULT` transcript tail, including legacy `DONE_PACKAGE`.
   - failure path for transcript/git fact mismatch.
   - sync-back write/rename failure remains fail-closed and rolls back local continuity artifacts as the existing helper does.
6. Why the declared task shape matches reality: this task owns one remote execution route and its direct port/result contract; it intentionally does not add retry, merge refresh, idempotency, or general recovery behavior.

### Authority Boundary Map

1. Authority producer: remote `pairflow bubble commit` running inside the remote clone.
2. Stored authority: remote `.pairflow/bubbles/<id>/state.json` and `transcript.ndjson`, copied to the laptop control-plane bubble directory on success.
3. In-scope consumers:
   - SSH remote command parser.
   - application remote route result mapper.
   - local continuity sync-back helper for normal success.
   - direct CLI/API result surface through `CommitBubbleResult`.
4. Explicit out-of-scope consumers:
   - merge eligibility remote refresh/import after stale local state.
   - status/list read-model repair.
   - active protocol type-family cleanup.
   - runtime-generated prompts and docs.
5. Export surfaces closed in this phase: remote commit port input/output and normal successful remote `CommitBubbleResult` are closed; broader live references to done-package remain Phase 5.

### Baseline Preservation

1. Must-preserve behaviors:
   - remote commit requires a `started` remote pointer from the local control plane.
   - inner remote execution refuses source-repo remote artifacts as today.
   - SSH command target construction and worktree-root environment authority remain unchanged.
   - remote transport throw/non-zero remains fail-closed with the existing error taxonomy.
   - sync-back failure after remote success remains `REMOTE_COMMIT_SYNC_BACK_FAILED` and does not pretend local continuity succeeded.
   - existing backup/rollback behavior for sync-back failures is preserved for state/transcript.
2. Allowed resolution paths:
   - accept successful remote completion only when remote state is `DONE`, transcript tail is `COMMIT_RESULT`, and transcript metadata matches returned git facts.
   - write remote state and transcript to local continuity paths after validation.
3. Forbidden regression interpretations:
   - do not delete the remote route because local commit works.
   - do not use `DONE_PACKAGE` compatibility to keep old remote tests green.
   - do not loosen validation to accept a `COMMIT_RESULT` envelope whose metadata disagrees with remote HEAD facts.
   - do not solve Phase 4B by adding retry/import behavior here.
4. Replacement proof required if removed:
   - every removed done-package marker/result/sync field must have no remaining first-party normal-success dependency in the remote route tests.
   - `--auto` in remote command construction must be replaced by `--stage-all`.

### Success / Completion Proof Boundary

1. Current canonical success proof source: remote transcript tail `DONE_PACKAGE` plus done-package content transport, remote `DONE` state, and git facts.
2. Target canonical success proof source: remote `DONE` state, transcript tail `COMMIT_RESULT`, and matching git facts.
3. Current canonical completion proof source: synced local state/transcript plus synced done-package artifact.
4. Target canonical completion proof source: synced local state/transcript only, with transcript tail `COMMIT_RESULT`.
5. Reused proof contract: local commit `COMMIT_RESULT` payload fieldset.
6. Proof-parity rule: `inherit_full_parity` for commit facts and envelope payload shape.
7. Final truth surfaces affected:
   - remote commit port result removes `donePackageContent`.
   - application remote route removes done-package sync-back.
   - lifecycle event metadata for remote normal success no longer includes `done_package_path`.
   - `CommitBubbleResult` remains the shared technical facts result.
8. Mixed-truth surfaces allowed: none in the normal successful remote path after this task.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `consumer_family_alignment`.
2. Secondary shape: `activation_or_read_model` for remote `--stage-all` command invocation and result surface parity.
3. Preconditions that must pass before side effects:
   - local route resolves a started remote pointer.
   - remote command returns exit code 0.
   - remote output contains exactly one state marker payload and transcript marker payload.
   - state parses and is `DONE`.
   - transcript parses and tail is `COMMIT_RESULT`.
   - commit facts are present and match transcript metadata.
4. Side effects forbidden before preconditions pass:
   - no local continuity sync-back when remote payload validation fails.
   - no lifecycle event emission when sync-back did not succeed.
   - no local `done-package.md` write.
5. Invalid/precondition-failure behavior: fail closed with existing remote commit error taxonomy; no synthetic local state/event/envelope.
6. Coordination primitives in scope: none. No new lock, lease, idempotency, retry, or merge-refresh behavior is introduced.

### In Scope

1. Replace remote commit input field `auto` with `stageAll` in remote port and SSH executor contracts.
2. Build remote command line with `--stage-all` when stage-all is requested; never emit `--auto`.
3. Remove remote done-package markers and `cat artifacts/done-package.md` from the SSH script.
4. Parse remote transcript tail as `COMMIT_RESULT`.
5. Validate transcript metadata commit SHA/message/staged-files against returned remote git facts.
6. Remove `donePackageContent` from remote command result contracts.
7. Change remote sync-back to write only authoritative state and transcript content.
8. Remove remote-route `donePackagePath` and `done_package_path` lifecycle metadata.
9. Update remote commit application and SSH tests to assert no done-package marker/result/sync dependency.
10. Keep normal successful remote commit local continuity usable for immediate merge eligibility by writing local `state.json` as `DONE` and transcript tail as `COMMIT_RESULT`.

### Out of Scope

1. Phase 4B stale-local-state repair after payload/import failure.
2. Retrying remote commit after a partial-success import failure.
3. Merge eligibility remote refresh/import before local `DONE` rejection.
4. General local crash-after-git-commit recovery.
5. Removing `DONE_PACKAGE` from active protocol type validation.
6. Start/resume prompt, README, and live documentation cleanup.
7. UI-router/frontend request behavior.
8. Reworking local commit producer ordering or payload shape beyond direct compile fallout.

### Safety Defaults

1. If remote transcript tail is `DONE_PACKAGE`, reject it as `REMOTE_COMMIT_PAYLOAD_INVALID`.
2. If remote state/transcript/git facts disagree, reject the payload.
3. If sync-back fails after validated remote success, keep the existing fail-closed sync-back error path; Phase 4B owns subsequent repair.
4. If any internal `auto` compatibility remains in `CommitBubbleInput`, it must be normalized before the remote port and must not appear in SSH command construction.
5. Tests must prove the remote script no longer includes done-package markers or `--auto`.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - remote commit port input: `auto` -> `stageAll`.
   - remote commit port result: remove `donePackageContent`.
   - remote SSH marker protocol: remove done-package marker block and require `COMMIT_RESULT`.
   - lifecycle metadata for remote commit: remove `done_package_path` on the remote route.
3. `plan_ref` is mandatory and present.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `2`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `10`
8. `single-task allowed`: `yes, because the parent plan deliberately split Phase 4A normal transport cutover from Phase 4B partial-success repair; this task touches one remote route and its direct contracts only.`
9. Identity/join note:
   - canonical identity path: `bubbleId` in state, transcript tail, command input, and result must match.
   - competing identifiers or fallback identities: git HEAD is a guard only and cannot identify a successful Pairflow completion without state/transcript.
10. Authority/source-of-truth note:
   - canonical source: remote state/transcript plus matching git facts from the same remote clone.
   - forbidden secondary sources: done-package content/path and git-only evidence.
11. Closure-budget triage:
   - closure buckets touched: `shared_contract`, `internal_execution_consumers`, `workflow_orchestration_consumers`, `read_model_consumers`.
   - intentionally collapsed closures: remote port contract plus SSH parser plus application remote result mapping, because all are the same normal remote commit path and must move together to avoid mixed truth.
   - explicitly deferred closures: `cleanup_recovery_consumers` for stale local state and retry/merge repair; protocol/documentation cleanup.
12. Bounded-task-shape decision:
   - primary shape: `consumer_family_alignment`.
   - secondary shape: `activation_or_read_model`.
   - why this bounded mix is safe: activation is limited to replacing remote `--auto` with already-defined `--stage-all`; no new producer authority, retry semantics, or coordination primitive is introduced.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Remote commit completion is technical git/state/transcript completion, not prose artifact completion. | Remove done-package dependency from remote normal success. | P1 | required-now |
| Control model | Remote commit runtime controls completion and exports state/transcript/git facts. | Validate remote output against `DONE` + `COMMIT_RESULT` + matching facts. | P1 | required-now |
| Read-path rule | Remote route reads state/transcript and commit facts, never done-package. | Delete done-package marker extraction and sync-back input. | P1 | required-now |
| Forbidden fallback | `DONE_PACKAGE`, done-package content/path, and git-only success are invalid as target remote completion proof. | Parser rejects legacy tail and mismatches. | P1 | required-now |
| Allowed resolution path | Same-authority remote state/transcript/git facts may be correlated on the normal success path. | Add explicit consistency validation. | P1 | required-now |
| Missing-data rule | Missing markers/facts or mismatched facts fail closed. | Preserve `REMOTE_COMMIT_PAYLOAD_INVALID`. | P1 | required-now |
| Phase boundary | Phase 4A closes normal transport only; Phase 4B owns partial-success repair. | Do not add retry/merge refresh logic. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `COMMIT_RESULT` | `commitCommandFinalizationMutation.ts`; parent plan Phase 4A | Technical commit result event with metadata only. | Preserve and require in remote transcript tail. | P1 | required-now |
| `stageAll` | `commitCommandContract.ts`; Phase 3A/3B archived tasks | Stage current worktree changes before commit. | Use in remote port and command construction. | P1 | required-now |
| `DONE_PACKAGE` | parent plan forbidden fallback | Removed target-state completion event. | Reject in remote parser. | P1 | required-now |
| `donePackageContent` | `commitRemotePorts.ts`; `sshBubbleCommitCommand.ts` | Legacy transport-only artifact content. | Remove from remote port/result. | P1 | required-now |
| Git HEAD facts | `sshBubbleCommitCommand.ts` | Guard facts from the same remote clone. | Validate against transcript metadata; do not promote to standalone truth. | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Remote SSH executor, remote port, application remote route, sync helper, and direct tests define the real scope. | Implementation must update all listed surfaces together. | P1 | required-now |
| Actual touched scope | Remote normal success transport/result contract cutover. | Keep changes within Phase 4A; do not add Phase 4B repair. | P1 | required-now |
| Mutation entrypoints in scope | SSH command execution, local state/transcript sync-back, lifecycle event emission. | Validate before sync; emit after sync. | P1 | required-now |
| Hidden scope ruled out | Local producer, UI producers, protocol hard removal, docs, and merge repair are separate phases. | Avoid broad cleanup in this task. | P1 | required-now |
| Branch inventory note | Success, transport failure, invalid payload, legacy tail, mismatch, sync failure. | Tests must cover required-now branches. | P1 | required-now |
| Shape proof | The same remote route owns the affected contracts and result mapping. | Single task is acceptable despite high risk score. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Phase 4A remote normal success alignment. | The task is incomplete if remote success still depends on done-package. | P1 | required-now |
| Depends on | Phases 1, 2, 3A, and 3B completed. | Do not recreate earlier compatibility surfaces. | P1 | required-now |
| Unlocks / impacts successors | Phase 4B and Phase 5. | Leave clear seams: no partial-success repair here, no protocol hard removal here. | P1 | required-now |
| Task-list impact | Creates implementable task for `remote-commit-result-transport-cutover`. | Parent plan can point to this task file. | P2 | required-now |
| Inherited validation / exit expectation | Remote success writes local `DONE` state and `COMMIT_RESULT` transcript. | Immediate merge eligibility is unblocked when commit command succeeds. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `ExecuteRemoteBubbleCommitCommandInput` | application commit remote route; SSH executor tests | breaking | Replace `auto` with `stageAll`. | N/A |
| `ExecuteRemoteBubbleCommitCommandResult` | application commit remote route; SSH executor tests | breaking | Remove `donePackageContent`; keep state/transcript/commit facts. | N/A |
| Remote SSH marker protocol | SSH script and parser tests | breaking | Remove done-package markers; keep state/transcript/head facts. | N/A |
| `syncRemoteCommitContinuityArtifacts` | remote route and tests | breaking | Sync only state and transcript. | Phase 4B may add refresh/import helpers separately. |
| lifecycle event metadata | metrics consumers/tests | breaking for remote done-package metadata | Remove `done_package_path` from remote commit event metadata. | Phase 5 broad event/docs cleanup if any live refs remain. |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| Started remote pointer required | preserve | remote routing test still refuses created/missing pointer. | P1 | required-now |
| Inner remote execution guard | preserve | existing tests/typecheck still pass. | P1 | required-now |
| SSH transport throw/non-zero errors | preserve | existing tests remain or are updated without weakening error code. | P1 | required-now |
| Sync-back rollback on failure | preserve for remaining state/transcript targets | sync failure tests prove original local continuity is not partially replaced. | P1 | required-now |
| Done-package transport | replace | tests prove no marker, result field, or file write remains. | P1 | required-now |
| `DONE_PACKAGE` remote tail | forbid | parser rejects legacy tail. | P1 | required-now |

### 0f) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Canonical / Compat / Guard | Mixed-Truth Allowed? | Priority | Timing |
|---|---|---|---|---|---|---|
| remote transcript tail | `DONE_PACKAGE` | `COMMIT_RESULT` | canonical | no | P1 | required-now |
| remote state | `DONE` | `DONE` | canonical | no | P1 | required-now |
| remote HEAD SHA/message/files | git facts | same git facts matched to transcript metadata | guard | no | P1 | required-now |
| local continuity state | synced remote state | synced remote state | canonical copy | no | P1 | required-now |
| local continuity transcript | synced remote transcript | synced remote transcript | canonical copy | no | P1 | required-now |
| lifecycle metadata | commit facts plus optional done-package path | commit facts without done-package path | read-model/event | no | P2 | required-now |

### 0g) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| transport throw/non-zero | SSH command completion | local sync-back, lifecycle event | `REMOTE_COMMIT_TRANSPORT_FAILED` | P1 | required-now |
| malformed remote output | marker count and JSON/protocol parsing | local sync-back, lifecycle event | `REMOTE_COMMIT_PAYLOAD_INVALID` | P1 | required-now |
| remote non-`DONE` state | state assertion | local sync-back, lifecycle event | `REMOTE_COMMIT_PAYLOAD_INVALID` | P1 | required-now |
| legacy/non-target transcript tail | tail type is `COMMIT_RESULT` | local sync-back, lifecycle event | `REMOTE_COMMIT_PAYLOAD_INVALID` | P1 | required-now |
| metadata/git mismatch | commit SHA/message/staged-files equality after normalization | local sync-back, lifecycle event | `REMOTE_COMMIT_PAYLOAD_INVALID` | P1 | required-now |
| sync-back failure | write/rename state and transcript | lifecycle event | `REMOTE_COMMIT_SYNC_BACK_FAILED`; rollback best effort | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts` | `ExecuteRemoteBubbleCommitCommandInput` | input object -> remote command script | interface | Replace `auto: boolean` with `stageAll: boolean`. | P1 | required-now | typecheck; SSH test |
| CS2 | `src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts` | `ExecuteRemoteBubbleCommitCommandResult` | parsed remote stdout -> result | interface | Remove `donePackageContent`; keep `stateContent`, `transcriptContent`, `commitSha`, `commitMessage`, `stagedFiles`. | P1 | required-now | typecheck; SSH test |
| CS3 | `src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts` | `buildRemoteBubbleCommitCommandLine` | `ExecuteRemoteBubbleCommitCommandInput -> string` | command args | Emit `--stage-all` when `stageAll` is true; never emit `--auto`. | P1 | required-now | SSH script test |
| CS4 | `src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts` | `buildRemoteBubbleCommitScript` | input -> shell script | marker block | Remove done-package path and markers; collect state, transcript, HEAD SHA, HEAD message, and staged files. | P1 | required-now | SSH script test |
| CS5 | `src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts` | `parseTranscript` | raw transcript -> `{ sequence, envelope }` | tail validation | Require tail `COMMIT_RESULT`, correct `bubble_id`, and valid envelope. | P1 | required-now | SSH parser tests |
| CS6 | `src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts` | new/updated consistency validator | envelope + git facts -> void | after state/transcript/fact parsing | Verify metadata `commit_sha`, `commit_message`, and normalized `staged_files` match remote git facts. | P1 | required-now | mismatch tests |
| CS7 | `src/v11/application/commit/commitRemotePorts.ts` | remote commit port types | input/result type aliases | interface | Mirror CS1/CS2 contract changes. | P1 | required-now | typecheck |
| CS8 | `src/v11/application/commit/commitCommandApi.ts` | `commitRemoteExecutionRoute` | remote context -> `CommitBubbleResult` | remote route | Pass `stageAll`; remove `donePackagePath`; call sync-back with state/transcript only; map returned envelope/facts. | P1 | required-now | API remote route tests |
| CS9 | `src/v11/application/commit/commitCommandFinalization.ts` | `syncRemoteCommitContinuityArtifacts` | state/transcript content -> Promise<void> | helper contract | Remove done-package target and content; preserve atomic-ish temp/backup/rollback for remaining files. | P1 | required-now | sync failure tests |
| CS10 | `src/v11/application/commit/commitCommandFinalization.ts` | `emitCommitLifecycleEvent` callers/context | commit facts -> best-effort metric event | remote route context | Remote route must no longer provide `donePackagePath`, so metadata excludes `done_package_path` and `refs_count` excludes it. | P2 | required-now | API metrics assertion |
| CS11 | `src/v11/application/commit/commitCommandApiContract.ts` and `commitCommandDefaults.ts` | dependency wiring | dependency types -> defaults | compile fallout | Keep dependency type wiring compatible with updated remote port. | P1 | required-now | typecheck |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Remote command input | `{ bubbleId, remoteClonePath, remoteTarget, refs, message?, auto }` | `{ bubbleId, remoteClonePath, remoteTarget, refs, message?, stageAll }` | `bubbleId`, `remoteClonePath`, `remoteTarget`, `refs`, `stageAll` | `message` | breaking internal port change | P1 | required-now |
| Remote command result | includes `donePackageContent` | excludes `donePackageContent` | `bubbleId`, `sequence`, `envelope`, `state`, `stateContent`, `transcriptContent`, `commitSha`, `commitMessage`, `stagedFiles` | N/A | breaking internal port change | P1 | required-now |
| Remote transcript tail | `DONE_PACKAGE` with summary/path metadata | `COMMIT_RESULT` with technical metadata only | `metadata.commit_sha`, `metadata.commit_message`, `metadata.staged_files` | `refs` per envelope | hard cutover for remote target path | P1 | required-now |
| Remote SSH markers | state, transcript, done-package, head sha/message/files | state, transcript, head sha/message/files | one marker pair for each target payload | N/A | breaking marker protocol | P1 | required-now |
| Local continuity sync-back | writes done-package, transcript, state | writes transcript and state | `stateContent`, `transcriptContent` | custom `renamePath` | breaking helper contract | P1 | required-now |
| Lifecycle event metadata | may include `done_package_path` on remote route | no `done_package_path` for remote route | commit SHA/message, staged file count, refs count, staging flag | N/A | breaking event metadata cleanup for remote route | P2 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Network | run one SSH command to execute remote commit and print remote artifacts/facts | adding retry/repair SSH commands | Phase 4B owns retry/repair. | P1 | required-now |
| Remote filesystem | remote command may read state/transcript and git facts after commit | reading/catting done-package | The script must not require the file to exist. | P1 | required-now |
| Local filesystem | write synced state/transcript through existing temp/backup/rename helper | writing `artifacts/done-package.md` | Rollback semantics preserved for remaining targets. | P1 | required-now |
| Metrics | emit `bubble_committed` after successful sync-back | emitting event before sync-back or with `done_package_path` | Keep best-effort event behavior. | P2 | required-now |
| Git | remote command may inspect HEAD after commit | local git operations in remote route | Application remote route must not call local `runGit`. | P1 | required-now |

Constraint: implementation is not pure; side effects are limited to the remote command, local state/transcript sync-back, and best-effort metrics event.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| SSH command throws before exit code | SSH transport | throw | no local sync-back | `REMOTE_COMMIT_TRANSPORT_FAILED` | N/A | P1 | required-now |
| SSH exit code non-zero | SSH transport | throw | no local sync-back | `REMOTE_COMMIT_TRANSPORT_FAILED` | N/A | P1 | required-now |
| missing/duplicate marker | remote stdout | throw | no local sync-back | `REMOTE_COMMIT_PAYLOAD_INVALID` | N/A | P1 | required-now |
| invalid state JSON/schema | remote stdout | throw | no local sync-back | `REMOTE_COMMIT_PAYLOAD_INVALID` | N/A | P1 | required-now |
| state is not `DONE` | remote state | throw | no local sync-back | `REMOTE_COMMIT_PAYLOAD_INVALID` | N/A | P1 | required-now |
| transcript tail is not `COMMIT_RESULT` | remote transcript | throw | no local sync-back | `REMOTE_COMMIT_PAYLOAD_INVALID` | N/A | P1 | required-now |
| transcript commit facts mismatch git facts | remote transcript + git facts | throw | no local sync-back | `REMOTE_COMMIT_PAYLOAD_INVALID` | N/A | P1 | required-now |
| local sync-back write/rename fails | filesystem | throw | best-effort rollback, no lifecycle event | `REMOTE_COMMIT_SYNC_BACK_FAILED` | N/A | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `parseEnvelopeLine`; `assertValidBubbleStateSnapshot`; existing shell quoting/build SSH helpers; existing sync-back temp/backup/rename pattern | P1 | required-now |
| must-not-use | done-package file/content/path; `DONE_PACKAGE` as accepted remote completion; `--auto` in remote command; git-only success; new retry/repair commands | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Files / Test Level | Required Assertions | Priority | Timing |
|---|---|---|---|---|---|
| T1 | SSH script builds target remote commit command | `sshBubbleCommitCommand.test.ts` | script contains `--stage-all`, not `--auto`; no done-package path/markers/cat command; env exports preserved. | P1 | required-now |
| T2 | SSH parser accepts valid remote `COMMIT_RESULT` | `sshBubbleCommitCommand.test.ts` | result envelope type is `COMMIT_RESULT`; no `donePackageContent`; state `DONE`; facts returned. | P1 | required-now |
| T3 | SSH parser rejects legacy `DONE_PACKAGE` tail | `sshBubbleCommitCommand.test.ts` | throws `REMOTE_COMMIT_PAYLOAD_INVALID`; no compatibility acceptance. | P1 | required-now |
| T4 | SSH parser rejects commit SHA mismatch | `sshBubbleCommitCommand.test.ts` | transcript metadata SHA differing from HEAD SHA fails closed. | P1 | required-now |
| T5 | SSH parser rejects commit message mismatch | `sshBubbleCommitCommand.test.ts` | transcript metadata message differing from HEAD message fails closed. | P1 | required-now |
| T6 | SSH parser rejects staged-file mismatch | `sshBubbleCommitCommand.test.ts` | transcript metadata staged files differing from git diff-tree list fails closed after the same normalization rules used by local commit. | P1 | required-now |
| T7 | Application remote route syncs state/transcript only | `commitCommandApi.test.ts` | local `state.json` and `transcript.ndjson` match remote content; `done-package.md` is not written; result shares technical facts. | P1 | required-now |
| T8 | Application remote route passes `stageAll` to remote port | `commitCommandApi.test.ts` | dependency called with `stageAll: true/false`; no `auto` field. | P1 | required-now |
| T9 | Remote lifecycle metadata excludes done-package path | `commitCommandApi.test.ts` | `bubble_committed` metadata has commit facts and refs count but no `done_package_path`. | P2 | required-now |
| T10 | Sync-back write failure rolls back remaining continuity artifacts | `commitCommandApi.test.ts` | state/transcript originals preserved after simulated transcript/state sync failure; no done-package assertion required. | P1 | required-now |
| T11 | Remote payload failure prevents local writes | `commitCommandApi.test.ts` or SSH unit test | invalid remote payload rejects before sync helper writes. | P1 | required-now |
| T12 | Existing remote precondition failures remain intact | `commitCommandApi.test.ts` | created/missing remote pointer still does not call remote commit. | P1 | required-now |
| T13 | Error normalization unaffected | `commitCommandErrorNormalization.test.ts` | remote transport/payload errors still normalize to existing reason codes. | P2 | required-now |

### 7) Acceptance Criteria

| ID | Criterion | Evidence | Priority | Timing |
|---|---|---|---|---|
| AC1 | Remote normal successful commit no longer reads, writes, transports, or returns done-package content. | T1, T2, T7 | P1 | required-now |
| AC2 | Remote command construction uses `--stage-all` and never `--auto`. | T1, T8 | P1 | required-now |
| AC3 | Remote transcript tail must be `COMMIT_RESULT`. | T2, T3 | P1 | required-now |
| AC4 | Remote transcript metadata and remote git facts must match. | T4, T5, T6 | P1 | required-now |
| AC5 | Successful remote route syncs local state/transcript so local state is `DONE` and transcript tail is `COMMIT_RESULT`. | T7 | P1 | required-now |
| AC6 | Remote route result conforms to shared `CommitBubbleResult` technical facts contract. | T7, typecheck | P1 | required-now |
| AC7 | Sync-back failure remains fail-closed and does not emit a false local success. | T10 | P1 | required-now |
| AC8 | Phase 4B concerns remain deferred with no retry/merge refresh implementation in this task. | code review against Out of Scope | P1 | required-now |

### 8) Review Checklist

1. Search live source for `donePackageContent` and ensure no remote normal-success code path still uses it.
2. Search `sshBubbleCommitCommand.ts` for `DONE_PACKAGE`, done-package marker names, and `--auto`; only rejected-test text or removed references should remain.
3. Confirm `executeRemoteBubbleCommitCommand` validates `COMMIT_RESULT` payload metadata against remote git facts before returning.
4. Confirm `commitRemoteExecutionRoute` does not compute or pass `donePackagePath`.
5. Confirm sync-back tests no longer rely on done-package restoration.
6. Confirm no Phase 4B retry/merge refresh behavior was added.

## L2 - Hardening Backlog

1. `later-hardening`: Add an end-to-end remote fixture that starts a real remote bubble, commits with `--stage-all`, and immediately merges from the laptop control plane. This is useful after Phase 4B because the reliable test requires remote repair/merge-readiness coverage.
2. `later-hardening`: Add a focused helper for commit-result metadata comparison if the same comparison is reused by Phase 4B refresh/import code.
3. `later-hardening`: Consider normalizing lifecycle metadata from `auto` to `stage_all` in a separate event-contract cleanup if Phase 5 finds remaining live event docs/tests using old naming.
