---
artifact_type: task
artifact_id: task_core_ui_contracts_v1
task_family_id: core-ui-contracts
sequence_key: "2"
task_id: 2-core-ui-contracts
title: "Core UI Contracts"
status: approved
phase: phase2
target_files:
  - src/contracts/ui/index.ts
  - src/contracts/ui/deleteBubble.ts
  - src/contracts/ui/bubbleLifecycle.ts
  - src/contracts/ui/stateValidation.ts
  - src/contracts/ui/uiRemoteExecution.ts
  - src/contracts/deleteBubble.ts
  - src/types/bubble.ts
  - src/shared/contracts/bubbleLifecycle.ts
  - src/shared/contracts/stateValidation.ts
  - src/shared/contracts/uiRemoteExecution.ts
  - src/types/uiRemoteExecution.ts
  - src/v11/shared/ports/stateSnapshots.ts
  - ui/src/lib/types.ts
  - ui/src/lib/contracts/bubbleLifecycle.ts
  - ui/src/lib/contracts/stateValidation.ts
  - ui/src/lib/contracts/uiRemoteExecution.ts
  - tests/contracts/deleteBubbleContractTypes.test.ts
  - tests/contracts/uiContractParity.types.ts
  - tests/contracts/uiContractTransitSource.test.ts
prd_ref: null
plan_ref: plans/ui-contract-boundary-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/pairflow-initial-design.md
  - docs/architecture/v11-placement-and-extraction-governance.md
  - docs/modularity-review/2026-05-02-modularity-review.md
  - plans/ui-contract-boundary-plan-v1.md
owners:
  - "felho"
doc_bubble_id: 2-core-ui-contracts-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-02-ui-contract-boundary-plan-v1
---

# Task: Core UI Contracts

## L0 - Policy

### Goal

Move the smaller established UI/backend contract mirrors behind the canonical
`src/contracts/ui/**` surface created by `1-ui-contract-foundation`, without
starting the broader UI API/action/read-model/event/error DTO migration.

This task owns delete-bubble, lifecycle, state-validation, and remote-execution
contract alignment only. Meta-review gate direct `src/v11/**` type usage is
recorded here as a target-file reality blocker to classify, not as authority to
pull the broad UI read-model/action DTO closure into this slice.

Target-file scope qualifier: `src/types/bubble.ts` is listed only for lifecycle
literal authority alignment. Its broader `BubbleStateSnapshot` and runtime state
types are not owned by this task.

### Domain / Control Model Summary

1. Business invariant: small shared UI/backend contracts consumed by the UI must
   come from the backend-owned browser-safe `src/contracts/ui/**` surface.
2. Control model: `src/contracts/ui/**` is the canonical UI contract producer;
   legacy `src/shared/contracts/**` and `src/contracts/deleteBubble.ts` may
   remain as compatibility re-export surfaces only. Legacy transit surfaces that
   already point at those paths, such as `src/types/uiRemoteExecution.ts` and
   `src/v11/shared/ports/stateSnapshots.ts`, must either continue to resolve
   through the canonical path or be updated to do so explicitly. In
   `stateSnapshots.ts`, this is limited to the type-only
   `StateValidationDiagnostics` import/export and existing type-only
   `BubbleLifecycleState` import. The lifecycle literal authority in
   `src/types/bubble.ts` must resolve to the same canonical lifecycle tuple as
   `src/contracts/ui/bubbleLifecycle.ts`, with no second lifecycle literal
   source.
3. Read-path rule: UI contract files under `ui/src/lib/contracts/**` and
   delete-bubble types in `ui/src/lib/types.ts` must import or re-export the
   canonical contracts instead of redeclaring mirrored shapes.
4. Forbidden fallback: do not keep "keep in sync" mirror comments, duplicate
   literal/type definitions, structural aliases, or hidden transit-path mirrors
   for the in-scope contracts after the canonical export exists.
5. Allowed resolution path: if a field or literal must change, update
   `src/contracts/ui/**` first, then make backend compatibility surfaces and UI
   consumers import from that canonical source.
6. Missing-data rule: no runtime payload semantics are changed in this task; any
   optional/nullability decision must preserve the current in-scope contract
   shape exactly.
