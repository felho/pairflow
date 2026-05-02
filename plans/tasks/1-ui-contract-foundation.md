---
artifact_type: task
artifact_id: task_ui_contract_foundation_v1
task_family_id: ui-contract-foundation
sequence_key: "1"
task_id: 1-ui-contract-foundation
title: "UI Contract Foundation"
status: in_progress
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
doc_bubble_id: 1-ui-contract-foundation-doc
impl_bubble_id: 1-ui-contract-foundation-impl
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
6. Guard interpretation rule: forbidden import decisions are based on normalized
   repo-relative targets for relative and root-relative specifiers; raw string
   prefix matching alone is not sufficient.
7. Scanner boundary rule: the required-now scanner remains dependency-light and
   string/regex based, but it must cover ordinary static import/export syntax
   and string-literal dynamic imports without adding a TypeScript AST or bundler
   dependency.
8. Missing-data rule: no runtime payload fields are introduced in this task; later
   DTO tasks must decide optional vs `null` fields at the canonical contract row.
9. Phase boundary:
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
6. Task-level refinement: this task narrows the parent plan's guard into a
   repo-root resolver contract for relative and root-relative specifiers; broader
   tsconfig path-alias enforcement remains outside this foundation slice unless
   the alias text directly matches a forbidden root.
7. Baseline-clean activation requirement: enabling `ui_contract_boundary` in
   hard-fail mode must include implementation evidence that the current repo
   baseline has no violations from the expanded string-literal dynamic-import
   scanner scope.

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
   - UI must not import any module that resolves to `src/v11/**`, including
     relative paths such as `../../src/v11/**` and root-relative specifiers such
     as `src/v11/**`.
   - `src/contracts/ui/**` must not import any module that resolves to
     `src/v11/**`, `node:` built-ins, `application/**`, `defaults/**`, or
     `infrastructure/**`, including relative paths that normalize into those
     roots.
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
| Browser-safe boundary | UI contract source must remain browser-safe. | Forbid `node:` built-in imports and internal runtime/default/application imports from `src/contracts/ui/**`. | P1 | required-now |
| Runtime separation | `src/v11/**` is not UI contract authority. | Fitness must catch `ui/src/**` imports from `src/v11/**`. | P1 | required-now |
| Successor compatibility | Existing mirrors remain until later tasks migrate them. | Do not delete or rewrite `ui/src/lib/types.ts` or `src/shared/contracts/**`. | P1 | required-now |
| Import resolution | Boundary decisions are based on normalized repo-relative targets, not raw string prefix only. | Resolve relative specifiers from the importing file directory and root-relative specifiers from repo root before deciding whether a target is forbidden. | P1 | required-now |
| Package/alias classification | Package/alias specifiers are allowed only when they are not `node:` built-ins and do not literally name a forbidden repo root such as `src/v11/**`. | This required-now classification does not expand tsconfig aliases; it only classifies the raw specifier. | P1 | required-now |
| Alias expansion scope | This foundation guard does not own full tsconfig path-alias expansion. | Broader alias mapping enforcement is later-hardening and must not block this foundation slice. | P2 | later-hardening |

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
| CS3 | `tools/fitness/checks/ui-contract-boundary.ts` | Add check for forbidden imports in `ui/src/**` and `src/contracts/ui/**`, normalizing relative and root-relative import specifiers to repo-relative targets where possible while keeping the implementation dependency-light. | Hard-code current known mirrors as failures unless they violate the new boundary rule. | T2,T3,T4,T6,T7 |
| CS4 | `tools/fitness/checks/index.ts` | Dispatch the new check id. | Change existing check behavior. | T5 |
| CS5 | `tools/fitness/policy.json` | Register the check in hard-fail mode. | Remove or weaken existing checks. | T5 |
| CS6 | `tests/tools/fitness/uiContractBoundary.test.ts` | Cover pass/fail cases for both guarded roots, import syntax forms, and ignored computed imports. | Assert successor-owned DTO migration. | T2,T3,T4,T6,T7 |

