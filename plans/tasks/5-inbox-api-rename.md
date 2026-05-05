---
artifact_type: task
artifact_id: task_inbox_api_rename_v1
task_family_id: inbox-api-rename
sequence_key: "5"
task_id: 5-inbox-api-rename
title: "Inbox API Rename"
status: approved
phase: phase3
target_files:
  - src/v11/shared/inbox/inboxCommandApi.ts
  - src/v11/shared/bubbleInbox/bubbleInboxReadModel.ts
  - src/v11/application/inbox/emitInboxV11.ts
  - src/v11/infrastructure/ui/routerDependencies.ts
  - tests/v11/shared/inbox/inboxCommandApi.test.ts
  - tests/v11/shared/bubbleInbox/bubbleInboxReadModel.test.ts
  - tests/core/ui/router.test.ts
  - tests/contracts/uiContractTransitSource.test.ts
prd_ref: null
plan_ref: plans/shared-command-boundary-cleanup-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/shared-command-boundary-cleanup-plan-v1.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
doc_bubble_id: 5-inbox-api-rename-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-05-shared-command-boundary-cleanup-plan-v1
---

# Task: Inbox API Rename

## L0 - Policy

### Goal

Rename or relocate the shared inbox API out of the command-named
`src/v11/shared/inbox/**` boundary into a command-neutral shared read-model
boundary, then update the CLI application and UI router imports without changing
runtime behavior.

### Domain / Control Model Summary

1. Business invariant: shared boundary names must communicate ownership. The
   pending bubble inbox read model is consumed by both CLI application code and
   UI router code, so it should not live under a command-shaped shared
   directory.
2. Control model: the shared module owns the bubble inbox read-model retrieval
   and error normalization contract; `src/v11/application/inbox/**` remains the
   CLI command owner; `src/v11/infrastructure/ui/**` remains the UI router
   adapter owner.
3. Read-path rule: CLI and UI consumers import the pending inbox read-model
   contract from `src/v11/shared/bubbleInbox/bubbleInboxReadModel.ts`.
4. Forbidden fallback: do not leave a compatibility barrel under
   `src/v11/shared/inbox/**`, do not duplicate the read-model types in UI or CLI
   code, and do not redesign pending inbox semantics as part of this rename.
5. Allowed resolution path: perform a behavior-preserving path/name cleanup,
   update direct imports and tests, and keep exported runtime behavior and data
   shapes unchanged.
6. Missing-data rule: if implementation finds additional command-local inbox
   helpers under `shared/inbox/**`, stop and record a source-anchored reason
   instead of broadening this task into command helper migration.

### Plan Linkage

1. Parent plan gap closed: `shared/inbox/inboxCommandApi.ts` is consumed by
   CLI and UI router code but carries command-shaped shared naming.
2. Depends on: `3-remote-commit-rename` and `4-remote-merge-rename`.
3. Unlocks / impacts successor: `6-attach-inventory-extract` waits for this
   smaller command-neutral API cleanup before the attach inventory phase.
4. Task-list impact: creates planned task `5-inbox-api-rename`; it does not
   supersede any existing task id.
