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
  - tests/core/ui/eventsScan.test.ts
  - tests/tools/fitness/uiRouterPortBoundary.test.ts
  - tests/tools/fitness/fitnessCheckCi.test.ts
  - tools/fitness/policy.json
target_files_role: implementation_write_targets
prd_ref: null
plan_ref: plans/ui-router-port-closure-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 2-router-dependency-slices-doc
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
   for list, timeline, detail, action dispatch, and conflict-enrichment needs;
   keep shared request context as non-capability data; then adapt
   environment/input types so call sites continue to pass the composed
   dependency object structurally.
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
   `routerRequest.ts`, `routerContracts.ts`, and `routerDependencies.ts`.
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
   router port/contracts. Reusable capability slices belong in
   `src/v11/shared/ports/uiRouter.ts`; infrastructure-only environment shapes
   may stay local to the leaf module that consumes them.
2. Stored authority: TypeScript type declarations and fitness policy.
3. In-scope consumers: CS0 request routing, router leaf modules, and router
   tests that compile against those environment types.
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
   by handler family. Do not pass `UiRouterEnvironment` into leaf modules unless
   that module is explicitly a composition/wiring boundary.
3. Forbidden regression interpretations: removing a handler path, dropping a
   dependency call, changing error mapping fallback behavior, or changing API
   response shape is not authorized by this task.
4. Replacement proof required if removed: any removed branch or dependency call
   must be proven unreachable by existing tests and explicitly justified in the
   implementation bubble.

### In Scope

1. Introduce narrow router dependency slice types for leaf modules.
2. Update `routerRequest.ts` only as the CS0 request-routing boundary that
   extracts and forwards RDS6 request context; update `routerActions.ts`,
   `routerBubbleDetail.ts`, `routerActionErrorMapping.ts`, and
   `routerActionDispatch.ts` so their leaf environment contracts accept only
   RDS6 request context plus the needed dependency slices.
3. Keep `CreateUiRouterInput`, `UiRouterEnvironment`,
   `resolveUiRouterDependencies`, and default dependency wiring able to compose
   the full dependency object.
4. Update router-port fitness policy/tests so broad leaf dependency exceptions
   covered by this task are removed.
5. Add or update targeted tests that prove behavior is unchanged while the
   broad-bag dependency path and broad-environment import path are closed for
   leaves.

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
2. `surface_spread`: `3`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `3`
7. `risk_score`: `8`
8. Split decision: keep as one bounded consumer-family alignment task because
   the expanded CS0 request-routing boundary and CS4 action-dispatch leaf still
   share the same router dependency-slice closure; DTO/read-model closure
   remains in successor tasks.

## L1 - Implementation Contract

### Call-Site Matrix

| ID | Surface | Current Coupling | Required Slice Outcome |
|---|---|---|---|
| CS0 | `routerRequest.ts` / `handleApiRequest` | Receives full `UiRouterEnvironment` at the request-routing boundary and forwards requests into leaf handlers. | Remains a routing/composition-adjacent boundary that may receive the composed router environment and local HTTP response handle, but any metadata it passes to leaves must be RDS6 request context only: method/pathname, URL, `bubbleId`, router cwd, and request data needed for body parsing. |
| CS1 | `routerActions.ts` | Uses `UiRouterDependencies` through `RouterActionEnvironment`. | Route-level environment exposes only RDS6 shared request context plus the exact dependency slices required by the called handler family. List handling must use RDS2 `listBubbles`; timeline handling must use RDS2 `readBubbleTimeline`; detail handling must delegate to the RDS3 detail loader contract without importing broad `UiRouterEnvironment`. Action routing may pass RDS6 action name and request body to CS4. |
| CS2 | `routerBubbleDetail.ts` / `loadBubbleDetail` | Uses full composite for status, inbox, and runtime-session reads. | Detail loader depends on RDS3 for `getBubbleStatus`, `getBubbleInbox`, and `readRuntimeSessionsRegistry`, plus RDS6 for request context such as `cwd`, `repoPath`, and `bubbleId`. |
| CS3 | `routerActionErrorMapping.ts` / `mapActionErrorToApiError` | Uses full composite so conflict mapping can load detail. | Error mapper depends only on RDS5 conflict enrichment and RDS6 request context needed to preserve existing `cwd` behavior. |
| CS4 | `routerActionDispatch.ts` / `dispatchBubbleAction` | Receives broad `UiRouterEnvironment`, so action leaf methods can still type against the full composite indirectly. | Replace the broad environment dependency with an action-dispatch environment using only RDS4 mutation/action capabilities and RDS6 shared request context: `bubbleId`, resolved `repoPath`, action name, parsed request body, and optional `cwd`; do not import `UiRouterEnvironment` or `UiRouterDependencies` in this leaf. |
| CS5 | `routerContracts.ts` / `routerDependencies.ts` | Composition boundary exposes `Partial<UiRouterDependencies>` and resolved full dependencies. | Full composite remains allowed here as composition/wiring. |

