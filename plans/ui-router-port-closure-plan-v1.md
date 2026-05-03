---
artifact_type: plan
artifact_id: plan_ui_router_port_closure_v1
plan_id: ui-router-port-closure-plan-v1
created_on: "2026-05-03"
title: "UI Router Port Closure Plan"
status: approved
plan_status: in_progress
prd_ref: null
owners:
  - "felho"
task_order:
  - 1-router-fitness-guards
  - 2-router-dependency-slices
  - 3-ui-action-dto-closure
  - 4-ui-readmodel-port-closure
  - 5-router-port-cleanup
active_task_id: 4-ui-readmodel-port-closure
last_completed_task_id: 3-ui-action-dto-closure
archive_group: 2026-05-03-ui-router-port-closure-plan-v1
task_tracker:
  - task_id: 1-router-fitness-guards
    task_path: plans/archive/tasks/1-router-fitness-guards.md
    status: archived
    notes: "Completed via implementation bubble 1-router-fitness-guards-impl; merged at 7dc3bcd9 and archived."
  - task_id: 2-router-dependency-slices
    task_path: plans/archive/tasks/2026-05-03-ui-router-port-closure-plan-v1/2-router-dependency-slices.md
    status: archived
    notes: "Completed via implementation bubble 2-router-dependency-slices-impl; merged at a4890b2f and archived."
  - task_id: 3-ui-action-dto-closure
    task_path: plans/archive/tasks/2026-05-03-ui-router-port-closure-plan-v1/3-ui-action-dto-closure.md
    status: archived
    notes: "Completed via implementation bubble 3-ui-action-dto-closure-impl; merged at d31df79 and archived."
  - task_id: 4-ui-readmodel-port-closure
    task_path: plans/tasks/4-ui-readmodel-port-closure.md
    status: implementable
    notes: "Document bubble 4-ui-readmodel-port-closure-doc closed and merged at 79109f64; implementation bubble may start."
  - task_id: 5-router-port-cleanup
    task_path: null
    status: not_created
    notes: "Remove or localize transitional composite aliases, tighten guards, and update review/docs state."
---

# Plan: UI Router Port Closure

## Objective

Resolve the modularity-review finding that `UiRouterDependencies` is a broad
capability-bag port by making the UI router dependency boundary capability
shaped, consumer sliced, and UI-contract owned.

The plan closes the issue in two layers:

1. router modules must stop depending on one full dependency bag when they only
   need a narrow capability slice;
2. the router port and UI action/read-model contracts must stop carrying
   command-owned or internal model shapes where an explicit UI DTO is the real
   boundary contract.

## Done Definition

1. Router leaf modules do not import or type against the full
   `UiRouterDependencies` composite.
2. Any remaining full router dependency composite is restricted to
   composition/wiring files such as router contracts, dependency resolution, or
   top-level router creation.
3. `src/v11/shared/ports/uiRouter.ts` no longer imports command-owned
   list/status/inbox view contracts from `src/v11/shared/{list,status,inbox}/**`.
4. UI action result contracts no longer expose raw `BubbleStateSnapshot` or full
   `ProtocolEnvelope` where the UI only needs projected action state/event DTOs.
5. Fitness/source guards fail if the broad bag or command-owned type leakage is
   reintroduced.
6. The final guard state has zero transitional exceptions or allowlisted current
   violations for the UI router port closure rules.
7. Existing UI router behavior, API request/response behavior, frontend type
   parity, and UI store/API behavior remain covered by targeted tests.

## Capability Closure

| Capability Claim | Closure Classification | Activation Path | Repo-Provided Boundary | External Prerequisites | Last-Mile Proof |
|---|---|---|---|---|---|
| The UI router dependency boundary is guarded against broad-bag regression. | foundation_only | `pnpm fitness:check:ci` and targeted fitness/source tests | Repo ships tests/fitness rules and refactored TypeScript surfaces | None | `1-router-fitness-guards` introduces ratcheting guards that pass with explicit known exceptions; `5-router-port-cleanup` proves zero remaining exceptions. |

## Guiding Principles

1. Business invariant: the browser UI and backend router must share explicit
   UI-facing contracts; internal command/runtime model changes should not
   silently widen the UI router port.
2. Control model: `src/contracts/ui/**` owns UI/API-facing DTO shape;
   `src/v11/shared/ports/**` owns capability dependency contracts;
   `src/v11/infrastructure/ui/**` owns HTTP routing and adapter wiring.
3. Read-path rule: UI router leaf modules may read only the dependency methods
   they actually need through narrow local or exported slice types. UI/browser
   types must read canonical UI contracts from `src/contracts/ui/**` or approved
   compatibility barrels.
4. Forbidden fallback: do not solve the issue by adding a numeric method-count
   threshold only. Do not keep full `UiRouterDependencies` in leaf modules as a
   convenience type. Do not move command-owned shapes into `ports` under new
   names without making their UI contract ownership explicit.
5. Allowed resolution path: keep a transitional composite type only at
   composition/wiring boundaries while consumers migrate to slices. Use explicit
   projection functions from application/internal results into UI DTOs when the
   returned shape changes. Early fitness guards may use explicit named
   transitional exceptions only to keep the suite green while known current
   violations are removed.
