---
artifact_type: task
artifact_id: task_ui_router_port_closure_5_router_port_cleanup_v1
task_family_id: router-port-cleanup
sequence_key: "5"
task_id: 5-router-port-cleanup
title: "Router Port Cleanup"
status: approved
phase: phase5
target_files:
  - src/v11/shared/ports/uiRouter.ts
  - src/v11/infrastructure/ui/routerContracts.ts
  - src/v11/infrastructure/ui/routerDependencies.ts
  - src/v11/infrastructure/ui/routerActionDispatch.ts
  - src/v11/infrastructure/ui/routerActions.ts
  - src/v11/infrastructure/ui/routerBubbleDetail.ts
  - tests/contracts/uiContractParity.types.ts
  - tests/core/ui/router.test.ts
  - tests/tools/fitness/uiRouterPortBoundary.test.ts
  - tests/tools/fitness/fitnessCheckCi.test.ts
  - tools/fitness/checks/ui-router-port-boundary.ts
  - tools/fitness/policy.json
  - docs/modularity-review/2026-05-02-modularity-review.md
  - docs/architecture/v11-ports-governance.md
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

# Task: Router Port Cleanup

## L0 - Policy

### Goal

Remove the remaining transitional UI router broad-bag shape by replacing
leaf-consumer access to the full `UiRouterDependencies` composite with explicit
capability slices, then tighten the UI router port guard and modularity-review
status so the final plan state has zero transitional router-port exceptions and
no stale broad-bag escape path.

### Domain / Control Model Summary

1. Business invariant: router leaf modules should depend only on the capability
   slice they actually use; the full UI router composite is a wiring artifact,
   not a leaf-module contract.
2. Control model: `src/v11/shared/ports/uiRouter.ts` owns capability contracts;
   `src/v11/infrastructure/ui/routerDependencies.ts` owns composition and
   default wiring; router leaf modules consume named slices.
3. Read-path rule: UI/API DTO contracts remain owned by `src/contracts/ui/**`;
   this cleanup must not reopen action DTO or read-model DTO semantics closed by
   tasks 3 and 4.
4. Forbidden fallback: do not solve the issue by increasing method-count
   budgets, adding new policy exceptions, or hiding the full composite behind
   another broad alias with the same unrelated methods.
5. Allowed resolution path: keep a full composite only at composition/wiring
   boundaries when needed for dependency resolution; export narrow query,
   detail, timeline, and action-dispatch dependency slices for router leaf
   modules.
6. Missing-data rule: this task changes type boundaries and guard coverage only;
   if runtime data is missing, preserve existing route behavior and existing
   UI DTO null/optional semantics.
7. Phase boundary: final cleanup only. New DTO fields, new lifecycle actions,
   new runtime behavior, and broader shared-directory migrations are out of
   scope.

### Plan Linkage

1. Parent plan gaps closed: G1, G2, and G5 final guard tightening; inherits G3
   proof from `4-ui-readmodel-port-closure` and G4 proof from
   `3-ui-action-dto-closure`.
2. Depends on: `3-ui-action-dto-closure` and
   `4-ui-readmodel-port-closure`.
3. Unlocks / impacts successors: no successor task in this plan; successful
   completion should allow plan archival aftermath.