### Data and Interface Contract

| Contract | Rule |
|---|---|
| Slice naming | Use explicit capability names that describe the consumer family, not generic aliases such as `RouterDeps`. |
| Full composite | Allowed only in composition/wiring surfaces: `routerContracts.ts`, `routerDependencies.ts`, `router.ts`, and default dependency construction. |
| Boundary classification | `routerRequest.ts` is in scope as CS0 request routing, not as a dependency-consuming leaf; leaf-only prohibitions apply to the handlers it calls and to any metadata it passes onward. |
| Leaf imports | Router leaf modules must not import or type against `UiRouterDependencies`. |
| Leaf environment imports | Router leaf modules must not import broad composition environment contracts such as `UiRouterEnvironment`; define or consume a local or exported narrow environment contract for the needed request context. |
| Structural compatibility | The existing composed dependency object must remain assignable to every narrow slice. |
| Unknown capabilities | A leaf cannot access capabilities outside its declared slice. |
| Shared request context | Use RDS6 as the canonical definition; this row exists only to require that request metadata stays separate from dependency capabilities. |

### Canonical Contract Matrix

| Matrix ID | Owner | Allowed Members | Allowed Consumers | Forbidden Use |
|---|---|---|---|---|
| RDS1 | Composition dependency composite | All UI router dependency methods needed to construct a complete router environment. | `routerContracts.ts`, `routerDependencies.ts`, `router.ts`, default dependency wiring, and tests that construct full router inputs. | Direct typing in leaf modules that only need a subset. |
| RDS2 | Bubble list/timeline read slices | Separate list and timeline capabilities: `listBubbles` for list handling; `readBubbleTimeline` for timeline resource handling. | `routerActions.ts` list and timeline branches, and structurally compatible composed dependencies. | Action mutation dispatch, status/inbox/runtime-session reads, detail loading, or unrelated lifecycle methods. |
| RDS3 | Bubble detail read slice | `getBubbleStatus`, `getBubbleInbox`, and `readRuntimeSessionsRegistry`. | `routerBubbleDetail.ts` and error-mapping enrichment paths that load detail. | Full composite access, mutation methods, list/timeline reads, or DTO/read-model ownership moves. |
| RDS4 | Bubble action dispatch slice | `startBubble`, `emitApprove`, `emitRequestRework`, `emitHumanReply`, `resumeBubble`, `commitBubble`, `mergeBubble`, `openBubble`, `attachBubble`, `updateBubbleReviewPolicy`, `stopBubble`, `restartBubble`, and `deleteBubble` as required by dispatch. | `routerActionDispatch.ts` and structurally compatible router environments. | List/detail-only handlers consuming mutation capabilities. |
| RDS5 | Conflict/error enrichment slice | The RDS3 detail-loading capability when optional current-state enrichment is needed for conflict responses; load failure must preserve the existing fallback to `null`. | `routerActionErrorMapping.ts` / `mapActionErrorToApiError`. | Mutation/list/timeline capabilities, treating enrichment load failure as a hard error, or reconstructing bubble detail when detail loading fails. |
| RDS6 | Shared request context | Union of non-capability request data anchored by CS0-CS4: `CreateUiRouterInput` fields needed by leaves, optional `cwd`, router cwd, URL/pathname, resolved `repoPath`, `bubbleId`, action name, and parsed request body. Each consumer may use only the subset allowed by its CS row. | CS0 request routing in `routerRequest.ts`; composition ownership of `CreateUiRouterInput` in `routerContracts.ts` and `routerDependencies.ts`; and leaf request metadata consumed by `routerActions.ts`, `routerBubbleDetail.ts`, `routerActionErrorMapping.ts`, and `routerActionDispatch.ts`. | Dependency methods, full `UiRouterDependencies`, broad `UiRouterEnvironment` access in leaf environments, or state reconstructed from dependency failures. |

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
| L0 Domain / Control Model Summary | RDS1-RDS6 ownership and forbidden fallback rules |
| L0 Scope Reality / Shape Proof | Inspected files, target-file additions, and CS0-CS5 classification |
| L0 Authority Boundary Map | Shared-port slice ownership, infrastructure-local environment shapes, and composition-only full composite |
| Baseline Preservation | Leaf-environment prohibition, CS0 routing carve-out, and unchanged router behavior |
| L0 In Scope | Target files, CS0-CS4 surfaces, RDS6 request-context separation, and broad-environment closure evidence |
| L1 Call-Site Matrix | RDS2-RDS6 consumer-to-slice mapping, including whether `UiRouterEnvironment` remains composition-only or appears in a leaf |
| L1 Data and Interface Contract | RDS1-RDS6 allowed/forbidden use |
| RDS1 / CS5 composition mapping | `routerContracts.ts`, `routerDependencies.ts`, `router.ts`, and default dependency wiring remain the only full-composite composition surfaces |
| RDS6 request-context ownership | Non-capability request metadata stays separate from dependency capabilities, and each CS0-CS4 consumer is bounded to its CS-row subset |
| Side Effects Contract | CS0-CS4 routing, action dispatch, detail loading, and error enrichment remain behavior-preserving type-boundary changes only |
| Error and Fallback Contract | RDS5 conflict-enrichment fallback-to-`null` behavior |
| L1 Shared Contract Compatibility | RDS1 composition compatibility and internal narrowing decision |
| L1 Test Matrix | Broad-bag and broad-environment guard coverage, plus behavior-preservation tests for changed dependency slices |
| Acceptance Criteria | No broad leaf usage, composition-only full composite, RDS6 request-context separation, and updated fitness exceptions |
| Closure-Budget Summary | Complexity Risk Gate score, changed CS0/CS4 surfaces, deferred closures, and bounded-task proof |

