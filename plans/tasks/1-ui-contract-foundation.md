---
artifact_type: task
artifact_id: task_ui_contract_foundation_v1
task_family_id: ui-contract-foundation
sequence_key: "1"
task_id: 1-ui-contract-foundation
title: "UI Contract Foundation"
status: approved
phase: phase1
target_files:
  - src/contracts/ui/index.ts
  - src/contracts/ui/boundary.ts
  - tools/fitness/policy.json
  - tools/fitness/checks/index.ts
  - tools/fitness/checks/ui-contract-boundary.ts
  - tests/tools/fitness/uiContractBoundary.test.ts
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

# Task: UI Contract Foundation

## L0 - Policy

### Goal

Create the canonical browser-safe `src/contracts/ui/**` foundation and a hard
fitness guard that prevents the UI contract boundary from regressing before the
later migration tasks move concrete DTOs and literals into it.

This task is a foundation slice. It must not migrate delete-bubble, lifecycle,
meta-review, remote-execution, state-validation, action, event, error, or broad
read-model contracts yet.

### Domain / Control Model Summary

1. Business invariant: every backend contract consumed by the UI must eventually
   come from a backend-owned browser-safe contract surface instead of UI-local
   mirrors or direct `src/v11/**` imports.
2. Control model: `src/contracts/ui/**` is the future canonical UI/backend
   contract read-model surface; `src/v11/**` remains runtime/internal ownership.
3. Read-path rule: this task may create and export the canonical surface, but it
   must not claim consumers are migrated until successor tasks do that work.
4. Forbidden fallback: do not add new UI-local mirrored contract declarations or
   direct UI imports from `src/v11/**`.
5. Allowed resolution path: create a narrow empty or marker-backed contract
   surface and enforce import-direction rules with fitness coverage.
6. Missing-data rule: no runtime payload fields are introduced in this task; later
   DTO tasks must decide optional vs `null` fields at the canonical contract row.
7. Phase boundary:
   - contract closure: create canonical directory/export foundation only.
   - producer closure: deferred to `2-core-ui-contracts` and
     `3-ui-readmodel-contracts`.
   - read-model closure: deferred to successor tasks.
   - activation closure: fitness guard is active through `pnpm fitness:check:ci`.

### Plan Linkage

1. Parent plan: `plans/ui-contract-boundary-plan-v1.md`.
2. Parent gap closed: canonical directory plus guard foundation.
3. Depends on: approved parent plan only.
4. Unlocks: `2-core-ui-contracts`, which can move smaller mirrors behind the
   canonical surface without first creating the directory or guard.
5. Plan-level validation inherited: `pnpm fitness:check:ci` must fail on
   forbidden UI/runtime contract imports.

### Canonical Contract Anchors

1. Source anchors:
   - `docs/modularity-review/2026-05-02-modularity-review.md`
   - `src/contracts/deleteBubble.ts`
   - `src/shared/contracts/bubbleLifecycle.ts`
   - `src/shared/contracts/stateValidation.ts`
   - `src/shared/contracts/uiRemoteExecution.ts`
   - `ui/src/lib/types.ts`
   - `ui/src/lib/contracts/bubbleLifecycle.ts`
2. Canonical elements created now:
   - `src/contracts/ui/**` directory existence
   - public backend-owned UI contract barrel
   - import-boundary policy encoded in fitness
3. Guard elements:
   - UI must not import `src/v11/**`.
   - `src/contracts/ui/**` must not import `src/v11/**`, `node:*`,
     `application/**`, `defaults/**`, or `infrastructure/**`.
4. Compat elements: current `src/shared/contracts/**` and UI-local mirror files
   may remain until successor tasks migrate them.
5. Forbidden reinterpretations: do not treat this task as approval to declare all
   UI contracts migrated or to remove existing compatibility surfaces.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `tools/fitness/policy.json`
   - `tools/fitness/checks/index.ts`
   - `tests/tools/fitness/boundary.test.ts`
   - `ui/src/lib/types.ts`
   - `ui/src/lib/contracts/*.ts`
   - `src/shared/contracts/*.ts`
