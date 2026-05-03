---
artifact_type: task
artifact_id: task_ui_router_port_closure_2_router_dependency_slices_v1
task_family_id: router-dependency-slices
sequence_key: "2"
task_id: 2-router-dependency-slices
title: "Router Dependency Slices"
status: approved
phase: phase2
target_files:
  - src/v11/shared/ports/uiRouter.ts
  - src/v11/infrastructure/ui/routerContracts.ts
  - src/v11/infrastructure/ui/routerDependencies.ts
  - src/v11/infrastructure/ui/routerActions.ts
  - src/v11/infrastructure/ui/routerActionDispatch.ts
  - src/v11/infrastructure/ui/routerActionErrorMapping.ts
  - src/v11/infrastructure/ui/routerBubbleDetail.ts
  - src/v11/infrastructure/ui/routerRequest.ts
  - tests/core/ui/router.test.ts
  - tests/core/ui/server.integration.test.ts
  - tests/tools/fitness/uiRouterPortBoundary.test.ts
  - tests/tools/fitness/fitnessCheckCi.test.ts
  - tools/fitness/policy.json
target_files_role: implementation_write_targets
prd_ref: null
plan_ref: plans/ui-router-port-closure-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-03-ui-router-port-closure-plan-v1
---

# Task: Router Dependency Slices

## L0 - Policy

### Goal

Refactor UI router leaf modules so they depend on narrow capability slices
instead of the full `UiRouterDependencies` composite, while preserving runtime
behavior and keeping any remaining composite use at composition or wiring
boundaries.

### Domain / Control Model Summary

1. Business invariant: router leaf modules must express only the capabilities
   they need so internal command/runtime dependency growth cannot silently widen
   unrelated UI router consumers.
2. Control model: `src/v11/shared/ports/uiRouter.ts` owns capability contracts;
   `src/v11/infrastructure/ui/routerDependencies.ts`,
   `routerContracts.ts`, and top-level router creation own dependency
   composition; leaf modules own local slice consumption only.
3. Read-path rule: leaf modules may read dependency methods through explicit
   slice types or local environment types, not through the full composite.
4. Forbidden fallback: do not keep `UiRouterDependencies` in leaf modules as a
   convenience type, do not rename the broad bag into an equally broad wrapper,
   and do not satisfy the guard by broadening transitional exceptions.
5. Allowed resolution path: introduce exported or local capability slice types
   for list/detail/action/error-mapping needs, then adapt environment/input
   types so call sites continue to pass the composed dependency object.
6. Missing-data rule: if a leaf needs a capability not present in its slice, add
   the narrow capability explicitly rather than reaching back to the full
   composite.
7. Phase boundary: this task owns dependency-slice closure for router leaves; it
   does not own UI action DTO closure, list/status/inbox read-model relocation,
   or final zero-exception cleanup.

### Plan Linkage

1. Parent plan gap closed: G1 and G2 for router leaf dependency consumption.
2. Depends on: `1-router-fitness-guards`.
3. Unlocks / impacts successors: `3-ui-action-dto-closure`,
   `4-ui-readmodel-port-closure`, and `5-router-port-cleanup`.
4. Task-list impact: refines planned `2-router-dependency-slices`; no
   replacement.
5. Inherited validation / exit expectation: router leaf modules no longer type
   against the full composite, and fitness exceptions for broad leaf use are
   reduced or removed without weakening the guard.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `docs/architecture/v11-ports-governance.md`
   - `docs/modularity-review/2026-05-02-modularity-review.md`
   - `src/v11/shared/ports/uiRouter.ts`
   - `src/v11/infrastructure/ui/routerContracts.ts`
   - `src/v11/infrastructure/ui/routerDependencies.ts`
   - `tests/tools/fitness/uiRouterPortBoundary.test.ts`
   - `tools/fitness/policy.json`
2. Canonical elements: `src/v11/shared/ports/**` owns capability dependency
   boundaries; `src/contracts/ui/**` remains the UI/API DTO owner.
3. Guard elements: router-port fitness checks and transitional exceptions for
   broad dependency usage.
