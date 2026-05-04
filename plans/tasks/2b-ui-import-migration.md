---
artifact_type: task
artifact_id: task_ui_import_migration_v1
task_family_id: ui-import-migration
sequence_key: "2b"
task_id: 2b-ui-import-migration
title: "UI Contract Import Migration"
status: in_progress
phase: phase2b
target_files:
  - ui/src/lib/types.ts
  - ui/src/lib/contracts/bubbleLifecycle.ts
  - ui/src/lib/contracts/stateValidation.ts
  - ui/src/lib/contracts/uiActions.ts
  - ui/src/lib/contracts/uiErrors.ts
  - ui/src/lib/contracts/uiEvents.ts
  - ui/src/lib/contracts/uiReadModel.ts
  - ui/src/lib/contracts/uiRemoteExecution.ts
  - tests/contracts/uiContractTransitSource.test.ts
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
  - plans/archive/tasks/2026-05-04-ui-contract-boundary-hardening-plan-v1/1-ui-contract-guard-cleanup.md
  - plans/archive/tasks/2026-05-04-ui-contract-boundary-hardening-plan-v1/2a-contract-entrypoint.md
owners:
  - "felho"
doc_bubble_id: 2b-ui-import-migration-doc
impl_bubble_id: 2b-ui-import-migration-impl
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
   are consumers or compatibility barrels only. A compatibility barrel may
   re-export imported canonical symbols or define a direct alias of one imported
   canonical symbol, but it must not derive a new shape with `Pick`, `Omit`,
   intersections, unions, mapped types, conditional types, indexed access
   derivations, local object literals, or interfaces.
3. Read-path rule: browser package code must read shared UI contracts through
   `@pairflow/ui-contracts` during this task.
4. Forbidden fallback: do not keep or add direct browser imports from
   `src/v11/**`, `src/types/**`, or relative `src/contracts/ui/**` paths as
   alternate contract truth.
5. Allowed resolution path: update import and re-export specifiers in the UI
   consumer surface to the already-proven entrypoint and adjust transit/fitness
   assertions to check that the entrypoint remains mapped to canonical
   `src/contracts/ui/index.ts`.
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
2. Depends on: archived task `1-ui-contract-guard-cleanup` for the closed
   protocol export baseline and archived task `2a-contract-entrypoint` for the
   `@pairflow/ui-contracts` resolver baseline.
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
   - root contract parity tests that import canonical contract modules directly
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
5. Negative-path proof required: transit or fitness assertions must fail when a
   UI browser file keeps importing `../../../src/contracts/ui/**` directly or
   replaces the import with a UI-local DTO mirror that does not consume
   `@pairflow/ui-contracts`. Bind this proof to
   `tests/contracts/uiContractTransitSource.test.ts` for source-origin/string
   assertions and `tests/tools/fitness/uiContractBoundary.test.ts` for the
   browser-import policy fixture.

### Success / Completion Proof Boundary

1. Current canonical success proof source: relative imports compile and task
   `2a` proves the entrypoint mapping.
2. Target canonical success proof source: migrated UI imports compile through
   `@pairflow/ui-contracts`; entrypoint/transit tests prove canonical origin;
   and the fitness proof rejects direct browser relative imports from
   `src/contracts/ui/**`.
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
5. Update only the narrow fitness test expectations needed to express the new
   browser import rule for the entrypoint.
6. Leave backend/root non-browser contract tests that import canonical modules
   directly alone unless a narrow assertion must change to keep proof parity.

### Out of Scope

1. DTO field, literal, optionality, or semantic changes.
2. Runtime validation for actions, reads, status/detail payloads, or SSE events.
3. Backend router/API behavior changes.
4. Resolver alias redesign or standalone package extraction.
5. UI component behavior or visual changes.
6. Final guardrail tightening that would reject all transitional paths outside
   this import sweep; task `4` owns final drift hardening.
7. Broad test migration from direct canonical contract imports to
   `@pairflow/ui-contracts` outside the UI browser consumer proof surface. The
   only allowed exception is a direct assertion update in a root proof test when
   that assertion reads a UI browser file changed by this task and would
   otherwise keep requiring the obsolete relative import string.

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
5. A pass-through UI-local barrel may contain import/export statements and
   direct aliases of imported canonical symbols. A direct alias means
   `export type Local = ImportedCanonicalSymbol`; it does not include
   `Pick`, `Omit`, intersections, unions, mapped types, conditional types,
   indexed access derivations, or local interface/object literal declarations.
   Any derived local type is a new shape and is forbidden in this task.