### 2) Data and Interface Contract

| Contract | Required Shape | Unknown / Malformed Behavior | Priority | Timing |
|---|---|---|---|---|
| `ui_contract_boundary` fitness check id | `id: "ui_contract_boundary"` in policy and dispatcher. | Unknown check ids still use existing not-implemented behavior. | P1 | required-now |
| Forbidden UI import rule | Files under `ui/src/**` must not import from a specifier that resolves to `src/v11/**`. | Violations produce `fail` details naming file and forbidden target. | P1 | required-now |
| Forbidden contract import rule | Files under `src/contracts/ui/**` must not import `node:` built-ins or any specifier that resolves to `src/v11/**`, `application/**`, `defaults/**`, or `infrastructure/**`. | Violations produce `fail` details naming file and normalized target. | P1 | required-now |
| Import syntax coverage | Static `import ... from`, side-effect `import "..."`, `export ... from`, and dynamic `import("...")` with string-literal specifiers are in scope. | Template-literal dynamic imports, identifier-based imports, concatenated expressions, malformed syntax, and other computed targets may be ignored, but each ignored target must contribute to the non-failing ignored/unclassified count. | P1 | required-now |
| Browser-safe package specifier | A non-relative package specifier that is not prefixed by `node:` and does not literally name a forbidden repo root is treated as browser-safe for this foundation guard only. | This is a guard classification rule, not a runtime/browser bundling guarantee. | P1 | required-now |
| Resolver base | Relative specifiers resolve from the importing file directory; root-relative specifiers beginning with `src/`, `ui/`, `application/`, `defaults/`, or `infrastructure/` resolve from repo root; path separators normalize to POSIX before classification. | tsconfig alias expansion is not required now unless the raw alias string directly matches a forbidden root. | P1 | required-now |
| Compatibility allowance | Existing `src/shared/contracts/**` and UI-local mirror files are not failed solely for existing. | Only forbidden import direction is failed. | P1 | required-now |

### 3) Side Effects Contract

N/A. The implementation writes source/test files only and does not perform
runtime state, filesystem cleanup, archive, bubble, or git side effects.

### 4) Error and Fallback Contract

| Case | Required Behavior | Priority | Timing |
|---|---|---|---|
| Missing scoped files | Report pass or warn consistently with existing fitness conventions; do not crash. | P1 | required-now |
| Forbidden import found | Hard-fail under policy and include actionable file plus normalized-target detail. | P1 | required-now |
| Allowed relative/local import | Pass. | P1 | required-now |
| Computed or unclassified import | Ignore when the target cannot be confidently classified; do not block on speculative parsing. Include deterministic non-failing detail counts by file and total, using the existing report `details` field, so false-negative risk is visible. | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Existing fitness check/report types and test style. | P1 | required-now |
| must-preserve | Existing `pnpm fitness:check:ci` behavior for current checks. | P1 | required-now |
| must-not-use | New parser, TypeScript AST, or bundler dependency for import scanning in this foundation slice. | P1 | required-now |
| must-not-change | Runtime UI API payloads or state machine literals. | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing |
|---|---|---|---|---|---|---|
| T1 | contract surface compiles | `src/contracts/ui/index.ts` exports the marker | `pnpm typecheck` runs | no browser-unsafe dependency is required | P1 | required-now |
| T2 | UI direct v11 import fails | temp `ui/src/file.ts` imports a path that resolves to `src/v11/shared/x`, covering root-relative and relative-path cases | fitness check runs | report status is `fail` with file detail | P1 | required-now |
| T3 | contract surface internal import fails | temp `src/contracts/ui/file.ts` imports `node:fs`, a root-relative forbidden internal root, and a relative path that resolves to `src/v11/**` or a forbidden internal root | fitness check runs | report status is `fail` with target detail | P1 | required-now |
| T4 | allowed imports pass | temp contract file imports sibling/local types and package specifiers classified as browser-safe by the guard | fitness check runs | report status is `pass` | P1 | required-now |
| T5 | CI policy dispatch | policy includes `ui_contract_boundary` | `pnpm fitness:check:ci` runs | new check is executed through the normal dispatcher | P1 | required-now |
| T6 | import syntax coverage | temp files use static import, side-effect import, re-export, and string-literal dynamic import forms with forbidden and allowed targets | fitness check runs | string-literal forms are classified consistently without a new parser dependency | P1 | required-now |
| T7 | computed import observability | temp file uses template-literal, identifier-based, or concatenated dynamic import expressions | fitness check runs | report does not fail solely for computed targets and includes deterministic ignored/unclassified detail counts by file and total | P1 | required-now |

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
| baseline_clean_proof | implementation evidence must show the current repo baseline passes the expanded string-literal scanner scope before hard-fail activation |
| closure_classification | `foundation_only` for contracts, `end_to_end` for the guard |