7. Phase boundary:
   - contract closure: delete-bubble, lifecycle, state-validation, and
     remote-execution contracts only.
   - producer closure: canonical `src/contracts/ui/**` files for the in-scope
     contracts.
   - read-model closure: UI local contract files re-export canonical contracts.
   - activation closure: existing contract parity and fitness checks pass.
   - deferred closure: meta-review route, action request/result, event, error,
     and broad UI summary/detail DTOs stay with `3-ui-readmodel-contracts`
     unless review proves one of these small rows cannot compile without a
     narrower preparatory extraction.
   - narrow preparatory extraction exception used here: the lifecycle source
     path `src/types/bubble.ts`, remote transit path
     `src/types/uiRemoteExecution.ts`, and state-validation transit path
     `src/v11/shared/ports/stateSnapshots.ts` are included only to keep these
     small contract rows compiling through the canonical surface.

### Plan Linkage

1. Parent plan: `plans/ui-contract-boundary-plan-v1.md`.
2. Parent gap closed: move the smaller established mirrors behind the canonical
   UI contract surface.
3. Depends on: archived `1-ui-contract-foundation`, which created the canonical
   directory and hard-fail UI/source import-boundary guard. Transit surface
   coverage added in this task must be proven by parity/type tests, not
   assumed from the foundation guard alone.
4. Unlocks: `3-ui-readmodel-contracts`, which can consolidate the broader UI API
   and action/read-model/event/error DTO surface after the simple contract rows
   have a proven migration pattern.

### Canonical Contract Anchors

1. Delete-bubble:
   - planned canonical anchor: `src/contracts/ui/deleteBubble.ts`
   - current backend anchor: `src/contracts/deleteBubble.ts`
   - current UI mirror: `ui/src/lib/types.ts`
   - tests: `tests/contracts/deleteBubbleContractTypes.test.ts`
2. Lifecycle:
   - planned canonical anchor: `src/contracts/ui/bubbleLifecycle.ts`
   - current backend compat: `src/shared/contracts/bubbleLifecycle.ts`
   - current source anchor: `src/types/bubble.ts`, which must become a
     producer or compatibility source for the same canonical lifecycle tuple
     rather than a divergent lifecycle literal authority.
   - runtime-source pins: `src/v11/domain/state/transitions.ts`,
     `src/v11/domain/state/machine.ts`, and
     `src/v11/infrastructure/executor/ssh/sshBubbleStatusPayload.ts`
   - current UI mirror: `ui/src/lib/contracts/bubbleLifecycle.ts`
3. State validation:
   - planned canonical anchor: `src/contracts/ui/stateValidation.ts`
   - current backend compat: `src/shared/contracts/stateValidation.ts`
   - current transit port file: `src/v11/shared/ports/stateSnapshots.ts`
   - current internal type source: `src/v11/shared/validation/primitives.ts`
   - current UI mirror: `ui/src/lib/contracts/stateValidation.ts`
4. Remote execution:
   - planned canonical anchor: `src/contracts/ui/uiRemoteExecution.ts`
   - current backend compat: `src/shared/contracts/uiRemoteExecution.ts`
   - current transit backend barrel: `src/types/uiRemoteExecution.ts`
   - current UI mirror: `ui/src/lib/contracts/uiRemoteExecution.ts`
5. Parity test anchor:
   - `tests/contracts/uiContractParity.types.ts`

### Scope Reality / Shape Proof

1. Actual touched scope: contract producer files, compatibility barrels, UI-local
   contract barrels, and contract parity tests.
2. Mutation entrypoints in scope: none; this task changes TypeScript contract
   definitions and import paths only.
3. Hidden scope ruled out: runtime payload producers, router/action parser
   behavior, SSE events, UI components, delete command side effects, remote
   lifecycle behavior, and meta-review gate runtime logic. The only internal
   execution-adjacent file in scope is `src/v11/shared/ports/stateSnapshots.ts`,
   and only for its type-only `StateValidationDiagnostics` transit import/export
   and existing type-only `BubbleLifecycleState` import path; its snapshot port
   interfaces and runtime behavior remain out of scope.
4. Why this task shape matches reality: the in-scope contracts are already
   represented by compact parity surfaces and can be moved without changing the
   runtime values they describe.

### Baseline Preservation

1. Preserve every in-scope exported type name currently consumed by backend or UI
   code, unless the old file becomes a compatibility re-export of the same name.