4. Compat elements: full `UiRouterDependencies` may remain only where
   composition, defaults, or top-level router wiring require a complete
   dependency set.
5. Forbidden reinterpretations: do not move command-owned list/status/inbox
   shapes as part of this task and claim G3 closure; that belongs to task 4.

### Scope Reality / Shape Proof

1. Inspected call sites: `routerActions.ts`, `routerBubbleDetail.ts`,
   `routerActionErrorMapping.ts`, `routerActionDispatch.ts`,
   `routerContracts.ts`, and `routerDependencies.ts`.
2. Actual touched scope: consumer-family alignment for router dependency
   contracts.
3. Mutation entrypoints in scope: N/A; the router action handlers call existing
   dependency methods but this task must not change lifecycle command behavior.
4. Hidden scope ruled out: no DTO shape replacement, no list/status/inbox
   contract ownership move, no runtime lifecycle state-machine changes.
5. Why the declared task shape matches reality: the work changes type
   boundaries and dependency consumption surfaces while preserving the same
   runtime dependency object at composition boundaries.

### Authority Boundary Map

1. Authority producer: `UiRouterDependencies` and new slice types in the UI
   router port/contracts.
2. Stored authority: TypeScript type declarations and fitness policy.
3. In-scope consumers: router leaf modules and router tests that compile
   against those environment types.
4. Out-of-scope consumers: frontend UI package, action DTO projection logic,
   list/status/inbox command API ownership, and final cleanup guard tightening.
5. Export surfaces closed in this phase: narrow dependency slices for router
   leaves; the full composite remains composition-only.

### Baseline Preservation

1. Must-preserve behaviors: existing UI HTTP routes, action dispatch behavior,
   error mapping, bubble detail loading, timeline/list/detail responses, and
   dependency default resolution.
2. Allowed resolution paths: pass the composed dependency object into leaf
   functions through narrower structural types, or split environment interfaces
   by handler family.
3. Forbidden regression interpretations: removing a handler path, dropping a
   dependency call, changing error mapping fallback behavior, or changing API
   response shape is not authorized by this task.
4. Replacement proof required if removed: any removed branch or dependency call
   must be proven unreachable by existing tests and explicitly justified in the
   implementation bubble.

### In Scope

1. Introduce narrow router dependency slice types for leaf modules.
2. Update `routerActions.ts`, `routerBubbleDetail.ts`, and
   `routerActionErrorMapping.ts` so their environment types depend only on the
   needed slices.
3. Keep `CreateUiRouterInput`, `UiRouterEnvironment`,
   `resolveUiRouterDependencies`, and default dependency wiring able to compose
   the full dependency object.
4. Update router-port fitness policy/tests to remove or reduce the broad leaf
   dependency exceptions covered by this task.
5. Add or update targeted tests that prove behavior is unchanged while the
   broad-bag dependency path is closed for leaves.

### Out of Scope

1. Replacing raw action result `BubbleStateSnapshot` or `ProtocolEnvelope`
   exposure.
2. Moving list/status/inbox router-facing shapes to canonical UI read-model
   ownership.
3. Removing the full composite from composition/wiring boundaries.
4. Tightening final guard allowlists to zero transitional exceptions.
5. Changing Pairflow lifecycle command semantics.

### Safety Defaults

1. If a handler needs an unmodeled capability, add the capability to the
   smallest correct slice and cover it with tests.
2. If a slice would become a broad wrapper of unrelated methods, split it by
   handler family instead.
3. If a behavior-preservation test fails, treat it as an implementation blocker
   rather than adjusting expectations.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts: internal TypeScript dependency contracts and fitness
   policy diagnostics.
3. Runtime API contracts: preserved.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `6`
8. Split decision: keep as one bounded consumer-family alignment task because
   the work is limited to router dependency type boundaries plus guard
   exception reduction; DTO/read-model closure remains in successor tasks.

## L1 - Implementation Contract

### Call-Site Matrix