6. Missing-data rule: if a UI DTO cannot carry an internal field losslessly, the
   task that introduces the DTO must choose an explicit optional/null/omitted
   contract and cover it with tests; no heuristic frontend fallback may recreate
   internal state.
7. Sequencing / boundary note:
   - producer-first rule: add guard/characterization coverage before broad
     structural refactors, then close DTO contracts before tightening final
     cleanup guards.
   - downstream consume families that remain separate: backend router modules,
     canonical UI contracts, frontend API/store/components, and fitness/source
     guards.
   - cleanup/recovery timing: final alias removal and docs updates are deferred
     to the cleanup task after DTO/read-model closure lands.

## Canonical Contract Anchors

1. Source-of-truth anchors:
   - `docs/architecture/v11-ports-governance.md`
   - `docs/modularity-review/2026-05-02-modularity-review.md`
   - `src/v11/shared/ports/uiRouter.ts`
   - `src/contracts/ui/uiActions.ts`
   - `src/contracts/ui/uiReadModel.ts`
   - `src/v11/infrastructure/ui/routerDependencies.ts`
   - `src/v11/infrastructure/ui/routerContracts.ts`
   - `tests/contracts/uiContractParity.types.ts`
   - `tests/contracts/uiContractTransitSource.test.ts`
   - `tests/tools/fitness/uiContractBoundary.test.ts`
2. Closed canonical elements / terms:
   - `src/contracts/ui/**` is the canonical UI/backend contract surface.
   - `src/v11/shared/ports/**` is a capability boundary, not a place to park
     infrastructure or command-owned implementation details.
   - broad capability bags with unrelated methods are explicitly discouraged by
     the ports governance document.
3. Explicitly authorized reinterpretation: the original review text said the
   port had 14 methods and directly exposed `BubbleStateSnapshot` and
   `ProtocolEnvelope` from `uiRouter.ts`. Current code has more methods and
   routes those raw types mainly through canonical `src/contracts/ui/uiActions.ts`.
   The plan treats that as an updated location of the same coupling concern, not
   as proof that the issue is closed.
4. Downstream task impact: task 1 should guard the current architectural intent
   without relying on the stale `14 methods` statement. Tasks 3 and 4 own the
   actual contract-shape closure needed before task 5 can tighten final guards.

## Current Status

### Completed Work

1. `src/contracts/ui/**` already exists and many UI contracts are now canonical
   backend-owned DTO surfaces.
2. Existing contract parity/source tests already check canonical UI contract
   ownership and frontend/backend type parity for many read-model and action
   types.
3. The current tree has enough router/API/store tests to characterize endpoint
   behavior before refactoring.
4. `1-router-fitness-guards` added ratcheting UI router port fitness guards,
   policy entries, and targeted regression tests with explicit transitional
   exceptions for known broad-bag and command-owned import violations.
5. `2-router-dependency-slices` introduced router leaf dependency slices and
   archived after merge.
6. `3-ui-action-dto-closure` replaced raw action result exposure with UI action
   DTOs and archived after merge.

### Open Work

1. `src/v11/shared/ports/uiRouter.ts` still imports list/status/inbox
   command-owned view/input types.
2. The retained router composite and remaining transitional aliases still need
   final cleanup after DTO/read-model closure lands.
3. Transitional fitness exceptions remain for known current violations; later
   tasks must reduce that exception set to zero.

Progress update (2026-05-03): implementation bubble `1-router-fitness-guards-impl`
closed and merged after satisfying the configured review gate. Task
`1-router-fitness-guards` is archived and the active task advanced to
`2-router-dependency-slices`.

Progress update (2026-05-03): implementation bubble
`3-ui-action-dto-closure-impl` closed and merged at `d31df79`; task
`3-ui-action-dto-closure` is archived and the active task advanced to
`4-ui-readmodel-port-closure`.

### Deferred / Future Work

1. A separate workspace package for UI contracts remains out of scope unless a
   later packaging/distribution plan introduces external consumers.
2. Broader domain/shared placement cleanup is out of scope; this plan only
   touches the UI router port and its contract surfaces.

## Progress / Phase Summary

1. Foundation: make the architectural rule testable.
2. Slice migration: refactor consumers to prove the dependency split is real.
3. Contract closure: replace raw model exposure with UI DTO projections.
4. Cleanup: remove transitional escape hatches and update documentation.

## Open Task List