2. Preserve existing runtime payload shape and lifecycle literals.
3. Preserve existing tests and update their imports so they assert canonical
   surface parity rather than UI-local mirror parity.
4. Replacement proof required if removed: any removed UI-local declaration must
   be replaced by an import/re-export from `src/contracts/ui/**` and covered by
   typecheck or parity tests.

## L1 - Change Contract

### 0) Contract Boundary

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Canonical producer | `src/contracts/ui/**` owns the in-scope UI/backend contract rows. | Add concrete canonical files and export them from `src/contracts/ui/index.ts`. | P1 | required-now |
| Compatibility surfaces | Existing backend paths may remain for existing imports. | Convert `src/contracts/deleteBubble.ts` and `src/shared/contracts/**` rows to import/re-export from canonical files where possible. | P1 | required-now |
| UI consume path | UI-local contract files must not mirror the in-scope contracts. | Re-export canonical types/literals from `ui/src/lib/contracts/**` and `ui/src/lib/types.ts`. | P1 | required-now |
| Runtime behavior | No runtime payload producer changes are owned here. | Do not edit command/router/delete/remote runtime implementation except if a type import must follow the canonical contract. | P1 | required-now |
| Meta-review gate | Direct `src/v11/**` UI import remains successor-owned unless a narrow canonical route type can be extracted without broad DTO coupling. | Do not absorb broad meta-review/read-model DTO migration into this task. | P1 | required-now |

### 1) Call-Site Matrix

| ID | File | Required Change | Forbidden Change | Evidence |
|---|---|---|---|---|
| CS1 | `src/contracts/ui/deleteBubble.ts` | Move `DeleteBubbleArtifacts` and `DeleteBubbleResult` canonical definitions here. | Rename fields or change delete semantics. | T1,T2 |
| CS2 | `src/contracts/ui/bubbleLifecycle.ts` | Expose `bubbleLifecycleStates` and `BubbleLifecycleState` from the canonical UI surface by re-exporting the existing runtime tuple from `src/types/bubble.ts`; runtime callers such as `src/v11/domain/state/transitions.ts`, `src/v11/domain/state/machine.ts`, and `src/v11/infrastructure/executor/ssh/sshBubbleStatusPayload.ts` pin `src/types/bubble.ts` as the runtime source. | Add or remove lifecycle states or define a second lifecycle tuple in the canonical file. | T1,T3,T8 |
| CS3 | `src/contracts/ui/stateValidation.ts` | Expose browser-safe state-validation diagnostics without importing `src/v11/**`; preserve `src/v11/shared/ports/stateSnapshots.ts` as a transit port file to that canonical diagnostic shape. | Import `ValidationError` from internal v11 modules or leave `stateSnapshots` dependent on a non-canonical diagnostic definition. | T1,T4,T7,T8,S1 |
| CS4 | `src/contracts/ui/uiRemoteExecution.ts` | Expose remote-execution UI contracts from the canonical surface, depending only on canonical lifecycle types. | Change remote availability/status semantics. | T1,T5,T7,T8,S1 |
| CS5 | backend compatibility files | Re-export canonical contracts from old backend paths. | Keep independent duplicate definitions. | T2,T3,T4,T5,T6,T7,T8,S1 |
| CS6 | UI compatibility files | Re-export canonical contracts from old UI paths and remove mirror declarations. | Keep UI-local duplicated contracts. | T2,T3,T4,T5,T6,T7,T8,S1 |
| CS7 | `ui/src/lib/types.ts` | Import/re-export delete-bubble and in-scope support contracts from canonical or UI compatibility barrels. | Continue direct in-file delete-bubble mirror declarations. | T2 |
| CS8 | parity tests | Point parity tests and source-level compatibility guard checks at canonical source, compatibility surfaces, and transit surfaces. | Remove parity or source-level guard coverage because imports now share a source. | T2,T3,T4,T5,T6,T7,T8,S1 |
| CS9a | `src/types/uiRemoteExecution.ts` | Keep this transit import path as a compatibility-only remote-execution surface. Allowed sources are either the old backend compatibility file or direct `src/contracts/ui/**`; only pure type/value re-exports for in-scope remote-execution names are allowed. | Define in-scope fields/literals locally, keep mirror comments, introduce structural shape-only aliases, or exceed the T8 two-directed-edge compatibility cap. | T1,T5,T7,T8,S1 |
| CS9b | `src/v11/shared/ports/stateSnapshots.ts` | Keep this transit port file in scope only for type-only canonicalization of its `StateValidationDiagnostics` import/export and its existing `BubbleLifecycleState` import. Allowed sources are the old backend compatibility files or direct `src/contracts/ui/**`; sibling snapshot port interfaces and runtime behavior stay out of scope. | Leave `StateValidationDiagnostics` dependent on a non-canonical diagnostic definition, leave `BubbleLifecycleState` pointed at a divergent lifecycle authority, define mirror aliases locally, exceed the T8 two-directed-edge compatibility cap, or broaden this task into `LoadedStateSnapshot`, `InspectedStateSnapshot`, read/write port, fingerprint, or runtime semantics. | T1,T4,T7,T8,S1 |
| CS10 | `src/types/bubble.ts` | Preserve lifecycle literals as the runtime source for the canonical lifecycle export; `src/contracts/ui/bubbleLifecycle.ts` must re-export this same runtime tuple to UI consumers through the canonical UI surface. | Move runtime lifecycle authority into a second tuple, change lifecycle literals, duplicate the tuple in `src/contracts/ui/bubbleLifecycle.ts`, or make UI consumers bypass the canonical surface. | T1,T3,T8,S1 |