### Closure-Budget Summary

1. Buckets touched: shared_contract, internal_execution_consumers, guard policy,
   and non-capability request-context ownership.
2. Collapsed closures: dependency-slice type introduction plus router leaf
   migration because they are the same consumer-family alignment; shared
   request context is included only to prevent narrow capability slices from
   being bypassed through broad environment types.
3. Explicitly covered surfaces: `routerRequest.ts` / `handleApiRequest` as
   CS0 request routing and `routerActionDispatch.ts` /
   `dispatchBubbleAction` as CS4 action dispatch.
4. Deferred closures: action DTO closure, read-model ownership closure, final
   zero-exception cleanup.
5. Bounded-task proof: no producer behavior or lifecycle state-machine behavior
   changes are required to close broad-bag leaf consumption.

### L1 Test Matrix

| ID | Scenario | Command / Surface | Required Now |
|---|---|---|---|
| T1 | Type boundary compiles after leaf slice migration. | `pnpm typecheck` | yes |
| T2 | Router API behavior remains unchanged, including event-scan coverage for route/event behavior touched by router request and action wiring. | `pnpm exec vitest run tests/core/ui/router.test.ts tests/core/ui/server.integration.test.ts tests/core/ui/eventsScan.test.ts` | yes |
| T3 | Fitness guard rejects broad leaf `UiRouterDependencies` usage and broad leaf `UiRouterEnvironment` imports or type paths that would preserve full-composite access indirectly, while preserving the explicit CS0 `routerRequest.ts` non-leaf routing carve-out. | `pnpm exec vitest run tests/tools/fitness/uiRouterPortBoundary.test.ts tests/tools/fitness/fitnessCheckCi.test.ts` | yes |
| T4 | CI fitness check passes with updated exception set. | `pnpm fitness:check:ci` | yes |
| T5 | Full repo validation remains green before merge. | `pnpm test` | yes |
| T6 | Lint remains green after type-boundary and guard updates. | `pnpm lint` | yes |
| T7 | Runtime artifacts rebuild after implementation changes. | `pnpm build` | yes |