4. Task-list impact: creates planned `5-router-port-cleanup`; no replacement.
5. Inherited validation / exit expectation: final `pnpm fitness:check:ci`
   proves the UI router port boundary with zero configured router-port
   transitional exceptions and no current broad-bag leaf violations.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/ui-router-port-closure-plan-v1.md`
   - `docs/architecture/v11-ports-governance.md`
   - `docs/modularity-review/2026-05-02-modularity-review.md`
   - `src/v11/shared/ports/uiRouter.ts`
   - `src/v11/infrastructure/ui/routerContracts.ts`
   - `src/v11/infrastructure/ui/routerDependencies.ts`
   - `src/v11/infrastructure/ui/routerActionDispatch.ts`
   - `src/v11/infrastructure/ui/routerActions.ts`
   - `src/v11/infrastructure/ui/routerBubbleDetail.ts`
   - `tools/fitness/checks/ui-router-port-boundary.ts`
   - `tools/fitness/policy.json`
2. Canonical elements: narrow UI router capability slices, canonical UI DTOs
   from `src/contracts/ui/**`, and composition-only full dependency wiring.
3. Guard elements: `ui_router_port_boundary` and its tests enforce no broad
   composite use in router leaves and no command-owned imports from shared
   ports.
4. Compat-only elements: any retained `UiRouterDependencies` composite is
   composition/wiring-only and must not be a leaf-module dependency.
5. Forbidden reinterpretations: do not change lifecycle state semantics,
   action result DTOs, read-model DTO fields, runtime session meanings, or route
   HTTP behavior.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites: `uiRouter.ts`, `routerContracts.ts`,
   `routerDependencies.ts`, `routerActionDispatch.ts`, `routerActions.ts`,
   `routerBubbleDetail.ts`, UI router port boundary fitness policy/tests, and
   the modularity-review finding.
2. Actual touched scope: TypeScript dependency-boundary shape, composition
   wiring, router leaf type annotations, fitness guard policy/tests, and docs
   status.
3. Mutation entrypoints in scope: none. Router actions must call the same
   dependency methods and preserve the same HTTP response behavior.
4. Hidden scope ruled out: action DTO closure, read-model DTO closure, new UI
   features, and broader shared promotion cleanup.
5. Why the declared task shape matches reality: the remaining issue is no
   longer command-owned DTO leakage; it is the retained broad composite as a
   convenient leaf dependency and the need to lock that closure in executable
   guards/docs.

### Authority Boundary Map

1. Authority producer: router leaf modules declare the capability slices they
   consume.
2. Stored authority: TypeScript port contracts and fitness policy persist the
   final allowed boundary shape.
3. In-scope consumers: backend UI router composition, action dispatch, list,
   timeline, detail loaders, contract parity tests, and fitness/source guards.
4. Explicit out-of-scope consumers: CLI command implementations, frontend UI
   behavior beyond type parity, Pairflow lifecycle internals, and transcript
   persistence.
5. Export surfaces closed in this phase: UI router dependency aliases and guard
   report semantics for final zero-exception status.

### Baseline Preservation

1. Must-preserve behaviors: existing UI list/detail/timeline/action routes,
   action status codes, request parsers, runtime session enrichment, and API
   response DTO shapes.
2. Allowed resolution paths: replace broad parameter types with slice types,
   split the composite into exported capability groups where useful, and keep
   `Partial<UiRouterDependencies>` only at `createUiRouter` composition input if
   required for test override ergonomics.
3. Forbidden regression interpretations: changing route parsing, dropping
   dependencies from defaults, changing approval/commit/merge/delete behavior,
   or loosening the guard with new exceptions.
4. Replacement proof required if removed: any full-composite alias removed from
   a public port export must have parity/type tests or call-site coverage proving
   current consumers use the replacement slices.

### In Scope

1. Replace router leaf-module full-composite dependency references with narrow
   slice types.
2. Remove or localize transitional composite aliases that only exist for leaf
   convenience.
3. Keep any retained full composite restricted to router composition/wiring and
   default dependency resolution.
4. Tighten `ui_router_port_boundary` tests so current repo state proves
   `exceptions_configured=0` and no stale broad-bag path remains.
5. Update the modularity-review status and architecture notes to reflect the
   closed UI router port work.
6. Preserve contract parity for UI action/read-model DTOs already closed by
   predecessor tasks.

### Out of Scope

1. Introducing new UI API routes or lifecycle actions.
2. Changing canonical action/read-model DTO fields.
3. Removing the unrelated `ui_contract_boundary` meta-review drift exception.
4. Migrating all one-customer `src/v11/shared/<command>/**` modules.
5. Reworking `bubbleConfig.ts` or process-spawn ports from the modularity
   review.

### Safety Defaults

1. Prefer type-only refactors with behavior-preserving tests.
2. Do not delete a composite type until every call-site either no longer needs
   it or is clearly composition/wiring only.
3. Treat any fitness guard failure as a blocker unless it proves the task found
   the intended stale broad-bag path.
4. Keep docs status factual: mark only the UI router port issue closed, not
   unrelated modularity-review findings.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. Split decision: keep as one bounded cleanup task because the DTO producer
   closures already landed and this phase is a type-boundary plus guard/docs
   finalization.

## L1 - Implementation Contract

### Domain / Control Contract

| Clause | Contract | Priority | Timing |
|---|---|---|---|
| Business invariant | Router leaves consume narrow UI router capability slices, not the full unrelated dependency bag. | P1 | required-now |
| Control model | Full dependency composition remains in `routerDependencies` / `routerContracts`; leaves use slice contracts from `uiRouter.ts`. | P1 | required-now |
| Read path | UI DTO imports stay canonical from `src/contracts/ui/**`; no command-owned read/action model imports re-enter `shared/ports`. | P1 | required-now |
| Forbidden fallback | No new router-port exceptions, method-count threshold, or broad alias that recreates the full bag outside wiring. | P1 | required-now |
| Missing data | Runtime missing-data behavior remains unchanged; this task only narrows dependency shape. | P1 | required-now |

### Call-Site Matrix

| ID | File / Surface | Current Role | Required Change | Priority | Tests |
|---|---|---|---|---|---|
| CS1 | `src/v11/shared/ports/uiRouter.ts` | Defines full composite and several slice aliases. | Make slice exports explicit and ensure leaf slices do not depend on full-composite index access when that preserves the broad bag. | P1 | T1,T2,T3 |
| CS2 | `src/v11/infrastructure/ui/routerContracts.ts` | Router composition environment currently carries `UiRouterDependencies`. | Keep full composite only for router creation/wiring; expose narrower environment types where leaf modules need them. | P1 | T1,T4 |
| CS3 | `src/v11/infrastructure/ui/routerDependencies.ts` | Builds default dependency composite and resolves overrides. | Preserve composition behavior while aligning with any renamed or narrowed port types. | P1 | T4,T5 |
| CS4 | `src/v11/infrastructure/ui/routerActionDispatch.ts` | Uses action dependency slice. | Ensure it receives `UiBubbleActionDispatchDependencies`, not the full environment composite through wrapper access. | P1 | T1,T4 |
| CS5 | `src/v11/infrastructure/ui/routerActions.ts` | List/timeline route leaf. | Use list/timeline slices and avoid full `environment.dependencies` broad-bag dependency where feasible. | P1 | T1,T4 |
| CS6 | `src/v11/infrastructure/ui/routerBubbleDetail.ts` | Detail loader combines status, inbox, runtime sessions. | Use explicit detail-loading dependency slice. | P1 | T1,T4 |
| CS7 | `tools/fitness/checks/ui-router-port-boundary.ts` | Enforces broad-bag and command-owned import guard. | Preserve current hard-fail behavior and add/adjust reporting needed for zero-exception final proof. | P1 | T1,T2,T3 |
| CS8 | `tools/fitness/policy.json` | Runtime fitness policy. | Keep `ui_router_port_boundary.exceptions` empty; do not add replacement exceptions. | P1 | T2,T3 |
| CS9 | `docs/modularity-review/2026-05-02-modularity-review.md` | Original finding record. | Add factual status/update that the UI router port plan closed the broad-bag/DTO leakage finding; leave unrelated findings open. | P2 | T6 |

### Data and Interface Contract

| Contract | Required Shape | Compatibility |
|---|---|---|
| `UiRouterDependencies` | May remain as the composition-only aggregate of all UI router capabilities. | Additive/narrowing only; composition call-sites should continue to compile. |
| Query/detail/timeline slices | Explicit named slice types for list, timeline, detail/status/inbox/runtime-session reads. | Leaf modules should depend on these slices rather than the aggregate. |
| Action dispatch slice | Explicit named slice for attach/start/reply/approve/rework/commit/merge/open/stop/restart/delete/update-policy actions. | Action dispatch behavior and return DTOs unchanged. |
| Fitness policy | `ui_router_port_boundary.exceptions` remains `[]`. | No transitional exception may be introduced. |
| Docs status | Modularity-review update names only this closed issue and the proof commands. | Must not mark unrelated review issues complete. |

### Canonical Contract Matrix

| Matrix ID | Surface | Canonical Rule | Allowed Current Owner | Forbidden Shape | Proof |
|---|---|---|---|---|---|
| RCM1 | Full router dependency aggregate | The aggregate may exist only for router creation, override resolution, and default wiring. | `routerContracts.ts`, `routerDependencies.ts`, top-level `router.ts` composition. | Leaf modules typing their environment or local dependency parameter as the full aggregate. | `ui_router_port_boundary` broad-bag scan and targeted tests. |
| RCM2 | Read/query slices | List, detail, timeline, status, inbox, and runtime-session reads use explicit slice contracts. | `uiRouter.ts` exported slice types consumed by read leaf modules. | Indexing through the full aggregate when that keeps broad-bag ownership in a leaf. | Typecheck plus targeted router tests. |
| RCM3 | Action dispatch slice | UI action dispatch uses an explicit mutation/action slice. | `routerActionDispatch.ts` and `uiRouter.ts` action-dispatch dependency type. | Passing the full router environment or aggregate into action dispatch for convenience. | Fitness wrapper-access tests and router action tests. |
| RCM4 | DTO ownership | Action and read-model DTOs remain canonical under `src/contracts/ui/**`. | `src/contracts/ui/**`, port type imports from those contracts. | Reintroducing command-owned list/status/inbox contracts or raw internal action state in shared ports. | Contract parity, transit-source tests, and command-owned import guard. |
| RCM5 | Final guard policy | Router-port fitness policy has no transitional exceptions in final plan state. | `tools/fitness/policy.json` and fitness check report. | New `allow-full-dependency-bag` or `allow-command-owned-ui-port-import` entries to keep current code green. | `pnpm fitness:check:ci` and fitness CI tests. |
| RCM6 | Docs status | The modularity review records the UI router port finding closure only after RCM1-RCM5 pass. | `docs/modularity-review/2026-05-02-modularity-review.md`. | Marking unrelated modularity-review issues closed. | Docs diff inspection. |

### Side Effects Contract

Implementation is type-boundary and docs/fitness only. No lifecycle commands,
filesystem mutation behavior, transcript writes, state writes, or runtime
session side effects may change.

### Error and Fallback Contract

| Scenario | Required Behavior | Test |
|---|---|---|
| Router leaf imports or references full aggregate | Fitness check fails with `FULL_UI_ROUTER_DEPENDENCY_BAG_USAGE`. | T1 |
| Shared port imports command-owned list/status/inbox contracts | Fitness check fails with `COMMAND_OWNED_UI_PORT_IMPORT`. | T2 |
| Policy tries to reintroduce router-port exception | Fitness CI reports configured/applied exception state and fails for stale or current violation as appropriate. | T3 |
| Runtime dependency missing in tests | Existing router dependency resolution behavior is preserved. | T4 |

### Dependency Constraints

1. `src/v11/shared/ports/uiRouter.ts` may import UI-owned DTO contracts from
   `src/contracts/ui/**` and other neutral ports.
2. Router leaf modules may import the narrow slice types they consume.
3. No shared port may import from `src/v11/shared/list/**`,
   `src/v11/shared/status/**`, or `src/v11/shared/inbox/**`.
4. No new dependency from `application/**` to `infrastructure/**` is introduced.

### Test Matrix

| ID | Test / Command | Required Proof | Priority |
|---|---|---|---|
| T1 | `pnpm exec vitest run tests/tools/fitness/uiRouterPortBoundary.test.ts` | Broad-bag leaf usage fails; allowed composition/wiring still passes; wrapper access is caught. | P1 |
| T2 | `pnpm exec vitest run tests/tools/fitness/fitnessCheckCi.test.ts` | Fitness CI captures final UI router boundary state and no stale exception path. | P1 |
| T3 | `pnpm fitness:check:ci` | Current repo passes with zero `ui_router_port_boundary` exceptions configured/applied. | P1 |
| T4 | `pnpm exec vitest run tests/core/ui/router.test.ts` | Router behavior and dependency override behavior remain unchanged. | P1 |
| T5 | `pnpm exec vitest run tests/contracts/uiContractParity.types.ts` | UI router exposed DTO signatures remain canonical and aligned. | P1 |
| T6 | Docs/source inspection | Modularity-review update is limited to the UI router port finding. | P2 |

### Shared Contract Compatibility

The task narrows TypeScript dependency surfaces but should preserve external UI
API DTO shapes. If any exported type name used by tests or callers is removed,
provide a compatibility alias or update all in-repo consumers in the same task
with parity proof.

### Baseline Preservation

Existing route parsing, response status decisions, default dependency wiring,
runtime-session enrichment, and frontend/backend DTO parity are preserved. The
only target behavior change is that architectural guardrails reject a stale
broad-bag leaf dependency.

### Closure-Budget Summary

1. Touched buckets: shared contract, read-model/action consumer boundary,
   architecture fitness guard, docs status.
2. Collapsed closures: final broad-bag alias cleanup and guard tightening,
   because they prove the same plan gap.
3. Deferred closures: unrelated modularity-review findings and UI contract
   meta-review drift exception.
4. Safety proof: no producer or mutable lifecycle behavior is in scope.

### Ownership and Deferred Semantics

1. This task owns final UI router dependency shape cleanup, guard tightening,
   and the associated modularity-review status update.
2. This task records final guard proof but does not own future unrelated
   modularity-review findings.
3. This task may leave a composition-only aggregate if it is restricted to
   wiring and override resolution; successor behavior must not infer that the
   aggregate is acceptable in leaf modules.
4. This task emits docs/progress evidence only; lifecycle close and plan archive
   aftermath remain owned by `ExecutePairflowPlan` after implementation.

### Structured Contract Rules

1. `ui_router_port_boundary.exceptions` must be an array and must remain empty
   for this plan's final router-port closure state.
2. If a future exception is intentionally added outside this plan, it must use
   the exact supported policy shapes already enforced by the fitness check; this
   task must not add one.
3. A full-composite usage target is identified as
   `<relative-file>#UiRouterDependencies`; leaf matches must fail unless the
   file is an allowed composition path.
4. A command-owned import edge is identified by exact `from` and `to` source
   files after supported `.js` to `.ts` resolution; unresolved or stale
   exceptions fail closed.
5. Unknown policy exception kinds remain invalid and must not be treated as
   no-op compatibility.

### Mirrored Surface Checklist

1. `Canonical Contract Matrix` rows RCM1-RCM6.
2. L0 Goal, In Scope, Out of Scope, and Safety Defaults.
3. L1 Data and Interface Contract.
4. L1 Error and Fallback Contract.
5. L1 Test Matrix.
6. Fitness policy and targeted fitness test expectations.
7. Modularity-review closure note.

### Capability Closure

| Field | Value |
|---|---|
| capability_claim | UI router port closure guards are final and exception-free. |
| activation_trigger | `pnpm fitness:check:ci` and targeted fitness tests. |
| entrypoint | `tools/fitness/checks/ui-router-port-boundary.ts` via policy `ui_router_port_boundary`. |
| configuration_owner | `tools/fitness/policy.json`. |
| repo_provided_parts | TypeScript port slices, router call-site updates, fitness policy/tests, docs status. |
| external_prerequisites | None. |
| success_output_contract | Fitness report passes with zero router-port exceptions configured/applied and no broad-bag leaf violations. |
| failure_output_contract | Fitness report names broad-bag or command-owned import violations with exact file targets. |
| operator_or_user_path | Run `pnpm fitness:check:ci` from repo root. |
| last_mile_proof | Targeted fitness tests plus current repo fitness CI pass. |
| closure_classification | end_to_end |

## L2 - Implementation Notes

1. Prefer replacing index-access slice definitions such as
   `UiRouterDependencies["getBubbleStatus"]` with direct function types if that
   makes the slices independent of the aggregate.
2. Keep `UiRouterDependencies` available for `resolveUiRouterDependencies`
   until all composition overrides are migrated; removing it entirely is allowed
   only if the migration stays small and tests remain clearer.
3. In docs, use a short dated status note near the original UI router finding
   rather than rewriting the entire modularity review.

## Assumptions

1. Task 4 already removed command-owned list/status/inbox imports from the UI
   router port and emptied router-port fitness exceptions.
2. The final cleanup should not address unrelated modularity-review issues.

## Open Questions

No blocking open questions.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Consider moving `UiRouterDependencies` composition-only aggregate into a router composition module if future public consumers no longer need the name. | architecture | P3 | later-hardening | local inspection | Revisit after task 5 if exported aggregate still creates review confusion. |
