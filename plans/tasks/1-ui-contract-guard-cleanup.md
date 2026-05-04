---
artifact_type: task
artifact_id: task_ui_contract_guard_cleanup_v1
task_family_id: ui-contract-guard-cleanup
sequence_key: "1"
task_id: 1-ui-contract-guard-cleanup
title: "UI Contract Guard Cleanup"
status: approved
phase: phase1
target_files:
  - tools/fitness/policy.json
  - src/contracts/ui/index.ts
  - src/contracts/ui/uiReadModel.ts
  - ui/src/lib/types.ts
  - tests/contracts/uiContractParity.types.ts
  - tests/contracts/uiContractTransitSource.test.ts
  - tests/tools/fitness/uiContractBoundary.test.ts
  - tests/tools/fitness/fitnessCheckCi.test.ts
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
doc_bubble_id: 1-ui-contract-guard-cleanup-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-04-ui-contract-boundary-hardening-plan-v1
---

# Task: UI Contract Guard Cleanup

## L0 - Policy

### Goal

Remove the stale `ui_contract_boundary` policy exception and close the remaining
direct browser import of `ProtocolMessageType` from `src/types/protocol.js` by
exposing the UI-visible protocol type through `src/contracts/ui/**`.

This task is the smallest cleanup slice from the parent plan. It must not create
the future UI contract entrypoint alias, perform the broad UI import migration,
or add runtime response validation beyond the narrow compile/test proof needed
for this cleanup.

### Domain / Control Model Summary

1. Business invariant: UI-visible payload shape remains owned once by the
   backend UI contract surface and consumed consistently by backend router code
   and browser code.
2. Control model: `src/contracts/ui/**` is the canonical browser-safe UI
   contract surface; `src/types/protocol.js` remains runtime/shared-kernel
   protocol authority.
3. Read-path rule: browser-visible protocol type needs must be read through
   `src/contracts/ui/**`; browser code must not import `src/types/protocol.js`
   directly for `ProtocolMessageType`.
4. Forbidden fallback: do not replace the direct protocol import with a UI-local
   redeclaration, comment-driven mirror, or compatibility copy.
5. Allowed resolution path: re-export or alias the existing protocol type from
   the canonical UI contract surface, then migrate the narrow UI consumer and
   affected type/parity tests to that UI contract view.
6. Missing-data rule: no runtime payload parsing is introduced here; required
   runtime validation and unknown/absent wire-data behavior remain successor
   task scope.
7. Phase boundary:
   - contract closure: owned here only for the UI-visible protocol type export.
   - producer closure: no router/runtime producer behavior changes here.
   - internal execution closure: out of scope.
   - workflow/orchestration closure: out of scope.
   - read-model closure: only type-surface alignment for existing read-model
     protocol fields; no DTO field changes.
   - activation closure: existing hard-fail fitness policy stays active after
     stale exception removal.
   - cleanup/recovery closure: owned here only for stale policy state removal.

### Plan Linkage

1. Parent plan gap closed: stale policy exception and direct
   `src/types/protocol.js` UI import from plan task
   `1-ui-contract-guard-cleanup`.
2. Depends on: approved parent plan only.
3. Unlocks / impacts successors: `2a-contract-entrypoint` can choose the
   entrypoint without carrying stale guard cleanup or a direct protocol import
   leak; `4-contract-drift-tests` may later broaden final drift coverage.
4. Task-list impact: refines existing planned task
   `1-ui-contract-guard-cleanup`; it does not replace or obsolete any task id.
5. Inherited validation / exit expectation: `pnpm fitness:check:ci` must pass
   with no stale `ui_contract_boundary` exception, and narrow contract/type tests
   must prove the browser-visible protocol type comes through
   `src/contracts/ui/**`.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `docs/architecture/ui-contract-governance.md`
   - `plans/archive/plans/2026-05-02-ui-contract-boundary-plan-v1.md`
   - `src/contracts/ui/**`
   - `src/types/protocol.ts`
   - `tools/fitness/checks/ui-contract-boundary.ts`
   - `tools/fitness/policy.json`
   - `tests/contracts/uiContractParity.types.ts`
   - `tests/contracts/uiContractTransitSource.test.ts`
