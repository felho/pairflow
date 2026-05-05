---
artifact_type: task
artifact_id: task_list_runtime_cutover_v1
task_family_id: list-runtime-cutover
sequence_key: "10"
task_id: 10-list-runtime-cutover
title: "List Runtime Consumer Cutover"
status: archived
phase: phase4
target_files:
  # Runtime transition boundary to remove after consumer proof.
  - src/v11/shared/list/listCommandApi.ts
  - src/v11/shared/list/listCommandContext.ts
  - src/v11/shared/list/listCommandContract.ts
  - src/v11/shared/list/listCommandDefaults.ts
  - src/v11/shared/list/listCommandEntryBuilder.ts
  - src/v11/shared/list/listCommandEntryProjection.ts
  - src/v11/shared/list/listCommandErrors.ts
  - src/v11/shared/list/listRemotePaneActivityRead.ts
  # In-scope runtime/read-model consumers and proof harnesses.
  - src/v11/defaults/ui/routerDefaults.ts
  - src/v11/infrastructure/ui/eventsScanDefaults.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/core/bubble/parallelBubblesSmoke.test.ts
  - tests/core/bubble/parallelBubblesSoak.test.ts
  # Application-facade compatibility proof only; do not remove these facades
  # in task 10.
  - src/v11/application/list/listCommandApi.ts
  - src/v11/application/list/listCommandContract.ts
  - src/v11/application/list/listCommandDefaults.ts
  - tests/v11/application/list/listCommandApi.test.ts
  - tests/v11/application/list/listCommandApiError.test.ts
  # Conditional narrow unblocker scope only: edit these only if wrapper deletion
  # directly breaks compile/typecheck or pnpm fitness:check:ci.
  - tests/contracts/uiContractTransitSource.test.ts
  - tests/tools/fitness/uiRouterPortBoundary.test.ts
  - tests/tools/fitness/fitnessCheckCi.test.ts
  # Defaults surface proof only; no semantic move in task 10.
  - src/v11/defaults/list/listCommandDefaults.ts
  - src/v11/shared/status/statusCommandDependencyDefaults.ts
prd_ref: null
plan_ref: plans/shared-command-boundary-cleanup-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/shared-command-boundary-cleanup-plan-v1.md
  - plans/archive/tasks/2026-05-05-shared-command-boundary-cleanup-plan-v1/8-list-inventory.md
  - plans/archive/tasks/2026-05-05-shared-command-boundary-cleanup-plan-v1/9-list-readmodel-introduce.md
  - docs/modularity-review/2026-05-02-modularity-review.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
doc_bubble_id: 10-list-runtime-cutover-doc
impl_bubble_id: 10-list-runtime-cutover-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-05-shared-command-boundary-cleanup-plan-v1
---

# Task: List Runtime Consumer Cutover

## L0 - Policy

### Goal

Remove the remaining runtime dependency on the command-shaped
`src/v11/shared/list/**` transition boundary now that task 9 introduced
`src/v11/shared/read-model/list/**` as the canonical shared list producer.
Delete the `shared/list` transition wrappers only after proving runtime,
UI-default, events-scan, and core list consumers import the command-neutral
read-model boundary. Application/list command facades are compatibility proof
only in this task; they must not be treated as a reason to keep
`src/v11/shared/list/**` or as permission to do task 11 cleanup early.

### Domain / Control Model Summary

1. Business invariant: runtime and read-model consumers must not depend on a
   command-shaped shared list directory after the command-neutral read-model
   producer exists.
2. Control model: `src/v11/shared/read-model/list/**` owns shared list
   read-model producer and DTO truth; `src/v11/application/list/**` owns the
   command-facing facade until task 11 removes stale application aliases.
3. Read-path rule: runtime consumers read list behavior from
   `shared/read-model/list` directly, not from `shared/list` wrappers.
4. Forbidden fallback: do not keep `shared/list/**` only because tests or future
   cleanup tasks still mention old path strings as fixture evidence.
5. Allowed resolution path: update any remaining runtime source import to the
   command-neutral read-model path; if no runtime source imports remain, remove
   the `shared/list` transition wrappers and prove no source consumer breaks.
6. Classification rule: a source consumer is in scope only when it is a
   runtime/defaults/events/core list read path. Application/list command facade
   imports are explicitly deferred compatibility surfaces for task 11, and
   fixture/source-string references are explicitly deferred evidence for task
   12.
