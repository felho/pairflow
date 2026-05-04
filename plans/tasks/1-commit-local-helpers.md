---
artifact_type: task
artifact_id: task_commit_local_helpers_v1
task_family_id: commit-local-helpers
sequence_key: "1"
task_id: 1-commit-local-helpers
title: "Commit Local Helpers"
status: approved
phase: phase1
target_files:
  - src/v11/shared/commit/commitCommandError.ts
  - src/v11/shared/commit/commitCommandErrorNormalization.ts
  - src/v11/shared/commit/commitCommandFinalizationMutation.ts
  - src/v11/application/commit/commitCommandRuntime.ts
  - src/v11/application/commit/commitCommandFinalization.ts
  - tests/v11/application/errorBoundaryContextSchema.test.ts
  - tests/v11/application/commit/commitCommandErrorNormalization.test.ts
prd_ref: null
plan_ref: plans/shared-command-boundary-cleanup-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/shared-command-boundary-cleanup-plan-v1.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
doc_bubble_id: 1-commit-local-helpers-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-05-shared-command-boundary-cleanup-plan-v1
---

# Task: Commit Local Helpers

## L0 - Policy

### Goal

Move the proven command-local commit error and finalization helpers out of
`src/v11/shared/commit/**` and into the owning
`src/v11/application/commit/**` lane, while leaving the retained remote commit
contract module in place for the successor command-neutral rename task.

### Domain / Control Model Summary

1. Business invariant: `src/v11/shared/**` must not hold single-command helper
   logic; shared modules should be command-neutral contracts or utilities with a
   concrete multi-consumer reason.
2. Control model: `src/v11/application/commit/**` owns commit command runtime
   error wrapping, commit result finalization, state transition orchestration,
   and command-local tests. `src/v11/shared/commit/commitRemoteExecution.ts`
   remains a retained shared remote-port contract until task
   `3-remote-commit-rename` renames it to a command-neutral shared boundary.
3. Read-path rule: commit application code imports commit-local helpers from
   the application commit lane. Cross-command consumers may continue to import
   the remote commit port contract through the existing
   `src/v11/application/commit/commitRemotePorts.ts` re-export.
4. Forbidden fallback: do not keep commit error or finalization helper code in
   `shared/commit/**` because it might be reused later, because import churn is
   inconvenient, or because the directory already exists for the remote contract.
5. Allowed resolution path: relocate only the command-local helper files,
   update imports and tests, and keep exported behavior and error semantics
   equivalent.
6. Missing-data rule: if implementation discovers an additional
   `shared/commit/**` file with mixed or unclear ownership, leave it in place
   and record the source-anchored reason for successor work instead of moving it
   speculatively.
7. Phase boundary: this task is a behavior-preserving local-helper move. It
   does not rename remote commit contracts, redesign commit or merge behavior,
   change lifecycle state semantics, alter UI/router contracts, or tighten the
   fitness rule.

### Plan Linkage

1. Parent plan gap closed: `shared/commit` mixes command-local helpers with the
   remote commit contract shape.
2. Depends on: no predecessor task.
3. Unlocks / impacts successor:
   - `3-remote-commit-rename` can rename the retained remote commit contract
     once local helpers no longer share the same command-named shared boundary.