| ID | Surface | Current Coupling | Required Slice Outcome |
|---|---|---|---|
| CS1 | `routerActions.ts` | Uses `UiRouterDependencies` through `RouterActionEnvironment`. | Environment depends on list, detail/timeline, and action-dispatch/error-mapping slices only as needed. |
| CS2 | `routerBubbleDetail.ts` | Uses full composite for status, inbox, and runtime-session reads. | Detail loader depends on a `BubbleDetail`-sized read slice. |
| CS3 | `routerActionErrorMapping.ts` | Uses full composite so conflict mapping can load detail. | Error mapper depends only on the detail-loading slice needed for conflict enrichment. |
| CS4 | `routerActionDispatch.ts` | Already has action method access through environment. | May keep or refine a narrow action-dispatch slice; must not widen leaf typing. |
| CS5 | `routerContracts.ts` / `routerDependencies.ts` | Composition boundary exposes `Partial<UiRouterDependencies>` and resolved full dependencies. | Full composite remains allowed here as composition/wiring. |

### Data and Interface Contract

| Contract | Rule |
|---|---|
| Slice naming | Use explicit capability names that describe the consumer family, not generic aliases such as `RouterDeps`. |
| Full composite | Allowed only in composition/wiring surfaces: `routerContracts.ts`, `routerDependencies.ts`, `router.ts`, and default dependency construction. |
| Leaf imports | Router leaf modules must not import or type against `UiRouterDependencies`. |
| Structural compatibility | The existing composed dependency object must remain assignable to every narrow slice. |
| Unknown capabilities | A leaf cannot access capabilities outside its declared slice. |

### Canonical Contract Matrix

| Matrix ID | Owner | Allowed Members | Allowed Consumers | Forbidden Use |
|---|---|---|---|---|
| RDS1 | Composition dependency composite | All UI router dependency methods needed to construct a complete router environment. | `routerContracts.ts`, `routerDependencies.ts`, `router.ts`, default dependency wiring, and tests that construct full router inputs. | Direct typing in leaf modules that only need a subset. |
| RDS2 | Bubble list/resource read slice | `listBubbles`, `readBubbleTimeline`, and the detail-loading capabilities actually used by the resource handler. | `routerActions.ts` resource/list handlers and structurally compatible composed dependencies. | Action mutation dispatch or unrelated lifecycle methods. |
| RDS3 | Bubble detail read slice | `getBubbleStatus`, `getBubbleInbox`, and `readRuntimeSessionsRegistry`. | `routerBubbleDetail.ts` and error-mapping enrichment paths that load detail. | Full composite access, mutation methods, or DTO/read-model ownership moves. |
| RDS4 | Bubble action dispatch slice | `startBubble`, `emitApprove`, `emitRequestRework`, `emitHumanReply`, `resumeBubble`, `commitBubble`, `mergeBubble`, `openBubble`, `attachBubble`, `updateBubbleReviewPolicy`, `stopBubble`, `restartBubble`, and `deleteBubble` as required by dispatch. | `routerActionDispatch.ts` and structurally compatible router environments. | List/detail-only handlers consuming mutation capabilities. |
| RDS5 | Conflict/error enrichment slice | The minimum detail-loading capability needed to map current state into conflict responses. | `routerActionErrorMapping.ts`. | Reconstructing lifecycle state from errors when detail loading fails. |

Canonical matrix rule: implementation must update this matrix first if a slice
boundary changes, then align the call-site matrix, data/interface rows, tests,
and acceptance criteria to the same slice ownership.

### Ownership and Deferred Semantics

1. This task owns dependency slice contracts and router leaf migration.
2. This task records which capability each leaf may consume, but it does not
   reinterpret command-owned list/status/inbox data models.
3. Successor task 3 owns UI action DTO replacement.
4. Successor task 4 owns read-model contract relocation for list/status/inbox.
5. Successor task 5 owns final guard allowlist cleanup and any remaining
   composition-only alias removal.
6. Forbidden inference: a leaf compiling against a narrow slice does not prove
   DTO closure, read-model closure, or final zero-exception cleanup.

### Side Effects Contract

1. Runtime side effects are unchanged.
2. Dependency default loading remains lazy and equivalent.
3. No lifecycle command invocation order may change.
4. No new persistence or file-system side effects are introduced.

### Error and Fallback Contract

