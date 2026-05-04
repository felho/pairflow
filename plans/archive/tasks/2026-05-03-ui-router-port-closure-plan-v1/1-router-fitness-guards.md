---
artifact_type: task
artifact_id: task_ui_router_port_closure_1_router_fitness_guards_v1
task_family_id: router-fitness-guards
sequence_key: "1"
task_id: 1-router-fitness-guards
title: "Router Fitness Guards"
status: archived
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
  - src/v11/infrastructure/ui/routerRequest.ts
  - src/v11/infrastructure/ui/routerDependencies.ts
  - src/v11/infrastructure/ui/routerContracts.ts
target_files_role: compatibility_union_of_write_targets_and_read_only_scan_inputs
target_write_files:
  - tools/fitness/checks/index.ts
  - tools/fitness/checks/ui-router-port-boundary.ts
  - tools/fitness/policy.json
  - tests/tools/fitness/uiRouterPortBoundary.test.ts
  - tests/tools/fitness/fitnessCheckCi.test.ts
target_read_only_scan_inputs:
  - src/v11/shared/ports/uiRouter.ts
  - src/v11/infrastructure/ui/router.ts
  - src/v11/infrastructure/ui/routerActions.ts
  - src/v11/infrastructure/ui/routerActionDispatch.ts
  - src/v11/infrastructure/ui/routerActionErrorMapping.ts
  - src/v11/infrastructure/ui/routerBubbleDetail.ts
  - src/v11/infrastructure/ui/routerEvents.ts
  - src/v11/infrastructure/ui/routerRequest.ts
  - src/v11/infrastructure/ui/routerDependencies.ts
  - src/v11/infrastructure/ui/routerContracts.ts
prd_ref: null
plan_ref: plans/archive/plans/2026-05-03-ui-router-port-closure-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 1-router-fitness-guards-doc
impl_bubble_id: 1-router-fitness-guards-impl
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
   exception IDs that name the exact full-composite use or the exact directed
   file/import edge from the UI router port to a command-owned source.
6. Missing-data rule: if a target file cannot be read or parsed enough for the
   guard, the check fails closed with a diagnostic rather than passing.
7. Phase boundary:
   - contract closure: foundation guard only
   - producer closure: successor task
   - internal execution closure: successor task
   - workflow/orchestration closure: N/A
   - dependency-slice closure: successor task 2
   - action DTO closure: successor task 3
   - read-model closure: successor task 4
   - activation closure: `pnpm fitness:check:ci`
   - cleanup/recovery closure: successor task 5 verifies no stale
     transitional approvals remain after owner tasks remove their exceptions

### Plan Linkage

1. Parent plan gap closed: G1 and G5 foundation coverage; partial G3 guard
   visibility.
2. Depends on: N/A.
3. Unlocks / impacts successors: `2-router-dependency-slices`,
   `3-ui-action-dto-closure`, `4-ui-readmodel-port-closure`, and
   `5-router-port-cleanup`.
4. Task-list impact: refines planned `1-router-fitness-guards`; no replacement.
5. Inherited validation / exit expectation: the first guard must pass with
   explicit known exceptions; tasks 2 and 4 remove the listed exception
   families, and task 5 verifies the final zero-stale-approval cleanup state.

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
6. Fitness policy envelope: `tools/fitness/types.ts` defines the shared
   `FitnessPolicyException` base fields; this task may interpret those fields
   narrowly for router-port exceptions but must not fork the policy format.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites: `src/v11/shared/ports/uiRouter.ts`,
   router leaf files including `routerActions.ts`, `routerActionDispatch.ts`,
   `routerActionErrorMapping.ts`, `routerBubbleDetail.ts`,
   `routerEvents.ts`, and `routerRequest.ts`, current
   `tools/fitness/checks/index.ts`,
   `tools/fitness/policy.json`, and existing UI fitness tests.
