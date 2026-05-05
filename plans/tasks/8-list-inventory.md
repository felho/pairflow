---
artifact_type: task
artifact_id: task_list_inventory_v1
task_family_id: list-inventory
sequence_key: "8"
task_id: 8-list-inventory
title: "List Inventory"
status: in_progress
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
  - src/v11/application/list/listCommandApi.ts
  - src/v11/application/list/listCommandContract.ts
  - src/v11/application/list/listCommandDefaults.ts
  - src/v11/infrastructure/ui/eventsScanDefaults.ts
  - src/v11/defaults/ui/routerDefaults.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/v11/application/list/listCommandApi.test.ts
  - tests/v11/application/list/listCommandApiError.test.ts
prd_ref: null
plan_ref: plans/shared-command-boundary-cleanup-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/shared-command-boundary-cleanup-plan-v1.md
  - docs/modularity-review/2026-05-02-modularity-review.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
doc_bubble_id: 8-list-inventory-doc
impl_bubble_id: 8-list-inventory-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-05-shared-command-boundary-cleanup-plan-v1
---

# Task: List Inventory

## L0 - Policy

### Goal

Produce a source-backed ownership inventory for every file currently under
`src/v11/shared/list/**`, classifying each file as CLI-local, UI/read-model
shared, or explicitly deferred. This task must create the evidence successor
`list` move and closeout tasks need; it must not move source files yet.

### Domain / Control Model Summary

1. Business invariant: `src/v11/shared/**` must not preserve command-named
   ownership when the code is only local to the list command, but list read-model
   contracts that are consumed by CLI, UI router, events scan, or tests must not
   be moved into a single command lane without proof.
2. Control model: `application/list` owns CLI list orchestration; `shared/list`
   currently owns a mixed list API, result contract, context resolution,
   projection, remote execution read helpers, defaults, and error surface;
   UI/router and events consumers currently depend on at least part of that
   shared surface.
3. Read-path rule: classify each `shared/list` file from current imports,
   exported symbols, source semantics, and test anchors. Do not classify from
   filename shape alone.
4. Forbidden fallback: do not move files, create compatibility barrels, rename
   shared contracts, redesign list read-model semantics, or mark a file
   CLI-local because most tests exercise it through CLI-adjacent paths.
5. Allowed resolution path: add an inventory section to this task that records
   one row per `shared/list` file with current consumers, exported surface,
   ownership classification, movement decision, blocking evidence, and
   suggested successor task.
6. Missing-data rule: if a file's ownership cannot be proven from current source
   and tests, classify it as `deferred` with exact source anchors and do not
   widen successor move scope speculatively.

### Plan Linkage

1. Parent plan gap closed: `shared/list/**` is too broad to reduce safely
   without inventory.
2. Depends on: `7-attach-boundary-closeout`.
3. Unlocks / impacts successors:
   - `9-list-local-move-a` may move only files this inventory proves
     CLI-local.
   - `10-list-local-move-b` may continue only within the inventory's movement
     decisions.
   - `11-list-boundary-closeout` consumes deferred/shared rows to remove,
     rename, or source-anchor any residual `shared/list` boundary.
4. Task-list impact: creates planned task `8-list-inventory`; it does not
   supersede any existing task id.