4. Task-list impact: creates planned task `1-commit-local-helpers`; it does not
   supersede any existing task id.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/shared/commit/commitCommandError.ts`
   - `src/v11/shared/commit/commitCommandErrorNormalization.ts`
   - `src/v11/shared/commit/commitCommandFinalizationMutation.ts`
   - `src/v11/shared/commit/commitRemoteExecution.ts`
   - `src/v11/application/commit/commitCommandRuntime.ts`
   - `src/v11/application/commit/commitCommandFinalization.ts`
   - `src/v11/application/commit/commitRemotePorts.ts`
   - `tests/v11/application/errorBoundaryContextSchema.test.ts`
   - `tests/v11/application/commit/commitCommandErrorNormalization.test.ts`
2. Canonical elements:
   - `BubbleCommitError` keeps name, reason-code handling, cause handling, and
     required command context value `commit`.
   - commit error normalization keeps current classification for
     `BubbleLookupError`, `GitCommandError`,
     `RemoteBubbleCommitCommandError`, and `RemoteBubbleStatusError`.
   - commit result finalization still appends a `COMMIT_RESULT` envelope,
     transitions `APPROVED_FOR_COMMIT -> COMMITTED -> DONE`, and preserves the
     existing recovery error message when the final `DONE` transition fails.
   - `commitRemoteExecution.ts` remains untouched except for import paths that
     are mechanically required by the move.
3. Guard elements:
   - this task may update tests that import commit-local helper modules directly
     so they verify the new owning path.
   - the existing application-facing exports from `commitCommandRuntime.ts`,
     `commitCommandFinalization.ts`, and `commitRemotePorts.ts` remain the
     preferred runtime surfaces.
4. Compat elements:
   - public exports from `src/index.ts` and command entrypoints remain
     behaviorally unchanged.
   - the remote commit port re-export remains available to merge and defaults
     consumers until task `3-remote-commit-rename`.
5. Forbidden reinterpretations:
   - Do not treat moving helper files as authorization to rename remote commit
     ports.
   - Do not change commit state-machine transitions, transcript envelope shape,
     reason codes, or error class identity semantics beyond the import path
     relocation.

### Scope Reality / Shape Proof

1. Inspected current files:
   - `src/v11/shared/commit/commitCommandError.ts`
   - `src/v11/shared/commit/commitCommandErrorNormalization.ts`
   - `src/v11/shared/commit/commitCommandFinalizationMutation.ts`
   - `src/v11/shared/commit/commitRemoteExecution.ts`
   - commit application wrappers and current tests listed in `target_files`.
2. Actual touched scope: a local application-lane move for commit error and
   finalization helper modules plus import/test path updates.
3. Mutation entrypoints in scope:
   - source file relocation within `src/v11/**`
   - TypeScript import path updates
   - targeted tests that import relocated helpers
4. Hidden scope ruled out: remote contract rename, merge command changes,
   lifecycle behavior changes, UI/router payload changes, broad shared
   dependency governance, and fitness hardening.
5. Dependency reality: `src/v11/application/merge/mergeCommandContract.ts`
   imports only the remote commit continuity port through
   `application/commit/commitRemotePorts.ts`; that remote contract is explicitly
   retained for task `3`.
6. Why the declared task shape matches reality: the command-local helper files
   are consumed by the commit application lane and tests, while the only
   retained multi-consumer contract is isolated in `commitRemoteExecution.ts`.

### Boundary Classification

1. Primary shape: `local_helper_ownership_move`.
2. Closure buckets touched:
   - `authority_producer`: commit application runtime owns commit-local error
     and finalization helpers after the move.
   - `internal_execution_consumers`: commit command API, git step, staged-files
     handling, and finalization wrappers continue through the same application
     surfaces.
   - `test_consumers`: direct helper imports are updated to the new owner path.
3. Collapsed closures:
   - error helper relocation and finalization helper relocation are kept in one
     task because they are both proven commit-local and do not touch the retained
     remote contract.
4. Deferred closures:
   - command-neutral remote commit contract rename
   - shared fitness/governance tightening

### In Scope

1. Move `commitCommandError.ts` into `src/v11/application/commit/**`.
2. Move `commitCommandErrorNormalization.ts` into
   `src/v11/application/commit/**`.
3. Move `commitCommandFinalizationMutation.ts` into
   `src/v11/application/commit/**` or fold it into an existing commit
   application module only if the resulting boundary remains clear and typed.
4. Update imports in commit application code and tests to the new owning path.
5. Preserve all exported behavior, error names, reason-code behavior, transcript
   envelope shape, state transition order, and recovery text semantics.
6. Confirm that `src/v11/shared/commit/commitRemoteExecution.ts` remains for the
   successor command-neutral shared rename task.
7. Remove an empty `src/v11/shared/commit` directory only if the retained remote
   contract has not kept it present; otherwise leave it for task
   `3-remote-commit-rename`.

### Out of Scope

1. Renaming or relocating `commitRemoteExecution.ts`.
2. Renaming `commitRemotePorts.ts` or changing merge/defaults consumers of the
   remote commit continuity contract.
3. Changing commit command behavior, state-machine behavior, protocol payloads,
   event payloads, or public `src/index.ts` exports.
4. Changing UI/router contracts or tests beyond compile-required import updates.
5. Tightening `shared_promotion_single_lane` or adding new architecture fitness
   failures.
6. Moving merge helpers or any `shared/merge/**` files.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Local helper owner | Commit error and finalization helpers belong under `application/commit`. | Relocate those helpers and update imports. | P1 | required-now |
| Remote contract retained | Remote commit port shapes remain under the existing retained shared file for task 3. | Do not move or rename `commitRemoteExecution.ts`. | P1 | required-now |
| Behavior preservation | Error and finalization behavior must stay equivalent. | Tests should fail only for path/import issues, not semantic drift. | P1 | required-now |
| No broadened cleanup | This is not a shared fitness hardening task. | Avoid broad dependency-rule changes. | P2 | required-now |

### 1) Implementation Requirements

1. Create application-owned equivalents for the three command-local helper files
   currently under `src/v11/shared/commit/**`.
2. Update `commitCommandRuntime.ts` to import `BubbleCommitError`,
   `createBubbleCommitError`, `isBubbleCommitError`, and
   `normalizeBubbleCommitError` from the application commit lane.
3. Update `commitCommandFinalization.ts` to import finalization mutations from
   the application commit lane.
4. Update direct tests imports from the old shared helper path to the new
   application helper path.
5. Use `rg "shared/commit/commitCommand"` after the move to verify no
   command-local helper imports remain.
6. Keep `src/v11/application/commit/commitRemotePorts.ts` exporting the retained
   remote contract until the successor task renames the shared remote boundary.

### 2) Acceptance Criteria

1. `src/v11/shared/commit` contains only the retained remote commit contract, or
   does not exist only if task 3 has already safely removed it.
2. No import remains from:
   - `src/v11/shared/commit/commitCommandError`
   - `src/v11/shared/commit/commitCommandErrorNormalization`
   - `src/v11/shared/commit/commitCommandFinalizationMutation`
3. Existing commit error tests still prove command context and remote error
   normalization behavior.
4. Existing commit finalization behavior remains covered by the commit command
   API / bubble commit tests.
5. `commitRemoteExecution.ts` remains behaviorally untouched for successor
   command-neutral rename work.

### 3) Validation

Run the repository-required verification for direct source changes, with at
least these targeted checks included:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. `pnpm vitest run tests/v11/application/commit/commitCommandErrorNormalization.test.ts tests/v11/application/errorBoundaryContextSchema.test.ts tests/v11/application/commit/commitCommandApi.test.ts tests/core/bubble/commitBubble.test.ts`
5. `pnpm test`
6. `pnpm build`

If a narrower targeted command replaces any broad check during iteration, record
the exact skipped broad command and reason before completion.

## L2 - Branch Checklist

1. Inventory current `src/v11/shared/commit/**` imports and confirm only
   command-local helper files are in this task's movement scope.
2. Move the command-local helper modules into `src/v11/application/commit/**`.
3. Update imports and direct tests to the new paths.
4. Run `rg "shared/commit/commitCommand"` and fix any residual helper import.
5. Run targeted commit tests.
6. Run the required pre-completion verification commands.
7. Record in the implementation summary that `commitRemoteExecution.ts` remains
   intentionally retained for task `3-remote-commit-rename`.

## Review Notes

CreatePairflowSpec `CreateTask` delegated result:

1. Created as `draft` for parent plan
   `plans/shared-command-boundary-cleanup-plan-v1.md`.
2. Identity matches plan tracker: `task_id=1-commit-local-helpers`,
   `sequence_key=1`, `task_family_id=commit-local-helpers`.
3. Document and implementation bubble ids are unlinked (`null`) pending
   `ReviewSpec` approval and subsequent bubble routes.

CreatePairflowSpec `ReviewSpec` task-mode approval:

1. Decision: `approve_task` for the refreshed artifact at
   `plans/tasks/1-commit-local-helpers.md`.
2. Execution metadata gate passed: task identity, filename, parent plan tracker,
   linkage fields, and archive group are deterministic.
3. Target-file reality check passed: the task is a bounded commit-local helper
   ownership move, and the retained remote contract remains explicitly deferred
   to task `3-remote-commit-rename`.

ExecutePairflowPlan document-bubble create result:

1. Bubble `1-commit-local-helpers-doc` was created and started from committed
   base `85437e8723522645ec7c3b0a7749bbebd7a5140b`.
2. Review artifact type: `document`.
3. Required bootstrap command was supplied:
   `pnpm install --frozen-lockfile && pnpm --dir ui install --frozen-lockfile && pnpm build`.
4. Status after start: `RUNNING`, round `1`, active role `implementer`,
   active agent `codex`.
