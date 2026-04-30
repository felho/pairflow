---
artifact_type: plan
artifact_id: plan_parity_test_retirement_v1
plan_id: parity-test-retirement-plan-v1
created_on: "2026-04-30"
title: "Parity Test Retirement Plan V1"
status: approved
plan_status: approved
prd_ref: null
owners:
  - "felho"
task_order:
  - 1-facade-migration-map-cleanup
  - 2-cli-entrypoint-boundary-guard
  - 3-reconcile-contract-v11-only
  - 4-meta-review-gate-case-rename
active_task_id: 2-cli-entrypoint-boundary-guard
archive_group: 2026-04-30-parity-test-retirement-plan-v1
task_tracker:
  - task_id: 1-facade-migration-map-cleanup
    task_path: plans/archive/tasks/2026-04-30-parity-test-retirement-plan-v1/1-facade-migration-map-cleanup.md
    status: archived
    notes: "Remove the exhausted facade parity/migration-map layer and related script wiring."
  - task_id: 2-cli-entrypoint-boundary-guard
    task_path: plans/tasks/2-cli-entrypoint-boundary-guard.md
    status: approved
    notes: "Replace per-command CLI entrypoint parity sentinels with one explicit boundary/inventory guard."
  - task_id: 3-reconcile-contract-v11-only
    task_path: null
    status: not_created
    notes: "Remove tautological reconcile baseline/parity contract modes and keep v11 contract cases only."
  - task_id: 4-meta-review-gate-case-rename
    task_path: null
    status: not_created
    notes: "Normalize meta-review-gate parity-named contract cases to v11 behavior cases without touching runtime parity metadata."
---

# Plan: Parity Test Retirement V1

## Objective

Retire migration-era parity test scaffolding that no longer compares independent
legacy and v11 implementations, while preserving the guards that still protect
real boundaries.

The end state should reduce obsolete migration vocabulary in tests and scripts
without weakening:

1. CLI wrapper import-boundary coverage.
2. v11 behavior contract coverage.
3. runtime/domain `parity` concepts used for meta-review findings consistency.
4. legacy command removal behavior for removed top-level aliases.

## Done Definition

1. `facade-parity-coverage`, the all-v11 migration map, and the dedicated
   `test:v11:facades` script are removed or replaced by current-purpose checks.
2. Per-command `*CliEntrypointParity.test.ts` files are removed, with their
   useful protection folded into one boundary/inventory test.
3. Reconcile contract cases no longer carry `baseline` or `parity` execution
   modes when both sides execute the same v11 implementation.
4. Meta-review-gate contract cases no longer use migration-era `parity` naming
   when they are v11 behavior cases.
5. Runtime/domain parity terminology remains untouched where it represents
   structured findings/claim consistency rather than legacy-vs-v11 comparison.
6. Validation passes:
   - targeted contract/CLI tests for changed areas,
   - `pnpm typecheck`,
   - `pnpm lint`,
   - `pnpm test`,
   - `pnpm fitness:check`.

## Guiding Principles

1. Business invariant: removing migration scaffolding must not reduce coverage
   for supported Pairflow behavior or supported public CLI entrypoints.
2. Control model: the current v11 source tree is the implementation authority;
   tests should either validate v11 behavior or enforce boundary ownership, not
   preserve historical migration stages as active truth.
3. Read-path rule: cleanup decisions must be anchored to current code paths and
   tests, especially:
   - `src/core/**` absence,
   - v11 CLI command modules under `src/v11/application/**`,
   - bubble CLI wrappers under `src/cli/commands/bubble/**`,
   - contract case runners under `tests/contracts/v11/**`.
4. Forbidden fallback: do not keep a parity test solely because the word
   "legacy" appears in a filename, description, or historical note.
5. Allowed resolution path: a parity-named artifact may remain only when it is
   reclassified as one of:
   - current boundary/inventory guard,
   - current v11 behavior contract,
   - runtime/domain findings-parity logic,
   - explicit removed-alias fail-closed coverage.
6. Missing-data rule: if a task cannot prove whether a parity artifact still
   covers a real current boundary, keep the behavior coverage and first rename or
   narrow the test instead of deleting it.
7. Sequencing / boundary note:
   - producer-first rule: remove exhausted migration metadata before contract
     case rewrites so later tasks do not keep stale map dependencies alive.
   - downstream consume families that remain separate: CLI wrapper boundary
     tests, contract corpus manifests, and runtime meta-review parity metadata.
   - cleanup/recovery timing: included now for test/script cleanup; runtime
     behavior cleanup is out of scope.

## Canonical Contract Anchors

1. Source-of-truth anchors:
   - `tests/contracts/v11/core-shim-boundary-coverage.test.ts`
   - `tests/contracts/v11/cli-entrypoint-parity-coverage.test.ts`
   - `tests/contracts/v11/facade-parity-coverage.test.ts`
   - `tests/contracts/v11/migration-map.ts`
   - `tests/contracts/v11/reconcile.contract.runner.ts`
   - `tests/contracts/v11/metaReviewGate.contract.runner.ts`
   - `docs/architecture/v11-placement-and-extraction-governance.md`
2. Closed canonical elements / terms:
   - `v11` is the current implementation authority for migrated commands.
   - `src/core/**` is not an active implementation baseline.
   - `parity` in meta-review findings modules means structured claim/artifact
     consistency, not legacy-vs-v11 migration comparison.
3. Explicitly authorized reinterpretation:
   - Migration-era "parity" tests may be reclassified as boundary guards or v11
     behavior tests when they no longer compare independent implementations.
   - Reclassified tests should be renamed so future readers do not infer a
     legacy baseline that no longer exists.