### 2) Data and Interface Contract

| Contract Row | Owner | Required Shape | Rejected Input / Drift | Required Output | Successor-Owned Semantics |
|---|---|---|---|---|---|
| CCM1: delete-bubble result | `src/contracts/ui/deleteBubble.ts` | Existing `DeleteBubbleArtifacts` and `DeleteBubbleResult` fields exactly. | Field rename/removal, UI-only `BubbleDelete*` mirror divergence. | Canonical type plus compatibility aliases/re-exports. | Delete command behavior and artifact deletion remain runtime-owned. |
| CCM2: lifecycle literals | `src/types/bubble.ts` runtime tuple exposed through `src/contracts/ui/bubbleLifecycle.ts` | Existing lifecycle literal tuple and derived union exactly. | Adding/removing/reordering literals without runtime authority, or duplicating the lifecycle tuple in `src/contracts/ui/bubbleLifecycle.ts`. | Backend and UI compat imports resolve to the canonical UI surface, which re-exports the runtime tuple from `src/types/bubble.ts`; T8 proves no second lifecycle tuple source was introduced. | Lifecycle state machine behavior remains runtime-owned. |
| CCM3: state validation diagnostics | `src/contracts/ui/stateValidation.ts` | Browser-safe `{ message: string; errors: { path: string; message: string }[] }`. | Canonical UI contract importing internal v11 validation primitives; `stateSnapshots.ts` retaining a separate diagnostic mirror instead of the limited type-only transit role described in Closure-Budget and L2 note 7. | Backend/UI compat surfaces and the `stateSnapshots.ts` diagnostic transit export share the browser-safe canonical shape; T7 proves type parity and T8/S1 prove the transit source is not a mirror. | Internal validation primitive implementation and non-diagnostic snapshot port types remain v11-owned. |
| CCM4: remote execution UI contract | `src/contracts/ui/uiRemoteExecution.ts` | Existing remote cache/status/list/status union shapes exactly. | Runtime availability or reason-code semantic changes; `src/types/uiRemoteExecution.ts` retaining a separate remote-execution mirror. | Canonical remote execution types used by backend/UI compat surfaces and the `src/types/uiRemoteExecution.ts` transit surface. | Remote runtime probing/cache behavior remains runtime-owned. |

### 3) Error and Fallback Contract

| Case | Required Behavior | Priority | Timing |
|---|---|---|---|
| Existing consumer imports old backend path | Old path continues to typecheck via canonical re-export. | P1 | required-now |
| Existing consumer imports old UI-local path | Old path continues to typecheck via canonical re-export. | P1 | required-now |
| Existing consumer imports a transit compatibility surface | Transit path still resolves to the canonical contract either directly (`transit surface -> canonical`) or through no more than two directed compatibility re-export edges (`transit surface -> backend compat -> canonical`), has parity coverage that fails type drift, and has source-level guard coverage for forbidden mirror comments, structural aliases, and edge-limit drift. | P1 | required-now |
| Canonical lifecycle file needs lifecycle literals | `src/contracts/ui/bubbleLifecycle.ts` re-exports from `src/types/bubble.ts` instead of defining its own tuple, preserving runtime direction while making the canonical UI path the UI-facing import authority. | P1 | required-now |
| Canonical file would need internal `src/v11/**` import | Stop and refine the contract into browser-safe structural types instead of importing internals. | P1 | required-now |
| Parity test becomes tautological | Keep at least one assertion that compatibility aliases resolve to the canonical exported contract. | P1 | required-now |