### Acceptance Criteria

1. No router leaf module imports or types against `UiRouterDependencies`.
2. No router leaf module imports or types against broad composition
   environment contracts such as `UiRouterEnvironment` for full-composite
   access; leaf modules must use a narrow local or exported environment
   contract for the needed request context and dependency slice subset.
3. `routerActions.ts` detail-resource handling delegates to the RDS3 detail
   loader contract and follows the Data and Interface Contract rows for leaf
   imports, leaf environment imports, and unknown capabilities; it does not
   reintroduce status, inbox, or runtime-session reads through
   `RouterActionEnvironment` or any other broad full-composite environment
   contract. Narrow leaf environment contracts remain allowed when bounded to
   RDS6 plus the exact dependency slices required by CS1.
4. `routerActions.ts` list and timeline handling follow CS1: list handling uses
   only RDS2 `listBubbles`, timeline handling uses only RDS2
   `readBubbleTimeline`, and neither path reaches through broad environment
   typing for unrelated capabilities.
5. `loadBubbleDetail` follows CS2 by depending only on RDS3 detail reads
   (`getBubbleStatus`, `getBubbleInbox`, and
   `readRuntimeSessionsRegistry`) plus the RDS6 request context needed for
   `cwd`, `repoPath`, and `bubbleId`.
6. `mapActionErrorToApiError` depends only on RDS5 conflict enrichment plus
   RDS6 request context and preserves the existing fallback-to-`null` behavior
   when detail loading fails.
7. `dispatchBubbleAction` depends only on RDS4 action-dispatch capabilities
   plus RDS6 request context; it does not import or type against broad
   composition environment contracts.
8. `routerRequest.ts` remains in target scope only as the request-routing
   boundary that supplies RDS6 metadata to leaf handlers. It is not classified
   as a leaf while performing CS0 routing, must not become a new
   dependency-consumption leaf, and must not import or type against
   `UiRouterDependencies` for leaf-style dependency access. Its
   `UiRouterEnvironment` access remains limited to the CS0 request-routing
   boundary.
9. `UiRouterDependencies` remains available only at approved composition or
   wiring boundaries.
10. Fitness policy no longer carries broad leaf exceptions that this task was
   supposed to remove, while preserving only the explicit CS0 `routerRequest.ts`
   non-leaf routing carve-out described by AC8 and T3.
11. Existing UI router tests pass without response-shape expectation changes.
12. The implementation bubble evidence shows all L1 Test Matrix commands pass:
   `pnpm typecheck`; `pnpm exec vitest run tests/core/ui/router.test.ts tests/core/ui/server.integration.test.ts tests/core/ui/eventsScan.test.ts`;
   `pnpm exec vitest run tests/tools/fitness/uiRouterPortBoundary.test.ts tests/tools/fitness/fitnessCheckCi.test.ts`;
   `pnpm fitness:check:ci`; `pnpm test`; `pnpm lint`; and `pnpm build`.

## L2 - Notes

### Implementation Notes

1. Prefer exported slice types in `uiRouter.ts` when more than one module needs
   the same capability family.
2. Prefer local environment type narrowing when a slice is used by one module
   only and exporting it would add noise.
3. Keep `Partial<UiRouterDependencies>` on `CreateUiRouterInput` unless a
   narrower public override contract is proven safe for all tests.
4. If `routerActions.ts` keeps one route-level environment to share request
   metadata across handlers, keep that environment limited to RDS6 plus the
   exact capability slices each called function needs. Pass narrower
   sub-environments to `loadBubbleDetail`, `dispatchBubbleAction`, and
   `mapActionErrorToApiError` according to CS2-CS4.
