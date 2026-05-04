---
artifact_type: task
artifact_id: task_ui_import_migration_v1
task_family_id: ui-import-migration
sequence_key: "2b"
task_id: 2b-ui-import-migration
title: "UI Contract Import Migration"
status: approved
phase: phase2b
target_files:
  - ui/src/lib/types.ts
  - ui/src/lib/contracts/**
  - tests/contracts/uiContractTransitSource.test.ts
  - tests/contracts/uiContractEntrypointResolution.test.ts
  - ui/src/lib/contracts/uiContractEntrypoint.test.ts
  - tests/tools/fitness/uiContractBoundary.test.ts
prd_ref: null
plan_ref: plans/ui-contract-boundary-hardening-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/pairflow-initial-design.md
  - docs/architecture/ui-contract-governance.md
  - docs/architecture/v11-placement-and-extraction-governance.md
  - plans/ui-contract-boundary-hardening-plan-v1.md
  - plans/archive/plans/2026-05-02-ui-contract-boundary-plan-v1.md
  - plans/archive/tasks/2026-05-04-ui-contract-boundary-hardening-plan-v1/2a-contract-entrypoint.md
owners:
  - "felho"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-04-ui-contract-boundary-hardening-plan-v1
---

# Task: UI Contract Import Migration

## L0 - Policy

### Goal

Mechanically migrate UI contract imports away from scattered relative
`../../../src/contracts/ui/**` paths to the proven `@pairflow/ui-contracts`
entrypoint created by task `2a-contract-entrypoint`.

This is an import-only consumer migration. It must not change DTO fields,
literal unions, runtime validation behavior, router/API behavior, or the
canonical contract source under `src/contracts/ui/**`.

### Domain / Control Model Summary

1. Business invariant: browser-visible UI contracts are still owned once by
   `src/contracts/ui/**` and consumed through a single intentional public
   surface.
2. Control model: `src/contracts/ui/index.ts` remains canonical authority;
   `@pairflow/ui-contracts` is the approved in-repo entrypoint; UI-local files
   are consumers or compatibility barrels only.
3. Read-path rule: browser package code must read shared UI contracts through
   `@pairflow/ui-contracts` during this task.
4. Forbidden fallback: do not keep or add direct browser imports from
   `src/v11/**`, `src/types/**`, or relative `src/contracts/ui/**` paths as
   alternate contract truth.
5. Allowed resolution path: update import specifiers to the already-proven
   entrypoint and adjust transit/fitness assertions to check that the entrypoint
   remains mapped to canonical `src/contracts/ui/index.ts`.
6. Missing-data rule: N/A; this task does not parse or validate runtime wire
   data.
7. Phase boundary:
   - contract closure: consumes the entrypoint from task `2a`; no new contract.
   - producer closure: out of scope.
   - internal execution closure: out of scope.
   - workflow/orchestration closure: out of scope.
   - read-model closure: import-path alignment only, no DTO shape changes.
   - activation closure: compile/test proof that migrated imports resolve.
   - cleanup/recovery closure: remove obsolete relative import assertions only.

### Plan Linkage

1. Parent plan gap closed: fragile high-distance relative UI contract imports.
2. Depends on: archived task `2a-contract-entrypoint`.
3. Unlocks / impacts successors: tasks `3a` and `3b` can add validation on top
   of the stable entrypoint; task `4` can harden final import guardrails.
4. Task-list impact: creates planned task `2b-ui-import-migration`; it does not
   replace or obsolete any task id.
5. Inherited validation / exit expectation: prove migrated imports compile in
   root and UI tooling while preserving canonical contract authority.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `docs/architecture/ui-contract-governance.md`
   - `src/contracts/ui/**`
   - `src/contracts/ui/index.ts`
   - `tests/contracts/uiContractTransitSource.test.ts`
   - `tests/contracts/uiContractEntrypointResolution.test.ts`
   - `ui/src/lib/contracts/uiContractEntrypoint.test.ts`
2. Canonical elements:
   - `src/contracts/ui/**` remains the browser-safe UI contract authority.
   - `@pairflow/ui-contracts` resolves to `src/contracts/ui/index.ts`.
3. Guard elements:
   - `ui_contract_boundary` must continue rejecting browser imports from
     backend internals outside the allowed contract surface.
4. Compat-only elements:
   - `ui/src/lib/contracts/**` and `ui/src/lib/types.ts` may remain UI-local
     barrels, but only by re-exporting from `@pairflow/ui-contracts`.
5. Forbidden reinterpretations:
   - Do not use this migration to add, remove, or relax any DTO field.
   - Do not make a UI-local file the new authority for a contract shape.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `ui/src/lib/types.ts`
   - `ui/src/lib/contracts/**`
   - root and UI entrypoint proof tests from task `2a`
   - transit and fitness tests that currently mention relative contract paths
2. Actual touched scope: consumer-family alignment.
3. Mutation entrypoints in scope: N/A.
4. Hidden scope ruled out: backend router/action/read/event validation and DTO
   producer files remain successor task scope.
5. Branch inventory note: import succeeds or fails; there is no runtime success
   branch in this task.
6. Why the declared task shape matches reality: the plan explicitly sequences a
   mechanical import sweep after entrypoint proof and before validation work.

### Authority Boundary Map

1. Authority producer: `src/contracts/ui/index.ts` and sibling contract modules.
2. Stored authority: canonical TypeScript contract source and resolver config
   from task `2a`.
3. In-scope consumers: UI local barrels and UI type surface files that currently
   import canonical UI contracts through relative paths.
4. Explicit out-of-scope consumers: backend router/runtime code, validation
   adapters, SSE/read/action dispatch paths, and broad root test imports outside
   the UI contract consumer migration.
5. Export surfaces closed in this phase: no new export surface; this task
   consumes the `@pairflow/ui-contracts` surface.

### Baseline Preservation

1. Must-preserve behaviors:
   - existing DTO fields, literal unions, and type exports remain equivalent;
   - `@pairflow/ui-contracts` still resolves to `src/contracts/ui/index.ts`;
   - UI compatibility barrels do not redeclare contract shapes.
2. Allowed resolution paths:
   - import specifier changes from relative `src/contracts/ui/**` paths to
     `@pairflow/ui-contracts`;
   - transit test assertion updates that preserve canonical-source checks.
3. Forbidden regression interpretations:
   - do not weaken tests so a duplicated UI-local DTO mirror would pass;
   - do not remove entrypoint mapping proof without an equal replacement.
4. Replacement proof required if removed: any removed relative-path assertion
   must be replaced with proof that the same symbol is consumed through
   `@pairflow/ui-contracts` and still originates from the canonical barrel.

### Success / Completion Proof Boundary

1. Current canonical success proof source: relative imports compile and task
   `2a` proves the entrypoint mapping.
2. Target canonical success proof source: migrated UI imports compile through
   `@pairflow/ui-contracts` and entrypoint/transit tests prove canonical origin.
3. Current canonical completion proof source: N/A.
4. Target canonical completion proof source: N/A.
5. Reused proof contract: task `2a` resolver proof and existing contract transit
   source tests.
6. Proof-parity rule: `inherit_full_parity`.
7. Final truth surfaces affected: import specifiers and test assertions only.
8. Mixed-truth surfaces allowed: none.

## L1 - Implementation Contract

### In Scope

1. Replace relative UI contract imports in `ui/src/lib/types.ts` and
   `ui/src/lib/contracts/**` with `@pairflow/ui-contracts`.
2. Keep exported names and type aliases stable for existing UI consumers.
3. Update tests that intentionally assert the UI contract transit source so they
   expect the new entrypoint while still proving canonical contract authority.
4. Preserve task `2a` root and UI resolver proof tests.
5. Leave backend/root non-browser test imports alone unless a narrow assertion
   must change to keep proof parity.

### Out of Scope

1. DTO field, literal, optionality, or semantic changes.
2. Runtime validation for actions, reads, status/detail payloads, or SSE events.
3. Backend router/API behavior changes.
4. Resolver alias redesign or standalone package extraction.
5. UI component behavior or visual changes.
6. Final guardrail tightening that would reject all transitional paths outside
   this import sweep; task `4` owns final drift hardening.

### Canonical Contract Matrix

| Surface | Current State | Target State | Owner |
|---|---|---|---|
| Canonical UI contracts | `src/contracts/ui/**` | unchanged | backend UI contract surface |
| Public entrypoint | `@pairflow/ui-contracts` exists and resolves to `src/contracts/ui/index.ts` | unchanged | task `2a` baseline |
| UI contract consumers | scattered relative imports into `src/contracts/ui/**` | imports from `@pairflow/ui-contracts` | this task |
| UI-local barrels | compatibility consumers by relative path | compatibility consumers by public entrypoint | this task |
| Runtime validation | mostly absent for selected seams | unchanged | tasks `3a` and `3b` |

Structured contract rules:

1. The migration must only change import sources, not exported type names or
   contract definitions.
2. `@pairflow/ui-contracts` is the only allowed shared UI contract import path
   in browser package source after this task.
3. UI-local barrels may continue to exist only as pass-through consumers.
4. Tests must continue to prove that the entrypoint maps back to canonical
   `src/contracts/ui/index.ts`.

### Ownership and Deferred Semantics

1. This task owns the consumer import migration for UI contract imports.
2. This task does not own producer contract shape, runtime validation, or final
   fitness policy tightening beyond keeping existing boundary checks passing.
3. The presence of `@pairflow/ui-contracts` must not be interpreted as approval
   for direct browser imports from backend internals.
4. Successor tasks inherit the stable entrypoint and must not reopen the alias
   design unless they find a concrete resolver blocker.

### Mirrored Surface Checklist

When changing the consumer import rule, keep these surfaces aligned:

1. L0 read-path and forbidden fallback clauses.
2. L1 Canonical Contract Matrix and Structured Contract Rules.
3. UI source import specifiers.
4. Transit/source tests that check canonical authority.
5. Validation matrix and acceptance criteria.

### Branch / Failure Inventory

| Branch | Required Behavior | Proof |
|---|---|---|
| Migrated imports resolve | UI barrels/types import from `@pairflow/ui-contracts` and compile | `pnpm typecheck`, `pnpm --dir ui test` |
| Canonical source drifts | tests fail if `@pairflow/ui-contracts` no longer maps to `src/contracts/ui/index.ts` | entrypoint proof tests |
| DTO shape accidentally changes | type/transit tests fail or diff shows non-import changes | contract tests and review of changed files |
| Runtime validation is needed | leave unchanged and defer to tasks `3a`/`3b` | no router/API changes in diff |

### Implementation Decision

1. Migrate UI browser package contract imports to `@pairflow/ui-contracts`.
2. Preserve `src/contracts/ui/index.ts` as the only producer barrel.
3. Keep compatibility barrels because broader UI call-site cleanup is not a
   behavioral goal here; their import sources must point at the public
   entrypoint.
4. Update assertions that currently require relative import strings so they
   instead require the public entrypoint and retain canonical-source proof.

### Validation Matrix

Run the narrowest relevant checks after implementation:

1. `pnpm typecheck`
2. `pnpm --dir ui test`
3. `pnpm fitness:check:ci`
4. `pnpm test` if root contract tests were changed beyond string assertions.
5. `pnpm --dir ui build` if Vite/UI build-time import behavior is affected.

If broader checks are skipped, the implementation summary must name the
narrower proof and explain the skip.

### Acceptance Criteria

1. `ui/src/lib/types.ts` and `ui/src/lib/contracts/**` no longer import shared
   contracts through relative `src/contracts/ui/**` paths.
2. The same exported UI-local types remain available to existing UI consumers.
3. `@pairflow/ui-contracts` remains mapped to canonical
   `src/contracts/ui/index.ts`.
4. Transit/entrypoint tests fail if the migration is replaced by a UI-local DTO
   mirror.
5. No DTO fields, literal unions, runtime validation behavior, or backend
   router/API behavior changes in this task.

### Downstream Inheritance

1. Tasks `3a` and `3b` should use `@pairflow/ui-contracts` when adding
   validators or response checks for UI-visible shapes.
2. Task `4` may tighten final guardrails to reject direct browser imports from
   relative canonical contract paths after this migration.
3. Future standalone package extraction remains out of scope unless a later plan
   explicitly introduces it.

## L2 - Execution Notes

1. Start with `ui/src/lib/contracts/**` pass-through barrels, then update
   `ui/src/lib/types.ts`.
2. Prefer grouped imports from `@pairflow/ui-contracts` when this keeps the diff
   readable; do not split DTO ownership across UI-local definitions.
3. Keep type-only imports as type-only imports where they are currently types.
4. Update `tests/contracts/uiContractTransitSource.test.ts` assertions from
   relative import strings to `@pairflow/ui-contracts` while preserving checks
   that the canonical barrel exports the expected symbols.
5. Do not edit backend router code or add validators in this task.
6. Review the final diff for import-only behavior before running validation.
