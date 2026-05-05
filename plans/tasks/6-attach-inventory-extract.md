---
artifact_type: task
artifact_id: task_attach_inventory_extract_v1
task_family_id: attach-inventory-extract
sequence_key: "6"
task_id: 6-attach-inventory-extract
title: "Attach Inventory Extract"
status: in_progress
phase: phase3
target_files:
  - src/v11/shared/attach/resolveAttachBubbleExecution.ts
  - src/v11/application/attach/emitAttachV11.ts
  - src/v11/infrastructure/executor/command/pairflowCommandAttach.ts
  - tests/v11/application/attach/attachBubbleV11.test.ts
  - tests/core/bubble/attachBubble.test.ts
  - docs/architecture/v11-placement-and-extraction-governance.md
prd_ref: null
plan_ref: plans/shared-command-boundary-cleanup-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/shared-command-boundary-cleanup-plan-v1.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
doc_bubble_id: 6-attach-inventory-extract-doc
impl_bubble_id: 6-attach-inventory-extract-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-05-shared-command-boundary-cleanup-plan-v1
---

# Task: Attach Inventory Extract

## L0 - Policy

### Goal

Produce a source-backed ownership inventory for
`src/v11/shared/attach/resolveAttachBubbleExecution.ts`, then extract only one
small behavior-preserving slice if current consumers prove a narrow owner. If
ownership cannot be proven from source, stop after recording the inventory and
do not move code speculatively.

### Domain / Control Model Summary

1. Business invariant: `src/v11/shared/**` must carry command-neutral
   ownership. Attach-specific runtime decisions should live in the owning
   application or infrastructure attach lane unless the source proves a true
   multi-consumer shared contract.
2. Control model: `application/attach` owns the v11 CLI/application attach
   path; `infrastructure/executor/command` owns the retained executor-command
   adapter path; `shared/attach` may remain only for command-neutral,
   multi-consumer resolution contracts whose ownership cannot yet be narrowed
   safely.
3. Read-path rule: classify each exported type, helper, and branch in
   `resolveAttachBubbleExecution.ts` by current consumers and source semantics
   before moving anything.
4. Forbidden fallback: do not move code because the filename is command-shaped,
   because future reuse is possible, or because a broad attach closeout task is
   planned next.
5. Allowed resolution path: create an inventory section in this task and, only
   if the inventory identifies one smallest behavior-preserving slice with a
   single clear owner, extract that slice and update imports/tests.
6. Missing-data rule: if the inventory cannot prove a safe owner for a slice,
   record the source-anchored reason and leave implementation movement to
   `7-attach-boundary-closeout`.

### Plan Linkage

1. Parent plan gap closed: `shared/attach/resolveAttachBubbleExecution.ts` is
   currently a large mixed shared file with both application and infrastructure
   consumers.
2. Depends on: `5-inbox-api-rename`.
3. Unlocks / impacts successor: `7-attach-boundary-closeout` consumes this
   inventory to remove/rename the remaining command-named attach boundary or
   record explicit deferral.
4. Task-list impact: creates planned task `6-attach-inventory-extract`; it does
   not supersede any existing task id.