2. `target_files` role split: `target_files` is retained only as the legacy
   compatibility union of expected write targets and read-only scan inputs.
   `target_write_files` and `target_read_only_scan_inputs` are the
   authoritative role-specific lists for this task; router and port source
   files are read-only scan inputs and must not be refactored here.
3. Actual touched scope: contract_or_persisted_authority_foundation.
4. Mutation entrypoints in scope: N/A.
5. Hidden scope ruled out: this task adds guard code/tests/policy only; router
   consumer refactors and DTO projections are out of scope.
6. Branch inventory note: pass with no violations; fail on unlisted violations;
   pass with named transitional exceptions and report their exact count/IDs;
   fail on malformed broad exceptions; fail on exact exceptions that do not
   match an observed violation; fail on unreadable scan inputs; prove registry
   dispatch; and preserve the existing `ui_contract_boundary` behavior.
7. Why the declared task shape matches reality: the task establishes a quality
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
4. Exact exceptions that no longer match an observed violation fail CI so the
   cleanup task cannot leave stale approvals behind.

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
| Transitional exceptions | `tools/fitness/policy.json` | narrow guard metadata, not canonical approval; tasks 2 and 4 own removal of the listed exceptions, and task 5 verifies no stale approvals remain | record and report | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Fitness registry, policy, `uiRouter.ts`, router leaf files including `routerActionErrorMapping.ts`. | Target files must match guard scope. | P1 | required-now |
| Actual touched scope | Guard/policy/test only. | No router runtime refactor in this task. | P1 | required-now |
| Mutation entrypoints in scope | N/A. | Runtime behavior is unchanged. | P1 | required-now |
| Hidden scope ruled out | Existing source shows current broad interface and command-owned imports. | Record them as exceptions, do not fix them here. | P1 | required-now |
| Branch inventory note | no violation, exact exception, new violation, malformed exception, unused exact exception, unreadable scan input, registry dispatch, preserved baseline check. | Required tests cover all branches. | P1 | required-now |
| Shape proof | The task only introduces a fitness signal. | Success is guard activation, not architectural closure. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | G1/G5 foundation, G3 visibility. | Add guard before refactor tasks. | P1 | required-now |
| Depends on | N/A. | This is first in sequence. | P1 | required-now |
| Unlocks / impacts successors | Tasks 2, 3, 4, and 5. | Task 2 removes full-bag dependency-slice exceptions, task 3 proceeds with action DTO closure without owning a §2a exception family, task 4 removes command-owned read-model import exceptions, and task 5 verifies the cleanup state. | P1 | required-now |
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
| Existing `ui_contract_boundary` check | preserve | T16 proves existing `ui_contract_boundary` tests still pass and the new router-port check does not replace or weaken that baseline. | P1 | required-now |
| Existing `fitness:check:ci` hard-fail policy | preserve | T14 proves configured P1 fitness failures still exit nonzero through the CI entrypoint; T7 adds fixture-scoped regression coverage. | P1 | required-now |
| Shared `FitnessPolicyException` envelope | preserve | T5 proves router-port tests parse and reject malformed base exception fields from the existing envelope. | P1 | required-now |
| Current-task policy mutation lifecycle | preserve with update obligation | T6 proves the current task's real policy state; T17 programmatically checks that successor tasks remove or add router-port exceptions by updating §2a and `tools/fitness/policy.json` together. | P1 | required-now |
| Method-count-only broad-bag proof | forbid | T10 proves method-count budgets cannot satisfy the broad-bag guard when a broad-bag violation exists; T5 covers budget-like router-port exception envelopes as malformed configuration. | P1 | required-now |

### 0f) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Canonical / Compat / Guard | Mixed-Truth Allowed? | Priority | Timing |
|---|---|---|---|---|---|---|
| Fitness check result | existing configured checks | router-port check included and passing | guard | no | P1 | required-now |
| Exception diagnostics | N/A | explicit exception IDs/counts | guard | no | P1 | required-now |

