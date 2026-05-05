---
artifact_type: task
artifact_id: task_remote_merge_rename_v1
task_family_id: remote-merge-rename
sequence_key: "4"
task_id: 4-remote-merge-rename
title: "Remote Merge Rename"
status: archived
phase: phase2
target_files:
  - src/v11/shared/merge/remoteMergeContract.ts
  - src/v11/shared/remote/remoteMergeContract.ts
  - src/v11/application/merge/mergeCommandContract.ts
  - src/v11/application/merge/mergeCommandDependencyResolution.ts
  - src/v11/application/merge/mergeFlowContext.ts
  - src/v11/application/merge/mergeFlowFinalization.ts
  - src/v11/application/merge/runMergeFlow.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleMergeParsers.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleMergeScripts.ts
prd_ref: null
plan_ref: plans/shared-command-boundary-cleanup-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/shared-command-boundary-cleanup-plan-v1.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
doc_bubble_id: 4-remote-merge-rename-doc
impl_bubble_id: 4-remote-merge-rename-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-05-shared-command-boundary-cleanup-plan-v1
archive_path: plans/archive/tasks/2026-05-05-shared-command-boundary-cleanup-plan-v1/4-remote-merge-rename.md
---

# Task: Remote Merge Rename

## L0 - Policy

### Goal

Rename the retained shared remote merge contract out of the command-named
`src/v11/shared/merge/**` boundary and into a command-neutral shared remote
boundary, then update imports without changing behavior.

### Current Review Boundary

This document may be refined in a `review_artifact_type=document` bubble before
the source rename is executed. In that docs-only review round, edits are limited
to this task specification as the primary artifact at
`plans/tasks/4-remote-merge-rename.md`. The runtime/source rename described
below remains the responsibility of a later implementation bubble or direct
implementation pass with source-edit authority. A docs-only PASS must not claim
the source rename, import rewrites, runtime behavior validation, or implementation
test evidence. If bubble-configured checks are executed during the docs-only
round, their evidence may only support the document-refinement PASS itself; it
does not satisfy the later implementation validation for the future source
rename.

### Domain / Control Model Summary

1. Business invariant: shared boundary names must communicate real ownership.
   The remote merge execution contract is shared between merge application flow
   code and SSH executor infrastructure, but the `shared/merge` directory name
   makes it look command-local.
2. Control model: `src/v11/shared/remote/**` owns command-neutral remote
   execution contracts consumed across application and infrastructure lanes.
   `src/v11/application/merge/**` remains the merge command owner and may
   consume or re-export the shared remote contract through merge-local flow
   surfaces.
3. Read-path rule: cross-lane consumers import the retained remote merge
   contract from the new command-neutral shared remote path.
4. Forbidden fallback: do not keep `remoteMergeContract.ts` under
   `shared/merge/**` because existing imports work, because the types mention
   merge-specific payload fields, or because broader remote execution naming
   cleanup could happen later.
5. Allowed resolution path: perform a behavior-preserving file rename, update
   TypeScript imports/exports, and leave runtime payload semantics unchanged.
6. Missing-data rule: if implementation discovers additional command-local
   helper logic still under `shared/merge/**`, stop and record the
   source-anchored reason instead of broadening this task into helper migration.
7. Phase boundary: this task only renames the retained remote merge contract.
   It does not revisit local merge helper moves, rename inbox/attach/list
   boundaries, redesign remote merge execution, or tighten architecture fitness
   rules.

### Plan Linkage

1. Parent plan gap closed: a true shared remote merge contract remains under a
   command-named `shared/merge` directory after task
   `2-merge-local-helpers`.
2. Depends on: `2-merge-local-helpers`.
3. Unlocks / impacts successor:
   - `5-inbox-api-rename` waits for both remote commit and remote merge shared
     contract rename tasks before the smaller command-neutral API cleanup phase.
4. Task-list impact: creates planned task `4-remote-merge-rename`; it does not
   supersede any existing task id.
