---
artifact_type: task
artifact_id: task_list_fitness_closeout_v1
task_family_id: list-fitness-closeout
sequence_key: "12"
task_id: 12-list-fitness-closeout
title: "List Fitness Closeout"
status: in_progress
phase: phase4
target_files:
  - tests/contracts/uiContractTransitSource.test.ts
  - tests/tools/fitness/uiRouterPortBoundary.test.ts
  - tests/tools/fitness/fitnessCheckCi.test.ts
  - tests/tools/fitness/dependency.test.ts
  - tools/fitness/checks/dependency.ts
prd_ref: null
plan_ref: plans/shared-command-boundary-cleanup-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/shared-command-boundary-cleanup-plan-v1.md
  - plans/archive/tasks/2026-05-05-shared-command-boundary-cleanup-plan-v1/8-list-inventory.md
  - plans/archive/tasks/2026-05-05-shared-command-boundary-cleanup-plan-v1/9-list-readmodel-introduce.md
  - plans/archive/tasks/2026-05-05-shared-command-boundary-cleanup-plan-v1/10-list-runtime-cutover.md
  - plans/archive/tasks/2026-05-05-shared-command-boundary-cleanup-plan-v1/11-list-api-cleanup.md
  - docs/modularity-review/2026-05-02-modularity-review.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
doc_bubble_id: 12-list-fitness-closeout-doc
impl_bubble_id: 12-list-fitness-closeout-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-05-shared-command-boundary-cleanup-plan-v1
---

# Task: List Fitness Closeout

## L0 - Policy

### Goal

Update the remaining list-related contract transit tests, architecture fitness
fixtures, and source assertions so they no longer preserve the removed
`src/v11/shared/list/listCommand*` boundary as an allowed or expected shape.
Keep this as a test/governance closeout slice: do not redesign the list
read-model producer, do not rename runtime defaults, and do not tighten the
general command-named shared-directory policy beyond list-specific stale
fixture cleanup.

### Domain / Control Model Summary

1. Business invariant: test and governance evidence must describe the current
   command-neutral list read-model boundary, not the deleted command-shaped
   `shared/list` transition surface.
2. Control model:
   - `src/v11/shared/read-model/list/**` owns the shared list read-model API,
     DTO contract, projection, fallback, and remote list semantics.
   - `tests/contracts/uiContractTransitSource.test.ts` owns transit-source
     examples proving UI/router boundary imports are classified correctly.
   - `tests/tools/fitness/**` owns fixture coverage for architecture fitness
     checks and their CI reporting behavior.
   - `tools/fitness/checks/dependency.ts` owns the active
     `shared_promotion_single_lane` warning implementation.
3. Read-path rule: fixtures that need a list read-model contract import should
   use `shared/read-model/list/listReadModelContract`, not
   `shared/list/listCommandContract`.
4. Forbidden fallback: do not keep old `shared/list/listCommand*` strings in
   active contract or fitness fixtures merely as compatibility examples after
   tasks 10 and 11 removed the transition and application aliases.
5. Allowed resolution path: mechanically update fixture paths, fixture import
   text, expected diagnostic edges, and source assertions to the canonical
   read-model path while preserving the intended fitness rule behavior.
6. Missing-data rule: if a remaining `listCommand*` occurrence is the concrete
   defaults bundle `src/v11/defaults/list/listCommandDefaults.ts` or status
   dependency defaults wiring, leave it alone unless a source assertion
   incorrectly treats it as proof of the removed shared boundary.
7. Phase boundary:
   - contract closure: preserve the list read-model contract closed by tasks 9
     through 11.
   - producer closure: already complete; do not move runtime producer code.
   - internal execution closure: test/fixture/source assertion cleanup only.
   - workflow/orchestration closure: N/A.
   - read-model closure: close stale evidence for the current read-model
     boundary.
   - activation closure: N/A.
   - cleanup/recovery closure: list-specific fixture and assertion cleanup.

### Plan Linkage

