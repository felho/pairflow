---
artifact_type: task
artifact_id: task_remote_commit_rename_v1
task_family_id: remote-commit-rename
sequence_key: "3"
task_id: 3-remote-commit-rename
title: "Remote Commit Rename"
status: approved
phase: phase2
target_files:
  - src/v11/shared/commit/commitRemoteExecution.ts
  - src/v11/shared/remote/commitRemoteExecution.ts
  - src/v11/application/commit/commitRemotePorts.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleCommitContinuityImportCommand.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleCommitPayload.ts
prd_ref: null
plan_ref: plans/shared-command-boundary-cleanup-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/shared-command-boundary-cleanup-plan-v1.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
doc_bubble_id: 3-remote-commit-rename-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-05-shared-command-boundary-cleanup-plan-v1
---

# Task: Remote Commit Rename

## L0 - Policy

### Goal

Rename the retained shared remote commit contract out of the command-named
`src/v11/shared/commit/**` boundary and into a command-neutral shared remote
boundary, then update imports without changing behavior.

### Domain / Control Model Summary

1. Business invariant: shared boundary names must communicate real ownership.
   The remote commit execution contract is shared between commit application
   ports and SSH executor infrastructure, but the `shared/commit` directory name
   makes it look command-local.
2. Control model: `src/v11/shared/remote/**` owns command-neutral remote
   execution contracts consumed across application and infrastructure lanes.
   `src/v11/application/commit/**` remains the commit command owner and may
   re-export the shared remote contract through commit-local port surfaces.
3. Read-path rule: cross-lane consumers import the retained remote commit
   contract from the new command-neutral shared remote path. Commit application
   code may continue to expose a commit-local adapter/export surface from
   `commitRemotePorts.ts`.
4. Forbidden fallback: do not keep `commitRemoteExecution.ts` under
   `shared/commit/**` because existing imports work, because the file mentions
   commit payload fields, or because a future shared remote boundary is not yet
   perfect.
5. Allowed resolution path: perform a behavior-preserving file rename, update
   TypeScript imports/exports, and leave runtime payload semantics unchanged.
6. Missing-data rule: if implementation discovers additional commit-local
   helpers under `shared/commit/**`, stop and record the source-anchored reason
   instead of broadening this task into helper migration.
7. Phase boundary: this task only renames the retained remote commit contract.
   It does not rename remote merge contracts, redesign remote execution, change
   commit lifecycle state semantics, or tighten architecture fitness rules.

### Plan Linkage

1. Parent plan gap closed: a true shared remote commit contract remains under a
   command-named `shared/commit` directory after task `1-commit-local-helpers`.
2. Depends on: `1-commit-local-helpers`.
3. Unlocks / impacts successor:
   - `5-inbox-api-rename` waits for the remote commit and remote merge shared
     contract rename tasks before the smaller command-neutral API cleanup phase.
4. Task-list impact: creates planned task `3-remote-commit-rename`; it does not
   supersede any existing task id.