2. Canonical elements:
   - `src/types/protocol.ts` remains the protocol literal/runtime authority.
   - `ProtocolMessageType` remains the existing union derived from
     `protocolMessageTypes`.
   - `src/contracts/ui/**` is the only browser-safe export surface for the
     UI-visible view of that type.
3. Guard elements:
   - `ui_contract_boundary` policy exceptions must represent currently applied
     and justified exceptions only.
   - The removed
     `ui-contract-boundary-known-meta-review-drift-001` exception must not be
     replaced by an equivalent stale allow-list entry.
4. Compat-only elements: existing UI-local barrels under `ui/src/lib/contracts`
   may continue to re-export canonical contracts until task 2b migrates import
   specifiers.
5. Forbidden reinterpretations:
   - Do not change `ProtocolMessageType` literals.
   - Do not rename existing `UiActionProtocolMessageType`.
   - Do not treat this task as permission to migrate all relative
     `../../../src/contracts/ui/**` imports.
   - Do not add runtime schema validation under this cleanup task.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `tools/fitness/policy.json`
   - `tools/fitness/checks/ui-contract-boundary.ts`
   - `src/contracts/ui/index.ts`
   - `src/contracts/ui/uiReadModel.ts`
   - `src/contracts/ui/uiActions.ts`
   - `src/types/protocol.ts`
   - `ui/src/lib/types.ts`
   - `tests/contracts/uiContractParity.types.ts`
   - `tests/contracts/uiContractTransitSource.test.ts`
   - `tests/tools/fitness/uiContractBoundary.test.ts`
   - `tests/tools/fitness/fitnessCheckCi.test.ts`
2. Actual touched scope: contract-surface cleanup plus guard state cleanup and
   narrow consumer/test alignment.
3. Mutation entrypoints in scope: none; this task changes source/type/test files
   only and must not alter runtime Pairflow lifecycle behavior.
4. Hidden scope ruled out: router response production, JSON parsing, SSE event
   handling, package/alias configuration, and broad UI import migration are
   successor task scopes.
5. Branch inventory note: no runtime success/failure branches are changed; the
   only behavioral branch is fitness policy pass/fail for stale or forbidden
   imports.
6. Why the declared task shape matches reality: the known current leak is a
   single UI type import plus one stale policy exception, so the bounded cleanup
   can be proven with compile-time parity/transit assertions and existing
   fitness tests without touching producer code.

### Authority Boundary Map

1. Authority producer: `src/types/protocol.ts` produces the underlying protocol
   literal union; this task exposes the browser-safe view through
   `src/contracts/ui/**`.
2. Stored authority: TypeScript source and fitness policy.
3. In-scope consumers: `ui/src/lib/types.ts`, contract parity/transit tests, and
   fitness policy/test coverage for the stale exception.
4. Explicit out-of-scope consumers: UI components, router handlers, action
   dispatchers, read/status/detail response producers, SSE event stream
   parsing, and future entrypoint alias consumers.
5. Export surfaces closed in this phase: yes, the UI-visible
   `ProtocolMessageType` export path is closed through `src/contracts/ui/**`.

### Baseline Preservation

1. Must-preserve behaviors:
   - Existing protocol message literal set and `isProtocolMessageType` runtime
     behavior remain unchanged.
   - Existing UI DTO/read-model fields that already reference protocol message
     types retain their names and optionality/nullability.
   - `ui_contract_boundary` remains hard-fail.
2. Allowed resolution paths:
   - Type-only import or re-export from `src/types/protocol.ts` inside
     `src/contracts/ui/**` when the exposed symbol is browser-safe.
   - Consumer import update from `../../../src/types/protocol.js` to the
     canonical UI contract surface.
3. Forbidden regression interpretations:
   - Removing the stale exception must not weaken or disable the check.
   - Exporting the protocol type must not pull runtime-only protocol helpers
     into browser-facing code.