### 4) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing |
|---|---|---|---|---|---|---|
| T1 | canonical surface compiles | `src/contracts/ui/index.ts` exports in-scope contracts | `pnpm typecheck` runs | no browser-unsafe import is needed | P1 | required-now |
| T2 | delete-bubble canonical parity | old backend and UI names import through canonical surface | contract type test runs | field shapes remain equal | P1 | required-now |
| T3 | lifecycle literal parity | `tests/contracts/uiContractParity.types.ts` imports backend/UI compatibility paths, `src/types/bubble.ts`, and the canonical lifecycle tuple | parity/type tests run | value and type parity remain exact without a second lifecycle tuple authority | P1 | required-now |
| T4 | state validation structural parity | canonical diagnostics are browser-safe | parity test runs | backend/UI diagnostic types remain equal | P1 | required-now |
| T5 | remote execution parity | remote execution contract imports canonical lifecycle type | parity test runs | list/status/union shapes remain equal | P1 | required-now |
| T6 | boundary guard remains clean | canonical contracts and UI compatibility barrels are in place | `pnpm fitness:check:ci` runs | `ui_contract_boundary` remains pass | P1 | required-now |
| T7 | transit surface canonical type parity | `tests/contracts/uiContractParity.types.ts` imports `src/types/uiRemoteExecution.ts`, `src/v11/shared/ports/stateSnapshots.ts`, and canonical `src/contracts/ui/**` paths | parity/type tests run | transit exports are type-equal to canonical exports; this is necessary but not sufficient, because T8/S1 must also prove the source uses only the allowed imports/re-exports for each transit file rather than a structural mirror | P1 | required-now |
| T8 | source-level compatibility guard | `tests/contracts/uiContractTransitSource.test.ts` reads `src/types/uiRemoteExecution.ts`, `src/v11/shared/ports/stateSnapshots.ts`, `src/types/bubble.ts`, and `src/contracts/ui/bubbleLifecycle.ts` from disk as source text | executable contract test runs with the narrow contract validation command | transit surfaces contain only allowed type-only imports/re-exports for in-scope names, contain no structural mirror aliases or mirror comments, and do not exceed the compatibility cap of two directed re-export edges from transit surface to canonical UI contract; lifecycle source files show a single tuple in `src/types/bubble.ts` and a canonical UI re-export, not a duplicate tuple | P1 | required-now |

### 4a) Source Inspection Checklist

| ID | Scenario | Given | When | Then | Priority | Timing |
|---|---|---|---|---|---|---|
| S1 | compatibility source inspection | CS9a/CS9b transit surfaces and the CS10 lifecycle source file are reviewed as source files | implementation/review verifies the T8 executable source-text assertions are present and checks CS10 declarations | CS9a uses pure remote-execution re-exports only; CS9b changes only the `StateValidationDiagnostics` import/export and existing `BubbleLifecycleState` import; structural aliases, mirror comments, duplicate literal/interface definitions, and transit chains longer than two directed re-export edges are absent; CS10 keeps `src/types/bubble.ts` as the single lifecycle runtime tuple source without changed lifecycle literals or a duplicate canonical tuple | P1 | required-now |

### 5) Capability Closure

| Item | Value |
|---|---|
| capability_claim | Smaller established UI/backend contracts are consumed through canonical `src/contracts/ui/**`. |
| activation_trigger | TypeScript imports plus `pnpm fitness:check:ci`. |
| entrypoint | `src/contracts/ui/index.ts`; compatibility entrypoints remain old backend/UI paths. |
| config_owner | N/A. |
| repo_provided_parts | canonical contract files, compatibility re-exports, transit compatibility surfaces, parity tests, source-level compatibility guard, and source-inspection checklist coverage. |
| external_prerequisites | existing pnpm/tsx toolchain only. |
| success_output_contract | typecheck and T7 parity tests pass; T8 source-level guard confirms no transit structural mirrors or overlong directed re-export edge chains; S1 confirms the CS10 lifecycle source has no second lifecycle tuple authority; fitness does not report forbidden UI/runtime imports. |
| failure_output_contract | typecheck/parity/fitness/T8/source-inspection failures name the contract row, forbidden import, forbidden transit mirror, or directed-edge-limit violation. |
| closure_classification | contract/read-path closure for in-scope small contracts, lifecycle authority alignment, and type-only transit compatibility surfaces only. |

