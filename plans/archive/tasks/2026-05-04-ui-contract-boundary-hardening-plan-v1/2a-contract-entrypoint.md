---
artifact_type: task
artifact_id: task_contract_entrypoint_v1
task_family_id: contract-entrypoint
sequence_key: "2a"
task_id: 2a-contract-entrypoint
title: "UI Contract Entrypoint"
status: in_progress
phase: phase2a
target_files:
  - package.json
  - tsconfig.json
  - ui/package.json
  - ui/tsconfig.json
  - ui/vite.config.ts
  - src/contracts/ui/index.ts
  - ui/src/lib/types.ts
  - ui/src/lib/contracts/**
  - tests/contracts/uiContractEntrypointResolution.test.ts
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
owners:
  - "felho"
doc_bubble_id: 2a-contract-entrypoint-doc
impl_bubble_id: 2a-contract-entrypoint-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-04-ui-contract-boundary-hardening-plan-v1
---

# Task: UI Contract Entrypoint

## L0 - Policy

### Goal

Implement `@pairflow/ui-contracts` as the smallest intentional in-repo
entrypoint for browser-safe UI contracts. Root and UI tooling must resolve this
one public contract surface before the broad import migration in task
`2b-ui-import-migration`.

This task must prove the entrypoint shape and resolution path only. It must not
mechanically migrate every UI contract import, change DTO fields, add runtime
validation, or introduce a standalone package boundary. If the alias proof
fails under root and UI tooling, stop and report the exact resolver blocker.

### Domain / Control Model Summary

1. Business invariant: browser-visible UI contracts are owned once by
   `src/contracts/ui/**` and consumed through an intentional public surface.
2. Control model: `src/contracts/ui/index.ts` remains the canonical contract
   barrel; `@pairflow/ui-contracts` is a private in-repo resolver alias that
   points to that surface without moving ownership into `ui/src/**`.
3. Read-path rule: browser code may consume UI contracts through
   `@pairflow/ui-contracts` and existing local compatibility barrels during
   this slice; direct broad migration to `@pairflow/ui-contracts` belongs to
   task `2b`.
4. Forbidden fallback: do not duplicate contract shapes in `ui/src/**`, do not
   make a UI-local barrel the new authority, and do not weaken
   `ui_contract_boundary` to make resolution pass.
5. Allowed resolution path: add the smallest root/UI resolver configuration and
   narrow proof imports needed to demonstrate `@pairflow/ui-contracts` works in
   both TypeScript and Vite/UI test contexts.
6. Missing-data rule: no runtime payload parsing is introduced here; absent or
   malformed wire data behavior remains successor task scope.
7. Phase boundary:
   - contract closure: owns `@pairflow/ui-contracts` naming and resolution proof
     only.
   - producer closure: out of scope.
   - internal execution closure: out of scope.
   - workflow/orchestration closure: out of scope.
   - read-model closure: no DTO field changes.
   - activation closure: local TS/Vite resolution proof for
     `@pairflow/ui-contracts`.
   - cleanup/recovery closure: out of scope except removing any temporary proof
     code that would otherwise become a permanent duplicate authority.

### Plan Linkage

1. Parent plan gap closed: unclear public UI contract entrypoint and
   config-level uncertainty.
2. Depends on: archived task `1-ui-contract-guard-cleanup`.
3. Unlocks / impacts successors: `2b-ui-import-migration` can migrate import
   specifiers to `@pairflow/ui-contracts`; `4-contract-drift-tests` can later
   harden the final import rule.
4. Task-list impact: creates planned task `2a-contract-entrypoint`; it does not
   replace or obsolete any task id.
5. Inherited validation / exit expectation: prove `@pairflow/ui-contracts` in
   root TypeScript tooling and the UI build/test path before broad migration.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `docs/architecture/ui-contract-governance.md`
   - `plans/archive/plans/2026-05-02-ui-contract-boundary-plan-v1.md`
   - `src/contracts/ui/**`
   - `tools/fitness/checks/ui-contract-boundary.ts`
   - `tests/contracts/uiContractTransitSource.test.ts`
2. Canonical elements:
   - `src/contracts/ui/**` is the browser-safe UI contract authority.
   - `src/contracts/ui/index.ts` is the canonical barrel for
     `@pairflow/ui-contracts`.
3. Guard elements:
   - `ui_contract_boundary` must continue to reject UI imports from backend
     internals outside `src/contracts/ui/**`.
   - Existing `ui/src/lib/contracts/**` barrels are compatibility consumers,
     not authority producers.
4. Compat-only elements: temporary or retained UI-local barrels may re-export
   `@pairflow/ui-contracts` during the transition to task `2b`.
5. Forbidden reinterpretations:
   - Do not treat the entrypoint as permission for browser imports from
     `src/v11/**`, `src/types/**`, or application/runtime internals.
   - Do not introduce a standalone package boundary. If
     `@pairflow/ui-contracts` cannot satisfy both toolchains, stop and report
     the exact resolver blocker instead of silently widening the scope.
   - Do not change contract literal sets or DTO field optionality.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - root `tsconfig.json`
   - UI `ui/tsconfig.json`
   - UI `ui/vite.config.ts`
   - `src/contracts/ui/index.ts`
   - existing UI consumers under `ui/src/lib/types.ts` and
     `ui/src/lib/contracts/**`
   - contract transit and fitness tests
2. Actual touched scope: resolver configuration, public contract entrypoint
   proof, and narrow tests only.
3. Mutation entrypoints in scope: none.
4. Hidden scope ruled out: broad import migration, runtime router behavior,
   JSON/SSE validation, DTO redesign, and standalone package boundary
   extraction.
5. Branch inventory note: the only behavior branch is resolver success/failure
   under root and UI tooling.
6. Why the declared task shape matches reality: the parent plan requires a
   producer-first entrypoint before migration, and this slice can prove that
   entrypoint without consuming every UI import yet.

### Authority Boundary Map

1. Authority producer: `src/contracts/ui/index.ts` and its sibling contract
   modules.
2. Stored authority: TypeScript source plus resolver configuration.
3. In-scope consumers: narrow proof imports/tests and existing compatibility
   barrels only as needed to demonstrate resolution.
4. Explicit out-of-scope consumers: UI components and API/router runtime paths
   except where they compile through existing barrels.
5. Export surfaces closed in this phase: `@pairflow/ui-contracts` and its
   root/UI resolver bindings.

### Baseline Preservation

1. Must-preserve behaviors:
   - Existing DTO fields, literal unions, and UI barrels remain type-equivalent.
   - `ui_contract_boundary` remains hard-fail.
   - Root and UI builds continue to resolve existing imports until task `2b`.
2. Allowed resolution paths:
   - Root `tsconfig.json` `compilerOptions.paths` mapping
     `@pairflow/ui-contracts` to `src/contracts/ui/index.ts`.
   - UI `ui/tsconfig.json` `compilerOptions.paths` mapping
     `@pairflow/ui-contracts` to `../src/contracts/ui/index.ts`.
   - UI `ui/vite.config.ts` alias mapping `@pairflow/ui-contracts` to the same
     canonical source file for Vitest/Vite execution.
3. Forbidden regression interpretations:
   - Do not weaken boundary tests to accept direct UI imports from backend
     internals.
   - Do not make UI-local type declarations a compatibility shim for canonical
     contract exports.
4. Replacement proof required if removed: any removed transit assertion must be
   replaced with equal or narrower proof that `@pairflow/ui-contracts` resolves
   and still points at canonical contracts.

### Success / Completion Proof Boundary

1. Current canonical success proof source: existing relative imports compile
   and `ui_contract_boundary` allows `src/contracts/ui/**`.
2. Target canonical success proof source: root TypeScript and UI tooling resolve
   `@pairflow/ui-contracts` with a narrow import proof.
3. Current canonical completion proof source: N/A; no runtime mutable flow.
4. Target canonical completion proof source: N/A; no runtime mutable flow.
5. Reused proof contract: existing contract transit and fitness boundary tests.
6. Proof-parity rule: `narrowed_here_with_proof`.
7. Final truth surfaces affected: resolver configuration and import-proof tests.
8. Mixed-truth surfaces allowed: none.

## L1 - Implementation Contract

### In Scope

1. Add `@pairflow/ui-contracts` as the one in-repo UI contract entrypoint and
   document that a standalone package boundary remains rejected for this slice.
2. Add the minimum root and UI tooling configuration required for
   `@pairflow/ui-contracts` to resolve.
3. Add or update narrow proof imports/tests that compile through
   `@pairflow/ui-contracts`.
4. Preserve existing relative UI contract imports until task `2b`.
5. Keep `@pairflow/ui-contracts` pointed at canonical `src/contracts/ui/**`
   exports only.

### Out of Scope

1. Broad migration of `ui/src/**` import specifiers.
2. Runtime response validation for actions, reads, or events.
3. DTO field/literal changes.
4. Standalone package boundary extraction.
5. UI visual or interaction changes.
6. Router or Pairflow lifecycle behavior changes.

### Canonical Contract Matrix

| Surface | Current State | Target State | Owner |
|---|---|---|---|
| Canonical UI contracts | `src/contracts/ui/**` | unchanged | backend UI contract surface |
| Public entrypoint | relative imports into `src/contracts/ui/**` | `@pairflow/ui-contracts` resolves to `src/contracts/ui/index.ts` | this task |
| UI compatibility barrels | re-export canonical contracts by relative path | may remain as transition consumers; no authority shift | this task preserves, task `2b` migrates |
| Tooling resolution | root and UI configs do not define the new entrypoint | root TS and UI TS/Vite tooling resolve it | this task |

Structured contract rules:

1. `@pairflow/ui-contracts` must export existing canonical symbols without
   redeclaring them.
2. Unknown or non-canonical backend internals remain forbidden import targets for
   browser code.
3. If an alias is selected, it must resolve to source files during local
   development and tests; do not rely on generated build output as the source of
   truth.
4. If root and UI tooling require different resolver mechanisms, both must map
   to the same canonical contract source.

### Ownership and Deferred Semantics

1. This task owns the `@pairflow/ui-contracts` import surface, resolver
   bindings, and proof that the surface targets canonical UI contracts.
2. This task records but does not consume the final broad migration rule; task
   `2b-ui-import-migration` owns migrating existing UI import specifiers to
   `@pairflow/ui-contracts`.
3. This task does not interpret runtime payload validity, response shape
   correctness, or SSE/event parsing. Tasks `3a` and `3b` own those validation
   semantics.
4. This task may leave compatibility barrels in place only as pass-through
   consumers. Their continued existence must not imply independent contract
   authority.

### Mirrored Surface Checklist

When the public entrypoint row in the Canonical Contract Matrix changes, keep
these surfaces aligned in the same task:

1. L0 control model read-path and forbidden fallback clauses.
2. L1 Canonical Contract Matrix and Structured Contract Rules.
3. Target files and validation matrix.
4. Transit or fitness tests that prove resolver mapping.
5. Implementation summary note naming `@pairflow/ui-contracts` and the rejected
   standalone package boundary alternative.

### Branch / Failure Inventory

| Branch | Required Behavior | Proof |
|---|---|---|
| Root TS resolves entrypoint | compile/type proof imports from `@pairflow/ui-contracts` and succeeds without generated package output | `pnpm typecheck` plus `tests/contracts/uiContractEntrypointResolution.test.ts` |
| UI TS/Vite resolves entrypoint | UI Vitest/Vite resolver imports from `@pairflow/ui-contracts` and accepts the same public path | `pnpm --dir ui test` with `ui/src/lib/contracts/uiContractEntrypoint.test.ts`; `pnpm --dir ui build` |
| Alias would weaken boundary | reject alias shape or keep guard test failing on internals | fitness/contract boundary test |

### Implementation Decision

1. Selected entrypoint: `@pairflow/ui-contracts`.
2. Canonical target: `src/contracts/ui/index.ts`.
3. Rejected alternative: a standalone package boundary. It would add
   package/build ownership before the repository has external consumers, and it
   is not the smallest proof for the current private in-repo UI package.
4. Rejected alternative: using UI-local barrels such as
   `ui/src/lib/contracts/**` as the public entrypoint. Those files are
   compatibility consumers only and must not become authority surfaces.
5. Resolver mechanism: TypeScript `paths` in both root and UI configs plus a
   Vite alias in `ui/vite.config.ts`; all mappings must target the same
   canonical source file.

### Validation Matrix

Run the narrowest relevant checks after implementation:

1. `pnpm typecheck`
2. `pnpm --dir ui test` with the narrow UI resolver test that imports
   `@pairflow/ui-contracts`.
3. `pnpm fitness:check:ci`
4. `pnpm --dir ui build` because this task changes Vite alias/build
   configuration.
5. `pnpm test` only if the changed proof touches shared root test behavior
   beyond the narrow contract/fitness suites.

If a broader check is skipped, the implementation summary must say why and name
the narrower proof that covers the changed boundary.

### Acceptance Criteria

1. `@pairflow/ui-contracts` is the only selected in-repo UI contract
   entrypoint for successor migration work.
2. Root TypeScript tooling and UI tooling can resolve `@pairflow/ui-contracts`.
3. `@pairflow/ui-contracts` re-exports canonical contracts from `src/contracts/ui/**`
   without DTO duplication.
4. Existing UI relative imports remain valid until task `2b`.
5. Root and UI-side tests or type proofs fail if any `@pairflow/ui-contracts`
   resolver mapping drifts away from `src/contracts/ui/index.ts`.
6. The implementation notes identify why a standalone package boundary remains
   rejected for this slice.

### Downstream Inheritance

1. Task `2b-ui-import-migration` must use `@pairflow/ui-contracts` and should
   be import-only.
2. Task `4-contract-drift-tests` may harden final guardrails after the broad
   migration is complete.
3. Tasks `3a` and `3b` must not use this task as permission to change DTO or
   validation semantics.

## L2 - Execution Notes

1. Add resolver configuration before changing proof imports:
   - root `tsconfig.json`: add `baseUrl` if needed and map
     `@pairflow/ui-contracts` to `src/contracts/ui/index.ts`;
   - UI `ui/tsconfig.json`: add `baseUrl` if needed and map
     `@pairflow/ui-contracts` to `../src/contracts/ui/index.ts`;
   - UI `ui/vite.config.ts`: add a Vite alias for the same canonical file.
2. Prove the entrypoint with one or more narrow imports from
   `@pairflow/ui-contracts` for symbols already consumed by the UI.
3. Add a root proof test that confirms the root TypeScript alias target remains
   `src/contracts/ui/index.ts`; do not rely only on type equivalence because a
   duplicated DTO mirror could type-check while violating authority.
4. Add a UI-side proof test or config assertion that confirms both the UI
   TypeScript `paths` mapping and the Vite alias target the same canonical
   source file through `../src/contracts/ui/index.ts`.
5. Leave broad relative import cleanup to task `2b`.
6. Keep changes small enough that a reviewer can separate resolver proof from
   migration work.