2. Actual touched scope: contract-foundation plus fitness guard.
3. Mutation entrypoints in scope: none; the implementation changes code and test
   files only, not runtime state or Pairflow lifecycle behavior.
4. Hidden scope ruled out: payload migration, router/API changes, generated type
   publishing, and UI consume cutover are out of scope.
5. Why the declared task shape matches reality: it creates enforcement before
   moving consumers, so later contract migrations have a stable destination and
   regression guard.

### Authority Boundary Map

1. Authority producer in this task: `src/contracts/ui/**` foundation.
2. Stored authority: TypeScript source only.
3. In-scope consumers: fitness runner and tests.
4. Explicit out-of-scope consumers: UI components, API client, router DTOs,
   delete-bubble runtime, lifecycle state machine, meta-review gate runtime.
5. Export surfaces closed in this phase: directory/barrel and boundary marker.

### Baseline Preservation

1. Preserve current runtime behavior and all current UI contract mirrors.
2. Preserve existing `src/shared/contracts/**` imports until successor tasks move
   them.
3. Preserve existing fitness checks and only add the new check to the policy and
   dispatcher.
4. Replacement proof required if removed: no existing contract or consumer may be
   removed in this task.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Reason: this introduces a public internal contract surface and a hard import
   policy that successor tasks inherit.
3. Breaking behavior: no runtime/API break is allowed.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `5`
8. `single-task allowed`: `yes`, because the task is foundation plus guard only
   and defers consumer migrations.
9. Bounded-task-shape decision:
   - primary shape: `contract_or_persisted_authority_foundation`
   - secondary shape: `fail_closed_hardening`
   - why safe: the hardening only guards the new foundation boundary and does
     not change runtime payloads.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Canonical surface | `src/contracts/ui/**` is the future UI/backend contract authority. | Add the directory and a public barrel/marker without migrating DTOs. | P1 | required-now |
| Browser-safe boundary | UI contract source must remain browser-safe. | Forbid `node:*` imports and internal runtime/default/application imports from `src/contracts/ui/**`. | P1 | required-now |
| Runtime separation | `src/v11/**` is not UI contract authority. | Fitness must catch `ui/src/**` imports from `src/v11/**`. | P1 | required-now |
| Successor compatibility | Existing mirrors remain until later tasks migrate them. | Do not delete or rewrite `ui/src/lib/types.ts` or `src/shared/contracts/**`. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| Delete-bubble contract | `src/contracts/deleteBubble.ts` | Existing contract remains in place. | preserve | P1 | required-now |
| Lifecycle compat contracts | `src/shared/contracts/bubbleLifecycle.ts`, `ui/src/lib/contracts/bubbleLifecycle.ts` | Existing parity remains until migration. | preserve | P1 | required-now |
| State/remote compat contracts | `src/shared/contracts/stateValidation.ts`, `src/shared/contracts/uiRemoteExecution.ts` | Existing surface remains until migration. | preserve | P1 | required-now |
| UI v11 import drift | `ui/src/lib/types.ts` | Known drift is not fixed here, but new guard must make future direct v11 imports fail. | guard | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Target files | Fitness and new contract foundation only. | No UI component/API client migration in this task. | P1 | required-now |
| Mutation entrypoints | None. | No Pairflow lifecycle or runtime state behavior changes. | P1 | required-now |
| Hidden scope ruled out | DTO/action/read-model migration is successor-owned. | Tests must not require consumer cutover. | P1 | required-now |

### 1) Call-Site Matrix

| ID | File | Required Change | Forbidden Change | Evidence |
|---|---|---|---|---|
| CS1 | `src/contracts/ui/index.ts` | Add public browser-safe barrel for future UI contracts. | Re-export runtime/internal modules. | T1 |
| CS2 | `src/contracts/ui/boundary.ts` | Add minimal marker or shared guard type that proves the surface compiles. | Add real DTO migration. | T1 |
| CS3 | `tools/fitness/checks/ui-contract-boundary.ts` | Add check for forbidden imports in `ui/src/**` and `src/contracts/ui/**`. | Hard-code current known mirrors as failures unless they violate the new boundary rule. | T2,T3,T4 |
| CS4 | `tools/fitness/checks/index.ts` | Dispatch the new check id. | Change existing check behavior. | T5 |
| CS5 | `tools/fitness/policy.json` | Register the check in hard-fail mode. | Remove or weaken existing checks. | T5 |
| CS6 | `tests/tools/fitness/uiContractBoundary.test.ts` | Cover pass/fail cases for both guarded roots. | Assert successor-owned DTO migration. | T2,T3,T4 |

