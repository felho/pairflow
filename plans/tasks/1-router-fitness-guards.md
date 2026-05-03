---
artifact_type: task
artifact_id: task_ui_router_port_closure_1_router_fitness_guards_v1
task_family_id: router-fitness-guards
sequence_key: "1"
task_id: 1-router-fitness-guards
title: "Router Fitness Guards"
status: approved
phase: phase1
target_files:
  - tools/fitness/checks/index.ts
  - tools/fitness/checks/ui-router-port-boundary.ts
  - tools/fitness/policy.json
  - tests/tools/fitness/uiRouterPortBoundary.test.ts
  - tests/tools/fitness/fitnessCheckCi.test.ts
  - src/v11/shared/ports/uiRouter.ts
  - src/v11/infrastructure/ui/router.ts
  - src/v11/infrastructure/ui/routerActions.ts
  - src/v11/infrastructure/ui/routerActionDispatch.ts
  - src/v11/infrastructure/ui/routerActionErrorMapping.ts
  - src/v11/infrastructure/ui/routerBubbleDetail.ts
  - src/v11/infrastructure/ui/routerEvents.ts
  - src/v11/infrastructure/ui/routerDependencies.ts
  - src/v11/infrastructure/ui/routerContracts.ts
prd_ref: null
plan_ref: plans/ui-router-port-closure-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 1-router-fitness-guards-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-03-ui-router-port-closure-plan-v1
---

# Task: Router Fitness Guards

## L0 - Policy

### Goal

Add ratcheting architectural guards for the UI router port closure before
structural refactors begin.

The task must make the current coupling visible and prevent new broad-bag or
command-owned contract leakage while allowing explicitly named transitional
exceptions for the known current violations that later plan tasks remove.

### Domain / Control Model Summary

1. Business invariant: backend router modules and browser/UI consumers share
   explicit UI-facing contracts; internal command/runtime model changes must not
   silently widen the UI router port.
2. Control model: `src/contracts/ui/**` owns UI/API DTO contracts;
   `src/v11/shared/ports/**` owns capability dependency boundaries; router
   wiring owns composition of capabilities.
3. Read-path rule: guards may read source files and import declarations only;
   they must not infer ownership from runtime behavior.
4. Forbidden fallback: do not use a numeric method-count threshold as the main
   proof, and do not hide all current violations behind broad globs.
5. Allowed resolution path: current violations may be listed only by stable
   exception IDs that name the exact file/import or exact full-composite use.
6. Missing-data rule: if a target file cannot be read or parsed enough for the
   guard, the check fails closed with a diagnostic rather than passing.
7. Phase boundary:
   - contract closure: foundation guard only
   - producer closure: successor task
   - internal execution closure: successor task
   - workflow/orchestration closure: N/A
   - read-model closure: successor tasks 3 and 4
   - activation closure: `pnpm fitness:check:ci`
   - cleanup/recovery closure: successor task 5 removes transitional exceptions

### Plan Linkage

1. Parent plan gap closed: G1 and G5 foundation coverage; partial G3 guard
   visibility.
2. Depends on: N/A.
3. Unlocks / impacts successors: `2-router-dependency-slices`,
   `4-ui-readmodel-port-closure`, and `5-router-port-cleanup`.
4. Task-list impact: refines planned `1-router-fitness-guards`; no replacement.
5. Inherited validation / exit expectation: the first guard must pass with
   explicit known exceptions, and the final cleanup task must be able to reduce
   those exceptions to zero.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `docs/architecture/v11-ports-governance.md`
   - `docs/modularity-review/2026-05-02-modularity-review.md`
   - `src/v11/shared/ports/uiRouter.ts`
   - `src/contracts/ui/uiActions.ts`
   - `src/contracts/ui/uiReadModel.ts`
   - `tools/fitness/policy.json`
   - `tests/tools/fitness/uiContractBoundary.test.ts`
2. Canonical elements: `src/contracts/ui/**` owns UI-facing DTOs; router leaf
   modules should consume narrow capability slices, not `UiRouterDependencies`.
