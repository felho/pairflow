---
artifact_type: task
artifact_id: task_list_readmodel_introduce_v1
task_family_id: list-readmodel-introduce
sequence_key: "9"
task_id: 9-list-readmodel-introduce
title: "List Read Model Boundary Introduction"
status: archived
phase: phase4
target_files:
  - src/v11/shared/list/listCommandApi.ts
  - src/v11/shared/list/listCommandContext.ts
  - src/v11/shared/list/listCommandContract.ts
  - src/v11/shared/list/listCommandDefaults.ts
  - src/v11/shared/list/listCommandEntryBuilder.ts
  - src/v11/shared/list/listCommandEntryProjection.ts
  - src/v11/shared/list/listCommandErrors.ts
  - src/v11/shared/list/listRemotePaneActivityRead.ts
  - src/v11/shared/read-model/list/listReadModelApi.ts
  - src/v11/shared/read-model/list/listReadModelContext.ts
  - src/v11/shared/read-model/list/listReadModelContract.ts
  - src/v11/shared/read-model/list/listReadModelDefaults.ts
  - src/v11/shared/read-model/list/listReadModelEntryBuilder.ts
  - src/v11/shared/read-model/list/listReadModelEntryProjection.ts
  - src/v11/shared/read-model/list/listReadModelErrors.ts
  - src/v11/shared/read-model/list/listRemotePaneActivityRead.ts
  - src/v11/application/list/listCommandApi.ts
  - src/v11/application/list/listCommandContract.ts
  - src/v11/application/list/listCommandDefaults.ts
  - src/v11/defaults/ui/routerDefaults.ts
  - src/v11/infrastructure/ui/eventsScanDefaults.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/core/bubble/parallelBubblesSmoke.test.ts
  - tests/core/bubble/parallelBubblesSoak.test.ts
  - tests/v11/application/list/listCommandApi.test.ts
  - tests/v11/application/list/listCommandApiError.test.ts
prd_ref: null
plan_ref: plans/shared-command-boundary-cleanup-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/shared-command-boundary-cleanup-plan-v1.md
  - plans/archive/tasks/2026-05-05-shared-command-boundary-cleanup-plan-v1/8-list-inventory.md
  - docs/modularity-review/2026-05-02-modularity-review.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
doc_bubble_id: 9-list-readmodel-introduce-doc
impl_bubble_id: 9-list-readmodel-introduce-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-05-shared-command-boundary-cleanup-plan-v1
---

# Task: List Read Model Boundary Introduction

## L0 - Policy

### Goal

Introduce the command-neutral list read-model producer boundary by moving the
current `src/v11/shared/list/**` implementation to
`src/v11/shared/read-model/list/**`, renaming command-shaped file and symbol
surfaces where this can be done without changing behavior. Keep only the
minimum explicit transition wrappers needed for current list command consumers
to keep compiling until successor cutover tasks remove them.

### Domain / Control Model Summary

1. Business invariant: list read-model code that serves CLI, UI router, events
   scan, and tests must live under a command-neutral shared boundary rather than
   `src/v11/shared/list/**`.
2. Control model: `shared/read-model/list` owns the shared list producer,
   result contract, projection, defaults bridge, and remote read helpers;
   `application/list` owns command-facing CLI entrypoints and temporary
   compatibility exports only.
3. Read-path rule: shared consumers may read list state from the new
   command-neutral boundary. Existing application list consumers may pass
   through temporary wrappers only until successor cleanup tasks cut them over.
4. Forbidden fallback: do not preserve `src/v11/shared/list/**` as a terminal
   compatibility boundary, do not move read-model code into
   `application/list`, and do not infer ownership from filename shape alone.
5. Allowed resolution path: mechanically rename/move the inventory-proven shared
   read-model files into the command-neutral boundary, then provide explicit
   application/list wrappers for current command entrypoints.
6. Missing-data rule: if a file's target ownership is still blocked by task 8
   inventory evidence, keep the behavior in the new shared read-model boundary
   and record the remaining cleanup for successor tasks instead of inventing a
   CLI-local move.