4. Replacement proof required if removed: any removed test assertion must be
   replaced by an equal or narrower proof that direct UI protocol imports are
   gone and the canonical UI contract view remains type-equal.

### Success / Completion Proof Boundary

1. Current canonical success proof source: passing typecheck/tests plus
   `pnpm fitness:check:ci` with the stale exception present but unused.
2. Target canonical success proof source: passing narrow contract/fitness tests
   and `pnpm fitness:check:ci` with the stale exception removed.
3. Current canonical completion proof source: N/A; no mutable runtime flow.
4. Target canonical completion proof source: N/A; no mutable runtime flow.
5. Reused proof contract: existing UI contract parity/transit and fitness guard
   tests.
6. Proof-parity rule: `narrowed_here_with_proof`.
7. Final truth surfaces affected: type/export surfaces and policy state only.
8. Mixed-truth surfaces allowed: none.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `contract_or_persisted_authority_foundation`.
2. Secondary shape: `fail_closed_hardening`, limited to stale guard state
   cleanup.
3. Preconditions that must pass before side effects: N/A.
4. Side effects forbidden before preconditions pass: N/A.
5. Invalid/precondition-failure behavior: N/A.
6. Coordination primitives in scope: N/A.

### In Scope

1. Remove the unused
   `ui-contract-boundary-known-meta-review-drift-001` exception from
   `tools/fitness/policy.json`.
2. Expose `ProtocolMessageType` through `src/contracts/ui/**` without changing
   the underlying literal authority in `src/types/protocol.ts`.
3. Update `ui/src/lib/types.ts` so its `ProtocolMessageType` export is sourced
   from the canonical UI contract surface.
4. Update narrow affected contract parity/transit tests and fitness tests that
   assert the old direct import or stale exception state.
5. Run the narrow tests needed to prove the cleanup and the repo-standard checks
   required for direct product/source changes.

### Out of Scope

1. Do not introduce the future UI contract entrypoint alias or package shape.
2. Do not migrate scattered relative imports such as
   `../../../src/contracts/ui/**` beyond the direct protocol import needed here.
3. Do not add runtime response validation for actions, read models, or SSE
   events.
4. Do not expand final drift-test coverage beyond the narrow assertions needed
   to keep this cleanup proven.
5. Do not change protocol literals, DTO field names, nullability, or runtime
   event/action semantics.

### Safety Defaults

1. If a proposed implementation requires changing DTO shape, runtime validation,
   alias config, or broad import rules, stop and route that work to the
   successor task named by the parent plan.
2. If the stale exception is still applied by the current import graph, do not
   remove it silently; first make the narrow in-scope import/export correction or
   route back to task refinement if the violation is outside this task.