7. Missing-data rule: if a remaining consumer cannot be classified as runtime
   versus application facade/test-fixture ownership, leave it unchanged and
   route the ambiguity to task 11 or task 12 rather than widening this slice.
8. Phase boundary:
   - contract closure: producer contract already closed by task 9.
   - producer closure: already closed by task 9.
   - internal execution closure: owned here for runtime/defaults/events/core
     consumers and deletion of the `shared/list` runtime transition wrappers.
   - workflow/orchestration closure: N/A.
   - read-model closure: owned here only for runtime read paths.
   - activation closure: N/A.
   - cleanup/recovery closure: deferred to task 11 for application facade aliases
     and task 12 for contract/fitness fixture wording.

### Plan Linkage

1. Parent plan gap closed: runtime consumers must stop depending on the
   command-shaped `shared/list` transition boundary before application/API and
   fitness cleanup can safely remove stale aliases.
2. Depends on: `9-list-readmodel-introduce`.
3. Unlocks / impacts successors:
   - `11-list-api-cleanup` can remove command-shaped application/list facade
     aliases after runtime consumers no longer need `shared/list`.
   - `12-list-fitness-closeout` can update test and fitness fixtures after the
     source tree no longer contains `src/v11/shared/list/**`.
4. Task-list impact: creates planned task `10-list-runtime-cutover`; it does
   not replace or supersede another task id.