7. Phase boundary:
   - contract closure: owned here for the new command-neutral module path and
     exported read-model contract names; successor tasks remove stale aliases.
   - producer closure: owned here for moving the existing list producer files.
   - internal execution closure: deferred to task 10 for broader runtime
     consumer cutover beyond the minimum compile-preserving imports touched now.
   - workflow/orchestration closure: N/A.
   - read-model closure: owned here for the producer boundary introduction;
     successor tasks close remaining runtime consumers and stale tests.
   - activation closure: N/A.
   - cleanup/recovery closure: deferred to tasks 11 and 12.

### Plan Linkage

1. Parent plan gap closed: task 8 proved `shared/list/**` is shared read-model
   ownership, not CLI-local ownership; this task creates the command-neutral
   destination and moves/renames the existing producer into it.
2. Depends on: `8-list-inventory`.
3. Unlocks / impacts successors:
   - `10-list-runtime-cutover` removes remaining runtime consumers that still
     reach through command-shaped list paths.
   - `11-list-api-cleanup` removes command-shaped application compatibility
     aliases and stale list API names.
   - `12-list-fitness-closeout` updates tests and fitness fixtures that still
     encode the old `shared/list/listCommand*` shape.
4. Task-list impact: creates planned task `9-list-readmodel-introduce`; it does
   not refine, replace, or obsolete another task id.