3. If a browser-safe re-export would require importing runtime-only protocol
   values into `src/contracts/ui/**`, expose only type-level contract surface or
   route back for refinement.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`.
2. Impacted contracts: internal UI/backend TypeScript contract surface and
   fitness import-boundary policy.
3. Breaking behavior: no runtime/API behavior change is allowed.

### Complexity Risk Gate

1. `authority_risk`: `1`.
2. `surface_spread`: `1`.
3. `identity_join_risk`: `0`.
4. `activation_coupling`: `1`.
5. `prerequisite_risk`: `0`.
6. `acceptance_multiplicity`: `1`.
7. `risk_score`: `4`.
8. `single-task allowed`: `yes`, because the task is bounded to one stale policy
   exception, one protocol type export path, and narrow tests.
9. Bounded-task-shape decision: contract surface cleanup with adjacent guard
   cleanup.
10. Contract-dense decision:
   - gate triggered: yes.
   - trigger reasons: UI-visible interface/export surface, downstream successor
     inheritance, structured type-surface acceptance, and mirrored surfaces.
   - canonical matrix source: `L1 - Contract / Canonical Contract Matrix`.
   - mirrored surfaces: L0 control model, canonical contract anchors, call-site
     table, error/fallback contract, test matrix, implementation notes, review
     checklist.

## L1 - Contract

### Call-Sites / Entry Points

| Surface | Current Role | Required Change | Out-of-Scope Guard |
|---|---|---|---|
| `src/types/protocol.ts` | Runtime/shared-kernel protocol authority. | Preserve the existing `ProtocolMessageType` definition and literals. | Do not edit unless a type-only export path needs compiler proof; no literal changes. |
| `src/contracts/ui/uiReadModel.ts` or sibling UI contract module | Existing UI read-model contract surface that already imports `ProtocolMessageType`. | Make the UI-visible protocol type available from `src/contracts/ui/**` under the canonical name needed by UI consumers. | Do not add runtime validators or new DTO fields. |
| `src/contracts/ui/index.ts` | Public UI contract barrel. | Export the UI-visible `ProtocolMessageType` view if the implementation exposes it through the barrel. | Do not create task 2a entrypoint alias/config. |
| `ui/src/lib/types.ts` | UI convenience barrel. | Replace direct `../../../src/types/protocol.js` import/export with the canonical UI contract export. | Do not migrate unrelated `../../../src/contracts/ui/**` imports. |
| `tools/fitness/policy.json` | Active hard-fail fitness policy. | Remove only the stale `ui-contract-boundary-known-meta-review-drift-001` exception. | Do not change check mode, owner, scope, or unrelated exceptions. |
| `tests/contracts/uiContractParity.types.ts` | Type parity proof. | Keep parity between canonical UI protocol export and UI barrel export. | Do not broaden into final drift-test task coverage. |
| `tests/contracts/uiContractTransitSource.test.ts` | Source transit proof. | Update assertions that still require the direct protocol import from UI code. | Do not encode the future alias/entrypoint rule. |
| `tests/tools/fitness/*.test.ts` | Fitness behavior/policy proof. | Update only assertions affected by stale exception removal. | Do not weaken forbidden import tests. |

### Canonical Contract Matrix

| Contract Row | Source Authority | Browser-Safe Export | Required Semantics | Test Proof |
|---|---|---|---|---|
| `ProtocolMessageType` | `src/types/protocol.ts` union derived from `protocolMessageTypes`. | A type export reachable from `src/contracts/ui/**` under `ProtocolMessageType` or a clearly canonical UI alias that is re-exported to `ProtocolMessageType` for current consumers. | Exact type equality with the source union; no literal additions, removals, renames, or UI-local redeclaration. | Type parity assertion between source/canonical/UI exports. |
| `UiActionProtocolMessageType` | Existing `src/contracts/ui/uiActions.ts` export. | Unchanged. | Do not conflate with the general UI-visible `ProtocolMessageType`; keep existing action DTO semantics. | Existing parity assertions remain valid. |
| `ui_contract_boundary` policy exceptions | `tools/fitness/policy.json`. | N/A. | Exception list must not include stale entries for imports no longer present; check remains hard-fail. | Policy/fitness tests and `pnpm fitness:check:ci`. |

The matrix above is the single source of truth for this task's dense contract.
All mirrored prose and test expectations must remain subordinate to these rows.

### Mirrored Surface Checklist

| Surface | Mirrors Matrix Rows | Alignment Rule |
|---|---|---|
| L0 Domain / Control Model Summary | `ProtocolMessageType`; `ui_contract_boundary` policy exceptions | Must describe `src/contracts/ui/**` as the browser-safe read path without changing protocol literal authority or broadening runtime validation scope. |
| L0 Canonical Contract Anchors | all rows | Must keep source authority, canonical elements, guard elements, and forbidden reinterpretations consistent with the matrix. |
| L1 Call-Sites / Entry Points | all rows | Must map each file surface to the same required change and out-of-scope guard named by the matrix. |
| L1 Error / Fallback Contract | `ProtocolMessageType`; `ui_contract_boundary` policy exceptions | Must fail closed on direct UI protocol imports, stale exception removal surprises, and type-parity drift without inventing UI-local mirrors. |
| L1 Test Matrix | all rows | Must prove only the narrow parity, transit, and stale-policy cleanup promised by the matrix; final drift-test expansion stays in task 4. |
| L2 Suggested Sequence / Review Checklist | all rows | Must implement and review the matrix rows without pulling in entrypoint aliasing, broad UI import migration, runtime validation, or DTO changes. |

### Error / Fallback Contract

| Scenario | Expected Handling |
|---|---|
| UI code still imports `ProtocolMessageType` directly from `src/types/protocol.js`. | Treat as task failure; migrate that direct import to `src/contracts/ui/**`. |
| Removing the stale exception reveals a current `ui_contract_boundary` violation. | Fix only if it is the in-scope protocol import leak; otherwise stop and refine/split rather than widening this task. |
| Type parity fails after re-export. | Preserve the source union and adjust the UI contract export; do not redefine the type locally. |
| Tests expect the old direct import path. | Update the narrow assertions to require the new canonical UI contract path. |

### Test Matrix

| ID | Command / Suite | Required Proof |
|---|---|---|
| T1 | `pnpm typecheck` | UI and root TypeScript consumers resolve the new UI contract export. |
| T2 | `pnpm lint` | No lint regressions in edited source/tests. |
| T3 | `pnpm fitness:check:ci` | `ui_contract_boundary` remains hard-fail and passes without the stale exception. |
| T4 | `pnpm vitest run tests/contracts/uiContractParity.types.ts tests/contracts/uiContractTransitSource.test.ts tests/tools/fitness/uiContractBoundary.test.ts tests/tools/fitness/fitnessCheckCi.test.ts` | Narrow proof for protocol export parity, source transit expectations, and policy/fitness behavior. |
| T5 | `pnpm test` | Broader regression check required because this task edits shared contract source and tests. |
| T6 | `pnpm build` | Rebuild runtime artifacts after direct `src/**` changes. |
| T7 | `pnpm --dir ui test` and `pnpm --dir ui build` | Required if implementation edits or UI tooling behavior under `ui/src/**` are affected beyond type-only barrel import changes; otherwise may be skipped with rationale. |

## L2 - Implementation Notes

### Suggested Sequence

1. Remove the stale exception object from the `ui_contract_boundary` check in
   `tools/fitness/policy.json` without changing scope or mode.
2. Add the browser-safe `ProtocolMessageType` export through
   `src/contracts/ui/**`, preferably by type-only re-export from the existing
   protocol authority or by using the existing read-model module if that is the
   narrowest compatible surface.
3. Change `ui/src/lib/types.ts` to export `ProtocolMessageType` from
   `src/contracts/ui/**` instead of `src/types/protocol.js`.
4. Update only the affected parity/transit/fitness assertions.
5. Run the test matrix and record any skipped checks with a concrete reason.

### Review Checklist

1. `task_id`, `sequence_key`, filename, and parent tracker row all match
   `1-ui-contract-guard-cleanup`.
2. `doc_bubble_id` records the linked document-refinement bubble
   `1-ui-contract-guard-cleanup-doc`; `impl_bubble_id` remains `null` until
   document refinement is approved, closed, and merged, and a later
   implementation bubble is created.
3. No product/source files outside the target surface were changed unless the
   implementation proves they are narrow affected imports/tests for task 1.
4. No runtime validation, entrypoint alias, broad UI import migration, or final
   drift-test expansion was pulled into this task.
5. Direct UI import from `src/types/protocol.js` for `ProtocolMessageType` is
   gone.
6. The stale policy exception is removed, not renamed or replaced.

## CreateTask Summary

1. Created as planned task `1-ui-contract-guard-cleanup` from
   `plans/ui-contract-boundary-hardening-plan-v1.md`.
2. Status is `approved`; it is ready for document-refinement routing but is not
   yet `implementable` until the linked document bubble is approved, closed, and
   merged.
3. Current metadata uses
   `doc_bubble_id: 1-ui-contract-guard-cleanup-doc`, `impl_bubble_id: null`,
   `supersedes: []`, `superseded_by: null`, and the parent plan
   `archive_group`; `impl_bubble_id` remains `null` until document refinement is
   approved, closed, and merged, and a later implementation bubble is created.