### 6) Ownership and Deferred Semantics

| Owned Now | Emitted / Recorded But Not Interpreted Now | Deferred Owner | Forbidden Inference |
|---|---|---|---|
| Canonical small contract files under `src/contracts/ui/**`. | Compatibility re-export paths continue to exist. | Successor task may remove more compat after broader DTO migration. | Do not infer all UI DTOs have migrated. |
| Delete/lifecycle/state-validation/remote-execution type read-path. | Runtime payload producers still emit the same values. | Runtime command/router owners. | Do not change command behavior to satisfy type movement. |
| `src/types/bubble.ts` lifecycle authority alignment. | Broad `BubbleStateSnapshot` and runtime lifecycle behavior remain in the existing source file. | Runtime state/lifecycle owners. | Do not infer snapshot state shape or lifecycle transition semantics changed. |
| `src/types/uiRemoteExecution.ts` and `src/v11/shared/ports/stateSnapshots.ts` type-only transit alignment. | `stateSnapshots.ts` snapshot port interfaces, fingerprints, read/write ports, and runtime callers remain unchanged. | `3-ui-readmodel-contracts` or later v11 cleanup may remove transit surfaces. | Do not treat internal execution ports or broad read-model DTOs as migrated. |
| Parity, source-level guard, and boundary proof for in-scope contracts. | Remaining `ui/src/lib/types.ts` broad DTO definitions. | `3-ui-readmodel-contracts`. | Do not treat broad DTO mirrors as fixed in this task. |

### 7) Mirrored Surface Checklist

When any CCM row changes, update the rows below and keep their enforcement
anchored in T3/T4/T7/T8/S1 rather than treating this checklist as a standalone
validation mechanism:

| Surface | Mirrors |
|---|---|
| L0 Domain / Control Model Summary | CCM1-CCM4 ownership, read-path rule, forbidden fallback, and deferred broad DTO boundary |
| L0 Canonical Contract Anchors | source anchors and compat/UI mirror classification for the changed contract row |
| L1 Contract Boundary | canonical producer, compatibility surface, and UI consume-path rule for the changed row |
| L1 Call-Site Matrix | target files that must move or preserve the row |
| L1 Data and Interface Contract | accepted/rejected shape, output, and successor-owned semantics |
| L1 Error and Fallback Contract | old-path compatibility and browser-safe import behavior |
| L1 Test Matrix | parity and boundary proof rows for the changed contract |
| L1 Ownership and Deferred Semantics | current-task ownership vs successor-owned runtime/read-model behavior |
| L0/L1 Lifecycle Source Clauses | L0 Domain / Control Model Summary, `target_files`, Canonical Contract Anchors, Call-Site Matrix, Data and Interface Contract, Error/Fallback Contract, T3/T8 Test Matrix rows, Source Inspection Checklist, Capability Closure, Closure-Budget Summary, Complexity Risk Gate, Assumptions, Hardening Backlog, and L2 note 10 for `src/types/bubble.ts` lifecycle tuple authority |
| L0/L1 Remote-Execution Transit Clauses | L0 Domain / Control Model Summary, `target_files`, Canonical Contract Anchors, Call-Site Matrix, Data and Interface Contract, Error/Fallback Contract, Test Matrix, Source Inspection Checklist, Capability Closure, Closure-Budget Summary, Complexity Risk Gate, Assumptions, Hardening Backlog, L2 note 6, and L2 note 8 for `src/types/uiRemoteExecution.ts` |
| L0/L1 State-Validation Transit Clauses | L0 Domain / Control Model Summary, `target_files`, Canonical Contract Anchors, Call-Site Matrix, Data and Interface Contract, Error/Fallback Contract, Test Matrix, Source Inspection Checklist, Capability Closure, Closure-Budget Summary, Complexity Risk Gate, Assumptions, Hardening Backlog, L2 note 7, and L2 note 9 for the `StateValidationDiagnostics` import/export and existing `BubbleLifecycleState` type import in the `src/v11/shared/ports/stateSnapshots.ts` transit port file; sibling snapshot port types remain out of scope |