### 0g) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| malformed exception config | exception shape and path specificity | N/A | hard-fail with diagnostic | P1 | required-now |
| unreadable scan input | policy `scope` resolution and file read result | N/A | hard-fail with diagnostic | P1 | required-now |
| unused exact exception | normalized observed-violation set | N/A | hard-fail with stale exception diagnostic | P1 | required-now |

### 1) Call-Site Matrix

| ID | File | Function / Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `tools/fitness/checks/ui-router-port-boundary.ts` | new check builder | Finds full `UiRouterDependencies` references, wrapper dependency-bag access in router leaf modules, and command-owned imports in UI router port files. | P1 | required-now | T1,T2,T3,T4,T5,T8-T13,T18 |
| CS2 | `tools/fitness/checks/index.ts` | `buildCheckReport` | Dispatches the new check ID. | P1 | required-now | T15 |
| CS3 | `tools/fitness/policy.json` | configured checks | Runs the new check in hard-fail mode with narrow transitional exceptions. | P1 | required-now | T6,T7 |
| CS4 | `tests/tools/fitness/uiRouterPortBoundary.test.ts` | targeted guard tests | Covers pass/fail/exception/malformed/unused/resolution/no-budget/wrapper/read-fail/re-export branches. | P1 | required-now | T1-T5,T8-T13,T18 |
| CS5 | `tests/tools/fitness/fitnessCheckCi.test.ts` | CI policy integration | Proves configured policy can pass current repo state, block drift when the new check fails, dispatch the registered check ID through `buildCheckReport`, and keep §2a inventory synchronized with policy exceptions. | P1 | required-now | T6,T7,T14,T15,T17 |
| CS6 | `tests/tools/fitness/uiContractBoundary.test.ts` | existing UI contract boundary tests | Proves the existing `ui_contract_boundary` check behavior is preserved while adding the router-port check. | P1 | required-now | T16 |

### 2) Data and Interface Contract

| Surface | Required Shape / Rule | Priority | Timing |
|---|---|---|---|
| Check ID | Use a stable ID such as `ui_router_port_boundary`. | P1 | required-now |
| Violation detail | Include relative file path and reason family: `full_dependency_bag_usage` or `command_owned_ui_port_import`. | P1 | required-now |
| Exception shape | Require exact `id`, `kind`, `owner`, `reason`, a closed exception `kind` set, and one router-port envelope: either exactly one `paths` entry shaped as `"<relative-file>#UiRouterDependencies"` for full-bag/wrapper use or exact `from`/`to` source paths for command-owned UI port imports. | P1 | required-now |
| Full-bag matching | Match broad dependency access by scanned leaf source: direct `UiRouterDependencies` symbol use, re-exported `UiRouterDependencies` symbol use, or `UiRouterEnvironment`/equivalent wrapper use that reaches the full bag through `environment.dependencies.*`, destructured aliases from `environment.dependencies`, or local aliases assigned from `environment.dependencies`; merely typing a request/helper with `UiRouterEnvironment` is not a violation unless the source reads or aliases the broad `dependencies` bag. | P1 | required-now |
| Scan scope source | Build the scanned file set from the `ui_router_port_boundary` check's configured `scope` in `tools/fitness/policy.json`; scope entries may be glob patterns or exact file paths. The initial required scope is `src/v11/shared/ports/**/*.ts` plus `src/v11/infrastructure/ui/**/*.ts`. Exact file-path scope entries must exist and be readable; `target_files` documents expected source inventory but is not the runtime scan authority. | P1 | required-now |
| Per-kind scan application | Apply full-bag scanning to every file matched by the configured `src/v11/infrastructure/ui/**/*.ts` scope, including in-scope files not listed in §2a because they currently have no violation. Apply command-owned import scanning to every file matched by the configured `src/v11/shared/ports/**/*.ts` scope, so future UI-facing port files cannot escape the guard merely by being outside `uiRouter.ts`. | P1 | required-now |
| Command-owned target predicate | A command-owned import target is any resolved source file outside `src/contracts/ui/**` whose path is under `src/v11/shared/**` and whose basename contains one of these closed ownership markers: `Command`, `CommandApi`, `CommandContract`, `Inbox`, `Status`, or `List`. The initial explicit targets are the three §2a command-owned `to` paths; future scanned port files importing equivalent command/read-model sources must fail unless listed by exact exception. | P1 | required-now |
| Boundary classification | Treat only `src/v11/infrastructure/ui/router.ts`, `src/v11/infrastructure/ui/routerContracts.ts`, and `src/v11/infrastructure/ui/routerDependencies.ts` as composition/wiring paths allowed to use `UiRouterDependencies` without an exception; all other scanned `src/v11/infrastructure/ui/**/*.ts` files are leaf candidates unless explicitly excluded by policy scope. | P1 | required-now |
| Fixture-scope override | Tests that mutate source or policy for negative CI scenarios must run against an isolated temporary repo root and test-scoped policy/report path, passed through the existing fitness test harness configuration rather than by editing the real checkout. | P1 | required-now |
| §2a inventory extractor | Parse the §2a markdown table by header names. Rows with `Kind` equal to the two router-port exception kinds must yield `Exception ID`, `Kind`, and a canonical match after trimming backticks and whitespace. For `allow-full-dependency-bag`, `Exact Match` is the literal `<relative-file>#UiRouterDependencies` policy `paths[0]` identity. For `allow-command-owned-ui-port-import`, `Exact Match` is the table shorthand `<from> -> <to>` and must be split into the policy `from`/`to` pair before parity comparison. T17 parity compares IDs, kinds, and exact-match content, so stable IDs cannot hide drift in `paths[0]` or `from`/`to`. Prose outside the table is not authoritative for T17 parity. | P1 | required-now |
| Exception reporting | Report `exceptions_applied=<n>` and `exceptions_applied_ids=<ids>` when exceptions are used. | P1 | required-now |
| Transitional current violations | Policy may list only exact current violations that successor tasks own. | P1 | required-now |

