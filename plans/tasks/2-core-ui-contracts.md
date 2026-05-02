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
  - src/shared/contracts/bubbleLifecycle.ts
  - src/shared/contracts/stateValidation.ts
  - src/shared/contracts/uiRemoteExecution.ts
  - ui/src/lib/types.ts
  - ui/src/lib/contracts/bubbleLifecycle.ts
  - ui/src/lib/contracts/stateValidation.ts
  - ui/src/lib/contracts/uiRemoteExecution.ts
  - tests/contracts/deleteBubbleContractTypes.test.ts
  - tests/contracts/uiContractParity.types.ts
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
doc_bubble_id: null
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

### Domain / Control Model Summary

1. Business invariant: small shared UI/backend contracts consumed by the UI must
   come from the backend-owned browser-safe `src/contracts/ui/**` surface.
2. Control model: `src/contracts/ui/**` is the canonical UI contract producer;
   legacy `src/shared/contracts/**` and `src/contracts/deleteBubble.ts` may
   remain as compatibility re-export surfaces only.
3. Read-path rule: UI contract files under `ui/src/lib/contracts/**` and
   delete-bubble types in `ui/src/lib/types.ts` must import or re-export the
   canonical contracts instead of redeclaring mirrored shapes.
4. Forbidden fallback: do not keep "keep in sync" mirror comments or duplicate
   literal/type definitions for the in-scope contracts after the canonical export
   exists.
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

### Plan Linkage

1. Parent plan: `plans/ui-contract-boundary-plan-v1.md`.
2. Parent gap closed: move the smaller established mirrors behind the canonical
   UI contract surface.
3. Depends on: archived `1-ui-contract-foundation`, which created the directory
   and hard-fail import-boundary guard.
4. Unlocks: `3-ui-readmodel-contracts`, which can consolidate the broader UI API
   and action/read-model/event/error DTO surface after the simple contract rows
   have a proven migration pattern.

### Canonical Contract Anchors

1. Delete-bubble:
   - current backend anchor: `src/contracts/deleteBubble.ts`
   - current UI mirror: `ui/src/lib/types.ts`
   - tests: `tests/contracts/deleteBubbleContractTypes.test.ts`
2. Lifecycle:
   - current backend compat: `src/shared/contracts/bubbleLifecycle.ts`
   - current source anchor: `src/types/bubble.ts`
   - current UI mirror: `ui/src/lib/contracts/bubbleLifecycle.ts`
3. State validation:
   - current backend compat: `src/shared/contracts/stateValidation.ts`
   - current internal type source: `src/v11/shared/validation/primitives.ts`
   - current UI mirror: `ui/src/lib/contracts/stateValidation.ts`
4. Remote execution:
   - current backend compat: `src/shared/contracts/uiRemoteExecution.ts`
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
   lifecycle behavior, and meta-review gate runtime logic.
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
| CS2 | `src/contracts/ui/bubbleLifecycle.ts` | Expose `bubbleLifecycleStates` and `BubbleLifecycleState` from the canonical UI surface. | Add or remove lifecycle states. | T1,T3 |
| CS3 | `src/contracts/ui/stateValidation.ts` | Expose browser-safe state-validation diagnostics without importing `src/v11/**`. | Import `ValidationError` from internal v11 modules. | T1,T4 |
| CS4 | `src/contracts/ui/uiRemoteExecution.ts` | Expose remote-execution UI contracts from the canonical surface, depending only on canonical lifecycle types. | Change remote availability/status semantics. | T1,T5 |
| CS5 | backend compatibility files | Re-export canonical contracts from old backend paths. | Keep independent duplicate definitions. | T2-T5 |
| CS6 | UI compatibility files | Re-export canonical contracts from old UI paths and remove mirror declarations. | Keep UI-local duplicated contracts. | T2-T5 |
| CS7 | `ui/src/lib/types.ts` | Import/re-export delete-bubble and in-scope support contracts from canonical or UI compatibility barrels. | Continue direct in-file delete-bubble mirror declarations. | T2 |
| CS8 | parity tests | Point parity tests at canonical source and compatibility surfaces. | Remove parity coverage because imports now share a source. | T2-T6 |

### 2) Data and Interface Contract

| Contract Row | Owner | Required Shape | Rejected Input / Drift | Required Output | Successor-Owned Semantics |
|---|---|---|---|---|---|
| CCM1: delete-bubble result | `src/contracts/ui/deleteBubble.ts` | Existing `DeleteBubbleArtifacts` and `DeleteBubbleResult` fields exactly. | Field rename/removal, UI-only `BubbleDelete*` mirror divergence. | Canonical type plus compatibility aliases/re-exports. | Delete command behavior and artifact deletion remain runtime-owned. |
| CCM2: lifecycle literals | `src/contracts/ui/bubbleLifecycle.ts` | Existing lifecycle literal tuple and derived union exactly. | Adding/removing/reordering literals without runtime authority. | Backend and UI compat imports resolve to same canonical tuple/union. | Lifecycle state machine behavior remains runtime-owned. |
| CCM3: state validation diagnostics | `src/contracts/ui/stateValidation.ts` | Browser-safe `{ message: string; errors: { path: string; message: string }[] }`. | Canonical UI contract importing internal v11 validation primitives. | Backend/UI compat surfaces share the browser-safe shape. | Internal validation primitive implementation remains v11-owned. |
| CCM4: remote execution UI contract | `src/contracts/ui/uiRemoteExecution.ts` | Existing remote cache/status/list/status union shapes exactly. | Runtime availability or reason-code semantic changes. | Canonical remote execution types used by backend/UI compat surfaces. | Remote runtime probing/cache behavior remains runtime-owned. |