### 8) Closure-Budget Summary

| Bucket | Touched? | Rule |
|---|---:|---|
| authority_producer | yes | Create canonical in-scope contract producers under `src/contracts/ui/**`; lifecycle is produced for UI consumers there by re-exporting the runtime tuple from `src/types/bubble.ts`. |
| shared_contract | yes | Preserve old backend/UI paths as compatibility surfaces. |
| read_model_consumers | limited | UI-local contract barrels and delete-bubble type exports only. |
| remote_execution_transit_consumers | limited | `src/types/uiRemoteExecution.ts` may change only as a pure remote-execution transit re-export path with the T8 two-directed-edge cap; broader `src/types/ui.ts` read-model DTOs remain successor-owned. |
| internal_execution_consumers | limited | `src/v11/shared/ports/stateSnapshots.ts` may change only for the type-only `StateValidationDiagnostics` transit import/export path and the existing type-only `BubbleLifecycleState` import path needed to avoid divergent lifecycle authority; sibling snapshot port interfaces, runtime producers, and command behavior remain unchanged. |
| workflow_orchestration_consumers | no | Pairflow lifecycle routing and plan execution are unaffected. |
| cleanup_recovery_consumers | no | Delete/cleanup side effects are not changed. |

Collapsed closure: small contract producer plus compatibility read-path migration.
Deferred closures: broad UI API/action/read-model/event/error DTO migration and
runtime producer behavior.

### 9) Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `5`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `3`
7. `risk_score`: `10`
8. `single-task allowed`: `yes`, because the increased surface spread is limited
   to compact type/value contract rows, one lifecycle source/compatibility file,
   and two compatibility transit surfaces, with no runtime payload producer or
   command behavior changes. Surface-spread rows are: canonical UI contract
   files, backend/UI compatibility files, `src/types/bubble.ts` lifecycle
   authority, `src/types/uiRemoteExecution.ts` remote transit, and the
   type-only `StateValidationDiagnostics`/`BubbleLifecycleState` paths in
   `src/v11/shared/ports/stateSnapshots.ts`.
9. Bounded-task-shape decision:
   - primary shape: `shared_contract_canonicalization`
   - secondary shape: `read_path_alignment`
   - why safe: every in-scope row has an existing parity anchor and successor
     DTO/read-model migration is explicitly excluded.

## L2 - Implementation Notes

1. Prefer canonical definitions in `src/contracts/ui/**`, then re-export from
   old backend and UI paths.
2. Keep imports inside `src/contracts/ui/**` relative to sibling canonical files
   or browser-safe packages only.
3. For delete-bubble UI names, preserve current `BubbleDelete*` exports as
   aliases to canonical `DeleteBubble*` types if existing UI consumers use the
   UI-prefixed names.
4. Update parity tests to assert compatibility surfaces still equal canonical
   surfaces; do not delete tests because shared source makes them shorter.
5. UI-local contract files may import the backend canonical files by the same
   repo-relative pattern already accepted by the `ui_contract_boundary` guard,
   for example `../../../src/contracts/ui/index.js`. Keep validation aligned
   with the parent plan's configured strategy: root `pnpm typecheck`, parity
   tests, and `pnpm fitness:check:ci` must prove the changed import path unless
   the parent plan is explicitly refined to add another validation command.
6. Keep `src/types/uiRemoteExecution.ts` as an in-scope transit surface only for
   remote-execution contract re-exports. Keep `src/types/ui.ts` broad read-model
   DTO imports successor-owned. If an in-scope transit surface stops compiling,
   fix only that transit import/export path so the in-scope row resolves to
   `src/contracts/ui/**`; do not migrate broader UI summary/detail DTOs or
   meta-review/action/event/error contracts in this task.
7. In `src/v11/shared/ports/stateSnapshots.ts`, touch only the
   `StateValidationDiagnostics` type import/export and the existing type-only
   `BubbleLifecycleState` import path needed to keep lifecycle authority
   canonical. Do not reinterpret `LoadedStateSnapshot`, `InspectedStateSnapshot`,
   read/write snapshot ports, or fingerprint semantics as part of this UI
   contract slice.