### 2a) Initial Transitional Exception Inventory

The first implementation started from the source inventory below. Successor
tasks remove entries as their corresponding boundaries close; do not broaden
them into directory globs or method-count budgets.

| Exception ID | Kind | Exact Match | Successor Owner | Removal Task | Priority | Timing |
|---|---|---|---|---|---|---|

No router-port exceptions remain after `4-ui-readmodel-port-closure`; the
inventory is intentionally empty and must stay synchronized with
`tools/fitness/policy.json`.

For `allow-command-owned-ui-port-import` rows, the arrow notation above is
human-readable shorthand only. The canonical policy encoding is the split
`from`/`to` pair defined in §2b.

No full-bag exceptions remain after `2-router-dependency-slices`. The guard still
normalizes direct `UiRouterDependencies` references, re-exported references
through `routerContracts.ts`, and wrapper access through
`UiRouterEnvironment`/`environment.dependencies.*` to a
`<leaf-file>#UiRouterDependencies` identity instead of requiring a literal
`UiRouterDependencies` token in the leaf file. Future broad-bag leaf access must
fail as an unlisted violation unless a successor task intentionally adds a new
exact exception. No transitional exception is listed for `router.ts` because it
is an explicitly allowed composition/wiring path, not a leaf exception.

Allowed non-exception composition/wiring uses remain limited to
`src/v11/infrastructure/ui/router.ts`,
`src/v11/infrastructure/ui/routerContracts.ts`, and
`src/v11/infrastructure/ui/routerDependencies.ts`.

### 2b) Policy Encoding Contract

Use the existing fitness policy exception envelope without adding broad matching
semantics:

```json
{
  "id": "router-port-deps-task2-router-actions-001",
  "kind": "allow-full-dependency-bag",
  "owner": "architecture/ui-router",
  "reason": "Temporary broad dependency bag use retained until 2-router-dependency-slices introduces narrow router leaf capabilities.",
  "paths": [
    "src/v11/infrastructure/ui/routerActions.ts#UiRouterDependencies"
  ]
}
```