5. Plan-level validation inherited: this task contributes to the plan's
   requirement that command-named shared directories disappear or be explicitly
   source-anchored before fitness hardening.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/shared/commit/commitRemoteExecution.ts`
   - `src/v11/application/commit/commitRemotePorts.ts`
   - `src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts`
   - `src/v11/infrastructure/executor/ssh/sshBubbleCommitContinuityImportCommand.ts`
   - `src/v11/infrastructure/executor/ssh/sshBubbleCommitPayload.ts`
2. Canonical elements:
   - `CommitRemoteBubbleStatusTarget`
   - `ExecuteRemoteBubbleCommitCommandInput`
   - `ExecuteRemoteBubbleCommitCommandResult`
   - `ExecuteRemoteBubbleCommitCommandPort`
   - `ImportRemoteBubbleCommitContinuityInput`
   - `ImportRemoteBubbleCommitContinuityResult`
   - `ImportRemoteBubbleCommitContinuityPort`
   - `ResolveRemoteBubbleStatusTargetPort`
   - `ReadRemoteCommitPointerPort`
3. Guard elements:
   - only import/export paths should change
   - type names, field names, discriminants, and state/transcript payload shapes
     stay identical
4. Compat elements:
   - `src/v11/application/commit/commitRemotePorts.ts` remains available as the
     commit application port surface
5. Forbidden reinterpretations:
   - do not change remote pointer semantics, continuity import behavior, commit
     command result fields, protocol envelope handling, or SSH command parsing

### Scope Reality / Shape Proof

1. Current `src/v11/shared/commit/**` contains only
   `commitRemoteExecution.ts`.
2. Current known consumers import it through:
   - `src/v11/application/commit/commitRemotePorts.ts`
   - `src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts`
   - `src/v11/infrastructure/executor/ssh/sshBubbleCommitContinuityImportCommand.ts`
   - `src/v11/infrastructure/executor/ssh/sshBubbleCommitPayload.ts`
3. Actual touched scope is a shared contract path rename and mechanical import
   update.
4. Hidden scope ruled out: commit helper behavior, remote merge contract rename,
   lifecycle state transitions, UI/router behavior, and fitness hardening.

### Boundary Classification

1. Primary shape: `shared_contract_boundary_rename`.
2. Closure buckets touched:
   - `authority_producer`: shared remote contract file moves to a neutral path.
   - `internal_execution_consumers`: commit application and SSH executor imports
     follow the new path.
3. Deferred closures:
   - command-neutral remote merge contract rename
   - inbox API rename
   - shared command directory fitness hardening

### In Scope

1. Move `src/v11/shared/commit/commitRemoteExecution.ts` to a command-neutral
   shared remote path such as `src/v11/shared/remote/commitRemoteExecution.ts`.
2. Update all imports and re-exports that reference
   `src/v11/shared/commit/commitRemoteExecution`.
3. Preserve all exported type names, field shapes, discriminants, and runtime
   semantics.
4. Remove the now-empty `src/v11/shared/commit` directory if no retained file
   remains.
5. Verify no imports or source files remain under `src/v11/shared/commit/**`.

### Out of Scope

1. Renaming `src/v11/shared/merge/remoteMergeContract.ts`.
2. Moving or changing command-local commit application helpers.
3. Changing remote commit command behavior, protocol payloads, state-machine
   behavior, transcript content, or continuity import semantics.
4. Changing UI/router contracts or tests beyond compile-required import updates.
5. Tightening `shared_promotion_single_lane` or adding new architecture fitness
   failures.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Shared remote owner | Remote execution contracts belong under a command-neutral shared remote boundary. | Move the retained commit remote contract out of `shared/commit`. | P1 | required-now |
| Behavior preservation | The task is a path/name cleanup only. | Keep exported type names and payload shapes unchanged. | P1 | required-now |
| Application adapter retained | Commit application may expose a commit-local port surface. | Keep `commitRemotePorts.ts` as a re-export/update point. | P1 | required-now |
| No governance hardening | Fitness tightening waits for the final cleanup task. | Do not change dependency fitness rules. | P2 | required-now |

### 1) Implementation Requirements

1. Create the command-neutral shared remote directory if needed.
2. Rename the retained remote commit contract file into that directory.
3. Update commit application and SSH executor imports to the new path.
4. Keep `commitRemotePorts.ts` exporting the shared remote commit contract for
   application-lane consumers.
5. Remove empty `src/v11/shared/commit` directory after the move.
6. Use `rg "shared/commit|commitRemoteExecution" src tests` after the move to
   verify only the intended new shared remote path remains.

### 2) Acceptance Criteria

1. `src/v11/shared/commit` no longer exists.
2. `src/v11/shared/remote/commitRemoteExecution.ts` contains the retained remote
   commit contract with unchanged exported names and field shapes.
3. No source or test import references `src/v11/shared/commit`.
4. Commit application and SSH executor code typecheck through the updated
   imports.
5. No remote commit behavior, protocol payload shape, transcript handling, or
   continuity import classification changes.

### 3) Validation

Required narrow checks:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. `pnpm test -- tests/v11/application/commit/commitCommandApi.test.ts`
5. `pnpm test -- tests/cli/index.test.ts`

Broader completion checks inherited from repo policy for direct source changes:

1. `pnpm test`
2. `pnpm build`

### 4) Non-Goals

1. Do not redesign shared remote execution naming beyond the minimal neutral
   directory needed by this task.
2. Do not combine this with task `4-remote-merge-rename`.
3. Do not introduce compatibility barrels under `shared/commit`.

## L2 - Implementation Notes

1. Use `git mv` or an equivalent file move for
   `src/v11/shared/commit/commitRemoteExecution.ts`.
2. Expected import updates include:
   - `src/v11/application/commit/commitRemotePorts.ts`
   - `src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts`
   - `src/v11/infrastructure/executor/ssh/sshBubbleCommitContinuityImportCommand.ts`
   - `src/v11/infrastructure/executor/ssh/sshBubbleCommitPayload.ts`
3. Keep the old type names even though the new directory is command-neutral; the
   type names describe the remote commit operation, not the directory owner.
4. If an unexpected consumer imports from `shared/commit`, update it only when
   the import is the retained remote contract. Stop for review if the consumer
   proves additional shared commit-local helper logic exists.