3. Guard elements: source-text/import guards and transitional exception IDs.
4. Compat-only elements: current full-composite usages and command-owned import
   leakage that this task records as named transitional exceptions.
5. Forbidden reinterpretations: do not move command-owned shapes into
   `ports` under new names and call that closure; do not treat a method-count
   budget as sufficient proof.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites: `src/v11/shared/ports/uiRouter.ts`,
   router leaf files including `routerActions.ts`, `routerActionDispatch.ts`,
   `routerActionErrorMapping.ts`, `routerBubbleDetail.ts`, and
   `routerEvents.ts`, current `tools/fitness/checks/index.ts`,
   `tools/fitness/policy.json`, and existing UI fitness tests.
2. Actual touched scope: contract_or_persisted_authority_foundation.
3. Mutation entrypoints in scope: N/A.
4. Hidden scope ruled out: this task adds guard code/tests/policy only; router
   consumer refactors and DTO projections are out of scope.
5. Branch inventory note: pass with no violations; fail on unlisted violations;
   pass with named transitional exceptions and report their count/IDs; fail on
   malformed broad exceptions.
6. Why the declared task shape matches reality: the task establishes a quality
   filter and records current violations without changing runtime behavior.

### Authority Boundary Map

1. Authority producer: fitness policy and guard implementation.
2. Stored authority: `tools/fitness/policy.json` plus guard tests.
3. In-scope consumers: `pnpm fitness:check:ci` and targeted Vitest tests.
4. Explicit out-of-scope consumers: router runtime, API responses, frontend
   store/components, and DTO projection code.
5. Export surfaces closed in this phase: no runtime export surface is closed;
   only guard activation is closed.

### Baseline Preservation

1. Must-preserve behaviors: existing `fitness:check:ci` policy loading,
   hard-fail behavior, and current `ui_contract_boundary` behavior.
2. Allowed resolution paths: add a new named check or extend check indexing in
   the same fitness framework.
3. Forbidden regression interpretations: do not weaken existing UI contract
   boundary checks while adding router-port checks.
4. Replacement proof required if removed: any replaced check path needs parity
   tests proving the same existing failures still fail.

### Success / Completion Proof Boundary

1. Current canonical success proof source: `pnpm fitness:check:ci` passes
   existing configured checks.
2. Target canonical success proof source: `pnpm fitness:check:ci` includes and
   passes the new router-port boundary check with explicit exception reporting.
3. Current canonical completion proof source: N/A.
4. Target canonical completion proof source: guard tests plus CI fitness report.
5. Reused proof contract: existing fitness report check contract.
6. Proof-parity rule: inherit_full_parity.
7. Final truth surfaces affected: fitness report check result and diagnostics.
8. Mixed-truth surfaces allowed: none.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: contract_or_persisted_authority_foundation.
2. Secondary shape: N/A.
3. Preconditions that must pass before side effects: N/A.
4. Side effects forbidden before preconditions pass: N/A.
5. Invalid/precondition-failure behavior: zero runtime side effects; report
   check failure.
6. Coordination primitives in scope: N/A.

### In Scope

1. Add a router-port boundary fitness check integrated into the existing fitness
   framework.
2. Add tests for broad `UiRouterDependencies` use in router leaf modules.
3. Add tests for forbidden command-owned view/import leakage through
   `src/v11/shared/ports/uiRouter.ts`.
4. Add exact transitional exceptions for current known violations and verify the
   report names exception IDs/counts.
5. Update `tools/fitness/policy.json` so `pnpm fitness:check:ci` runs the guard.

### Out of Scope

1. Refactoring router modules to narrow dependency slices.
2. Replacing raw UI action DTO exposure.
3. Moving list/status/inbox read-model types to canonical UI contracts.
4. Removing all transitional exceptions.
5. Changing API response behavior or frontend store behavior.

### Safety Defaults