Rules:

1. For `allow-full-dependency-bag`, require exactly one `paths` entry in the
   form `<relative-file>#UiRouterDependencies`. The file path is the scanned
   leaf source file and the symbol part is the canonical broad-bag identity.
   The observed source may name `UiRouterDependencies` directly, import it
   through `routerContracts.ts`, or access the same full bag through a wrapper
   such as `UiRouterEnvironment.dependencies.*`, a destructured binding from
   `environment.dependencies`, or a local alias assigned from
   `environment.dependencies`; these forms normalize to the same
   `<relative-file>#UiRouterDependencies` exception identity. Exception
   application and unused-exception detection must compare against this
   normalized observed-violation identity. This applies symmetrically to any
   wrapper-only leaf file: an exception for
   `<that-file>#UiRouterDependencies` may apply when the file reaches
   `environment.dependencies.*`, and the same exception must be reported as
   unused when the file no longer reaches the broad bag. `routerActionDispatch.ts`
   is only the current inventory example, not a special-case carve-out.
2. For `allow-command-owned-ui-port-import`, require exact `from` and `to`
   source paths after resolving `.js` import specifiers to the matching `.ts`
   source file. This resolver is intentionally narrow: it supports only
   explicit relative file imports with `.js` specifiers that resolve to a single
   `.ts` file under the repository root, including same-directory imports such
   as `./localCommandContract.js` and cross-directory relative imports such as
   `../list/listCommandContract.js`; no-extension specifiers, `.ts` specifiers
   in source imports, index-directory imports, package
   re-exports, TypeScript path aliases, missing files, or ambiguous resolutions
   fail closed. Apply the command-owned target predicate to the unresolved
   specifier and available resolved candidates before deciding the failure mode:
   if the observed source import is command-owned or ambiguously command-owned,
   report it as an unlisted command-owned import violation with
   `COMMAND_OWNED_UI_PORT_IMPORT` and include resolver detail. When the
   unsupported or ambiguous edge appears only in an exception envelope, report it
   as malformed configuration with `INVALID_ROUTER_PORT_EXCEPTION`.
3. Reject malformed envelopes for router-port exceptions attached to the
   `ui_router_port_boundary` check only. For `allow-full-dependency-bag`, reject
   `*`, `**`, directory-only paths, missing `paths`, `paths` arrays whose length
   is not exactly one, any `paths` entry that does not end in
   `#UiRouterDependencies`, and mixed `paths` plus `from`/`to` envelopes. For
   `allow-command-owned-ui-port-import`, reject missing `from`/`to`,
   directory-only or globbed `from`/`to`, any `paths` field, and any import edge
   that cannot resolve to one exact source file. For all router-port exceptions,
   reject any exception kind outside the two router-port kinds above.
4. Treat an exception that does not match an observed normalized violation as a
   stale transitional approval that fails with
   `UNUSED_ROUTER_PORT_EXCEPTION`, not as malformed configuration and not as a
   warning.