| Task ID | Task Path | Purpose | Depends On | Closes Gap | Status |
|---|---|---|---|---|---|
| `1-router-fitness-guards` | `plans/archive/tasks/1-router-fitness-guards.md` | Add ratcheting architectural guards that focus on consumer slicing and forbidden type imports, not an arbitrary method-count threshold; the guards must pass initially with explicit known transitional exceptions. | N/A | G1, G5 | archived |
| `2-router-dependency-slices` | `plans/archive/tasks/2026-05-03-ui-router-port-closure-plan-v1/2-router-dependency-slices.md` | Introduce narrow dependency slice types for router leaf modules and keep any composite only at composition/wiring boundaries. | `1-router-fitness-guards` | G1, G2 | archived |
| `3-ui-action-dto-closure` | `plans/archive/tasks/2026-05-03-ui-router-port-closure-plan-v1/3-ui-action-dto-closure.md` | Replace raw action result `BubbleStateSnapshot`/`ProtocolEnvelope` exposure with explicit UI-facing action state/event DTOs and projection tests. | `2-router-dependency-slices` | G4 | archived |
| `4-ui-readmodel-port-closure` | `plans/tasks/4-ui-readmodel-port-closure.md` | Move list/status/inbox router-facing shapes to canonical UI read-model ownership and remove command-owned imports from the UI router port. | `2-router-dependency-slices` | G3 | implementable |
| `5-router-port-cleanup` | `null` | Remove or localize transitional composite aliases, tighten guard allowlists, update modularity-review status, and verify no stale broad-bag path remains. | `3-ui-action-dto-closure`, `4-ui-readmodel-port-closure` | G1-G5 | not_created |

## Coverage Map

| Plan Gap | Closed By | Notes |
|---|---|---|
| G1: Router leaf modules depend on full `UiRouterDependencies`. | `1-router-fitness-guards`, `2-router-dependency-slices`, `5-router-port-cleanup` | Guard first with explicit known exceptions, then refactor, then remove all exceptions after transition. |
| G2: The dependency interface mixes unrelated query, mutation, workspace, runtime-session, timeline, and close capabilities. | `2-router-dependency-slices`, `5-router-port-cleanup` | The real proof is consumer slices, not method-count reduction alone. |
| G3: `uiRouter.ts` imports command-owned list/status/inbox types. | `1-router-fitness-guards`, `4-ui-readmodel-port-closure` | Guard should initially pass with explicit known exceptions or be introduced as fixture-only until the closure task; final state must have no exceptions. |
| G4: UI action contracts expose raw internal model/event shapes. | `3-ui-action-dto-closure` | Requires projection tests and frontend/API/store parity updates. |
| G5: No regression guard encodes the intended port shape. | `1-router-fitness-guards`, `5-router-port-cleanup` | First guard should avoid arbitrary numeric thresholds and keep CI green via named transitional exceptions; final guard must prove exception_count=0. |

## Dependencies and Order

1. `1-router-fitness-guards` comes first because it defines the quality filter:
   leaf modules must not consume the full composite, and port contracts must not
   import command-owned view types once the closure task lands. This task must
   not make the current suite red; it should use explicit named transitional
   exceptions for known current violations and fail only on new unlisted
   violations.
2. `2-router-dependency-slices` comes before DTO closure because consumer
   slicing reduces the blast radius and reveals each module's actual contract
   needs.
3. `3-ui-action-dto-closure` and `4-ui-readmodel-port-closure` can run after
   task 2 and may be implemented independently if their touched files do not
   overlap. If both touch the same contract exports, serialize them.
4. `5-router-port-cleanup` must run last because it removes compatibility
   aliases and tightens guard allowlists only after all consumers have migrated.
   The plan is not done until this task proves there are no transitional
   exceptions left for the router-port closure guards.

## Risks and Assumptions

1. Contract-shape changes in tasks 3 and 4 may require frontend fixture and store
   updates; router behavior tests alone are not sufficient.
2. Source-text fitness guards are useful here, but they should target ownership
   and consumer boundaries rather than brittle method-count metrics. During the
   transition they must report explicit named exceptions, not hide violations in
   broad globs.
3. Some transitional composite type may remain temporarily in
   `routerContracts.ts`, `routerDependencies.ts`, or `router.ts`; that is
   acceptable only as a composition boundary, not a leaf-module dependency.
4. Existing `toMatchObject` tests may miss extra leaked fields, so tasks that
   change response shape should add strict equality or absence assertions for
   the new DTO boundary.
5. This plan assumes no public external consumer beyond the in-repo UI package.
6. A task may leave transitional exceptions only if the plan tracker still has a
   later task that owns removing them; the final cleanup task cannot complete
   with any remaining exception.

## Validation Strategy

1. For every task:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm fitness:check:ci`
2. For router dependency and endpoint behavior changes:
   - `pnpm exec vitest run tests/core/ui/router.test.ts tests/core/ui/server.integration.test.ts tests/core/ui/eventsScan.test.ts`
3. For UI contract ownership and parity changes:
   - `pnpm exec vitest run tests/contracts/uiContractParity.types.ts tests/contracts/uiContractTransitSource.test.ts tests/tools/fitness/uiContractBoundary.test.ts`
4. For frontend contract consumers:
   - `pnpm --dir ui test`
5. For source/runtime changes under `src/**`, rebuild runtime artifacts before
   bubble lifecycle commands:
   - `pnpm build`
6. Before declaring the whole plan complete:
   - run the full local verification order required by the repo for direct
     non-docs source changes, or report exactly which checks were delegated to
     bubble validation evidence.
   - verify the router-port closure guard reports zero transitional exceptions
     or allowlisted current violations.