### 10) Canonical Contract Matrix

This matrix is the single source of truth for the contract-dense part of this
task. Other sections must stay subordinate to these rows.

| Contract Row | Owner | Accepted Input | Rejected Input | Required Output | Successor-Owned Semantics |
|---|---|---|---|---|---|
| CCM1: UI forbidden runtime import | `ui_contract_boundary` fitness check | `ui/src/**` files with local, package, or `src/contracts/ui/**` imports | any `ui/src/**` import resolving to `src/v11/**` under the resolver base contract | fail detail naming file and normalized target | Later tasks decide which canonical UI contracts replace current mirrors. |
| CCM2: contract surface browser safety | `ui_contract_boundary` fitness check | `src/contracts/ui/**` files with local imports and package specifiers classified as browser-safe by the guard | any `node:` built-in, or any specifier resolving under the resolver base contract to `src/v11/**`, `application/**`, `defaults/**`, `infrastructure/**` | fail detail naming file and normalized target | Later tasks decide DTO fields and nullability. |
| CCM2a: scanner classification scope | `ui_contract_boundary` fitness check | static import/export forms and string-literal dynamic imports | template-literal, identifier-based, concatenated, malformed, or otherwise computed import targets that cannot be confidently classified | classify known string-literal targets; emit deterministic non-failing ignored/unclassified detail counts by file and total for skipped targets | Later hardening may replace this with compiler-backed parsing if needed. |
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
| Resolver basis | Normalize path separators to POSIX and classify resolved repo-relative paths from the repo root resolver base; do not depend only on raw import string prefixes. |
| Alias limits | Full tsconfig `paths` expansion is explicitly not part of this foundation task; direct forbidden-root literals remain in scope. |

### 13) Mirrored Surface Checklist

When any CCM row changes, update:

| Surface | Mirrors |
|---|---|
| L0 Domain / Control Model Summary | CCM1-CCM4 ownership and forbidden fallback, including CCM2a scanner scope |
| L1 Data and Interface Contract | CCM1-CCM4 accepted/rejected inputs, including CCM2a ignored/unclassified handling |
| L1 Error and Fallback Contract | CCM1-CCM2 normalized-target failure behavior and CCM2a ignored/unclassified observability |
| L1 Test Matrix | CCM1-CCM4 proof rows, including CCM2a syntax and computed-import rows |
| L1 Capability Closure | CCM4 activation proof and baseline-clean proof for expanded scanner scope |

## L2 - Implementation Notes

1. Prefer a small scanner similar to existing fitness checks rather than adding a
   TypeScript AST dependency; the expanded syntax coverage above must still be
   implemented with dependency-light string/regex scanning.
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
| HB1 | Parse import syntax and resolver edge cases with the TypeScript compiler if regex scanning or repo-root resolution becomes noisy. | tooling | P3 | later-hardening | CreateTask | Consider only after false positives, false negatives, or tsconfig alias drift appear. |