### 2) Data and Interface Contract

| Contract | Required Shape | Unknown / Malformed Behavior | Priority | Timing |
|---|---|---|---|---|
| `ui_contract_boundary` fitness check id | `id: "ui_contract_boundary"` in policy and dispatcher. | Unknown check ids still use existing not-implemented behavior. | P1 | required-now |
| Forbidden UI import rule | Files under `ui/src/**` must not import from `src/v11/**`. | Violations produce `fail` details naming file and forbidden target. | P1 | required-now |
| Forbidden contract import rule | Files under `src/contracts/ui/**` must not import `src/v11/**`, `node:*`, `application/**`, `defaults/**`, or `infrastructure/**`. | Violations produce `fail` details naming file and forbidden target. | P1 | required-now |
| Compatibility allowance | Existing `src/shared/contracts/**` and UI-local mirror files are not failed solely for existing. | Only forbidden import direction is failed. | P1 | required-now |

### 3) Side Effects Contract

N/A. The implementation writes source/test files only and does not perform
runtime state, filesystem cleanup, archive, bubble, or git side effects.

### 4) Error and Fallback Contract

| Case | Required Behavior | Priority | Timing |
|---|---|---|---|
| Missing scoped files | Report pass or warn consistently with existing fitness conventions; do not crash. | P1 | required-now |
| Forbidden import found | Hard-fail under policy and include actionable file/target detail. | P1 | required-now |
| Allowed relative/local import | Pass. | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Existing fitness check/report types and test style. | P1 | required-now |
| must-preserve | Existing `pnpm fitness:check:ci` behavior for current checks. | P1 | required-now |
| must-not-use | New parser or bundler dependency for import scanning. | P1 | required-now |
| must-not-change | Runtime UI API payloads or state machine literals. | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing |
|---|---|---|---|---|---|---|
| T1 | contract surface compiles | `src/contracts/ui/index.ts` exports the marker | `pnpm typecheck` runs | no browser-unsafe dependency is required | P1 | required-now |
| T2 | UI direct v11 import fails | temp `ui/src/file.ts` imports `src/v11/shared/x` | fitness check runs | report status is `fail` with file detail | P1 | required-now |
| T3 | contract surface internal import fails | temp `src/contracts/ui/file.ts` imports `node:fs` or `src/v11/**` | fitness check runs | report status is `fail` with target detail | P1 | required-now |
| T4 | allowed imports pass | temp contract file imports sibling/local types only | fitness check runs | report status is `pass` | P1 | required-now |
| T5 | CI policy dispatch | policy includes `ui_contract_boundary` | `pnpm fitness:check:ci` runs | new check is executed through the normal dispatcher | P1 | required-now |

### 7) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `src/contracts/ui/**` | none yet | additive | create foundation | successor tasks migrate consumers |
| Existing mirrored UI contracts | UI and backend tests | N/A | preserve | `2-core-ui-contracts`, `3-ui-readmodel-contracts` |

### 8) Closure-Budget Summary

| Bucket | Touched? | Rule |
|---|---:|---|
| authority_producer | yes | Add empty/foundation producer only. |
| shared_contract | yes | Additive surface only. |
| read_model_consumers | no | Deferred. |
| internal_execution_consumers | no | Deferred. |
| cleanup_recovery_consumers | no | N/A. |

Collapsed closure: foundation plus guard. Deferred closures: all DTO/literal
migration and UI consume cutover.

### 9) Capability Closure