5. Plan-level validation inherited: this task contributes to the plan's
   requirement that command-named shared directories disappear or be explicitly
   source-anchored before fitness hardening.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/shared/inbox/inboxCommandApi.ts`
   - `src/v11/application/inbox/emitInboxV11.ts`
   - `src/v11/application/inbox/inboxCliCommand.ts`
   - `src/v11/infrastructure/ui/routerDependencies.ts`
   - `src/contracts/ui/uiReadModel.ts`
   - `tests/contracts/uiContractTransitSource.test.ts`
2. Canonical elements:
   - `PendingInboxItemType`
   - `PendingInboxItem`
   - `BubbleInboxInput`
   - `BubbleInboxView`
   - `BubbleInboxError`
   - `BubbleInboxErrorContext`
   - `BubbleInboxErrorInput`
   - `BubbleInboxErrorNormalizationContext`
   - `getBubbleInbox`
   - `asBubbleInboxError`
3. Guard elements:
   - only import/export paths and command-neutral module naming should change
   - pending question and approval counting semantics stay identical
   - error normalization context fields stay identical
4. Compat elements:
   - CLI `bubble inbox` output behavior remains behavior-compatible
   - UI router `getBubbleInbox` read path remains behavior-compatible
5. Forbidden reinterpretations:
   - do not change `resolveCanonicalPendingApprovalSignal` usage
   - do not change `statusCommandDependencyDefaults` dependency behavior
   - do not change UI read-model field names or pending item sorting
   - do not change CLI option parsing or text rendering

### Scope Reality / Shape Proof

1. Current `src/v11/shared/inbox/**` contains the retained
   `inboxCommandApi.ts` shared read-model API.
2. Known consumers import it through `application/inbox/emitInboxV11.ts`,
   `infrastructure/ui/routerDependencies.ts`, and tests.
3. Actual touched scope is a shared module path/name cleanup and mechanical
   import/test update.
4. Hidden scope ruled out: inbox CLI parsing/rendering, UI read-model redesign,
   approval signal semantics, status command dependency defaults, and fitness
   hardening.

### Boundary Classification

1. Primary shape: `shared_contract_boundary_rename`.
2. Closure buckets touched:
   - `authority_producer`: shared bubble inbox read-model module moves to a
     command-neutral path.
   - `internal_execution_consumers`: CLI application and UI router imports
     follow the new path.
   - `read_model_consumers`: tests and UI contract transit guardrails are
     updated to forbid the old command-shaped shared boundary.
3. Deferred closures:
   - attach inventory and closeout
   - list inventory and incremental movement
   - shared command directory fitness hardening

### In Scope

1. Move `src/v11/shared/inbox/inboxCommandApi.ts` to
   `src/v11/shared/bubbleInbox/bubbleInboxReadModel.ts`.
2. Update CLI application, UI router, and test imports to the new path.
3. Preserve all exported type names, function names, field shapes,
   discriminants, sort order, and runtime semantics.
4. Remove the now-empty `src/v11/shared/inbox` directory if no retained file
   remains.
5. Update contract guard tests so `src/v11/shared/inbox` and
   `inboxCommandApi` remain forbidden as shared UI/router dependency markers.
6. Verify no source or test import references `src/v11/shared/inbox`; only
   source-scanning forbidden-marker strings in contract tests may retain the
   old path/name.

### Out of Scope

1. Redesigning the UI inbox read model or `src/contracts/ui/uiReadModel.ts`.
2. Changing CLI `bubble inbox` option parsing, text rendering, or JSON behavior.
3. Changing pending approval signal canonicalization.
4. Changing status command dependency defaults or bubble lookup behavior.
5. Renaming `shared/list`, `shared/attach`, or fitness rules.
6. Adding compatibility barrels under `src/v11/shared/inbox/**`.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Shared read-model owner | The reusable bubble inbox read-model API belongs under command-neutral shared naming. | Move the retained shared inbox API out of `shared/inbox`. | P1 | required-now |
| Behavior preservation | The task is a path/name cleanup only. | Keep exported names, pending item semantics, and error context shapes unchanged. | P1 | required-now |
| CLI owner retained | `application/inbox` remains the CLI command owner. | Update its import surface without moving CLI parsing/rendering. | P1 | required-now |
| UI router owner retained | `infrastructure/ui` remains the UI adapter owner. | Update the router dependency import and preserve the UI view mapping. | P1 | required-now |
| No governance hardening | Fitness tightening waits for the final cleanup task. | Do not change dependency fitness rules. | P2 | required-now |

### 1) Implementation Requirements

1. Create the command-neutral shared bubble inbox directory if needed.
2. Rename the retained shared inbox API file into that directory.
3. Update imports and test paths from `shared/inbox/inboxCommandApi` to the new
   shared bubble inbox read-model path.
4. Remove the empty `src/v11/shared/inbox` directory after the move.
5. Update `tests/contracts/uiContractTransitSource.test.ts` to assert the old
   command-shaped path/name remains forbidden and the new command-neutral path is
   the accepted shared route when relevant.
6. Use `rg "shared/inbox|inboxCommandApi" src tests ui` after the move to verify
   only intentional historical/forbidden-marker references remain in contract
   tests.

### 2) Acceptance Criteria

1. `src/v11/shared/inbox` no longer exists.
2. The retained bubble inbox read-model API lives at
   `src/v11/shared/bubbleInbox/bubbleInboxReadModel.ts`.
3. CLI application and UI router code import from the new shared path.
4. No source or normal test import references `src/v11/shared/inbox`; remaining
   `shared/inbox` or `inboxCommandApi` text is limited to contract guard
   forbidden-marker assertions or historical archived plan/task prose.
5. `BubbleInboxView`, `PendingInboxItem`, `BubbleInboxError`, `getBubbleInbox`,
   and `asBubbleInboxError` behavior and public shapes remain unchanged.
6. Contract transit tests continue to prevent UI router/read-model ownership
   from depending on command-named shared modules.

### 3) Validation

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. `pnpm test -- tests/v11/shared/bubbleInbox/bubbleInboxReadModel.test.ts tests/core/ui/router.test.ts tests/contracts/uiContractTransitSource.test.ts tests/cli/bubbleInboxCommand.test.ts`

Broader completion checks inherited from repo policy for direct source changes:

1. `pnpm test`
2. `pnpm build`

### 4) Non-Goals

1. Do not redesign inbox read-model semantics.
2. Do not combine this with attach or list cleanup.
3. Do not introduce compatibility barrels under the old command-named shared
   directory.

## L2 - Implementation Notes

1. Use `git mv` or an equivalent file move for the shared API file.
2. Expected import updates include:
   - `src/v11/application/inbox/emitInboxV11.ts`
   - `src/v11/infrastructure/ui/routerDependencies.ts`
   - `tests/v11/shared/inbox/inboxCommandApi.test.ts`
   - `tests/core/ui/router.test.ts`
3. Rename the existing shared inbox test into the matching new shared test
   directory.
4. Keep the old exported symbol names even though the new module name is
   command-neutral; the type names describe the bubble inbox read model, not the
   directory owner.
5. If unexpected consumers import from `shared/inbox`, update them only when the
   import is the retained shared read-model API. Stop for review if the consumer
   proves additional shared inbox command-local helper logic exists.

## Assumptions

1. Current runtime behavior is correct; this task only changes ownership naming
   and import paths.
2. The new `shared/bubbleInbox` directory is command-neutral enough for this
   cleanup because it names the domain read-model concept rather than the CLI
   command module.

## Open Questions

None.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| N/A | No open later-hardening items. | N/A | N/A | N/A | N/A | N/A |

## Summary

1. Task review provenance: approved by `ReviewSpec task-mode` in the
   plan-watch continuation for this exact artifact after parent-plan fit,
   execution metadata, target-file reality, and closed-contract drift checks.
2. Contract-boundary override: yes; this is a plan-linked shared contract path
   rename with CLI and UI consumers, so the task keeps explicit Plan -> Task
   lineage.
3. Complexity-risk decision: moderate; single bounded task is allowed because
   the source scan shows one shared API producer plus direct CLI/UI consumers,
   and the work is mechanical path/name cleanup.
4. Contract-dense decision: no; the task preserves existing structured view and
   error shapes rather than changing the contract matrix.
5. Control model: inherited from the parent shared-command boundary cleanup plan
   and narrowed to the bubble inbox read-model ownership rename.