5. Preserve the current `FitnessPolicyException` base fields from
   `tools/fitness/types.ts`; router-port exception parsing must reject missing
   or empty `id`, `owner`, or `reason` before applying either router-port
   envelope. Add typed parsing helpers inside the router-port check only to
   validate the two allowed router-port envelopes above.

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
| New unlisted command-owned import or unsupported observed command-owned resolver edge | fail | report file, import, and resolver detail when relevant | `COMMAND_OWNED_UI_PORT_IMPORT` | P1 | required-now |
| Exact transitional exception | pass with detail | report exception ID | `TRANSITIONAL_EXCEPTION_APPLIED` | P1 | required-now |
| Malformed or broad exception | fail | report invalid exception | `INVALID_ROUTER_PORT_EXCEPTION` | P1 | required-now |
| Unused exact exception | fail | report stale exception ID and expected normalized file/symbol or from/to edge | `UNUSED_ROUTER_PORT_EXCEPTION` | P1 | required-now |
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
| T2 | composition boundary allowed | fixture wiring/contract file at each explicitly allowed path, `src/v11/infrastructure/ui/router.ts`, `src/v11/infrastructure/ui/routerDependencies.ts`, and `src/v11/infrastructure/ui/routerContracts.ts`, uses `UiRouterDependencies` | check runs | report passes without exception for all allowed composition/wiring paths | P1 | required-now |
| T3 | command-owned port import fails | fixture `src/v11/shared/ports/uiRouter.ts` imports list/status/inbox command contracts | check runs | report fails with `COMMAND_OWNED_UI_PORT_IMPORT` | P1 | required-now |
| T4 | exact transitional exceptions pass | fixture has listed current violations, including a wrapper-only `routerActionDispatch.ts#UiRouterDependencies` exception whose source uses `UiRouterEnvironment.dependencies.*` without a literal `UiRouterDependencies` token | check runs | report passes, includes `exceptions_applied=<n>`, `exceptions_applied_ids=<ids>`, and includes `TRANSITIONAL_EXCEPTION_APPLIED` for applied exceptions | P1 | required-now |
| T5 | malformed broad exception fails | exception omits exact file/import, uses broad glob, uses an unsupported exception kind, has `paths.length !== 1`, mixes `paths` with `from`/`to`, omits `paths` for `allow-full-dependency-bag`, omits `from`/`to` for `allow-command-owned-ui-port-import`, omits or empties base `FitnessPolicyException` fields `id`/`owner`/`reason`, or tries to encode a numeric method-count budget as a router-port exception envelope | check runs | report fails with `INVALID_ROUTER_PORT_EXCEPTION` | P1 | required-now |
| T6 | policy integration passes current repo | checked out repo source contains only violations matched by the real current-task `tools/fitness/policy.json` exceptions and §2a inventory | `pnpm fitness:check:ci` runs against the repo root | check passes with explicit exception diagnostics including `exceptions_applied=<n>`, `exceptions_applied_ids=<ids>`, and `TRANSITIONAL_EXCEPTION_APPLIED`; §2a-vs-policy drift detection is covered by T17 | P1 | required-now |
| T7 | policy integration blocks new violation | isolated temporary fixture/source mutation adds an unlisted violation and uses a test-scoped policy/report path through the existing fitness test harness configuration, leaving the real repo policy unchanged | CI entrypoint runs against the fixture-scoped policy | command exits nonzero | P2 | required-now |
| T8 | unused exact exception fails | policy lists exact router-port exceptions that do not match observed normalized violations, including one direct `UiRouterDependencies` exception and one wrapper-normalized `<file>#UiRouterDependencies` exception after the fixture stops reading `environment.dependencies.*` | check runs | report fails with `UNUSED_ROUTER_PORT_EXCEPTION` for both stale exception forms | P1 | required-now |
| T9 | import specifier resolution is source-path exact | fixture `uiRouter.ts` imports both `./localCommandContract.js` and `../list/listCommandContract.js`, and exceptions `to` name the resolved `.ts` source paths | check runs | report applies both exceptions and reports their IDs | P1 | required-now |
| T10 | method-count budget cannot satisfy guard | policy or fixture provides a numeric method-count budget while a leaf imports/types `UiRouterDependencies` | check runs | report ignores the budget as proof and still fails with `FULL_UI_ROUTER_DEPENDENCY_BAG_USAGE`; budget-shaped router-port exception envelopes are covered by T5 as malformed config | P1 | required-now |
| T11 | wrapper broad-bag access fails | fixture leaf imports `UiRouterEnvironment` and reads `environment.dependencies.*`, destructures from `environment.dependencies`, or assigns `environment.dependencies` to a local alias without naming `UiRouterDependencies` directly | check runs | report fails with `FULL_UI_ROUTER_DEPENDENCY_BAG_USAGE` unless the exact file has a full-bag exception | P1 | required-now |
| T12 | command import resolver fails closed | fixture covers both observed-source resolver failures and exception-envelope resolver failures: no-extension source import, `.ts` source import, index-directory import, package re-export, TypeScript alias, missing resolved import target, or ambiguous `.js` to `.ts` resolution for a command-owned import edge | check runs | observed-source failures report `COMMAND_OWNED_UI_PORT_IMPORT` with resolver detail; malformed exception-envelope failures report `INVALID_ROUTER_PORT_EXCEPTION` | P1 | required-now |
| T13 | unreadable scanned file fails closed | policy `scope` is exercised in two subcases: one exact file-path scope entry points to a missing scanned source path, and one scope entry resolves to a present-but-unreadable scanned source path | check runs | each subcase fails with `ROUTER_PORT_SCAN_READ_FAILED` and reports the affected path | P1 | required-now |
| T14 | current-repo inventory reconciliation fails on drift | an isolated temporary copy of the repo source adds violations not represented in §2a / `tools/fitness/policy.json`, including a new full-bag violation and a new command-owned import from a scanned port file, and uses a test-scoped policy/report path through the existing fitness test harness configuration that leaves the real repo source and policy unchanged | `pnpm fitness:check:ci` runs against the isolated fixture root | command exits nonzero and reports the unlisted violation path/reason for both drift families | P1 | required-now |
| T15 | registry dispatches router-port check | `tools/fitness/checks/index.ts` registers `ui_router_port_boundary` in the shared check registry, with the dispatch assertion hosted in `tests/tools/fitness/fitnessCheckCi.test.ts` | `buildCheckReport` runs for the `ui_router_port_boundary` check ID | report comes from the router-port boundary check rather than the unknown-check path, proving the check ID is dispatchable by the fitness framework | P1 | required-now |
| T16 | existing UI contract boundary preserved | existing `ui_contract_boundary` fixtures and policy entries remain present while the router-port check is added | existing UI contract boundary tests run | existing `ui_contract_boundary` pass/fail behavior is unchanged | P1 | required-now |
| T17 | §2a inventory and policy exceptions stay synchronized | the §2a markdown table is parsed by its `Exception ID`, `Kind`, and `Exact Match` headers, and `tools/fitness/policy.json` configures router-port exceptions for `ui_router_port_boundary` | policy/inventory parity assertion runs in CI integration tests | the sorted §2a router-port exception IDs, kinds, and exact-match content match policy `paths[0]` or `from`/`to` exactly, including removal when successor tasks delete exceptions | P1 | required-now |
| T18 | re-exported full-bag use normalizes to leaf identity | fixture leaf imports or receives a `UiRouterDependencies` type through `routerContracts.ts` rather than directly from `uiRouter.ts` | check runs | report normalizes the observed violation to `<leaf-file>#UiRouterDependencies` and fails with `FULL_UI_ROUTER_DEPENDENCY_BAG_USAGE` unless that exact leaf identity has a full-bag exception | P1 | required-now |
| T19 | future port file command-owned import fails | fixture adds a new scanned file under `src/v11/shared/ports/**` other than `uiRouter.ts` that imports a command-owned target matching the §2 predicate | check runs | report fails with `COMMAND_OWNED_UI_PORT_IMPORT` unless the exact from/to edge has a command-owned import exception | P1 | required-now |

