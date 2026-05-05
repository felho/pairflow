---
artifact_type: task
artifact_id: task_merge_local_helpers_v1
task_family_id: merge-local-helpers
sequence_key: "2"
task_id: 2-merge-local-helpers
title: "Merge Local Helpers"
status: archived
phase: phase1
target_files:
  - src/v11/application/merge/mergeCommandErrorRuntime.ts
  - src/v11/application/merge/mergeCommandErrorNormalization.ts
  - src/v11/application/merge/mergeCommandInputNormalization.ts
  - src/v11/application/merge/mergeRoutingEligibility.ts
  - src/v11/shared/merge/mergeCommandErrorRuntime.ts
  - src/v11/shared/merge/mergeCommandErrorNormalization.ts
  - src/v11/shared/merge/mergeCommandInputNormalization.ts
  - src/v11/shared/merge/mergeRoutingEligibility.ts
  - src/v11/shared/merge/remoteMergeContract.ts
  - src/v11/application/merge/mergeCommandContract.ts
  - src/v11/application/merge/mergeCommandErrorClassification.ts
  - src/v11/application/merge/mergeCommandOrchestration.ts
  - src/v11/application/merge/mergeFlowContext.ts
  - src/v11/application/merge/mergeFlowTypes.ts
  - src/v11/application/merge/remoteMergeExecutionContext.ts
  - src/v11/application/merge/runMergeFlow.ts
  - tests/v11/application/errorBoundaryContextSchema.test.ts
  - tests/v11/application/merge/mergeCommandErrorClassification.test.ts
  - tests/v11/application/merge/mergeCommandErrorNormalization.test.ts
  - tests/v11/application/merge/mergeCommandInputNormalization.test.ts
prd_ref: null
plan_ref: plans/shared-command-boundary-cleanup-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/shared-command-boundary-cleanup-plan-v1.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
doc_bubble_id: 2-merge-local-helpers-doc
impl_bubble_id: 2-merge-local-helpers-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-05-shared-command-boundary-cleanup-plan-v1
---

# Task: Merge Local Helpers

## L0 - Policy

### Goal

Move the proven command-local merge error, input-normalization, and merge
routing helper files out of `src/v11/shared/merge/**` and into the owning
`src/v11/application/merge/**` lane, while leaving the retained remote merge
contract module in place for the successor command-neutral rename task.

### Domain / Control Model Summary

1. Business invariant: `src/v11/shared/**` must not hold single-command helper
   logic; shared modules should be command-neutral contracts or utilities with a
   concrete multi-consumer reason.
2. Control model: `src/v11/application/merge/**` owns merge command runtime
   error wrapping, merge input normalization, merge eligibility checks, merge
   flow orchestration, and command-local tests. `src/v11/shared/merge/remoteMergeContract.ts`
   remains a retained shared remote-port contract until task
   `4-remote-merge-rename` renames it to a command-neutral shared boundary.
3. Read-path rule: merge application code imports merge-local helpers from the
   application merge lane. Cross-command consumers may continue to import the
   remote merge contract through `src/v11/application/merge/mergeCommandContract.ts`.
4. Forbidden fallback: do not keep merge-local helper code in `shared/merge/**`
   because it might be reused later, because import churn is inconvenient, or
   because the directory already exists for the remote contract.
5. Allowed resolution path: relocate only the command-local helper files,
   update imports and tests, and keep exported behavior and error semantics
   equivalent.
6. Missing-data rule: if implementation discovers an additional
   `shared/merge/**` file with mixed or unclear ownership, leave it in place
   and record the source-anchored reason for successor work instead of moving it
   speculatively.
7. Phase boundary: this task is a behavior-preserving local-helper move. It
   does not rename remote merge contracts, redesign merge behavior, change
   lifecycle state semantics, alter UI/router contracts, or tighten the fitness
   rule.

### Plan Linkage

1. Parent plan gap closed: `shared/merge` mixes command-local helpers with the
   remote merge contract shape.
2. Depends on: no predecessor task.
3. Unlocks / impacts successor:
   - `4-remote-merge-rename` can rename the retained remote merge contract once
     local helpers no longer share the same command-named shared boundary.
4. Task-list impact: creates planned task `2-merge-local-helpers`; it does not
   supersede any existing task id.