5. Inherited validation / exit expectation: this task must reduce the invalid
   command-shaped shared producer by introducing a command-neutral location, but
   it may leave explicitly tracked temporary wrappers for successor removal.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/archive/tasks/2026-05-05-shared-command-boundary-cleanup-plan-v1/8-list-inventory.md`
   - `src/v11/shared/list/listCommandApi.ts`
   - `src/v11/shared/list/listCommandContract.ts`
   - `src/v11/shared/list/listCommandContext.ts`
   - `src/v11/shared/list/listCommandEntryBuilder.ts`
   - `src/v11/shared/list/listCommandEntryProjection.ts`
   - `src/v11/shared/list/listCommandDefaults.ts`
   - `src/v11/shared/list/listCommandErrors.ts`
   - `src/v11/shared/list/listRemotePaneActivityRead.ts`
   - `src/v11/defaults/ui/routerDefaults.ts`
   - `src/v11/infrastructure/ui/eventsScanDefaults.ts`
   - `tests/contracts/uiContractTransitSource.test.ts`
   - `tests/tools/fitness/uiRouterPortBoundary.test.ts`
2. Canonical elements:
   - `listBubbles` behavior, including bubble enumeration, lifecycle counts,
     stale runtime session counts, attention/review policy/meta-review fields,
     remote execution state-source fields, and refresh/cache fallback behavior.
   - `BubbleListInput`, `BubbleListEntry`, `BubbleListStateCounts`, and
     `BubbleListView` field meanings.
   - `BubbleListError` normalization and refresh fallback eligibility.
3. Guard elements:
   - command-shaped import paths are transition evidence only.
   - compatibility wrappers preserve existing callers but are not final
     ownership proof.
4. Compat-only elements:
   - `src/v11/application/list/listCommandApi.ts`
   - `src/v11/application/list/listCommandContract.ts`
   - `src/v11/application/list/listCommandDefaults.ts`
   - any short-lived `shared/list` wrapper left only to preserve compile
     continuity for explicitly named consumers.
5. Forbidden reinterpretations:
   - do not change list output fields, count semantics, stale runtime session
     semantics, remote execution cache/refresh semantics, attention/review
     policy/meta-review semantics, or error taxonomy.
   - do not treat UI/router or events consumption as test-only.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - current shared list implementation files under `src/v11/shared/list/**`.
   - application/list re-exports and CLI consumers.
   - UI defaults/events consumers.
   - core/application list tests and contract/fitness references that mention
     `shared/list/listCommandContract`.
2. Actual touched scope: `activation_or_read_model` with producer-boundary
   movement and compatibility wrappers.
3. Mutation entrypoints in scope: N/A; this task moves/renames read-model code
   and updates imports only.
4. Hidden scope ruled out: document bubble lifecycle, remote runtime redesign,
   UI router contract redesign, events payload redesign, and fitness hardening.
5. Branch inventory note: preserve local, created-remote, cached-remote,
   unavailable-remote, refreshed-remote, refresh-fallback, dependency-error,
   and stale-runtime-count branches from the current implementation.
6. Why the declared task shape matches reality: task 8 classified the residual
   list files as shared read-model/contract/deferred around the same producer;
   this task introduces that producer's command-neutral home without absorbing
   runtime cutover, API cleanup, or fitness closeout.

### Authority Boundary Map

1. Authority producer: `shared/read-model/list` after the move.
2. Stored authority: existing Pairflow bubble metadata, lifecycle state files,
   runtime sessions registry, remote pointer/cache files, and watchdog pane
   activity remain unchanged.
3. In-scope consumers: direct imports required to keep the moved producer,
   application/list command facade, UI defaults, events scan defaults, and
   focused list tests compiling against the new boundary or explicit wrappers.
4. Explicit out-of-scope consumers: broad UI/router contract fixture cleanup,
   final application compatibility alias removal, and governance hardening.
5. Export surfaces closed in this phase: yes, the new command-neutral shared
   read-model module path is introduced and used by first-wave consumers.

### Baseline Preservation

1. Must-preserve behaviors:
   - list input defaults and repo resolution behavior.
   - state counts and stale runtime session counts.
   - local/remote projection field meanings.
   - remote state cache read/write and refresh fallback behavior.
   - attention, approval, review policy, and meta-review fields.
   - `BubbleListError` normalization and fallback eligibility.
2. Allowed resolution paths:
   - mechanical import updates from old command-shaped paths to new
     command-neutral paths.
   - temporary compatibility wrappers that delegate to the new boundary.
3. Forbidden regression interpretations:
   - renaming is not permission to simplify fields, drop compat placeholders,
     tighten fallbacks, or collapse unavailable remote states.
4. Replacement proof required if removed:
   - any removed old export path must have a named new import path and a focused
     test or typecheck proving current consumers still compile.

### Success / Completion Proof Boundary

N/A. This task does not change a mutable flow's success or completion semantics.

### Precondition and Side-Effect Boundary

N/A. This task does not introduce runtime mutations or coordination primitives.

### In Scope

1. Create `src/v11/shared/read-model/list/**` as the command-neutral shared
   list read-model boundary.
2. Move/rename current `shared/list/listCommand*` producer files into that
   boundary with `listReadModel*` naming where behavior-preserving.
3. Update imports within the moved producer and first-wave direct consumers to
   the new command-neutral path.
4. Keep temporary wrappers only where required for current application/list or
   explicitly tracked transition consumers.
5. Preserve all current list behavior and result/error field meanings.
6. Run focused list/read-model tests plus repository verification required for
   direct source changes.

### Out of Scope

1. Full UI router or events read-model redesign.
2. Removing every command-shaped application/list alias.
3. Removing all compatibility wrappers.
4. Updating final fitness policy from warning to stricter enforcement.
5. Changing remote execution refresh/cache semantics.
6. Changing list CLI output formatting.

### Safety Defaults

1. If a consumer cannot be moved safely in this slice, keep an explicit wrapper
   with a successor-task note rather than changing runtime behavior.
2. If a rename would require semantic changes, preserve the existing symbol name
   behind the new boundary and defer cleanup.
3. If a focused test reveals behavior drift, revert the attempted semantic
   change and keep the task to mechanical boundary movement.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - internal shared TypeScript module/import contract for list read-model
     producer and DTOs.
   - no DB, auth, config, or event payload contract changes.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. Required split: N/A; successor tasks already split runtime cutover, API
   cleanup, and fitness closeout.
10. Identity/join note:
   - canonical identity path: file/module ownership moves from
     `shared/list` to `shared/read-model/list`.
   - competing identifiers or fallback identities: command-shaped file and
     symbol names are transition aliases, not ownership truth.
11. Authority/source-of-truth note:
   - canonical source: task 8 inventory plus current source semantics.
   - forbidden secondary sources: filename shape, convenience imports, or
     future reuse assumptions.
12. Closure-budget triage:
   - closure buckets touched: `authority_producer`, `shared_contract`,
     `read_model_consumers`, `internal_execution_consumers`.
   - intentionally collapsed closures: producer move plus minimum first-wave
     compile-preserving consumers, because a moved module must have resolvable
     imports in the same change.
   - explicitly deferred closures: broad runtime consumer cutover, compatibility
     alias cleanup, tests/fitness closeout.
13. Bounded-task-shape decision:
   - primary shape: `activation_or_read_model`
   - secondary shape: `consumer_family_alignment` for first-wave imports only.
   - why this bounded mix is safe: no runtime behavior is changed; the consumer
     edits are mechanical path updates required by the boundary move.
14. Contract-dense decision:
   - gate triggered: `yes`
   - trigger reasons: `API/result shape`, `fallback/precedence`,
     `downstream consumers`, `mirrored surfaces`.
   - canonical matrix source: L1 `Canonical Contract Matrix`.
   - mirrored surfaces: L0 canonical anchors, L1 data/interface contract,
     fallback contract, test matrix, acceptance criteria.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Shared list read-model producer must no longer live under command-shaped `shared/list` ownership. | Move the existing producer to `shared/read-model/list`. | P1 | required-now |
| Control model | `shared/read-model/list` owns shared list DTOs/projection; `application/list` owns command facade. | Do not move the producer into `application/list`; wrappers may delegate only. | P1 | required-now |
| Read-path rule | Consumers should read shared list DTOs/API from the command-neutral boundary or an explicit temporary wrapper. | Update first-wave imports and name remaining wrappers as transition surfaces. | P1 | required-now |
| Forbidden fallback | Filename shape, convenience import churn, and future reuse speculation cannot decide ownership. | Follow task 8 inventory classifications. | P1 | required-now |
| Missing-data rule | Ambiguous cleanup remains deferred, not silently solved by this task. | Leave stale aliases only with successor ownership. | P1 | required-now |
| Phase boundary | Boundary introduction now; runtime cutover, API cleanup, and fitness closeout later. | Do not absorb tasks 10-12. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `BubbleListView` and `BubbleListEntry` fields | `src/v11/shared/list/listCommandContract.ts` | Field names and meanings remain unchanged unless renamed aliases are purely type-level and compatible. | Preserve behavior; expose from new boundary. | P1 | required-now |
| `listBubbles` result behavior | `src/v11/shared/list/listCommandApi.ts` | Counts, sorting, error conversion, and entry construction remain behavior-equivalent. | Move/rename mechanically. | P1 | required-now |
| Remote projection fields | `src/v11/shared/list/listCommandEntryProjection.ts` | `stateSource`, refresh/cache fallback, unavailable states, attention, and review metadata remain unchanged. | Preserve exactly. | P1 | required-now |
| Error normalization | `src/v11/shared/list/listCommandErrors.ts` | `BubbleListError` and refresh fallback eligibility keep current semantics. | Preserve or alias from new boundary. | P1 | required-now |
| Compatibility wrappers | `src/v11/application/list/*.ts` | Wrappers are transitional import bridges, not canonical ownership. | Keep minimal wrappers for compile continuity. | P2 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Use task 8 inventory and current direct imports as the movement source. | Update only first-wave imports required for moved files and focused tests. | P1 | required-now |
| Actual touched scope | Producer-boundary rename plus mechanical consumer path alignment. | Do not redesign producer behavior. | P1 | required-now |
| Mutation entrypoints in scope | N/A. | No side-effect ordering changes. | P1 | required-now |
| Hidden scope ruled out | Runtime lifecycle, UI router redesign, events redesign, and fitness hardening are successor work. | Do not include broad consumer cleanup. | P1 | required-now |
| Branch inventory note | Preserve current local/remote/fallback branches. | Focus tests on behavior-preserving move. | P1 | required-now |
| Shape proof | The task introduces a new shared read-model home and leaves cleanup to planned successors. | The bounded slice matches task 9 in the plan. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Introduce command-neutral list read-model boundary after task 8 inventory. | `shared/list` may remain only as tracked transition wrappers, not producer home. | P1 | required-now |
| Depends on | `8-list-inventory`. | Consume its ownership classifications. | P1 | required-now |
| Unlocks / impacts successors | Tasks 10, 11, and 12. | Name any remaining wrappers/aliases for those tasks. | P1 | required-now |
| Task-list impact | Creates planned task 9 only. | No supersession. | P1 | required-now |
| Inherited validation / exit expectation | Move producer without behavior changes and keep final no-`shared/list` closure for later tasks. | Verify focused behavior and compile/type boundaries. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| list read-model API module path | UI defaults, events scan, application/list facade, core list tests, smoke/soak tests. | breaking import-path move with compatibility wrappers where needed. | Introduce new command-neutral import path and update first-wave consumers. | Tasks 10 and 11 remove wrappers and stale aliases. |
| list DTO/result field contract | CLI, UI/event read-model consumers, contract/fitness tests. | additive/compatible naming transition only; field semantics unchanged. | Preserve field names/meanings and expose from new boundary. | Task 12 updates stale test/fitness path assumptions. |
| list error contract | application list tests and remote refresh fallback. | compatible. | Preserve `BubbleListError` semantics. | Task 11 may rename stale command-shaped aliases. |

### 0e) Baseline Preservation

| Behavior | Current Anchor | Preservation Rule | Required Proof |
|---|---|---|---|
| repo/default resolution | `listCommandContext.ts`, `listCommandDefaults.ts` | Same defaults and repo normalization behavior after move. | focused list tests/typecheck |
| local entry projection | `listCommandEntryProjection.ts` | Same lifecycle/state/count fields. | `tests/core/bubble/listBubbles.test.ts` focused rows |
| remote entry projection | `listCommandEntryProjection.ts`, `listRemotePaneActivityRead.ts` | Same cache/refresh/unavailable state behavior. | focused list remote tests or existing list suite |
| error normalization | `listCommandErrors.ts`, `listCommandApi.ts` | Same thrown error shape and fallback eligibility. | `tests/v11/application/list/listCommandApiError.test.ts` |

### 1) Canonical Contract Matrix

| Matrix ID | Current Surface | Target Surface | Owned Now | Deferred | Compatibility Rule |
|---|---|---|---|---|---|
| LRM-API | `src/v11/shared/list/listCommandApi.ts` | `src/v11/shared/read-model/list/listReadModelApi.ts` | move producer and expose behavior-equivalent API | remove stale command aliases in task 11 | wrappers must delegate without changing output |
| LRM-CONTRACT | `src/v11/shared/list/listCommandContract.ts` | `src/v11/shared/read-model/list/listReadModelContract.ts` | move DTO/result contract under command-neutral path | update remaining test/fitness path anchors in task 12 | field meanings remain unchanged |
| LRM-DEFAULTS | `src/v11/shared/list/listCommandDefaults.ts` | `src/v11/shared/read-model/list/listReadModelDefaults.ts` | preserve defaults bridge for moved producer | decide final wrapper naming in task 11 | same imported defaults object |
| LRM-PROJECTION | `listCommandEntryBuilder/Projection/RemotePaneActivityRead` | `listReadModelEntryBuilder/Projection/RemotePaneActivityRead` | move projection and remote helper together | broader runtime consumer cleanup in task 10 | remote/cache/attention semantics unchanged |
| LRM-ERROR | `src/v11/shared/list/listCommandErrors.ts` | `src/v11/shared/read-model/list/listReadModelErrors.ts` | preserve error normalization and fallback eligibility | stale alias cleanup in task 11 | error class and context semantics unchanged |

### 2) Data and Interface Contract

| Interface / Function | Current Contract | Target Contract | Side Effects | Priority | Timing |
|---|---|---|---|---|---|
| `listBubbles` | Reads repo/list context and returns `BubbleListView`. | Same behavior from command-neutral read-model API. | Reads filesystem/runtime/remote cache as before. | P1 | required-now |
| `BubbleListInput` | Optional repo/refresh input. | Same fields and meanings. | N/A. | P1 | required-now |
| `BubbleListView` | Entries plus counts. | Same fields and meanings. | N/A. | P1 | required-now |
| `BubbleListEntry` | Local/remote/UI list entry DTO. | Same fields and meanings. | N/A. | P1 | required-now |
| `BubbleListError` | Normalized list error. | Same class/context semantics. | N/A. | P1 | required-now |

### 3) Side Effects Contract

| Operation | Allowed Side Effects | Forbidden Side Effects | Priority | Timing |
|---|---|---|---|---|
| Module move/rename | File moves, import rewrites, compatibility wrapper updates. | Runtime state writes beyond existing list behavior. | P1 | required-now |
| `listBubbles` runtime execution | Existing reads and remote cache refresh writes remain as before. | New state sources, new fallback identities, or changed write ordering. | P1 | required-now |

### 4) Error and Fallback Contract

| Case | Required Behavior | Forbidden Behavior | Test Expectation |
|---|---|---|---|
| repo resolution failure | Preserve current `BubbleListError` behavior. | Replace with generic errors. | application error test |
| refresh fallback eligible error | Preserve fallback eligibility and cached/unavailable projection. | Treat every remote failure as equivalent. | list remote-focused tests |
| missing/invalid state | Preserve current unavailable or error behavior according to existing branch. | Invent UI-specific fallback truth. | core list tests |

### 5) Dependency Constraints

1. Use TypeScript path-relative imports consistent with current ESM `.js` import
   style.
2. Do not introduce new runtime dependencies.
3. Do not promote code into broader `shared` scope outside
   `shared/read-model/list` without explicit multi-lane justification.

### 6) Test Matrix

| Test / Check | Purpose | Priority | Timing |
|---|---|---|---|
| `pnpm vitest run tests/v11/application/list/listCommandApi.test.ts tests/v11/application/list/listCommandApiError.test.ts` | application facade and error compatibility | P1 | required-now |
| `pnpm vitest run tests/core/bubble/listBubbles.test.ts` | preserve list producer behavior and projection branches | P1 | required-now |
| `pnpm vitest run tests/core/bubble/parallelBubblesSmoke.test.ts tests/core/bubble/parallelBubblesSoak.test.ts` | direct list API consumers compile/run after import moves | P2 | required-now |
| `pnpm typecheck` | import/type contract integrity | P1 | required-now |
| `pnpm lint` | source style and import hygiene | P1 | required-now |
| `pnpm fitness:check:ci` | boundary/fitness regression evidence | P1 | required-now |
| `pnpm test` | broad regression before completion | P1 | required-now |
| `pnpm build` | runtime artifact freshness after source changes | P1 | required-now |

### 7) Ownership and Deferred Semantics

1. This task owns the new command-neutral producer path and first-wave import
   alignment.
2. This task records but does not close remaining command-shaped application API
   cleanup.
3. This task records but does not close stale UI/router contract fixtures or
   fitness assertions.
4. Successor tasks must not infer that a compatibility wrapper is final
   ownership.

### 8) Structured Contract Rules

1. Required fields for list DTOs remain the existing TypeScript contract fields.
2. Optional fields remain optional exactly as in the current contract.
3. Unknown input fields remain governed by TypeScript compile-time shape; no new
   runtime payload parser is introduced.
4. Malformed or missing runtime files follow existing list error/unavailable
   paths.
5. Duplicate or multi-candidate bubble ids remain governed by existing list
   bubble id enumeration and per-bubble entry construction.

### 9) Mirrored Surface Checklist

1. L0 canonical anchors.
2. L1 canonical contract matrix.
3. L1 data/interface contract.
4. L1 error/fallback contract.
5. L1 test matrix.
6. Acceptance criteria.

### 10) Acceptance Criteria

1. The current list read-model producer implementation has a command-neutral
   home under `src/v11/shared/read-model/list/**`.
2. First-wave consumers needed for compile/test continuity import the new
   boundary directly or through explicit temporary wrappers.
3. Any remaining `src/v11/shared/list/**` surface is either removed or limited
   to explicitly named transition wrappers for successor cleanup.
4. List result, count, remote projection, attention/review metadata, and error
   semantics remain behavior-equivalent.
5. The task leaves clear notes for tasks 10-12 about remaining wrappers, stale
   aliases, or test/fitness path anchors.

## L2 - Implementation Notes

1. Prefer `git mv` or equivalent move operations for file history, then update
   imports and exported symbol names mechanically.
2. Start with the contract/API/defaults files, then projection/context/error
   helpers.
3. Keep compatibility wrappers extremely small and side-effect free.
4. Run focused list tests before broad verification to catch import or behavior
   drift early.
5. Hardening Backlog: No open later-hardening items beyond planned successor
   tasks 10-12.

## Assumptions

1. `shared/read-model/list` is the narrowest command-neutral shared location for
   this read-model producer.
2. Temporary wrappers are acceptable only because tasks 10-12 are already
   planned to remove remaining command-shaped surfaces.

## Open Questions

1. N/A.