### 7) Acceptance Criteria

1. AC1: A router-port boundary check is registered in the fitness framework.
2. AC2: The check fails on full `UiRouterDependencies` usage outside approved
   composition/wiring boundaries.
3. AC3: The check fails on command-owned list/status/inbox imports through the
   UI router port unless an exact transitional exception is listed.
4. AC4: The current repo passes with named transitional exceptions only.
5. AC5: Guard diagnostics report applied exception IDs/counts.
6. AC6: `pnpm fitness:check:ci` runs the new check.
7. AC7: A numeric method-count budget cannot satisfy or bypass the broad-bag
   dependency guard.
8. AC8: Missing or unreadable scan inputs fail closed with
   `ROUTER_PORT_SCAN_READ_FAILED`.
9. AC9: Unsupported or ambiguous command-import source resolution fails closed.
10. AC10: Current-repo inventory drift is blocked until §2a and
    `tools/fitness/policy.json` are updated together.
11. AC11: Every router-port reason code in §4 has explicit test coverage and a
    traceable AC link.
12. AC12: The existing `ui_contract_boundary` check remains preserved while the
    new router-port check is added.
13. AC13: Exact transitional exceptions that no longer match an observed
    normalized violation fail closed as stale approvals.
14. AC14: Malformed or broad router-port exception envelopes fail closed before
    they can mask violations.