### 3) Error and Fallback Contract

| Case | Required Behavior | Priority | Timing |
|---|---|---|---|
| Existing consumer imports old backend path | Old path continues to typecheck via canonical re-export. | P1 | required-now |
| Existing consumer imports old UI-local path | Old path continues to typecheck via canonical re-export. | P1 | required-now |
| Canonical file would need internal `src/v11/**` import | Stop and refine the contract into browser-safe structural types instead of importing internals. | P1 | required-now |
| Parity test becomes tautological | Keep at least one assertion that compatibility aliases resolve to the canonical exported contract. | P1 | required-now |

### 4) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing |
|---|---|---|---|---|---|---|
| T1 | canonical surface compiles | `src/contracts/ui/index.ts` exports in-scope contracts | `pnpm typecheck` runs | no browser-unsafe import is needed | P1 | required-now |
| T2 | delete-bubble canonical parity | old backend and UI names import through canonical surface | contract type test runs | field shapes remain equal | P1 | required-now |
| T3 | lifecycle literal parity | backend/UI compatibility paths use canonical lifecycle tuple | parity test runs | value and type parity remain exact | P1 | required-now |
| T4 | state validation structural parity | canonical diagnostics are browser-safe | parity test runs | backend/UI diagnostic types remain equal | P1 | required-now |
| T5 | remote execution parity | remote execution contract imports canonical lifecycle type | parity test runs | list/status/union shapes remain equal | P1 | required-now |
| T6 | boundary guard remains clean | canonical contracts and UI compatibility barrels are in place | `pnpm fitness:check:ci` runs | `ui_contract_boundary` remains pass | P1 | required-now |

### 5) Capability Closure

| Item | Value |
|---|---|
| capability_claim | Smaller established UI/backend contracts are consumed through canonical `src/contracts/ui/**`. |
| activation_trigger | TypeScript imports plus `pnpm fitness:check:ci`. |
| entrypoint | `src/contracts/ui/index.ts`; compatibility entrypoints remain old backend/UI paths. |
| config_owner | N/A. |
| repo_provided_parts | canonical contract files, compatibility re-exports, parity tests. |
| external_prerequisites | existing pnpm/tsx toolchain only. |
| success_output_contract | typecheck and parity tests pass; fitness does not report forbidden UI/runtime imports. |
| failure_output_contract | typecheck/parity/fitness failures name the contract row or forbidden import. |
| closure_classification | contract/read-path closure for in-scope small contracts only. |

### 6) Ownership and Deferred Semantics

| Owned Now | Emitted / Recorded But Not Interpreted Now | Deferred Owner | Forbidden Inference |
|---|---|---|---|
| Canonical small contract files under `src/contracts/ui/**`. | Compatibility re-export paths continue to exist. | Successor task may remove more compat after broader DTO migration. | Do not infer all UI DTOs have migrated. |
| Delete/lifecycle/state-validation/remote-execution type read-path. | Runtime payload producers still emit the same values. | Runtime command/router owners. | Do not change command behavior to satisfy type movement. |
| Parity and boundary proof for in-scope contracts. | Remaining `ui/src/lib/types.ts` broad DTO definitions. | `3-ui-readmodel-contracts`. | Do not treat broad DTO mirrors as fixed in this task. |

### 7) Mirrored Surface Checklist

When any CCM row changes, update:

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

### 8) Closure-Budget Summary

| Bucket | Touched? | Rule |
|---|---:|---|
| authority_producer | yes | Create canonical in-scope contract producers under `src/contracts/ui/**`. |
| shared_contract | yes | Preserve old backend/UI paths as compatibility surfaces. |
| read_model_consumers | limited | UI-local contract barrels and delete-bubble type exports only. |
| internal_execution_consumers | no | Runtime producers and command behavior remain unchanged. |
| workflow_orchestration_consumers | no | Pairflow lifecycle routing and plan execution are unaffected. |
| cleanup_recovery_consumers | no | Delete/cleanup side effects are not changed. |

Collapsed closure: small contract producer plus compatibility read-path migration.
Deferred closures: broad UI API/action/read-model/event/error DTO migration and
runtime producer behavior.

### 9) Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `5`
8. `single-task allowed`: `yes`, because the task changes compact type/value
   contract rows and compatibility import surfaces without changing runtime
   behavior.
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
5. Run the narrow contract tests before broader validation:
   `pnpm exec vitest run tests/contracts/deleteBubbleContractTypes.test.ts tests/contracts/uiContractParity.types.ts`.

## Assumptions

1. `src/contracts/ui/**` may be imported by the UI through existing relative
   source imports in this repo setup.
2. Existing compatibility paths are still needed for backend/internal callers
   until the broader read-model task finishes.
3. Meta-review gate and action/read-model DTO migration remain intentionally
   deferred to keep this task bounded.

## Open Questions

None blocking.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Remove obsolete compatibility barrels after all consumers import canonical contracts directly. | contract cleanup | P3 | later-hardening | CreateTask | Consider after `3-ui-readmodel-contracts` closes. |
| HB2 | Tighten fitness guard to detect UI-local redefinition of canonical contracts, not only forbidden imports. | tooling | P3 | later-hardening | CreateTask | Add only if mirror drift recurs. |