1. A malformed guard configuration fails closed.
2. A new unlisted violation fails CI.
3. Current violations are allowed only through named, narrow transitional
   exceptions owned by later plan tasks.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts: internal architecture/fitness policy and report
   diagnostics. Runtime API contracts are not changed by this task.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `4`
8. `single-task allowed`: `yes`
9. If `no`, required split: N/A.
10. Identity/join note:
   - canonical identity path: source file path plus import/type-reference span.
   - competing identifiers or fallback identities: prose task labels and method
     count thresholds are forbidden as primary identity.
11. Authority/source-of-truth note:
   - canonical source: source imports/type references and fitness policy.
   - forbidden secondary sources: stale review text such as the old "14 methods"
     count.
12. Closure-budget triage:
   - closure buckets touched: shared_contract, activation_closure.
   - intentionally collapsed closures: guard implementation plus activation in
     fitness policy, because both are one fitness framework path.
   - explicitly deferred closures: runtime refactor, DTO closure, final cleanup.
13. Bounded-task-shape decision:
   - primary shape: contract_or_persisted_authority_foundation.
   - secondary shape: N/A.
   - why this bounded mix is safe: no runtime source behavior changes are in
     scope.
14. Contract-dense decision:
   - gate triggered: `no`
   - trigger reasons: N/A.
   - canonical matrix source: N/A.
   - mirrored surfaces: N/A.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | UI router boundaries stay UI-contract owned and capability shaped. | Guard must target ownership and consumer boundaries. | P1 | required-now |
| Control model | Fitness policy activates the guard; source files provide evidence. | Add check through existing fitness check registry and policy. | P1 | required-now |
| Read-path rule | Read source imports/type references only. | No runtime behavior or endpoint calls needed for the guard. | P1 | required-now |
| Forbidden fallback | No method-count-only proof; no broad glob exceptions. | Tests must fail on unlisted broad-bag or command-owned leakage. | P1 | required-now |
| Allowed resolution path | Exact exception IDs can temporarily allow known current violations. | Diagnostics must report exception IDs/counts. | P1 | required-now |
| Missing-data rule | Missing/unreadable target files fail closed. | Guard returns fail with actionable detail. | P1 | required-now |
| Phase boundary | Foundation guard now; refactors later. | Tests must not assert zero exceptions yet. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `src/contracts/ui/**` | `src/contracts/ui/uiActions.ts`, `src/contracts/ui/uiReadModel.ts` | canonical UI DTO surface | preserve | P1 | required-now |
| `src/v11/shared/ports/uiRouter.ts` | port file | capability boundary, not command-owned view parking lot | guard | P1 | required-now |
| `UiRouterDependencies` | `src/v11/shared/ports/uiRouter.ts` | composite allowed only at composition/wiring during transition | guard leaf usage | P1 | required-now |
| Transitional exceptions | `tools/fitness/policy.json` | narrow guard metadata, not canonical approval | record and report | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Fitness registry, policy, `uiRouter.ts`, router leaf files including `routerActionErrorMapping.ts`. | Target files must match guard scope. | P1 | required-now |
| Actual touched scope | Guard/policy/test only. | No router runtime refactor in this task. | P1 | required-now |
| Mutation entrypoints in scope | N/A. | Runtime behavior is unchanged. | P1 | required-now |
| Hidden scope ruled out | Existing source shows current broad interface and command-owned imports. | Record them as exceptions, do not fix them here. | P1 | required-now |
| Branch inventory note | no violation, exact exception, new violation, malformed exception. | Required tests cover all branches. | P1 | required-now |
| Shape proof | The task only introduces a fitness signal. | Success is guard activation, not architectural closure. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | G1/G5 foundation, G3 visibility. | Add guard before refactor tasks. | P1 | required-now |
| Depends on | N/A. | This is first in sequence. | P1 | required-now |
| Unlocks / impacts successors | Tasks 2, 4, and 5. | Exceptions must be named so later tasks can remove them. | P1 | required-now |
| Task-list impact | Refines planned task only. | No plan split. | P1 | required-now |
| Inherited validation / exit expectation | `pnpm fitness:check:ci` and targeted guard tests. | Include both in validation. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| Fitness report check taxonomy | CI, developers, plan validation | additive | add router-port check and diagnostics | N/A |
| `UiRouterDependencies` usage rule | router leaf modules and wiring files | additive guard | detect broad leaf use with exceptions | task 2 removes violations |
| UI router command-owned import rule | `uiRouter.ts` and canonical UI contracts | additive guard | detect forbidden import leakage with exceptions | task 4 removes violations |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| Existing `ui_contract_boundary` check | preserve | existing tests still pass | P1 | required-now |
| Existing `fitness:check:ci` hard-fail policy | preserve | `fitnessCheckCi` tests cover configured failure | P1 | required-now |
| Method-count-only broad-bag proof | forbid | guard semantics and tests focus on ownership/use | P1 | required-now |