1. Existing API error mapping behavior is preserved.
2. Conflict enrichment may still attempt to load current bubble detail and fall
   back to `null` on load failure as current code does.
3. No new heuristic fallback may reconstruct missing dependency behavior.
4. Type-level missing capability failures should surface at compile time.

### Shared Contract Compatibility

1. Current consumers: router creation, router request/action/detail/error
   modules, tests, and default dependency construction.
2. Additive vs breaking decision: additive for composition callers; internal
   leaf types are intentionally narrowed.
3. Alignment ownership: this task updates in-repo router consumers only.
4. Out-of-scope consumers: frontend DTO contracts and command-owned read-model
   type ownership.

### Mirrored Surface Checklist

When any dependency slice row changes, update all applicable mirrors:

| Surface | Must Stay Aligned With |
|---|---|
| L0 Domain / Control Model Summary | RDS1-RDS5 ownership and forbidden fallback rules |
| L1 Call-Site Matrix | RDS2-RDS5 consumer-to-slice mapping |
| L1 Data and Interface Contract | RDS1-RDS5 allowed/forbidden use |
| L1 Shared Contract Compatibility | RDS1 composition compatibility and internal narrowing decision |
| L1 Test Matrix | Broad-bag guard coverage and behavior-preservation tests for the changed slice |
| Acceptance Criteria | No broad leaf usage, composition-only full composite, and updated fitness exceptions |

### Closure-Budget Summary

1. Buckets touched: shared_contract, internal_execution_consumers, guard policy.
2. Collapsed closures: dependency-slice type introduction plus router leaf
   migration because they are the same consumer-family alignment.
3. Deferred closures: action DTO closure, read-model ownership closure, final
   zero-exception cleanup.
4. Bounded-task proof: no producer behavior or lifecycle state-machine behavior
   changes are required to close broad-bag leaf consumption.

### Test Matrix

| ID | Scenario | Command / Surface | Required Now |
|---|---|---|---|
| T1 | Type boundary compiles after leaf slice migration. | `pnpm typecheck` | yes |
| T2 | Router API behavior remains unchanged. | `pnpm exec vitest run tests/core/ui/router.test.ts tests/core/ui/server.integration.test.ts tests/core/ui/eventsScan.test.ts` | yes |
| T3 | Fitness guard rejects broad leaf `UiRouterDependencies` usage. | `pnpm exec vitest run tests/tools/fitness/uiRouterPortBoundary.test.ts tests/tools/fitness/fitnessCheckCi.test.ts` | yes |
| T4 | CI fitness check passes with updated exception set. | `pnpm fitness:check:ci` | yes |
| T5 | Full repo validation remains green before merge. | `pnpm test` | yes |

### Acceptance Criteria

1. No router leaf module imports or types against `UiRouterDependencies`.
2. `UiRouterDependencies` remains available only at approved composition or
   wiring boundaries.
3. Fitness policy no longer carries broad leaf exceptions that this task was
   supposed to remove.
4. Existing UI router tests pass without response-shape expectation changes.
5. `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, targeted router and
   fitness tests, `pnpm test`, and `pnpm build` pass in the implementation
   bubble evidence.

## L2 - Notes

### Implementation Notes

1. Prefer exported slice types in `uiRouter.ts` when more than one module needs
   the same capability family.
2. Prefer local environment type narrowing when a slice is used by one module
   only and exporting it would add noise.
3. Keep `Partial<UiRouterDependencies>` on `CreateUiRouterInput` unless a
   narrower public override contract is proven safe for all tests.

### Assumptions

1. Existing structural typing allows passing the composed dependency object to
   narrower slices without runtime adapters.
2. Task 1 guard behavior is the source for which broad leaf exceptions should
   be removed here.

### Open Questions

None.

### Approval Provenance

Approved for document-bubble routing by `CreatePairflowSpec` `ReviewSpec`
task-mode in the `ExecutePairflowPlan` route ledger after the refreshed task
artifact added the canonical dependency-slice matrix and mirrored-surface
checklist.

### Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Consider splitting public override input into named partial slice groups. | contract | later-hardening | after task 5 | CreateTask | Evaluate only after all DTO/read-model closures are complete. |