### 8) AC-Test Traceability

| AC | Covered by Tests |
|---|---|
| AC1 | T15 |
| AC2 | T1,T2,T10,T11,T14,T18 |
| AC3 | T3,T4,T9,T14 |
| AC4 | T4,T6 |
| AC5 | T4,T6 |
| AC6 | T6,T7 |
| AC7 | T10 |
| AC8 | T13 |
| AC9 | T12 |
| AC10 | T14,T17 |
| AC11 | T1,T3,T4,T5,T6,T8,T9,T10,T11,T12,T13,T14,T18,T19 |
| AC12 | T16 |
| AC13 | T8 |
| AC14 | T5 |

### 8a) Reason-Code Coverage

| Reason Code | Covered by Tests | Primary AC Link |
|---|---|---|
| `FULL_UI_ROUTER_DEPENDENCY_BAG_USAGE` | T1,T10,T11,T14,T18 | AC2,AC7,AC10 |
| `COMMAND_OWNED_UI_PORT_IMPORT` | T3,T12,T14,T19 | AC3,AC9,AC10 |
| `TRANSITIONAL_EXCEPTION_APPLIED` | T4,T6,T9 | AC3,AC4,AC5,AC11 |
| `INVALID_ROUTER_PORT_EXCEPTION` | T5,T12 | AC9,AC11,AC14 |
| `UNUSED_ROUTER_PORT_EXCEPTION` | T8 | AC11,AC13 |
| `ROUTER_PORT_SCAN_READ_FAILED` | T13 | AC8 |

## L2 - Implementation Notes

1. Prefer a dedicated check file over overloading `ui-contract-boundary`; this
   keeps browser contract import rules separate from router-port architecture
   rules.
2. Prefer TypeScript AST or compiler import parsing for imports, symbol uses,
   destructuring, and local aliases. Source-text scanning is acceptable only for
   fixture-proven cases where it preserves the same exactness for wrapper and
   alias access.
3. Resolve `.js` import specifiers found in TypeScript source to their matching
   `.ts` source paths before comparing `allow-command-owned-ui-port-import`
   exceptions, so policy entries remain source-file exact rather than emitted
   module-specifier exact.
4. Keep exception IDs named for the successor task that removes them where
   practical.

## Assumptions

1. `src/v11/infrastructure/ui/routerDependencies.ts`,
   `src/v11/infrastructure/ui/routerContracts.ts`, and
   `src/v11/infrastructure/ui/router.ts` remain the only allowable
   composition/wiring paths for unexceptioned `UiRouterDependencies` use during
   transition.
2. Router leaf modules include route/action/detail/event modules under
   `src/v11/infrastructure/ui/**` that are not composition/wiring files.

## Open Questions

1. None blocking.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Further harden AST/compiler-backed extraction if new aliasing patterns appear beyond the required destructuring/local-alias cases. | tooling | P3 | later-hardening | implementation note | Extend parser-backed import/reference extraction. |

## Finalization Summary

1. Contract-boundary override: yes, because this task changes architecture
   fitness policy/report behavior.
2. Complexity-risk decision: risk score 4, single task allowed.
3. Contract-dense decision: no.
4. Control model inherited cleanly from the parent plan.
5. Canonical matrix: N/A.