6. For this task, the new fitness rule is limited to UI browser source:
   `ui/src/**` must not import canonical UI contracts through relative
   `src/contracts/ui/**` paths and must use `@pairflow/ui-contracts` instead.
   This does not tighten backend/root test imports or every non-browser
   transitional path; task `4` owns the later broad drift hardening.
7. UI compatibility barrels must not import from each other during this
   migration. Each barrel should import or re-export from
   `@pairflow/ui-contracts` directly so the migration cannot introduce a
   circular UI-local contract graph.

### File Classification

| File / Pattern | Classification | Required Treatment |
|---|---|---|
| `ui/src/lib/types.ts` | browser consumer surface | replace direct relative `src/contracts/ui/**` imports with `@pairflow/ui-contracts`; preserve exports |
| `ui/src/lib/contracts/{bubbleLifecycle,stateValidation,uiActions,uiErrors,uiEvents,uiReadModel,uiRemoteExecution}.ts` | UI compatibility barrels | replace direct relative `src/contracts/ui/**` re-exports/imports with `@pairflow/ui-contracts`; do not redeclare shapes |
| `tests/contracts/uiContractTransitSource.test.ts` | proof test | replace expectations for UI relative contract imports with expectations for `@pairflow/ui-contracts`; retain canonical source/export proof |
| `tests/contracts/uiContractEntrypointResolution.test.ts` | reference-only root resolver proof | do not list as a direct target; run or preserve to prove the task-2a resolver contract still holds |
| `ui/src/lib/contracts/uiContractEntrypoint.test.ts` | reference-only UI resolver proof | do not list as a direct target; run or preserve to prove the task-2a UI/Vite/Vitest resolver contract still holds |
| `tests/tools/fitness/uiContractBoundary.test.ts` | policy unit proof | update only narrow fixtures/assertions that encode the browser import rule: relative UI imports from `src/contracts/ui/**` fail; `@pairflow/ui-contracts` remains the allowed browser path |
| `tests/contracts/uiContractParity.types.ts` and other root contract parity tests | reference-only canonical contract proof | do not list as a direct target; leave direct canonical imports in place unless a specific assertion reads UI browser source and would otherwise require an obsolete relative import string |

### UI Contract Barrel Disposition

| File | Current Role | Required Disposition |
|---|---|---|
| `ui/src/lib/contracts/bubbleLifecycle.ts` | compatibility barrel for lifecycle contract values/types | re-export from `@pairflow/ui-contracts`; no UI-local aliases or derived shapes |
| `ui/src/lib/contracts/stateValidation.ts` | compatibility barrel for validation diagnostic types | re-export from `@pairflow/ui-contracts`; no UI-local aliases or derived shapes |
| `ui/src/lib/contracts/uiActions.ts` | compatibility barrel for action/result DTO types | re-export from `@pairflow/ui-contracts`; no UI-local aliases or derived shapes |
| `ui/src/lib/contracts/uiErrors.ts` | compatibility barrel for UI error DTO types | re-export from `@pairflow/ui-contracts`; no UI-local aliases or derived shapes |
| `ui/src/lib/contracts/uiEvents.ts` | compatibility barrel for event names and event DTO types | re-export from `@pairflow/ui-contracts`; no UI-local aliases or derived shapes |
| `ui/src/lib/contracts/uiReadModel.ts` | compatibility barrel for read-model values/types | re-export from `@pairflow/ui-contracts`; no UI-local aliases or derived shapes |
| `ui/src/lib/contracts/uiRemoteExecution.ts` | compatibility barrel for remote-execution DTO types | re-export from `@pairflow/ui-contracts`; no UI-local aliases or derived shapes |
| `ui/src/lib/contracts/uiContractEntrypoint.test.ts` | UI resolver proof, not a compatibility barrel | preserve task-2a proof unless resolver behavior changes; keep out of barrel migration edits |

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
5. Browser-source fitness rule and policy fixtures.
6. Validation matrix and acceptance criteria.

### Branch / Failure Inventory