5. Inherited validation / exit expectation: no production/runtime import may
   require `src/v11/shared/list/**` after this task, and behavior must remain
   equivalent.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/shared/read-model/list/listReadModelApi.ts`
   - `src/v11/shared/read-model/list/listReadModelContract.ts`
   - `src/v11/shared/read-model/list/listReadModelDefaults.ts`
   - `src/v11/defaults/ui/routerDefaults.ts`
   - `src/v11/infrastructure/ui/eventsScanDefaults.ts`
   - `tests/core/bubble/listBubbles.test.ts`
   - `tests/core/bubble/parallelBubblesSmoke.test.ts`
   - `tests/core/bubble/parallelBubblesSoak.test.ts`
2. Canonical elements:
   - `listBubbles`, `BubbleListInput`, `BubbleListEntry`,
     `BubbleListStateCounts`, `BubbleListView`, `BubbleListError`, and remote
     projection field meanings remain as defined by the read-model boundary.
3. Guard elements:
   - residual old-path fixture strings in contract/fitness tests are regression
     evidence only, not runtime import authority.
4. Compat-only elements:
   - `src/v11/application/list/listCommandApi.ts`
   - `src/v11/application/list/listCommandContract.ts`
   - `src/v11/application/list/listCommandDefaults.ts`
   - these application facades may import the canonical read-model boundary but
     must not import `src/v11/shared/list/**` after task 10.
5. Forbidden reinterpretations:
   - do not change list output fields, count semantics, remote refresh/cache
     fallback behavior, attention/review policy/meta-review semantics, or error
     taxonomy.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/defaults/ui/routerDefaults.ts`
   - `src/v11/infrastructure/ui/eventsScanDefaults.ts`
   - `tests/core/bubble/listBubbles.test.ts`
   - `tests/core/bubble/parallelBubblesSmoke.test.ts`
   - `tests/core/bubble/parallelBubblesSoak.test.ts`
   - `src/v11/shared/list/**` transition wrappers
   - application/list facade files and contract/fitness fixture references
2. Actual touched scope: consumer-family alignment for runtime/read-model
   consumers plus transition-wrapper deletion.
3. Mutation entrypoints in scope: N/A; this task only changes module paths and
   removes compatibility wrappers.
4. Hidden scope ruled out: application/list public facade cleanup, UI/router
   payload redesign, events payload redesign, and broad fitness/governance
   fixture cleanup are successor work. Task 10 may touch contract/fitness
   fixtures only as a narrow unblocker when deleting `src/v11/shared/list/**`
   directly breaks compile/typecheck or `pnpm fitness:check:ci`.
5. Branch inventory note: preserve existing local, remote, refresh-fallback,
   dependency-error, stale-runtime-count, attention, review policy, and
   meta-review branches by import-path-only changes.
6. Why the declared task shape matches reality: task 9 already created the
   canonical producer, and current source consumers already point at the new
   boundary; this task closes the runtime transition wrapper without changing
   behavior.
7. Current-tree evidence at document refinement time:
   - UI router defaults, events scan defaults, and core list tests already
     import `src/v11/shared/read-model/list/**`.
   - `src/v11/shared/list/**` still exists as transition-wrapper source and is
     the deletion candidate for this task.
   - Application/list command facade files already delegate to
     `shared/read-model/list`; task 10 must keep them as compatibility proof
     and leave their removal or rename to task 11.
   - Contract transit and fitness tests still contain old
     `shared/list/listCommand*` fixture/source strings; task 10 must leave that
     wording to task 12 unless a compile/typecheck failure or
     `pnpm fitness:check:ci` failure proves the specific reference is an active
     blocker caused by deleting `src/v11/shared/list/**`.

### Authority Boundary Map

1. Authority producer: `src/v11/shared/read-model/list/**`.
2. Stored authority: existing Pairflow bubble metadata, lifecycle files, runtime
   session registry, remote pointer/cache files, and watchdog pane activity.
3. In-scope consumers: UI router defaults, events scan defaults, direct core
   list tests, and any non-application runtime source import that still reaches
   through `shared/list`.
4. Explicit out-of-scope consumers: application/list command facade aliases,
   CLI display/formatting, contract transit fixture wording, fitness fixture
   paths, and governance hardening.
5. Export surfaces closed in this phase: yes, the `src/v11/shared/list/**`
   runtime transition boundary should no longer exist after successful cutover.

### Baseline Preservation

1. Must-preserve behaviors:
   - list input defaults and repo resolution behavior.
   - state counts and stale runtime session counts.
   - local and remote projection field meanings.
   - remote state cache read/write and refresh fallback behavior.
   - attention, approval, review policy, and meta-review fields.
   - `BubbleListError` normalization and fallback eligibility.
2. Allowed resolution paths:
   - mechanical import updates to `shared/read-model/list`.
   - deleting `src/v11/shared/list/**` only when source consumers no longer
     import it.
3. Forbidden regression interpretations:
   - deleting wrappers is not permission to change DTO fields, fallback
     semantics, output sorting, or runtime unavailable-state handling.
4. Replacement proof required if removed:
   - every deleted `shared/list` wrapper must have an equivalent canonical
     `shared/read-model/list` export already available.

### Success / Completion Proof Boundary

N/A. This task does not change a mutable flow's success or completion
semantics.

### Precondition and Side-Effect Boundary

N/A. This task does not introduce runtime mutations or coordination primitives.

### In Scope

1. Verify and, if needed, update runtime/defaults/events/core list consumers to
   import `shared/read-model/list/**`.
2. Delete `src/v11/shared/list/**` transition wrappers once no runtime source
   consumer imports them.
3. Keep `src/v11/application/list/**` compatibility facade files unchanged for
   task 11.
4. Leave contract/fitness old-path fixture strings to task 12 by default.
   Exception: task 10 may make the smallest fixture/source-assertion edit
   needed to unblock compile/typecheck or `pnpm fitness:check:ci` after
   deleting `src/v11/shared/list/**`, but only when the failure is directly
   caused by that deletion and does not require governance policy tightening.
5. Preserve list behavior and error/result semantics.

### Out of Scope

1. Removing application/list command facade wrappers.
2. Renaming public CLI command types or list CLI formatting.
3. Broad contract transit source fixture or fitness fixture cleanup. Narrow
   unblocker edits are allowed only under the compile/typecheck/fitness
   unblocker decision rule below.
4. Tightening governance warnings or policy.
5. Changing remote execution refresh/cache behavior.

### Safety Defaults

1. If a consumer cannot be confidently classified, do not delete its path in
   this task; record the ambiguity for task 11 or 12.
2. If deleting `shared/list/**` exposes a real runtime import, update that
   runtime import mechanically rather than restoring the wrapper.
3. If a focused list test shows behavior drift, revert semantic changes and
   keep this task to import-path/deletion work only.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - internal TypeScript module/import contract for shared list read-model
     consumers.
   - no DB, auth, config, event payload, or user-facing API changes.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `4`
8. `single-task allowed`: `yes`
9. Required split: N/A.
10. Identity/join note:
   - canonical identity path: runtime list consumers import
     `shared/read-model/list/**`.
   - competing identifiers or fallback identities: `shared/list/**` wrappers
     are transition-only and must not remain runtime truth.
11. Authority/source-of-truth note:
   - canonical source: task 9 producer boundary and task 8 inventory.
   - forbidden secondary sources: old path fixture strings and convenience
     wrappers.
12. Closure-budget triage:
   - closure buckets touched: `internal_execution_consumers`,
     `read_model_consumers`.
   - intentionally collapsed closures: wrapper deletion plus runtime consumer
     cutover, because the wrapper has no independent behavior.
   - explicitly deferred closures: application facade cleanup and
     test/fitness fixture cleanup.
13. Bounded-task-shape decision:
   - primary shape: `consumer_family_alignment`.
   - secondary shape: `activation_or_read_model` for direct runtime read paths.
   - why this bounded mix is safe: only module import paths and empty
     transition wrappers are affected; list behavior remains owned by the
     existing read-model producer.
14. Contract-dense decision:
   - gate triggered: `yes`
   - trigger reasons: `API/result shape`, `downstream consumers`,
     `mirrored surfaces`
   - canonical matrix source: L1 `Canonical Contract Matrix`
   - mirrored surfaces: L0 canonical anchors, L1 compatibility table, test
     matrix, acceptance criteria.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Runtime list consumers must not depend on `src/v11/shared/list/**`. | Delete the transition wrapper only after runtime imports point to `shared/read-model/list`. | P1 | required-now |
| Control model | `shared/read-model/list` owns shared list producer truth. | Runtime consumers import the canonical boundary directly. | P1 | required-now |
| Read-path rule | UI defaults, events scan defaults, and core list tests read from the command-neutral boundary. | No runtime path should import `shared/list/listCommand*`. | P1 | required-now |
| Application facade boundary | `application/list/listCommand*` is successor-owned compatibility. | Prove it still works, but do not delete or rename it here. | P1 | required-now |
| Fixture boundary | Contract transit and fitness old-path strings are successor-owned evidence. | Do not edit them unless compile/typecheck or `pnpm fitness:check:ci` proves a narrow stale reference is directly blocking `shared/list/**` wrapper deletion. | P1 | required-now |
| Forbidden fallback | Old path fixture strings are not authority to keep source wrappers. | Do not retain `shared/list/**` for tests that intentionally model old paths. | P1 | required-now |
| Missing-data rule | Ambiguous consumer ownership routes to successor tasks. | Do not absorb application/list facade or fitness cleanup. | P1 | required-now |
| Phase boundary | Runtime cutover now; application facade and fitness cleanup later. | Keep task 11 and 12 scopes intact. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `listBubbles` | `src/v11/shared/read-model/list/listReadModelApi.ts` | Behavior remains equivalent to task 9 output. | Preserve; only import paths/wrappers change. | P1 | required-now |
| DTO fields | `src/v11/shared/read-model/list/listReadModelContract.ts` | Field names and meanings remain unchanged. | Preserve. | P1 | required-now |
| Defaults bridge | `src/v11/shared/read-model/list/listReadModelDefaults.ts` | Same runtime defaults behavior. | Preserve. | P1 | required-now |
| Transition wrappers | `src/v11/shared/list/**` | Compat-only, not canonical. | Remove when no runtime imports remain. | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Runtime/defaults/events/core list consumers define the real scope. | Do not use task title alone to pull in application facade cleanup. | P1 | required-now |
| Actual touched scope | Consumer-family alignment. | Keep changes mechanical and behavior-preserving. | P1 | required-now |
| Mutation entrypoints in scope | N/A. | No runtime side-effect ordering changes. | P1 | required-now |
| Hidden scope ruled out | Application facade and fitness fixture cleanup are successor tasks. | Do not rename CLI/application exports or fitness policy here. | P1 | required-now |
| Branch inventory note | Existing list behavior branches must remain covered. | Run focused list/core tests. | P1 | required-now |
| Shape proof | The only source boundary being removed is a wrapper delegating to the canonical producer. | Deletion is safe if typecheck and focused tests pass. | P1 | required-now |
| Current source proof | Existing runtime/defaults/events/core consumers already point at `shared/read-model/list`; the old shared/list directory remains as wrapper source. | Task 10 implementation should be mostly wrapper deletion plus verification unless a fresh search finds a new runtime import. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Runtime consumers stop using command-shaped shared list paths. | Source tree no longer needs `shared/list/**` for runtime. | P1 | required-now |
| Depends on | `9-list-readmodel-introduce`. | The canonical producer must already exist. | P1 | required-now |
| Unlocks / impacts successors | Tasks 11 and 12. | They can remove application facade aliases and fixture references after runtime cutover. | P1 | required-now |
| Task-list impact | Creates task `10-list-runtime-cutover`. | No supersession. | P1 | required-now |
| Inherited validation / exit expectation | Behavior-preserving cutover. | Run focused list tests plus required repo verification for source changes. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `shared/list/**` wrapper module paths | Runtime consumers should no longer use them; fixture strings may still mention them. | breaking for direct old-path imports. | Remove wrapper source files after proving runtime imports are cut over. | Task 12 updates fixture/governance references. |
| `shared/read-model/list/**` module paths | UI defaults, events scan, core tests, application facade. | compatible. | Preserve and use as canonical runtime import. | Task 11 may adjust application facade consumers. |
| `application/list/listCommand*.ts` facade paths | CLI/application callers and application compatibility tests. | compatible. | Preserve unchanged, except only if compile forces import maintenance without facade removal. | Task 11 owns facade alias deletion/rename. |

### 1) Canonical Contract Matrix

| Matrix ID | Current Surface | Target Surface | Owned Now | Deferred | Compatibility Rule |
|---|---|---|---|---|---|
| LRC-RUNTIME | `src/v11/shared/list/**` transition wrappers | `src/v11/shared/read-model/list/**` | remove runtime dependency and wrapper source | contract/fitness fixture string cleanup | behavior must be identical |
| LRC-APP-FACADE | `src/v11/application/list/listCommand*.ts` | successor-owned application facade cleanup | no | task 11 | do not remove in this task |
| LRC-FITNESS | old path fixture strings in tests | successor-owned fixture/governance wording | no | task 12 | may remain as non-runtime fixture evidence |
| LRC-DEFAULTS | `src/v11/defaults/list/listCommandDefaults.ts` and status dependency defaults using it | existing defaults provider outside `shared/list` | no semantic move | later naming cleanup only if separately planned | not a reason to keep `shared/list/**` |

### 2) Data and Interface Contract

| Interface / Function | Current Contract | Target Contract | Side Effects | Priority | Timing |
|---|---|---|---|---|---|
| `listBubbles` | Returns `BubbleListView` from canonical read-model API. | Same. | Existing reads/cache refresh only. | P1 | required-now |
| `BubbleListInput` | Optional repo/refresh input. | Same. | N/A. | P1 | required-now |
| `BubbleListView` / `BubbleListEntry` | Existing field semantics. | Same. | N/A. | P1 | required-now |
| `BubbleListError` | Existing normalization and fallback eligibility. | Same. | N/A. | P1 | required-now |

### 3) Error and Fallback Contract

| Case | Required Behavior | Forbidden Behavior | Test Expectation |
|---|---|---|---|
| Runtime import missing after wrapper deletion | Compile fails and task must update the runtime import to `shared/read-model/list`. | Restore wrappers as hidden fallback. | typecheck |
| Application facade import remains after wrapper deletion | Application facade compiles by importing `shared/read-model/list`. | Remove the facade because it still has command-shaped names. | application list tests |
| Fixture old path remains after wrapper deletion | Fixture remains as successor-owned regression evidence. | Edit broad contract/fitness fixtures just to erase strings in task 10. | task 12 owns fixture cleanup |
| Compile/typecheck/fitness fails because deleted `shared/list/**` path is still treated as an active allowed/source path | Task 10 may apply the smallest direct fixture/source-assertion update needed for compile/typecheck or `pnpm fitness:check:ci` to reflect the deleted wrapper boundary. | Broaden into task 12 cleanup, tighten governance policy, or rewrite unrelated command-name fixtures. | typecheck/fitness |
| Compile/typecheck/fitness fails for a broader task-12/governance reason | Stop for replanning or a human decision. | Hide the failure by restoring `shared/list/**` or doing broad fixture cleanup in task 10. | human checkpoint |
| Remote refresh fallback | Existing cached/unavailable semantics remain. | Treat remote failures differently because path changed. | list behavior tests |
| Application facade still imports canonical producer | Leave unchanged here. | Delete command facade aliases in task 10. | application list tests remain green |

### 4) Dependency Constraints

1. Use existing ESM `.js` relative import style.
2. Do not add runtime dependencies.
3. Do not introduce a new shared boundary name.
4. Do not promote list command facade code into `shared`.

### 5) Test Matrix

| Test / Check | Purpose | Priority | Timing |
|---|---|---|---|
| `pnpm vitest run tests/core/bubble/listBubbles.test.ts tests/core/bubble/parallelBubblesSmoke.test.ts tests/core/bubble/parallelBubblesSoak.test.ts` | preserve list behavior and direct runtime consumers | P1 | required-now |
| `pnpm vitest run tests/v11/application/list/listCommandApi.test.ts tests/v11/application/list/listCommandApiError.test.ts` | prove application facade still works while deferred | P1 | required-now |
| `pnpm typecheck` | import contract integrity | P1 | required-now |
| `pnpm lint` | source style/import hygiene | P1 | required-now |
| `pnpm fitness:check:ci` | boundary regression evidence | P1 | required-now |
| `pnpm test` | broad regression before completion | P1 | required-now |
| `pnpm build` | runtime artifact freshness after source changes | P1 | required-now |

### 6) Ownership and Deferred Semantics

1. This task owns runtime read-path cutover and `shared/list/**` wrapper
   deletion.
2. Task 11 owns application/list command facade alias cleanup.
3. Task 12 owns contract transit, fitness fixture, and source assertion wording
   that still encodes old `shared/list/listCommand*` examples.
4. A passing task 10 must not be interpreted as permission to keep
   `src/v11/shared/list/**` as a source boundary.

## L2 - Implementation Notes

1. Start with source import evidence, not broad string cleanup:
   `rg -n "shared/list|shared/read-model/list|application/list/listCommand|listCommand" src/v11 tests/core/bubble tests/v11/application/list tests/contracts tests/tools/fitness`.
2. Classify each hit before editing:
   - runtime/defaults/events/core source import from `shared/list/**`:
     update to `shared/read-model/list/**`.
   - `src/v11/application/list/listCommand*.ts`: leave facade files in place;
     verify the source files still delegate to `shared/read-model/list`, and
     make only compile-forced import maintenance if wrapper deletion exposes a
     broken facade import.
   - contract/fitness/source-fixture strings: leave to task 12 unless a
     compile/typecheck or `pnpm fitness:check:ci` failure proves the specific
     string is an active blocker caused by deleting `src/v11/shared/list/**`.
   - unrelated archived plans/tasks: ignore as historical evidence.
3. If the only current-tree source files under `src/v11/shared/list/**` are
   transition wrappers, delete that directory's wrapper files. Do not replace
   them with a new alias layer.
4. Re-run the search after deletion. The acceptable remaining old-path or
   `listCommand` hits are application facade command names, defaults/status
   proof-only surfaces named by `LRC-DEFAULTS`, contract/fitness fixtures,
   archived documentation, and other explicitly deferred successor evidence.
   Any active runtime source import from `shared/list/**` is a task-10 blocker.
5. Leave `src/v11/application/list/**` wrappers in place.
6. Apply the compile/typecheck/fitness unblocker decision rule:
   - if the failing assertion is a narrow stale reference to the deleted
     `src/v11/shared/list/**` wrapper boundary, update only that reference so it
     points at `shared/read-model/list` or no longer treats `shared/list` as an
     active source shape.
   - if the failure asks for broader fixture wording, governance tightening, or
     task-12 source assertion cleanup, stop and ask for replanning or a human
     decision.
7. Run focused list tests before broad verification.

## Acceptance Criteria

1. No active runtime/defaults/events/core source file imports
   `src/v11/shared/list/**` or a relative equivalent after implementation.
2. `src/v11/shared/list/**` source wrappers are deleted, not retained as a
   hidden compatibility boundary.
3. `src/v11/application/list/listCommandApi.ts`,
   `src/v11/application/list/listCommandContract.ts`, and
   `src/v11/application/list/listCommandDefaults.ts` still exist and continue
   to delegate to `shared/read-model/list`.
4. Any compile/typecheck or fitness failure caused directly by deleting
   `src/v11/shared/list/**` is either fixed with a narrow unblocker edit or
   escalated as a replanning/human checkpoint if it requires task-12 cleanup.
5. Old `shared/list/listCommand*` strings may remain in contract transit,
   fitness, and archived documentation surfaces only as task-12 or historical
   evidence.
6. The focused runtime and application compatibility tests in the L1 test
   matrix pass, followed by the repository-required verification for source
   changes.

## Assumptions

1. Task 9 already introduced the command-neutral producer and preserved list
   behavior.
2. Old-path references in contract/fitness tests are fixture strings, not
   runtime imports.

## Open Questions

1. N/A.