5. Treat `UiRouterEnvironment` as a composition contract unless the
   implementation first proves the consumer is not a leaf. `routerActionDispatch.ts`
   should use a local action-dispatch environment or an exported action slice
   instead.

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
checklist. Round 1 document refinement further tightened the matrix by adding
the broad `UiRouterEnvironment` leaf-import guard, separating list/timeline
resource reads from the detail loader contract, requiring `routerActionDispatch.ts`
to use an RDS4 action-dispatch slice instead of broad environment typing, and
cascading those constraints through the call-site matrix, data/interface
contract, test matrix, and acceptance criteria. Round 2/3 refinement added RDS6
as the canonical shared request-context owner, removed detail-loading
narration from RDS2, bound `loadBubbleDetail`, `mapActionErrorToApiError`, and
`dispatchBubbleAction` in the call-site matrix, made RDS5's fallback-to-`null`
rule mirror into the error/fallback contract, and cleaned terminology so broad
environment avoidance is expressed through RDS6 rather than new ad hoc terms.
Round 4 refinement added explicit RDS2 citations to CS1 and normalized
environment-contract wording across the Data and Interface Contract and
Acceptance Criteria, including AC3 anchoring of `routerActions.ts`
detail-resource handling to RDS3 and the Data and Interface Contract rows.
Round 5 refinement separated list, timeline, and detail in L0 item 5 so the
enumeration matches the RDS2 list/timeline and RDS3 detail split.
Round 6 refinement anchored `routerRequest.ts` as the request-routing boundary,
added `routerActionDispatch.ts` to in-scope leaf migration, made the broad
`UiRouterEnvironment` leaf prohibition unconditional, and constrained RDS6
members to metadata explicitly referenced by CS0-CS4.
Round 7 refinement mirrored the CS0 `routerRequest.ts` and CS4
`routerActionDispatch.ts` additions into In Scope and the Closure-Budget
Summary, expanded broad-environment test coverage in scope, and aligned AC3
with CS1/Data-and-Interface broad-environment wording.
Round 8 refinement mirrored AC10 validation commands into the L1 Test Matrix
with `pnpm lint` and `pnpm build`, tightened AC6 around
`routerRequest.ts` leaf import limits, and added RDS6 request-context
separation to the Acceptance Criteria mirror row.
Round 9 refinement completed the approval-provenance trail for the Round 7 and
Round 8 changes so the provenance log matches the current spec surface.
Round 10 implementer refinement responding to the Round 9 review added the
Round 7 and Round 8 provenance entries so Approval Provenance matched the
already-applied CS0/CS4, broad-environment, AC6, T6/T7, and RDS6 mirror
changes.
Round 11 implementer refinement responding to the Round 10 review fully
mirrored AC10 to the T1-T7 command list, clarified `routerRequest.ts` as a CS0
boundary rather than a leaf, added the missing mirrored-surface rows for In
Scope, Side Effects, and Closure-Budget Summary, recomputed the complexity risk
score after CS0/CS4 expansion, added the `eventsScan.test.ts` behavior test to
target files, and named the composition modules that own `CreateUiRouterInput`
as RDS6 consumers.
Round 12 implementer refinement responding to the Round 11 review split CS0
routing from leaf environment narrowing in In Scope, separated RDS6 consumer
categories for request routing, composition ownership, and leaf metadata use,
aligned Closure-Budget attribution with Round 6/7 provenance, expanded the
mirror checklist for Scope Reality, Authority Boundary Map, and RDS1/CS5
composition mapping, anchored `eventsScan.test.ts` to behavior-preservation
coverage, added timeline capability exclusion to RDS5 forbidden use, and made
fitness exception removal wording match AC8.
Round 13 implementer refinement responding to the Round 12 review clarified
that AC2/AC3 forbid broad full-composite environment access while allowing
narrow leaf environment contracts, narrowed RDS6 forbidden use so CS0 may still
receive `UiRouterEnvironment` at the request-routing boundary, marked RDS6
allowed members as a union bounded by each CS row, anchored the complexity risk
score recomputation from 6 to 8 in provenance instead of L1 contract text,
removed review-round attribution from the L1 Closure-Budget Summary, and added
an explicit RDS6 request-context ownership mirror row.
Round 14 implementer refinement responding to the Round 13 review added the
missing Round 10 provenance entry, bound CS1 list/timeline RDS2 and CS2
`loadBubbleDetail` RDS3+RDS6 prescriptions into Acceptance Criteria, added CS0
request routing to the Authority Boundary Map consumers, made the CS0 non-leaf
fitness carve-out explicit in T3 and AC10, and added Baseline Preservation to
the mirrored-surface checklist.

### Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Consider splitting public override input into named partial slice groups. | contract | later-hardening | after task 5 | CreateTask | Evaluate only after all DTO/read-model closures are complete. |