5. Plan-level validation inherited: this task contributes to removing or
   source-anchoring residual command-named shared directories before governance
   hardening.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/shared/attach/resolveAttachBubbleExecution.ts`
   - `src/v11/application/attach/emitAttachV11.ts`
   - `src/v11/infrastructure/executor/command/pairflowCommandAttach.ts`
   - `src/v11/application/attach/attachBubbleContract.ts`
   - `src/v11/infrastructure/executor/command/pairflowCommandAttachContract.ts`
   - `tests/v11/application/attach/attachBubbleV11.test.ts`
   - `tests/core/bubble/attachBubble.test.ts`
2. Canonical elements:
   - `resolveAttachBubbleExecution`
   - `ResolvedAttachBubbleExecution`
   - `AttachBubbleErrorContextShape`
   - remote started pointer validation
   - global attach launcher resolution
   - local tmux session attach resolution
   - remote attach command resolution and diagnostics
3. Guard elements:
   - remote pointer invalid and config supplement diagnostics stay behaviorally
     identical unless the inventory proves a moved slice has a single owner
   - local and remote attach launcher behavior stays unchanged
   - application and infrastructure adapter result shapes stay unchanged
4. Compat elements:
   - current application and infrastructure attach entrypoints may keep a shared
     resolver import during this inventory task if no smaller safe extraction is
     proven
5. Forbidden reinterpretations:
   - do not change remote attach pointer validity semantics
   - do not change global config fallback behavior for started remote pointers
   - do not change tmux session existence checks or launcher command building
   - do not collapse application and infrastructure contract types into one
     broad shared attach API

### Scope Reality / Shape Proof

1. Current source has one residual file under `src/v11/shared/attach/**`.
2. Known consumers import `resolveAttachBubbleExecution` from both
   `application/attach/emitAttachV11.ts` and
   `infrastructure/executor/command/pairflowCommandAttach.ts`.
3. The shared file contains remote pointer validation, config supplement
   loading, requested launcher resolution, local attach resolution, remote
   attach resolution, and error/context shaping.
4. Hidden scope ruled out: attach CLI option parsing, launcher availability
   implementation, UI router attach action mapping, remote execution pointer
   persistence, and final governance hardening.

### Boundary Classification

1. Primary shape: `inventory_first_shared_boundary_reduction`.
2. Closure buckets touched:
   - `authority_producer`: attach execution resolver ownership inventory
   - `internal_execution_consumers`: application attach and executor-command
     attach callers
   - `read_model_consumers`: tests proving unchanged attach result/error shapes
3. Deferred closures:
   - full attach boundary removal or rename
   - list inventory and list boundary cleanup
   - shared command directory fitness hardening

### In Scope

1. Inventory every export and internal helper in
   `resolveAttachBubbleExecution.ts`.
2. Record for each inventory row:
   - source anchor
   - current consumers
   - ownership classification: `application_local`,
     `infrastructure_local`, `shared_contract`, or `defer`
   - source-backed reason
   - movement decision for this task
3. Extract at most one smallest behavior-preserving slice when the inventory
   proves a single owner.
4. Update imports and tests only for that extracted slice.
5. Preserve all runtime behavior, error messages, reason codes, diagnostics,
   and public result shapes.
6. Leave explicit deferral rows for mixed or ambiguous code that successor task
   7 must close or rename.

### Out of Scope

1. Removing the entire `src/v11/shared/attach` directory unless the one-slice
   extraction unexpectedly makes that mechanically safe and source-proven.
2. Redesigning attach runtime, launcher selection, remote pointer persistence,
   or UI router behavior.
3. Moving more than one ownership slice.
4. Changing shared command directory fitness rules.
5. Combining this with list cleanup.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Inventory first | Ownership must be proven before movement. | Add a source-backed inventory section before extracting code. | P1 | required-now |
| Smallest slice only | This task is not the attach closeout. | Move at most one narrow helper/type group with a clear owner. | P1 | required-now |
| Shared contract preservation | Mixed application/infrastructure behavior may remain shared temporarily. | Do not force a move when both consumers still depend on the same semantics. | P1 | required-now |
| Behavior preservation | Attach runtime behavior is baseline-correct. | Keep messages, reason codes, diagnostics, and result shapes unchanged. | P1 | required-now |
| Successor handoff | Task 7 needs explicit evidence. | Record residual deferrals with source anchors and reasons. | P1 | required-now |

### 1) Implementation Requirements

1. Add an "Attach Ownership Inventory" section to this task after source review.
2. Inspect `resolveAttachBubbleExecution.ts` and its two known consumers before
   editing source.
3. Classify these minimum inventory areas:
   - exported context/result types
   - requested port-forward resolution
   - remote started pointer validation
   - remote config supplement loading
   - remote pointer read and schema-error wrapping
   - requested attach launcher resolution
   - local tmux attach resolution
   - remote attach command resolution
   - top-level orchestration function
4. If a single-owner slice is proven, move only that slice to the owner lane and
   update the importing resolver/caller.
5. If no single-owner slice is proven, make no source move and record
   `movement_decision: defer` for every ambiguous or shared row.
6. Preserve the current public exports needed by both callers unless a moved
   slice no longer requires them.
7. Use `rg "shared/attach|resolveAttachBubbleExecution" src/v11 tests` after
   the change to verify remaining references are intentional.

### 2) Acceptance Criteria

1. The task contains a source-backed attach ownership inventory.
2. Any source move is limited to one smallest behavior-preserving slice with a
   source-proven owner.
3. If no move is safe, the task explicitly says so and leaves source behavior
   unchanged.
4. Application and infrastructure attach entrypoints keep behavior-compatible
   results and error normalization.
5. Existing attach tests continue to cover local attach, remote attach, pointer
   invalidity, config fallback, launcher selection, and lookup-error wrapping.
6. Task 7 has enough source-anchored evidence to decide remove, rename, or
   defer for the residual `shared/attach` boundary.

### 3) Validation

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. `pnpm test -- tests/v11/application/attach/attachBubbleV11.test.ts tests/core/bubble/attachBubble.test.ts tests/cli/bubbleAttachCommand.test.ts`

Broader completion checks inherited from repo policy for direct source changes:

1. `pnpm test`
2. `pnpm build`

### 4) Non-Goals

1. Do not redesign attach runtime behavior.
2. Do not remove the whole `shared/attach` boundary without inventory proof.
3. Do not rename application or infrastructure attach contracts.
4. Do not alter UI router attach payload contracts.
5. Do not add or tighten fitness rules.

## L2 - Implementation Notes

1. Start with `rg "resolveAttachBubbleExecution|shared/attach" src/v11 tests`.
2. Read the resolver and both importers before making source edits.
3. Keep the inventory row format machine-scannable enough for task 7:

```text
| Source | Current Consumers | Classification | Movement Decision | Evidence |
```

4. Prefer no source movement over an ownership guess.
5. If moving one slice, update only the minimal imports and tests required for
   that slice.

## Attach Ownership Inventory

Source review performed for:

1. `src/v11/shared/attach/resolveAttachBubbleExecution.ts`
2. `src/v11/application/attach/emitAttachV11.ts`
3. `src/v11/infrastructure/executor/command/pairflowCommandAttach.ts`
4. `rg "resolveAttachBubbleExecution|shared/attach" src/v11 tests`

Current reference proof:

1. `emitAttachV11.ts` imports the shared resolver and adapts it to
   `AttachBubbleError`, application attach launcher runtime helpers, and the
   application dependency surface.
2. `pairflowCommandAttach.ts` imports the same shared resolver and adapts it to
   the retained executor-command `AttachBubbleError`, launcher helpers, and
   remote pointer artifact reader.
3. `rg` finds no direct test or third caller import of `shared/attach`; all
   external behavior currently flows through the two attach entrypoints above.
4. The shared resolver owns a cross-lane execution decision, not only one
   caller's local helper: it reads remote pointer state, resolves the requested
   attach launcher, chooses local versus remote attach, builds the attach
   command through caller-supplied command builders, and normalizes shared
   context/result shape for both adapters.

Implementation decision for task 6:

1. Treat the table below as the implementation inventory baseline.
2. Current source evidence does not prove a single-owner slice for extraction.
3. The default implementation result for this task is therefore docs/inventory
   only: make no source move, preserve the shared resolver import in both
   current callers, and let task `7-attach-boundary-closeout` decide whether the
   residual `shared/attach` boundary is removed, renamed to a command-neutral
   shared location, or explicitly deferred.
4. A source extraction is allowed only if the implementer finds new
   source-backed evidence before editing that proves one smallest slice has a
   single owner. In that case, the implementer must update this inventory row
   first, then move only that slice.

| Source | Current Consumers | Classification | Movement Decision | Evidence |
|---|---|---|---|---|
| `src/v11/shared/attach/resolveAttachBubbleExecution.ts:12` `AttachBubbleErrorContextShape` export | Indirectly consumed through `createAttachError` callbacks in `src/v11/application/attach/emitAttachV11.ts:147` and `src/v11/infrastructure/executor/command/pairflowCommandAttach.ts:125`; emitted in resolver diagnostics. | `shared_contract` | defer | Both callers map the resolver's context into lane-local `AttachBubbleError` types. The fields cover shared attach diagnostics: bubble id, cwd/repo, tmux session, remote alias/host/clone path, and reason. |
| `src/v11/shared/attach/resolveAttachBubbleExecution.ts:53` `ResolvedAttachBubbleExecution` export | Returned to both current callers at `src/v11/application/attach/emitAttachV11.ts:139` and `src/v11/infrastructure/executor/command/pairflowCommandAttach.ts:117`, then converted to each lane's `AttachBubbleResult`. | `shared_contract` | defer | Both callers read `launcherRequested`, `tmuxSessionName`, `attachCommand`, and optional diagnostics before running their lane-local launcher availability path. Moving this type to one lane would create cross-lane dependency in the other caller. |
| `src/v11/shared/attach/resolveAttachBubbleExecution.ts:64` `resolveRequestedPortForwards` | Internal to `resolveRemoteAttachExecution`; reachable from both callers through shared resolver. | `shared_contract` | defer | The helper chooses CLI/request port forwards over remote pointer port forwards for remote attach command construction at `src/v11/shared/attach/resolveAttachBubbleExecution.ts:358`. The CLI/application caller supplies request `portForwards`, while the executor-command caller uses the same request contract and remote pointer data. No single owner is proven. |
| `src/v11/shared/attach/resolveAttachBubbleExecution.ts:71` `validateRemoteStartedPointer` | Internal to remote attach branch; errors are adapted by both callers through their `createAttachError` callbacks. | `shared_contract` | defer | It validates started pointer host, remote clone path, and tmux session, and emits `REMOTE_ATTACH_POINTER_INVALID` at `src/v11/shared/attach/resolveAttachBubbleExecution.ts:95`. Both attach paths require identical remote started pointer semantics. |
| `src/v11/shared/attach/resolveAttachBubbleExecution.ts:110` `resolveRemoteAttachConfig` | Internal to remote attach branch; uses caller-supplied global config loader and returns shared diagnostics consumed by both callers. | `shared_contract` | defer | It supplements remote attach user data from global config, ignores schema validation errors for supplement loading at `src/v11/shared/attach/resolveAttachBubbleExecution.ts:139`, and emits `REMOTE_ATTACH_CONFIG_SUPPLEMENT_UNAVAILABLE` diagnostics at `src/v11/shared/attach/resolveAttachBubbleExecution.ts:147`. Both callers expose these diagnostics through their attach result. |
| `src/v11/shared/attach/resolveAttachBubbleExecution.ts:179` `readRemotePointerOrThrow` | Internal to top-level resolver; reads remote pointer via caller-supplied dependency from application status defaults or executor artifact reader. | `shared_contract` | defer | The storage dependency differs by caller (`src/v11/application/attach/emitAttachV11.ts:130`, `src/v11/infrastructure/executor/command/pairflowCommandAttach.ts:108`), but schema-error wrapping and `REMOTE_ATTACH_POINTER_INVALID` behavior are common. Moving it into one lane would duplicate or couple the other lane to that lane's error adapter. |
| `src/v11/shared/attach/resolveAttachBubbleExecution.ts:210` `resolveRequestedAttachLauncher` | Internal to top-level resolver; uses bubble config, global config, `DEFAULT_ATTACH_LAUNCHER`, and remote pointer state. | `shared_contract` | defer | The same launcher precedence applies to both callers. The function also preserves the remote-started fallback that suppresses global config errors for remote attach at `src/v11/shared/attach/resolveAttachBubbleExecution.ts:227`; changing owner risks diverging application and executor-command behavior. |
| `src/v11/shared/attach/resolveAttachBubbleExecution.ts:249` `resolveLocalAttachExecution` | Internal local branch; uses shared bubble lookup result, tmux session naming, caller-supplied tmux checker, caller-supplied local attach command builder, and shared error context. | `shared_contract` | defer | Although local tmux attach is command-facing behavior, both application and executor-command callers need the same local branch and error normalization. The only lane-local pieces are injected dependencies from `src/v11/application/attach/emitAttachV11.ts:142`/`:145` and `src/v11/infrastructure/executor/command/pairflowCommandAttach.ts:120`/`:123`, not the helper itself. |
| `src/v11/shared/attach/resolveAttachBubbleExecution.ts:300` `resolveRemoteAttachExecution` | Internal remote branch; uses shared bubble lookup result, remote pointer, caller-supplied remote command builder, global config loader, and shared error context/diagnostics. | `shared_contract` | defer | Remote attach start-required, executor validation, started pointer validation, config supplement, port-forward selection, and remote command input assembly are shared by both callers. No sub-branch has a single consumer in current source. |
| `src/v11/shared/attach/resolveAttachBubbleExecution.ts:383` `resolveAttachBubbleExecution` export | Directly imported by `src/v11/application/attach/emitAttachV11.ts:11` and `src/v11/infrastructure/executor/command/pairflowCommandAttach.ts:26`. | `shared_contract` | defer | This is the current cross-lane resolver boundary. Both callers provide lane-local dependencies and error constructors, then consume the same result shape. A whole-file move to either caller would invert ownership for the other caller. |
