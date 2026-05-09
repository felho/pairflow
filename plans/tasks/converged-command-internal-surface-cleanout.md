---
artifact_type: task
artifact_id: task_converged_command_internal_surface_cleanout_v1
title: "Converged Command Internal Surface Cleanout"
status: approved
phase: phase1
target_files:
  - src/v11/application/converged/convergedCommandOrchestration.ts
  - src/v11/application/converged/runConvergedFlow.ts
  - src/v11/application/converged/runConvergedFlowContract.ts
  - src/v11/application/converged/internal/**
  - src/v11/application/converged/*.ts
  - src/v11/application/pass/**
  - src/v11/application/actorProtocol/**
  - src/v11/defaults/converged/**
  - src/cli/commands/agent/converged.ts
  - src/index.ts
  - tests/v11/application/converged/**
  - tests/contracts/v11/converged.contract.runner.ts
  - tests/contracts/v11/converged.contract.test.ts
  - tests/contracts/v11/cases/converged/**
  - tests/cli/convergedCommand.test.ts
  - tests/cli/convergedDeliveryWarning.test.ts
  - tests/core/agent/converged.test.ts
  - tests/core/bubble/orchestrationLoopSmoke.test.ts
  - tests/core/runtime/restartRecovery.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/architecture/v11-placement-and-extraction-governance.md
normative_refs:
  - docs/architecture/v11-architecture-overview.md
  - docs/architecture/v11-placement-and-extraction-governance.md
  - docs/architecture/v11-internal-module-boundaries.md
  - docs/modularity-review/2026-05-08-modularity-review.md
  - docs/modularity-review/2026-05-08-modularity-review-followup.md
  - plans/archive/tasks/refactoring/commit-command-local-remote-execution-pipeline.md
owners:
  - "felho"
---

# Task: Converged Command Internal Surface Cleanout

## Current Codebase Check (2026-05-09)

1. `src/v11/application/converged/**` already has the intended internal directory shape:
   - `internal/orchestration/**`
   - `internal/flow/**`
   - `internal/finalization/**`
   - `internal/validation/**`
   - `internal/gate/**`
2. The cleanup is incomplete because the top-level directory still contains broad compatibility wrappers:
   - `convergedCommandErrorNormalization.ts`
   - `convergedDefaultDependencies.ts`
   - `convergedDependencyDefaults.ts`
   - `convergedExecution.ts`
   - `convergedFinalization.ts`
   - `convergedFinalizationEvents.ts`
   - `convergedFinalizationMetadata.ts`
   - `convergedFinalizationTypes.ts`
   - `convergedFlowInvocationBuilders.ts`
   - `convergedGateDelivery.ts`
   - `convergedPolicyPreparation.ts`
   - `convergedRolloutBlockingReasonResolver.ts`
   - `convergedRoutingPreparation.ts`
   - `convergedValidationGuards.ts`
   - `convergedValidationPreparation.ts`
   - `convergedValidationPreparationContract.ts`
   - `metaReviewRolloutBlockingReasonCodes.ts`
   - `runConvergedFlowGateSupport.ts`
3. Those files currently expose internal helpers as top-level application imports through `export * from "./internal/..."`. That is a compatibility layer, not a deep module boundary.
4. `convergedCommandOrchestration.ts`, `runConvergedFlow.ts`, and `runConvergedFlowContract.ts` are the only plausible top-level public surfaces named by the modularity review. Even those must not remain as broad pass-through barrels if their exported shape forces callers to know internal sequencing.
5. Existing in-repo consumers still import top-level converged helper wrappers from CLI, contract tests, core tests, `pass`, `actorProtocol`, `defaults/converged`, and `src/index.ts`.
6. The implementation must preserve visible `converged` command behavior while removing the legacy import paths completely. There is no transitional compatibility mode for this task.
7. `src/v11/shared/converged/**` currently owns shared command types, the converged command error class, input normalization, and protocol vocabulary. It must remain a vocabulary/type/error boundary only; command workflow sequencing belongs in `application/converged/**`.
8. `convergedRolloutBlockingReasonResolver.ts` and `metaReviewRolloutBlockingReasonCodes.ts` are command-local orchestration/gate support. Their target owner is `application/converged/internal/orchestration/**` unless implementation proves the gate cluster is the narrower owner. They must not move to `shared/converged/**`.
9. `src/v11/application/converged/convergedCommandOrchestration.ts` currently re-exports the full internal orchestration module, and that internal module currently exports `resolveConvergedRolloutBlockingReasonCodes`. The cleanup must treat that resolver as internal orchestration/gate support, not as part of the public command facade.
10. `src/v11/defaults/converged/convergedDependencyDefaults.ts` is the defaults composition-root module and may continue to be imported by CLI/test setup/defaults bootstrap code. The forbidden path is its current import from the top-level application wrapper `src/v11/application/converged/convergedDependencyDefaults.ts`.

## Task-Mode Readiness Self-Check (2026-05-09)

1. `execution_metadata_gate`: not applicable for this standalone architecture task because `plan_ref: null` and no parent plan tracker is claiming sequencing authority.
2. `target_file_reality_check`: matches the current codebase.
   - `src/v11/application/converged/internal/**` exists and already contains the implementation clusters.
   - Top-level converged files are mostly one-line `export *` wrappers.
   - Public consumers still reference `convergedCommandOrchestration.ts` and some helper wrappers.
3. `control_model_readiness`: ready. The task names the convergence result authority, gate route authority, missing-data fail-closed behavior, and forbidden compatibility fallback.
4. `closed_contract_drift`: no semantic drift authorized. Existing public command behavior, protocol envelopes, state transitions, gate routing, and CLI output remain fixed.
5. `authority_fan_out`: acceptable for one bounded command-local refactor because orchestration, flow, validation, gate, and finalization are explicitly separated and remain within `application/converged`.
6. `closure_budget`: acceptable. The task owns the converged command module surface only; it does not change pass, meta-review gate, reviewer evidence, or state-machine semantics except for import-path cleanup needed by consumers.
7. `bounded_task_shape`: acceptable. The task removes compatibility wrappers and makes the intended converged module boundary enforceable.
8. `contract_dense_gate`: satisfied by the Canonical Contract Matrix below. The matrix is the source of truth for what must remain public, what must become internal, and what must be deleted.
9. `capability_closure`: not triggered. This task adds no new user/operator capability; it preserves existing `bubble converged` behavior while cleaning the module surface.

## L0 - Policy

### Goal

Complete the converged command module-depth refactor by removing legacy top-level helper wrappers and forcing callers through a small command-local public surface.

The business question this task should make explicit is:

> Given a reviewer convergence signal, what single command-local pathway validates it, applies the convergence/gate policy, persists the authoritative result, and returns the public `EmitConvergedResult`?

Callers should not reconstruct convergence validation, gate execution, finalization metadata, delivery notification, rollout blocking reason, or helper ordering by importing many converged helper files.

### Context

`bubble converged` is a lifecycle command. It records reviewer convergence, validates evidence requirements, routes through the meta-review gate when needed, persists final state/protocol artifacts, and returns a result used by CLI, actor protocol, pass auto-converge, and contract tests.

The recent internal-directory migration improved physical placement but left the old helper import paths alive. That means the module boundary is still shallow: callers can keep using compatibility wrappers and therefore keep knowing the same internal helper surface through different filenames.

This task must finish the cleanup. No temporary aliases, no old-wrapper barrels, and no "compatibility for existing imports" layer should remain after implementation.

### Chosen Architecture Direction

1. Keep converged command orchestration under `src/v11/application/converged/**`.
2. Keep implementation details under existing `src/v11/application/converged/internal/{orchestration,flow,finalization,validation,gate}/**`.
3. Keep only the minimum top-level public surface required by real callers:
   - `convergedCommandOrchestration.ts` for command entry and public command types/errors.
   - `runConvergedFlow.ts` and `runConvergedFlowContract.ts` only if a real in-repo production caller or a non-migratable test scenario must exercise the flow boundary directly.
4. Delete top-level helper wrapper files that only re-export internal modules.
5. Migrate tests that intentionally verify internals to import the corresponding `internal/**` file directly.
6. Migrate production consumers to the public converged command surface unless they are inside `application/converged/internal/**`.
7. Do not create `legacy`, `compat`, `deprecated`, `bridge`, or alias modules for the old paths.
8. Keep the duplicate basename `convergedCommandOrchestration.ts` intentionally:
   - top-level `src/v11/application/converged/convergedCommandOrchestration.ts` is the public command surface;
   - `internal/orchestration/convergedCommandOrchestration.ts` is the implementation module;
   - the duplicate name is acceptable only because it marks the public facade over the implementation owner, and the top-level file must use explicit named exports instead of `export *`.

### In Scope

1. Remove all top-level converged helper wrappers that are not approved public surfaces.
2. Replace production imports of deleted wrappers with either:
   - the public command surface, when the consumer needs command behavior or public result types;
   - the exact internal module path, only when the consumer is an in-module test or a converged-internal implementation file.
   - Narrow exception: `src/v11/defaults/converged/**` is production composition-root wiring code, not a public command behavior consumer. It may import the exact internal dependency-default owner only for default dependency registration/configuration, and only when the import does not expose helper behavior to callers or preserve a deleted top-level application wrapper path.
3. Make `convergedCommandOrchestration.ts` a real public boundary rather than a broad `export *` barrel. It may delegate to `internal/orchestration/**`, but it should export only intentional public command API names.
4. Keep `runConvergedFlow.ts` and `runConvergedFlowContract.ts` only if direct flow-boundary tests remain justified. If they remain, make their exports explicit rather than `export *` barrels.
   - Retention decision owner: the implementer must decide during the import inventory.
   - Retention is valid only when the close summary names a concrete production caller or a concrete non-migratable test scenario.
   - If the only caller is a test that can import `internal/flow/**` directly without weakening coverage, delete the top-level flow wrappers.
5. Preserve the existing public command API:
   - `emitConvergedFromWorkspaceCommandOrchestration(...)`
   - `throwAsConvergedCommandError(...)`
   - `ConvergedCommandError`
   - `EmitConvergedInput`
   - `EmitConvergedDependencies`
   - `EmitConvergedResult`
   - No rollout-blocking resolver, validation helper, finalization helper, dependency-default helper, flow helper, or gate-delivery helper is part of this public command API.
6. Preserve existing command behavior:
   - input normalization;
   - routing preparation;
   - policy preparation;
   - validation preparation;
   - execution;
   - meta-review gate route handling;
   - finalization;
   - delivery notification acknowledgement;
   - bubble notification emission;
   - error normalization.
7. Update `src/index.ts` so it does not re-export deleted internal helper wrappers.
   - `src/index.ts` should continue exporting only the intentional public converged command API from `convergedCommandOrchestration.ts`.
   - It must not export retained flow internals unless a real external public package consumer is proven in this task; current in-repo tests are not enough to make flow a package-level export.
8. Update tests to prove behavior through the public surface and internals only where the test is intentionally scoped to one internal cluster.
   - Update `src/v11/defaults/converged/**` as the composition-root consumer of converged dependency default wiring.
   - Defaults code may wire concrete infrastructure/default dependencies into the converged command, but it must not keep importing a deleted top-level application wrapper.
9. Use the generic `internal_module_boundary` report-only internal re-export camouflage diagnostic as the fitness feedback loop.
   - Do not add a converged-only fitness rule.
   - The starting state is expected to include the converged wrapper files in the warning list.
   - The implementation is complete only when the converged files touched by this task are removed from that warning list.
10. Add final evidence scans proving the old wrapper paths are gone and no production import uses deleted compatibility paths.

### Out of Scope

1. Changing the public meaning of `EmitConvergedInput`, `EmitConvergedDependencies`, or `EmitConvergedResult`.
2. Changing protocol envelope names or payload semantics.
3. Changing state-machine transitions or meta-review gate policy.
4. Changing reviewer evidence validation rules.
5. Changing pass auto-converge behavior beyond import rewiring.
6. Changing CLI flags, command names, or user-facing output except unavoidable stack traces/import paths in tests.
7. Moving converged workflow policy into `shared`.
8. Introducing a new backwards-compatible deprecation period for deleted wrapper imports.

### Control Model

1. `business_invariant`: a converged command result remains authoritative only when the command-local flow validates, executes, gates, finalizes, and returns the canonical `EmitConvergedResult`.
2. `control_model`: convergence command behavior is owned by `application/converged`; shared modules provide command types/errors and common protocol vocabulary, not the command workflow.
3. `read_path_rule`: external callers read the converged capability through the public command surface. Internal implementation and focused internal tests may read named `internal/**` modules directly.
4. `forbidden_fallback`: do not keep old top-level helper wrapper files as compatibility aliases. Do not add alternate barrels to preserve removed import paths.
5. `allowed_resolution_path`: tests or consumers that need helper-level behavior must either move to public-surface behavior tests or explicitly import the relevant `internal/{flow,validation,finalization,gate,orchestration}/**` module.
6. `missing_data_rule`: if a deleted import path cannot be mapped to a deliberate public or internal owner, fail the implementation and refine the task rather than keeping the wrapper.
7. `phase_boundary`: this task owns command-local module boundary cleanup and import-path closure. It does not own new lifecycle behavior.

### Closed-Contract Drift Check

1. `source_anchors`:
   - `src/v11/application/converged/internal/orchestration/convergedCommandOrchestration.ts`
   - `src/v11/application/converged/internal/flow/runConvergedFlow.ts`
   - `src/v11/application/converged/internal/flow/runConvergedFlowContract.ts`
   - `src/v11/application/converged/internal/validation/**`
   - `src/v11/application/converged/internal/finalization/**`
   - `src/v11/application/converged/internal/gate/**`
   - `src/v11/shared/converged/convergedCommandTypes.ts`
   - `src/v11/shared/converged/convergedCommandError.ts`
   - `tests/contracts/v11/cases/converged/**`
2. `canonical_elements`:
   - public converged command input/result/dependencies;
   - command error normalization;
   - convergence envelope creation;
   - validation gate result;
   - meta-review gate route;
   - final state/protocol persistence;
   - delivery notification acknowledgement;
   - CLI-visible result handling.
3. `forbidden_reinterpretations`:
   - do not reinterpret deleted import paths as public API;
   - do not widen `shared/converged/**` into a workflow owner;
   - do not weaken validation or gate policy to make import migration easier;
   - do not rename public command result fields as part of this cleanup.
4. `compatibility_policy`: compatibility aliases are explicitly forbidden. Consumers must migrate in the same change.
5. `shared_converged_positive_scope`: `src/v11/shared/converged/**` owns `EmitConverged*` command types, `ConvergedCommandError`, command input normalization, and protocol vocabulary shared by callers. It must not own routing preparation, validation execution, finalization, gate delivery, rollout blocking resolution, dependency defaults, or command workflow ordering.

### Contract-Boundary Decision

This task touches `src/index.ts`, so it explicitly evaluates the public-contract boundary:

1. `src/index.ts` is not currently treated as an external package contract for this repo. Current known consumers are in-repo tests and internal call sites.
2. The removed converged exports are compatibility camouflage over `application/converged/internal/**`, not stable public API.
3. The stable public converged API remains available through `src/v11/application/converged/convergedCommandOrchestration.ts`.
4. The task must update in-repo consumers in the same change instead of preserving removed `src/index.ts` helper exports.
5. If implementation discovers a real external/package-level consumer for a removed export, stop and refine this task or route to a plan-linked contract-boundary task before retaining compatibility.

## Canonical Contract Matrix

| Surface | Current Problem | Target Contract | Required Cleanup | Tests/Evidence |
| --- | --- | --- | --- | --- |
| Public command entry | `convergedCommandOrchestration.ts` is a pass-through wrapper | Explicit public command API module | Replace `export *` with named exports/types only | Public CLI/core/contract tests import this surface |
| Flow boundary | `runConvergedFlow.ts` and contract are wrapper files | Delete unless retention evidence names a concrete production caller or non-migratable test scenario | Make exports explicit when retained; otherwise delete wrappers and migrate tests to `internal/flow/**` | Close summary includes flow-retention decision and evidence |
| Validation helpers | Top-level wrappers expose internals | Internal validation cluster only | Delete top-level wrappers and update focused tests to internal path | `rg "application/converged/convergedValidation"` has no production hits |
| Finalization helpers | Top-level wrappers expose internals | Internal finalization cluster only | Delete top-level wrappers and update focused tests to internal path | Finalization tests import `internal/finalization/**` |
| Gate helpers | Top-level wrappers expose internals | Internal gate cluster only | Delete top-level wrappers and update focused tests to internal path | Gate tests import `internal/gate/**` or public command result |
| Default dependency helpers | Top-level wrappers expose orchestration internals | Internal orchestration cluster; public command API must not expose dependency-default helpers | Delete top-level wrappers. Route command behavior consumers through public command API; route the defaults composition-root module through the narrow exact-internal dependency-default owner exception only for registration/configuration | No top-level default-dependency wrapper remains, and defaults composition-root imports are classified separately from command behavior consumers |
| Defaults composition root | `src/v11/defaults/converged/convergedDependencyDefaults.ts` imports the top-level `application/converged/convergedDependencyDefaults.js` wrapper | Defaults may configure concrete dependencies and may use the exact internal dependency-default owner as a narrow composition-root exception; it is not a general production helper-import allowance | Include `src/v11/defaults/converged/**` in import inventory and rewrite away from deleted wrapper paths | Defaults converged imports are listed in final migration summary and typecheck proves wiring |
| Rollout blocking helpers | Rollout reason helpers are exposed through top-level wrappers | Command-local orchestration/gate support, not shared workflow vocabulary | Keep under `internal/orchestration/**` unless `internal/gate/**` is proven narrower; do not move to `shared/converged/**` | Import inventory names final owner and no top-level wrapper remains |
| Public facade leakage | The current orchestration implementation export surface includes `resolveConvergedRolloutBlockingReasonCodes` | Resolver remains internal to orchestration/gate support | Do not re-export the resolver from any retained top-level public converged surface; migrate focused tests to the internal owner | Close evidence lists the retained top-level public converged files, proves each retained public file uses explicit named exports rather than `export *`, and proves none of those retained public files exports `resolveConvergedRolloutBlockingReasonCodes`. Deleted flow files count as deletion evidence, not absent-file `rg` evidence |
| `src/index.ts` barrel | Re-exports internal helper wrappers | Exports only `convergedCommandOrchestration.ts` public command API | Remove deleted helper exports; do not export flow unless an external package consumer is proven | Typecheck and `rg` prove no deleted exports |
| Fitness | Wrapper pattern can reappear | Generic report-only `internal_module_boundary` camouflage radar identifies public files that only re-export `./internal/**` | Do not add a converged-only rule; use the existing generic warning list as before/after evidence | Report before cleanup includes converged wrappers; report after cleanup no longer includes the cleaned converged paths |

Mirrored Surface Checklist:

1. `Chosen Architecture Direction` public-surface list.
2. `Canonical Contract Matrix`.
3. `Target Module Shape` and `Public Surface Rules`.
4. `L2 - Implementation Notes`.
5. `Acceptance Criteria`.
6. `Final Evidence Checklist`.
7. `Task-Mode Readiness Self-Check`.

If the public-surface list changes, update every mirrored surface above in the same edit.

## L1 - Design

### Target Module Shape

After implementation, the converged command directory should read as:

```txt
src/v11/application/converged/
  convergedCommandOrchestration.ts
  runConvergedFlow.ts                 # only if retained as explicit flow surface
  runConvergedFlowContract.ts         # only if retained as explicit flow surface
  internal/
    orchestration/
    flow/
    validation/
    finalization/
    gate/
```

All other current top-level `src/v11/application/converged/*.ts` wrapper files should be deleted.

The public/internal duplicate basename for `convergedCommandOrchestration.ts` is intentional. The top-level file is a named-export public facade; `internal/orchestration/convergedCommandOrchestration.ts` remains the implementation owner. Do not rename the public surface in this task unless an existing import or package-entrypoint constraint makes the duplicate basename impossible to maintain.

### Public Surface Rules

1. Public command consumers import from `src/v11/application/converged/convergedCommandOrchestration.js`.
2. Public flow consumers are allowed only when a concrete production caller or non-migratable test scenario needs the lower-level flow boundary. Flow surface exports must be named and explicit. Retaining flow because tests already import it is not enough; first try migrating those tests to `internal/flow/**`.
3. Internal cluster tests may import `src/v11/application/converged/internal/...` directly.
4. Production code outside `application/converged/internal/**` must not import deleted helper paths.
5. `src/index.ts` must not preserve removed helper exports. It should export the public command API only; retained flow surfaces are not package-level exports unless this task proves a package-level consumer.
6. `src/v11/shared/converged/**` is limited to shared command types, command error, input normalization, and protocol vocabulary. Do not place rollout blocking, validation, finalization, gate delivery, or dependency default workflow code there.
7. No retained top-level public converged surface may export `resolveConvergedRolloutBlockingReasonCodes`. This includes `convergedCommandOrchestration.ts` and any retained `runConvergedFlow*` files. Focused tests for that resolver must import the selected internal owner directly.
   - Evidence must be collected from the retained public surface file set after deletion/retention decisions are known. Do not pass possibly deleted files as raw `rg` path arguments and treat an absent-file error as proof.
   - The evidence must include both:
     - no `export *` remains in retained top-level public converged surface files;
     - no retained top-level public converged surface exports `resolveConvergedRolloutBlockingReasonCodes`.

### Required Import Inventory

Before editing imports, collect and record an inventory for these groups:

1. `src/v11/application/pass/**` converged imports.
2. `src/v11/application/actorProtocol/**` converged imports.
3. `src/v11/defaults/converged/**` converged imports.
   - Classify `src/v11/defaults/converged/convergedDependencyDefaults.ts` separately from `src/v11/application/converged/convergedDependencyDefaults.ts`. Imports of the defaults composition-root module are allowed; imports from the application wrapper are not.
4. `src/cli/commands/agent/converged.ts` converged imports.
5. Defaults composition-root consumers that import `src/v11/defaults/converged/convergedDependencyDefaults.ts`, including CLI bootstrap, test setup, and other defaults bootstrap modules.
6. `src/index.ts` converged exports.
7. `tests/**` converged imports.

Each imported top-level converged path must be classified as:

1. public command behavior;
2. retained public flow boundary;
3. internal cluster test;
4. accidental compatibility import.
5. defaults composition-root bootstrap import, only when the imported path is `src/v11/defaults/converged/convergedDependencyDefaults.ts` rather than `src/v11/application/converged/convergedDependencyDefaults.ts`.

Do not delete a wrapper until its in-repo import count is zero. Required evidence before each deletion is an `rg` result or equivalent showing zero imports for the exact top-level application wrapper path, for example `src/v11/application/converged/<wrapper>.ts` and imports ending in `application/converged/<wrapper>.js` or `../converged/<wrapper>.js`. Do not use basename-only evidence for `convergedDependencyDefaults`, because `src/v11/defaults/converged/convergedDependencyDefaults.ts` is an allowed composition-root module with the same basename.

### Deletion Test

The implementation is not complete until deleting each old wrapper path makes no production or test import fail except intentionally updated imports.

Required deleted wrapper paths include:

```txt
convergedCommandErrorNormalization
convergedDefaultDependencies
convergedDependencyDefaults
convergedExecution
convergedFinalization
convergedFinalizationEvents
convergedFinalizationMetadata
convergedFinalizationTypes
convergedFlowInvocationBuilders
convergedGateDelivery
convergedPolicyPreparation
convergedRolloutBlockingReasonResolver
convergedRoutingPreparation
convergedValidationGuards
convergedValidationPreparation
convergedValidationPreparationContract
metaReviewRolloutBlockingReasonCodes
runConvergedFlowGateSupport
```

If a wrapper must remain, the implementation must stop and route back to task refinement. The approved task does not allow retained compatibility wrappers.

## L2 - Implementation Notes

1. Inventory all imports of `src/v11/application/converged/*.js`.
   - Include explicit pass/actorProtocol scans:
     - `rg -n "application/converged|\\.\\./converged|shared/converged" src/v11/application/pass src/v11/application/actorProtocol`
     - `rg -n "application/converged|\\.\\./\\.\\./application/converged|shared/converged" src/v11/defaults/converged`
     - `rg -n "defaults/converged/convergedDependencyDefaults|\\.\\./defaults/converged/convergedDependencyDefaults|\\.\\./converged/convergedDependencyDefaults" src tests`
     - `rg -n "v11/application/converged|application/converged|\\.\\./converged" src tests`
2. Classify each import:
   - public command behavior;
   - retained public flow boundary;
   - internal cluster test;
   - accidental compatibility import.
   - defaults composition-root bootstrap import, only for `src/v11/defaults/converged/convergedDependencyDefaults.ts` imports; do not apply this category to the deleted top-level application wrapper `src/v11/application/converged/convergedDependencyDefaults.ts`.
3. Decide `runConvergedFlow.ts` / `runConvergedFlowContract.ts` retention:
   - retain only with a named production caller or named non-migratable test scenario;
   - otherwise migrate tests to `internal/flow/**` and delete the top-level flow wrappers.
4. Replace public command behavior imports with `convergedCommandOrchestration.js`.
5. Replace internal test imports with exact `internal/**` paths.
6. Replace accidental compatibility imports with the narrow public or internal owner. If no owner exists, refine the module boundary instead of keeping a wrapper.
7. For each wrapper, verify zero in-repo imports before deletion.
8. Replace top-level pass-through `export *` files for retained public surfaces with named exports.
   - `convergedCommandOrchestration.ts` named exports are limited to `emitConvergedFromWorkspaceCommandOrchestration`, `throwAsConvergedCommandError`, `ConvergedCommandError`, and the `EmitConverged*` public command types.
   - If `runConvergedFlow.ts` or `runConvergedFlowContract.ts` are retained, they must also use explicit named exports and must not export `resolveConvergedRolloutBlockingReasonCodes`.
9. Delete all non-retained top-level wrapper files.
10. Keep rollout blocking helpers under `internal/orchestration/**` unless implementation proves `internal/gate/**` is narrower; do not move them to `shared/converged/**`.
11. Rewrite `src/v11/defaults/converged/**` away from deleted top-level application wrappers.
   - The defaults module may remain the composition owner for concrete infrastructure ports.
   - As a narrow composition-root exception to the production import rule above, it may import the exact internal dependency-default owner chosen by the cleanup only to register/configure default dependencies.
   - It must not import other internal converged workflow helpers, expose internal helper behavior to callers, or retain any deleted top-level application wrapper path.
   - Do not treat CLI/test setup/defaults bootstrap imports of `src/v11/defaults/converged/convergedDependencyDefaults.ts` as violations; those imports initialize defaults and are outside the deleted application-wrapper surface.
   - Inventory and final summary must classify those bootstrap imports separately so they are not confused with forbidden `src/v11/application/converged/convergedDependencyDefaults.ts` wrapper imports.
12. Update `src/index.ts` so it exports only the intentional converged public command API.
13. Run the generic `internal_module_boundary` fitness report and capture before/after evidence:
   - before cleanup, the relevant converged wrappers should appear as report-only internal re-export camouflage candidates;
   - after cleanup, every wrapper deleted or converted by this task must be absent from that camouflage warning list.
14. Run `rg` scans for deleted top-level application wrapper paths in `src` and `tests`.
   - For most wrappers, basename scans are acceptable if reviewed for false positives.
   - For `convergedDependencyDefaults`, the evidence must be path-qualified to `src/v11/application/converged/convergedDependencyDefaults.ts` and imports ending in `application/converged/convergedDependencyDefaults.js` or `../converged/convergedDependencyDefaults.js`; allowed `src/v11/defaults/converged/convergedDependencyDefaults.ts` imports must not fail the cleanup.
15. Prove resolver non-leak against the retained public surface set after the retention decision:
   - list retained top-level public converged files;
   - scan those retained files for `export *` and fail if any remain;
   - scan those retained files for `resolveConvergedRolloutBlockingReasonCodes` exports and fail if any remain;
   - if `runConvergedFlow.ts` or `runConvergedFlowContract.ts` are deleted, cite the deletion list instead of scanning those absent files.
16. Run focused converged tests, then required repo verification for source changes.

### Suggested Focused Tests

1. `pnpm vitest run tests/v11/application/converged`
2. `pnpm vitest run tests/cli/convergedCommand.test.ts tests/cli/convergedDeliveryWarning.test.ts`
3. `pnpm vitest run tests/contracts/v11/converged.contract.test.ts`
4. `pnpm vitest run tests/core/agent/converged.test.ts tests/core/bubble/orchestrationLoopSmoke.test.ts tests/core/runtime/restartRecovery.test.ts`

### Required Final Verification

Because this task changes TypeScript source, use the repository default verification order before declaring complete:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. Focused converged tests listed above
5. Broader affected suites if failures or import rewiring touch shared callers
6. `pnpm test`
7. `pnpm build`

## Acceptance Criteria

1. `bubble converged` public behavior is unchanged in CLI/core/contract tests.
2. The old top-level helper wrapper files listed in the deletion test are gone.
3. No production code imports deleted `src/v11/application/converged/<helper>.js` paths.
4. Focused internal tests import internal modules directly when they test internal behavior.
5. `convergedCommandOrchestration.ts` exposes only the intentional public command API.
6. Any retained `runConvergedFlow` public surface has explicit named exports and a documented real caller/test reason.
7. If no concrete flow-retention evidence is recorded, top-level `runConvergedFlow.ts` and `runConvergedFlowContract.ts` are deleted.
8. `src/index.ts` exports the public converged command API and no deleted helper wrappers. It does not export retained flow surfaces unless a package-level consumer is proven.
9. `shared/converged/**` contains only command types, command error, input normalization, and protocol vocabulary; no workflow sequencing or rollout blocking helper is moved there.
10. `convergedRolloutBlockingReasonResolver` and `metaReviewRolloutBlockingReasonCodes` have an explicit final owner under `internal/orchestration/**` or, if proven narrower, `internal/gate/**`.
    - `resolveConvergedRolloutBlockingReasonCodes` is not exported by any retained top-level public converged surface after cleanup, including retained `runConvergedFlow*` surfaces.
    - Retained public surface files use explicit named exports, so the non-leak proof is not invalidated by a wildcard re-export.
11. `src/v11/defaults/converged/**` no longer imports deleted top-level converged wrappers and still owns concrete dependency composition.
12. The generic `internal_module_boundary` report-only camouflage diagnostic no longer lists the converged wrapper files cleaned by this task.
13. No `legacy`, `compat`, `deprecated`, `bridge`, or alias module is introduced for the deleted paths.
14. Full required verification passes, including `pnpm build`.

## Final Evidence Checklist

The implementation close summary must include:

1. Deleted wrapper file list.
2. Public converged surface list after cleanup.
3. Flow-retention decision:
   - deleted, or
   - retained with named production caller or named non-migratable test scenario.
4. `shared/converged/**` scope confirmation.
5. Rollout blocking helper final owner confirmation.
6. Import migration summary by consumer group, including `pass/**`, `actorProtocol/**`, `defaults/converged/**`, defaults composition-root bootstrap consumers, CLI, `src/index.ts`, and tests.
   - Defaults composition-root bootstrap consumers must be listed separately from forbidden `src/v11/application/converged/convergedDependencyDefaults.ts` wrapper imports.
7. Per-wrapper zero-import evidence before deletion.
8. `rg` evidence that deleted top-level application wrapper paths have no stale `src` production imports.
   - `convergedDependencyDefaults` evidence must be path-qualified so allowed imports of `src/v11/defaults/converged/convergedDependencyDefaults.ts` do not false-fail the deletion check.
9. Resolver non-leak proof for the retained public surface set:
   - retained top-level public converged file list;
   - named-export proof showing no retained public file still uses `export *`;
   - proof that retained public files do not export `resolveConvergedRolloutBlockingReasonCodes`;
   - deletion evidence for any non-retained `runConvergedFlow*` public-surface candidate instead of absent-file scan evidence.
10. `src/index.ts` export summary.
11. Verification command results.
12. Fitness drift note naming `internal_module_boundary` report-only internal re-export camouflage diagnostics and confirming the cleaned converged paths no longer appear there.