| Branch | Required Behavior | Proof |
|---|---|---|
| Migrated imports resolve | UI barrels/types import from `@pairflow/ui-contracts` and compile | `pnpm typecheck`, `pnpm --dir ui test` |
| Canonical source drifts | tests fail if `@pairflow/ui-contracts` no longer maps to `src/contracts/ui/index.ts` | entrypoint proof tests |
| DTO shape accidentally changes | type/transit tests fail or diff shows non-import changes | contract tests and review of changed files |
| Browser relative import remains | transit or fitness proof identifies remaining direct UI import from `src/contracts/ui/**` | `tests/contracts/uiContractTransitSource.test.ts`, `pnpm fitness:check:ci` |
| TS and Vite/Vitest resolver mappings drift apart | root typecheck or UI test path fails even if one resolver still works | root and UI entrypoint proof tests, `pnpm typecheck`, `pnpm --dir ui test` |
| UI barrel circular import introduced | compatibility barrels import each other instead of the canonical entrypoint | source review plus transit/source assertions for direct `@pairflow/ui-contracts` use |
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

Run the required Pairflow PASS checks after implementation:

1. VM1: `pnpm typecheck`
2. VM2: `pnpm lint`
3. VM3: `pnpm fitness:check:ci`

Run these additional required narrow checks for this task's expected
implementation surfaces:

1. VM4: `pnpm --dir ui test` is required for the implementation pass because this
   task changes UI compatibility barrels and UI type imports.
2. VM5: `pnpm vitest run tests/contracts/uiContractTransitSource.test.ts tests/contracts/uiContractEntrypointResolution.test.ts tests/tools/fitness/uiContractBoundary.test.ts`
   is required for the implementation pass because this task changes transit
   and fitness proof assertions and must preserve root resolver proof.
3. VM6: `pnpm test` only if root contract tests were changed beyond import-string or
   fixture assertions.
4. VM7: `pnpm --dir ui build` is not part of the normal proof for this import-only
   task; run it only if the implementation changes Vite/build configuration or
   reports a resolver mismatch that is visible only in the build path.

If broader checks are skipped, the implementation summary must name the
narrower proof and explain the skip.

### Acceptance Criteria

1. `ui/src/lib/types.ts` and `ui/src/lib/contracts/**` no longer import shared
   contracts through relative `src/contracts/ui/**` paths.
2. The same exported UI-local types remain available to existing UI consumers.
3. `@pairflow/ui-contracts` remains mapped to canonical
   `src/contracts/ui/index.ts`.
4. Negative-path proof is split and explicit:
   `tests/contracts/uiContractTransitSource.test.ts` fails if a migrated UI
   browser file keeps a relative `src/contracts/ui/**` import or replaces
   canonical consumption with a UI-local DTO mirror, and
   `tests/tools/fitness/uiContractBoundary.test.ts` fails for a browser-source
   fixture that imports canonical UI contracts through a relative
   `src/contracts/ui/**` path instead of `@pairflow/ui-contracts`.
5. No DTO fields, literal unions, runtime validation behavior, or backend
   router/API behavior changes in this task.
6. Root contract parity tests may continue importing canonical
   `src/contracts/ui/**` modules directly; this is not a violation because they
   are canonical proof tests, not browser package source.
7. The implementation handoff includes evidence for Validation Matrix items
   VM1-VM3, the required Pairflow PASS validation triad: `pnpm typecheck`,
   `pnpm lint`, and `pnpm fitness:check:ci`.
8. The implementation handoff also includes results for Validation Matrix items
   VM4 and VM5, the required narrow UI/proof checks, or reports the exact
   blocker that prevented them. VM6 and VM7 are conditional and must be named
   only when their trigger condition is met or explicitly skipped with rationale.

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
4. Update `tests/contracts/uiContractTransitSource.test.ts` assertions that
   currently look for `from "../../../src/contracts/ui/...` or
   `from "../../../../src/contracts/ui/...` in UI browser files so they expect
   `from "@pairflow/ui-contracts"` instead, while preserving checks that the
   canonical barrel exports the expected symbols.
5. Add or retain negative-path proof that a UI browser file with a direct
   relative `src/contracts/ui/**` import is rejected, and that replacing an
   import with a UI-local DTO mirror would not satisfy canonical-origin proof.
   Implement this through `tests/contracts/uiContractTransitSource.test.ts` for
   source assertions and `tests/tools/fitness/uiContractBoundary.test.ts` for
   browser-import policy fixtures.
6. Do not edit backend router code or add validators in this task.
7. Review the final diff for import-only behavior before running validation.
8. Do not update root contract parity imports simply to use the entrypoint;
   those tests prove canonical contract compatibility and are not browser
   consumer drift.