### 0f) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Canonical / Compat / Guard | Mixed-Truth Allowed? | Priority | Timing |
|---|---|---|---|---|---|---|
| Fitness check result | existing configured checks | router-port check included and passing | guard | no | P1 | required-now |
| Exception diagnostics | N/A | explicit exception IDs/counts | guard | no | P1 | required-now |

### 0g) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| malformed exception config | exception shape and path specificity | N/A | hard-fail with diagnostic | P1 | required-now |
| unreadable target file | file read result | N/A | hard-fail with diagnostic | P1 | required-now |

### 1) Call-Site Matrix

| ID | File | Function / Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `tools/fitness/checks/ui-router-port-boundary.ts` | new check builder | Finds full `UiRouterDependencies` references in router leaf modules and command-owned imports in the UI router port. | P1 | required-now | T1,T2,T3,T4 |
| CS2 | `tools/fitness/checks/index.ts` | `buildCheckReport` | Dispatches the new check ID. | P1 | required-now | T5 |
| CS3 | `tools/fitness/policy.json` | configured checks | Runs the new check in hard-fail mode with narrow transitional exceptions. | P1 | required-now | T6,T7 |
| CS4 | `tests/tools/fitness/uiRouterPortBoundary.test.ts` | targeted guard tests | Covers pass/fail/exception/malformed branches. | P1 | required-now | T1-T5 |
| CS5 | `tests/tools/fitness/fitnessCheckCi.test.ts` | CI policy integration | Proves configured policy can block when the new check fails. | P2 | required-now | T6,T7 |

### 2) Data and Interface Contract