5. Plan-level validation inherited: this task contributes to the plan's
   requirement that command-local helper logic leave command-named shared
   directories before shared-command fitness hardening.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/shared/merge/mergeCommandErrorRuntime.ts`
   - `src/v11/shared/merge/mergeCommandErrorNormalization.ts`
   - `src/v11/shared/merge/mergeCommandInputNormalization.ts`
   - `src/v11/shared/merge/mergeRoutingEligibility.ts`
   - `src/v11/shared/merge/remoteMergeContract.ts`
   - `src/v11/application/merge/mergeCommandContract.ts`
   - `src/v11/application/merge/mergeCommandErrorClassification.ts`
   - `src/v11/application/merge/mergeCommandOrchestration.ts`
   - `src/v11/application/merge/mergeFlowContext.ts`
   - `src/v11/application/merge/mergeFlowTypes.ts`
   - `src/v11/application/merge/remoteMergeExecutionContext.ts`
   - `tests/v11/application/errorBoundaryContextSchema.test.ts`
   - `tests/v11/application/merge/mergeCommandErrorClassification.test.ts`
   - `tests/v11/application/merge/mergeCommandErrorNormalization.test.ts`
   - `tests/v11/application/merge/mergeCommandInputNormalization.test.ts`
2. Canonical elements:
   - `BubbleMergeError` keeps name, reason-code handling, cause handling, and
     required command context value `merge`.
   - merge error normalization keeps current classification for
     `BubbleLookupError`, `GitCommandError`, workspace cleanup, tmux/runtime
     registry errors, `RemoteBubbleStatusError`, and remote merge command
     errors.
   - merge input normalization still requires non-empty `bubbleId`, preserves
     optional `repoPath` / `cwd`, defaults `push` and `deleteRemote` to `false`,
     and derives `nowIso` from the selected `Date`.
   - merge eligibility still requires `DONE`, existing base and bubble
     branches, distinct branch names, a clean repo excluding `.pairflow`, and
     `origin` for push/delete-remote operations.
   - `remoteMergeContract.ts` remains untouched except for import paths that
     are mechanically required by the move.
3. Guard elements:
   - this task may update tests that import merge-local helper modules directly
     so they verify the new owning path.
   - the existing application-facing exports from `mergeCommandContract.ts` and
     merge orchestration entrypoints remain the preferred runtime surfaces.
4. Compat elements:
   - public exports from command entrypoints remain behaviorally unchanged.
   - the remote merge contract remains available to current consumers until task
     `4-remote-merge-rename`.
5. Forbidden reinterpretations:
   - Do not treat moving helper files as authorization to rename remote merge
     ports.
   - Do not change merge state-machine eligibility, dirty-tree filtering,
     push/delete-remote behavior, transcript or result semantics, reason codes,
     or error class identity semantics beyond the import path relocation.

### Scope Reality / Shape Proof

1. Inspected current files:
   - `src/v11/shared/merge/mergeCommandErrorRuntime.ts`
   - `src/v11/shared/merge/mergeCommandErrorNormalization.ts`
   - `src/v11/shared/merge/mergeCommandInputNormalization.ts`
   - `src/v11/shared/merge/mergeRoutingEligibility.ts`
   - `src/v11/shared/merge/remoteMergeContract.ts`
   - merge application wrappers and tests listed in `target_files`.
2. Actual touched scope: a local application-lane move for merge error,
   input-normalization, and eligibility helper modules plus import/test path
   updates.
3. Mutation entrypoints in scope:
   - source file relocation within `src/v11/**`
   - TypeScript import path updates
   - targeted tests that import relocated helpers
4. Hidden scope ruled out: remote contract rename, commit command changes,
   lifecycle behavior changes, UI/router payload changes, broad shared
   dependency governance, and fitness hardening.
5. Dependency reality: `remoteMergeContract.ts` is the retained multi-consumer
   shared contract; the other current `shared/merge` files are consumed by the
   merge application lane and merge tests.
6. Why the declared task shape matches reality: the command-local helper files
   are merge-specific error/input/eligibility utilities, while the retained
   shared contract is isolated in `remoteMergeContract.ts`.

### Boundary Classification

1. Primary shape: `local_helper_ownership_move`.
2. Closure buckets touched:
   - `authority_producer`: merge application runtime owns merge-local error,
     input, and eligibility helpers after the move.
   - `internal_execution_consumers`: merge command orchestration and flow
     helpers continue through the same application surfaces.
   - `test_consumers`: direct helper imports are updated to the new owner path.
3. Collapsed closures:
   - error helper relocation, input normalization relocation, and eligibility
     helper relocation are kept in one task because they are all proven
     merge-local and do not touch the retained remote contract.
4. Deferred closures:
   - command-neutral remote merge contract rename
   - shared fitness/governance tightening

### In Scope

1. Move `mergeCommandErrorRuntime.ts` into `src/v11/application/merge/**`.
2. Move `mergeCommandErrorNormalization.ts` into
   `src/v11/application/merge/**`.
3. Move `mergeCommandInputNormalization.ts` into
   `src/v11/application/merge/**`.
4. Move `mergeRoutingEligibility.ts` into `src/v11/application/merge/**`.
5. Update imports in merge application code and tests to the new owning path.
6. Preserve all exported behavior, error names, reason-code behavior, input
   defaults, eligibility checks, dirty-tree filtering, and remote-origin
   requirements.
7. Confirm that `src/v11/shared/merge/remoteMergeContract.ts` remains for the
   successor command-neutral shared rename task.
8. Remove an empty `src/v11/shared/merge` directory only if the retained remote
   contract has not kept it present; otherwise leave it for task
   `4-remote-merge-rename`.

### Out of Scope

1. Renaming or relocating `remoteMergeContract.ts`.
2. Renaming `mergeCommandContract.ts` or changing consumers of the remote merge
   contract.
3. Changing merge command behavior, state-machine behavior, protocol payloads,
   event payloads, push/delete-remote behavior, or public `src/index.ts`
   exports.
4. Changing UI/router contracts or tests beyond compile-required import
   updates.
5. Tightening `shared_promotion_single_lane` or adding new architecture fitness
   failures.
6. Moving commit helpers or any `shared/commit/**` files.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Local helper owner | Merge error, input-normalization, and eligibility helpers belong under `application/merge`. | Relocate those helpers and update imports. | P1 | required-now |
| Remote contract retained | Remote merge port shapes remain under the existing retained shared file for task 4. | Do not move or rename `remoteMergeContract.ts`. | P1 | required-now |
| Behavior preservation | Error, input, and eligibility behavior must stay equivalent. | Tests should fail only for path/import issues, not semantic drift. | P1 | required-now |
| No broadened cleanup | This is not a shared fitness hardening task. | Avoid broad dependency-rule changes. | P2 | required-now |

### 1) Implementation Requirements

1. Create application-owned equivalents for the four command-local helper files
   currently under `src/v11/shared/merge/**`.
2. Update merge application imports to use the application merge lane for:
   - `BubbleMergeError`, `createBubbleMergeError`
   - `normalizeBubbleMergeError`
   - `normalizeMergeBubbleInput`
   - merge routing eligibility helpers
3. Update direct test imports from the old shared helper path to the new
   application helper path.
4. Remove the old shared helper files after their application-owned equivalents
   are in place and all imports have moved.
5. Use `rg "shared/merge/mergeCommand|shared/merge/mergeRoutingEligibility" src tests`
   after the move to verify no command-local helper imports remain.
6. Keep `src/v11/application/merge/mergeCommandContract.ts` exporting the
   retained remote contract until the successor task renames the shared remote
   boundary.

### 2) Acceptance Criteria

1. `src/v11/shared/merge` contains only the retained remote merge contract, or
   does not exist only if task 4 has already safely removed it.
2. No import remains from:
   - `src/v11/shared/merge/mergeCommandErrorRuntime`
   - `src/v11/shared/merge/mergeCommandErrorNormalization`
   - `src/v11/shared/merge/mergeCommandInputNormalization`
   - `src/v11/shared/merge/mergeRoutingEligibility`
3. Existing merge error tests still prove command context and remote error
   normalization behavior.
4. Existing merge input-normalization tests still prove input defaults and
   required bubble id behavior.
5. Existing merge flow and routing behavior remains covered by merge command
   tests.
6. `remoteMergeContract.ts` remains behaviorally untouched for successor
   command-neutral rename work.

### 3) Validation

Run the repository-required verification for direct source changes, with at
least these targeted checks included:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. `pnpm vitest run tests/v11/application/merge/mergeCommandErrorClassification.test.ts tests/v11/application/merge/mergeCommandErrorNormalization.test.ts tests/v11/application/merge/mergeCommandInputNormalization.test.ts tests/v11/application/errorBoundaryContextSchema.test.ts`
5. `pnpm test`
6. `pnpm build`

If a narrower targeted command replaces any broad check during iteration,
record the exact skipped broad command and reason before completion.

## L2 - Branch Checklist

### Implementation

1. Confirm `git status` is clean before bubble creation.
2. Move the four merge-local helper files into `src/v11/application/merge/**`.
3. Update all source imports to the new application path.
4. Update all direct test imports to the new application path.
5. Run `rg "shared/merge/mergeCommand|shared/merge/mergeRoutingEligibility" src tests`
   and confirm no command-local helper imports remain.
6. Run the validation commands listed in L1.
7. Record any source-anchored deferral if an unexpected mixed-ownership file is
   found.

### Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB-001 | Rename retained remote merge contract into a command-neutral shared boundary. | L2 | P2 | later-hardening | Parent plan task `4-remote-merge-rename` | Leave to successor task after local helper relocation lands. |

## Assumptions

1. Current merge behavior is correct; this task is an ownership and import-path
   cleanup only.
2. The current direct consumers prove the four moved helper files are
   merge-local.
3. `remoteMergeContract.ts` is the retained shared contract and is intentionally
   not renamed here.

## Open Questions

None.

## Creation Summary

1. Contract-boundary override: no; this is a behavior-preserving ownership move
   and import update, not a public contract change.
2. Complexity-risk decision: low to moderate; single task allowed because the
   changed files are one command-local helper cluster and the shared remote
   contract rename is explicitly deferred.
3. Contract-dense decision: no; no schema, status taxonomy, or shared result
   shape is changed.
4. Control model: inherited cleanly from the parent plan and v11 placement
   governance.