4. Downstream task impact:
   - Tasks must not delete runtime/domain parity modules under
     `src/v11/shared/metaReview*` solely because of their names.
   - Tasks must not remove legacy command removal tests for `pass`,
     `ask-human`, or `converged`; those tests protect removed alias behavior.

## Current Status

### Completed Work

1. Current repo inspection confirms `src/core/**` has no files.
2. `tests/contracts/v11/core-shim-boundary-coverage.test.ts` already runs in
   strict fail mode and protects against reintroducing direct core imports.
3. `pnpm typecheck`, `pnpm lint`, `pnpm test:v11:facades`, `pnpm test`, and
   `pnpm fitness:check` passed on the reviewed baseline.

### Open Work

1. Remove exhausted facade parity and migration-map scaffolding.
2. Replace per-command CLI parity identity tests with a smaller boundary guard.
3. Convert reconcile contract coverage to v11-only cases.
4. Rename/reclassify meta-review-gate parity-named cases that are still useful
   behavior cases.

### Deferred / Future Work

1. No runtime behavior redesign is included in this plan.
2. No cleanup of runtime meta-review findings parity logic is included in this
   plan.
3. Broader public export naming cleanup, such as removing `V11` aliases from
   source APIs, is deferred unless directly required by one of the listed tasks.

## Progress / Phase Summary

1. Phase 1: remove dead migration scaffolding.
2. Phase 2: keep CLI boundary protection while dropping per-command parity
   sentinels.
3. Phase 3: simplify contract harnesses and corpus manifests to current v11
   behavior naming.

## Open Task List

| Task ID | Task Path | Purpose | Depends On | Closes Gap | Status |
|---|---|---|---|---|---|
| `1-facade-migration-map-cleanup` | `plans/tasks/1-facade-migration-map-cleanup.md` | Remove the empty facade parity map, all-v11 migration map, and obsolete script wiring. | `N/A` | Exhausted migration metadata remains active. | approved |
| `2-cli-entrypoint-boundary-guard` | `null` | Replace per-command `*CliEntrypointParity.test.ts` files with one current-purpose CLI boundary/inventory test. | `1-facade-migration-map-cleanup` | CLI parity tests duplicate one-line shims but still contain useful boundary intent. | not_created |
| `3-reconcile-contract-v11-only` | `null` | Remove reconcile `baseline`/`parity` contract cases and runner branches that compare aliases to the same v11 implementation. | `1-facade-migration-map-cleanup` | Reconcile contract harness still carries tautological legacy comparison modes. | not_created |
| `4-meta-review-gate-case-rename` | `null` | Rename/reclassify meta-review-gate parity-named behavior cases as v11 cases and update corpus expectations. | `3-reconcile-contract-v11-only` | Useful meta-review-gate cases still look like migration parity cases. | not_created |

## Coverage Map

| Plan Gap | Closed By | Notes |
|---|---|---|
| Exhausted facade parity and migration map remain active. | `1-facade-migration-map-cleanup` | Includes package script/readme references if they become stale. |
| CLI entrypoint guard is spread across 12 identity tests. | `2-cli-entrypoint-boundary-guard` | Preserve import-boundary protection in a single renamed contract test. |
| Reconcile baseline/parity contract modes compare the same implementation. | `3-reconcile-contract-v11-only` | Keep behavior cases as v11 contract cases only. |
| Meta-review-gate behavior cases use migration-era parity names. | `4-meta-review-gate-case-rename` | Preserve cases; rename mode/files unless a case proves redundant. |
| Runtime/domain parity concepts could be accidentally deleted by name search. | All tasks | Explicit non-goal and validation check in every task. |

## Dependencies and Order

1. Task 1 should run first because it removes the obsolete migration authority
   that otherwise keeps later cleanup terminology alive.
2. Task 2 can run after Task 1 and should keep only the current CLI shim/import
   boundary guard.
3. Task 3 can run after Task 1; it should not wait for Task 2 unless both touch
   the same contract coverage file.
4. Task 4 should run after Task 3 so the contract corpus cleanup pattern is
   already proven on the simpler reconcile harness.

## Risks and Assumptions

1. Assumption: no active implementation under `src/core/**` means no current
   independent legacy baseline exists.
2. Risk: deleting by filename alone could remove runtime `parity` domain logic.
   Mitigation: each task must classify parity usage before deleting.
3. Risk: CLI wrapper guard may be weakened if all per-command tests are removed
   without preserving the import-boundary inventory. Mitigation: keep a renamed
   single boundary coverage test.
4. Risk: contract corpus manifests may still reference renamed/deleted case
   files. Mitigation: every contract cleanup task must update manifest
   expectations and run corpus manifest checks.

## Validation Strategy

1. Task 1:
   - targeted tests for contract coverage/migration-map removal,
   - `pnpm typecheck`,
   - `pnpm lint`.
2. Task 2:
   - targeted CLI boundary coverage test,
   - relevant CLI command tests,
   - `pnpm typecheck`,
   - `pnpm lint`.
3. Task 3:
   - `pnpm exec vitest run tests/contracts/v11/reconcile.contract.test.ts`,
   - corpus manifest build/check,
   - `pnpm typecheck`,
   - `pnpm lint`.
4. Task 4:
   - `pnpm exec vitest run tests/contracts/v11/metaReviewGate.contract.test.ts`,
   - corpus manifest build/check,
   - `pnpm typecheck`,
   - `pnpm lint`.
5. Plan close validation:
   - `pnpm test`,
   - `pnpm fitness:check`.