| Item | Value |
|---|---|
| capability_claim | The boundary guard is active in the existing fitness CI path. |
| activation_trigger | `pnpm fitness:check:ci` |
| entrypoint | `scripts/fitness-check-ci.sh` -> `tools/fitness/run-check.ts` |
| configuration_owner | repo-local `tools/fitness/policy.json` |
| repo_provided_parts | check implementation, policy row, tests |
| external_prerequisites | existing pnpm/tsx toolchain only |
| success_output_contract | fitness report includes passing `ui_contract_boundary` check |
| failure_output_contract | fitness report includes failing check details |
| last_mile_proof | run `pnpm fitness:check:ci` or targeted fitness tests |
| closure_classification | `foundation_only` for contracts, `end_to_end` for the guard |

### 10) Canonical Contract Matrix

This matrix is the single source of truth for the contract-dense part of this
task. Other sections must stay subordinate to these rows.

| Contract Row | Owner | Accepted Input | Rejected Input | Required Output | Successor-Owned Semantics |
|---|---|---|---|---|---|
| CCM1: UI forbidden runtime import | `ui_contract_boundary` fitness check | `ui/src/**` files with local, package, or `src/contracts/ui/**` imports | any `ui/src/**` import resolving to `src/v11/**` | fail detail naming file and target | Later tasks decide which canonical UI contracts replace current mirrors. |
| CCM2: contract surface browser safety | `ui_contract_boundary` fitness check | `src/contracts/ui/**` files with local/browser-safe imports | `node:*`, `src/v11/**`, `application/**`, `defaults/**`, `infrastructure/**` | fail detail naming file and target | Later tasks decide DTO fields and nullability. |
| CCM3: canonical foundation export | `src/contracts/ui/index.ts` | marker/foundation exports only | runtime DTO migration or re-export from internal runtime modules | typecheck-safe browser contract surface | Later tasks add concrete contract exports. |
| CCM4: policy activation | `tools/fitness/policy.json` + dispatcher | `ui_contract_boundary` check row | missing dispatcher or not-implemented fallback for the check id | check runs through `pnpm fitness:check:ci` | Later tasks may tighten scopes after migration. |

### 11) Ownership and Deferred Semantics

| Owned Now | Emitted / Recorded But Not Interpreted Now | Deferred Owner | Forbidden Inference |
|---|---|---|---|
| Directory and barrel for `src/contracts/ui/**`. | The existence of the canonical surface. | `2-core-ui-contracts`, `3-ui-readmodel-contracts`. | Do not infer that any concrete DTO has migrated. |
| Fitness import-boundary check. | Failure details for forbidden imports. | Later migration tasks decide allowed canonical imports. | Do not use the guard to justify deleting current mirrors in this task. |

### 12) Structured Contract Rules

| Rule | Required Behavior |
|---|---|
| Required fields | Fitness report check uses existing `FitnessReportCheck` shape: `id`, `status`, `mode`, `summary`, `details`. |
| Unknown fields | Existing fitness policy parser behavior remains unchanged. |
| Malformed import syntax | Scanner may ignore syntax it cannot confidently classify; it must not crash the check. |
| Duplicate violations | Multiple details may be reported; exact ordering should be deterministic by path traversal. |
| Retention/drop | Existing files are retained; only report data is emitted. |

### 13) Mirrored Surface Checklist

When any CCM row changes, update:

| Surface | Mirrors |
|---|---|
| L0 Domain / Control Model Summary | CCM1-CCM4 ownership and forbidden fallback |
| L1 Data and Interface Contract | CCM1-CCM4 accepted/rejected inputs |
| L1 Error and Fallback Contract | CCM1-CCM2 failure behavior |
| L1 Test Matrix | CCM1-CCM4 proof rows |
| L1 Capability Closure | CCM4 activation proof |

## L2 - Implementation Notes

1. Prefer a small scanner similar to existing fitness checks rather than adding a
   TypeScript AST dependency.
2. Keep detail messages stable enough for tests but do not over-specify exact
   punctuation.
3. Later tasks should replace current UI mirrors by importing/re-exporting from
   `src/contracts/ui/**`, then can tighten the guard if needed.

## Assumptions

1. The existing fitness framework is the correct enforcement surface.
2. The new `src/contracts/ui/**` surface can start as a compile-time foundation
   before it owns concrete DTOs.

## Open Questions

None blocking.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Parse import syntax with the TypeScript compiler if regex scanning becomes noisy. | tooling | P3 | later-hardening | CreateTask | Consider only after false positives appear. |