5. Plan-level validation inherited: this task is evidence production only; it
   does not satisfy the final "no command-named shared/list directory" done
   definition by itself.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/shared/list/listCommandApi.ts`
   - `src/v11/shared/list/listCommandContract.ts`
   - `src/v11/shared/list/listCommandContext.ts`
   - `src/v11/shared/list/listCommandEntryBuilder.ts`
   - `src/v11/shared/list/listCommandEntryProjection.ts`
   - `src/v11/shared/list/listCommandDefaults.ts`
   - `src/v11/shared/list/listCommandErrors.ts`
   - `src/v11/shared/list/listRemotePaneActivityRead.ts`
   - `src/v11/application/list/*.ts`
   - `src/v11/defaults/ui/routerDefaults.ts`
   - `src/v11/infrastructure/ui/eventsScanDefaults.ts`
2. Canonical elements:
   - `listBubbles`
   - `BubbleListInput`
   - `BubbleListEntry`
   - `BubbleListView`
   - `BubbleListError`
   - remote execution projection and refresh behavior
   - runtime session stale-count behavior
3. Guard elements:
   - import paths may be cited as inventory evidence only.
   - source-line anchors may change in successor move tasks.
4. Compat elements:
   - existing application/list re-export modules are compatibility surfaces to
     inventory, not proof that all shared files are command-local.
5. Forbidden reinterpretations:
   - do not change list output fields, state counts, stale runtime semantics,
     remote execution state-source semantics, or error normalization.
   - do not treat UI/router consumption as merely test-only consumption.

### Scope Reality / Shape Proof

1. Current residual list files under `src/v11/shared/list/**` are:
   - `listCommandApi.ts`
   - `listCommandContext.ts`
   - `listCommandContract.ts`
   - `listCommandDefaults.ts`
   - `listCommandEntryBuilder.ts`
   - `listCommandEntryProjection.ts`
   - `listCommandErrors.ts`
   - `listRemotePaneActivityRead.ts`
2. Current application list modules are compatibility re-exports from
   `shared/list`, not independent ownership proof.
3. Current non-CLI consumers include UI defaults/events surfaces that import the
   shared list API, and contract/fitness tests that explicitly encode
   `shared/list/listCommandContract` as a transit boundary.
4. The actual touched scope for this task is the task document inventory and
   source review evidence. Product source movement is intentionally out of
   scope until successor move tasks consume the inventory.
5. Hidden scope ruled out: list read-model redesign, UI router contract changes,
   remote execution refresh behavior changes, error taxonomy changes, and
   command-neutral rename execution.
6. Why the declared task shape matches reality: `shared/list` mixes producer,
   read-model, default dependency, projection, and UI-adjacent contract surfaces;
   inventory must precede bounded movement.

### Boundary Classification

1. Primary shape: `inventory_authority_producer`.
2. Closure buckets touched:
   - `authority_producer`: inventory rows and movement decisions.
   - `shared_contract`: classification of list result contracts and UI/router
     read-model dependencies.
   - `internal_execution_consumers`: CLI/application list path evidence.
   - `read_model_consumers`: UI router/events scan and contract tests.
3. Deferred closures:
   - moving CLI-local files to `application/list`.
   - renaming retained shared contracts into command-neutral paths.
   - tightening command-named shared directory fitness.

### In Scope

1. Re-read every file under `src/v11/shared/list/**`.
2. Run import/consumer searches for each exported API and file path.
3. Add a `List Ownership Inventory` section to this task with one row per file.
4. Classify each row as `cli_local`, `shared_read_model`, `shared_contract`, or
   `deferred`.
5. For each row, record `movement_decision` as `move_candidate`,
   `retain_shared_rename_candidate`, or `defer_with_source_anchor`.
6. Name the successor task that may consume each row.
7. Run focused reference checks that prove the inventory covers all current
   `shared/list` files and direct consumers.

### Out of Scope

1. Moving, renaming, or deleting source files.
2. Adding compatibility barrels under `shared/list`.
3. Changing list API/result/error semantics.
4. Updating UI router contracts or events scan behavior.
5. Adding or tightening fitness rules.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Inventory before movement | Every `shared/list` file needs source-backed ownership evidence. | Produce inventory rows before successor move tasks can touch source. | P1 | required-now |
| Shared read model protected | UI/router and events consumers are real consumers. | Do not mark a file CLI-local when UI/events paths consume its contract or API. | P1 | required-now |
| No source movement | This task is evidence production only. | Do not edit `src/v11/**` except to read anchors. | P1 | required-now |
| Exact deferral | Unknown ownership must stop as deferred evidence. | Record blocking source anchors instead of guessing. | P1 | required-now |

### 1) Inventory Row Contract

Each row in `List Ownership Inventory` must include:

| Field | Required Meaning |
|---|---|
| `file` | Exact `src/v11/shared/list/**` path. |
| `exports_or_role` | Exported symbols or internal role. |
| `current_consumers` | Source/test paths or import patterns that consume it. |
| `source_semantics` | Why the file is CLI-local, shared contract, shared read-model, or mixed. |
| `classification` | `cli_local`, `shared_read_model`, `shared_contract`, or `deferred`. |
| `movement_decision` | `move_candidate`, `retain_shared_rename_candidate`, or `defer_with_source_anchor`. |
| `successor_owner` | `9-list-local-move-a`, `10-list-local-move-b`, or `11-list-boundary-closeout`. |
| `blocking_or_validation_evidence` | Exact source anchors and focused checks needed before movement. |

### 2) Acceptance Criteria

1. The inventory covers exactly the current files under `src/v11/shared/list/**`.
2. Every row has a classification, movement decision, successor owner, and
   source anchors.
3. The task records direct consumers for:
   - `application/list` re-exports.
   - CLI/core list tests.
   - UI router defaults or events scan defaults.
   - contract/fitness references that constrain shared list contract movement.
4. No source files are moved or behavior-edited by this task.
5. The inventory explicitly identifies which rows, if any, are safe candidates
   for `9-list-local-move-a`.

### 3) Validation

Run the narrowest checks needed for an inventory-only task:

1. `find src/v11/shared/list -maxdepth 1 -type f | sort`
2. `rg "shared/list|listCommandApi|listCommandContract|listCommandDefaults|listCommandEntry|listRemotePaneActivityRead" src/v11 tests tools docs`
3. `git diff --check -- plans/tasks/8-list-inventory.md`

If implementation unexpectedly edits source files, follow the repository's full
verification order for non-docs source changes.

## L2 - Implementation Notes

1. Start by listing all files under `src/v11/shared/list`.
2. For each file, inspect imports/exports and current consumers.
3. Populate `List Ownership Inventory` in this task document.
4. Keep row language factual and source-anchored; do not phrase future moves as
   already approved implementation.
5. Stop after inventory and validation evidence. Successor tasks own movement.

## List Ownership Inventory

Inventory source checks:

1. `find src/v11/shared/list -maxdepth 1 -type f | sort` currently returns
   exactly the eight files listed below.
2. `rg "shared/list|listCommandApi|listCommandContract|listCommandDefaults|listCommandEntry|listRemotePaneActivityRead" src/v11 tests tools docs`
   shows direct production consumers through `src/v11/defaults/ui/routerDefaults.ts`,
   `src/v11/infrastructure/ui/eventsScanDefaults.ts`, and the
   `src/v11/application/list/*.ts` compatibility re-exports, plus core,
   application, contract, and fitness tests.
3. No row below authorizes source movement in this task; successor tasks must
   re-run the source checks before changing imports.

| file | exports_or_role | current_consumers | source_semantics | classification | movement_decision | successor_owner | blocking_or_validation_evidence |
|---|---|---|---|---|---|---|---|
| `src/v11/shared/list/listCommandApi.ts` | Exports `listBubbles`, `asBubbleListError`, `BubbleListError`, and `BubbleList*` types. | Direct production consumers: `src/v11/defaults/ui/routerDefaults.ts:16`, `src/v11/infrastructure/ui/eventsScanDefaults.ts:1-3`, and `src/v11/application/list/listCommandApi.ts:1`. CLI path consumes the application re-export via `src/v11/application/list/listCliCommand.ts:3-6`; application facade consumes it via `src/v11/application/list/emitListV11.ts:1-5`. Tests import the shared API directly in `tests/core/bubble/parallelBubblesSmoke.test.ts`, `tests/core/bubble/parallelBubblesSoak.test.ts`, through the main core list test `tests/core/bubble/listBubbles.test.ts:10-13` via `src/v11/application/list/emitListV11.ts:1-5` and `src/v11/application/list/listCommandApi.ts:1`, and through application re-exports in `tests/v11/application/list/*.test.ts`. | This is the mixed list read-model producer: it resolves context, builds entries, counts lifecycle states, preserves runtime stale-count behavior, and exposes the API that UI defaults/events and CLI use. UI consumption is production, not test-only. | `shared_read_model` | `retain_shared_rename_candidate` | `11-list-boundary-closeout` | Source anchors: `src/v11/shared/list/listCommandApi.ts:19-32`, `src/v11/shared/list/listCommandApi.ts:71-157`, `src/v11/shared/list/listCommandApi.ts:159-181`. Movement is blocked until a command-neutral read-model/API destination replaces `shared/list` for both UI defaults/events and application re-exports. |
| `src/v11/shared/list/listCommandContext.ts` | Exports `runtimeSessionExpectedStates`, `createZeroCounts`, and `resolveListBubblesContext`. | Direct consumers are internal to the current shared list implementation: `src/v11/shared/list/listCommandApi.ts:12-16` and `src/v11/shared/list/listCommandEntryProjection.ts:20`. | The file owns repo resolution, bubble id listing, runtime session registry loading, zero state counts, and the runtime-state set used to compute stale/registered counts. Although not directly imported by UI, it is required by the shared `listBubbles` read-model behavior consumed by UI defaults/events. | `shared_read_model` | `retain_shared_rename_candidate` | `11-list-boundary-closeout` | Source anchors: `src/v11/shared/list/listCommandContext.ts:12-18`, `src/v11/shared/list/listCommandContext.ts:20-33`, `src/v11/shared/list/listCommandContext.ts:35-66`. Movement is blocked until `listCommandApi.ts` ownership is resolved without changing runtime stale-count semantics. |
| `src/v11/shared/list/listCommandContract.ts` | Exports `BubbleListInput`, `BubbleListEntry`, `BubbleListStateCounts`, and `BubbleListView`. | Direct consumers: `src/v11/shared/list/listCommandApi.ts:6-10`, `src/v11/shared/list/listCommandContext.ts:5-8`, `src/v11/shared/list/listCommandEntryProjection.ts:19`, `src/v11/application/list/listCommandContract.ts:1`. Contract/fitness anchors: `tests/contracts/uiContractTransitSource.test.ts:561-585`, `tests/contracts/uiContractTransitSource.test.ts:620-640`, and `tests/tools/fitness/uiRouterPortBoundary.test.ts:175-201`, `tests/tools/fitness/uiRouterPortBoundary.test.ts:245-314`. | This is the canonical list result contract currently bridging lifecycle state, runtime session, UI attention, review policy, meta-review, and remote execution fields. It imports UI-facing types from `contracts/ui/uiReadModel` and `types/uiRemoteExecution`, so command-local movement would collapse a shared read-model boundary into the list command lane. | `shared_contract` | `retain_shared_rename_candidate` | `11-list-boundary-closeout` | Source anchors: `src/v11/shared/list/listCommandContract.ts:13-18`, `src/v11/shared/list/listCommandContract.ts:20-41`, `src/v11/shared/list/listCommandContract.ts:43-70`. Movement is blocked until a command-neutral UI/read-model contract replaces the transitional `listCommandContract` references and the fitness exceptions are updated. |
| `src/v11/shared/list/listCommandDefaults.ts` | Exports top-level-await `listCommandDefaults` imported from `src/v11/defaults/list/listCommandDefaults.ts`. | Direct consumers: `src/v11/shared/list/listCommandContext.ts:9`, `src/v11/shared/list/listCommandEntryBuilder.ts:5`, `src/v11/shared/list/listCommandEntryProjection.ts:21`, `src/v11/application/list/listCommandDefaults.ts:1`, and tests that mock defaults through `tests/core/bubble/listBubbles.test.ts:24`. | This is a dependency bridge for list workspace, state, runtime session, watchdog, remote execution, and config defaults. It is not itself a read-model contract, but it is coupled to shared list read-model construction while the API remains shared. | `deferred` | `defer_with_source_anchor` | `11-list-boundary-closeout` | Source anchors: `src/v11/shared/list/listCommandDefaults.ts:1-5`, `src/v11/defaults/list/listCommandDefaults.ts:25-41`. Blocker: move safety depends on where `listCommandApi.ts`, `listCommandContext.ts`, `listCommandEntryBuilder.ts`, and `listCommandEntryProjection.ts` land; do not move it independently. |
| `src/v11/shared/list/listCommandEntryBuilder.ts` | Exports `buildBubbleListEntry`. | Direct consumer: `src/v11/shared/list/listCommandApi.ts:17`. It consumes shared defaults, projection builders, and error helpers at `src/v11/shared/list/listCommandEntryBuilder.ts:5-17`. | This file orchestrates per-bubble local/remote list entry construction: TOML/state/pane/remote pointer reads, repo ownership validation, cache fallback, refresh fallback, and projection selection. It is a private implementation of the shared `listBubbles` read model. | `shared_read_model` | `retain_shared_rename_candidate` | `11-list-boundary-closeout` | Source anchors: `src/v11/shared/list/listCommandEntryBuilder.ts:19-52`, `src/v11/shared/list/listCommandEntryBuilder.ts:54-76`, `src/v11/shared/list/listCommandEntryBuilder.ts:78-141`. Movement is blocked until shared API ownership is resolved and remote refresh/cache fallback behavior is preserved. |
| `src/v11/shared/list/listCommandEntryProjection.ts` | Exports `BubbleBuildResult`, `RemoteRefreshFailureMetadata`, `readRemoteStateCacheSafe`, and local/remote projection builders. | Direct consumer: `src/v11/shared/list/listCommandEntryBuilder.ts:7-16`. It also consumes `listCommandContract`, `listCommandContext`, `listCommandDefaults`, `listCommandErrors`, and `listRemotePaneActivityRead` internally. | This file projects local, created-remote, cached-remote, unavailable-remote, and refreshed-remote state into `BubbleListEntry`, including attention, review policy, meta-review, remote execution summary fields, cache status, and compatibility placeholders. These fields are read by CLI and UI/event read-model consumers. | `shared_read_model` | `retain_shared_rename_candidate` | `11-list-boundary-closeout` | Source anchors: `src/v11/shared/list/listCommandEntryProjection.ts:25-37`, `src/v11/shared/list/listCommandEntryProjection.ts:39-58`, `src/v11/shared/list/listCommandEntryProjection.ts:97-188`, `src/v11/shared/list/listCommandEntryProjection.ts:190-244`, `src/v11/shared/list/listCommandEntryProjection.ts:246-349`, `src/v11/shared/list/listCommandEntryProjection.ts:351-470`. Movement is blocked until successor work preserves remote execution `stateSource`, cache, refresh, attention, and review-policy semantics. |
| `src/v11/shared/list/listCommandErrors.ts` | Exports `BubbleListErrorContext`, `BubbleListErrorInput`, `BubbleListErrorNormalizationContext`, `BubbleListError`, and `isRefreshFallbackEligibleError`. | Direct consumers: `src/v11/shared/list/listCommandApi.ts:11`, `src/v11/shared/list/listCommandContext.ts:10`, `src/v11/shared/list/listCommandEntryBuilder.ts:6,17`, `src/v11/shared/list/listCommandEntryProjection.ts:22`; application tests consume the re-export through `tests/v11/application/list/listCommandApiError.test.ts`. | Error normalization is shared between CLI-facing command execution and remote refresh fallback in read-model construction. It is not independently proven CLI-local because `BubbleListError` is exported from the shared API and refresh fallback controls UI-visible remote list behavior. | `deferred` | `defer_with_source_anchor` | `11-list-boundary-closeout` | Source anchors: `src/v11/shared/list/listCommandErrors.ts:3-19`, `src/v11/shared/list/listCommandErrors.ts:21-33`, `src/v11/shared/list/listCommandErrors.ts:35-43`, `src/v11/shared/list/listCommandApi.ts:159-181`, `src/v11/shared/list/listCommandEntryBuilder.ts:78-118`. Blocker: separate CLI error normalization from remote read-model fallback before any move candidate claim. |
| `src/v11/shared/list/listRemotePaneActivityRead.ts` | Exports `toRemotePaneActivityRead`. | Direct consumer: `src/v11/shared/list/listCommandEntryProjection.ts:23`, used during refreshed remote entry projection at `src/v11/shared/list/listCommandEntryProjection.ts:423-435`. | This adapts a remote status snapshot pane activity payload into the watchdog pane activity read model used by list attention calculation. It is a narrow read-model adapter for remote list refresh, not a CLI-only helper. | `shared_read_model` | `retain_shared_rename_candidate` | `11-list-boundary-closeout` | Source anchors: `src/v11/shared/list/listRemotePaneActivityRead.ts:1-38`, `src/v11/shared/list/listCommandEntryProjection.ts:423-435`. Movement is blocked until remote refresh projection ownership is resolved with the rest of the list read-model implementation. |

Safe candidates for `9-list-local-move-a`: none. Current evidence shows every
`src/v11/shared/list/**` file is either part of the shared list read-model/API
surface or deferred behind that surface; no file is independently proven
CLI-local without first resolving UI defaults/events and command-neutral
read-model contract ownership.