1. Parent plan gap closed: fitness/test fixtures can otherwise keep the removed
   list boundary alive as implicit documentation.
2. Depends on: `11-list-api-cleanup`.
3. Unlocks / impacts successors:
   - `13-shared-command-fitness` can update broader governance after
     list-specific fixtures no longer encode the old shape.
4. Task-list impact: tracks approved task `12-list-fitness-closeout`; it does
   not replace or supersede another task id.
5. Inherited validation / exit expectation: no active test or governance fixture
   should approve, require, or document `src/v11/shared/list/listCommand*` as the
   current list read-model boundary.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/shared/read-model/list/listReadModelContract.ts`
   - `src/v11/shared/read-model/list/listReadModelApi.ts`
   - `tests/contracts/uiContractTransitSource.test.ts`
   - `tests/tools/fitness/uiRouterPortBoundary.test.ts`
   - `tests/tools/fitness/fitnessCheckCi.test.ts`
   - `tests/tools/fitness/dependency.test.ts`
   - `tools/fitness/checks/dependency.ts`
2. Canonical elements:
   - `BubbleListEntry`, `BubbleListInput`, `BubbleListStateCounts`, and
     `BubbleListView` retain their current meanings from
     `shared/read-model/list/listReadModelContract.ts`.
   - UI/router port boundary fixtures still prove allowed command-owned UI port
     imports and rejected invalid/missing allowlist entries.
   - `shared_promotion_single_lane` remains a report-only warning unless task
     13 explicitly tightens governance.
3. Guard elements:
   - `src/v11/defaults/list/listCommandDefaults.ts` remains concrete defaults
     wiring and is not the removed shared list boundary.
   - archived task and plan prose may mention old paths as historical evidence;
     this task targets active tests, fixtures, and source assertions.
4. Compat-only elements to update or remove:
   - fixture paths and import text containing
     `src/v11/shared/list/listCommandContract.ts`,
     `../list/listCommandContract`, `list/listCommandContract`,
     or `listCommandContract` when they model the active list contract path.
   - source assertions that still encode old `shared/list/listCommand*` or stale
     command-shaped application API aliases as acceptable current surfaces.
5. Forbidden reinterpretations:
   - do not change list DTO fields, remote refresh/cache fallback semantics,
     attention/review policy/meta-review fields, CLI parsing/rendering, or
     runtime list behavior.
   - do not convert this task into broad governance hardening for every
     command-named shared directory.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `tests/contracts/uiContractTransitSource.test.ts`
   - `tests/tools/fitness/uiRouterPortBoundary.test.ts`
   - `tests/tools/fitness/fitnessCheckCi.test.ts`
   - `tools/fitness/checks/dependency.ts`
   - `src/v11/shared/read-model/list/**`
   - `src/v11/defaults/list/listCommandDefaults.ts`
   - `src/v11/shared/status/statusCommandDependencyDefaults.ts`
2. Actual touched scope: test fixture paths/import text, expected diagnostic
   assertions, and narrow source assertions about stale list boundary names.
3. Mutation entrypoints in scope: N/A; this task changes tests/governance
   evidence only.
4. Hidden scope ruled out:
   - no runtime list read-model implementation changes.
   - no CLI list output, parsing, or public API redesign.
   - no defaults bundle rename.
   - no general architecture fitness hardening outside list-specific stale
     fixture cleanup.
5. Branch inventory note: preserve the existing positive/negative fitness
   fixture cases; only the modeled list contract path changes from
   command-shaped `shared/list` to command-neutral `shared/read-model/list`.
6. Why the declared task shape matches reality: tasks 10 and 11 removed active
   source dependence on `shared/list` and command-shaped application aliases;
   the remaining relevant hits are fixtures and assertions that document or
   validate the old path.

### Authority Boundary Map

1. Authority producer: `src/v11/shared/read-model/list/**`.
2. Governance owner: `tools/fitness/checks/dependency.ts` and related
   `tests/tools/fitness/**`.
3. Contract-transit owner: `tests/contracts/uiContractTransitSource.test.ts`.
4. Explicit out-of-scope consumers: archived plan/task prose, concrete defaults
   bundle naming, status dependency defaults wiring, and future task 13
   governance tightening.
5. Export surfaces closed in this phase: active fixture/test representation of
   `src/v11/shared/list/listCommand*` as a current allowed boundary.

### In Scope

1. Update `tests/contracts/uiContractTransitSource.test.ts` fixture strings and
   assertions that still refer to `shared/list/listCommandContract` as the list
   read-model contract boundary.
2. Update `tests/tools/fitness/uiRouterPortBoundary.test.ts` fixtures,
   allowlist entries, expected edges, and missing-path cases to use
   `src/v11/shared/read-model/list/listReadModelContract.ts` and matching
   relative imports.
3. Update `tests/tools/fitness/fitnessCheckCi.test.ts` list-related fixture path
   names only as needed so CI fitness examples do not preserve
   `shared/list/.fitnessListCommandContract.ts` as the documented shape.
4. Update narrow dependency-fitness tests or source assertions that still treat
   old `shared/list/listCommand*` paths as active expected evidence.
5. Keep `shared_promotion_single_lane` report-only behavior active.
6. Preserve all existing fitness intent: valid allowlist paths should still
   pass, invalid or missing paths should still fail, and CI summaries should
   still report the same categories unless the assertion specifically names the
   old list path.

### Out of Scope

1. Moving or renaming runtime files under `src/v11/shared/read-model/list/**`.
2. Renaming `src/v11/defaults/list/listCommandDefaults.ts` or
   `src/v11/shared/status/statusCommandDependencyDefaults.ts`.
3. Removing historical references from archived task/plan artifacts.
4. Adding hard failures for all command-named shared directories.
5. Changing `shared_promotion_single_lane` severity or policy behavior except
   for list-specific expected fixture path updates.
6. Changing list read-model DTO semantics, remote execution fields, fallback
   behavior, or CLI output.

### Safety Defaults

1. Prefer path/import fixture rewrites over rule rewrites.
2. When a test currently proves an allowed UI port boundary import, keep the
   same positive/negative intent and update only the modeled source/target path.
3. When a test intentionally uses a missing file, keep it missing under the new
   command-neutral path so the missing-path assertion remains meaningful.
4. Treat any required change to runtime source or public API semantics as a
   route-back blocker, not as implicit task expansion.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - architecture fitness fixture/source assertion contract.
   - UI contract transit fixture coverage.
   - no runtime API/interface, DB, auth, config, or event payload contract
     changes.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `coordination_state`: `0`
6. `runtime_variability`: `0`
7. `public_contract_pressure`: `1`
8. Decision: bounded task. The work touches multiple test fixtures, but the
   intended behavior of the fitness rules remains unchanged.

### L1 - Contract

| Requirement | Contract | Priority | Status |
|---|---|---:|---|
| Current list boundary fixture | Active list contract fixture paths/imports use `src/v11/shared/read-model/list/listReadModelContract.ts`. | P1 | required-now |
| Stale shared-list closure | No active contract/fitness test preserves `src/v11/shared/list/listCommand*` as the expected list read-model path. | P1 | required-now |
| Fitness behavior preservation | Existing positive/negative UI router boundary and CI fitness cases keep their rule intent after path rewrites. | P1 | required-now |
| Report-only warning preservation | `shared_promotion_single_lane` remains active and report-only unless task 13 changes broader governance. | P2 | required-now |
| Defaults naming non-goal | `src/v11/defaults/list/listCommandDefaults.ts` can remain until explicitly planned. | P2 | required-now |

### Data / Interface Contract

| Surface | Current Meaning | Required Task Behavior | Deferred / Out of Scope |
|---|---|---|---|
| `shared/read-model/list/listReadModelContract.ts` | Canonical shared list DTO contract. | Use as fixture target where active tests model the list read-model contract. | Do not change DTO fields. |
| `uiContractTransitSource` fixtures | Transit examples for UI/router boundary classification. | Replace old list contract path strings with command-neutral read-model path strings where they model current source. | Do not remove unrelated transit coverage. |
| `uiRouterPortBoundary` fixtures | Positive/negative allowlist and import-boundary cases. | Preserve case intent with updated path/import examples. | Do not rewrite the rule. |
| `fitnessCheckCi` fixtures | CI reporting behavior for dependency fitness warnings. | Avoid old `shared/list` list-contract examples unless the example is deliberately unrelated to current list boundary. | Do not broaden warning severity. |
| `shared_promotion_single_lane` | Report-only parking-lot warning. | Keep active and verify tests still cover it. | Task 13 owns broader tightening. |

### L2 - Implementation Plan

1. Re-run a focused search:
   `rg -n "shared/list|listCommandContract|listCommandApi|listCommandDefaults|shared/read-model/list|listReadModelContract" tests/contracts tests/tools/fitness tools/fitness src/v11`.
2. Classify each hit:
   - active fixture/source assertion for removed list boundary: update in this
     task.
   - concrete defaults bundle or status dependency wiring: leave unchanged.
   - historical archived prose: leave unchanged.
   - future governance hardening: defer to task 13.
3. Update contract transit fixtures to use `shared/read-model/list` and
   `listReadModelContract` path/import text.
4. Update UI router port boundary fixtures, allowlist entries, expected edges,
   and missing-file tests to the command-neutral read-model path while
   preserving pass/fail intent.
5. Update CI fitness fixture naming or source strings that still document
   `shared/list/.fitnessListCommandContract.ts` as the list boundary.
6. Re-run the focused search and confirm remaining `listCommand*` hits are only
   allowed defaults/status wiring, CLI command-owned names, or historical
   archived prose.
7. Run focused validation:
   - `pnpm vitest run tests/contracts/uiContractTransitSource.test.ts`
   - `pnpm vitest run tests/tools/fitness/uiRouterPortBoundary.test.ts tests/tools/fitness/fitnessCheckCi.test.ts tests/tools/fitness/dependency.test.ts`
   - `pnpm fitness:check:ci`
8. Run repository-required verification for direct source/test changes before
   completion:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm fitness:check:ci`
   - focused tests above
   - broader affected fitness suite if needed: `pnpm vitest run tests/tools/fitness`
   - `pnpm test`
   - `pnpm build` if any `tools/**` source changed

### Acceptance Criteria

1. Active contract/fitness fixtures no longer use
   `src/v11/shared/list/listCommandContract.ts` or
   `shared/list/.fitnessListCommandContract.ts` as current list boundary
   examples.
2. Fixture imports and allowlist entries use
   `src/v11/shared/read-model/list/listReadModelContract.ts` where they model
   the list read-model contract.
3. UI router port boundary positive, negative, missing-path, extension, and
   diagnostic cases retain their original intent after path updates.
4. `uiContractTransitSource` assertions no longer protect the old
   `listCommandContract` transit strings.
5. `shared_promotion_single_lane` warning coverage remains present and
   report-only.
6. Remaining `listCommandDefaults` hits are limited to concrete defaults/status
   dependency wiring or explicitly out-of-scope historical prose.
7. No runtime list DTO, fallback, remote execution, CLI parsing, or output
   behavior changes are introduced.

### Validation

1. `pnpm vitest run tests/contracts/uiContractTransitSource.test.ts`
2. `pnpm vitest run tests/tools/fitness/uiRouterPortBoundary.test.ts tests/tools/fitness/fitnessCheckCi.test.ts tests/tools/fitness/dependency.test.ts`
3. `pnpm fitness:check:ci`
4. `pnpm typecheck`
5. `pnpm lint`
6. `pnpm test`
7. `pnpm build` if `tools/fitness/checks/dependency.ts` or other runtime/tool
   source changes.

### Non-Goals

1. Rename the concrete defaults bundle.
2. Remove historical references from archived task artifacts.
3. Tighten every command-named shared-directory warning.
4. Change list behavior or DTO semantics.