8. For CS9a, a pure re-export such as
   `export type { UiBubbleRemoteExecution } from "../shared/contracts/uiRemoteExecution.js";`
   is allowed. A structural alias such as
   `export type UiBubbleRemoteExecution = { viewKind: "list" | "status"; ... }`
   is forbidden because it recreates a mirror behind a transit path.
9. For CS9b, a type-only import/export such as
   `import type { StateValidationDiagnostics } from "../../../shared/contracts/stateValidation.js";`
   plus
   `export type { StateValidationDiagnostics } from "../../../shared/contracts/stateValidation.js";`
   is allowed. A local structural alias such as
   `export type StateValidationDiagnostics = { message: string; errors: ... }`
   is forbidden because it recreates the diagnostic mirror inside the transit
   port file.
10. For CS10, the canonical lifecycle file may re-export the runtime tuple:
   `export { bubbleLifecycleStates } from "../../types/bubble.js";`
   plus
   `export type { BubbleLifecycleState } from "../../types/bubble.js";`
   is allowed. A local tuple such as
   `export const bubbleLifecycleStates = ["CREATED", ...] as const`
   in `src/contracts/ui/bubbleLifecycle.ts` is forbidden because it creates a
   second lifecycle literal authority.
11. Run the narrow contract tests before broader validation:
   `pnpm exec vitest run tests/contracts/deleteBubbleContractTypes.test.ts tests/contracts/uiContractParity.types.ts tests/contracts/uiContractTransitSource.test.ts`.

## Assumptions

1. `src/contracts/ui/**` may be imported by the UI through existing relative
   source imports in this repo setup; validation remains the parent plan's
   configured root typecheck, parity tests, and fitness check unless the parent
   plan is explicitly refined.
2. Existing compatibility paths are still needed for backend/internal callers
   until the broader read-model task finishes.
3. `src/types/bubble.ts` remains the lifecycle runtime tuple source because
   v11 state machine/transition and SSH executor code import it directly; this
   task only exposes that same tuple through the canonical UI surface.
4. `src/types/uiRemoteExecution.ts` remains a remote-execution transit surface
   only; T8 proves it does not retain an in-scope structural mirror.
5. `src/v11/shared/ports/stateSnapshots.ts` remains in scope only for the
   `StateValidationDiagnostics` import/export and `BubbleLifecycleState` import;
   T8/S1 prove those type-only paths do not broaden snapshot port ownership.
6. Meta-review gate and action/read-model DTO migration remain intentionally
   deferred to keep this task bounded.

## Open Questions

None blocking.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Remove obsolete compatibility barrels after all consumers import canonical contracts directly. | contract cleanup | P3 | later-hardening | CreateTask | Consider after `3-ui-readmodel-contracts` closes. |
| HB2 | Tighten fitness guard to detect UI-local redefinition of canonical contracts, not only forbidden imports. | tooling | P3 | later-hardening | CreateTask | Add only if mirror drift recurs. |
| HB3 | Generalize this task's transit-source guard pattern into a reusable fitness rule for future transit compatibility surfaces. | tooling | P3 | later-hardening | Review | Consider only after this task lands and only if similar drift recurs outside the CS9a/CS9b surfaces already covered by T8. |
| HB4 | Revisit whether `src/v11/shared/ports/stateSnapshots.ts` should keep re-exporting UI-facing diagnostics once broader read-model DTOs move behind canonical UI contracts. | contract cleanup | P3 | later-hardening | Review | Govern under `docs/architecture/v11-placement-and-extraction-governance.md`; consider during `3-ui-readmodel-contracts`; do not fold broader snapshot port cleanup into this task. |
| HB5 | Revisit whether `src/types/uiRemoteExecution.ts` should remain as a transit compatibility surface after remote-execution consumers adopt canonical UI contracts. | contract cleanup | P3 | later-hardening | Review | Consider after `3-ui-readmodel-contracts`; do not remove the transit path in this task. |
| HB6 | Revisit whether `src/types/bubble.ts` should keep lifecycle literal authority or become a pure compatibility source after lifecycle consumers adopt canonical UI contracts. | contract cleanup | P3 | later-hardening | Review | Govern under lifecycle/runtime ownership; do not change runtime lifecycle semantics in this task. |