| Surface | Required Shape / Rule | Priority | Timing |
|---|---|---|---|
| Check ID | Use a stable ID such as `ui_router_port_boundary`. | P1 | required-now |
| Violation detail | Include relative file path and reason family: `full_dependency_bag_usage` or `command_owned_ui_port_import`. | P1 | required-now |
| Exception shape | Require exact `id`, `kind`, `owner`, `reason`, and exact file/import or file/symbol match. | P1 | required-now |
| Exception reporting | Report `exceptions_applied=<n>` and `exceptions_applied_ids=<ids>` when exceptions are used. | P1 | required-now |
| Transitional current violations | Policy may list only exact current violations that successor tasks own. | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Fitness source | Add a new check file and registry entry. | Changing runtime router behavior. | Guard-only task. | P1 | required-now |
| Fitness policy | Add hard-fail check and named exceptions. | Broad exception globs. | Later cleanup removes exceptions. | P1 | required-now |
| Tests | Add targeted guard and CI integration tests. | Rewriting unrelated fitness checks. | Existing checks must stay intact. | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Behavior | Fallback Action | Reason Code | Priority | Timing |
|---|---|---|---|---|---|
| New unlisted broad-bag use | fail | report file and symbol | `FULL_UI_ROUTER_DEPENDENCY_BAG_USAGE` | P1 | required-now |
| New unlisted command-owned import | fail | report file and import | `COMMAND_OWNED_UI_PORT_IMPORT` | P1 | required-now |
| Exact transitional exception | pass with detail | report exception ID | `TRANSITIONAL_EXCEPTION_APPLIED` | P1 | required-now |
| Malformed or broad exception | fail | report invalid exception | `INVALID_ROUTER_PORT_EXCEPTION` | P1 | required-now |
| Unreadable scanned file | fail | report path | `ROUTER_PORT_SCAN_READ_FAILED` | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing `tools/fitness` report/check framework | P1 | required-now |
| must-use | existing Vitest fitness test style | P1 | required-now |
| must-not-use | method-count-only threshold | P1 | required-now |
| must-not-use | runtime router behavior changes | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing |
|---|---|---|---|---|---|---|
| T1 | full bag in leaf fails | fixture router leaf imports/types `UiRouterDependencies` | check runs | report fails with `FULL_UI_ROUTER_DEPENDENCY_BAG_USAGE` | P1 | required-now |
| T2 | composition boundary allowed | fixture wiring/contract file uses `UiRouterDependencies` | check runs | report passes without exception | P1 | required-now |
| T3 | command-owned port import fails | fixture `src/v11/shared/ports/uiRouter.ts` imports list/status/inbox command contracts | check runs | report fails with `COMMAND_OWNED_UI_PORT_IMPORT` | P1 | required-now |
| T4 | exact transitional exceptions pass | fixture has listed current violations | check runs | report passes and names exception IDs/count | P1 | required-now |
| T5 | malformed broad exception fails | exception omits exact file/import or uses broad glob | check runs | report fails with `INVALID_ROUTER_PORT_EXCEPTION` | P1 | required-now |
| T6 | policy integration passes current repo | real repo current violations are exactly listed | `pnpm fitness:check:ci` runs | check passes with explicit exception diagnostics | P1 | required-now |
| T7 | policy integration blocks new violation | temp fixture or policy-scoped new violation exists | CI check runs | command exits nonzero | P2 | required-now |

### 7) Acceptance Criteria

1. AC1: A router-port boundary check is registered in the fitness framework.
2. AC2: The check fails on full `UiRouterDependencies` usage outside approved
   composition/wiring boundaries.
3. AC3: The check fails on command-owned list/status/inbox imports through the
   UI router port unless an exact transitional exception is listed.
4. AC4: The current repo passes with named transitional exceptions only.
5. AC5: Guard diagnostics report applied exception IDs/counts.
6. AC6: `pnpm fitness:check:ci` runs the new check.

### 8) AC-Test Traceability

| AC | Covered by Tests |
|---|---|
| AC1 | T5,T6 |
| AC2 | T1,T2 |
| AC3 | T3,T4,T5 |
| AC4 | T4,T6 |
| AC5 | T4,T6 |
| AC6 | T6,T7 |

## L2 - Implementation Notes

1. Prefer a dedicated check file over overloading `ui-contract-boundary`; this
   keeps browser contract import rules separate from router-port architecture
   rules.
2. The check can use TypeScript source text/import scanning if it is exact and
   covered by fixtures; no AST dependency is required for this guard.
3. Keep exception IDs named for the successor task that removes them where
   practical.

## Assumptions

1. `src/v11/infrastructure/ui/routerDependencies.ts`,
   `routerContracts.ts`, and top-level router creation remain allowable
   composition/wiring boundaries during transition.
2. Router leaf modules include route/action/detail/event modules under
   `src/v11/infrastructure/ui/**` that are not composition/wiring files.

## Open Questions

1. None blocking.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Replace source-text scanning with AST parsing if false positives appear. | tooling | P3 | later-hardening | implementation note | Add parser-backed import/reference extraction. |

## Finalization Summary

1. Contract-boundary override: yes, because this task changes architecture
   fitness policy/report behavior.
2. Complexity-risk decision: risk score 4, single task allowed.
3. Contract-dense decision: no.
4. Control model inherited cleanly from the parent plan.
5. Canonical matrix: N/A.
