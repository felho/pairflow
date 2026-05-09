---
artifact_type: task
artifact_id: task_list_remote_projection_pipeline_v1
title: "List Remote Projection Pipeline"
status: draft
phase: phase1
target_files:
  - src/v11/application/list/listReadModelApi.ts
  - src/v11/application/list/listReadModelContext.ts
  - src/v11/application/list/listReadModelDependencies.ts
  - src/v11/application/list/listReadModelEntryBuilder.ts
  - src/v11/application/list/listReadModelEntryProjection.ts
  - src/v11/application/list/listReadModelErrors.ts
  - src/v11/application/list/listRemotePaneActivityRead.ts
  - src/v11/application/list/internal/projection/**
  - src/v11/shared/read-model/list/listReadModelContract.ts
  - src/v11/shared/remote/remoteExecutionTypes.ts
  - src/v11/shared/remote/remoteStateCacheTypes.ts
  - src/v11/shared/status/remoteBubbleStatusContract.ts
  - src/contracts/ui/uiRemoteExecution.ts
  - src/types/uiRemoteExecution.ts
  - src/cli/commands/bubble/list.ts
  - tests/v11/application/list/**
  - tests/core/bubble/listBubbles.test.ts
  - tests/cli/bubbleListCommand.test.ts
  - ui/src/lib/attachAvailability.ts
  - ui/src/lib/attachAvailability.test.ts
  - ui/src/state/useBubbleStore.ts
  - ui/src/state/useBubbleStore.test.ts
  - ui/src/components/canvas/RemoteBubbleIndicator.tsx
  - ui/src/components/canvas/BubbleCanvas.test.tsx
  - ui/src/components/canvas/BubbleExpandedCard.test.tsx
prd_ref: null
plan_ref: null
system_context_ref: docs/architecture/v11-placement-and-extraction-governance.md
normative_refs:
  - docs/architecture/v11-architecture-overview.md
  - docs/architecture/v11-placement-and-extraction-governance.md
  - docs/architecture/v11-internal-module-boundaries.md
  - src/contracts/ui/uiRemoteExecution.ts
  - src/v11/shared/read-model/list/listReadModelContract.ts
  - src/v11/shared/remote/remoteExecutionTypes.ts
  - src/v11/shared/remote/remoteStateCacheTypes.ts
  - src/v11/shared/status/remoteBubbleStatusContract.ts
owners:
  - "felho"
archive_group: refactoring
archive_path: plans/archive/tasks/refactoring/list-remote-projection-pipeline.md
---

# Task: List Remote Projection Pipeline

## Current Codebase Check (2026-05-09)

1. `src/v11/application/list/listReadModelApi.ts` currently owns the top-level list read-model loop:
   - resolve repo/list context,
   - iterate bubble ids,
   - call `buildBubbleListEntry(...)`,
   - skip concurrently deleted bubbles,
   - aggregate state counts, runtime-session stale counts, and remote execution summary.
2. `src/v11/application/list/listReadModelEntryBuilder.ts` currently owns route selection for one bubble entry:
   - read bubble config, state inspection, pane activity, and remote pointer in parallel,
   - validate config identity and repo ownership,
   - choose local projection when no remote pointer exists,
   - choose created-remote projection,
   - choose cached started-remote projection,
   - choose live refreshed started-remote projection,
   - choose unavailable started-remote projection after cache miss/invalid or refresh failure.
3. `src/v11/application/list/listReadModelEntryProjection.ts` currently owns too many projection concerns in one file:
   - local bubble projection,
   - created-remote projection,
   - cached started-remote projection,
   - unavailable started-remote projection,
   - refreshed live started-remote projection,
   - remote cache read fallback,
   - remote alias resolution,
   - meta-review runtime projection,
   - review-policy runtime projection,
   - watchdog/attention projection,
   - remote cache write failure downgrade.
4. The current behavior is meaningful and has broad tests, but the projection module is shallow: callers and tests must know many remote state-source cases and DTO construction details that should live behind a command-local projection Interface.
5. This task should deepen `application/list` by introducing a list-local projection pipeline. It must not move list-specific projection policy into `shared`, and it must not redesign UI contracts or status command semantics.
6. No public behavior change is currently authorized. Existing list CLI JSON/text output, UI remote execution DTO shape, remote state-source taxonomy, cache fallback behavior, and by-state/count semantics must remain unchanged.

## Task-Mode Readiness Self-Check (2026-05-09)

1. `execution_metadata_gate`: not applicable for this standalone architecture task because `plan_ref: null` and no parent plan tracker is claiming sequencing authority.
2. `target_file_reality_check`: matches the current codebase.
   - `listReadModelApi.ts` owns list-level aggregation.
   - `listReadModelEntryBuilder.ts` owns per-bubble read/context and route choice.
   - `listReadModelEntryProjection.ts` owns all local/remote projection DTO construction and is the intended deepening target.
   - `src/v11/application/list/internal/projection/**` does not currently exist and is the intended new command-local placement.
   - `remoteExecutionTypes.ts`, `remoteStateCacheTypes.ts`, and `remoteBubbleStatusContract.ts` are read-only contract anchors for remote pointer/cache/live-status meaning; this task may import their types but must not change their schema or semantics.
3. `control_model_readiness`: ready. The task names local state, remote pointer, remote cache, live remote status, and unavailable-state fail-closed/unavailable projection behavior.
4. `closed_contract_drift`: no semantic drift authorized. Existing `BubbleListView`, `BubbleListEntry`, `UiBubbleListRemoteExecution`, CLI text rendering expectations, and UI attach/store semantics remain fixed unless a required internal type move forces import-only rewiring.
5. `authority_fan_out`: acceptable for one bounded read-model refactor because the task aligns one consumer family: list/read-model projection. CLI/UI surfaces are verification consumers, not new behavior owners.
6. `closure_budget`: acceptable. The task changes internal projection ownership and tests, but does not change shared remote contracts, status live command behavior, persisted remote cache schema, or state-machine semantics.
7. `bounded_task_shape`: acceptable. Primary shape is read-model consumer alignment; no producer authority or runtime mutation behavior is introduced.
8. `contract_dense_gate`: satisfied by the Canonical Contract Matrix plus mirrored-surface checklist. The matrix is the source of truth for state-source/cache/refresh/unavailable semantics.
9. `capability_closure`: `end_to_end` for the existing `bubble list` read path only. This task adds no new command or UI capability.

## Complexity-Risk Triage

1. `risk_score`: 6.
2. `identity_join_risk`: 1.
   - Per-bubble projection joins bubble id, config id, normalized repo path, local state, remote pointer, cache, and optional live remote status.
3. `surface_spread`: 3.
   - Production code is mostly `application/list`, but compatibility must be proven through CLI list output and UI consumers of `remoteExecution`.
4. `activation_coupling`: 1.
   - Existing `bubble list` activation path remains unchanged.
5. `prerequisite_risk`: 1.
   - Correctness depends on preserving local vs created remote vs cached remote vs unavailable remote vs refreshed remote precedence.
6. `split_decision`: single task accepted.
   - Rationale: public/shared DTO shapes and persisted cache schema do not change; the refactor closes one read-model projection ownership problem.
   - This is a deliberate single-task decision at risk score 6, not a default. The archived `commit-command-local-remote-execution-pipeline.md` refactor is the local precedent: a contract-dense internal route/projection ownership refactor may close as one task when the public contract is preserved, the canonical matrix is explicit, and the old broad helper surface is fully removed.
7. `authority_source_of_truth_note`: list display truth remains derived from the existing local state, remote pointer, remote cache, and live remote status sources. This task moves projection ownership only; it does not introduce new authority.

## Closure and Shape Triage

1. `primary_shape`: `activation_or_read_model`.
   - The bounded slice aligns an existing read-model projection path behind one list-local Interface.
2. `secondary_shape`: `consumer_family_alignment`.
   - CLI/UI tests are in scope only to prove the same published list DTO remains compatible.
3. `closure_buckets_touched`:
   - `read_model_consumers`: list entry projection and list-level summary.
   - `workflow_orchestration_consumers`: `listBubbles(...)` delegates to the projection pipeline instead of exposing per-case builder knowledge.
4. `collapsed_closures`: list projection and list summary aggregation remain collapsed because they are part of the same read-model output contract.
5. `deferred_closures`:
   - status command projection,
   - UI redesign,
   - remote state cache schema changes,
   - remote status transport changes,
   - watchdog escalation/recovery.
6. `precondition_side_effect_boundary`: this task must not add runtime mutation side effects. The only allowed write remains the existing remote state cache write during `refresh`, with the same failure downgrade behavior.

## L0 - Policy

### Goal

Deepen the list read-model by introducing one command-local projection pipeline that hides local/remote projection route selection and DTO assembly behind a narrow application-local Interface.

The business question this task should make explicit is:

> Given local bubble artifacts, optional remote execution artifacts, optional cache, and optional live refresh, what is the single list entry and list summary that may be shown without inventing remote lifecycle truth?

Callers should not manually assemble local entries, remote cache entries, created-not-started entries, unavailable-started entries, refreshed live entries, review-policy projections, meta-review projections, attention, and remote summary counters as separate workflow decisions.

### Context

`bubble list` is a read-model surface. It is not the authority producer for lifecycle state or remote execution state, but it must choose the correct read path:

1. Local bubbles read local state/runtime/session/watchdog artifacts.
2. Created remote bubbles show created-not-started remote metadata without live runtime truth.
3. Started remote bubbles without refresh prefer cache when present.
4. Started remote bubbles with refresh prefer live remote status when available and cache the remote state.
5. Started remote bubbles with refresh failure may use cache when present.
6. Started remote bubbles with no usable live or cached state must project explicit `unavailable_started`, not a false live local state.

The current code has the right cases, but the projection logic is concentrated in `listReadModelEntryProjection.ts`. This task should move production projection orchestration under `src/v11/application/list/internal/projection/**` and leave the public read-model API stable.

### Chosen Architecture Direction

1. Create a list-local projection module under `src/v11/application/list/internal/projection/**`.
2. Keep public list API exports in `src/v11/application/list/listReadModelApi.ts`.
3. Keep list projection policy in `application/list`; do not promote list-specific route/projection logic into `shared`.
4. Keep `BubbleListView`, `BubbleListEntry`, and `UiBubbleListRemoteExecution` as existing published contracts unless implementation discovers an unavoidable contract issue and routes back to task refinement.
5. Preserve existing CLI-visible text/JSON behavior, UI attach availability behavior, and store merge behavior.
6. Do not introduce a new refresh mode, cache policy, remote status transport behavior, or UI design in this task.

### In Scope

1. Introduce one narrow command-local projection function, tentatively named `buildBubbleListEntryProjection(...)` or `runListEntryProjectionPipeline(...)`.
2. Make `buildBubbleListEntry(...)` delegate per-bubble projection selection and DTO construction to the new projection pipeline.
3. Split `listReadModelEntryProjection.ts` into focused internal projection modules or delete/replace it if every export moves under `internal/projection/**`.
4. Move the current non-builder projection support exports into the new internal projection boundary as explicit local types/helpers, unless the implementation replaces them with narrower equivalents:
   - `BubbleBuildResult`,
   - `RemoteRefreshFailureMetadata`,
   - `readRemoteStateCacheSafe`.
5. Preserve local projection semantics:
   - local state drives `state`, `round`, active fields, state validation, runtime session, attention, review policy, and meta-review runtime delivery.
6. Preserve created-remote projection semantics:
   - `remoteExecution.stateSource = "created_not_started"`,
   - `cacheStatus = "missing"`,
   - no runtime availability or live check fields,
   - neutral meta-review.
7. Preserve cached started-remote projection semantics:
   - cache state/round drive entry state and round,
   - `stateSource = "cache"`,
   - `cacheStatus = "present"`,
   - no runtime availability or live check fields.
8. Preserve unavailable started-remote projection semantics:
   - `stateSource = "unavailable_started"`,
   - state is excluded from `byState`,
   - `unavailableStarted` summary increments,
   - optional `compatLifecyclePlaceholder` carries local control-plane state/round only as compatibility display metadata.
9. Preserve refreshed started-remote projection semantics:
   - live remote status drives entry state/round/active/watchdog/attention/review-policy/meta-review,
   - `stateSource = "refresh"`,
   - `runtimeAvailability` and `lastLiveCheckAt` are surfaced,
   - cache write success keeps `cacheStatus = "present"` and `lastCacheCheckAt`,
   - cache write failure keeps live display but records `LIST_REMOTE_CACHE_WRITE_FAILED` and omits `lastCacheCheckAt`.
10. Preserve refresh failure fallback semantics:
   - eligible live refresh failures may fall back to cache when cache exists,
   - otherwise they produce unavailable-started with `LIST_REMOTE_REFRESH_UNAVAILABLE`,
   - ineligible errors still throw.
11. Preserve list-level aggregation:
   - state counts exclude `unavailable_started`,
   - remote summary counts created-not-started and unavailable-started,
   - `refreshedThisRun` appears when any entry source is `refresh`,
   - runtime session stale counting remains based on local runtime-session expectations.
12. Add final evidence scans proving the projection pipeline owns route/projection case selection and the public API no longer needs to know each projection constructor or top-level support export.

### Out of Scope

1. Changing `BubbleListInput`, `BubbleListView`, `BubbleListEntry`, or `UiBubbleListRemoteExecution` public meaning.
2. Changing CLI flags, command names, or rendered output except unavoidable import-path-only test updates.
3. Changing remote pointer file format.
4. Changing remote state cache schema or write/read semantics.
5. Changing remote status transport, SSH status executor, or `RemoteBubbleStatusSnapshot`.
6. Changing status command read-model behavior.
7. Changing UI visual design or attach behavior.
8. Changing lifecycle state-machine semantics.
9. Broad cleanup of unrelated list/status/UI modules.
10. Retaining broad top-level projection helper exports as compatibility aliases when their logic has moved under `internal/projection/**`.

### Control Model

1. `business_invariant`: `bubble list` must show a list entry and summary derived from the allowed local/cache/live sources without inventing remote lifecycle truth.
2. `control_model`: list state is controlled by the selected read source for each entry:
   - local state for local bubbles,
   - created pointer for created-not-started remote bubbles,
   - remote cache for cached started-remote bubbles,
   - live remote status for refreshed started-remote bubbles,
   - explicit unavailable projection when no valid live/cache state exists.
3. `read_path_rule`: list projection may read local bubble config/state/runtime artifacts, remote pointer artifacts, remote state cache, and live remote status only through existing dependencies.
4. `forbidden_fallback`: do not use local control-plane state as authoritative live state for a started remote bubble when live/cache remote state is unavailable.
5. `allowed_resolution_path`: local control-plane state may remain only in `compatLifecyclePlaceholder` for unavailable-started display compatibility, and cache may be used after eligible refresh failure.
6. `missing_data_rule`: missing/invalid cache plus unavailable live refresh for a started remote bubble yields explicit `unavailable_started`; ineligible errors throw through existing list error semantics.
7. `phase_boundary`: this task owns read-model projection closure for list. It does not own remote status production, persisted cache schema redesign, UI redesign, or lifecycle recovery.

### Closed-Contract Drift Check

1. `source_anchors`:
   - `src/v11/application/list/listReadModelApi.ts`
   - `src/v11/application/list/listReadModelEntryBuilder.ts`
   - `src/v11/application/list/listReadModelEntryProjection.ts`
   - `src/v11/shared/read-model/list/listReadModelContract.ts`
   - `src/v11/shared/remote/remoteExecutionTypes.ts`
   - `src/contracts/ui/uiRemoteExecution.ts`
   - `src/v11/shared/remote/remoteStateCacheTypes.ts`
   - `src/v11/shared/status/remoteBubbleStatusContract.ts`
   - `tests/core/bubble/listBubbles.test.ts`
   - `tests/cli/bubbleListCommand.test.ts`
2. `canonical_elements`:
   - bubble id and config id,
   - normalized repo path,
   - local inspected state,
   - runtime session,
   - remote pointer kind,
   - remote cache status/content,
   - live remote status snapshot,
   - `remoteExecution.stateSource`,
   - list entry state/round,
   - `remoteExecutionSummary`,
   - `BubbleListView`.
3. `guard_elements`:
   - config id mismatch,
   - repo path mismatch,
   - cache schema validation,
   - refresh fallback eligibility,
   - remote alias availability for refresh,
   - unavailable-started exclusion from state counts.
4. `compat_elements`:
   - `compatLifecyclePlaceholder` for unavailable-started entries only,
   - existing CLI render text for unavailable remote state,
   - existing UI attach/store behavior consuming list remote execution DTOs.
5. `closed_terms`: `cache`, `refresh`, `created_not_started`, `unavailable_started`, `remoteExecutionSummary`, `compatLifecyclePlaceholder`, `runtimeAvailability`, `cacheStatus`.
6. `forbidden_reinterpretations`:
   - do not treat local control-plane state as authoritative remote live state for started remote bubbles,
   - do not count unavailable-started entries in `byState`,
   - do not treat cache write failure as live refresh failure,
   - do not change cache miss/invalid into thrown error when current behavior shows unavailable-started,
   - do not widen `shared/read-model/list` into list projection implementation ownership.
7. `drift_status`: intended `clarified_without_semantic_change`.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`.
2. Rationale: this is an internal application projection refactor. Public list input/result shapes, UI remote execution DTO shape, CLI flags/output meaning, remote cache schema, and remote status transport contracts must remain unchanged.
3. If implementation discovers that changing DTO shapes, cache schema, status transport payloads, or UI behavior is necessary, stop and route back to task refinement or a Plan -> Task chain.

## L1 - Change Contract

### 1) Call-Site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/list/listReadModelApi.ts` | `listBubbles` | Keep public read-model API and list-level aggregation; delegate per-entry building through the intended entry pipeline | P1 | required-now | T1,T9,T10 |
| CS2 | `src/v11/application/list/listReadModelEntryBuilder.ts` | `buildBubbleListEntry` | Remain per-bubble artifact loading and validation boundary, then delegate projection case selection to the internal projection pipeline | P1 | required-now | T1,T2,T3 |
| CS3 | `src/v11/application/list/internal/projection/**` | projection pipeline | Own local/created/cached/unavailable/refreshed projection case selection and DTO assembly | P1 | required-now | T2-T8 |
| CS4 | `src/v11/application/list/listReadModelEntryProjection.ts` | old projection module | Delete or reduce to a compatibility-free file with no exported broad projection surface; current non-builder exports (`BubbleBuildResult`, `RemoteRefreshFailureMetadata`, `readRemoteStateCacheSafe`) must either move under `internal/projection/**` or be replaced by narrower internal equivalents | P1 | required-now | T1,T10 |
| CS5 | `src/v11/shared/read-model/list/listReadModelContract.ts` | `BubbleListView` / `BubbleListEntry` | Public list contract remains unchanged | P1 | required-now | T8,T9 |
| CS6 | `src/contracts/ui/uiRemoteExecution.ts` | `UiBubbleListRemoteExecution` | UI remote execution DTO remains unchanged unless task refinement explicitly authorizes a contract change | P1 | required-now | T8,T9 |
| CS7 | `src/cli/commands/bubble/list.ts` | text rendering | Behavior remains unchanged; import/test updates only if needed | P2 | required-now | T9 |
| CS8 | `ui/src/**` remoteExecution consumers | attach/store/indicator behavior | Behavior remains unchanged; tests prove DTO compatibility if imports or fixtures are affected | P2 | required-now | T9 |

### 2) Canonical Contract Matrix

| Condition | Required Owner | Required Projection | Forbidden Behavior | Required Evidence |
|---|---|---|---|---|
| no remote pointer | local projection step | local state/session/watchdog/attention/review-policy/meta-review projection | remote fields on local entry | T2,T8 |
| remote pointer `created` | remote-created projection step | `stateSource=created_not_started`, `cacheStatus=missing`, neutral meta-review, no live runtime fields | pretending remote runtime exists | T3,T8 |
| remote pointer `started`, refresh false, valid cache exists | cached projection step | cache state/round, `stateSource=cache`, `cacheStatus=present`, `lastCacheCheckAt` | live remote status call or local state fallback | T4,T8 |
| remote pointer `started`, refresh false, cache missing/invalid | unavailable projection step | `stateSource=unavailable_started`, missing/invalid cache status, compat placeholder, unavailable summary increment | counting local state in `byState` as authoritative | T5,T8 |
| remote pointer `started`, refresh true, live status succeeds, cache write succeeds | refreshed projection step | live status drives entry, `stateSource=refresh`, `cacheStatus=present`, live/cache timestamps | using stale cache over live status | T6,T8 |
| remote pointer `started`, refresh true, live status succeeds, cache write fails | refreshed projection step | live status still drives entry, `reasonCode=LIST_REMOTE_CACHE_WRITE_FAILED`, `cacheStatus` from fallback read, no `lastCacheCheckAt` | downgrading to unavailable or throwing solely because cache write failed | T6,T8 |
| remote pointer `started`, refresh true, eligible live refresh failure, valid cache exists | refresh fallback step | cached projection with `reasonCode=LIST_REMOTE_REFRESH_UNAVAILABLE` and refresh timestamp | throwing or using local state | T7,T8 |
| remote pointer `started`, refresh true, eligible live refresh failure, no valid cache | unavailable projection step | unavailable-started with `LIST_REMOTE_REFRESH_UNAVAILABLE` | false live state from local control-plane state | T7,T8 |
| refresh failure is not eligible | projection pipeline | throw existing error | swallowing unknown failure as unavailable | T7 |
| any unavailable-started entry | list-level summary | exclude from `byState`, increment `unavailableStarted` | corrupt state counts with non-authoritative local placeholder | T5,T9 |
| any refreshed entry | list-level summary | set `remoteExecutionSummary.refreshedThisRun=true` | omitting refresh summary | T6,T9 |

### 3) Interface and Data Contract

#### External Interface

The public list API remains unchanged:

```ts
listBubbles(
  input: BubbleListInput,
  dependencies: ListReadModelDependencies
): Promise<BubbleListView>
```

#### Internal Projection Interface

Recommended command-local entry:

```ts
buildBubbleListEntryProjection(input: {
  repoPath: string;
  normalizedRepoPath: string;
  bubbleId: string;
  bubblePaths: ReturnType<typeof getBubblePaths>;
  sessions: Awaited<ReturnType<ListReadModelDependencies["readRuntimeSessionsRegistry"]>>;
  now: Date;
  refresh: boolean;
  config: ReturnType<typeof parseBubbleConfigToml>;
  stateLoaded: Awaited<ReturnType<ListReadModelDependencies["inspectStateSnapshot"]>>;
  paneActivityRead: Awaited<ReturnType<ListReadModelDependencies["readWatchdogPaneActivity"]>>;
  remotePointer: BubbleRemotePointer | null;
  dependencies: ListReadModelDependencies;
}): Promise<BubbleBuildResult>
```

Implementation may split this into preparation/result types, but the boundary must be explicit and local to `application/list`.

`BubbleBuildResult`, `RemoteRefreshFailureMetadata`, and cache-read support are not public API. Their target disposition is inside `src/v11/application/list/internal/projection/**` as typed internals, or replacement by narrower typed internals that serve the same projection pipeline contract. They must not remain as broad top-level projection support exports solely for compatibility.

#### Structured Contract Rules

1. `remoteExecution.stateSource` remains exactly `"cache" | "refresh" | "created_not_started" | "unavailable_started"`.
2. `cacheStatus` remains exactly `"present" | "missing" | "invalid"`.
3. `reasonCode` remains exactly `"LIST_REMOTE_REFRESH_UNAVAILABLE" | "LIST_REMOTE_CACHE_WRITE_FAILED"` when present.
4. `runtimeReasonCode` remains exactly `"STATUS_REMOTE_RUNTIME_MISSING"` when present.
5. `compatLifecyclePlaceholder.source` remains exactly `"local_control_plane_compat"` and appears only for unavailable-started list entries.
6. Unknown-field behavior remains governed by existing TypeScript DTO contracts and UI tests; this task must not add new accepted variants.

### 4) Ownership and Deferred Semantics

1. This task owns list-local projection route selection and DTO assembly.
2. This task consumes remote pointer/cache/live status data but does not own their production.
3. This task may write remote state cache only through the existing refresh path and existing dependency.
4. This task does not interpret UI attach availability beyond preserving existing DTO semantics consumed by UI.
5. This task does not own status command live projection, remote execution recovery, or remote cache schema migration.
6. Forbidden compatibility path: do not preserve broad top-level projection helper exports as wrappers around the new internal projection pipeline.
7. Forbidden leftover support surface: do not leave `BubbleBuildResult`, `RemoteRefreshFailureMetadata`, or `readRemoteStateCacheSafe` exported from the old top-level projection module. Move them under `internal/projection/**` or replace them with narrower typed internals there.

### 5) Mirrored Surface Checklist

When any row in the Canonical Contract Matrix changes, keep these surfaces aligned:

1. L0 `In Scope`.
2. L0 `Control Model`.
3. L0 `Closed-Contract Drift Check`.
4. L1 `Call-Site Matrix`.
5. L1 `Interface and Data Contract`.
6. L1 `Structured Contract Rules`.
7. L2 test/evidence list.
8. Acceptance criteria.

The Canonical Contract Matrix is the source of truth. Other sections may summarize it but must not introduce an independent remote projection contract.

## L2 - Implementation and Verification Contract

### Implementation Steps

1. Inventory current imports and tests around list projection:
   - `rg -n "listReadModelEntryProjection|BubbleBuildResult|RemoteRefreshFailureMetadata|readRemoteStateCacheSafe|buildLocalBubbleListEntry|buildCreatedRemoteBubbleListEntry|buildCachedRemoteBubbleListEntry|buildUnavailableRemoteBubbleListEntry|buildRefreshedRemoteBubbleListEntry|remoteExecution|stateSource" src tests ui/src`
2. Create `src/v11/application/list/internal/projection/**` with an explicit typed boundary.
3. Move projection case selection into the internal projection pipeline.
4. Split focused internal modules when useful:
   - local projection,
   - remote pointer route selection,
   - remote cache projection,
   - unavailable projection,
   - refresh projection,
   - shared DTO helpers.
5. Keep `buildBubbleListEntry(...)` as artifact loading/config validation boundary, then delegate to the projection pipeline.
6. Delete or shrink `listReadModelEntryProjection.ts` so it no longer owns broad projection case behavior, projection support types, cache-read helpers, or broad public helper exports.
7. Preserve public list contracts and UI remote execution DTOs.
8. Update tests to target the new projection pipeline for route/projection behavior and existing public/CLI/UI surfaces for compatibility.
9. Run final evidence scans showing old broad helper imports are gone.
10. Re-evaluate architecture fitness drift:
    - This task changes read-model projection boundaries.
    - Check whether `tools/fitness/**` needs a new or updated rule.
    - If no fitness change is needed, record why in the progress/commit note.

### Required Tests and Evidence

| ID | Evidence | Purpose |
|---|---|---|
| T1 | Focused import inventory before and after implementation | Prove public/internal list projection surfaces are intentional |
| T2 | Local projection tests | Prove local state/session/watchdog/attention projection remains stable |
| T3 | Created-remote projection tests | Prove created-not-started remote entry behavior |
| T4 | Cached started-remote projection tests | Prove cache-only route behavior |
| T5 | Unavailable started-remote projection and list summary tests | Prove fail-closed unavailable semantics and state count exclusion |
| T6 | Refreshed started-remote projection tests including cache write success/failure | Prove live status precedence and cache write downgrade behavior |
| T7 | Refresh failure fallback tests | Prove eligible cache fallback and ineligible throw behavior |
| T8 | Public list API/core tests | Prove `BubbleListView` compatibility |
| T9 | CLI and UI remote execution consumer tests | Prove text rendering and UI DTO compatibility |
| T10 | Final source scan for old broad projection helper ownership, including non-builder support exports | Prove the deepened module boundary exists |

### Default Verification Commands

Run focused checks first:

1. `pnpm exec vitest run tests/v11/application/list tests/core/bubble/listBubbles.test.ts`
2. `pnpm exec vitest run tests/cli/bubbleListCommand.test.ts`
3. `pnpm --dir ui test -- attachAvailability useBubbleStore BubbleCanvas BubbleExpandedCard`

Before declaring direct source changes complete, run the repo default verification order from `AGENTS.md` unless the work is performed and validated by a Pairflow bubble workflow that owns implementation validation:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. relevant focused tests above
5. broader affected test suite when one exists
6. `pnpm test`
7. `pnpm --dir ui test`
8. `pnpm build`
9. `pnpm --dir ui build` if UI files change

If any step is skipped, explain why in the final implementation summary.

### Acceptance Criteria

1. A list-local projection pipeline exists under `src/v11/application/list/internal/projection/**`.
2. `buildBubbleListEntry(...)` no longer owns remote projection case selection beyond artifact loading/config validation and delegation.
3. `listReadModelEntryProjection.ts` is deleted or reduced to narrow explicit exports; it must not retain broad local/remote projection case ownership, and the current non-builder support exports must be moved under `internal/projection/**` or replaced by narrower internal equivalents.
4. Local, created-remote, cached started-remote, unavailable started-remote, refreshed started-remote, and refresh-fallback semantics match the Canonical Contract Matrix.
5. Public `BubbleListInput`, `BubbleListView`, `BubbleListEntry`, `UiBubbleListRemoteExecution`, CLI text behavior, and UI remote execution behavior remain unchanged.
6. Unavailable-started entries remain excluded from `byState`.
7. Cache write failure during successful live refresh remains a degraded metadata condition, not a failed live projection.
8. Tests cover the new projection Interface and existing public/CLI/UI compatibility surfaces.
9. Evidence scans show no production or test code imports the old broad projection helper surface, including `BubbleBuildResult`, `RemoteRefreshFailureMetadata`, and `readRemoteStateCacheSafe` from the old top-level projection module.
10. Fitness drift is handled: either a relevant `tools/fitness/**` rule is updated, or the progress/commit note explains why no new rule is needed.

## Hardening Backlog

1. N/A for current draft. No later-hardening items are intentionally carried outside the required projection-boundary refactor.

### Parallelization Notes

1. This task may run in parallel with the merge command pipeline refactor only if file scopes remain disjoint:
   - this task owns `src/v11/application/list/**`, list tests, and compatibility-only UI/CLI tests;
   - the merge task owns `src/v11/application/merge/**` and merge tests.
2. This task should not run in parallel with another task that changes:
   - `src/contracts/ui/uiRemoteExecution.ts`,
   - `src/v11/shared/read-model/list/listReadModelContract.ts`,
   - `src/v11/shared/remote/remoteExecutionTypes.ts`,
   - `src/v11/shared/remote/remoteStateCacheTypes.ts`,
   - `src/v11/shared/status/remoteBubbleStatusContract.ts`,
   - UI remote execution merge semantics.
3. If implementation discovers that DTO contract changes are required, stop and route to task refinement before continuing.