5. Plan-level validation inherited: this task contributes to the plan's
   requirement that command-named shared directories disappear or be explicitly
   source-anchored before fitness hardening.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/shared/merge/remoteMergeContract.ts`
   - `src/v11/application/merge/mergeCommandContract.ts`
   - `src/v11/application/merge/mergeCommandDependencyResolution.ts`
   - `src/v11/application/merge/mergeFlowContext.ts`
   - `src/v11/application/merge/mergeFlowFinalization.ts`
   - `src/v11/application/merge/runMergeFlow.ts`
   - `src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts`
   - `src/v11/infrastructure/executor/ssh/sshBubbleMergeParsers.ts`
   - `src/v11/infrastructure/executor/ssh/sshBubbleMergeScripts.ts`
2. Canonical elements:
   - `RemoteMergeStatusTarget`
   - `RemoteMergeImportSource`
   - `buildMergeImportRef`
   - `ExecuteRemoteBubbleMergeCommandInput`
   - `ExecuteRemoteBubbleMergeCommandResult`
   - `ExecuteRemoteBubbleMergeCleanupCommandInput`
   - `RemoteMergeCleanupArtifacts`
   - `ExecuteRemoteBubbleMergeCleanupCommandResult`
3. Guard elements:
   - only import/export paths should change
   - type names, field names, discriminants, and merge cleanup artifact shapes
     stay identical
4. Compat elements:
   - existing merge application flow and SSH executor call sites remain behavior
     compatible after import rewrites
5. Forbidden reinterpretations:
   - do not change remote import ref construction, merge handoff semantics,
     cleanup artifact reporting, tmux/runtime/worktree/branch cleanup fields,
     or SSH command parsing.

### Scope Reality / Shape Proof

1. Current `src/v11/shared/merge/**` contains the retained
   `remoteMergeContract.ts` contract after task `2-merge-local-helpers`.
2. Current known consumers import it from merge application contract, flow,
   finalization, and dependency code plus SSH merge command, parser, and script
   code.
3. Actual touched scope is a shared contract path rename and mechanical import
   update.
4. Hidden scope ruled out: merge command behavior, remote commit contract
   naming, lifecycle state transitions, UI/router behavior, and fitness
   hardening.

### Boundary Classification

1. Primary shape: `shared_contract_boundary_rename`.
2. Closure buckets touched:
   - `authority_producer`: shared remote contract file moves to a neutral path.
   - `internal_execution_consumers`: merge application and SSH executor imports
     follow the new path.
3. Deferred closures:
   - inbox API rename
   - attach/list inventory and closeout
   - shared command directory fitness hardening

### In Scope

1. Move `src/v11/shared/merge/remoteMergeContract.ts` to a command-neutral shared
   remote path such as `src/v11/shared/remote/remoteMergeContract.ts`.
2. Update all imports and re-exports that reference
   `src/v11/shared/merge/remoteMergeContract`.
3. Preserve all exported type names, function names, field shapes,
   discriminants, and runtime semantics.
4. Remove the now-empty `src/v11/shared/merge` directory if no retained file
   remains.
5. Verify no imports or source files remain under `src/v11/shared/merge/**`.

For a docs-only review bubble over this task, the in-scope work is limited to
refining this task document so the later implementation can execute the rename
without ambiguity. The docs-only bubble must not perform the `src/**` move or
import rewrites, must not create a replacement synthesis document, and must keep
the implementation acceptance criteria below as future-source-change criteria.

### Out of Scope

1. Moving or changing command-local merge application helpers.
2. Renaming or changing remote commit contracts.
3. Changing remote merge command behavior, protocol payloads, import refs,
   cleanup artifact semantics, state-machine behavior, transcript content, or
   SSH command parsing.
4. Changing UI/router contracts or tests beyond compile-required import updates.
5. Tightening `shared_promotion_single_lane` or adding new architecture fitness
   failures.
6. Performing source/runtime edits when this task is being reviewed inside a
   docs-only bubble.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Shared remote owner | Remote execution contracts belong under a command-neutral shared remote boundary. | Move the retained merge remote contract out of `shared/merge`. | P1 | required-now |
| Behavior preservation | The task is a path/name cleanup only. | Keep exported type names, helper names, and payload shapes unchanged. | P1 | required-now |
| Merge application owner retained | Merge application code remains the merge command owner. | Update imports without moving merge flow/orchestration logic. | P1 | required-now |
| No governance hardening | Fitness tightening waits for the final cleanup task. | Do not change dependency fitness rules. | P2 | required-now |

### 1) Implementation Requirements

1. Create the command-neutral shared remote directory if needed.
2. Rename the retained remote merge contract file into that directory.
3. Update merge application and SSH executor imports to the new path.
4. Remove empty `src/v11/shared/merge` directory after the move.
5. Use `rg "shared/merge|remoteMergeContract" src tests` after the move to
   verify only the intended new shared remote path remains.

### 2) Acceptance Criteria

Docs-only review acceptance:

1. The task document explicitly separates the docs-only review boundary from the
   later source/runtime implementation boundary.
2. The docs-only review boundary names this task specification as the primary
   artifact and does not authorize `src/**` moves, import rewrites, runtime
   behavior changes, replacement handoff artifacts, or implementation test
   claims.
3. The docs-only PASS summary uses one consistent validation mode:
   - skipped runtime/source checks with no evidence refs, or
   - executed bubble-configured checks with refs only for commands actually run,
     framed as local feedback for the document change rather than evidence that
     the future source rename is implemented or validated.
4. The implementation acceptance criteria below remain intact as the target for
   the later source rename pass.

Implementation acceptance after the source rename:

1. `src/v11/shared/merge` no longer exists.
2. `src/v11/shared/remote/remoteMergeContract.ts` contains the retained remote
   merge contract with unchanged exported names and field shapes.
3. No source or test import references `src/v11/shared/merge`.
4. Merge application and SSH executor code typecheck through the updated
   imports.
5. No remote merge behavior, protocol payload shape, import ref construction,
   cleanup artifact reporting, or SSH command classification changes.

### 3) Validation

Docs-only review validation:

1. Mode A, skipped checks: if the docs-only PASS does not execute validation
   commands, the PASS summary should state that runtime checks were not executed
   because the round only refined the task document, and should attach no
   `.pairflow/evidence/*.log` refs.
2. Mode B, executed local feedback checks: if the docs-only PASS executes
   checks despite not changing runtime/source files, run only the
   bubble-configured validation commands that were actually used and attach only
   their PASS-owned evidence refs. Do not claim checks were intentionally skipped
   in the same PASS, and do not describe those refs as satisfying the
   implementation validation section below.

Implementation validation after the source rename:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. `pnpm test -- tests/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.test.ts`
5. `pnpm test -- tests/core/bubble/mergeBubble.test.ts`
6. `pnpm test -- tests/cli/index.test.ts tests/cli/bubbleMergeCommand.test.ts`

Broader completion checks inherited from repo policy for direct source changes:

1. `pnpm test`
2. `pnpm build`

### 4) Non-Goals

1. Do not redesign shared remote execution naming beyond the minimal neutral
   directory needed by this task.
2. Do not combine this with task `5-inbox-api-rename`.
3. Do not introduce compatibility barrels under `shared/merge`.

## L2 - Implementation Notes

1. Use `git mv` or an equivalent file move for
   `src/v11/shared/merge/remoteMergeContract.ts`.
2. Expected import updates include:
   - `src/v11/application/merge/mergeCommandContract.ts`
   - `src/v11/application/merge/mergeCommandDependencyResolution.ts`
   - `src/v11/application/merge/mergeFlowContext.ts`
   - `src/v11/application/merge/mergeFlowFinalization.ts`
   - `src/v11/application/merge/runMergeFlow.ts`
   - `src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts`
   - `src/v11/infrastructure/executor/ssh/sshBubbleMergeParsers.ts`
   - `src/v11/infrastructure/executor/ssh/sshBubbleMergeScripts.ts`
3. Keep the old type names even though the new directory is command-neutral; the
   type names describe the remote merge operation, not the directory owner.
4. If an unexpected consumer imports from `shared/merge`, update it only when
   the import is the retained remote contract. Stop for review if the consumer
   proves additional shared merge-local helper logic exists.

## Assumptions

1. Task `2-merge-local-helpers` already moved command-local merge helpers out of
   `shared/merge/**`, leaving `remoteMergeContract.ts` as the retained shared
   contract.
2. Current runtime behavior is correct; this task only changes ownership naming
   and import paths.

## Open Questions

None.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| N/A | No open later-hardening items. | N/A | N/A | N/A | N/A | N/A |

## Summary

1. Contract-boundary override: yes; this is a plan-linked shared contract path
   rename, so the task keeps explicit Plan -> Task lineage.
2. Complexity-risk decision: low to moderate; single bounded rename task is
   allowed because the change is mechanical and limited to one shared contract
   plus direct import consumers.
3. Contract-dense decision: no; the task preserves existing structured contract
   fields and does not introduce a new matrix.
4. Control model: inherited from the parent shared-command boundary cleanup
   plan and narrowed to the remote merge contract ownership rename.
